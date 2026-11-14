import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { pasarela } from "./pagos/pasarela";

/* Disputas con el banco (contracargos) · bloque 2r. Llegan por el webhook de Stripe (charge.dispute.created / updated /
   closed) o del simulador en el sandbox. Cada una abre un caso en la cola «Disputas con el banco» (plazo = el del banco)
   y avisa al dueño. To'Latino responde con la evidencia que ya tiene del pedido (línea de tiempo, lo que se pidió, la
   entrega, los mensajes) o acepta la devolución. Estados: needs_response → under_review → won | lost | accepted. */
type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const MOTIVO: Record<string, Bi> = {
  fraudulent: { es: "Dice que no hizo la compra", en: "Says they did not make the purchase" },
  product_not_received: { es: "Dice que no recibió el pedido", en: "Says the order never arrived" },
  product_unacceptable: { es: "Dice que el pedido llegó mal", en: "Says the order was not as described" },
  duplicate: { es: "Dice que le cobraron dos veces", en: "Says they were charged twice" },
  credit_not_processed: { es: "Dice que no le devolvieron", en: "Says a refund was not processed" },
  subscription_canceled: { es: "Dice que canceló", en: "Says they cancelled" },
  general: { es: "Otro motivo del banco", en: "Other bank reason" },
};
const ESTADO_STRIPE: Record<string, string> = { warning_needs_response: "needs_response", needs_response: "needs_response", warning_under_review: "under_review", under_review: "under_review", won: "won", lost: "lost", warning_closed: "lost", charge_refunded: "accepted" };

async function abrirCaso(c: PoolClient, disputa: string, negocio: string | null, ciudad: string | null) {
  await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ('disputa', 'dispute', $1, $2, $3, 'alta')
                 on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [disputa, negocio, ciudad]);
}

