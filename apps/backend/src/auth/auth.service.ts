import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto.js';
import { PrismaService, UserRole } from '@foodengine/database';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { LoginDto } from './dtos/login.dto.js';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // convert the raw refresh token into hash token
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // generates accesstoken using jwtservice and refreshtoken
  private async generateTokens(userId: number, email: string, role:UserRole,  family: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);
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
        userRole: true
      },
    });

    const family = crypto.randomUUID();
    const tokens = await this.generateTokens(user.id, user.email,user.userRole, family );

    return { user, tokens };
  }

  // login
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid emaill or password');

    const family = crypto.randomUUID();
    const tokens = await this.generateTokens(user.id, user.email, user.userRole, family);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userRole: user.userRole,
      },
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

    // Reject unknown tokens before checking revocation or expiry fields.
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // If the token is already revoked, check if it was rotated very recently (within 30 seconds).
    // In real systems, concurrent requests or network jitter may cause multiple requests to arrive with
    // the same refresh token before the client stores the new one.
    if (tokenRecord?.isRevoked) {
      const timeSinceRevocation = Date.now() - new Date(tokenRecord.updatedAt).getTime();
      if (timeSinceRevocation <= 30000) {
        const latestActiveToken = await this.prisma.refreshToken.findFirst({
          where: { family: tokenRecord.family, isRevoked: false },
          orderBy: { createdAt: 'desc' },
        });
        if (latestActiveToken && new Date() < latestActiveToken.expiresAt) {
          const payload = {
            sub: tokenRecord.user.id,
            email: tokenRecord.user.email,
            role: tokenRecord.user.userRole,
          };
          const accessToken = this.jwtService.sign(payload);
          return {
            accessToken,
            refreshToken: rawRefreshToken,
          };
        }
      }

      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Security alert: Session compromised. Please login',
      );
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // while refreshing or token rotation update the refresh token by setting isRevoked to true, 
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // after setting the isRevoked to true, generate the new tokens for same family.
    return this.generateTokens(
      tokenRecord.userId,
      tokenRecord.user.email,
      tokenRecord.user.userRole,
      tokenRecord.family
    );
  }
}
