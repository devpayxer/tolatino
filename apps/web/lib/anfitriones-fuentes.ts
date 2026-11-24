import "server-only";
import { auditar, type Staff } from "./admin";
import { delicado } from "./anfitriones-comun";
import { valores } from "./config";
import { db, tx } from "./db";
import { alojadorCompartido, alojadorSoloFeeds, desgloseNotas, palabrasVeto, PAIS_L, resolverSeguro, urlFuente, type DesgloseNotas } from "./noticias-comun";
import { leerFuente, resolverDeFuentes } from "./noticias-lector";

/* AO 5b · Super Admin › Contenido › Anfitriones › Fuentes (regla 8): alta, edición, encender, apagar y retirar fuentes de noticias; «Probar» (UNA
   lectura, que enseña cuántas notas trajo o el error); las últimas notas leídas con su estado y motivo, y los números de 7 días. Ver = cont:ver;
   cambiar = cont:editar con todas las ciudades (las fuentes valen para todas). Cada cambio deja su AuditEntry con antes → después y el motivo.
   Al guardar, la URL pasa por las MISMAS reglas que el lector (urlFuente + DNS sin direcciones privadas); en pruebas el DNS es el del simulador. */

export type FuenteAdm = { id: string; nombre: string; url: string; host: string; pais: string; tema: "noticias" | "deportes"; voz: string; vozNombre: string; lang: "es" | "en";
  veto: string[]; status: "on" | "off" | "retired"; fails: number; ultimaOk: string | null; error: string | null; errorAt: string | null; proxima: string; leidas7: number; nuevas7: number; fallos7: number };
export type NotaAdm = { id: string; fuente: string; titulo: string | null; enlace: string | null; status: string; reason: string | null; detail: string | null; at: string; post: string | null; vaciada: boolean };
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function fuentesAdmin() {
  const [F, N, K] = await Promise.all([
    db().query<FuenteAdm>(
      `select s.id::text, s.name as nombre, s.url, s.host, s.country as pais, s.topic as tema, s.host_user_id::text as voz, h.name as "vozNombre", s.lang, s.veto_words as veto, s.status, s.fails,
              ${ISO("s.last_ok_at")} as "ultimaOk", s.last_error as error, ${ISO("s.last_error_at")} as "errorAt", ${ISO("s.next_read_at")} as proxima,
              (select count(*)::int from com_host_source_reads r where r.source_id = s.id and r.ok and r.at > now() - interval '7 days') as leidas7,
              (select coalesce(sum(r.new_items), 0)::int from com_host_source_reads r where r.source_id = s.id and r.ok and r.at > now() - interval '7 days') as nuevas7,
              (select count(*)::int from com_host_source_reads r where r.source_id = s.id and not r.ok and r.at > now() - interval '7 days') as fallos7
         from com_host_sources s join com_hosts h on h.user_id = s.host_user_id order by (s.status = 'retired'), s.name, s.id limit 200`),
    db().query<NotaAdm>(
      `select n.id::text, s.name as fuente, n.title as titulo, n.link as enlace, n.status, n.reason, n.detail, ${ISO("n.created_at")} as at, n.first_post_id::text as post, n.purged_at is not null as vaciada
         from com_host_news n join com_host_sources s on s.id = n.source_id order by n.created_at desc, n.id desc limit 30`),
    db().query<{ leidas: number; publicadas: number; descartadas: number; fallos: number }>(
      `select (select count(*)::int from com_host_news where created_at > now() - interval '7 days') as leidas,
              (select count(*)::int from com_host_log where kind = 'noticias' and outcome = 'publicada' and created_at > now() - interval '7 days') as publicadas,
              (select count(*)::int from com_host_news where status = 'descartada' and created_at > now() - interval '7 days') as descartadas,
              (select count(*)::int from com_host_source_reads where not ok and at > now() - interval '7 days') as fallos`),
  ]);
  return { fuentes: F.rows, notas: N.rows, cifras: K.rows[0]! };
}
export type FuentesAdm = Awaited<ReturnType<typeof fuentesAdmin>>;

