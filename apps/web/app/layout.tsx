import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "To'Latino — tu comunidad local",
  description:
    "To'Latino — descubre, pide, reserva y conecta con negocios latinos cerca de ti. Discover, order, book, and connect with Latino businesses near you.",
  manifest: "/manifest.webmanifest",
  applicationName: "To'Latino",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "To'Latino" },
};

export const viewport: Viewport = {
  themeColor: "#7B61FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Spanish-first: default document language is es-US (DESIGN_SYSTEM.md §8).
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
