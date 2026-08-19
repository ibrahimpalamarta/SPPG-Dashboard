import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { sendError } from './error-handler.js';

/** Parsed, typed copies of the request parts. Never read `req.query` directly
 * in a controller — the coercions live in the schema, not in the handler. */
export interface ValidatedRequest {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      valid?: ValidatedRequest;
    }
  }
}

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates the request against zod schemas, mirroring the `safeParse` +
 * `flatten().fieldErrors` style already used for env parsing (config/env.ts).
 *
 * Only field *names* reach the client — a rejected value is never echoed back,
 * so a bad password or token in the wrong field cannot leak through a 400.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const valid: ValidatedRequest = {};
    const failures: Record<string, string[]> = {};

    for (const part of ['body', 'query', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        valid[part] = result.data;
        continue;
      }
      for (const [field, messages] of Object.entries(result.error.flatten().fieldErrors)) {
        if (messages?.length) failures[`${part}.${field}`] = messages;
      }
      // A schema can fail without any field error (e.g. a top-level refine).
      if (Object.keys(result.error.flatten().fieldErrors).length === 0) {
        failures[part] = result.error.flatten().formErrors;
      }
    }

    if (Object.keys(failures).length > 0) {
      sendError(res, 'VALIDATION_ERROR', { fields: failures });
      return;
    }

    req.valid = valid;
    next();
  };
}

