"use client";
/* 8f · «Baja la app de prueba» (APK propio; compuesto con el sistema: encabezado, nota, datos y acción). «Descargar» manda un formulario POST a
   ./bajar (el navegador baja el archivo) y ESO gasta el enlace; abrir esta página no. Se muestra la huella sha256 del archivo. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import type { EnlaceApk } from "@/lib/beta";

type Bi = { es: string; en: string };
export function BajarApk({ es, ficha, e, error }: { es: boolean; ficha: string; e: EnlaceApk & { nombre: Bi }; error: string | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), nombre = es ? e.nombre.es : e.nombre.en;
  const vence = new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(e.vence)).replace(/\./g, "");
  const bajar = () => { const f = document.createElement("form"); f.method = "post"; f.action = `/beta/apk/${ficha}/bajar`; document.body.appendChild(f); f.submit(); };
  const msg = error === "410" ? E2("Este enlace ya se usó o venció. Pide otro al equipo de To'Latino.", "This link was already used or expired. Ask the To'Latino team for another.")
    : error ? E2("No se pudo bajar el archivo. El enlace sigue sirviendo: prueba de nuevo en un rato.", "The file could not be downloaded. The link still works: try again in a while.") : null;
  const B: Bloque[] = [
    { type: "head", eye: E2("PROGRAMA BETA · SOLO PARA TI", "BETA PROGRAM · JUST FOR YOU"), t: E2(`${nombre} · app de prueba`, `${nombre} · test app`), s: E2("La versión de prueba para Android, contra el sandbox (datos de prueba).", "The Android test version, against the sandbox (test data).") },
    e.estado === "vivo" ? { type: "note", tone: "info", icon: "info", t: E2(`Sirve una vez: al tocar «Descargar» se gasta. Vence ${vence}.`, `It works once: tapping «Download» uses it. Expires ${vence}.`) }
      : { type: "note", tone: "warn", icon: "warning", t: e.estado === "usado" ? E2("Ya bajaste esta app con este enlace. Si necesitas otro, pídelo al equipo.", "You already downloaded the app with this link. If you need another, ask the team.") : e.estado === "vencido" ? E2("Este enlace venció. Pide otro al equipo.", "This link expired. Ask the team for another.") : E2("Este enlace se anuló. Pide otro al equipo.", "This link was cancelled. Ask the team for another.") },
    msg ? { type: "note", tone: "danger", icon: "warning", t: msg } : null,
    { type: "kv", cols: 2, items: [{ k: E2("VERSIÓN", "VERSION"), v: `${e.version} (${e.build})` }, { k: E2("TAMAÑO", "SIZE"), v: e.size ? (e.size > 1048576 ? `${(e.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(e.size / 1024))} KB`) : "—" },
      { k: "SHA-256", v: e.sha ? `${e.sha.slice(0, 16)}…${e.sha.slice(-8)}` : "—" }, { k: E2("PARA", "FOR"), v: "Android 8+" }] },
    e.estado === "vivo" ? { type: "acts", items: [{ l: E2("Descargar", "Download"), v: "primary", icon: "check", onClick: bajar }] } : null,
    { type: "note", tone: "ink", icon: "info", t: E2("Android te pide permitir apps de esta fuente la primera vez. Si te sale una advertencia, es porque no viene de Play: es la nuestra.", "Android asks you to allow apps from this source the first time. If you see a warning, it is because it does not come from Play: it is ours.") },
  ].filter(Boolean) as Bloque[];
  return <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pb-[110px] pt-4" data-pantalla="BETA-APK"><PanelBloques bloques={B} h1={22} /></div>;
}
