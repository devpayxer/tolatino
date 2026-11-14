"use client";
/* 9d · USR-DATOS · Mi cuenta › Ajustes › Privacidad › Descargar mis datos (hueco #4 de la Fase 9: no hay pantalla en el diseño; se compone con
   las piezas de Mi cuenta —nota, filas, formulario y acciones— como dice el plan). La línea fija de §1c arriba; tu archivo con su estado; pedirlo
   con el código que te mandamos (como Borrar mi cuenta); «Bajar» lo baja UNA vez (POST: un enlace pegado en un chat no lo gasta). */
import { FIJAS } from "@/lib/textos-fijas";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Exportacion } from "@/lib/datos/exportar";
import { archivoCodigo, archivoPedir } from "../../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../../Marco";
import { bajarArchivo, filasArchivo, puedePedir } from "./comun";

export function Datos({ es, yo, tel, archivos, pruebas, dias }: { es: boolean; yo: Yo; tel: string; archivos: Exportacion[]; pruebas: boolean; dias: number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [paso, setPaso] = useState<"ver" | "codigo">("ver"), [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [prueba, setPrueba] = useState<string | null>(null);
  const t = E2("Descargar mis datos", "Download my data");
  const p = puedePedir(archivos, es);
  const telL = tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3");
  const pedirCodigo = async () => {
    setBusy(true); const r = await archivoCodigo().catch(() => null); setBusy(false);
    if (r?.ok) { setPaso("codigo"); setCode(""); setErr(""); setPrueba(r.codigoPrueba ?? null); return; }
    ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
  };
  const pedir = async () => {
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true); const r = await archivoPedir(code, null).catch(() => null); setBusy(false);
    if (r?.ok) { setPaso("ver"); ui.toast(E2("Listo. Te avisamos cuando tu archivo esté listo.", "Done. We will let you know when your file is ready.")); router.refresh(); return; }
    setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection.")); setCode("");
  };
  const B: Bloque[] = [
    // §1c · línea fija (verbatim).
    { type: "note", tone: "info", ic: "folder", s: E2(FIJAS.es.exportar, FIJAS.en.exportar) },
    { type: "sec", t: E2("Tu archivo", "Your file"), fs: "14px" },
  ];
  B.push(archivos.length ? { type: "rows", rows: filasArchivo(archivos, es).map((f) => ({ key: f.id, ic: f.icon, t: f.t, s: f.s, tag: f.tag, acts: f.bajar ? [[E2("Bajar", "Download"), "primary", () => { bajarArchivo(f.id); window.setTimeout(() => router.refresh(), 2500); }]] as [string, string, () => void][] : undefined })) }
    : { type: "empty", ic: "folder", t: E2("Todavía no pediste tu archivo", "You have not requested your file yet"), s: E2("Es un ZIP con lo tuyo en JSON y CSV, y un LEEME.", "It is a ZIP with your data in JSON and CSV, plus a README.") });
  if (paso === "codigo") {
    if (pruebas && prueba) B.push({ type: "note", tone: "warn", ic: "info", s: E2(`Sandbox: el código es ${prueba} (en producción llega por SMS).`, `Sandbox: the code is ${prueba} (in production it arrives by text).`) });
    B.push({ type: "form", fields: [{ k: E2("CÓDIGO QUE TE MANDAMOS POR SMS", "CODE WE TEXTED YOU"), v: code, onV: (v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setErr(""); }, ph: "482913", im: "numeric", max: 6, err, h: `${E2("Lo mandamos al ", "Sent to ")}${telL}` }] });
    B.push({ type: "acts", cols: "repeat(2,minmax(0,200px))", btns: [[E2("Pedir mi archivo", "Request my file"), "primary", "folder", () => void pedir(), !/^\d{6}$/.test(code) || busy], [E2("Mejor no", "Never mind"), "secondary", "close", () => setPaso("ver")]] });
  } else if (p.puede) {
    B.push({ type: "acts", cols: "minmax(0,280px)", btns: [[E2("Pedir mi archivo", "Request my file"), "primary", "folder", () => void pedirCodigo(), busy]] });
    B.push({ type: "note", tone: "info", ic: "lock", s: E2(`Para pedirlo te mandamos un código a tu teléfono, como al entrar. Uno cada ${dias} ${dias === 1 ? "día" : "días"}.`, `To request it we text a code to your phone, like when you sign in. One every ${dias} ${dias === 1 ? "day" : "days"}.`) });
  } else if (p.nota) B.push({ type: "note", tone: "info", ic: "clock", s: p.nota });
  B.push({ type: "note", tone: "info", ic: "shield", s: E2("Lo de otras personas no viene en tu archivo.", "Other people's data is not in your file."), a: E2("Borrar mi cuenta", "Delete my account"), onA: () => router.push("/cuenta/ajustes/borrar") });
  return <Marco es={es} code="USR-DATOS" back="/cuenta/ajustes/privacidad" t={t} s={E2("UN ZIP CON LO TUYO · 24 HORAS", "A ZIP WITH YOUR DATA · 24 HOURS")} blocks={B} yo={yo} ui={ui} />;
}
