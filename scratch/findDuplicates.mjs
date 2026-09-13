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
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) obj[k] = fromFirestoreValue(v);
    return obj;
  }
  return null;
}

function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const res = {};
  for (const [k, v] of Object.entries(doc.fields)) res[k] = fromFirestoreValue(v);
  return res;
}

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
const byFlat = {};
buildingTxns.forEach(t => {
  const desc = t.description;
  if (!byFlat[desc]) byFlat[desc] = [];
  byFlat[desc].push(t);
});

console.log('--- DUPLICATE BUILDING TRANSACTIONS ---');
for (const [desc, list] of Object.entries(byFlat)) {
  if (list.length > 1) {
    console.log(`Flat: ${desc} (count: ${list.length})`);
    list.forEach(item => {
      console.log(`   #${item.sequenceNumber} - ₹${item.amount} (${item.timestamp}) [${item.id}]`);
    });
  }
}
