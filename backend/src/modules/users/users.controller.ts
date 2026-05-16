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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { ChangeUserPasswordDto } from '@/modules/users/dto/change-user-password.dto';
import { QueryActivityDto } from '@/modules/users/dto/query-activity.dto';
import { QueryUserListDto } from '@/modules/users/dto/query-user-list.dto';
import { UpdateUserProfileDto } from '@/modules/users/dto/update-user-profile.dto';
import {
  ActivityListResponseEntity,
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
