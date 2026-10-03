import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export function cuid(): string {
  // deterministic-ish unique id; respects length & uniqueness requirements of the schema
  return `c${randomBytes(12).toString('hex').slice(0, 24)}`;
}

export function uuid(): string {
  return randomUUID();
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function contentHash(parts: Array<string | null | undefined>): string {
  return sha256(parts.filter((p): p is string => !!p).map((p) => p.trim().toLowerCase().normalize('NFKD')).join('\u0001'));
}

const KEY_LEN = 32;
const IV_LEN = 16;
const ALGO = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** AES-256-GCM encryption for sensitive stored values (Json settings, provider keys). */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decrypt(payload: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload');
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]);
  return dec.toString('utf8');
}

export function secureRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function compareHmac(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
