// Type definitions for Hotspot data

export interface HotspotData {
    id: string;
    latitude: number;
    longitude: number;
    brightness: number;
    scan: number;
    track: number;
    acq_date: string;
    acq_time: string;
    satellite: string;
    confidence: string | number;
    version: string;
    bright_t31: number;
    frp: number;
    daynight: string;
    // Thai administrative info from GISTDA
    province?: string;
    district?: string;
    subdistrict?: string;
    utmString?: string;
}

export interface GistdaResponse {
    status: string;
    message?: string;
    data: HotspotData[];
    total?: number;
}

export interface HotspotAlert {
    timestamp: Date;
    hotspots: HotspotData[];
    newCount: number;
    totalCount: number;
    districts: string[];
}

export interface NotificationPayload {
    type: 'new_hotspot' | 'status_update' | 'no_hotspot';
    alert?: HotspotAlert;
    message: string;
}

// Configuration for monitoring areas
export interface MonitoringArea {
    province: string;
    districts: string[];
}

export const MONITORING_AREAS: MonitoringArea = {
    province: 'กาญจนบุรี',
    districts: ['เมืองกาญจนบุรี', 'ไทรโยค', 'ศรีสวัสดิ์']
};

// Satellite pass times (Thailand timezone UTC+7)
export const SATELLITE_PASS_TIMES = {
    afternoon: { start: 13, end: 16 }, // 13:00-15:30
    night: { start: 1, end: 3 }        // 01:00-02:30
};
