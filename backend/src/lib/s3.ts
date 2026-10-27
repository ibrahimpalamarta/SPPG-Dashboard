import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

/**
 * The assets bucket (SCRUM-5 / SCRUM-14). Credentials are never configured
 * here: locally the SDK reads the usual AWS_* chain, and in ECS it picks up the
 * task role. Nothing about S3 is a secret to this app.
 */
const client = new S3Client({ region: env.AWS_REGION });

/** Matches what the caller must send and what we store back on the object. */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv';

export type PutObject = (key: string, body: Buffer, contentType: string) => Promise<string>;

/**
 * Writes one object and returns its key. Keys are chosen by the caller and
 * never contain a user-supplied file name.
 */
export const putObject: PutObject = async (key, body, contentType) => {
  await client.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
};

export type GetObject = (key: string) => Promise<Buffer>;
export type DeleteObject = (key: string) => Promise<void>;

export const getObject: GetObject = async (key) => {
  const out = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return Buffer.from(await out.Body!.transformToByteArray());
};

export const deleteObject: DeleteObject = async (key) => {
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
};
