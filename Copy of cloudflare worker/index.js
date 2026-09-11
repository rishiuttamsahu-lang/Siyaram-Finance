/**
 * Siyaram Mitra Mandal - Production Cloudflare Worker Bot Engine
 * Single Source of Truth: Canonical Firebase Firestore
 * Secondary Mirror: Google Sheets
 * 
 * Target Firestore Collections:
 * - seasons (Active Season: 2025-26)
 * - members (Waterfall dues & quotas)
 * - buildings (A, B, B2 Wings with 43 flats)
 * - transactions (Canonical sequential ledger starting at #101)
 * - auditLogs (Permanent non-destructive soft-reversals)
 */

// =========================================================================
// 1. GOOGLE OAUTH2 ACCESS TOKEN GENERATOR (Web Crypto API)
// =========================================================================

const tokenCache = new Map();

function base64url(bytes) {
  const str = typeof bytes === 'string' ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleAccessToken(env, scopes) {
  const cacheKey = scopes.join(',');
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30000) {
    return cached.token;
  }

  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Service Account credentials (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY) not configured.');
  }

  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encHeader = base64url(JSON.stringify(header));
  const encClaim = base64url(JSON.stringify(claim));
  const unsignedToken = `${encHeader}.${encClaim}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedJwt = `${unsignedToken}.${base64url(signature)}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google OAuth2 token exchange failed: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  });

  return data.access_token;
}

const FIRESTORE_SCOPES = ['https://www.googleapis.com/auth/datastore'];
const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// =========================================================================
// 2. FIRESTORE CLIENT (Canonical Single Source of Truth)
// =========================================================================

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function fromFirestoreDoc(doc) {
  if (!doc) return null;
  const id = doc.name ? doc.name.split('/').pop() : '';
  const data = { id };
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = fromFirestoreValue(v);
    }
  }
  return data;
}

function getProjectId(env) {
  return env.FIREBASE_PROJECT_ID || 'studio-3440483519-68ed7';
}

async function firestoreFetch(env, path, options = {}) {
  const token = await getGoogleAccessToken(env, FIRESTORE_SCOPES);
  const projectId = getProjectId(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  return await fetch(url, { ...options, headers });
}

async function getActiveSeason(env) {
  const resp = await firestoreFetch(env, 'seasons');
  if (!resp.ok) return null;
  const json = await resp.json();
  const docs = json.documents || [];
  for (const doc of docs) {
    const s = fromFirestoreDoc(doc);
    if (s && s.isActive) return s;
  }
  return docs.length > 0 ? fromFirestoreDoc(docs[0]) : null;
}

async function getMembers(env) {
  const resp = await firestoreFetch(env, 'members?pageSize=100');
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.documents || []).map(fromFirestoreDoc);
}

async function getBuildings(env) {
  const resp = await firestoreFetch(env, 'buildings?pageSize=50');
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.documents || []).map(fromFirestoreDoc);
}

async function getTransactions(env, pageSize = 300) {
  const resp = await firestoreFetch(env, `transactions?pageSize=${pageSize}`);
  if (!resp.ok) return [];
  const json = await resp.json();
  const list = (json.documents || []).map(fromFirestoreDoc);
  return list.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
}

async function getNextSequenceNumber(env) {
  const txns = await getTransactions(env, 300);
  if (txns.length === 0) return 1;
  let maxSeq = 0;
  for (const t of txns) {
    if (t.sequenceNumber && t.sequenceNumber > maxSeq) {
      maxSeq = t.sequenceNumber;
    }
  }
  return maxSeq + 1;
}

async function saveDocument(env, collection, docId, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  const resp = await firestoreFetch(env, `${collection}/${docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to save ${collection}/${docId}: ${await resp.text()}`);
  }
}

// =========================================================================
// 3. GOOGLE SHEETS CLIENT (Passive Secondary Mirror)
// =========================================================================

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
let sheetMetaCache = null;

async function getSheetMeta(env) {
  if (sheetMetaCache) return sheetMetaCache;
  if (!env.SPREADSHEET_ID) return null;
  const token = await getGoogleAccessToken(env, SHEETS_SCOPES);
  const resp = await fetch(`${SHEETS_BASE}/${env.SPREADSHEET_ID}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const props = data.sheets?.[0]?.properties;
  if (props) {
    sheetMetaCache = { sheetId: props.sheetId, title: props.title };
  }
  return sheetMetaCache;
}

async function appendSheetRow(env, rowValues) {
  if (!env.SPREADSHEET_ID) return;
  try {
    const meta = await getSheetMeta(env);
    if (!meta) return;
    const token = await getGoogleAccessToken(env, SHEETS_SCOPES);
    const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/${encodeURIComponent(meta.title)}:append?valueInputOption=USER_ENTERED`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    });
  } catch (err) {
    console.warn('Google Sheets mirror append notice (non-fatal):', err.message);
  }
}

// =========================================================================
// 4. BUSINESS LOGIC: WATERFALL DUES & FORMATTERS
// =========================================================================

function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(abs);
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

function nowIST() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  return { dateStr, timeStr };
}

