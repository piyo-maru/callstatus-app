import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { LayerManagerService } from '../layer-manager/layer-manager.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
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
    private readonly layerManagerService: LayerManagerService,
    private readonly snapshotsService: SnapshotsService
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

  // 統合スケジュール取得API（現在/過去の自動分岐）
  @Get('unified')
  async findUnified(
    @Query('date') date: string,
    @Query('includeMasking') includeMasking?: string
  ) {
    if (!date) {
      throw new Error('date parameter is required');
    }

    console.log(`統合スケジュールAPI呼び出し: date=${date}, includeMasking=${includeMasking}`);

    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日より前の日付は履歴データから取得
    if (targetDate < today) {
      return this.getHistoricalSchedules(date, includeMasking === 'true');
    } else {
      // 今日以降は現在のデータから取得
      return this.getCurrentSchedules(date);
    }
  }

  /**
   * 履歴データを取得して返す
   */
  private async getHistoricalSchedules(date: string, includeMasking: boolean = false) {
    const historicalData = await this.snapshotsService.getHistoricalSchedules(date);
    
    if (!historicalData || historicalData.length === 0) {
      return {
        schedules: [],
        staff: [],
        isHistorical: true,
        message: '該当日のスナップショットデータが見つかりません'
      };
    }

    // スタッフ情報を履歴データから構築
    const staffMap = new Map();
    for (const item of historicalData) {
      if (!staffMap.has(item.staffId)) {
        const maskedName = includeMasking 
          ? await this.maskStaffName(item.staffName, item.staffId)
          : item.staffName;
        
        staffMap.set(item.staffId, {
          id: item.staffId,
          empNo: item.staffEmpNo,
          name: maskedName,
          department: item.staffDepartment,
          group: item.staffGroup,
          isActive: item.staffIsActive
        });
      }
    }

    const staff = Array.from(staffMap.values());

    // スケジュールデータを変換
    const schedules = historicalData.map((item, index) => ({
      id: `hist_${item.id}_${index}`,
      staffId: item.staffId,
      status: item.status,
      start: this.convertUtcToJstDecimal(item.start),
      end: this.convertUtcToJstDecimal(item.end),
      memo: item.memo,
      layer: 'historical'
    }));

    return {
      schedules,
      staff,
      isHistorical: true,
      snapshotDate: historicalData[0]?.snapshotAt,
      recordCount: historicalData.length
    };
  }

  /**
   * 現在のデータを取得
   */
  private async getCurrentSchedules(date: string) {
    console.log(`現在データ取得: date=${date}`);
    const layeredSchedules = await this.layerManagerService.getLayeredSchedules(date);
    
    // スタッフ情報も含めて返す
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
        layer: ls.layer
      })),
      staff,
      isHistorical: false
    };
  }

  /**
   * 退職済み社員名をマスキング
   */
  private async maskStaffName(originalName: string, staffId: number): Promise<string> {
    try {
      // 現在のスタッフテーブルで該当者を確認
      const currentStaff = await this.schedulesService['prisma'].staff.findUnique({
        where: { id: staffId }
      });

      // 現在も在籍している場合は実名表示
      if (currentStaff && currentStaff.isActive) {
        return originalName;
      }

      // 退職済みまたは存在しない場合はマスキング
      return '退職済み社員';
    } catch (error) {
      console.error('Staff masking error:', error);
      return '不明な社員';
    }
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
    
    // 文字列IDを数値IDに変換
    let numericId: number;
    console.log(`Parsing ID: ${id}`);
    
    if (id.startsWith('adjustment_adj_')) {
      // "adjustment_adj_123_0" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[2]) || 0; // adj_の後の数値を取得
    } else if (id.startsWith('adj_')) {
      // "adj_123" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[1]) || 0;
    } else if (id.startsWith('adjustment_sch_')) {
      // "adjustment_sch_2_240" 形式から数値IDを抽出（sch_の後の数値を取得）
      const parts = id.split('_');
      numericId = parseInt(parts[2]) || 0; // sch_の後の数値を取得
    } else {
      // 通常の数値ID
      numericId = +id;
    }
    
    console.log(`Update schedule: ${id} -> ${numericId}`);
    try {
      const result = await this.schedulesService.update(numericId, updateScheduleDto);
      console.log('Update successful:', result);
      return result;
    } catch (error) {
      console.error('Update failed:', error.message);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // 一時的に権限チェックをスキップ（認証システム修正まで）
    
    // 文字列IDを数値IDに変換
    let numericId: number;
    console.log(`Parsing delete ID: ${id}`);
    
    if (id.startsWith('adjustment_adj_')) {
      // "adjustment_adj_123_0" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[2]) || 0; // adj_の後の数値を取得
    } else if (id.startsWith('adj_')) {
      // "adj_123" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[1]) || 0;
    } else if (id.startsWith('adjustment_sch_')) {
      // "adjustment_sch_2_240" 形式から数値IDを抽出（sch_の後の数値を取得）
      const parts = id.split('_');
      numericId = parseInt(parts[2]) || 0; // sch_の後の数値を取得
    } else {
      // 通常の数値ID
      numericId = +id;
    }
    
    console.log(`Delete schedule: ${id} -> ${numericId}`);
    return this.schedulesService.remove(numericId);
  }
}