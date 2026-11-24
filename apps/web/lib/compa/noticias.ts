import "server-only";
import { createHash } from "node:crypto";
import { db } from "../db";
import { valores } from "../config";
import { publicar } from "../comunidad";
import { MARCA_ANF } from "../comunidad-comun";
import { delicado, filtroAnfitrion, type Tema } from "../anfitriones-comun";
import { ESQUEMA_NOTICIA, motivoNota, pautaNoticia, plantillaResumen, resumenValido, textoNoticia, type NotaLeida } from "../noticias-comun";
import { leerFuente } from "../noticias-lector";
import { ErrorModelo, modelo, type Motor, type Salida } from "./modelo";
import { modeloDe } from "./tope";
import { anotarUso, gastar } from "./anfitriones-tope";

/* AO 5b · Noticias de las voces de la casa (docs/diseno/plan/anfitriones.md §5b). Dos piezas, las dos SOLO desde el barrido central:
   1) barrerFuentes() (tarea «anfitrionesFuentes» del barrido): vacía por retención lo que no se publicó; lee hasta anf_fuentes_por_pasada fuentes
      encendidas a las que ya les toca (anf_fuente_cada_min; si fallan, la espera se duplica por fallo hasta un día) por el lector seguro
      (lib/noticias-lector.ts); cada nota entra UNA vez (huella = sha256 del enlace normalizado) y ya llega clasificada: nueva, o descartada con su
      motivo (vieja, sin enlace del medio, política partidista, sucesos violentos, menores, tema delicado o palabra de la fuente). Cada lectura queda en
      com_host_source_reads y el fallo, en la fuente (visible en el Super Admin). Si las noticias están apagadas o todo en pausa, no se lee nada.
   2) publicarNoticia() (desde barrerAnfitriones, con el cupo de publicaciones de la ciudad): una nota reciente que no salió en esta ciudad, que no se usó
      en esta pasada para otra ciudad ni salió en otra en el último minuto (se reparte); la publica la voz de su fuente (Yadira o Rafelito) si está
      encendida: entrada con su estilo + resumen (el modelo, SOLO con el título y la descripción, con el tope propio; sin modelo, sin cupo o si el
      resumen trae algo que la fuente no dice → la plantilla «Titular») + el medio + una pregunta al barrio; y el ENLACE a la fuente en la
      publicación (com_posts.source_url, que solo una voz puede llevar). Pasa por filtroAnfitrion() y por publicar() (la moderación de siempre). */

const SALIDA_MAX = 200, ENTRADA_MAX = 1200, ESPERA_MS = 8000;
export const huellaEnlace = (enlace: string) => createHash("sha256").update(enlace, "utf8").digest("hex");

type FuenteBarrido = { id: string; name: string; host: string; topic: Tema; veto_words: string[] };
type Clasificada = { titulo: string | null; resumen: string | null; enlace: string | null; fecha: string | null; huella: string; estado: "nueva" | "descartada"; motivo: string | null; detalle: string | null };
function clasificar(n: NotaLeida, f: FuenteBarrido, horas: number): Clasificada {
  const base = { titulo: n.titulo, resumen: n.descripcion || null, enlace: n.enlace, fecha: n.fecha };
  // La misma regla que cuenta «Probar» (motivoNota, en lib/noticias-comun.ts): lo que el Super Admin ve al probar es lo que el barrido hará.
  const m = motivoNota(n, f.veto_words, horas, Date.now(), delicado);
  if (m?.motivo === "enlace") return { ...base, titulo: null, resumen: null, huella: huellaEnlace(`sin-enlace:${f.id}:${n.titulo}`), estado: "descartada", motivo: "enlace", detalle: m.detalle };
  const huella = huellaEnlace(n.enlace!);
  if (m) return { ...base, huella, estado: "descartada", motivo: m.motivo, detalle: m.detalle };
  return { ...base, huella, estado: "nueva", motivo: null, detalle: null };
}

