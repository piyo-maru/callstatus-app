import { Controller, Get, Put, Body, Request } from '@nestjs/common';
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
   * グローバルプリセット設定を更新
   * 管理者権限が必要（認証システム有効化後に@Roles(UserType.ADMIN)を追加予定）
   */
  @Put()
  async updateGlobalPresetSettings(
    @Body() updateData: Partial<GlobalPresetSettingsDto>,
    @Request() req?: any
  ): Promise<GlobalPresetSettingsDto> {
    // リクエストからstaffIdを取得（認証済みの場合）
    const staffId = req?.user?.staffId || req?.staffId;
    
    return this.globalPresetSettingsService.updateSettings(updateData, staffId);
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