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

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { AdminGenreQueryDto } from '@/modules/genres/dto/admin-genre-query.dto';
import { CreateGenreDto } from '@/modules/genres/dto/create-genre.dto';
import { UpdateGenreDto } from '@/modules/genres/dto/update-genre.dto';
import {
  AdminGenreEntity,
  AdminGenreListResponseEntity,
  GenreListResponseEntity,
} from '@/modules/genres/entities/genre-response.entity';
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

@ApiTags('Admin - Genres')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/genres')
export class AdminGenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated genre list for admin management' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'q', required: false, example: 'action' })
  @ApiOkResponse({ type: AdminGenreListResponseEntity })
  async getGenres(@Query() query: AdminGenreQueryDto) {
    return this.genresService.getAdminGenres(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a genre' })
  @ApiBody({ type: CreateGenreDto })
  @ApiOkResponse({ type: AdminGenreEntity })
  @ApiResponse({ status: 409, description: 'Genre slug or TMDB ID already exists' })
  async createGenre(@Body() dto: CreateGenreDto) {
    return this.genresService.createGenre(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a genre' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateGenreDto })
  @ApiOkResponse({ type: AdminGenreEntity })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({ status: 409, description: 'Genre slug or TMDB ID already exists' })
  async updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGenreDto,
  ) {
    return this.genresService.updateGenre(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an unused genre' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({ status: 409, description: 'Genre is linked to movies or TV series' })
  async deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.deleteGenre(id);
  }
}
