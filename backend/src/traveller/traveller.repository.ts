import { Injectable } from '@nestjs/common';
import { Traveller, Interest } from './entities/traveller.entity';

@Injectable()
export class TravellerRepository {
  private travellers: Traveller[] = [
    {
      userId: '20001',
      fname: 'Anjali',
      lname: 'Sharma',
      email: 'anjali@xploreo.com',
      phno: 9123456780,
      plang: ['English', 'Gujarati'],
      bio: 'Loves exploring local cultures and street food',
      interests: [Interest.FOOD, Interest.CULTURE],
      gender: 'Female',
      dob: '2001-08-15',
    },
  ];

  create(traveller: Traveller): Traveller {
    this.travellers.push(traveller);
    return traveller;
  }

  findAll(): Traveller[] {
    return this.travellers;
  }

  findById(userId: string): Traveller | undefined {
    return this.travellers.find((t) => t.userId === userId);
  }

  update(userId: string, data: Partial<Traveller>): Traveller | undefined {
    const idx = this.travellers.findIndex((t) => t.userId === userId);
    if (idx === -1) return undefined;
    this.travellers[idx] = { ...this.travellers[idx], ...data };
    return this.travellers[idx];
  }

  delete(userId: string): boolean {
    const idx = this.travellers.findIndex((t) => t.userId === userId);
    if (idx === -1) return false;
    this.travellers.splice(idx, 1);
    return true;
  }
}
