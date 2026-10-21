'use client';

import { useFirebase as useFirebaseCore } from '@/firebase/provider';

/**
 * @deprecated use useFirebase from @/firebase/provider instead
 */
export const useFirebase = () => {
  return useFirebaseCore();
};
