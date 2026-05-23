import { AdminDashboardService } from '@/modules/admin-dashboard/admin-dashboard.service';
import { GenreDistributionMediaType } from '@/modules/admin-dashboard/dto/chart-query.dto';
import { PrismaService } from '@/prisma/prisma.service';

describe('AdminDashboardService', () => {
  const prismaService = {
    $queryRaw: jest.fn(),
    genre: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let adminDashboardService: AdminDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    adminDashboardService = new AdminDashboardService(prismaService);
  });

  it('returns daily rating time series with rounded average score', async () => {
    prismaService.$queryRaw = jest.fn().mockResolvedValue([
      {
        date: new Date('2026-05-22T00:00:00.000Z'),
        totalRatings: 2,
        averageScore: 7.555,
      },
      {
        date: '2026-05-23',
        totalRatings: 0,
        averageScore: null,
      },
    ]);

    const result = await adminDashboardService.getRatingsTimeSeries({ days: 2 });

    expect(result).toEqual({
      data: [
        {
          date: '2026-05-22',
          totalRatings: 2,
          averageScore: 7.56,
        },
        {
          date: '2026-05-23',
          totalRatings: 0,
          averageScore: null,
        },
      ],
    });
    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns top movies by rating volume', async () => {
    prismaService.$queryRaw = jest.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Spirited Away',
        posterUrl: null,
        releaseDate: new Date('2001-07-20T00:00:00.000Z'),
        voteAverage: '8.63',
        voteCount: 1000,
        totalRatings: BigInt(12),
        averageScore: '8.166',
      },
    ]);

    const result = await adminDashboardService.getTopMovies({
      days: 30,
      limit: 10,
    });

    expect(result.data[0]).toEqual({
      id: 1,
      title: 'Spirited Away',
      posterUrl: null,
      releaseDate: new Date('2001-07-20T00:00:00.000Z'),
      voteAverage: 8.63,
      voteCount: 1000,
      totalRatings: 12,
      averageScore: 8.17,
    });
    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns genre distribution for movies only', async () => {
    prismaService.genre.findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Action',
        slug: 'action',
        _count: { movies: 4, tvSeries: 8 },
      },
      {
        id: 2,
        name: 'Drama',
        slug: 'drama',
        _count: { movies: 10, tvSeries: 1 },
      },
    ]);

    const result = await adminDashboardService.getGenreDistribution({
      limit: 1,
      media_type: GenreDistributionMediaType.MOVIE,
    });

    expect(result).toEqual({
      data: [
        {
          id: 2,
          name: 'Drama',
          slug: 'drama',
          movieCount: 10,
          tvCount: 0,
          totalCount: 10,
        },
      ],
    });
  });
});
