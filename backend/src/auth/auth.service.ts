import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/create-auth.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { OPERATIONAL_ROLES, Role, STAFF_ROLES } from './entities/auth.entity';
import { PasswordResetMailService } from './password-reset-mail.service';

export const JWT_SECRET = process.env.JWT_SECRET || 'xploreo-dev-secret-key-2026';
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000;
const scrypt = promisify(scryptCallback);

type PasswordResetRecord = {
  userId: string;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  private readonly passwordResetTokens = new Map<string, PasswordResetRecord>();

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordResetMailService: PasswordResetMailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const existingEmail = await this.authRepository.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Email already exists');

    const user = await this.authRepository.create({
      userId: dto.username,
      username: dto.username,
      password: await this.hashPassword(dto.password),
      role: dto.role,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      location: dto.location,
      status: 'active',
    });

    const { password: _pw, ...safe } = user;
    const token = this.generateToken(safe);
    return { message: 'Registered successfully', user: { ...safe, token }, token };
  }

  // Admin Management (Super Admin only, enforced at the controller) — creates a Regional
  // (NonTechAdmin) or Tech Admin account. Super Admin accounts are never created via the API.
  async createStaff(dto: CreateStaffDto) {
    const existing = await this.authRepository.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const existingEmail = await this.authRepository.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Email already exists');

    if (dto.role === Role.NONTECHADMIN && !dto.region?.trim()) {
      throw new BadRequestException('A regional admin needs a region to be assigned.');
    }

    const user = await this.authRepository.create({
      userId: dto.username,
      username: dto.username,
      password: dto.password,
      role: dto.role,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      region: dto.role === Role.NONTECHADMIN ? dto.region?.trim() : undefined,
      status: 'active',
    });

    const { password: _pw, ...safe } = user;
    return safe;
  }

  async login(dto: LoginDto) {
    const rawUsername = dto.username?.trim();
    const user =
      this.authRepository.findByUsername(rawUsername) ??
      this.authRepository.findByEmail(rawUsername);
    if (!user || !(await this.matchesPassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.status === 'inactive') {
      throw new UnauthorizedException('Account has been restricted. Please contact support.');
    }

    const { password: _pw, ...safe } = user;
    const region = this.authRepository.findRegionForUser(user.userId);
    const token = this.generateToken({ ...safe, region });

    return {
      user: { ...safe, region, token },
      token,
      headers: {
        'x-user-id': user.userId,
        'x-user-role': toApiHeaderRole(user.role),
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async requestPasswordReset(email: string) {
    this.passwordResetMailService.assertConfigured();
    // Do not reveal whether an address belongs to an account.
    const user = this.authRepository.findByEmail(email.trim());
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = this.hashResetToken(token);
      for (const [hash, record] of this.passwordResetTokens) {
        if (record.userId === user.userId) this.passwordResetTokens.delete(hash);
      }
      this.passwordResetTokens.set(tokenHash, {
        userId: user.userId,
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
      });

      const appUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const resetUrl = `${appUrl}/Auth/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await this.passwordResetMailService.sendPasswordReset(user.email, resetUrl);
      } catch (error) {
        this.passwordResetTokens.delete(tokenHash);
        throw error;
      }
    }

    return {
      message: 'If an Xploreo account uses that email address, a password-reset link has been sent.',
    };
  }

  async confirmPasswordReset(token: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Password confirmation does not match password.');
    }
    const tokenHash = this.hashResetToken(token);
    const reset = this.passwordResetTokens.get(tokenHash);
    if (!reset || reset.expiresAt <= Date.now()) {
      this.passwordResetTokens.delete(tokenHash);
      throw new BadRequestException('This password-reset link is invalid or has expired.');
    }

    const user = this.authRepository.findById(reset.userId);
    if (!user) {
      this.passwordResetTokens.delete(tokenHash);
      throw new BadRequestException('This password-reset link is invalid or has expired.');
    }

    await this.authRepository.update(user.userId, {
      password: await this.hashPassword(password),
    });
    // A reset link is single-use. Remove any outstanding links for this account.
    for (const [hash, record] of this.passwordResetTokens) {
      if (record.userId === user.userId) this.passwordResetTokens.delete(hash);
    }
    return { message: 'Your password has been changed. You can now sign in.' };
  }

  generateToken(user: { userId: string; username: string; role: string; region?: string }): string {
    return jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        role: user.role,
        region: user.region,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
  }

  async findAll(actor?: { role?: string }) {
    const users = await this.authRepository.findAll();
    const safe = users.map(({ password: _pw, ...u }) => u);
    // Tech Admin gets Users & Partners (the operational accounts) only — Admin Management
    // (regional/tech admin accounts) is Super Admin's alone.
    if (actor?.role === Role.TECHADMIN) {
      return safe.filter((u) => (OPERATIONAL_ROLES as readonly string[]).includes(u.role));
    }
    return safe;
  }

  // Admin Management listing: regional + tech admin accounts only (never Super Admin — there is
  // no UI or endpoint that edits one, so there is no reason to even list them here).
  async findStaff() {
    const users = await this.authRepository.findAll();
    return users
      .filter((u) => (STAFF_ROLES as readonly string[]).includes(u.role))
      .map(({ password: _pw, ...u }) => u);
  }

  async findOne(id: string) {
    const user = await this.authRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async update(
    id: string,
    dto: UpdateAuthDto,
    actor?: { userId?: string; role?: string },
  ) {
    const isSuperAdmin = actor?.role === Role.SUPERADMIN;
    const isTechAdmin = actor?.role === Role.TECHADMIN;
    const isSelf = actor?.userId === id;
    const target = await this.authRepository.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);

    // Super Admin accounts are never edited through this endpoint — by Super Admin, Tech Admin,
    // or anyone else, including themselves — so one can't be deactivated or locked out by mistake.
    if (target.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Super Admin accounts cannot be modified here.');
    }

    if (isSuperAdmin) {
      // Full power, subject to the Super Admin guard above.
    } else if (isTechAdmin && !isSelf) {
      // Users & Partners: Tech Admin may view and suspend/restore an operational account, but
      // cannot touch admin accounts or change anything other than status.
      if (!(OPERATIONAL_ROLES as readonly string[]).includes(target.role)) {
        throw new ForbiddenException('Tech Admin can only manage guide, traveller, hotel, and experience accounts.');
      }
      const changedFields = Object.keys(dto).filter((key) => dto[key as keyof UpdateAuthDto] !== undefined);
      if (changedFields.some((key) => key !== 'status')) {
        throw new ForbiddenException('Tech Admin can only change account status.');
      }
    } else if (!isSelf) {
      throw new ForbiddenException('You can only update your own account.');
    } else {
      if (dto.role !== undefined) {
        throw new ForbiddenException('You cannot change your account type.');
      }
      if (dto.status !== undefined) {
        throw new ForbiddenException('Only administrators can change account status.');
      }
    }

    const updated = await this.authRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    const { password: _pw, ...safe } = updated;
    return safe;
  }

  async remove(id: string, actor?: { role?: string }) {
    const target = await this.authRepository.findById(id);
    if (!target) throw new NotFoundException(`User ${id} not found`);
    if (target.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Super Admin accounts cannot be deleted.');
    }
    if (actor?.role === Role.TECHADMIN && !(OPERATIONAL_ROLES as readonly string[]).includes(target.role)) {
      throw new ForbiddenException('Tech Admin can only manage guide, traveller, hotel, and experience accounts.');
    }
    const deleted = await this.authRepository.delete(id);
    if (!deleted) throw new NotFoundException(`User ${id} not found`);
    return { message: `User ${id} deleted` };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  private async matchesPassword(password: string, storedPassword: string) {
    const [scheme, salt, expectedHash] = storedPassword.split('$');
    // Existing seeded/demo users are migrated only when their password changes.
    if (scheme !== 'scrypt' || !salt || !expectedHash) return storedPassword === password;
    const actualHash = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(expectedHash, 'hex');
    return expected.length === actualHash.length && timingSafeEqual(expected, actualHash);
  }
}

function toApiHeaderRole(role: string): string {
  if (role === 'traveller') return 'TRAVELLER';
  if (role === 'hotel') return 'PARTNER';
  return role;
}
