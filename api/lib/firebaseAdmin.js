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
    // Not set up yet -> don't gate the endpoint (mirrors isFirebaseConfigured()
    // on the client, in App.jsx). Set FIREBASE_PROJECT_ID and this starts
    // requiring a valid ID token automatically, no other code changes needed.
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
