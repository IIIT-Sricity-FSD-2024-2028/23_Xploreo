import { Injectable } from '@nestjs/common';
import { Auth, Role } from './entities/auth.entity';
import { createId } from '../common/utils/id';
import { stripUndefined } from '../common/utils/strip-undefined';
import { loadSeedData } from '../common/utils/seed-loader';

@Injectable()
export class AuthRepository {
  private users: Auth[] = loadSeedData<Auth>('users.json', [
    {
      userId: 'T001',
      username: 'T001',
      password: 'TRA@123',
      role: Role.TRAVELLER,
      name: 'Anjali Sharma',
      email: 'sreekarkothapalli@gmail.com',
      phone: '9123456780',
      status: 'active',
    },
    {
      userId: 'G001',
      username: 'G001',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Sreekar Sharma',
      email: 'sreekar.k24@iiits.in',
      phone: '9876543210',
      status: 'active',
      region: 'Kerala',
      location: 'Kerala',
    },
    {
      userId: 'G002',
      username: 'G002',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Arjun Nair',
      email: 'nvkprasadkothapalli@gmail.com',
      phone: '9822334455',
      status: 'active',
      region: 'Kerala',
      location: 'Kerala',
    },
    {
      userId: 'G003',
      username: 'G003',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Priya Rathore',
      email: 'a.kiyotaka0000@gmail.com',
      phone: '9811223344',
      status: 'active',
      region: 'Jaipur',
      location: 'Jaipur',
    },
    {
      userId: 'SA001',
      username: 'SA001',
      password: 'SA@123',
      role: Role.SUPERADMIN,
      name: 'Raj Sharma',
      email: 'samagnya.edu@gmail.com',
      phone: '9988776655',
      status: 'active',
    },
    {
      userId: 'TA001',
      username: 'TA001',
      password: 'TA@123',
      role: Role.TECHADMIN,
      name: 'Dev Mehta',
      email: 'xplor455@gmail.com',
      phone: '9876543210',
      status: 'active',
    },
    {
      userId: 'NTA001',
      username: 'NTA001',
      password: 'NTA@123',
      role: Role.NONTECHADMIN,
      name: 'Neha Mehra',
      email: 'xplor544@gmail.com',
      phone: '9000000003',
      status: 'active',
      region: 'Jaipur',
      location: 'Jaipur',
    },
    {
      userId: 'NTA002',
      username: 'NTA002',
      password: 'NTA@123',
      role: Role.NONTECHADMIN,
      name: 'Rohan D Souza',
      email: 'nta.goa@xploreo.com',
      phone: '9000000004',
      status: 'active',
      region: 'Goa',
      location: 'Goa',
    },
    {
      userId: 'NTA003',
      username: 'NTA003',
      password: 'NTA@123',
      role: Role.NONTECHADMIN,
      name: 'Sunita Verma',
      email: 'nta.delhi@xploreo.com',
      phone: '9000000005',
      status: 'active',
      region: 'Delhi',
      location: 'Delhi',
    },
    {
      userId: 'NTA004',
      username: 'NTA004',
      password: 'NTA@123',
      role: Role.NONTECHADMIN,
      name: 'Aakash Kulkarni',
      email: 'nta.mumbai@xploreo.com',
      phone: '9000000006',
      status: 'active',
      region: 'Mumbai',
      location: 'Mumbai',
    },
    {
      userId: 'NTA005',
      username: 'NTA005',
      password: 'NTA@123',
      role: Role.NONTECHADMIN,
      name: 'Ananya Nair',
      email: 'nta.kerala@xploreo.com',
      phone: '9000000007',
      status: 'active',
      region: 'Kerala',
      location: 'Kerala',
    },
    {
      userId: 'HP001',
      username: 'HP001',
      password: 'HP@123',
      role: Role.HOTEL,
      name: 'Xploreo Hotel Partner',
      email: 'hotel.partner@xploreo.com',
      phone: '9000000001',
      status: 'active',
      region: 'Jaipur',
    },
    {
      userId: 'XP001',
      username: 'XP001',
      password: 'XP@123',
      role: Role.EXPERIENCE,
      name: 'Xploreo Experience Partner',
      email: 'experience.partner@xploreo.com',
      phone: '9000000002',
      status: 'active',
      region: 'Kerala',
    },
    {
      userId: 'HP002',
      username: 'HP002',
      password: 'HP@123',
      role: Role.HOTEL,
      name: 'Goa Hotel Partner',
      email: 'hotel.goa@xploreo.com',
      phone: '9000000011',
      status: 'active',
      region: 'Goa',
    },
    {
      userId: 'HP003',
      username: 'HP003',
      password: 'HP@123',
      role: Role.HOTEL,
      name: 'Delhi Hotel Partner',
      email: 'hotel.delhi@xploreo.com',
      phone: '9000000012',
      status: 'active',
      region: 'Delhi',
    },
    {
      userId: 'HP004',
      username: 'HP004',
      password: 'HP@123',
      role: Role.HOTEL,
      name: 'Mumbai Hotel Partner',
      email: 'hotel.mumbai@xploreo.com',
      phone: '9000000013',
      status: 'active',
      region: 'Mumbai',
    },
    {
      userId: 'XP002',
      username: 'XP002',
      password: 'XP@123',
      role: Role.EXPERIENCE,
      name: 'Goa Experience Partner',
      email: 'experience.goa@xploreo.com',
      phone: '9000000021',
      status: 'active',
      region: 'Goa',
    },
    {
      userId: 'XP003',
      username: 'XP003',
      password: 'XP@123',
      role: Role.EXPERIENCE,
      name: 'Delhi Experience Partner',
      email: 'experience.delhi@xploreo.com',
      phone: '9000000022',
      status: 'active',
      region: 'Delhi',
    },
    {
      userId: 'XP004',
      username: 'XP004',
      password: 'XP@123',
      role: Role.EXPERIENCE,
      name: 'Mumbai Experience Partner',
      email: 'experience.mumbai@xploreo.com',
      phone: '9000000023',
      status: 'active',
      region: 'Mumbai',
    },
    {
      userId: 'G004',
      username: 'G004',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Marcus Fernandes',
      email: 'marcus.fernandes@example.com',
      phone: '9822000004',
      status: 'active',
      region: 'Goa',
      location: 'Goa',
    },
    {
      userId: 'G005',
      username: 'G005',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Aarav Singh',
      email: 'aarav.singh@example.com',
      phone: '9822000005',
      status: 'active',
      region: 'Delhi',
      location: 'Delhi',
    },
    {
      userId: 'G006',
      username: 'G006',
      password: 'GUD@123',
      role: Role.GUIDE,
      name: 'Kabir Deshmukh',
      email: 'kabir.deshmukh@example.com',
      phone: '9822000006',
      status: 'active',
      region: 'Mumbai',
      location: 'Mumbai',
    },
    {
      userId: 'HP005',
      username: 'HP005',
      password: 'HP@123',
      role: Role.HOTEL,
      name: 'Kerala Hotel Partner',
      email: 'hotel.kerala@xploreo.com',
      phone: '9000000014',
      status: 'active',
      region: 'Kerala',
    },
    {
      userId: 'XP005',
      username: 'XP005',
      password: 'XP@123',
      role: Role.EXPERIENCE,
      name: 'Jaipur Experience Partner',
      email: 'experience.jaipur@xploreo.com',
      phone: '9000000024',
      status: 'active',
      region: 'Jaipur',
    },
  ]);

