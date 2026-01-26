# 🔥 Hotspot Alert System

ระบบแจ้งเตือนจุดความร้อน (Hotspot) อัตโนมัติผ่าน LINE สำหรับสถานีควบคุมไฟป่า จังหวัดกาญจนบุรี

## ✨ Features

- 🛰️ ดึงข้อมูลจาก GISTDA Sphere API อัตโนมัติ
- 📱 แจ้งเตือนผ่าน LINE Group เมื่อพบ Hotspot ใหม่
- ⏰ ทำงานอัตโนมัติเฉพาะช่วงดาวเทียมผ่าน (13:00-15:30, 01:00-02:30)
- 🗺️ Dashboard แสดงผลแบบ Real-time

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd hotspot-alert
npm install
```

### 2. Configure Environment
แก้ไขไฟล์ `.env.local`:

```env
# GISTDA API Key (ได้มาแล้ว)
GISTDA_API_KEY=5EDB74D48BEB4A40B04CB5F3FE08EACA

# LINE Messaging API (ต้องตั้งค่าเพิ่ม)
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_GROUP_ID=your_group_id
```

### 3. Run Development Server
```bash
npm run dev
```

เปิด http://localhost:3000 เพื่อดู Dashboard

## 📱 LINE Setup

### สร้าง LINE Bot
1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider ใหม่ หรือเลือกที่มีอยู่
3. สร้าง Channel ใหม่ เลือก **Messaging API**
4. ในแท็บ **Messaging API**:
   - กด **Issue** ที่ Channel Access Token (long-lived)
   - Copy token ไปใส่ใน `.env.local`

### หา Group ID
1. เชิญ Bot เข้า Group ที่ต้องการรับแจ้งเตือน
2. ใช้วิธีใดวิธีหนึ่ง:
   - ส่งข้อความใน Group แล้วดู Webhook logs
   - ใช้ [LINE Bot Designer](https://developers.line.biz/console/) ดู Group list

## 🌐 Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hotspot-alert.git
git push -u origin main
```

### 2. Import to Vercel
1. ไปที่ [Vercel](https://vercel.com)
2. Import GitHub repository
3. ตั้งค่า Environment Variables:
   - `GISTDA_API_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_GROUP_ID`
   - `CRON_SECRET` (optional)

### 3. Cron Job
Vercel จะทำงานอัตโนมัติตาม `vercel.json`:
- ทุก 5 นาที ช่วง 13:00-15:30 (บ่าย)
- ทุก 5 นาที ช่วง 01:00-02:30 (ดึก)

## 📁 Project Structure

```
hotspot-alert/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── check-hotspot/route.ts  # ตรวจสอบ Hotspot
│   │   │   ├── cron/route.ts           # Cron handler
│   │   │   └── test-line/route.ts      # ทดสอบ LINE
│   │   ├── page.tsx                     # Dashboard
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── config.ts                    # Configuration
│   │   ├── gistda.ts                    # GISTDA API
│   │   └── line.ts                      # LINE API
│   └── types/
│       └── hotspot.ts                   # TypeScript types
├── vercel.json                          # Cron config
└── .env.local                           # Environment vars
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/check-hotspot` | GET | ตรวจสอบ Hotspot และแจ้งเตือนถ้าพบใหม่ |
| `/api/check-hotspot` | POST | Force ส่งแจ้งเตือน (body: `{forceNotify: true}`) |
| `/api/cron` | GET | Cron handler (เรียกโดย Vercel) |
| `/api/test-line` | POST | ทดสอบส่ง LINE |

## 📍 Monitoring Area

- **จังหวัด:** กาญจนบุรี
- **อำเภอ:**
  - เมืองกาญจนบุรี
  - ไทรโยค
  - ศรีสวัสดิ์

## 📞 Support

หากมีปัญหาการใช้งาน กรุณาติดต่อผู้พัฒนา
