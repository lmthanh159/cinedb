import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { GenderType } from '@prisma/client';

import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import type { CreatePersonDto } from '@/modules/people/dto/create-person.dto';
import type { PersonQueryDto } from '@/modules/people/dto/person-query.dto';
import type { UpdatePersonDto } from '@/modules/people/dto/update-person.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class PeopleService {
  private readonly popularCacheTtl = 1800;
  private readonly personCacheTtl = 7200;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getPopularPeople(query: PersonQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const cacheKey = `person:popular:${page}:${limit}`;
    const cached = await this.redisService.get<{
      data: unknown[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const [total, people] = await this.prismaService.$transaction([
      this.prismaService.person.count(),
      this.prismaService.person.findMany({
        orderBy: {
          popularity: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          tmdbId: true,
          name: true,
          originalName: true,
          biography: true,
          birthday: true,
          deathday: true,
          placeOfBirth: true,
          gender: true,
          profileUrl: true,
          popularity: true,
          knownForDepartment: true,
        },
      }),
    ]);

    const response = {
      data: people,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    await this.redisService.set(cacheKey, response, this.popularCacheTtl);

    return response;
  }

  async getPersonById(id: number) {
    const cacheKey = `person:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const person = await this.prismaService.person.findUnique({
      where: { id },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        originalName: true,
        biography: true,
        birthday: true,
        deathday: true,
        placeOfBirth: true,
        gender: true,
        profileUrl: true,
        popularity: true,
        knownForDepartment: true,
      },
    });

    if (!person) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Person not found.', 'Not Found');
    }

    await this.redisService.set(cacheKey, person, this.personCacheTtl);

    return person;
  }

  async getMovieCredits(id: number) {
    await this.ensurePersonExists(id);

    const [cast, crew] = await Promise.all([
      this.prismaService.movieCast.findMany({
        where: {
          personId: id,
          movie: {
            isDeleted: false,
          },
        },
        orderBy: {
          movie: {
            releaseDate: 'desc',
          },
        },
        select: {
          character: true,
          movie: {
            select: {
              id: true,
              title: true,
              releaseDate: true,
              posterUrl: true,
            },
          },
        },
      }),
      this.prismaService.movieCrew.findMany({
        where: {
          personId: id,
          movie: {
            isDeleted: false,
          },
        },
        orderBy: {
          movie: {
            releaseDate: 'desc',
          },
        },
        select: {
          job: true,
          department: true,
          movie: {
            select: {
              id: true,
              title: true,
              releaseDate: true,
              posterUrl: true,
            },
          },
        },
      }),
    ]);

    return {
      cast,
      crew,
    };
  }

  async getTvCredits(id: number) {
    await this.ensurePersonExists(id);

    const [cast, crew] = await Promise.all([
      this.prismaService.seriesCast.findMany({
        where: {
          personId: id,
          series: {
            isDeleted: false,
          },
        },
        orderBy: {
          series: {
            firstAirDate: 'desc',
          },
        },
        select: {
          character: true,
          series: {
            select: {
              id: true,
              title: true,
              firstAirDate: true,
              posterUrl: true,
            },
          },
        },
      }),
      this.prismaService.seriesCrew.findMany({
        where: {
          personId: id,
          series: {
            isDeleted: false,
          },
        },
        orderBy: {
          series: {
            firstAirDate: 'desc',
          },
        },
        select: {
          job: true,
          department: true,
          series: {
            select: {
              id: true,
              title: true,
              firstAirDate: true,
              posterUrl: true,
            },
          },
        },
      }),
    ]);

    return {
      cast,
      crew,
    };
  }

  async getImages(id: number) {
    const person = await this.prismaService.person.findUnique({
      where: { id },
      select: {
        profileUrl: true,
        images: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            filePath: true,
            type: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!person) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Person not found.', 'Not Found');
    }

    const images = [...person.images];

    if (images.length === 0 && person.profileUrl) {
      images.push({
        id: 0,
        filePath: person.profileUrl,
        type: 'profile',
        width: null,
        height: null,
      });
    }

    return {
      images,
    };
  }

  async createPerson(dto: CreatePersonDto) {
    const person = await this.prismaService.person.create({
      data: this.buildCreatePayload(dto),
    });

    await this.invalidatePersonCaches(person.id);

    return this.getPersonById(person.id);
  }

  async updatePerson(id: number, dto: UpdatePersonDto) {
    const existing = await this.prismaService.person.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Person not found.', 'Not Found');
    }

    await this.prismaService.person.update({
      where: { id },
      data: this.buildUpdatePayload(dto),
    });

    await this.invalidatePersonCaches(id);

    return this.getPersonById(id);
  }

  async deletePerson(id: number): Promise<MessageResponseEntity> {
    const existing = await this.prismaService.person.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Person not found.', 'Not Found');
    }

    await this.prismaService.person.delete({
      where: { id },
    });

    await this.invalidatePersonCaches(id);

    return {
      message: 'Person deleted successfully',
    };
  }

  private buildCreatePayload(dto: CreatePersonDto) {
    return {
      name: dto.name.trim(),
      ...(dto.originalName !== undefined
        ? { originalName: dto.originalName?.trim() || null }
        : {}),
      ...(dto.biography !== undefined ? { biography: dto.biography?.trim() || null } : {}),
      ...(dto.birthday !== undefined
        ? { birthday: dto.birthday ? new Date(dto.birthday) : null }
        : {}),
      ...(dto.deathday !== undefined
        ? { deathday: dto.deathday ? new Date(dto.deathday) : null }
        : {}),
      ...(dto.placeOfBirth !== undefined
        ? { placeOfBirth: dto.placeOfBirth?.trim() || null }
        : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.profileUrl !== undefined ? { profileUrl: dto.profileUrl?.trim() || null } : {}),
      ...(dto.knownForDepartment !== undefined
        ? { knownForDepartment: dto.knownForDepartment?.trim() || null }
        : {}),
    };
  }

  private buildUpdatePayload(dto: UpdatePersonDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.originalName !== undefined
        ? { originalName: dto.originalName?.trim() || null }
        : {}),
      ...(dto.biography !== undefined ? { biography: dto.biography?.trim() || null } : {}),
      ...(dto.birthday !== undefined
        ? { birthday: dto.birthday ? new Date(dto.birthday) : null }
        : {}),
      ...(dto.deathday !== undefined
        ? { deathday: dto.deathday ? new Date(dto.deathday) : null }
        : {}),
      ...(dto.placeOfBirth !== undefined
        ? { placeOfBirth: dto.placeOfBirth?.trim() || null }
        : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender as GenderType } : {}),
      ...(dto.profileUrl !== undefined ? { profileUrl: dto.profileUrl?.trim() || null } : {}),
      ...(dto.knownForDepartment !== undefined
        ? { knownForDepartment: dto.knownForDepartment?.trim() || null }
        : {}),
    };
  }

  private async ensurePersonExists(id: number) {
    const person = await this.prismaService.person.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!person) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Person not found.', 'Not Found');
    }
  }

  private async invalidatePersonCaches(id: number) {
    await Promise.all([
      this.redisService.del(`person:${id}`),
      this.redisService.delPattern('person:popular:*'),
    ]);
  }

  private createHttpException(statusCode: HttpStatus, message: string, error: string) {
    return new HttpException(
      {
        statusCode,
        message,
        error,
      },
      statusCode,
    );
  }
}
