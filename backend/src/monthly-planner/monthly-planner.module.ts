import { Module } from '@nestjs/common';
import { MonthlyPlannerController } from './monthly-planner.controller';
import { MonthlyPlannerService } from './monthly-planner.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MonthlyPlannerController],
  providers: [MonthlyPlannerService, PrismaService],
})
export class MonthlyPlannerModule {}