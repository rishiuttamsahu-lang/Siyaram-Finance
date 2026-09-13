import fs from 'fs';
import crypto from 'crypto';

const serviceAccount = JSON.parse(fs.readFileSync('firebase-services.json', 'utf8'));
const env = {
  FIREBASE_PROJECT_ID: serviceAccount.project_id,
  GOOGLE_CLIENT_EMAIL: serviceAccount.client_email,
  GOOGLE_PRIVATE_KEY: serviceAccount.private_key,
};

const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
const claim = Buffer.from(JSON.stringify({
  iss: env.GOOGLE_CLIENT_EMAIL,
  scope: 'https://www.googleapis.com/auth/datastore',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600
})).toString('base64url');

const sign = crypto.createSign('RSA-SHA256');
sign.update(`${header}.${claim}`);
const sig = sign.sign(env.GOOGLE_PRIVATE_KEY, 'base64url');
const jwt = `${header}.${claim}.${sig}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  })
});
const { access_token } = await tokenRes.json();

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
  if (!doc || !doc.fields) return null;
  const res = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    res[k] = fromFirestoreValue(v);
  }
  return res;
}

// Fetch Buildings
const bRes = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/buildings?pageSize=100`, {
  headers: { Authorization: `Bearer ${access_token}` }
});
const bJson = await bRes.json();
const buildings = (bJson.documents || []).map(fromFirestoreDoc);

let totalBuildingFlatAmount = 0;
const flatList = [];
buildings.forEach(b => {
  (b.floors || []).forEach(fl => {
    (fl.flats || []).forEach(flat => {
      if (flat.isPaid && flat.amountPaid > 0) {
        totalBuildingFlatAmount += flat.amountPaid;
        flatList.push({ building: b.code, flatNo: flat.flatNo, amountPaid: flat.amountPaid, resident: flat.residentName });
      }
    });
  });
});

console.log('--- BUILDINGS FLATS SUM ---');
console.log('Total Paid Flats:', flatList.length);
console.log('Total Building Flats Amount:', totalBuildingFlatAmount);
console.log('Sample Flats:', flatList.slice(0, 10));

// Fetch Transactions
let allTxns = [];
let pageToken = '';
do {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/transactions?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
  const tRes = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
  const tJson = await tRes.json();
  const docs = (tJson.documents || []).map(fromFirestoreDoc);
  allTxns.push(...docs);
  pageToken = tJson.nextPageToken;
} while (pageToken);

const buildingTxns = allTxns.filter(t => t.type === 'BUILDING' && t.status === 'ACTIVE');
const totalBuildingTxnAmount = buildingTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

console.log('\n--- TRANSACTIONS (BUILDING TYPE) ---');
console.log('Total Active Building Transactions:', buildingTxns.length);
console.log('Total Building Txns Amount:', totalBuildingTxnAmount);

const diff = totalBuildingTxnAmount - totalBuildingFlatAmount;
console.log('\n--- MISMATCH ---');
console.log(`Difference (Txns - Flats): ₹${diff}`);

// Check recent building txns
buildingTxns.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
console.log('Latest 5 Building Txns:', buildingTxns.slice(0, 5).map(t => ({
  seq: t.sequenceNumber,
  desc: t.description,
  amount: t.amount,
  status: t.status,
  timestamp: t.timestamp
})));