  create(data: Partial<Auth>): Auth {
    const user: Auth = {
      userId: data.userId || createId(),
      username: data.username!,
      password: data.password!,
      role: data.role!,
      name: data.name!,
      email: data.email!,
      phone: data.phone!,
      location: data.location,
      status: data.status ?? 'active',
      region: data.region,
    };
    this.users.push(user);
    return user;
  }

  findAll(): Auth[] {
    return [...this.users].sort((a, b) => a.name.localeCompare(b.name));
  }

  findById(userId: string): Auth | undefined {
    return this.users.find((u) => u.userId === userId);
  }

  findRegionForUser(userId: string): string | undefined {
    const user = this.findById(userId);
    return user?.region || user?.location;
  }

  findByUsername(username: string): Auth | undefined {
    if (!username) return undefined;
    const q = username.trim().toLowerCase();
    return this.users.find(
      (u) =>
        u.username.toLowerCase() === q ||
        (u.role === Role.TRAVELLER && q === 'traveller') ||
        (u.role === Role.GUIDE && q === 'guide') ||
        (u.role === Role.HOTEL && (q === 'hotel' || q === 'hotel_partner')) ||
        (u.role === Role.EXPERIENCE && (q === 'experience' || q === 'experience_partner')) ||
        (u.role === Role.SUPERADMIN && q === 'superadmin') ||
        (u.role === Role.TECHADMIN && q === 'techadmin') ||
        (u.role === Role.NONTECHADMIN && (q === 'nontechadmin' || q === 'nontech_admin')),
    );
  }

  findByEmail(email: string): Auth | undefined {
    if (!email) return undefined;
    const q = email.trim().toLowerCase();
    return this.users.find(
      (u) => u.email.toLowerCase() === q,
    );
  }

  update(userId: string, data: Partial<Auth>): Auth | undefined {
    const idx = this.users.findIndex((u) => u.userId === userId);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...stripUndefined(data) };
    return this.users[idx];
  }

  delete(userId: string): boolean {
    const idx = this.users.findIndex((u) => u.userId === userId);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    return true;
  }
}
