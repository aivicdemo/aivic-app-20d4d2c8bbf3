export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  role: Role;
  username: string;
  name: string;
  department?: string;
  position?: string;
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

const RESOURCE_MAP: Record<string, string> = {
  '0': 'users',
  '1': 'work-records',
  '2': 'interruption-records',
  '3': 'work-items',
  '4': 'anomaly-logs'
};

export function hasPermission(user: User, resource: string, action: Permission['action']): boolean {
  const permissions = ROLE_PERMISSIONS[user.role];
  
  return permissions.some(permission => 
    (permission.resource === '*' || permission.resource === resource) &&
    permission.action === action
  );
}

export function getResourceFromIndex(index: string): string {
  return RESOURCE_MAP[index] || 'unknown';
}

export function extractUserFromEvent(event: any): User {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader) {
    throw new Error('Authorization header missing');
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    return {
      id: payload.sub || payload.userId,
      role: payload.role || 'viewer',
      username: payload.username || '',
      name: payload.name || '',
      department: payload.department,
      position: payload.position,
      permissionLevel: payload.permissionLevel || 'general',
      isActive: payload.isActive !== false
    };
  } catch (error) {
    throw new Error('Invalid authorization token');
  }
}