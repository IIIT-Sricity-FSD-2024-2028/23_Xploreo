import { Injectable } from '@nestjs/common';
import { Techadmin } from './entities/techadmin.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class TechadminRepository {
  private admins: Techadmin[] = [
    {
      adminId: 'seed-tech-1',
      fname: 'Dev',
      lname: 'Mehta',
      email: 'dev@xploreo.com',
      phone_number: 9876543210,
      location: 'Bangalore',
    },
  ];

  create(data: Omit<Techadmin, 'adminId'>): Techadmin {
    const admin: Techadmin = { adminId: createId(), ...data };
    this.admins.push(admin);
    return admin;
  }

  findAll(): Techadmin[] {
    return this.admins;
  }

  findById(id: string): Techadmin | undefined {
    return this.admins.find((a) => a.adminId === id);
  }

  update(id: string, data: Partial<Techadmin>): Techadmin | undefined {
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
