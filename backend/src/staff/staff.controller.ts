import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll() {
    return this.staffService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createStaffDto: { name: string; department: string; group: string; }) {
    return this.staffService.create(createStaffDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateStaffDto: { name?: string; department?: string; group?: string; }) {
    return this.staffService.update(+id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.staffService.remove(+id);
  }

  @Post('sync-from-json-body')
  @Roles(Role.ADMIN)
  async syncFromJsonBody(@Body() jsonData: any) {
    console.log('=== syncFromJsonBody endpoint called ===');
    try {
      console.log('Received JSON data:', JSON.stringify(jsonData, null, 2));
      const result = await this.staffService.syncFromEmployeeData(jsonData);
      console.log('Staff sync completed:', result);
      return result;
    } catch (error) {
      console.error('Error in syncFromJsonBody controller:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Post('sync-from-json')
  @Roles(Role.ADMIN)
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