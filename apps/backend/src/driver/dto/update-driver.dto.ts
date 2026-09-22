import { PartialType } from '@nestjs/swagger';
import {
  ApplyDriverDto,
  ApproveDriverDto,
  CreateDriverDto,
} from './create-driver.dto.js';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
export class updateApplyDto extends PartialType(ApplyDriverDto) {}
export class updateApprovedDto extends PartialType(ApproveDriverDto) {}
