import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import express from 'express';
import { RegisterDto } from './dtos/register.dto.js';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dtos/login.dto.js';
import { RefreshTokenDto } from './dtos/refresh-token.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: express.Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // cookie cannot be read by browser
      path: '/auth', // cookie is sent only to auth endpoints
      sameSite: 'lax', // same site request, eg: foodengine.com -> foodengine.com/restaurants and when the user clicks a link from another site to foodengine (e.g. clicking a link in an email that goes to foodengine.com).  The URL bar changes, and the method is GET.
      secure: process.env.NODE_ENV === 'production', // cookie can se sent over https in production, but in dev cookie is sent over http protocol.
      maxAge: 7 * 24 * 60 * 60 * 1000, // max age 7 days in milliseconds
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and auto-login' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
    @Body() body: RefreshTokenDto,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken || body.refreshToken;
    if (!rawRefreshToken)
      throw new UnauthorizedException('Refresh token missing');

    const tokens = await this.authService.refreshTokens(rawRefreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token session' })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
    @Body() body: RefreshTokenDto,
  ) {
    const refreshToken = req.cookies?.refreshToken || body.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/auth' });
    return { message: 'Logged out successfully', success: true };
  }
}
