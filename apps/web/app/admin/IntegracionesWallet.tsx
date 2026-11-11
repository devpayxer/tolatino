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

const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");
const dia = (ymd: string) => cuando(`${ymd}T12:00:00Z`);

export function IntegracionesWallet({ d, admin, listo }: { d: EstadoWallet; admin: boolean; listo: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast(), [generar, setGenerar] = useState(false);
  if (generar) return <Generar desk={desk} onBack={() => setGenerar(false)} onHecho={(m) => { setGenerar(false); setToast(m); router.refresh(); }} />;
  const c = d.cert, subir = (k: string) => router.push(`/admin/sistema/integraciones?subir=${k}`);
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Integraciones", s: "El boleto en Apple Wallet y Google Wallet: el mismo QR firmado del boleto, y cada cambio del boleto llega solo al teléfono.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: "Llaves de las tiendas", v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=push") },
      { l: "Wallet", v: "selected", onClick: () => undefined }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "PASES EMITIDOS", v: String(d.cifras.apple + d.cifras.google), s: `Apple ${d.cifras.apple} · Google ${d.cifras.google} · anulados ${d.cifras.anulados}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "TELÉFONOS QUE LOS SIGUEN", v: String(d.cifras.telefonos), s: "Apple Wallet (servicio web)" },
      { k: "POR AVISAR", v: String(d.cifras.pendientes + d.cifras.googleAtras), s: `Apple ${d.cifras.pendientes} · Google ${d.cifras.googleAtras}` },
      { k: "FALLOS · 7 DÍAS", v: String(d.cifras.fallos7), s: "avisos que se dejaron de intentar" },
    ] },
    { type: "group", k: "APPLE WALLET · CERTIFICADO DEL PASE" },
  ];
  // El certificado: falta, solicitud lista, vivo, por vencer o vencido.
  if (!c.tipo) B.push(c.solicitud
    ? { type: "note", tone: "info", icon: "key", t: `Solicitud lista desde ${cuando(c.solicitud.at)} · Pass Type ID ${c.solicitud.tipo}. Bájala y súbela en developer.apple.com › Certificates, IDs & Profiles › Identifiers › tu Pass Type ID › Create Certificate; luego sube aquí el certificado (.cer) que te dé Apple.` }
    : { type: "note", tone: "warn", icon: "warning", t: "Falta el certificado del pase de Apple: el botón «Agregar a Apple Wallet» no sale. Genera aquí la solicitud (la llave se queda en el servidor), súbela a Apple y sube aquí el .cer (Paquete 8-2, opcional)." });
  else B.push(c.dias !== null && c.dias < 0
    ? { type: "note", tone: "danger", icon: "warning", t: `El certificado venció el ${dia(c.vence!)}. No se emiten ni se actualizan pases de Apple. Genera una solicitud nueva y sube el certificado nuevo.` }
    : c.dias !== null && c.dias <= c.aviso
      ? { type: "note", tone: "warn", icon: "warning", t: `El certificado vence el ${dia(c.vence!)} (en ${c.dias} ${c.dias === 1 ? "día" : "días"}). Genera una solicitud nueva y sube el certificado nuevo: el actual sigue funcionando hasta entonces.` }
      : { type: "note", tone: "ok", icon: "check", t: `Certificado vivo · vence el ${c.vence ? dia(c.vence) : "—"}${c.dias !== null ? ` (en ${c.dias} días)` : ""}. Avisamos al equipo ${c.aviso} días antes.` });
  const filas: Fila[] = [
    { key: "tipo", icon: "ticket", t: "Pass Type ID", s: c.tipo ?? c.solicitud?.tipo ?? "—", tag: c.tipo ? "VIVO" : c.solicitud ? "SOLICITUD" : "FALTA", tone: c.tipo ? "signal" : "neutral" },
    { key: "equipo", icon: "users", t: "Equipo (Team ID)", s: c.equipo ?? "—" },
    { key: "on", icon: "bell", t: "Interruptor app.wallet.apple", s: d.on.apple ? "Encendido: se emiten pases nuevos" : "Apagado: no se emiten pases nuevos; los emitidos siguen recibiendo sus cambios", tag: d.on.apple ? "ENCENDIDO" : "APAGADO", tone: d.on.apple ? "signal" : "neutral" },
  ];
  B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: filas });
  if (admin && listo) B.push({ type: "acts", items: [
    { l: c.solicitud ? "Generar otra solicitud" : "Generar la solicitud (CSR)", icon: "key", v: c.tipo || c.solicitud ? undefined : "primary", onClick: () => setGenerar(true) },
    ...(c.solicitud ? [{ l: "Bajar la solicitud", icon: "download", onClick: () => { location.href = "/api/admin/llavero/solicitud"; } }, { l: "Subir el certificado (.cer)", icon: "plus", v: "primary", onClick: () => subir("pass_type_cert") }] : []),
  ] });
  B.push({ type: "group", k: "GOOGLE WALLET · CUENTA DE EMISOR" });
  B.push(d.google.listo
    ? { type: "note", tone: "ok", icon: "check", t: `Cuenta de servicio de Google Wallet viva · emisor ${d.google.emisor ?? "—"}${d.google.correo ? ` · ${d.google.correo}` : ""}.` }
    : { type: "note", tone: "warn", icon: "warning", t: "Falta la cuenta de emisor de Google Wallet (Paquete 8-2, opcional): el botón «Agregar a Google Wallet» no sale; Apple sí. Se sube como «Google Wallet · cuenta de servicio» con el ID del emisor." });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: [
    { key: "g-on", icon: "bell", t: "Interruptor app.wallet.google", s: d.on.google ? "Encendido: se emiten pases nuevos" : "Apagado: no se emiten pases nuevos; los emitidos siguen recibiendo sus cambios", tag: d.on.google ? "ENCENDIDO" : "APAGADO", tone: d.on.google ? "signal" : "neutral" },
    { key: "g-sa", icon: "key", t: "Cuenta de servicio", s: d.google.listo ? "En el llavero (solo se ve su huella en Llaves de las tiendas)" : "Falta", tag: d.google.listo ? "VIVA" : "FALTA", tone: d.google.listo ? "signal" : "neutral",
      ...(admin && listo ? { acts: [{ l: d.google.listo ? "Reemplazar" : "Subir archivo", icon: "plus", onClick: () => subir("google_wallet_sa") }] } : {}) },
  ] });
  B.push({ type: "note", tone: "ink", icon: "lock", t: "Lo que pasa por Apple y Google: el nombre del evento, la fecha, el lugar, el tipo de boleto, el código y su QR firmado. Nunca el nombre de la persona, su teléfono ni montos. Fe, Salud y Niños: «Boleto de evento», sin nombre ni lugar." });
  B.push({ type: "note", tone: "info", icon: "info", t: "Límites y reintentos: Configuración › Apps (Wallet). Los pases de un boleto y su historia: Eventos › el boleto › WALLET." });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* Generar la solicitud: el código al teléfono del Admin, el Pass Type ID y el motivo. Lo que vuelve es la solicitud (pública). */
function Generar({ desk, onBack, onHecho }: { desk: boolean; onBack: () => void; onHecho: (m: string) => void }) {
  const [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null), [pedido, setPedido] = useState(false);
  const [tipo, setTipo] = useState("pass.com.tolatino.boletos"), [motivo, setMotivo] = useState(""), [err, setErr] = useState<string | null>(null), [enviando, setEnviando] = useState(false);
  const pedir = async () => {
    setErr(null);
    const r = await fetch("/api/admin/llavero/codigo", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, msg: "Sin conexión." })) as { ok: boolean; msg?: string; codigoPrueba?: string };
    if (!r.ok) { setErr(r.msg ?? "No se pudo."); return; }
    setPedido(true); setPrueba(r.codigoPrueba ?? null);
  };
  const enviar = async () => {
    setEnviando(true); setErr(null);
    const r = await fetch("/api/admin/llavero/solicitud", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ codigo: codigo.trim(), motivo, tipo: tipo.trim() }) })
      .then((x) => x.json()).catch(() => ({ ok: false, msg: "Sin conexión." })) as { ok: boolean; msg?: string };
    setEnviando(false);
    if (!r.ok) { setErr(r.msg ?? "No se pudo."); return; }
    onHecho(r.msg ?? "Solicitud lista.");
  };
  const B: Bloque[] = [{ type: "head", eye: "INTEGRACIONES · WALLET", t: "Solicitud del certificado del pase", s: "La llave privada nace aquí, en el servidor, y no sale nunca. A Apple va solo la solicitud (la parte pública).", onBack, h1: desk ? 26 : 22 }];
  if (!pedido) B.push({ type: "note", tone: "info", icon: "lock", t: "Primero te mandamos un código a tu teléfono (el de tu cuenta de Admin).", cta: "Mandar el código", onCta: () => { void pedir(); } });
  else {
    if (prueba) B.push({ type: "note", tone: "warn", icon: "info", t: `MODO PRUEBAS · tu código es ${prueba}` });
    B.push({ type: "field", k: "CÓDIGO DE 6 NÚMEROS", val: codigo, onChange: (v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)), ph: "000000", im: "numeric", max: 6 });
  }
  B.push({ type: "field", k: "PASS TYPE ID (EL QUE CREASTE EN APPLE)", val: tipo, onChange: (v) => setTipo(v.replace(/[^A-Za-z0-9.-]/g, "").slice(0, 124)), ph: "pass.com.tolatino.boletos", max: 124 });
  B.push({ type: "field", k: "MOTIVO (QUEDA EN LA AUDITORÍA)", val: motivo, onChange: setMotivo, ph: "Primer certificado del pase", max: 300 });
  if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
  B.push({ type: "acts", items: [{ l: enviando ? "Generando…" : "Generar la solicitud", v: "primary", icon: "key", off: !pedido || codigo.length !== 6 || motivo.trim().length < 3 || !/^pass\./.test(tipo) || enviando, onClick: () => { void enviar(); } }] });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></div>;
}
