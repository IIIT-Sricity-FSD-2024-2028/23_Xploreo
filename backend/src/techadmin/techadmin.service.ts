import { Injectable, NotFoundException } from '@nestjs/common';
import { TechadminRepository } from './techadmin.repository';
import { CreateTechadminDto } from './dto/create-techadmin.dto';
import { UpdateTechadminDto } from './dto/update-techadmin.dto';

@Injectable()
export class TechadminService {
  constructor(private readonly repo: TechadminRepository) {}

  create(dto: CreateTechadminDto) {
    return this.repo.create(dto);
  }
  findAll() {
    return this.repo.findAll();
  }
  findOne(id: string) {
    const a = this.repo.findById(id);
    if (!a) throw new NotFoundException(`Techadmin ${id} not found`);
    return a;
  }
  update(id: string, dto: UpdateTechadminDto) {
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundException(`Techadmin ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.repo.delete(id))
      throw new NotFoundException(`Techadmin ${id} not found`);
    return { message: `Techadmin ${id} deleted` };
  }
}
