import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID);
}

function adminAuth() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });

  return getAuth(app);
}

export async function requireFirebaseUser(req, res) {
  if (!isFirebaseAdminConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'Authentication is not configured on the server.' })
      return null
    }

    return { uid: null, anonymous: true };
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  try {
    const decodedToken = await adminAuth().verifyIdToken(match[1]);
    req.firebaseUser = {
      uid: decodedToken.uid,
      token: decodedToken,
    };
    return req.firebaseUser;
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    res.status(401).json({ error: 'Invalid authentication token.' });
    return null;
  }
}
