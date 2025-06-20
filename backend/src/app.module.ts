import { Module } from '@nestjs/common';
import { SchedulesModule } from './schedules/schedules.module';
import { StaffModule } from './staff/staff.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { DailyAssignmentsModule } from './daily-assignments/daily-assignments.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { ContractModule } from './contract/contract.module';
import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [SchedulesModule, StaffModule, AssignmentsModule, DailyAssignmentsModule, CsvImportModule, ContractModule, ResponsibilitiesModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}