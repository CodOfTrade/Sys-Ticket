import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailTemplateService } from '../services/email-template.service';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications/email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Get()
  async findAll(
    @Query('alert_type') alertType?: string,
    @Query('audience') audience?: string,
  ) {
    const templates = await this.templateService.findAll();

    let filtered = templates;
    if (alertType) {
      filtered = filtered.filter((t) => t.alert_type === alertType);
    }
    if (audience) {
      filtered = filtered.filter((t) => t.target_audience === audience);
    }

    return { success: true, data: filtered };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const template = await this.templateService.findOne(id);
    return { success: true, data: template };
  }

  @Post()
  async create(@Body() dto: CreateEmailTemplateDto) {
    const template = await this.templateService.create(dto);
    return { success: true, data: template };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    const template = await this.templateService.update(id, dto);
    return { success: true, data: template };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.templateService.delete(id);
    return { success: true, message: 'Template deletado com sucesso' };
  }

  @Post(':id/reset')
  async resetToDefault(@Param('id') id: string) {
    const template = await this.templateService.resetToDefault(id);
    return { success: true, data: template };
  }
}
