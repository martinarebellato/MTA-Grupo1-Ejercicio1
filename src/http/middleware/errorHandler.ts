import type { ErrorRequestHandler } from 'express';
import { AppError } from '../../shared/errors';
import type { Logger } from '../../shared/logger';

function isBodyParserSyntaxError(err: unknown): err is SyntaxError & { status: number } {
  return err instanceof SyntaxError && 'status' in err && (err as { status?: unknown }).status === 400;
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error:
          err.details === undefined
            ? { code: err.code, message: err.message }
            : { code: err.code, message: err.message, details: err.details },
      });
      return;
    }

    if (isBodyParserSyntaxError(err)) {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    logger.error('Unhandled error in request pipeline', { message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  };
}
