import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DepartmentSettingsService } from './department-settings.service';

@Controller('department-settings')
export class DepartmentSettingsController {
  constructor(private readonly departmentSettingsService: DepartmentSettingsService) {}

  @Get()
  async getAllSettings() {
    return this.departmentSettingsService.getAllSettings();
  }

  @Get('auto-generate')
  async autoGenerateFromStaff() {
    return this.departmentSettingsService.autoGenerateFromStaff();
  }

  @Post()
  async updateSettings(@Body() settings: Array<{
    type: 'department' | 'group';
    name: string;
    shortName?: string;
    backgroundColor?: string;
    displayOrder?: number;
  }>) {
    return this.departmentSettingsService.updateSettings(settings);
  }

  @Get('by-name/:type/:name')
  async getSettingByName(
    @Param('type') type: 'department' | 'group',
    @Param('name') name: string
  ) {
    return this.departmentSettingsService.getSettingByName(type, name);
  }
}