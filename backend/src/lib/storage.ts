import { Storage } from '@google-cloud/storage';
import { env } from '../config/env.js';

/**
 * The assets bucket (SCRUM-5 / SCRUM-14) on GCS. Credentials are never
 * configured here: locally `gcloud auth application-default login`, on Cloud
 * Run the service's runtime service account. Nothing about it is a secret.
 */
const bucket = new Storage().bucket(env.GCS_BUCKET);

/** Matches what the caller must send and what we store back on the object. */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv';

export type PutObject = (key: string, body: Buffer, contentType: string) => Promise<string>;

/**
 * Writes one object and returns its key. Keys are chosen by the caller and
 * never contain a user-supplied file name.
 */
export const putObject: PutObject = async (key, body, contentType) => {
  await bucket.file(key).save(body, { contentType, resumable: false });
  return key;
};

export type GetObject = (key: string) => Promise<Buffer>;
export type DeleteObject = (key: string) => Promise<void>;

export const getObject: GetObject = async (key) => (await bucket.file(key).download())[0];

export const deleteObject: DeleteObject = async (key) => {
  await bucket.file(key).delete();
};
