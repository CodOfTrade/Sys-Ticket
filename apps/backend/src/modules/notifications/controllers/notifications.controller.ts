import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user?.id;
    return this.notificationsService.getMyNotifications(
      userId,
      unreadOnly === 'true',
    );
  }

  @Get('count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    await this.notificationsService.remove(id, userId);
    return { success: true };
  }
}
