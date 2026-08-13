import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ERRORS, type ErrorKey } from '../constants/errors.js';

/** Every error response in the API goes through this — status and body stay in sync with ERRORS. */
export function sendError(res: Response, key: ErrorKey) {
  const { status, body } = ERRORS[key];
  res.status(status).json(body);
}

const notFound: RequestHandler = (_req, res) => sendError(res, 'NOT_FOUND');

// Last resort: log server-side, return nothing useful to the caller.
const internalError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('unhandled error', { error: String(err) });
  sendError(res, 'INTERNAL_ERROR');
};

/** Mount last: catches unmatched routes as 404, then any thrown/uncaught error as 500. */
export const errorHandler: [RequestHandler, ErrorRequestHandler] = [notFound, internalError];
