import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
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
  const [locations, setLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    loadLocations();

    // Subscribe to realtime
    const channel = supabase
      .channel('location-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_tracking' }, (payload) => {
        const newLoc = payload.new as any;
        setLocations(prev => {
          const filtered = prev.filter(l => l.user_id !== newLoc.user_id);
          return [...filtered, { user_id: newLoc.user_id, latitude: newLoc.latitude, longitude: newLoc.longitude, tracked_at: newLoc.tracked_at }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadLocations = async () => {
    // Get latest location per user using a simple approach
    const { data } = await supabase
      .from('location_tracking')
      .select('user_id, latitude, longitude, tracked_at')
      .order('tracked_at', { ascending: false })
      .limit(100);

    if (data) {
      const latestByUser = new Map<string, LocationData>();
      data.forEach(d => {
        if (!latestByUser.has(d.user_id)) latestByUser.set(d.user_id, d);
      });
      setLocations(Array.from(latestByUser.values()));
    }
  };

  // Default center: Malang, East Java
  const center: [number, number] = [-7.9786, 112.6308];

  return (
    <div className="h-[500px] rounded-xl overflow-hidden">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc, i) => (
          <Marker key={`${loc.user_id}-${i}`} position={[loc.latitude, loc.longitude]}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">Klien: {loc.user_id.slice(0, 8)}...</p>
                <p>Lat: {loc.latitude.toFixed(6)}</p>
                <p>Lng: {loc.longitude.toFixed(6)}</p>
                <p>Waktu: {new Date(loc.tracked_at).toLocaleString('id-ID')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
