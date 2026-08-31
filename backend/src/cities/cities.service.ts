import { Injectable, NotFoundException } from '@nestjs/common';
import { CitiesRepository } from './cities.repository';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly citiesRepository: CitiesRepository) {}

  create(dto: CreateCityDto) {
    return this.citiesRepository.create(dto);
  }
  findAll() {
    return this.citiesRepository.findAll();
  }
  findOne(id: string) {
    const c = this.citiesRepository.findById(id);
    if (!c) throw new NotFoundException(`City ${id} not found`);
    return c;
  }
  update(id: string, dto: UpdateCityDto) {
    const updated = this.citiesRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`City ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.citiesRepository.delete(id))
      throw new NotFoundException(`City ${id} not found`);
    return { message: `City ${id} deleted` };
  }
}
