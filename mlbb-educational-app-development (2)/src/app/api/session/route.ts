import { adminConfigured, cookieOptions, isAdmin, token, verify } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
export async function GET(req: NextRequest) {
  const old = verify(req.cookies.get('nexus-visitor')?.value);
  const session = old || {
    id: randomUUID(),
    csrf: randomBytes(24).toString('hex'),
    exp: Date.now() + 30 * 24 * 3600 * 1000,
  };
  const response = NextResponse.json(
    { csrf: session.csrf, admin: await isAdmin(), configured: adminConfigured() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  if (!old)
    response.cookies.set('nexus-visitor', token(session), {
      ...cookieOptions,
      maxAge: 30 * 24 * 3600,
    });
  return response;
}
