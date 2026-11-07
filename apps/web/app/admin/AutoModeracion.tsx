"use client";
/* 5d · ADM-CONT › Auto-moderación (Super Admin.dc.html secCont sub «auto»): las 6 reglas con su interruptor y su texto (+ el umbral de
   auto-ocultar), sus valores, las listas de términos ES/EN (odio · estafa · inmigración · autolesión) y los límites del día. «Teléfonos»
   no se apaga (lo impone la base) y se ve con candado. La regla de fotos dice si el modelo propio responde y, si está apagada o no
   responde, por qué y qué pasa con las fotos. Cada cambio pide motivo y queda en la auditoría. El servidor decide. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AutoMod } from "@/lib/admin-confianza";
import { LIMITES, PARAMS, REGLAS, TIPOS_TERMINO, textoRegla, type ReglaKey } from "@/lib/moderacion-comun";
import { limiteCambiar, reglaCambiar, reglaParams, terminoAgregar, terminoApagar } from "./acciones-confianza";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

export function AutoModeracion({ d, edita, arriba }: { d: AutoMod; edita: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [lista, setLista] = useState<string>("odio"), [vals, setVals] = useState<{ k: ReglaKey; v: Record<string, string> } | null>(null);
  const valsRef = useRef(vals); valsRef.current = vals;
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); setVals(null); router.refresh(); };
  const sinPermiso = () => setToast("Tu rol no edita reglas.");
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO · AUTO-MODERACIÓN", t: conf.titulo, onBack: () => { setConf(null); setVals(null); }, h1: desk ? 26 : 22 }]} />
      {vals && <PanelBloques bloques={(PARAMS[vals.k] ?? []).map(([key, label, min, max]) => ({ type: "field" as const, k: `${label.toUpperCase()} · ${min}–${max}`, val: vals.v[key] ?? "", im: "decimal", onChange: (v: string) => setVals((x) => (x ? { ...x, v: { ...x.v, [key]: v.replace(/[^\d.,]/g, "").slice(0, 6) } } : x)) }))} />}
      <ConfirmarMotivo c={{ ...conf, titulo: "¿Por qué?" }} desk={desk} onBack={() => { setConf(null); setVals(null); }} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const img = d.img, ri = d.reglas.find((r) => r.k === "img")!;
  const estadoImg = !ri.on ? "Apagada: las fotos de la Comunidad se publican sin pasar por el modelo. Enciéndela para revisarlas antes de que se vean."
    : !img.configurado ? "Encendida, pero el servicio no está configurado aquí: cada foto nueva espera revisión manual en Medios marcados (nunca se publica sin revisar)."
      : img.ok ? `Encendida · ${img.modelo ?? "modelo propio"} · responde en ${img.ms} ms. Solo mide desnudez; violencia y texto promocional los revisa una persona.`
        : "Encendida, pero el servicio no responde: cada foto nueva espera revisión manual en Medios marcados (nunca se publica sin revisar).";
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "ink", icon: "shield", t: "Las reglas marcan; una persona decide. Nada se oculta solo salvo los teléfonos (se frenan antes de publicarse) y el auto-ocultar por reportes de personas distintas (con aviso y apelación)." },
    { type: "group", k: "REGLAS" },
    { type: "rows", items: d.reglas.map((r) => {
      const R = REGLAS[r.k], fija = !!R.fija;
      return { key: r.k, icon: r.k === "img" ? "image" : r.k === "autohide" ? "ban" : "bolt", t: R.t,
        s: `${textoRegla(r.k, r.params)}${fija ? ` ${R.fija}` : ""}${r.k === "img" ? ` · ${estadoImg}` : ""}${r.quien ? ` · Último cambio: ${r.quien}` : ""}`,
        m: `${r.n30} EN 30 DÍAS`, tag: r.k === "img" && ri.on ? (img.ok ? "RESPONDE" : "NO RESPONDE") : undefined, tone: img.ok ? "signal" : "danger",
        tgOn: r.on, onTg: fija ? () => setToast(R.fija!) : !edita ? sinPermiso : () => setConf({ titulo: "", sub: `${r.on ? "Apagar" : "Encender"} «${R.t}». Queda en la auditoría.`, peligro: r.on, cta: r.on ? "Apagar" : "Encender",
          plantillas: r.on ? ["Da demasiados falsos positivos", "Prueba controlada"] : ["Volver a la regla de siempre"], hacer: (m) => reglaCambiar(r.k, !r.on, m) }),
        acts: PARAMS[r.k] && edita ? [{ l: "Cambiar valores", v: "secondary", icon: "edit", onClick: () => { setVals({ k: r.k, v: Object.fromEntries((PARAMS[r.k] ?? []).map(([key]) => [key, String(r.params[key] ?? "")])) }); setConf({ titulo: "", sub: `Valores de «${R.t}».`, cta: "Guardar", plantillas: ["Ajuste por falsos positivos", "Más estricto"], hacer: (m) => reglaParams(r.k, valsRef.current?.v ?? {}, m) }); } }] : undefined };
    }) },
    { type: "group", k: "LISTAS DE TÉRMINOS (ES/EN)" },
    { type: "chips", items: TIPOS_TERMINO.map(([k, l]) => ({ l: `${l} · ${d.terminos.filter((t) => t.kind === k && t.enabled).length}`, v: lista === k ? "selected" : "filter", onClick: () => setLista(k) })) },
    { type: "note", tone: "info", t: lista === "autolesion" ? "Autolesión: siempre activa (aunque la regla de listas esté apagada). Marca con prioridad y quien escribe ve la línea del 988." : lista === "migra" ? "Inmigración: va con prioridad. Los avisos de operativos se permiten sin fotos de personas, placas ni direcciones; nunca se pide ni se señala el estatus de nadie." : "Marcan para revisión; nunca ocultan solas. Un término se apaga, no se borra." },
    { type: "rows", items: d.terminos.filter((t) => t.kind === lista).map((t) => ({ key: t.id, t: t.term, s: t.lang === "es" ? "Español" : "Inglés", tgOn: t.enabled, dim: !t.enabled,
      onTg: !edita ? sinPermiso : () => setConf({ titulo: "", sub: `${t.enabled ? "Apagar" : "Encender"} «${t.term}».`, cta: t.enabled ? "Apagar" : "Encender", plantillas: ["Da falsos positivos", "Se usa en el barrio sin mala intención", "Volver a marcarlo"], hacer: (m) => terminoApagar(t.id, !t.enabled, m) }) })) },
    ...(edita ? [{ type: "acts" as const, items: [{ l: "Agregar término", v: "secondary", icon: "plus", onClick: () => setConf({ titulo: "", sub: `A la lista «${TIPOS_TERMINO.find((x) => x[0] === lista)?.[1]}». Palabra o frase, en minúsculas.`, cta: "Agregar",
      elegir: { label: "IDIOMA", items: [{ k: "es", l: "Español" }, { k: "en", l: "Inglés" }] }, valor: { k: "TÉRMINO", ini: "", max: 60 }, plantillas: ["Lo reportaron vecinos", "Revisión de la lista"],
      hacer: (m, e, v) => terminoAgregar(e ?? "es", lista, v, m) }) }] }] : []),
    { type: "group", k: "LÍMITES DEL DÍA (POR PERSONA)" },
    { type: "note", tone: "info", t: "Día local de la ciudad. La mitad el primer día de la cuenta. Al llegar al límite, la app dice cuál y hasta cuándo." },
    { type: "rows", items: d.limites.map((x) => ({ key: x.k, icon: "clock", t: `${x.v} ${LIMITES[x.k].es} al día`, s: `De fábrica: ${LIMITES[x.k].def}`,
      acts: edita ? [{ l: "Cambiar", v: "secondary", icon: "edit", onClick: () => setConf({ titulo: "", sub: `Límite de ${LIMITES[x.k].es} al día por persona.`, cta: "Guardar", valor: { k: `${LIMITES[x.k].es.toUpperCase()} AL DÍA`, ini: String(x.v), max: 4 }, plantillas: ["Mucho spam", "Vecinos llegan al límite sin abusar"], hacer: (m, _e, v) => limiteCambiar(x.k, v, m) }) }] : undefined })) },
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
