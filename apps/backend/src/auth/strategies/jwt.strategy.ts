import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JWTPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // extract the bearer token from incoming header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // don't igonre the expiration
      ignoreExpiration: false,

      // secret key to verfiy the token
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'MYSecretKey',
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
    };
  }
}
