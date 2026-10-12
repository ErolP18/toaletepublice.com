import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toaletepublice.com"),
  title: "Toalete Publice — Harta României",
  description:
    "Harta toaletelor publice din România. Străzi, orașe și puncte exacte, pe date OpenStreetMap.",
  applicationName: "toaletepublice.com",
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b4d46",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${ibmPlexSans.variable} ${ibmPlexSans.className} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
