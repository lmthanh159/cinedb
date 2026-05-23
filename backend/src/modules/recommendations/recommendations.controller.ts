import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RecommendationQueryDto } from '@/modules/recommendations/dto/recommendation-query.dto';
import { RecommendationResponseEntity } from '@/modules/recommendations/entities/recommendation-response.entity';
import { RecommendationsService } from '@/modules/recommendations/recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('similar/:movieId')
  @ApiOperation({ summary: 'Get similar movie recommendations' })
  @ApiParam({ name: 'movieId', example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 12 })
  @ApiOkResponse({ type: RecommendationResponseEntity })
  async similar(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationsService.getSimilar(movieId, query.limit);
  }

  @Get('personalized')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get personalized movie recommendations for current user' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: RecommendationResponseEntity })
  async personalized(
    @CurrentUser('userId') userId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationsService.getPersonalized(userId, query.limit);
  }
}
