import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MonthlyPlannerService {
  constructor(private prisma: PrismaService) {}

  // 契約表示キャッシュ取得
  async getDisplayCache(year: number, month: number) {
    console.log(`=== 契約表示キャッシュ取得: ${year}年${month}月 ===`);
    
    try {
      // 指定された年月のキャッシュデータを取得
      const cacheData = await this.prisma.contractDisplayCache.findMany({
        where: {
          year,
          month
        },
        select: {
          staffId: true,
          day: true,
          hasContract: true
        }
      });

      console.log(`取得したキャッシュデータ: ${cacheData.length}件`);

      // フロントエンド用の高速参照形式に変換
      // { "staffId-day": boolean } の形式
      const displayMap = {};
      cacheData.forEach(entry => {
        const key = `${entry.staffId}-${entry.day}`;
        displayMap[key] = entry.hasContract;
      });

      console.log(`変換後のキー数: ${Object.keys(displayMap).length}`);

      return {
        success: true,
        year,
        month,
        data: displayMap,
        count: cacheData.length
      };

    } catch (error) {
      console.error('契約表示キャッシュ取得エラー:', error);
      
      // エラー時は空のマップを返す（フロントエンドでの処理継続のため）
      return {
        success: false,
        year,
        month,
        data: {},
        count: 0,
        error: error.message
      };
    }
  }
}