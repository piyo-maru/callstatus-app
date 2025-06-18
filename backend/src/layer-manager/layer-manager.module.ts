import { Module } from '@nestjs/common';
import { LayerManagerService } from './layer-manager.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LayerManagerService],
  exports: [LayerManagerService],
})
export class LayerManagerModule {}