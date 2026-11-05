"use client";
/* SISTEMA-CATALOGO · herramienta interna (no es pantalla de usuario). Muestra cada componente portado del
   sistema de diseño renderizado con sus valores por defecto, para revisar el puerto y para el guardián visual.
   Cada pieza va aislada: si una falla, se marca y las demás siguen. */
import * as UI from "@tolatino/ui";
import { CATALOGO } from "@tolatino/ui";
import { EJEMPLOS } from "./ejemplos";
import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";

const NOMBRE_GRUPO: Record<string, string> = {
  core: "Base", navigation: "Navegación", layout: "Estructura", cards: "Tarjetas", listing: "Página del negocio",
  menu: "Menú", order: "Pedido", booking: "Citas y reservas", search: "Buscar", city: "Ciudad", account: "Cuenta",
  onboarding: "Onboarding", community: "Comunidad", compa: "El Compa", panel: "Panel", admin: "Super Admin",
  patterns: "Patrones", home: "Inicio", rides: "Transporte",
};
const ORDEN = ["core", "navigation", "layout", "cards", "listing", "menu", "order", "booking", "search", "city", "account", "onboarding", "community", "compa", "panel", "admin", "patterns", "home", "rides"];

class Aislado extends Component<{ nombre: string; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error)
      return (
        <div data-estado="error" className="rounded-sm bg-danger-tint p-3 font-mono text-[11px] text-danger">
          Sin datos de ejemplo: {this.state.error.slice(0, 140)}
        </div>
      );
    return this.props.children;
  }
}

export function Catalogo() {
  /* Solo en el navegador: los límites de error de React no atrapan fallos al prerenderizar en el servidor. */
  const [listo, setListo] = useState(false);
  useEffect(() => setListo(true), []);
  const grupos = ORDEN.filter((g) => CATALOGO[g]);
  const total = grupos.reduce((a, g) => a + (CATALOGO[g]?.length ?? 0), 0);
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-5 pb-24 pt-8">
      <header className="flex flex-col gap-2">
        <UI.Wordmark size={22} />
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
          Sistema de diseño · {total} componentes
        </span>
        <h1 className="font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em]">Catálogo</h1>
        <p className="max-w-[640px] text-[13.5px] leading-[1.62] text-text-2">
          Cada componente del sistema, portado al código y dibujado con sus valores por defecto. Los que piden datos
          para dibujarse salen marcados: se ven completos en su pantalla.
        </p>
      </header>
      {!listo && <p className="font-mono text-[11px] text-text-muted">Cargando…</p>}
      {listo && grupos.map((g) => (
        <section key={g} id={g} className="flex flex-col gap-4">
          <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
            {NOMBRE_GRUPO[g] ?? g} <span className="font-mono text-[11px] text-text-muted">· {CATALOGO[g]?.length}</span>
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 353px), 1fr))" }}>
            {(CATALOGO[g] ?? []).map((n) => {
              const C = (UI as unknown as Record<string, ComponentType<Record<string, unknown>>>)[n];
              return (
                <figure key={n} data-componente={n} className="m-0 flex flex-col gap-2">
                  <figcaption className="font-mono text-[11px] font-bold tracking-[0.06em] text-text-3">{n}</figcaption>
                  {/* transform: lo que es position:fixed (hojas, barras) queda dentro de su caja */}
                  <div
                    className="relative max-h-[640px] overflow-auto rounded-card border border-line bg-white p-3"
                    style={{ transform: "translateZ(0)" }}
                  >
                    <Aislado nombre={n}>
                      {EJEMPLOS[n] ? EJEMPLOS[n]() : C ? <C /> : <span className="text-danger">No exportado</span>}
                    </Aislado>
                    {!EJEMPLOS[n] && (
                      <span data-sin-ejemplo className="mt-2 block font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-faint">
                        Sin ejemplo · se ve con datos en su pantalla
                      </span>
                    )}
                  </div>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
