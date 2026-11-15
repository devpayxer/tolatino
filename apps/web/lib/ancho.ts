/* 9c · El ancho con el que se pinta por primera vez (CLS). Las pantallas eligen teléfono o escritorio con el ancho de la ventana, que el servidor
   no sabe: antes arrancaban en 390 y, al medir, pasaban a escritorio — todo se movía (CLS 0,91 en el Inicio del Super Admin, 0,26 en Mi cuenta).
   Ahora el primer pintado usa el último ancho de este navegador (cookie tl_ancho, la pone app/_ancho/Ancho.tsx) o, la primera vez, el tipo de
   dispositivo (Sec-CH-UA-Mobile o el User-Agent). Solo una medida de pantalla: nada de la persona. */
import "server-only";
import { cookies, headers } from "next/headers";

export async function anchoInicial(): Promise<number> {
  const c = Number((await cookies()).get("tl_ancho")?.value);
  if (Number.isFinite(c) && c >= 280 && c <= 4000) return Math.round(c);
  const h = await headers(), ua = h.get("user-agent") ?? "";
  if (/iPad|Tablet/i.test(ua)) return 820;
  if (h.get("sec-ch-ua-mobile") === "?1" || /Mobi|Android|iPhone|iPod/i.test(ua)) return 390;
  return 1280;
}
