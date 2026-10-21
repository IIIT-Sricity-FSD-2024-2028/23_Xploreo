import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/create-auth.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/password-reset.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from './entities/auth.entity';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import {
  ApiProtectedResource,
  ApiCreateEndpoint,
  ApiUpdateEndpoint,
  ApiReadEndpoint,
  ApiDeleteEndpoint,
} from '../common/decorators/api-docs.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreateEndpoint(RegisterDto)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and receive RBAC request headers' })
  @ApiCreateEndpoint(LoginDto)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('password-reset/request')
  @ApiOperation({ summary: 'Email a five-minute password-reset link' })
  @ApiCreateEndpoint(RequestPasswordResetDto)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Set a new password with a valid reset token' })
  @ApiCreateEndpoint(ConfirmPasswordResetDto)
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.password, dto.confirmPassword);
  }

  @Roles(Role.SUPERADMIN, Role.TECHADMIN)
  @ApiProtectedResource()
  @Get('users')
  @ApiOperation({ summary: 'List all users (SuperAdmin: everyone; Tech Admin: operational accounts only)' })
  @ApiReadEndpoint()
  findAll(@Req() req: any) {
    return this.authService.findAll(req.user);
  }

  // ── Admin Management (Super Admin only) ──
  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Get('staff')
  @ApiOperation({ summary: 'List regional (NonTechAdmin) and Tech Admin accounts' })
  @ApiReadEndpoint()
  findStaff() {
    return this.authService.findStaff();
  }

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Post('staff')
  @ApiOperation({ summary: 'Create a regional (NonTechAdmin) or Tech Admin account' })
  @ApiCreateEndpoint(CreateStaffDto)
  createStaff(@Body() dto: CreateStaffDto) {
    return this.authService.createStaff(dto);
  }

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.authService.findOne(id);
  }

  @Roles(
    Role.SUPERADMIN,
    Role.TRAVELLER,
    Role.GUIDE,
    Role.HOTEL,
    Role.EXPERIENCE,
    Role.TECHADMIN,
    Role.NONTECHADMIN,
  )
  @ApiProtectedResource()
  @Patch('users/:id')
  @ApiOperation({
    summary:
      'Update a user — self; any account if Super Admin (never another Super Admin); status only, on operational accounts, if Tech Admin',
  })
  @ApiUpdateEndpoint(UpdateAuthDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateAuthDto,
    @Req() req: any,
  ) {
    return this.authService.update(id, dto, req.user);
  }

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user (never a Super Admin account)' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    return this.authService.remove(id, req.user);
  }
}
