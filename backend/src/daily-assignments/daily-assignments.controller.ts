import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { DailyAssignmentsService, CreateDailyAssignmentDto } from './daily-assignments.service';

@Controller('api/daily-assignments')
export class DailyAssignmentsController {
  constructor(private readonly dailyAssignmentsService: DailyAssignmentsService) {}

  /**
   * 指定日の全担当状況を取得
   */
  @Get()
  async getDailyAssignments(@Query('date') date: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.dailyAssignmentsService.getDailyAssignmentsByDate(targetDate);
  }

  /**
   * 担当設定を作成または更新
   */
  @Post()
  async createOrUpdate(@Body() createDto: CreateDailyAssignmentDto) {
    try {
      return await this.dailyAssignmentsService.createOrUpdateDailyAssignment(createDto);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 担当設定を削除
   */
  @Delete(':staffId/:date')
  async remove(@Param('staffId') staffId: string, @Param('date') date: string) {
    return this.dailyAssignmentsService.removeDailyAssignment(parseInt(staffId), date);
  }

  /**
   * スタッフの担当履歴を取得
   */
  @Get('history/:staffId')
  async getStaffHistory(@Param('staffId') staffId: string) {
    return this.dailyAssignmentsService.getStaffAssignmentHistory(parseInt(staffId));
  }
}