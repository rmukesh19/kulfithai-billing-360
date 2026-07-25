import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function isSuperAdminRole(role) {
  if (!role) return false;
  const r = String(role).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return r === 'superadmin' || r === 'admin' || r === 'owner' || r === 'administrator' || r === 'systemadministrator';
}
