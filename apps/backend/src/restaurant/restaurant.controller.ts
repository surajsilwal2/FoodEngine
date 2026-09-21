import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service.js';
import { CreateRestaurantDto } from './dtos/restaurant.dto.js';
import { currentUser } from '../auth/decorators/current-user.decorator.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { UserRole } from '@foodengine/database';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto.js';
import { RestaurantTenantContextGuard } from './guards/restaurant-tenant-context.guard.js';

@ApiTags('Restaurants')
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create restaurant (Merchant/System Admin only)' })
  @ApiResponse({ status: 201, description: 'Restaurant created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Insufficient permission',
  })
  @UseGuards(JwtAuthGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post()
  async create(
    @Body() dto: CreateRestaurantDto,
    @currentUser('userId') userId: number,
  ) {
    return this.restaurantService.create(dto);
  }

  // list all restaurants for a tenant
  @ApiOperation({ summary: 'Get all restaurants for a tenant' })
  @Get('/tenant/:tenantId')
  async findAllRestaurantByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.restaurantService.findActiveRestaurantsByTenant(tenantId);
  }

  // list single restaurant by id
  @ApiOperation({ summary: 'Get restaurant details by id' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.findOne(id);
  }

  //update restaurant details
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update restaurant details' })
  @UseGuards(JwtAuthGuard, RestaurantTenantContextGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(id, dto);
  }
}
