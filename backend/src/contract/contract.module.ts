import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ContractController],
  providers: [ContractService, PrismaService],
  exports: [ContractService]
})
export class ContractModule {}