import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thālam — Carnatic Rhythm Studio",
  description:
    "Build custom Carnatic tāḷa cycles, place a sound on every akshara, and shape audio directly on the beat.",
  openGraph: {
    title: "Thālam — Carnatic Rhythm Studio",
    description: "Shape rhythm. Hear every akshara.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Thālam rhythm studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thālam — Carnatic Rhythm Studio",
    description: "Shape rhythm. Hear every akshara.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
        <meta name="theme-color" content="#231d19" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
