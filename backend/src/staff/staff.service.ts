import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChunkImportService } from '../import-progress/chunk-import.service';
import { ImportProgressGateway } from '../import-progress/import-progress.gateway';

// 文字チェック関連の型定義
interface CharacterCheckError {
  field: string;
  value: string;
  invalidChars: string[];
  position: number;
}

interface CharacterCheckResult {
  isValid: boolean;
  errors: CharacterCheckError[];
}

// 社員データの型定義
interface EmployeeData {
  empNo: string;
  name: string;
  dept?: string;        // 新形式
  department?: string;  // 旧形式（後方互換性）
  team: string;
  email?: string;
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
}

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private chunkImportService: ChunkImportService,
    private progressGateway: ImportProgressGateway,
  ) {}

  // 文字チェック関数
  private checkSupportedCharacters(data: Array<{name: string; department: string; group: string}>): CharacterCheckResult {
    // JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号 + 反復記号「々」+ 全角英数字の範囲
    const supportedCharsRegex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff9f\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f\u3005]*$/;
    
    const errors: CharacterCheckError[] = [];
    
    data.forEach((item, index) => {
      // 名前をチェック
      if (!supportedCharsRegex.test(item.name)) {
        const invalidChars = [...item.name].filter(char => !supportedCharsRegex.test(char));
        errors.push({
          field: 'name',
          value: item.name,
          invalidChars: [...new Set(invalidChars)],
          position: index + 1
        });
      }
      
      // 部署をチェック
      if (!supportedCharsRegex.test(item.department)) {
        const invalidChars = [...item.department].filter(char => !supportedCharsRegex.test(char));
        errors.push({
          field: 'department',
          value: item.department,
          invalidChars: [...new Set(invalidChars)],
          position: index + 1
        });
      }
      
      // グループをチェック
      if (!supportedCharsRegex.test(item.group)) {
        const invalidChars = [...item.group].filter(char => !supportedCharsRegex.test(char));
        errors.push({
          field: 'group',
          value: item.group,
          invalidChars: [...new Set(invalidChars)],
          position: index + 1
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async findAll() {
    return this.prisma.staff.findMany({
      where: { isActive: true },
      orderBy: [
        { empNo: 'asc' }, // empNo順でソート（nullは後ろに）
        { id: 'asc' }     // empNoが同じ場合はid順
      ]
    });
  }

  async findStaffDetails(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        Contract: true
      }
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // 契約情報を整理して返す
    const contract = staff.Contract?.[0]; // 通常は1つの契約のみ
    const workingDays = [];
    
    if (contract) {
      const dayHours = [
        { day: '月曜日', hours: contract.mondayHours },
        { day: '火曜日', hours: contract.tuesdayHours },
        { day: '水曜日', hours: contract.wednesdayHours },
        { day: '木曜日', hours: contract.thursdayHours },
        { day: '金曜日', hours: contract.fridayHours },
        { day: '土曜日', hours: contract.saturdayHours },
        { day: '日曜日', hours: contract.sundayHours }
      ];
      
      workingDays.push(...dayHours.filter(d => d.hours).map(d => `${d.day}: ${d.hours}`));
    }

    return {
      id: staff.id,
      empNo: staff.empNo,
      name: staff.name,
      department: staff.department,
      group: staff.group,
      isActive: staff.isActive,
      contract: contract ? {
        empNo: contract.empNo,
        email: contract.email,
        workingDays: workingDays,
        // 雇用形態判定（勤務日数で簡易判定）
        employmentType: workingDays.length >= 5 ? 'REGULAR' : workingDays.length >= 3 ? 'PART_TIME' : 'CONTRACT'
      } : null
    };
  }

  async create(createStaffDto: { name: string; department: string; group: string; }) {
    // 文字チェックを実行
    const characterCheck = this.checkSupportedCharacters([createStaffDto]);
    
    if (!characterCheck.isValid) {
      const errorMessages = characterCheck.errors.map(error => {
        const fieldName = error.field === 'name' ? '名前' : error.field === 'department' ? '部署' : 'グループ';
        return `${fieldName}「${error.value}」に使用できない文字が含まれています: ${error.invalidChars.join(', ')}`;
      });
      
      throw new BadRequestException({
        message: '文字チェックエラー',
        details: errorMessages,
        supportedChars: 'ひらがな、カタカナ、漢字（JIS第1-2水準）、英数字、基本記号のみ使用可能です'
      });
    }

    return this.prisma.staff.create({
      data: createStaffDto
    });
  }

  async createBulk(staffArray: Array<{ name: string; department: string; group: string; }>) {
    console.log(`Creating ${staffArray.length} staff members...`);
    
    // 文字チェックを実行
    const characterCheck = this.checkSupportedCharacters(staffArray);
    
    if (!characterCheck.isValid) {
      const errorMessages = characterCheck.errors.map(error => {
        const fieldName = error.field === 'name' ? '名前' : error.field === 'department' ? '部署' : 'グループ';
        return `${error.position}行目の${fieldName}「${error.value}」に使用できない文字が含まれています: ${error.invalidChars.join(', ')}`;
      });
      
      throw new BadRequestException({
        message: '文字チェックエラー',
        details: errorMessages,
        supportedChars: 'ひらがな、カタカナ、漢字（JIS第1-2水準）、英数字、基本記号のみ使用可能です'
      });
    }
    
    const createdStaff = [];
    for (const staffData of staffArray) {
      try {
        const staff = await this.prisma.staff.create({
          data: staffData
        });
        createdStaff.push(staff);
        console.log(`Created staff: ${staff.name}`);
      } catch (error) {
        console.error(`Error creating staff ${staffData.name}:`, error);
        throw error;
      }
    }
    
    console.log(`Successfully created ${createdStaff.length} staff members`);
    return {
      created: createdStaff.length,
      staff: createdStaff
    };
  }

  async update(id: number, updateStaffDto: { name?: string; department?: string; group?: string; }) {
    const staff = await this.prisma.staff.findUnique({
      where: { id }
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // 更新するデータのみ文字チェックを実行
    const dataToCheck = {
      name: updateStaffDto.name || staff.name,
      department: updateStaffDto.department || staff.department,
      group: updateStaffDto.group || staff.group
    };

    const characterCheck = this.checkSupportedCharacters([dataToCheck]);
    
    if (!characterCheck.isValid) {
      const errorMessages = characterCheck.errors.map(error => {
        const fieldName = error.field === 'name' ? '名前' : error.field === 'department' ? '部署' : 'グループ';
        return `${fieldName}「${error.value}」に使用できない文字が含まれています: ${error.invalidChars.join(', ')}`;
      });
      
      throw new BadRequestException({
        message: '文字チェックエラー',
        details: errorMessages,
        supportedChars: 'ひらがな、カタカナ、漢字（JIS第1-2水準）、英数字、基本記号のみ使用可能です'
      });
    }

    return this.prisma.staff.update({
      where: { id },
      data: updateStaffDto
    });
  }

  async remove(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id, isActive: true }
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // 論理削除を実行
    return this.prisma.staff.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    });
  }

  async previewSyncFromEmployeeData(jsonData: any) {
    try {
      console.log('=== 社員情報同期プレビュー開始 ===');
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData = jsonData.employeeData;
      
      // 既存のアクティブスタッフを取得
      const existingStaff = await this.prisma.staff.findMany({
        where: { isActive: true },
        select: { empNo: true, name: true }
      });

      // インポートデータのempNoリスト
      const importEmpNos = new Set(employeeData.map(emp => emp.empNo));
      const existingEmpNos = new Set(existingStaff.filter(s => s.empNo).map(s => s.empNo));

      // 分析結果
      const toAdd = employeeData.filter(emp => !existingEmpNos.has(emp.empNo));
      const toUpdate = employeeData.filter(emp => existingEmpNos.has(emp.empNo));
      const toDelete = existingStaff.filter(staff => 
        staff.empNo && !importEmpNos.has(staff.empNo)
      );

      return {
        preview: true,
        summary: {
          totalImport: employeeData.length,
          toAdd: toAdd.length,
          toUpdate: toUpdate.length,
          toDelete: toDelete.length
        },
        details: {
          toAdd: toAdd.map(emp => ({ empNo: emp.empNo, name: emp.name })),
          toUpdate: toUpdate.map(emp => ({ empNo: emp.empNo, name: emp.name })),
          toDelete: toDelete.map(staff => ({ empNo: staff.empNo, name: staff.name }))
        },
        warnings: toDelete.length > 0 ? [
          `${toDelete.length}名のスタッフが論理削除されます`,
          '論理削除されても過去のスケジュールデータは保持されます',
          '間違いがないか確認してから実行してください'
        ] : []
      };

    } catch (error) {
      console.error('プレビューエラー:', error);
      throw new BadRequestException(`プレビュー処理でエラーが発生しました: ${error.message}`);
    }
  }

  // 【契約変更検知システム】勤務日の変更を検知・記録・処理
  private async detectAndHandleContractChange(staffId: number, newContractData: any, oldContract?: any) {
    console.log(`=== 契約変更検知開始: スタッフID ${staffId} ===`);
    
    try {
      if (!oldContract) {
        console.log('新規契約のため変更検知をスキップ');
        return { hasChanges: false };
      }

      // 勤務日の抽出・比較
      const oldWorkingDays = this.extractWorkingDays(oldContract);
      const newWorkingDays = this.extractWorkingDays(newContractData);
      
      // 変更の検知
      const hasWorkingDaysChange = !this.arraysEqual(oldWorkingDays, newWorkingDays);
      
      if (!hasWorkingDaysChange) {
        console.log('勤務日に変更なし');
        return { hasChanges: false };
      }

      console.log(`勤務日変更検知: ${oldWorkingDays} → ${newWorkingDays}`);

      // 変更ログの記録
      const changeLog = await this.prisma.contractChangeLog.create({
        data: {
          staffId,
          changeType: 'WORKING_DAYS',
          oldWorkingDays,
          newWorkingDays,
          oldHours: this.extractHoursData(oldContract),
          newHours: this.extractHoursData(newContractData),
          createdBy: 'SYSTEM_IMPORT'
        }
      });

      console.log(`変更ログ記録完了: ID ${changeLog.id}`);

      // break調整処理
      await this.adjustBreaksForWorkingDaysChange(staffId, oldWorkingDays, newWorkingDays, changeLog.id);

      return { 
        hasChanges: true, 
        changeLogId: changeLog.id,
        oldWorkingDays,
        newWorkingDays
      };

    } catch (error) {
      console.error('契約変更検知処理でエラー:', error);
      throw error;
    }
  }

  // 勤務日抽出ヘルパー
  private extractWorkingDays(contract: any): number[] {
    const workingDays = [];
    const dayMapping = [
      { dayOfWeek: 1, hours: contract.mondayHours },
      { dayOfWeek: 2, hours: contract.tuesdayHours },
      { dayOfWeek: 3, hours: contract.wednesdayHours },
      { dayOfWeek: 4, hours: contract.thursdayHours },
      { dayOfWeek: 5, hours: contract.fridayHours },
      { dayOfWeek: 6, hours: contract.saturdayHours },
      { dayOfWeek: 0, hours: contract.sundayHours }
    ];

    dayMapping.forEach(day => {
      if (day.hours && day.hours.trim()) {
        workingDays.push(day.dayOfWeek);
      }
    });

    return workingDays.sort();
  }

  // 時間データ抽出ヘルパー
  private extractHoursData(contract: any) {
    return {
      mondayHours: contract.mondayHours,
      tuesdayHours: contract.tuesdayHours,
      wednesdayHours: contract.wednesdayHours,
      thursdayHours: contract.thursdayHours,
      fridayHours: contract.fridayHours,
      saturdayHours: contract.saturdayHours,
      sundayHours: contract.sundayHours
    };
  }

  // 配列比較ヘルパー
  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  // 勤務日変更時のbreak調整処理
  private async adjustBreaksForWorkingDaysChange(
    staffId: number, 
    oldDays: number[], 
    newDays: number[],
    changeLogId: number
  ) {
    console.log(`=== break調整処理開始: スタッフID ${staffId} ===`);
    
    try {
      const removedDays = oldDays.filter(day => !newDays.includes(day));
      const addedDays = newDays.filter(day => !oldDays.includes(day));
      
      let adjustmentSummary = {
        deactivated: 0,
        added: 0
      };

      // 削除された勤務日のbreak無効化
      if (removedDays.length > 0) {
        console.log(`削除された勤務日のbreak無効化: ${removedDays}`);
        adjustmentSummary.deactivated = await this.deactivateBreaksOnDays(staffId, removedDays);
      }

      // 追加された勤務日にbreak追加
      if (addedDays.length > 0) {
        console.log(`追加された勤務日にbreak追加: ${addedDays}`);
        adjustmentSummary.added = await this.addBreaksForAddedDays(staffId, addedDays);
      }

      // 処理完了の記録
      await this.prisma.contractChangeLog.update({
        where: { id: changeLogId },
        data: {
          processedAt: new Date(),
          processingStatus: 'COMPLETED',
          errorMessage: `調整完了: 無効化${adjustmentSummary.deactivated}件, 追加${adjustmentSummary.added}件`
        }
      });

      console.log(`break調整完了: 無効化${adjustmentSummary.deactivated}件, 追加${adjustmentSummary.added}件`);
      return adjustmentSummary;

    } catch (error) {
      // エラー記録
      await this.prisma.contractChangeLog.update({
        where: { id: changeLogId },
        data: {
          processingStatus: 'FAILED',
          errorMessage: error.message
        }
      });
      throw error;
    }
  }

  // 指定曜日のbreak無効化
  private async deactivateBreaksOnDays(staffId: number, daysToRemove: number[]): Promise<number> {
    // 未来のbreakのみ対象（過去は変更しない）
    const today = new Date();
    
    // 無効化対象のbreak特定
    const breaksToDeactivate = await this.prisma.adjustment.findMany({
      where: {
        staffId,
        status: 'break',
        date: { gte: today }
      }
    });

    let deactivatedCount = 0;
    for (const breakRecord of breaksToDeactivate) {
      const dayOfWeek = breakRecord.date.getDay();
      if (daysToRemove.includes(dayOfWeek)) {
        await this.prisma.adjustment.update({
          where: { id: breakRecord.id },
          data: {
            memo: (breakRecord.memo || '') + ' (勤務日変更により無効化)',
            reason: (breakRecord.reason || '') + ' [勤務日変更無効化]'
          }
        });
        deactivatedCount++;
      }
    }

    return deactivatedCount;
  }

  // 追加勤務日のbreak追加
  private async addBreaksForAddedDays(staffId: number, addedDays: number[]): Promise<number> {
    // 今日から3ヶ月先まで対象
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const targetDates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (addedDays.includes(currentDate.getDay())) {
        targetDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (targetDates.length === 0) {
      return 0;
    }

    // 既存breakチェック
    const existingBreaks = await this.prisma.adjustment.findMany({
      where: {
        staffId,
        status: 'break',
        date: {
          gte: targetDates[0],
          lte: targetDates[targetDates.length - 1]
        }
      },
      select: { date: true }
    });

    const existingDates = new Set(
      existingBreaks.map(b => b.date.toISOString().split('T')[0])
    );

    // 新規break作成
    const breakDataToAdd = targetDates
      .filter(date => !existingDates.has(date.toISOString().split('T')[0]))
      .map(date => ({
        staffId,
        date,
        status: 'break',
        start: new Date(`${date.toISOString().split('T')[0]}T12:00:00+09:00`),
        end: new Date(`${date.toISOString().split('T')[0]}T13:00:00+09:00`),
        memo: '昼休み（勤務日追加により自動追加）',
        reason: '勤務日追加による自動追加',
        isPending: false,
        updatedAt: new Date()
      }));

    if (breakDataToAdd.length > 0) {
      const result = await this.prisma.adjustment.createMany({
        data: breakDataToAdd,
        skipDuplicates: true
      });
      return result.count;
    }

    return 0;
  }

  // 【バッチ処理最適化版】社員インポート時の自動昼休み追加メソッド
  private async addAutomaticLunchBreaks(staffId: number, importDate: Date) {
    console.log(`=== 自動昼休み追加開始: スタッフID ${staffId} ===`);
    
    try {
      // 該当スタッフの契約勤務時間を取得
      const contract = await this.prisma.contract.findFirst({
        where: { staffId }
      });

      if (!contract) {
        console.log(`契約データが見つかりません: スタッフID ${staffId}`);
        return { added: 0, details: [] };
      }

      // 勤務日（契約時間が設定されている曜日）を特定
      const workingDays = [];
      const dayHoursMapping = [
        { dayOfWeek: 1, hours: contract.mondayHours, name: '月曜日' },
        { dayOfWeek: 2, hours: contract.tuesdayHours, name: '火曜日' },
        { dayOfWeek: 3, hours: contract.wednesdayHours, name: '水曜日' },
        { dayOfWeek: 4, hours: contract.thursdayHours, name: '木曜日' },
        { dayOfWeek: 5, hours: contract.fridayHours, name: '金曜日' },
        { dayOfWeek: 6, hours: contract.saturdayHours, name: '土曜日' },
        { dayOfWeek: 0, hours: contract.sundayHours, name: '日曜日' }
      ];

      dayHoursMapping.forEach(day => {
        if (day.hours && day.hours.trim()) {
          workingDays.push(day.dayOfWeek);
          console.log(`勤務日検出: ${day.name} (${day.hours})`);
        }
      });

      if (workingDays.length === 0) {
        console.log(`勤務日が設定されていません: スタッフID ${staffId}`);
        return { added: 0, details: [] };
      }

      // 【バッチ処理最適化】対象期間の昼休み対象日を効率的に計算
      const endDate = new Date(importDate);
      endDate.setMonth(endDate.getMonth() + 3);
      
      // 対象日をまず全て収集
      const targetDates = [];
      const currentDate = new Date(importDate);
      
      while (currentDate <= endDate) {
        if (workingDays.includes(currentDate.getDay())) {
          targetDates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`対象日数: ${targetDates.length}日`);
      
      if (targetDates.length === 0) {
        console.log('昼休み追加対象日がありません');
        return { added: 0, details: [] };
      }

      // 【最適化】既存のbreak一括チェック（N回のクエリ → 1回のクエリ）
      const startDateStr = targetDates[0].toISOString().split('T')[0];
      const endDateStr = targetDates[targetDates.length - 1].toISOString().split('T')[0];
      
      const existingBreaks = await this.prisma.adjustment.findMany({
        where: {
          staffId,
          status: 'break',
          date: {
            gte: new Date(startDateStr),
            lte: new Date(endDateStr)
          },
          start: {
            gte: new Date(`${startDateStr}T12:00:00+09:00`),
            lte: new Date(`${endDateStr}T12:00:00+09:00`)
          },
          end: {
            gte: new Date(`${startDateStr}T13:00:00+09:00`),
            lte: new Date(`${endDateStr}T13:00:00+09:00`)
          }
        },
        select: { date: true }
      });
      
      // 【最適化】既存breakの日付セット作成（O(1)検索用）
      const existingBreakDates = new Set(
        existingBreaks.map(b => b.date.toISOString().split('T')[0])
      );
      
      console.log(`既存break数: ${existingBreaks.length}件`);

      // 【最適化】追加が必要な日付のみを抽出
      const breakDataToAdd = [];
      for (const targetDate of targetDates) {
        const dateString = targetDate.toISOString().split('T')[0];
        
        // 既存breakチェック（O(1)の高速検索）
        if (!existingBreakDates.has(dateString)) {
          breakDataToAdd.push({
            staffId,
            date: new Date(dateString),
            status: 'break',
            start: new Date(`${dateString}T12:00:00+09:00`),
            end: new Date(`${dateString}T13:00:00+09:00`),
            memo: '昼休み（社員インポート時自動追加）',
            reason: '社員インポート時自動追加',
            isPending: false,
            updatedAt: new Date()
          });
        }
      }

      console.log(`昼休み追加対象: ${breakDataToAdd.length}件`);

      // 【最適化】一括INSERT（N回のINSERT → 1回の一括INSERT）
      let addedCount = 0;
      const addedBreaks = [];
      
      if (breakDataToAdd.length > 0) {
        try {
          const result = await this.prisma.adjustment.createMany({
            data: breakDataToAdd,
            skipDuplicates: true // 重複時はスキップ
          });
          addedCount = result.count;
          console.log(`昼休み一括追加完了: ${addedCount}件`);
          
          // 詳細情報は簡略化（パフォーマンス優先）
          breakDataToAdd.slice(0, addedCount).forEach((data, index) => {
            addedBreaks.push({
              date: data.date.toISOString().split('T')[0],
              adjustmentId: `batch-${index + 1}` // 実際のIDは取得しない（性能優先）
            });
          });
        } catch (error) {
          console.error('昼休み一括追加エラー:', error);
          throw error;
        }
      }

      console.log(`=== 自動昼休み追加完了: ${addedCount}件追加 ===`);
      return {
        added: addedCount,
        details: addedBreaks,
        totalTargetDates: targetDates.length,
        existingBreaks: existingBreaks.length
      };

    } catch (error) {
      console.error('自動昼休み追加処理でエラー:', error);
      return { added: 0, details: [], error: error.message };
    }
  }

  // テスト用の公開メソッド
  async testAddLunchBreaks(staffId: number) {
    console.log(`=== テスト用昼休み追加開始: スタッフID ${staffId} ===`);
    return this.addAutomaticLunchBreaks(staffId, new Date());
  }

  // 契約表示キャッシュ生成メソッド（公開）
  async generateContractDisplayCache(staffIds: number[], monthsAhead: number = 3) {
    console.log(`=== 契約表示キャッシュ生成開始: ${staffIds.length}名、${monthsAhead}ヶ月分 ===`);

    try {
      // 対象期間の計算
      const currentDate = new Date();
      const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthsAhead, 1);
      
      console.log(`期間: ${startMonth.toISOString().split('T')[0]} ～ ${endMonth.toISOString().split('T')[0]}`);

      // 対象スタッフの契約データを取得
      const contracts = await this.prisma.contract.findMany({
        where: { 
          staffId: { in: staffIds } 
        },
        select: {
          staffId: true,
          mondayHours: true,
          tuesdayHours: true,
          wednesdayHours: true,
          thursdayHours: true,
          fridayHours: true,
          saturdayHours: true,
          sundayHours: true
        }
      });

      console.log(`取得した契約データ: ${contracts.length}件`);

      // キャッシュデータの生成
      const cacheEntries = [];
      const contractMap = new Map(contracts.map(c => [c.staffId, c]));

      for (const staffId of staffIds) {
        const contract = contractMap.get(staffId);
        
        // 各月の各日についてキャッシュ生成
        for (let monthOffset = 0; monthOffset < monthsAhead; monthOffset++) {
          const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
          const year = targetMonth.getFullYear();
          const month = targetMonth.getMonth() + 1; // 1-based month
          const daysInMonth = new Date(year, month, 0).getDate();

          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜
            
            // 契約勤務時間の有無を判定
            let hasContract = false;
            if (contract) {
              const dayKeys = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
              const dayKey = dayKeys[dayOfWeek];
              const workHours = contract[dayKey];
              hasContract = workHours != null && typeof workHours === 'string' && workHours.trim() !== '';
            }

            cacheEntries.push({
              staffId,
              year,
              month,
              day,
              hasContract
            });
          }
        }
      }

      console.log(`生成されたキャッシュエントリ: ${cacheEntries.length}件`);

      // 既存キャッシュを削除（対象期間・対象スタッフ）
      await this.prisma.contractDisplayCache.deleteMany({
        where: {
          staffId: { in: staffIds },
          year: {
            gte: startMonth.getFullYear(),
            lte: endMonth.getFullYear()
          },
          month: {
            gte: startMonth.getFullYear() === endMonth.getFullYear() ? startMonth.getMonth() + 1 : 1,
            lte: startMonth.getFullYear() === endMonth.getFullYear() ? endMonth.getMonth() + 1 : 12
          }
        }
      });

      // 新しいキャッシュを一括挿入
      if (cacheEntries.length > 0) {
        await this.prisma.contractDisplayCache.createMany({
          data: cacheEntries,
          skipDuplicates: true
        });
      }

      console.log(`=== 契約表示キャッシュ生成完了: ${cacheEntries.length}件挿入 ===`);
      return {
        generatedEntries: cacheEntries.length,
        staffCount: staffIds.length,
        monthsAhead
      };

    } catch (error) {
      console.error('契約表示キャッシュ生成エラー:', error);
      throw error;
    }
  }

  async syncFromEmployeeData(jsonData: any) {
    try {
      console.log('=== 完全同期型社員情報同期開始 ===');
      console.log('受信データ:', JSON.stringify(jsonData, null, 2));
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        console.error('JSONフォーマットエラー:', jsonData);
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData: EmployeeData[] = jsonData.employeeData;
      console.log(`対象データ: ${employeeData.length}件`);
      
      // 受信データの構造をデバッグ
      console.log('最初のデータサンプル:', JSON.stringify(employeeData[0], null, 2));

      // 既存のアクティブスタッフを取得
      const existingStaff = await this.prisma.staff.findMany({
        where: { isActive: true },
        select: { empNo: true, name: true }
      });

      // インポートデータのempNoリスト
      const importEmpNos = new Set(employeeData.map(emp => emp.empNo));

      // 論理削除対象（インポートデータにない既存スタッフ）
      const staffToDelete = existingStaff.filter(staff => 
        staff.empNo && !importEmpNos.has(staff.empNo)
      );

      console.log(`削除予定スタッフ: ${staffToDelete.length}件`);
      staffToDelete.forEach(staff => 
        console.log(`- ${staff.name} (${staff.empNo})`)
      );

      const result = {
        added: 0,
        updated: 0,
        deleted: staffToDelete.length,
        details: { 
          added: [], 
          updated: [], 
          deleted: staffToDelete.map(s => s.name) 
        }
      };

      // empNo基準でupsert処理（Prisma upsertを使用）
      for (const emp of employeeData) {
        console.log(`処理中: ${emp.name} (${emp.empNo})`);
        console.log(`データ詳細: dept="${emp.dept}", department="${emp.department}", team="${emp.team}"`);
        
        // 必須フィールドの確認と変換（dept優先、department後方互換）
        const empData = emp as any; // 型アサーション
        let department: string = 'システム部署'; // デフォルト値
        
        if (empData.dept && typeof empData.dept === 'string' && empData.dept.trim()) {
          department = empData.dept.trim();
        } else if (empData.department && typeof empData.department === 'string' && empData.department.trim()) {
          department = empData.department.trim();
        }
        
        const team = empData.team || 'システムチーム';
        
        console.log(`フィールド確認: dept="${empData.dept}", department="${empData.department}"`);
        console.log(`最終決定部署: "${department}" (type: ${typeof department})`);
        
        try {
          // スタッフをupsert（empNoが一致する場合は更新、しない場合は作成）
          const staff = await this.prisma.staff.upsert({
            where: { empNo: emp.empNo },
            update: {
              name: emp.name,
              department: department,
              group: team,
              isActive: true,
              deletedAt: null // 論理削除解除
            },
            create: {
              empNo: emp.empNo,
              name: emp.name,
              department: department,
              group: team,
              isActive: true
            },
            include: {
              Contract: true,
              Adjustment: true
            }
          });

          // 新規作成かどうかの判定（既存のContractデータで判定）
          const isUpdate = staff.Contract.length > 0;
          console.log(`スタッフ${isUpdate ? '更新' : '新規作成'}完了: ${staff.name} (ID: ${staff.id})`);
          if (isUpdate) {
            console.log(`既存調整データ件数: ${staff.Adjustment.length}件`);
          }

          // 【契約変更検知システム】既存契約の取得
          const oldContract = isUpdate ? await this.prisma.contract.findFirst({
            where: { empNo: emp.empNo }
          }) : null;

          // 新しい契約データの準備
          const newContractData = {
            name: emp.name,
            dept: empData.dept || empData.department || 'システム部署',
            team: empData.team || 'システムチーム',
            email: empData.email || '',
            mondayHours: empData.mondayHours || null,
            tuesdayHours: empData.tuesdayHours || null,
            wednesdayHours: empData.wednesdayHours || null,
            thursdayHours: empData.thursdayHours || null,
            fridayHours: empData.fridayHours || null,
            saturdayHours: empData.saturdayHours || null,
            sundayHours: empData.sundayHours || null,
            staffId: staff.id
          };

          // 【契約変更検知・処理】
          const changeDetection = await this.detectAndHandleContractChange(
            staff.id, 
            newContractData, 
            oldContract
          );

          if (changeDetection.hasChanges) {
            console.log(`契約変更処理完了: ログID ${changeDetection.changeLogId}`);
          }

          // 契約をupsert（変更検知後の更新）
          const contract = await this.prisma.contract.upsert({
            where: { empNo: emp.empNo },
            update: newContractData,
            create: {
              empNo: emp.empNo,
              ...newContractData
            }
          });
          console.log(`契約${isUpdate ? '更新' : '新規作成'}完了: ${contract.name}`);

          // 昼休み自動追加（新規作成時のみ実行）
          if (!isUpdate) {
            console.log(`=== 新規スタッフ ${emp.name} に昼休み自動追加開始 ===`);
            const lunchBreakResult = await this.addAutomaticLunchBreaks(staff.id, new Date());
            console.log(`昼休み自動追加結果: ${lunchBreakResult.added}件追加`);
            if (lunchBreakResult.error) {
              console.error(`昼休み自動追加エラー: ${lunchBreakResult.error}`);
            }
          }

          if (isUpdate) {
            result.updated++;
            result.details.updated.push(emp.name);
          } else {
            result.added++;
            result.details.added.push(emp.name);
          }
        } catch (empError) {
          console.error(`社員 ${emp.name} の処理でエラー:`, empError);
          throw empError;
        }
      }

      // インポートファイルにない既存スタッフを論理削除
      if (staffToDelete.length > 0) {
        console.log('=== 論理削除実行開始 ===');
        for (const staffToDeleteItem of staffToDelete) {
          if (staffToDeleteItem.empNo) {
            await this.prisma.staff.update({
              where: { empNo: staffToDeleteItem.empNo },
              data: {
                isActive: false,
                deletedAt: new Date()
              }
            });
            console.log(`論理削除完了: ${staffToDeleteItem.name} (${staffToDeleteItem.empNo})`);
          }
        }
        console.log(`=== 論理削除完了: ${staffToDelete.length}件 ===`);
      }

      // 【新機能】契約表示キャッシュの生成
      console.log('=== 契約表示キャッシュ生成開始 ===');
      try {
        // 更新されたスタッフのIDを収集
        const updatedStaffIds = [];
        for (const emp of employeeData) {
          const staff = await this.prisma.staff.findUnique({
            where: { empNo: emp.empNo },
            select: { id: true }
          });
          if (staff) {
            updatedStaffIds.push(staff.id);
          }
        }
        
        if (updatedStaffIds.length > 0) {
          const cacheResult = await this.generateContractDisplayCache(updatedStaffIds, 3);
          console.log(`契約表示キャッシュ生成完了: ${cacheResult.generatedEntries}件`);
        } else {
          console.log('キャッシュ生成対象のスタッフがいません');
        }
      } catch (cacheError) {
        console.error('契約表示キャッシュ生成でエラー（処理は継続）:', cacheError);
        // キャッシュ生成エラーは主処理に影響させない
      }

      console.log('=== 完全同期完了 ===');
      console.log(`追加: ${result.added}件, 更新: ${result.updated}件, 論理削除: ${result.deleted}件`);
      console.log('重要: 過去のスケジュールデータ（Adjustment）は完全保持されました');
      console.log('論理削除されたスタッフは復元可能です（isActive: true で復活）');
      return result;

    } catch (error) {
      console.error('同期エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // より詳細なエラー情報を含む新しいエラーを投げる
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(`同期処理でエラーが発生しました: ${error.message}`);
      }
    }
  }

  // === 管理者権限管理用メソッド（Phase 5） ===

  // 管理者権限管理用のスタッフ一覧取得（管理者権限情報含む）
  async findAllForManagement() {
    console.log('=== 管理者権限管理用スタッフ一覧取得開始 ===');
    try {
      const staff = await this.prisma.staff.findMany({
        select: {
          id: true,
          name: true,
          department: true,
          group: true,
          empNo: true,
          isActive: true,
          // 管理者権限関連フィールド
          isManager: true,
          managerDepartments: true,
          managerPermissions: true,
          managerActivatedAt: true,
          // 認証情報
          user_auth: {
            select: {
              id: true,
              email: true,
              userType: true,
              isActive: true,
              lastLoginAt: true
            }
          }
        },
        orderBy: [
          { department: 'asc' },
          { group: 'asc' }, 
          { name: 'asc' }
        ]
      });

      console.log(`管理者権限管理用スタッフ取得完了: ${staff.length}件`);
      return staff;
    } catch (error) {
      console.error('管理者権限管理用スタッフ取得エラー:', error);
      throw new Error(`スタッフ一覧取得に失敗しました: ${error.message}`);
    }
  }

  // 利用可能な部署一覧取得
  async getAvailableDepartments() {
    console.log('=== 利用可能部署一覧取得開始 ===');
    try {
      // アクティブなスタッフから部署一覧を取得
      const departments = await this.prisma.staff.findMany({
        where: { isActive: true },
        select: { department: true },
        distinct: ['department'],
        orderBy: { department: 'asc' }
      });

      const departmentNames = departments.map(d => d.department);
      console.log(`利用可能部署取得完了: ${departmentNames.length}件`, departmentNames);
      return departmentNames;
    } catch (error) {
      console.error('部署一覧取得エラー:', error);
      throw new Error(`部署一覧取得に失敗しました: ${error.message}`);
    }
  }

  // 管理者権限更新
  async updateManagerPermissions(
    staffId: number, 
    updateData: {
      isManager: boolean;
      managerDepartments?: string[];
      managerPermissions?: string[];
      updatedBy?: string;
    }
  ) {
    console.log(`=== 管理者権限更新開始: スタッフID ${staffId} ===`, updateData);
    
    try {
      // 対象スタッフの存在確認
      const existingStaff = await this.prisma.staff.findUnique({
        where: { id: staffId },
        select: { 
          id: true, 
          name: true, 
          isManager: true,
          managerDepartments: true,
          managerPermissions: true
        }
      });

      if (!existingStaff) {
        throw new Error(`スタッフID ${staffId} が見つかりません`);
      }

      // 権限更新処理
      const updatedStaff = await this.prisma.staff.update({
        where: { id: staffId },
        data: {
          isManager: updateData.isManager,
          managerDepartments: updateData.managerDepartments || [],
          managerPermissions: (updateData.managerPermissions || []) as any,
          managerActivatedAt: updateData.isManager ? new Date() : null
        },
        select: {
          id: true,
          name: true,
          department: true,
          group: true,
          isManager: true,
          managerDepartments: true,
          managerPermissions: true,
          managerActivatedAt: true
        }
      });

      // 監査ログ記録
      await this.createManagerAuditLog({
        managerId: 1, // TODO: 実際の更新者IDを使用
        targetStaffId: staffId,
        action: updateData.isManager ? 'GRANT_MANAGER' : 'REVOKE_MANAGER',
        resource: 'staff_permission',
        resourceId: staffId.toString(),
        details: JSON.stringify({
          before: {
            isManager: existingStaff.isManager,
            managerDepartments: existingStaff.managerDepartments,
            managerPermissions: existingStaff.managerPermissions
          },
          after: {
            isManager: updateData.isManager,
            managerDepartments: updateData.managerDepartments,
            managerPermissions: updateData.managerPermissions
          },
          updatedBy: updateData.updatedBy || 'システム'
        })
      });

      console.log(`管理者権限更新完了: ${existingStaff.name}`, updatedStaff);
      return updatedStaff;

    } catch (error) {
      console.error('管理者権限更新エラー:', error);
      throw new Error(`管理者権限更新に失敗しました: ${error.message}`);
    }
  }

  // 管理者監査ログ取得
  async getManagerAuditLogs(staffId?: number) {
    console.log(`=== 管理者監査ログ取得開始: スタッフID ${staffId || '全件'} ===`);
    
    try {
      const whereCondition = staffId ? { targetStaffId: staffId } : {};
      
      const logs = await this.prisma.managerAuditLog.findMany({
        where: whereCondition,
        include: {
          Manager: {
            select: { id: true, name: true, department: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 100 // 最新100件
      });

      console.log(`監査ログ取得完了: ${logs.length}件`);
      return logs;
    } catch (error) {
      console.error('監査ログ取得エラー:', error);
      throw new Error(`監査ログ取得に失敗しました: ${error.message}`);
    }
  }

  // 監査ログ作成用のプライベートメソッド
  private async createManagerAuditLog(logData: {
    managerId: number;
    targetStaffId?: number;
    action: string;
    resource: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const log = await this.prisma.managerAuditLog.create({
        data: {
          managerId: logData.managerId,
          targetStaffId: logData.targetStaffId,
          action: logData.action,
          resource: logData.resource,
          resourceId: logData.resourceId,
          details: logData.details,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent
        }
      });
      
      console.log('監査ログ作成完了:', log.id);
      return log;
    } catch (error) {
      console.error('監査ログ作成エラー:', error);
      // 監査ログ作成エラーは業務処理を止めない
    }
  }

  // 【チャンク処理 + 非同期処理】社員インポート（プログレス通知付き）
  async syncFromEmployeeDataWithProgress(jsonData: any, importId?: string) {
    const actualImportId = importId || `import-${Date.now()}`;
    
    try {
      console.log('=== チャンク処理社員情報同期開始 ===');
      console.log('受信データ:', JSON.stringify(jsonData, null, 2));
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        console.error('JSONフォーマットエラー:', jsonData);
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData: EmployeeData[] = jsonData.employeeData;
      console.log(`対象データ: ${employeeData.length}件`);

      // 初期進捗通知
      this.progressGateway.notifyImportStarted(actualImportId, employeeData.length);

      // チャンク処理で社員データを処理
      const results = await this.chunkImportService.processStaffImportInChunks(
        employeeData,
        async (emp: EmployeeData, index: number) => {
          // 各社員の処理
          console.log(`処理中: ${emp.name} (${index + 1}/${employeeData.length})`);
          
          try {
            // 既存の個別社員処理ロジックを呼び出し
            return await this.processSingleEmployee(emp);
          } catch (error) {
            console.error(`社員処理エラー: ${emp.name}`, error);
            throw error;
          }
        },
        {
          importId: actualImportId,
          chunkSize: 25, // 25人ずつ処理
          onStaffProcessed: (staff, result, index) => {
            console.log(`完了: ${staff.name} (${index + 1}件目)`);
          }
        }
      );

      // 最終集計
      const summary = {
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };

      console.log('=== チャンク処理完了 ===', summary);
      
      // ContractDisplayCache生成（月次プランナー用）
      try {
        console.log('🟢 ContractDisplayCache生成開始');
        console.log(`🟢 results配列: ${results.length}件`);
        console.log('🟢 results詳細:', results.slice(0, 3));
        
        const updatedStaffIds = results
          .filter(r => r.success && r.staff?.id)
          .map(r => r.staff.id);
        
        console.log(`🟢 抽出されたstaffIds: ${updatedStaffIds.length}件`, updatedStaffIds.slice(0, 5));
        
        if (updatedStaffIds.length > 0) {
          console.log('🟢 generateContractDisplayCache呼び出し開始');
          const cacheResult = await this.generateContractDisplayCache(updatedStaffIds, 3);
          console.log(`🟢 ContractDisplayCache生成完了: ${cacheResult.generatedEntries}件`);
          
          // 進捗通知にキャッシュ生成情報を追加
          (summary as any).contractDisplayCacheGenerated = cacheResult.generatedEntries;
        } else {
          console.log('🔴 ContractDisplayCache生成対象のスタッフがいません');
          (summary as any).contractDisplayCacheGenerated = 0;
        }
      } catch (cacheError) {
        console.error('🔴 ContractDisplayCache生成エラー:', cacheError);
        (summary as any).contractDisplayCacheError = cacheError.message;
      }
      
      // 完了通知
      this.progressGateway.notifyImportCompleted(actualImportId, summary);
      
      return summary;

    } catch (error) {
      console.error('チャンク処理社員同期でエラー:', error);
      this.progressGateway.notifyImportError(actualImportId, error);
      throw new BadRequestException(`チャンク処理でエラーが発生しました: ${error.message}`);
    }
  }

  // 個別社員処理ロジック（既存のsyncFromEmployeeDataから抽出）
  private async processSingleEmployee(emp: EmployeeData) {
    try {
      console.log(`=== 個別社員処理開始: ${emp.name} ===`);

      // 既存のsyncFromEmployeeDataの個別処理ロジックをここに移動
      // （スペースの関係で簡略化、実際は既存の処理をコピー）
      
      // 部署名の統一処理
      let department = '部署未設定';
      const empData = emp as any;
      
      if (empData.dept && empData.dept.trim()) {
        department = empData.dept.trim();
      } else if (empData.department && empData.department.trim()) {
        department = empData.department.trim();
      }
      
      const team = empData.team || 'システムチーム';
      
      // スタッフをupsert
      const staff = await this.prisma.staff.upsert({
        where: { empNo: emp.empNo },
        update: {
          name: emp.name,
          department: department,
          group: team,
          isActive: true,
          deletedAt: null
        },
        create: {
          empNo: emp.empNo,
          name: emp.name,
          department: department,
          group: team,
          isActive: true
        },
        include: {
          Contract: true
        }
      });

      const isUpdate = staff.Contract.length > 0;
      console.log(`スタッフ${isUpdate ? '更新' : '新規作成'}完了: ${staff.name} (ID: ${staff.id})`);

      // 契約変更検知・処理
      const oldContract = isUpdate ? await this.prisma.contract.findFirst({
        where: { empNo: emp.empNo }
      }) : null;

      const newContractData = {
        name: emp.name,
        dept: empData.dept || empData.department || 'システム部署',
        team: empData.team || 'システムチーム',
        email: empData.email || '',
        mondayHours: empData.mondayHours || null,
        tuesdayHours: empData.tuesdayHours || null,
        wednesdayHours: empData.wednesdayHours || null,
        thursdayHours: empData.thursdayHours || null,
        fridayHours: empData.fridayHours || null,
        saturdayHours: empData.saturdayHours || null,
        sundayHours: empData.sundayHours || null,
        staffId: staff.id
      };

      const changeDetection = await this.detectAndHandleContractChange(
        staff.id, 
        newContractData, 
        oldContract
      );

      // 契約をupsert
      const contract = await this.prisma.contract.upsert({
        where: { empNo: emp.empNo },
        update: newContractData,
        create: {
          empNo: emp.empNo,
          ...newContractData
        }
      });

      // 昼休み自動追加（新規作成時のみ）
      let breakResult = null;
      if (!isUpdate) {
        console.log(`=== 新規スタッフ ${emp.name} に昼休み自動追加開始 ===`);
        breakResult = await this.addAutomaticLunchBreaks(staff.id, new Date());
        console.log(`昼休み自動追加結果: ${breakResult.added}件追加`);
      }

      return {
        success: true,
        staff: staff,
        contract: contract,
        changeDetection: changeDetection,
        breakResult: breakResult,
        action: isUpdate ? 'updated' : 'created'
      };

    } catch (error) {
      console.error(`個別社員処理エラー: ${emp.name}`, error);
      return {
        success: false,
        employee: emp,
        error: error.message
      };
    }
  }
}