import { UserRole } from '@foodengine/database';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JWTPayload {
  sub: number;
  email: string;
  role: UserRole
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    // super calls the constructor of the parent class (PassportStrategy) and passes in the options for the JWT strategy. These options include how to extract the JWT from the request, whether to ignore expiration, and the secret key used to verify the token.
    super({
      // extract the bearer token from incoming header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // don't igonre the expiration
      ignoreExpiration: false,

      // secret key to verfiy the token
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // called automatically by PASSPORT after the token is verified
  async validate(payload: JWTPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // this returned object is attached to req.user by Nestjs
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }
}