export type ResFuente = { ok: boolean; mensaje?: string };
const no = (mensaje: string): ResFuente => ({ ok: false, mensaje });
const limpio = (m: unknown, n = 500) => (typeof m === "string" ? m.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
const deTodas = (s: Staff) => s.puede("cont", "editar") && !s.ciudadesRol.length;
const ID = /^\d{1,18}$/;
const ESTADO_L: Record<string, string> = { on: "encendida", off: "apagada", retired: "retirada" };

/* La URL con las reglas del lector: urlFuente + el DNS sin direcciones privadas (el mismo resolverSeguro). */
async function urlSegura(v: string): Promise<{ ok: true; url: string; host: string } | { ok: false; error: string }> {
  const u = urlFuente(v);
  if (!u.ok) return u;
  const r = await resolverSeguro(u.host, resolverDeFuentes());
  return r.ok ? u : { ok: false, error: r.error };
}

export type DatosFuente = { nombre: string; url: string; pais: string; tema: string; lang: string; veto: string };
export async function fuenteGuardar(s: Staff, id: string | null, d: DatosFuente, motivo: string): Promise<ResFuente> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar las fuentes (valen para todas las ciudades).");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  const nombre = limpio(d.nombre, 60), pais = limpio(d.pais, 2).toUpperCase(), lang = limpio(d.lang, 2).toLowerCase(), veto = palabrasVeto(limpio(d.veto, 1200));
  if (nombre.length < 2) return no("Escribe el nombre del medio.");
  if (/https?:|www\.|\.[a-z]{2,}\b/i.test(nombre)) return no("El nombre del medio, sin su dirección (la dirección va aparte).");
  if (!PAIS_L[pais]) return no("El país en dos letras (DO, PR, MX, CO…).");
  if (lang !== "es" && lang !== "en") return no("El idioma: es o en.");
  const tema = d.tema === "deportes" ? "deportes" : d.tema === "noticias" ? "noticias" : null;
  if (!tema) return no("Elige el tema y la voz.");
  const u = await urlSegura(limpio(d.url, 500));
  if (!u.ok) return no(u.error);
  const voz = (await db().query<{ id: string }>(`select user_id::text as id from com_hosts where slug = $1`, [tema === "deportes" ? "rafelito" : "yadira"])).rows[0]?.id;
  if (!voz) return no("Esa voz no existe.");
  if (id !== null && !ID.test(id)) return no("Esa fuente no existe.");
  return tx(async (c): Promise<ResFuente> => {
    const otra = (await c.query(`select 1 from com_host_sources where url = $1 and status <> 'retired' and ($2::bigint is null or id <> $2::bigint)`, [u.url, id])).rowCount;
    if (otra) return no("Ya hay una fuente con esa dirección.");
    const nueva = { nombre, url: u.url, pais, tema, voz, lang, veto };
    if (id === null) {
      const r = (await c.query<{ id: string }>(`insert into com_host_sources (name, url, host, country, topic, host_user_id, lang, veto_words, created_by, updated_by)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) returning id::text`, [nombre, u.url, u.host, pais, tema, voz, lang, veto, s.id])).rows[0]!;
      await auditar(c, { actor: s.id, action: "anfitrion.fuente_alta", targetKind: "com_host_source", targetId: r.id, after: { ...nueva, estado: "apagada" }, reason: m });
      return { ok: true, mensaje: "Fuente guardada, apagada. Pruébala y enciéndela cuando esté bien." };
    }
    const x = (await c.query<{ name: string; url: string; country: string; topic: string; lang: string; veto_words: string[]; status: string }>(
      `select name, url, country, topic, lang, veto_words, status from com_host_sources where id = $1::bigint for update`, [id])).rows[0];
    if (!x || x.status === "retired") return no("Esa fuente no existe o está retirada.");
    if (x.name === nombre && x.url === u.url && x.country === pais && x.topic === tema && x.lang === lang && x.veto_words.join(",") === veto.join(",")) return no("No cambió nada.");
    await c.query(`update com_host_sources set name = $2, url = $3, host = $4, country = $5, topic = $6, host_user_id = $7, lang = $8, veto_words = $9, updated_by = $10,
                     next_read_at = case when url <> $3 then now() else next_read_at end, fails = case when url <> $3 then 0 else fails end where id = $1::bigint`,
      [id, nombre, u.url, u.host, pais, tema, voz, lang, veto, s.id]);
    await auditar(c, { actor: s.id, action: "anfitrion.fuente_editar", targetKind: "com_host_source", targetId: id,
      before: { nombre: x.name, url: x.url, pais: x.country, tema: x.topic, lang: x.lang, veto: x.veto_words }, after: nueva, reason: m });
    return { ok: true, mensaje: "Fuente guardada." };
  });
}

export async function fuenteEstado(s: Staff, id: string, estado: string, motivo: string): Promise<ResFuente> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar las fuentes.");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!ID.test(String(id)) || !["on", "off", "retired"].includes(estado)) return no("Esa fuente no existe.");
  return tx(async (c): Promise<ResFuente> => {
    const x = (await c.query<{ status: string; name: string; url: string }>(`select status, name, url from com_host_sources where id = $1::bigint for update`, [id])).rows[0];
    if (!x || x.status === "retired") return no("Esa fuente no existe o está retirada.");
    if (x.status === estado) return no("Ya está así.");
    if (estado === "on") { const u = await urlSegura(x.url); if (!u.ok) return no(u.error); }
    await c.query(`update com_host_sources set status = $2, updated_by = $3, next_read_at = case when $2 = 'on' then now() else next_read_at end where id = $1::bigint`, [id, estado, s.id]);
    await auditar(c, { actor: s.id, action: "anfitrion.fuente_estado", targetKind: "com_host_source", targetId: id, before: { fuente: x.name, estado: ESTADO_L[x.status] ?? x.status }, after: { estado: ESTADO_L[estado] }, reason: m });
    return { ok: true, mensaje: estado === "on" ? `${x.name}: encendida.` : estado === "off" ? `${x.name}: apagada.` : `${x.name}: retirada.` };
  });
}

