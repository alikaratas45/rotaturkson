import type { FirebaseApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import type { User } from 'firebase/auth';

export const MAX_PLACE_SUGGESTION_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PlaceSuggestionInput {
  name: string;
  description: string;
  city: string;
  district: string;
  category: string;
  latitude: number;
  longitude: number;
}

export interface PlaceSuggestion extends PlaceSuggestionInput {
  id: string;
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  userId: string;
  userName: string;
  createdAt: { toMillis: () => number } | null;
}

export async function createPlaceSuggestion({
  app,
  db,
  user,
  userName,
  values,
  image,
}: {
  app: FirebaseApp;
  db: Firestore;
  user: User;
  userName: string;
  values: PlaceSuggestionInput;
  image?: File;
}): Promise<void> {
  if (user.isAnonymous) {
    throw new Error('Yer önermek için kişisel hesabınızla giriş yapmalısınız.');
  }

  if (
    image &&
    (!ALLOWED_IMAGE_TYPES.includes(image.type) ||
      image.size > MAX_PLACE_SUGGESTION_IMAGE_SIZE)
  ) {
    throw new Error('Fotoğraf JPG, PNG veya WebP olmalı ve 5 MB boyutunu aşmamalıdır.');
  }

  const storage = getStorage(app);
  let uploadedImageRef: ReturnType<typeof ref> | null = null;

  try {
    let imageUrl = '';
    if (image) {
      const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1];
      uploadedImageRef = ref(
        storage,
        `place-suggestions/${user.uid}/${crypto.randomUUID()}.${extension}`,
      );
      await uploadBytes(uploadedImageRef, image, { contentType: image.type });
      imageUrl = await getDownloadURL(uploadedImageRef);
    }

    await addDoc(collection(db, 'placeSuggestions'), {
      ...values,
      imageUrl,
      status: 'pending',
      userId: user.uid,
      userName,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (uploadedImageRef) {
      await deleteObject(uploadedImageRef);
    }
    throw error;
  }
}

export async function getPendingPlaceSuggestions(
  db: Firestore,
): Promise<PlaceSuggestion[]> {
  const suggestionsQuery = query(
    collection(db, 'placeSuggestions'),
    where('status', '==', 'pending'),
  );
  const snapshot = await getDocs(suggestionsQuery);

  return snapshot.docs
    .map((suggestionDoc) => ({
      id: suggestionDoc.id,
      ...suggestionDoc.data(),
    }) as PlaceSuggestion)
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
    );
}

export async function approvePlaceSuggestion(
  db: Firestore,
  suggestionId: string,
): Promise<void> {
  const suggestionRef = doc(db, 'placeSuggestions', suggestionId);
  const placeRef = doc(collection(db, 'pois'));

  await runTransaction(db, async (transaction) => {
    const suggestionSnapshot = await transaction.get(suggestionRef);
    if (!suggestionSnapshot.exists()) {
      throw new Error('Yer önerisi artık mevcut değil.');
    }

    const suggestion = suggestionSnapshot.data() as PlaceSuggestion;
    if (suggestion.status !== 'pending') {
      throw new Error('Bu yer önerisi daha önce değerlendirilmiş.');
    }

    transaction.set(placeRef, {
      name: { tr: suggestion.name, en: suggestion.name, fr: suggestion.name, de: suggestion.name },
      description: {
        tr: suggestion.description,
        en: suggestion.description,
        fr: suggestion.description,
        de: suggestion.description,
      },
      location: { city: suggestion.city, district: suggestion.district },
      type: suggestion.category,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      imageUrl: suggestion.imageUrl,
      sourceSuggestionId: suggestionId,
      submittedBy: suggestion.userId,
      createdAt: serverTimestamp(),
    });
    transaction.update(suggestionRef, { status: 'approved' });
  });
}

export async function rejectPlaceSuggestion(
  db: Firestore,
  suggestionId: string,
): Promise<void> {
  const suggestionRef = doc(db, 'placeSuggestions', suggestionId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(suggestionRef);
    if (!snapshot.exists() || snapshot.data().status !== 'pending') {
      throw new Error('Bekleyen yer önerisi bulunamadı.');
    }
    transaction.update(suggestionRef, { status: 'rejected' });
  });
}
