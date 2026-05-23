import { HttpException, HttpStatus } from '@nestjs/common';
import { GenderType } from '@prisma/client';

import {
  AdminPersonSortBy,
  AdminPersonSortOrder,
} from '@/modules/people/dto/admin-person-query.dto';
import { PeopleService } from '@/modules/people/people.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('PeopleService', () => {
  const prismaService = {
    $transaction: jest.fn(),
    person: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    movieCast: {
      findMany: jest.fn(),
    },
    movieCrew: {
      findMany: jest.fn(),
    },
    seriesCast: {
      findMany: jest.fn(),
    },
    seriesCrew: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  } as unknown as RedisService;

  let peopleService: PeopleService;

  beforeEach(() => {
    jest.clearAllMocks();
    peopleService = new PeopleService(prismaService, redisService);
  });

  function createPerson(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      tmdbId: 123,
      name: 'Sample Person',
      originalName: 'Original Name',
      biography: 'Biography',
      birthday: new Date('1980-01-01T00:00:00.000Z'),
      deathday: null,
      placeOfBirth: 'Tokyo, Japan',
      gender: GenderType.MALE,
      profileUrl: 'profile.jpg',
      popularity: 100,
      knownForDepartment: 'Directing',
      ...overrides,
    };
  }

  async function expectHttpStatus(promise: Promise<unknown>, status: HttpStatus) {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
    }
  }

  it('gets popular people with pagination', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.$transaction = jest.fn().mockResolvedValue([
      2,
      [createPerson(), createPerson({ id: 2, name: 'Person 2' })],
    ]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await peopleService.getPopularPeople({
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.totalPages).toBe(1);
  });

  it('gets admin people with search and sorting', async () => {
    prismaService.$transaction = jest.fn().mockResolvedValue([
      1,
      [createPerson()],
    ]);

    const result = await peopleService.getAdminPeople({
      page: 1,
      limit: 20,
      q: 'Sample',
      sort_by: AdminPersonSortBy.NAME,
      sort_order: AdminPersonSortOrder.ASC,
    });

    expect(result.data[0].name).toBe('Sample Person');
    expect(result.meta.total).toBe(1);
    expect(prismaService.person.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.any(Array),
      }),
    });
    expect(prismaService.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          name: 'asc',
        },
      }),
    );
  });

  it('returns cached person detail on cache hit', async () => {
    redisService.get = jest.fn().mockResolvedValue({
      id: 1,
      name: 'Cached Person',
    });

    const result = await peopleService.getPersonById(1);

    expect(result).toEqual({
      id: 1,
      name: 'Cached Person',
    });
  });

  it('gets person detail on cache miss', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.person.findUnique = jest.fn().mockResolvedValue(createPerson());
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await peopleService.getPersonById(1);

    expect((result as { name: string }).name).toBe('Sample Person');
    expect(redisService.set).toHaveBeenCalled();
  });

  it('throws 404 for missing person detail', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.person.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(peopleService.getPersonById(999), HttpStatus.NOT_FOUND);
  });

  it('gets movie credits', async () => {
    prismaService.person.findUnique = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.movieCast.findMany = jest.fn().mockResolvedValue([
      {
        character: 'Hero',
        movie: {
          id: 1,
          title: 'Movie',
          releaseDate: new Date(),
          posterUrl: 'poster.jpg',
        },
      },
    ]);
    prismaService.movieCrew.findMany = jest.fn().mockResolvedValue([
      {
        job: 'Director',
        department: 'Directing',
        movie: {
          id: 1,
          title: 'Movie',
          releaseDate: new Date(),
          posterUrl: 'poster.jpg',
        },
      },
    ]);

    const result = await peopleService.getMovieCredits(1);

    expect(result.cast).toHaveLength(1);
    expect(result.crew).toHaveLength(1);
  });

  it('gets tv credits', async () => {
    prismaService.person.findUnique = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.seriesCast.findMany = jest.fn().mockResolvedValue([
      {
        character: 'Lead',
        series: {
          id: 1,
          title: 'Series',
          firstAirDate: new Date(),
          posterUrl: 'poster.jpg',
        },
      },
    ]);
    prismaService.seriesCrew.findMany = jest.fn().mockResolvedValue([
      {
        job: 'Producer',
        department: 'Production',
        series: {
          id: 1,
          title: 'Series',
          firstAirDate: new Date(),
          posterUrl: 'poster.jpg',
        },
      },
    ]);

    const result = await peopleService.getTvCredits(1);

    expect(result.cast).toHaveLength(1);
    expect(result.crew).toHaveLength(1);
  });

  it('gets images with fallback profile image', async () => {
    prismaService.person.findUnique = jest.fn().mockResolvedValue({
      profileUrl: 'profile.jpg',
      images: [],
    });

    const result = await peopleService.getImages(1);

    expect(result.images[0].filePath).toBe('profile.jpg');
  });

  it('creates a person and invalidates caches', async () => {
    prismaService.person.create = jest.fn().mockResolvedValue({ id: 10 });
    jest.spyOn(peopleService, 'getPersonById').mockResolvedValue({ id: 10 } as never);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await peopleService.createPerson({
      name: 'Created Person',
      gender: GenderType.FEMALE,
    });

    expect(result).toEqual({ id: 10 });
    expect(prismaService.person.create).toHaveBeenCalled();
  });

  it('updates a person', async () => {
    prismaService.person.findUnique = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.person.update = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(peopleService, 'getPersonById').mockResolvedValue({ id: 1 } as never);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await peopleService.updatePerson(1, {
      name: 'Updated Person',
    });

    expect(result).toEqual({ id: 1 });
  });

  it('deletes a person', async () => {
    prismaService.person.findUnique = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.person.delete = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await peopleService.deletePerson(1);

    expect(result.message).toBe('Person deleted successfully');
  });
});
