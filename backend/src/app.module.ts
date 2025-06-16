// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { SchedulesModule } from './schedules/schedules.module';
import { PrismaModule } from './prisma.module'; // ★★★ 修正点 ★★★

@Module({
  imports: [PrismaModule, SchedulesModule], // ★★★ 修正点 ★★★
})
export class AppModule {}
