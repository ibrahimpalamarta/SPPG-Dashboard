import type { RequestHandler } from 'express';

export const adminPing: RequestHandler = (_req, res) => res.json({ ok: true });
