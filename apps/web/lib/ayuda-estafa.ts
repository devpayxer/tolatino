import "server-only";
import type { PoolClient } from "pg";

/* 4if · «Posible estafa» (fase4-iglesias-inmuebles-autos.md §3 «Estafas de renta» y §4if). «Me cobraron por ver la propiedad», «Pidieron más
   para mudarme de lo publicado» y, en Iglesias, «Me pidieron dinero por la ayuda» no esperan al negocio: van directo a To'Latino con prioridad
   (cola «Posible estafa», COLA_AYUDA_SQL) y lo que se ofrecía queda EN PAUSA mientras se revisa:
   - Bienes Raíces y Autos: la propiedad o el carro de la visita (items.status = 'hidden' con el motivo, como cuando el equipo oculta uno: sale
     de la ficha y de Buscar y el dueño no lo puede volver a encender).
   - Iglesias: «Pedir fecha» e inscripciones (modules_off.svc, como la pausa de «Grupos que no abrieron»).
   Quién pausó, qué y cuándo queda en help_requests (paused_*) y en la auditoría. Reanudar solo deshace SU pausa (si el equipo lo ocultó por otra
   razón, o hay otra revisión abierta sobre lo mismo, sigue oculto). AQUÍ NO HAY DINERO: este archivo no importa cobros ni la pasarela
   (guardián sinDineroEnAyuda): lo que se cobró fuera de la app lo devuelve el negocio fuera de la app. */
export const MARCA_PAUSA = "Pausa por revisión de To'Latino";
export const esEstafa = (reason: string, rubro: string) => reason === "ver" || reason === "mudar" || (rubro === "fe" && reason === "cobro");

type H = { id: string; number: string; business_id: string; city_id: string; user_id: string };
/* Pausa lo que la ayuda señala. Devuelve el nombre de lo pausado (para el aviso) o null si ya estaba fuera de la página. */
export async function pausarPorAyuda(c: PoolClient, h: H, actor: { kind: "user" | "staff"; id: string }): Promise<string | null> {
  const o = (await c.query<{ kind: string; item: string | null; cat: string; nombre: string | null }>(
    `select o.kind, o.details->>'item_id' as item, b.category_id as cat, coalesce(o.details#>>'{item,es}', i.name->>'es') as nombre
       from help_requests x join operations o on o.id = x.operation_id join businesses b on b.id = x.business_id left join items i on i.id::text = o.details->>'item_id'
      where x.id = $1::bigint`, [h.id])).rows[0];
  if (!o) return null;
  const motivo = `${MARCA_PAUSA} (${h.number}): posible estafa.`;
  let kind: "item" | "svc" | null = null, ref: string | null = null, nombre: string | null = null;
  if (o.cat === "NEG-FE") {
    const r = await c.query(`update businesses set modules_off = modules_off || jsonb_build_object('svc', jsonb_build_object('reason', $2::text, 'at', now(), 'by', 'ayuda')), updated_at = now()
                              where id = $1 and not (modules_off ? 'svc')`, [h.business_id, motivo]);
    // Si otra revisión ya lo pausó, esta también lo sostiene (reanudar espera a las dos).
    const ya = r.rowCount ? 1 : (await c.query(`select 1 from businesses where id = $1 and modules_off->'svc'->>'reason' like $2`, [h.business_id, `${MARCA_PAUSA}%`])).rowCount;
    if (ya) { kind = "svc"; ref = h.business_id; nombre = "Pedir fecha e inscripciones"; }
  } else if (o.kind === "visit" && o.item && /^\d{1,18}$/.test(o.item)) {
    const r = await c.query(`update items set status = 'hidden', hidden_reason = $3, hidden_by = null, updated_at = now() where id = $1::bigint and business_id = $2 and status = 'live' and removed_at is null`, [o.item, h.business_id, motivo]);
    if (!r.rowCount && (await c.query(`select 1 from items where id = $1::bigint and status = 'hidden' and hidden_reason like $2`, [o.item, `${MARCA_PAUSA}%`])).rowCount) { kind = "item"; ref = o.item; nombre = o.nombre; }
    else if (r.rowCount) {
      kind = "item"; ref = o.item; nombre = o.nombre;
      if (o.cat === "NEG-INMUEBLE") { const I = await import("./inmuebles"); await I.horasVisita(c, h.business_id, o.item); await I.recalcularFiltrosInm(c, h.business_id); }
      if (o.cat === "NEG-DEALER") await (await import("./autos")).recalcularFiltrosAutos(c, h.business_id);
    }
  }
  if (!kind) return null;
  await c.query(`update help_requests set paused_kind = $2, paused_ref = $3, paused_at = now(), unpaused_at = null, updated_at = now() where id = $1::bigint`, [h.id, kind, ref]);
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ($1, $2, 'ayuda.estafa.pausar', 'business', $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [actor.kind, actor.id, h.business_id, h.city_id, JSON.stringify({ [kind === "svc" ? "pedir_fecha" : "anuncio"]: nombre, estado: "visible" }), JSON.stringify({ estado: "en pausa", solicitud: h.number }), motivo]);
  return nombre;
}

