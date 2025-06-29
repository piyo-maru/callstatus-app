import { Module } from '@nestjs/common';
import { ImportProgressGateway } from './import-progress.gateway';
import { ChunkImportService } from './chunk-import.service';

@Module({
  providers: [ImportProgressGateway, ChunkImportService],
  exports: [ImportProgressGateway, ChunkImportService],
})
export class ImportProgressModule {}