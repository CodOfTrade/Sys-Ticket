import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ServiceDesksService } from '../services/service-desks.service';
import { UpdateCompanyInfoDto } from '../dto/update-company-info.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Service Desks')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'service-desks', version: '1' })
export class ServiceDesksController {
  constructor(private readonly serviceDesksService: ServiceDesksService) {}

  @Get(':id/company-info')
  @ApiOperation({
    summary: 'Buscar informações da empresa',
    description: 'Retorna informações da empresa configuradas no ServiceDesk',
  })
  @ApiParam({ name: 'id', description: 'UUID do ServiceDesk' })
  @ApiResponse({
    status: 200,
    description: 'Informações da empresa retornadas com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'ServiceDesk não encontrado',
  })
  async getCompanyInfo(@Param('id') id: string) {
    const companyInfo = await this.serviceDesksService.getCompanyInfo(id);
    return { success: true, data: companyInfo };
  }

  @Patch(':id/company-info')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Atualizar informações da empresa',
    description: 'Atualiza informações da empresa no ServiceDesk (requer permissão)',
  })
  @ApiParam({ name: 'id', description: 'UUID do ServiceDesk' })
  @ApiResponse({
    status: 200,
    description: 'Informações da empresa atualizadas com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'ServiceDesk não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @HttpCode(HttpStatus.OK)
  async updateCompanyInfo(
    @Param('id') id: string,
    @Body() updateDto: UpdateCompanyInfoDto,
  ) {
    const updated = await this.serviceDesksService.updateCompanyInfo(id, updateDto);
    return { success: true, data: updated };
  }
}
