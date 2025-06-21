import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { LayerManagerService } from '../layer-manager/layer-manager.service';

@Controller('api/schedules')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly layerManagerService: LayerManagerService
  ) {}

  @Post()
  async create(@Body() createScheduleDto: { staffId: number; status: string; start: string; end: string; memo?: string; }) {
    try {
      console.log('Creating schedule with data:', createScheduleDto);
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
  update(@Param('id') id: string, @Body() updateScheduleDto: { status?: string; start?: number; end?: number; date: string; }) {
    return this.schedulesService.update(+id, updateScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(+id);
  }
}