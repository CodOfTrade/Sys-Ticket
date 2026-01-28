import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationConfigService } from '../services/notification-config.service';
import { UpdateNotificationConfigDto } from '../dto/update-notification-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications/configs')
@UseGuards(JwtAuthGuard)
export class NotificationConfigController {
  constructor(
    private readonly configService: NotificationConfigService,
  ) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.configService.findByCategory(category);
    }
    return this.configService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.configService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationConfigDto,
  ) {
    return this.configService.update(id, dto);
  }
}
