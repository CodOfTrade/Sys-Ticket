import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ResourceLicensesService } from '../services/resource-licenses.service';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { UpdateLicenseDto } from '../dto/update-license.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('resources/licenses')
@UseGuards(JwtAuthGuard)
export class ResourceLicensesController {
  constructor(private readonly licensesService: ResourceLicensesService) {}

  @Post()
  async create(@Body() createLicenseDto: CreateLicenseDto) {
    return this.licensesService.create(createLicenseDto);
  }

  @Get()
  async findAll(
    @Query('clientId') clientId?: string,
    @Query('contractId') contractId?: string,
    @Query('licenseType') licenseType?: string,
    @Query('licenseStatus') licenseStatus?: string,
  ) {
    return this.licensesService.findAll({
      client_id: clientId,
      contract_id: contractId,
      license_type: licenseType,
      license_status: licenseStatus as any,
    });
  }

  @Get('available')
  async findAvailableLicenses(
    @Query('clientId') clientId: string,
  ) {
    return this.licensesService.findAvailableLicenses({ clientId });
  }

  @Get('contract/:contractId/available')
  async findAvailableByContract(@Param('contractId') contractId: string) {
    return this.licensesService.findAvailableByContract(contractId);
  }

  @Get('stats/expiring')
  async getExpiringSoon(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 30;
    return this.licensesService.findExpiringSoon(daysNumber);
  }

  @Get('stats/general')
  async getGeneralStats() {
    return this.licensesService.getGeneralStats();
  }

  @Get('contract/:contractId/stats')
  async getStatsByContract(@Param('contractId') contractId: string) {
    return this.licensesService.getStatsByContract(contractId);
  }

  @Get('by-resource/:resourceId')
  async getLicensesByResource(@Param('resourceId') resourceId: string) {
    return this.licensesService.getLicensesByResource(resourceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Get(':id/devices')
  async getAssignedDevices(@Param('id') id: string) {
    return this.licensesService.getAssignedDevices(id);
  }

  @Get(':id/history')
  async getHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit) : 50;
    return this.licensesService.getHistory(id, limitNumber);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLicenseDto: UpdateLicenseDto,
  ) {
    return this.licensesService.update(id, updateLicenseDto);
  }

  @Post(':id/assign')
  async assignToResource(
    @Param('id') id: string,
    @Body('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.licensesService.assignToResource(id, resourceId, userId);
  }

  @Post(':id/unassign')
  async unassignFromResource(
    @Param('id') id: string,
    @Body('resourceId') resourceId: string,
  ) {
    return this.licensesService.unassignFromResource(id, resourceId);
  }

  @Post(':id/renew')
  async renewLicense(
    @Param('id') id: string,
    @Body() renewData: {
      duration_type?: string;
      duration_value?: number;
      new_activation_date?: string;
      extend_from_current?: boolean;
    },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.licensesService.renewLicense(id, renewData as any, userId);
  }

  @Post(':id/suspend')
  async suspendLicense(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.licensesService.suspendLicense(id, reason, userId);
  }

  @Post(':id/reactivate')
  async reactivateLicense(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.licensesService.reactivateLicense(id, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }
}
