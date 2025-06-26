import { Module } from '@nestjs/common';
import { PendingService } from './pending.service';
import { PendingController, AdminPendingController } from './pending.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PendingController, AdminPendingController],
  providers: [PendingService, PrismaService],
  exports: [PendingService],
})
export class PendingModule {}