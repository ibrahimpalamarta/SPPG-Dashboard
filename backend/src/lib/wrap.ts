import type { RequestHandler } from 'express';

/**
 * Express 4 does not catch a rejected promise from a handler — it hangs the
 * request instead of reaching the error middleware. Wrap every async handler.
 */
export function wrap(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
