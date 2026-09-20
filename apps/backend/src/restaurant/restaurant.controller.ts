import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service.js';
import { CreateRestaurantDto } from './dtos/restaurant.dto.js';
import { currentUser } from '../auth/decorators/current-user.decorator.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { UserRole } from '@foodengine/database';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create restaurant (Merchant/System Admin only)' })
  @UseGuards(JwtAuthGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post()
  async create(
    @Body() dto: CreateRestaurantDto,
    @currentUser('userId') userId: number,
  ) {
    return this.restaurantService.create(dto);
  }

  @ApiOperation({ summary: 'Get all restaurants for a tenant' })
  @Get('/tenant/:tenantId')
  async findAllRestaurantByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.restaurantService.findActiveRestaurantsByTenant(tenantId);
  }
}
