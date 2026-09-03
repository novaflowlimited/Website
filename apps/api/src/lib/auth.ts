import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getJwtSecret } from './env';

let encodedSecret: Uint8Array | null = null;

function getSecretBytes() {
  if (!encodedSecret) {
    encodedSecret = new TextEncoder().encode(getJwtSecret());
  }
  return encodedSecret;
}

const SESSION_COOKIE = 'novaflow_session';
const TOKEN_TTL = 60 * 60 * 8; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(getSecretBytes());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretBytes());
    const data = payload as JWTPayload & SessionUser;
    if (!data.id || !data.email || !data.role) return null;
    if (data.role !== 'admin' && data.role !== 'editor') return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getTokenTtl(): number {
  return TOKEN_TTL;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
