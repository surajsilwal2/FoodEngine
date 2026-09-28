import { DeliveryStatus } from '@foodengine/database';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateDeliveryDto {
  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.PICKED_UP })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;
}
