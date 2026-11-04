import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { env } from '../config/env.js';

/**
 * The assets bucket (SCRUM-5 / SCRUM-14). S3_BUCKET selects S3, GCS_BUCKET
 * selects GCS (S3 wins if both are set). Credentials are never configured
 * here: the SDKs read their usual chains (AWS_* / task role, or gcloud ADC /
 * Cloud Run service account).
 *
 * ponytail: both backends live here while the AWS -> GCP move is in flight.
 * Delete the S3 half (and @aws-sdk/client-s3) once nothing uses S3_BUCKET.
 */
const s3 = env.S3_BUCKET ? new S3Client({ region: env.AWS_REGION }) : null;
const gcs = !s3 && env.GCS_BUCKET ? new Storage().bucket(env.GCS_BUCKET) : null;

/** Matches what the caller must send and what we store back on the object. */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv';

export type PutObject = (key: string, body: Buffer, contentType: string) => Promise<string>;

/**
 * Writes one object and returns its key. Keys are chosen by the caller and
 * never contain a user-supplied file name.
 */
export const putObject: PutObject = async (key, body, contentType) => {
  if (s3) await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  else await gcs!.file(key).save(body, { contentType, resumable: false });
  return key;
};

export type GetObject = (key: string) => Promise<Buffer>;
export type DeleteObject = (key: string) => Promise<void>;

export const getObject: GetObject = async (key) => {
  if (!s3) return (await gcs!.file(key).download())[0];
  const out = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return Buffer.from(await out.Body!.transformToByteArray());
};

export const deleteObject: DeleteObject = async (key) => {
  if (s3) await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  else await gcs!.file(key).delete();
};
