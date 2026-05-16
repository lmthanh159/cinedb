export const SEARCH_INDEX = {
  MOVIES: 'movies',
  TV_SERIES: 'tv_series',
  PEOPLE: 'people',
} as const;

const autocompleteAnalysis = {
  analyzer: {
    autocomplete_analyzer: {
      type: 'custom',
      tokenizer: 'autocomplete_tokenizer',
      filter: ['lowercase'],
    },
  },
  tokenizer: {
    autocomplete_tokenizer: {
      type: 'edge_ngram',
      min_gram: 2,
      max_gram: 20,
      token_chars: ['letter', 'digit'],
    },
  },
};

const titleField = {
  type: 'text',
  analyzer: 'standard',
  fields: {
    autocomplete: {
      type: 'text',
      analyzer: 'autocomplete_analyzer',
    },
    keyword: {
      type: 'keyword',
    },
  },
};

export const MOVIES_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: autocompleteAnalysis,
  },
  mappings: {
    properties: {
      id: { type: 'integer' },
      title: titleField,
      originalTitle: { type: 'text' },
      overview: { type: 'text' },
      genres: { type: 'keyword' },
      genreNames: { type: 'text' },
      countries: { type: 'keyword' },
      cast: { type: 'text' },
      director: { type: 'text' },
      releaseDate: { type: 'date' },
      releaseYear: { type: 'integer' },
      voteAverage: { type: 'float' },
      tmdbVoteAverage: { type: 'float' },
      popularity: { type: 'float' },
      posterUrl: { type: 'keyword', index: false },
    },
  },
};

export const TV_SERIES_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: autocompleteAnalysis,
  },
  mappings: {
    properties: {
      id: { type: 'integer' },
      title: titleField,
      originalTitle: { type: 'text' },
      overview: { type: 'text' },
      genres: { type: 'keyword' },
      genreNames: { type: 'text' },
      countries: { type: 'keyword' },
      cast: { type: 'text' },
      creator: { type: 'text' },
      firstAirDate: { type: 'date' },
      releaseYear: { type: 'integer' },
      voteAverage: { type: 'float' },
      tmdbVoteAverage: { type: 'float' },
      popularity: { type: 'float' },
      posterUrl: { type: 'keyword', index: false },
    },
  },
};

export const PEOPLE_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: autocompleteAnalysis,
  },
  mappings: {
    properties: {
      id: { type: 'integer' },
      name: titleField,
      originalName: { type: 'text' },
      biography: { type: 'text' },
      knownForDepartment: { type: 'keyword' },
      popularity: { type: 'float' },
      profileUrl: { type: 'keyword', index: false },
    },
  },
};
