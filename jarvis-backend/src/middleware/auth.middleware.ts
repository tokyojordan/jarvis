import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request with userId
 */
export interface AuthRequest extends Request {
  userId: string;
}

/**
 * Authentication middleware
 * Extracts userId from x-user-id header
 * 
 * TODO: Replace with proper Firebase Auth token validation in production
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing x-user-id header',
    });
    return;
  }

  // Attach userId to request
  (req as AuthRequest).userId = userId;
  next();
};