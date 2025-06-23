import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { LayerManagerService } from '../layer-manager/layer-manager.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 一時的に無効化
// import { RolesGuard } from '../auth/roles.guard'; // 一時的に無効化
// import { Roles } from '../auth/decorators/roles.decorator'; // 一時的に無効化
// import { CurrentUser, CurrentUserInfo } from '../auth/decorators/current-user.decorator'; // 一時的に無効化
// import { Public } from '../auth/decorators/public.decorator'; // 一時的に無効化
// import { UserType } from '@prisma/client'; // 一時的に無効化

@Controller('schedules')
// @UseGuards(JwtAuthGuard, RolesGuard) // 一時的に無効化
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly layerManagerService: LayerManagerService
  ) {}

  @Post()
  async create(
    @Body() createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; memo?: string; }
  ) {
    try {
      console.log('Creating schedule with data:', createScheduleDto);
      
      // 権限チェックを一時的にスキップ（認証システム修正まで）
      
      const result = await this.schedulesService.create(createScheduleDto);
      console.log('Schedule created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  // 既存API（後方互換）
  @Get()
  findAll(@Query('date') date: string) {
    return this.schedulesService.findAll(date);
  }

  // UTC時刻をJST小数点時刻に変換
  private convertUtcToJstDecimal(utcDate: Date): number {
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    return jstDate.getHours() + jstDate.getMinutes() / 60;
  }

  // 2層統合API (契約レイヤー + 調整レイヤー)
  @Get('layered')
  async findLayered(@Query('date') date: string) {
    if (!date) {
      throw new Error('date parameter is required');
    }
    console.log(`2層統合API呼び出し: date=${date}`);
    const layeredSchedules = await this.layerManagerService.getLayeredSchedules(date);
    
    // スタッフ情報も含めて返す（既存APIとの互換性）
    const staff = await this.schedulesService['prisma'].staff.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });
    
    return {
      schedules: layeredSchedules.map((ls, index) => ({
        id: `${ls.layer}_${ls.id}_${index}`,
        staffId: ls.staffId,
        status: ls.status,
        start: this.convertUtcToJstDecimal(ls.start),
        end: this.convertUtcToJstDecimal(ls.end),
        memo: ls.memo,
        layer: ls.layer // レイヤー情報を保持
      })),
      staff
    };
  }

  @Get('test')
  async testScheduleService() {
    return { message: 'ScheduleService is working', timestamp: new Date() };
  }

  @Get('test-contracts')
  async testContracts(@Query('date') date: string) {
    try {
      // LayerManagerServiceの動作をテスト
      const layerManager = this.schedulesService.getLayerManager();
      const contracts = await layerManager['generateContractSchedules'](date || '2025-06-23');
      return {
        message: 'Contract test successful',
        date: date || '2025-06-23',
        contractCount: contracts.length,
        contracts: contracts
      };
    } catch (error) {
      return {
        message: 'Contract test failed',
        error: error.message,
        stack: error.stack
      };
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateScheduleDto: { status?: string; start?: number; end?: number; date: string; }
  ) {
    // 権限チェックを一時的にスキップ（認証システム修正まで）
    
    return this.schedulesService.update(+id, updateScheduleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // 一時的に権限チェックをスキップ（認証システム修正まで）
    return this.schedulesService.remove(+id);
  }
}