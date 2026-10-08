import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationRepository } from './location.repository';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  create(dto: CreateLocationDto) {
    return this.locationRepository.create(dto);
  }
  findAll() {
    return this.locationRepository.findAll();
  }
  findOne(id: string) {
    const l = this.locationRepository.findById(id);
    if (!l) throw new NotFoundException(`Location ${id} not found`);
    return l;
  }
  findByCity(cityId: string) {
    return this.locationRepository.findByCity(cityId);
  }
  update(id: string, dto: UpdateLocationDto) {
    const updated = this.locationRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Location ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.locationRepository.delete(id))
      throw new NotFoundException(`Location ${id} not found`);
    return { message: `Location ${id} deleted` };
  }
}
