import { Injectable } from '@nestjs/common';
import { Location } from './entities/location.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class LocationRepository {
  private locations: Location[] = [
    {
      locationId: 'loc-mumbai-1',
      locationName: 'Juhu Beach',
      cityId: 'city-mumbai-1',
    },
    {
      locationId: 'loc-delhi-1',
      locationName: 'India Gate',
      cityId: 'city-delhi-1',
    },
    {
      locationId: 'loc-jaipur-1',
      locationName: 'Hawa Mahal',
      cityId: 'city-jaipur-1',
    },
    {
      locationId: 'loc-goa-beach-1',
      locationName: 'Calangute Beach',
      cityId: 'city-goa-1',
    },
    {
      locationId: 'loc-kerala-1',
      locationName: 'Munnar',
      cityId: 'city-kerala-1',
    },
  ];

  create(data: Omit<Location, 'locationId'>): Location {
    const loc: Location = { locationId: createId(), ...data };
    this.locations.push(loc);
    return loc;
  }

  findAll(): Location[] {
    return this.locations;
  }

  findById(id: string): Location | undefined {
    return this.locations.find((l) => l.locationId === id);
  }

  findByCity(cityId: string): Location[] {
    return this.locations.filter((l) => l.cityId === cityId);
  }

  update(id: string, data: Partial<Location>): Location | undefined {
    const idx = this.locations.findIndex((l) => l.locationId === id);
    if (idx === -1) return undefined;
    this.locations[idx] = { ...this.locations[idx], ...data };
    return this.locations[idx];
  }

  delete(id: string): boolean {
    const idx = this.locations.findIndex((l) => l.locationId === id);
    if (idx === -1) return false;
    this.locations.splice(idx, 1);
    return true;
  }
}
