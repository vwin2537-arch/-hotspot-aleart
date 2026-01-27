// NASA FIRMS API Client
// ดึงข้อมูล Hotspot จาก NASA FIRMS - แหล่งข้อมูลหลักเดียวกับ fireDNPX

import { CONFIG } from './config';
import { getUTMString } from './geo';
import { HotspotData } from '@/types/hotspot';

// Kanchanaburi Province Bounding Box
const KANCHANABURI_BOUNDS = {
    minLat: 13.72614,
    maxLat: 15.66301,
    minLon: 98.18170,
    maxLon: 99.89221
};

// Districts approximate coordinates (center points)
const DISTRICT_BOUNDS = {
    'เมืองกาญจนบุรี': { minLat: 13.95, maxLat: 14.15, minLon: 99.40, maxLon: 99.65 },
    'ไทรโยค': { minLat: 14.10, maxLat: 14.60, minLon: 98.70, maxLon: 99.30 },
    'ศรีสวัสดิ์': { minLat: 14.40, maxLat: 15.10, minLon: 99.00, maxLon: 99.50 }
};

interface FIRMSHotspot {
    latitude: number;
    longitude: number;
    brightness: number;
    scan: number;
    track: number;
    acq_date: string;
    acq_time: string;
    satellite: string;
    instrument: string;
    confidence: string;
    version: string;
    bright_ti4: number;
    bright_ti5: number;
    frp: number;
    daynight: string;
}

/**
 * Parse CSV response from NASA FIRMS API
 */
function parseCSV(csvText: string): FIRMSHotspot[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const hotspots: FIRMSHotspot[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const hotspot: Record<string, string | number> = {};

        headers.forEach((header, index) => {
            const value = values[index]?.trim() || '';
            // Convert numeric fields
            if (['latitude', 'longitude', 'brightness', 'scan', 'track', 'bright_ti4', 'bright_ti5', 'frp'].includes(header)) {
                hotspot[header] = parseFloat(value) || 0;
            } else {
                hotspot[header] = value;
            }
        });

        hotspots.push(hotspot as unknown as FIRMSHotspot);
    }

    return hotspots;
}

/**
 * Check if a hotspot is within Kanchanaburi province
 */
function isInKanchanaburi(lat: number, lon: number): boolean {
    return lat >= KANCHANABURI_BOUNDS.minLat &&
        lat <= KANCHANABURI_BOUNDS.maxLat &&
        lon >= KANCHANABURI_BOUNDS.minLon &&
        lon <= KANCHANABURI_BOUNDS.maxLon;
}

/**
 * Determine which district a hotspot belongs to
 */
function getDistrict(lat: number, lon: number): string | undefined {
    for (const [district, bounds] of Object.entries(DISTRICT_BOUNDS)) {
        if (lat >= bounds.minLat && lat <= bounds.maxLat &&
            lon >= bounds.minLon && lon <= bounds.maxLon) {
            return district;
        }
    }
    return undefined;
}

/**
 * Generate unique ID for hotspot
 */
function generateId(lat: number, lon: number, datetime: string): string {
    return `${lat.toFixed(4)}_${lon.toFixed(4)}_${datetime}`;
}

/**
 * Fetch hotspots from NASA FIRMS API for Thailand
 */
