import "server-only";
import { db } from "../db";
import { pedidoDe } from "../pedir";
import { BASE_URL, encolar } from "./index";
import { marco, type Fila } from "./plantillas";

/* Recibos por correo (Mi cuenta › Avisos › «Recibos», encendido por defecto). Solo a un correo confirmado. Uno por pedido,
   por reservación confirmada y por cobro de Pro (idem_key): repetir la acción no manda otro. Nunca rompe el flujo que lo
   llama (los errores se tragan; el correo queda en la bandeja). */
type Dest = { id: string; email: string; lang: string; city: string | null; nombre: string };
async function destino(userId: string): Promise<Dest | null> {
  const u = (await db().query<Dest & { verif: boolean; recibos: boolean }>(
    `select id::text, email::text as email, coalesce(lang, 'es') as lang, home_city_id as city, coalesce(nullif(trim(first_name), ''), '') as nombre,
            coalesce(email_verified, false) as verif, coalesce((notif_prefs ->> 'mailR')::boolean, true) as recibos
       from users where id = $1 and status not in ('deleted', 'merged')`, [userId])).rows[0];
  return u?.email && u.verif && u.recibos ? u : null;
}

export async function reciboPedido(opId: string) {
  try {
    const o = (await db().query<{ user: string; num: string }>(`select user_id::text as user, number as num from operations where id = $1::bigint and kind = 'order' and status = 'done'`, [opId])).rows[0];
    if (!o) return;
    const u = await destino(o.user);
    if (!u) return;
    const es = u.lang !== "en", p = await pedidoDe(o.user, o.num, es ? "es" : "en");
    if (!p) return;
    const filas: Fila[] = [...p.lineas.map((l): Fila => [`${l.q} × ${l.name}${l.sum ? ` · ${l.sum}` : ""}`, l.price]), ["Subtotal", p.sub], [p.taxL, p.tax]];
    if (p.envio) filas.push([es ? "Envío" : "Delivery", p.envio]);
    if (p.propina) filas.push([es ? "Propina" : "Tip", p.propina]);
    filas.push(["Total", p.total, true]);
    if (p.pago?.devuelto) filas.push([es ? "Devuelto" : "Refunded", p.pago.devuelto]);
    const pago = p.pago?.tarjeta ? (es ? `Pagado con ${p.pago.tarjeta}.` : `Paid with ${p.pago.tarjeta}.`) : es ? "Pagado en el local o al recibir." : "Paid at the store or on delivery.";
    const donde = p.negocio.direccion ? ` (${p.negocio.direccion})` : "";
    const { html, text } = marco({ es, pre: es ? `Tu pedido #${p.numero} en ${p.negocio.nombre}` : `Your order #${p.numero} at ${p.negocio.nombre}`,
      titulo: es ? `Recibo · pedido #${p.numero}` : `Receipt · order #${p.numero}`,
      intro: es ? `${u.nombre ? `${u.nombre}, gracias` : "Gracias"} por pedir en ${p.negocio.nombre}${donde}.` : `${u.nombre ? `${u.nombre}, thanks` : "Thanks"} for ordering at ${p.negocio.nombre}${donde}.`,
      filas, nota: pago, cta: { l: es ? "Ver mi pedido" : "See my order", href: `${BASE_URL()}/pedido/${encodeURIComponent(p.numero)}` } });
    await encolar({ userId: u.id, city: u.city, to: u.email, tpl: "receipt_order", subject: es ? `Recibo de tu pedido #${p.numero} · ${p.negocio.nombre}` : `Receipt for order #${p.numero} · ${p.negocio.nombre}`, html, text, ref: ["operation", opId], idem: `rcpt-ord-${opId}` });
  } catch { /* el recibo nunca rompe el pedido */ }
}

