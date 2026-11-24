import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Centralized error handler that returns clean, client-safe JSON errors
 * without leaking stack traces, filesystem paths, or internal details.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'One or more input fields are invalid.',
      requestId,
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: 'payload_too_large',
      message: 'Request body exceeds the allowed 16 KB limit.',
      requestId,
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: 'invalid_json',
      message: 'Malformed JSON request body.',
      requestId,
    });
    return;
  }

  if (err instanceof Error && err.message === 'CORS_ORIGIN_DENIED') {
    res.status(403).json({
      error: 'cors_forbidden',
      message: 'Origin is not permitted to access this API.',
      requestId,
    });
    return;
  }

  logger.error('Unhandled API error', {
    requestId,
    method: req.method,
    path: req.path,
    errorName: err instanceof Error ? err.name : 'UnknownError',
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred. Please try again shortly.',
    requestId,
  });
}
