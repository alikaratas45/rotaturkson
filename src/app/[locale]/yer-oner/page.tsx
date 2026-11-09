'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, MapPin, Send, UserRound } from 'lucide-react';
import { useFirebaseApp, useFirestore, useUser } from '@/firebase';
import { NamePasswordAuthForm } from '@/components/auth/NamePasswordAuthForm';
import { createPlaceSuggestion, MAX_PLACE_SUGGESTION_IMAGE_SIZE } from '@/firebase/place-suggestions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import locations from '@/lib/data/turkey-locations.json';
import { POI_TYPES } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';

export default function SuggestPlacePage() {
  const app = useFirebaseApp();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationDeclined, setLocationDeclined] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [image, setImage] = useState<File | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const districts = useMemo(
    () => locations.find((location) => location.name === city)?.districts ?? [],
    [city],
  );

  useEffect(() => {
    if (!image) {
      setImagePreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [image]);

  const verifyCurrentLocation = () => {
    setLocationDeclined(false);
    setLocationError('');

    if (!navigator.geolocation) {
      setCurrentLocation(null);
      setLocationError('Tarayıcınız konum bilgisini desteklemiyor.');
      return;
    }

    setIsCheckingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 100) {
          setCurrentLocation(null);
          setLocationError(
            'Konum doğruluğu yeterli değil. Daha açık bir alana geçip tekrar deneyin.',
          );
        } else {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
        setIsCheckingLocation(false);
      },
      (error) => {
        setCurrentLocation(null);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Konum izni verilmedi. Yer önermek için konum iznini açmalısınız.'
            : 'Konumunuz alınamadı. Konum servislerini açıp tekrar deneyin.',
        );
        setIsCheckingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.isAnonymous) return;

    if (!currentLocation || locationDeclined || isCheckingLocation) {
      toast({
        variant: 'destructive',
        title: 'Konum doğrulanamadı',
        description: 'Öneri göndermek için konumda olduğunuzu doğrulamalısınız.',
      });
      return;
    }

    if (image && image.size > MAX_PLACE_SUGGESTION_IMAGE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'Fotoğraf çok büyük',
        description: 'Fotoğraf boyutu 5 MB veya daha az olmalıdır.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
      const profile = profileSnapshot.data();
      const userName =
        user.displayName?.trim() ||
        (typeof profile?.displayName === 'string' ? profile.displayName.trim() : '') ||
        'Gezgin';

      await createPlaceSuggestion({
        app,
        db,
        user,
        userName,
        values: {
          name: name.trim(),
          description: description.trim(),
          city,
          district,
          category,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        image,
      });
      toast({
        title: 'Öneriniz alındı',
        description: 'Yer öneriniz yönetici incelemesinden sonra yayınlanacak.',
      });
      router.push(`/${locale}`);
    } catch (error) {
      console.error('Yer önerisi gönderilemedi:', error);
      toast({
        variant: 'destructive',
        title: 'Öneri gönderilemedi',
        description:
          error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Yükleniyor" />
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="container mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12">
        <Card className="w-full rounded-3xl border-primary/10 shadow-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-2 rounded-2xl bg-primary/10 p-4 text-primary">
              <UserRound className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Yer öner</CardTitle>
            <CardDescription>
              Devam etmek için ad-soyadınız ve şifrenizle giriş yapın veya hesap oluşturun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <NamePasswordAuthForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <MapPin className="h-4 w-4" /> RotaTürk topluluğu
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Yeni bir yer öner</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Keşfedilmeyi bekleyen noktaları toplulukla paylaş. Önerin incelendikten sonra yer kataloğuna eklenecek.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-primary/10 shadow-xl">
        <CardHeader className="border-b bg-muted/30 px-6 py-5 md:px-8">
          <CardTitle>Yer bilgileri</CardTitle>
          <CardDescription>Yıldızlı alanların doldurulması zorunludur.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6 md:px-8 md:py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="place-name">Yer adı *</Label>
              <Input id="place-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="Örn. Sümela Manastırı" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="place-description">Açıklama *</Label>
              <Textarea id="place-description" value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={2000} rows={4} placeholder="Bu yeri özel kılan nedir?" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="place-city">İl *</Label>
                <select id="place-city" value={city} onChange={(event) => { setCity(event.target.value); setDistrict(''); }} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">İl seçin</option>
                  {locations.map((location) => <option key={location.name} value={location.name}>{location.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-district">İlçe *</Label>
                <select id="place-district" value={district} onChange={(event) => setDistrict(event.target.value)} required disabled={!city} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">İlçe seçin</option>
                  {districts.map((districtName) => <option key={districtName} value={districtName}>{districtName}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="place-category">Kategori *</Label>
              <select id="place-category" value={category} onChange={(event) => setCategory(event.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Kategori seçin</option>
                {Object.values(POI_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div>
                <Label className="text-base">Şu anda bu konumda mısınız? *</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yer önerisi için cihazınızın konumu alınır. Konum bilgisi elle girilemez.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={currentLocation ? 'default' : 'outline'}
                  className="rounded-xl"
                  disabled={isCheckingLocation}
                  onClick={verifyCurrentLocation}
                >
                  {isCheckingLocation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  {isCheckingLocation
                    ? 'Konum alınıyor...'
                    : currentLocation
                      ? 'Evet, konum doğrulandı'
                      : 'Evet'}
                </Button>
                <Button
                  type="button"
                  variant={locationDeclined ? 'destructive' : 'outline'}
                  disabled={isCheckingLocation}
                  className="rounded-xl"
                  onClick={() => {
                    setCurrentLocation(null);
                    setLocationError('');
                    setLocationDeclined(true);
                  }}
                >
                  Hayır
                </Button>
              </div>
              {currentLocation && !locationDeclined && (
                <p role="status" className="text-sm font-medium text-emerald-700">
                  Konumunuz alındı. Bu konum önerinize eklenecek.
                </p>
              )}
              {locationDeclined && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  O konumda bulunmadan konum ekleyemezsiniz. Yer önermek için orada olmanız gerekir.
                </p>
              )}
              {locationError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {locationError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="place-image">Fotoğraf <span className="font-normal text-muted-foreground">(isteğe bağlı, en fazla 5 MB)</span></Label>
              <label htmlFor="place-image" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-muted/20 px-5 py-7 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="Seçilen fotoğraf önizlemesi" className="mb-3 max-h-56 rounded-xl object-cover" />
                ) : (
                  <ImagePlus className="mb-3 h-8 w-8 text-primary" />
                )}
                <span className="font-semibold">{image?.name ?? 'Fotoğraf seç veya buraya bırak'}</span>
                <span className="mt-1 text-xs text-muted-foreground">JPG, PNG veya WebP</span>
                <input id="place-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setImage(event.target.files?.[0])} />
              </label>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={isSubmitting || !currentLocation || locationDeclined || isCheckingLocation}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Gönderiliyor...' : 'Öneriyi gönder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
