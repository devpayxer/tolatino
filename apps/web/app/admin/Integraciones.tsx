"use client";
/* 8a · Super Admin › Sistema › Integraciones › Llaves de las tiendas (hueco #7 del plan de la Fase 8: tabs + rows + el campo de archivo con
   su huella; compuesto con PanelBloques, Icon y Button del sistema). Una fila por tipo de llave: la viva (versión, huella, quién, cuándo,
   vence, lecturas) o «Falta». Subir: el código otra vez al teléfono del Admin → el archivo → la huella. Retirar con motivo. El contenido de
   una llave nunca llega a esta pantalla (el servidor solo contesta la huella). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { FilaLlave } from "@/lib/tiendas/llavero";
import type { IntentoCi, LecturaCi } from "@/lib/tiendas/tuberia";
import { llaveComprobar, llaveRetirar } from "./acciones-apps";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<"Icon" | "Button", ComponentType<any>>;
type Tipo = { k: string; es: string; ext: string[] };
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
export const huellaCorta = (h: string) => `${h.slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ")} … ${h.slice(-4)}`;
const EXTRA: Record<string, { k: string; l: string; ph: string } | undefined> = {
  asc_api_key: { k: "emisor", l: "ISSUER ID (DE APP STORE CONNECT)", ph: "57246542-96fe-1a63-e053-0824d011072a" },
  apns_key: { k: "equipo", l: "TEAM ID (DE APPLE DEVELOPER)", ph: "A1B2C3D4E5" },
  // 8g · Google Wallet: el ID del emisor (Google Pay & Wallet Console) va con la cuenta de servicio.
  google_wallet_sa: { k: "emisor", l: "ISSUER ID (DE GOOGLE PAY & WALLET CONSOLE)", ph: "3388000000012345678" },
  android_upload_keystore: { k: "alias", l: "ALIAS DE LA LLAVE", ph: "subida" },
};

// 8h · Lo que dice cada intento de la tubería (ci_oidc_log.motivo), en palabras.
const MOTIVO_CI: Record<string, string> = { ok: "Entró", sin_https: "Llegó sin HTTPS", sin_token: "Sin token", mal_formado: "Token mal formado", alg: "Algoritmo que no es RS256", kid: "Llave que no es de GitHub",
  firma: "Firma que no verifica", jwks: "No se pudo leer el JWKS de GitHub", iss: "Emisor ajeno", aud: "Audiencia ajena", sub: "Sujeto ajeno", repo: "Otro repositorio", dueno: "Otro dueño", entorno: "Otro entorno",
  rama: "Rama no permitida", evento: "Evento no permitido", flujo: "Otro flujo", runner: "Runner propio", pr: "Desde un pull request", vencido: "Token vencido", antes_de_tiempo: "Token del futuro",
  vida: "Tiempos raros", jti: "Datos del run raros", jti_repetido: "Token repetido", limite: "Demasiados intentos", apagado: "Tubería apagada", pedido_invalido: "Pedido mal armado",
  build_ajeno: "Build de otro run", sin_llave: "Falta la llave", error: "Error del servidor" };
export function Integraciones({ filas, tipos, admin, listo, subir: subirInicial = null, ci = null }: { filas: FilaLlave[]; tipos: Tipo[]; admin: boolean; listo: boolean; subir?: string | null; ci?: { lecturas: LecturaCi[]; intentos: IntentoCi[] } | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  // 8g · Desde Integraciones › Wallet se llega directo a «Subir» del certificado del pase o de la cuenta de Google (?subir=).
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [subir, setSubir] = useState<Tipo | null>(admin && listo ? tipos.find((t) => t.k === subirInicial) ?? null : null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA · INTEGRACIONES", t: "Llaves de las tiendas", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (subir) return <Subir t={subir} desk={desk} onBack={() => setSubir(null)} onHecho={(m) => { setSubir(null); setToast(m); router.refresh(); }} />;
  const vivas = new Map(filas.filter((f) => !f.retirada).map((f) => [f.kind as string, f]));
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Integraciones", s: "Las llaves que Apple y Google entregan solo al dueño de la cuenta viven aquí, cifradas en el servidor. Se ve su huella, nunca su contenido; cada lectura queda anotada.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    // 8c · Integraciones › Push (IntegracionesPush.tsx).
    { type: "chips", items: [{ l: "Llaves de las tiendas", v: "selected", onClick: () => undefined }, { l: "Push", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=push") },
      { l: "Wallet", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=wallet") }] },
    listo ? { type: "note", tone: "info", icon: "lock", t: admin ? "Para subir una llave te mandamos un código a tu teléfono. El archivo se cifra en el servidor y no se vuelve a mostrar." : "Solo un Admin sube o retira llaves." }
      : { type: "note", tone: "danger", icon: "warning", t: "Falta la llave del llavero en los secretos del entorno: no se puede guardar ninguna llave." },
    { type: "group", k: `LLAVES DE LAS TIENDAS · ${vivas.size} DE ${tipos.length}` },
  ];
  const items: Fila[] = tipos.map((t) => {
    const f = vivas.get(t.k);
    const datos = f ? Object.entries(f.meta).map(([k, v]) => `${k.replace("_", " ")} ${v}`).join(" · ") : "";
    return {
      key: t.k, icon: f ? "key" : "lock", t: t.es,
      s: f ? [`v${f.version} · SHA-256 ${huellaCorta(f.fingerprint)}`, datos, `${f.quien ?? "equipo"} · ${cuando(f.at)}`, f.vence ? `vence ${f.vence}` : null, `${f.lecturas} ${f.lecturas === 1 ? "lectura" : "lecturas"}${f.ultima ? ` · última ${cuando(f.ultima)}${f.ultimaOk === false ? " (falló)" : ""}` : ""}`].filter(Boolean).join(" · ")
        : `Falta · archivo ${t.ext.join(" o ")}`,
      tag: f ? "VIVA" : "FALTA", tone: f ? "signal" : "neutral",
      ...(admin && listo ? { acts: [
        { l: f ? "Reemplazar" : "Subir archivo", icon: "plus", onClick: () => setSubir(t) },
        ...(f ? [{ l: "Comprobar", icon: "check", onClick: () => { void llaveComprobar(f.id).then((r) => { setToast(r.mensaje ?? ""); router.refresh(); }); } },
          { l: "Retirar", icon: "trash", onClick: () => setConf({ titulo: `Retirar ${t.es}`, cta: "Retirar", peligro: true, sub: `Versión ${f.version} · ${huellaCorta(f.fingerprint)}. Deja de usarse al instante; el registro queda.`, plantillas: ["La llave se filtró o se revocó en Apple / Google", "Ya no se usa"], hacer: (m) => llaveRetirar(f.id, m) }) }] : []),
      ] } : {}),
    };
  });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items });
  // 8h · El CI de las tiendas lee por OIDC (sin ninguna llave en GitHub): cada lectura con su run y su commit, y cada intento con su motivo.
  if (ci) {
    const nombre = (k: string) => tipos.find((t) => t.k === k)?.es ?? k;
    B.push({ type: "group", k: `LECTURAS DEL CI · ${ci.lecturas.length}` });
    B.push(ci.lecturas.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ci.lecturas.map((l, i): Fila => ({ key: `l${i}`, icon: "key", t: `${nombre(l.tipo)} · run ${l.run ?? "—"}`,
      s: [l.para, l.sha ? `commit ${l.sha.slice(0, 7)}` : null, cuando(l.at)].filter(Boolean).join(" · "), tag: l.ok ? "LEÍDA" : "FALLÓ", tone: l.ok ? "signal" : "danger", chev: false })) }
      : { type: "empty", icon: "key", t: "El CI no ha leído ninguna llave", s: "La tubería de las tiendas pide sus llaves por OIDC y solo por HTTPS; cada lectura sale aquí con su run." });
    B.push({ type: "group", k: "INTENTOS DE LA TUBERÍA · LOS RECHAZADOS Y LOS ÚLTIMOS QUE ENTRARON" });
    B.push(ci.intentos.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ci.intentos.map((x, i): Fila => ({ key: `i${i}`, icon: x.ok ? "check" : "warning", t: `${MOTIVO_CI[x.motivo] ?? x.motivo} · ${x.para}`,
      s: [x.ref ? x.ref.replace("refs/heads/", "rama ") : null, x.run ? `run ${x.run}` : null, x.detalle, cuando(x.at)].filter(Boolean).join(" · "), tag: x.ok ? "ENTRÓ" : "RECHAZADO", tone: x.ok ? "signal" : "danger", chev: false })) }
      : { type: "empty", icon: "check", t: "Sin intentos todavía", s: "Cada token que llega a la tubería queda anotado aquí, entre o no." });
  }
  const retiradas = filas.filter((f) => f.retirada);
  if (retiradas.length) B.push({ type: "rows", k: "RETIRADAS · 180 DÍAS", items: retiradas.map((f): Fila => ({ key: f.id, icon: "lock", dim: true, t: `${tipos.find((t) => t.k === f.kind)?.es ?? f.kind} · v${f.version}`,
    s: `SHA-256 ${huellaCorta(f.fingerprint)} · retirada ${cuando(f.retirada!)} · ${f.motivo ?? ""}` })) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* Subir: el código al teléfono del Admin, el archivo y su motivo. Lo que vuelve del servidor es la huella. */
