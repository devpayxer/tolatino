import "server-only";
import { generateKeyPairSync, X509Certificate } from "node:crypto";
import type { PoolClient } from "pg";
import { hoyEn } from "../fecha-local";
import { auditar } from "../admin";
import { valores } from "../config";
import { db } from "../db";
import { guardar, huellaDe, leer } from "../tiendas/llavero";
import { HOSTS_AIA, olvidarCredenciales, TIPO_PASE_DEF } from "./credenciales";
import { certificadosPem, datosCertificado, pemDe, solicitudCertificado } from "./der";

/* 8g · El certificado del Pass Type ID de Apple Wallet (fase8-apps.md §10 Paquete 8-2 (8): «subir el CSR que genera el servidor y bajar el
   certificado: dos archivos»). La llave privada NACE en el servidor y nunca sale del llavero:
   1. generarSolicitud(): una llave RSA 2048 nueva → el llavero (pass_type_csr) → la solicitud CSR (PKCS#10, solo la parte pública), que el
      fundador sube en developer.apple.com › Identifiers › Pass Type ID › Create Certificate. El certificado vivo (si hay) sigue funcionando.
   2. completar(): el .cer que devuelve Apple → se comprueba que es de NUESTRA llave, que dice el Pass Type ID (UID) y el equipo (OU), se baja su
      intermedio (WWDR) de la dirección que el mismo certificado declara (AIA «CA Issuers»; solo de Apple, o del simulador en pruebas) y se
      comprueba que lo firmó → el llavero guarda llave + certificado + intermedio (pass_type_cert, con su vencimiento) y retira la solicitud.
   3. avisarVencimiento() (barrido): a pase_cert_aviso_dias (30) de vencer, y al vencer, un aviso a los Admins (una vez por versión y etapa).
   El repo es PÚBLICO: ningún certificado ni llave va en él (guardián llavesFueraDelRepo). */

/* 1 · La solicitud. Devuelve el CSR (público). */
export async function generarSolicitud(c: PoolClient, actor: string, motivo: string, tipo = TIPO_PASE_DEF): Promise<{ csr: string; huella: string }> {
  if (!/^pass\.[A-Za-z0-9.-]{3,120}$/.test(tipo)) throw new Error("tipo");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }) as string, csr = solicitudCertificado(privateKey, `To'Latino ${tipo}`);
  const r = await guardar(c, { tipo: "pass_type_csr", contenido: Buffer.from(pem), meta: { pass_type_id: tipo, csr: huellaDe(Buffer.from(csr)).slice(0, 16) }, vence: null, actor, motivo });
  return { csr, huella: r.huella };
}
/* La solicitud otra vez (para bajarla de nuevo): se rehace con la llave guardada (RSA PKCS#1 v1.5 da la misma firma). */
export async function solicitudVigente(): Promise<string | null> {
  const m = (await db().query<{ tipo: string }>(`select meta->>'pass_type_id' as tipo from store_secrets where kind = 'pass_type_csr' and retired_at is null`)).rows[0];
  if (!m) return null;
  const k = await leer("pass_type_csr", "wallet · bajar la solicitud del certificado");
  return k ? solicitudCertificado(k.toString("utf8"), `To'Latino ${m.tipo}`) : null;
}

