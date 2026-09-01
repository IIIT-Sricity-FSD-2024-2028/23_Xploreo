export enum ExperienceCategory {
  ADVENTURE = 'adventure',
  CULTURAL = 'culture',
  CULTURE = 'culture',
  CULINARY = 'culinary',
  WELLNESS = 'wellness',
  WILDLIFE = 'wildlife',
  PHOTOGRAPHY = 'photography',
  TOURS = 'tours',
  ATTRACTION_TICKETS = 'attraction tickets',
  WATER_SPORTS = 'water sports',
  CRUISES = 'cruises',
  FAMILY = 'family',
  LUXURY = 'luxury',
  WEEKEND_GETAWAY = 'weekend getaway',
  HONEYMOON = 'honeymoon',
  PILGRIMAGE = 'pilgrimage',
}

export enum ExperienceAvailability {
  AVAILABLE = 'available',
  NOT_AVAILABLE = 'unavailable',
}

export class Experience {
  id!: string;
  partnerId!: string;
  title!: string;
  description!: string;
  destination!: string;
  category!: ExperienceCategory;
  availability!: ExperienceAvailability;
  price!: number;
  durationHours!: number;
  capacity!: number;
  booked!: number;
  image!: string;
  nextSlot!: string;
  slots!: Array<{
    id: string;
    date: string;
    time: string;
    booked: number;
    capacity: number;
    available: boolean;
  }>;
}
