import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

export type NamePasswordMode = 'register' | 'sign-in';

async function getInternalEmail(fullName: string): Promise<string> {
  const normalizedName = fullName
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizedName),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `user-${hash}@rotaturk.invalid`;
}

export async function authenticateWithNameAndPassword({
  auth,
  db,
  fullName,
  password,
  mode,
}: {
  auth: Auth;
  db: Firestore;
  fullName: string;
  password: string;
  mode: NamePasswordMode;
}): Promise<User> {
  const displayName = fullName.trim().replace(/\s+/g, ' ');
  const [firstName, ...lastNameParts] = displayName.split(' ');
  const lastName = lastNameParts.join(' ');
  const internalEmail = await getInternalEmail(displayName);

  if (mode === 'register') {
    const credential = await createUserWithEmailAndPassword(
      auth,
      internalEmail,
      password,
    );
    await updateProfile(credential.user, { displayName });
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        id: credential.user.uid,
        displayName,
        firstName,
        lastName,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
      },
      { merge: true },
    );
    return credential.user;
  }

  const credential = await signInWithEmailAndPassword(
    auth,
    internalEmail,
    password,
  );
  await updateProfile(credential.user, { displayName });
  await setDoc(
    doc(db, 'users', credential.user.uid),
    {
      id: credential.user.uid,
      displayName,
      firstName,
      lastName,
      lastActivity: serverTimestamp(),
    },
    { merge: true },
  );
  return credential.user;
}

export function getNamePasswordAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu ad-soyadla bir hesap zaten var. Giriş yapmayı deneyin.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Ad-soyad veya şifre hatalı.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/operation-not-allowed':
      return 'Firebase Console’da E-posta/Şifre giriş yöntemini etkinleştirin.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
    default:
      return error instanceof Error ? error.message : 'Lütfen tekrar deneyin.';
  }
}
