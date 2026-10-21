import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * @fileOverview Server-side Firebase initialization using Client SDK for SSR stability.
 */

let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export function getFirestoreInstance(): Firestore {
  return firestore;
}

export function getFirebaseAuth(): Auth {
  return auth;
}

export async function getAuthenticatedUser(): Promise<any> {
    try {
        // In this prototype, we return null to avoid complex header parsing
        // which often causes Digest errors in locked down environments.
        return null; 
    } catch (e) {
        return null;
    }
}
