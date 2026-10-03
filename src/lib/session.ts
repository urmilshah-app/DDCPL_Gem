// ---------------------------------------------------------------------------
// Session tokens — HS256 JWT in an httpOnly cookie.
// Edge-safe: no node-only imports (used by middleware).
// ---------------------------------------------------------------------------

import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'ddcpl_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  );
}

export function sessionCookieOptions() {
  const secure = process.env.AUTH_COOKIE_SECURE
    ? process.env.AUTH_COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: String(payload.role ?? 'USER'),
    };
  } catch {
    return null;
  }
}

/** For server components / route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { cookies } = await import('next/headers');
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
