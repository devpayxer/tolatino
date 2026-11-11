import "server-only";
import { db } from "../db";
import type { Lang } from "./modelo";
import { tapar } from "./tapar";

/* 7e · Lo que El Compa sabe en el PANEL de un negocio (fase7-compa.md §3 «Qué datos ve · Panel»; guardianes compaSoloSusDatos,
   compaSinDatosSensibles y guiaDelPanelCompleta). Recibe SOLO el id de la sesión y el negocio del panel, y vuelve a comprobar en la base que
   esa persona es miembro ACTIVO de ese negocio (la misma regla que accesoPanel). Lee lo que su panel ya le muestra, y nada más:
   - el negocio, su categoría, el rol de la persona y SUS partes (el dueño ve todo);
   - la guía del panel (compa_panel_guide) filtrada a las secciones que ESA persona puede abrir y que aplican a ese negocio (si vende, eventos,
     entrega, licencias). Las secciones de partes que no tiene quedan en `prohibidas`: nunca van al modelo, nunca salen como «Ir a …» y la
     ayuda que las explica (help_slugs) no se le da (lo decide el servidor, ver conversacion.ts turnoPanel);
   - cifras solo de sus partes: solicitudes por aprobar (Hoy y pedidos), conversaciones sin leer (Mensajes) y el plan con su prueba (Cobros y
     plan); si el negocio está abierto ahora (lo público de su página).
   Nunca: listas de clientes, nombres, teléfonos, direcciones, montos de cobros, mensajes, ni nada de otro negocio. Todo pasa por tapar(). */
type Bi = { es: string; en: string };
export type SeccionPanel = { code: string; ruta: string; parte: string | null; needs: string; title: Bi; what: Bi; slugs: string[]; words: string[] };
export type ContextoPanel = {
  negocio: { id: string; nombre: string; ciudad: string }; kind: "owner" | "staff" | "renter"; partes: string[]; pay: boolean;
  datos: Record<string, unknown>; texto: string;
  secciones: Map<string, SeccionPanel>;     // las que PUEDE abrir y aplican a su negocio (lo único que ve el modelo)
  prohibidas: Map<string, SeccionPanel>;    // aplican al negocio pero su parte no la tiene
  slugsProhibidos: Set<string>;             // ayuda de una sección que no puede abrir (y de ninguna que sí)
};
const NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VENDE = ["pedidos", "citas", "rsv", "cot"];
const CON_LICENCIAS = ["NEG-PRO", "NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"];
const PARTE: Record<string, Bi> = {
  page: { es: "Tu página", en: "Your page" }, ord: { es: "Hoy y pedidos", en: "Today and orders" }, msg: { es: "Mensajes", en: "Messages" },
  cat: { es: "Lo que vendes", en: "What you sell" }, dlv: { es: "Entrega", en: "Delivery" }, pay: { es: "Cobros y plan", en: "Payouts and plan" }, evt: { es: "Eventos", en: "Events" },
};

/* La guía completa (todas las secciones encendidas). Pocas filas: una lectura por turno. */
export async function guiaPanel(): Promise<SeccionPanel[]> {
  return (await db().query<SeccionPanel>(
    `select code, ruta, parte, needs, title, what, help_slugs as slugs, words from compa_panel_guide where enabled order by sort, code`)).rows;
}

/* ¿Puede abrir esa sección? La misma regla que accesoPanel(negocio, parte): el dueño (o «all») todo; el equipo, solo sus partes; sin parte = cualquier miembro. */
export const puedeAbrir = (partes: string[], parte: string | null) => !parte || partes.includes("all") || partes.includes(parte);

