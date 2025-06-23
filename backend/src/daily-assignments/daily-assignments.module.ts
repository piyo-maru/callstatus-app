import { Module } from '@nestjs/common';
import { DailyAssignmentsController } from './daily-assignments.controller';
import { DailyAssignmentsService } from './daily-assignments.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyAssignmentsController],
  providers: [DailyAssignmentsService],
  exports: [DailyAssignmentsService],
})
export class DailyAssignmentsModule {}