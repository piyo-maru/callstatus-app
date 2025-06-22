import { Controller, Get, Post, Body, Param, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { LayerManagerService } from '../layer-manager/layer-manager.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserInfo } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('api/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly layerManagerService: LayerManagerService
  ) {}

  @Post()
  async create(
    @Body() createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; memo?: string; },
    @CurrentUser() currentUser: CurrentUserInfo
  ) {
    try {
      console.log('Creating schedule with data:', createScheduleDto);
      console.log('Current user:', currentUser);
      
      // 権限チェック：一般ユーザーは自分の予定のみ作成可能
      if (currentUser.role === 'USER' && createScheduleDto.staffId !== currentUser.staffId) {
        throw new Error('他のスタッフの予定を作成する権限がありません');
      }
      
      const result = await this.schedulesService.create(createScheduleDto);
      console.log('Schedule created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  // 既存API（後方互換）
  @Get()
  findAll(@Query('date') date: string) {
    return this.schedulesService.findAll(date);
  }

  // 新しい3層統合API
  @Get('layered')
  async findLayered(@Query('date') date: string) {
    if (!date) {
      throw new Error('date parameter is required');
    }
    return this.layerManagerService.getCompatibleSchedules(date);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateScheduleDto: { status?: string; start?: number; end?: number; date: string; },
    @CurrentUser() currentUser: CurrentUserInfo
  ) {
    // 権限チェック：一般ユーザーは自分の予定のみ更新可能
    if (currentUser.role === 'USER') {
      const schedule = await this.schedulesService.findOne(+id);
      if (schedule && schedule.staffId !== currentUser.staffId) {
        throw new Error('他のスタッフの予定を更新する権限がありません');
      }
    }
    
    return this.schedulesService.update(+id, updateScheduleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserInfo) {
    // 権限チェック：一般ユーザーは自分の予定のみ削除可能
    if (currentUser.role === 'USER') {
      const schedule = await this.schedulesService.findOne(+id);
      if (schedule && schedule.staffId !== currentUser.staffId) {
        throw new Error('他のスタッフの予定を削除する権限がありません');
      }
    }
    
    return this.schedulesService.remove(+id);
  }
}