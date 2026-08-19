import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

/**
 * The assets bucket (SCRUM-5 / SCRUM-14). Credentials are never configured
 * here: locally the SDK reads the usual AWS_* chain, and in ECS it picks up the
 * task role. Nothing about S3 is a secret to this app.
 */
const client = new S3Client({ region: env.AWS_REGION });

/** Matches what the caller must send and what we store back on the object. */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type PutObject = (key: string, body: Buffer, contentType: string) => Promise<string>;

/**
 * Writes one object and returns its key. Overwriting is fine and expected:
 * upload keys are derived from the file hash, so the same bytes always land on
 * the same key.
 */
export const putObject: PutObject = async (key, body, contentType) => {
  await client.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
};
