import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionsService } from './permissions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';
import {
  UpdateUserPermissionsDto,
  UpdateUserRoleDto,
  AssignCustomRoleDto,
  AuditLogQueryDto,
} from './dto/update-user-permissions.dto';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // =====================
  // INFORMACOES GERAIS
  // =====================

  @Get('all')
  @ApiOperation({ summary: 'Lista todas as permissoes disponiveis no sistema' })
  @ApiResponse({ status: 200, description: 'Lista de permissoes' })
  getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('roles/defaults')
  @ApiOperation({ summary: 'Lista permissoes padrao de cada role fixo' })
  @ApiResponse({ status: 200, description: 'Permissoes por role' })
  getDefaultRolePermissions() {
    return this.permissionsService.getDefaultRolePermissions();
  }

  // =====================
  // CUSTOM ROLES
  // =====================

  @Get('roles')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Lista todos os perfis customizados' })
  @ApiResponse({ status: 200, description: 'Lista de perfis' })
  async findAllCustomRoles(@Query('includeInactive') includeInactive?: string) {
    return this.permissionsService.findAllCustomRoles(includeInactive === 'true');
  }

  @Get('roles/:id')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Busca um perfil customizado por ID' })
  @ApiParam({ name: 'id', description: 'ID do perfil' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado' })
  @ApiResponse({ status: 404, description: 'Perfil nao encontrado' })
  async findCustomRoleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.findCustomRoleById(id);
  }

  @Post('roles')
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Cria um novo perfil customizado' })
  @ApiResponse({ status: 201, description: 'Perfil criado' })
  @ApiResponse({ status: 409, description: 'Nome ja existe' })
  async createCustomRole(
    @Body() dto: CreateCustomRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.permissionsService.createCustomRole(dto, userId);
  }

  @Patch('roles/:id')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Atualiza um perfil customizado' })
  @ApiParam({ name: 'id', description: 'ID do perfil' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  @ApiResponse({ status: 404, description: 'Perfil nao encontrado' })
  async updateCustomRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomRoleDto,
  ) {
    return this.permissionsService.updateCustomRole(id, dto);
  }

  @Delete('roles/:id')
  @Permissions('roles:delete')
  @ApiOperation({ summary: 'Remove um perfil customizado' })
  @ApiParam({ name: 'id', description: 'ID do perfil' })
  @ApiResponse({ status: 200, description: 'Perfil removido' })
  @ApiResponse({ status: 404, description: 'Perfil nao encontrado' })
  @ApiResponse({ status: 409, description: 'Perfil em uso' })
  async deleteCustomRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.permissionsService.deleteCustomRole(id);
    return { message: 'Perfil removido com sucesso' };
  }

  // =====================
  // PERMISSOES DO USUARIO
  // =====================

  @Get('user/:userId')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Obtem permissoes efetivas de um usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  @ApiResponse({ status: 200, description: 'Lista de permissoes' })
  async getUserPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    const permissions = await this.permissionsService.getUserPermissions(userId);
    return { permissions };
  }

  @Put('user/:userId/permissions')
  @Permissions('users:manage-permissions')
  @ApiOperation({ summary: 'Atualiza permissoes extras de um usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  @ApiResponse({ status: 200, description: 'Permissoes atualizadas' })
  @ApiResponse({ status: 404, description: 'Usuario nao encontrado' })
  async updateUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserPermissionsDto,
    @CurrentUser('id') changedById: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.updateUserPermissions(
      userId,
      dto.permissions,
      changedById,
      ipAddress,
      userAgent,
    );
  }

  @Put('user/:userId/role')
  @Permissions('users:manage-permissions')
  @ApiOperation({ summary: 'Atualiza role fixo de um usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  @ApiResponse({ status: 200, description: 'Role atualizado' })
  @ApiResponse({ status: 404, description: 'Usuario nao encontrado' })
  async updateUserRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') changedById: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.updateUserRole(
      userId,
      dto.role,
      changedById,
      ipAddress,
      userAgent,
    );
  }

  @Put('user/:userId/custom-role')
  @Permissions('users:manage-permissions')
  @ApiOperation({ summary: 'Atribui um perfil customizado a um usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  @ApiResponse({ status: 200, description: 'Perfil atribuido' })
  @ApiResponse({ status: 404, description: 'Usuario ou perfil nao encontrado' })
  async assignCustomRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignCustomRoleDto,
    @CurrentUser('id') changedById: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.assignCustomRole(
      userId,
      dto.custom_role_id,
      changedById,
      ipAddress,
      userAgent,
    );
  }

  @Delete('user/:userId/custom-role')
  @Permissions('users:manage-permissions')
  @ApiOperation({ summary: 'Remove perfil customizado de um usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  @ApiResponse({ status: 200, description: 'Perfil removido' })
  @ApiResponse({ status: 404, description: 'Usuario nao encontrado' })
  async removeCustomRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('id') changedById: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.removeCustomRole(
      userId,
      changedById,
      ipAddress,
      userAgent,
    );
  }

  // =====================
  // AUDITORIA
  // =====================

  @Get('audit')
  @Permissions('audit:view')
  @ApiOperation({ summary: 'Lista logs de auditoria de permissoes' })
  @ApiResponse({ status: 200, description: 'Lista de logs' })
  async findAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.permissionsService.findAuditLogs({
      targetUserId: query.targetUserId,
      changedById: query.changedById,
      action: query.action as any,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 20,
    });
  }
}
