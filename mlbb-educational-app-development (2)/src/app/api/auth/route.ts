import { db } from '@/db';
import { loginAttempts, usedTotps } from '@/db/schema';
import {
  adminConfigured,
  cookieOptions,
  requireMutation,
  safeEqual,
  token,
  totpCounter,
  validatePassword,
} from '@/lib/auth';
import { and, count, eq, gte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
export async function POST(req: NextRequest) {
  try {
    requireMutation(req);
    if (!adminConfigured())
      return NextResponse.json(
        {
          error:
            'Owner access is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET and SESSION_SECRET on the server. See the deployment guide.',
        },
        { status: 503 },
      );
    const data = await req.json();
    if (
      typeof data.email !== 'string' ||
      typeof data.password !== 'string' ||
      typeof data.code !== 'string' ||
      data.password.length > 256
    )
      return NextResponse.json(
        { error: 'Enter a valid email, password, and six-digit code.' },
        { status: 400 },
      );
    const key = createHash('sha256')
      .update(process.env.ADMIN_EMAIL || 'owner')
      .digest('hex');
    const [recent] = await db
      .select({ n: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.key, key),
          gte(loginAttempts.createdAt, new Date(Date.now() - 15 * 60 * 1000)),
        ),
      );
    if (recent.n >= 10)
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please wait 15 minutes.', code: 'login_rate_limited' },
        { status: 429 },
      );
    await db.insert(loginAttempts).values({ id: randomUUID(), key });
    const validEmail = safeEqual(
      data.email.toLowerCase(),
      (process.env.ADMIN_EMAIL || '').toLowerCase(),
    );
    const validPassword = validatePassword(data.password);
    const counter = totpCounter(data.code);
    if (!validEmail || !validPassword || counter === null)
      return NextResponse.json(
        {
          error: 'Email, password, or authentication code is incorrect.',
          code: 'invalid_credentials',
        },
        { status: 401 },
      );
    const used = await db
      .insert(usedTotps)
      .values({ counter: String(counter) })
      .onConflictDoNothing()
      .returning();
    if (!used.length)
      return NextResponse.json(
        { error: 'This code was already used. Wait for the next code.', code: 'code_used' },
        { status: 401 },
      );
    const res = NextResponse.json({ ok: true });
    res.cookies.set('nexus-admin', token({ role: 'admin', exp: Date.now() + 8 * 3600 * 1000 }), {
      ...cookieOptions,
      maxAge: 8 * 3600,
    });
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
    return res;
  } catch {
    return NextResponse.json(
      { error: 'Unable to sign in. Refresh your session and try again.' },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  try {
    requireMutation(req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('nexus-admin', '', { ...cookieOptions, maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
  }
}
