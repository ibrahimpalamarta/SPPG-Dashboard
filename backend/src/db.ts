import { PrismaClient } from '@prisma/client';
import { env } from './config/env.js';

// `error`/`warn` only: `query` logging would put row values into CloudWatch.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/** The slice of PrismaClient the auth module needs — lets tests pass a stub. */
export type Db = Pick<PrismaClient, 'user' | 'auditLog'>;
