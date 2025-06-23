import { Controller, Get, Post, Body, Delete, Query } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';

interface ResponsibilityData {
  // 一般部署用
  fax?: boolean;
  subjectCheck?: boolean;
  custom?: string;
  
  // 受付部署用（上記に加えて）
  lunch?: boolean;
  cs?: boolean;
}

@Controller('responsibilities')
export class ResponsibilitiesController {
  constructor(private readonly responsibilitiesService: ResponsibilitiesService) {}

  @Get()
  async getResponsibilities(@Query('date') date: string) {
    if (!date) {
      throw new Error('date parameter is required');
    }
    return this.responsibilitiesService.getResponsibilitiesByDate(date);
  }

  @Post()
  async saveResponsibility(@Body() data: {
    staffId: number;
    date?: string;
    responsibilities: ResponsibilityData;
  }) {
    const targetDate = data.date || new Date().toISOString().split('T')[0];
    return this.responsibilitiesService.saveResponsibilities(
      data.staffId,
      targetDate,
      data.responsibilities
    );
  }

  @Delete()
  async deleteResponsibility(@Query('staffId') staffId: string, @Query('date') date: string) {
    if (!staffId || !date) {
      throw new Error('staffId and date parameters are required');
    }
    return this.responsibilitiesService.deleteResponsibilities(+staffId, date);
  }
}