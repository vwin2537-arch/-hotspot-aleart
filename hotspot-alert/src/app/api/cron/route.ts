// API Route: Cron Job Handler
// Vercel Cron จะเรียก endpoint นี้ตามเวลาที่กำหนด

import { NextRequest, NextResponse } from 'next/server';
import { fetchTodayFIRMSHotspots, findNewHotspots } from '@/lib/nasa-firms';
import { sendHotspotAlert, createAlert } from '@/lib/line';
import { isSatellitePassTime, getThaiDateTime } from '@/lib/config';

// In-memory cache (shared with check-hotspot route in same instance)
let cronPreviousHotspotIds: string[] = [];
let cronLastRun: string = '';

export async function GET(request: NextRequest) {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = getThaiDateTime();
    console.log(`[CRON] Running at ${now}`);

    // Check if it's satellite pass time
    if (!isSatellitePassTime()) {
        console.log('[CRON] Not satellite pass time, skipping');
        return NextResponse.json({
            success: true,
            action: 'skipped',
            reason: 'Not satellite pass time',
            timestamp: now
        });
    }

    try {
        // Fetch current hotspots
        const currentHotspots = await fetchTodayFIRMSHotspots();
        console.log(`[CRON] Found ${currentHotspots.length} total hotspots`);

        // Find new hotspots
        const newHotspots = findNewHotspots(currentHotspots, cronPreviousHotspotIds);
        console.log(`[CRON] Found ${newHotspots.length} new hotspots`);

        // Update cache
        cronPreviousHotspotIds = currentHotspots.map(h => h.id);
        cronLastRun = now;

        // Send notification if there are new hotspots
        if (newHotspots.length > 0) {
            const alert = createAlert(newHotspots, currentHotspots);
            const sent = await sendHotspotAlert(alert);

            console.log(`[CRON] Notification sent: ${sent}`);

            return NextResponse.json({
                success: true,
                action: 'notified',
                timestamp: now,
                stats: {
                    total: currentHotspots.length,
                    new: newHotspots.length
                },
                notificationSent: sent
            });
        }

        return NextResponse.json({
            success: true,
            action: 'checked',
            reason: 'No new hotspots',
            timestamp: now,
            stats: {
                total: currentHotspots.length,
                new: 0
            }
        });

    } catch (error) {
        console.error('[CRON] Error:', error);
        return NextResponse.json({
            success: false,
            action: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: now
        }, { status: 500 });
    }
}
