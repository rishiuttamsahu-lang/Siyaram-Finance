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

async function getMembers(env, seasonId = null) {
  if (seasonId) {
    const resp = await firestoreFetch(env, `seasons/${seasonId}/members?pageSize=100`);
    if (resp.ok) {
      const json = await resp.json();
      const docs = (json.documents || []).map(fromFirestoreDoc);
      if (docs.length > 0) return docs;
    }
    if (seasonId !== '2025-26') return [];
  }
  const resp = await firestoreFetch(env, 'members?pageSize=100');
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.documents || []).map(fromFirestoreDoc);
}

async function getBuildings(env, seasonId = null) {
  if (seasonId) {
    const resp = await firestoreFetch(env, `seasons/${seasonId}/buildings?pageSize=50`);
    if (resp.ok) {
      const json = await resp.json();
      const docs = (json.documents || []).map(fromFirestoreDoc);
      if (docs.length > 0) return docs;
    }
    if (seasonId !== '2025-26') return [];
  }
  const resp = await firestoreFetch(env, 'buildings?pageSize=50');
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.documents || []).map(fromFirestoreDoc);
}

async function getTransactions(env, seasonId = null, pageSize = 300) {
  if (seasonId) {
    const resp = await firestoreFetch(env, `seasons/${seasonId}/transactions?pageSize=${pageSize}`);
    if (resp.ok) {
      const json = await resp.json();
      const docs = (json.documents || []).map(fromFirestoreDoc);
      if (docs.length > 0) {
        return docs.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
      }
    }
    if (seasonId !== '2025-26') return [];
  }
  const resp = await firestoreFetch(env, `transactions?pageSize=${pageSize}`);
  if (!resp.ok) return [];
  const json = await resp.json();
  const list = (json.documents || []).map(fromFirestoreDoc);
  return list.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
}

async function getNextSequenceNumber(env, seasonId = null) {
  const txns = await getTransactions(env, seasonId, 300);
  if (txns.length === 0) return 1;
  let maxSeq = 0;
  for (const t of txns) {
    if (t.sequenceNumber && t.sequenceNumber > maxSeq) {
      maxSeq = t.sequenceNumber;
    }
  }
  return maxSeq + 1;
}

async function saveDocument(env, collection, docId, data, seasonId = null) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  const maskParams = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const basePath = seasonId ? `seasons/${seasonId}/${collection}` : collection;
  const path = maskParams ? `${basePath}/${docId}?${maskParams}` : `${basePath}/${docId}`;

  const resp = await firestoreFetch(env, path, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to save ${basePath}/${docId}: ${await resp.text()}`);
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
  try {
    const token = await getGoogleAccessToken(env, SHEETS_SCOPES);
    const resp = await fetch(`${SHEETS_BASE}/${env.SPREADSHEET_ID}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error(`getSheetMeta failed (${resp.status}):`, err);
      return null;
    }
    const data = await resp.json();
    const props = data.sheets?.[0]?.properties;
    if (props) {
      sheetMetaCache = { sheetId: props.sheetId, title: props.title };
    }
    return sheetMetaCache;
  } catch (err) {
    console.error('getSheetMeta error:', err);
    return null;
  }
}

