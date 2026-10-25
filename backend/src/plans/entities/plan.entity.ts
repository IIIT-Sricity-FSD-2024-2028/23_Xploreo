import { StructuredItinerary } from '../../common/entities/itinerary.entity';

export class Plan {
  id!: string;
  title!: string;
  description!: string;
  originCity!: string;
  destination!: string;
  status!: 'available' | 'draft' | 'sold_out' | 'unavailable';
  durationNights!: number;
  pricePerPerson!: number;
  hotelStars!: number;
  includesFlight!: boolean;
  image!: string;
  tags!: string[];
  itinerary!: StructuredItinerary;
}
