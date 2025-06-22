import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesGateway } from './schedules.gateway';
import { PrismaModule } from '../prisma.module';
import { LayerManagerModule } from '../layer-manager/layer-manager.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LayerManagerModule, AuthModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SchedulesGateway],
})
export class SchedulesModule {}