async function appendSheetRow(env, rowValues) {
  if (!env.SPREADSHEET_ID) {
    console.warn('Google Sheets append skipped: SPREADSHEET_ID not configured.');
    return;
  }
  try {
    const meta = await getSheetMeta(env);
    if (!meta) {
      console.warn('Google Sheets append failed: getSheetMeta returned null. Check sharing permission for', env.GOOGLE_CLIENT_EMAIL);
      return;
    }
    const token = await getGoogleAccessToken(env, SHEETS_SCOPES);
    const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/${encodeURIComponent(meta.title)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Google Sheets append row failed (${res.status}):`, errText);
    } else {
      console.log('Google Sheets row appended successfully');
    }
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
    return { previousYearPending: 0, currentSeasonPaid: 0, currentSeasonTarget: 0, currentSeasonDue: 0, totalDue: 0, carryForwardPending: {} };
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
  
  let totalPastDebt = 0;
  if (member.carryForwardPending && typeof member.carryForwardPending === 'object') {
    totalPastDebt = Object.values(member.carryForwardPending).reduce((sum, v) => sum + (v || 0), 0);
  } else {
    totalPastDebt = member.previousYearPending || 0;
  }

  const totalDue = totalPastDebt + currentSeasonDue;

  return {
    previousYearPending: totalPastDebt,
    currentSeasonPaid,
    currentSeasonTarget,
    currentSeasonDue,
    totalDue,
    carryForwardPending: member.carryForwardPending || {},
  };
}

function allocateMemberPayment(member, season, amount) {
  let remaining = amount;
  let prevPaid = 0;
  const carryForwardDeductions = {};
  const newCarryForward = member.carryForwardPending ? { ...member.carryForwardPending } : {};

  // If no carryForwardPending map but legacy previousYearPending > 0
  if ((!member.carryForwardPending || Object.keys(member.carryForwardPending).length === 0) && (member.previousYearPending || 0) > 0) {
    newCarryForward['legacy'] = member.previousYearPending || 0;
  }

  // Step 1: Multi-season FIFO across carryForwardPending debts chronologically
  const pastSeasons = Object.keys(newCarryForward).sort();
  for (const sId of pastSeasons) {
    if (remaining <= 0) break;
    const debt = newCarryForward[sId] || 0;
    if (debt > 0) {
      const deduction = Math.min(remaining, debt);
      prevPaid += deduction;
      newCarryForward[sId] = debt - deduction;
      remaining -= deduction;
      carryForwardDeductions[sId] = deduction;
    }
  }

  const updatedPrevPending = Object.values(newCarryForward).reduce((sum, v) => sum + (v || 0), 0);

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
    remainingPreviousPending: updatedPrevPending,
    carryForwardPending: newCarryForward,
    carryForwardDeductions,
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
  const season = await getActiveSeason(env);
  if (!season) {
    return '⚠️ <b>No Active Season Found:</b> Please initialize an active season in Firestore first.';
  }

  const [members, buildings] = await Promise.all([
    getMembers(env, season.id),
    getBuildings(env, season.id),
  ]);

  const { dateStr, timeStr } = nowIST();
  const results = [];

  for (const item of parsedItems) {
    const seq = await getNextSequenceNumber(env, season.id);
    const txnId = `txn-${Date.now()}-${seq}`;
    const mode = item.isOnline ? 'ONLINE' : 'OFFLINE';

    // A. Member Payment
    if (item.type === 'Member') {
      const member = item.member;
      const alloc = allocateMemberPayment(member, season, item.amount);

      const updatedMember = {
        ...member,
        previousYearPending: alloc.remainingPreviousPending,
        carryForwardPending: alloc.carryForwardPending,
        payments: alloc.newMemberPayments,
      };

      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        seasonId: season.id,
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
          seasonId: season.id,
          allocations: alloc.monthAllocations,
          carryForwardDeductions: Object.keys(alloc.carryForwardDeductions).length > 0 ? alloc.carryForwardDeductions : undefined,
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
        saveDocument(env, 'members', member.id, updatedMember, season.id),
        saveDocument(env, 'transactions', txn.id, txn, season.id),
        saveDocument(env, 'auditLogs', audit.id, audit, season.id),
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

      results.push(`✅ #&#8203;${seq} Member: <b>${member.name}</b> <code>+${formatINR(item.amount)}</code> · ${mode === 'ONLINE' ? 'UPI' : 'Cash'}`);
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
        seasonId: season.id,
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
          seasonId: season.id,
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
        saveDocument(env, 'buildings', building.code, updatedBuilding, season.id),
        saveDocument(env, 'transactions', txn.id, txn, season.id),
        saveDocument(env, 'auditLogs', audit.id, audit, season.id),
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

      results.push(`🏢 #&#8203;${seq} Flat: <b>${building.code}-${item.room}</b> (${item.name}) <code>+${formatINR(item.amount)}</code> · ${mode === 'ONLINE' ? 'UPI' : 'Cash'}`);
    }

    // C. General Chanda
    else if (item.type === 'Chanda') {
      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        seasonId: season.id,
        type: 'CHANDA',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: `Chanda: ${item.name}`,
        source: 'TELEGRAM',
        metadata: { category: 'General Chanda', seasonId: season.id },
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
        saveDocument(env, 'transactions', txn.id, txn, season.id),
        saveDocument(env, 'auditLogs', audit.id, audit, season.id),
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

      results.push(`✅ #&#8203;${seq} Chanda: <b>${item.name}</b> <code>+${formatINR(item.amount)}</code> · ${mode === 'ONLINE' ? 'UPI' : 'Cash'}`);
    }

    // D. Expense
    else if (item.type === 'Expense') {
      const txn = {
        id: txnId,
        sequenceNumber: seq,
        timestamp: new Date().toISOString(),
        seasonId: season.id,
        type: 'EXPENSE',
        amount: item.amount,
        mode,
        status: 'ACTIVE',
        description: item.name,
        source: 'TELEGRAM',
        metadata: { category: 'Expense', seasonId: season.id },
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
        saveDocument(env, 'transactions', txn.id, txn, season.id),
        saveDocument(env, 'auditLogs', audit.id, audit, season.id),
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

      results.push(`📦 #&#8203;${seq} Expense: <b>${item.name}</b> <code>−${formatINR(item.amount)}</code> · ${mode === 'ONLINE' ? 'UPI' : 'Cash'}`);
    }
  }

  const sheetId = env.SPREADSHEET_ID || '1kQUxPKTQouLIFm3PB4TXj3XFcMh3RXNy2PT50rIqXQs';
  return results.join('\n\n') + `\n\n✓ Firestore Live · <a href="https://docs.google.com/spreadsheets/d/${sheetId}">Sheet</a>`;
}

// =========================================================================
// 7. SOFT REVERSAL / UNDO ENGINE
// =========================================================================

async function executeUndo(env, targetSeq) {
  const season = await getActiveSeason(env);
  const txns = await getTransactions(env, season?.id, 300);
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
  await saveDocument(env, 'transactions', targetTxn.id, reversedTxn, season?.id);

  // 2. Rollback state in members or buildings if applicable
  const [members, buildings] = await Promise.all([
    getMembers(env, season?.id),
    getBuildings(env, season?.id),
  ]);

  if (targetTxn.type === 'MEMBER') {
    const member = members.find(m => 
      (targetTxn.metadata?.memberId && m.id === targetTxn.metadata.memberId) ||
      (targetTxn.metadata?.memberName && m.name.toLowerCase() === targetTxn.metadata.memberName.toLowerCase()) ||
      m.name.toLowerCase() === (targetTxn.description || '').replace(/^Member:\s*/i, '').trim().toLowerCase()
    );
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

      // Restore past carry forward debt if deducted
      const newCarryForward = member.carryForwardPending ? { ...member.carryForwardPending } : {};
      if (targetTxn.metadata?.carryForwardDeductions) {
        for (const [sId, ded] of Object.entries(targetTxn.metadata.carryForwardDeductions)) {
          newCarryForward[sId] = (newCarryForward[sId] || 0) + (ded || 0);
        }
      } else if (remainingToDeduct > 0) {
        newCarryForward['legacy'] = (newCarryForward['legacy'] || 0) + remainingToDeduct;
      }

      const updatedMember = {
        ...member,
        previousYearPending: Object.values(newCarryForward).reduce((s, v) => s + (v || 0), 0),
        carryForwardPending: newCarryForward,
        payments: newPayments,
      };
      await saveDocument(env, 'members', member.id, updatedMember, season?.id);
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
      await saveDocument(env, 'buildings', bld.code, updatedBld, season?.id);
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
  await saveDocument(env, 'auditLogs', audit.id, audit, season?.id);

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

  return `↩️ <b>Transaction Reversed</b>\n\n` +
         `• #&#8203;${targetTxn.sequenceNumber} ${cleanTxnDescription(targetTxn.description)}\n` +
         `• Amount: <b>${formatINR(targetTxn.amount)}</b> · ${targetTxn.mode === 'ONLINE' ? 'UPI' : 'Cash'}\n` +
         `• Status: <b>REVERSED</b> (Database updated)`;
}

// =========================================================================
// 8. TELEGRAM INFORMATION COMMANDS (/1 to /9)
// =========================================================================

function cleanTxnDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/^Member:\s*/i, '')
    .replace(/^Chanda:\s*/i, '')
    .replace(/^Expense:\s*/i, '')
    .replace(/^Flat:\s*/i, '')
    .replace(/Cash to Online/i, 'Cash → Online')
    .trim();
}

