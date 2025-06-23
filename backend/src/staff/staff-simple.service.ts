import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StaffSimpleService {
  constructor(private prisma: PrismaService) {}

  async syncFromEmployeeData(employeeData: any[]) {
    try {
      console.log(`=== 完全リセット方式でのインポート開始 ===`);
      console.log(`対象データ: ${employeeData.length}件`);

      // 1. 全データクリア
      await this.prisma.contract.deleteMany({});
      await this.prisma.staff.deleteMany({});
      console.log('全データクリア完了');

      const result = {
        added: 0,
        updated: 0,
        deleted: 0,
        details: { added: [], updated: [], deleted: [] }
      };

      // 2. 全データを新規作成
      for (const emp of employeeData) {
        console.log(`処理中: ${emp.name} (${emp.empNo})`);
        
        // スタッフ作成
        const staff = await this.prisma.staff.create({
          data: {
            empNo: emp.empNo,
            name: emp.name,
            department: emp.dept || emp.department,
            group: emp.team,
            isActive: true
          }
        });

        // 契約作成
        await this.prisma.contract.create({
          data: {
            empNo: emp.empNo,
            name: emp.name,
            dept: emp.dept || emp.department,
            team: emp.team,
            email: emp.email || '',
            staffId: staff.id
          }
        });

        result.added++;
        console.log(`✅ ${emp.name}の作成完了`);
      }

      console.log('=== インポート完了 ===');
      console.log(`作成: ${result.added}件`);
      return result;

    } catch (error) {
      console.error('インポートエラー:', error);
      throw error;
    }
  }

  async syncFromJson(jsonData: any) {
    try {
      console.log('Processing JSON data for staff sync...');
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        throw new BadRequestException('Invalid JSON format: employeeData array not found');
      }

      const employeeData = jsonData.employeeData;
      console.log(`Found ${employeeData.length} employees in JSON`);

      return await this.syncFromEmployeeData(employeeData);
    } catch (error) {
      console.error('Error in syncFromJson:', error);
      throw error;
    }
  }
}