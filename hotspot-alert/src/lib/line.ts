// LINE Messaging API Client
// ส่งแจ้งเตือน Hotspot ผ่าน LINE

import { CONFIG, getThaiDateTime } from './config';
import { HotspotData, HotspotAlert } from '@/types/hotspot';

/**
 * ส่งข้อความไปยัง LINE Group
 */
async function sendLineMessage(messages: object[]): Promise<boolean> {
    if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN || !CONFIG.LINE_GROUP_ID) {
        console.error('LINE credentials not configured');
        return false;
    }

    try {
        const response = await fetch(CONFIG.LINE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: CONFIG.LINE_GROUP_ID,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`LINE API error: ${response.status} - ${errorData}`);
            return false;
        }

        console.log('LINE message sent successfully');
        return true;

    } catch (error) {
        console.error('Error sending LINE message:', error);
        return false;
    }
}

/**
 * สร้างข้อความแจ้งเตือน Hotspot
 */
function createHotspotAlertMessage(alert: HotspotAlert): object[] {
    const { hotspots, newCount, districts } = alert;

    // รวมข้อมูลตามอำเภอ
    const districtSummary = districts.map(district => {
        const count = hotspots.filter(h => h.district === district).length;
        return count > 0 ? `  • ${district}: ${count} จุด` : null;
    }).filter(Boolean).join('\n');

    // สร้างข้อความหลัก
    const mainMessage = `🔥 พบจุดความร้อน (Hotspot) ใหม่!
━━━━━━━━━━━━━━━━━━━━
📍 พื้นที่: จ.${CONFIG.PROVINCE}
${districtSummary}

🛰️ แหล่งข้อมูล: GISTDA/VIIRS
📅 เวลาตรวจพบ: ${getThaiDateTime()}
🔢 จำนวนจุดใหม่: ${newCount} จุด

👉 ดูรายละเอียด: https://dnp.gistda.or.th/`;

    const messages: object[] = [
        {
            type: 'text',
            text: mainMessage
        }
    ];

    // ถ้ามี hotspot น้อยกว่า 10 จุด แสดงพิกัดด้วย
    if (hotspots.length <= 10 && hotspots.length > 0) {
        const coordinatesList = hotspots.map((h, i) =>
            `${i + 1}. ${h.district || 'ไม่ทราบพื้นที่'}\n   📍 UTM: ${h.utmString || 'N/A'}\n   📌 Lat,Long: ${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}`
        ).join('\n\n');

        messages.push({
            type: 'text',
            text: `📌 พิกัดจุดความร้อน:\n\n${coordinatesList}`
        });
    }

    return messages;
}

/**
 * สร้างข้อความแจ้งสถานะว่าไม่พบ Hotspot
 */
function createNoHotspotMessage(): object[] {
    return [
        {
            type: 'text',
            text: `✅ ตรวจสอบจุดความร้อนเสร็จสิ้น
━━━━━━━━━━━━━━━━━━━━
📍 พื้นที่: จ.${CONFIG.PROVINCE}
📅 เวลา: ${getThaiDateTime()}

🎉 ไม่พบจุดความร้อนใหม่ในพื้นที่`
        }
    ];
}

/**
 * ส่งแจ้งเตือน Hotspot ไปยัง LINE
 */
export async function sendHotspotAlert(alert: HotspotAlert): Promise<boolean> {
    const messages = createHotspotAlertMessage(alert);
    return await sendLineMessage(messages);
}

/**
 * ส่งแจ้งเตือนว่าตรวจสอบแล้วไม่พบ Hotspot
 */
export async function sendNoHotspotNotification(): Promise<boolean> {
    const messages = createNoHotspotMessage();
    return await sendLineMessage(messages);
}

/**
 * ส่งข้อความทดสอบ
 */
export async function sendTestMessage(): Promise<boolean> {
    const messages = [
        {
            type: 'text',
            text: `🧪 ทดสอบระบบแจ้งเตือน Hotspot
━━━━━━━━━━━━━━━━━━━━
📅 เวลา: ${getThaiDateTime()}

✅ ระบบทำงานปกติ
📍 พื้นที่ตรวจสอบ: จ.${CONFIG.PROVINCE}
🏘️ อำเภอ: ${CONFIG.DISTRICTS.join(', ')}`
        }
    ];

    return await sendLineMessage(messages);
}

/**
 * สร้าง Alert object จาก Hotspot data
 */
export function createAlert(
    newHotspots: HotspotData[],
    allHotspots: HotspotData[]
): HotspotAlert {
    // รวบรวมอำเภอที่พบ
    const districtsSet = new Set(newHotspots.map(h => h.district || 'ไม่ทราบ'));

    return {
        timestamp: new Date(),
        hotspots: newHotspots,
        newCount: newHotspots.length,
        totalCount: allHotspots.length,
        districts: Array.from(districtsSet)
    };
}
