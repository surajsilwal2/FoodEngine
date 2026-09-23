import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import * as currentUserDecorator from '../auth/decorators/current-user.decorator.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Process mock payment for an order' })
  @ApiResponse({
    status: 201,
    description: 'Payment completed, order confirmed, delivery initialized',
  })
  @ApiResponse({
    status: 400,
    description: 'Order not in PENDING status or already paid',
  })
  @UseGuards(JwtAuthGuard)
  @Post('process')
  async processPayment(
    @Body() dto: ProcessPaymentDto,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    // The service uses the authenticated user ID to ensure a customer can pay
    // only for their own order; it never trusts a customer ID from the body.
    return this.paymentsService.createPayment(user.userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment status for a specific order' })
  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  async getPaymentByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @currentUserDecorator.currentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    // Preserve the role from the JWT so the service can apply its customer,
    // merchant, and system-admin access rules.
    return this.paymentsService.getPaymentByOrder(
      orderId,
      user.userId,
      user.role,
    );
  }
}
