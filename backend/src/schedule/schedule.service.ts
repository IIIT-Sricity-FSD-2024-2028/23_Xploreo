import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleRepository } from './schedule.repository';

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  create(dto: CreateScheduleDto) {
    return this.scheduleRepository.create(dto);
  }

  findAll(guideId?: string) {
    return this.scheduleRepository.findAll(guideId);
  }

  findOne(id: number) {
    const item = this.scheduleRepository.findById(id);
    if (!item) throw new NotFoundException(`Schedule item ${id} not found`);
    return item;
  }

  update(id: number, dto: UpdateScheduleDto) {
    const updated = this.scheduleRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Schedule item ${id} not found`);
    return updated;
  }

  remove(id: number) {
    const deleted = this.scheduleRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Schedule item ${id} not found`);
    return { message: `Schedule item ${id} deleted` };
  }
}
