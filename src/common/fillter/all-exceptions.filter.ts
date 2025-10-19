/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'Exception';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (
        typeof errorResponse === 'object' &&
        (errorResponse as Record<string, unknown>)['message']
      ) {
        message = (errorResponse as Record<string, unknown>)['message'] as
          | string
          | string[];
      }

      errorName = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      console.error('🔥 Exception caught:', exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: errorName,
      data: null,
      meta: null,
    });
  }
}
