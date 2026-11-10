"use client";
/* USR-HOME · Mi cuenta (diseño «To'Latino Mi cuenta» · homeV): avisos de la cuenta, tu tarjeta de vecino, completa tu
   cuenta, tu semana (pedidos en curso, reservaciones y entrevistas de los próximos 7 días), pendiente de ti, accesos y
   tu cuenta (teléfono), tu apoyo al barrio este mes y, en escritorio, la tarjeta de invitar. Las celdas de la tarjeta de
   vecino (prototipo homeV): RANGO · MONEDAS (5g; sin valor en dinero) · RESEÑAS (el Wallet llega con su fase); sin Comunidad todavía,
   «Únete» lleva a la bienvenida. */
import { useRouter } from "next/navigation";
import type { Resumen } from "@/lib/mi-cuenta";
import { tagMesa } from "./citas/Citas";
import { diaRel, horaDe } from "./fechas";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "./Marco";
import { tagPed } from "./pedidos/Pedidos";

const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export function Inicio({ es, yo, r, dirs, ciudad, nick, nombre, negocio, sanciones, borrar, com }: {
  es: boolean; yo: Yo; r: Resumen; dirs: number; ciudad: string | null; nick: string | null; nombre: string; negocio: { id: string; name: string } | null;
  sanciones: { kind: string; reason: string; hasta: string | null }[]; borrar: string | null; com: { rango: number; nombre: { es: string; en: string }; monedas: number } | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), ir = (h: string) => router.push(h);
  const dia = (d: string) => new Date(d).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" });
  const salir = async () => { await fetch("/api/cuenta/salir", { method: "POST" }); router.replace("/entrar"); };
  const c = r.cnt, city = ciudad ?? "Hazleton";
  const B: Bloque[] = [];
  if (borrar) B.push({ type: "note", tone: "danger", ic: "warning", t: E2(`Tu cuenta se borra el ${dia(borrar)}`, `Your account will be deleted on ${dia(borrar)}`), s: E2("Si cambias de idea, cancélalo antes de esa fecha en Ajustes.", "If you change your mind, cancel before then in Settings."), a: E2("Ver", "View"), onA: () => ir("/cuenta/ajustes/borrar") });
  // 5d · Cada sanción lleva a «Avisos de moderación», donde se ve su efecto y se apela (14 días).
  for (const x of sanciones) B.push({ type: "note", tone: "danger", ic: "warning", s: x.kind === "adv" ? E2(`To’Latino te mandó una advertencia: ${x.reason}.`, `To’Latino sent you a warning: ${x.reason}.`) : E2(`No puedes publicar hasta el ${dia(x.hasta!)}: ${x.reason}.`, `You can’t post until ${dia(x.hasta!)}: ${x.reason}.`), a: E2("Ver y apelar", "View and appeal"), onA: () => ir("/cuenta/moderacion") });
  B.push({ type: "hero", name: nombre, nick: nick ?? undefined, photo: c.foto ?? undefined, ini: yo.ini, city: `${city}, PA`.toUpperCase(), badge: yo.badge, onMe: () => ir("/cuenta/perfil"),
    cells: [{ label: E2("RANGO", "RANK"), value: com ? `${com.rango} · ${es ? com.nombre.es : com.nombre.en}` : E2("Únete", "Join"), color: "var(--tl-white)", onClick: () => ir(com ? "/comunidad/rango" : "/comunidad") },
      { label: E2("MONEDAS", "COINS"), value: com ? com.monedas.toLocaleString("en-US") : "0", color: "var(--tl-pro)", onClick: () => ir(com ? "/comunidad/monedas" : "/comunidad") },
      { label: E2("RESEÑAS", "REVIEWS"), value: String(c.resenas), color: "var(--tl-signal)", onClick: () => ir("/cuenta/resenas") }] });
  // Completa tu cuenta (lo que ya se puede completar).
  const cp: [string, boolean, string | null][] = [[E2("Teléfono verificado", "Phone verified"), true, null], [E2("Tu nombre", "Your name"), !!nombre, "/cuenta/perfil"], [E2("Tu foto", "Your photo"), !!c.foto, "/cuenta/perfil"], [E2("Correo para tus recibos", "Email for receipts"), !!c.email, "/cuenta/perfil"]];
  const hechos = cp.filter((x) => x[1]).length;
  if (hechos < cp.length) B.push({ type: "prog", k: E2("COMPLETA TU CUENTA", "COMPLETE YOUR ACCOUNT"), al: E2("Agregar", "Add"), t: E2(`Te faltan ${cp.length - hechos} cosas para que los vecinos y negocios te conozcan.`, `${cp.length - hechos} things left so neighbors and businesses know you.`),
    items: cp.map(([label, done, href]) => ({ label, done, onClick: !done && href ? () => ir(href) : undefined })) });
  // Tu semana.
  B.push({ type: "sec", t: E2("Tu semana", "Your week"), s: E2("PEDIDOS, RESERVAS Y ENTREVISTAS EN ORDEN", "ORDERS, BOOKINGS AND INTERVIEWS IN ORDER"), a: r.agenda.some((x) => x.kind === "mesa") ? E2("Ver reservas", "See bookings") : undefined, onA: () => ir("/cuenta/citas") });
  B.push(r.agenda.length ? { type: "agenda", items: r.agenda.slice(0, 6).map((x) => {
    if (x.kind === "ped") { const tg = tagPed(x.st as never, "pickup", es); return { day: E2("HOY", "TODAY"), today: true, time: E2("AHORA", "NOW"), title: `${x.t}${E2(" · tu pedido", " · your order")}`, meta: E2("SIGUE EL ESTADO EN VIVO", "TRACK IT LIVE"), tag: tg[0], tone: tg[1], dot: "var(--tl-action)", onClick: () => ir(x.href) }; }
    if (x.kind === "iv") return { day: diaRel(x.dia, x.at, x.tz, es), today: x.dia === 0, time: horaDe(x.at, x.tz, es), title: `${x.t}${E2(" · entrevista", " · interview")}`, meta: x.st === "ok" ? E2("CONFIRMADA", "CONFIRMED") : E2("CONFÍRMALA EN TU SOLICITUD", "CONFIRM IT IN YOUR APPLICATION"), tag: E2("ENTREVISTA", "INTERVIEW"), tone: "signal", dot: x.st === "ok" ? "var(--tl-open)" : "var(--tl-pro)", onClick: () => ir(x.href) };
    const tg = tagMesa(x.st as never, es);
    return { day: diaRel(x.dia, x.at, x.tz, es), today: x.dia === 0, time: horaDe(x.at, x.tz, es), title: `${x.t}${E2(` · mesa para ${x.extra}`, ` · table for ${x.extra}`)}`, meta: x.st === "pend" ? E2("SOLICITUD ENVIADA · ESPERANDO RESPUESTA", "REQUEST SENT · WAITING FOR A REPLY") : x.st === "alt" ? E2("TE PROPONEN OTRA HORA", "THEY PROPOSE ANOTHER TIME") : "",
      tag: tg[0], tone: tg[1], dot: x.st === "pend" || x.st === "alt" ? "var(--tl-pro)" : "var(--tl-open)", onClick: () => ir(x.href) };
  }) } : { type: "empty", ic: "calendar", t: E2("Tu semana está libre", "Your week is free"), s: E2("Cuando pidas o reserves, lo ves aquí en orden.", "When you order or book, it shows here in order."), cta: E2("Explorar negocios", "Explore businesses"), onCta: () => ir("/negocios") });
  // Pendiente de ti.
  const pend: Fila[] = r.pend.map((p) => p.kind === "msg" ? { ic: "chat", ibg: "rgba(75,55,245,.1)", t: E2(`${p.t} te escribió`, `${p.t} wrote to you`), x: p.extra ? `“${p.extra}”` : undefined, tag: [E2("NUEVO", "NEW"), "action"] as [string, string], chev: true, on: () => ir(p.href) }
    : p.kind === "alt" ? { ic: "clock", ibg: "rgba(75,55,245,.1)", t: E2(`${p.t} te propone otra hora`, `${p.t} proposes another time`), s: E2("RESERVACIÓN · ÁBRELA PARA DECIDIR", "BOOKING · OPEN IT TO DECIDE"), chev: true, on: () => ir(p.href) }
    : p.kind === "iv" ? { ic: "calendar", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: E2(`${p.t} te invita a una entrevista`, `${p.t} invites you to an interview`), s: `${p.extra ?? ""} · ${diaRel(99, p.at, p.tz, es)} · ${horaDe(p.at, p.tz, es)}`.toUpperCase(), x: E2("Confírmala o llama si necesitas otra hora.", "Confirm it or call if you need another time."), chev: true, on: () => ir(p.href) }
    : p.kind === "esp" ? { ic: "clock", ibg: "rgba(255,176,32,.16)", ifg: "var(--tl-pro-ink)", t: E2(`${p.t} todavía no responde`, `${p.t} has not replied yet`), s: `${diaRel(99, p.at, p.tz, es)} · ${horaDe(p.at, p.tz, es)} · ${E2(`MESA PARA ${p.extra}`, `TABLE FOR ${p.extra}`)}`.toUpperCase(), x: E2("Solicitud enviada · esperando respuesta", "Request sent · waiting for a reply"), chev: true, on: () => ir(p.href) }
    : { ic: "star", ibg: "rgba(255,176,32,.16)", ifg: "var(--tl-pro-ink)", t: E2(`¿Cómo te fue en ${p.t}?`, `How was ${p.t}?`), s: (p.extra === "table" ? E2("TU RESERVACIÓN", "YOUR BOOKING") : E2("TU PEDIDO", "YOUR ORDER")), acts: [[E2("Escribir reseña", "Write review"), "primary", () => ir(p.href)]] });
  if (pend.length) B.push({ type: "sec", t: E2("Pendiente de ti", "Waiting on you"), s: `${pend.length}${pend.length === 1 ? E2(" COSA", " THING") : E2(" COSAS", " THINGS")}` }, { type: "rows", rows: pend });
  // Accesos (teléfono).
  B.push({ type: "tel", b: [{ type: "tiles", cols: "repeat(3,minmax(0,1fr))", tiles: [
    { l: E2("Pedidos", "Orders"), ic: "bag", n: c.curso, on: () => ir("/cuenta/pedidos") }, { l: E2("Reservas", "Bookings"), ic: "calendar", n: c.proximas, on: () => ir("/cuenta/citas") },
    { l: E2("Boletos", "Tickets"), ic: "ticket", on: () => ir("/cuenta/boletos") }, { l: E2("Guardados", "Saved"), ic: "heart", on: () => ir("/cuenta/guardados") },
    { l: E2("Reseñas", "Reviews"), ic: "star", on: () => ir("/cuenta/resenas") }, { l: E2("Empleos", "Jobs"), ic: "brief", n: c.solicitudes, on: () => ir("/cuenta/empleos") },
    { l: E2("Direcciones", "Addresses"), ic: "home", on: () => ir("/cuenta/direcciones") },
  ] }] });
  const m = r.mes;
  B.push({ type: "stats", k: E2("TU APOYO AL BARRIO · ESTE MES", "YOUR LOCAL SUPPORT · THIS MONTH"),
    t: m.gasto ? E2(`Dejaste ${money(m.gasto)} en ${m.negocios} ${m.negocios === 1 ? "negocio latino" : "negocios latinos"}.`, `You spent ${money(m.gasto)} at ${m.negocios} Latino ${m.negocios === 1 ? "business" : "businesses"}.`) : E2("Este mes todavía no pides ni reservas.", "No orders or bookings yet this month."),
    cells: [{ v: String(m.pedidos), l: E2("PEDIDOS", "ORDERS") }, { v: String(m.reservas), l: E2("RESERVAS", "BOOKINGS") }, { v: String(m.resenas), l: E2("RESEÑAS", "REVIEWS") }] });
  B.push({ type: "tel", b: [{ type: "sec", t: E2("Tu cuenta", "Your account") }, { type: "rows", rows: [
    { ic: "users", t: E2("Perfil", "Profile"), s: E2("NOMBRE, FOTO, CORREO", "NAME, PHOTO, EMAIL"), chev: true, on: () => ir("/cuenta/perfil") },
    { ic: "home", t: E2("Direcciones", "Addresses"), s: `${dirs}${E2(" GUARDADAS", " SAVED")}`, chev: true, on: () => ir("/cuenta/direcciones") },
    { ic: "insurance", t: E2("Mis seguros", "My insurance"), s: E2("PARA SABER SI LO ACEPTAN Y CUÁNTO PAGAS", "TO KNOW IF IT IS TAKEN AND WHAT YOU PAY"), chev: true, on: () => ir("/cuenta/seguros") },
    { ic: "bell", t: E2("Avisos", "Notifications"), s: E2("QUÉ TE LLEGA Y CUÁNDO", "WHAT YOU GET AND WHEN"), chev: true, on: () => ir("/cuenta/avisos") },
    { ic: "shield", t: E2("Ajustes", "Settings"), s: E2("IDIOMA · MI CIUDAD · PRIVACIDAD", "LANGUAGE · MY CITY · PRIVACY"), chev: true, on: () => ir("/cuenta/ajustes") },
    { ic: "share", t: E2("Invita vecinos", "Invite neighbors"), s: E2("TU ENLACE PARA INVITAR", "YOUR INVITE LINK"), chev: true, on: () => ir("/cuenta/invitar") },
  ] }, { type: "rows", rows: [
    negocio ? { ic: "store", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: negocio.name, s: E2("TU NEGOCIO · ABRIR MI PANEL", "YOUR BUSINESS · OPEN MY DASHBOARD"), chev: true, on: () => ir(`/panel/${negocio.id}/hoy`) }
      : { ic: "store", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: E2("Publica tu negocio", "List your business"), s: E2("PRO 30 DÍAS GRATIS · SIN TARJETA", "PRO FREE FOR 30 DAYS · NO CARD"), chev: true, on: () => ir("/publica") },
    { ic: "close", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Cerrar sesión", "Sign out"), on: () => ui.setHoja({ title: E2("¿Cerrar sesión?", "Sign out?"), sub: E2("Para volver a entrar te pedimos tu teléfono.", "To sign back in we ask for your phone."), yes: E2("Cerrar sesión", "Sign out"), onYes: salir }) },
  ] }] });
  return <Marco es={es} code="USR-HOME" home t={E2("Mi cuenta", "My account")} s={`${city}, PA${E2(" · MI CIUDAD", " · MY CITY")}`.toUpperCase()} blocks={B} yo={yo} ui={ui}
    act={{ l: E2("Mi perfil", "My profile"), ic: "users", on: () => ir("/cuenta/perfil") }}
    rcards={[{ label: "Mi cuenta · invita", k: E2("INVITA VECINOS", "INVITE NEIGHBORS"), t: E2("Tu enlace para invitar", "Your invite link"), s: E2("Comparte To’Latino con tus vecinos de " + city + ".", "Share To’Latino with your neighbors in " + city + "."), cta: E2("Invitar", "Invite"), onCta: () => ir("/cuenta/invitar") }]} />;
}
