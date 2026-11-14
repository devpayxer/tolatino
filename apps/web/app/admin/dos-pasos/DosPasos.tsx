"use client";
/* 9j · Los dos pasos del equipo (hueco #7 de fase9-apertura.md §1b; §5 «Segundo factor»): el diseño no trae esta pantalla; se compone con las piezas
   del sistema (PanelBloques: encabezado, nota, campo, filas, acciones; QrCode del boleto) y se anota en docs/REVISION.md.
   · alta: el QR (y el secreto en texto, para escribirlo a mano) se muestra UNA vez; el primer código confirma; los 10 códigos de recuperación se
     muestran UNA vez con «Ya los guardé» y nunca más.
   · codigo: el de la app, o uno de recuperación (sirve una vez).
   · llave: tiene llave de acceso → salir y entrar con ella.
   · bloqueado: 5 intentos malos en 15 minutos.
   El servidor decide todo (lib/equipo/dos-pasos.ts); aquí solo se muestra. ES/EN por la cookie del idioma, sin emoji. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import type { EstadoDosPasos } from "@/lib/equipo/dos-pasos";
import { accionCodigo, accionConfirmarAlta, accionEmpezarAlta, accionRecuperacion, accionSalirParaLlave } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { QrCode } = UI as unknown as Record<"QrCode", ComponentType<any>>;
type L = "es" | "en";
const LINEA: Record<L, string> = {
  es: "Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.",
  en: "Your team account needs your passkey or your code app. SMS alone is not enough.",
};

export function DosPasos({ estado, espera, quedan, l }: { estado: Exclude<EstadoDosPasos, "ok">; espera: number; quedan: number; l: L }) {
  const E = (es: string, en: string) => (l === "es" ? es : en);
  const router = useRouter();
  const [pend, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [alta, setAlta] = useState<{ secreto: string; matriz: boolean[][] } | null>(null);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [codigo, setCodigo] = useState("");
  const [rec, setRec] = useState(false);
  const [recuperacion, setRecuperacion] = useState("");
  const [quedanAhora, setQuedanAhora] = useState<number | null>(null);
  const msg = (m: { es: string; en: string }) => setErr(l === "es" ? m.es : m.en);
  const head = (t: string): Bloque => ({ type: "head", eye: E("SUPER ADMIN · DOS PASOS", "SUPER ADMIN · TWO STEPS"), t, s: LINEA[l], h1: 24 });

  const B: Bloque[] = [];
  if (codigos) {
    // Los 10 códigos de recuperación: una sola vez.
    B.push(head(E("Guarda tus códigos de recuperación", "Save your recovery codes")),
      { type: "note", tone: "warn", icon: "lock", t: E("Cada uno sirve una sola vez si pierdes el teléfono con tu app de códigos. Guárdalos donde no se pierdan (tu gestor de contraseñas o en papel). No se vuelven a mostrar.", "Each one works once if you lose the phone with your code app. Keep them somewhere safe (your password manager or on paper). They are not shown again.") },
      { type: "rows", k: E(`${codigos.length} CÓDIGOS · UNA VEZ CADA UNO`, `${codigos.length} CODES · ONCE EACH`), items: codigos.map((c, i) => ({ key: c, icon: "key", t: c, s: E(`Código ${i + 1}`, `Code ${i + 1}`), compact: true })) },
      { type: "acts", items: [{ l: E("Ya los guardé", "I saved them"), v: "action", onClick: () => { router.replace("/admin"); router.refresh(); } }] });
  } else if (estado === "alta") {
    B.push(head(E("Da de alta tu app de códigos", "Set up your code app")));
    if (!alta) {
      B.push({ type: "note", tone: "info", icon: "info", t: E("Abre tu app de códigos (Google Authenticator, 1Password, Authy u otra) y prepárate para escanear un código QR. El código se muestra una sola vez.", "Open your code app (Google Authenticator, 1Password, Authy or another) and get ready to scan a QR code. It is shown only once.") },
        { type: "acts", items: [{ l: pend ? E("Preparando…", "Preparing…") : E("Mostrar mi código QR", "Show my QR code"), v: "action", off: pend, onClick: () => start(async () => {
          setErr(null); const r = await accionEmpezarAlta(); if (r.ok) setAlta({ secreto: r.secreto, matriz: r.matriz }); else msg(r.msg); }) }] });
    } else {
      B.push({ type: "note", tone: "ink", icon: "info", t: E("1. Escanea el código con tu app. 2. Escribe el código de 6 números que te muestra.", "1. Scan the code with your app. 2. Type the 6-digit code it shows.") });
    }
  } else if (estado === "codigo") {
    B.push(head(rec ? E("Usa un código de recuperación", "Use a recovery code") : E("Escribe el código de tu app", "Type the code from your app")));
  } else if (estado === "llave") {
    B.push(head(E("Entra con tu llave de acceso", "Sign in with your passkey")),
      { type: "note", tone: "info", icon: "key", t: E("Tu cuenta del equipo tiene llave de acceso. Sal y vuelve a entrar con ella (Face ID o huella). Si la perdiste, pídele a un Admin que restablezca tus dos pasos.", "Your team account has a passkey. Sign out and sign in again with it (Face ID or fingerprint). If you lost it, ask an Admin to reset your two steps.") },
      { type: "acts", items: [{ l: E("Salir y entrar con mi llave", "Sign out and use my passkey"), v: "action", onClick: () => start(async () => { await accionSalirParaLlave(); }) }] });
  } else {
    B.push(head(E("Espera un momento", "Wait a moment")),
      { type: "note", tone: "danger", icon: "lock", t: E(`Demasiados intentos. Espera ${espera} min o pídele a un Admin que restablezca tus dos pasos.`, `Too many attempts. Wait ${espera} min or ask an Admin to reset your two steps.`) });
  }

  const campoCodigo: Bloque = { type: "field", k: E("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "······", im: "numeric", max: 6 };
  const pie: Bloque[] = [];
  if (!codigos && estado === "alta" && alta) {
    pie.push({ type: "kv", cols: 1, items: [{ k: E("SI NO PUEDES ESCANEAR, ESCRIBE ESTE SECRETO", "IF YOU CANNOT SCAN, TYPE THIS SECRET"), v: alta.secreto.replace(/(.{4})(?=.)/g, "$1 ") }] }, campoCodigo,
      { type: "acts", items: [{ l: pend ? E("Revisando…", "Checking…") : E("Confirmar", "Confirm"), v: "action", off: pend || codigo.length !== 6, onClick: () => start(async () => {
        setErr(null); const r = await accionConfirmarAlta(codigo); setCodigo(""); if (r.ok && r.codigos) setCodigos(r.codigos); else if (!r.ok) msg(r.msg); }) }] });
  }
  if (estado === "codigo" && !rec) {
    pie.push(campoCodigo, { type: "acts", items: [
      { l: pend ? E("Revisando…", "Checking…") : E("Entrar", "Enter"), v: "action", off: pend || codigo.length !== 6, onClick: () => start(async () => {
        setErr(null); const r = await accionCodigo(codigo); setCodigo(""); if (r.ok) { router.replace("/admin"); router.refresh(); } else msg(r.msg); }) },
      { l: E("Usar un código de recuperación", "Use a recovery code"), v: "secondary", onClick: () => { setRec(true); setErr(null); } }] });
  }
  if (estado === "codigo" && rec) {
    pie.push({ type: "field", k: E("CÓDIGO DE RECUPERACIÓN", "RECOVERY CODE"), val: recuperacion, onChange: (v) => setRecuperacion(v.toUpperCase().slice(0, 9)), ph: "XXXX-XXXX", max: 9,
      help: E(`Te quedan ${quedanAhora ?? quedan}. Cada uno sirve una vez.`, `You have ${quedanAhora ?? quedan} left. Each one works once.`) },
    { type: "acts", items: [
      { l: pend ? E("Revisando…", "Checking…") : E("Entrar con el código de recuperación", "Enter with the recovery code"), v: "action", off: pend || recuperacion.replace(/[^A-Z0-9]/g, "").length !== 8, onClick: () => start(async () => {
        setErr(null); const r = await accionRecuperacion(recuperacion); setRecuperacion(""); if (r.ok) { setQuedanAhora(r.quedan ?? null); router.replace("/admin"); router.refresh(); } else msg(r.msg); }) },
      { l: E("Volver al código de la app", "Back to the app code"), v: "secondary", onClick: () => { setRec(false); setErr(null); } }] });
  }
  if (err) pie.push({ type: "note", tone: "danger", icon: "warning", t: err });

  return (
    <div data-dos-pasos={codigos ? "codigos" : estado} style={{ maxWidth: 520, margin: "0 auto", padding: "28px 16px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
      <PanelBloques bloques={B} />
      {!codigos && estado === "alta" && alta ? (
        <div data-qr-totp style={{ display: "flex", justifyContent: "center", padding: 16, background: "var(--tl-white)", borderRadius: 16, border: "1px solid var(--tl-line)" }}>
          <QrCode matrix={alta.matriz} size={232} label={E("Código QR para tu app de códigos", "QR code for your code app")} />
        </div>
      ) : null}
      {pie.length ? <PanelBloques bloques={pie} /> : null}
    </div>
  );
}
