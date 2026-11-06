import { C } from "./colores";

/* Plantillas del correo (propias, PLAN §8). Un marco con la marca, el título, el cuerpo y un botón; versión de texto
   siempre. Todo texto que viene de una persona o un negocio se escapa. ES o EN según la persona. */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export type Fila = [string, string, boolean?]; // texto, monto, ¿fuerte?
export function marco(x: { es: boolean; pre: string; titulo: string; intro: string; filas?: Fila[]; nota?: string; cta?: { l: string; href: string }; pie?: string }) {
  const E2 = (a: string, b: string) => (x.es ? a : b);
  const filas = (x.filas ?? []).map(([t, v, b]) => `<tr><td style="padding:8px 0;border-top:1px solid rgba(11,14,18,.08);font:${b ? 800 : 500} 14px/1.4 Arial,sans-serif;color:${C.ink}">${esc(t)}</td><td align="right" style="padding:8px 0;border-top:1px solid rgba(11,14,18,.08);font:${b ? 800 : 600} 14px/1.4 Arial,sans-serif;color:${C.ink};white-space:nowrap">${esc(v)}</td></tr>`).join("");
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
<tr><td style="padding:22px 24px 22px;font:500 11.5px/1.5 Arial,sans-serif;color:${C.ink};opacity:.55">${esc(x.pie ?? E2("To’Latino · tu ciudad, en español. Cambia qué correos recibes en Mi cuenta › Avisos.", "To’Latino · your city, in Spanish. Change which emails you get in My account › Notifications."))}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [x.titulo, "", x.intro, ...(x.filas ?? []).map(([t, v]) => `${t}: ${v}`), x.nota ?? "", x.cta ? `${x.cta.l}: ${x.cta.href}` : "", "", x.pie ?? "To’Latino"].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  return { html, text };
}