/* Guardar lo leído de una fuente (cada nota una sola vez). Devuelve cuántas entraron nuevas. La usa también «Probar»? No: «Probar» no guarda notas. */
async function guardarNotas(f: FuenteBarrido, notas: NotaLeida[], horas: number): Promise<number> {
  let nuevas = 0;
  for (const n of notas) {
    const c = clasificar(n, f, horas);
    const r = await db().query(
      `insert into com_host_news (source_id, fingerprint, title, summary, link, published_at, status, reason, detail, purged_at)
       values ($1::bigint, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, case when $3::text is null then now() end) on conflict (fingerprint) do nothing`,
      [f.id, c.huella, c.titulo, c.titulo ? c.resumen : null, c.titulo ? c.enlace : null, c.fecha, c.estado, c.motivo, c.detalle]);
    nuevas += r.rowCount ?? 0;
  }
  return nuevas;
}

/* ── 1 · Leer las fuentes (solo el barrido) ── */
export async function barrerFuentes(): Promise<{ vaciadas: number; leidas: number; fallos: number; nuevas: number }> {
  const out = { vaciadas: 0, leidas: 0, fallos: 0, nuevas: 0 };
  // Retención: lo que no se publicó se vacía a los N días (la huella queda: nunca se vuelve a leer como nueva).
  out.vaciadas = (await db().query(
    `update com_host_news set title = null, summary = null, link = null, purged_at = now()
      where id in (select id from com_host_news where status <> 'publicada' and purged_at is null
                     and created_at < now() - make_interval(days => cfg_int('anf_noticias_retener_dias')) order by created_at limit 2000)`)).rowCount ?? 0;
  const k = await valores("anf_pausa", "anf_fuentes_por_pasada", "anf_fuente_cada_min", "anf_noticia_horas");
  if (k.anf_pausa === 1) return out;
  if (!(await db().query(`select 1 from com_host_kinds where key = 'noticias' and active`)).rowCount) return out;
  const F = (await db().query<FuenteBarrido>(
    `select s.id::text, s.name, s.host, s.topic, s.veto_words from com_host_sources s join com_hosts h on h.user_id = s.host_user_id and h.active
      where s.status = 'on' and s.next_read_at <= now() order by s.next_read_at, s.id limit $1`, [k.anf_fuentes_por_pasada])).rows;
  await Promise.all(F.map(async (f) => {
    const r = await leerFuente(f.id);
    if (r.ok) {
      const nuevas = await guardarNotas(f, r.notas, k.anf_noticia_horas);
      out.leidas++; out.nuevas += nuevas;
      await db().query(`update com_host_sources set fails = 0, last_ok_at = now(), next_read_at = now() + make_interval(mins => $2) where id = $1::bigint`, [f.id, k.anf_fuente_cada_min]);
      await db().query(`insert into com_host_source_reads (source_id, via, ok, items, new_items, ms) values ($1::bigint, 'barrido', true, $2, $3, $4)`, [f.id, Math.min(1000, r.notas.length), Math.min(1000, nuevas), r.ms]);
    } else {
      out.fallos++;
      // Respaldo exponencial: cada fallo duplica la espera (cada_min · 2^fallos), hasta un día. Si la fuente pidió esperar (429/503 con Retry-After,
      // ya acotado a un día por esperaRetryAfter), se respeta: nunca antes de lo que pidió ni antes del respaldo normal (greatest).
      await db().query(`update com_host_sources set fails = fails + 1, last_error = $2, last_error_at = now(),
                          next_read_at = now() + greatest(make_interval(mins => least(1440, $3::int * power(2, least(fails + 1, 10))::int)), make_interval(secs => least(86400, $4::int))) where id = $1::bigint`,
        [f.id, r.error.slice(0, 200), k.anf_fuente_cada_min, r.esperarS ?? 0]);
      await db().query(`insert into com_host_source_reads (source_id, via, ok, error, ms) values ($1::bigint, 'barrido', false, $2, $3)`, [f.id, r.error.slice(0, 200), r.ms]);
    }
  }));
  return out;
}

