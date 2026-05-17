export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  role: Role;
  department?: string;
  position?: string;
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'bulk';
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
    { resource: '*', action: 'bulk' }
  ],
  operator: [
    { resource: 'users', action: 'read' },
    { resource: 'work-records', action: 'create' },
    { resource: 'work-records', action: 'read' },
    { resource: 'work-records', action: 'update' },
    { resource: 'work-records', action: 'bulk' },
    { resource: 'interruption-records', action: 'create' },
    { resource: 'interruption-records', action: 'read' },
    { resource: 'interruption-records', action: 'update' },
    { resource: 'interruption-records', action: 'bulk' },
    { resource: 'work-items', action: 'read' },
    { resource: 'work-items', action: 'bulk' },
    { resource: 'anomaly-logs', action: 'read' },
    { resource: 'anomaly-logs', action: 'bulk' }
  ],
  viewer: [
    { resource: 'users', action: 'read' },
    { resource: 'work-records', action: 'read' },
    { resource: 'interruption-records', action: 'read' },
    { resource: 'work-items', action: 'read' },
    { resource: 'anomaly-logs', action: 'read' }
  ]
};

export function hasPermission(user: User, resource: string, action: Permission['action']): boolean {
  const permissions = ROLE_PERMISSIONS[user.role];
  return permissions.some(p => 
    (p.resource === '*' || p.resource === resource) && p.action === action
  );
}

export function checkPermission(user: User, resource: string, action: Permission['action']): void {
  if (!hasPermission(user, resource, action)) {
    throw new Error(`Access denied: ${user.role} cannot ${action} ${resource}`);
  }
}