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

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
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

// 1. Get Building A
const bRes = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/buildings/A`, {
  headers: { Authorization: `Bearer ${access_token}` }
});
const bDoc = await bRes.json();
const buildingA = {};
for (const [k, v] of Object.entries(bDoc.fields)) {
  buildingA[k] = fromFirestoreValue(v);
}

// 2. Find Flat 101 and set amountPaid to 300
let found = false;
buildingA.floors = (buildingA.floors || []).map(flr => ({
  ...flr,
  flats: (flr.flats || []).map(flat => {
    if (flat.flatNo === '101') {
      found = true;
      console.log('Found Flat 101, updating from', flat.amountPaid, 'to 300');
      return {
        ...flat,
        amountPaid: 300,
        isPaid: true,
        updatedAt: new Date().toISOString()
      };
    }
    return flat;
  })
}));

if (found) {
  const fields = {};
  for (const [k, v] of Object.entries(buildingA)) {
    fields[k] = toFirestoreValue(v);
  }
  const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/buildings/A`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  console.log('Patch status:', patchRes.status);
}
