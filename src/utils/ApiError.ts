export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: FieldError[];
  public readonly isOperational: boolean;
  /** Stable machine-readable code the frontend can branch on (e.g. AUTH_REQUIRED). */
  public code?: string;

  constructor(
    statusCode: number,
    message: string,
    errors: FieldError[] = [],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors: FieldError[] = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /** A shopper tried a members-only action (cart, wishlist, checkout) without signing in. */
  static authRequired(message = 'Please sign in to your Athletix account to continue') {
    const error = new ApiError(401, message);
    error.code = 'AUTH_REQUIRED';
    return error;
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict', errors: FieldError[] = []) {
    return new ApiError(409, message, errors);
  }

  static validation(message = 'Validation failed', errors: FieldError[] = []) {
    return new ApiError(422, message, errors);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], false);
  }
}
