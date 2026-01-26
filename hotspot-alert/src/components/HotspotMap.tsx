'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  district?: string;
  acq_date: string;
  acq_time: string;
  confidence: string | number;
  protectedArea?: string;
  protectedAreaIcon?: string;
  utmString?: string;
}

interface HotspotMapProps {
  hotspots: Hotspot[];
  center?: [number, number];
  zoom?: number;
}

// Custom fire icon
const createFireIcon = (hasProtectedArea: boolean, isNight: boolean) => {
  // Night pass = Purple/Blue flame, Afternoon pass = Orange/Red flame
  const iconContent = hasProtectedArea
    ? (isNight ? '🌌' : '🔥') // Specific icon for protected area
    : (isNight ? '🟣' : '🔶'); // Dot for outside

  return L.divIcon({
    html: `<div style="
      font-size: 24px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      animation: pulse 1.5s ease-in-out infinite;
    ">${iconContent}</div>`,
    className: 'fire-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

export default function HotspotMap({ hotspots, center, zoom = 9 }: HotspotMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // ... (center calculation remains same) ...
  const mapCenter: [number, number] = center || (() => {
    if (hotspots.length === 0) {
      // Default to Kanchanaburi center
      return [14.5, 99.0] as [number, number];
    }
    const avgLat = hotspots.reduce((sum, h) => sum + h.latitude, 0) / hotspots.length;
    const avgLng = hotspots.reduce((sum, h) => sum + h.longitude, 0) / hotspots.length;
    return [avgLat, avgLng] as [number, number];
  })();

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Create map
    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });

    mapInstanceRef.current = map;

    // ... (tile layers remain same) ...
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add satellite layer option
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri' }
    );

    // Add simplified border (Province) or Protected Areas
    const protectedAreasLayer = L.geoJSON(null as any, {
      style: {
        color: '#10b981', // Emerald 500
        weight: 2,
        opacity: 0.8,
        fillColor: '#10b981',
        fillOpacity: 0.1
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
              <strong>🏞️ ${feature.properties.name}</strong><br/>
              <span style="color: #6b7280; font-size: 12px;">${feature.properties.type}</span>
            </div>
          `);
        }
      }
    });

    // Fetch GeoJSON Data
    fetch('/data/protected-areas.json')
      .then(res => res.json())
      .then(data => {
        protectedAreasLayer.addData(data);
      })
      .catch(err => console.error("Error loading protected areas:", err));



    // Add layers by default
    protectedAreasLayer.addTo(map);

    // Wind Data Layer
    const windLayer = L.layerGroup();

    // Custom Wind Icon
    const createWindIcon = (degree: number, speed: number) => {
      return L.divIcon({
        className: 'wind-marker',
        html: `<div style="
          transform: rotate(${degree}deg);
          font-size: 20px;
          color: #3b82f6;
          text-shadow: 0 0 2px white;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ➤
        </div>
        <div style="font-size: 10px; background: rgba(255,255,255,0.8); padding: 1px 4px; border-radius: 4px; margin-top: -5px; text-align: center; border: 1px solid #3b82f6;">
          ${speed} km/h
        </div>`,
        iconSize: [30, 40],
        iconAnchor: [15, 20]
      });
    };

    // Fetch Wind Data Function
    const fetchWindData = async () => {
      // Limit to first 20 to avoid spamming API
      const targets = hotspots.slice(0, 20);

      for (const h of targets) {
        try {
          // Open-Meteo Free API (No key needed)
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${h.latitude}&longitude=${h.longitude}&current_weather=true`);
          const data = await res.json();

          if (data.current_weather) {
            const { windspeed, winddirection } = data.current_weather;
            const icon = createWindIcon(winddirection, windspeed);

            L.marker([h.latitude, h.longitude], {
              icon,
              zIndexOffset: 1000 // On top
            })
              .bindPopup(`
                        <div style="font-family: sans-serif;">
                            <strong>🌪️ ข้อมูลลม</strong><br/>
                            ความเร็ว: ${windspeed} km/h<br/>
                            ทิศทาง: ${winddirection}°
                        </div>
                    `)
              .addTo(windLayer);
          }
        } catch (e) {
          console.error("Wind fetch error", e);
        }
      }
    };

    // Helper to start fetching when layer is added
    map.on('overlayadd', (e) => {
      if (e.name === '🌪️ ทิศทางลม') {
        if (windLayer.getLayers().length === 0) {
          fetchWindData();
        }
      }
    });

    // Layer control
    const baseMaps = {
      "🗺️ แผนที่ถนน": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      "🛰️ ดาวเทียม": satellite
    };

    const overlayMaps = {
      "🏞️ เขตป่าอนุรักษ์": protectedAreasLayer,
      "🌪️ ทิศทางลม": windLayer
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // Locate Control logic... (Keep existing code)
    const LocateControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: () => {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
        btn.innerHTML = '📍';
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.style.backgroundColor = 'white';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '18px';
        btn.title = 'แสดงตำแหน่งปัจจุบัน';

        btn.onclick = () => {
          map.locate({ setView: true, maxZoom: 13 });
        };
        return btn;
      }
    });

    map.addControl(new LocateControl());

    // Handle user location found
    map.on('locationfound', (e) => {
      L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map)
        .bindPopup('คุณอยู่ที่นี่')
        .openPopup();

      L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(map);
    });

    map.on('locationerror', () => {
      alert('ไม่สามารถระบุตำแหน่งของคุณได้ (กรุณาเปิด GPS)');
    });

    // Add hotspot markers
    hotspots.forEach((hotspot, index) => {
      // Logic for Night vs Day pass
      // acq_time is HHMM String (UTC).
      // UTC 18:00 - 20:00 = TH 01:00 - 03:00 (Night Pass)
      // UTC 06:00 - 08:00 = TH 13:00 - 15:00 (Afternoon Pass)
      const hourStr = hotspot.acq_time.substring(0, 2);
      const hour = parseInt(hourStr);

      // Determine if Night Pass (approx UTC 16-23) which is TH Night
      // Or simplify: If Thai Time < 12:00 = Night, >= 12:00 = Afternoon
      // Convert to Thai Hour
      const thaiHour = (hour + 7) % 24;
      const isNight = thaiHour < 12;

      const icon = createFireIcon(!!hotspot.protectedArea, isNight);

      const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon })
        .addTo(map);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${isNight ? '#7c3aed' : '#ea580c'};">
            ${isNight ? '🌌 จุดความร้อน (รอบดึก)' : '🔥 จุดความร้อน (รอบบ่าย)'} #${index + 1}
          </div>
          <div style="font-size: 12px; color: #374151; line-height: 1.6;">
            ${hotspot.protectedArea ? `
              <div style="background: #dcfce7; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px;">
                ${hotspot.protectedAreaIcon || '🏞️'} <strong>${hotspot.protectedArea}</strong>
              </div>
            ` : ''}
            <div>📍 <strong>อำเภอ:</strong> ${hotspot.district || 'ไม่ทราบ'}</div>
            <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin: 6px 0; border-left: 3px solid #3b82f6;">
              <strong>UTM:</strong> ${hotspot.utmString || 'N/A'}
            </div>
            <div>📅 <strong>วันที่:</strong> ${hotspot.acq_date}</div>
            <div>⏰ <strong>เวลา:</strong> ${hotspot.acq_time} (UTC)</div>
            <div>🎯 <strong>ความมั่นใจ:</strong> ${hotspot.confidence}</div>
            <div style="font-family: monospace; font-size: 11px; color: #6b7280; margin-top: 4px;">
              ${hotspot.latitude.toFixed(5)}, ${hotspot.longitude.toFixed(5)}
            </div>
            <a href="https://www.google.com/maps?q=${hotspot.latitude},${hotspot.longitude}" 
               target="_blank" 
               style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: #3b82f6; color: white; border-radius: 4px; text-decoration: none; font-size: 12px;">
              📍 เปิดใน Google Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    // Fit bounds to show all markers
    if (hotspots.length > 0) {
      const bounds = L.latLngBounds(hotspots.map(h => [h.latitude, h.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hotspots, mapCenter, zoom]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-700/50"
        style={{ background: '#1e293b' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-sm border border-slate-700/50 z-[1000]">
        <div className="font-medium text-white mb-2">สัญลักษณ์</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span>🔥</span> <span>บ่าย (ป่าอนุรักษ์)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>🔶</span> <span>บ่าย (นอกพื้นที่)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>🌌</span> <span>ดึก (ป่าอนุรักษ์)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>🟣</span> <span>ดึก (นอกพื้นที่)</span>
          </div>
        </div>
      </div>

      {/* Hotspot count badge */}
      <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-bold text-white z-[1000]">
        🔥 {hotspots.length} จุด
      </div>

      {/* CSS for marker animation */}
      <style jsx global>{`
        .fire-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
