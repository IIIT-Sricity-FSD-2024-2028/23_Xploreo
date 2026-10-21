import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  private readonly notifications: Notification[] = [];

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
    const item: Notification = {
      id: randomUUID(),
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.INFO,
      bookingId: data.bookingId,
      bookingType: data.bookingType,
      refundStatus: data.refundStatus,
      refundAmount: data.refundAmount,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.unshift(item);
    return { ...item };
  }

  findByUser(userId: string): Notification[] {
    const normalized = String(userId).trim().toLowerCase();
    return this.notifications
      .filter((n) => String(n.userId).trim().toLowerCase() === normalized)
      .map((n) => ({ ...n }));
  }

  findById(id: string): Notification | undefined {
    const found = this.notifications.find((n) => n.id === id);
    return found ? { ...found } : undefined;
  }

  markAsRead(id: string, userId: string): Notification | undefined {
    const normalized = String(userId).trim().toLowerCase();
    const found = this.notifications.find(
      (n) => n.id === id && String(n.userId).trim().toLowerCase() === normalized,
    );
    if (!found) return undefined;
    found.read = true;
    return { ...found };
  }

  markAllAsRead(userId: string): { updated: number } {
    const normalized = String(userId).trim().toLowerCase();
    let count = 0;
    for (const n of this.notifications) {
      if (String(n.userId).trim().toLowerCase() === normalized && !n.read) {
        n.read = true;
        count++;
      }
    }
    return { updated: count };
  }

  getUnreadCount(userId: string): number {
    const normalized = String(userId).trim().toLowerCase();
    return this.notifications.filter(
      (n) => String(n.userId).trim().toLowerCase() === normalized && !n.read,
    ).length;
  }

  // Clear all (for testing)
  clear(): void {
    this.notifications.length = 0;
  }
}
