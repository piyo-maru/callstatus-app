import { Controller, Post, Delete, Get, UseInterceptors, UploadedFile, BadRequestException, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvImportService } from './csv-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/csv-import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  /**
   * CSV月次スケジュールファイルのアップロード
   */
  @Post('schedules')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importSchedules(@UploadedFile() file: Express.Multer.File) {
    console.log('=== CSV import endpoint called ===');
    console.log('File received:', file ? 'Yes' : 'No');
    
    try {
      if (!file) {
        console.error('No file uploaded');
        throw new BadRequestException('CSVファイルがアップロードされていません');
      }

      console.log('File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // ファイル形式チェック
      if (!file.originalname.toLowerCase().endsWith('.csv') && file.mimetype !== 'text/csv') {
        throw new BadRequestException('CSVファイルのみアップロード可能です');
      }

      const csvContent = file.buffer.toString('utf8');
      console.log('CSV content preview:', csvContent.substring(0, 200) + '...');
      
      const result = await this.csvImportService.importCsvSchedules(csvContent);
      
      console.log('CSV import completed:', result);
      return result;
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * 指定したバッチIDのCSVインポートデータをロールバック
   */
  @Delete('rollback')
  @Roles(Role.ADMIN)
  async rollbackCsvImport(@Body() body: { batchId: string }) {
    console.log('=== CSV rollback endpoint called ===');
    console.log('BatchID to rollback:', body.batchId);
    
    try {
      if (!body.batchId) {
        throw new BadRequestException('batchIdが指定されていません');
      }

      const result = await this.csvImportService.rollbackCsvImport(body.batchId);
      
      console.log('CSV rollback completed:', result);
      return result;
      
    } catch (error) {
      console.error('Error rolling back CSV import:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * CSVインポート履歴を取得
   */
  @Get('history')
  @Roles(Role.ADMIN)
  async getCsvImportHistory() {
    console.log('=== CSV import history endpoint called ===');
    
    try {
      const history = await this.csvImportService.getCsvImportHistory();
      
      console.log('CSV import history retrieved:', history.length, 'batches');
      return history;
      
    } catch (error) {
      console.error('Error retrieving CSV import history:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}