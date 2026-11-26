"use client";
/* 23 nov · Super Admin › Sistema › Integraciones › Proveedores (docs/REVISION.md «Cómo llegan las llaves de terceros al servidor»): las llaves de TEXTO
   de Stripe, Telnyx, WhatsApp, Amazon SES y Anthropic que usa el servidor de la app. El fundador las pega aquí desde su teléfono: el mismo llavero, el
   mismo permiso (Admin con integ:editar), el mismo código al teléfono y la misma auditoría que las llaves de las tiendas. Compuesto con PanelBloques
   (head, tabs, chips, note, group, rows, field) y Button del sistema; el campo de la llave es el field de siempre con «oculto» (no muestra lo escrito).
   Una llave guardada NUNCA vuelve a esta pantalla: solo su huella corta, versión, quién, cuándo y su última prueba. Rotar = poner otra (la anterior queda
   retirada, con su registro). Retirar, con motivo. «Probar» llama al proveedor con la llamada de solo lectura más barata (lib/llaves-probar.ts). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { FilaLlave, UltimaPrueba } from "@/lib/tiendas/llavero";
import { llaveProbar, llaveRetirar } from "./acciones-apps";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { huellaCorta } from "./Integraciones";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { useE2 } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<"Button", ComponentType<any>>;
type EF = (es: string, en: string) => string;
type Tipo = { k: string; es: string; en: string; prov: string; prueba: boolean };
type Origen = { tipo: string; origen: "entorno" | "llavero" | null; huella: string | null; sombra: boolean };
const PROV = (E2: EF): Record<string, string> => ({ stripe: E2("Stripe · cobros con tarjeta", "Stripe · card payments"), telnyx: E2("Telnyx · SMS (el código para entrar)", "Telnyx · SMS (the sign-in code)"),
  whatsapp: E2("WhatsApp (Meta) · El Compa y avisos", "WhatsApp (Meta) · El Compa and notices"), ses: E2("Amazon SES · correo", "Amazon SES · email"), anthropic: E2("Anthropic · El Compa", "Anthropic · El Compa") });
const cuandoE = (E2: EF) => (iso: string) => new Intl.DateTimeFormat((E2("", "x") === "x" ? "en-US" : "es-US"), { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
/* Lo que dice cada resultado de «Probar» (el servidor solo manda el código). */
export function textoPrueba(E2: EF, r: string): string {
  const m: Record<string, string> = {
    sirve: E2("La llave sirve: el proveedor contestó.", "The key works: the provider answered."),
    rechazada: E2("El proveedor no aceptó la llave: está revocada o se copió mal.", "The provider did not accept the key: it is revoked or was copied wrong."),
    sin_permiso: E2("La llave entra, pero no tiene permiso para esa lectura. Revisa sus permisos en el proveedor.", "The key gets in, but it lacks permission for that read. Check its permissions at the provider."),
    sin_conexion: E2("El proveedor no contestó. Prueba otra vez en un momento.", "The provider did not answer. Try again in a moment."),
    falta: E2("No hay llave que probar.", "There is no key to test."),
    falta_token: E2("Para probar el ID hace falta el token permanente de WhatsApp.", "Testing the ID needs the WhatsApp permanent token."),
    falta_waba: E2("Para probar el token hace falta el ID de la cuenta de negocio de WhatsApp.", "Testing the token needs the WhatsApp business account ID."),
    falta_par: E2("Para probar SES hacen falta las dos: el ID y la llave secreta.", "Testing SES needs both: the ID and the secret key."),
    no_se_prueba: E2("Esta llave no se prueba con una llamada: se comprueba sola con el primer aviso firmado.", "This key is not tested with a call: it proves itself with the first signed notice."),
    sin_permiso_admin: E2("Solo un Admin prueba llaves.", "Only an Admin tests keys."),
    no_existe: E2("Ese tipo de llave no existe.", "That key type does not exist."),
  };
  const h = /^http_(\d{3})$/.exec(r);
  return m[r] ?? (h ? E2(`El proveedor contestó con un error (HTTP ${h[1]}).`, `The provider answered with an error (HTTP ${h[1]}).`) : r);
}

