import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { TicketStatus } from './entities/ticket.entity';
import { TicketsRepository } from './tickets.repository';
import { AuthRepository } from '../auth/auth.repository';
import { Role } from '../auth/entities/auth.entity';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  create(
    user: { userId?: string; role?: string } | undefined,
    dto: CreateTicketDto,
  ) {
    if (!user || !user.userId) {
      throw new ForbiddenException('x-user-id header is required');
    }

    const authUser =
      this.authRepository.findById(user.userId) ||
      this.authRepository.findByUsername(user.userId);

    const userName = authUser?.name || user.userId;
    const userRole = String(
      user.role || authUser?.role || 'traveller',
    ).toLowerCase();

    return this.ticketsRepository.create({
      userId: user.userId,
      userName,
      userRole,
      travellerId: user.userId,
      travellerName: userName,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      category: dto.category?.trim() || 'General',
      priority: dto.priority,
    });
  }

  findAll() {
    return this.ticketsRepository.findAll();
  }

  findAllForUser(user: { userId?: string; role?: string } | undefined) {
    if (!user) {
      return this.ticketsRepository.findAll();
    }

    const role = String(user.role || '').toLowerCase();
    const isTechAdmin =
      role === 'techadmin' ||
      role === 'tech_admin' ||
      role === 'superadmin' ||
      user.role === Role.TECHADMIN ||
      user.role === Role.TECH_ADMIN ||
      user.role === Role.SUPERADMIN;

    if (isTechAdmin) {
      return this.ticketsRepository.findAll();
    }

    if (user.userId) {
      return this.ticketsRepository.findByUserId(user.userId);
    }

    return this.ticketsRepository.findAll();
  }

  findByUserId(userId: string) {
    return this.ticketsRepository.findByUserId(userId);
  }

  findOne(id: string) {
    const ticket = this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  resolve(id: string, techAdminId: string | undefined, dto: ResolveTicketDto) {
    if (!techAdminId) {
      throw new ForbiddenException(
        'x-user-id header is required for TECH_ADMIN',
      );
    }

    const ticket = this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    if (ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('Ticket is already resolved');
    }

    return this.ticketsRepository.resolve(id, {
      resolvedBy: techAdminId,
      resolution: dto.resolution?.trim() || 'Resolved by technical admin',
    });
  }
}