export async function reciboMesa(numero: string) {
  try {
    const o = (await db().query<{ id: string; user: string; negocio: string; dir: string | null; at: string; tz: string; hora: string; n: number }>(
      `select o.id::text, o.user_id::text as user, b.name as negocio, b.address as dir, o.party_size as n,
              to_char(o.scheduled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, c.timezone as tz,
              to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora
         from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'table' and o.status = 'confirmed'`, [numero])).rows[0];
    if (!o) return;
    const u = await destino(o.user);
    if (!u) return;
    const es = u.lang !== "en", dia = new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: o.tz, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(o.at)).replace(/\./g, "");
    const { html, text } = marco({ es, pre: es ? `Mesa confirmada en ${o.negocio}` : `Table confirmed at ${o.negocio}`, titulo: es ? "Tu mesa está confirmada" : "Your table is confirmed",
      intro: es ? `${o.negocio} te espera.` : `${o.negocio} is expecting you.`,
      filas: [[es ? "Reservación" : "Reservation", numero], [es ? "Día" : "Date", dia], [es ? "Hora" : "Time", o.hora], [es ? "Personas" : "Guests", String(o.n)], ...(o.dir ? [[es ? "Dirección" : "Address", o.dir] as Fila] : [])],
      nota: es ? "Si no puedes llegar, cancela desde la reservación: así la mesa queda para otra persona." : "If you cannot make it, cancel from the booking so someone else can have the table.",
      cta: { l: es ? "Ver mi reservación" : "See my booking", href: `${BASE_URL()}/reserva/${encodeURIComponent(numero)}` } });
    await encolar({ userId: u.id, city: u.city, to: u.email, tpl: "receipt_table", subject: es ? `Mesa confirmada · ${o.negocio}` : `Table confirmed · ${o.negocio}`, html, text, ref: ["operation", o.id], idem: `rcpt-tbl-${o.id}-${o.at}` });
  } catch { /* nunca rompe la reservación */ }
}

