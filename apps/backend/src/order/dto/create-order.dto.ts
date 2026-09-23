import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  menuItemId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  tenantId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  restaurantId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