/* Reanuda SOLO la pausa de esta ayuda (no la de otra revisión abierta ni un ocultado del equipo por otra razón). */
export async function reanudarPausa(c: PoolClient, helpId: string, staffId: string, motivo: string): Promise<string | null> {
  const h = (await c.query<{ number: string; business_id: string; city_id: string; kind: string | null; ref: string | null; cat: string; nombre: string | null }>(
    `select h.number, h.business_id, h.city_id, h.paused_kind as kind, h.paused_ref as ref, b.category_id as cat,
            case when h.paused_kind = 'item' then (select i.name->>'es' from items i where i.id::text = h.paused_ref) else 'Pedir fecha e inscripciones' end as nombre
       from help_requests h join businesses b on b.id = h.business_id where h.id = $1::bigint and h.paused_at is not null and h.unpaused_at is null for update of h`, [helpId])).rows[0];
  if (!h || !h.kind || !h.ref) return null;
  await c.query(`update help_requests set unpaused_at = now(), updated_at = now() where id = $1::bigint`, [helpId]);
  // ¿Otra revisión abierta pausa lo mismo? Entonces sigue en pausa.
  const otra = (await c.query(`select 1 from help_requests where paused_kind = $1 and paused_ref = $2 and paused_at is not null and unpaused_at is null and id <> $3::bigint limit 1`, [h.kind, h.ref, helpId])).rowCount;
  if (otra) return null;
  if (h.kind === "item") {
    const r = await c.query(`update items set status = 'live', hidden_reason = null, hidden_by = null, updated_at = now() where id = $1::bigint and business_id = $2 and status = 'hidden' and hidden_reason like $3`, [h.ref, h.business_id, `${MARCA_PAUSA}%`]);
    if (!r.rowCount) return null;
    if (h.cat === "NEG-INMUEBLE") { const I = await import("./inmuebles"); await I.horasVisita(c, h.business_id, h.ref); await I.recalcularFiltrosInm(c, h.business_id); }
    if (h.cat === "NEG-DEALER") await (await import("./autos")).recalcularFiltrosAutos(c, h.business_id);
  } else {
    const r = await c.query(`update businesses set modules_off = modules_off - 'svc', updated_at = now() where id = $1 and modules_off->'svc'->>'reason' like $2`, [h.business_id, `${MARCA_PAUSA}%`]);
    if (!r.rowCount) return null;
  }
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('staff', $1, 'ayuda.estafa.reanudar', 'business', $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [staffId, h.business_id, h.city_id, JSON.stringify({ [h.kind === "svc" ? "pedir_fecha" : "anuncio"]: h.nombre, estado: "en pausa" }), JSON.stringify({ estado: "visible", solicitud: h.number }), motivo]);
  return h.nombre;
}

/* «Sancionar»: lo pausado se queda fuera (ya no como pausa de revisión: con el motivo de To'Latino, que el dueño ve en su panel) y queda una
   advertencia al negocio (sanctions, target_kind 'business'). Se vuelve a mostrar desde Negocios 360° si algún día corresponde. */
export async function sancionarPorAyuda(c: PoolClient, helpId: string, staffId: string, motivo: string): Promise<string | null> {
  const h = (await c.query<{ number: string; business_id: string; city_id: string; kind: string | null; ref: string | null; nombre: string | null }>(
    `select h.number, h.business_id, h.city_id, h.paused_kind as kind, h.paused_ref as ref,
            case when h.paused_kind = 'item' then (select i.name->>'es' from items i where i.id::text = h.paused_ref) when h.paused_kind = 'svc' then 'Pedir fecha e inscripciones' end as nombre
       from help_requests h where h.id = $1::bigint for update`, [helpId])).rows[0];
  if (!h) return null;
  const razon = `Retirado por To'Latino (${h.number}): ${motivo}`.slice(0, 300);
  if (h.kind === "item" && h.ref) await c.query(`update items set hidden_reason = $3, hidden_by = $4, updated_at = now() where id = $1::bigint and business_id = $2 and status = 'hidden' and hidden_reason like $5`, [h.ref, h.business_id, razon, staffId, `${MARCA_PAUSA}%`]);
  if (h.kind === "svc") await c.query(`update businesses set modules_off = jsonb_set(modules_off, '{svc}', jsonb_build_object('reason', $2::text, 'at', now(), 'by', $3::text)), updated_at = now() where id = $1 and modules_off->'svc'->>'reason' like $4`, [h.business_id, razon, staffId, `${MARCA_PAUSA}%`]);
  await c.query(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff) values ('business', $1, $2, 'adv', $3, $4)`, [h.business_id, h.city_id, razon.slice(0, 500), staffId]);
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('staff', $1, 'ayuda.estafa.sancionar', 'business', $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [staffId, h.business_id, h.city_id, JSON.stringify({ solicitud: h.number, estado: "en revisión" }), JSON.stringify({ sancion: "Advertencia", [h.kind === "svc" ? "pedir_fecha" : "anuncio"]: h.nombre ?? "—", estado: h.kind ? "retirado" : "sin anuncio" }), motivo]);
  return h.nombre ?? "";
}
