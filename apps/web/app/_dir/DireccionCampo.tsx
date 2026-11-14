"use client";
/* 9m · La dirección como DoorDash/Uber (decisión AC): se escribe y salen sugerencias reales de nuestra base mientras se escribe (calle, número, ciudad,
   estado y código postal; /api/direcciones), «Usar mi ubicación» (el GPS del teléfono → la dirección más cercana, sin guardar el punto) y el pin
   ajustable sobre el mapa propio (MapaPin). Sin Google, Mapbox ni Here (guardián direccionSinTerceros). La usan Mis direcciones, el pago con
   delivery (por Mis direcciones), Publica tu negocio y el panel (la dirección del negocio). Combobox accesible (WAI-ARIA 1.2): flechas, Enter,
   Escape. Compuesto con los campos de Mi cuenta y SearchResultRow del sistema (REVISION 9m). */
import * as UI from "@tolatino/ui";
import { useEffect, useId, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { LL } from "@/lib/mapa-geo";
import { MapaPin } from "./MapaPin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon } = UI as unknown as Record<"Icon", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
export type Sug = { linea: string; sub: string; calle: string; numero: string | null; zip: string; lugar: string | null; estado: string; lat: number; lng: number; calidad: "punto" | "numero" | "calle" };
export type ValorDir = { calle: string; zip: string; lugar: string | null; estado: string | null; origen: LL | null; pin: LL | null; calidad: Sug["calidad"] | "puerta" | null };

export function DireccionCampo({ es, v, onV, err, errZip, centro, conMapa = true, desk = false, etiqueta, ph, entre, marco, sinZip = false }: {
  es: boolean; v: ValorDir; onV: (v: ValorDir) => void; err?: string; errZip?: string; centro?: LL | null; conMapa?: boolean; desk?: boolean; etiqueta?: string; ph?: string;
  entre?: ReactNode; marco?: string; sinZip?: boolean;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const id = useId(), [abierta, setAbierta] = useState(false), [items, setItems] = useState<Sug[]>([]), [act, setAct] = useState(-1);
  const [buscando, setBuscando] = useState(false), [gps, setGps] = useState<"" | "buscando" | "nada" | "negado">("");
  const ctl = useRef<AbortController | null>(null), t = useRef<number | undefined>(undefined), ultima = useRef("");
  const set = (o: Partial<ValorDir>) => onV({ ...v, ...o });

  // Mientras se escribe: espera 140 ms sin teclas y pide; la respuesta vieja nunca pisa a la nueva.
  useEffect(() => () => { ctl.current?.abort(); window.clearTimeout(t.current); }, []);
  const pedir = (q: string) => {
    window.clearTimeout(t.current);
    if (q.replace(/[^a-z0-9]/gi, "").length < 3) { setItems([]); return; }
    t.current = window.setTimeout(async () => {
      ctl.current?.abort(); const c = new AbortController(); ctl.current = c; ultima.current = q; setBuscando(true);
      const p = new URLSearchParams({ q }); if (centro) { p.set("lat", String(centro[0])); p.set("lng", String(centro[1])); }
      try {
        const r = await fetch(`/api/direcciones?${p}`, { signal: c.signal, cache: "no-store" });
        const j = (await r.json()) as { items?: Sug[] };
        if (ultima.current === q) { setItems(j.items ?? []); setAct(-1); setAbierta(true); }
      } catch { /* cancelada o sin red: se queda lo que había */ } finally { if (ultima.current === q) setBuscando(false); }
    }, 140);
  };
  const elegir = (s: Sug) => {
    setAbierta(false); setItems([]);
    onV({ calle: s.calidad === "calle" ? s.linea : s.calle, zip: s.zip, lugar: s.lugar, estado: s.estado, origen: [s.lat, s.lng], pin: null, calidad: s.calidad });
  };
  const miUbicacion = () => {
    if (!("geolocation" in navigator)) { setGps("nada"); return; }
    setGps("buscando");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`/api/direcciones?inversa=1&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`, { cache: "no-store" });
        const j = (await r.json()) as { item?: { calle: string; zip: string | null; lugar: string | null; estado: string | null; lat: number; lng: number; calidad: Sug["calidad"] } | null };
        if (!j.item || !j.item.zip) { setGps("nada"); return; }
        setGps(""); setAbierta(false);
        // El punto del GPS es la puerta de quien lo pidió (más fino que la dirección más cercana).
        const origen: LL = [j.item.lat, j.item.lng], puerta: LL = [pos.coords.latitude, pos.coords.longitude];
        onV({ calle: j.item.calle, zip: j.item.zip, lugar: j.item.lugar, estado: j.item.estado, origen, pin: puerta, calidad: "puerta" });
      } catch { setGps("nada"); }
    }, (e) => setGps(e.code === 1 ? "negado" : "nada"), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  const bd = err ? "var(--tl-danger)" : v.calle.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.14)";
  const campo: CSSProperties = { marginTop: 8, width: "100%", boxSizing: "border-box", borderRadius: 13, border: `1.5px solid ${bd}`, outline: "none", color: "var(--tl-ink)", background: "var(--tl-white)", height: 50, padding: "0 14px", font: "600 16px Manrope,sans-serif" };
  const k: CSSProperties = { font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" };
  const lista = `${id}-lista`, verLista = abierta && items.length > 0;
  return (
    <div data-pieza="direccion" data-screen-label={marco} style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "relative" }}>
        <label htmlFor={`${id}-calle`} style={k}>{etiqueta ?? E2("CALLE Y NÚMERO", "STREET AND NUMBER")}</label>
        <input id={`${id}-calle`} role="combobox" aria-autocomplete="list" aria-expanded={verLista} aria-controls={lista} aria-activedescendant={act >= 0 ? `${id}-s${act}` : undefined}
          aria-invalid={!!err} autoComplete="off" value={v.calle} placeholder={ph ?? "123 N Wyoming St"} maxLength={120}
          onChange={(e) => { const x = e.target.value.slice(0, 120); onV({ ...v, calle: x, origen: null, pin: null, calidad: null }); pedir(x); }}
          onFocus={() => { if (items.length) setAbierta(true); }}
          onBlur={() => window.setTimeout(() => setAbierta(false), 160)}
          onKeyDown={(e) => {
            if (!verLista) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(items.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && act >= 0) { e.preventDefault(); elegir(items[act]!); }
            else if (e.key === "Escape") { setAbierta(false); }
          }}
          style={campo} />
        {verLista ? (
          <ul id={lista} role="listbox" aria-label={E2("Direcciones sugeridas", "Suggested addresses")} data-pieza="sugerencias"
            style={{ listStyle: "none", margin: "6px 0 0", padding: 6, position: "absolute", left: 0, right: 0, zIndex: 60, borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.1)", boxShadow: "0 18px 40px -20px rgba(11,14,18,.5)" }}>
            {items.map((s, i) => (
              <li key={`${s.linea}|${s.zip}`} id={`${id}-s${i}`} role="option" aria-selected={act === i} onMouseDown={(e) => { e.preventDefault(); elegir(s); }} onMouseEnter={() => setAct(i)}
                style={{ display: "flex", gap: 11, alignItems: "center", padding: "10px 10px", borderRadius: 12, cursor: "pointer", background: act === i ? "var(--tl-paper)" : "transparent" }}>
                <span style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="pin" size={16} color="var(--tl-action)" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", font: "700 14px/1.3 Manrope,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.linea}</span>
                  <span style={{ display: "block", marginTop: 3, font: `600 9.5px/1.4 ${MONO}`, letterSpacing: ".05em", color: "rgba(11,14,18,.5)" }}>{s.sub.toUpperCase()}{s.calidad === "calle" ? E2(" · FALTA EL NÚMERO", " · NUMBER MISSING") : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {abierta && !buscando && !items.length && v.calle.replace(/[^a-z0-9]/gi, "").length >= 3 ? (
          <div role="status" style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{E2("No la encontramos así. Revisa el número y la calle, o escríbela completa con el código postal.", "We could not find it like that. Check the number and street, or type it in full with the ZIP code.")}</div>
        ) : null}
        {err ? <div role="alert" style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</div> : null}
        <button type="button" onClick={miUbicacion} disabled={gps === "buscando"} data-accion="mi-ubicacion"
          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: 0, padding: "6px 0", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>
          <Icon name="pin" size={15} color="var(--tl-action)" />{gps === "buscando" ? E2("Buscando dónde estás…", "Finding where you are…") : E2("Usar mi ubicación", "Use my location")}
        </button>
        {gps === "negado" ? <div role="status" style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Sin permiso de ubicación: escríbela arriba. Puedes darlo en los ajustes del teléfono.", "No location permission: type it above. You can allow it in your phone settings.")}</div> : null}
        {gps === "nada" ? <div role="status" style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("No encontramos una dirección donde estás. Escríbela arriba.", "We could not find an address where you are. Type it above.")}</div> : null}
      </div>
      {entre}
      <div style={sinZip ? { display: "none" } : undefined}>
        <label htmlFor={`${id}-zip`} style={k}>{E2("CÓDIGO POSTAL", "ZIP CODE")}</label>
        <input id={`${id}-zip`} inputMode="numeric" value={v.zip} maxLength={5} placeholder="18201" aria-invalid={!!errZip}
          onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5), origen: null, pin: null, calidad: null })}
          style={{ ...campo, border: `1.5px solid ${errZip ? "var(--tl-danger)" : v.zip ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}` }} />
        {errZip ? <div role="alert" style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{errZip}</div>
          : v.lugar || v.estado ? <div style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.5)" }}>{[v.lugar, v.estado].filter(Boolean).join(", ")}</div> : null}
      </div>
      {conMapa && v.origen ? <MapaPin es={es} desk={desk} origen={v.origen} pin={v.pin} onPin={(p) => set({ pin: p, calidad: p ? "puerta" : v.calidad === "puerta" ? "numero" : v.calidad })} /> : null}
    </div>
  );
}