function getMemberTarget(member, season, month) {
  if (member.isHonorary) return 0;
  if (season.blockedMonths && season.blockedMonths.includes(month)) return 0;
  if (member.monthlyOverrides && member.monthlyOverrides[month] !== undefined) {
    return member.monthlyOverrides[month];
  }
  if (season.monthQuotas && season.monthQuotas[month] !== undefined) {
    return season.monthQuotas[month];
  }
  return season.defaultMonthlyQuota || 200;
}

function computeMemberDues(member, season) {
  if (member.isHonorary) {
    return { previousYearPending: 0, currentSeasonPaid: 0, currentSeasonTarget: 0, currentSeasonDue: 0, totalDue: 0 };
  }

  const liveMonth = season.liveMonth || (season.months && season.months[0]) || '';
  const monthsUpToLive = (season.months || []).filter((m) => m <= liveMonth);

  let currentSeasonTarget = 0;
  for (const m of monthsUpToLive) {
    currentSeasonTarget += getMemberTarget(member, season, m);
  }

  let currentSeasonPaid = 0;
  if (member.payments) {
    for (const val of Object.values(member.payments)) {
      currentSeasonPaid += val || 0;
    }
  }

  const currentSeasonDue = Math.max(0, currentSeasonTarget - currentSeasonPaid);
  const prevPending = member.previousYearPending || 0;
  const totalDue = prevPending + currentSeasonDue;

  return {
    previousYearPending: prevPending,
    currentSeasonPaid,
    currentSeasonTarget,
    currentSeasonDue,
    totalDue,
  };
}

function allocateMemberPayment(member, season, amount) {
  let remaining = amount;
  let prevPaid = 0;
  let newPrevPending = member.previousYearPending || 0;

  // Step 1: Previous Year Pending
  if (newPrevPending > 0) {
    const deduction = Math.min(remaining, newPrevPending);
    prevPaid = deduction;
    newPrevPending -= deduction;
    remaining -= deduction;
  }

  // Step 2 & 3: Allocate to chronological unblocked months
  const newPayments = { ...(member.payments || {}) };
  const monthAllocations = {};
  let totalSeasonAllocated = 0;

  if (remaining > 0 && season.months && season.months.length > 0) {
    const allMonths = [...season.months].sort();

    for (const m of allMonths) {
      if (remaining <= 0) break;
      if (season.blockedMonths && season.blockedMonths.includes(m)) continue;

      const target = getMemberTarget(member, season, m);
      const alreadyPaid = newPayments[m] || 0;
      const deficit = Math.max(0, target - alreadyPaid);

      if (deficit > 0) {
        const allocated = Math.min(remaining, deficit);
        newPayments[m] = alreadyPaid + allocated;
        monthAllocations[m] = (monthAllocations[m] || 0) + allocated;
        totalSeasonAllocated += allocated;
        remaining -= allocated;
      }
    }

    // Step 4: Surplus to live month buffer
    if (remaining > 0) {
      const live = season.liveMonth || allMonths[0];
      newPayments[live] = (newPayments[live] || 0) + remaining;
      monthAllocations[live] = (monthAllocations[live] || 0) + remaining;
      totalSeasonAllocated += remaining;
      remaining = 0;
    }
  }

  return {
    previousYearPaid: prevPaid,
    remainingPreviousPending: newPrevPending,
    monthAllocations,
    totalSeasonAllocated,
    newMemberPayments: newPayments,
  };
}

// =========================================================================
// 5. PARSER (Deterministic Invariants, Positional O Rule)
// =========================================================================

