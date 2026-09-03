import { timingSafeEqual } from 'node:crypto';

const DANGEROUS_DEFAULTS = new Set([
  'secret',
  'changeme',
  'password',
  'novaflow-dev-secret-change-in-production-32bytes',
  'admin123',
  'editor123',
]);

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function requireSecret(name: string, minLength = 32): string {
  const value = process.env[name]?.trim() ?? '';
  if (!value) {
    throw new Error(`[env] ${name} is required.`);
  }
  if (value.length < minLength) {
    throw new Error(`[env] ${name} must be at least ${minLength} characters.`);
  }
  if (DANGEROUS_DEFAULTS.has(value.toLowerCase())) {
    throw new Error(`[env] ${name} uses a forbidden default value.`);
  }
  return value;
}

export function getJwtSecret(): string {
  if (isProductionRuntime()) {
    return requireSecret('JWT_SECRET', 32);
  }
  const value = process.env.JWT_SECRET?.trim();
  if (value && !DANGEROUS_DEFAULTS.has(value.toLowerCase()) && value.length >= 32) {
    return value;
  }
  // Development-only fallback — never used when NODE_ENV=production.
  return 'novaflow-dev-secret-change-in-production-32bytes';
}

export function getCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  if (isProductionRuntime()) {
    throw new Error('[env] CORS_ORIGINS must be set in production (comma-separated HTTPS origins).');
  }

  return [
    'http://localhost:4321',
    'http://127.0.0.1:4321',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
}

export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return isProductionRuntime();
}

export function assertDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim() ?? '';
  if (isProductionRuntime()) {
    if (!value) throw new Error('[env] DATABASE_URL is required in production.');
    if (/novaflow:novaflow@|localhost|127\.0\.0\.1/i.test(value)) {
      throw new Error('[env] DATABASE_URL must not use development credentials or localhost in production.');
    }
    return value;
  }
  return value || 'postgresql://novaflow:novaflow@localhost:5435/novaflow';
}

export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
