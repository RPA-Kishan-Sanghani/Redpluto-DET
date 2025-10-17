import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// JWT secret - must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '15h'; // 15 hours as per requirements

// Validate that JWT_SECRET is set on startup
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. The application cannot start without a secure JWT secret.');
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Authentication middleware
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    // Validate user still exists in database
    const user = await storage.getUser(payload.userId);
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