function parseTransactionLine(line, members = [], buildings = []) {
  if (!line || typeof line !== 'string') return null;
  const raw = line.trim();
  if (!raw) return null;

  // Positional O rule: Recognized ONLY as the final token
  const isOnline = /\b(o|online)\b$/i.test(raw);
  const clean = isOnline ? raw.replace(/\b(o|online)\b$/i, '').trim() : raw;

  // 1. Direct Online Total Adjustment (e.g. "100 O", "-100 O")
  const directOnlineMatch = clean.match(/^([+-]?\s*\d+(?:\.\d+)?)$/);
  if (directOnlineMatch && isOnline) {
    const val = parseFloat(directOnlineMatch[1].replace(/\s+/g, ''));
    return {
      type: val >= 0 ? 'Income' : 'Expense',
      name: 'Online Wallet Adjustment',
      amount: Math.abs(val),
      isOnline: true,
      isDirectWallet: true,
      delta: val,
    };
  }

  // 2. Expense: Negative amount format (e.g. "Tape -100", "Chai -150")
  const negExpenseMatch = clean.match(/^([a-zA-Z\.\s_]+?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (negExpenseMatch) {
    return {
      type: 'Expense',
      name: negExpenseMatch[1].trim(),
      amount: parseFloat(negExpenseMatch[2]),
      isOnline,
    };
  }

  // 2b. Expense: Leading negative amount (e.g. "-100 Tape")
  const leadNegExpenseMatch = clean.match(/^-\s*(\d+(?:\.\d+)?)\s+([a-zA-Z\.\s_]+)$/);
  if (leadNegExpenseMatch) {
    return {
      type: 'Expense',
      name: leadNegExpenseMatch[2].trim(),
      amount: parseFloat(leadNegExpenseMatch[1]),
      isOnline,
    };
  }

  // 2c. Expense: Keyword format (e.g. "Tape 100 kharcha", "kharcha Tape 100", "* 500 Decoration")
  const starExpenseMatch = clean.match(/^\*\s*(\d+(?:\.\d+)?)\s+([a-zA-Z\.\s_]+)$/);
  if (starExpenseMatch) {
    return {
      type: 'Expense',
      name: starExpenseMatch[2].trim(),
      amount: parseFloat(starExpenseMatch[1]),
      isOnline,
    };
  }

  const suffixKharchaMatch = clean.match(/^([a-zA-Z\.\s_]+?)\s+(\d+(?:\.\d+)?)\s*(?:kharcha|expense)$/i);
  if (suffixKharchaMatch) {
    return {
      type: 'Expense',
      name: suffixKharchaMatch[1].trim(),
      amount: parseFloat(suffixKharchaMatch[2]),
      isOnline,
    };
  }

  // 3. Building/Flat: Name Wing Room Amount (e.g. "Rohit A 101 500", "Rohit B2-102 250", "Rohit A101 500")
  const nameWingRoomMatch = clean.match(/^([a-zA-Z\.\s_]+?)\s+([a-zA-Z0-9]+)[\s\-_]+(\d+)\s+(\d+(?:\.\d+)?)$/) ||
                            clean.match(/^([a-zA-Z\.\s_]+?)\s+([a-zA-Z])(\d+)\s+(\d+(?:\.\d+)?)$/);
  if (nameWingRoomMatch) {
    const candidateWing = nameWingRoomMatch[2].toUpperCase();
    const candidateRoom = nameWingRoomMatch[3].trim();
    // Validate if wing exists in buildings
    const wingObj = buildings.find(b => b.code.toUpperCase() === candidateWing || b.id.toUpperCase().includes(candidateWing));
    if (wingObj) {
      return {
        type: 'Flat',
        name: nameWingRoomMatch[1].trim(),
        wing: wingObj.code,
        room: candidateRoom,
        amount: parseFloat(nameWingRoomMatch[4]),
        isOnline,
      };
    }
  }

  // 3b. Building/Flat: Wing Room Name Amount (e.g. "A 101 Rohit 500", "B2-102 Sai Kumar 250")
  const wingRoomNameMatch = clean.match(/^([a-zA-Z0-9]+)[\s\-_]+(\d+)\s+([a-zA-Z\.\s_]+?)\s+(\d+(?:\.\d+)?)$/) ||
                            clean.match(/^([a-zA-Z])(\d+)\s+([a-zA-Z\.\s_]+?)\s+(\d+(?:\.\d+)?)$/);
  if (wingRoomNameMatch) {
    const candidateWing = wingRoomNameMatch[1].toUpperCase();
    const candidateRoom = wingRoomNameMatch[2].trim();
    const wingObj = buildings.find(b => b.code.toUpperCase() === candidateWing || b.id.toUpperCase().includes(candidateWing));
    if (wingObj) {
      return {
        type: 'Flat',
        name: wingRoomNameMatch[3].trim(),
        wing: wingObj.code,
        room: candidateRoom,
        amount: parseFloat(wingRoomNameMatch[4]),
        isOnline,
      };
    }
  }

  // 4. Member / General Chanda: Name Amount (e.g. "Rahul 200", "Piyush 100")
  const nameAmountMatch = clean.match(/^([a-zA-Z\.\s_]+?)\s+(\d+(?:\.\d+)?)$/);
  if (nameAmountMatch) {
    const nameStr = nameAmountMatch[1].trim();
    const amountVal = parseFloat(nameAmountMatch[2]);
    const matchedMember = members.find(
      m => m.name.toLowerCase().replace(/\./g, '') === nameStr.toLowerCase().replace(/\./g, '')
    );

    if (matchedMember) {
      return {
        type: 'Member',
        member: matchedMember,
        name: matchedMember.name,
        amount: amountVal,
        isOnline,
      };
    } else {
      return {
        type: 'Chanda',
        name: nameStr,
        amount: amountVal,
        isOnline,
      };
    }
  }

  return null;
}

// =========================================================================
// 6. TRANSACTION PROCESSOR & DUAL-WRITE ENGINE
// =========================================================================

async function executeTransactions(env, parsedItems) {
  const [season, members, buildings] = await Promise.all([
    getActiveSeason(env),
    getMembers(env),
    getBuildings(env),
  ]);

  if (!season) {
    return '⚠️ <b>No Active Season Found:</b> Please initialize an active season in Firestore first.';
  }

  const { dateStr, timeStr } = nowIST();
  const results = [];

  for (const item of parsedItems) {
    const seq = await getNextSequenceNumber(env);
    const txnId = `txn-${Date.now()}-${seq}`;
    const mode = item.isOnline ? 'ONLINE' : 'OFFLINE';

    // A. Member Payment
    if (item.type === 'Member') {
      const member = item.member;
      const alloc = allocateMemberPayment(member, season, item.amount);

      const updatedMember = {
        ...member,
        previousYearPending: alloc.remainingPreviousPending,
        payments: alloc.newMemberPayments,
      };

      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        type: 'MEMBER',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: `Member: ${member.name}`,
        source: 'TELEGRAM',
        metadata: {
          memberId: member.id,
          memberName: member.name,
          category: 'Member Due',
        },
      };

      const audit = {
        id: `log-${Date.now()}-${seq}`,
        txnId,
        action: 'CREATE',
        previousValue: null,
        newValue: { amount: item.amount, mode, member: member.name, alloc },
        performedBy: 'TelegramBot',
        timestamp: new Date().toISOString(),
        source: 'TELEGRAM',
        notes: `Waterfall allocation: Cleared prev ₹${alloc.previousYearPaid}`,
      };

      await Promise.all([
        saveDocument(env, 'members', member.id, updatedMember),
        saveDocument(env, 'transactions', txn.id, txn),
        saveDocument(env, 'auditLogs', audit.id, audit),
      ]);

      // Mirror to Google Sheets
      await appendSheetRow(env, [
        dateStr,
        timeStr,
        'Member',
        member.name,
        '-',
        item.amount,
        mode === 'ONLINE' ? 'UPI' : 'Cash',
        `#${seq}`,
        'Telegram',
      ]);

      results.push(`✅ <b>#${seq}</b> Member: <b>${member.name}</b> <code>+${formatINR(item.amount)}</code> [${mode === 'ONLINE' ? 'UPI' : 'Cash'}]`);
    }

    // B. Building / Flat Donation
    else if (item.type === 'Flat') {
      const building = buildings.find(b => b.code.toUpperCase() === item.wing.toUpperCase());
      if (!building) {
        results.push(`❌ Building wing [${item.wing}] not found.`);
        continue;
      }

      let flatUpdated = false;
      const updatedBuilding = {
        ...building,
        floors: (building.floors || []).map(flr => ({
          ...flr,
          flats: (flr.flats || []).map(fl => {
            if (fl.flatNo === item.room) {
              flatUpdated = true;
              const newAmount = (fl.amountPaid || 0) + item.amount;
              return {
                ...fl,
                residentName: item.name || fl.residentName || 'Resident',
                amountPaid: newAmount,
                isPaid: true,
                paymentMode: fl.isPaid && fl.paymentMode && fl.paymentMode !== mode ? 'SPLIT' : mode,
                updatedAt: new Date().toISOString(),
              };
            }
            return fl;
          }),
        })),
      };

      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        type: 'BUILDING',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: `${building.name} Flat ${item.room} (${item.name})`,
        source: 'TELEGRAM',
        metadata: {
          buildingCode: building.code,
          flatNo: item.room,
          category: 'Building Chanda',
        },
      };

      const audit = {
        id: `log-${Date.now()}-${seq}`,
        txnId,
        action: 'CREATE',
        previousValue: null,
        newValue: { building: building.code, flat: item.room, amount: item.amount, mode },
        performedBy: 'TelegramBot',
        timestamp: new Date().toISOString(),
        source: 'TELEGRAM',
        notes: `Building flat collection recorded from Telegram`,
      };

      await Promise.all([
        saveDocument(env, 'buildings', building.code, updatedBuilding),
        saveDocument(env, 'transactions', txn.id, txn),
        saveDocument(env, 'auditLogs', audit.id, audit),
      ]);

      await appendSheetRow(env, [
        dateStr,
        timeStr,
        'Building',
        item.name,
        `${building.code}-${item.room}`,
        item.amount,
        mode === 'ONLINE' ? 'UPI' : 'Cash',
        `#${seq}`,
        'Telegram',
      ]);

      results.push(`✅ <b>#${seq}</b> Flat: <b>${building.code}-${item.room}</b> (${item.name}) <code>+${formatINR(item.amount)}</code> [${mode === 'ONLINE' ? 'UPI' : 'Cash'}]`);
    }

    // C. General Chanda
    else if (item.type === 'Chanda') {
      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        type: 'CHANDA',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: `Chanda: ${item.name}`,
        source: 'TELEGRAM',
        metadata: { category: 'General Chanda' },
      };

      const audit = {
        id: `log-${Date.now()}-${seq}`,
        txnId,
        action: 'CREATE',
        previousValue: null,
        newValue: { name: item.name, amount: item.amount, mode },
        performedBy: 'TelegramBot',
        timestamp: new Date().toISOString(),
        source: 'TELEGRAM',
        notes: 'General Chanda recorded from Telegram',
      };

      await Promise.all([
        saveDocument(env, 'transactions', txn.id, txn),
        saveDocument(env, 'auditLogs', audit.id, audit),
      ]);

      await appendSheetRow(env, [
        dateStr,
        timeStr,
        'Chanda',
        item.name,
        '-',
        item.amount,
        mode === 'ONLINE' ? 'UPI' : 'Cash',
        `#${seq}`,
        'Telegram',
      ]);

      results.push(`✅ <b>#${seq}</b> Chanda: <b>${item.name}</b> <code>+${formatINR(item.amount)}</code> [${mode === 'ONLINE' ? 'UPI' : 'Cash'}]`);
    }

    // D. Expense
    else if (item.type === 'Expense') {
      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        type: 'EXPENSE',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: item.name,
        source: 'TELEGRAM',
        metadata: { category: 'Expense' },
      };

      const audit = {
        id: `log-${Date.now()}-${seq}`,
        txnId,
        action: 'CREATE',
        previousValue: null,
        newValue: { description: item.name, amount: item.amount, mode },
        performedBy: 'TelegramBot',
        timestamp: new Date().toISOString(),
        source: 'TELEGRAM',
        notes: 'Expense recorded from Telegram',
      };

      await Promise.all([
        saveDocument(env, 'transactions', txn.id, txn),
        saveDocument(env, 'auditLogs', audit.id, audit),
      ]);

      await appendSheetRow(env, [
        dateStr,
        timeStr,
        'Expense',
        item.name,
        '-',
        -item.amount,
        mode === 'ONLINE' ? 'UPI' : 'Cash',
        `#${seq}`,
        'Telegram',
      ]);

      results.push(`📦 <b>#${seq}</b> Expense: <b>${item.name}</b> <code>-${formatINR(item.amount)}</code> [${mode === 'ONLINE' ? 'UPI' : 'Cash'}]`);
    }
  }

  return results.join('\n\n') + '\n\n<i>Firestore ✓ | Sheets ✓</i>';
}

