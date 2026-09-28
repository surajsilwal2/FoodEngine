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
import { DeliveryService } from './delivery.service.js';
import { UpdateDeliveryDto } from './dto/update-delivery.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { Roles } from '../auth/decorators/role.decorator.js';
import { UserRole } from '@foodengine/database';

@ApiTags('Deliveries')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accept a delivery offer (Driver only)' })
  @ApiResponse({ status: 200, description: 'Delivery assigned to driver' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.DRIVER)
  @Post(':id/accept')
  async acceptDelivery(
    @Param('id', ParseIntPipe) id: number,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.deliveryService.acceptDelivery(user.userId, user.role, id);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update delivery status (e.g. PICKED_UP, DELIVERED)',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.DRIVER)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.deliveryService.updateDeliveryStatus(
      user.userId,
      user.role,
      id,
      dto,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current active delivery for logged-in driver' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.DRIVER)
  @Get('active')
  async getActiveDelivery(
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.deliveryService.getActiveDriverDelivery(user.userId, user.role);
  }
}

