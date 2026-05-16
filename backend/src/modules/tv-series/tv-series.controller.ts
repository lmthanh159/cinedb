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
import { CreateEpisodeDto } from '@/modules/tv-series/dto/create-episode.dto';
import { CreateSeasonDto } from '@/modules/tv-series/dto/create-season.dto';
import { CreateTvSeriesDto } from '@/modules/tv-series/dto/create-tv-series.dto';
import { TvSeriesQueryDto } from '@/modules/tv-series/dto/tv-series-query.dto';
import { UpdateEpisodeDto } from '@/modules/tv-series/dto/update-episode.dto';
import { UpdateSeasonDto } from '@/modules/tv-series/dto/update-season.dto';
import { UpdateTvSeriesDto } from '@/modules/tv-series/dto/update-tv-series.dto';
import {
  EpisodeResponseEntity,
  SeasonDetailResponseEntity,
  TvCreditsResponseEntity,
  TvSeriesDetailResponseEntity,
  TvSeriesListResponseEntity,
  TvVideosResponseEntity,
} from '@/modules/tv-series/entities/tv-series-response.entity';
import { TvSeriesService } from '@/modules/tv-series/tv-series.service';

@ApiTags('TV Series')
@Controller('tv')
export class TvSeriesController {
  constructor(private readonly tvSeriesService: TvSeriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated TV series list' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'category', required: false, enum: ['popular', 'now_playing', 'upcoming', 'top_rated'] })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['popularity', 'vote_average', 'first_air_date', 'title'] })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiOkResponse({ type: TvSeriesListResponseEntity })
  async getTvSeries(@Query() query: TvSeriesQueryDto) {
    return this.tvSeriesService.getTvSeries(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get TV series details' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TvSeriesDetailResponseEntity })
  @ApiResponse({ status: 404, description: 'TV series not found' })
  async getTvSeriesById(@Param('id', ParseIntPipe) id: number) {
    return this.tvSeriesService.getTvSeriesById(id);
  }

  @Get(':id/credits')
  @ApiOperation({ summary: 'Get full cast and crew for a TV series' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TvCreditsResponseEntity })
  async getTvSeriesCredits(@Param('id', ParseIntPipe) id: number) {
    return this.tvSeriesService.getTvSeriesCredits(id);
  }

  @Get(':id/videos')
  @ApiOperation({ summary: 'Get TV series trailers and videos' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TvVideosResponseEntity })
  async getTvSeriesVideos(@Param('id', ParseIntPipe) id: number) {
    return this.tvSeriesService.getTvSeriesVideos(id);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar TV series' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 2,
            title: 'Another Similar Series',
          },
        ],
      },
    },
  })
  async getSimilarTvSeries(@Param('id', ParseIntPipe) id: number) {
    return this.tvSeriesService.getSimilarTvSeries(id);
  }

  @Get(':id/season/:seasonNumber')
  @ApiOperation({ summary: 'Get season details including episodes' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiOkResponse({ type: SeasonDetailResponseEntity })
  async getSeason(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
  ) {
    return this.tvSeriesService.getSeason(id, seasonNumber);
  }

  @Get(':id/season/:seasonNumber/episode/:episodeNumber')
  @ApiOperation({ summary: 'Get episode details' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiParam({ name: 'episodeNumber', example: 1 })
  @ApiOkResponse({ type: EpisodeResponseEntity })
  async getEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
    @Param('episodeNumber', ParseIntPipe) episodeNumber: number,
  ) {
    return this.tvSeriesService.getEpisode(id, seasonNumber, episodeNumber);
  }
}

@ApiTags('Admin - TV Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/tv')
export class AdminTvSeriesController {
  constructor(private readonly tvSeriesService: TvSeriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a TV series record' })
  @ApiBody({ type: CreateTvSeriesDto })
  @ApiOkResponse({ type: TvSeriesDetailResponseEntity })
  async createTvSeries(@Body() dto: CreateTvSeriesDto) {
    return this.tvSeriesService.createTvSeries(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a TV series record' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateTvSeriesDto })
  @ApiOkResponse({ type: TvSeriesDetailResponseEntity })
  async updateTvSeries(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTvSeriesDto,
  ) {
    return this.tvSeriesService.updateTvSeries(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a TV series record' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async deleteTvSeries(@Param('id', ParseIntPipe) id: number) {
    return this.tvSeriesService.deleteTvSeries(id);
  }

  @Post(':id/season')
  @ApiOperation({ summary: 'Create a season for a TV series' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CreateSeasonDto })
  @ApiOkResponse({ type: SeasonDetailResponseEntity })
  async createSeason(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSeasonDto,
  ) {
    return this.tvSeriesService.createSeason(id, dto);
  }

  @Put(':id/season/:seasonNumber')
  @ApiOperation({ summary: 'Update an existing season' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiBody({ type: UpdateSeasonDto })
  @ApiOkResponse({ type: SeasonDetailResponseEntity })
  async updateSeason(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.tvSeriesService.updateSeason(id, seasonNumber, dto);
  }

  @Delete(':id/season/:seasonNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a season and its episodes' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async deleteSeason(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
  ) {
    return this.tvSeriesService.deleteSeason(id, seasonNumber);
  }

  @Post(':id/season/:seasonNumber/episode')
  @ApiOperation({ summary: 'Create an episode in a season' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiBody({ type: CreateEpisodeDto })
  @ApiOkResponse({ type: EpisodeResponseEntity })
  async createEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
    @Body() dto: CreateEpisodeDto,
  ) {
    return this.tvSeriesService.createEpisode(id, seasonNumber, dto);
  }

  @Put(':id/season/:seasonNumber/episode/:episodeNumber')
  @ApiOperation({ summary: 'Update an episode in a season' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiParam({ name: 'episodeNumber', example: 1 })
  @ApiBody({ type: UpdateEpisodeDto })
  @ApiOkResponse({ type: EpisodeResponseEntity })
  async updateEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
    @Param('episodeNumber', ParseIntPipe) episodeNumber: number,
    @Body() dto: UpdateEpisodeDto,
  ) {
    return this.tvSeriesService.updateEpisode(id, seasonNumber, episodeNumber, dto);
  }

  @Delete(':id/season/:seasonNumber/episode/:episodeNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an episode from a season' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'seasonNumber', example: 1 })
  @ApiParam({ name: 'episodeNumber', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async deleteEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
    @Param('episodeNumber', ParseIntPipe) episodeNumber: number,
  ) {
    return this.tvSeriesService.deleteEpisode(id, seasonNumber, episodeNumber);
  }
}
