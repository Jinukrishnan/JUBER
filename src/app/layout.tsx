import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Malayalam } from "next/font/google";
import { APP_NAME } from "@/game/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const malayalam = Noto_Sans_Malayalam({
  variable: "--font-malayalam",
  subsets: ["malayalam"],
  weight: ["500", "800"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — drive the ride`,
  description: "A 3D Kerala ride-hailing game. Drive a bike, auto or car, pick up customers and reach the daily goal.",
};

// the whole display, notch included (the touch pad keeps clear of it), and no pinch or double-tap zoom while driving
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${malayalam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
