import { Controller, Get, Put, Body, Request, HttpCode, HttpStatus, BadRequestException, ConflictException } from '@nestjs/common';
import { GlobalPresetSettingsService, GlobalPresetSettingsDto } from './global-preset-settings.service';

@Controller('admin/global-preset-settings')
export class GlobalPresetSettingsController {
  constructor(private readonly globalPresetSettingsService: GlobalPresetSettingsService) {}

  /**
   * グローバルプリセット設定を取得
   */
  @Get()
  async getGlobalPresetSettings(): Promise<GlobalPresetSettingsDto> {
    return this.globalPresetSettingsService.getSettings();
  }

  /**
   * グローバルプリセット設定を更新（楽観的ロック対応）
   * 管理者権限が必要（認証システム有効化後に@Roles(UserType.ADMIN)を追加予定）
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updateGlobalPresetSettings(
    @Body() updateData: Partial<GlobalPresetSettingsDto> & { expectedVersion?: string },
    @Request() req?: any
  ): Promise<GlobalPresetSettingsDto> {
    // リクエストからstaffIdを取得（認証済みの場合）
    const staffId = req?.user?.staffId || req?.staffId;
    
    const result = await this.globalPresetSettingsService.updateSettings(
      updateData, 
      updateData.expectedVersion,
      staffId
    );

    if (!result.success) {
      if (result.error === 'VERSION_CONFLICT') {
        // 409 Conflictステータスで競合データを返す
        throw new ConflictException({
          message: '他のユーザーによって設定が変更されました',
          error: 'VERSION_CONFLICT',
          conflictData: result.conflictData
        });
      } else {
        throw new BadRequestException({
          message: '設定の更新に失敗しました',
          error: result.error
        });
      }
    }

    return result.settings!;
  }

  /**
   * バージョン情報を取得（キャッシュ同期用）
   */
  @Get('version')
  async getVersion(): Promise<{ version: string; lastModified: string }> {
    return this.globalPresetSettingsService.getVersion();
  }

  /**
   * 設定の履歴情報を取得
   */
  @Get('history')
  async getSettingsHistory() {
    return this.globalPresetSettingsService.getSettingsHistory();
  }
}