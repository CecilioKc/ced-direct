import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ced-direct-secret-2026';

export interface TokenPayload {
  agentId: number;
  name: string;
  code: string;
  role: 'agent' | 'manager';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookie(cookieHeader: string | null): TokenPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}