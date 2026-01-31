import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para definir permissoes necessarias para acessar uma rota
 *
 * @example
 * // Requer uma permissao
 * @Permissions('tickets:create')
 *
 * @example
 * // Requer multiplas permissoes (AND - todas sao necessarias)
 * @Permissions('tickets:create', 'tickets:update')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator para definir que o usuario precisa ter PELO MENOS UMA das permissoes
 */
export const PERMISSIONS_ANY_KEY = 'permissions_any';

export const PermissionsAny = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
