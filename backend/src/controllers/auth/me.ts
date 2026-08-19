import type { RequestHandler } from 'express';

/**
 * `id` and `scopeId` are BigInt in Postgres and BigInt has no JSON
 * representation — `res.json` throws on it. They go out as strings, which is
 * also what a client should treat an opaque identifier as.
 */
export const getMe: RequestHandler = (req, res) => {
  const u = req.user!;
  res.json({
    id: String(u.id),
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    scopeId: u.scopeId === null ? null : String(u.scopeId),
  });
};
