"use client";
/* 8g · Super Admin › Sistema › Integraciones › Wallet (regla 8: espejo del boleto en Apple Wallet y Google Wallet; hueco #7 del plan de la Fase 8:
   tabs + chips + kpis + note + rows + field del sistema). El certificado del Pass Type ID de Apple —sin él no sale el botón de Apple— con su
   vencimiento (aviso a pase_cert_aviso_dias, 30 por defecto) y su solicitud (CSR: la llave nace en el servidor; aquí se genera y se baja),
   la cuenta de Google Wallet, los interruptores, las cifras y lo que pasa por Apple y Google. Nunca una llave ni un token. Generar la
   solicitud pide el código otra vez al teléfono del Admin (como subir una llave). */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EstadoWallet } from "@/lib/pases/admin";
import { Toast, useAncho, useToast } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { useE } from "./idioma-admin";

let EN = false;
const cuando = (iso: string) => new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");
const dia = (ymd: string) => cuando(`${ymd}T12:00:00Z`);

export function IntegracionesWallet({ d, admin, listo }: { d: EstadoWallet; admin: boolean; listo: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE();
  EN = E("", "x") === "x";
  const [toast, setToast] = useToast(), [generar, setGenerar] = useState(false);
  if (generar) return <Generar desk={desk} onBack={() => setGenerar(false)} onHecho={(m) => { setGenerar(false); setToast(m); router.refresh(); }} />;
  const c = d.cert, subir = (k: string) => router.push(`/admin/sistema/integraciones?subir=${k}`);
  const B: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Integraciones", "Integrations"), s: E("El boleto en Apple Wallet y Google Wallet: el mismo QR firmado del boleto, y cada cambio del boleto llega solo al teléfono.", "The ticket in Apple Wallet and Google Wallet: the same signed ticket QR, and every ticket change reaches the phone on its own."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: E("Llaves de las tiendas", "Store keys"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=push") },
      { l: "Wallet", v: "selected", onClick: () => undefined }, { l: E("Proveedores", "Providers"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=proveedores") }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("PASES EMITIDOS", "PASSES ISSUED"), v: String(d.cifras.apple + d.cifras.google), s: `Apple ${d.cifras.apple} · Google ${d.cifras.google} · ${E("anulados", "voided")} ${d.cifras.anulados}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("TELÉFONOS QUE LOS SIGUEN", "PHONES FOLLOWING THEM"), v: String(d.cifras.telefonos), s: E("Apple Wallet (servicio web)", "Apple Wallet (web service)") },
      { k: E("POR AVISAR", "TO NOTIFY"), v: String(d.cifras.pendientes + d.cifras.googleAtras), s: `Apple ${d.cifras.pendientes} · Google ${d.cifras.googleAtras}` },
      { k: E("FALLOS · 7 DÍAS", "FAILURES · 7 DAYS"), v: String(d.cifras.fallos7), s: E("avisos que se dejaron de intentar", "notifications no longer retried") },
    ] },
    { type: "group", k: E("APPLE WALLET · CERTIFICADO DEL PASE", "APPLE WALLET · PASS CERTIFICATE") },
  ];
  // El certificado: falta, solicitud lista, vivo, por vencer o vencido.
  if (!c.tipo) B.push(c.solicitud
    ? { type: "note", tone: "info", icon: "key", t: E(`Solicitud lista desde ${cuando(c.solicitud.at)} · Pass Type ID ${c.solicitud.tipo}. Bájala y súbela en developer.apple.com › Certificates, IDs & Profiles › Identifiers › tu Pass Type ID › Create Certificate; luego sube aquí el certificado (.cer) que te dé Apple.`, `Request ready since ${cuando(c.solicitud.at)} · Pass Type ID ${c.solicitud.tipo}. Download it and upload it at developer.apple.com › Certificates, IDs & Profiles › Identifiers › your Pass Type ID › Create Certificate; then upload here the certificate (.cer) Apple gives you.`) }
    : { type: "note", tone: "warn", icon: "warning", t: E("Falta el certificado del pase de Apple: el botón «Agregar a Apple Wallet» no sale. Genera aquí la solicitud (la llave se queda en el servidor), súbela a Apple y sube aquí el .cer (Paquete 8-2, opcional).", "The Apple pass certificate is missing: the “Add to Apple Wallet” button doesn’t show. Generate the request here (the key stays on the server), upload it to Apple and upload the .cer here (Package 8-2, optional).") });
  else B.push(c.dias !== null && c.dias < 0
    ? { type: "note", tone: "danger", icon: "warning", t: E(`El certificado venció el ${dia(c.vence!)}. No se emiten ni se actualizan pases de Apple. Genera una solicitud nueva y sube el certificado nuevo.`, `The certificate expired on ${dia(c.vence!)}. No Apple passes are issued or updated. Generate a new request and upload the new certificate.`) }
    : c.dias !== null && c.dias <= c.aviso
      ? { type: "note", tone: "warn", icon: "warning", t: E(`El certificado vence el ${dia(c.vence!)} (en ${c.dias} ${c.dias === 1 ? "día" : "días"}). Genera una solicitud nueva y sube el certificado nuevo: el actual sigue funcionando hasta entonces.`, `The certificate expires on ${dia(c.vence!)} (in ${c.dias} ${c.dias === 1 ? "day" : "days"}). Generate a new request and upload the new certificate: the current one keeps working until then.`) }
      : { type: "note", tone: "ok", icon: "check", t: E(`Certificado vivo · vence el ${c.vence ? dia(c.vence) : "—"}${c.dias !== null ? ` (en ${c.dias} días)` : ""}. Avisamos al equipo ${c.aviso} días antes.`, `Certificate live · expires on ${c.vence ? dia(c.vence) : "—"}${c.dias !== null ? ` (in ${c.dias} days)` : ""}. We alert the team ${c.aviso} days before.`) });
  const filas: Fila[] = [
    { key: "tipo", icon: "ticket", t: "Pass Type ID", s: c.tipo ?? c.solicitud?.tipo ?? "—", tag: c.tipo ? E("VIVO", "LIVE") : c.solicitud ? E("SOLICITUD", "REQUEST") : E("FALTA", "MISSING"), tone: c.tipo ? "signal" : "neutral" },
    { key: "equipo", icon: "users", t: E("Equipo (Team ID)", "Team (Team ID)"), s: c.equipo ?? "—" },
    { key: "on", icon: "bell", t: E("Interruptor app.wallet.apple", "Switch app.wallet.apple"), s: d.on.apple ? E("Encendido: se emiten pases nuevos", "On: new passes are issued") : E("Apagado: no se emiten pases nuevos; los emitidos siguen recibiendo sus cambios", "Off: no new passes are issued; issued ones keep getting their changes"), tag: d.on.apple ? E("ENCENDIDO", "ON") : E("APAGADO", "OFF"), tone: d.on.apple ? "signal" : "neutral" },
  ];
  B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: filas });
  if (admin && listo) B.push({ type: "acts", items: [
    { l: c.solicitud ? E("Generar otra solicitud", "Generate another request") : E("Generar la solicitud (CSR)", "Generate the request (CSR)"), icon: "key", v: c.tipo || c.solicitud ? undefined : "primary", onClick: () => setGenerar(true) },
    ...(c.solicitud ? [{ l: E("Bajar la solicitud", "Download the request"), icon: "folder", onClick: () => { location.href = "/api/admin/llavero/solicitud"; } }, { l: E("Subir el certificado (.cer)", "Upload the certificate (.cer)"), icon: "plus", v: "primary", onClick: () => subir("pass_type_cert") }] : []),
  ] });
  B.push({ type: "group", k: E("GOOGLE WALLET · CUENTA DE EMISOR", "GOOGLE WALLET · ISSUER ACCOUNT") });
  B.push(d.google.listo
    ? { type: "note", tone: "ok", icon: "check", t: `${E("Cuenta de servicio de Google Wallet viva · emisor", "Google Wallet service account live · issuer")} ${d.google.emisor ?? "—"}${d.google.correo ? ` · ${d.google.correo}` : ""}.` }
    : { type: "note", tone: "warn", icon: "warning", t: E("Falta la cuenta de emisor de Google Wallet (Paquete 8-2, opcional): el botón «Agregar a Google Wallet» no sale; Apple sí. Se sube como «Google Wallet · cuenta de servicio» con el ID del emisor.", "The Google Wallet issuer account is missing (Package 8-2, optional): the “Add to Google Wallet” button doesn’t show; Apple’s does. It is uploaded as “Google Wallet · service account” with the issuer ID.") });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: [
    { key: "g-on", icon: "bell", t: E("Interruptor app.wallet.google", "Switch app.wallet.google"), s: d.on.google ? E("Encendido: se emiten pases nuevos", "On: new passes are issued") : E("Apagado: no se emiten pases nuevos; los emitidos siguen recibiendo sus cambios", "Off: no new passes are issued; issued ones keep getting their changes"), tag: d.on.google ? E("ENCENDIDO", "ON") : E("APAGADO", "OFF"), tone: d.on.google ? "signal" : "neutral" },
    { key: "g-sa", icon: "key", t: E("Cuenta de servicio", "Service account"), s: d.google.listo ? E("En el llavero (solo se ve su huella en Llaves de las tiendas)", "In the keychain (only its fingerprint shows in Store keys)") : E("Falta", "Missing"), tag: d.google.listo ? E("VIVA", "LIVE") : E("FALTA", "MISSING"), tone: d.google.listo ? "signal" : "neutral",
      ...(admin && listo ? { acts: [{ l: d.google.listo ? E("Reemplazar", "Replace") : E("Subir archivo", "Upload file"), icon: "plus", onClick: () => subir("google_wallet_sa") }] } : {}) },
  ] });
  B.push({ type: "note", tone: "ink", icon: "lock", t: E("Lo que pasa por Apple y Google: el nombre del evento, la fecha, el lugar, el tipo de boleto, el código y su QR firmado. Nunca el nombre de la persona, su teléfono ni montos. Fe, Salud y Niños: «Boleto de evento», sin nombre ni lugar.", "What goes through Apple and Google: the event name, date, venue, ticket type, code and its signed QR. Never the person’s name, phone or amounts. Faith, Health and Kids: “Event ticket”, with no name or venue.") });
  B.push({ type: "note", tone: "info", icon: "info", t: E("Límites y reintentos: Configuración › Apps (Wallet). Los pases de un boleto y su historia: Eventos › el boleto › WALLET.", "Limits and retries: Settings › Apps (Wallet). A ticket’s passes and their history: Events › the ticket › WALLET.") });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* Generar la solicitud: el código al teléfono del Admin, el Pass Type ID y el motivo. Lo que vuelve es la solicitud (pública). */
