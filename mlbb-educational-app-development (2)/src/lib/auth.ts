import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
const devKey = randomBytes(32).toString('hex');
const key = () => process.env.SESSION_SECRET || devKey;
const sign = (value: string) => createHmac('sha256', key()).update(value).digest('base64url');
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function token(payload: Record<string, unknown>) {
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${value}.${sign(value)}`;
}
export function verify(value: string | undefined): Record<string, unknown> | null {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
export async function isAdmin() {
  const store = await cookies();
  return verify(store.get('nexus-admin')?.value)?.role === 'admin';
}
export function adminConfigured() {
  return Boolean(
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD_HASH &&
    process.env.ADMIN_TOTP_SECRET &&
    process.env.SESSION_SECRET,
  );
}
export function validatePassword(password: string) {
  const encoded = process.env.ADMIN_PASSWORD_HASH || '';
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(password, salt, 64).toString('hex'), hash);
}
function base32(input: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of input.toUpperCase().replace(/=|\s/g, '')) {
    const i = alphabet.indexOf(c);
    if (i < 0) return Buffer.alloc(0);
    bits += i.toString(2).padStart(5, '0');
  }
  const values = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) values.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(values);
}
export function totpCounter(code: string): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32(process.env.ADMIN_TOTP_SECRET || '');
  if (!secret.length) return null;
  const now = Math.floor(Date.now() / 30000);
  for (let offset = -1; offset <= 1; offset++) {
    const counter = now + offset;
    const data = Buffer.alloc(8);
    data.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', secret).update(data).digest();
    const at = digest[digest.length - 1] & 15;
    const actual = ((digest.readUInt32BE(at) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
    if (safeEqual(code, actual)) return counter;
  }
  return null;
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const incoming = new URL(origin);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return incoming.host === host;
  } catch {
    return false;
  }
}
export function visitorFrom(req: NextRequest): string | null {
  const session = verify(req.cookies.get('nexus-visitor')?.value);
  const csrf = req.headers.get('x-csrf-token');
  return session &&
    typeof session.id === 'string' &&
    typeof session.csrf === 'string' &&
    csrf &&
    safeEqual(session.csrf, csrf)
    ? session.id
    : null;
}
export function requireMutation(req: NextRequest) {
  if (!sameOrigin(req))
    throw Object.assign(new Error('Invalid request origin'), { code: 'invalid_origin' });
  const id = visitorFrom(req);
  if (!id)
    throw Object.assign(new Error('Your session expired. Refresh the page and try again.'), {
      code: 'session_expired',
    });
  return id;
}
