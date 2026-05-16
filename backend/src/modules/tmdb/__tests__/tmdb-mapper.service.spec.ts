import { GenderType } from '@prisma/client';

import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { TmdbMapperService } from '@/modules/tmdb/tmdb-mapper.service';

describe('TmdbMapperService', () => {
  const tmdbClientService = {
    getImageUrl: jest.fn((path: string | null, size: string) =>
      path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
    ),
  } as unknown as TmdbClientService;
  let mapper: TmdbMapperService;

  beforeEach(() => {
    jest.clearAllMocks();
    mapper = new TmdbMapperService(tmdbClientService);
  });

  it('maps TMDB movie details into CineDB movie fields and relations', () => {
    const mapped = mapper.toMovie({
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
      overview: 'An insomniac office worker.',
      release_date: '1999-10-15',
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      vote_average: 8.4,
      vote_count: 10000,
      popularity: 120,
      budget: 63000000,
      revenue: 100000000,
      runtime: 139,
      status: 'Released',
      original_language: 'en',
      genres: [{ id: 18, name: 'Drama' }],
      production_companies: [
        {
          id: 508,
          logo_path: '/logo.png',
          name: 'Regency Enterprises',
          origin_country: 'US',
        },
      ],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
    });

    expect(mapped.data).toEqual(
      expect.objectContaining({
        tmdbId: 550,
        title: 'Fight Club',
        releaseDate: new Date('1999-10-15T00:00:00.000Z'),
        tmdbVoteAverage: 8.4,
        posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      }),
    );
    expect(mapped.genreTmdbIds).toEqual([18]);
    expect(mapped.countries).toEqual([{ isoCode: 'US', name: 'United States' }]);
    expect(mapped.companies[0].logoUrl).toBe('https://image.tmdb.org/t/p/w185/logo.png');
  });

  it('maps TV seasons, episodes, people, credits, trailers, and images', () => {
    const season = mapper.toSeason({
      id: 100,
      air_date: '2020-01-01',
      name: 'Season 1',
      overview: '',
      poster_path: null,
      season_number: 1,
      episodes: [
        {
          id: 101,
          name: 'Pilot',
          overview: null,
          air_date: '2020-01-02',
          episode_number: 1,
          runtime: 45,
          season_number: 1,
          still_path: '/still.jpg',
          vote_average: 8,
          vote_count: 10,
        },
      ],
    });
    const person = mapper.toPerson({
      id: 1,
      name: 'Performer',
      profile_path: '/profile.jpg',
      popularity: 9,
      biography: null,
      birthday: null,
      deathday: null,
      gender: 2,
      place_of_birth: null,
    });
    const credits = {
      cast: [
        {
          id: 1,
          name: 'Actor',
          character: 'Hero',
          order: 0,
          profile_path: null,
        },
      ],
      crew: [
        {
          id: 2,
          name: 'Director',
          department: 'Directing',
          job: 'Director',
          profile_path: null,
        },
      ],
    };
    const trailers = mapper.toTrailers({
      results: [
        {
          id: 'v1',
          name: 'Official Trailer',
          key: 'abc',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          published_at: '2020-01-01T00:00:00.000Z',
        },
        {
          id: 'v2',
          name: 'Clip',
          key: 'skip',
          site: 'YouTube',
          type: 'Clip',
          official: false,
          published_at: null,
        },
        {
          id: 'v3',
          name: 'Teaser',
          key: 'def',
          site: 'YouTube',
          type: 'Teaser',
          official: true,
          published_at: 'not-a-date',
        },
      ],
    });
    const images = mapper.toImages({
      posters: [{ file_path: '/poster.jpg', width: 500, height: 750, vote_average: 9 }],
      backdrops: [{ file_path: '/backdrop.jpg', width: 1280, height: 720, vote_average: 8 }],
    });

    expect(season.episodes[0].stillUrl).toBe('https://image.tmdb.org/t/p/w500/still.jpg');
    expect(person.gender).toBe(GenderType.MALE);
    expect(mapper.toGender(3)).toBe(GenderType.NON_BINARY);
    expect(mapper.toCast(credits, 1).cast[0].character).toBe('Hero');
    expect(mapper.toCrew(credits).crew[0].job).toBe('Director');
    expect(trailers).toHaveLength(2);
    expect(trailers[0].publishedAt).toEqual(new Date('2020-01-01T00:00:00.000Z'));
    expect(trailers[1].publishedAt).toBeNull();
    expect(images.map((image) => image.type)).toEqual(['poster', 'backdrop']);
  });
});
