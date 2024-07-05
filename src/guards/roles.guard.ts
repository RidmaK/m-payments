import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRepository } from 'src/repository/user.repository';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!roles) {
      return true;
    }

    // Destructuring the request header
    const { headers } = context.switchToHttp().getRequest();

    // Get access token
    let access_token = headers.authorization.replace('Bearer ', '');

    // Error response if no access_token
    if (!access_token) throw new UnauthorizedException('Unauthorized access');

    // Decode the given jwt tokens
    let decodedJwt = await this.userRepository._decodeJWT(access_token);

    // Checking the given token inside states
    if (!decodedJwt.userId && !decodedJwt.userId.id)
      throw new UnauthorizedException('Invalid access token.');

    // Find the existing user for the given id
    const validateUser = await this.userRepository.findById(
      decodedJwt.userId.id,
    );

    if (!validateUser)
      throw new UnauthorizedException(
        `We couldn't find any user associated with that access token.`,
      );

    console.log('validateUser', validateUser);

    // Checking the user role and give the access to the controller for valid user
    return validateUser && roles.includes(validateUser.role);
  }
}
