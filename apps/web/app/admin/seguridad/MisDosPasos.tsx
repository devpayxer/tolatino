"use client";
/* 9n-3 · Mis dos pasos. Mismo lenguaje que la pantalla de los dos pasos (app/admin/dos-pasos): bloques del sistema (PanelBloques) y el QrCode del boleto;
   ES/EN por la cookie del idioma, sin emoji. El servidor decide todo (lib/equipo/dos-pasos.ts); aquí solo se muestra.
   · Códigos nuevos: pide el código de la app → salen 10 UNA vez; los anteriores dejan de servir.
   · Cambiar mi app: el código de la app de siempre → QR de la nueva → el primer código de la nueva → 10 códigos UNA vez. Las otras sesiones vuelven a pedir el código. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import { accionCodigosNuevos, accionConfirmarCambio, accionEmpezarCambio } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { QrCode } = UI as unknown as Record<"QrCode", ComponentType<any>>;
type L = "es" | "en";
type Paso = "inicio" | "pedir_codigos" | "pedir_cambio" | "escanear" | "codigos";

export function MisDosPasos({ app, quedan, llaves, pruebas, ultimo, l }: { app: string | null; quedan: number; llaves: number; pruebas: boolean; ultimo: string | null; l: L }) {
  const E = (es: string, en: string) => (l === "es" ? es : en);
  const router = useRouter();
  const [pend, start] = useTransition();
  const [paso, setPaso] = useState<Paso>("inicio");
  const [err, setErr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState<{ secreto: string; matriz: boolean[][]; testigo: string } | null>(null);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const msg = (m: { es: string; en: string }) => setErr(l === "es" ? m.es : m.en);
  const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(l === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }) : "—");
  const campo: Bloque = { type: "field", k: E("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "······", im: "numeric", max: 6 };
  const head = (t: string, s?: string): Bloque => ({ type: "head", eye: E("SUPER ADMIN · MIS DOS PASOS", "SUPER ADMIN · MY TWO STEPS"), t, s, h1: 24, onBack: paso === "inicio" ? () => router.push("/admin/sistema") : () => { setPaso("inicio"); setCodigo(""); setErr(null); setNueva(null); } });
  const B: Bloque[] = [], pie: Bloque[] = [];

  if (paso === "codigos" && codigos) {
    B.push(head(E("Guarda tus códigos de recuperación", "Save your recovery codes")),
      { type: "note", tone: "warn", icon: "lock", t: E("Los de antes ya no sirven. Cada uno de estos sirve una sola vez si pierdes el teléfono con tu app. Guárdalos donde no se pierdan. No se vuelven a mostrar.", "The old ones no longer work. Each of these works once if you lose the phone with your app. Keep them somewhere safe. They are not shown again.") },
      { type: "rows", k: E(`${codigos.length} CÓDIGOS · UNA VEZ CADA UNO`, `${codigos.length} CODES · ONCE EACH`), items: codigos.map((c, i) => ({ key: c, icon: "key", t: c, s: E(`Código ${i + 1}`, `Code ${i + 1}`) })) },
      { type: "acts", items: [{ l: E("Ya los guardé", "I saved them"), v: "action", onClick: () => { setCodigos(null); setPaso("inicio"); router.refresh(); } }] });
  } else if (paso === "inicio") {
    B.push(head(E("Mis dos pasos", "My two steps"), E("Tu cuenta del equipo entra con tu teléfono y un segundo paso: tu llave de acceso o tu app de códigos.", "Your team account signs in with your phone and a second step: your passkey or your code app.")),
      { type: "kv", cols: 2, items: [
        { k: E("APP DE CÓDIGOS", "CODE APP"), v: app ? E(`Desde el ${fecha(app)}`, `Since ${fecha(app)}`) : llaves ? E("No tienes (entras con llave)", "None (you use a passkey)") : pruebas ? E("Modo pruebas", "Test mode") : E("No tienes", "None") },
        { k: E("CÓDIGOS DE RECUPERACIÓN", "RECOVERY CODES"), v: app ? E(`${quedan} sin usar`, `${quedan} unused`) : "—", fg: app && quedan <= 2 ? "var(--tl-danger)" : undefined },
        { k: E("LLAVES DE ACCESO", "PASSKEYS"), v: String(llaves) },
        { k: E("ÚLTIMA VEZ CON LA APP", "LAST USED"), v: fecha(ultimo) },
      ] });
    if (app) {
      B.push(quedan <= 2 ? { type: "note", tone: "warn", icon: "warning", t: E("Te quedan pocos códigos de recuperación. Pide nuevos antes de quedarte sin ellos.", "You have few recovery codes left. Ask for new ones before you run out.") } : { type: "note", tone: "info", icon: "info", t: E("Para cambiar algo pedimos un código de tu app de siempre: es la prueba de que eres tú.", "To change anything we ask for a code from your usual app: it proves it is you.") },
        { type: "acts", items: [
          { l: E("Pedir códigos de recuperación nuevos", "Ask for new recovery codes"), v: "action", onClick: () => { setPaso("pedir_codigos"); setErr(null); } },
          { l: E("Cambiar mi app de códigos", "Change my code app"), v: "secondary", onClick: () => { setPaso("pedir_cambio"); setErr(null); } }] });
    } else B.push({ type: "note", tone: "info", icon: "key", t: llaves ? E("Tu segundo paso es tu llave de acceso; se administra en Mi cuenta. Si la perdiste, un Admin restablece tus dos pasos.", "Your second step is your passkey; it is managed in My account. If you lost it, an Admin resets your two steps.") : E("Aquí se cambian los dos pasos de quien tiene app de códigos.", "This is where people with a code app change their two steps.") });
  } else if (paso === "pedir_codigos") {
    B.push(head(E("Códigos de recuperación nuevos", "New recovery codes"), E("Escribe el código que ves ahora en tu app. Los códigos de recuperación de antes dejan de servir.", "Type the code you see now in your app. Your old recovery codes stop working.")));
    pie.push(campo, { type: "acts", items: [{ l: pend ? E("Revisando…", "Checking…") : E("Pedir códigos nuevos", "Get new codes"), v: "action", off: pend || codigo.length !== 6, onClick: () => start(async () => {
      setErr(null); const r = await accionCodigosNuevos(codigo); setCodigo(""); if (r.ok && r.codigos) { setCodigos(r.codigos); setPaso("codigos"); } else if (!r.ok) msg(r.msg); }) }] });
  } else if (paso === "pedir_cambio") {
    B.push(head(E("Cambiar mi app de códigos", "Change my code app"), E("Primero escribe el código de tu app de siempre. Luego escaneas el código de la app nueva y confirmas con su primer código.", "First type the code from your usual app. Then you scan the new app's code and confirm with its first code.")));
    pie.push(campo, { type: "acts", items: [{ l: pend ? E("Revisando…", "Checking…") : E("Seguir", "Continue"), v: "action", off: pend || codigo.length !== 6, onClick: () => start(async () => {
      setErr(null); const r = await accionEmpezarCambio(codigo); setCodigo(""); if (r.ok) { setNueva({ secreto: r.secreto, matriz: r.matriz, testigo: r.testigo }); setPaso("escanear"); } else msg(r.msg); }) }] });
  } else if (paso === "escanear" && nueva) {
    B.push(head(E("Escanea la app nueva", "Scan the new app"), E("Si cierras esta pantalla sin confirmar, tu app de siempre sigue valiendo.", "If you close this screen without confirming, your usual app keeps working.")),
      { type: "note", tone: "ink", icon: "info", t: E("1. Escanea el código con la app nueva. 2. Escribe el código de 6 números que te muestra.", "1. Scan the code with the new app. 2. Type the 6-digit code it shows.") });
    pie.push({ type: "kv", cols: 1, items: [{ k: E("SI NO PUEDES ESCANEAR, ESCRIBE ESTE SECRETO", "IF YOU CANNOT SCAN, TYPE THIS SECRET"), v: nueva.secreto.replace(/(.{4})(?=.)/g, "$1 ") }] }, campo,
      { type: "acts", items: [{ l: pend ? E("Revisando…", "Checking…") : E("Confirmar el cambio", "Confirm the change"), v: "action", off: pend || codigo.length !== 6, onClick: () => start(async () => {
        setErr(null); const r = await accionConfirmarCambio(nueva.testigo, codigo); setCodigo(""); if (r.ok && r.codigos) { setCodigos(r.codigos); setNueva(null); setPaso("codigos"); } else if (!r.ok) msg(r.msg); }) }] });
  }
  if (err) pie.push({ type: "note", tone: "danger", icon: "warning", t: err });
  return (
    <div data-mis-dos-pasos={paso} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
      <PanelBloques bloques={B} />
      {paso === "escanear" && nueva ? (
        <div data-qr-totp style={{ display: "flex", justifyContent: "center", padding: 16, background: "var(--tl-white)", borderRadius: 16, border: "1px solid var(--tl-line)", alignSelf: "flex-start" }}>
          <QrCode matrix={nueva.matriz} size={232} label={E("Código QR para tu app nueva", "QR code for your new app")} />
        </div>
      ) : null}
      {pie.length ? <PanelBloques bloques={pie} /> : null}
    </div>
  );
}
