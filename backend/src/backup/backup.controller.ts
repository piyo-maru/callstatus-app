import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('execute')
  async executeBackup(@Body() body: { triggeredBy?: string }) {
    const result = await this.backupService.executeBackup();
    
    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    return {
      message: result.message,
      filePath: result.filePath,
      fileSize: result.fileSize
    };
  }

  @Get('list')
  async getBackupList() {
    const backups = await this.backupService.getBackupList();
    return {
      backups: backups.map(backup => ({
        ...backup,
        fileSize: backup.fileSize.toString() // BigIntのJSON serialization対応
      }))
    };
  }

  @Post('restore')
  async restoreBackup(@Body() body: { fileName: string; confirmationToken: string }) {
    // 開発環境では簡易的なトークン検証
    if (!body.confirmationToken || !body.confirmationToken.startsWith('dev-token-')) {
      throw new HttpException('無効な確認トークンです', HttpStatus.BAD_REQUEST);
    }
    
    const result = await this.backupService.restoreBackup(body.fileName);
    
    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    return {
      message: result.message
    };
  }

  @Get('generate-token')
  async generateToken() {
    const token = this.backupService.generateConfirmationToken();
    return {
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分後
    };
  }

  @Get('stats')
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }
}