export function IntegracionesProveedores({ filas, tipos, origenes, pruebas, admin, listo, produccion }: { filas: FilaLlave[]; tipos: Tipo[]; origenes: Origen[]; pruebas: UltimaPrueba[]; admin: boolean; listo: boolean; produccion: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), cuando = cuandoE(E2), nomT = (t: Tipo) => E2(t.es, t.en);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pegar, setPegar] = useState<Tipo | null>(null), [probando, setProbando] = useState<string | null>(null);
  const hecho = (m: string) => { setToast(m); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SISTEMA · INTEGRACIONES", "SYSTEM · INTEGRATIONS"), t: E2("Llaves de los proveedores", "Provider keys"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => hecho(r.mensaje ?? E2("Listo.", "Done."))} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (pegar) return <Pegar t={pegar} desk={desk} produccion={produccion} onBack={() => setPegar(null)} onHecho={(m) => { setPegar(null); setToast(m); router.refresh(); }} />;

  const vivas = new Map(filas.filter((f) => !f.retirada).map((f) => [f.kind as string, f]));
  const origen = new Map(origenes.map((o) => [o.tipo, o])), prueba = new Map(pruebas.map((p) => [p.kind as string, p]));
  const con = origenes.filter((o) => o.origen).length;
  const B: Bloque[] = [
    { type: "head", eye: E2("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E2("Integraciones", "Integrations"), s: E2("Las llaves de los proveedores que usa el servidor. Las pegas tú aquí; se cifran en el servidor y no se vuelven a mostrar: solo su huella.", "The provider keys the server uses. You paste them here; they are encrypted on the server and never shown again: only their fingerprint."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E2(p.l, p.en), on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: E2("Llaves de las tiendas", "Store keys"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=push") },
      { l: "Wallet", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=wallet") }, { l: E2("Proveedores", "Providers"), v: "selected", onClick: () => undefined }] },
    listo ? { type: "note", tone: "info", icon: "lock", t: admin ? E2("Para poner una llave te mandamos un código a tu teléfono. Cópiala del sitio del proveedor y pégala: nunca la escribas en un chat.", "To set a key we send a code to your phone. Copy it from the provider's site and paste it: never type it in a chat.") : E2("Solo un Admin pone, prueba o retira llaves.", "Only an Admin sets, tests or withdraws keys.") }
      : { type: "note", tone: "danger", icon: "warning", t: E2("Falta la llave del llavero en los secretos del entorno: no se puede guardar ninguna llave.", "The keychain key is missing from the environment secrets: no key can be saved.") },
  ];
  if (origenes.some((o) => o.sombra)) B.push({ type: "note", tone: "warn", icon: "info", t: E2("Alguna llave llega también por el entorno del servidor (el sobre sellado): mientras exista, el servidor usa esa y no la del llavero.", "Some key also arrives through the server environment (the sealed envelope): while it exists, the server uses that one and not the keychain's.") });
  for (const prov of ["telnyx", "stripe", "ses", "whatsapp", "anthropic"]) {
    const T = tipos.filter((t) => t.prov === prov);
    B.push({ type: "group", k: `${PROV(E2)[prov]!.toUpperCase()} · ${T.filter((t) => origen.get(t.k)?.origen).length} ${E2("DE", "OF")} ${T.length}` });
    const items: Fila[] = T.map((t) => {
      const f = vivas.get(t.k), o = origen.get(t.k), p = prueba.get(t.k), pVale = !!p && !!o?.huella && p.huella === o.huella;
      const deEntorno = o?.origen === "entorno";
      const sub = [
        f ? `v${f.version} · SHA-256 ${huellaCorta(f.fingerprint)}` : null,
        f?.meta.modo ? (f.meta.modo === "real" ? E2("real", "live") : E2("de prueba", "test")) : null,
        f ? `${f.quien ?? E2("equipo", "team")} · ${cuando(f.at)}` : null,
        deEntorno ? (f ? E2("el servidor usa la del entorno, no esta", "the server uses the environment one, not this") : E2("llega por el entorno del servidor", "arrives through the server environment")) : null,
        !o?.origen ? E2("Falta · se pega", "Missing · paste it") : null,
        t.prueba ? (pVale ? `${p!.ok ? E2("probada", "tested") : E2("la prueba falló", "the test failed")} ${cuando(p!.at)}` : o?.origen ? E2("sin probar", "not tested") : null) : E2("se comprueba con el primer aviso", "proves itself with the first notice"),
      ].filter(Boolean).join(" · ");
      const tag = !o?.origen ? E2("FALTA", "MISSING") : deEntorno ? E2("ENTORNO", "ENVIRONMENT") : t.prueba && pVale && !p!.ok ? E2("REVISAR", "CHECK") : E2("VIVA", "LIVE");
      return {
        key: t.k, icon: o?.origen ? "key" : "lock", t: nomT(t), s: sub, tag, tone: !o?.origen ? "neutral" : t.prueba && pVale && !p!.ok ? "danger" : "signal",
        ...(admin && listo ? { acts: [
          { l: f ? E2("Rotar", "Rotate") : E2("Poner la llave", "Set the key"), icon: "plus", onClick: () => setPegar(t) },
          ...(t.prueba && o?.origen ? [{ l: probando === t.k ? E2("Probando…", "Testing…") : E2("Probar", "Test"), icon: "check", onClick: () => {
            if (probando) return;
            setProbando(t.k);
            void llaveProbar(t.k).then((r) => { setProbando(null); setToast(textoPrueba(E2, r.resultado)); router.refresh(); });
          } }] : []),
          ...(f ? [{ l: E2("Retirar", "Withdraw"), icon: "trash", onClick: () => setConf({ titulo: E2(`Retirar ${nomT(t)}`, `Withdraw ${nomT(t)}`), cta: E2("Retirar", "Withdraw"), peligro: true,
            sub: E2(`Versión ${f.version} · ${huellaCorta(f.fingerprint)}. El servidor deja de usarla al instante; el registro queda.`, `Version ${f.version} · ${huellaCorta(f.fingerprint)}. The server stops using it immediately; the record stays.`),
            plantillas: [E2("La llave se filtró o se revocó en el proveedor", "The key leaked or was revoked at the provider"), E2("Ya no se usa", "No longer used")], nota: "interna", hacer: (m) => llaveRetirar(f.id, m) }) }] : []),
        ] } : {}),
      };
    });
    B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items });
  }
  B.push({ type: "note", tone: "info", icon: "info", t: E2(`${con} de ${origenes.length} llaves puestas. En producción, Telnyx va primero: el código para entrar sale por SMS.`, `${con} of ${origenes.length} keys set. In production, Telnyx goes first: the sign-in code is sent by SMS.`) });
  const retiradas = filas.filter((f) => f.retirada);
  if (retiradas.length) B.push({ type: "rows", k: E2("RETIRADAS · 180 DÍAS", "WITHDRAWN · 180 DAYS"), items: retiradas.map((f): Fila => ({ key: f.id, icon: "lock", dim: true, t: `${((t) => (t ? nomT(t) : f.kind))(tipos.find((t) => t.k === f.kind))} · v${f.version}`,
    s: `SHA-256 ${huellaCorta(f.fingerprint)} · ${E2("retirada", "withdrawn")} ${cuando(f.retirada!)} · ${f.motivo ?? ""}` })) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* Pegar una llave: el código al teléfono del Admin, la llave (el campo no muestra lo escrito) y el motivo. El servidor revisa la forma y contesta la huella. */
function Pegar({ t, desk, produccion, onBack, onHecho }: { t: Tipo; desk: boolean; produccion: boolean; onBack: () => void; onHecho: (m: string) => void }) {
  const { E2 } = useE2(), nomT = E2(t.es, t.en);
  const [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null), [pedido, setPedido] = useState(false);
  const [valor, setValor] = useState(""), [motivo, setMotivo] = useState(""), [err, setErr] = useState<string | null>(null), [enviando, setEnviando] = useState(false);
  const pedir = async () => {
    setErr(null);
    const r = await fetch("/api/admin/llavero/codigo", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, msg: E2("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string; codigoPrueba?: string };
    if (!r.ok) { setErr(r.msg ?? E2("No se pudo.", "It didn’t work.")); return; }
    setPedido(true); setPrueba(r.codigoPrueba ?? null);
  };
  const enviar = async () => {
    setEnviando(true); setErr(null);
    const f = new FormData();
    f.set("tipo", t.k); f.set("codigo", codigo.trim()); f.set("motivo", motivo); f.set("valor", valor);
    const r = await fetch("/api/admin/llavero", { method: "POST", body: f }).then((x) => x.json()).catch(() => ({ ok: false, msg: E2("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string; en?: string; huella?: string };
    setEnviando(false);
    if (!r.ok) { setErr(E2(r.msg ?? "No se pudo.", r.en ?? r.msg ?? "It didn’t work.")); return; }
    setValor("");
    onHecho(`${E2(r.msg ?? "Guardada.", r.en ?? "Saved.")}${r.huella ? ` · SHA-256 ${huellaCorta(r.huella)}` : ""}`);
  };
  const B: Bloque[] = [
    { type: "head", eye: E2("INTEGRACIONES · PROVEEDORES", "INTEGRATIONS · PROVIDERS"), t: nomT, s: E2("Cópiala del sitio del proveedor y pégala aquí. Se cifra en el servidor; después solo se ve su huella. Si ya había una, queda retirada.", "Copy it from the provider's site and paste it here. It is encrypted on the server; afterwards only its fingerprint shows. If there was one, it is withdrawn."), onBack, h1: desk ? 26 : 22 },
  ];
  if (t.prov === "stripe" && (t.k === "stripe_secret_key" || t.k === "stripe_publishable_key")) B.push({ type: "note", tone: "info", icon: "info", t: produccion ? E2("Aquí va la llave REAL (live). Una de prueba no se acepta.", "The LIVE key goes here. A test key is not accepted.") : E2("Aquí va la llave de PRUEBA (test). Una real no se acepta en este entorno.", "The TEST key goes here. A live key is not accepted in this environment.") });
  if (!pedido) B.push({ type: "note", tone: "info", icon: "lock", t: E2("Primero te mandamos un código a tu teléfono (el de tu cuenta de Admin).", "First we send a code to your phone (the one on your Admin account)."), cta: E2("Mandar el código", "Send the code"), onCta: () => { void pedir(); } });
  else {
    if (prueba) B.push({ type: "note", tone: "warn", icon: "info", t: E2(`MODO PRUEBAS · tu código es ${prueba}`, `TEST MODE · your code is ${prueba}`) });
    B.push({ type: "field", k: E2("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "000000", im: "numeric", max: 6 });
  }
  B.push({ type: "field", k: E2("LA LLAVE (NO SE MUESTRA LO QUE PEGAS)", "THE KEY (WHAT YOU PASTE IS NOT SHOWN)"), val: valor, onChange: setValor, ph: E2("Pégala aquí", "Paste it here"), max: 4096, oculto: true,
    help: valor ? E2(`${valor.trim().length} caracteres pegados`, `${valor.trim().length} characters pasted`) : undefined });
  B.push({ type: "field", k: E2("MOTIVO (QUEDA EN LA AUDITORÍA)", "REASON (KEPT IN THE AUDIT LOG)"), val: motivo, onChange: setMotivo, ph: E2("Llave nueva del proveedor", "New key from the provider"), max: 300 });
  if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <div style={{ display: "flex" }}><Button variant="primary" block disabled={!pedido || codigo.length !== 6 || !valor.trim() || motivo.trim().length < 3 || enviando} onClick={() => { void enviar(); }}>{enviando ? E2("Guardando…", "Saving…") : E2("Guardar en el llavero", "Save to the keychain")}</Button></div>
    </div>);
}
