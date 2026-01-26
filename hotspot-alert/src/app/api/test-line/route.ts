// API Route: Test LINE Notification
// ทดสอบการส่งข้อความไปยัง LINE

import { NextRequest, NextResponse } from 'next/server';
import { sendTestMessage } from '@/lib/line';
import { getThaiDateTime } from '@/lib/config';

export async function POST(request: NextRequest) {
    try {
        const sent = await sendTestMessage();

        return NextResponse.json({
            success: sent,
            message: sent ? 'Test message sent successfully' : 'Failed to send test message',
            timestamp: getThaiDateTime()
        });

    } catch (error) {
        console.error('Error sending test message:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: getThaiDateTime()
        }, { status: 500 });
    }
}
