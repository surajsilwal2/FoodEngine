import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export interface CurrentUserPayload {
  userId: number;
  email: string;
}
export const currentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        'CurrentUser used without an auth guard',
      );
    }

    // specific property was requested like email or id then return user?.[property/data] or return whole objeect i.e. user
    return data ? user?.[data] : user;
  },
);
