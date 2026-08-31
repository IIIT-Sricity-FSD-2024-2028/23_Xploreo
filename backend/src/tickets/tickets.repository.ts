import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';

export type CreateTicketRecord = {
  userId: string;
  userName: string;
  userRole: string;
  travellerId?: string;
  travellerName?: string;
  subject: string;
  message: string;
  category?: string;
  priority?: TicketPriority;
};

@Injectable()
export class TicketsRepository {
  private readonly tickets: Ticket[] = [
    {
      id: 'TCK-2001',
      userId: '20001',
      userName: 'Anjali Sharma',
      userRole: 'traveller',
      travellerId: '20001',
      travellerName: 'Anjali Sharma',
      subject: 'Hotel booking confirmation not received',
      category: 'Booking',
      message:
        'I completed payment for my hotel booking in Mumbai, but the confirmation voucher did not generate.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date(Date.now() - 3600 * 1000 * 4),
    },
    {
      id: 'TCK-1001',
      userId: '10001',
      userName: 'Sreekar',
      userRole: 'guide',
      travellerId: '10001',
      travellerName: 'Sreekar',
      subject: 'Schedule availability synchronization error',
      category: 'Technical Issue',
      message:
        'My updated available tour slots for the upcoming weekend are not reflecting on the traveler booking catalog.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
    {
      id: 'TCK-3001',
      userId: 'partner-1',
      userName: 'Xploreo Hotel Partner',
      userRole: 'hotel',
      travellerId: 'partner-1',
      travellerName: 'Xploreo Hotel Partner',
      subject: 'Room inventory update lag during peak hours',
      category: 'Platform Issue',
      message:
        'When updating suite pricing and room availability, changes take over 10 minutes to reflect across the live platform.',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
    {
      id: 'TCK-4001',
      userId: 'experience-partner-1',
      userName: 'Xploreo Experience Partner',
      userRole: 'experience',
      travellerId: 'experience-partner-1',
      travellerName: 'Xploreo Experience Partner',
      subject: 'Payout settlement calculation discrepancy',
      category: 'Payment Issue',
      message:
        'The experience booking commission for the Heritage Walk series shows a minor discrepancy in the earnings ledger.',
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      createdAt: new Date(Date.now() - 3600 * 1000 * 48),
      resolvedAt: new Date(Date.now() - 3600 * 1000 * 6),
      resolution:
        'Ledger synchronization re-indexed and balance reconciled with payment gateway.',
      resolvedBy: 'TA0001',
    },
    {
      id: 'TCK-5001',
      userId: 'NTA0001',
      userName: 'Neha Mehra',
      userRole: 'nontechadmin',
      travellerId: 'NTA0001',
      travellerName: 'Neha Mehra',
      subject: 'Travel package bulk image asset upload timeout',
      category: 'Technical Issue',
      message:
        'Bulk uploading high-resolution promotional imagery for the South India itinerary intermittently times out.',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
  ];

  create(data: CreateTicketRecord): Ticket {
    const ticket: Ticket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      ...data,
      travellerId: data.travellerId || data.userId,
      travellerName: data.travellerName || data.userName,
      category: data.category || 'General',
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: new Date(),
    };

    this.tickets.unshift(ticket);
    return { ...ticket };
  }

  findAll(): Ticket[] {
    return this.tickets.map((ticket) => ({ ...ticket }));
  }

  findByUserId(userId: string): Ticket[] {
    const lowerId = String(userId).toLowerCase();
    return this.tickets
      .filter(
        (ticket) =>
          ticket.userId?.toLowerCase() === lowerId ||
          ticket.travellerId?.toLowerCase() === lowerId ||
          ticket.userName?.toLowerCase() === lowerId,
      )
      .map((ticket) => ({ ...ticket }));
  }

  findById(id: string): Ticket | undefined {
    const ticket = this.tickets.find((item) => item.id === id);
    return ticket ? { ...ticket } : undefined;
  }

  resolve(
    id: string,
    data: Pick<Ticket, 'resolution' | 'resolvedBy'>,
  ): Ticket | undefined {
    const ticket = this.tickets.find((item) => item.id === id);
    if (!ticket) return undefined;

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    ticket.resolution = data.resolution;
    ticket.resolvedBy = data.resolvedBy;

    return { ...ticket };
  }
}
