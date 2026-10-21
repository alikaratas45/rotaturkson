export type Location = {
  city: string;
  district?: string;
};

export const POI_TYPES = {
  CULTURAL: 'Kültürel',
  ARCHAEOLOGICAL: 'Arkeolojik',
  NATURAL: 'Doğal',
  HISTORICAL: 'Tarihi',
  FOOD_DRINK: 'Yeme-İçme',
  ACCOMMODATION: 'Konaklama',
} as const;

export type LocalizedString = {
  tr: string;
  en: string;
  fr?: string;
  de?: string;
};

export interface POI {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  location: Location;
  type: string;
  latitude: number;
  longitude: number;
  sponsored?: boolean;
  avgRating?: number;
  checkinCount?: number;
  createdAt?: any;
}

export interface RouteResult {
  routeId: string;
  name: string;
  start?: Location & { lat?: number; lng?: number };
  end?: Location & { lat?: number; lng?: number };
  stops?: (Location & { lat?: number; lng?: number })[];
  totalDistance?: number;
  totalDuration?: number;
  fuelCost?: number;
  polyline?: string;
  path?: { lat: number; lng: number }[];
  touristPois: POI[];
  servicePois: POI[];
  googleMapsUrl: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  totalPoints?: number;
  photoURL?: string | null;
  isAnonymous: boolean;
}

export type Feedback = {
  id: string;
  name: string;
  message: string;
  createdAt: any;
  userId: string | null;
  reply?: string;
  repliedAt?: any;
};

export interface ActiveTraveler {
  id: string;
  userId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  lastUpdated: any;
  routeName?: string;
  routePolyline?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  timestamp: any;
}

export interface CheckIn {
  id: string;
  userId: string;
  poiId: string;
  rating: number;
  timestamp: any;
  userName: string;
}