async function getDashboardSummary(env) {
  const season = await getActiveSeason(env);
  const txns = await getTransactions(env, season?.id, 300);

  const activeTxns = txns.filter(t => t.status === 'ACTIVE');
  const openingCash = season?.openingCashBalance ?? season?.openingBalance ?? 6500;
  const openingOnline = season?.openingOnlineBalance ?? 0;

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
  const netOnline = openingOnline + onlineIn - onlineExp;
  const netOffline = offlineIn - offlineExp;
  const cashInHand = openingCash + netOffline;
  const netTotal = cashInHand + netOnline;

  const sheetId = env.SPREADSHEET_ID || '1kQUxPKTQouLIFm3PB4TXj3XFcMh3RXNy2PT50rIqXQs';

  return `<b>Mandal Summary (${season?.name || 'Active Season'})</b>\n\n` +
         `Opening Cash: ${formatINR(openingCash)} · Opening UPI: ${formatINR(openingOnline)}\n\n` +
         `Online: ${formatINR(netOnline)}\n` +
         `Cash: ${formatINR(cashInHand)}\n\n` +
         `<b>Total: ${formatINR(netTotal)}</b>\n\n` +
         `<b>In ${formatINR(totalIn)} · Expense ${formatINR(totalExp)}</b>\n` +
         `✓ Firestore Live · <a href="https://docs.google.com/spreadsheets/d/${sheetId}">Sheet</a>`;
}

