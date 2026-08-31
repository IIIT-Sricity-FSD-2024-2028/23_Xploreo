import { Injectable, NotFoundException } from '@nestjs/common';
import { NontechadminRepository } from './nontechadmin.repository';
import { CreateNontechadminDto } from './dto/create-nontechadmin.dto';
import { UpdateNontechadminDto } from './dto/update-nontechadmin.dto';

@Injectable()
export class NontechadminService {
  constructor(private readonly repo: NontechadminRepository) {}

  create(dto: CreateNontechadminDto) {
    return this.repo.create(dto);
  }
  findAll() {
    return this.repo.findAll();
  }
  findOne(id: string) {
    const a = this.repo.findById(id);
    if (!a) throw new NotFoundException(`Nontechadmin ${id} not found`);
    return a;
  }
  update(id: string, dto: UpdateNontechadminDto) {
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundException(`Nontechadmin ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.repo.delete(id))
      throw new NotFoundException(`Nontechadmin ${id} not found`);
    return { message: `Nontechadmin ${id} deleted` };
  }
}
