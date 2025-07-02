import { Module } from '@nestjs/common';
import { GlobalPresetSettingsController } from './global-preset-settings.controller';
import { GlobalPresetSettingsService } from './global-preset-settings.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalPresetSettingsController],
  providers: [GlobalPresetSettingsService],
  exports: [GlobalPresetSettingsService]
})
export class GlobalPresetSettingsModule {}