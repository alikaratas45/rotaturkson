'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAllPois } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Edit2, Trash2, Download, FileJson, DatabaseZap, Users, MapPin } from 'lucide-react';
import type { POI, LocalizedString } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Veri kaynaklarını import edelim
import staticPoisData from '@/lib/data/static-pois.json';
import staticPoisData2 from '@/lib/data/static-pois2.json';
import locations from '@/lib/data/turkey-locations.json';

const POI_TYPES = ['Kültürel', 'Arkeolojik', 'Doğal', 'Tarihi', 'Yeme-İçme', 'Konaklama'];

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [pois, setPois] = useState<POI[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPoi, setEditingPoi] = useState<POI | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportJson, setExportJson] = useState('');

  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const ADMIN_EMAIL = 'alikaratas4564@rotaturk.net';

  const loadPois = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsRefreshing(true);
    
    try {
      const data = await getAllPois();
      
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()) : 0;
        if (timeA === 0 && timeB === 0) return b.id.localeCompare(a.id);
        return timeB - timeA;
      });
      
      setPois(sortedData);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi.' });
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isUserLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/admin');
    } else if (user && user.email === ADMIN_EMAIL) {
      loadPois(true);
    }
  }, [user, isUserLoading, router, loadPois]);

  const handleExportJson = () => {
      const json = JSON.stringify({ pois }, null, 2);
      setExportJson(json);
      setIsExporting(true);
  };

  const handleDownloadJson = () => {
      const json = JSON.stringify({ pois }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'static-pois.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "İndirildi", description: "Veriler static-pois.json olarak indirildi." });
  };

  const handleDeletePoi = async (poiId: string) => {
    if (!confirm('Bu noktayı kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
        if (!db) return;
        const poiRef = doc(db, 'pois', poiId);
        await deleteDoc(poiRef);
        setPois(prev => prev.filter(p => p.id !== poiId));
        toast({ title: 'Silindi', description: 'Nokta veri tabanından kalıcı olarak kaldırıldı.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Hata', description: 'Silme işlemi başarısız.' });
    }
  }

  const handleClearCollection = async (collName: string) => {
      if (!db) return;
      if (!confirm(`TÜM ${collName} verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
      
      setIsBulkSyncing(true);
      setSyncStatus(`${collName} temizleniyor...`);

      try {
          const colRef = collection(db, collName);
          const snapshot = await getDocs(colRef);
          if (!snapshot.empty) {
              const allDocs = snapshot.docs;
              for (let i = 0; i < allDocs.length; i += 400) {
                  const batch = writeBatch(db);
                  const chunk = allDocs.slice(i, i + 400);
                  chunk.forEach((d) => batch.delete(d.ref));
                  await batch.commit();
              }
          }
          toast({ title: "Sıfırlandı", description: `${collName} koleksiyonu tamamen temizlendi.` });
          if (collName === 'pois') await loadPois();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Hata', description: e.message });
      } finally {
          setIsBulkSyncing(false);
          setSyncStatus('');
      }
  }

  const handleSyncAllToFirestore = async () => {
      if (!db) return;
      const msg = 'DİKKAT: Bu işlem Firestore\'daki TÜM mevcut POI verilerini silecek ve yerel yedek dosyalarındaki verileri yeniden yükleyecektir. Devam etmek istiyor musunuz?';
      if (!confirm(msg)) return;
      
      setIsBulkSyncing(true);
      setSyncStatus('Eski veriler temizleniyor...');
      setSyncProgress(10);

      try {
          const poisCol = collection(db, 'pois');
          const snapshot = await getDocs(poisCol);
          if (!snapshot.empty) {
              const allDocs = snapshot.docs;
              for (let i = 0; i < allDocs.length; i += 400) {
                  const batch = writeBatch(db);
                  const chunk = allDocs.slice(i, i + 400);
                  chunk.forEach((d) => batch.delete(d.ref));
                  await batch.commit();
              }
          }

          setSyncStatus('Yeni veriler hazırlanıyor...');
          setSyncProgress(30);

          const allLocalPoisRaw = [
              ...(staticPoisData2.pois as any[]),
              ...(staticPoisData.pois as any[])
          ];

          const baseTime = Date.now();
          const allLocalPois = allLocalPoisRaw.map((poi, index) => ({
              ...poi,
              createdAt: poi.createdAt || (baseTime - (allLocalPoisRaw.length - index) * 1000)
          }));

          if (allLocalPois.length === 0) {
              setSyncProgress(100);
              setSyncStatus('Yüklenecek veri bulunamadı.');
              setIsBulkSyncing(false);
              return;
          }

          let totalCount = 0;
          for (let i = 0; i < allLocalPois.length; i += 400) {
              const batch = writeBatch(db);
              const chunk = allLocalPois.slice(i, i + 400);
              
              chunk.forEach((poi) => {
                  if (!poi.id) return;
                  const poiRef = doc(db, 'pois', poi.id);
                  batch.set(poiRef, JSON.parse(JSON.stringify(poi))); 
                  totalCount++;
              });
              
              await batch.commit();
              const progress = Math.round(30 + (70 * (totalCount / allLocalPois.length)));
              setSyncProgress(progress);
              setSyncStatus(`Yükleniyor: ${totalCount} / ${allLocalPois.length}`);
          }

          toast({ title: "Başarılı", description: `${totalCount} mekan Firestore'a aktarıldı.` });
          await loadPois();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Hata', description: e.message || 'Senkronizasyon başarısız.' });
      } finally {
          setIsBulkSyncing(false);
          setSyncStatus('');
          setSyncProgress(0);
      }
  }

  const filteredPois = pois.filter(poi => {
    const nameStr = (poi.name?.tr || poi.name?.en || poi.id || '').toLowerCase();
    const cityStr = (poi.location?.city || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return nameStr.includes(term) || cityStr.includes(term);
  });

  if (isUserLoading || (initialLoading && pois.length === 0)) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary">POI Yönetimi</h1>
            <p className="text-muted-foreground">
              Toplam {pois.length} gezi noktası.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={handleSyncAllToFirestore} disabled={isBulkSyncing} className="bg-rose-600 hover:bg-rose-700">
                <DatabaseZap className="mr-2 h-4 w-4" /> Sıfırla ve Yedekten Yükle
            </Button>
            <Button variant="outline" onClick={() => handleClearCollection('checkins')} disabled={isBulkSyncing} className="text-orange-600 border-orange-200">
                <MapPin className="mr-2 h-4 w-4" /> Ziyaretleri Sıfırla
            </Button>
            <Button variant="outline" onClick={() => handleClearCollection('users')} disabled={isBulkSyncing} className="text-blue-600 border-blue-200">
                <Users className="mr-2 h-4 w-4" /> Kullanıcıları Sıfırla
            </Button>
            <Button variant="outline" onClick={handleExportJson}>
                <FileJson className="mr-2 h-4 w-4" /> Yedek Al
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Ekle
            </Button>
        </div>
      </div>

      {isBulkSyncing && (
          <Card className="mb-6 border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-blue-700">
                      <span>{syncStatus}</span>
                      <span>%{syncProgress}</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
              </CardContent>
          </Card>
      )}

      <Card className="mb-6 shadow-sm">
        <CardContent className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                    placeholder="İsim veya şehir ara..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>İsim (TR)</TableHead>
              <TableHead>Konum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPois.map((poi, index) => (
              <TableRow key={poi.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">
                    {poi.name?.tr || poi.name?.en || poi.id}
                </TableCell>
                <TableCell className="text-sm">
                    <div className="font-medium">{poi.location?.city || '-'}{poi.location?.district ? ` / ${poi.location.district}` : ''}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{poi.latitude?.toFixed(5) || 0}, {poi.longitude?.toFixed(5) || 0}</div>
                </TableCell>
                <TableCell className="text-right flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingPoi(poi)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeletePoi(poi.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingPoi} onOpenChange={(open) => !open && setEditingPoi(null)}>
          {editingPoi && (
              <EditPoiDialogContent 
                poi={editingPoi} 
                onSave={async (updatedPoi) => {
                    if (!db) return;
                    try {
                        const poiRef = doc(db, 'pois', updatedPoi.id);
                        await setDoc(poiRef, JSON.parse(JSON.stringify(updatedPoi)), { merge: true });
                        setPois(prev => prev.map(p => p.id === updatedPoi.id ? updatedPoi : p));
                        setEditingPoi(null);
                        toast({ title: 'Güncellendi' });
                    } catch (e: any) {
                        toast({ variant: 'destructive', title: 'Hata', description: 'Kaydetme başarısız.' });
                    }
                }}
                onClose={() => setEditingPoi(null)} 
              />
          )}
      </Dialog>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <EditPoiDialogContent 
            poi={{
                id: `poi_${Date.now()}`,
                name: { tr: '', en: '', fr: '', de: '' },
                description: { tr: '', en: '', fr: '', de: '' },
                location: { city: 'İstanbul', district: 'Fatih' },
                type: 'Kültürel',
                latitude: 41.0082,
                longitude: 28.9784,
                createdAt: Date.now()
            }} 
            onSave={async (newPoi) => {
                if (!db) return;
                try {
                    const poiRef = doc(db, 'pois', newPoi.id);
                    await setDoc(poiRef, JSON.parse(JSON.stringify(newPoi)));
                    setPois(prev => [newPoi, ...prev]);
                    setIsAdding(false);
                    toast({ title: 'Eklendi' });
                } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Hata', description: 'Ekleme başarısız.' });
                }
            }}
            onClose={() => setIsAdding(false)}
          />
      </Dialog>

      <Dialog open={isExporting} onOpenChange={setIsExporting}>
          <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Verileri Yönet ve Dışa Aktar</DialogTitle>
              </DialogHeader>
              <div className="flex-grow flex flex-col space-y-4 overflow-hidden">
                  <div className="flex gap-3">
                      <Button onClick={handleDownloadJson} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <Download className="h-4 w-4 mr-2" /> .json Olarak İndir
                      </Button>
                  </div>
                  <Textarea 
                      value={exportJson} 
                      readOnly 
                      className="flex-grow font-mono text-xs resize-none bg-muted p-4" 
                  />
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsExporting(false)}>Kapat</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

function EditPoiDialogContent({ poi, onSave, onClose }: { poi: POI, onSave: (poi: POI) => void, onClose: () => void }) {
    const [formData, setFormData] = useState({ ...poi });

    const updateName = (lang: keyof LocalizedString, value: string) => {
        setFormData(prev => ({
            ...prev,
            name: { ...((prev.name || {}) as any), [lang]: value }
        }));
    };

    const updateDescription = (lang: keyof LocalizedString, value: string) => {
        setFormData(prev => ({
            ...prev,
            description: { ...((prev.description || {}) as any), [lang]: value }
        }));
    };

    const selectedCityData = locations.find(l => l.name === formData.location?.city);
    const districts = selectedCityData?.districts || [];

    const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
        const parsed = parseFloat(value);
        setFormData(prev => ({
            ...prev,
            [field]: isNaN(parsed) ? 0 : parsed
        }));
    };

    return (
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Mekan Düzenle</DialogTitle></DialogHeader>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Şehir</Label>
                        <Select 
                            value={formData.location?.city} 
                            onValueChange={(city) => setFormData({
                                ...formData, 
                                location: { city, district: '' }
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Şehir seçin" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {locations.map(l => (
                                    <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>İlçe</Label>
                        <Select 
                            value={formData.location?.district} 
                            onValueChange={(district) => setFormData({
                                ...formData, 
                                location: { ...formData.location!, district }
                            })}
                            disabled={!formData.location?.city}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="İlçe seçin" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {districts.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Lat (Enlem)</Label>
                        <Input 
                            type="number" 
                            step="any" 
                            value={isNaN(formData.latitude) ? "" : formData.latitude} 
                            onChange={e => handleCoordinateChange('latitude', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Lng (Boylam)</Label>
                        <Input 
                            type="number" 
                            step="any" 
                            value={isNaN(formData.longitude) ? "" : formData.longitude} 
                            onChange={e => handleCoordinateChange('longitude', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>Tür</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tür seçiniz..." />
                    </SelectTrigger>
                    <SelectContent>
                        {POI_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="tr" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-9">
                        <TabsTrigger value="tr" className="text-xs">TR</TabsTrigger>
                        <TabsTrigger value="en" className="text-xs">EN</TabsTrigger>
                        <TabsTrigger value="fr" className="text-xs">FR</TabsTrigger>
                        <TabsTrigger value="de" className="text-xs">DE</TabsTrigger>
                    </TabsList>
                    {(['tr', 'en', 'fr', 'de'] as const).map((lang) => (
                        <TabsContent key={lang} value={lang} className="space-y-4 pt-4 border-t mt-2">
                            <div className="space-y-2">
                                <Label>Mekan İsmi ({lang.toUpperCase()})</Label>
                                <Input 
                                    value={(formData.name as any)[lang] || ''} 
                                    onChange={e => updateName(lang, e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Açıklama ({lang.toUpperCase()})</Label>
                                <Textarea 
                                    value={(formData.description as any)[lang] || ''} 
                                    onChange={e => updateDescription(lang, e.target.value)} 
                                    rows={3} 
                                />
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
            <DialogFooter className="mt-6">
                <Button variant="ghost" onClick={onClose}>İptal</Button>
                <Button onClick={() => onSave(formData)}>Kaydet</Button>
            </DialogFooter>
        </DialogContent>
    )
}
