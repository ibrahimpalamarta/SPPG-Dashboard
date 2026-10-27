import type { RequestHandler, Response } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { env } from '../config/env.js';
import { sendError } from './error-handler.js';

/**
 * Bytes are held in memory for the length of the request: the workbook is
 * parsed in that same request and the only copy that outlives it goes to S3.
 * `UPLOAD_MAX_BYTES` is what keeps that from being a memory-exhaustion lever.
 *
 * Extension, not mimetype, decides what is accepted. Browsers send
 * `application/octet-stream` for .xlsx often enough that filtering on mimetype
 * rejects real uploads, and the header is caller-controlled either way — the
 * parser downstream is the real format check (SCRUM-5 AC2).
 *
 * `required: false` allows a request with no file part (a PATCH that only edits
 * metadata). It does not allow a file of the wrong type: that is always an
 * error, never a silent skip.
 */
export function singleFile(
  field: string,
  extensions: readonly string[],
  { required = true }: { required?: boolean } = {},
): RequestHandler {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) =>
      extensions.includes(extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : // Rejecting with `false` would drop the file silently; an explicit
          // error is what makes a wrong extension visible to the caller.
          cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', field)),
  }).single(field);

  const reject = (res: Response, message: string) =>
    sendError(res, 'VALIDATION_ERROR', { fields: { [field]: [message] } });

  return (req, res, next) => {
    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        reject(
          res,
          err.code === 'LIMIT_FILE_SIZE'
            ? `file exceeds ${env.UPLOAD_MAX_BYTES} bytes`
            : `expected one ${extensions.join(' or ')} file in field "${field}"`,
        );
        return;
      }
      if (err) {
        next(err);
        return;
      }
      if (required && !req.file) {
        reject(res, `required, one ${extensions.join(' or ')} file`);
        return;
      }
      next();
    });
  };
}
