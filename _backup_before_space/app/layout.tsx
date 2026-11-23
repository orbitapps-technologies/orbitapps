import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable} antialiased`}>
      <body className="min-h-svh bg-black text-ink">
        <a
          href="#main"
          className="sr-only z-50 bg-white px-4 py-2 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
