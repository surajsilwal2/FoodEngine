import { PaymentMethod } from '@foodengine/database';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const ONLINE_PAYMENT_METHODS = [
  PaymentMethod.MOCK_CARD,
  PaymentMethod.MOCK_WALLET,
];

export class ProcessPaymentDto {
  // The order to charge; customer ownership is checked in PaymentsService.
  @IsInt()
  @Min(1)
  orderId: number;

  // This project currently simulates each listed method.
  @IsOptional()
  @IsIn(ONLINE_PAYMENT_METHODS)
  paymentMethod?: PaymentMethod;
}
