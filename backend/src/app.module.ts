import { Module } from '@nestjs/common';
import { SchedulesModule } from './schedules/schedules.module';
import { StaffModule } from './staff/staff.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [SchedulesModule, StaffModule, AssignmentsModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}