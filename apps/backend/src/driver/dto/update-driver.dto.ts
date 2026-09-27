import { PartialType } from '@nestjs/swagger';
import {
  ApplyDriverDto,
  ApproveDriverDto,
  CreateDriverDto,
} from './create-driver.dto.js';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
export class updateApplyDto extends PartialType(ApplyDriverDto) {}
export class updateLocationDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat: number

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng: number
}
