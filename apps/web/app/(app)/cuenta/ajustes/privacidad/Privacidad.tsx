"use client";
/* USR-PRIVACIDAD (diseño «To'Latino Mi cuenta» · privV): lo que nunca cambia (tu teléfono solo lo ve el negocio de tu
   pedido o reservación, y solo mientras dura), tus sesiones abiertas (cerrar las otras) y borrar tu cuenta. Los ajustes
   de la comunidad y «Descargar mis datos» llegan con la comunidad y los correos. */
import { useRouter } from "next/navigation";
import type { sesionesDe } from "@/lib/perfil";
import { sesionCerrar } from "../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";

type S = Awaited<ReturnType<typeof sesionesDe>>;
const disp = (ua: string | null, es: boolean) => {
  const u = ua ?? "", nav = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : es ? "Navegador" : "Browser";
  const so = /iPhone|iPad/.test(u) ? "iPhone" : /Android/.test(u) ? "Android" : /Mac OS X/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /Linux/.test(u) ? "Linux" : "";
  return { t: so ? `${nav} · ${so}` : nav, tel: /iPhone|Android/.test(u) };
};
export function Privacidad({ s, es, yo }: { s: S; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const visto = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  const cerrar = async (id: string) => { const r = await sesionCerrar(id).catch(() => null); if (r?.ok) { ui.toast(E2("Cerramos esa sesión.", "That session was signed out.")); router.refresh(); } else ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not do it.")); };
  const B: Bloque[] = [
    { type: "sec", t: E2("Quién te ve", "Who sees you"), fs: "14px", mt: "0" },
    { type: "rows", rows: [
      { ic: "lock", t: E2("Tu teléfono solo lo ve el negocio de tu pedido o tu reservación", "Only the business of your order or booking sees your phone"), s: E2("Y SOLO MIENTRAS DURA · NO SE APAGA", "AND ONLY WHILE IT LASTS · ALWAYS ON") },
      { ic: "users", t: E2("En tus reseñas sale tu nombre con la inicial del apellido", "Your reviews show your first name and last initial"), s: E2("NUNCA TU TELÉFONO NI TU DIRECCIÓN", "NEVER YOUR PHONE OR ADDRESS") },
    ] },
    { type: "sec", t: E2("Sesiones abiertas", "Open sessions"), s: `${s.length}`, fs: "14px" },
    { type: "rows", rows: s.map((x) => { const d = disp(x.ua, es); return { key: x.id, ic: d.tel ? "phone" : "globe", t: d.t, tag: x.esta ? [E2("ESTA", "THIS ONE"), "signal"] as [string, string] : null,
      s: `${E2("ÚLTIMA VEZ ", "LAST SEEN ")}${visto(x.visto).toUpperCase()}`, acts: x.esta ? undefined : [[E2("Cerrar", "Sign out"), "secondary", () => void cerrar(x.id)]] as [string, string, () => void][] }; }) },
    { type: "sec", t: E2("Tus datos", "Your data"), fs: "14px" },
    { type: "rows", rows: [{ ic: "trash", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)", t: E2("Borrar mi cuenta", "Delete my account"), s: E2("TIENES 30 DÍAS PARA ARREPENTIRTE", "YOU HAVE 30 DAYS TO CHANGE YOUR MIND"), chev: true, on: () => router.push("/cuenta/ajustes/borrar") }] },
    { type: "note", tone: "info", ic: "shield", s: E2("No vendemos tus datos, ni a negocios ni a nadie.", "We never sell your data, not to businesses, not to anyone.") },
  ];
  return <Marco es={es} code="USR-PRIVACIDAD" back="/cuenta/ajustes" t={E2("Privacidad y seguridad", "Privacy and security")} s={E2("QUIÉN TE VE · SESIONES", "WHO SEES YOU · SESSIONS")} blocks={B} yo={yo} ui={ui} />;
}
