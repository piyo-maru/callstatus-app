import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { SchedulesModule } from './schedules/schedules.module';
import { StaffModule } from './staff/staff.module';
import { PrismaModule } from './prisma.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { DailyAssignmentsModule } from './daily-assignments/daily-assignments.module';
import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { DepartmentSettingsModule } from './department-settings/department-settings.module';
import { DisplaySettingsModule } from './display-settings/display-settings.module';
import { GlobalPresetSettingsModule } from './global-preset-settings/global-preset-settings.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { PendingModule } from './pending/pending.module';
import { ContractsModule } from './contracts/contracts.module';
import { PresetSettingsModule } from './preset-settings/preset-settings.module';
import { AuthModule } from './auth/auth.module';
import { MonthlyPlannerModule } from './monthly-planner/monthly-planner.module';
import { BackupModule } from './backup/backup.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
// AuthModule有効化（Phase 2: 段階的導入）
// import { AssignmentsModule } from './assignments/assignments.module';
// import { ContractModule } from './contract/contract.module';
// import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    SchedulesModule,
    StaffModule,
    CsvImportModule,
    DailyAssignmentsModule,
    ResponsibilitiesModule,
    DepartmentSettingsModule,
    DisplaySettingsModule,
    GlobalPresetSettingsModule,
    SnapshotsModule,
    PendingModule,
    ContractsModule,
    PresetSettingsModule,
    AuthModule,
    MonthlyPlannerModule,
    BackupModule,
    MaintenanceModule,
    // AuthModule有効化完了（Phase 2: 段階的導入）
    // AuditModule, 
    // AssignmentsModule, 
    // ContractModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}