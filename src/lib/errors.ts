export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'APP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input', details?: unknown) {
    super(400, message, 'VALIDATION', details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Not authenticated', code = 'UNAUTHENTICATED') {
    super(401, message, code);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, message, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export class ExternalSourceError extends AppError {
  constructor(
    message: string,
    public readonly source: string,
    public readonly cause?: unknown,
  ) {
    super(502, message, 'EXTERNAL_SOURCE', { source });
    this.name = 'ExternalSourceError';
  }
}

export class SourceBlockedError extends AppError {
  constructor(message = 'Manual verification (CAPTCHA) required to resume GeM scanning') {
    super(423, message, 'SOURCE_BLOCKED');
    this.name = 'SourceBlockedError';
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(typeof e === 'string' ? e : JSON.stringify(e));
}
