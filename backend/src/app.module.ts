import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SchedulesModule } from './schedules/schedules.module';
import { StaffModule } from './staff/staff.module';
import { PrismaModule } from './prisma.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { DailyAssignmentsModule } from './daily-assignments/daily-assignments.module';
import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { DepartmentSettingsModule } from './department-settings/department-settings.module';
// 一時的に無効化（コンパイルエラー回避）
// import { AssignmentsModule } from './assignments/assignments.module';
// import { ContractModule } from './contract/contract.module';
// import { AuthModule } from './auth/auth.module';
// import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    SchedulesModule,
    StaffModule,
    CsvImportModule,
    DailyAssignmentsModule,
    ResponsibilitiesModule,
    DepartmentSettingsModule,
    // 他のすべてのモジュールを一時的に無効化（コンパイルエラー回避）
    // AuthModule, 
    // AuditModule, 
    // AssignmentsModule, 
    // ContractModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}