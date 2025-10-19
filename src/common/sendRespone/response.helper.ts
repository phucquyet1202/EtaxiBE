/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpException, HttpStatus } from '@nestjs/common';

interface SendResponseOptions<T = any> {
  message?: string | string[];
  statusCode?: number;
  error?: any;
  exception?: any;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const sendResponse = <T = any>(options: SendResponseOptions<T>) => {
  let message: string | string[] = options.message ?? 'Success';
  let statusCode: number = options.statusCode ?? HttpStatus.OK;

  let error: any = options.error ?? null;

  const exception = options.exception;

  if (exception instanceof HttpException) {
    statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      message = (response as any).message ?? message;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      error = (response as any).error ?? exception.name;
    }
  } else if (error && typeof error === 'object' && 'response' in error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const response = error.response;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    statusCode = response?.statusCode ?? statusCode;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    message = response?.message ?? message;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    error = response?.error ?? error.name ?? 'InternalServerError';
  }

  return {
    statusCode,
    message,
    data: options.data ?? null,
    meta: options.meta ?? null, // 👈 đưa meta vào response nếu có
    error,
  };
};
