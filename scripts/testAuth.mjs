import fs from 'fs';
import crypto from 'crypto';

const sa = JSON.parse(fs.readFileSync('firebase-services.json', 'utf8'));

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
  if (!resp.ok) {
    throw new Error('OAuth error: ' + JSON.stringify(data));
  }
  return data.access_token;
}

getAccessToken()
  .then((token) => console.log('Successfully acquired OAuth2 Access Token! Prefix:', token.slice(0, 15) + '...'))
  .catch((err) => console.error(err));
