import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Thalam Studio — Carnatic Rhythm Composer",
  description:
    "Build custom Carnatic tāḷa cycles, place a sound on every akshara, and shape audio directly on the beat.",
  openGraph: {
    title: "Thalam Studio — Carnatic Rhythm Composer",
    description: "Shape rhythm. Hear every akshara.",
    images: [{ url: `${basePath}/og.png`, width: 1200, height: 630, alt: "Thalam Studio rhythm composer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thalam Studio — Carnatic Rhythm Composer",
    description: "Shape rhythm. Hear every akshara.",
    images: [`${basePath}/og.png`],
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
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
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${basePath}/favicon.svg`} />
      </head>
      <body>{children}</body>
    </html>
  );
}
