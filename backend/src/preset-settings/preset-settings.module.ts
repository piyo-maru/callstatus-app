import { Module } from '@nestjs/common';
import { PresetSettingsController } from './preset-settings.controller';
import { PresetSettingsService } from './preset-settings.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PresetSettingsController],
  providers: [PresetSettingsService],
  exports: [PresetSettingsService]
})
export class PresetSettingsModule {}