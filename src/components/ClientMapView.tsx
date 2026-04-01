import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationData {
  user_id: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  profile_name?: string;
}

export default function ClientMapView() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [myClientIds, setMyClientIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    
    const init = async () => {
      // Get clients assigned to this pegawai
      const { data: clients } = await supabase
        .from('clients')
        .select('user_id')
        .eq('assigned_pk_id', user.id);

      const clientUserIds = new Set((clients || []).map(c => c.user_id));
      setMyClientIds(clientUserIds);

      if (clientUserIds.size === 0) {
        setLocations([]);
        return;
      }

      await loadLocations(clientUserIds);
    };

    init();

    // Subscribe to realtime location updates
    const channel = supabase
      .channel('location-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_tracking' }, async (payload) => {
        const newLoc = payload.new as any;
        
        // Only process if this is one of my clients
        setMyClientIds(currentIds => {
          if (!currentIds.has(newLoc.user_id)) return currentIds;
          
          supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newLoc.user_id)
            .single()
            .then(({ data: profile }) => {
              setLocations(prev => {
                const filtered = prev.filter(l => l.user_id !== newLoc.user_id);
                return [...filtered, {
                  user_id: newLoc.user_id,
                  latitude: newLoc.latitude,
                  longitude: newLoc.longitude,
                  tracked_at: newLoc.tracked_at,
                  profile_name: profile?.full_name || newLoc.user_id.slice(0, 8) + '...',
                }];
              });
            });
          
          return currentIds;
        });
      })
      .subscribe();

    // Also poll every 30 seconds as fallback
    const pollInterval = setInterval(async () => {
      setMyClientIds(currentIds => {
        if (currentIds.size > 0) {
          loadLocations(currentIds);
        }
        return currentIds;
      });
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user]);

  const loadLocations = async (clientUserIds: Set<string>) => {
    const userIdsArray = Array.from(clientUserIds);

    // Get latest location for each assigned client
    const { data } = await supabase
      .from('location_tracking')
      .select('user_id, latitude, longitude, tracked_at')
      .in('user_id', userIdsArray)
      .order('tracked_at', { ascending: false })
      .limit(500);

    if (data) {
      const latestByUser = new Map<string, LocationData>();
      data.forEach(d => {
        if (!latestByUser.has(d.user_id)) latestByUser.set(d.user_id, d);
      });

      const trackedUserIds = Array.from(latestByUser.keys());

      // Filter to only show users with 'klien' role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', trackedUserIds);

      const klienOnlyIds = (roles || [])
        .filter(r => r.role === 'klien')
        .map(r => r.user_id);

      const filteredUserIds = trackedUserIds.filter(uid => klienOnlyIds.includes(uid));

      // Fetch profile names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', filteredUserIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      const locationsWithNames = filteredUserIds.map(uid => {
        const loc = latestByUser.get(uid)!;
        return {
          ...loc,
          profile_name: nameMap.get(loc.user_id) || loc.user_id.slice(0, 8) + '...',
        };
      });

      setLocations(locationsWithNames);
    }
  };

  // Default center: Malang, East Java
  const center: [number, number] = [-7.9786, 112.6308];

  return (
    <div className="h-[500px] rounded-xl overflow-hidden">
      {myClientIds.size === 0 ? (
        <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl">
          <p className="text-muted-foreground">Tidak ada klien yang ditugaskan kepada Anda.</p>
        </div>
      ) : (
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc, i) => (
            <Marker key={`${loc.user_id}-${i}`} position={[loc.latitude, loc.longitude]}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">Klien: {loc.profile_name || loc.user_id.slice(0, 8)}</p>
                  <p>Lat: {loc.latitude.toFixed(6)}</p>
                  <p>Lng: {loc.longitude.toFixed(6)}</p>
                  <p>Waktu: {new Date(loc.tracked_at).toLocaleString('id-ID')}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