/* Registra (o pone al día) una disputa. Idempotente por el id de Stripe. */
export async function registrarDisputa(x: { stripeId: string; pi: string; amount: number; reason: string; dueBy: string | null; status?: string; simulated?: boolean }) {
  const r = await tx(async (c) => {
    const p = (await c.query<{ id: string; op: string; biz: string; city: string | null }>(
      `select id::text, operation_id::text as op, business_id as biz, city_id as city from payments where stripe_payment_intent = $1`, [x.pi])).rows[0];
    const st = ESTADO_STRIPE[x.status ?? "needs_response"] ?? "needs_response";
    const d = (await c.query<{ id: string; nuevo: boolean }>(
      `insert into disputes (stripe_dispute_id, payment_id, operation_id, business_id, city_id, amount_cents, reason, status, evidence_due_by, simulated)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (stripe_dispute_id) do update set status = case when disputes.status in ('won', 'lost', 'accepted') then disputes.status else excluded.status end, updated_at = now()
       returning id::text, (xmax = 0) as nuevo`,
      [x.stripeId, p?.id ?? null, p?.op ?? null, p?.biz ?? null, p?.city ?? null, Math.max(0, Math.round(x.amount)), MOTIVO[x.reason] ? x.reason : "general", st, x.dueBy, !!x.simulated])).rows[0]!;
    if (d.nuevo) {
      if (p) await c.query(`update payments set failure_code = 'dispute', updated_at = now() where id = $1::bigint`, [p.id]);
      await abrirCaso(c, d.id, p?.biz ?? null, p?.city ?? null);
      await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('system', null, 'pago.disputa', 'dispute', $1, $2, $3::jsonb)`,
        [d.id, p?.city ?? null, JSON.stringify({ monto: money(x.amount), motivo: (MOTIVO[x.reason] ?? MOTIVO.general!).es })]);
    }
    return { ...d, biz: p?.biz ?? null, op: p?.op ?? null };
  });
  if (r.nuevo && r.biz && r.op) {
    const num = (await db().query<{ n: string }>(`select number as n from operations where id = $1::bigint`, [r.op])).rows[0]?.n ?? "";
    await (await import("./avisos")).avisarNegocio(r.biz, "biz_dispute", { num, monto: money(x.amount) }, { href: `/panel/${r.biz}/cobros` }).catch(() => undefined);
  }
  return r;
}

/* Resultado del banco (webhook charge.dispute.closed, o el simulador): ganada o perdida. Avisa al dueño. */
export async function cerrarDisputa(stripeId: string, status: string) {
  const st = ESTADO_STRIPE[status] ?? status;
  if (!["won", "lost", "accepted", "under_review", "needs_response"].includes(st)) return;
  const d = (await db().query<{ id: string; biz: string | null; op: string | null; antes: string }>(
    `update disputes d set status = $2, closed_at = case when $2 in ('won', 'lost', 'accepted') then coalesce(d.closed_at, now()) else d.closed_at end, updated_at = now()
      from (select id, status as antes from disputes where stripe_dispute_id = $1) x where d.id = x.id and d.status <> $2 and x.antes not in ('won', 'lost', 'accepted')
      returning d.id::text, d.business_id as biz, d.operation_id::text as op, x.antes`, [stripeId, st])).rows[0];
  if (!d) return;
  if (st === "lost") await db().query(`update payments set failure_code = 'dispute_lost', updated_at = now() where id = (select payment_id from disputes where id = $1::bigint)`, [d.id]);
  if (st === "won") await db().query(`update payments set failure_code = 'dispute_won', updated_at = now() where id = (select payment_id from disputes where id = $1::bigint)`, [d.id]);
  if (["won", "lost"].includes(st) && d.biz && d.op) {
    const num = (await db().query<{ n: string }>(`select number as n from operations where id = $1::bigint`, [d.op])).rows[0]?.n ?? "";
    await (await import("./avisos")).avisarNegocio(d.biz, "biz_dispute_end", { num, resultado: st === "won" ? "el banco nos dio la razón, el dinero se queda" : "el banco le dio la razón al cliente" }, { href: `/panel/${d.biz}/cobros` }).catch(() => undefined);
  }
}

/* La evidencia que ya tenemos del pedido (diseño «EVIDENCIA QUE TENEMOS»). */
export type Evidencia = { lineas: string[]; resumen: string; producto: string; cliente: string; fecha: string; envio: string | null };
export async function evidenciaDe(disputa: string): Promise<Evidencia | null> {
  const o = (await db().query<{ op: string; num: string; mode: string; total: number; cliente: string; negocio: string; enviado: string; dir: string | null; tz: string; tarjeta: string | null; devuelto: number }>(
    `select o.id::text as op, o.number as num, case when o.kind = 'tickets' then 'tickets_evt' else o.mode end as mode, o.total_cents as total, b.name as negocio,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Cliente') as cliente,
            to_char(coalesce(o.sent_at, o.confirmed_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as enviado, c.timezone as tz,
            case when o.mode = 'delivery' then concat_ws(', ', o.details #>> '{to,street}', o.details #>> '{to,zip}') end as dir,
            case when p.card_last4 is null then null else upper(p.card_brand) || ' ·· ' || p.card_last4 end as tarjeta, coalesce(p.refunded_cents, 0) as devuelto
       from disputes d join operations o on o.id = d.operation_id join businesses b on b.id = o.business_id join users u on u.id = o.user_id
       join cities c on c.id = o.city_id left join payments p on p.id = d.payment_id where d.id = $1::bigint`, [disputa])).rows[0];
  if (!o) return null;
  const hora = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: o.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  // 9n · La prueba de la entrega (foto privada o el código del cliente), con su hora: va en la constancia.
  const PE = (await db().query<{ kind: string; at: string }>(`select kind, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from delivery_proofs where operation_id = (select operation_id from disputes where id = $1::bigint) order by at`, [disputa]).catch(() => ({ rows: [] as { kind: string; at: string }[] }))).rows;
  const [L, E, M] = await Promise.all([
    db().query<{ q: number; n: string }>(`select qty as q, coalesce(name ->> 'es', name::text, '') as n from operation_lines where operation_id = $1::bigint order by id`, [o.op]).catch(() => ({ rows: [] as { q: number; n: string }[] })),
    db().query<{ kind: string; at: string }>(`select kind, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from operation_events where operation_id = $1::bigint order by id`, [o.op]).catch(() => ({ rows: [] as { kind: string; at: string }[] })),
    db().query<{ n: number }>(`select count(*)::int as n from chat_messages m join chat_threads t on t.id = m.thread_id where t.operation_id = $1::bigint`, [o.op]).catch(() => ({ rows: [{ n: 0 }] })),
  ]);
  const EV: Record<string, string> = { sent: "El cliente hizo el pedido", accepted: "El negocio lo aceptó", ready: "Listo para recoger", on_the_way: "Salió en camino", driver_picked: "El repartidor lo recogió",
    driver_arrived: "El repartidor llegó", delivered: "Entregado", picked_up: "El cliente lo recogió", cancelled: "Cancelado", declined: "Rechazado" };
  // 6e · Boletos (DP-121): la evidencia sale del boleto: para qué evento y fecha, cada boleto con su estado y si entró por la puerta (la hora
  // y la puerta del escaneo llegan con 6g; hoy, «usado»), transferencias y lo ya devuelto. Nunca el teléfono de nadie.
  if (o.mode === "tickets_evt") {
    const T = (await db().query<{ code: string; st: string; at: string | null }>(
      `select t.code, t.status as st, (select to_char(l.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from ticket_log l where l.ticket_id = t.id and l.kind in ('transferido', 'devuelto', 'cancelado', 'anulado') order by l.at desc limit 1) as at
         from tickets t where t.operation_id = $1::bigint order by t.id`, [o.op])).rows;
    const ev = (await db().query<{ t: string; dia: string; venue: string }>(
      `select e.title->>'es' as t, d.local_date::text as dia, case when e.venue_mode = 'other' then e.venue_name else b.name end as venue from operations x join event_dates d on d.id = (x.details->>'event_date_id')::bigint
         join events e on e.id = d.event_id join businesses b on b.id = e.business_id where x.id = $1::bigint`, [o.op])).rows[0];
    const ST: Record<string, string> = { valid: "válido, sin usar", used: "usado en la puerta (entró)", refunded: "devuelto", void: "anulado", replaced: "transferido a otra persona" };
    const lineasB = [
      `Orden de boletos ${o.num} · ${money(o.total)}${o.tarjeta ? ` · ${o.tarjeta}` : ""}${ev ? ` · ${ev.t} · ${ev.dia} · ${ev.venue}` : ""}`,
      `Comprada por ${o.cliente} desde su cuenta (teléfono verificado) el ${hora(o.enviado)}`,
      ...T.map((t) => `Boleto ${t.code}: ${ST[t.st] ?? t.st}${t.at ? ` · ${hora(t.at)}` : ""}`),
      ...(o.devuelto ? [`Ya se devolvió ${money(o.devuelto)}`] : []),
      "Los boletos se entregan en la app (QR firmado); la política de devoluciones se muestra antes de pagar.",
    ];
    return { lineas: lineasB, resumen: lineasB.join("\n"), producto: `Boletos ${o.num}${ev ? ` · ${ev.t}` : ""}`, cliente: o.cliente, fecha: (ev?.dia ?? o.enviado.slice(0, 10)), envio: null };
  }
  const lineas = [
    `Pedido #${o.num} en ${o.negocio} · ${money(o.total)}${o.tarjeta ? ` · ${o.tarjeta}` : ""}`,
    ...(L.rows.length ? [`Lo que pidió: ${L.rows.map((x) => `${x.q} × ${x.n}`).join(", ")}`] : []),
    `Hecho por ${o.cliente} desde su cuenta (teléfono verificado) el ${hora(o.enviado)}`,
    ...E.rows.filter((x) => EV[x.kind]).map((x) => `${EV[x.kind]} · ${hora(x.at)}`),
    ...(o.dir ? [`Entrega en ${o.dir}`] : []),
    ...PE.map((p) => `${p.kind === "foto" ? "Prueba de entrega: foto tomada por el repartidor en la entrega (adjunta)" : p.kind === "codigo" ? "Prueba de entrega: el cliente le dio su código de 4 cifras al repartidor" : "Entrega marcada por el negocio"} · ${hora(p.at)}`),
    ...(M.rows[0]?.n ? [`${M.rows[0].n} mensajes entre el cliente y el negocio`] : []),
    ...(o.devuelto ? [`Ya se devolvió ${money(o.devuelto)}`] : []),
  ];
  return { lineas, resumen: lineas.join("\n"), producto: L.rows.map((x) => `${x.q} x ${x.n}`).join(", ") || `Pedido #${o.num}`, cliente: o.cliente, fecha: o.enviado.slice(0, 10), envio: o.dir };
}

/* 9k · Los archivos de la evidencia (L357, L393): el recibo en PDF, la conversación con el cliente (sin teléfonos) y la constancia de entrega (la línea
   de tiempo y la dirección). La foto de la entrega se suma cuando el Repartidor la tome (no existe todavía: LAUNCH). Cada archivo queda en
   dispute_evidence (sha256, bytes) y, si el almacén está, en el privado (privado/disputas/…; nunca por /medios). Idempotente por su sha256. */
type Archivo = { kind: "recibo" | "conversacion" | "entrega" | "foto_entrega"; cuerpo: Buffer; nombre: string; mime?: "application/pdf" | "image/jpeg" };
const TEL = /\+?1?\s*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g;
export async function archivosEvidencia(disputa: string): Promise<Archivo[]> {
  const e = await evidenciaDe(disputa);
  if (!e) return [];
  const { pdfTexto } = await import("./pdf-simple");
  const o = (await db().query<{ op: string; num: string; total: number; sub: number; tax: number; env: number; tip: number; negocio: string; dir: string | null }>(
    `select o.id::text as op, o.number as num, o.total_cents as total, coalesce(o.subtotal_cents, 0) as sub, coalesce(o.tax_cents, 0) as tax, coalesce(o.delivery_cents, 0) as env, coalesce(o.tip_cents, 0) as tip,
            b.name as negocio, b.address as dir
       from disputes d join operations o on o.id = d.operation_id join businesses b on b.id = o.business_id where d.id = $1::bigint`, [disputa])).rows[0];
  if (!o) return [];
  const L = (await db().query<{ q: number; n: string; t: number }>(`select qty as q, coalesce(name ->> 'es', name::text, '') as n, line_total_cents as t from operation_lines where operation_id = $1::bigint order by id`, [o.op]).catch(() => ({ rows: [] as { q: number; n: string; t: number }[] }))).rows;
  const M = (await db().query<{ quien: string; t: string; at: string }>(
    `select case when m.sender = 'user' then 'Cliente' when m.compa then 'Asistente del negocio' else 'Negocio' end as quien, coalesce(m.body, '') as t,
            to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI "UTC"') as at
       from chat_messages m join chat_threads t on t.id = m.thread_id where t.operation_id = $1::bigint and m.hidden_at is null order by m.id limit 400`, [o.op]).catch(() => ({ rows: [] as { quien: string; t: string; at: string }[] }))).rows;
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  const recibo = pdfTexto(`Receipt / Recibo · ${o.negocio} · #${o.num}`, [
    `Customer / Cliente: ${e.cliente}`, `Date / Fecha: ${e.fecha}`, "",
    ...(L.length ? L.map((x) => `${x.q} x ${x.n}  ${usd(x.t)}`) : [e.producto]), "",
    `Subtotal: ${usd(o.sub)}`, ...(o.tax ? [`Tax / Impuesto: ${usd(o.tax)}`] : []), ...(o.env ? [`Delivery / Envío: ${usd(o.env)}`] : []), ...(o.tip ? [`Tip / Propina: ${usd(o.tip)}`] : []),
    `Total: ${usd(o.total)}`, "", `${o.negocio}${o.dir ? ` · ${o.dir}` : ""}`, "Paid through To'Latino (card processed by Stripe).",
  ]);
  const conversacion = pdfTexto(`Customer communication / Conversación · #${o.num}`, M.length ? M.map((m) => `[${m.at}] ${m.quien}: ${m.t.replace(TEL, "[teléfono]")}`)
    : ["No messages between the customer and the business for this order. / Sin mensajes entre el cliente y el negocio en este pedido."]);
  const entrega = pdfTexto(`Delivery and timeline / Entrega y línea de tiempo · #${o.num}`, [...e.lineas, ...(e.envio ? ["", `Delivered to / Entregado en: ${e.envio}`] : [])]);
  // 9n · La foto de la entrega (L1690): la misma imagen privada que tomó el repartidor (sin metadatos), si todavía está en el almacén.
  const foto: Archivo[] = [];
  const fm = (await db().query<{ url: string }>(`select m.url from delivery_proofs p join media m on m.id = p.media_id where p.operation_id = $1::bigint and p.kind = 'foto' and m.purged_at is null`, [o.op]).catch(() => ({ rows: [] as { url: string }[] }))).rows[0];
  if (fm) { try { foto.push({ kind: "foto_entrega", cuerpo: await (await import("./medios")).leerObjeto(fm.url), nombre: `foto-entrega-${o.num}.jpg`, mime: "image/jpeg" }); } catch { /* sin almacén: va la constancia */ } }
  return [{ kind: "recibo", cuerpo: recibo, nombre: `recibo-${o.num}.pdf` }, { kind: "conversacion", cuerpo: conversacion, nombre: `conversacion-${o.num}.pdf` }, { kind: "entrega", cuerpo: entrega, nombre: `entrega-${o.num}.pdf` }, ...foto];
}
/* Arma (o reusa) la evidencia de una disputa: una fila por archivo; el archivo al almacén privado si está configurado. */
export async function armarEvidencia(disputa: string, staffId: string | null): Promise<{ id: string; kind: string; cuerpo: Buffer; nombre: string; fileId: string | null; mime?: string }[]> {

  const { createHash, randomBytes } = await import("node:crypto");
  const { guardarObjeto, mediosListos } = await import("./medios");
  const out: { id: string; kind: string; cuerpo: Buffer; nombre: string; fileId: string | null; mime?: string }[] = [];
  for (const a of await archivosEvidencia(disputa)) {
    const sha = createHash("sha256").update(a.cuerpo).digest("hex");
    const ya = (await db().query<{ id: string; f: string | null }>(`select id::text, stripe_file_id as f from dispute_evidence where dispute_id = $1::bigint and kind = $2::text and sha256 = $3::text`, [disputa, a.kind, sha])).rows[0];
    if (ya) { out.push({ id: ya.id, kind: a.kind, cuerpo: a.cuerpo, nombre: a.nombre, fileId: ya.f, mime: a.mime ?? "application/pdf" }); continue; }
    let clave: string | null = null;
    if (mediosListos()) {
      clave = `privado/disputas/${disputa}/${a.kind}-${randomBytes(4).toString("hex")}.${a.mime === "image/jpeg" ? "jpg" : "pdf"}`;
      try { await guardarObjeto(clave, a.cuerpo, a.mime ?? "application/pdf"); } catch { clave = null; }
    }
    const r = (await db().query<{ id: string; f: string | null }>(
      `insert into dispute_evidence (dispute_id, kind, media_key, mime, bytes, sha256, created_by) values ($1::bigint, $2::text, $3::text, $7::text, $4::int, $5::text, $6::uuid)
       on conflict (dispute_id, kind, sha256) do update set dispute_id = excluded.dispute_id returning id::text, stripe_file_id as f`, [disputa, a.kind, clave, a.cuerpo.length, sha, staffId, a.mime ?? "application/pdf"])).rows[0]!;
    out.push({ id: r.id, kind: a.kind, cuerpo: a.cuerpo, nombre: a.nombre, fileId: r.f, mime: a.mime ?? "application/pdf" });
  }
  return out;
}
/* Lo que el equipo ve de la evidencia en la cola (sin el contenido). */
export async function evidenciaArchivos(disputa: string) {
  return (await db().query<{ kind: string; bytes: number; enviado: boolean; at: string }>(
    `select kind, bytes, sent_at is not null as enviado, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from dispute_evidence where dispute_id = $1::bigint order by kind, id desc`, [disputa])).rows;
}

/* Responder con evidencia (texto del equipo + lo que tenemos + los archivos) o aceptar la devolución. Lo llama la cola (con permiso). Los archivos se suben
   por la API de archivos de Stripe (en el sandbox, al simulador) y van en el mismo envío (submit); si una subida falla, no se envía nada. */
export async function responderDisputa(disputa: string, staffId: string, texto: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const d = (await db().query<{ sid: string; st: string; sim: boolean }>(`select stripe_dispute_id as sid, status as st, simulated as sim from disputes where id = $1::bigint`, [disputa])).rows[0];
  if (!d) return { ok: false, msg: "Esa disputa no existe." };
  if (d.st !== "needs_response") return { ok: false, msg: "Esta disputa ya se respondió o se cerró." };
  const e = await evidenciaDe(disputa);
  if (!e) return { ok: false, msg: "No encontramos el pedido de esta disputa." };
  const A = await armarEvidencia(disputa, staffId);
  const archivos: Record<string, string> = {};
  for (const a of A) {
    let f = a.fileId;
    if (!f) {
      const up = await pasarela.subirEvidencia({ cuerpo: a.cuerpo, nombre: a.nombre, tipo: a.mime === "image/jpeg" ? "image/jpeg" : "application/pdf", idem: `dpf-${disputa}-${a.id}`, sim: d.sim });
      if (!up.ok) return { ok: false, msg: "Stripe no aceptó un archivo de la evidencia. No se envió nada; inténtalo otra vez." };
      f = up.id;
      await db().query(`update dispute_evidence set stripe_file_id = $2::text where id = $1::bigint and stripe_file_id is null`, [a.id, f]);
    }
    archivos[a.kind] = f;
  }
  const ok = await pasarela.disputaResponder(d.sid, { texto: `${texto.trim()}\n\n${e.resumen}`, producto: e.producto, cliente: e.cliente, fecha: e.fecha, envio: e.envio,
    archivos: { recibo: archivos.recibo, conversacion: archivos.conversacion, entrega: archivos.entrega, otro: archivos.foto_entrega } });
  if (!ok) return { ok: false, msg: "Stripe no aceptó la respuesta. No cambió nada; inténtalo otra vez." };
  await db().query(`update dispute_evidence set sent_at = now() where dispute_id = $1::bigint and stripe_file_id is not null and sent_at is null`, [disputa]);
  await db().query(`update disputes set status = 'under_review', response_text = $2, responded_by = $3, responded_at = now(), evidence_submitted_at = now(), updated_at = now() where id = $1::bigint`, [disputa, texto.trim().slice(0, 2000), staffId]);
  return { ok: true };
}
export async function aceptarDisputa(disputa: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const d = (await db().query<{ sid: string; st: string }>(`select stripe_dispute_id as sid, status as st from disputes where id = $1::bigint`, [disputa])).rows[0];
  if (!d) return { ok: false, msg: "Esa disputa no existe." };
  if (!["needs_response", "under_review"].includes(d.st)) return { ok: false, msg: "Esta disputa ya se cerró." };
  if (!(await pasarela.disputaAceptar(d.sid))) return { ok: false, msg: "Stripe no la cerró. No cambió nada; inténtalo otra vez." };
  await db().query(`update disputes set status = 'accepted', closed_at = now(), updated_at = now() where id = $1::bigint`, [disputa]);
  await db().query(`update payments set failure_code = 'dispute_lost', updated_at = now() where id = (select payment_id from disputes where id = $1::bigint)`, [disputa]);
  return { ok: true };
}

/* Simulador (solo sandbox): abrir una disputa sobre un cobro y decidir el resultado del «banco». */
export async function simularDisputa(paymentId: string, motivo: string) {
  if (pasarela.modo() !== "simulador") return { ok: false as const, msg: "Solo en el sandbox." };
  const p = (await db().query<{ pi: string; amount: number }>(`select stripe_payment_intent as pi, amount_cents - refunded_cents as amount from payments where id = $1::bigint and status in ('captured', 'partially_refunded')`, [paymentId])).rows[0];
  if (!p) return { ok: false as const, msg: "Ese cobro no se puede disputar." };
  const ya = (await db().query(`select 1 from disputes where payment_id = $1::bigint`, [paymentId])).rowCount;
  if (ya) return { ok: false as const, msg: "Ese cobro ya tiene una disputa." };
  const sid = `dp_sim_${paymentId}_${Date.now().toString(36)}`;
  // 9k · El «banco» del sandbox también la tiene (el simulador de la pasarela): la conciliación la compara con el libro.
  await pasarela.simDisputa(sid, p.pi, p.amount, "needs_response");
  await registrarDisputa({ stripeId: sid, pi: p.pi, amount: p.amount, reason: MOTIVO[motivo] ? motivo : "product_not_received", dueBy: new Date(Date.now() + 7 * 86_400_000).toISOString(), simulated: true });
  return { ok: true as const };
}
export async function simularResultado(paymentId: string, gana: boolean) {
  if (pasarela.modo() !== "simulador") return { ok: false as const, msg: "Solo en el sandbox." };
  const d = (await db().query<{ sid: string }>(`select stripe_dispute_id as sid from disputes where payment_id = $1::bigint and simulated and status = 'under_review' order by id desc limit 1`, [paymentId])).rows[0];
  if (!d) return { ok: false as const, msg: "No hay una disputa respondida esperando al banco." };
  await pasarela.simDisputa(d.sid, "", 0, gana ? "won" : "lost");
  await cerrarDisputa(d.sid, gana ? "won" : "lost");
  return { ok: true as const };
}
