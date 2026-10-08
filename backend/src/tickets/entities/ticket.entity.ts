export enum TicketStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class Ticket {
  id!: string;
  userId!: string;
  userName!: string;
  userRole!: string;
  travellerId?: string;
  travellerName?: string;
  subject!: string;
  category!: string;
  message!: string;
  priority!: TicketPriority;
  status!: TicketStatus;
  createdAt!: Date;
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
}
