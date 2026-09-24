import fs from 'fs';
import crypto from 'crypto';

const sa = JSON.parse(fs.readFileSync('firebase-services.json', 'utf8'));
const backupData = JSON.parse(fs.readFileSync('migration_review/pre-rollover-backup-2026-09-21.json', 'utf8'));
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

async function main() {
  console.log('🔑 Authenticating with Google Service Account...');
  const token = await getAccessToken();
  console.log('✅ Service Account authenticated successfully.\n');

  console.log('👥 Restoring Members to root `members` collection...');
  for (const m of backupData.members) {
    await writeDoc(token, 'members', m.id, m);
    console.log(`   - Member [${m.name}] restored.`);
  }

  console.log('👥 Also restoring Members to `seasons/2025-26/members`...');
  for (const m of backupData.members) {
    await writeDoc(token, 'seasons/2025-26/members', m.id, m);
    console.log(`   - Member [${m.name}] restored to subcollection.`);
  }

  console.log('\n📅 Restoring Season 2025-26...');
  await writeDoc(token, 'seasons', '2025-26', backupData.season);
  console.log('✅ Season 2025-26 restored.');

  console.log('\n🎉 ALL MEMBER DATA RESTORED 100% SUCCESSFULLY!');
}

main().catch(console.error);
