from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import declarative_base


Base = declarative_base()


movie_genres = Table(
    "_MovieGenres",
    Base.metadata,
    Column("A", Integer, ForeignKey("Genre.id")),
    Column("B", Integer, ForeignKey("Movie.id")),
)


class Movie(Base):
    __tablename__ = "Movie"

    id = Column(Integer, primary_key=True)
    tmdbId = Column(Integer)
    title = Column(String(500), nullable=False)
    overview = Column(Text)
    releaseDate = Column(DateTime)
    runtime = Column(Integer)
    language = Column(String(10))
    budget = Column(BigInteger)
    revenue = Column(BigInteger)
    status = Column(String(50))
    voteAverage = Column(Float)
    voteCount = Column(Integer)
    tmdbVoteAverage = Column(Float)
    tmdbVoteCount = Column(Integer)
    popularity = Column(Float)
    posterUrl = Column(Text)
    backdropUrl = Column(Text)
    isDeleted = Column(Boolean)


class Genre(Base):
    __tablename__ = "Genre"

    id = Column(Integer, primary_key=True)
    tmdbId = Column(Integer)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)


class Rating(Base):
    __tablename__ = "Rating"

    id = Column(Integer, primary_key=True)
    userId = Column(String, nullable=False)
    movieId = Column(Integer, ForeignKey("Movie.id"))
    seriesId = Column(Integer)
    score = Column(Integer, nullable=False)


class MovieCast(Base):
    __tablename__ = "MovieCast"

    id = Column(Integer, primary_key=True)
    movieId = Column(Integer, ForeignKey("Movie.id"), nullable=False)
    personId = Column(Integer, nullable=False)
    character = Column(String(500))
    displayOrder = Column(Integer)


class MovieCrew(Base):
    __tablename__ = "MovieCrew"

    id = Column(Integer, primary_key=True)
    movieId = Column(Integer, ForeignKey("Movie.id"), nullable=False)
    personId = Column(Integer, nullable=False)
    job = Column(String(255))
    department = Column(String(255))
