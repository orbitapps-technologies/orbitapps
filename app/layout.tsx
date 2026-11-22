import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const title = "OrbitApps Technologies — A Universe of Innovation";
const description =
  "OrbitApps builds next-gen consumer apps for Bharat. Explore our product universe, starting with Lookzon: real-time family location, vehicle crash detection with SOS alerts, and UPI AutoPay.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.orbitappstechnologiesllp.com"),
  title,
  description,
  applicationName: "OrbitApps",
  keywords: ["OrbitApps", "OrbitApps Technologies LLP", "Lookzon", "family safety app", "location sharing", "crash detection", "Bengaluru"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "OrbitApps Technologies LLP",
    title,
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#03050D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`}>
      <body className="min-h-svh bg-space text-ink">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-solar px-4 py-2 text-[#1a0f00] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
