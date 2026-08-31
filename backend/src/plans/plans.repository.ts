import { Injectable } from '@nestjs/common';
import { Plan } from './entities/plan.entity';
import { createId } from '../common/utils/id';
import { normalizeStructuredItinerary } from '../common/utils/itinerary-mapper';

@Injectable()
export class PlansRepository {
  private plans: Plan[] = [
    {
      id: 'plan-1',
      title: 'Kerala Backwaters Escape',
      description:
        'Relax in the serene backwaters of Alleppey with houseboat stays.',
      originCity: 'Bangalore',
      destination: 'Alleppey',
      durationNights: 5,
      pricePerPerson: 280,
      hotelStars: 4,
      includesFlight: false,
      image: '',
      tags: ['Backwaters', 'Relaxation', 'Kerala'],
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival at COK & Transfer to Alleppey',
            detail:
              'Meet your driver at Cochin International Airport (COK). Transfer via NH66 (approx 2.5 hours) to Alleppey. Check in to your premium houseboat by 12:30 PM.',
          },
          {
            day: 'Day 2',
            title: 'Vembanad Lake Cruise',
            detail:
              'Full day serene cruise through the backwater canals. Enjoy traditional Kerala lunch on board.',
          },
          {
            day: 'Day 3',
            title: 'Kumarakom Village Tour',
            detail:
              'Disembark and transfer to Kumarakom. Visit the Kumarakom Bird Sanctuary.',
          },
          {
            day: 'Day 4',
            title: 'Leisure & Ayurvedic Spa',
            detail:
              'Relax at your resort with a complimentary 60-minute Ayurvedic spa session.',
          },
          {
            day: 'Day 5',
            title: 'Departure Transfer',
            detail:
              'Check out at 10:00 AM and transfer back to COK airport for your return flight.',
          },
        ],
        {
          idPrefix: 'plan-1',
          originCity: 'Bangalore',
          destination: 'Alleppey',
          startDate: '2026-07-01',
          endDate: '2026-07-06',
          includesFlight: false,
          hotelStars: 4,
        },
      ),
    },
    {
      id: 'plan-2',
      title: 'Rajasthan Heritage Tour',
      description: 'Explore the forts, palaces and culture of the royal state.',
      originCity: 'Delhi',
      destination: 'Jaipur',
      durationNights: 7,
      pricePerPerson: 450,
      hotelStars: 5,
      includesFlight: false,
      image: '',
      tags: ['Heritage', 'Culture', 'Rajasthan'],
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival at Jaipur (JAI)',
            detail:
              'Pick up from Jaipur Junction railway station or Jaipur Airport. Transfer to your heritage hotel and check in by 2:00 PM.',
          },
          {
            day: 'Day 2',
            title: 'Amber Fort & Jal Mahal',
            detail:
              'Morning exploration of the grand Amber Fort. Afternoon photo stop at the picturesque Jal Mahal.',
          },
          {
            day: 'Day 3',
            title: 'City Palace & Hawa Mahal',
            detail:
              'Discover the pink city architecture, Jantar Mantar, and shop at the local bazaars.',
          },
          {
            day: 'Day 4',
            title: 'Drive to Jodhpur',
            detail:
              'Check out after breakfast and drive to Jodhpur via NH25 (approx 6 hours). Evening check-in at hotel.',
          },
          {
            day: 'Day 5',
            title: 'Mehrangarh Fort',
            detail:
              'Guided tour of the majestic Mehrangarh Fort and the marble cenotaph at Jaswant Thada.',
          },
          {
            day: 'Day 6',
            title: 'Bishnoi Village Safari',
            detail:
              'Experience authentic local culture and wildlife on a jeep safari through Bishnoi village.',
          },
          {
            day: 'Day 7',
            title: 'Departure Transfer',
            detail:
              'Check out by 11:00 AM. Transfer to Jodhpur Airport (JDH) or Railway Station.',
          },
        ],
        {
          idPrefix: 'plan-2',
          originCity: 'Delhi',
          destination: 'Jaipur',
          startDate: '2026-08-01',
          endDate: '2026-08-08',
          includesFlight: false,
          hotelStars: 5,
        },
      ),
    },
    {
      id: 'plan-3',
      title: 'Mumbai City & Bollywood Tour',
      description: 'Experience the city of dreams with an exclusive Bollywood tour and heritage walk.',
      originCity: 'Pune',
      destination: 'Mumbai',
      durationNights: 3,
      pricePerPerson: 150,
      hotelStars: 5,
      includesFlight: false,
      image: '',
      tags: ['City', 'Bollywood', 'Heritage', 'Mumbai'],
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival in Mumbai & Marine Drive',
            detail: 'Arrive in Mumbai and check in to your South Mumbai hotel. Evening stroll along Marine Drive.',
          },
          {
            day: 'Day 2',
            title: 'Bollywood Studio Tour',
            detail: 'Full day exclusive behind-the-scenes Bollywood studio tour and dance workshop.',
          },
          {
            day: 'Day 3',
            title: 'Heritage Walk & Shopping',
            detail: 'Morning heritage walk exploring CST and Colaba. Afternoon shopping at Colaba Causeway.',
          },
          {
            day: 'Day 4',
            title: 'Departure',
            detail: 'Check out and depart for your onward journey.',
          },
        ],
        {
          idPrefix: 'plan-3',
          originCity: 'Pune',
          destination: 'Mumbai',
          startDate: '2026-09-10',
          endDate: '2026-09-13',
          includesFlight: false,
          hotelStars: 5,
        },
      ),
    },
    {
      id: 'plan-kerala-2',
      title: 'Kerala Ayurveda Retreat',
      description: 'Rejuvenate your mind and body with traditional Ayurveda in Kerala.',
      originCity: 'Chennai',
      destination: 'Kerala',
      durationNights: 4,
      pricePerPerson: 350,
      hotelStars: 5,
      includesFlight: true,
      image: '',
      tags: ['Wellness', 'Ayurveda', 'Kerala'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Check in to wellness resort.' },
          { day: 'Day 2', title: 'Spa Day', detail: 'Full day ayurvedic treatment.' },
          { day: 'Day 3', title: 'Yoga', detail: 'Morning yoga and meditation.' },
          { day: 'Day 4', title: 'Nature Walk', detail: 'Evening walk in nature.' },
          { day: 'Day 5', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-kerala-2', originCity: 'Chennai', destination: 'Kerala', startDate: '2026-08-01', endDate: '2026-08-05', includesFlight: true, hotelStars: 5 },
      ),
    },
    {
      id: 'plan-jaipur-2',
      title: 'Jaipur Royal Experience',
      description: 'Stay in a palace and live like royalty in Jaipur.',
      originCity: 'Mumbai',
      destination: 'Jaipur',
      durationNights: 3,
      pricePerPerson: 500,
      hotelStars: 5,
      includesFlight: true,
      image: '',
      tags: ['Luxury', 'Royal', 'Jaipur'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Palace check-in.' },
          { day: 'Day 2', title: 'City Tour', detail: 'Explore the pink city.' },
          { day: 'Day 3', title: 'Elephant Ride', detail: 'Morning elephant ride at Amer fort.' },
          { day: 'Day 4', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-jaipur-2', originCity: 'Mumbai', destination: 'Jaipur', startDate: '2026-09-01', endDate: '2026-09-04', includesFlight: true, hotelStars: 5 },
      ),
    },
    {
      id: 'plan-mumbai-2',
      title: 'Mumbai Street Food Safari',
      description: 'Taste the best street food in Mumbai.',
      originCity: 'Ahmedabad',
      destination: 'Mumbai',
      durationNights: 2,
      pricePerPerson: 100,
      hotelStars: 3,
      includesFlight: false,
      image: '',
      tags: ['Food', 'City', 'Mumbai'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Evening street food tour at Juhu Beach.' },
          { day: 'Day 2', title: 'Colaba Food Tour', detail: 'Explore historic cafes in Colaba.' },
          { day: 'Day 3', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-mumbai-2', originCity: 'Ahmedabad', destination: 'Mumbai', startDate: '2026-10-01', endDate: '2026-10-03', includesFlight: false, hotelStars: 3 },
      ),
    },
    {
      id: 'plan-delhi-1',
      title: 'Delhi Historical Marvels',
      description: 'Discover the ancient monuments of Delhi.',
      originCity: 'Chandigarh',
      destination: 'Delhi',
      durationNights: 3,
      pricePerPerson: 180,
      hotelStars: 4,
      includesFlight: false,
      image: '',
      tags: ['History', 'Culture', 'Delhi'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Check in and visit India Gate.' },
          { day: 'Day 2', title: 'Old Delhi Tour', detail: 'Red Fort and Jama Masjid.' },
          { day: 'Day 3', title: 'South Delhi Tour', detail: 'Qutub Minar and Lotus Temple.' },
          { day: 'Day 4', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-delhi-1', originCity: 'Chandigarh', destination: 'Delhi', startDate: '2026-11-01', endDate: '2026-11-04', includesFlight: false, hotelStars: 4 },
      ),
    },
    {
      id: 'plan-delhi-2',
      title: 'Delhi Shopping Spree',
      description: 'Shop at the best markets in Delhi.',
      originCity: 'Lucknow',
      destination: 'Delhi',
      durationNights: 2,
      pricePerPerson: 120,
      hotelStars: 3,
      includesFlight: false,
      image: '',
      tags: ['Shopping', 'City', 'Delhi'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Visit Sarojini Nagar.' },
          { day: 'Day 2', title: 'Chandni Chowk', detail: 'Full day shopping in Old Delhi.' },
          { day: 'Day 3', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-delhi-2', originCity: 'Lucknow', destination: 'Delhi', startDate: '2026-12-01', endDate: '2026-12-03', includesFlight: false, hotelStars: 3 },
      ),
    },
    {
      id: 'plan-goa-1',
      title: 'Goa Beach Party Weekend',
      description: 'Experience the vibrant nightlife of Goa.',
      originCity: 'Mumbai',
      destination: 'Goa',
      durationNights: 3,
      pricePerPerson: 250,
      hotelStars: 4,
      includesFlight: true,
      image: '',
      tags: ['Party', 'Beach', 'Goa'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Check in and hit Baga Beach.' },
          { day: 'Day 2', title: 'Party Night', detail: 'Tito\'s Lane and Anjuna.' },
          { day: 'Day 3', title: 'Relaxation', detail: 'Chill at the resort.' },
          { day: 'Day 4', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-goa-1', originCity: 'Mumbai', destination: 'Goa', startDate: '2026-10-15', endDate: '2026-10-18', includesFlight: true, hotelStars: 4 },
      ),
    },
    {
      id: 'plan-goa-2',
      title: 'Goa Serene South',
      description: 'Relax at the quiet beaches of South Goa.',
      originCity: 'Bangalore',
      destination: 'Goa',
      durationNights: 4,
      pricePerPerson: 300,
      hotelStars: 5,
      includesFlight: true,
      image: '',
      tags: ['Relaxation', 'Luxury', 'Goa'],
      itinerary: normalizeStructuredItinerary(
        [
          { day: 'Day 1', title: 'Arrival', detail: 'Check in at South Goa resort.' },
          { day: 'Day 2', title: 'Palolem Beach', detail: 'Relax at Palolem.' },
          { day: 'Day 3', title: 'Spice Plantation', detail: 'Visit local spice farm.' },
          { day: 'Day 4', title: 'Leisure', detail: 'Free day.' },
          { day: 'Day 5', title: 'Departure', detail: 'Check out.' },
        ],
        { idPrefix: 'plan-goa-2', originCity: 'Bangalore', destination: 'Goa', startDate: '2026-11-10', endDate: '2026-11-14', includesFlight: true, hotelStars: 5 },
      ),
    },
  ];

  create(
    data: Partial<Omit<Plan, 'itinerary'>> & { itinerary?: unknown },
  ): Plan {
    const id = data.id || createId();
    const plan: Plan = {
      id,
      title: data.title!,
      description: data.description!,
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
  }): { items: Plan[]; total: number; page: number; limit: number } {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    let filtered = [...this.plans];

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

    filtered.sort(
      (a, b) =>
        a.destination.localeCompare(b.destination) ||
        a.title.localeCompare(b.title),
    );

    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit };
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
    this.plans[idx] = {
      ...this.plans[idx],
      ...data,
      itinerary: data.itinerary
        ? normalizeStructuredItinerary(data.itinerary, {
            idPrefix: id,
            originCity: data.originCity ?? this.plans[idx].originCity,
            destination: data.destination ?? this.plans[idx].destination,
            includesFlight:
              data.includesFlight ?? this.plans[idx].includesFlight,
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
