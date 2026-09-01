import { createHash, timingSafeEqual } from 'node:crypto';

const DEFAULT_AUTH_MODE = 'azure';
const TEST_DEPLOYMENT_ENV = 'test';
const MIN_PASSWORD_LENGTH = 16;

function parseList(value, { uppercase = false } = {}) {
  if (!value) return [];

  return [...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (uppercase ? item.toUpperCase() : item.toLowerCase()))
  )];
}

/**
 * Resolve the server-side authentication mode and validate every test-login
 * safety requirement. Invalid local-auth configuration deliberately throws so
 * a deployment cannot silently start with an unsafe bypass.
 */
export function getTestAuthConfig(env = process.env) {
  const mode = (env.AUTH_MODE || DEFAULT_AUTH_MODE).trim().toLowerCase();

  if (mode !== 'azure' && mode !== 'local') {
    throw new Error('[auth] AUTH_MODE must be either "azure" or "local".');
  }

  if (mode === 'azure') {
    return {
      enabled: false,
      password: '',
      allowedCodes: new Set(),
      allowedHosts: new Set(),
    };
  }

  if ((env.DEPLOYMENT_ENV || '').trim().toLowerCase() !== TEST_DEPLOYMENT_ENV) {
    throw new Error(
      '[auth] Local authentication is refused unless DEPLOYMENT_ENV=test.'
    );
  }

  const password = env.LOCAL_AUTH_PASSWORD || '';
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `[auth] LOCAL_AUTH_PASSWORD must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  const allowedCodes = new Set(
    parseList(env.LOCAL_AUTH_ALLOWED_CODES, { uppercase: true })
  );
  if (allowedCodes.size === 0) {
    throw new Error('[auth] LOCAL_AUTH_ALLOWED_CODES must list at least one test account code.');
  }

  const allowedHosts = new Set(parseList(env.LOCAL_AUTH_ALLOWED_HOSTS));
  if (allowedHosts.size === 0) {
    throw new Error('[auth] LOCAL_AUTH_ALLOWED_HOSTS must list the exact test-server host.');
  }

  return { enabled: true, password, allowedCodes, allowedHosts };
}

function readHeader(headers, name) {
  if (headers && typeof headers.get === 'function') {
    return headers.get(name);
  }

  if (headers && typeof headers === 'object') {
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
    return entry?.[1];
  }

  return null;
}

/** Only exact, explicitly configured request hosts may use local auth. */
export function isTestAuthHostAllowed(headers, allowedHosts) {
  const rawHost = readHeader(headers, 'host');
  if (typeof rawHost !== 'string') return false;

  const host = rawHost.trim().toLowerCase().replace(/\.$/, '');
  return host.length > 0 && !host.includes(',') && allowedHosts.has(host);
}

/** Compare secrets without leaking an early character mismatch. */
export function testPasswordMatches(actual, expected) {
  if (typeof actual !== 'string' || actual.length > 1024) return false;

  const actualDigest = createHash('sha256').update(actual).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function normalizeTestCode(value) {
  if (typeof value !== 'string') return '';
  const code = value.trim().toUpperCase();
  return code.length <= 50 ? code : '';
}
