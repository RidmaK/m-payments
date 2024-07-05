import { UpdateGoogleUserDto } from './../dtos/userDto/updateGoogleUser.dto';
import { UpdateUserDto } from './../dtos/userDto/updateUser.dto';
import { CreateUserDto } from './../dtos/userDto/CreateUserDto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt/dist';
import { CreateGoogleUserDto } from '../dtos/userDto/createGoogleUser.dto';
import * as address from 'address';
import {
  User,
  UserDocument,
  ConvertedUserDto,
  PublicUserDetails,
  RegisterType,
  Status,
  UserId,
} from '../schemas/user.schema';
const ip = address.ip();

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(
    `${ip} src/user/repository/user.repository.ts`,
  );

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  // Create mannual user in db
  // Manual user
  async createUser(createUserDto: CreateUserDto) {
    try {
      const {
        first_name,
        last_name,
        primary_email,
        password,
        is_marketing_accepted,
        verification_code,
        role,
      } = createUserDto;

      const newUser = new this.userModel({
        first_name,
        last_name,
        primary_email,
        password,
        is_marketing_accepted,
        verification_code,
        role,
      });

      return await newUser.save();
    } catch (err) {
      this.logger.error(`Create User Error: ${err}`);
      throw new Error(`Create User Error: ${err}`);
    }
  }

  // Get user details ( public details only )
  _validatePassword(password: string) {
    const regex = /^(?=.*\d)(?=.*\W+)(?=.*[A-Z])(?=.*[a-z]).{8,}$/;

    if (!regex.test(password)) {
      if (password.length < 8) {
        return {
          success: false,
          message: 'The password must be at least 8 characters long.',
        };
      }

      if (!/[A-Z]/.test(password)) {
        return {
          success: false,
          message: 'The password must contain at least one uppercase letter.',
        };
      }
      if (!/[a-z]/.test(password)) {
        return {
          success: false,
          message: 'The password must contain at least one lowercase letter.',
        };
      }
      if (!/\d/.test(password)) {
        return {
          success: false,
          message: 'The password must contain at least one digit.',
        };
      }
      if (!/\W/.test(password)) {
        return {
          success: false,
          message: 'The password must contain at least one special character.',
        };
      }
    } else {
      return {
        success: true,
        message: 'The password is valid.',
      };
    }
  }

  // hashing the password
  async _hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  // Code generate ( 6 numbers length ) for verify the user
  _verificationCodeGenerate(length: number): number {
    const randomNum: any = (
      Math.pow(10, length)
        .toString()
        .slice(length - 1) +
      Math.floor(Math.random() * Math.pow(10, length) + 1).toString()
    ).slice(-length);
    return Number(randomNum);
  }

  // Update lastActiveDate of user
  async updateLastActiveDate(user_id: string): Promise<void> {
    try {
      const user = await this.userModel.findById({ _id: user_id });

      if (user) {
        // Get the current date and time
        const currentDate = new Date();

        // Set time to 00:00:00
        const today = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
        );

        // Update lastActiveDate only if it is null or the date part is earlier than today's date
        const lastActiveDate = user.last_active_date
          ? new Date(user.last_active_date)
          : null;
        const lastActiveDateWithoutTime = lastActiveDate
          ? new Date(
              lastActiveDate.getFullYear(),
              lastActiveDate.getMonth(),
              lastActiveDate.getDate(),
            )
          : null;
        if (!lastActiveDateWithoutTime || lastActiveDateWithoutTime < today) {
          user.last_active_date = currentDate;

          await this.userModel.findByIdAndUpdate({ _id: user_id }, user, {
            new: true,
          });
        }
      }
    } catch (err) {
      this.logger.error(`Update Last Active Date Error: ${err}`);
      throw new Error(`Update Last Active Date Error: ${err}`);
    }
  }

  // Get user id of user
  _getUserId(user_id: string): UserId {
    return {
      id: user_id,
    };
  }

  // Find the user by email
  async findByEmail(email: string): Promise<ConvertedUserDto> {
    try {
      return await this.userModel.findOne({ primary_email: email });
    } catch (err) {
      throw new Error(`Find By Email User Error: ${err}`);
    }
  }

  // Find the user by email
  async findBySecondaryEmail(
    secondary_email: string,
  ): Promise<ConvertedUserDto> {
    try {
      return await this.userModel.findOne({ secondary_email: secondary_email });
    } catch (err) {
      throw new Error(`Find By Email User Error: ${err}`);
    }
  }

  // Find user by user id
  async findById(id: any): Promise<ConvertedUserDto> {
    if (!id) {
      return null;
    }
    try {
      return await this.userModel.findById({
        _id: id,
      });
    } catch (err) {
      this.logger.error(`Find By Id ${id} User Error: ${err}`);
      throw new Error(`Find By Id ${id} User Error: ${err}`);
    }
  }

  // Decode JWT token
  async _decodeJWT(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (err) {
      throw new Error(`Decode JWT Error: ${err}`);
    }
  }

  // Update user by id
  async updateById(id: string, user: UpdateUserDto): Promise<ConvertedUserDto> {
    try {
      // Update user
      return await this.userModel.findByIdAndUpdate(id, user, {
        new: true,
      });
    } catch (err) {
      this.logger.error(`Update By Id Error: ${err}`);
      throw new Error(`Update By Id Error: ${err}`);
    }
  }

  // Check password match
  async _doesPasswordMatch(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Update user password by provided is
  async updatePasswordById(
    id: string,
    newDetails: { password: string; verification_code?: number },
  ): Promise<ConvertedUserDto> {
    try {
      // Update user
      return await this.userModel.findByIdAndUpdate(id, newDetails);
    } catch (err) {
      this.logger.error(`Update Password By Id Error: ${err}`);
      throw new Error(`Update Password By Id Error: ${err}`);
    }
  }

  // Get user details ( public details only )
  _getUserDetails(user: ConvertedUserDto): PublicUserDetails {
    return {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      primary_email: user.primary_email,
      secondary_email: user.secondary_email,
      emails: user.emails,
      image_URL: user.image_URL,
      prefix: user.prefix,
      company_name: user.company_name,
      street_address: user.street_address,
      apartment: user.apartment,
      city: user.city,
      postal_code: user.postal_code,
      country: user.country,
      role: user.role,
      status: user.status,
      is_verified: user.is_verified,
      verification_code: user.verification_code,
      is_marketing_accepted: user.is_marketing_accepted,
      stripe_customer_id: user.stripe_customer_id,
      stripe_default_payment_method: user.stripe_default_payment_method,
      is_user_has_subscription: user.is_user_has_subscription,
      last_active_date: user.last_active_date,
      register_type: user.register_type,
      paypal_user_email: user.paypal_user_email,
    };
  }

  // Create google user in db
  // Google user
  async createGoogleUser(
    createGoogleUserDto: CreateGoogleUserDto,
  ): Promise<ConvertedUserDto> {
    try {
      const {
        first_name,
        last_name,
        primary_email,
        image_URL,
        google_access_token,
        is_marketing_accepted,
      } = createGoogleUserDto;

      const user = new this.userModel({
        first_name,
        last_name,
        primary_email,
        image_URL,
        google_access_token,
        is_marketing_accepted,
        is_verified: true,
        status: Status.ACTIVE,
        register_type: RegisterType.GOOGLE,
      });

      return await user.save();
    } catch (err) {
      this.logger.error(`Create Google User Error: ${err}`);
      throw new Error(`Create Google User Error: ${err}`);
    }
  }

  // Update the existing google user by user id
  async updateGoogleUserById(
    id: string,
    updateGoogleUserDto: UpdateGoogleUserDto,
  ): Promise<ConvertedUserDto> {
    try {
      // Update user
      return await this.userModel.findByIdAndUpdate(id, updateGoogleUserDto);
    } catch (err) {
      this.logger.error(`Update Google User By Id Error: ${err}`);
      throw new Error(`Update Google User By Id Error: ${err}`);
    }
  }

  async updateUser(user_id: any, updateUser: any): Promise<ConvertedUserDto> {
    try {
      return await this.userModel.findOneAndUpdate(
        { _id: user_id },
        updateUser,
        { new: true },
      );
    } catch (err) {
      this.logger.error(`Update User By Id Error: ${err}`);
      throw new Error(`Update User By Id Error: ${err}`);
    }
  }
}
