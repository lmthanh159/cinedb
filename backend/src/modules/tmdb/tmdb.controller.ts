import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { FullImportDto } from '@/modules/tmdb/dto/full-import.dto';
import { SyncLogsQueryDto } from '@/modules/tmdb/dto/sync-logs-query.dto';
import { TmdbSearchQueryDto } from '@/modules/tmdb/dto/tmdb-search-query.dto';
import {
  TmdbFullImportResponseEntity,
  TmdbSyncLogsResponseEntity,
} from '@/modules/tmdb/entities/tmdb-response.entity';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';

@ApiTags('Admin - TMDB')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/tmdb')
export class TmdbController {
  constructor(
    private readonly tmdbClientService: TmdbClientService,
    private readonly tmdbSyncService: TmdbSyncService,
  ) {}

  @Post('import/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a full TMDB import for movies and TV series' })
  @ApiBody({ type: FullImportDto })
  @ApiOkResponse({ type: TmdbFullImportResponseEntity })
  async fullImport(@Body() dto: FullImportDto) {
    return this.tmdbSyncService.fullImport(dto);
  }

  @Post('import/movie/:tmdbId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import one movie from TMDB by TMDB ID' })
  @ApiParam({ name: 'tmdbId', example: 550 })
  async importMovie(@Param('tmdbId', ParseIntPipe) tmdbId: number) {
    return this.tmdbSyncService.importSingleMovie(tmdbId);
  }

  @Post('import/tv/:tmdbId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import one TV series from TMDB by TMDB ID' })
  @ApiParam({ name: 'tmdbId', example: 1399 })
  async importTv(@Param('tmdbId', ParseIntPipe) tmdbId: number) {
    return this.tmdbSyncService.importSingleTV(tmdbId);
  }

  @Get('search/movie')
  @ApiOperation({ summary: 'Search TMDB movies' })
  @ApiQuery({ name: 'query', required: true, example: 'batman' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async searchMovies(@Query() query: TmdbSearchQueryDto) {
    return this.tmdbClientService.searchMovies(query.query, query.page);
  }

  @Get('search/tv')
  @ApiOperation({ summary: 'Search TMDB TV series' })
  @ApiQuery({ name: 'query', required: true, example: 'dark' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async searchTv(@Query() query: TmdbSearchQueryDto) {
    return this.tmdbClientService.searchTV(query.query, query.page);
  }

  @Post('sync/daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger TMDB daily sync manually' })
  @ApiOkResponse({ type: TmdbFullImportResponseEntity })
  async dailySync() {
    return this.tmdbSyncService.dailySync();
  }

  @Get('sync/logs')
  @ApiOperation({ summary: 'Get TMDB sync history' })
  @ApiOkResponse({ type: TmdbSyncLogsResponseEntity })
  async getSyncLogs(@Query() query: SyncLogsQueryDto) {
    return this.tmdbSyncService.getSyncLogs(query);
  }
}
