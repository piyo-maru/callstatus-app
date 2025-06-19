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

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // 文字チェック関数
  private checkSupportedCharacters(data: Array<{name: string; department: string; group: string}>): CharacterCheckResult {
    // JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号の範囲
    const supportedCharsRegex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff5e\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f]*$/;
    
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
      orderBy: { id: 'asc' }
    });
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
      where: { id }
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return this.prisma.staff.delete({
      where: { id }
    });
  }

  async syncFromEmployeeData(jsonData: any) {
    try {
      console.log('Processing JSON data for staff sync...');
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData = jsonData.employeeData;
      console.log(`Found ${employeeData.length} employees in JSON`);

    // 新フォーマット対応: empNo, contract情報を含むデータをチェック
    for (const emp of employeeData) {
      if (!emp.empNo || !emp.name || !emp.dept || !emp.team) {
        throw new BadRequestException('Invalid employee data: empNo, name, dept, team are required');
      }
      if (!emp.contract || !emp.contract.workDays || !emp.contract.workHours) {
        throw new BadRequestException('Invalid contract data: workDays and workHours are required');
      }
    }

    // JSONデータを正規化（Staffテーブル用）
    const newStaffData = employeeData.map((emp: any) => ({
      name: emp.name,
      department: emp.dept,
      group: emp.team
    }));

    // 文字チェックを実行
    console.log('Performing character validation...');
    const characterCheck = this.checkSupportedCharacters(newStaffData);
    
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

    console.log('Character validation passed');

    // レイヤー1（契約）データの同期処理
    console.log('Syncing contract data (Layer 1)...');
    let contractSyncResult;
    try {
      contractSyncResult = await this.syncContractData(employeeData);
      console.log('Contract sync completed:', contractSyncResult);
    } catch (error) {
      console.error('Contract sync failed:', error);
      // 契約同期に失敗してもスタッフ同期は続行
      contractSyncResult = { created: 0, errors: [error.message] };
    }

    // 既存のスタッフデータを取得
    const existingStaff = await this.prisma.staff.findMany();
    console.log(`Found ${existingStaff.length} existing staff members`);

    // 同期処理
    const result = {
      added: 0,
      updated: 0,
      deleted: 0,
      details: {
        added: [] as string[],
        updated: [] as string[],
        deleted: [] as string[]
      }
    };

    // 追加・更新処理
    for (const newStaff of newStaffData) {
      if (!newStaff.name || !newStaff.department || !newStaff.group) {
        console.warn('Skipping invalid staff data:', newStaff);
        continue;
      }

      const existing = existingStaff.find(s => s.name === newStaff.name);
      
      if (existing) {
        // 更新が必要かチェック
        if (existing.department !== newStaff.department || existing.group !== newStaff.group) {
          await this.prisma.staff.update({
            where: { id: existing.id },
            data: {
              department: newStaff.department,
              group: newStaff.group
            }
          });
          result.updated++;
          result.details.updated.push(newStaff.name);
          console.log(`Updated staff: ${newStaff.name}`);
        }
      } else {
        // 新規追加
        await this.prisma.staff.create({
          data: newStaff
        });
        result.added++;
        result.details.added.push(newStaff.name);
        console.log(`Added staff: ${newStaff.name}`);
      }
    }

    // 削除処理（JSONにないスタッフを削除）
    const newStaffNames = new Set(newStaffData.map(s => s.name));
    for (const existing of existingStaff) {
      if (!newStaffNames.has(existing.name)) {
        // 関連するレコードを先に削除（外部キー制約対応）
        await this.prisma.schedule.deleteMany({
          where: { staffId: existing.id }
        });
        await this.prisma.temporaryAssignment.deleteMany({
          where: { staffId: existing.id }
        });
        await this.prisma.dailyAssignment.deleteMany({
          where: { staffId: existing.id }
        });
        await this.prisma.adjustment.deleteMany({
          where: { staffId: existing.id }
        });
        await this.prisma.monthlySchedule.deleteMany({
          where: { staffId: existing.id }
        });
        await this.prisma.contract.deleteMany({
          where: { staffId: existing.id }
        });
        
        await this.prisma.staff.delete({
          where: { id: existing.id }
        });
        result.deleted++;
        result.details.deleted.push(existing.name);
        console.log(`Deleted staff: ${existing.name}`);
      }
    }

    console.log('Staff sync completed:', result);
    return result;
    } catch (error) {
      console.error('Error in syncFromEmployeeData:', error);
      throw error;
    }
  }

  /**
   * 勤務日データを配列に変換
   */
  private parseWorkDays(workDays: string | string[]): string[] {
    if (Array.isArray(workDays)) {
      return workDays;
    }
    
    // 文字列の場合は、漢字から英語略語に変換
    const dayMap: { [key: string]: string } = {
      '月': 'mon',
      '火': 'tue',
      '水': 'wed',
      '木': 'thu',
      '金': 'fri',
      '土': 'sat',
      '日': 'sun'
    };
    
    const result: string[] = [];
    for (const char of workDays) {
      if (dayMap[char]) {
        result.push(dayMap[char]);
      }
    }
    
    return result;
  }

  /**
   * 契約データ（レイヤー1）の同期処理
   */
  private async syncContractData(employeeData: any[]) {
    try {
      console.log('Starting contract data synchronization...');
      
      // 既存の契約データを全削除（年次更新時の洗い替え）
      await this.prisma.contract.deleteMany({});
      console.log('Existing contract data cleared');

    const contractResults = {
      created: 0,
      errors: [] as string[]
    };

    for (const emp of employeeData) {
      try {
        // Staffテーブルから該当するスタッフを検索（name, department, groupで）
        const staff = await this.prisma.staff.findFirst({
          where: {
            name: emp.name,
            department: emp.dept,
            group: emp.team
          }
        });

        if (!staff) {
          // スタッフが存在しない場合はまず作成
          const newStaff = await this.prisma.staff.create({
            data: {
              name: emp.name,
              department: emp.dept,
              group: emp.team
            }
          });
          
          // 契約データを作成
          await this.prisma.contract.create({
            data: {
              empNo: emp.empNo,
              name: emp.name,
              dept: emp.dept,
              team: emp.team,
              email: emp.mail || '',
              mondayHours: emp.contract.mondayHours,
              tuesdayHours: emp.contract.tuesdayHours,
              wednesdayHours: emp.contract.wednesdayHours,
              thursdayHours: emp.contract.thursdayHours,
              fridayHours: emp.contract.fridayHours,
              saturdayHours: emp.contract.saturdayHours,
              sundayHours: emp.contract.sundayHours,
              staffId: newStaff.id
            }
          });
        } else {
          // 既存スタッフの契約データを作成
          await this.prisma.contract.create({
            data: {
              empNo: emp.empNo,
              name: emp.name,
              dept: emp.dept,
              team: emp.team,
              email: emp.mail || '',
              mondayHours: emp.contract.mondayHours,
              tuesdayHours: emp.contract.tuesdayHours,
              wednesdayHours: emp.contract.wednesdayHours,
              thursdayHours: emp.contract.thursdayHours,
              fridayHours: emp.contract.fridayHours,
              saturdayHours: emp.contract.saturdayHours,
              sundayHours: emp.contract.sundayHours,
              staffId: staff.id
            }
          });
        }
        
        contractResults.created++;
        console.log(`Contract created for: ${emp.name} (${emp.empNo})`);
        
      } catch (error) {
        const errorMsg = `Failed to create contract for ${emp.name} (${emp.empNo}): ${error.message}`;
        contractResults.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return contractResults;
    } catch (error) {
      console.error('Error in syncContractData:', error);
      throw error;
    }
  }
}