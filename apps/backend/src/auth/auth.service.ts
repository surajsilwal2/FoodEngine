import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/auth.dto.js';
import { PrismaService } from '@foodengine/database';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // conver the raw refresh token into hash token
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // generates accesstoken using jwtservice and refreshtoken
  private async generateTokens(userId: number, email: string, family: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  // signup with auto-login
  async register(registerDto: RegisterDto) {
    const emailExits = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });
    if (emailExits) throw new ConflictException('Email already Exists');
    const saltRound = 12;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRound);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const family = crypto.randomUUID();
    const tokens = await this.generateTokens(user.id, user.email, family);

    return { user, tokens };
  }

  // login
  async login(registerDto: RegisterDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      registerDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid emaill or password');

    const family = crypto.randomUUID();
    const tokens = await this.generateTokens(user.id, user.email, family);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens,
    };
  }

  //logout
  async logout(refreshToken: string) {
    if (!refreshToken) return { success: true };

    const tokenHash = this.hashToken(refreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (tokenRecord) {
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { isRevoked: true },
      });
    }

    return { success: true, message: 'Logged out successfully' };
  }

  // refresh token rotation
  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

      if (tokenRecord?.isRevoked) {
          await this.prisma.refreshToken.updateMany({
              where: {family: tokenRecord.family},
              data: {isRevoked: true}
          })
          throw new UnauthorizedException('Security alert: Session compromised. Please login')
      }

     const hasExpired = tokenRecord?.expiresAt ?? undefined

      if (new Date() > hasExpired! ) {
          throw new UnauthorizedException('Refresh token has expired')
      }
      await this.prisma.refreshToken.update({
          where: { id: tokenRecord!.id },
          data: {isRevoked: true}
      })
      
      return this.generateTokens(tokenRecord?.userId!, tokenRecord?.user.email!, tokenRecord?.family!)
  }
} 
