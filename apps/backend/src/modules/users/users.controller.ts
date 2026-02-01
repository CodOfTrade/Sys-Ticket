import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService, PaginatedUsersResult } from './users.service';
import { User } from './entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { QueryUsersDto } from './dto/query-users.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios com paginacao e filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'manager', 'agent', 'client'] })
  @ApiQuery({ name: 'customRoleId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'suspended'] })
  async findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsersResult> {
    return this.usersService.findAllPaginated(query);
  }

  @Get('technicians')
  @ApiOperation({ summary: 'Listar todos os técnicos (agents, managers e admins ativos)' })
  async findTechnicians(): Promise<User[]> {
    return this.usersService.findTechnicians();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo usuário' })
  async create(@Body() userData: Partial<User>): Promise<User> {
    return this.usersService.create(userData);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  async update(@Param('id') id: string, @Body() userData: Partial<User>): Promise<User | null> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Remover usuário' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
