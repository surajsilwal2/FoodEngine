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
import { MenuService } from './menu.service.js';
import { CreateCategoryDto, CreateMenuDto } from './dto/create-menu.dto.js';
import { UpdateMenuDto } from './dto/update-menu.dto.js';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { UserRole } from '@foodengine/database';
import { MenuItemTenantContextGuard } from './guards/menu-item-tenant-context.guard.js';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * Create a new menu category (e.g., Appetizers, Beverages).
   * Requires authentication and merchant/system admin role.
   */
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a menu category (e.g., Appetizers, Beverages)',
  })
  @UseGuards(JwtAuthGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.create(dto);
  }

  /**
   * Retrieve all active categories for a specific restaurant.
   */
  @ApiOperation({ summary: 'Get all active categories for a restaurant' })
  @Get('categories/restaurant/:restaurantId')
  async getCategories(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.menuService.getCategories(restaurantId);
  }

  /**
   * Create a new menu item under an optional category.
   * Requires authentication and merchant/system admin role.
   */
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a menu item under a category' })
  @UseGuards(JwtAuthGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post('items')
  async createMenuItem(@Body() dto: CreateMenuDto) {
    return this.menuService.createMenu(dto);
  }

  /**
   * Retrieve the complete menu for a restaurant, grouped by category.
   * Only includes active categories and available menu items.
   */
  @ApiOperation({ summary: 'Get complete restaurant menu grouped by category' })
  @Get('items/restaurant/:restaurantId')
  async getFullMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getFullMenu(restaurantId);
  }

  /**
   * Update a menu item's details (name, description, price, availability).
   * Requires authentication and merchant/system admin role.
   */
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a menu item' })
  @UseGuards(JwtAuthGuard, MenuItemTenantContextGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch('items/:id')
  async updateMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menuService.updateMenuItem(id, dto);
  }

  /**
   * Soft-delete a menu item.
   * Requires authentication and merchant/system admin role.
   */
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Soft-delete a menu item' })
  @UseGuards(JwtAuthGuard, MenuItemTenantContextGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}
