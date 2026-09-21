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

  // conver the raw refresh token into hash token
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // generates accesstoken using jwtservice and refreshtoken
  private async generateTokens(userId: number, email: string, role:UserRole,  family: string) {
    const payload = { sub: userId, email, role };
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

    // while refreshing or token rotation if isRevoked is already set to true means it is already revoked, then update all the family by setting isRevoked === true. 
    if (tokenRecord?.isRevoked) {
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Security alert: Session compromised. Please login',
      );
    }

    const hasExpired = tokenRecord?.expiresAt ?? undefined;

    if (new Date() > hasExpired!) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // while refreshing or token rotation update the refresh token by setting isRevoked to true, 
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord!.id },
      data: { isRevoked: true },
    });

    // after setting the isRevoked to true, generate the new tokens for same family.
    return this.generateTokens(
      tokenRecord?.userId!,
      tokenRecord?.user.email!,
      tokenRecord?.user.userRole!,
      tokenRecord?.family!
    );
  }
}
