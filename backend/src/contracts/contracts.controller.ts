import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * 指定月の契約スケジュール情報を取得
   * GET /api/contracts/monthly?year=2025&month=6
   */
  @Get('monthly')
  async getMonthlyContractSchedules(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    // パラメータバリデーション
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw new BadRequestException('年と月は数値で指定してください');
    }
    
    if (yearNum < 1900 || yearNum > 2100) {
      throw new BadRequestException('年は1900-2100の範囲で指定してください');
    }
    
    if (monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('月は1-12の範囲で指定してください');
    }

    return this.contractsService.getMonthlyContractSchedules(yearNum, monthNum);
  }
}