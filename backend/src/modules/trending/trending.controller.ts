import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  QueryTrendingDto,
  TrendingMediaType,
  TrendingParamsDto,
  TrendingTimeWindow,
} from '@/modules/trending/dto/query-trending.dto';
import { TrendingListResponseEntity } from '@/modules/trending/entities/trending-response.entity';
import { TrendingService } from '@/modules/trending/trending.service';

@ApiTags('Trending')
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get(':mediaType/:timeWindow')
  @ApiOperation({ summary: 'Get trending movies, TV series, or mixed media' })
  @ApiParam({ name: 'mediaType', enum: TrendingMediaType, example: TrendingMediaType.MOVIE })
  @ApiParam({ name: 'timeWindow', enum: TrendingTimeWindow, example: TrendingTimeWindow.DAY })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: TrendingListResponseEntity })
  async getTrending(
    @Param() params: TrendingParamsDto,
    @Query() query: QueryTrendingDto,
  ) {
    return this.trendingService.getTrending(params.mediaType, params.timeWindow, query);
  }
}
