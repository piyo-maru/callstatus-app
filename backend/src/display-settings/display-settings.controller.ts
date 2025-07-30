import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { DisplaySettingsService, DisplaySettingsDto } from './display-settings.service';

@Controller('admin/global-display-settings')
export class DisplaySettingsController {
  constructor(private readonly displaySettingsService: DisplaySettingsService) {}

  /**
   * グローバル表示設定を取得
   */
  @Get()
  async getGlobalDisplaySettings(): Promise<DisplaySettingsDto> {
    return this.displaySettingsService.getSettings();
  }

  /**
   * グローバル表示設定を更新
   */
  @Put()
  async updateGlobalDisplaySettings(
    @Body() updateData: Partial<DisplaySettingsDto>,
    @Request() req?: any
  ): Promise<DisplaySettingsDto> {
    // リクエストからstaffIdを取得（認証済みの場合）
    const staffId = req?.user?.staffId || req?.staffId;
    
    return this.displaySettingsService.updateSettings(updateData);
  }

  /**
   * 設定の履歴情報を取得
   */
  @Get('history')
  async getSettingsHistory() {
    return this.displaySettingsService.getSettingsHistory();
  }
}