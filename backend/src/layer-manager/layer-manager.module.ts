import { Module } from '@nestjs/common';
import { LayerManagerService } from './layer-manager.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [LayerManagerService, PrismaService],
  exports: [LayerManagerService],
})
export class LayerManagerModule {}