async function getMemberDuesList(env) {
  const season = await getActiveSeason(env);
  if (!season) return '⚠️ No active season found.';

  const members = await getMembers(env, season.id);

  const summaries = members
    .filter(m => !m.isHonorary)
    .map(m => ({
      name: m.name,
      ...computeMemberDues(m, season),
    }))
    .filter(s => s.totalDue > 0)
    .sort((a, b) => b.totalDue - a.totalDue);

  const grandTotalDue = summaries.reduce((acc, s) => acc + s.totalDue, 0);
  const monthYear = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' });

  const lines = summaries.map((s, idx) => {
    return `${idx + 1}. ${s.name} — <b>${formatINR(s.totalDue)}</b>`;
  });

  return `<b>Member Dues · ${monthYear}</b>\n\n` +
         (lines.length ? lines.join('\n') : 'All members have cleared dues!') +
         `\n\n<b>Total Due: ${formatINR(grandTotalDue)}</b>`;
}

async function getPaginatedTransactions(env, filterType, filterMode, title, showMode = true) {
  const season = await getActiveSeason(env);
  const txns = await getTransactions(env, season?.id, 300);
  let filtered = txns.filter(t => t.status === 'ACTIVE');

  if (filterType === 'INCOME') filtered = filtered.filter(t => t.type !== 'EXPENSE');
  if (filterType === 'EXPENSE') filtered = filtered.filter(t => t.type === 'EXPENSE');
  if (filterMode) filtered = filtered.filter(t => t.mode === filterMode);

  const list = filtered.slice(0, 15);
  const lines = list.map(t => {
    const isExp = t.type === 'EXPENSE';
    const sign = isExp ? '−' : '+';
    const desc = cleanTxnDescription(t.description);
    const modeStr = showMode ? ` · ${t.mode === 'ONLINE' ? 'UPI' : 'Cash'}` : '';
    return `• #&#8203;${t.sequenceNumber} ${desc} <code>${sign}${formatINR(t.amount)}</code>${modeStr}`;
  });

  return `<b>${title}</b>\n\n` +
         (lines.length ? lines.join('\n') : 'No entries found.') +
         `\n\n<b>Use: [number] undo</b>`;
}

