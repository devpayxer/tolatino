"use client";
/* 9d · DASH-EXPORTAR · Panel › Más › Exportar los datos del negocio (hueco #4 de la Fase 9: sin pantalla en el diseño; se compone con los bloques
   del panel —encabezado, nota, filas, campo y acciones—). El archivo trae lo que el panel ya muestra (tu página, catálogo, equipo, operaciones,
   cobros, clientes con su nombre e inicial y reseñas), nunca más. Solo el dueño lo pide (con el código otra vez) y lo baja, una vez, en 24 horas. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Exportacion } from "@/lib/datos/exportar";
import { archivoCodigo, archivoPedir } from "@/app/(app)/cuenta/acciones-perfil";
import { bajarArchivo, filasArchivo, puedePedir } from "@/app/(app)/cuenta/ajustes/privacidad/datos/comun";

export function Exportar({ es, negocio, dueno, tel, archivos, dias, pruebas }: { es: boolean; negocio: { id: string; name: string }; dueno: boolean; tel: string; archivos: Exportacion[]; dias: number; pruebas: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [paso, setPaso] = useState<"ver" | "codigo">("ver"), [code, setCode] = useState(""), [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false), [prueba, setPrueba] = useState<string | null>(null);
  const atras = () => router.push(`/panel/${negocio.id}/mas`);
  const telL = tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3");
  const p = puedePedir(archivos, es);
  const pedirCodigo = async () => {
    setBusy(true); const r = await archivoCodigo().catch(() => null); setBusy(false);
    if (r?.ok) { setPaso("codigo"); setCode(""); setMsg(null); setPrueba(r.codigoPrueba ?? null); return; }
    setMsg(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
  };
  const pedir = async () => {
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true); const r = await archivoPedir(code, negocio.id).catch(() => null); setBusy(false);
    if (r?.ok) { setPaso("ver"); setMsg(E2("Listo. Te avisamos cuando el archivo esté listo.", "Done. We will let you know when the file is ready.")); router.refresh(); return; }
    setMsg(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection.")); setCode("");
  };
  const B: Bloque[] = [
    { type: "head", eye: E2("MÁS", "MORE"), t: E2("Exportar los datos del negocio", "Export business data"), s: negocio.name, onBack: atras },
    { type: "note", tone: "info", icon: "folder", t: E2("Te armamos un archivo con lo que tu panel ya muestra: tu página, tu catálogo, tu equipo, tus operaciones, tus cobros, tus clientes (nombre e inicial) y tus reseñas. Tarda unos minutos y lo bajas aquí durante 24 horas.",
      "We put together a file with what your dashboard already shows: your page, catalog, team, operations, payouts, clients (first name and initial) and reviews. It takes a few minutes and you can download it here for 24 hours.") },
  ];
  if (!dueno) {
    B.push({ type: "lock", t: E2("Solo el dueño exporta los datos del negocio", "Only the owner exports the business data"), s: E2("Pídeselo al dueño desde Equipo.", "Ask the owner from Team.") });
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, padding: "18px 16px 60px", margin: "0 auto" }}><PanelBloques bloques={B} /></div>;
  }
  B.push(archivos.length ? { type: "rows", k: E2("TU ARCHIVO", "YOUR FILE"), items: filasArchivo(archivos, es).map((f) => ({ key: f.id, icon: f.icon, t: f.t, s: f.s, tag: f.tag[0], tone: f.tag[1],
    acts: f.bajar ? [{ l: E2("Bajar", "Download"), v: "primary", icon: "folder", onClick: () => { bajarArchivo(f.id); window.setTimeout(() => router.refresh(), 2500); } }] : undefined })) }
    : { type: "empty", icon: "folder", t: E2("Todavía no pediste el archivo", "You have not requested the file yet"), s: E2("Es un ZIP con JSON y CSV, y un LEEME.", "It is a ZIP with JSON and CSV, plus a README.") });
  if (msg) B.push({ type: "note", tone: "ink", icon: "info", t: msg });
  if (paso === "codigo") {
    if (pruebas && prueba) B.push({ type: "note", tone: "warn", icon: "info", t: E2(`Sandbox: el código es ${prueba} (en producción llega por SMS).`, `Sandbox: the code is ${prueba} (in production it arrives by text).`) });
    B.push({ type: "field", k: E2("CÓDIGO QUE TE MANDAMOS POR SMS", "CODE WE TEXTED YOU"), val: code, onChange: (v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setMsg(null); }, ph: "482913", im: "numeric", max: 6, help: `${E2("Lo mandamos al ", "Sent to ")}${telL}` });
    B.push({ type: "acts", items: [{ l: E2("Pedir el archivo", "Request the file"), v: "primary", icon: "folder", off: !/^\d{6}$/.test(code) || busy, onClick: () => void pedir() }, { l: E2("Mejor no", "Never mind"), v: "secondary", icon: "close", onClick: () => setPaso("ver") }] });
  } else if (p.puede) {
    B.push({ type: "acts", items: [{ l: E2("Pedir el archivo", "Request the file"), v: "primary", icon: "folder", off: busy, onClick: () => void pedirCodigo() }] });
    B.push({ type: "note", tone: "info", icon: "lock", t: E2(`Para pedirlo te mandamos un código a tu teléfono, como al entrar. Uno cada ${dias} ${dias === 1 ? "día" : "días"}.`, `To request it we text a code to your phone, like when you sign in. One every ${dias} ${dias === 1 ? "day" : "days"}.`) });
  } else if (p.nota) B.push({ type: "note", tone: "info", icon: "clock", t: p.nota });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, padding: "18px 16px 60px", margin: "0 auto" }}><PanelBloques bloques={B} /></div>;
}