export async function contextoPanel(userId: string, negocio: string, lang: Lang): Promise<ContextoPanel | null> {
  if (typeof negocio !== "string" || !NEG.test(negocio) || negocio.length > 80) return null;
  const m = (await db().query<{ id: string; name: string; city: string; cat: string; categoria: string | null; kind: ContextoPanel["kind"]; access: string[]; mods: string[];
    evt: boolean; plan: string; trial_days: number | null; abierto: boolean | null }>(
    `select b.id, b.name, b.city_id as city, b.category_id as cat, coalesce(c.name->>$3, c.name->>'es') as categoria, m.kind, m.panel_access as access, b.modules_on as mods,
            coalesce(c.allowed_modules ? 'eventos', false) as evt, coalesce(s.plan, 'free') as plan,
            (select greatest(0, ceil(extract(epoch from x.trial_ends_at - now()) / 86400))::int from subscriptions x where x.business_id = b.id and x.status = 'trial') as trial_days,
            negocio_abierto(b.id, (now() at time zone ci.timezone)::timestamp) as abierto
       from business_members m join businesses b on b.id = m.business_id join cities ci on ci.id = b.city_id
       left join categories c on c.id = b.category_id left join business_stats_cache s on s.business_id = b.id
      where m.business_id = $2 and m.user_id = $1 and m.status = 'active' and b.status <> 'merged'
      order by (m.kind = 'owner') desc limit 1`, [userId, negocio, lang])).rows[0];
  if (!m) return null;
  const es = lang === "es";
  const partes = m.kind === "owner" ? ["all"] : m.access ?? [];
  const sells = m.mods.some((x) => VENDE.includes(x));
  const aplica = (s: SeccionPanel) => s.needs === "always" || (s.needs === "sells" && sells) || (s.needs === "events" && m.evt)
    || (s.needs === "delivery" && m.cat === "NEG-FOOD" && m.mods.includes("pedidos")) || (s.needs === "licenses" && CON_LICENCIAS.includes(m.cat));
  const guia = (await guiaPanel()).filter(aplica);
  const secciones = new Map<string, SeccionPanel>(), prohibidas = new Map<string, SeccionPanel>();
  for (const s of guia) (puedeAbrir(partes, s.parte) ? secciones : prohibidas).set(s.code, s);
  // La ayuda que explica una sección prohibida no se le da (aunque también hable de otra que sí puede abrir: ante la duda, no).
  const slugsProhibidos = new Set<string>();
  for (const s of prohibidas.values()) for (const g of s.slugs) slugsProhibidos.add(g);
  const ve = (p: string) => puedeAbrir(partes, p), pay = ve("pay");
  const [ord, msg] = await Promise.all([
    ve("ord") ? db().query<{ n: number }>(`select count(*)::int as n from operations where business_id = $1 and kind <> 'tickets' and status in ('pending', 'change_proposed')`, [m.id]) : null,
    ve("msg") ? db().query<{ n: number }>(`select count(*)::int as n from chat_threads where business_id = $1 and biz_unread > 0`, [m.id]) : null,
  ]);
  const rol = m.kind === "owner" || partes.includes("all")
    ? (es ? "dueño: ve todo el panel" : "owner: sees the whole dashboard")
    : `${m.kind === "renter" ? (es ? "renta una silla" : "rents a chair") : (es ? "equipo" : "team")}${es ? ": solo " : ": only "}${partes.filter((p) => PARTE[p]).map((p) => PARTE[p]![lang]).join(", ") || (es ? "lo básico" : "the basics")}`;
  const cifras: Record<string, number> = {};
  if (ord) cifras.solicitudes_por_aprobar = ord.rows[0]?.n ?? 0;
  if (msg) cifras.conversaciones_sin_leer = msg.rows[0]?.n ?? 0;
  const datos: Record<string, unknown> = {
    negocio: tapar(m.name).texto, categoria: m.categoria, tu_rol: rol, abierto_ahora: m.abierto ?? null,
    ...(pay ? { plan: m.plan === "pro" ? (m.trial_days != null ? (es ? `Pro en prueba, quedan ${m.trial_days} días` : `Pro trial, ${m.trial_days} days left`) : "Pro") : "Free" } : {}),
    puedes_abrir: [...secciones.values()].map((s) => ({ codigo: s.code, seccion: s.title[lang], que_hay: s.what[lang] })),
    cifras,
  };
  return { negocio: { id: m.id, nombre: m.name, ciudad: m.city }, kind: m.kind, partes, pay, datos, texto: JSON.stringify(datos), secciones, prohibidas, slugsProhibidos };
}

/* ¿De qué sección habla? Lo decide el servidor con las palabras de la guía (sin el modelo): la sección con más coincidencias entre TODAS las que
   aplican al negocio (las suyas y las prohibidas). Así un miembro que pregunta por algo de una parte que no tiene recibe «Eso lo ve el dueño»
   sin que nada de esa parte llegue al modelo. Las palabras cortas (menos de 5 letras) cuentan solo enteras (o en plural); las largas, como
   comienzo de palabra («verific» = verificar, verificación). */
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function seccionPedida(texto: string, ctx: ContextoPanel): { s: SeccionPanel; permitida: boolean } | null {
  const t = ` ${sinAcentos(texto).replace(/[^a-z0-9ñ/ ]+/g, " ").replace(/\s+/g, " ")} `;
  let mejor: { s: SeccionPanel; permitida: boolean; p: number } | null = null;
  for (const [mapa, permitida] of [[ctx.secciones, true], [ctx.prohibidas, false]] as const)
    for (const s of mapa.values()) {
      let p = 0;
      for (const w of s.words) if (w.length < 5 ? t.includes(` ${w} `) || t.includes(` ${w}s `) : t.includes(` ${w}`)) p += w.includes(" ") ? 2 : 1;
      // Empate: gana la que puede abrir (lo de la prohibida nunca llega al modelo de todos modos).
      if (p && (!mejor || p > mejor.p)) mejor = { s, permitida, p };
    }
  return mejor ? { s: mejor.s, permitida: mejor.permitida } : null;
}
