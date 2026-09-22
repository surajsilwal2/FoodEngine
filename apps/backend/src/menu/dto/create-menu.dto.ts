import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMenuDto {
  @IsInt()
  @IsPositive()
  restaurantId: number;

  @IsInt()
  @IsPositive()
  tenantId: number;

  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsBoolean()
  isAvailable: boolean;
}

export class CreateCategoryDto {
  @IsInt()
  @IsPositive()
  restaurantId: number;

  @IsInt()
  @IsPositive()
  tenantId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsInt()
  @IsPositive()
  displayOrder: number;
}
