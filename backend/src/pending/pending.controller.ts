import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PendingService, CreatePendingDto, ApprovalDto, BulkApprovalDto } from './pending.service';
// 認証関連を一時的に無効化（認証システム修正まで）
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@Controller('schedules/pending')
// @UseGuards(JwtAuthGuard) // 一時的に無効化
export class PendingController {
  constructor(private readonly pendingService: PendingService) {}

  /**
   * Pending作成
   */
  @Post()
  async create(@Body() createPendingDto: CreatePendingDto) {
    // 一時的に固定のstaffIdを使用（認証システム修正まで）
    const mockStaffId = 1;
    return this.pendingService.create(createPendingDto, mockStaffId);
  }

  /**
   * Pending一覧取得
   */
  @Get()
  async findAll(
    @Query('staffId') staffId?: string,
    @Query('date') date?: string,
    @Query('pendingType') pendingType?: string
  ) {
    const filters = {
      staffId: staffId ? parseInt(staffId) : undefined,
      date,
      pendingType,
    };

    return this.pendingService.findAll(filters);
  }

  /**
   * 単一Pending取得
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const mockStaffId = 1;
    return this.pendingService.findOne(id, mockStaffId, true); // admin権限で取得
  }

  /**
   * Pending更新
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePendingDto: Partial<CreatePendingDto>
  ) {
    const mockStaffId = 1;
    return this.pendingService.update(id, updatePendingDto, mockStaffId);
  }

  /**
   * Pending削除
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const mockStaffId = 1;
    return this.pendingService.remove(id, mockStaffId);
  }

  /**
   * Pending承認（個別）
   */
  @Post(':id/approve')
  // @UseGuards(RolesGuard) // 一時的に無効化
  // @Roles('ADMIN') // 一時的に無効化
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approvalDto: ApprovalDto
  ) {
    const mockStaffId = 1;
    return this.pendingService.approve(id, approvalDto, mockStaffId);
  }

  /**
   * Pending却下（個別）
   */
  @Post(':id/reject')
  // @UseGuards(RolesGuard) // 一時的に無効化
  // @Roles('ADMIN') // 一時的に無効化
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() approvalDto: ApprovalDto
  ) {
    const mockStaffId = 1;
    return this.pendingService.reject(id, approvalDto, mockStaffId);
  }
}

@Controller('admin/pending-schedules')
// @UseGuards(JwtAuthGuard, RolesGuard) // 一時的に無効化
// @Roles('ADMIN') // 一時的に無効化
export class AdminPendingController {
  constructor(private readonly pendingService: PendingService) {}

  /**
   * 管理者用：全pending一覧
   */
  @Get()
  async findAllForAdmin(
    @Query('date') date?: string,
    @Query('department') department?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected'
  ) {
    return this.pendingService.findAllForAdmin({
      date,
      department,
      status,
    });
  }

  /**
   * 管理者用：単一pending詳細取得
   */
  @Get(':id')
  async findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    const mockStaffId = 1;
    return this.pendingService.findOne(id, mockStaffId, true);
  }

  /**
   * 一括承認・却下
   */
  @Post('bulk-approval')
  async bulkApproval(@Body() bulkDto: BulkApprovalDto) {
    if (!bulkDto.pendingIds || bulkDto.pendingIds.length === 0) {
      throw new BadRequestException('pendingIds is required');
    }

    if (!['approve', 'reject'].includes(bulkDto.action)) {
      throw new BadRequestException('action must be approve or reject');
    }

    const mockStaffId = 1;
    return this.pendingService.bulkApproval(bulkDto, mockStaffId);
  }
}