import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @MinLength(2)
  businessName: string;
}