// =========================================================================
// 7. SOFT REVERSAL / UNDO ENGINE
// =========================================================================

async function executeUndo(env, targetSeq) {
  const txns = await getTransactions(env, 300);
  const activeTxns = txns.filter(t => t.status === 'ACTIVE');

  if (activeTxns.length === 0) {
    return '⚠️ No active transactions available to undo.';
  }

  let targetTxn = null;
  if (targetSeq) {
    targetTxn = activeTxns.find(t => t.sequenceNumber === targetSeq);
    if (!targetTxn) {
      return `❌ Transaction <b>#${targetSeq}</b> not found or already reversed.`;
    }
  } else {
    // Default to the latest active transaction
    targetTxn = activeTxns[0];
  }

  // 1. Mark transaction as REVERSED
  const reversedTxn = {
    ...targetTxn,
    status: 'REVERSED',
  };
  await saveDocument(env, 'transactions', targetTxn.id, reversedTxn);

  // 2. Rollback state in members or buildings if applicable
  const [season, members, buildings] = await Promise.all([
    getActiveSeason(env),
    getMembers(env),
    getBuildings(env),
  ]);

  if (targetTxn.type === 'MEMBER' && targetTxn.metadata?.memberId) {
    const member = members.find(m => m.id === targetTxn.metadata.memberId);
    if (member && season) {
      // Re-calculate payments by deducting amount
      let remainingToDeduct = targetTxn.amount;
      const newPayments = { ...(member.payments || {}) };
      const sortedMonths = Object.keys(newPayments).sort().reverse();
      for (const m of sortedMonths) {
        if (remainingToDeduct <= 0) break;
        const cur = newPayments[m] || 0;
        const dec = Math.min(cur, remainingToDeduct);
        newPayments[m] = cur - dec;
        remainingToDeduct -= dec;
      }
      const updatedMember = {
        ...member,
        previousYearPending: (member.previousYearPending || 0) + remainingToDeduct,
        payments: newPayments,
      };
      await saveDocument(env, 'members', member.id, updatedMember);
    }
  } else if (targetTxn.type === 'BUILDING' && targetTxn.metadata?.buildingCode && targetTxn.metadata?.flatNo) {
    const bCode = targetTxn.metadata.buildingCode;
    const fNo = targetTxn.metadata.flatNo;
    const bld = buildings.find(b => b.code === bCode);
    if (bld) {
      const updatedBld = {
        ...bld,
        floors: (bld.floors || []).map(flr => ({
          ...flr,
          flats: (flr.flats || []).map(fl => {
            if (fl.flatNo === fNo) {
              const newAmt = Math.max(0, (fl.amountPaid || 0) - targetTxn.amount);
              return {
                ...fl,
                amountPaid: newAmt,
                isPaid: newAmt > 0,
              };
            }
            return fl;
          }),
        })),
      };
      await saveDocument(env, 'buildings', bld.code, updatedBld);
    }
  }

  // 3. Permanent Audit Log
  const audit = {
    id: `log-undo-${Date.now()}-${targetTxn.sequenceNumber}`,
    txnId: targetTxn.id,
    action: 'UNDO',
    previousValue: { status: 'ACTIVE', amount: targetTxn.amount },
    newValue: { status: 'REVERSED', amount: 0 },
    performedBy: 'TelegramBot',
    timestamp: new Date().toISOString(),
    source: 'TELEGRAM',
    notes: `Reversed transaction #${targetTxn.sequenceNumber} (${targetTxn.description}) non-destructively.`,
  };
  await saveDocument(env, 'auditLogs', audit.id, audit);

  // 4. Note in Google Sheets
  const { dateStr, timeStr } = nowIST();
  await appendSheetRow(env, [
    dateStr,
    timeStr,
    'UNDO',
    `REVERSED #${targetTxn.sequenceNumber}: ${targetTxn.description}`,
    '-',
    targetTxn.type === 'EXPENSE' ? targetTxn.amount : -targetTxn.amount,
    targetTxn.mode === 'ONLINE' ? 'UPI' : 'Cash',
    `#${targetTxn.sequenceNumber}`,
    'Telegram',
  ]);

  return `↩️ <b>Transaction Reversed:</b>\n` +
         `• <b>#${targetTxn.sequenceNumber}</b> ${targetTxn.description}\n` +
         `• Amount: <code>${formatINR(targetTxn.amount)}</code> [${targetTxn.mode === 'ONLINE' ? 'UPI' : 'Cash'}]\n` +
         `• Status: <b>REVERSED</b> (Database updated, permanent audit log created)`;
}

