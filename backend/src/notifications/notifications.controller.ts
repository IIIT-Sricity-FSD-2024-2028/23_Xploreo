import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../auth/entities/auth.entity';
import { ApiProtectedResource, ApiReadEndpoint } from '../common/decorators/api-docs.decorator';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';

@ApiTags('Notifications')
@ApiProtectedResource()
@Roles(
  Role.TRAVELLER,
  Role.SUPERADMIN,
  Role.GUIDE,
  Role.HOTEL,
  Role.EXPERIENCE,
  Role.NONTECHADMIN,
  Role.TECHADMIN,
)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for authenticated user' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    return this.notificationsService.findByUser(req.user?.userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for authenticated user' })
  @ApiReadEndpoint()
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user?.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @Param('id', NonEmptyStringPipe) id: string,
    @Req() req: any,
  ) {
    return this.notificationsService.markAsRead(id, req.user?.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for authenticated user' })
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user?.userId);
  }
}
