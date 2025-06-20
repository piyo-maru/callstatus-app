import { Controller, Get, Post, Put, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ResponsibilitiesService, CreateResponsibilityDto, UpdateResponsibilityDto } from './responsibilities.service';

@Controller('api/responsibilities')
export class ResponsibilitiesController {
  constructor(private readonly responsibilitiesService: ResponsibilitiesService) {}

  /**
   * 指定日の全スタッフ担当状況を取得
   */
  @Get('status')
  async getAllResponsibilities(@Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.responsibilitiesService.getAllStaffResponsibilities(targetDate);
  }

  /**
   * 指定スタッフの指定日担当設定を取得
   */
  @Get('staff/:staffId')
  async getByStaffIdAndDate(
    @Param('staffId') staffId: string,
    @Query('date') date?: string
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.responsibilitiesService.findByStaffIdAndDate(parseInt(staffId), targetDate);
  }

  /**
   * 指定日の担当設定一覧を取得
   */
  @Get('date/:date')
  async getByDate(@Param('date') date: string) {
    return this.responsibilitiesService.findByDate(date);
  }

  /**
   * 担当設定を作成・更新
   */
  @Post()
  async upsert(@Body() createDto: CreateResponsibilityDto) {
    try {
      return await this.responsibilitiesService.upsert(createDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 担当設定をクリア
   */
  @Put('clear/:staffId')
  async clear(
    @Param('staffId') staffId: string,
    @Query('date') date?: string
  ) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      return await this.responsibilitiesService.clear(parseInt(staffId), targetDate);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}