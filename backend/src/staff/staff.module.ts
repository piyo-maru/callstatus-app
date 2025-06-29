import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { PrismaModule } from '../prisma.module';
import { ChunkImportService } from '../import-progress/chunk-import.service';
// import { AuthModule } from '../auth/auth.module'; // 一時的に無効化

@Module({
  imports: [PrismaModule], // AuthModule 一時的に無効化
  controllers: [StaffController],
  providers: [StaffService, ChunkImportService],
  exports: [StaffService]
})
export class StaffModule {}