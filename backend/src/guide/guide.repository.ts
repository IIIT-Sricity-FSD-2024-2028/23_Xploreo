import { Injectable } from '@nestjs/common';
import { Guide } from './entities/guide.entity';

@Injectable()
export class GuideRepository {
  private guides: Guide[] = [
    {
      userId: '10001',
      fname: 'Sreekar',
      lname: 'K',
      email: 'sreekar@gmail.com',
      phone: 9876543210,
      location: 'loc-mumbai-1',
      prof_title: 'Senior Trek Guide',
      years_exp: 7,
      bio: 'Expert mountain guide with 7+ years experience in trekking and outdoor adventures',
      lang_spoken: ['English', 'Hindi', 'Marathi'],
      certifications: ['First Aid', 'Mountain Rescue'],
      bank_name: 'HDFC Bank',
      bank_acc_num_end: 1234,
      iban: 'IN123456789012345678',
      pricePerDay: 1500,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: '10002',
      fname: 'Aman',
      lname: 'Sidd',
      email: 'aman@gmail.com',
      phone: 9876543211,
      location: 'loc-mumbai-1',
      prof_title: 'Local Culture Guide',
      years_exp: 5,
      bio: 'Deeply passionate about Mumbai culture and history.',
      lang_spoken: ['English', 'Hindi', 'Marathi'],
      certifications: ['City Tour Specialist'],
      bank_name: 'SBI Bank',
      bank_acc_num_end: 5678,
      iban: 'IN123456789012345679',
      pricePerDay: 1200,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-delhi-1',
      fname: 'Delhi',
      lname: 'Guide 1',
      email: 'guide1.delhi@xploreo.com',
      phone: 9100000001,
      location: 'loc-delhi-1',
      prof_title: 'Historical Tour Guide',
      years_exp: 4,
      bio: 'Expert in Delhi history.',
      lang_spoken: ['English', 'Hindi'],
      certifications: ['Delhi History Expert'],
      bank_name: 'SBI Bank',
      bank_acc_num_end: 1111,
      iban: 'IN123456789011111111',
      pricePerDay: 1000,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-delhi-2',
      fname: 'Delhi',
      lname: 'Guide 2',
      email: 'guide2.delhi@xploreo.com',
      phone: 9100000002,
      location: 'loc-delhi-1',
      prof_title: 'Street Food Guide',
      years_exp: 3,
      bio: 'Passionate about Delhi food.',
      lang_spoken: ['English', 'Hindi'],
      certifications: ['Food Guide'],
      bank_name: 'HDFC Bank',
      bank_acc_num_end: 2222,
      iban: 'IN123456789022222222',
      pricePerDay: 800,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-jaipur-1',
      fname: 'Jaipur',
      lname: 'Guide 1',
      email: 'guide1.jaipur@xploreo.com',
      phone: 9100000003,
      location: 'loc-jaipur-1',
      prof_title: 'Royal Heritage Guide',
      years_exp: 6,
      bio: 'Specialist in Jaipur Forts and Palaces.',
      lang_spoken: ['English', 'Hindi', 'Rajasthani'],
      certifications: ['Heritage Specialist'],
      bank_name: 'ICICI Bank',
      bank_acc_num_end: 3333,
      iban: 'IN123456789033333333',
      pricePerDay: 1200,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-jaipur-2',
      fname: 'Jaipur',
      lname: 'Guide 2',
      email: 'guide2.jaipur@xploreo.com',
      phone: 9100000004,
      location: 'loc-jaipur-1',
      prof_title: 'Local Crafts Guide',
      years_exp: 2,
      bio: 'Loves Jaipur arts and crafts.',
      lang_spoken: ['English', 'Hindi'],
      certifications: ['Crafts Tour Guide'],
      bank_name: 'Axis Bank',
      bank_acc_num_end: 4444,
      iban: 'IN123456789044444444',
      pricePerDay: 900,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-goa-1',
      fname: 'Goa',
      lname: 'Guide 1',
      email: 'guide1.goa@xploreo.com',
      phone: 9100000005,
      location: 'loc-goa-beach-1',
      prof_title: 'Beach Expert',
      years_exp: 8,
      bio: 'Goa beaches are my home.',
      lang_spoken: ['English', 'Hindi', 'Konkani'],
      certifications: ['Water Sports Guide'],
      bank_name: 'SBI Bank',
      bank_acc_num_end: 5555,
      iban: 'IN123456789055555555',
      pricePerDay: 1500,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-goa-2',
      fname: 'Goa',
      lname: 'Guide 2',
      email: 'guide2.goa@xploreo.com',
      phone: 9100000006,
      location: 'loc-goa-beach-1',
      prof_title: 'Party & Culture Guide',
      years_exp: 4,
      bio: 'Knows the best spots in Goa.',
      lang_spoken: ['English', 'Konkani'],
      certifications: ['Nightlife Guide'],
      bank_name: 'HDFC Bank',
      bank_acc_num_end: 6666,
      iban: 'IN123456789066666666',
      pricePerDay: 1300,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-kerala-1',
      fname: 'Kerala',
      lname: 'Guide 1',
      email: 'guide1.kerala@xploreo.com',
      phone: 9100000007,
      location: 'loc-kerala-1',
      prof_title: 'Nature Guide',
      years_exp: 5,
      bio: 'Specialist in Kerala backwaters and nature.',
      lang_spoken: ['English', 'Malayalam'],
      certifications: ['Nature Guide'],
      bank_name: 'ICICI Bank',
      bank_acc_num_end: 7777,
      iban: 'IN123456789077777777',
      pricePerDay: 1100,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
    {
      userId: 'guide-kerala-2',
      fname: 'Kerala',
      lname: 'Guide 2',
      email: 'guide2.kerala@xploreo.com',
      phone: 9100000008,
      location: 'loc-kerala-1',
      prof_title: 'Ayurveda Tour Guide',
      years_exp: 3,
      bio: 'Knows all about Ayurveda retreats in Kerala.',
      lang_spoken: ['English', 'Hindi', 'Malayalam'],
      certifications: ['Wellness Guide'],
      bank_name: 'SBI Bank',
      bank_acc_num_end: 8888,
      iban: 'IN123456789088888888',
      pricePerDay: 1400,
      rating: 0,
      totalRatings: 0,
      avatar: undefined,
    },
  ];

  create(guide: Guide): Guide {
    this.guides.push(guide);
    return guide;
  }

  findAll(): Guide[] {
    return this.guides;
  }

  findById(userId: string): Guide | undefined {
    return this.guides.find((g) => g.userId === userId);
  }

  findByLocation(locationId: string): Guide[] {
    return this.guides.filter((g) => g.location === locationId);
  }

  update(userId: string, data: Partial<Guide>): Guide | undefined {
    const idx = this.guides.findIndex((g) => g.userId === userId);
    if (idx === -1) return undefined;
    this.guides[idx] = { ...this.guides[idx], ...data };
    return this.guides[idx];
  }

  delete(userId: string): boolean {
    const idx = this.guides.findIndex((g) => g.userId === userId);
    if (idx === -1) return false;
    this.guides.splice(idx, 1);
    return true;
  }
}
