import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token. Omit this when the refreshToken cookie is sent.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
