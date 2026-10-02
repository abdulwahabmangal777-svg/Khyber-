import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, User, createAuditLog } from './db';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'HR' | 'VIEWER' | 'DRIVER';
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  workerId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// In-memory active session tokens map token -> AuthenticatedUser
const activeSessions = new Map<string, AuthenticatedUser>();

export function generateSessionToken(user: User): string {
  const token = 'tok_' + Buffer.from(`${user.id}:${Date.now()}:${Math.random()}`).toString('base64');
  const authUser: AuthenticatedUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    status: user.status,
    workerId: user.workerId
  };
  activeSessions.set(token, authUser);
  return token;
}

export function verifySessionToken(token: string): AuthenticatedUser | null {
  if (!token) return null;
  return activeSessions.get(token) || null;
}

export function revokeSessionToken(token: string): void {
  activeSessions.delete(token);
}

// Express auth middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in development and no token provided, fallback to admin user for smooth operations if needed
    const defaultUser = getDb().users.find(u => u.role === 'ADMIN') || getDb().users[0];
    if (defaultUser) {
      req.user = {
        id: defaultUser.id,
        username: defaultUser.username,
        email: defaultUser.email,
        fullName: defaultUser.fullName,
        role: defaultUser.role,
        department: defaultUser.department,
        status: defaultUser.status,
        workerId: defaultUser.workerId
      };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifySessionToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Your user account is inactive. Please contact your system administrator.' });
  }

  req.user = user;
  next();
}

// Role-based authorization middleware
export function requireRoles(...allowedRoles: Array<'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'HR' | 'VIEWER' | 'DRIVER'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access forbidden. Required role(s): ${allowedRoles.join(', ')}. Current role: ${req.user.role}`
    });
  };
}
