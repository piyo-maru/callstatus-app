import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = '/tmp/backups';

  constructor(private prisma: PrismaService) {
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async executeBackup(): Promise<{
    success: boolean;
    message: string;
    filePath?: string;
    fileSize?: number;
  }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `callstatus_backup_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      // PostgreSQL環境変数
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found');
      }

      // pg_dump実行
      const cleanDbUrl = dbUrl.replace('?schema=public', '');
      const command = `pg_dump "${cleanDbUrl}" > "${filePath}"`;

      this.logger.log(`Starting backup: ${command}`);
      await execAsync(command);

      // ファイルサイズ取得
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      this.logger.log(`Backup completed: ${filePath} (${fileSize} bytes)`);

      return {
        success: true,
        message: 'バックアップが正常に完了しました',
        filePath,
        fileSize,
      };
    } catch (error) {
      this.logger.error('Backup failed:', error);
      return {
        success: false,
        message: `バックアップに失敗しました: ${error.message}`,
      };
    }
  }

  async getBackupList(): Promise<
    Array<{
      id: number;
      fileName: string;
      fileSize: string;
      createdAt: string;
      status: string;
    }>
  > {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter((file) =>
        file.startsWith('callstatus_backup_'),
      );

      const backups = backupFiles.map((file, index) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        return {
          id: index + 1,
          fileName: file,
          fileSize: stats.size.toString(),
          createdAt: stats.mtime.toISOString(),
          status: 'completed',
        };
      });

      return backups.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      this.logger.error('Failed to get backup list:', error);
      return [];
    }
  }

  async restoreBackup(fileName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const filePath = path.join(this.backupDir, fileName);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: 'バックアップファイルが見つかりません',
        };
      }

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found');
      }

      const cleanDbUrl = dbUrl.replace('?schema=public', '');

      // 既存データを完全削除してから復元（開発環境専用）
      const dropCommand = `psql "${cleanDbUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
      const restoreCommand = `psql "${cleanDbUrl}" < "${filePath}"`;

      this.logger.log(`Starting database reset: ${dropCommand}`);
      await execAsync(dropCommand);

      this.logger.log(`Starting restore: ${restoreCommand}`);
      await execAsync(restoreCommand);

      this.logger.log(`Restore completed: ${fileName}`);

      return {
        success: true,
        message: 'データベースの完全復元が正常に完了しました',
      };
    } catch (error) {
      this.logger.error('Restore failed:', error);
      return {
        success: false,
        message: `復元に失敗しました: ${error.message}`,
      };
    }
  }

  generateConfirmationToken(): string {
    return `dev-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getBackupStats(): {
    totalBackups: number;
    lastBackupTime: string | null;
    lastBackupStatus: string;
    totalBackupSize: number;
  } {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter((file) =>
        file.startsWith('callstatus_backup_'),
      );

      if (backupFiles.length === 0) {
        return {
          totalBackups: 0,
          lastBackupTime: null,
          lastBackupStatus: 'none',
          totalBackupSize: 0,
        };
      }

      let totalSize = 0;
      let lastBackupTime: Date | null = null;

      backupFiles.forEach((file) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        if (!lastBackupTime || stats.mtime > lastBackupTime) {
          lastBackupTime = stats.mtime;
        }
      });

      return {
        totalBackups: backupFiles.length,
        lastBackupTime: lastBackupTime ? lastBackupTime.toISOString() : null,
        lastBackupStatus: 'completed',
        totalBackupSize: totalSize,
      };
    } catch (error) {
      this.logger.error('Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        lastBackupTime: null,
        lastBackupStatus: 'error',
        totalBackupSize: 0,
      };
    }
  }
}