function getHelpMenu() {
  return `🤖 <b>Siyaram Bot Commands</b>\n\n` +
         `• /summary — Mandal summary & balances\n` +
         `• /dues — Outstanding member dues\n` +
         `• /income — Recent 15 inflows\n` +
         `• /expense — Recent 15 expenses\n` +
         `• /cash_inflow — Cash collections\n` +
         `• /cash_expense — Cash expenses\n` +
         `• /upi_inflow — Online UPI collections\n` +
         `• /upi_expense — Online UPI expenses\n` +
         `• [number] undo — Reverse transaction (e.g. 106 undo)\n\n` +
         `🎙️ <b>Voice Note Support:</b>\n` +
         `Send any Hindi/Hinglish/English voice message!\n` +
         `<i>"Rahul ne 200 diye"</i> or <i>"Light 500 online"</i>\n\n` +
         `<b>Quick Entry Examples:</b>\n` +
         `• Rahul 200 (Member cash)\n` +
         `• Rahul 200 O (Member UPI)\n` +
         `• Tape -100 (Expense cash)\n` +
         `• Light 187 O (Expense UPI)\n` +
         `• Tailor 200 (Chanda cash)\n` +
         `• Rohit A 101 500 (Building flat)`;
}

// =========================================================================
// 9. TELEGRAM WEBHOOK HANDLER & GEMINI VOICE ENGINE
// =========================================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function downloadTelegramAudio(env, fileId) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  }

  // 1. Get file path from Telegram
  const getFileUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const fileInfoRes = await fetch(getFileUrl);
  if (!fileInfoRes.ok) {
    throw new Error(`Telegram getFile request failed: HTTP ${fileInfoRes.status}`);
  }
  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error(`Telegram getFile error: ${fileInfo.description || 'file_path missing'}`);
  }

  const filePath = fileInfo.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;

  // 2. Fetch binary audio
  const audioRes = await fetch(downloadUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio file from Telegram: HTTP ${audioRes.status}`);
  }

  const arrayBuffer = await audioRes.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  let mimeType = 'audio/ogg';
  if (filePath.endsWith('.mp3')) mimeType = 'audio/mp3';
  else if (filePath.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (filePath.endsWith('.wav')) mimeType = 'audio/wav';

  return { base64, mimeType };
}

async function transcribeVoiceToCommands(env, audioBase64, mimeType, members = [], buildings = []) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in worker secrets.');
  }

  const memberNames = members.map(m => m.name).filter(Boolean).join(', ');
  const buildingCodes = buildings.map(b => b.code).filter(Boolean).join(', ');

  const systemInstruction =
    `You are the official voice assistant for Siyaram Mitra Mandal finance bot.\n` +
    `The audio is a voice note from a Mandal volunteer/member speaking in Hindi, Hinglish, or English.\n\n` +
    `Your task is twofold:\n` +
    `1. Accurately transcribe what the speaker said into natural text.\n` +
    `2. Convert the spoken intent into one or more concise bot command lines matching our exact shorthand syntax.\n\n` +
    `KNOWN ENTITIES IN MANDAL:\n` +
    `- Active Members: ${memberNames || 'Rahul, Rishi, Rohit, etc.'}\n` +
    `- Building Wings: ${buildingCodes || 'A, B, B2'}\n\n` +
    `SHORTHAND SYNTAX RULES:\n` +
    `- Member Inflow (Cash): "<MemberName> <Amount>" (e.g. "Rahul 200", "Rishi 500")\n` +
    `- Member Inflow (UPI/Online): "<MemberName> <Amount> O" (e.g. "Rahul 200 O", "Rishi 500 O")\n` +
    `- Building / Flat Inflow: "<ResidentName> <Wing> <FlatNumber> <Amount>" (append "O" if online/UPI. e.g. "Rohit A 101 500", "Sunil B2 204 1000 O")\n` +
    `- General Chanda / Donation: "<DonorName> <Amount>" (append "O" if online/UPI. e.g. "Tailor 200", "Sharma Ji 500 O")\n` +
    `- Expenses / Kharcha: "- <Amount> <ItemName>" (append "O" if online/UPI. e.g. "- 500 Light", "- 200 Tape", "- 1500 Sound O")\n` +
    `- Mandal Summary / Balances / Total: "/summary"\n` +
    `- Pending / Dues list: "/dues"\n` +
    `- Single Member Due Check: "<MemberName>" (e.g. "Rishi", "Rahul")\n` +
    `- Undo / Cancel Transaction: "undo" or "<SequenceNumber> undo" (e.g. "106 undo")\n\n` +
    `IMPORTANT RULES:\n` +
    `- If the speaker mentions multiple transactions (e.g. "Rahul ne 200 diye aur 500 ki light aayi"), create a separate command line for each transaction in the "commandLines" array.\n` +
    `- Match member names phonetically to the known member names list whenever possible.\n` +
    `- If the word "online", "gpay", "phonepe", "upi", or "scanner" is mentioned for a payment, append "O" at the end of that command line.\n` +
    `- If the audio is unclear, silent, or unrelated, return an empty array for "commandLines".\n\n` +
    `Return ONLY a JSON object with this exact structure:\n` +
    `{\n` +
    `  "transcription": "<What the user spoke in Hindi/Hinglish/English>",\n` +
    `  "commandLines": ["<command line 1>", "<command line 2>"]\n` +
    `}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/ogg',
              data: audioBase64,
            },
          },
          {
            text: systemInstruction,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  // Primary model: gemini-3.6-flash, Fallback: gemini-3.1-flash-lite
  const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini model ${model} HTTP ${response.status}: ${errText}`);
        lastError = new Error(`Gemini ${model} HTTP ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => p.text && !p.thought) || parts[0];
      let rawJson = textPart?.text || '{}';
      rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed = JSON.parse(rawJson);
      return {
        transcription: parsed.transcription || '',
        commandLines: Array.isArray(parsed.commandLines) ? parsed.commandLines : [],
      };
    } catch (err) {
      console.warn(`Attempt with ${model} failed:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to process audio.');
}

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
  const replyToId = msg.message_id;
  if (!chatId) return;

  let rawText = (msg.text || '').trim();
  let voiceHeader = '';

  const voiceObj = msg.voice || msg.audio;
  if (voiceObj) {
    if (!env.GEMINI_API_KEY) {
      return await sendTelegramReply(
        env,
        chatId,
        '⚠️ <b>Voice Error:</b> <code>GEMINI_API_KEY</code> is not configured.',
        replyToId
      );
    }

    // Immediate feedback so the user knows audio is being processed
    await sendTelegramReply(
      env,
      chatId,
      '🎙️ <i>Sun raha hoon... awaaz process ho rahi hai, ek second...</i>',
      replyToId
    );

    try {
      const season = await getActiveSeason(env);
      const [members, buildings] = await Promise.all([getMembers(env, season?.id), getBuildings(env, season?.id)]);
      const audioData = await downloadTelegramAudio(env, voiceObj.file_id);
      const result = await transcribeVoiceToCommands(
        env,
        audioData.base64,
        audioData.mimeType,
        members,
        buildings
      );

      if (!result || !result.commandLines || result.commandLines.length === 0) {
        const transcriptNotice = result?.transcription
          ? `🎙️ <i>"${escapeHtml(result.transcription)}"</i>\n\n`
          : '';
        return await sendTelegramReply(
          env,
          chatId,
          `${transcriptNotice}❓ Awaaz samajh nahi aayi ya koi payment command nahi mili.\n\nKripya saaf awaaz mein bolein, jaise:\n• <i>"Rahul 200"</i> (Cash)\n• <i>"Amit 500 online"</i> (UPI)\n• <i>"Light 1500 kharcha"</i> (Expense)\n• <i>"Summary batao"</i>`,
          replyToId
        );
      }

      voiceHeader = `🎙️ <i>"${escapeHtml(result.transcription || '')}"</i>\n━━━━━━━━━━━━━━━━━━━\n\n`;
      rawText = result.commandLines.join('\n');
    } catch (voiceErr) {
      console.error('Voice processing error:', voiceErr);
      return await sendTelegramReply(
        env,
        chatId,
        `⚠️ <b>Voice Processing Error:</b>\n<code>${escapeHtml(voiceErr.message || voiceErr)}</code>`,
        replyToId
      );
    }
  }

  if (!rawText) return;

  // Local helper to prepend voice transcript to any reply
  const reply = async (text) => {
    const fullText = voiceHeader ? voiceHeader + text : text;
    return await sendTelegramReply(env, chatId, fullText, replyToId);
  };

  try {
    // Clean leading slash
    let cleanCmd = rawText.startsWith('/') ? rawText.slice(1).trim() : rawText;
    // Strip group bot username e.g. /summary@siyaram_bot -> summary
    cleanCmd = cleanCmd.replace(/@\w+/g, '').trim();
    const lower = cleanCmd.toLowerCase().replace(/\s+/g, ' ');
    const normalized = lower.replace(/[\s_]+/g, '-');

    // 1. Help Menu
    if (['help', 'menu', '0', '9', 'start'].includes(lower) || ['help', 'menu', 'start'].includes(normalized)) {
      return await reply(getHelpMenu());
    }

    // 2. Summary
    if (['1', 'summary', 'dashboard', 'total', 'bal', 'balance'].includes(lower) || ['summary', 'dashboard', 'balance'].includes(normalized)) {
      const text = await getDashboardSummary(env);
      return await reply(text);
    }

    // 3. Member Dues
    if (['2', 'dues', 'due', 'pending'].includes(lower) || ['dues', 'due', 'pending'].includes(normalized)) {
      const text = await getMemberDuesList(env);
      return await reply(text);
    }

    // 4. Offline Income (Cash Inflow)
    if (
      ['3', 'cash-inflow', 'cash-inflows', 'cash-income', 'cash-incomes', 'offline-income', 'offline-inflow', 'cash'].includes(normalized) ||
      ['cash_inflow', 'cash_inflows', 'cash inflow', 'cash inflows', 'cash income'].includes(lower)
    ) {
      const text = await getPaginatedTransactions(env, 'INCOME', 'OFFLINE', '💵 Cash Inflows · Latest 15', false);
      return await reply(text);
    }

    // 5. Offline Expenses (Cash Expense)
    if (
      ['4', 'cash-expense', 'cash-expenses', 'offline-expense', 'offline-expenses'].includes(normalized) ||
      ['cash_expense', 'cash_expenses', 'cash expense', 'cash expenses'].includes(lower)
    ) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', 'OFFLINE', '📦 Cash Expenses · Latest 15', false);
      return await reply(text);
    }

    // 6. Online Income (UPI Inflow)
    if (
      ['5', 'upi-inflow', 'upi-inflows', 'upi-income', 'upi-incomes', 'online-inflow', 'online-inflows', 'online-income', 'upi'].includes(normalized) ||
      ['upi_inflow', 'upi_inflows', 'upi inflow', 'upi inflows', 'upi income'].includes(lower)
    ) {
      const text = await getPaginatedTransactions(env, 'INCOME', 'ONLINE', '📱 Online Inflows · Latest 15', false);
      return await reply(text);
    }

    // 7. Online Expenses (UPI Expense)
    if (
      ['6', 'upi-expense', 'upi-expenses', 'online-expense', 'online-expenses'].includes(normalized) ||
      ['upi_expense', 'upi_expenses', 'upi expense', 'upi expenses'].includes(lower)
    ) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', 'ONLINE', '⚡ Online Expenses · Latest 15', false);
      return await reply(text);
    }

    // 8. Combined Income
    if (['7', 'income', 'incomes', 'inflow', 'inflows'].includes(lower) || ['income', 'incomes', 'inflow', 'inflows'].includes(normalized)) {
      const text = await getPaginatedTransactions(env, 'INCOME', null, '📈 Income · Latest 15', true);
      return await reply(text);
    }

    // 9. Combined Expense
    if (['8', 'expense', 'expenses', 'expence', 'expences', 'kharcha'].includes(lower) || ['expense', 'expenses', 'expence', 'expences', 'kharcha'].includes(normalized)) {
      const text = await getPaginatedTransactions(env, 'EXPENSE', null, '📉 Expenses · Latest 15', true);
      return await reply(text);
    }

    // 10. Undo Command: "3 undo", "undo 3", "undo"
    const undoMatch = lower.match(/^(\d+)\s*(?:no|number|line)?\s*undo$/) ||
                      lower.match(/^undo\s*(?:no|number|line)?\s*(\d+)?$/);
    if (undoMatch) {
      const targetSeq = undoMatch[1] ? parseInt(undoMatch[1], 10) : null;
      const text = await executeUndo(env, targetSeq);
      return await reply(text);
    }

    // 11. Single Member Due Check (e.g. "Rishi", "due Rishi")
    const memberCheckMatch = lower.match(/^(?:due|status|check)?\s*([a-zA-Z\.\s_]+)$/);
    if (memberCheckMatch) {
      const candidate = memberCheckMatch[1].trim();
      const season = await getActiveSeason(env);
      const members = await getMembers(env, season?.id);
      const matched = members.find(m => m.name.toLowerCase().replace(/\./g, '') === candidate.replace(/\./g, ''));
      if (matched && season) {
        const d = computeMemberDues(matched, season);
        const rep = `👤 <b>${matched.name} Due Breakdown</b>\n\n` +
                    `• Previous Year Pending: ${formatINR(d.previousYearPending)}\n` +
                    `• Current Season Target: ${formatINR(d.currentSeasonTarget)}\n` +
                    `• Total Paid So Far: ${formatINR(d.currentSeasonPaid)}\n` +
                    `• Current Season Due: ${formatINR(d.currentSeasonDue)}\n\n` +
                    `<b>Total Due: ${formatINR(d.totalDue)}</b>`;
        return await reply(rep);
      }
    }

    // 12. Transaction Entry (Single or Multi-line)
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const season = await getActiveSeason(env);
    const [members, buildings] = await Promise.all([getMembers(env, season?.id), getBuildings(env, season?.id)]);

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
      const replyMsg = await executeTransactions(env, parsedItems);
      let finalMsg = replyMsg;
      if (unparsed.length > 0) {
        finalMsg += `\n\n⚠️ <i>Could not parse:</i>\n${unparsed.map(u => `• ${u}`).join('\n')}`;
      }
      return await reply(finalMsg);
    }

    // Default unrecognized command
    const defaultHelp = `❓ <b>Command not recognized:</b> ${rawText}\n\n` +
                        `<b>Available Commands:</b>\n` +
                        `• /summary — Mandal summary & balance\n` +
                        `• /dues — Member dues breakdown\n` +
                        `• /income — Recent inflows\n` +
                        `• /expense — Recent expenses\n` +
                        `• /cash_inflow — Recent cash collections\n` +
                        `• /cash_expense — Recent cash expenses\n` +
                        `• /upi_inflow — Recent UPI collections\n` +
                        `• /upi_expense — Recent UPI expenses\n` +
                        `• [number] undo — Reverse transaction\n` +
                        `• /help — Full command guide`;
    await reply(defaultHelp);
  } catch (err) {
    console.error('Error handling Telegram message:', err);
    await reply(`⚠️ <b>Bot Processing Error:</b>\n<code>${escapeHtml(err.message || err)}</code>`);
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

    if (request.method === 'GET' && url.pathname === '/test-sheet') {
      try {
        const spreadsheetId = env.SPREADSHEET_ID;
        const clientEmail = env.GOOGLE_CLIENT_EMAIL;
        let token = null;
        let tokenErr = null;
        try {
          token = await getGoogleAccessToken(env, SHEETS_SCOPES);
        } catch (te) {
          tokenErr = te.message;
        }

        let metaStatus = null;
        let metaBody = null;
        if (token && spreadsheetId) {
          const resp = await fetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          metaStatus = resp.status;
          metaBody = await resp.text();
        }

        return new Response(JSON.stringify({
          spreadsheetId,
          clientEmail,
          tokenSuccess: !!token,
          tokenErr,
          metaStatus,
          metaBody: metaBody ? (metaBody.length > 500 ? metaBody.slice(0, 500) + '...' : metaBody) : null
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
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
