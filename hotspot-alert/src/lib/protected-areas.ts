// Protected Forest Areas in Kanchanaburi Province
// ข้อมูลพื้นที่ป่าอนุรักษ์ในจังหวัดกาญจนบุรี

import { HotspotData } from '@/types/hotspot';

// ประเภทพื้นที่ป่าอนุรักษ์
export type ProtectedAreaType = 'national_park' | 'wildlife_sanctuary' | 'forest_reserve' | 'hunting_area' | 'unknown';

export interface ProtectedArea {
    id: string;
    name: string;
    nameEn: string;
    type: ProtectedAreaType;
    // Approximate bounding box (minLat, maxLat, minLon, maxLon)
    bounds: {
        minLat: number;
        maxLat: number;
        minLon: number;
        maxLon: number;
    };
    // Center point for reference
    center: {
        lat: number;
        lon: number;
    };
}

// Protected areas in Kanchanaburi Province
// พิกัดเป็น approximate bounding box
export const PROTECTED_AREAS: ProtectedArea[] = [
    // ==== อุทยานแห่งชาติ (National Parks) ====
    {
        id: 'erawan',
        name: 'อุทยานแห่งชาติเอราวัณ',
        nameEn: 'Erawan National Park',
        type: 'national_park',
        bounds: {
            minLat: 14.00,  // ขยายลงมาจาก 14.28
            maxLat: 14.52,
            minLon: 98.90,  // ขยายจาก 98.95
            maxLon: 99.25   // ขยายจาก 99.22
        },
        center: { lat: 14.383, lon: 99.117 }
    },
    {
        id: 'saiyok',
        name: 'อุทยานแห่งชาติไทรโยค',
        nameEn: 'Sai Yok National Park',
        type: 'national_park',
        bounds: {
            minLat: 14.05,  // ขยายจาก 14.15
            maxLat: 14.55,
            minLon: 98.55,
            maxLon: 99.15   // ขยายจาก 99.00
        },
        center: { lat: 14.35, lon: 98.85 }
    },
    {
        id: 'chalerm_rattanakosin',
        name: 'อุทยานแห่งชาติเฉลิมรัตนโกสินทร์',
        nameEn: 'Chalerm Rattanakosin National Park',
        type: 'national_park',
        bounds: {
            minLat: 14.60,
            maxLat: 14.80,
            minLon: 98.75,
            maxLon: 99.05
        },
        center: { lat: 14.70, lon: 98.90 }
    },
    {
        id: 'lam_khlong_ngu',
        name: 'อุทยานแห่งชาติลำคลองงู',
        nameEn: 'Lam Khlong Ngu National Park',
        type: 'national_park',
        bounds: {
            minLat: 14.85,
            maxLat: 15.25,
            minLon: 98.80,
            maxLon: 99.30
        },
        center: { lat: 15.05, lon: 99.05 }
    },
    {
        id: 'khao_laem',
        name: 'อุทยานแห่งชาติเขาแหลม',
        nameEn: 'Khao Laem National Park',
        type: 'national_park',
        bounds: {
            minLat: 14.80,
            maxLat: 15.30,
            minLon: 98.45,
            maxLon: 98.90
        },
        center: { lat: 15.05, lon: 98.675 }
    },

    // ==== เขตรักษาพันธุ์สัตว์ป่า (Wildlife Sanctuaries) ====
    {
        id: 'salakphra',
        name: 'เขตรักษาพันธุ์สัตว์ป่าสลักพระ',
        nameEn: 'Salak Phra Wildlife Sanctuary',
        type: 'wildlife_sanctuary',
        bounds: {
            minLat: 14.05,
            maxLat: 14.40,
            minLon: 99.20,
            maxLon: 99.55
        },
        center: { lat: 14.225, lon: 99.375 }
    },
    {
        id: 'thung_yai_naresuan_west',
        name: 'เขตรักษาพันธุ์สัตว์ป่าทุ่งใหญ่นเรศวร (ฝั่งตะวันตก)',
        nameEn: 'Thung Yai Naresuan Wildlife Sanctuary (West)',
        type: 'wildlife_sanctuary',
        bounds: {
            minLat: 15.15,
            maxLat: 15.70,
            minLon: 98.35,
            maxLon: 98.95
        },
        center: { lat: 15.425, lon: 98.65 }
    },
    {
        id: 'huai_kha_khaeng',
        name: 'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง',
        nameEn: 'Huai Kha Khaeng Wildlife Sanctuary',
        type: 'wildlife_sanctuary',
        bounds: {
            minLat: 15.30,
            maxLat: 15.75,
            minLon: 99.05,
            maxLon: 99.50
        },
        center: { lat: 15.525, lon: 99.275 }
    }
];

/**
 * ตรวจสอบว่า hotspot อยู่ในพื้นที่ป่าอนุรักษ์ไหน
 */
export function findProtectedArea(lat: number, lon: number): ProtectedArea | null {
    for (const area of PROTECTED_AREAS) {
        const { bounds } = area;
        if (lat >= bounds.minLat && lat <= bounds.maxLat &&
            lon >= bounds.minLon && lon <= bounds.maxLon) {
            return area;
        }
    }
    return null;
}

/**
 * รับชื่อพื้นที่ป่าอนุรักษ์
 */
export function getProtectedAreaName(lat: number, lon: number): string | null {
    const area = findProtectedArea(lat, lon);
    return area ? area.name : null;
}

/**
 * รับไอคอนตามประเภทพื้นที่
 */
export function getAreaIcon(type: ProtectedAreaType): string {
    switch (type) {
        case 'national_park': return '🏞️';
        case 'wildlife_sanctuary': return '🦁';
        case 'forest_reserve': return '🌲';
        case 'hunting_area': return '🎯';
        default: return '📍';
    }
}

/**
 * รับชื่อประเภทพื้นที่เป็นภาษาไทย
 */
export function getAreaTypeName(type: ProtectedAreaType): string {
    switch (type) {
        case 'national_park': return 'อุทยานแห่งชาติ';
        case 'wildlife_sanctuary': return 'เขตรักษาพันธุ์สัตว์ป่า';
        case 'forest_reserve': return 'ป่าสงวนแห่งชาติ';
        case 'hunting_area': return 'เขตห้ามล่าสัตว์ป่า';
        default: return 'พื้นที่อื่น';
    }
}

/**
 * เพิ่มข้อมูลพื้นที่ป่าอนุรักษ์ให้กับ hotspot
 */
export function enrichHotspotWithProtectedArea(hotspot: HotspotData): HotspotData & {
    protectedArea?: string;
    protectedAreaType?: ProtectedAreaType;
    protectedAreaIcon?: string;
} {
    const area = findProtectedArea(hotspot.latitude, hotspot.longitude);

    if (area) {
        return {
            ...hotspot,
            protectedArea: area.name,
            protectedAreaType: area.type,
            protectedAreaIcon: getAreaIcon(area.type)
        };
    }

    return hotspot;
}

/**
 * เพิ่มข้อมูลพื้นที่ป่าอนุรักษ์ให้กับ hotspot หลายตัว
 */
export function enrichHotspotsWithProtectedArea(hotspots: HotspotData[]): (HotspotData & {
    protectedArea?: string;
    protectedAreaType?: ProtectedAreaType;
    protectedAreaIcon?: string;
})[] {
    return hotspots.map(enrichHotspotWithProtectedArea);
}