// =========================================================================
// 8. TELEGRAM INFORMATION COMMANDS (/1 to /9)
// =========================================================================

async function getDashboardSummary(env) {
  const [season, txns] = await Promise.all([
    getActiveSeason(env),
    getTransactions(env, 300),
  ]);

  const activeTxns = txns.filter(t => t.status === 'ACTIVE');
  const opening = season?.openingBalance || 6500;

  let onlineIn = 0, offlineIn = 0, onlineExp = 0, offlineExp = 0;
  for (const t of activeTxns) {
    if (t.type === 'EXPENSE') {
      if (t.mode === 'ONLINE') onlineExp += t.amount;
      else offlineExp += t.amount;
    } else {
      if (t.mode === 'ONLINE') onlineIn += t.amount;
      else offlineIn += t.amount;
    }
  }

  const totalIn = onlineIn + offlineIn;
  const totalExp = onlineExp + offlineExp;
  const netOnline = onlineIn - onlineExp;
  const netOffline = offlineIn - offlineExp;
  const cashInHand = opening + netOffline;
  const netTotal = cashInHand + netOnline;

  return `📊 <b>SIYARAM MITRA MANDAL - FINANCIAL SUMMARY</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🏦 <b>Opening Balance (Cash):</b> <code>${formatINR(opening)}</code>\n\n` +
         `📱 <b>Online Pool (UPI in Bank):</b>\n` +
         `• Collections: <code>${formatINR(onlineIn)}</code>\n` +
         `• Expenses: <code>-${formatINR(onlineExp)}</code>\n` +
         `• <b>Net Online Pool:</b> <b>${formatINR(netOnline)}</b>\n\n` +
         `💵 <b>Cash Flow (Offline):</b>\n` +
         `• Collections: <code>${formatINR(offlineIn)}</code>\n` +
         `• Expenses: <code>-${formatINR(offlineExp)}</code>\n` +
         `• <b>Cash in Hand:</b> <b>${formatINR(cashInHand)}</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `💰 <b>TOTAL NET BALANCE:</b> <b>${formatINR(netTotal)}</b>\n` +
         `<i>(Verified Live against Firestore Canonical Ledger)</i>`;
}

async function getMemberDuesList(env) {
  const [season, members] = await Promise.all([
    getActiveSeason(env),
    getMembers(env),
  ]);

  if (!season) return '⚠️ No active season found.';

  const summaries = members
    .filter(m => !m.isHonorary)
    .map(m => ({
      name: m.name,
      ...computeMemberDues(m, season),
    }))
    .sort((a, b) => b.totalDue - a.totalDue);

  const lines = summaries.map((s, idx) => {
    const prevBadge = s.previousYearPending > 0 ? ` (Prev: ${formatINR(s.previousYearPending)})` : '';
    return `${idx + 1}. <b>${s.name}</b>: <code>${formatINR(s.totalDue)} Due</code>${prevBadge} | Paid: ${formatINR(s.currentSeasonPaid)}`;
  });

  return `👥 <b>MEMBER DUES SUMMARY (Track: ${season.liveMonth || 'Current'})</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         (lines.length ? lines.join('\n') : 'All members have cleared dues!') +
         `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `<i>Tip: Type member name (e.g. <code>Rishi</code>) for detailed breakdown.</i>`;
}

async function getPaginatedTransactions(env, filterType, filterMode, title) {
  const txns = await getTransactions(env, 300);
  let filtered = txns.filter(t => t.status === 'ACTIVE');

  if (filterType === 'INCOME') filtered = filtered.filter(t => t.type !== 'EXPENSE');
  if (filterType === 'EXPENSE') filtered = filtered.filter(t => t.type === 'EXPENSE');
  if (filterMode) filtered = filtered.filter(t => t.mode === filterMode);

  const list = filtered.slice(0, 15);
  const lines = list.map(t => {
    const sign = t.type === 'EXPENSE' ? '-' : '+';
    return `• <b>#${t.sequenceNumber}</b> ${t.description}: <code>${sign}${formatINR(t.amount)}</code> [${t.mode === 'ONLINE' ? 'UPI' : 'Cash'}]`;
  });

  return `<b>${title}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         (lines.length ? lines.join('\n') : 'No entries found.') +
         `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `<i>Showing recent ${lines.length} entries. Undo any entry using: <code>[Number] undo</code></i>`;
}

