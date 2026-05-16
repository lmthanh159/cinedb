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
import { CreatePersonDto } from '@/modules/people/dto/create-person.dto';
import { PersonQueryDto } from '@/modules/people/dto/person-query.dto';
import { UpdatePersonDto } from '@/modules/people/dto/update-person.dto';
import {
  PersonImagesResponseEntity,
  PersonListResponseEntity,
  PersonMovieCreditsResponseEntity,
  PersonResponseEntity,
  PersonTvCreditsResponseEntity,
} from '@/modules/people/entities/person-response.entity';
import { PeopleService } from '@/modules/people/people.service';

@ApiTags('People')
@Controller('person')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get('popular')
  @ApiOperation({ summary: 'Get popular people sorted by popularity' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: PersonListResponseEntity })
  async getPopularPeople(@Query() query: PersonQueryDto) {
    return this.peopleService.getPopularPeople(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get person details' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: PersonResponseEntity })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getPersonById(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.getPersonById(id);
  }

  @Get(':id/movie-credits')
  @ApiOperation({ summary: 'Get movie cast and crew credits for a person' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: PersonMovieCreditsResponseEntity })
  async getMovieCredits(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.getMovieCredits(id);
  }

  @Get(':id/tv-credits')
  @ApiOperation({ summary: 'Get TV cast and crew credits for a person' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: PersonTvCreditsResponseEntity })
  async getTvCredits(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.getTvCredits(id);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Get profile images for a person' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: PersonImagesResponseEntity })
  async getImages(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.getImages(id);
  }
}

@ApiTags('Admin - People')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/people')
export class AdminPeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a person record' })
  @ApiBody({ type: CreatePersonDto })
  @ApiOkResponse({ type: PersonResponseEntity })
  async createPerson(@Body() dto: CreatePersonDto) {
    return this.peopleService.createPerson(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a person record' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdatePersonDto })
  @ApiOkResponse({ type: PersonResponseEntity })
  async updatePerson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.peopleService.updatePerson(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a person record' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MessageResponseEntity })
  async deletePerson(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.deletePerson(id);
  }
}
