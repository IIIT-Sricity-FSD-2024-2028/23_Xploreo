import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
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

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Get('users')
  @ApiOperation({ summary: 'List all users (SuperAdmin only)' })
  @ApiReadEndpoint()
  findAll() {
    return this.authService.findAll();
  }

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.authService.findOne(id);
  }

  @ApiProtectedResource()
  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiUpdateEndpoint(UpdateAuthDto)
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateAuthDto,
  ) {
    return this.authService.update(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @ApiProtectedResource()
  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiDeleteEndpoint()
  remove(@Param('id', NonEmptyStringPipe) id: string) {
    return this.authService.remove(id);
  }
}
