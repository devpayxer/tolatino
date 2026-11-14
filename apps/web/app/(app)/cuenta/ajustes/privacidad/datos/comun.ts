/* 9d · Lo común de «Descargar mis datos» (Mi cuenta) y «Exportar los datos del negocio» (Panel › Más): las filas del archivo con su estado, si se
   puede pedir otro y bajar con POST (un uso; el GET de una vista previa nunca lo gasta: /api/datos/archivo/[id]). */
import type { Exportacion } from "@/lib/datos/exportar";

const dia = (iso: string, es: boolean) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
const peso = (b: number | null) => (b == null ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export type FilaArchivo = { id: string; icon: string; t: string; s: string; tag: [string, string]; bajar: boolean };
export function filasArchivo(L: Exportacion[], es: boolean): FilaArchivo[] {
  const E2 = (a: string, b: string) => (es ? a : b);
  return L.map((x) => {
    const pedido = `${E2("PEDIDO ", "REQUESTED ")}${dia(x.pedido, es).toUpperCase()}`;
    switch (x.estado) {
      case "pendiente": case "armando": return { id: x.id, icon: "clock", t: E2("Estamos armando tu archivo", "We are putting your file together"), s: `${pedido} · ${E2("TARDA UNOS MINUTOS", "IT TAKES A FEW MINUTES")}`, tag: [E2("ARMANDO", "PREPARING"), "action"], bajar: false };
      case "listo": return { id: x.id, icon: "folder", t: E2("Tu archivo está listo", "Your file is ready"), s: `${peso(x.bytes)} · ${E2("VENCE ", "EXPIRES ")}${dia(x.vence!, es).toUpperCase()} · ${E2("SE BAJA UNA VEZ", "DOWNLOADS ONCE")}`, tag: [E2("LISTO", "READY"), "signal"], bajar: true };
      case "bajado": return { id: x.id, icon: "check", t: E2("Ya lo bajaste", "You downloaded it"), s: `${E2("BAJADO ", "DOWNLOADED ")}${dia(x.bajado!, es).toUpperCase()}`, tag: [E2("BAJADO", "DOWNLOADED"), "neutral"], bajar: false };
      case "vencido": return { id: x.id, icon: "clock", t: E2("Venció sin bajarse", "It expired without being downloaded"), s: pedido, tag: [E2("VENCIDO", "EXPIRED"), "neutral"], bajar: false };
      default: return { id: x.id, icon: "warning", t: E2("No pudimos armarlo", "We could not put it together"), s: `${pedido} · ${E2("PÍDELO OTRA VEZ", "REQUEST IT AGAIN")}`, tag: [E2("NO SALIÓ", "FAILED"), "danger"], bajar: false };
    }
  });
}

/* ¿Se puede pedir otro ahora? Uno vivo a la vez y uno cada N días (el servidor lo vuelve a revisar). */
export function puedePedir(L: Exportacion[], es: boolean): { puede: boolean; nota: string | null } {
  const viva = L.find((x) => ["pendiente", "armando", "listo"].includes(x.estado));
  if (viva) return { puede: false, nota: null };
  const ult = L.find((x) => x.estado !== "fallo");
  if (ult?.otro && new Date(ult.otro).getTime() > Date.now()) {
    const d = new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "long" }).format(new Date(ult.otro));
    return { puede: false, nota: es ? `Puedes pedir otro archivo el ${d}.` : `You can request another file on ${d}.` };
  }
  return { puede: true, nota: null };
}

/* Bajar: un formulario POST al mismo sitio (el navegador guarda el ZIP y la pantalla se queda). */
export function bajarArchivo(id: string) {
  const f = document.createElement("form");
  f.method = "post"; f.action = `/api/datos/archivo/${encodeURIComponent(id)}`; f.style.display = "none";
  document.body.appendChild(f); f.submit(); f.remove();
}
