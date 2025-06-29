import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MonthlyPlannerService } from './monthly-planner.service';

@Controller('monthly-planner')
export class MonthlyPlannerController {
  constructor(private readonly monthlyPlannerService: MonthlyPlannerService) {}

  // 契約表示キャッシュ取得API
  @Get('display-cache/:year/:month')
  async getDisplayCache(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.monthlyPlannerService.getDisplayCache(year, month);
  }
}