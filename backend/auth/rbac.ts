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
    { resource: 'anomaly-logs', action: 'update' },
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

export function requirePermission(user: User, resource: string, action: Permission['action']): void {
  if (!hasPermission(user, resource, action)) {
    throw new Error(`Insufficient permissions: ${user.role} cannot ${action} ${resource}`);
  }
}

export function parseAuthHeader(authHeader?: string): User {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token structure');
    }
    
    return {
      id: decoded.id,
      role: decoded.role as Role,
      department: decoded.department,
      position: decoded.position
    };
  } catch (error) {
    throw new Error('Invalid token format');
  }
}