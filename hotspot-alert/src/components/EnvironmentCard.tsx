'use client';

import { useEffect, useState } from 'react';

interface EnvironmentData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    pm25: number;
    aqi: number;
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
    loading: boolean;
}

export default function EnvironmentCard() {
    const [data, setData] = useState<EnvironmentData>({
        temperature: 0,
        humidity: 0,
        windSpeed: 0,
        pm25: 0,
        aqi: 0,
        riskLevel: 'Moderate', // Default
        loading: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Kanchanaburi Coordinates (Approx Center)
                const lat = 14.5;
                const lon = 99.0;

                // 1. Fetch Weather (Temp, Humidity, Wind)
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
                );
                const weatherJson = await weatherRes.json();

                // 2. Fetch Air Quality (PM2.5)
                const airRes = await fetch(
                    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi`
                );
                const airJson = await airRes.json();

                if (weatherJson.current && airJson.current) {
                    const temp = weatherJson.current.temperature_2m;
                    const humid = weatherJson.current.relative_humidity_2m;
                    const wind = weatherJson.current.wind_speed_10m;
                    const pm25 = airJson.current.pm2_5;
                    const aqi = airJson.current.us_aqi;

                    // Calculate Fire Risk Index (Heuristic)
                    let risk: 'Low' | 'Moderate' | 'High' | 'Extreme' = 'Moderate';

                    if (humid > 60) {
                        risk = 'Low';
                    } else if (humid < 30 && temp > 35 && wind > 20) {
                        risk = 'Extreme';
                    } else if (humid < 40 && temp > 32) {
                        risk = 'High';
                    } else {
                        risk = 'Moderate';
                    }

                    setData({
                        temperature: temp,
                        humidity: humid,
                        windSpeed: wind,
                        pm25: pm25,
                        aqi: aqi,
                        riskLevel: risk,
                        loading: false
                    });
                }
            } catch (err) {
                console.error("Error fetching environment data", err);
                setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
    }, []);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'bg-emerald-500 text-white';
            case 'Moderate': return 'bg-yellow-500 text-black';
            case 'High': return 'bg-orange-500 text-white';
            case 'Extreme': return 'bg-red-600 text-white animate-pulse';
            default: return 'bg-slate-600';
        }
    };

    const getPM25Color = (pm: number) => {
        if (pm <= 25) return 'text-emerald-400';
        if (pm <= 50) return 'text-yellow-400';
        if (pm <= 100) return 'text-orange-400';
        return 'text-red-500';
    };

    if (data.loading) return (
        <div className="rounded-2xl p-6 bg-slate-800/30 border border-slate-700/50 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-slate-700 rounded mb-4"></div>
        </div>
    );

    return (
        <div className="rounded-2xl p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
            <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                🌤️ สภาพอากาศ & ความเสี่ยงไฟป่า
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Level Badge */}
                <div className={`rounded-xl p-6 flex flex-col items-center justify-center text-center ${getRiskColor(data.riskLevel)}`}>
                    <div className="text-lg font-medium opacity-90">ระดับความเสี่ยงวันนี้</div>
                    <div className="text-4xl font-bold font-display mt-2 whitespace-nowrap">
                        {data.riskLevel === 'Low' && '🟢 ต่ำ (Low)'}
                        {data.riskLevel === 'Moderate' && '🟡 ปานกลาง (Moderate)'}
                        {data.riskLevel === 'High' && '🟠 สูง (High)'}
                        {data.riskLevel === 'Extreme' && '🔴 สูงมาก (Extreme)'}
                    </div>
                    <div className="text-sm mt-3 opacity-80">
                        {data.riskLevel === 'Low' && 'ความชื้นสูง โอกาสเกิดไฟต่ำ'}
                        {data.riskLevel === 'Moderate' && 'ระวังไฟ แต่อากาศยังปกติ'}
                        {data.riskLevel === 'High' && 'อากาศแห้ง/ร้อน ห้ามเผาเด็ดขาด!'}
                        {data.riskLevel === 'Extreme' && 'อันตรายสูงสุด! ไฟลามเร็วมาก'}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm">PM2.5</div>
                        <div className={`text-2xl font-bold font-display ${getPM25Color(data.pm25)}`}>
                            {data.pm25} <span className="text-sm text-slate-500">µg/m³</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">AQI: {data.aqi}</div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm">อุณหภูมิ</div>
                        <div className="text-2xl font-bold font-display text-white">
                            {data.temperature}°C
                        </div>
                        <div className="text-xs text-slate-500 mt-1">ร้อน</div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm">ความชื้นสัมพัทธ์</div>
                        <div className="text-2xl font-bold font-display text-blue-300">
                            {data.humidity}%
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{data.humidity < 40 ? 'แห้งมาก' : 'ปกติ'}</div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm">ความเร็วลม</div>
                        <div className="text-2xl font-bold font-display text-cyan-300">
                            {data.windSpeed} <span className="text-sm text-slate-500">km/h</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">โดยเฉลี่ย</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 text-center">
                ข้อมูลจาก Open-Meteo Weather & Air Quality API • อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')}
            </div>
        </div>
    );
}
