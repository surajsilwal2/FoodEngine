import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { DriverService } from './driver.service.js';
import { ApplyDriverDto, ApproveDriverDto, AvailableDriverDto, CreateDriverDto } from './dto/create-driver.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { UserRole } from '@foodengine/database';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard.js';

@ApiTags('Driver')
@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit driver application and document details' })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 201,
    description: 'Application submitted (Pending Admin Review)',
  })
  @Post('apply')
  async apply(
    @Body() dto: ApplyDriverDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.driverService.applyForDrivers(user.userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current logged-in driver profile status' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.driverService.getProfile(user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Toggle driver online/offline availability (Approved drivers only)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Profile pending admin verification',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('availability')
  async toggleAvailability(
    @Body() dto: AvailableDriverDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.driverService.toggleAvailability(user.userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all driver profiles for admin verification' })
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('admin/list')
  async listAllDrivers() {
    return this.driverService.listAllDriver();
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve or revoke driver profile verification' })
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Patch('admin/:id/approve')
  async approveDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveDriverDto,
  ) {
    return this.driverService.setApprovalStatus(id, dto);
  }
}


