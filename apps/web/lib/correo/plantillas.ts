import { C } from "./colores";

/* Plantillas del correo (propias, PLAN §8). Un marco con la marca, el título, el cuerpo y un botón; versión de texto
   siempre. Todo texto que viene de una persona o un negocio se escapa. ES o EN según la persona.
   9l · `wallet`: «Agregar a Apple Wallet» y «Agregar a Google Wallet» enlazados a la página del boleto (allí están los botones de verdad: el pase pide la
   sesión). Son las insignias PROVISIONALES de 8g en HTML (negro con borde gris, sin logos imitados; Gmail no muestra SVG) y se cambian por el arte oficial
   cuando el fundador acepte las licencias de Apple y Google (REVISION 8g); `baja`: el enlace visible para darse de baja de las campañas. */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export type Fila = [string, string, boolean?]; // texto, monto, ¿fuerte?
export type Wallet = { apple: { href: string; l: string } | null; google: { href: string; l: string } | null };
// Los colores de la insignia de Wallet (negro con borde gris, reglas de Apple y Google): la excepción al sistema de diseño (§6 #15), como en 8g.
const NEGRO = "#000000", BORDE = "#A6A6A6"; // GUARDIAN-OK: arte de Apple / Google (hueco #9), no un color de la interfaz
const insignia = (b: { href: string; l: string }) => `<a href="${esc(b.href)}" data-wallet-correo style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:10px;background:${NEGRO};border:1px solid ${BORDE};color:${C.white};font:600 14px Arial,sans-serif;text-decoration:none">${esc(b.l)}</a>`;
export function marco(x: { es: boolean; pre: string; titulo: string; intro: string; filas?: Fila[]; nota?: string; cta?: { l: string; href: string }; pie?: string; wallet?: Wallet; baja?: { l: string; href: string } }) {
  const E2 = (a: string, b: string) => (x.es ? a : b);
  const filas = (x.filas ?? []).map(([t, v, b]) => `<tr><td style="padding:8px 0;border-top:1px solid rgba(11,14,18,.08);font:${b ? 800 : 500} 14px/1.4 Arial,sans-serif;color:${C.ink}">${esc(t)}</td><td align="right" style="padding:8px 0;border-top:1px solid rgba(11,14,18,.08);font:${b ? 800 : 600} 14px/1.4 Arial,sans-serif;color:${C.ink};white-space:nowrap">${esc(v)}</td></tr>`).join("");
  const wallet = x.wallet && (x.wallet.apple || x.wallet.google) ? `<tr><td style="padding:14px 24px 0">${x.wallet.apple ? insignia(x.wallet.apple) : ""}${x.wallet.google ? insignia(x.wallet.google) : ""}</td></tr>` : "";
  const html = `<!doctype html><html lang="${x.es ? "es" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(x.titulo)}</title></head>
<body style="margin:0;padding:0;background:${C.paper}"><span style="display:none;max-height:0;overflow:hidden">${esc(x.pre)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.white};border-radius:18px">
<tr><td style="padding:22px 24px 0;font:800 20px Arial,sans-serif;color:${C.action}">To&rsquo;Latino</td></tr>
<tr><td style="padding:14px 24px 0;font:800 22px/1.25 Arial,sans-serif;color:${C.ink}">${esc(x.titulo)}</td></tr>
<tr><td style="padding:8px 24px 0;font:500 14px/1.5 Arial,sans-serif;color:${C.ink}">${esc(x.intro)}</td></tr>
${filas ? `<tr><td style="padding:14px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table></td></tr>` : ""}
${x.nota ? `<tr><td style="padding:12px 24px 0;font:500 13px/1.5 Arial,sans-serif;color:${C.ink};opacity:.7">${esc(x.nota)}</td></tr>` : ""}
${x.cta ? `<tr><td style="padding:18px 24px 0"><a href="${esc(x.cta.href)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:${C.ink};color:${C.white};font:700 14px Arial,sans-serif;text-decoration:none">${esc(x.cta.l)}</a></td></tr>` : ""}
${wallet}
<tr><td style="padding:22px 24px 22px;font:500 11.5px/1.5 Arial,sans-serif;color:${C.ink};opacity:.55">${esc(x.pie ?? E2("To’Latino · tu ciudad, en español. Cambia qué correos recibes en Mi cuenta › Avisos.", "To’Latino · your city, in Spanish. Change which emails you get in My account › Notifications."))}${x.baja ? ` <a href="${esc(x.baja.href)}" style="color:${C.ink}">${esc(x.baja.l)}</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [x.titulo, "", x.intro, ...(x.filas ?? []).map(([t, v]) => `${t}: ${v}`), x.nota ?? "", x.cta ? `${x.cta.l}: ${x.cta.href}` : "",
    x.wallet?.apple ? `${x.wallet.apple.l}: ${x.wallet.apple.href}` : "", x.wallet?.google ? `${x.wallet.google.l}: ${x.wallet.google.href}` : "", "", x.pie ?? "To’Latino", x.baja ? `${x.baja.l}: ${x.baja.href}` : ""]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  return { html, text };
}
