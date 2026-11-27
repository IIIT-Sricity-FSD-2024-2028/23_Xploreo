import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/entities/auth.entity';
import {
  ApiCreateEndpoint,
  ApiProtectedResource,
  ApiReadEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NonEmptyStringPipe } from '../common/pipes/non-empty-string.pipe';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';
import { HotelsService } from './hotels.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { BookingStatus } from '../bookings/entities/booking.entity';

@ApiTags('Phase 1 - Hotels')
@ApiProtectedResource()
@Controller('hotels')
export class HotelsController {
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly bookingsRepository: BookingsRepository,
  ) {}

  @Post()
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner creates a hotel' })
  @ApiCreateEndpoint(CreateHotelDto)
  create(@Body() dto: CreateHotelDto, @Req() req: any) {
    return this.hotelsService.create(req.user?.userId, dto);
  }

  @Get()
  @Roles(Role.TRAVELLER, Role.HOTEL, Role.NONTECHADMIN, Role.SUPERADMIN)
  @ApiOperation({
    summary: 'Traveller/Admin searches active hotels; partner lists own hotels',
  })
  @ApiQuery({ name: 'location', required: false, example: 'Goa' })
  @ApiReadEndpoint()
  findAll(@Req() req: any, @Query('location') location?: string) {
    if (req.user?.role === Role.HOTEL) {
      return this.hotelsService.findForPartner(req.user?.userId);
    }
    return this.hotelsService.findAll(location);
  }

  // ── Partner profile (literal path — must stay above the ':id' routes below) ──
  @Get('partner/profile')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner reads their hotel-partner profile' })
  @ApiReadEndpoint()
  getPartnerProfile(@Req() req: any) {
    return this.hotelsService.getPartnerProfile(req.user?.userId);
  }

  @Patch('partner/profile')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner updates their hotel-partner profile' })
  updatePartnerProfile(@Req() req: any, @Body() dto: UpdatePartnerProfileDto) {
    return this.hotelsService.updatePartnerProfile(req.user?.userId, dto);
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  @Get(':id/rooms')
  // NTA reads room types to pick a package's room type (read-only, same data travellers see).
  @Roles(Role.TRAVELLER, Role.HOTEL, Role.NONTECHADMIN)
  @ApiOperation({ summary: 'List room types for a hotel' })
  @ApiReadEndpoint()
  listRooms(@Param('id', NonEmptyStringPipe) id: string) {
    return this.hotelsService.listRooms(id);
  }

  @Post(':id/rooms')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner adds a room type to their hotel' })
  @ApiCreateEndpoint(CreateRoomTypeDto)
  createRoom(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: CreateRoomTypeDto,
    @Req() req: any,
  ) {
    return this.hotelsService.createRoom(id, req.user?.userId, dto);
  }

  @Patch(':id/rooms/:roomId')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner updates a room type' })
  updateRoom(
    @Param('id', NonEmptyStringPipe) id: string,
    @Param('roomId', NonEmptyStringPipe) roomId: string,
    @Body() dto: UpdateRoomTypeDto,
    @Req() req: any,
  ) {
    const occupied = this.occupiedRoomsForType(id, roomId);
    return this.hotelsService.updateRoom(id, roomId, req.user?.userId, dto, occupied);
  }

  @Delete(':id/rooms/:roomId')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner deletes a room type' })
  deleteRoom(
    @Param('id', NonEmptyStringPipe) id: string,
    @Param('roomId', NonEmptyStringPipe) roomId: string,
    @Req() req: any,
  ) {
    const active = this.activeBookingsForRoom(id, roomId);
    return this.hotelsService.deleteRoom(id, roomId, req.user?.userId, active);
  }

  @Get(':id/availability')
  @Roles(Role.TRAVELLER, Role.HOTEL)
  @ApiOperation({ summary: '14-day availability calendar for a hotel' })
  @ApiReadEndpoint()
  getAvailability(@Param('id', NonEmptyStringPipe) id: string) {
    return this.hotelsService.getAvailability(id);
  }

  @Get(':id')
  @Roles(Role.TRAVELLER, Role.HOTEL)
  @ApiOperation({ summary: 'Get hotel by ID' })
  @ApiReadEndpoint()
  findOne(@Param('id', NonEmptyStringPipe) id: string) {
    return this.hotelsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner updates their hotel' })
  update(
    @Param('id', NonEmptyStringPipe) id: string,
    @Body() dto: UpdateHotelDto,
    @Req() req: any,
  ) {
    return this.hotelsService.update(id, req.user?.userId, dto);
  }

  @Delete(':id')
  @Roles(Role.HOTEL)
  @ApiOperation({ summary: 'Partner deletes their hotel' })
  remove(@Param('id', NonEmptyStringPipe) id: string, @Req() req: any) {
    const active = this.bookingsRepository
      .findByHotelIds([id])
      .filter((b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN)
      .length;
    return this.hotelsService.remove(id, req.user?.userId, active);
  }

  private occupiedRoomsForType(hotelId: string, roomId: string): number {
    const room = this.hotelsService.listRooms(hotelId).find((r) => r.id === roomId);
    if (!room) return 0;
    return this.bookingsRepository
      .findByHotelIds([hotelId])
      .filter(
        (b) =>
          b.roomType === room.type &&
          (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN),
      )
      .reduce((sum, b) => sum + (b.rooms ?? 1), 0);
  }

  private activeBookingsForRoom(hotelId: string, roomId: string): number {
    const room = this.hotelsService.listRooms(hotelId).find((r) => r.id === roomId);
    if (!room) return 0;
    return this.bookingsRepository
      .findByHotelIds([hotelId])
      .filter(
        (b) =>
          b.roomType === room.type &&
          (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN),
      ).length;
  }
}
