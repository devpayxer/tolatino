"use client";
/* 9f · Super Admin › Textos y páginas › Rótulos por categoría (fase9-apertura.md §4 9f): el nombre y el nombre corto de cada una de las categorías, en
   español e inglés, editables con motivo; la línea fija de cada categoría se ve con candado (no se edita aquí: solo cambia con el código). El nombre
   corto en español es la dirección de la categoría (/c/comida), por eso ese no se cambia. Compuesto con piezas existentes (REVISION 9f). */
import * as UI from "@tolatino/ui";
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { RotuloAdm } from "@/lib/cms-admin";
import { rotuloEditar } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { par, pestanas, selectorIdioma, type L } from "./TextosComun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const MAX = { short: 18, name: 44 } as const;

export function TextosRotulos({ filas, l, editar }: { filas: RotuloAdm[]; l: L; editar: boolean }) {
  const E = par(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<(Confirmar & { campo: "short" | "name"; cat: RotuloAdm }) | null>(null), [toast, setToast] = useToast();
  const [es, setEs] = useState(""), [en, setEn] = useState("");
  const ed = useRef({ es: "", en: "" }); ed.current = { es, en };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };

  if (conf) { const m = MAX[conf.campo]; return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-rotulo-confirmar>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · RÓTULOS", "COPY AND PAGES · LABELS"), t: conf.titulo, s: `${conf.cat.id} · ${conf.campo}`, onBack: () => setConf(null), h1: desk ? 26 : 22 },
        { type: "field", k: E("ESPAÑOL", "SPANISH"), val: es, onChange: setEs, max: m, count: `${es.length}/${m}`, lock: conf.campo === "short", help: conf.campo === "short" ? E("Es la dirección de la categoría (/c/…): no se cambia aquí.", "It is the category address (/c/…): it is not changed here.") : undefined },
        { type: "field", k: E("INGLÉS", "ENGLISH"), val: en, onChange: setEn, max: m, count: `${en.length}/${m}` }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>); }

  const abrir = (c: RotuloAdm, campo: "short" | "name") => { setEs(c[campo].es); setEn(c[campo].en);
    setConf({ campo, cat: c, titulo: campo === "short" ? E("Editar el nombre corto", "Edit the short name") : E("Editar el nombre", "Edit the name"), cta: E("Guardar el rótulo", "Save the label"),
      sub: E("Lo ve el vecino al momento. Queda en el historial con tu motivo.", "Neighbors see it right away. It goes in the history with your reason."), plantillas: [E("Más claro para el vecino.", "Clearer for neighbors."), E("Corrección de traducción.", "Translation fix.")],
      hacer: (m) => rotuloEditar(c.id, campo, ed.current.es, ed.current.en, m) }); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[
        { type: "head", eye: E("CONTROL", "CONTROL"), t: E("Textos y páginas", "Copy and pages"), h1: desk ? 26 : 22, s: E("El nombre y el nombre corto de cada categoría, en los dos idiomas. La línea fija de cada una lleva candado.", "The name and short name of each category, in both languages. Each one’s fixed line is locked.") },
        pestanas(l, "rotulos", router), selectorIdioma(l, router)]} h1={desk ? 26 : 22} />
      <A.AdminList label={`${filas.length} ${E("CATEGORÍAS", "CATEGORIES")}`} rows={filas.map((c) => ({ icon: "grid", title: `${c.name.es} · ${c.name.en}`,
        sub: `${c.id} · ${E("corto", "short")}: ${c.short.es} / ${c.short.en}${c.fixed_line ? ` · ${E("línea fija", "fixed line")}: ${c.fixed_line[l]}` : ""}`, tag: c.fixed_line ? E("LÍNEA FIJA", "FIXED LINE") : null, tone: "neutral",
        actions: editar ? [{ label: E("Editar nombre", "Edit name"), variant: "secondary", onClick: () => abrir(c, "name") }, { label: E("Editar nombre corto", "Edit short name"), variant: "secondary", onClick: () => abrir(c, "short") }] : [] }))} />
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E("El nombre corto en español es la dirección de la categoría (/c/…): cambiarlo rompería los enlaces, así que ese no se edita. La línea fija de cada categoría (por ejemplo «Si es una emergencia, llama al 911») solo cambia con el código.", "The short Spanish name is the category address (/c/…): changing it would break links, so it is not edited. Each category’s fixed line (for example “If it is an emergency, call 911”) only changes with the code.") }]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
