import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  create(data: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    bookingId?: string;
    bookingType?: 'hotel' | 'experience' | 'trip';
    refundStatus?: string;
    refundAmount?: number;
  }): Notification {
    return this.repository.create(data);
  }

  findByUser(userId: string): Notification[] {
    return this.repository.findByUser(userId);
  }

  getUnreadCount(userId: string): { unreadCount: number } {
    return { unreadCount: this.repository.getUnreadCount(userId) };
  }

  markAsRead(id: string, userId: string): Notification {
    const updated = this.repository.markAsRead(id, userId);
    if (!updated) {
      throw new NotFoundException(`Notification ${id} not found or not owned by user`);
    }
    return updated;
  }

  markAllAsRead(userId: string): { updated: number } {
    return this.repository.markAllAsRead(userId);
  }
}
