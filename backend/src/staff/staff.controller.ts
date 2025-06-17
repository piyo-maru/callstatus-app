import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';

@Controller('api/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll() {
    return this.staffService.findAll();
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
      throw error;
    }
  }
}