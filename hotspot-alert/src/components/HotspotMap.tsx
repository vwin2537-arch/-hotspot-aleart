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
  // Use Emoji 🔥
  // Filter for Night to make it Blue: hue-rotate(220deg) (Orange -> Blue)
  // Protected areas get a glow effect

  if (!hasProtectedArea) {
    // Outside Protected Area: Simple Dot
    const dotColor = isNight ? '#60A5FA' : '#F59E0B'; // Light Blue / Amber
    return L.divIcon({
      className: 'fire-marker-dot',
      html: `<div style="
        width: 12px;
        height: 12px;
        background-color: ${dotColor};
        border-radius: 50%;
        box-shadow: 0 0 5px ${dotColor};
        border: 2px solid white;
        ${isNight ? 'box-shadow: 0 0 8px #60A5FA;' : ''}
        animation: pulse 2s infinite;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -6]
    });
  }

  // Inside Protected Area: Fire Emoji
  const filterStyle = isNight
    ? 'filter: hue-rotate(220deg) saturate(200%) drop-shadow(0 0 4px rgba(59, 130, 246, 0.8));'
    : 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));';

  const protectedStyle = 'text-shadow: 0 0 10px currentColor;';

  return L.divIcon({
    html: `<div style="
      font-size: 30px;
      line-height: 1;
      text-align: center;
      ${filterStyle}
      ${protectedStyle}
      animation: pulse 1.5s ease-in-out infinite;
    ">🔥</div>`,
    className: 'fire-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15], // Center
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
    const rotation = degree + 180;
    const windColor = '#14b8a6'; // Teal 500 (Green-ish) to distinguish from Blue Fire

    return L.divIcon({
      className: 'wind-marker',
      html: `<div style="
          transform: rotate(${rotation}deg);
          font-size: 24px;
          color: ${windColor};
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        ">
          ⬇
        </div>
        <div style="font-size: 10px; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 4px; margin-top: -8px; text-align: center; border: 1px solid ${windColor}; color: #0f172a; font-weight: bold;">
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
                            <div style="font-weight: bold; color: #14b8a6; margin-bottom: 4px;">🌪️ ข้อมูลลม</div>
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
  }, []); // No dependencies

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
      const isNight = thaiHour < 12; // Assuming night logic (adjust as needed, typically < 6 or > 18)
      // Note: original code had isNight = thaiHour < 12. Assuming this is effectively "AM = Night" logic for satellite passes?
      // Usually satellites pass around 1-2AM and 1-2PM. So < 12 is AM (Night/Morning), >= 12 is PM (Afternoon).

      const icon = createFireIcon(!!hotspot.protectedArea, isNight);

      const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon });

      // Determine label color for popup
      let labelColor = isNight ? '#2563EB' : '#EA580C';

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${labelColor}; display: flex; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:16px; height:16px;">
               <path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177c-.342 1.76.914 3.918 1.455 5.583.567 1.745 1.15 3.091 1.025 4.801a.75.75 0 01-.321.635 5.723 5.723 0 01-4.018 1.052c-.643-.056-1.127-.679-1.002-1.309.288-1.456 1.085-3.208 2.684-5.223a.75.75 0 00-.489-1.22 8.767 8.767 0 00-1.606.071c-1.3.13-2.618.667-3.4 1.834-1.278 1.905-1.574 4.887.804 7.64 2.19 2.535 5.617 3.32 8.528 2.053a.763.763 0 00.178-.097c3.96-2.648 4.606-8.31 1.714-14.775a.75.75 0 00-.54-.484zM12 9c.475 2.155 1.56 4.383 2.82 5.952.22.274.57.304.793.109.13-.114.188-.278.188-.444 0-.164-.092-.358-.233-.509-2.003-2.148-2.67-4.225-2.73-5.292a7.653 7.653 0 013.38 2.404c.261.328.784.25.9-.153.284-.977.106-2.502-.85-4.47L15.93 6.08a.75.75 0 00-.458-.93A10.74 10.74 0 0012.964 2.286z" clip-rule="evenodd" />
            </svg>
            ${isNight ? 'จุดความร้อน (รอบดึก)' : 'จุดความร้อน (รอบบ่าย)'} #${index + 1}
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
          {/* Day / Protected */}
          <div className="flex items-center gap-2 text-slate-300">
            <span style={{ fontSize: '20px' }}>🔥</span>
            <span>บ่าย (ป่าอนุรักษ์)</span>
          </div>
          {/* Day / Outside */}
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>
            <span>บ่าย (นอกพื้นที่)</span>
          </div>
          {/* Night / Protected */}
          <div className="flex items-center gap-2 text-slate-300">
            <span style={{ fontSize: '20px', filter: 'hue-rotate(220deg) saturate(200%)' }}>🔥</span>
            <span>ดึก (ป่าอนุรักษ์)</span>
          </div>
          {/* Night / Outside */}
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-3 h-3 rounded-full bg-blue-400 border border-white shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
            <span>ดึก (นอกพื้นที่)</span>
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
