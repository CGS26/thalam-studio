import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  applicationName: "Tāla Lab",
  title: "Tāla Lab — Carnatic Rhythm Composer",
  description:
    "Build custom Carnatic tāḷa cycles, place a sound on every akshara, and shape audio directly on the beat.",
  openGraph: {
    title: "Tāla Lab — Carnatic Rhythm Composer",
    description: "Shape rhythm. Hear every akshara.",
    images: [{ url: `${basePath}/og.png`, width: 1200, height: 630, alt: "Tāla Lab rhythm composer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tāla Lab — Carnatic Rhythm Composer",
    description: "Shape rhythm. Hear every akshara.",
    images: [`${basePath}/og.png`],
  },
  icons: {
    icon: `${basePath}/favicon.png`,
    shortcut: `${basePath}/favicon.png`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tāla Lab",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#171717" />
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