/* ── 2 · Publicar una nota en una ciudad (desde barrerAnfitriones, dentro de su cupo) ── */
export type CiudadN = { id: string; name: string; dia: string };
export type VozN = { id: string; nombre: string; gender: "m" | "f"; style: string };
type Cand = { id: string; titulo: string; resumen: string | null; enlace: string; medio: string; pais: string; tema: "noticias" | "deportes"; voz: string; estado: string };

async function anotar(c: CiudadN, voz: string | null, ref: string, motor: string, x: { modelo?: string | null; costo?: number; tin?: number; tout?: number; post?: string | null; motivo?: string | null; detalle?: string | null }): Promise<boolean> {
  const r = await db().query(
    `insert into com_host_log (city_id, host_user_id, kind, source_ref, motor, model, cost_microusd, input_tokens, output_tokens, post_id, outcome, reason, detail, local_day)
     values ($1, $2, 'noticias', $3, $4, $5, $6, $7, $8, $9::bigint, $10, $11, $12, $13::date) on conflict (city_id, kind, source_ref) do nothing`,
    [c.id, voz, ref, motor, x.modelo ?? null, Math.max(0, Math.round(x.costo ?? 0)), x.tin ?? 0, x.tout ?? 0, x.post ?? null, x.post ? "publicada" : "descartada", x.post ? null : x.motivo ?? "error", x.detalle ? x.detalle.slice(0, 300) : null, c.dia]);
  return (r.rowCount ?? 0) > 0;
}

/* El resumen por el modelo (exportada para que el guardián del tope la encuentre). Sin modelo, sin cupo o con algo que la fuente no dice → null
   (la plantilla). Nunca bloquea la nota: el resumen es lo único que pide al modelo. */
export async function resumirNoticia(motor: Motor, voz: VozN, x: Cand): Promise<{ texto: string | null; motor: Motor | "plantilla"; modelo: string | null; costo: number; tin: number; tout: number; nota: string | null }> {
  const sinModelo = (nota: string) => ({ texto: null, motor: "plantilla" as const, modelo: null, costo: 0, tin: 0, tout: 0, nota });
  const m = await modelo(motor);
  if (!m) return sinModelo("sin modelo (reglas)");
  const modeloId = motor === "simulador" ? "simulador" : await modeloDe("neighbor");
  if (!modeloId) return sinModelo("sin modelo activo");
  const reserva = await gastar(modeloId, ENTRADA_MAX, SALIDA_MAX);
  if (!reserva) return sinModelo("tope de costo: plantilla");
  let sal: Salida, costo = 0;
  try {
    sal = await Promise.race([
      m.responder({ uso: "anfitrion_noticia", modelo: modeloId, lang: "es", sistema: pautaNoticia({ nombre: voz.nombre, marca: MARCA_ANF[voz.gender].es.toLowerCase(), estilo: voz.style }),
        datos: { MEDIO: x.medio, TITULO: x.titulo, DESCRIPCION: x.resumen ?? "" }, trozos: [], mensajes: [{ de: "persona", texto: "Resume la nota de DATOS." }],
        maxTokens: SALIDA_MAX, esperaMs: ESPERA_MS, esquema: ESQUEMA_NOTICIA as unknown as Record<string, unknown> }),
      new Promise<never>((_, no) => setTimeout(() => no(new ErrorModelo("timeout", true, "tiempo agotado")), ESPERA_MS)),
    ]);
    costo = await anotarUso({ reserva, modelo: modeloId, tokens: sal.tokens });
  } catch (e) {
    const err = e instanceof ErrorModelo ? e : new ErrorModelo("error", false, "error");
    costo = await anotarUso({ reserva, modelo: modeloId, tokens: err.tokens ? { entrada: err.tokens.entrada, salida: err.tokens.salida } : undefined, cobrarReservado: err.cobrar && !err.tokens });
    return { ...sinModelo(`el modelo no respondió (${err.tipo}): plantilla`), costo, modelo: modeloId };
  }
  const j = sal.json as { resumen?: unknown } | null;
  const r = resumenValido(typeof j?.resumen === "string" ? j.resumen : "", `${x.medio} ${x.titulo} ${x.resumen ?? ""}`);
  return { texto: r, motor: r ? motor : "plantilla", modelo: modeloId, costo, tin: sal.tokens.entrada, tout: sal.tokens.salida, nota: r ? null : "resumen que no encaja: plantilla" };
}

