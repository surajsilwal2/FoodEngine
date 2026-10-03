import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { CreateMerchantApplicationDto } from './dto/create-merchant-application.dto.js';
import { ReviewMerchantApplicationDto } from './dto/review-merchant-application.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard.js';

@ApiTags('Tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit a merchant onboarding application' })
  @ApiResponse({ status: 201, description: 'Application submitted for review' })
  @UseGuards(JwtAuthGuard)
  @Post('applications')
  submitApplication(
    @Body() dto: CreateMerchantApplicationDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.submitApplication(dto, user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get the current user merchant application' })
  @UseGuards(JwtAuthGuard)
  @Get('applications/me')
  getMyApplication(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.getMyApplication(user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List pending merchant applications' })
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  @Get('applications/pending')
  getPendingApplications() {
    return this.tenantService.getPendingApplications();
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve or reject a merchant application' })
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  @Patch('applications/:id/review')
  reviewApplication(
    @Param('id', ParseIntPipe) applicationId: number,
    @Body() dto: ReviewMerchantApplicationDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.reviewApplication(
      applicationId,
      dto.decision,
      user.userId,
      dto.reviewNote,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all tenants managed by the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of managed tenants' })
  @UseGuards(JwtAuthGuard)
  @Get('my-tenant')
  async getMyTenants(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.findUserTenants(user.userId);
  }
}
