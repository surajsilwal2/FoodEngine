
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@foodengine/database';

export class UpdateOrderDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  newStatus: OrderStatus;
}
