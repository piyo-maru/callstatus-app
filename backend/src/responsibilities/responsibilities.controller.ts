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
  async getResponsibilities(
    @Query('date') date?: string,
    @Query('year') year?: string,
    @Query('month') month?: string
  ) {
    try {
      let targetDate: string;
      
      console.log('Responsibilities request:', { date, year, month });
      
      if (date) {
        targetDate = date;
      } else if (year && month) {
        // year=2025&month=8 の形式を 2025-08-01 に変換
        const paddedMonth = month.padStart(2, '0');
        targetDate = `${year}-${paddedMonth}-01`;
      } else {
        throw new Error('Either date parameter or year/month parameters are required');
      }
      
      console.log('Target date:', targetDate);
      
      return await this.responsibilitiesService.getResponsibilitiesByDate(targetDate);
    } catch (error) {
      console.error('Error in getResponsibilities:', error);
      throw error;
    }
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