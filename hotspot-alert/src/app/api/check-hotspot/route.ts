// API Route: Check Hotspot
// ตรวจสอบ Hotspot และส่งแจ้งเตือนถ้าพบจุดใหม่

import { NextRequest, NextResponse } from 'next/server';
import { fetchTodayFIRMSHotspots, findNewHotspots } from '@/lib/nasa-firms';
import { sendHotspotAlert, createAlert } from '@/lib/line';
import { CONFIG, isSatellitePassTime, getThaiDateTime } from '@/lib/config';
import { enrichHotspotsWithProtectedArea } from '@/lib/protected-areas';

// In-memory cache for previous hotspot IDs (will reset on cold start)
// For production, use Redis or database
let previousHotspotIds: string[] = [];
let lastCheckTime: string = '';

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get current hotspots from NASA FIRMS
        const rawHotspots = await fetchTodayFIRMSHotspots();

        // Enrich with protected area data
        const currentHotspots = enrichHotspotsWithProtectedArea(rawHotspots);

        // Find new hotspots
        const newHotspots = findNewHotspots(rawHotspots, previousHotspotIds);

        // Update cache
        previousHotspotIds = rawHotspots.map(h => h.id);
        lastCheckTime = getThaiDateTime();

        // Prepare response
        const response = {
            success: true,
            timestamp: lastCheckTime,
            isSatellitePassTime: isSatellitePassTime(),
            province: CONFIG.PROVINCE,
            districts: CONFIG.DISTRICTS,
            stats: {
                totalHotspots: currentHotspots.length,
                newHotspots: newHotspots.length,
                executionTimeMs: Date.now() - startTime
            },
            hotspots: currentHotspots,
            newHotspots: newHotspots
        };

        // [Optimized] Don't send LINE notify on GET (Dashboard view) to prevent spam
        // Notification is handled by /api/cron or POST /api/check-hotspot (Force)
        return NextResponse.json({
            ...response,
            notification: {
                sent: false,
                type: 'dashboard_view',
                count: newHotspots.length,
                message: 'Notification skipped for dashboard view'
            }
        });

    } catch (error) {
        console.error('Error checking hotspots:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: getThaiDateTime()
        }, { status: 500 });
    }
}

// POST method for manual trigger with options
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { forceNotify = false, testMode = false } = body;

        // Get current hotspots from NASA FIRMS
        const currentHotspots = await fetchTodayFIRMSHotspots();

        // Find new hotspots
        const newHotspots = forceNotify
            ? currentHotspots
            : findNewHotspots(currentHotspots, previousHotspotIds);

        // Update cache (unless test mode)
        if (!testMode) {
            previousHotspotIds = currentHotspots.map(h => h.id);
            lastCheckTime = getThaiDateTime();
        }

        // Send notification
        let notificationSent = false;
        if (newHotspots.length > 0 || forceNotify) {
            const hotspotsToNotify = newHotspots.length > 0 ? newHotspots : currentHotspots;
            const alert = createAlert(hotspotsToNotify, currentHotspots);
            notificationSent = await sendHotspotAlert(alert);
        }

        return NextResponse.json({
            success: true,
            timestamp: getThaiDateTime(),
            mode: testMode ? 'test' : 'production',
            forceNotify,
            stats: {
                totalHotspots: currentHotspots.length,
                newHotspots: newHotspots.length
            },
            notification: {
                sent: notificationSent,
                count: newHotspots.length
            }
        });

    } catch (error) {
        console.error('Error in POST check-hotspot:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
