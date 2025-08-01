import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, getFirebaseUser } from './firebase-admin';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: any;
  firebaseUser?: any;
}

export async function authenticateFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(idToken);
    
    // Get Firebase user details
    const firebaseUser = await getFirebaseUser(decodedToken.uid);
    
    // Get or create user in our database with automatic Stripe sync
    let user;
    try {
      user = await storage.upsertUser({
        id: decodedToken.uid,
        email: decodedToken.email || firebaseUser.email || '',
        firstName: decodedToken.name?.split(' ')[0] || firebaseUser.displayName?.split(' ')[0] || '',
        lastName: decodedToken.name?.split(' ').slice(1).join(' ') || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: decodedToken.picture || firebaseUser.photoURL || null,
      });

      // Automatically sync with Stripe if not already done
      if (!user.stripeCustomerId) {
        const { authSyncService } = await import('./auth-sync-service');
        const displayName = decodedToken.name || firebaseUser.displayName;
        await authSyncService.syncFirebaseUserWithStripe(
          decodedToken.uid,
          decodedToken.email || firebaseUser.email || '',
          displayName || undefined
        );
        // Refresh user data after sync
        user = await storage.getUser(decodedToken.uid) || user;
      }
    } catch (error: any) {
      // Handle unique constraint violation for email (legacy user migration)
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        // Try to get existing user by email and update with Firebase UID
        user = await storage.migrateUserToFirebase(decodedToken.uid, decodedToken.email || firebaseUser.email || '');
      } else {
        throw error;
      }
    }

    req.user = user;
    req.firebaseUser = firebaseUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  authenticateFirebaseToken(req, res, next);
}