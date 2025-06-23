import { Controller, Post, Body, Get, Delete, Query } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';

interface CsvScheduleData {
  empNo: string;
  date: string;
  name?: string;
  status: string;
  time: string;
  memo?: string;
  assignmentType?: string;
  customLabel?: string;
}

@Controller('csv-import')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  @Post('schedules')
  async importSchedules(@Body() data: { schedules: CsvScheduleData[] }) {
    console.log('CSV Import request received:', data.schedules.length, 'schedules');
    
    try {
      const result = await this.csvImportService.importSchedules(data.schedules);
      return result;
    } catch (error) {
      console.error('CSV Import error:', error);
      throw error;
    }
  }

  @Get('history')
  async getImportHistory() {
    return this.csvImportService.getImportHistory();
  }

  @Delete('rollback')
  async rollbackImport(@Query('batchId') batchId: string) {
    if (!batchId) {
      throw new Error('batchId is required');
    }
    return this.csvImportService.rollbackImport(batchId);
  }
}