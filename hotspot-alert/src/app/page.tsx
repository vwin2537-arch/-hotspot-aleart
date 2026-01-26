'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with Leaflet
const HotspotMap = dynamic(() => import('@/components/HotspotMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
      <div className="text-slate-400 flex items-center gap-2">
        <span className="animate-spin">⏳</span> กำลังโหลดแผนที่...
      </div>
    </div>
  )
});

interface HotspotStats {
  success: boolean;
  timestamp: string;
  isSatellitePassTime: boolean;
  province: string;
  districts: string[];
  stats: {
    totalHotspots: number;
    newHotspots: number;
    executionTimeMs: number;
  };
  hotspots: Array<{
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
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<HotspotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const checkHotspots = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/check-hotspot');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อ API ได้');
      console.error(err);
    }
    setLoading(false);
  };

  const sendTestNotification = async () => {
    setTestStatus('กำลังส่ง...');
    try {
      const response = await fetch('/api/test-line', { method: 'POST' });
      const result = await response.json();
      setTestStatus(result.success ? '✅ ส่งสำเร็จ!' : '❌ ส่งไม่สำเร็จ');
    } catch (err) {
      setTestStatus('❌ เกิดข้อผิดพลาด');
    }
    setTimeout(() => setTestStatus(''), 3000);
  };

  const forceNotify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNotify: true })
      });
      const result = await response.json();
      setData(result);
      alert(result.notification?.sent ? 'ส่งแจ้งเตือนสำเร็จ!' : 'ไม่สามารถส่งแจ้งเตือนได้');
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    }
    setLoading(false);
  };

  useEffect(() => {
    checkHotspots();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔥</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Hotspot Alert System
              </h1>
              <p className="text-slate-400 text-sm">
                ระบบแจ้งเตือนจุดความร้อน • จ.กาญจนบุรี
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Satellite Status */}
          <div className={`rounded-2xl p-6 backdrop-blur-sm border ${data?.isSatellitePassTime
            ? 'bg-emerald-500/20 border-emerald-500/50'
            : 'bg-slate-700/50 border-slate-600/50'
            }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🛰️</span>
              <span className="font-medium">สถานะดาวเทียม</span>
            </div>
            <div className={`text-2xl font-bold ${data?.isSatellitePassTime ? 'text-emerald-400' : 'text-slate-400'
              }`}>
              {data?.isSatellitePassTime ? 'กำลังถ่ายภาพ' : 'นอกช่วงเวลา'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              ช่วงถ่าย: 13:00-15:30, 01:00-02:30
            </div>
          </div>

          {/* Total Hotspots */}
          <div className="rounded-2xl p-6 bg-orange-500/20 backdrop-blur-sm border border-orange-500/50">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔥</span>
              <span className="font-medium">จุดความร้อนวันนี้</span>
            </div>
            <div className="text-4xl font-bold text-orange-400">
              {data?.stats?.totalHotspots ?? '-'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              ใหม่: {data?.stats?.newHotspots ?? 0} จุด
            </div>
          </div>

          {/* Last Check */}
          <div className="rounded-2xl p-6 bg-blue-500/20 backdrop-blur-sm border border-blue-500/50">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⏰</span>
              <span className="font-medium">ตรวจสอบล่าสุด</span>
            </div>
            <div className="text-lg font-bold text-blue-400">
              {data?.timestamp ?? '-'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              ใช้เวลา: {data?.stats?.executionTimeMs ?? '-'} ms
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={checkHotspots}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                กำลังตรวจสอบ...
              </>
            ) : (
              <>
                🔄 ตรวจสอบ Hotspot
              </>
            )}
          </button>

          <button
            onClick={sendTestNotification}
            disabled={!!testStatus}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {testStatus || '📱 ทดสอบ LINE'}
          </button>

          <button
            onClick={forceNotify}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            🚨 แจ้งเตือนทันที
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Monitoring Areas */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            📍 พื้นที่ตรวจสอบ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.districts?.map((district) => {
              const count = data.hotspots?.filter(h => h.district === district).length || 0;
              return (
                <div
                  key={district}
                  className={`p-4 rounded-xl border ${count > 0
                    ? 'bg-red-500/20 border-red-500/50'
                    : 'bg-slate-700/30 border-slate-600/50'
                    }`}
                >
                  <div className="font-medium">{district}</div>
                  <div className={`text-2xl font-bold ${count > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {count} จุด
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Map - Always Visible */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🗺️ แผนที่จุดความร้อนและเขตป่าอนุรักษ์
          </h2>
          <HotspotMap hotspots={data?.hotspots || []} />
        </div>

        {/* Hotspot List */}
        {data?.hotspots && data.hotspots.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🔥 รายการจุดความร้อน ({data.hotspots.length} จุด)
            </h2>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">พื้นที่ป่าอนุรักษ์</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">อำเภอ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">พิกัด (UTM / Lat,Long)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">วันเวลา</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ดูแผนที่</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.hotspots.map((hotspot, index) => (
                      <tr key={hotspot.id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm">
                          {hotspot.protectedArea ? (
                            <span className="flex items-center gap-1">
                              <span>{hotspot.protectedAreaIcon}</span>
                              <span className="text-emerald-400">{hotspot.protectedArea}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{hotspot.district || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          <div className="text-emerald-400 font-bold">{hotspot.utmString || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500">
                            {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {hotspot.acq_date} {hotspot.acq_time}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={`https://www.google.com/maps?q=${hotspot.latitude},${hotspot.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            📍 Maps
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* No Hotspots */}
        {data?.hotspots && data.hotspots.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-xl font-medium text-emerald-400">
              ไม่พบจุดความร้อนในพื้นที่วันนี้
            </div>
            <div className="text-slate-400 mt-2">
              ระบบจะแจ้งเตือนทันทีเมื่อตรวจพบ
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-white/10 text-center text-slate-500 text-sm">
        <p>🔥 Hotspot Alert System • ข้อมูลจาก GISTDA Sphere API</p>
        <p className="mt-1">
          <a
            href="https://dnp.gistda.or.th/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            ดูแผนที่เต็มที่ fireDNPX →
          </a>
        </p>
      </footer>
    </div>
  );
}
