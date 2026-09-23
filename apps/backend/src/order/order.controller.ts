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
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '@foodengine/database';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { OrderTenantContextGuard } from './guards/order-tenant-context.guard.js';
import { RestaurantTenantContextGuard } from '../restaurant/guards/restaurant-tenant-context.guard.js';

@ApiTags('Order')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Place a new multi-item order (Customer)' })
  @ApiResponse({
    status: 201,
    description: 'Order created with locked price snapshots',
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.orderService.createOrder(user.userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order history for current customer' })
  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.orderService.getCustomerOrders(user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order details by ID' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.orderService.getOrderById(id, user.userId, UserRole.CUSTOMER);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get active orders for a restaurant (Merchant Dashboard)',
  })
  @UseGuards(JwtAuthGuard, RestaurantTenantContextGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Get('restaurant/:restaurantId')
  async getRestaurantOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.orderService.getRestaurantOrders(restaurantId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update order status (e.g. PREPARING, READY_FOR_PICKUP)',
  })
  @UseGuards(JwtAuthGuard, OrderTenantContextGuard, TenantRoleGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto);
  }
}
