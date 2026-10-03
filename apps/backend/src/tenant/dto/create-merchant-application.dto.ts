import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMerchantApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(2)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(5)
  businessAddress: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @MinLength(7)
  contactPhone: string;
}