import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`backend listening on :${env.PORT} (${env.NODE_ENV})`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => void prisma.$disconnect().then(() => process.exit(0)));
  });
}
