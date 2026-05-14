import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray((payload as { message?: string[] }).message)
          ? (payload as { message: string[] }).message.join(', ')
          : (payload as { message?: string }).message ?? 'Unexpected error';

    const error =
      typeof payload === 'string'
        ? HttpStatus[status]
        : (payload as { error?: string }).error ?? HttpStatus[status];

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

