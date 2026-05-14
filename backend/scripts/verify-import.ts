import { createPrismaClient } from './lib/runtime';

const prisma = createPrismaClient();

async function main() {
  const [genres, countries, companies, users, movies, tvSeries, people, trailers, seasons, episodes] =
    await Promise.all([
      prisma.genre.count(),
      prisma.country.count(),
      prisma.productionCompany.count(),
      prisma.user.count(),
      prisma.movie.count(),
      prisma.tVSeries.count(),
      prisma.person.count(),
      prisma.trailer.count(),
      prisma.season.count(),
      prisma.episode.count(),
    ]);

  const movie = await prisma.movie.findFirst({
    where: { tmdbId: { not: null } },
    include: {
      genres: true,
      cast: true,
      trailers: true,
    },
    orderBy: { id: 'asc' },
  });

  const series = await prisma.tVSeries.findFirst({
    where: { tmdbId: { not: null } },
    include: {
      seasons: {
        include: {
          episodes: true,
        },
      },
      trailers: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        counts: {
          genres,
          countries,
          companies,
          users,
          movies,
          tvSeries,
          people,
          trailers,
          seasons,
          episodes,
        },
        samples: {
          movie: movie
            ? {
                title: movie.title,
                genreCount: movie.genres.length,
                castCount: movie.cast.length,
                trailerCount: movie.trailers.length,
              }
            : null,
          series: series
            ? {
                title: series.title,
                seasonCount: series.seasons.length,
                episodeCount: series.seasons.reduce(
                  (sum, season) => sum + season.episodes.length,
                  0,
                ),
                trailerCount: series.trailers.length,
              }
            : null,
        },
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
