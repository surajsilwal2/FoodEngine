import { PaymentMethod } from '@foodengine/database';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class ProcessPaymentDto {
  // The order to charge; customer ownership is checked in PaymentsService.
  @IsInt()
  @Min(1)
  orderId: number;

  // This project currently simulates each listed method.
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
