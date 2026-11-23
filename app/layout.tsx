import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  axes: ["wdth"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const title = "OrbitApps Technologies — Building products that move the world forward";
const description =
  "OrbitApps Technologies LLP is a product company in Bengaluru building consumer apps for Bharat. Explore the OrbitApps universe of products, starting with Lookzon.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.orbitappstechnologiesllp.com"),
  title,
  description,
  applicationName: "OrbitApps",
  keywords: ["OrbitApps", "OrbitApps Technologies LLP", "Lookzon", "consumer apps", "Bengaluru"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "OrbitApps Technologies LLP", title, description, locale: "en_IN" },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${instrument.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
