// Authentication Service: Password Hashing, JWT Tokens, Refresh Tokens, Lockout Protection
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { getDb, saveDatabase, createAuditLog, User } from '../db';
import { AppError } from '../common/response';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  email: string;
}

// In-memory token revocation & active session registry
const revokedTokens = new Set<string>();
const loginAttempts = new Map<string, { attempts: number; lockedUntil?: number }>();
const refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

export function generateTokens(user: User): { accessToken: string; refreshToken: string; expiresIn: string } {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    email: user.email
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any
  });

  const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any
  });

  // Store refresh token
  const decodedRefresh: any = jwt.decode(refreshToken);
  if (decodedRefresh && decodedRefresh.exp) {
    refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: decodedRefresh.exp * 1000
    });
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn
  };
}

export function verifyToken(token: string): TokenPayload | null {
  if (revokedTokens.has(token)) return null;

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch {
    // If not standard JWT, check fallback token cache for development
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
    const stored = refreshTokens.get(token);
    if (!stored || stored.expiresAt < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function revokeToken(token: string) {
  revokedTokens.add(token);
  refreshTokens.delete(token);
}

export function rotateRefreshToken(oldRefreshToken: string): { accessToken: string; refreshToken: string } | null {
  const verified = verifyRefreshToken(oldRefreshToken);
  if (!verified) return null;

  // Revoke old token
  refreshTokens.delete(oldRefreshToken);

  const db = getDb();
  const user = db.users.find(u => u.id === verified.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return generateTokens(user);
}

export function checkLoginAttempts(identifier: string): { isLocked: boolean; remainingMinutes?: number } {
  const record = loginAttempts.get(identifier.toLowerCase());
  if (!record) return { isLocked: false };

  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / (60 * 1000));
    return { isLocked: true, remainingMinutes: remaining };
  }

  // Clear expired lock
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginAttempts.delete(identifier.toLowerCase());
  }

  return { isLocked: false };
}

export function recordFailedLogin(identifier: string) {
  const key = identifier.toLowerCase();
  const current = loginAttempts.get(key) || { attempts: 0 };
  current.attempts += 1;

  if (current.attempts >= config.security.maxLoginAttempts) {
    current.lockedUntil = Date.now() + config.security.lockoutDurationMinutes * 60 * 1000;
  }

  loginAttempts.set(key, current);
}

export function resetLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier.toLowerCase());
}

export function getSessionUser(userId: string): User | null {
  const db = getDb();
  return db.users.find(u => u.id === userId) || null;
}
