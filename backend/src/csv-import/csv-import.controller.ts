import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvImportService } from './csv-import.service';

@Controller('api/csv-import')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  /**
   * CSV月次スケジュールファイルのアップロード
   */
  @Post('schedules')
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
}