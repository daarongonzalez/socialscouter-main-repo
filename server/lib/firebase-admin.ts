import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountKey) {
    // Production: Use service account key
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "social-scouter",
      });
    } catch (error) {
      console.error('Error parsing Firebase service account key:', error);
      throw new Error('Invalid Firebase service account configuration');
    }
  } else {
    // Development fallback: Use project ID only (requires Firebase CLI auth)
    console.warn('No Firebase service account key found, using project ID only');
    initializeApp({
      projectId: "social-scouter",
    });
  }
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid token');
  }
}

export async function getFirebaseUser(uid: string) {
  try {
    const userRecord = await adminAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    throw new Error('User not found');
  }
}