function Generar({ desk, onBack, onHecho }: { desk: boolean; onBack: () => void; onHecho: (m: string) => void }) {
  const E = useE();
  const [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null), [pedido, setPedido] = useState(false);
  const [tipo, setTipo] = useState("pass.com.tolatino.boletos"), [motivo, setMotivo] = useState(""), [err, setErr] = useState<string | null>(null), [enviando, setEnviando] = useState(false);
  const pedir = async () => {
    setErr(null);
    const r = await fetch("/api/admin/llavero/codigo", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, msg: E("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string; codigoPrueba?: string };
    if (!r.ok) { setErr(r.msg ?? E("No se pudo.", "It didn’t work.")); return; }
    setPedido(true); setPrueba(r.codigoPrueba ?? null);
  };
  const enviar = async () => {
    setEnviando(true); setErr(null);
    const r = await fetch("/api/admin/llavero/solicitud", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ codigo: codigo.trim(), motivo, tipo: tipo.trim() }) })
      .then((x) => x.json()).catch(() => ({ ok: false, msg: E("Sin conexión.", "No connection.") })) as { ok: boolean; msg?: string };
    setEnviando(false);
    if (!r.ok) { setErr(r.msg ?? E("No se pudo.", "It didn’t work.")); return; }
    onHecho(r.msg ?? E("Solicitud lista.", "Request ready."));
  };
  const B: Bloque[] = [{ type: "head", eye: E("INTEGRACIONES · WALLET", "INTEGRATIONS · WALLET"), t: E("Solicitud del certificado del pase", "Pass certificate request"), s: E("La llave privada nace aquí, en el servidor, y no sale nunca. A Apple va solo la solicitud (la parte pública).", "The private key is created here, on the server, and never leaves. Only the request (the public part) goes to Apple."), onBack, h1: desk ? 26 : 22 }];
  if (!pedido) B.push({ type: "note", tone: "info", icon: "lock", t: E("Primero te mandamos un código a tu teléfono (el de tu cuenta de Admin).", "First we send a code to your phone (the one on your Admin account)."), cta: E("Mandar el código", "Send the code"), onCta: () => { void pedir(); } });
  else {
    if (prueba) B.push({ type: "note", tone: "warn", icon: "info", t: E(`MODO PRUEBAS · tu código es ${prueba}`, `TEST MODE · your code is ${prueba}`) });
    B.push({ type: "field", k: E("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "000000", im: "numeric", max: 6 });
  }
  B.push({ type: "field", k: E("PASS TYPE ID (EL QUE CREASTE EN APPLE)", "PASS TYPE ID (THE ONE YOU CREATED AT APPLE)"), val: tipo, onChange: (v) => setTipo(v.replace(/[^A-Za-z0-9.-]/g, "").slice(0, 124)), ph: "pass.com.tolatino.boletos", max: 124 });
  B.push({ type: "field", k: E("MOTIVO (QUEDA EN LA AUDITORÍA)", "REASON (KEPT IN THE AUDIT LOG)"), val: motivo, onChange: setMotivo, ph: E("Primer certificado del pase", "First pass certificate"), max: 300 });
  if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
  B.push({ type: "acts", items: [{ l: enviando ? E("Generando…", "Generating…") : E("Generar la solicitud", "Generate the request"), v: "primary", icon: "key", off: !pedido || codigo.length !== 6 || motivo.trim().length < 3 || !/^pass\./.test(tipo) || enviando, onClick: () => { void enviar(); } }] });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></div>;
}
