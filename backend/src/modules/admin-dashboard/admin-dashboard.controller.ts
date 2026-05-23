import {
  Controller,
  Get,
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
import { AdminDashboardService } from '@/modules/admin-dashboard/admin-dashboard.service';
import {
  GenreDistributionMediaType,
  GenreDistributionQueryDto,
  RatingsTimeSeriesQueryDto,
  TopMoviesChartQueryDto,
} from '@/modules/admin-dashboard/dto/chart-query.dto';
import {
  GenreDistributionResponseEntity,
  RatingsTimeSeriesResponseEntity,
  TopMoviesChartResponseEntity,
} from '@/modules/admin-dashboard/entities/admin-chart-response.entity';

@ApiTags('Admin - Charts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/charts')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('ratings')
  @ApiOperation({ summary: 'Get daily rating count and average score time series' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiOkResponse({ type: RatingsTimeSeriesResponseEntity })
  async getRatingsTimeSeries(@Query() query: RatingsTimeSeriesQueryDto) {
    return this.adminDashboardService.getRatingsTimeSeries(query);
  }

  @Get('top-movies')
  @ApiOperation({ summary: 'Get top movies by user rating volume' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ type: TopMoviesChartResponseEntity })
  async getTopMovies(@Query() query: TopMoviesChartQueryDto) {
    return this.adminDashboardService.getTopMovies(query);
  }

  @Get('genre-distribution')
  @ApiOperation({ summary: 'Get genre distribution across active movies and TV series' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'media_type',
    required: false,
    enum: GenreDistributionMediaType,
  })
  @ApiOkResponse({ type: GenreDistributionResponseEntity })
  async getGenreDistribution(@Query() query: GenreDistributionQueryDto) {
    return this.adminDashboardService.getGenreDistribution(query);
  }
}
