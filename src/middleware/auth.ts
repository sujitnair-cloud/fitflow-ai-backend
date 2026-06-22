import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'fitflow-dev-secret-change-in-prod';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
