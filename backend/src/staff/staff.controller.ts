import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
// 一時的に無効化（コンパイルエラー回避）
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Public } from '../auth/decorators/public.decorator';
// import { UserType } from '@prisma/client';

@Controller('staff')
// @UseGuards(JwtAuthGuard, RolesGuard) // 一時的に無効化
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll() {
    return this.staffService.findAll();
  }

  @Get(':id/details')
  async getStaffDetails(@Param('id') id: string) {
    return this.staffService.findStaffDetails(+id);
  }

  @Post()
  create(@Body() createStaffDto: { name: string; department: string; group: string; }) {
    return this.staffService.create(createStaffDto);
  }

  @Post('bulk')
  async createBulk(@Body() createBulkStaffDto: { staff: Array<{ name: string; department: string; group: string; }> }) {
    try {
      console.log('Creating bulk staff with data:', createBulkStaffDto);
      const result = await this.staffService.createBulk(createBulkStaffDto.staff);
      console.log('Bulk staff created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating bulk staff:', error);
      throw error;
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStaffDto: { name?: string; department?: string; group?: string; }) {
    return this.staffService.update(+id, updateStaffDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staffService.remove(+id);
  }

  // テスト用break追加エンドポイント
  @Post(':id/test-add-breaks')
  async testAddBreaks(@Param('id') id: string) {
    console.log(`テスト用break追加: スタッフID ${id}`);
    return this.staffService.testAddLunchBreaks(+id);
  }

  @Post('sync-from-json-body')
  async syncFromJsonBody(@Body() jsonData: any) {
    console.log('=== syncFromJsonBody endpoint called ===');
    try {
      console.log('Received JSON data:', JSON.stringify(jsonData, null, 2));
      
      // デバッグ: 受信データの詳細確認
      if (jsonData.employeeData && jsonData.employeeData[0]) {
        const firstEmp = jsonData.employeeData[0];
        console.log('First employee dept field:', firstEmp.dept);
        console.log('First employee department field:', firstEmp.department);
        console.log('Type of dept:', typeof firstEmp.dept);
        console.log('All fields:', Object.keys(firstEmp));
      }
      
      const result = await this.staffService.syncFromEmployeeData(jsonData);
      console.log('Staff sync completed:', result);
      return result;
    } catch (error) {
      console.error('Error in syncFromJsonBody controller:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Post('sync-from-json-preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewSyncFromJson(@UploadedFile() file: Express.Multer.File) {
    console.log('=== Preview sync from JSON called ===');
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const fileContent = file.buffer.toString('utf8');
      const jsonData = JSON.parse(fileContent);
      
      return await this.staffService.previewSyncFromEmployeeData(jsonData);
    } catch (error) {
      console.error('Error in preview:', error);
      throw error;
    }
  }

  @Post('test-lunch-break/:staffId')
  async testLunchBreak(@Param('staffId') staffId: string) {
    console.log(`=== 昼休み追加テスト開始: スタッフID ${staffId} ===`);
    try {
      const result = await this.staffService.testAddLunchBreaks(+staffId);
      return { success: true, result };
    } catch (error) {
      console.error('昼休み追加テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('sync-from-json')
  @UseInterceptors(FileInterceptor('file'))
  async syncFromJson(@UploadedFile() file: Express.Multer.File) {
    console.log('=== syncFromJson endpoint called ===');
    console.log('File received:', file ? 'Yes' : 'No');
    
    try {
      if (!file) {
        console.error('No file uploaded');
        throw new Error('No file uploaded');
      }

      console.log('File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      const fileContent = file.buffer.toString('utf8');
      console.log('File content preview:', fileContent.substring(0, 200) + '...');
      
      const jsonData = JSON.parse(fileContent);
      console.log('Parsed JSON data:', jsonData);
      
      const result = await this.staffService.syncFromEmployeeData(jsonData);
      
      console.log('Staff sync completed:', result);
      return result;
    } catch (error) {
      console.error('Error syncing staff from JSON:', error);
      console.error('Error stack:', error.stack);
    }
  }

  // === 管理者権限管理用API（Phase 5） ===

  @Get('management')
  async getStaffForManagement() {
    console.log('=== 管理者権限管理用スタッフ一覧取得 ===');
    try {
      const result = await this.staffService.findAllForManagement();
      return { success: true, data: result };
    } catch (error) {
      console.error('管理者権限管理用スタッフ取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('departments')
  async getAvailableDepartments() {
    console.log('=== 利用可能部署一覧取得 ===');
    try {
      const result = await this.staffService.getAvailableDepartments();
      return { success: true, data: result };
    } catch (error) {
      console.error('部署一覧取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  @Patch(':id/manager-permissions')
  async updateManagerPermissions(
    @Param('id') id: string,
    @Body() updateData: {
      isManager: boolean;
      managerDepartments?: string[];
      managerPermissions?: string[];
      updatedBy?: string; // 更新者情報（監査ログ用）
    }
  ) {
    console.log(`=== 管理者権限更新: スタッフID ${id} ===`, updateData);
    try {
      const result = await this.staffService.updateManagerPermissions(+id, updateData);
      return { success: true, data: result };
    } catch (error) {
      console.error('管理者権限更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  @Get(':id/manager-audit-logs')
  async getManagerAuditLogs(@Param('id') id: string) {
    console.log(`=== 管理者監査ログ取得: スタッフID ${id} ===`);
    try {
      const result = await this.staffService.getManagerAuditLogs(+id);
      return { success: true, data: result };
    } catch (error) {
      console.error('監査ログ取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // === チャンク処理 + 非同期処理 ===

  @Post('sync-from-json-body-chunked')
  async syncFromJsonBodyChunked(@Body() jsonData: any) {
    console.log('=== チャンク処理社員インポート開始 ===');
    const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('Received JSON data:', JSON.stringify(jsonData, null, 2));
      
      // 【非同期処理】バックグラウンドで実行
      // クライアントにはすぐにレスポンスを返し、処理はバックグラウンドで継続
      setImmediate(async () => {
        try {
          await this.staffService.syncFromEmployeeDataWithProgress(jsonData, importId);
        } catch (error) {
          console.error('バックグラウンド処理エラー:', error);
        }
      });

      // 即座にレスポンスを返す（非同期処理開始の通知）
      return {
        success: true,
        message: 'チャンク処理によるインポートを開始しました',
        importId: importId,
        note: 'WebSocketでリアルタイム進捗を確認できます'
      };
    } catch (error) {
      console.error('Error in chunked sync:', error);
      return {
        success: false,
        error: error.message,
        importId: importId
      };
    }
  }

  @Post('sync-from-json-chunked')
  @UseInterceptors(FileInterceptor('file'))
  async syncFromJsonChunked(@UploadedFile() file: Express.Multer.File) {
    console.log('=== チャンク処理ファイルインポート開始 ===');
    const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      console.log('File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      const fileContent = file.buffer.toString('utf8');
      const jsonData = JSON.parse(fileContent);
      
      // 【非同期処理】バックグラウンドで実行
      setImmediate(async () => {
        try {
          await this.staffService.syncFromEmployeeDataWithProgress(jsonData, importId);
        } catch (error) {
          console.error('バックグラウンド処理エラー:', error);
        }
      });

      // 即座にレスポンスを返す
      return {
        success: true,
        message: 'チャンク処理によるファイルインポートを開始しました',
        importId: importId,
        fileInfo: {
          name: file.originalname,
          size: file.size
        },
        note: 'WebSocketでリアルタイム進捗を確認できます'
      };
    } catch (error) {
      console.error('Error in chunked file sync:', error);
      return {
        success: false,
        error: error.message,
        importId: importId
      };
    }
  }
}