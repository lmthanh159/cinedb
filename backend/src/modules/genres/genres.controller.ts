import {
  Controller,
  Get,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { GenreListResponseEntity } from '@/modules/genres/entities/genre-response.entity';
import { GenresService } from '@/modules/genres/genres.service';

@ApiTags('Genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get('movie')
  @ApiOperation({ summary: 'Get genres that have at least one active movie' })
  @ApiOkResponse({ type: GenreListResponseEntity })
  async getMovieGenres() {
    return this.genresService.getMovieGenres();
  }

  @Get('tv')
  @ApiOperation({ summary: 'Get genres that have at least one active TV series' })
  @ApiOkResponse({ type: GenreListResponseEntity })
  async getTvGenres() {
    return this.genresService.getTvGenres();
  }
}
