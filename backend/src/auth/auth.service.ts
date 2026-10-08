import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { Role } from './entities/auth.entity';
import { normalizeAllowedLocation } from '../common/utils/location-scope';

@Injectable()
export class AuthService {
  private readonly saltRounds = process.env.NODE_ENV === 'test' ? 1 : 10;

  constructor(private readonly authRepository: AuthRepository) { }

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const existingEmail = await this.authRepository.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Email already exists');

    const actorRoles = [
      Role.HOTEL,
      Role.PARTNER,
      Role.GUIDE,
      Role.EXPERIENCE,
      Role.EXPERIENCE_PARTNER,
      Role.NONTECHADMIN,
    ];
    let location = dto.location ? normalizeAllowedLocation(dto.location) : undefined;
    if (dto.location && !location) {
      throw new BadRequestException(
        `Invalid location '${dto.location}'. Allowed locations: Jaipur, Goa, Delhi, Mumbai, Kerala`,
      );
    }
    if (!location && actorRoles.includes(dto.role)) {
      throw new BadRequestException(
        'Location is required for actor accounts and must be one of: Jaipur, Goa, Delhi, Mumbai, Kerala',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.authRepository.create({
      userId: dto.username,
      username: dto.username,
      password: hashedPassword,
      role: dto.role,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      location: location || undefined,
      status: 'active',
      businessName: dto.businessName,
      taxId: dto.taxId,
      bankAccount: dto.bankAccount,
    });

    const { password: _pw, ...safe } = user;
    return { message: 'Registered successfully', user: safe };
  }

  async login(dto: LoginDto) {
    const user =
      this.authRepository.findByUsername(dto.username) ??
      this.authRepository.findByEmail(dto.username);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const { password: _pw, ...safe } = user;
    return {
      user: safe,
      headers: {
        'x-user-id': user.userId,
        'x-user-role': toApiHeaderRole(user.role),
        ...(user.location ? { 'x-user-location': user.location } : {}),
      },
    };
  }

  async findAll() {
    const users = await this.authRepository.findAll();
    return users.map(({ password: _pw, ...u }) => u);
  }

  async findAdmins(requester?: any) {
    const requesterRole = (requester?.role || '').toLowerCase().replace(/_/g, '');
    let isHighLevel = false;
    let requesterStatus = 'active';
    if (requester?.userId) {
      const dbRequester = await this.authRepository.findById(requester.userId);
      isHighLevel = Boolean(dbRequester?.isHighLevelAdmin);
      requesterStatus = dbRequester?.status || 'active';
    }

    if (requesterStatus === 'inactive' || requesterStatus === 'restricted') {
      throw new ForbiddenException(
        'Access denied. Your account has been deactivated or restricted.',
      );
    }

    if (requesterRole !== 'superadmin') {
      if (requesterRole !== 'techadmin' || !isHighLevel) {
        throw new ForbiddenException(
          'Access denied. Only Super Admin or authorized High-Level Technical Admins can view and manage admins.',
        );
      }
    }

    const users = await this.authRepository.findAll();
    return users
      .filter((u) => {
        return u.role === 'techadmin' || u.role === 'nontechadmin' || u.role === 'superadmin';
      })
      .map(({ password: _pw, ...u }) => u);
  }

  async findOne(id: string) {
    const user = await this.authRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: UpdateAuthDto, requester?: any) {
    const requesterRole = (requester?.role || '').toLowerCase().replace(/_/g, '');
    let isHighLevel = false;
    let requesterStatus = 'active';
    if (requester?.userId) {
      const dbRequester = await this.authRepository.findById(requester.userId);
      isHighLevel = Boolean(dbRequester?.isHighLevelAdmin);
      requesterStatus = dbRequester?.status || 'active';
    }

    if (requesterStatus === 'inactive' || requesterStatus === 'restricted') {
      throw new ForbiddenException(
        'Access denied. Your account has been deactivated or restricted.',
      );
    }

    if (dto.isHighLevelAdmin !== undefined && requesterRole !== 'superadmin') {
      throw new ForbiddenException(
        'Only Super Admins can toggle High-Level Technical Admin privileges.',
      );
    }

    const target = await this.authRepository.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);

    if (target.role === Role.SUPERADMIN && requesterRole !== 'superadmin') {
      throw new ForbiddenException('High-level tech admins cannot modify Super Admins.');
    }

    if (requesterRole === 'techadmin' && !isHighLevel && requester?.userId !== id) {
      throw new ForbiddenException(
        'Access denied. High-level technical admin authorization required.',
      );
    }

    const updateData = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, this.saltRounds);
    }
    const updated = await this.authRepository.update(id, updateData);
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    const { password: _pw, ...safe } = updated;
    return safe;
  }

  async remove(id: string, requester?: any) {
    const requesterRole = (requester?.role || '').toLowerCase().replace(/_/g, '');
    let isHighLevel = false;
    let requesterStatus = 'active';
    if (requester?.userId) {
      const dbRequester = await this.authRepository.findById(requester.userId);
      isHighLevel = Boolean(dbRequester?.isHighLevelAdmin);
      requesterStatus = dbRequester?.status || 'active';
    }

    if (requesterStatus === 'inactive' || requesterStatus === 'restricted') {
      throw new ForbiddenException(
        'Access denied. Your account has been deactivated or restricted.',
      );
    }

    if (requesterRole !== 'superadmin') {
      if (requesterRole !== 'techadmin' || !isHighLevel) {
        throw new ForbiddenException(
          'Access denied. Only Super Admin or High-Level Technical Admins can delete admin accounts.',
        );
      }
    }

    const target = await this.authRepository.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);

    if (target.role === Role.SUPERADMIN && requesterRole !== 'superadmin') {
      throw new ForbiddenException('High-level tech admins cannot delete Super Admins.');
    }

    const deleted = await this.authRepository.delete(id);
    if (!deleted) throw new NotFoundException(`User ${id} not found`);
    return { message: `User ${id} deleted` };
  }
}

function toApiHeaderRole(role: string): string {
  if (role === 'traveller') return 'TRAVELLER';
  if (role === 'hotel') return 'PARTNER';
  return role;
}
