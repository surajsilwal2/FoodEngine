import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';

@ApiTags('Tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Onboard a new merchant business (Tenant)' })
  @ApiResponse({ status: 201, description: 'Tenant onboarded successfully' })
  @UseGuards(JwtAuthGuard)
  @Post('onboard')
  create(
    @Body() createTenantDto: CreateTenantDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.create(createTenantDto, user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all tenants managed by the logged-in user' })
    @ApiResponse({status: 200, description: 'List of managed tenants'})
  @UseGuards(JwtAuthGuard)
  @Get('my-tenant')
  async getMyTenants(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.tenantService.findUserTenants(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(+id, updateTenantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(+id);
  }
}
