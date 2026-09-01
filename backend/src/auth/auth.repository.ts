import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Auth, Role } from './entities/auth.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class AuthRepository implements OnModuleInit {
  private users: Auth[] = [
    {
      userId: '20001',
      username: 'anjali_s',
      password: 'anjali@123',
      role: 'traveller' as Auth['role'],
      name: 'Anjali Sharma',
      email: 'anjali@xploreo.com',
      phone: '9123456780',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: '10001',
      username: 'sreekar_k',
      password: 'sreekar',
      role: 'guide' as Auth['role'],
      name: 'Sreekar',
      email: 'sreekar@gmail.com',
      phone: '9876543210',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: '10002',
      username: 'sidd',
      password: 'sidd@123',
      role: 'guide' as Auth['role'],
      name: 'Aman Sidd',
      email: 'aman@gmail.com',
      phone: '9876543211',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: '00001',
      username: 'rahul_v',
      password: 'rahul@123',
      role: 'superadmin' as Auth['role'],
      name: 'Rahul Varma',
      email: 'rahul@xploreo.com',
      phone: '9876543210',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: 'TA0001',
      username: 'techadmin',
      password: 'rahul@123',
      role: 'techadmin' as Auth['role'],
      name: 'Rahul Varma',
      email: 'rahul@xploreo.com',
      phone: '9876543210',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: 'NTA0001',
      username: 'nontech_admin',
      password: 'admin@123',
      role: Role.NONTECHADMIN,
      name: 'Neha Mehra',
      email: 'nontech.admin@xploreo.com',
      phone: '9000000003',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: 'NTA-goa',
      username: 'nontech_admin_goa',
      password: 'admin@123',
      role: Role.NONTECHADMIN,
      name: 'Goa Regional Admin',
      email: 'nta.goa@xploreo.com',
      phone: '9000000004',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'NTA-jaipur',
      username: 'nontech_admin_jaipur',
      password: 'admin@123',
      role: Role.NONTECHADMIN,
      name: 'Jaipur Regional Admin',
      email: 'nta.jaipur@xploreo.com',
      phone: '9000000005',
      location: 'Jaipur',
      status: 'active' as const,
    },
    {
      userId: 'NTA-delhi',
      username: 'nontech_admin_delhi',
      password: 'admin@123',
      role: Role.NONTECHADMIN,
      name: 'Delhi Regional Admin',
      email: 'nta.delhi@xploreo.com',
      phone: '9000000006',
      location: 'Delhi',
      status: 'active' as const,
    },
    {
      userId: 'NTA-kerala',
      username: 'nontech_admin_kerala',
      password: 'admin@123',
      role: Role.NONTECHADMIN,
      name: 'Kerala Regional Admin',
      email: 'nta.kerala@xploreo.com',
      phone: '9000000007',
      location: 'Kerala',
      status: 'active' as const,
    },
    {
      userId: 'partner-1',
      username: 'hotel_partner',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Xploreo Hotel Partner',
      email: 'hotel.partner@xploreo.com',
      phone: '9000000001',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'experience-partner-1',
      username: 'experience_partner',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Xploreo Experience Partner',
      email: 'experience.partner@xploreo.com',
      phone: '9000000002',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'hotel-partner-goa',
      username: 'hotel_partner_goa',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Goa Hotel Partner',
      email: 'hotel.goa@xploreo.com',
      phone: '900000013',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'exp-partner-goa',
      username: 'exp_partner_goa',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Goa Experience Partner',
      email: 'experience.goa@xploreo.com',
      phone: '900000023',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'hotel-partner-jaipur',
      username: 'hotel_partner_jaipur',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Jaipur Hotel Partner',
      email: 'hotel.jaipur@xploreo.com',
      phone: '900000016',
      location: 'Jaipur',
      status: 'active' as const,
    },
    {
      userId: 'exp-partner-jaipur',
      username: 'exp_partner_jaipur',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Jaipur Experience Partner',
      email: 'experience.jaipur@xploreo.com',
      phone: '900000026',
      location: 'Jaipur',
      status: 'active' as const,
    },
    {
      userId: 'hotel-partner-mumbai',
      username: 'hotel_partner_mumbai',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Mumbai Hotel Partner',
      email: 'hotel.mumbai@xploreo.com',
      phone: '900000016',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: 'exp-partner-mumbai',
      username: 'exp_partner_mumbai',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Mumbai Experience Partner',
      email: 'experience.mumbai@xploreo.com',
      phone: '900000026',
      location: 'Mumbai',
      status: 'active' as const,
    },
    {
      userId: 'hotel-partner-delhi',
      username: 'hotel_partner_delhi',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Delhi Hotel Partner',
      email: 'hotel.delhi@xploreo.com',
      phone: '900000015',
      location: 'Delhi',
      status: 'active' as const,
    },
    {
      userId: 'exp-partner-delhi',
      username: 'exp_partner_delhi',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Delhi Experience Partner',
      email: 'experience.delhi@xploreo.com',
      phone: '900000025',
      location: 'Delhi',
      status: 'active' as const,
    },
    {
      userId: 'hotel-partner-kerala',
      username: 'hotel_partner_kerala',
      password: 'partner@123',
      role: Role.HOTEL,
      name: 'Kerala Hotel Partner',
      email: 'hotel.kerala@xploreo.com',
      phone: '900000016',
      location: 'Kerala',
      status: 'active' as const,
    },
    {
      userId: 'exp-partner-kerala',
      username: 'exp_partner_kerala',
      password: 'experience@123',
      role: Role.EXPERIENCE,
      name: 'Kerala Experience Partner',
      email: 'experience.kerala@xploreo.com',
      phone: '900000026',
      location: 'Kerala',
      status: 'active' as const,
    },
    {
      userId: 'guide-delhi-1',
      username: 'guide_delhi_1',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Delhi Guide 1',
      email: 'guide1.delhi@xploreo.com',
      phone: '9100000001',
      location: 'Delhi',
      status: 'active' as const,
    },
    {
      userId: 'guide-delhi-2',
      username: 'guide_delhi_2',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Delhi Guide 2',
      email: 'guide2.delhi@xploreo.com',
      phone: '9100000002',
      location: 'Delhi',
      status: 'active' as const,
    },
    {
      userId: 'guide-jaipur-1',
      username: 'guide_jaipur_1',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Jaipur Guide 1',
      email: 'guide1.jaipur@xploreo.com',
      phone: '9100000003',
      location: 'Jaipur',
      status: 'active' as const,
    },
    {
      userId: 'guide-jaipur-2',
      username: 'guide_jaipur_2',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Jaipur Guide 2',
      email: 'guide2.jaipur@xploreo.com',
      phone: '9100000004',
      location: 'Jaipur',
      status: 'active' as const,
    },
    {
      userId: 'guide-goa-1',
      username: 'guide_goa_1',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Goa Guide 1',
      email: 'guide1.goa@xploreo.com',
      phone: '9100000005',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'guide-goa-2',
      username: 'guide_goa_2',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Goa Guide 2',
      email: 'guide2.goa@xploreo.com',
      phone: '9100000006',
      location: 'Goa',
      status: 'active' as const,
    },
    {
      userId: 'guide-kerala-1',
      username: 'guide_kerala_1',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Kerala Guide 1',
      email: 'guide1.kerala@xploreo.com',
      phone: '9100000007',
      location: 'Kerala',
      status: 'active' as const,
    },
    {
      userId: 'guide-kerala-2',
      username: 'guide_kerala_2',
      password: 'guide@123',
      role: 'guide' as Auth['role'],
      name: 'Kerala Guide 2',
      email: 'guide2.kerala@xploreo.com',
      phone: '9100000008',
      location: 'Kerala',
      status: 'active' as const,
    },
  ];
  private readonly saltRounds = process.env.NODE_ENV === 'test' ? 1 : 10;

  async onModuleInit() {
    await this.hashPasswords();
  }

  private async hashPasswords() {
    for (const user of this.users) {
      if (!user.password.startsWith('$2')) {
        user.password = await bcrypt.hash(user.password, this.saltRounds);
      }
    }
  }

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
      businessName: data.businessName,
      taxId: data.taxId,
      bankAccount: data.bankAccount,
    };
    this.users.push(user);
    return user;
  }

  findAll(): Auth[] {
    return this.users;
  }

  findById(userId: string): Auth | undefined {
    return this.users.find((u) => u.userId === userId);
  }

  findByUsername(username: string): Auth | undefined {
    return this.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );
  }

  findByEmail(email: string): Auth | undefined {
    return this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  update(userId: string, data: Partial<Auth>): Auth | undefined {
    const idx = this.users.findIndex((u) => u.userId === userId);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...data };
    return this.users[idx];
  }

  delete(userId: string): boolean {
    const idx = this.users.findIndex((u) => u.userId === userId);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    return true;
  }
}
