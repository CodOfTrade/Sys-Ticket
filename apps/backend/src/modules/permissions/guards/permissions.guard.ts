import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { PERMISSIONS_KEY, PERMISSIONS_ANY_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtem permissoes requeridas do decorator @Permissions()
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Obtem permissoes do decorator @PermissionsAny()
    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se nenhum decorator de permissao foi usado, permite acesso
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredAnyPermissions || requiredAnyPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se nao tem usuario autenticado, nega acesso
    if (!user || !user.id) {
      throw new ForbiddenException('Usuario nao autenticado');
    }

    // Verifica @Permissions() - requer TODAS as permissoes
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = await this.permissionsService.userHasPermissions(
        user.id,
        requiredPermissions,
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Voce nao tem permissao para esta acao. Permissoes necessarias: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Verifica @PermissionsAny() - requer PELO MENOS UMA permissao
    if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
      const hasAnyPermission = await this.permissionsService.userHasAnyPermission(
        user.id,
        requiredAnyPermissions,
      );

      if (!hasAnyPermission) {
        throw new ForbiddenException(
          `Voce nao tem permissao para esta acao. Pelo menos uma das permissoes e necessaria: ${requiredAnyPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
