import { Controller, Get, Post, Body, Query, HttpCode } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BackupService } from './backup/backup.service';
import * as bcrypt from 'bcrypt';
import * as os from 'os';
import * as process from 'process';

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private backupService: BackupService
  ) {}

  // 実際のCPU使用率を取得（100ms測定）
  private async getRealCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const elapTimeMS = currentTime[0] * 1000 + currentTime[1] / 1e6;
        const userPercent = (currentUsage.user / 1000) / elapTimeMS * 100;
        const systemPercent = (currentUsage.system / 1000) / elapTimeMS * 100;
        
        resolve(Math.round((userPercent + systemPercent) * 100) / 100);
      }, 100);
    });
  }

  // 実際のメモリ使用量を取得
  private getRealMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024),   // MB
      used: Math.round(usedMemory / 1024 / 1024),   // MB
      usagePercent: Math.round((usedMemory / totalMemory) * 100),
    };
  }

  // 実際のデータベースメトリクスを取得
  private async getRealDatabaseMetrics() {
    try {
      const startTime = Date.now();
      
      // 実際のクエリ実行時間測定
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      // 実際のスタッフ数取得
      const totalStaffCount = await this.prisma.staff.count(); // 総スタッフ数（論理削除含む）
      const activeStaffCount = await this.prisma.staff.count({
        where: { isActive: true }
      }); // アクティブスタッフ数
      
      // 今日のスケジュール数取得（2層データレイヤー対応）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Adjustment層の今日のデータ数
      const adjustmentCount = await this.prisma.adjustment.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // Contract層の今日のデータ数（activeStaffCountと同じ）
      // 各スタッフは今日の曜日に対応する契約があれば1件としてカウント
      const weekday = today.getDay(); // 0:日曜, 1:月曜, ..., 6:土曜
      const dayColumns = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
      const todayColumn = dayColumns[weekday];
      
      const contractCount = await this.prisma.contract.count({
        where: {
          [todayColumn]: {
            not: null
          }
        }
      });

      const todayScheduleCount = adjustmentCount + contractCount;

      return {
        responseTime: responseTime,
        totalStaffCount: totalStaffCount,
        activeStaffCount: activeStaffCount,
        todayScheduleCount: todayScheduleCount,
        errors: 0 // エラーカウンターは後で実装
      };
    } catch (error) {
      console.error('Database metrics error:', error);
      return {
        responseTime: 999,
        totalStaffCount: 0,
        activeStaffCount: 0,
        todayScheduleCount: 0,
        errors: 1
      };
    }
  }

  /**
   * API接続テスト用エンドポイント（認証不要）
   */
  @Get('test')
  async test() {
    return {
      message: 'API server is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'ok'
    };
  }

  /**
   * 実際のシステム監視メトリクス取得（システム管理者専用）
   * 225名企業の受付業務継続性重視
   */
  @Get('system-monitoring/metrics')
  async getSystemMonitoringMetrics() {
    const cpuUsage = await this.getRealCpuUsage();
    const memoryStats = this.getRealMemoryUsage();
    const dbStats = await this.getRealDatabaseMetrics();
    
    
    // システムヘルス判定
    let healthStatus = 'healthy';
    const issues = [];
    
    // CPU監視
    if (cpuUsage > 85) {
      healthStatus = 'critical';
      issues.push(`【緊急】CPU使用率危険: ${cpuUsage}% - システム応答性に影響の可能性`);
    } else if (cpuUsage > 70) {
      healthStatus = 'warning';
      issues.push(`【注意】CPU使用率高: ${cpuUsage}% - システム応答性低下の兆候`);
    }
    
    // メモリ監視
    if (memoryStats.usagePercent > 90) {
      healthStatus = 'critical';
      issues.push(`【緊急】メモリ使用率危険: ${memoryStats.usagePercent}% - システム不安定化リスク`);
    } else if (memoryStats.usagePercent > 80) {
      if (healthStatus !== 'critical') healthStatus = 'warning';
      issues.push(`【注意】メモリ使用率高: ${memoryStats.usagePercent}% - メモリ不足の兆候`);
    }
    
    // データベース応答監視
    if (dbStats.responseTime > 100) {
      if (healthStatus !== 'critical') healthStatus = 'warning';
      issues.push(`【注意】DB応答時間遅延: ${dbStats.responseTime}ms - ユーザー体感への影響開始`);
    }
    
    // 正常時のメッセージ
    if (healthStatus === 'healthy') {
      issues.push(`システム正常稼働中 - アクティブスタッフ${dbStats.activeStaffCount}名（総${dbStats.totalStaffCount}名）・今日の予定${dbStats.todayScheduleCount}件`);
    }

    return {
      timestamp: new Date(),
      server: {
        cpuUsage: cpuUsage,
        memoryUsage: memoryStats.usagePercent,
        totalMemory: memoryStats.total,
        freeMemory: memoryStats.free,
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
      database: {
        responseTime: dbStats.responseTime,
        recentErrors: dbStats.errors,
        totalStaffCount: dbStats.totalStaffCount,
        activeStaffCount: dbStats.activeStaffCount,
        todayScheduleCount: dbStats.todayScheduleCount,
      },
      backup: {
        ...this.backupService.getBackupStats(),
        availableSpace: 0, // 仮の値
        autoBackupEnabled: false,
        nextScheduledBackup: null,
        failedBackupsCount: 0
      },
      health: {
        status: healthStatus,
        issues: issues,
        lastChecked: new Date(),
      },
      businessContext: {
        companyScale: 'システム監視',
        monitoringFocus: 'システム安定稼働重視',
        realDataSource: true
      }
    };
  }

  // 一時的にコメントアウト（AuthModuleテスト用）
  // /**
  //  * 認証ヘルスチェック
  //  */
  // @Get('auth/health')
  // authHealth() {
  //   return { status: 'ok', message: 'Auth service is running' };
  // }

  // /**
  //  * ユーザー存在確認
  //  */
  // @Get('auth/user')
  // async getUserInfo(@Query('email') email: string) {
  //   if (!email) {
  //     return { exists: false, hasPassword: false };
  //   }

  //   const user = await this.prisma.user_auth.findUnique({
  //     where: { email },
  //     include: { Staff: true },
  //   });

  //   if (!user) {
  //     return { exists: false, hasPassword: false };
  //   }

  //   return {
  //     exists: true,
  //     hasPassword: !!user.password,
  //     name: user.Staff?.name || user.email.split('@')[0],
  //   };
  // }

  // /**
  //  * ログイン
  //  */
  // @Post('auth/login')
  // @HttpCode(200)
  // async login(@Body() body: any) {
  //   const { email, password } = body;
  //   console.log('=== ログイン試行 ===', { email });
  //   
  //   // ユーザー検索
  //   const user = await this.prisma.user_auth.findUnique({
  //     where: { email },
  //     include: { Staff: true },
  //   });

  //   if (!user) {
  //     console.log('❌ ユーザーが見つかりません:', email);
  //     throw new Error('ユーザーが見つかりません');
  //   }

  //   if (!user.isActive) {
  //     console.log('❌ 非アクティブなユーザー:', email);
  //     throw new Error('アカウントが無効です');
  //   }

  //   if (!user.password) {
  //     console.log('❌ パスワード未設定:', email);
  //     throw new Error('パスワードが設定されていません');
  //   }

  //   // パスワード検証
  //   const isPasswordValid = await bcrypt.compare(password, user.password);
  //   if (!isPasswordValid) {
  //     console.log('❌ パスワード不正:', email);
  //     throw new Error('パスワードが正しくありません');
  //   }

  //   console.log('✅ ログイン成功:', email);

  //   // ログイン成功時の処理
  //   await this.prisma.user_auth.update({
  //     where: { id: user.id },
  //     data: {
  //       lastLoginAt: new Date(),
  //       loginAttempts: 0, // リセット
  //     },
  //   });

  //   // 簡単なトークン生成（実運用では JWT を使用）
  //   const token = `simple-token-${user.id}-${Date.now()}`;

  //   return {
  //     token,
  //     user: {
  //       id: user.id,
  //       email: user.email,
  //       userType: user.userType,
  //       staffId: user.staffId,
  //       isActive: user.isActive,
  //       Staff: user.Staff,
  //     },
  //   };
  // }
}