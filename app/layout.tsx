import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Safe Listings Radar — Rug-Scored Solana New Listings",
  description:
    "Every new Solana token, scored for rug risk before you ape. Real-time safety verdicts on freshly-listed tokens, powered by Birdeye Data.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "Safe Listings Radar",
    description:
      "Every new Solana token, scored for rug risk before you ape.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safe Listings Radar",
    description:
      "Every new Solana token, scored for rug risk before you ape.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
