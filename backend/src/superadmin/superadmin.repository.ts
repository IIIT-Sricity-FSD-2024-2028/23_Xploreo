import { Injectable } from '@nestjs/common';
import { Superadmin } from './entities/superadmin.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class SuperadminRepository {
  private admins: Superadmin[] = [
    {
      adminId: 'seed-superadmin-1',
      fname: 'Raj',
      lname: 'Sharma',
      email: 'raj@xploreo.com',
      phone_number: 9988776655,
    },
  ];

  create(data: Omit<Superadmin, 'adminId'>): Superadmin {
    const admin: Superadmin = { adminId: createId(), ...data };
    this.admins.push(admin);
    return admin;
  }

  findAll(): Superadmin[] {
    return this.admins;
  }

  findById(id: string): Superadmin | undefined {
    return this.admins.find((a) => a.adminId === id);
  }

  update(id: string, data: Partial<Superadmin>): Superadmin | undefined {
    const idx = this.admins.findIndex((a) => a.adminId === id);
    if (idx === -1) return undefined;
    this.admins[idx] = { ...this.admins[idx], ...data };
    return this.admins[idx];
  }

  delete(id: string): boolean {
    const idx = this.admins.findIndex((a) => a.adminId === id);
    if (idx === -1) return false;
    this.admins.splice(idx, 1);
    return true;
  }
}
