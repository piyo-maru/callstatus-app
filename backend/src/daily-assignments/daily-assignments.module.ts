import { Module } from '@nestjs/common';
import { DailyAssignmentsService } from './daily-assignments.service';
import { DailyAssignmentsController } from './daily-assignments.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyAssignmentsController],
  providers: [DailyAssignmentsService],
  exports: [DailyAssignmentsService],
})
export class DailyAssignmentsModule {}