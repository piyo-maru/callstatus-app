import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AssignmentsService, CreateAssignmentDto, UpdateAssignmentDto } from './assignments.service';

@Controller('api/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * スタッフの支援設定一覧を取得
   */
  @Get('staff/:staffId')
  async getByStaffId(@Param('staffId') staffId: string) {
    return this.assignmentsService.findByStaffId(parseInt(staffId));
  }

  /**
   * 支援設定を作成
   */
  @Post()
  async create(@Body() createDto: CreateAssignmentDto) {
    try {
      return await this.assignmentsService.create(createDto);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 支援設定を更新
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateAssignmentDto) {
    try {
      return await this.assignmentsService.update(parseInt(id), updateDto);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 支援設定を削除
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.assignmentsService.remove(parseInt(id));
  }

  /**
   * 全スタッフの支援状態を取得
   */
  @Get('status')
  async getAllSupportStatus(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.assignmentsService.getAllStaffSupportStatus(targetDate);
  }
}