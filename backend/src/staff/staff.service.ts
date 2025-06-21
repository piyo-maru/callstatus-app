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

  async syncFromEmployeeData(jsonData: any) {
    try {
      console.log('=== レイヤー2保持型社員情報同期開始 ===');
      console.log('受信データ:', JSON.stringify(jsonData, null, 2));
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        console.error('JSONフォーマットエラー:', jsonData);
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData = jsonData.employeeData;
      console.log(`対象データ: ${employeeData.length}件`);

      const result = {
        added: 0,
        updated: 0,
        deleted: 0,
        details: { added: [], updated: [], deleted: [] }
      };

      // empNo基準でupsert処理（Prisma upsertを使用）
      for (const emp of employeeData) {
        console.log(`処理中: ${emp.name} (${emp.empNo})`);
        
        try {
          // スタッフをupsert（empNoが一致する場合は更新、しない場合は作成）
          const staff = await this.prisma.staff.upsert({
            where: { empNo: emp.empNo },
            update: {
              name: emp.name,
              department: emp.dept,
              group: emp.team,
              isActive: true,
              deletedAt: null // 論理削除解除
            },
            create: {
              empNo: emp.empNo,
              name: emp.name,
              department: emp.dept,
              group: emp.team,
              isActive: true
            },
            include: { contracts: true, adjustments: true }
          });

          const isUpdate = staff.contracts.length > 0;
          console.log(`スタッフ${isUpdate ? '更新' : '新規作成'}完了: ${staff.name} (ID: ${staff.id})`);
          if (isUpdate) {
            console.log(`既存調整データ件数: ${staff.adjustments.length}件`);
          }

          // 契約をupsert
          const contract = await this.prisma.contract.upsert({
            where: { empNo: emp.empNo },
            update: {
              name: emp.name,
              dept: emp.dept,
              team: emp.team,
              email: emp.email || '',
              mondayHours: emp.mondayHours || null,
              tuesdayHours: emp.tuesdayHours || null,
              wednesdayHours: emp.wednesdayHours || null,
              thursdayHours: emp.thursdayHours || null,
              fridayHours: emp.fridayHours || null,
              saturdayHours: emp.saturdayHours || null,
              sundayHours: emp.sundayHours || null,
              staffId: staff.id
            },
            create: {
              empNo: emp.empNo,
              name: emp.name,
              dept: emp.dept,
              team: emp.team,
              email: emp.email || '',
              mondayHours: emp.mondayHours || null,
              tuesdayHours: emp.tuesdayHours || null,
              wednesdayHours: emp.wednesdayHours || null,
              thursdayHours: emp.thursdayHours || null,
              fridayHours: emp.fridayHours || null,
              saturdayHours: emp.saturdayHours || null,
              sundayHours: emp.sundayHours || null,
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

      console.log('=== 同期完了 ===');
      console.log(`追加: ${result.added}件, 更新: ${result.updated}件`);
      console.log('重要: レイヤー2データ（Adjustment）は保持されました');
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