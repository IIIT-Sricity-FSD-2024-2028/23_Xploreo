import { Injectable } from '@nestjs/common';
import { Plan } from './entities/plan.entity';
import { createId } from '../common/utils/id';
import { normalizeStructuredItinerary } from '../common/utils/itinerary-mapper';
import { stripUndefined } from '../common/utils/strip-undefined';
import { loadSeedData } from '../common/utils/seed-loader';

@Injectable()
export class PlansRepository {
  private plans: Plan[] = loadSeedData<Plan>('plans.json', [
    {
      id: 'plan-1',
      title: 'Kerala Backwaters Escape',
      description: 'Relax in the serene backwaters of Alleppey with houseboat stays.',
      originCity: 'Bangalore',
      destination: 'Kerala',
      status: 'available',
      durationNights: 5,
      pricePerPerson: 22000,
      hotelStars: 4,
      includesFlight: true,
      image: '',
      tags: ['Backwaters', 'Relaxation', 'Kerala'],
      itinerary: normalizeStructuredItinerary([
        { day: 'Day 1', title: 'Arrival in Kochi', detail: 'Transfer to Alleppey and check in to houseboat.' },
        { day: 'Day 2', title: 'Backwater Cruise', detail: 'Full day cruise through the canals.' },
      ], {
        idPrefix: 'plan-1',
        originCity: 'Bangalore',
        destination: 'Kerala',
        startDate: '2026-07-01',
        endDate: '2026-07-06',
        includesFlight: true,
        hotelStars: 4,
      }),
    },
    {
      id: 'plan-2',
      title: 'Rajasthan Heritage Tour',
      description: 'Explore the forts, palaces and culture of the royal state.',
      originCity: 'Delhi',
      destination: 'Jaipur',
      durationNights: 7,
      pricePerPerson: 35000,
      hotelStars: 5,
      status: 'available',
      includesFlight: false,
      image: '',
      tags: ['Heritage', 'Culture', 'Rajasthan'],
      itinerary: normalizeStructuredItinerary([
        { day: 'Day 1', title: 'Jaipur Arrival', detail: 'Check in and visit City Palace.' },
        { day: 'Day 2', title: 'Amber Fort', detail: 'Explore the grand Amber Fort.' },
      ], {
        idPrefix: 'plan-2',
        originCity: 'Delhi',
        destination: 'Jaipur',
        startDate: '2026-08-01',
        endDate: '2026-08-08',
        includesFlight: false,
        hotelStars: 5,
      }),
    },
  ]);

  create(data: Partial<Omit<Plan, 'itinerary'>> & { itinerary?: unknown }): Plan {
    const id = data.id || createId();
    const plan: Plan = {
      id,
      title: data.title!,
      description: data.description!,
      status: data.status ?? 'available',
      originCity: data.originCity!,
      destination: data.destination!,
      durationNights: data.durationNights!,
      pricePerPerson: data.pricePerPerson!,
      hotelStars: data.hotelStars!,
      includesFlight: data.includesFlight ?? true,
      image: data.image ?? '',
      tags: data.tags ?? [],
      itinerary: normalizeStructuredItinerary(data.itinerary, {
        idPrefix: id,
        originCity: data.originCity,
        destination: data.destination,
        includesFlight: data.includesFlight ?? true,
        hotelStars: data.hotelStars,
      }),
    };
    this.plans.push(plan);
    return plan;
  }

  findAll(options?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    destination?: string;
    statuses?: string[];
  }): { data: Plan[]; total: number; page: number; limit: number } {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    let filtered = [...this.plans];

    if (options?.statuses && options.statuses.length > 0) {
      const allowed = options.statuses.map((s) => s.toLowerCase());
      filtered = filtered.filter((p) => allowed.includes((p.status || 'available').toLowerCase()));
    }

    if (options?.from) {
      const q = options.from.toLowerCase();
      filtered = filtered.filter((p) => p.originCity.toLowerCase().includes(q));
    }

    if (options?.to) {
      const q = options.to.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.destination.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q),
      );
    }

    if (options?.destination) {
      const q = options.destination.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.destination.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) =>
      a.destination.localeCompare(b.destination) || a.title.localeCompare(b.title),
    );

    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);
    return { data, total, page, limit };
  }

  findById(id: string): Plan | undefined {
    return this.plans.find((p) => p.id === id);
  }

  update(
    id: string,
    data: Partial<Omit<Plan, 'itinerary'>> & { itinerary?: unknown },
  ): Plan | undefined {
    const idx = this.plans.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    data = stripUndefined(data) as typeof data;
    this.plans[idx] = {
      ...this.plans[idx],
      ...data,
      itinerary: data.itinerary
        ? normalizeStructuredItinerary(data.itinerary, {
            idPrefix: id,
            originCity: data.originCity ?? this.plans[idx].originCity,
            destination: data.destination ?? this.plans[idx].destination,
            includesFlight: data.includesFlight ?? this.plans[idx].includesFlight,
            hotelStars: data.hotelStars ?? this.plans[idx].hotelStars,
          })
        : this.plans[idx].itinerary,
    };
    return this.plans[idx];
  }

  delete(id: string): boolean {
    const idx = this.plans.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.plans.splice(idx, 1);
    return true;
  }
}