export async function reciboPro(negocio: string, userId: string, centavos: number, hasta: string, tarjeta: string, idem: string) {
  try {
    const u = await destino(userId);
    if (!u) return;
    const es = u.lang !== "en", b = (await db().query<{ name: string }>(`select name from businesses where id = $1`, [negocio])).rows[0]?.name ?? "";
    const money = `$${(centavos / 100).toFixed(2)}`, fin = new Date(hasta).toLocaleDateString(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" });
    const { html, text } = marco({ es, pre: es ? `Recibo de Pro · ${b}` : `Pro receipt · ${b}`, titulo: es ? "Recibo de To’Latino Pro" : "To’Latino Pro receipt",
      intro: es ? `Cobramos Pro de ${b}.` : `We charged Pro for ${b}.`,
      filas: [["Plan", "Pro"], [es ? "Hasta" : "Until", fin], [es ? "Tarjeta" : "Card", tarjeta], ["Total", money, true]],
      cta: { l: es ? "Ver mi plan" : "See my plan", href: `${BASE_URL()}/panel/${negocio}/cobros/plan` } });
    await encolar({ userId: u.id, city: u.city, to: u.email, tpl: "receipt_pro", subject: es ? `Recibo de Pro · ${b}` : `Pro receipt · ${b}`, html, text, ref: ["business", negocio], idem: `rcpt-${idem}` });
  } catch { /* nunca rompe el cobro */ }
}

/* 6c · Recibo de boletos: la orden B-…, lo comprado, «Cargos de servicio · Incluidos», la tarjeta y el enlace a los boletos. Uno por orden.
   9l · armarReciboBoletos() lo arma (también lo usan las pruebas para mirar los botones de Wallet sin mandar otro) y reciboBoletos() lo encola, una vez. */
export async function reciboBoletos(opId: string) {
  try {
    const r = await armarReciboBoletos(opId);
    if (r) await encolar({ userId: r.u.id, city: r.u.city, to: r.u.email, tpl: "receipt_tickets", subject: r.subject, html: r.html, text: r.text, ref: ["operation", opId], idem: `rcpt-bol-${opId}` });
  } catch { /* el recibo nunca rompe la compra */ }
}
export async function armarReciboBoletos(opId: string): Promise<{ u: Dest; subject: string; html: string; text: string } | null> {
  {
    const o = (await db().query<{ user: string; num: string; title: { es: string; en: string }; venue: string; dia: string; total: number; desc: number; brand: string | null; l4: string | null;
      l: { name: { es: string; en: string }; qty: number; tot: number }[] }>(
      `select o.user_id::text as user, o.number as num, o.details->'title' as title, o.details->>'venue' as venue, o.details->>'local_date' as dia, o.total_cents as total, o.discount_cents as desc,
              p.card_brand as brand, p.card_last4 as l4,
              (select coalesce(json_agg(json_build_object('name', l.name, 'qty', l.qty, 'tot', l.line_total_cents) order by l.id), '[]') from operation_lines l where l.operation_id = o.id) as l
         from operations o join payments p on p.operation_id = o.id and p.kind = 'full' where o.id = $1::bigint and o.kind = 'tickets' and p.status = 'captured'`, [opId])).rows[0];
    if (!o) return null;
    const u = await destino(o.user);
    if (!u) return null;
    const es = u.lang !== "en", m = (c: number) => `$${(c / 100).toFixed(2)}`, t = es ? o.title.es : o.title.en || o.title.es;
    const filas: Fila[] = [...o.l.map((l): Fila => [`${l.qty} × ${es ? l.name.es : l.name.en || l.name.es}`, m(l.tot)])];
    if (o.desc) filas.push([es ? "Código de descuento" : "Discount code", `−${m(o.desc)}`]);
    filas.push([es ? "Cargos de servicio" : "Service fees", es ? "Incluidos" : "Included"], ["Total", m(o.total), true]);
    const pago = o.brand && o.l4 ? (es ? `Pagado con ${o.brand.toUpperCase()} ·· ${o.l4}. ` : `Paid with ${o.brand.toUpperCase()} ·· ${o.l4}. `) : "";
    // 9l · Los botones de Wallet (L1297): a la página del boleto (el primero que esta persona tiene en la orden), donde el pase se agrega con la sesión. Solo
    // si Wallet está disponible para ese boleto (interruptor, llaves y boleto vivo: lib/pases/pases.ts disponible()).
    const bol = (await db().query<{ code: string }>(`select code from tickets where operation_id = $1::bigint and holder_user_id = $2::uuid order by id limit 1`, [opId, o.user])).rows[0]?.code ?? null;
    const w = bol ? await (await import("../pases/pases")).disponible(o.user, bol).catch(() => ({ apple: false, google: false })) : { apple: false, google: false };
    const pag = bol ? `${BASE_URL()}/cuenta/boletos/${encodeURIComponent(bol)}` : null;
    const wallet = pag && (w.apple || w.google) ? { apple: w.apple ? { href: pag, l: es ? "Agregar a Apple Wallet" : "Add to Apple Wallet" } : null, google: w.google ? { href: pag, l: es ? "Agregar a Google Wallet" : "Add to Google Wallet" } : null } : undefined;
    const { html, text } = marco({ es, pre: es ? `Tus boletos para ${t}` : `Your tickets for ${t}`, titulo: es ? `Recibo · orden ${o.num}` : `Receipt · order ${o.num}`,
      intro: es ? `¡Listo, vas! ${t} · ${o.venue} · ${o.dia}.` : `You are going! ${t} · ${o.venue} · ${o.dia}.`,
      filas, nota: pago + (es ? "El precio que pagaste ya incluye los cargos: nada más en la puerta. Tu QR está en Mi cuenta › Boletos." : "The price you paid already includes fees: nothing extra at the door. Your QR is in My account › Tickets."),
      cta: { l: es ? "Ver mis boletos" : "See my tickets", href: `${BASE_URL()}/eventos/orden/${encodeURIComponent(o.num)}` }, wallet });
    return { u, subject: es ? `Tus boletos · ${t} · orden ${o.num}` : `Your tickets · ${t} · order ${o.num}`, html, text };
  }
}
