import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
  constructor(private prisma: PrismaService) {}

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
            include: { Contract: true, Adjustment: true }
          });

          const isUpdate = staff.Contract.length > 0;
          console.log(`スタッフ${isUpdate ? '更新' : '新規作成'}完了: ${staff.name} (ID: ${staff.id})`);
          if (isUpdate) {
            console.log(`既存調整データ件数: ${staff.Adjustment.length}件`);
          }

          // 契約をupsert（曜日別勤務時間を含む）
          const contract = await this.prisma.contract.upsert({
            where: { empNo: emp.empNo },
            update: {
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
            },
            create: {
              empNo: emp.empNo,
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
            }
          });
          console.log(`契約${isUpdate ? '更新' : '新規作成'}完了: ${contract.name}`);

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
}