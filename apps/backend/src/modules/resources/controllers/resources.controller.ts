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
import { ResourcesService } from '../services/resources.service';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { QueryResourceDto } from '../dto/query-resource.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  async create(@Body() createResourceDto: CreateResourceDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.resourcesService.create(createResourceDto, userId);
  }

  @Get()
  async findAll(@Query() query: QueryResourceDto) {
    return this.resourcesService.findAll(query);
  }

  @Get('stats/overview')
  async getStats(@Query('clientId') clientId?: string) {
    return this.resourcesService.getStats(clientId);
  }

  @Get('client/:clientId')
  async findByClient(@Param('clientId') clientId: string) {
    return this.resourcesService.findByClientId(clientId);
  }

  @Get('contract/:contractId')
  async findByContract(@Param('contractId') contractId: string) {
    return this.resourcesService.findByContractId(contractId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.resourcesService.getHistory(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.resourcesService.update(id, updateResourceDto, userId);
  }

  @Post(':id/retire')
  async retire(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.resourcesService.retire(id, userId);
  }

  @Post(':id/command')
  async sendCommand(
    @Param('id') id: string,
    @Body('command') command: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.resourcesService.sendCommand(id, command, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
