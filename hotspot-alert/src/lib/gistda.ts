// GISTDA Sphere API Client
// ดึงข้อมูล Hotspot จาก GISTDA

import { CONFIG, generateHotspotId } from './config';
import { HotspotData, GistdaResponse } from '@/types/hotspot';

/**
 * ดึงข้อมูล Hotspot จาก GISTDA API สำหรับอำเภอที่กำหนด
 */
export async function fetchHotspotsByDistrict(
    province: string,
    district: string
): Promise<HotspotData[]> {
    const url = new URL(CONFIG.GISTDA_API_URL);
    url.searchParams.append('pv_tn', province);
    url.searchParams.append('ap_tn', district);
    url.searchParams.append('key', CONFIG.GISTDA_API_KEY);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // No cache to get fresh data
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`GISTDA API error for ${district}: ${response.status}`);
            return [];
        }

        const data: GistdaResponse = await response.json();

        if (data.status !== 'success' && data.status !== 'ok') {
            console.error(`GISTDA API returned error: ${data.message}`);
            return [];
        }

        // Add unique ID and district info to each hotspot
        return (data.data || []).map(hotspot => ({
            ...hotspot,
            id: generateHotspotId(hotspot.latitude, hotspot.longitude, hotspot.acq_date + hotspot.acq_time),
            province: province,
            district: district
        }));

    } catch (error) {
        console.error(`Error fetching hotspots for ${district}:`, error);
        return [];
    }
}

/**
 * ดึงข้อมูล Hotspot จากทุกอำเภอที่กำหนด
 */
export async function fetchAllHotspots(): Promise<HotspotData[]> {
    const allHotspots: HotspotData[] = [];

    // Fetch from all districts in parallel
    const promises = CONFIG.DISTRICTS.map(district =>
        fetchHotspotsByDistrict(CONFIG.PROVINCE, district)
    );

    const results = await Promise.all(promises);

    // Combine all results
    for (const hotspots of results) {
        allHotspots.push(...hotspots);
    }

    // Remove duplicates based on ID
    const uniqueHotspots = allHotspots.filter((hotspot, index, self) =>
        index === self.findIndex(h => h.id === hotspot.id)
    );

    console.log(`Fetched ${uniqueHotspots.length} unique hotspots from ${CONFIG.DISTRICTS.length} districts`);

    return uniqueHotspots;
}

/**
 * ดึงข้อมูล Hotspot ของวันนี้เท่านั้น
 */
export async function fetchTodayHotspots(): Promise<HotspotData[]> {
    const allHotspots = await fetchAllHotspots();

    // Filter for today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    return allHotspots.filter(hotspot => {
        // GISTDA date format might be YYYY-MM-DD or other formats
        const hotspotDate = hotspot.acq_date;
        return hotspotDate === today || hotspotDate.startsWith(today);
    });
}

/**
 * เปรียบเทียบ Hotspot ใหม่กับ Hotspot เดิม
 */
export function findNewHotspots(
    currentHotspots: HotspotData[],
    previousHotspotIds: string[]
): HotspotData[] {
    return currentHotspots.filter(
        hotspot => !previousHotspotIds.includes(hotspot.id)
    );
}
