import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AuthService } from '@/modules/auth/auth.service';
import type { AuthenticatedUser, GoogleProfileUser } from '@/modules/auth/auth.types';
import { ChangePasswordDto } from '@/modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@/modules/auth/dto/forgot-password.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { LogoutDto } from '@/modules/auth/dto/logout.dto';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { ResetPasswordDto } from '@/modules/auth/dto/reset-password.dto';
import { VerifyEmailDto } from '@/modules/auth/dto/verify-email.dto';
import {
  AccessTokenResponseEntity,
  AuthTokensResponseEntity,
  MessageResponseEntity,
} from '@/modules/auth/entities/auth-response.entity';
import { AuthUserEntity } from '@/modules/auth/entities/auth-user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  @ApiOperation({
    summary: 'Register a new user account',
  })
  @ApiResponse({
    status: 201,
    type: MessageResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or password policy not met',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  @ApiOperation({
    summary: 'Authenticate with email and password',
  })
  @ApiOkResponse({
    type: AuthTokensResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 403,
    description: 'Account not active or locked',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a new access token from refresh token',
  })
  @ApiOkResponse({
    type: AccessTokenResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid or expired',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout the current user',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(user, dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset token',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using a reset token',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalid or expired',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify email using token',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  async verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Redirect to Google OAuth consent screen',
  })
  @ApiFoundResponse({
    description: 'Redirects to Google OAuth',
  })
  async googleAuth() {
    return undefined;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Handle Google OAuth callback',
  })
  @ApiFoundResponse({
    description: 'Redirects to frontend callback with tokens',
  })
  async googleCallback(
    @Req() request: Request & { user: GoogleProfileUser },
    @Res() response: Response,
  ) {
    const { redirectUrl } = await this.authService.handleGoogleCallback(
      request.user,
    );

    return response.redirect(redirectUrl);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current authenticated user',
  })
  @ApiOkResponse({
    type: AuthUserEntity,
  })
  async me(@CurrentUser('userId') userId: string) {
    return this.authService.getCurrentUser(userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password for the current authenticated user',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Current password incorrect or password policy failed',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @Get('admin/probe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin-only probe endpoint for authorization checks',
  })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async adminProbe() {
    return {
      message: 'Admin access granted.',
    };
  }
}
