export type AppRole = 'agent' | 'manager' | 'both';

export function isAppRole(value: unknown): value is AppRole {
  return value === 'agent' || value === 'manager' || value === 'both';
}

export function canManage(role: AppRole | null | undefined): boolean {
  return role === 'manager' || role === 'both';
}

export function canActAsAgent(role: AppRole | null | undefined): boolean {
  return role === 'agent' || role === 'both';
}
