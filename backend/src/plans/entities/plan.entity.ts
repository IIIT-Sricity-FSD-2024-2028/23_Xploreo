import { StructuredItinerary } from '../../common/entities/itinerary.entity';

export class Plan {
  id!: string;
  title!: string;
  description!: string;
  originCity!: string;
  destination!: string;
  durationNights!: number;
  pricePerPerson!: number;
  hotelStars!: number;
  includesFlight!: boolean;
  image!: string;
  tags!: string[];
  itinerary!: StructuredItinerary;
  isActive?: boolean;
  status?: string;
}
