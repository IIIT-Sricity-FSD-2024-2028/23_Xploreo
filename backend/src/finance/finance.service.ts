import { Injectable } from '@nestjs/common';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { BookingsRepository } from '../bookings/bookings.repository';
import { ExperienceBookingStatus } from '../experience-bookings/entities/experience-booking.entity';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { HotelsRepository } from '../hotels/hotels.repository';
import { PlansRepository } from '../plans/plans.repository';
import { TripStatus } from '../trips/entities/trip.entity';
import { TripsRepository } from '../trips/trips.repository';

type Actor = { userId?: string; role?: string; region?: string };
type Bucket = 'completed' | 'upcoming' | 'refunded';
type Kind = 'package' | 'hotel' | 'experience';

export interface Row {
  kind: Kind;
  id: string;
  title: string;
  city: string;
  amount: number;
  bucket: Bucket;
  status: string;
  date: string;
  travellerId: string;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/**
 * Money roll-up across every booking type, computed live from the real records:
 *  - completed: the service was delivered (trip completed / guest checked out / session completed)
 *  - upcoming:  paid and booked, service not yet delivered
 *  - refunded:  cancelled or refunded
 * A regional NTA sees only their own city; a superadmin sees everything plus the per-city split.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly plans: PlansRepository,
    private readonly hotelBookings: BookingsRepository,
    private readonly hotels: HotelsRepository,
    private readonly experienceBookings: ExperienceBookingsRepository,
    private readonly experiences: ExperiencesRepository,
  ) {}

  summary(actor?: Actor) {
    const rows = this.collectRows();
    const region = norm(actor?.region);
    const scoped =
      actor?.role === 'nontechadmin' ? rows.filter((r) => region && norm(r.city) === region) : rows;

    const total = (list: Row[], bucket?: Bucket) =>
      list.filter((r) => !bucket || r.bucket === bucket).reduce((sum, r) => sum + r.amount, 0);

    const split = (list: Row[]) => ({
      count: list.length,
      completed: total(list, 'completed'),
      upcoming: total(list, 'upcoming'),
      refunded: total(list, 'refunded'),
      // Money held or earned today: delivered services plus paid-but-upcoming ones.
      net: total(list, 'completed') + total(list, 'upcoming'),
    });

    const byKind = (['package', 'hotel', 'experience'] as Kind[]).map((kind) => ({
      kind,
      ...split(scoped.filter((r) => r.kind === kind)),
    }));
    // Every city we operate in appears, even before its first booking.
    const known = this.plans.findAll({ page: 1, limit: 1000 }).data.map((plan) => plan.destination);
    const inScope = (city: string) => actor?.role !== 'nontechadmin' || norm(city) === region;
    const cities = [...new Set([...known.filter(inScope), ...scoped.map((r) => r.city)])].sort();
    const byCity = cities.map((city) => ({ city, ...split(scoped.filter((r) => r.city === city)) }));

    const transactions = [...scoped]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 25);

    return {
      scope: actor?.role === 'nontechadmin' ? (actor.region ?? '') : 'all',
      generatedAt: new Date().toISOString(),
      totals: split(scoped),
      byKind,
      byCity,
      transactions,
    };
  }

  private collectRows(): Row[] {
    const rows: Row[] = [];

    for (const trip of this.trips.findAll()) {
      const plan = this.plans.findById(trip.planId);
      const status = trip.status as string;
      const bucket: Bucket =
        trip.status === TripStatus.COMPLETED
          ? 'completed'
          : status === 'refunded' || status === 'cancelled'
            ? 'refunded'
            : 'upcoming';
      rows.push({
        kind: 'package',
        id: trip.id,
        title: plan?.title ?? trip.planId,
        city: plan?.destination ?? trip.currentLocation ?? '',
        amount: trip.totalAmount || 0,
        bucket,
        status,
        date: trip.itinerary?.day1?.hotel?.checkInDate ?? trip.lastUpdatedAt ?? '',
        travellerId: trip.travellerId,
      });
    }

    for (const booking of this.hotelBookings.findAll()) {
      if (booking.isPackageComponent || booking.tripId) continue;
      const hotel = this.hotels.findById(booking.hotelId);
      rows.push({
        kind: 'hotel',
        id: booking.id,
        title: hotel?.name ?? booking.hotelId,
        city: hotel?.city ?? '',
        amount: booking.totalAmount || 0,
        bucket:
          booking.status === BookingStatus.CHECKED_OUT
            ? 'completed'
            : booking.status === BookingStatus.CANCELLED
              ? 'refunded'
              : 'upcoming',
        status: booking.status,
        date: booking.checkIn,
        travellerId: booking.travellerId,
      });
    }

    for (const booking of this.experienceBookings.findAll()) {
      if (booking.isPackageComponent || booking.tripId) continue;
      const experience = this.experiences.findById(booking.experienceId);
      rows.push({
        kind: 'experience',
        id: booking.id,
        title: experience?.title ?? booking.experienceId,
        city: experience?.destination ?? '',
        amount: booking.totalAmount || 0,
        bucket:
          booking.status === ExperienceBookingStatus.COMPLETED
            ? 'completed'
            : booking.status === ExperienceBookingStatus.CANCELLED
              ? 'refunded'
              : 'upcoming',
        status: booking.status,
        date: booking.date,
        travellerId: booking.travellerId,
      });
    }
    return rows;
  }
}
