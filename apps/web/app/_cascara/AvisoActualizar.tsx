"use client";
/* 8a · El aviso suave (hueco #3; §5: «una note que se cierra y vuelve en 7 días»): el build de la cáscara está por debajo del recomendado de
   Sistema › Apps. Nota del sistema (PanelBloques note) con «Actualizar» y una × (IconButton del sistema) que la guarda 7 días en este teléfono. */
import * as UI from "@tolatino/ui";
import { PanelBloques } from "@tolatino/ui";
import { useEffect, useState, type ComponentType } from "react";
import { abrirFuera } from "@/lib/nativo/externo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { IconButton } = UI as unknown as Record<"IconButton", ComponentType<any>>;
const CLAVE = "tl-aviso-version", DIAS = 7;

export function AvisoActualizar({ es, nombre, tienda, build }: { es: boolean; nombre: string; tienda: string; build: number }) {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    try { const x = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as { b: number; at: number } | null; setVer(!x || x.b !== build || Date.now() - x.at > DIAS * 86_400_000); } catch { setVer(true); }
  }, [build]);
  if (!ver) return null;
  const cerrar = () => { try { localStorage.setItem(CLAVE, JSON.stringify({ b: build, at: Date.now() })); } catch { /* sin almacenamiento */ } setVer(false); };
  return (
    <div data-pantalla="APP-AVISO-VERSION" style={{ position: "relative", padding: "calc(8px + env(safe-area-inset-top)) 16px 0", maxWidth: 1180, margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ paddingRight: 44 }}>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "bolt", t: es ? `Hay una versión nueva de ${nombre}.` : `There is a new version of ${nombre}.`, cta: es ? "Actualizar" : "Update", onCta: () => { void abrirFuera(tienda); } }]} />
      </div>
      <span style={{ position: "absolute", right: 16, top: "calc(12px + env(safe-area-inset-top))" }}>
        <IconButton icon="close" label={es ? "Cerrar el aviso" : "Close the notice"} onClick={cerrar} />
      </span>
    </div>);
}
