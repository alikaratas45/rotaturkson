'use server';

import { getAuthenticatedUser } from '@/firebase/server';
import type { FirebaseUser } from '@/lib/types';

/**
 * Server action to check the user's session status from the server side.
 */
export async function getServerSession(): Promise<{ user: FirebaseUser | null }> {
    const decodedToken = await getAuthenticatedUser() as any;

    if (decodedToken && (decodedToken as any).uid) {
        // Adapt the decoded token to the FirebaseUser type your app expects
        const serializableUser: FirebaseUser = {
          uid: (decodedToken as any).uid as string,
          email: (decodedToken as any).email || null,
          displayName: (decodedToken as any).name || null,
          photoURL: (decodedToken as any).picture || null,
          isAnonymous: (decodedToken as any).firebase?.sign_in_provider === 'anonymous',
        };
        return { user: serializableUser };
    }

    return { user: null };
}
