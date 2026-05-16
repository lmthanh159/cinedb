import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { CreateMovieDto } from '@/modules/movies/dto/create-movie.dto';
import { MovieQueryDto } from '@/modules/movies/dto/movie-query.dto';
import { MovieReviewsQueryDto } from '@/modules/movies/dto/movie-reviews-query.dto';
import { UpdateMovieDto } from '@/modules/movies/dto/update-movie.dto';
import {
  MovieCreditsResponseEntity,
  MovieDetailResponseEntity,
  MovieImagesResponseEntity,
  MovieListResponseEntity,
  MovieReviewsResponseEntity,
  MovieVideosResponseEntity,
} from '@/modules/movies/entities/movie-response.entity';
import { MoviesService } from '@/modules/movies/movies.service';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated movie list',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'category', required: false, enum: ['popular', 'now_playing', 'upcoming', 'top_rated'] })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['popularity', 'vote_average', 'release_date', 'title'] })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiOkResponse({
    type: MovieListResponseEntity,
  })
  async getMovies(@Query() query: MovieQueryDto) {
    return this.moviesService.getMovies(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get full movie details',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    type: MovieDetailResponseEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found',
  })
  async getMovieById(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getMovieById(id);
  }

  @Get(':id/credits')
  @ApiOperation({
    summary: 'Get full cast and crew for a movie',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    type: MovieCreditsResponseEntity,
  })
  async getMovieCredits(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getMovieCredits(id);
  }

  @Get(':id/images')
  @ApiOperation({
    summary: 'Get movie posters and backdrops',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    type: MovieImagesResponseEntity,
  })
  async getMovieImages(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getMovieImages(id);
  }

  @Get(':id/videos')
  @ApiOperation({
    summary: 'Get movie trailers and videos',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    type: MovieVideosResponseEntity,
  })
  async getMovieVideos(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getMovieVideos(id);
  }

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Get similar movies',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 2,
            title: 'Another Similar Movie',
          },
        ],
      },
    },
  })
  async getSimilarMovies(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getSimilarMovies(id);
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Get movie reviews merged from ratings and active comments',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['created_at', 'score'] })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiOkResponse({
    type: MovieReviewsResponseEntity,
  })
  async getMovieReviews(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MovieReviewsQueryDto,
  ) {
    return this.moviesService.getMovieReviews(id, query);
  }
}

@ApiTags('Admin - Movies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/movies')
export class AdminMoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a movie record',
  })
  @ApiBody({
    type: CreateMovieDto,
  })
  @ApiOkResponse({
    type: MovieDetailResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async createMovie(@Body() dto: CreateMovieDto) {
    return this.moviesService.createMovie(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update an existing movie record',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    type: UpdateMovieDto,
  })
  @ApiOkResponse({
    type: MovieDetailResponseEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Movie not found',
  })
  async updateMovie(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieDto,
  ) {
    return this.moviesService.updateMovie(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete a movie record',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    type: MessageResponseEntity,
  })
  async deleteMovie(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.deleteMovie(id);
  }
}
