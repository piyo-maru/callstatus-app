import { Module } from '@nestjs/common';
import { SchedulesModule } from './schedules/schedules.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [SchedulesModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}