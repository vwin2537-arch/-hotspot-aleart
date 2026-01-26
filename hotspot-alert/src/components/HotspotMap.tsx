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
const createFireIcon = (hasProtectedArea: boolean) => {
  return L.divIcon({
    html: `<div style="
      font-size: 24px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      animation: pulse 1.5s ease-in-out infinite;
    ">${hasProtectedArea ? '🔥' : '🔶'}</div>`,
    className: 'fire-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

export default function HotspotMap({ hotspots, center, zoom = 9 }: HotspotMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Calculate center from hotspots if not provided
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

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add satellite layer option
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri' }
    );

    // Layer control
    const baseMaps = {
      "🗺️ แผนที่ถนน": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      "🛰️ ดาวเทียม": satellite
    };

    L.control.layers(baseMaps).addTo(map);

    // Add hotspot markers
    hotspots.forEach((hotspot, index) => {
      const icon = createFireIcon(!!hotspot.protectedArea);

      const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon })
        .addTo(map);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #ea580c;">
            🔥 จุดความร้อน #${index + 1}
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
            <div>⏰ <strong>เวลา:</strong> ${hotspot.acq_time}</div>
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
        <div className="flex items-center gap-2 text-slate-300">
          <span>🔥</span> <span>ในพื้นที่อนุรักษ์</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span>🔶</span> <span>นอกพื้นที่อนุรักษ์</span>
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
