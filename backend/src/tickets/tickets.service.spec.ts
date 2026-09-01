import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { AuthRepository } from '../auth/auth.repository';
import { Role } from '../auth/entities/auth.entity';
import { TicketPriority, TicketStatus } from './entities/ticket.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let repository: TicketsRepository;
  const mockAuthRepository = {
    findById: jest.fn((id: string) => {
      if (id === '10001') return { name: 'Sreekar', role: 'guide' };
      if (id === 'partner-1') return { name: 'Xploreo Hotel Partner', role: 'hotel' };
      return undefined;
    }),
    findByUsername: jest.fn((username: string) => {
      if (username === '10001') return { name: 'Sreekar', role: 'guide' };
      if (username === 'partner-1') return { name: 'Xploreo Hotel Partner', role: 'hotel' };
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        TicketsRepository,
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    repository = module.get<TicketsRepository>(TicketsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow a guide to create a support ticket', () => {
    const ticket = service.create(
      { userId: '10001', role: 'guide' },
      {
        subject: 'Tour calendar sync error',
        message: 'My scheduled slots are not updating in real time.',
        category: 'Technical Issue',
        priority: TicketPriority.HIGH,
      },
    );

    expect(ticket).toBeDefined();
    expect(ticket.id).toBeDefined();
    expect(ticket.userId).toBe('10001');
    expect(ticket.userName).toBe('Sreekar');
    expect(ticket.userRole).toBe('guide');
    expect(ticket.status).toBe(TicketStatus.OPEN);
  });

  it('should allow a hotel partner to create a support ticket', () => {
    const ticket = service.create(
      { userId: 'partner-1', role: 'hotel' },
      {
        subject: 'Room pricing update lag',
        message: 'New rates for luxury suites take time to appear.',
        category: 'Booking & Reservations',
        priority: TicketPriority.MEDIUM,
      },
    );

    expect(ticket).toBeDefined();
    expect(ticket.userId).toBe('partner-1');
    expect(ticket.userName).toBe('Xploreo Hotel Partner');
    expect(ticket.userRole).toBe('hotel');
  });

  it('should throw ForbiddenException if user id is missing on ticket creation', () => {
    expect(() =>
      service.create(undefined as any, {
        subject: 'Test',
        message: 'Test message description',
      }),
    ).toThrow(ForbiddenException);
  });

  it('should allow technical admin to view all tickets', () => {
    const tickets = service.findAllForUser({
      userId: 'TA0001',
      role: Role.TECHADMIN,
    });
    expect(tickets.length).toBeGreaterThanOrEqual(5);
  });

  it('should allow a regular user to view only their tickets', () => {
    const tickets = service.findAllForUser({
      userId: '10001',
      role: 'guide',
    });
    expect(tickets.every((t) => t.userId === '10001')).toBe(true);
  });

  it('should allow technical admin to resolve a ticket', () => {
    const ticket = service.create(
      { userId: '20001', role: 'traveller' },
      {
        subject: 'Payment receipt request',
        message: 'Need invoice for my corporate trip booking.',
        priority: TicketPriority.LOW,
      },
    );

    const resolved = service.resolve(ticket.id, 'TA0001', {
      resolution: 'Invoice generated and emailed to traveler.',
    });

    expect(resolved).toBeDefined();
    expect(resolved?.status).toBe(TicketStatus.RESOLVED);
    expect(resolved?.resolution).toBe(
      'Invoice generated and emailed to traveler.',
    );
    expect(resolved?.resolvedBy).toBe('TA0001');
    expect(resolved?.resolvedAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundException when resolving a non-existent ticket', () => {
    expect(() =>
      service.resolve('NON_EXISTENT_ID', 'TA0001', {
        resolution: 'Fixed',
      }),
    ).toThrow(NotFoundException);
  });
});
