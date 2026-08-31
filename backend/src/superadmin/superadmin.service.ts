import { Injectable, NotFoundException } from '@nestjs/common';
import { SuperadminRepository } from './superadmin.repository';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateSuperadminDto } from './dto/update-superadmin.dto';

@Injectable()
export class SuperadminService {
  constructor(private readonly repo: SuperadminRepository) {}

  create(dto: CreateSuperadminDto) {
    return this.repo.create(dto);
  }
  findAll() {
    return this.repo.findAll();
  }
  findOne(id: string) {
    const a = this.repo.findById(id);
    if (!a) throw new NotFoundException(`Superadmin ${id} not found`);
    return a;
  }
  update(id: string, dto: UpdateSuperadminDto) {
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundException(`Superadmin ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.repo.delete(id))
      throw new NotFoundException(`Superadmin ${id} not found`);
    return { message: `Superadmin ${id} deleted` };
  }
}
