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
    console.log('Processing JSON data for staff sync...');
    
    if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
      throw new BadRequestException('Invalid JSON format: employeeData array not found');
    }

    const employeeData = jsonData.employeeData;
    console.log(`Found ${employeeData.length} employees in JSON`);

    // JSONデータを正規化（name=name, department=dept, group=team）
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
        // 関連するスケジュールを先に削除
        await this.prisma.schedule.deleteMany({
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
  }
}