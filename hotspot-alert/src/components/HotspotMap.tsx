'use client';

import { useEffect, useRef, useMemo } from 'react';
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
  const hotspotsRef = useRef(hotspots);

  // Keep ref in sync
  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

  // Memoize center to prevent re-renders
  const mapCenter: [number, number] = useMemo(() => {
    if (center) return center;
    if (hotspots.length === 0) return [14.5, 99.0];
    const avgLat = hotspots.reduce((sum, h) => sum + h.latitude, 0) / hotspots.length;
    const avgLng = hotspots.reduce((sum, h) => sum + h.longitude, 0) / hotspots.length;
    return [avgLat, avgLng];
  }, [center, hotspots.length]); // Only recalc if count changes (good enough approximation to avoid jitter)

  // Refs for layers to update them without rebuilding map
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const windLayerRef = useRef<L.LayerGroup | null>(null);

  // Custom Wind Icon
  const createWindIcon = (degree: number, speed: number) => {
    // Rotate 180 because arrow points down by default, but wind comes 'from'
    // OpenMeteo Wind Direction is "direction form which wind is blowing".
    // We want arrow to point "to". So add 180.
    const rotation = degree + 180;

    return L.divIcon({
      className: 'wind-marker',
      html: `<div style="
          transform: rotate(${rotation}deg);
          font-size: 24px;
          color: #0ea5e9;
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        ">
          ⬇
        </div>
        <div style="font-size: 10px; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 4px; margin-top: -8px; text-align: center; border: 1px solid #0ea5e9; color: #0f172a; font-weight: bold;">
          ${speed}
        </div>`,
      iconSize: [30, 48],
      iconAnchor: [15, 24]
    });
  };

  // Fetch Wind Data Function (memoized to avoid re-creation)
  const fetchWindData = useMemo(() => async () => {
    const currentHotspots = hotspotsRef.current;
    const map = mapInstanceRef.current;
    const windLayer = windLayerRef.current;

    if (!map || !windLayer) return;

    if (!currentHotspots || currentHotspots.length === 0) {
      alert("⚠️ ไม่พบจุดความร้อน (No Hotspots) ไม่สามารถดึงข้อมูลลมได้");
      return;
    }

    // Alert for debugging (User will see this)
    // alert(`🌪️ กำลังดึงข้อมูลลมสำหรับ ${currentHotspots.length} จุด...`);

    // Limit to first 20 to avoid spamming API
    const targets = currentHotspots.slice(0, 20);
    let count = 0;

    windLayer.clearLayers(); // Clear existing wind markers before adding new ones

    for (const h of targets) {
      try {
        // Open-Meteo Free API
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${h.latitude}&longitude=${h.longitude}&current_weather=true`);
        const data = await res.json();

        if (data.current_weather) {
          const { windspeed, winddirection } = data.current_weather;
          const icon = createWindIcon(winddirection, windspeed);

          L.marker([h.latitude, h.longitude], {
            icon,
            zIndexOffset: 1000
          })
            .bindPopup(`
                        <div style="font-family: sans-serif; min-width: 120px;">
                            <div style="font-weight: bold; color: #0ea5e9; margin-bottom: 4px;">🌪️ ข้อมูลลม</div>
                            ความเร็ว: <strong>${windspeed}</strong> km/h<br/>
                            ทิศทาง: <strong>${winddirection}°</strong>
                        </div>
                    `)
            .addTo(windLayer);
          count++;
        }
      } catch (e) {
        console.error("Wind fetch error details:", e);
      }
    }

    if (count === 0) {
      alert("❌ ไม่สามารถดึงข้อมูลลมได้ (API Connection Error)");
    }
  }, []); // No dependencies, as it uses refs for map, layer, and hotspots

  // 1. Initialize Map (Run Once)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });

    mapInstanceRef.current = map;

    // Base Layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri' }
    );

    // Protected Areas Layer
    const protectedAreasLayer = L.geoJSON(null as any, {
      style: {
        color: '#10b981',
        weight: 2,
        opacity: 0.8,
        fillColor: '#10b981',
        fillOpacity: 0.1
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
              <strong>🏞️ ${feature.properties.name}</strong><br/>
              <span style="color: #6b7280; font-size: 12px;">${feature.properties.type}</span>
            </div>
          `);
        }
      }
    });

    // Fetch Protected Areas
    fetch('/data/protected-areas.json')
      .then(res => res.json())
      .then(data => protectedAreasLayer.addData(data))
      .catch(err => console.error("Error loading protected areas:", err));

    protectedAreasLayer.addTo(map);

    // Init Layer Groups for dynamic content
    markersLayerRef.current = L.layerGroup().addTo(map);
    windLayerRef.current = L.layerGroup(); // Don't add yet, waiting for toggle

    // Layer Control
    const baseMaps = { "🗺️ แผนที่ถนน": osm, "🛰️ ดาวเทียม": satellite };
    const overlayMaps = {
      "🏞️ เขตป่าอนุรักษ์": protectedAreasLayer,
      "🔥 จุดความร้อน": markersLayerRef.current!,
      "🌪️ ทิศทางลม": windLayerRef.current!
    };
    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // Add Locate Control
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
        btn.onclick = () => map.locate({ setView: true, maxZoom: 13 });
        return btn;
      }
    });
    map.addControl(new LocateControl());

    map.on('locationfound', (e) => {
      L.circleMarker(e.latlng, { radius: 8, fillColor: '#3b82f6', color: 'white', weight: 2, fillOpacity: 0.8 }).addTo(map).bindPopup('คุณอยู่ที่นี่').openPopup();
      L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(map);
    });

    map.on('locationerror', () => {
      alert('ไม่สามารถระบุตำแหน่งของคุณได้ (กรุณาเปิด GPS)');
    });

    // Handle Wind Layer Toggle
    map.on('overlayadd', (e) => {
      if (e.name === '🌪️ ทิศทางลม' && windLayerRef.current?.getLayers().length === 0) {
        fetchWindData();
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run ONCE


  // 2. Update Hotspot Markers (Run when hotspots change)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    hotspots.forEach((hotspot, index) => {
      const hourStr = hotspot.acq_time.substring(0, 2);
      const hour = parseInt(hourStr);
      const thaiHour = (hour + 7) % 24;
      const isNight = thaiHour < 12;
      const icon = createFireIcon(!!hotspot.protectedArea, isNight);

      const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon });

      marker.bindPopup(`
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
      `);

      layer.addLayer(marker);
    });

    // Optional: fitBounds logic
    // If you want to fit bounds on every hotspot update, uncomment and adjust:
    // if (hotspots.length > 0) {
    //   const bounds = L.latLngBounds(hotspots.map(h => [h.latitude, h.longitude]));
    //   map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    // }
  }, [hotspots]);


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
