// Authentication, Role & Permission Guards
import { Request, Response, NextFunction } from 'express';
import { verifyToken, getSessionUser } from '../auth/service';
import { hasPermission, PermissionCode } from '../roles';
import { sendError, AppError } from './response';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return sendError(res, new AppError('Invalid token format.', 401, 'INVALID_TOKEN'));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return sendError(res, new AppError('Session expired or token invalid. Please log in again.', 401, 'TOKEN_EXPIRED'));
  }

  const user = getSessionUser(decoded.userId);
  if (!user || user.status !== 'ACTIVE') {
    return sendError(res, new AppError('User account not found or disabled.', 403, 'ACCOUNT_DISABLED'));
  }

  req.user = user;
  req.token = token;
  next();
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next(); // Super admin has full access
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, new AppError(`Access forbidden. Required role(s): ${allowedRoles.join(', ')}`, 403, 'FORBIDDEN'));
    }

    next();
  };
}

export function requirePermissions(...requiredPermissions: PermissionCode[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    for (const perm of requiredPermissions) {
      if (!hasPermission(req.user.role, perm)) {
        return sendError(res, new AppError(`Missing required permission: ${perm}`, 403, 'PERMISSION_DENIED'));
      }
    }

    next();
  };
}
