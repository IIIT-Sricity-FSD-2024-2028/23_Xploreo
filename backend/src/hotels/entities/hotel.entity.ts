export class Hotel {
  id!: string;
  partnerId!: string;
  name!: string;
  city!: string;
  location!: string;
  description!: string;
  stars!: number;
  rating!: number;
  reviewCount!: number;
  pricePerNight!: number;
  taxesAndFees!: number;
  totalRooms!: number;
  availableRooms!: number;
  image!: string;
  images?: string[];
  amenities!: string[];
  status!: 'active' | 'inactive' | 'restricted';
  isDeleted?: boolean;
  createdAt!: Date;
}
