import { ScheduleStatus } from '../dto/create-schedule.dto';

export class ScheduleItem {
  id!: number;
  guideId!: string;
  title!: string;
  date!: string;
  startTime!: string;
  endTime!: string;
  status!: ScheduleStatus;
  location!: string;
  capacity!: number;
  notes!: string;
  createdAt!: Date;
}
