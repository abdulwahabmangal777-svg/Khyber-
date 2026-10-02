// Role-Based Access Control (RBAC) & Permissions Engine

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'HR'
  | 'ACCOUNTANT'
  | 'FLEET_MANAGER'
  | 'VIEWER';

export type PermissionCode =
  | 'vehicle.read'
  | 'vehicle.create'
  | 'vehicle.update'
  | 'vehicle.delete'
  | 'worker.read'
  | 'worker.create'
  | 'worker.update'
  | 'worker.delete'
  | 'document.read'
  | 'document.upload'
  | 'document.delete'
  | 'maintenance.read'
  | 'maintenance.create'
  | 'maintenance.update'
  | 'maintenance.delete'
  | 'fuel.read'
  | 'fuel.create'
  | 'fuel.update'
  | 'fuel.delete'
  | 'expense.read'
  | 'expense.create'
  | 'expense.update'
  | 'expense.delete'
  | 'report.read'
  | 'report.export'
  | 'user.manage'
  | 'settings.manage'
  | 'audit.read'
  | 'notification.manage';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  SUPER_ADMIN: [
    'vehicle.read', 'vehicle.create', 'vehicle.update', 'vehicle.delete',
    'worker.read', 'worker.create', 'worker.update', 'worker.delete',
    'document.read', 'document.upload', 'document.delete',
    'maintenance.read', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
    'fuel.read', 'fuel.create', 'fuel.update', 'fuel.delete',
    'expense.read', 'expense.create', 'expense.update', 'expense.delete',
    'report.read', 'report.export',
    'user.manage', 'settings.manage', 'audit.read', 'notification.manage'
  ],

  ADMIN: [
    'vehicle.read', 'vehicle.create', 'vehicle.update', 'vehicle.delete',
    'worker.read', 'worker.create', 'worker.update', 'worker.delete',
    'document.read', 'document.upload', 'document.delete',
    'maintenance.read', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
    'fuel.read', 'fuel.create', 'fuel.update', 'fuel.delete',
    'expense.read', 'expense.create', 'expense.update', 'expense.delete',
    'report.read', 'report.export',
    'user.manage', 'settings.manage', 'audit.read', 'notification.manage'
  ],

  MANAGER: [
    'vehicle.read', 'vehicle.create', 'vehicle.update',
    'worker.read', 'worker.create', 'worker.update',
    'document.read', 'document.upload',
    'maintenance.read', 'maintenance.create', 'maintenance.update',
    'fuel.read', 'fuel.create', 'fuel.update',
    'expense.read', 'expense.create',
    'report.read', 'report.export',
    'audit.read', 'notification.manage'
  ],

  FLEET_MANAGER: [
    'vehicle.read', 'vehicle.create', 'vehicle.update',
    'worker.read',
    'document.read', 'document.upload',
    'maintenance.read', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
    'fuel.read', 'fuel.create', 'fuel.update', 'fuel.delete',
    'expense.read', 'expense.create',
    'report.read', 'report.export',
    'notification.manage'
  ],

  HR: [
    'worker.read', 'worker.create', 'worker.update', 'worker.delete',
    'vehicle.read',
    'document.read', 'document.upload', 'document.delete',
    'report.read', 'report.export',
    'notification.manage'
  ],

  ACCOUNTANT: [
    'vehicle.read', 'worker.read',
    'expense.read', 'expense.create', 'expense.update', 'expense.delete',
    'fuel.read', 'fuel.create',
    'maintenance.read',
    'report.read', 'report.export',
    'document.read'
  ],

  VIEWER: [
    'vehicle.read',
    'worker.read',
    'document.read',
    'maintenance.read',
    'fuel.read',
    'expense.read',
    'report.read'
  ]
};

export function hasPermission(role: string, permission: PermissionCode): boolean {
  const allowed = ROLE_PERMISSIONS[role as UserRole];
  if (!allowed) return false;
  return allowed.includes(permission);
}
