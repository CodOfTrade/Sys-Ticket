import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CustomRole } from './entities/custom-role.entity';
import { PermissionAuditLog, PermissionAuditAction } from './entities/permission-audit.entity';
import {
  ALL_PERMISSIONS,
  Permission,
  PERMISSION_LIST,
  PERMISSIONS_BY_MODULE,
} from './constants/all-permissions';
import {
  DEFAULT_ROLE_PERMISSIONS,
  getExpandedRolePermissions,
} from './constants/default-role-permissions';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CustomRole)
    private customRolesRepository: Repository<CustomRole>,
    @InjectRepository(PermissionAuditLog)
    private auditRepository: Repository<PermissionAuditLog>,
  ) {}

  // =====================
  // PERMISSOES DO USUARIO
  // =====================

  /**
   * Obtem todas as permissoes efetivas de um usuario
   * Combina: permissoes do role (fixo ou custom) + permissoes extras
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['custom_role'],
    });

    if (!user) {
      return [];
    }

    return this.calculateUserPermissions(user);
  }

  /**
   * Calcula permissoes a partir do objeto user (sem query adicional)
   */
  calculateUserPermissions(user: User): string[] {
    // Se tem custom_role, usa as permissoes do custom_role
    if (user.custom_role_id && user.custom_role) {
      const customRolePermissions = user.custom_role.permissions || [];
      const extraPermissions = user.permissions || [];
      return [...new Set([...customRolePermissions, ...extraPermissions])];
    }

    // Se nao, usa as permissoes do role fixo
    const rolePermissions = getExpandedRolePermissions(user.role);
    const extraPermissions = user.permissions || [];

    return [...new Set([...rolePermissions, ...extraPermissions])];
  }

  /**
   * Verifica se usuario tem TODAS as permissoes requeridas
   */
  async userHasPermissions(userId: string, required: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return this.checkPermissions(userPermissions, required, true);
  }

  /**
   * Verifica se usuario tem PELO MENOS UMA das permissoes requeridas
   */
  async userHasAnyPermission(userId: string, required: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return this.checkPermissions(userPermissions, required, false);
  }

  /**
   * Verifica permissoes (helper interno)
   */
  private checkPermissions(
    userPermissions: string[],
    required: string[],
    requireAll: boolean,
  ): boolean {
    // Wildcard - todas as permissoes
    if (userPermissions.includes('*')) {
      return true;
    }

    if (requireAll) {
      return required.every((perm) => userPermissions.includes(perm));
    } else {
      return required.some((perm) => userPermissions.includes(perm));
    }
  }

  /**
   * Atualiza permissoes extras de um usuario
   */
  async updateUserPermissions(
    userId: string,
    permissions: string[],
    changedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const oldPermissions = user.permissions || [];

    // Valida se todas as permissoes sao validas
    const invalidPermissions = permissions.filter((p) => !PERMISSION_LIST.includes(p as Permission));
    if (invalidPermissions.length > 0) {
      throw new ConflictException(`Permissoes invalidas: ${invalidPermissions.join(', ')}`);
    }

    // Atualiza permissoes
    user.permissions = permissions;
    await this.usersRepository.save(user);

    // Registra auditoria
    await this.logAudit({
      target_user_id: userId,
      changed_by_id: changedById,
      action: PermissionAuditAction.PERMISSIONS_UPDATED,
      old_value: { permissions: oldPermissions },
      new_value: { permissions },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return user;
  }

  /**
   * Atualiza role de um usuario
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    changedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const oldRole = user.role;

    user.role = role;
    // Remove custom_role se estiver definindo um role fixo
    user.custom_role_id = undefined as any;
    await this.usersRepository.save(user);

    // Registra auditoria
    await this.logAudit({
      target_user_id: userId,
      changed_by_id: changedById,
      action: PermissionAuditAction.ROLE_CHANGED,
      old_value: { role: oldRole },
      new_value: { role },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return user;
  }

  /**
   * Atribui um custom role a um usuario
   */
  async assignCustomRole(
    userId: string,
    customRoleId: string,
    changedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const customRole = await this.customRolesRepository.findOne({
      where: { id: customRoleId },
    });
    if (!customRole) {
      throw new NotFoundException('Perfil customizado nao encontrado');
    }

    const oldCustomRoleId = user.custom_role_id;

    user.custom_role_id = customRoleId;
    await this.usersRepository.save(user);

    // Registra auditoria
    await this.logAudit({
      target_user_id: userId,
      changed_by_id: changedById,
      action: PermissionAuditAction.CUSTOM_ROLE_ASSIGNED,
      old_value: { custom_role_id: oldCustomRoleId },
      new_value: { custom_role_id: customRoleId, custom_role_name: customRole.name },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return user;
  }

  /**
   * Remove custom role de um usuario
   */
  async removeCustomRole(
    userId: string,
    changedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['custom_role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const oldCustomRole = user.custom_role;

    user.custom_role_id = undefined as any;
    await this.usersRepository.save(user);

    // Registra auditoria
    await this.logAudit({
      target_user_id: userId,
      changed_by_id: changedById,
      action: PermissionAuditAction.CUSTOM_ROLE_REMOVED,
      old_value: {
        custom_role_id: oldCustomRole?.id,
        custom_role_name: oldCustomRole?.name,
      },
      new_value: { custom_role_id: null },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return user;
  }

  // =====================
  // CUSTOM ROLES
  // =====================

  /**
   * Lista todos os custom roles
   */
  async findAllCustomRoles(includeInactive = false): Promise<CustomRole[]> {
    const where = includeInactive ? {} : { is_active: true };
    return this.customRolesRepository.find({
      where,
      order: { name: 'ASC' },
      relations: ['created_by'],
    });
  }

  /**
   * Busca um custom role por ID
   */
  async findCustomRoleById(id: string): Promise<CustomRole> {
    const role = await this.customRolesRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });
    if (!role) {
      throw new NotFoundException('Perfil customizado nao encontrado');
    }
    return role;
  }

  /**
   * Cria um novo custom role
   */
  async createCustomRole(
    data: {
      name: string;
      description?: string;
      permissions: string[];
      color?: string;
    },
    createdById: string,
  ): Promise<CustomRole> {
    // Verifica se ja existe um role com o mesmo nome
    const existing = await this.customRolesRepository.findOne({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Ja existe um perfil com esse nome');
    }

    // Valida permissoes
    const invalidPermissions = data.permissions.filter(
      (p) => !PERMISSION_LIST.includes(p as Permission),
    );
    if (invalidPermissions.length > 0) {
      throw new ConflictException(`Permissoes invalidas: ${invalidPermissions.join(', ')}`);
    }

    const role = this.customRolesRepository.create({
      ...data,
      created_by_id: createdById,
    });

    return this.customRolesRepository.save(role);
  }

  /**
   * Atualiza um custom role
   */
  async updateCustomRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      color?: string;
      is_active?: boolean;
    },
  ): Promise<CustomRole> {
    const role = await this.findCustomRoleById(id);

    // Se esta mudando o nome, verifica se ja existe
    if (data.name && data.name !== role.name) {
      const existing = await this.customRolesRepository.findOne({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException('Ja existe um perfil com esse nome');
      }
    }

    // Valida permissoes se fornecidas
    if (data.permissions) {
      const invalidPermissions = data.permissions.filter(
        (p) => !PERMISSION_LIST.includes(p as Permission),
      );
      if (invalidPermissions.length > 0) {
        throw new ConflictException(`Permissoes invalidas: ${invalidPermissions.join(', ')}`);
      }
    }

    Object.assign(role, data);
    return this.customRolesRepository.save(role);
  }

  /**
   * Remove um custom role
   */
  async deleteCustomRole(id: string): Promise<void> {
    const role = await this.findCustomRoleById(id);

    // Verifica se existem usuarios usando este role
    const usersWithRole = await this.usersRepository.count({
      where: { custom_role_id: id },
    });

    if (usersWithRole > 0) {
      throw new ConflictException(
        `Este perfil esta sendo usado por ${usersWithRole} usuario(s). Remova o perfil dos usuarios antes de excluir.`,
      );
    }

    await this.customRolesRepository.remove(role);
  }

  // =====================
  // AUDITORIA
  // =====================

  /**
   * Registra um log de auditoria
   */
  async logAudit(data: {
    target_user_id: string;
    changed_by_id: string;
    action: PermissionAuditAction;
    old_value?: Record<string, any>;
    new_value?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<PermissionAuditLog> {
    const log = this.auditRepository.create(data);
    return this.auditRepository.save(log);
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async findAuditLogs(options: {
    targetUserId?: string;
    changedById?: string;
    action?: PermissionAuditAction;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
  }): Promise<{ data: PermissionAuditLog[]; total: number }> {
    const { page = 1, perPage = 20 } = options;

    const query = this.auditRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.target_user', 'target_user')
      .leftJoinAndSelect('log.changed_by', 'changed_by')
      .orderBy('log.created_at', 'DESC');

    if (options.targetUserId) {
      query.andWhere('log.target_user_id = :targetUserId', {
        targetUserId: options.targetUserId,
      });
    }

    if (options.changedById) {
      query.andWhere('log.changed_by_id = :changedById', {
        changedById: options.changedById,
      });
    }

    if (options.action) {
      query.andWhere('log.action = :action', { action: options.action });
    }

    if (options.startDate) {
      query.andWhere('log.created_at >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      query.andWhere('log.created_at <= :endDate', { endDate: options.endDate });
    }

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return { data, total };
  }

  // =====================
  // HELPERS
  // =====================

  /**
   * Retorna todas as permissoes disponiveis
   */
  getAllPermissions() {
    return {
      permissions: ALL_PERMISSIONS,
      list: PERMISSION_LIST,
      byModule: PERMISSIONS_BY_MODULE,
    };
  }

  /**
   * Retorna as permissoes padrao de cada role fixo
   */
  getDefaultRolePermissions() {
    return {
      [UserRole.ADMIN]: getExpandedRolePermissions(UserRole.ADMIN),
      [UserRole.MANAGER]: getExpandedRolePermissions(UserRole.MANAGER),
      [UserRole.AGENT]: getExpandedRolePermissions(UserRole.AGENT),
      [UserRole.CLIENT]: getExpandedRolePermissions(UserRole.CLIENT),
    };
  }
}
