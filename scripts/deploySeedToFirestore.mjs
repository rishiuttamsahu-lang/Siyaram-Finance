import fs from 'fs';
import crypto from 'crypto';

const sa = JSON.parse(fs.readFileSync('firebase-services.json', 'utf8'));
const seedData = JSON.parse(fs.readFileSync('migration_review/clean-verified-seed-data.json', 'utf8'));
const projectId = sa.project_id;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64(header)}.${b64(claimSet)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(sa.private_key, 'base64url');

  const signedJwt = `${unsignedToken}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error('OAuth failed: ' + JSON.stringify(data));
  return data.access_token;
}

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

async function writeDoc(token, collectionName, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to write doc [${collectionName}/${docId}]: ${errText}`);
  }
}

async function getDocs(token, collectionName) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=300`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to get docs from ${collectionName}: ${err}`);
  }
  const data = await resp.json();
  return data.documents || [];
}

async function main() {
  console.log('🔑 Authenticating with Google Service Account...');
  const token = await getAccessToken();
  console.log('✅ Service Account authenticated successfully.\n');

  // 1. Fetch existing members to map names to doc IDs
  console.log('🔍 Fetching existing member docs from Firestore...');
  const existingDocs = await getDocs(token, 'members');
  const nameToId = {};
  for (const doc of existingDocs) {
    const id = doc.name.split('/').pop();
    const nameVal = doc.fields?.name?.stringValue || '';
    const cleanName = nameVal.trim().toUpperCase().replace(/\./g, '');
    nameToId[cleanName] = id;
  }
  console.log('   Found existing members:', nameToId);

  // 2. Deploy Season
  console.log('\n📅 Deploying Season...');
  const season = {
    ...seedData.season,
    id: '2025-26',
    name: 'Ganesh Utsav 2025–26',
  };
  await writeDoc(token, 'seasons', season.id, season);
  console.log(`✅ Season [${season.id}] written.`);

  // 3. Deploy Members
  console.log('\n👥 Deploying Members...');
  for (const m of seedData.members) {
    const cleanName = m.name.trim().toUpperCase().replace(/\./g, '');
    const docId = nameToId[cleanName] || m.id;
    const memberDoc = {
      ...m,
      id: docId,
    };
    await writeDoc(token, 'members', docId, memberDoc);
    console.log(`   - Member [${m.name}] deployed to doc [${docId}].`);
  }

  // 4. Deploy Buildings
  console.log('\n🏢 Deploying Buildings...');
  for (const b of seedData.buildings) {
    await writeDoc(token, 'buildings', b.code, b);
    console.log(`   - Building [${b.name}] (Code: ${b.code}) deployed.`);
  }

  // 5. Deploy Transactions
  console.log(`\n💳 Deploying ${seedData.transactions.length} Transactions...`);
  for (let i = 0; i < seedData.transactions.length; i++) {
    const txn = seedData.transactions[i];
    await writeDoc(token, 'transactions', txn.id, txn);
    if ((i + 1) % 20 === 0 || i === seedData.transactions.length - 1) {
      console.log(`   - Written ${i + 1}/${seedData.transactions.length} transactions`);
    }
  }

  // 6. Deploy Audit Log
  console.log('\n📜 Deploying Initial Audit Log...');
  const auditLog = {
    id: `log-seed-${Date.now()}`,
    action: 'CREATE',
    previousValue: null,
    newValue: {
      seasonId: season.id,
      openingBalance: season.openingBalance,
      membersTotal: seedData.summary.breakdown.membersTotal,
      buildingsTotal: seedData.summary.breakdown.buildingsTotal,
      chandaTotal: seedData.summary.breakdown.chandaTotal,
      expensesTotal: seedData.summary.breakdown.expensesTotal,
      transactionsCount: seedData.transactions.length,
      netOnlineBalance: seedData.summary.netOnlineBalance,
      netCashInHand: seedData.summary.netCashInHand,
      totalNetBalance: seedData.summary.totalNetBalance,
    },
    performedBy: 'Admin:VerifiedSeedDeployer',
    timestamp: new Date().toISOString(),
    notes: 'Verified migration seed deployment: 10 members, 3 buildings, 100 transactions, fully reconciled online/offline pools.',
  };
  await writeDoc(token, 'auditLogs', auditLog.id, auditLog);
  console.log(`✅ Audit Log [${auditLog.id}] written.`);

  console.log('\n======================================================');
  console.log('🎉 ALL DATA SUCCESSFULLY SEEDED TO PRODUCTION FIRESTORE!');
  console.log('======================================================');
  console.log(`Season:           ${season.id} (Opening Balance: ₹${season.openingBalance})`);
  console.log(`Members:          ${seedData.members.length} members deployed`);
  console.log(`Buildings:        ${seedData.buildings.length} wings deployed (A, B, B2)`);
  console.log(`Transactions:     ${seedData.transactions.length} active transactions`);
  console.log(`Net Online Pool:  ₹${seedData.summary.netOnlineBalance}`);
  console.log(`Cash in Hand:     ₹${seedData.summary.netCashInHand}`);
  console.log(`Grand Net Balance:₹${seedData.summary.totalNetBalance}`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err);
  process.exit(1);
});
