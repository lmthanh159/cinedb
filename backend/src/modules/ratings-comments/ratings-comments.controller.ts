import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { CreateCommentDto } from '@/modules/ratings-comments/dto/create-comment.dto';
import { CreateRatingDto } from '@/modules/ratings-comments/dto/create-rating.dto';
import { QueryRatingDto } from '@/modules/ratings-comments/dto/query-rating.dto';
import { ReportCommentDto } from '@/modules/ratings-comments/dto/report-comment.dto';
import { UpdateCommentDto } from '@/modules/ratings-comments/dto/update-comment.dto';
import {
  CommentResponseEntity,
  MyRatingsResponseEntity,
  RatingResponseEntity,
  ReportResponseEntity,
  SeriesRatingResponseEntity,
} from '@/modules/ratings-comments/entities/ratings-comments-response.entity';
import { RatingsCommentsService } from '@/modules/ratings-comments/ratings-comments.service';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RatingsController {
  constructor(private readonly ratingsCommentsService: RatingsCommentsService) {}

  @Post('movies/:id/rating')
  @ApiOperation({ summary: 'Rate or update current user rating for a movie' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CreateRatingDto })
  @ApiOkResponse({ type: RatingResponseEntity })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rateMovie(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsCommentsService.rateMovie(user.userId, movieId, dto);
  }

  @Delete('movies/:id/rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user rating for a movie' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: RatingResponseEntity })
  async deleteMovieRating(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) movieId: number,
  ) {
    return this.ratingsCommentsService.deleteMovieRating(user.userId, movieId);
  }

  @Post('tv/:id/rating')
  @ApiOperation({ summary: 'Rate or update current user rating for a TV series' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CreateRatingDto })
  @ApiOkResponse({ type: SeriesRatingResponseEntity })
  async rateSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsCommentsService.rateSeries(user.userId, seriesId, dto);
  }

  @Delete('tv/:id/rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user rating for a TV series' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: SeriesRatingResponseEntity })
  async deleteSeriesRating(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) seriesId: number,
  ) {
    return this.ratingsCommentsService.deleteSeriesRating(user.userId, seriesId);
  }

  @Get('users/me/ratings')
  @ApiOperation({ summary: 'Get current user ratings with movie or TV info' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: MyRatingsResponseEntity })
  async getMyRatings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryRatingDto,
  ) {
    return this.ratingsCommentsService.getMyRatings(user.userId, query);
  }
}

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly ratingsCommentsService: RatingsCommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a movie or TV series comment' })
  @ApiBody({ type: CreateCommentDto })
  @ApiOkResponse({ type: CommentResponseEntity })
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.ratingsCommentsService.createComment(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update own comment' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateCommentDto })
  @ApiOkResponse({ type: CommentResponseEntity })
  async updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.ratingsCommentsService.updateComment(user.userId, commentId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own comment or delete as admin' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    return this.ratingsCommentsService.deleteComment(user.userId, user.role, commentId);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report an active comment' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: ReportCommentDto })
  @ApiOkResponse({ type: ReportResponseEntity })
  async reportComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) commentId: number,
    @Body() dto: ReportCommentDto,
  ) {
    return this.ratingsCommentsService.reportComment(user.userId, commentId, dto);
  }
}
