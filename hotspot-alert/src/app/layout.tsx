import type { Metadata } from "next";
import { Kanit, Sarabun } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-heading',
  display: 'swap',
});

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Hotspot Alert System - Kanchanaburi",
  description: "ระบบแจ้งเตือนจุดความร้อน จ.กาญจนบุรี",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${kanit.variable} ${sarabun.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