/* 2a · Revisar el .cer ANTES de la transacción (lleva red: el intermedio). Devuelve el PEM listo para el llavero y sus datos públicos. */
export type CertListo = { pem: Buffer; meta: Record<string, string>; vence: string };
export async function revisarCertificado(archivo: Buffer): Promise<{ ok: true; x: CertListo } | { ok: false; msg: string }> {
  let der: Buffer;
  const txt = archivo.toString("latin1");
  if (/-----BEGIN CERTIFICATE-----/.test(txt)) { const L = certificadosPem(txt); if (L.length !== 1) return { ok: false, msg: "Sube solo el certificado que te dio Apple (un archivo .cer)." }; der = L[0]!; }
  else der = archivo;
  let d: ReturnType<typeof datosCertificado>;
  const llave = await leer("pass_type_csr", "wallet · completar el certificado");
  if (!llave) return { ok: false, msg: "Primero genera la solicitud (CSR) aquí y súbela a Apple: el certificado tiene que ser de esa solicitud." };
  try { d = datosCertificado(der, llave.toString("utf8")); } catch { return { ok: false, msg: "No es un certificado (.cer) válido." }; }
  if (!d.propia) return { ok: false, msg: "Ese certificado no es de la solicitud que generamos (la llave no coincide). Sube el de la solicitud vigente." };
  if (!d.tipo || !/^pass\.[A-Za-z0-9.-]{3,120}$/.test(d.tipo) || !d.equipo || !/^[A-Z0-9]{10}$/.test(d.equipo)) return { ok: false, msg: "No es un certificado de Pass Type ID (le falta el identificador «pass.…» o el equipo)." };
  if (d.vence.getTime() <= Date.now()) return { ok: false, msg: "Ese certificado ya venció." };
  // El intermedio: de la dirección que el certificado declara, solo si es de Apple (o del simulador en pruebas).
  if (!d.emisorUrl) return { ok: false, msg: "El certificado no dice dónde está su intermedio (AIA)." };
  let u: URL;
  try { u = new URL(d.emisorUrl); } catch { return { ok: false, msg: "La dirección del intermedio no es válida." }; }
  if (!HOSTS_AIA().includes(u.host) || !/^https?:$/.test(u.protocol)) return { ok: false, msg: `El intermedio no es de Apple (${u.host}).` };
  let inter: X509Certificate;
  try {
    const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const b = Buffer.from(await r.arrayBuffer());
    if (!r.ok || b.length > 16_384) throw new Error("http");
    inter = new X509Certificate(/-----BEGIN CERTIFICATE-----/.test(b.toString("latin1")) ? certificadosPem(b.toString("latin1"))[0]! : b);
  } catch { return { ok: false, msg: "No se pudo bajar el intermedio de Apple. Prueba de nuevo." }; }
  if (!d.x.checkIssued(inter) || !d.x.verify(inter.publicKey)) return { ok: false, msg: "El intermedio no firmó este certificado." };
  const pem = Buffer.from(`${llave.toString("utf8").trim()}\n${pemDe(der)}${pemDe(inter.raw)}`);
  llave.fill(0);
  const vence = hoyEn(undefined, d.vence);   // 9b-1 · el día en Hazleton (antes UTC: de noche «vence en 11 días» por uno de 10)
  return { ok: true, x: { pem, vence, meta: { pass_type_id: d.tipo, equipo: d.equipo, emisor: (/CN=([^\n]+)/.exec(inter.subject)?.[1] ?? "").slice(0, 80), certificado: d.huella.slice(0, 16), vence } } };
}
/* 2b · Guardar (dentro de la transacción de quien sube, que ya revisó el permiso y el código) y retirar la solicitud. */
export async function completar(c: PoolClient, x: CertListo, actor: string, motivo: string) {
  const r = await guardar(c, { tipo: "pass_type_cert", contenido: x.pem, meta: x.meta, vence: x.vence, actor, motivo });
  const s = (await c.query<{ id: string }>(`update store_secrets set retired_at = now(), retired_by = $1, retired_reason = $2 where kind = 'pass_type_csr' and retired_at is null returning id::text`,
    [actor, `Usada para el certificado del pase (versión ${r.version})`])).rows[0];
  if (s) await auditar(c, { actor, action: "llavero.retirar", targetKind: "store_secret", targetId: s.id, before: { llave: "Solicitud del certificado del pase" }, after: { estado: "usada" }, reason: "Llegó el certificado de Apple" });
  x.pem.fill(0);
  olvidarCredenciales();
  return r;
}

/* Lo que ve Sistema › Integraciones › Wallet (sin abrir ningún sobre). */
export type EstadoCert = { tipo: string | null; equipo: string | null; vence: string | null; dias: number | null; aviso: number; solicitud: { tipo: string; at: string } | null; version: number | null };
export async function estadoCertificado(): Promise<EstadoCert> {
  const [r, s, a] = await Promise.all([
    db().query<{ tipo: string; equipo: string; vence: string | null; dias: number | null; version: number }>(
      `select meta->>'pass_type_id' as tipo, meta->>'equipo' as equipo, to_char(expires_on, 'YYYY-MM-DD') as vence, (expires_on - current_date)::int as dias, version
         from store_secrets where kind = 'pass_type_cert' and retired_at is null`),
    db().query<{ tipo: string; at: string }>(`select meta->>'pass_type_id' as tipo, to_char(uploaded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from store_secrets where kind = 'pass_type_csr' and retired_at is null`),
    valores("pase_cert_aviso_dias"),
  ]);
  const x = r.rows[0];
  return { tipo: x?.tipo ?? null, equipo: x?.equipo ?? null, vence: x?.vence ?? null, dias: x?.dias ?? null, aviso: a.pase_cert_aviso_dias, solicitud: s.rows[0] ?? null, version: x?.version ?? null };
}

/* 3 · Barrido: el certificado vence en ≤ pase_cert_aviso_dias o ya venció → un aviso a cada Admin, una vez por versión y etapa. */
export async function avisarVencimiento(): Promise<number> {
  const e = await estadoCertificado();
  if (!e.vence || e.dias === null || e.dias > e.aviso) return 0;
  const etapa = e.dias < 0 ? "vencido" : `${e.aviso}d`, ref = `${e.version}:${etapa}`;
  if ((await db().query(`select 1 from notifications where ref_kind = 'pase_cert' and ref_id = $1 limit 1`, [ref])).rowCount) return 0;
  const equipo = (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
  const { avisar } = await import("../avisos");
  const fecha = new Intl.DateTimeFormat("es-US", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${e.vence}T12:00:00Z`));
  for (const u of equipo) await avisar(u.id, "pase_cert_vence", { cuando: e.dias < 0 ? "ya venció" : e.dias === 0 ? "hoy" : `en ${e.dias} días`, tipo: e.tipo ?? "—", fecha },
    { href: "/admin/sistema/integraciones?tab=wallet", ref: ["pase_cert", ref], sinSms: true }).catch(() => undefined);
  return equipo.length;
}
