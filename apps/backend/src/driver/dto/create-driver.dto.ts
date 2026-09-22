import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDriverDto { }

export class ApplyDriverDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licenseNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  vehicleDetails: string;
}

export class ApproveDriverDto {
  @IsBoolean()
  isApproved: boolean;
}

export class AvailableDriverDto {
  @IsBoolean()
  isOnline: boolean;
}
