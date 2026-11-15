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
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<"Icon" | "Button", ComponentType<any>>;
type Tipo = { k: string; es: string; en?: string; ext: string[] };
type EF = (es: string, en: string) => string;
const cuandoE = (E: EF) => (iso: string) => new Intl.DateTimeFormat(E("es-US", "en-US"), { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
export const huellaCorta = (h: string) => `${h.slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ")} … ${h.slice(-4)}`;
const EXTRA = (E: EF): Record<string, { k: string; l: string; ph: string } | undefined> => ({
  asc_api_key: { k: "emisor", l: E("ISSUER ID (DE APP STORE CONNECT)", "ISSUER ID (FROM APP STORE CONNECT)"), ph: "57246542-96fe-1a63-e053-0824d011072a" },
  apns_key: { k: "equipo", l: E("TEAM ID (DE APPLE DEVELOPER)", "TEAM ID (FROM APPLE DEVELOPER)"), ph: "A1B2C3D4E5" },
  // 8g · Google Wallet: el ID del emisor (Google Pay & Wallet Console) va con la cuenta de servicio.
  google_wallet_sa: { k: "emisor", l: E("ISSUER ID (DE GOOGLE PAY & WALLET CONSOLE)", "ISSUER ID (FROM GOOGLE PAY & WALLET CONSOLE)"), ph: "3388000000012345678" },
  android_upload_keystore: { k: "alias", l: E("ALIAS DE LA LLAVE", "KEY ALIAS"), ph: "subida" },
});

// 8h · Lo que dice cada intento de la tubería (ci_oidc_log.motivo), en palabras.
const MOTIVO_CI = (E: EF): Record<string, string> => ({ ok: E("Entró", "Accepted"), sin_https: E("Llegó sin HTTPS", "Arrived without HTTPS"), sin_token: E("Sin token", "No token"), mal_formado: E("Token mal formado", "Malformed token"), alg: E("Algoritmo que no es RS256", "Algorithm other than RS256"), kid: E("Llave que no es de GitHub", "Key not from GitHub"),
  firma: E("Firma que no verifica", "Signature does not verify"), jwks: E("No se pudo leer el JWKS de GitHub", "Could not read GitHub’s JWKS"), iss: E("Emisor ajeno", "Foreign issuer"), aud: E("Audiencia ajena", "Foreign audience"), sub: E("Sujeto ajeno", "Foreign subject"), repo: E("Otro repositorio", "Other repository"), dueno: E("Otro dueño", "Other owner"), entorno: E("Otro entorno", "Other environment"),
  rama: E("Rama no permitida", "Branch not allowed"), evento: E("Evento no permitido", "Event not allowed"), flujo: E("Otro flujo", "Other workflow"), runner: E("Runner propio", "Self-hosted runner"), pr: E("Desde un pull request", "From a pull request"), vencido: E("Token vencido", "Expired token"), antes_de_tiempo: E("Token del futuro", "Token from the future"),
  vida: E("Tiempos raros", "Odd timestamps"), jti: E("Datos del run raros", "Odd run data"), jti_repetido: E("Token repetido", "Repeated token"), limite: E("Demasiados intentos", "Too many attempts"), apagado: E("Tubería apagada", "Pipeline off"), pedido_invalido: E("Pedido mal armado", "Malformed request"),
  build_ajeno: E("Build de otro run", "Build from another run"), sin_llave: E("Falta la llave", "Key missing"), error: E("Error del servidor", "Server error") });
export function Integraciones({ filas, tipos, admin, listo, subir: subirInicial = null, ci = null }: { filas: FilaLlave[]; tipos: Tipo[]; admin: boolean; listo: boolean; subir?: string | null; ci?: { lecturas: LecturaCi[]; intentos: IntentoCi[] } | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), cuando = cuandoE(E), nomT = (t: Tipo) => E(t.es, t.en ?? t.es);
  // 8g · Desde Integraciones › Wallet se llega directo a «Subir» del certificado del pase o de la cuenta de Google (?subir=).
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [subir, setSubir] = useState<Tipo | null>(admin && listo ? tipos.find((t) => t.k === subirInicial) ?? null : null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · INTEGRACIONES", "SYSTEM · INTEGRATIONS"), t: E("Llaves de las tiendas", "Store keys"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (subir) return <Subir t={subir} desk={desk} onBack={() => setSubir(null)} onHecho={(m) => { setSubir(null); setToast(m); router.refresh(); }} />;
  const vivas = new Map(filas.filter((f) => !f.retirada).map((f) => [f.kind as string, f]));
  const B: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Integraciones", "Integrations"), s: E("Las llaves que Apple y Google entregan solo al dueño de la cuenta viven aquí, cifradas en el servidor. Se ve su huella, nunca su contenido; cada lectura queda anotada.", "The keys Apple and Google give only to the account owner live here, encrypted on the server. You see their fingerprint, never their content; every read is logged."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    // 8c · Integraciones › Push (IntegracionesPush.tsx).
    { type: "chips", items: [{ l: E("Llaves de las tiendas", "Store keys"), v: "selected", onClick: () => undefined }, { l: "Push", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=push") },
      { l: "Wallet", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=wallet") }] },
    listo ? { type: "note", tone: "info", icon: "lock", t: admin ? E("Para subir una llave te mandamos un código a tu teléfono. El archivo se cifra en el servidor y no se vuelve a mostrar.", "To upload a key we send a code to your phone. The file is encrypted on the server and never shown again.") : E("Solo un Admin sube o retira llaves.", "Only an Admin uploads or withdraws keys.") }
      : { type: "note", tone: "danger", icon: "warning", t: E("Falta la llave del llavero en los secretos del entorno: no se puede guardar ninguna llave.", "The keychain key is missing from the environment secrets: no key can be saved.") },
    { type: "group", k: E(`LLAVES DE LAS TIENDAS · ${vivas.size} DE ${tipos.length}`, `STORE KEYS · ${vivas.size} OF ${tipos.length}`) },
  ];
  const items: Fila[] = tipos.map((t) => {
    const f = vivas.get(t.k);
    const datos = f ? Object.entries(f.meta).map(([k, v]) => `${k.replace("_", " ")} ${v}`).join(" · ") : "";
    return {
      key: t.k, icon: f ? "key" : "lock", t: nomT(t),
      s: f ? [`v${f.version} · SHA-256 ${huellaCorta(f.fingerprint)}`, datos, `${f.quien ?? E("equipo", "team")} · ${cuando(f.at)}`, f.vence ? `${E("vence", "expires")} ${f.vence}` : null, `${f.lecturas} ${f.lecturas === 1 ? E("lectura", "read") : E("lecturas", "reads")}${f.ultima ? ` · ${E("última", "last")} ${cuando(f.ultima)}${f.ultimaOk === false ? E(" (falló)", " (failed)") : ""}` : ""}`].filter(Boolean).join(" · ")
        : E(`Falta · archivo ${t.ext.join(" o ")}`, `Missing · ${t.ext.join(" or ")} file`),
      tag: f ? E("VIVA", "LIVE") : E("FALTA", "MISSING"), tone: f ? "signal" : "neutral",
      ...(admin && listo ? { acts: [
        { l: f ? E("Reemplazar", "Replace") : E("Subir archivo", "Upload file"), icon: "plus", onClick: () => setSubir(t) },
        ...(f ? [{ l: E("Comprobar", "Check"), icon: "check", onClick: () => { void llaveComprobar(f.id).then((r) => { setToast(r.mensaje ?? ""); router.refresh(); }); } },
          { l: E("Retirar", "Withdraw"), icon: "trash", onClick: () => setConf({ titulo: E(`Retirar ${nomT(t)}`, `Withdraw ${nomT(t)}`), cta: E("Retirar", "Withdraw"), peligro: true, sub: E(`Versión ${f.version} · ${huellaCorta(f.fingerprint)}. Deja de usarse al instante; el registro queda.`, `Version ${f.version} · ${huellaCorta(f.fingerprint)}. Stops being used immediately; the record stays.`), plantillas: [E("La llave se filtró o se revocó en Apple / Google", "The key leaked or was revoked at Apple / Google"), E("Ya no se usa", "No longer used")], hacer: (m) => llaveRetirar(f.id, m) }) }] : []),
      ] } : {}),
    };
  });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items });
  // 8h · El CI de las tiendas lee por OIDC (sin ninguna llave en GitHub): cada lectura con su run y su commit, y cada intento con su motivo.
  if (ci) {
    const nombre = (k: string) => ((t) => (t ? nomT(t) : k))(tipos.find((t) => t.k === k));
    B.push({ type: "group", k: `${E("LECTURAS DEL CI", "CI READS")} · ${ci.lecturas.length}` });
    B.push(ci.lecturas.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ci.lecturas.map((l, i): Fila => ({ key: `l${i}`, icon: "key", t: `${nombre(l.tipo)} · run ${l.run ?? "—"}`,
      s: [l.para, l.sha ? `commit ${l.sha.slice(0, 7)}` : null, cuando(l.at)].filter(Boolean).join(" · "), tag: l.ok ? E("LEÍDA", "READ") : E("FALLÓ", "FAILED"), tone: l.ok ? "signal" : "danger", chev: false })) }
      : { type: "empty", icon: "key", t: E("El CI no ha leído ninguna llave", "CI hasn’t read any key"), s: E("La tubería de las tiendas pide sus llaves por OIDC y solo por HTTPS; cada lectura sale aquí con su run.", "The store pipeline requests its keys via OIDC and only over HTTPS; every read shows here with its run.") });
    B.push({ type: "group", k: E("INTENTOS DE LA TUBERÍA · LOS RECHAZADOS Y LOS ÚLTIMOS QUE ENTRARON", "PIPELINE ATTEMPTS · REJECTED ONES AND THE LATEST ACCEPTED") });
    B.push(ci.intentos.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ci.intentos.map((x, i): Fila => ({ key: `i${i}`, icon: x.ok ? "check" : "warning", t: `${MOTIVO_CI(E)[x.motivo] ?? x.motivo} · ${x.para}`,
      s: [x.ref ? x.ref.replace("refs/heads/", E("rama ", "branch ")) : null, x.run ? `run ${x.run}` : null, x.detalle, cuando(x.at)].filter(Boolean).join(" · "), tag: x.ok ? E("ENTRÓ", "ACCEPTED") : E("RECHAZADO", "REJECTED"), tone: x.ok ? "signal" : "danger", chev: false })) }
      : { type: "empty", icon: "check", t: E("Sin intentos todavía", "No attempts yet"), s: E("Cada token que llega a la tubería queda anotado aquí, entre o no.", "Every token that reaches the pipeline is logged here, accepted or not.") });
  }
  const retiradas = filas.filter((f) => f.retirada);
  if (retiradas.length) B.push({ type: "rows", k: E("RETIRADAS · 180 DÍAS", "WITHDRAWN · 180 DAYS"), items: retiradas.map((f): Fila => ({ key: f.id, icon: "lock", dim: true, t: `${((t) => (t ? nomT(t) : f.kind))(tipos.find((t) => t.k === f.kind))} · v${f.version}`,
    s: `SHA-256 ${huellaCorta(f.fingerprint)} · ${E("retirada", "withdrawn")} ${cuando(f.retirada!)} · ${f.motivo ?? ""}` })) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* Subir: el código al teléfono del Admin, el archivo y su motivo. Lo que vuelve del servidor es la huella. */
function Subir({ t, desk, onBack, onHecho }: { t: Tipo; desk: boolean; onBack: () => void; onHecho: (m: string) => void }) {
  const [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null), [pedido, setPedido] = useState(false);
  const [motivo, setMotivo] = useState(""), [extra, setExtra] = useState(""), [vence, setVence] = useState(""), [archivo, setArchivo] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null), [enviando, setEnviando] = useState(false), [huella, setHuella] = useState<string | null>(null);
  const E = useE(), nomT = E(t.es, t.en ?? t.es);
  const input = useRef<HTMLInputElement>(null), ex = EXTRA(E)[t.k];
  const pedir = async () => {
    setErr(null);
    const r = await fetch("/api/admin/llavero/codigo", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, msg: E("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string; codigoPrueba?: string };
    if (!r.ok) { setErr(r.msg ?? E("No se pudo.", "It didn’t work.")); return; }
    setPedido(true); setPrueba(r.codigoPrueba ?? null);
  };
  const enviar = async () => {
    if (!archivo) { setErr(E("Elige el archivo.", "Choose the file.")); return; }
    setEnviando(true); setErr(null);
    const f = new FormData();
    f.set("tipo", t.k); f.set("codigo", codigo.trim()); f.set("motivo", motivo); f.set("archivo", archivo);
    if (vence) f.set("vence", vence);
    if (ex && extra.trim()) f.set(ex.k, extra.trim());
    const r = await fetch("/api/admin/llavero", { method: "POST", body: f }).then((x) => x.json()).catch(() => ({ ok: false, msg: E("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string; huella?: string };
    setEnviando(false);
    if (!r.ok) { setErr(r.msg ?? E("No se pudo.", "It didn’t work.")); return; }
    setHuella(r.huella ?? null); setArchivo(null); if (input.current) input.current.value = "";
    onHecho(r.msg ?? E("Guardada.", "Saved."));
  };
  const B: Bloque[] = [
    { type: "head", eye: E("INTEGRACIONES · LLAVES DE LAS TIENDAS", "INTEGRATIONS · STORE KEYS"), t: nomT, s: E(`Un archivo ${t.ext.join(" o ")} que te dio Apple o Google. Se cifra en el servidor; después solo se ve su huella.`, `A ${t.ext.join(" or ")} file Apple or Google gave you. It is encrypted on the server; afterwards only its fingerprint shows.`), onBack, h1: desk ? 26 : 22 },
  ];
  if (!pedido) B.push({ type: "note", tone: "info", icon: "lock", t: E("Primero te mandamos un código a tu teléfono (el de tu cuenta de Admin).", "First we send a code to your phone (the one on your Admin account)."), cta: E("Mandar el código", "Send the code"), onCta: () => { void pedir(); } });
  else {
    if (prueba) B.push({ type: "note", tone: "warn", icon: "info", t: E(`MODO PRUEBAS · tu código es ${prueba}`, `TEST MODE · your code is ${prueba}`) });
    B.push({ type: "field", k: E("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "000000", im: "numeric", max: 6 });
  }
  if (ex) B.push({ type: "field", k: ex.l, val: extra, onChange: setExtra, ph: ex.ph, max: 80 });
  B.push({ type: "field", k: E("VENCE (OPCIONAL · AAAA-MM-DD)", "EXPIRES (OPTIONAL · YYYY-MM-DD)"), val: vence, onChange: (v) => setVence(v.replace(/[^\d-]/g, "").slice(0, 10)), ph: "2027-11-11", max: 10 });
  B.push({ type: "field", k: E("MOTIVO (QUEDA EN LA AUDITORÍA)", "REASON (KEPT IN THE AUDIT LOG)"), val: motivo, onChange: setMotivo, ph: E("Llave nueva de Apple", "New key from Apple"), max: 300 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <label data-campo="archivo" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, background: "var(--tl-white)", border: "1px dashed rgba(11,14,18,.22)", cursor: "pointer" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(75,55,245,.08)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="folder" size={18} color="var(--tl-action)" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", font: "700 14px/1.3 Manrope,sans-serif" }}>{archivo ? archivo.name : E("Elegir el archivo", "Choose the file")}</span>
          <span style={{ display: "block", marginTop: 2, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{archivo ? `${(archivo.size / 1024).toFixed(1)} KB · ${E("se cifra al guardar", "encrypted on save")}` : E(`Desde Archivos o Descargas · ${t.ext.join(" o ")} · hasta 64 KB`, `From Files or Downloads · ${t.ext.join(" or ")} · up to 64 KB`)}</span>
        </span>
        <input ref={input} type="file" accept={t.ext.join(",")} style={{ display: "none" }} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      {err ? <PanelBloques bloques={[{ type: "note", tone: "danger", icon: "warning", t: err }]} /> : null}
      {huella ? <PanelBloques bloques={[{ type: "note", tone: "ok", icon: "check", t: `${E("Guardada", "Saved")} · SHA-256 ${huellaCorta(huella)}` }]} /> : null}
      <div style={{ display: "flex" }}><Button variant="primary" block disabled={!pedido || codigo.length !== 6 || !archivo || motivo.trim().length < 3 || enviando} onClick={() => { void enviar(); }}>{enviando ? E("Guardando…", "Saving…") : E("Guardar en el llavero", "Save to the keychain")}</Button></div>
    </div>);
}
