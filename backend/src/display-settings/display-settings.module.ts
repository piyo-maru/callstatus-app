import { Module } from '@nestjs/common';
import { DisplaySettingsController } from './display-settings.controller';
import { DisplaySettingsService } from './display-settings.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DisplaySettingsController],
  providers: [DisplaySettingsService],
  exports: [DisplaySettingsService]
})
export class DisplaySettingsModule {}