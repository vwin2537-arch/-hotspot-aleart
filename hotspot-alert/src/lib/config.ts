// Configuration for the Hotspot Alert System

// ===== API KEYS (ต้องตั้งค่าใน Environment Variables) =====
export const CONFIG = {
    // NASA FIRMS API (Primary - same source as fireDNPX)
    NASA_FIRMS_MAP_KEY: process.env.NASA_FIRMS_MAP_KEY || '',
    NASA_FIRMS_API_URL: 'https://firms.modaps.eosdis.nasa.gov/api',

    // GISTDA Sphere API (Backup)
    GISTDA_API_KEY: process.env.GISTDA_API_KEY || '',
    GISTDA_API_URL: 'https://api.sphere.gistda.or.th/services/info/disaster-hotspot',

    // LINE Messaging API
    LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    LINE_GROUP_ID: process.env.LINE_GROUP_ID || '',
    LINE_API_URL: 'https://api.line.me/v2/bot/message/push',

    // Monitoring Configuration
    CHECK_INTERVAL_MINUTES: 5,

    // พื้นที่ที่ต้องการตรวจสอบ
    PROVINCE: 'กาญจนบุรี',
    DISTRICTS: ['เมืองกาญจนบุรี', 'ไทรโยค', 'ศรีสวัสดิ์'],

    // Timezone
    TIMEZONE: 'Asia/Bangkok',

    // Satellite pass times (hour in 24h format, Thailand time)
    SATELLITE_PASS: {
        AFTERNOON: { START: 13, END: 16 }, // 13:00-15:30
        NIGHT: { START: 1, END: 3 }        // 01:00-02:30
    }
};

// ===== Helper Functions =====

/**
 * ตรวจสอบว่าเป็นช่วงเวลาที่ดาวเทียมผ่านหรือไม่
 */
export function isSatellitePassTime(): boolean {
    const now = new Date();
    // Convert to Thailand time
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const hour = thailandTime.getHours();

    const { AFTERNOON, NIGHT } = CONFIG.SATELLITE_PASS;

    // ช่วงบ่าย: 13:00-15:30
    const isAfternoon = hour >= AFTERNOON.START && hour < AFTERNOON.END;

    // ช่วงดึก: 01:00-02:30
    const isNight = hour >= NIGHT.START && hour < NIGHT.END;

    return isAfternoon || isNight;
}

/**
 * รับเวลาปัจจุบันในรูปแบบไทย
 */
export function getThaiDateTime(): string {
    const now = new Date();
    return now.toLocaleString('th-TH', {
        timeZone: CONFIG.TIMEZONE,
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

/**
 * สร้าง unique ID สำหรับ hotspot
 */
export function generateHotspotId(lat: number, lon: number, datetime: string): string {
    return `${lat.toFixed(4)}_${lon.toFixed(4)}_${datetime}`;
}
