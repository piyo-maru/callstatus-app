import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ContractService } from './contract.service';

export interface ContractData {
  empNo: string;
  name: string;
  dept: string;
  team: string;
  email: string;
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
}

@Controller('api/contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post('import')
  async importContracts(@Body() contractsData: ContractData[]) {
    try {
      const result = await this.contractService.importContracts(contractsData);
      return {
        success: true,
        message: `${result.imported}件のContractデータを投入しました`,
        details: result
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Contractデータの投入に失敗しました',
        error: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('analyze-impact')
  async analyzeReplaceImpact() {
    try {
      const result = await this.contractService.analyzeReplaceImpact();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: '影響範囲分析に失敗しました',
        error: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('replace')
  async replaceContracts(
    @Body() body: { 
      data: ContractData[], 
      options?: { 
        deleteRelatedSchedules?: boolean; 
        forceReplace?: boolean; 
      } 
    }
  ) {
    try {
      const { data, options = {} } = body;
      const result = await this.contractService.replaceContracts(data, options);
      return {
        success: true,
        message: `全Contractデータを洗い替えしました（${result.deleted}件削除、${result.imported}件追加${result.schedulesCleaned ? '、関連スケジュール削除済み' : ''}）`,
        details: result
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Contractデータの洗い替えに失敗しました',
        error: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }
}