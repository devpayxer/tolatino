"use client";
/* USR-PRIVACIDAD (diseño «To'Latino Mi cuenta» · privV): lo que nunca cambia (tu teléfono solo lo ve el negocio de tu
   pedido o reservación, y solo mientras dura), tus sesiones abiertas (cerrar las otras), Descargar mis datos y Términos que aceptaste (9d) y
   borrar tu cuenta. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { sesionesDe } from "@/lib/perfil";
import type { misLlaves } from "@/lib/llaves/llaves";
import { agregarLlave, llaveDisponible } from "@/lib/nativo/llave";
import { metodoLlave } from "@/app/entrar/HojaLlave";
import { llaveQuitar, sesionCerrar } from "../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";
import { DEF_APPS } from "@/lib/app-nativa-comun";
import { vozGuardar } from "../../../buscar/acciones";

type S = Awaited<ReturnType<typeof sesionesDe>>;
type K = Awaited<ReturnType<typeof misLlaves>>;
/* 9m · El rótulo de una sesión de una app (L1181): «iPhone · To'Latino 1.0 (12)» (la app, su versión y su build); «Este …» si es esta. */
const APPN: Record<string, string> = Object.fromEntries(DEF_APPS.map((a) => [a.key, a.nombre.es]));
const rotulo = (x: { ua: string | null; app: string; plat: string; ver: string | null; build: number | null; esta: boolean }, es: boolean) => {
  if (x.plat === "web") { const d = disp(x.ua, es); return x.esta ? `${es ? "Este navegador" : "This browser"} · ${d.t}` : d.t; }
  const eq = /iPad/.test(x.ua ?? "") ? "iPad" : x.plat === "ios" ? "iPhone" : es ? "teléfono Android" : "Android phone";
  const app = `${APPN[x.app] ?? "To'Latino"}${x.ver ? ` ${x.ver.replace(/^(\d+\.\d+)\.0$/, "$1")}${x.build != null ? ` (${x.build})` : ""}` : ""}`;
  return `${x.esta ? (es ? `Este ${eq}` : `This ${eq}`) : /^i/.test(eq) ? eq : eq.charAt(0).toUpperCase() + eq.slice(1)} · ${app}`;
};
const disp = (ua: string | null, es: boolean) => {
  const u = ua ?? "", nav = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : es ? "Navegador" : "Browser";
  const so = /iPhone|iPad/.test(u) ? "iPhone" : /Android/.test(u) ? "Android" : /Mac OS X/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /Linux/.test(u) ? "Linux" : "";
  return { t: so ? `${nav} · ${so}` : nav, tel: /iPhone|Android/.test(u) };
};
export function Privacidad({ s, es, yo, llaves = [], agregar = false, voz = null }: { s: S; es: boolean; yo: Yo; llaves?: K; agregar?: boolean; voz?: boolean | null }) {
  const [vozOn, setVozOn] = useState<boolean>(voz === true);
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  /* 8d · Llaves de acceso: la lista (dispositivo y última vez) y «Quitar»; «Agregar» solo si aquí se ofrecen y este dispositivo guarda llaves. */
  const [puede, setPuede] = useState(false), [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (agregar) void llaveDisponible().then((x) => setPuede(x.plataforma)); }, [agregar]);
  const m = metodoLlave(es);
  const nueva = async () => {
    setOcupado(true);
    const r = await agregarLlave().catch(() => ({ ok: false } as { ok: boolean; cancelado?: boolean; mensaje?: { es: string; en: string } }));
    setOcupado(false);
    if (r.cancelado) return;
    if (r.ok) { ui.toast(E2(`Listo. La próxima vez entras con ${m.con}.`, `Done. Next time you sign in with ${m.con}.`)); return router.refresh(); }
    ui.toast(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo guardar la llave.", "The passkey couldn't be saved."));
  };
  const quitar = (id: string, nombre: string) => ui.setHoja({ title: E2(`¿Quitar la llave de ${nombre}?`, `Remove the passkey on ${nombre}?`), peligro: true,
    sub: E2("Ese dispositivo ya no entra con Face ID ni con la huella. Siempre puedes entrar con el código por texto.", "That device will no longer sign in with Face ID or fingerprint. You can always sign in with the text code."),
    yes: E2("Quitar", "Remove"), onYes: async () => { const r = await llaveQuitar(id).catch(() => null); ui.setHoja(null); ui.toast(r?.ok ? E2("Quitamos esa llave.", "That passkey was removed.") : r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not do it.")); router.refresh(); } });
  const visto = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  const cerrar = async (id: string) => { const r = await sesionCerrar(id).catch(() => null); if (r?.ok) { ui.toast(E2("Cerramos esa sesión.", "That session was signed out.")); router.refresh(); } else ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not do it.")); };
  const B: (Bloque | null)[] = [
    { type: "sec", t: E2("Quién te ve", "Who sees you"), fs: "14px", mt: "0" },
    { type: "rows", rows: [
      { ic: "lock", t: E2("Tu teléfono solo lo ve el negocio de tu pedido o tu reservación", "Only the business of your order or booking sees your phone"), s: E2("Y SOLO MIENTRAS DURA · NO SE APAGA", "AND ONLY WHILE IT LASTS · ALWAYS ON") },
      { ic: "users", t: E2("En tus reseñas sale tu nombre con la inicial del apellido", "Your reviews show your first name and last initial"), s: E2("NUNCA TU TELÉFONO NI TU DIRECCIÓN", "NEVER YOUR PHONE OR ADDRESS") },
    ] },
    { type: "sec", t: E2("Llaves de acceso", "Passkeys"), s: `${llaves.length}`, fs: "14px" },
    llaves.length ? { type: "rows", rows: llaves.map((k) => ({ key: `llave-${k.id}`, ic: "key", t: k.nombre, tag: k.sync ? [E2("SINCRONIZADA", "SYNCED"), "signal"] as [string, string] : null,
      s: k.usada ? `${E2("ÚLTIMA VEZ ", "LAST USED ")}${visto(k.usada).toUpperCase()}` : `${E2("AGREGADA ", "ADDED ")}${visto(k.creada).toUpperCase()} · ${E2("SIN USAR TODAVÍA", "NOT USED YET")}`,
      acts: [[E2("Quitar", "Remove"), "secondary", () => quitar(k.id, k.nombre)]] as [string, string, () => void][] })) }
      : { type: "note", tone: "info", ic: "key", s: E2("Con una llave de acceso entras con Face ID o tu huella, sin esperar el código. Tu cara o tu huella nunca salen de tu teléfono.", "With a passkey you sign in with Face ID or your fingerprint, no waiting for the code. Your face or fingerprint never leaves your phone.") },
    agregar && puede ? { type: "rows", rows: [{ key: "llave-nueva", ic: "plus", t: ocupado ? E2("Guardando…", "Saving…") : E2(`Agregar ${m.con} en este dispositivo`, `Add ${m.con} on this device`), s: E2("ENTRAS SIN ESPERAR EL CÓDIGO", "SIGN IN WITHOUT WAITING FOR THE CODE"), chev: true, on: () => { if (!ocupado) void nueva(); } }] } : null,
    // 9m · Buscar con la voz (L95): el aviso y su interruptor. Apagado, Buscar no muestra el micrófono.
    { type: "sec", t: E2("Buscar con la voz", "Search by voice"), fs: "14px" },
    { type: "rows", rows: [{ key: "voz", ic: "mic", t: E2("Buscar con la voz", "Search by voice"), s: vozOn ? E2("ENCENDIDO · EL MICRÓFONO SALE EN BUSCAR", "ON · THE MICROPHONE SHOWS IN SEARCH") : E2("APAGADO · SIN MICRÓFONO EN BUSCAR", "OFF · NO MICROPHONE IN SEARCH"),
      x: E2("Tu voz la convierte en texto el reconocimiento de tu teléfono o de tu navegador: Apple o Google la procesan en sus servidores, no To'Latino. A To'Latino solo llega el texto que buscas; nunca guardamos tu voz.", "Your phone's or browser's speech recognition turns your voice into text: Apple or Google process it on their servers, not To'Latino. To'Latino only gets the text you search; we never keep your voice."),
      tog: vozOn, onTog: () => { const n = !vozOn; setVozOn(n); void vozGuardar(n).then((r) => { if (!r.ok) setVozOn(!n); else ui.toast(n ? E2("Buscar con la voz, encendido.", "Search by voice on.") : E2("Buscar con la voz, apagado.", "Search by voice off.")); }); } }] },
    { type: "sec", t: E2("Sesiones abiertas", "Open sessions"), s: `${s.length}`, fs: "14px" },
    { type: "rows", rows: s.map((x) => { const d = disp(x.ua, es); return { key: x.id, ic: d.tel || x.plat !== "web" ? "phone" : "globe", t: rotulo(x, es), tag: x.esta ? [E2("ESTA", "THIS ONE"), "signal"] as [string, string] : null,
      s: `${E2("ÚLTIMA VEZ ", "LAST SEEN ")}${visto(x.visto).toUpperCase()}`, acts: x.esta ? undefined : [[E2("Cerrar", "Sign out"), "secondary", () => void cerrar(x.id)]] as [string, string, () => void][] }; }) },
    { type: "sec", t: E2("Tus datos", "Your data"), fs: "14px" },
    { type: "rows", rows: [
      // 9d · Descargar mis datos (un ZIP con lo tuyo, 24 horas) y Términos que aceptaste (con su versión y su fecha).
      { ic: "folder", t: E2("Descargar mis datos", "Download my data"), s: E2("UN ARCHIVO CON LO TUYO · LO BAJAS 24 HORAS", "A FILE WITH YOUR DATA · DOWNLOAD IT FOR 24 HOURS"), chev: true, on: () => router.push("/cuenta/ajustes/privacidad/datos") },
      { ic: "check", t: E2("Términos que aceptaste", "Terms you accepted"), s: E2("CON SU VERSIÓN Y SU FECHA", "WITH VERSION AND DATE"), chev: true, on: () => router.push("/cuenta/ajustes/privacidad/terminos") },
      { ic: "trash", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)", t: E2("Borrar mi cuenta", "Delete my account"), s: E2("TIENES 30 DÍAS PARA ARREPENTIRTE", "YOU HAVE 30 DAYS TO CHANGE YOUR MIND"), chev: true, on: () => router.push("/cuenta/ajustes/borrar") },
      // 7d · El Compa (la IA de la ayuda): qué ve, qué no, quién lee y cuánto se guarda.
      { ic: "chat", t: E2("El Compa", "El Compa"), s: E2("LA IA DE LA AYUDA · QUÉ VE Y QUIÉN LO LEE", "THE HELP AI · WHAT IT SEES AND WHO READS IT"), chev: true, on: () => router.push("/ayuda/privacidad-de-el-compa") },
      // 8i · Qué datos guarda To'Latino, para qué y cuánto (/privacidad, desde el inventario real; lo mismo que dicen las tiendas).
      { ic: "shield", t: E2("Cómo usa To'Latino tus datos", "How To'Latino uses your data"), s: E2("QUÉ GUARDAMOS, PARA QUÉ Y CUÁNTO TIEMPO", "WHAT WE KEEP, WHY AND FOR HOW LONG"), chev: true, on: () => router.push("/privacidad") }] },
    { type: "note", tone: "info", ic: "shield", s: E2("No vendemos tus datos, ni a negocios ni a nadie.", "We never sell your data, not to businesses, not to anyone.") },
  ];
  return <Marco es={es} code="USR-PRIVACIDAD" back="/cuenta/ajustes" t={E2("Privacidad y seguridad", "Privacy and security")} s={E2("QUIÉN TE VE · LLAVES · SESIONES", "WHO SEES YOU · PASSKEYS · SESSIONS")} blocks={B} yo={yo} ui={ui} />;
}
