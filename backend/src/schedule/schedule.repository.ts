import { Injectable } from '@nestjs/common';
import { CreateScheduleDto, ScheduleStatus } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleItem } from './entities/schedule.entity';

@Injectable()
export class ScheduleRepository {
  private schedule: ScheduleItem[] = [
    {
      id: 1,
      guideId: '10001',
      title: 'Kerala Backwaters Orientation',
      date: '2026-05-12',
      startTime: '09:00',
      endTime: '12:00',
      status: ScheduleStatus.BOOKED,
      location: 'Alleppey, Kerala',
      capacity: 6,
      notes: 'Houseboat pickup briefing.',
      createdAt: new Date(),
    },
    {
      id: 2,
      guideId: '10001',
      title: 'Blocked for personal travel',
      date: '2026-05-15',
      startTime: '10:00',
      endTime: '17:00',
      status: ScheduleStatus.BLOCKED,
      location: 'Mumbai',
      capacity: 1,
      notes: 'Unavailable for bookings.',
      createdAt: new Date(),
    },
  ];

  private nextId = 3;

  create(dto: CreateScheduleDto): ScheduleItem {
    const item: ScheduleItem = {
      id: this.nextId++,
      guideId: dto.guideId,
      title: dto.title,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: dto.status,
      location: dto.location,
      capacity: dto.capacity ?? 1,
      notes: dto.notes ?? '',
      createdAt: new Date(),
    };

    this.schedule.push(item);
    return item;
  }

  findAll(guideId?: string): ScheduleItem[] {
    const data = guideId
      ? this.schedule.filter((item) => String(item.guideId) === String(guideId))
      : [...this.schedule];

    return data.sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
  }

  findById(id: number): ScheduleItem | undefined {
    return this.schedule.find((entry) => entry.id === id);
  }

  update(id: number, dto: UpdateScheduleDto): ScheduleItem | undefined {
    const index = this.schedule.findIndex((entry) => entry.id === id);
    if (index === -1) return undefined;

    this.schedule[index] = {
      ...this.schedule[index],
      ...dto,
      id: this.schedule[index].id,
      createdAt: this.schedule[index].createdAt,
    };

    return this.schedule[index];
  }

  delete(id: number): boolean {
    const index = this.schedule.findIndex((entry) => entry.id === id);
    if (index === -1) return false;
    this.schedule.splice(index, 1);
    return true;
  }
}
