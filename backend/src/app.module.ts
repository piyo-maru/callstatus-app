import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { SchedulesModule } from './schedules/schedules.module';
import { StaffModule } from './staff/staff.module';
import { PrismaModule } from './prisma.module';
// CsvImportModule削除（ポートフォリオ版）
import { DailyAssignmentsModule } from './daily-assignments/daily-assignments.module';
import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { DepartmentSettingsModule } from './department-settings/department-settings.module';
import { DisplaySettingsModule } from './display-settings/display-settings.module';
import { GlobalPresetSettingsModule } from './global-preset-settings/global-preset-settings.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { PendingModule } from './pending/pending.module';
import { ContractsModule } from './contracts/contracts.module';
import { PresetSettingsModule } from './preset-settings/preset-settings.module';
// AuthModule削除（ポートフォリオ版）
import { MonthlyPlannerModule } from './monthly-planner/monthly-planner.module';
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
    // CsvImportModule削除（ポートフォリオ版）
    DailyAssignmentsModule,
    ResponsibilitiesModule,
    DepartmentSettingsModule,
    DisplaySettingsModule,
    GlobalPresetSettingsModule,
    SnapshotsModule,
    PendingModule,
    ContractsModule,
    PresetSettingsModule,
    // AuthModule削除（ポートフォリオ版）
    MonthlyPlannerModule,
    // AuthModule有効化完了（Phase 2: 段階的導入）
    // AuditModule, 
    // AssignmentsModule, 
    // ContractModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}