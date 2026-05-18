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

const RESOURCE_MAP: Record<string, string> = {
  '0': 'users',
  '1': 'work-records',
  '2': 'interruption-records',
  '3': 'work-items',
  '4': 'anomaly-logs',
  'resources': 'users'
};

export function hasPermission(user: User, resource: string, action: Permission['action']): boolean {
  const permissions = ROLE_PERMISSIONS[user.role];
  
  return permissions.some(permission => 
    (permission.resource === '*' || permission.resource === resource) &&
    permission.action === action
  );
}

export function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  
  if (segments[0] === 'api' && segments[1]) {
    return RESOURCE_MAP[segments[1]] || segments[1];
  }
  
  if (segments[0] === 'resources') {
    return 'users';
  }
  
  return segments[0] || 'unknown';
}

export function getActionFromMethod(method: string, path: string): Permission['action'] {
  if (path.includes('/bulk')) {
    return 'bulk';
  }
  
  switch (method.toUpperCase()) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}