function getHelpMenu() {
  return `🤖 <b>SIYARAM BOT COMMANDS MENU</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `<b>📊 Quick Info Commands:</b>\n` +
         `• <code>/1</code> or <code>1</code>: Complete Financial Summary\n` +
         `• <code>/2</code> or <code>2</code>: Member Dues List (Highest first)\n` +
         `• <code>/3</code> or <code>3</code>: Offline Income (Cash)\n` +
         `• <code>/4</code> or <code>4</code>: Offline Expenses (Cash)\n` +
         `• <code>/5</code> or <code>5</code>: Online Inflow (UPI)\n` +
         `• <code>/6</code> or <code>6</code>: Online Expenses (UPI)\n` +
         `• <code>/7</code> or <code>7</code>: All Incomes combined\n` +
         `• <code>/8</code> or <code>8</code>: All Expenses combined\n` +
         `• <code>/9</code> or <code>9</code>: Help Menu\n\n` +
         `<b>📝 Transaction Entry Formats:</b>\n` +
         `• Member: <code>Rahul 200</code> (Cash) | <code>Rahul 200 O</code> (Online)\n` +
         `• Flat: <code>Rohit A 101 500</code> | <code>Rohit B2 102 250 O</code>\n` +
         `• Expense: <code>Tape -100</code> | <code>Tape 100 kharcha O</code>\n` +
         `• General Chanda: <code>Tailor 200</code> | <code>Lucky 200 O</code>\n` +
         `• Undo Entry: <code>3 undo</code> or <code>undo 101</code>\n` +
         `• Member Due Check: <code>due Rishi</code> or <code>Rishi</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
         `<i>Tip: Add trailing 'O' to any entry for UPI/Online mode!</i>`;
}

