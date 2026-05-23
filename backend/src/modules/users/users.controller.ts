import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { ChangeUserPasswordDto } from '@/modules/users/dto/change-user-password.dto';
import { LockUserDto } from '@/modules/users/dto/lock-user.dto';
import { QueryActivityDto } from '@/modules/users/dto/query-activity.dto';
import { QueryAdminUsersDto } from '@/modules/users/dto/query-admin-users.dto';
import { QueryUserListDto } from '@/modules/users/dto/query-user-list.dto';
import { UpdateAdminUserDto } from '@/modules/users/dto/update-admin-user.dto';
import { UpdateUserProfileDto } from '@/modules/users/dto/update-user-profile.dto';
import {
  ActivityListResponseEntity,
  AdminStatsEntity,
  AdminUserEntity,
  AdminUserListResponseEntity,
  CollectionListResponseEntity,
  PublicUserProfileEntity,
  ToggleResponseEntity,
  UserProfileEntity,
} from '@/modules/users/entities/user-response.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserProfileEntity })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getCurrentUser(user.userId);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiOkResponse({ type: UserProfileEntity })
  async updateCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateCurrentUser(user.userId, dto);
  }

  @Patch('users/me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangeUserPasswordDto })
  @ApiOkResponse({ type: MessageResponseEntity })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeUserPasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Get('users/me/watchlist')
  @ApiOperation({ summary: 'Get current user watchlist' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: CollectionListResponseEntity })
  async getWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryUserListDto,
  ) {
    return this.usersService.getWatchlist(user.userId, query);
  }

  @Post('movies/:id/watchlist')
  @ApiOperation({ summary: 'Toggle movie in watchlist' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ToggleResponseEntity })
  async toggleMovieWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
  ) {
    return this.usersService.toggleMovieWatchlist(user.userId, movieId);
  }

  @Post('tv/:id/watchlist')
  @ApiOperation({ summary: 'Toggle TV series in watchlist' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ToggleResponseEntity })
  async toggleSeriesWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
  ) {
    return this.usersService.toggleSeriesWatchlist(user.userId, seriesId);
  }

  @Delete('movies/:id/watchlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove movie from watchlist' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async removeMovieWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
  ) {
    return this.usersService.removeMovieWatchlist(user.userId, movieId);
  }

  @Delete('tv/:id/watchlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove TV series from watchlist' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async removeSeriesWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
  ) {
    return this.usersService.removeSeriesWatchlist(user.userId, seriesId);
  }

  @Get('users/me/favorites')
  @ApiOperation({ summary: 'Get current user favorites' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: CollectionListResponseEntity })
  async getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryUserListDto,
  ) {
    return this.usersService.getFavorites(user.userId, query);
  }

  @Post('movies/:id/favorite')
  @ApiOperation({ summary: 'Toggle movie in favorites' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ToggleResponseEntity })
  async toggleMovieFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
  ) {
    return this.usersService.toggleMovieFavorite(user.userId, movieId);
  }

  @Post('tv/:id/favorite')
  @ApiOperation({ summary: 'Toggle TV series in favorites' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ToggleResponseEntity })
  async toggleSeriesFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
  ) {
    return this.usersService.toggleSeriesFavorite(user.userId, seriesId);
  }

  @Delete('movies/:id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove movie from favorites' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async removeMovieFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
  ) {
    return this.usersService.removeMovieFavorite(user.userId, movieId);
  }

  @Delete('tv/:id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove TV series from favorites' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async removeSeriesFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
  ) {
    return this.usersService.removeSeriesFavorite(user.userId, seriesId);
  }

  @Get('users/me/activity')
  @ApiOperation({ summary: 'Get current user activity feed' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'type', required: false, example: 'RATE' })
  @ApiOkResponse({ type: ActivityListResponseEntity })
  async getActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryActivityDto,
  ) {
    return this.usersService.getActivity(user.userId, query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'id', example: '11111111-1111-1111-1111-111111111111' })
  @ApiOkResponse({ type: PublicUserProfileEntity })
  async getPublicProfile(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.getPublicProfile(userId);
  }
}

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get paginated users for admin management' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'q', required: false, example: 'admin@cinedb.com' })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'USER'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'UNVERIFIED', 'LOCKED'] })
  @ApiOkResponse({ type: AdminUserListResponseEntity })
  async getUsers(@Query() query: QueryAdminUsersDto) {
    return this.usersService.getAdminUsers(query);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user profile, role, or status as admin' })
  @ApiParam({ name: 'id', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdateAdminUserDto })
  @ApiOkResponse({ type: AdminUserEntity })
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.usersService.updateAdminUser(user.userId, userId, dto);
  }

  @Post('users/:id/lock')
  @ApiOperation({ summary: 'Lock a user account as admin' })
  @ApiParam({ name: 'id', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: LockUserDto })
  @ApiOkResponse({ type: AdminUserEntity })
  async lockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: LockUserDto,
  ) {
    return this.usersService.lockAdminUser(user.userId, userId, dto);
  }

  @Post('users/:id/unlock')
  @ApiOperation({ summary: 'Unlock a user account as admin' })
  @ApiParam({ name: 'id', example: '11111111-1111-1111-1111-111111111111' })
  @ApiOkResponse({ type: AdminUserEntity })
  async unlockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ) {
    return this.usersService.unlockAdminUser(user.userId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard totals' })
  @ApiOkResponse({ type: AdminStatsEntity })
  async getStats() {
    return this.usersService.getAdminStats();
  }
}
