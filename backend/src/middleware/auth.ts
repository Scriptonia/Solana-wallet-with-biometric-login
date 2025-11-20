import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    solanaPublicKey: string;
    safeModeEnabled: boolean;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      sub: string;
      solanaPublicKey: string;
      safeModeEnabled: boolean;
    };

    req.user = {
      userId: decoded.sub,
      solanaPublicKey: decoded.solanaPublicKey,
      safeModeEnabled: decoded.safeModeEnabled,
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};



