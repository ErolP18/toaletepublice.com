import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Toalete Publice — Harta României",
  description:
    "Harta toaletelor publice din România. Străzi, orașe și puncte exacte, pe date OpenStreetMap.",
  applicationName: "toaletepublice.com",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b4d46",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <link rel="stylesheet" href="/maplibre-gl.css" />
        {children}
      </body>
    </html>
  );
}