export async function fetchFIRMSHotspots(days: number = 1): Promise<HotspotData[]> {
    const mapKey = process.env.NASA_FIRMS_MAP_KEY || CONFIG.NASA_FIRMS_MAP_KEY;

    if (!mapKey) {
        console.error('NASA FIRMS MAP_KEY not configured');
        return [];
    }

    // Fetch from VIIRS S-NPP (same as fireDNPX uses)
    const sensors = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
    const allHotspots: HotspotData[] = [];

    for (const sensor of sensors) {
        try {
            // Use area endpoint with Kanchanaburi bounding box
            // Format: /api/area/csv/[KEY]/[SENSOR]/[west,south,east,north]/[DAYS]
            const bbox = `${KANCHANABURI_BOUNDS.minLon},${KANCHANABURI_BOUNDS.minLat},${KANCHANABURI_BOUNDS.maxLon},${KANCHANABURI_BOUNDS.maxLat}`;
            const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${sensor}/${bbox}/${days}`;
            console.log(`Fetching from: ${url}`);

            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                console.error(`FIRMS API error for ${sensor}: ${response.status}`);
                continue;
            }

            const csvText = await response.text();

            // Check if response is an error message
            if (csvText.includes('Invalid') || csvText.includes('Error')) {
                console.error(`FIRMS API returned error: ${csvText}`);
                continue;
            }

            const rawHotspots = parseCSV(csvText);

            console.log(`Parsed ${rawHotspots.length} hotspots from ${sensor}`);

            // Filter for Kanchanaburi and target districts
            // Filter for Kanchanaburi and target districts
            const fs = require('fs');
            const path = require('path');
            const turf = require('@turf/turf'); // Dynamic require is fine here to keep it simple

            // Load protected areas GeoJSON (Once per sensor loop is fine, or cache it globally if needed but this is fast enough)
            let protectedAreasGeoJSON: any = null;
            try {
                const geoJsonPath = path.join(process.cwd(), 'public', 'data', 'protected-areas.json');
                if (fs.existsSync(geoJsonPath)) {
                    const fileContent = fs.readFileSync(geoJsonPath, 'utf-8');
                    protectedAreasGeoJSON = JSON.parse(fileContent);
                }
            } catch (error) {
                console.error('Error loading protected areas:', error);
            }

            function getProtectedArea(lat: number, lon: number): string | undefined {
                if (!protectedAreasGeoJSON || !protectedAreasGeoJSON.features) return undefined;
                // Turf point is [lon, lat]
                const point = turf.point([lon, lat]);
                for (const feature of protectedAreasGeoJSON.features) {
                    if (feature.geometry && turf.booleanPointInPolygon(point, feature)) {
                        // Try common name properties
                        return feature.properties.name || feature.properties.NAME || feature.properties.NAME_TH || 'พื้นที่อนุรักษ์';
                    }
                }
                return undefined;
            }

            for (const raw of rawHotspots) {
                if (!isInKanchanaburi(raw.latitude, raw.longitude)) continue;

                // Parse UTC datetime from FIRMS data
                const year = parseInt(raw.acq_date.substring(0, 4));
                const month = parseInt(raw.acq_date.substring(5, 7)) - 1;
                const day = parseInt(raw.acq_date.substring(8, 10));
                const hour = parseInt(raw.acq_time.substring(0, 2));
                const minute = parseInt(raw.acq_time.substring(2, 4));

                // UTC Date of the hotspot
                const hotspotDateUTC = new Date(Date.UTC(year, month, day, hour, minute));

                // Convert to Thai Time for filtering
                const hotspotThaiDateStr = hotspotDateUTC.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                const hotspotThaiHour = parseInt(hotspotDateUTC.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }));

                // Current Thai Date
                const currentThaiDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

                // ===== PASS-BASED FILTERING =====
                // Only include hotspots from today's two pass windows:
                //   - Night Pass: 01:00-03:00 Thai Time (Thai Hour 1, 2)
                //   - Afternoon Pass: 13:00-16:00 Thai Time (Thai Hour 13, 14, 15)

                const isNightPass = hotspotThaiHour >= 1 && hotspotThaiHour < 3;
                const isAfternoonPass = hotspotThaiHour >= 13 && hotspotThaiHour < 16;
                const isValidPassTime = isNightPass || isAfternoonPass;

                const isTodayThaiDate = hotspotThaiDateStr === currentThaiDateStr;

                // Debug Log
                console.log(`[FILTER] ${raw.acq_date} ${raw.acq_time} UTC => Thai: ${hotspotThaiDateStr} ${hotspotThaiHour}:00 | Today: ${isTodayThaiDate} | ValidPass: ${isValidPassTime} (Night:${isNightPass}, Afternoon:${isAfternoonPass})`);

                // Skip if NOT today OR NOT in valid pass window
                if (!isTodayThaiDate || !isValidPassTime) continue;

                const district = getDistrict(raw.latitude, raw.longitude);

                // Include hotspots in target districts OR nearby agricultural areas
                if (district || isInKanchanaburi(raw.latitude, raw.longitude)) {

                    const hotspot: HotspotData = {
                        id: generateId(raw.latitude, raw.longitude, raw.acq_date + raw.acq_time),
                        latitude: raw.latitude,
                        longitude: raw.longitude,
                        brightness: raw.brightness || raw.bright_ti4,
                        scan: raw.scan,
                        track: raw.track,
                        acq_date: raw.acq_date,
                        acq_time: raw.acq_time,
                        satellite: raw.satellite || sensor.split('_')[1],
                        confidence: raw.confidence,
                        version: raw.version,
                        bright_t31: raw.bright_ti5,
                        frp: raw.frp,
                        daynight: raw.daynight,
                        province: 'กาญจนบุรี',
                        district: district || 'พื้นที่ใกล้เคียง',
                        utmString: getUTMString(raw.latitude, raw.longitude),
                        protectedArea: getProtectedArea(raw.latitude, raw.longitude)
                    };

                    allHotspots.push(hotspot);
                }
            }
        } catch (error) {
            console.error(`Error fetching from ${sensor}:`, error);
        }
    }

    // Remove duplicates
    const uniqueHotspots = allHotspots.filter((hotspot, index, self) =>
        index === self.findIndex(h => h.id === hotspot.id)
    );

    console.log(`Total unique hotspots in Kanchanaburi: ${uniqueHotspots.length}`);

    return uniqueHotspots;
}

/**
 * Fetch today's hotspots
 */
export async function fetchTodayFIRMSHotspots(): Promise<HotspotData[]> {
    // [FIX] Fetch 3 days back to capture the "Night Pass" (which is yesterday in UTC)
    // Our robust Thai Date filtering in fetchFIRMSHotspots will filter out the excess old data.
    return fetchFIRMSHotspots(3);
}

/**
 * Find new hotspots compared to previous ones
 */
export function findNewHotspots(
    currentHotspots: HotspotData[],
    previousHotspotIds: string[]
): HotspotData[] {
    return currentHotspots.filter(
        hotspot => !previousHotspotIds.includes(hotspot.id)
    );
}
