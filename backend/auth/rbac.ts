export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  role: Role;
  username: string;
  name: string;
  department?: string;
  jobTitle?: string;
  permissionLevel: string;
  isActive: boolean;
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
    { resource: 'workRecords', action: 'create' },
    { resource: 'workRecords', action: 'read' },
    { resource: 'workRecords', action: 'update' },
    { resource: 'workRecords', action: 'bulk' },
    { resource: 'interruptionRecords', action: 'create' },
    { resource: 'interruptionRecords', action: 'read' },
    { resource: 'interruptionRecords', action: 'update' },
    { resource: 'interruptionRecords', action: 'bulk' },
    { resource: 'workItems', action: 'read' },
    { resource: 'workItems', action: 'bulk' },
    { resource: 'anomalyLogs', action: 'read' },
    { resource: 'anomalyLogs', action: 'update' },
    { resource: 'anomalyLogs', action: 'bulk' }
  ],
  viewer: [
    { resource: 'users', action: 'read' },
    { resource: 'workRecords', action: 'read' },
    { resource: 'interruptionRecords', action: 'read' },
    { resource: 'workItems', action: 'read' },
    { resource: 'anomalyLogs', action: 'read' }
  ]
};

export function hasPermission(user: User, resource: string, action: string): boolean {
  if (!user.isActive) return false;
  
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  
  return permissions.some(permission => 
    (permission.resource === '*' || permission.resource === resource) &&
    permission.action === action
  );
}

export function checkPermission(user: User, resource: string, action: string): void {
  if (!hasPermission(user, resource, action)) {
    throw new Error(`Access denied: ${user.role} cannot ${action} ${resource}`);
  }
}