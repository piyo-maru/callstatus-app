// backend/src/schedules/schedules.module.ts
import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SchedulesGateway } from './schedules.gateway';
// PrismaServiceのimportは不要

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, SchedulesGateway], // ★★★ PrismaServiceを削除 ★★★
})
export class SchedulesModule {}