/* «Probar»: UNA lectura por el lector seguro (también de una fuente apagada), SIN guardar notas; queda en el registro de lecturas y en la auditoría.
   Una por fuente cada 20 segundos (no es una forma de martillar a un medio). Cuenta lo útil para decidir desde el teléfono (endurecimiento 5b-3):
   cuántas trajo, cuántas con enlace válido del medio, cuántas entrarían y cuántas se descartarían por cada motivo, con la MISMA regla del barrido
   (motivoNota). Si la fuente es un repartidor de feeds (feedburner…), lo dice: sus enlaces nunca casan. Si pide esperar (Retry-After), lo dice y
   el barrido tampoco la lee antes (next_read_at). */
export type PruebaFuente = { notas: number; desglose: DesgloseNotas | null; soloFeeds: string | null; compartido: string | null; esperarMin: number | null };
export async function probarFuente(s: Staff, id: string): Promise<ResFuente & { notas?: number; prueba?: PruebaFuente }> {
  if (!deTodas(s)) return no("Tu rol no puede probar fuentes.");
  if (!ID.test(String(id))) return no("Esa fuente no existe.");
  if ((await db().query(`select 1 from com_host_source_reads where source_id = $1::bigint and via = 'probar' and at > now() - interval '20 seconds'`, [id])).rowCount) return no("Espera unos segundos antes de probarla otra vez.");
  const r = await leerFuente(id, { probar: true });
  if (!r.ok && /no existe|retirada/.test(r.error)) return no(r.error);
  const f = (await db().query<{ host: string; veto_words: string[] }>(`select host, veto_words from com_host_sources where id = $1::bigint`, [id])).rows[0];
  const soloFeeds = f ? alojadorSoloFeeds(f.host) : null, compartido = f ? alojadorCompartido(f.host) : null;
  const desglose = r.ok ? desgloseNotas(r.notas, f?.veto_words ?? [], (await valores("anf_noticia_horas")).anf_noticia_horas, Date.now(), delicado) : null;
  const esperarS = !r.ok && r.esperarS ? Math.min(86400, r.esperarS) : null;
  await tx(async (c) => {
    await c.query(`insert into com_host_source_reads (source_id, via, ok, items, error, ms, by_user) values ($1::bigint, 'probar', $2, $3, $4, $5, $6)`,
      [id, r.ok, r.ok ? Math.min(1000, r.notas.length) : 0, r.ok ? null : r.error, r.ms, s.id]);
    // La fuente pidió esperar: el barrido tampoco la lee antes (nunca adelanta una espera que ya tenía).
    if (esperarS) await c.query(`update com_host_sources set next_read_at = greatest(next_read_at, now() + make_interval(secs => $2::int)) where id = $1::bigint`, [id, esperarS]);
    await auditar(c, { actor: s.id, action: "anfitrion.fuente_probar", targetKind: "com_host_source", targetId: id,
      after: r.ok ? { notas: r.notas.length, formato: r.formato, conEnlace: desglose!.conEnlace, entrarian: desglose!.entrarian, descartes: desglose!.motivos } : { error: r.error, ...(esperarS ? { esperarS } : {}) }, reason: "Probar" });
  });
  const prueba: PruebaFuente = { notas: r.ok ? r.notas.length : 0, desglose, soloFeeds, compartido, esperarMin: esperarS ? Math.ceil(esperarS / 60) : null };
  if (!r.ok) return { ok: false, mensaje: esperarS ? `No se pudo leer: la fuente pide esperar ${prueba.esperarMin} min.` : `No se pudo leer: ${r.error}`, prueba };
  const d = desglose!, desc = r.notas.length - d.entrarian;
  return { ok: true, notas: r.notas.length, prueba,
    mensaje: `${r.notas.length === 1 ? "La fuente se leyó bien: trajo 1 nota" : `La fuente se leyó bien: trajo ${r.notas.length} notas`}; ${d.conEnlace} con enlace del medio, ${d.entrarian} entrarían y ${desc} se descartarían.${soloFeeds ? ` Es un repartidor de feeds (${soloFeeds}): sus enlaces llevan a otro servidor y nunca se aceptan; usa el RSS del propio medio.` : ""}` };
}
