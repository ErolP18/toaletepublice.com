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
  openGraph: {
    title: "Toalete Publice — Harta României",
    description: "Hartă civică, gratuită, a toaletelor publice din România.",
    url: "https://toaletepublice.com",
    siteName: "toaletepublice.com",
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Toalete Publice — Harta României",
    description: "Hartă civică, gratuită, a toaletelor publice din România.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b4d46",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${ibmPlexSans.variable} ${ibmPlexSans.className} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
