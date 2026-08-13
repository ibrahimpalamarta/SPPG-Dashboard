import type { RequestHandler } from 'express';

export const getMe: RequestHandler = (req, res) => {
  const u = req.user!;
  res.json({ id: u.id, email: u.email, name: u.name, role: u.role, scopeId: u.scopeId });
};
