import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

@Controller('api/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  create(@Body() createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; }) {
    return this.schedulesService.create(createScheduleDto);
  }

  // ★★★ @Query('date') を追加 ★★★
  @Get()
  findAll(@Query('date') date: string) {
    return this.schedulesService.findAll(date);
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