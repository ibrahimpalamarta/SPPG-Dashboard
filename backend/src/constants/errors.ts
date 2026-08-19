/**
 * Single source of truth for every error response the API sends. Add a new
 * key here instead of inlining `res.status(...).json(...)` at the call site.
 */
export const ERRORS = {
  VALIDATION_ERROR: { status: 400, body: { error: 'validation_error', message: 'Invalid request' } },
  MISSING_TOKEN: { status: 401, body: { error: 'unauthorized', message: 'Missing bearer token' } },
  INVALID_TOKEN: { status: 401, body: { error: 'unauthorized', message: 'Invalid or expired token' } },
  FORBIDDEN: { status: 403, body: { error: 'forbidden', message: 'Insufficient role' } },
  NOT_FOUND: { status: 404, body: { error: 'not_found' } },
  CONFLICT: { status: 409, body: { error: 'conflict', message: 'Resource already exists' } },
  UNPROCESSABLE: {
    status: 422,
    body: { error: 'unprocessable', message: 'File was read but its contents were rejected' },
  },
  TOO_MANY_REQUESTS: { status: 429, body: { error: 'too_many_requests', message: 'Rate limit exceeded' } },
  INTERNAL_ERROR: { status: 500, body: { error: 'internal_error' } },
} as const;

export type ErrorKey = keyof typeof ERRORS;
