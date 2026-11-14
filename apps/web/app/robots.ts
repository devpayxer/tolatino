import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/correo";
import { ENTORNO } from "@/lib/entorno";

export const dynamic = "force-dynamic";

/* 9h · robots.txt por entorno (HERRAMIENTAS #24; guardián sandboxNoSeIndexa): el sandbox (y lo local) NO se indexa nunca — todo «Disallow: /», además del
   «noindex» del layout y la cabecera X-Robots-Tag de nginx-pruebas. En producción: lo público sí; lo privado (cuenta, panel, admin, API, pedidos, enlaces
   de QR) no; y el mapa del sitio. */
export default function robots(): MetadataRoute.Robots {
  if (ENTORNO !== "produccion") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/panel", "/api/", "/cuenta", "/entrar", "/q/", "/repartidor", "/puerta", "/pedido/", "/reserva/", "/cita/", "/pago", "/avisos", "/app/"] }],
    sitemap: `${BASE_URL()}/sitemap.xml`,
  };
}
