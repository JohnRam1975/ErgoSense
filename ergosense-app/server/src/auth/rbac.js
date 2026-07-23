/**
 * RBAC — controle de acesso baseado em papéis
 */
export const ROLES = ['ADMIN_GLOBAL', 'ADMIN_EMPRESA', 'ERGONOMISTA', 'SUPERVISOR', 'OPERADOR'];

/** Permissões por recurso:ação */
const ROLE_PERMISSIONS = {
  ADMIN_GLOBAL: ['*'],
  ADMIN_EMPRESA: [
    'tenants:read_own',
    'collaborators:*',
    'analyses:*',
    'reports:*',
    'sectors:*',
    'org:*',
    'support:*',
    'risk-inventory:*',
    'gro:*',
    'pgr:*',
    'psico:*',
    'aet:*',
    'sst:*',
    'esocial:*',
    'compliance:*',
    'denuncia:*',
    'risk-criteria:*',
    'ai:*',
  ],
  ERGONOMISTA: [
    'collaborators:read',
    'collaborators:create',
    'collaborators:update',
    'collaborators:delete',
    'analyses:*',
    'reports:read',
    'sectors:read',
    'org:read',
    'org:create',
    'org:update',
    'risk-inventory:*',
    'gro:*',
    'pgr:*',
    'psico:*',
    'aet:*',
    'sst:*',
    'esocial:*',
    'compliance:*',
    'denuncia:*',
    'risk-criteria:*',
    'ai:*',
  ],
  SUPERVISOR: [
    'collaborators:read',
    'analyses:read',
    'reports:read',
    'sectors:read',
    'org:read',
    'risk-inventory:read',
    'gro:read',
    'pgr:read',
    'psico:read',
    'psico:respond',
    'aet:read',
    'sst:read',
    'esocial:read',
    'compliance:read',
    'denuncia:submit',
    'denuncia:read',
    'risk-criteria:read',
    'ai:read',
  ],
  OPERADOR: [
    'analyses:read',
    'analyses:create',
    'collaborators:read',
    'risk-inventory:read',
    'gro:read',
    'pgr:read',
    'psico:read',
    'psico:respond',
    'aet:read',
    'sst:read',
    'esocial:read',
    'compliance:read',
    'denuncia:submit',
  ],
};

export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  const [resource] = permission.split(':');
  return perms.includes(`${resource}:*`);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }
    next();
  };
}

export function isGlobalAdmin(user) {
  return user?.role === 'ADMIN_GLOBAL';
}

export function isTenantAdmin(user) {
  return user?.role === 'ADMIN_EMPRESA' || user?.role === 'ADMIN_GLOBAL';
}
