import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { PrismaModule } from '../prisma.module';
import { ImportProgressModule } from '../import-progress/import-progress.module';
// import { AuthModule } from '../auth/auth.module'; // 一時的に無効化

@Module({
  imports: [PrismaModule, ImportProgressModule], // AuthModule 一時的に無効化
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService]
})
export class StaffModule {}