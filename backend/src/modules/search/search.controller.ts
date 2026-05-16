import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AutocompleteQueryDto } from '@/modules/search/dto/autocomplete-query.dto';
import { DiscoverQueryDto } from '@/modules/search/dto/discover-query.dto';
import { SearchQueryDto } from '@/modules/search/dto/search-query.dto';
import {
  AutocompleteResponseEntity,
  ReindexResponseEntity,
  SearchListResponseEntity,
} from '@/modules/search/entities/search-response.entity';
import { SearchSyncService } from '@/modules/search/search-sync.service';
import { SearchService } from '@/modules/search/search.service';

@ApiTags('Search')
@Controller()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchSyncService: SearchSyncService,
  ) {}

  @Get('search/multi')
  @ApiOperation({ summary: 'Search across movies, TV series, and people' })
  @ApiQuery({ name: 'query', required: true, example: 'batman' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async multiSearch(@Query() query: SearchQueryDto) {
    return this.searchService.multiSearch(query);
  }

  @Get('search/movie')
  @ApiOperation({ summary: 'Search movies' })
  @ApiQuery({ name: 'query', required: true, example: 'batman' })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async searchMovies(@Query() query: SearchQueryDto) {
    return this.searchService.searchMovies(query);
  }

  @Get('search/tv')
  @ApiOperation({ summary: 'Search TV series' })
  @ApiQuery({ name: 'query', required: true, example: 'breaking' })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async searchTv(@Query() query: SearchQueryDto) {
    return this.searchService.searchTv(query);
  }

  @Get('search/person')
  @ApiOperation({ summary: 'Search people' })
  @ApiQuery({ name: 'query', required: true, example: 'nolan' })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async searchPeople(@Query() query: SearchQueryDto) {
    return this.searchService.searchPeople(query);
  }

  @Get('search/autocomplete')
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiQuery({ name: 'query', required: true, example: 'ba' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiOkResponse({ type: AutocompleteResponseEntity })
  async autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.searchService.autocomplete(query);
  }

  @Get('discover/movie')
  @ApiOperation({ summary: 'Discover movies by filters' })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async discoverMovies(@Query() query: DiscoverQueryDto) {
    return this.searchService.discoverMovies(query);
  }

  @Get('discover/tv')
  @ApiOperation({ summary: 'Discover TV series by filters' })
  @ApiOkResponse({ type: SearchListResponseEntity })
  async discoverTv(@Query() query: DiscoverQueryDto) {
    return this.searchService.discoverTv(query);
  }

  @Post('admin/search/reindex')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Rebuild Elasticsearch indexes from PostgreSQL' })
  @ApiOkResponse({ type: ReindexResponseEntity })
  async reindex() {
    return this.searchSyncService.syncAll();
  }
}
