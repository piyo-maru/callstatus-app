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

  /**
   * 日付文字列をUTC基準の Date オブジェクトに厳密変換
   * @param dateString "2025-06-24" 形式の日付文字列
   * @returns UTC基準の日付（00:00:00.000Z）
   */
  private parseTargetDateUtc(dateString: string): Date {
    // ISO-8601形式でUTC時刻として厳密に解釈
    return new Date(`${dateString}T00:00:00.000Z`);
  }

  /**
   * 業務日基準での「今日」をUTC形式で取得
   * 日本時間（JST）での日付判定を行い、UTC形式で返す
   * @returns 業務日基準での今日の開始時刻（UTC）
   */
  private getBusinessTodayUtc(): Date {
    // 現在のUTC時刻を取得
    const now_utc = new Date();
    
    // JST時刻に変換して日付を取得
    const now_jst = new Date(now_utc.getTime() + 9 * 60 * 60 * 1000);
    const jst_year = now_jst.getUTCFullYear();
    const jst_month = now_jst.getUTCMonth();
    const jst_date = now_jst.getUTCDate();
    
    // JST基準での「今日」の開始時刻をUTC形式で構築
    // JST 2025-06-25 00:00:00 → UTC 2025-06-24 15:00:00
    const businessToday_jst = new Date(Date.UTC(jst_year, jst_month, jst_date, 0, 0, 0, 0));
    const businessToday_utc = new Date(businessToday_jst.getTime() - 9 * 60 * 60 * 1000);
    
    return businessToday_utc;
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

  // 統合API（pending + active schedules）は後で実装

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

    const targetDate_utc = this.parseTargetDateUtc(date);
    const businessToday_utc = this.getBusinessTodayUtc();

    console.log(`日付判定: target=${targetDate_utc.toISOString()}, businessToday=${businessToday_utc.toISOString()}`);

    // 業務日基準で過去の日付は履歴データから取得
    if (targetDate_utc < businessToday_utc) {
      console.log('過去日付として履歴データを取得');
      return this.getHistoricalSchedules(date, includeMasking === 'true');
    } else {
      // 業務日基準で今日以降は現在のデータから取得
      console.log('現在日付として現在データを取得');
      return this.getCurrentSchedules(date);
    }
  }

  /**
   * 履歴データを取得して返す（契約レイヤーも含む）
   */
  private async getHistoricalSchedules(date: string, includeMasking: boolean = false) {
    console.log(`履歴データ取得開始: ${date}, マスキング: ${includeMasking}`);
    
    // 1. 履歴データ（調整レイヤー）を取得
    const historicalData = await this.snapshotsService.getHistoricalSchedules(date);
    console.log(`履歴データ取得完了: ${historicalData ? historicalData.length : 0}件`);
    
    // 2. 契約レイヤーを動的生成（退職者含む）
    let contractSchedules = [];
    try {
      contractSchedules = await this.layerManagerService.generateHistoricalContractSchedules(date);
      console.log(`契約レイヤー生成完了: ${contractSchedules.length}件`);
    } catch (error) {
      console.error(`契約レイヤー生成エラー: ${error.message}`);
      // 契約レイヤー生成に失敗しても履歴データは返す
    }

    // データが何もない場合
    if ((!historicalData || historicalData.length === 0) && contractSchedules.length === 0) {
      return {
        schedules: [],
        staff: [],
        isHistorical: true,
        message: '該当日のスナップショットデータが見つかりません'
      };
    }

    // 3. スタッフ情報を履歴データと契約データから構築
    const staffMap = new Map();
    
    // 履歴データからスタッフ情報を構築
    if (historicalData) {
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
    }

    // 契約データからもスタッフ情報を補完（退職者も含む）
    for (const contractSchedule of contractSchedules) {
      if (!staffMap.has(contractSchedule.staffId)) {
        // 契約レイヤーのスタッフ情報を取得
        try {
          const staff = await this.schedulesService['prisma'].staff.findUnique({
            where: { id: contractSchedule.staffId }
          });
          if (staff) {
            const maskedName = includeMasking 
              ? await this.maskStaffName(staff.name, staff.id)
              : staff.name;
            
            staffMap.set(staff.id, {
              id: staff.id,
              empNo: staff.empNo,
              name: maskedName,
              department: staff.department,
              group: staff.group,
              isActive: staff.isActive
            });
          }
        } catch (error) {
          console.error(`スタッフ情報取得エラー (ID: ${contractSchedule.staffId}): ${error.message}`);
        }
      }
    }

    const staff = Array.from(staffMap.values());

    // 4. スケジュールデータを変換
    const schedules = [];
    
    // 履歴データ（調整レイヤー）を追加
    if (historicalData) {
      const historicalSchedules = historicalData.map((item, index) => ({
        id: `hist_${item.id}_${index}`,
        staffId: item.staffId,
        status: item.status,
        start: this.convertUtcToJstDecimal(item.start),
        end: this.convertUtcToJstDecimal(item.end),
        memo: item.memo,
        layer: 'historical' // 履歴データは 'historical' レイヤー
      }));
      schedules.push(...historicalSchedules);
    }
    
    // 契約レイヤーを追加
    const contractSchedulesConverted = contractSchedules.map((cs, index) => ({
      id: `contract_hist_${cs.id}_${index}`,
      staffId: cs.staffId,
      status: cs.status,
      start: this.convertUtcToJstDecimal(cs.start),
      end: this.convertUtcToJstDecimal(cs.end),
      memo: cs.memo,
      layer: 'contract' // 契約データは 'contract' レイヤー
    }));
    schedules.push(...contractSchedulesConverted);

    console.log(`履歴データ統合完了: 履歴${historicalData ? historicalData.length : 0}件 + 契約${contractSchedules.length}件 = 合計${schedules.length}件`);

    return {
      schedules,
      staff,
      isHistorical: true,
      snapshotDate: historicalData && historicalData.length > 0 ? historicalData[0]?.snapshotAt : null,
      recordCount: schedules.length,
      historicalRecords: historicalData ? historicalData.length : 0,
      contractRecords: contractSchedules.length
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
   * 非在籍社員名をマスキング
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
      return '非在籍社員';
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
      // "adjustment_adj_2283_397" 形式から実際のIDを抽出
      // 構造: adjustment_adj_{実際のID}_{配列インデックス}
      const parts = id.split('_');
      if (parts.length >= 3) {
        numericId = parseInt(parts[2]) || 0; // adj_の次の数値が実際のID
      }
    } else if (id.startsWith('adj_')) {
      // "adj_123" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[1]) || 0;
    } else if (id.startsWith('adjustment_sch_')) {
      // "adjustment_sch_31_468" 形式から実際のIDを抽出
      // 構造: adjustment_sch_{実際のID}_{配列インデックス}
      const parts = id.split('_');
      if (parts.length >= 3) {
        numericId = parseInt(parts[2]) || 0; // sch_の次の数値が実際のID
      }
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
      // "adjustment_adj_2283_397" 形式から実際のIDを抽出
      // 構造: adjustment_adj_{実際のID}_{配列インデックス}
      const parts = id.split('_');
      if (parts.length >= 3) {
        numericId = parseInt(parts[2]) || 0; // adj_の次の数値が実際のID
      }
    } else if (id.startsWith('adj_')) {
      // "adj_123" 形式から数値IDを抽出
      const parts = id.split('_');
      numericId = parseInt(parts[1]) || 0;
    } else if (id.startsWith('adjustment_sch_')) {
      // "adjustment_sch_31_468" 形式から実際のIDを抽出
      // 構造: adjustment_sch_{実際のID}_{配列インデックス}
      const parts = id.split('_');
      if (parts.length >= 3) {
        numericId = parseInt(parts[2]) || 0; // sch_の次の数値が実際のID
      }
    } else {
      // 通常の数値ID
      numericId = +id;
    }
    
    console.log(`Delete schedule: ${id} -> ${numericId}`);
    return this.schedulesService.remove(numericId);
  }
}