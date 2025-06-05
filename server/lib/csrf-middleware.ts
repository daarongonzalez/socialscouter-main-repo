import csrf from 'csrf';
import { Request, Response, NextFunction } from 'express';

// Initialize CSRF token generator
const tokens = new csrf();

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

// Generate a secret for CSRF tokens (in production, use environment variable)
const secret = process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Add token generator function for GET requests
    req.csrfToken = () => tokens.create(secret);
    return next();
  }

  // For POST, PUT, DELETE requests, verify CSRF token
  const token = req.headers['x-csrf-token'] as string || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for this request'
    });
  }

  // Verify the token
  const isValid = tokens.verify(secret, token);
  
  if (!isValid) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token verification failed'
    });
  }

  next();
}

export function getCsrfToken(): string {
  return tokens.create(secret);
}