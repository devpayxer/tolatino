"use server";
/* Recuperar tu negocio (ONB-NEG-RECUPERAR): pedir el código por SMS al teléfono del negocio (decisión R1) y enviar el
   reclamo (con código o con documento). El servidor decide todo: sesión, mismo sitio, negocio activo, límites. Un
   negocio con dueño solo se reclama con documento y su dueño lo ve en su panel (decisión R2). */
import { revalidatePath } from "next/cache";
import { codigoReclamo, ErrorCuenta, ipCliente, mismoOrigen, verificarCodigoReclamo, yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { evento } from "@/lib/eventos";

type Bi = { es: string; en: string };
export type ResRec = { ok: true; codigoPrueba?: string; reclamo?: string } | { ok: false; mensaje: Bi; entrar?: boolean };
const no = (es: string, en: string, entrar = false): ResRec => ({ ok: false, mensaje: { es, en }, entrar });
const ERR: Record<string, [string, string]> = {
  espera: ["Espera unos segundos para pedir otro código.", "Wait a few seconds to ask for another code."],
  demasiados: ["Demasiados intentos. Prueba más tarde o usa un documento.", "Too many tries. Try later or use a document."],
  sin_proveedor: ["Los mensajes de texto todavía no están disponibles. Usa un documento.", "Text messages are not available yet. Use a document."],
  codigo_incorrecto: ["Ese código no es. Revísalo e intenta otra vez.", "That code is not right. Check it and try again."],
  codigo_vencido: ["El código venció. Pide otro.", "The code expired. Ask for another."],
};
const ROLES = new Set(["dueno", "socio", "encargado"]), DOCS = new Set(["licencia", "servicio", "ein", "otro"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function entrar(id: unknown) {
  if (!(await mismoOrigen())) return { e: no("No permitido.", "Not allowed.") } as const;
  const me = await yo();
  if (!me?.first_name) return { e: no("Entra para continuar.", "Sign in to continue.", true) } as const;
  if (typeof id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return { e: no("Ese negocio no existe.", "That business doesn’t exist.") } as const;
  const b = (await db().query<{ id: string; city_id: string; phone: string | null; owner: string | null }>(
    `select id, city_id, phone, owner_user_id as owner from businesses where id = $1 and status = 'active'`, [id])).rows[0];
  if (!b) return { e: no("Ese negocio no existe.", "That business doesn’t exist.") } as const;
  if (b.owner === me.id) return { e: no("Este negocio ya es tuyo.", "This business is already yours.") } as const;
  const abierto = (await db().query(`select 1 from claims where business_id = $1 and user_id = $2 and status = 'pending'`, [id, me.id])).rowCount;
  if (abierto) return { e: no("Ya pediste recuperarlo. Lo estamos revisando.", "You already asked to recover it. We are reviewing it.") } as const;
  return { me, b } as const;
}

/* «Mandarme el código»: SMS al teléfono del negocio (solo si no tiene dueño). En el sandbox el código sale en pantalla. */
export async function pedirCodigo(id: string): Promise<ResRec> {
  const x = await entrar(id);
  if ("e" in x) return x.e!;
  if (x.b.owner) return no("Este negocio ya tiene dueño: se recupera con un documento.", "This business already has an owner: recover it with a document.");
  if (!x.b.phone) return no("Este negocio no tiene teléfono: usa un documento.", "This business has no phone: use a document.");
  try {
    const r = await codigoReclamo(x.b.phone);
    return { ok: true, codigoPrueba: r.codigoPrueba };
  } catch (e) {
    const k = e instanceof ErrorCuenta ? e.codigo : "sin_proveedor", t = ERR[k] ?? ERR.sin_proveedor!;
    return no(t[0], t[1]);
  }
}

/* Enviar el reclamo: con el código (prueba el teléfono) o con un documento (foto privada). Una persona de To'Latino
   lo aprueba en «Cambios sensibles». */
export async function enviarReclamo(id: string, x: { rol: string; metodo: "codigo" | "documento"; codigo?: string; doc?: string; docKind?: string; nota?: string; origen?: string }): Promise<ResRec> {
  const a = await entrar(id);
  if ("e" in a) return a.e!;
  const rol = ROLES.has(x?.rol) ? x.rol : null;
  if (!rol) return no("Elige qué eres del negocio.", "Choose your role in the business.");
  const nota = typeof x?.nota === "string" ? x.nota.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300) : "";
  const origen = x?.origen === "publica" ? "publica" : "directo";
  const veces = (await db().query<{ n: number }>(`select count(*)::int as n from claims where user_id = $1 and created_at > now() - interval '30 days'`, [a.me.id])).rows[0]!.n;
  if (veces >= 5) return no("Ya mandaste varios reclamos este mes. Escríbenos desde Ayuda.", "You sent several claims this month. Write to us from Help.");
  const ip = await ipCliente();
  const r = await tx(async (c) => {
    let cols: Record<string, unknown>;
    if (x.metodo === "codigo") {
      if (a.b.owner || !a.b.phone) return "doc";
      const v = await verificarCodigoReclamo(c, a.b.phone, String(x.codigo ?? ""));
      if (v !== "ok") return v;
      cols = { method: "call_code", call_phone: a.b.phone, call_verified_at: new Date().toISOString() };
    } else {
      const kind = DOCS.has(String(x.docKind)) ? String(x.docKind) : null;
      if (!kind) return "dockind";
      if (typeof x.doc !== "string" || !UUID.test(x.doc)) return "foto";
      const m = (await c.query(`select 1 from media where id = $1::uuid and owner_kind = 'claim' and owner_id = $2 and private for update`, [x.doc, a.me.id])).rowCount;
      if (!m) return "foto";
      cols = { method: "document", doc_kind: kind, doc_media: x.doc };
    }
    const cl = (await c.query<{ id: string }>(
      `insert into claims (business_id, user_id, city_id, role, method, doc_kind, doc_media, call_phone, call_verified_at, note, status, had_owner_id, owner_notified_at, source, ip)
       values ($1, $2, $3, $4, $5, $6, $7::uuid, $8, $9::timestamptz, $10, 'pending', $11, case when $11::uuid is null then null else now() end, $12, $13::inet) returning id`,
      [a.b.id, a.me.id, a.b.city_id, rol, cols.method, cols.doc_kind ?? null, cols.doc_media ?? null, cols.call_phone ?? null, cols.call_verified_at ?? null, nota || null, a.b.owner, origen, ip])).rows[0]!;
    if (cols.doc_media) await c.query(`update media set owner_id = $2 where id = $1::uuid`, [cols.doc_media, cl.id]);
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ('cambio', 'claim', $1, $2, $3, $4)`,
      [cl.id, a.b.id, a.b.city_id, cols.method === "call_code" ? "alta" : "normal"]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'reclamo.crear', 'business', $2, $3, $4::jsonb)`,
      [a.me.id, a.b.id, a.b.city_id, JSON.stringify({ reclamo: cl.id, metodo: cols.method, rol, tenia_dueno: !!a.b.owner })]);
    return { id: cl.id };
  });
  if (typeof r === "string") {
    const t = r === "doc" ? ["Este negocio se recupera con un documento.", "This business is recovered with a document."]
      : r === "dockind" ? ["Elige qué documento es.", "Choose which document it is."]
      : r === "foto" ? ["Sube una foto del documento.", "Upload a photo of the document."]
      : ERR[r] ?? ERR.codigo_incorrecto!;
    return no(t[0]!, t[1]!);
  }
  revalidatePath(`/recuperar/${a.b.id}`);
  await evento("reclamar", { ref: a.b.id, ciudad: a.b.city_id, userId: a.me.id, props: { metodo: x.metodo } });
  return { ok: true, reclamo: r.id };
}
