import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "To'Latino",
  description: "Negocios, comunidad y eventos latinos en tu ciudad.",
  applicationName: "To'Latino",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F6F3", // GUARDIAN-OK: = --tl-paper; el navegador exige un literal aquí
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-US" className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
