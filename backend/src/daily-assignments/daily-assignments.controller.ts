import { Controller, Get, Post, Body, Delete, Query, Param } from '@nestjs/common';
import { DailyAssignmentsService } from './daily-assignments.service';

@Controller('daily-assignments')
export class DailyAssignmentsController {
  constructor(private readonly dailyAssignmentsService: DailyAssignmentsService) {}

  @Get()
  async getAssignments(@Query('date') date: string) {
    return this.dailyAssignmentsService.getAssignmentsByDate(date);
  }

  @Post()
  async upsertAssignment(@Body() data: {
    staffId: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    assignmentType?: string;
    customLabel?: string;
    tempDept?: string;
    tempGroup?: string;
  }) {
    console.log('=== DailyAssignmentsController POST received ===');
    console.log('Request data:', JSON.stringify(data, null, 2));
    
    try {
      // 支援設定データの場合（tempDept, tempGroupがある）
      if (data.tempDept || data.tempGroup) {
        console.log('=> Routing to upsertSupportAssignment');
        const result = await this.dailyAssignmentsService.upsertSupportAssignment(data);
        console.log('=> Support assignment success:', result);
        return result;
      }
      
      // 担当設定データの場合
      console.log('=> Routing to upsertAssignment (daily)');
      return this.dailyAssignmentsService.upsertAssignment({
        staffId: data.staffId,
        date: data.date,
        assignmentType: data.assignmentType,
        customLabel: data.customLabel
      });
    } catch (error) {
      console.error('=== Controller error ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  @Delete()
  async deleteAssignment(@Query('staffId') staffId: string, @Query('date') date: string) {
    return this.dailyAssignmentsService.deleteAssignment(+staffId, date);
  }

  @Delete('staff/:staffId/current')
  async deleteSupportAssignment(@Param('staffId') staffId: string) {
    console.log('=== DailyAssignmentsController DELETE staff/:staffId/current ===');
    console.log('StaffId:', staffId);
    
    try {
      const result = await this.dailyAssignmentsService.deleteSupportAssignment(+staffId);
      console.log('=> Support assignment deletion success:', result);
      return result;
    } catch (error) {
      console.error('=== Support assignment deletion error ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }
}