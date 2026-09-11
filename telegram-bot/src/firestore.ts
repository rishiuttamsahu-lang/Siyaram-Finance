import { Env, Season, Member, Building, Transaction, AuditLog } from './types.ts';

// In-memory token cache in the Worker isolate
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Creates an OAuth2 Access Token for Google Cloud APIs using Web Crypto API
 * when a Service Account JSON is configured in FIREBASE_SERVICE_ACCOUNT.
 */
async function getServiceAccountAccessToken(serviceAccountJson: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const sa = JSON.parse(serviceAccountJson);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const enc = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const unsignedToken = `${enc(header)}.${enc(claimSet)}`;

  // Parse private key from PEM to Web Crypto Key
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/[\r\n\s]/g, '');

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;

  // Exchange JWT for Bearer token
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to obtain Google OAuth2 token: ${errText}`);
  }

  const data: any = await resp.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

/**
 * Encodes plain JavaScript values into Firestore REST typed field objects.
 */
export function toFirestoreValue(val: any): any {
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
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Decodes Firestore REST typed fields into plain JavaScript objects.
 */
export function fromFirestoreValue(valObj: any): any {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in valObj) {
    const res: Record<string, any> = {};
    const fields = valObj.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function fromFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return data;
}

/**
 * Helper to build auth headers and URL for Firestore REST requests.
 */
async function getFirestoreReqConfig(env: Env, path: string) {
  const base = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let url = `${base}/${path}`;
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const token = await getServiceAccountAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('Service account auth error, falling back to API key:', e);
      url += `?key=${env.FIREBASE_API_KEY}`;
    }
  } else {
    url += `?key=${env.FIREBASE_API_KEY}`;
  }

  return { url, headers };
}

export class FirestoreClient {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Fetches the active season document.
   */
  async getActiveSeason(): Promise<Season | null> {
    const { url, headers } = await getFirestoreReqConfig(this.env, 'seasons');
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn('Failed to fetch seasons:', await resp.text());
      return null;
    }
    const json: any = await resp.json();
    const docs = json.documents || [];
    for (const doc of docs) {
      const s = fromFirestoreDoc(doc) as Season;
      if (s && s.isActive) return s;
    }
    if (docs.length > 0) {
      return fromFirestoreDoc(docs[0]) as Season;
    }
    return null;
  }

  /**
   * Fetches all registered members.
   */
  async getMembers(): Promise<Member[]> {
    const { url, headers } = await getFirestoreReqConfig(this.env, 'members');
    const resp = await fetch(`${url}&pageSize=200`, { headers });
    if (!resp.ok) {
      console.warn('Failed to fetch members:', await resp.text());
      return [];
    }
    const json: any = await resp.json();
    return (json.documents || []).map((d: any) => fromFirestoreDoc(d) as Member);
  }

  /**
   * Fetches all building wings and flats.
   */
  async getBuildings(): Promise<Building[]> {
    const { url, headers } = await getFirestoreReqConfig(this.env, 'buildings');
    const resp = await fetch(`${url}&pageSize=50`, { headers });
    if (!resp.ok) {
      console.warn('Failed to fetch buildings:', await resp.text());
      return [];
    }
    const json: any = await resp.json();
    return (json.documents || []).map((d: any) => fromFirestoreDoc(d) as Building);
  }

  /**
   * Fetches recent transactions for summary, ledgers, and reversal checks.
   */
  async getTransactions(limit = 100): Promise<Transaction[]> {
    const { url, headers } = await getFirestoreReqConfig(this.env, 'transactions');
    const resp = await fetch(`${url}&pageSize=${limit}`, { headers });
    if (!resp.ok) {
      console.warn('Failed to fetch transactions:', await resp.text());
      return [];
    }
    const json: any = await resp.json();
    const list = (json.documents || []).map((d: any) => fromFirestoreDoc(d) as Transaction);
    return list.sort((a: Transaction, b: Transaction) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
  }

  /**
   * Generates the next monotonically increasing transaction sequence number.
   */
  async getNextSequenceNumber(): Promise<number> {
    const txns = await this.getTransactions(300);
    if (txns.length === 0) return 1;
    let maxSeq = 0;
    for (const t of txns) {
      if (t.sequenceNumber && t.sequenceNumber > maxSeq) {
        maxSeq = t.sequenceNumber;
      }
    }
    return maxSeq + 1;
  }

  /**
   * Saves a new transaction document in Firestore.
   */
  async saveTransaction(txn: Transaction): Promise<void> {
    const { url, headers } = await getFirestoreReqConfig(this.env, `transactions/${txn.id}`);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(txn)) {
      fields[k] = toFirestoreValue(v);
    }

    const resp = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Failed to save transaction: ${err}`);
    }
  }

  /**
   * Updates an existing member document.
   */
  async saveMember(member: Member): Promise<void> {
    const { url, headers } = await getFirestoreReqConfig(this.env, `members/${member.id}`);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(member)) {
      fields[k] = toFirestoreValue(v);
    }

    const resp = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Failed to update member: ${err}`);
    }
  }

  /**
   * Updates a building document.
   */
  async saveBuilding(building: Building): Promise<void> {
    const docId = building.code || building.id;
    const { url, headers } = await getFirestoreReqConfig(this.env, `buildings/${docId}`);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(building)) {
      fields[k] = toFirestoreValue(v);
    }

    const resp = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Failed to update building: ${err}`);
    }
  }

  /**
   * Saves an audit log entry.
   */
  async saveAuditLog(log: AuditLog): Promise<void> {
    const { url, headers } = await getFirestoreReqConfig(this.env, `auditLogs/${log.id}`);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(log)) {
      fields[k] = toFirestoreValue(v);
    }

    await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });
  }
}