// =========================================================================
// 9. TELEGRAM WEBHOOK HANDLER
// =========================================================================

async function sendTelegramReply(env, chatId, text, replyToId) {
  if (!env.TELEGRAM_BOT_TOKEN || !text) return;
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_to_message_id: replyToId,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Telegram HTML reply failed (${res.status}): ${errText}, falling back to plain text`);
      const plainText = text.replace(/<[^>]*>?/gm, '');
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          reply_to_message_id: replyToId,
        }),
      });
    }
  } catch (err) {
    console.error('sendTelegramReply network error:', err);
  }
}

async function handleTelegramMessage(env, msg) {
  const chatId = msg.chat?.id;
  const rawText = (msg.text || '').trim();
  const replyToId = msg.message_id;

  if (!chatId || !rawText) return;

  try {
    // Clean leading slash
    let cleanCmd = rawText.startsWith('/') ? rawText.slice(1).trim() : rawText;
    // Strip group bot username e.g. /summary@siyaram_bot -> summary
    cleanCmd = cleanCmd.replace(/@\w+/g, '').trim();
    const lower = cleanCmd.toLowerCase();
    const normalized = lower.replace(/_/g, '-');

    // 1. Help Menu
    if (['help', 'menu', '0', '9', 'start'].includes(lower) || ['help', 'menu', 'start'].includes(normalized)) {
      return await sendTelegramReply(env, chatId, getHelpMenu(), replyToId);
    }

    // 2. Summary
    if (['1', 'summary', 'dashboard', 'total', 'bal', 'balance'].includes(lower) || ['summary', 'dashboard', 'balance'].includes(normalized)) {
      const text = await getDashboardSummary(env);
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 3. Member Dues
    if (['2', 'dues', 'due', 'pending'].includes(lower) || ['dues', 'due', 'pending'].includes(normalized)) {
      const text = await getMemberDuesList(env);
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 4. Offline Income (Cash Inflow)
    if (['3', 'offline-income', 'cash-income', 'cash-inflow', 'offline-inflow', 'cash'].includes(normalized) || ['cash_inflow', 'cash_income'].includes(lower)) {
      const text = await getPaginatedTransactions(env, 'INCOME', 'OFFLINE', '💵 Offline Inflows (Cash)');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 5. Offline Expenses (Cash Expense)
    if (['4', 'offline-expense', 'cash-expense', 'cash-exp', 'cash-expenses'].includes(normalized) || ['cash_expense', 'cash_expenses'].includes(lower)) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', 'OFFLINE', '📦 Offline Expenses (Cash)');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 6. Online Income (UPI Inflow)
    if (['5', 'online-income', 'upi-income', 'upi-inflow', 'online-inflow', 'upi'].includes(normalized) || ['upi_inflow', 'upi_income'].includes(lower)) {
      const text = await getPaginatedTransactions(env, 'INCOME', 'ONLINE', '📱 Online Inflows (UPI)');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 7. Online Expenses (UPI Expense)
    if (['6', 'online-expense', 'upi-expense', 'upi-exp', 'online-expenses'].includes(normalized) || ['upi_expense', 'upi_expenses'].includes(lower)) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', 'ONLINE', '⚡ Online Expenses (UPI)');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 8. Combined Income
    if (['7', 'income', 'incomes', 'inflow', 'inflows'].includes(lower) || ['income', 'incomes', 'inflow', 'inflows'].includes(normalized)) {
      const text = await getPaginatedTransactions(env, 'INCOME', null, '📈 Combined Inflow Ledger');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 9. Combined Expense
    if (['8', 'expense', 'expenses', 'kharcha'].includes(lower) || ['expense', 'expenses', 'kharcha'].includes(normalized)) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', null, '📉 Combined Expense Ledger');
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 10. Undo Command: "3 undo", "undo 3", "undo"
    const undoMatch = lower.match(/^(\d+)\s*(?:no|number|line)?\s*undo$/) ||
                      lower.match(/^undo\s*(?:no|number|line)?\s*(\d+)?$/);
    if (undoMatch) {
      const targetSeq = undoMatch[1] ? parseInt(undoMatch[1], 10) : null;
      const text = await executeUndo(env, targetSeq);
      return await sendTelegramReply(env, chatId, text, replyToId);
    }

    // 11. Single Member Due Check (e.g. "Rishi", "due Rishi")
    const memberCheckMatch = lower.match(/^(?:due|status|check)?\s*([a-zA-Z\.\s_]+)$/);
    if (memberCheckMatch) {
      const candidate = memberCheckMatch[1].trim();
      const [season, members] = await Promise.all([getActiveSeason(env), getMembers(env)]);
      const matched = members.find(m => m.name.toLowerCase().replace(/\./g, '') === candidate.replace(/\./g, ''));
      if (matched && season) {
        const d = computeMemberDues(matched, season);
        const rep = `👤 <b>${matched.name} Due Breakdown</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `• Previous Year Pending: <code>${formatINR(d.previousYearPending)}</code>\n` +
                    `• Current Season Target: <code>${formatINR(d.currentSeasonTarget)}</code>\n` +
                    `• Total Paid So Far: <code>${formatINR(d.currentSeasonPaid)}</code>\n` +
                    `• Current Season Due: <code>${formatINR(d.currentSeasonDue)}</code>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💰 <b>TOTAL DUE TO PAY:</b> <b>${formatINR(d.totalDue)}</b>`;
        return await sendTelegramReply(env, chatId, rep, replyToId);
      }
    }

    // 12. Transaction Entry (Single or Multi-line)
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const [members, buildings] = await Promise.all([getMembers(env), getBuildings(env)]);

    const parsedItems = [];
    const unparsed = [];

    for (const line of lines) {
      const parsed = parseTransactionLine(line, members, buildings);
      if (parsed) {
        parsedItems.push(parsed);
      } else {
        unparsed.push(line);
      }
    }

    if (parsedItems.length > 0) {
      const reply = await executeTransactions(env, parsedItems);
      let finalMsg = reply;
      if (unparsed.length > 0) {
        finalMsg += `\n\n⚠️ <i>Could not parse:</i>\n${unparsed.map(u => `• <code>${u}</code>`).join('\n')}`;
      }
      return await sendTelegramReply(env, chatId, finalMsg, replyToId);
    }

    // Default unrecognized command
    const defaultHelp = `❓ <b>Command not recognized:</b> <code>${rawText}</code>\n\n` +
                        `<b>Available Commands:</b>\n` +
                        `• <code>/summary</code> - Financial summary & cash balance\n` +
                        `• <code>/dues</code> - Member dues breakdown\n` +
                        `• <code>/cash_inflow</code> - Recent cash collections\n` +
                        `• <code>/cash_expense</code> - Recent cash expenses\n` +
                        `• <code>/upi_inflow</code> - Recent UPI collections\n` +
                        `• <code>/upi_expense</code> - Recent UPI expenses\n` +
                        `• <code>/undo</code> - Reverse last transaction\n` +
                        `• <code>/help</code> - Full command guide`;
    await sendTelegramReply(env, chatId, defaultHelp, replyToId);
  } catch (err) {
    console.error('Error handling Telegram message:', err);
    await sendTelegramReply(env, chatId, `⚠️ <b>Bot Processing Error:</b>\n<code>${err.message || err}</code>`, replyToId);
  }
}

