import type { MetadataRoute } from "next";

/**
 * PWA manifest (Spanish-first). Installability basics for the mobile-first PWA;
 * the service worker / offline layer is added in a later phase.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "To'Latino",
    short_name: "To'Latino",
    description: "Tu comunidad local — descubre, pide, reserva y conecta con negocios latinos cerca de ti.",
    lang: "es-US",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F2F9",
    theme_color: "#7B61FF",
    icons: [],
  };
}
