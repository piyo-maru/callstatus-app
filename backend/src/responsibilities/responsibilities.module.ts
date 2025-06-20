import { Module } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';
import { ResponsibilitiesController } from './responsibilities.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsibilitiesController],
  providers: [ResponsibilitiesService],
  exports: [ResponsibilitiesService],
})
export class ResponsibilitiesModule {}