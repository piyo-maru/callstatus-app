import { Module } from '@nestjs/common';
// import { SchedulesModule } from './schedules/schedules.module';
// import { StaffModule } from './staff/staff.module';
// import { AssignmentsModule } from './assignments/assignments.module';
// import { DailyAssignmentsModule } from './daily-assignments/daily-assignments.module';
// import { CsvImportModule } from './csv-import/csv-import.module';
// import { ContractModule } from './contract/contract.module';
// import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { AuthModule } from './auth/auth.module';
// import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // AuditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}