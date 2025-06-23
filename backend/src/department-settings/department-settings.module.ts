import { Module } from '@nestjs/common';
import { DepartmentSettingsController } from './department-settings.controller';
import { DepartmentSettingsService } from './department-settings.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DepartmentSettingsController],
  providers: [DepartmentSettingsService],
  exports: [DepartmentSettingsService]
})
export class DepartmentSettingsModule {}