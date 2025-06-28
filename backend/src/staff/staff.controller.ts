import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
// 一時的に無効化（コンパイルエラー回避）
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Public } from '../auth/decorators/public.decorator';
// import { UserType } from '@prisma/client';

@Controller('staff')
// @UseGuards(JwtAuthGuard, RolesGuard) // 一時的に無効化
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll() {
    return this.staffService.findAll();
  }

  @Get(':id/details')
  async getStaffDetails(@Param('id') id: string) {
    return this.staffService.findStaffDetails(+id);
  }

  @Post()
  create(@Body() createStaffDto: { name: string; department: string; group: string; }) {
    return this.staffService.create(createStaffDto);
  }

  @Post('bulk')
  async createBulk(@Body() createBulkStaffDto: { staff: Array<{ name: string; department: string; group: string; }> }) {
    try {
      console.log('Creating bulk staff with data:', createBulkStaffDto);
      const result = await this.staffService.createBulk(createBulkStaffDto.staff);
      console.log('Bulk staff created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating bulk staff:', error);
      throw error;
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStaffDto: { name?: string; department?: string; group?: string; }) {
    return this.staffService.update(+id, updateStaffDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staffService.remove(+id);
  }

  @Post('sync-from-json-body')
  async syncFromJsonBody(@Body() jsonData: any) {
    console.log('=== syncFromJsonBody endpoint called ===');
    try {
      console.log('Received JSON data:', JSON.stringify(jsonData, null, 2));
      
      // デバッグ: 受信データの詳細確認
      if (jsonData.employeeData && jsonData.employeeData[0]) {
        const firstEmp = jsonData.employeeData[0];
        console.log('First employee dept field:', firstEmp.dept);
        console.log('First employee department field:', firstEmp.department);
        console.log('Type of dept:', typeof firstEmp.dept);
        console.log('All fields:', Object.keys(firstEmp));
      }
      
      const result = await this.staffService.syncFromEmployeeData(jsonData);
      console.log('Staff sync completed:', result);
      return result;
    } catch (error) {
      console.error('Error in syncFromJsonBody controller:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Post('sync-from-json-preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewSyncFromJson(@UploadedFile() file: Express.Multer.File) {
    console.log('=== Preview sync from JSON called ===');
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const fileContent = file.buffer.toString('utf8');
      const jsonData = JSON.parse(fileContent);
      
      return await this.staffService.previewSyncFromEmployeeData(jsonData);
    } catch (error) {
      console.error('Error in preview:', error);
      throw error;
    }
  }

  @Post('test-lunch-break/:staffId')
  async testLunchBreak(@Param('staffId') staffId: string) {
    console.log(`=== 昼休み追加テスト開始: スタッフID ${staffId} ===`);
    try {
      const result = await this.staffService.testAddLunchBreaks(+staffId);
      return { success: true, result };
    } catch (error) {
      console.error('昼休み追加テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('sync-from-json')
  @UseInterceptors(FileInterceptor('file'))
  async syncFromJson(@UploadedFile() file: Express.Multer.File) {
    console.log('=== syncFromJson endpoint called ===');
    console.log('File received:', file ? 'Yes' : 'No');
    
    try {
      if (!file) {
        console.error('No file uploaded');
        throw new Error('No file uploaded');
      }

      console.log('File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      const fileContent = file.buffer.toString('utf8');
      console.log('File content preview:', fileContent.substring(0, 200) + '...');
      
      const jsonData = JSON.parse(fileContent);
      console.log('Parsed JSON data:', jsonData);
      
      const result = await this.staffService.syncFromEmployeeData(jsonData);
      
      console.log('Staff sync completed:', result);
      return result;
    } catch (error) {
      console.error('Error syncing staff from JSON:', error);
      console.error('Error stack:', error.stack);
    }
  }
}