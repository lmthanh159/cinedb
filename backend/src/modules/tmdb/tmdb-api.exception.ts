import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class TmdbApiException extends HttpException {
  constructor(message: string, statusCode = HttpStatus.BAD_GATEWAY) {
    super(
      {
        statusCode,
        message,
        error: 'TMDB API Error',
      },
      statusCode,
    );
  }
}
