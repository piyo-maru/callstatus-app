import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  ParseIntPipe,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { 
  PresetSettingsService, 
  CreatePresetDto, 
  UpdatePresetDto,
  PagePresetSettingsDto
} from './preset-settings.service';

// 一時的に認証関連をコメントアウト（app.module.tsで認証が無効化されているため）
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { CurrentUser, CurrentUserInfo } from '../auth/decorators/current-user.decorator';
// import { UserType } from '@prisma/client';

@Controller('preset-settings')
// @UseGuards(JwtAuthGuard, RolesGuard) // 一時的に無効化
export class PresetSettingsController {
  constructor(private readonly presetSettingsService: PresetSettingsService) {}

  /**
   * 特定スタッフのプリセット設定を取得
   * GET /api/preset-settings/staff/:staffId
   */
  @Get('staff/:staffId')
  async getUserPresetSettings(
    @Param('staffId', ParseIntPipe) staffId: number
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      // TODO: 権限チェック - 自分の設定のみアクセス可能 or 管理者権限
      // if (currentUser.userType !== UserType.ADMIN && currentUser.staffId !== staffId) {
      //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      // }

      console.log(`プリセット設定取得: staffId=${staffId}`);
      return await this.presetSettingsService.getUserPresetSettings(staffId);
    } catch (error) {
      console.error('プリセット設定取得エラー:', error);
      if (error.message.includes('not found')) {
        throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * プリセット設定のページ別適用設定を更新
   * PUT /api/preset-settings/staff/:staffId/page-settings
   */
  @Put('staff/:staffId/page-settings')
  async updatePagePresetSettings(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Body() pageSettings: PagePresetSettingsDto
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      // TODO: 権限チェック - 自分の設定のみ更新可能 or 管理者権限
      // if (currentUser.userType !== UserType.ADMIN && currentUser.staffId !== staffId) {
      //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      // }

      console.log(`ページ別プリセット設定更新: staffId=${staffId}`, pageSettings);
      return await this.presetSettingsService.updateUserPresetSettings(staffId, pageSettings);
    } catch (error) {
      console.error('ページ別プリセット設定更新エラー:', error);
      if (error.message.includes('not found')) {
        throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 新しいプリセットを作成
   * POST /api/preset-settings/staff/:staffId/presets
   */
  @Post('staff/:staffId/presets')
  async createPreset(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Body() presetData: CreatePresetDto
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      // TODO: 権限チェック - 自分のプリセットのみ作成可能 or 管理者権限
      // if (currentUser.userType !== UserType.ADMIN && currentUser.staffId !== staffId) {
      //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      // }

      console.log(`プリセット作成: staffId=${staffId}, presetId=${presetData.presetId}`);
      return await this.presetSettingsService.createPreset(staffId, presetData);
    } catch (error) {
      console.error('プリセット作成エラー:', error);
      if (error.message.includes('already exists')) {
        throw new HttpException('Preset already exists', HttpStatus.CONFLICT);
      }
      if (error.message.includes('not found')) {
        throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * プリセットを更新
   * PUT /api/preset-settings/staff/:staffId/presets/:presetId
   */
  @Put('staff/:staffId/presets/:presetId')
  async updatePreset(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Param('presetId') presetId: string,
    @Body() updateData: UpdatePresetDto
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      // TODO: 権限チェック - 自分のプリセットのみ更新可能 or 管理者権限
      // if (currentUser.userType !== UserType.ADMIN && currentUser.staffId !== staffId) {
      //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      // }

      console.log(`プリセット更新: staffId=${staffId}, presetId=${presetId}`);
      return await this.presetSettingsService.updatePreset(staffId, presetId, updateData);
    } catch (error) {
      console.error('プリセット更新エラー:', error);
      if (error.message.includes('not found')) {
        throw new HttpException('Preset not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * プリセットを削除
   * DELETE /api/preset-settings/staff/:staffId/presets/:presetId
   */
  @Delete('staff/:staffId/presets/:presetId')
  async deletePreset(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Param('presetId') presetId: string
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      // TODO: 権限チェック - 自分のプリセットのみ削除可能 or 管理者権限
      // if (currentUser.userType !== UserType.ADMIN && currentUser.staffId !== staffId) {
      //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      // }

      console.log(`プリセット削除: staffId=${staffId}, presetId=${presetId}`);
      await this.presetSettingsService.deletePreset(staffId, presetId);
      return { message: 'Preset deleted successfully' };
    } catch (error) {
      console.error('プリセット削除エラー:', error);
      if (error.message.includes('not found')) {
        throw new HttpException('Preset not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 管理者用：プリセット利用統計を取得
   * GET /api/preset-settings/admin/statistics
   */
  @Get('admin/statistics')
  // @Roles(UserType.ADMIN) // 一時的に無効化
  async getPresetStatistics(
    // @CurrentUser() currentUser: CurrentUserInfo // 一時的に無効化
  ) {
    try {
      console.log('プリセット統計取得（管理者用）');
      return await this.presetSettingsService.getPresetStatistics();
    } catch (error) {
      console.error('プリセット統計取得エラー:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * APIテスト用エンドポイント
   * GET /api/preset-settings/test
   */
  @Get('test')
  testPresetSettingsService() {
    return { 
      message: 'PresetSettingsService is working', 
      timestamp: new Date(),
      version: '1.0.0'
    };
  }
}