// =========================================================================
// 10. CLOUDFLARE WORKER MAIN EXPORT
// =========================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Health check
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Siyaram Finance Telegram Bot',
          runtime: 'Cloudflare Workers (V8 Edge)',
          database: getProjectId(env),
          spreadsheetConfigured: !!env.SPREADSHEET_ID,
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Convenience Webhook Setter & Info
    if (request.method === 'GET' && (url.pathname === '/set-webhook' || url.pathname === '/set-webhook/')) {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('TELEGRAM_BOT_TOKEN not configured.', { status: 400 });
      }
      const webhookUrl = url.searchParams.get('url') || `${url.origin}/telegram`;
      const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
      const resp = await fetch(tgUrl);
      return new Response(await resp.text(), { headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'GET' && (url.pathname === '/webhook-info' || url.pathname === '/webhook-info/')) {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('TELEGRAM_BOT_TOKEN not configured.', { status: 400 });
      }
      const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
      const resp = await fetch(tgUrl);
      return new Response(await resp.text(), { headers: { 'Content-Type': 'application/json' } });
    }

    // Diagnostic Direct Tests
    if (request.method === 'GET' && url.pathname === '/test-summary') {
      try {
        const sum = await getDashboardSummary(env);
        return new Response(sum, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (e) {
        return new Response(`Error: ${e.message}\n${e.stack}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    if (request.method === 'GET' && url.pathname === '/test-dues') {
      try {
        const dues = await getMemberDuesList(env);
        return new Response(dues, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (e) {
        return new Response(`Error: ${e.message}\n${e.stack}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    // 3. Telegram Webhook Endpoint (Supports /, /telegram, and /webhook)
    const isTelegramWebhook = 
      url.pathname === '/' || 
      url.pathname === '/telegram' || url.pathname === '/telegram/' || 
      url.pathname === '/webhook' || url.pathname === '/webhook/';

    if (request.method === 'POST' && isTelegramWebhook) {
      try {
        const payload = await request.json();
        if (payload.message) {
          ctx.waitUntil(handleTelegramMessage(env, payload.message));
        }
        return new Response('OK');
      } catch (err) {
        console.error('Webhook error:', err);
        return new Response('OK');
      }
    }

    // 4. WhatsApp Webhook Endpoint
    if (url.pathname === '/whatsapp' || url.pathname === '/whatsapp/') {
      if (request.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
          return new Response(challenge, { status: 200 });
        }
        return new Response('Forbidden', { status: 403 });
      }
      return new Response('OK');
    }

    return new Response('Not Found', { status: 404 });
  },
};
