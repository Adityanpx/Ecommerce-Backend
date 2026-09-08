import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError, FieldError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { Sentry } from '../config/sentry';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  errors: FieldError[];
  requestId?: string;
  stack?: string;
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return ApiError.conflict(`A record with this ${target} already exists`, [
        { field: target, message: 'Already exists' },
      ]);
    }
    case 'P2025':
      return ApiError.notFound('Record not found');
    case 'P2003':
      return ApiError.badRequest('Related record does not exist');
    case 'P2014':
      return ApiError.conflict('Cannot delete — other records depend on this');
    default:
      return ApiError.internal('Database error');
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = ApiError.validation(
      'Validation failed',
      err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = mapPrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    apiError = ApiError.badRequest('Invalid data provided');
  } else if (err instanceof SyntaxError && 'body' in err) {
    apiError = ApiError.badRequest('Malformed JSON in request body');
  } else {
    apiError = ApiError.internal(err.message || 'Internal server error');
  }

  // Log everything; report only real bugs to Sentry.
  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: apiError.statusCode,
    userId: req.user?.id ?? req.admin?.id,
  };

  if (apiError.statusCode >= 500) {
    logger.error(err.message, { ...logPayload, stack: err.stack });
    if (config.sentry.isConfigured && !apiError.isOperational) {
      Sentry.captureException(err, { extra: logPayload });
    }
  } else {
    logger.warn(apiError.message, logPayload);
  }

  const body: ErrorResponseBody = {
    success: false,
    statusCode: apiError.statusCode,
    message: apiError.message,
    errors: apiError.errors,
    requestId: req.requestId,
  };

  if (config.isDevelopment) {
    body.stack = err.stack;
  }

  res.status(apiError.statusCode).json(body);
}