export async function publicarNoticia(c: CiudadN, V: Map<string, VozN>, usadas: Set<string>, motor: Motor): Promise<boolean> {
  const X = (await db().query<Cand>(
    `select n.id::text, n.title as titulo, n.summary as resumen, n.link as enlace, s.name as medio, s.country as pais, s.topic as tema, s.host_user_id::text as voz, n.status as estado
       from com_host_news n join com_host_sources s on s.id = n.source_id
      where n.status in ('nueva', 'publicada') and n.purged_at is null and s.status = 'on'
        and coalesce(n.published_at, n.created_at) > now() - make_interval(hours => cfg_int('anf_noticia_horas'))
        and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'noticias' and l.source_ref = 'news:' || n.id)
        and not exists (select 1 from com_host_log l where l.kind = 'noticias' and l.source_ref = 'news:' || n.id and l.outcome = 'publicada' and l.created_at > now() - interval '1 minute')
        and not (n.id = any($2::bigint[]))
      order by (n.status = 'nueva') desc, coalesce(n.published_at, n.created_at) desc, n.id desc limit 5`, [c.id, [...usadas]])).rows;
  for (const x of X) {
    const voz = V.get(x.voz);
    if (!voz) continue; // la voz de esa fuente está apagada
    usadas.add(x.id); // se reparte: en esta pasada, esta nota no va a otra ciudad
    const ref = `news:${x.id}`;
    const s = await resumirNoticia(motor, voz, x);
    const cuerpo = textoNoticia({ id: Number(x.id), tema: x.tema, pais: x.pais, resumen: s.texto ?? plantillaResumen(x.titulo), medio: x.medio });
    const caro = { modelo: s.modelo, costo: s.costo, tin: s.tin, tout: s.tout };
    const fallo = filtroAnfitrion(cuerpo, { deportes: x.tema === "deportes" });
    if (fallo) {
      // Lo que no pasa el filtro de las voces no pasará en ninguna ciudad: la nota queda descartada con el motivo.
      if (x.estado === "nueva") await db().query(`update com_host_news set status = 'descartada', reason = 'filtro', detail = $2 where id = $1::bigint and status = 'nueva'`, [x.id, fallo]);
      await anotar(c, voz.id, ref, s.motor, { ...caro, motivo: "filtro", detalle: fallo });
      continue;
    }
    const r = await publicar(voz.id, c.id, { kind: "publicacion", body: cuerpo, topic: null, fotos: [] }, { fuente: { url: x.enlace, medio: x.medio } })
      .catch((e) => ({ ok: false as const, msg: { es: String(e?.message ?? e).slice(0, 200), en: "" } }));
    if (!r.ok) { await anotar(c, voz.id, ref, s.motor, { ...caro, motivo: /Llegaste a/.test(r.msg.es) ? "limite" : "moderacion", detalle: r.msg.es }); continue; }
    await db().query(`update com_host_news set status = 'publicada', first_post_id = coalesce(first_post_id, $2::bigint), published_n = published_n + 1 where id = $1::bigint`, [x.id, r.id]);
    if (await anotar(c, voz.id, ref, s.motor, { ...caro, post: r.id, detalle: s.nota })) return true;
  }
  return false;
}