function Subir({ t, desk, onBack, onHecho }: { t: Tipo; desk: boolean; onBack: () => void; onHecho: (m: string) => void }) {
  const [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null), [pedido, setPedido] = useState(false);
  const [motivo, setMotivo] = useState(""), [extra, setExtra] = useState(""), [vence, setVence] = useState(""), [archivo, setArchivo] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null), [enviando, setEnviando] = useState(false), [huella, setHuella] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null), ex = EXTRA[t.k];
  const pedir = async () => {
    setErr(null);
    const r = await fetch("/api/admin/llavero/codigo", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, msg: "Sin conexión." })) as { ok: boolean; msg?: string; codigoPrueba?: string };
    if (!r.ok) { setErr(r.msg ?? "No se pudo."); return; }
    setPedido(true); setPrueba(r.codigoPrueba ?? null);
  };
  const enviar = async () => {
    if (!archivo) { setErr("Elige el archivo."); return; }
    setEnviando(true); setErr(null);
    const f = new FormData();
    f.set("tipo", t.k); f.set("codigo", codigo.trim()); f.set("motivo", motivo); f.set("archivo", archivo);
    if (vence) f.set("vence", vence);
    if (ex && extra.trim()) f.set(ex.k, extra.trim());
    const r = await fetch("/api/admin/llavero", { method: "POST", body: f }).then((x) => x.json()).catch(() => ({ ok: false, msg: "Sin conexión." })) as { ok: boolean; msg?: string; huella?: string };
    setEnviando(false);
    if (!r.ok) { setErr(r.msg ?? "No se pudo."); return; }
    setHuella(r.huella ?? null); setArchivo(null); if (input.current) input.current.value = "";
    onHecho(r.msg ?? "Guardada.");
  };
  const B: Bloque[] = [
    { type: "head", eye: "INTEGRACIONES · LLAVES DE LAS TIENDAS", t: t.es, s: `Un archivo ${t.ext.join(" o ")} que te dio Apple o Google. Se cifra en el servidor; después solo se ve su huella.`, onBack, h1: desk ? 26 : 22 },
  ];
  if (!pedido) B.push({ type: "note", tone: "info", icon: "lock", t: "Primero te mandamos un código a tu teléfono (el de tu cuenta de Admin).", cta: "Mandar el código", onCta: () => { void pedir(); } });
  else {
    if (prueba) B.push({ type: "note", tone: "warn", icon: "info", t: `MODO PRUEBAS · tu código es ${prueba}` });
    B.push({ type: "field", k: "CÓDIGO DE 6 NÚMEROS", val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "000000", im: "numeric", max: 6 });
  }
  if (ex) B.push({ type: "field", k: ex.l, val: extra, onChange: setExtra, ph: ex.ph, max: 80 });
  B.push({ type: "field", k: "VENCE (OPCIONAL · AAAA-MM-DD)", val: vence, onChange: (v) => setVence(v.replace(/[^\d-]/g, "").slice(0, 10)), ph: "2027-11-11", max: 10 });
  B.push({ type: "field", k: "MOTIVO (QUEDA EN LA AUDITORÍA)", val: motivo, onChange: setMotivo, ph: "Llave nueva de Apple", max: 300 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <label data-campo="archivo" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, background: "var(--tl-white)", border: "1px dashed rgba(11,14,18,.22)", cursor: "pointer" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(75,55,245,.08)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="folder" size={18} color="var(--tl-action)" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", font: "700 14px/1.3 Manrope,sans-serif" }}>{archivo ? archivo.name : "Elegir el archivo"}</span>
          <span style={{ display: "block", marginTop: 2, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{archivo ? `${(archivo.size / 1024).toFixed(1)} KB · se cifra al guardar` : `Desde Archivos o Descargas · ${t.ext.join(" o ")} · hasta 64 KB`}</span>
        </span>
        <input ref={input} type="file" accept={t.ext.join(",")} style={{ display: "none" }} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      {err ? <PanelBloques bloques={[{ type: "note", tone: "danger", icon: "warning", t: err }]} /> : null}
      {huella ? <PanelBloques bloques={[{ type: "note", tone: "ok", icon: "check", t: `Guardada · SHA-256 ${huellaCorta(huella)}` }]} /> : null}
      <div style={{ display: "flex" }}><Button variant="primary" block disabled={!pedido || codigo.length !== 6 || !archivo || motivo.trim().length < 3 || enviando} onClick={() => { void enviar(); }}>{enviando ? "Guardando…" : "Guardar en el llavero"}</Button></div>
    </div>);
}
