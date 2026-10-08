import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsString,
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deliveryAddress: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  deliveryLat: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  deliveryLng: number;
}
