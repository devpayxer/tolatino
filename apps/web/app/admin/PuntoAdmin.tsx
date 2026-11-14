"use client";
/* 9m · Super Admin › Negocio › Ficha › «Punto en el mapa» (decisión AC): el punto que ven la página, el mapa y el Repartidor; «Corregir el punto»
   mueve el mapa propio debajo del pin (MapaPin) y se guarda con motivo (puntoCorregir: neg:editar, auditoría con el antes y el después; el dueño lo
   ve en Panel › Dirección y mapa). Compuesto con piezas del sistema (Button, MapaPin sobre RadiusMap). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import { MapaPin, metrosEntre } from "@/app/_dir/MapaPin";
import { puntoCorregir } from "./acciones-negocios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<"Button", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";

export function PuntoAdmin({ id, lat, lng, centro, fijado, motivoFijado, puede }: { id: string; lat: number | null; lng: number | null; centro: [number, number]; fijado: string | null; motivoFijado: string | null; puede: boolean }) {
  const router = useRouter(), [pend, start] = useTransition();
  const origen: [number, number] = lat != null && lng != null ? [lat, lng] : centro;
  const [abierto, setAbierto] = useState(false), [pin, setPin] = useState<[number, number] | null>(null), [motivo, setMotivo] = useState(""), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const guardar = () => start(async () => {
    if (!pin) return;
    const r = await puntoCorregir(id, pin[0], pin[1], motivo);
    setMsg({ ok: r.ok, t: r.mensaje ?? (r.ok ? "Listo." : "No se pudo.") });
    if (r.ok) { setAbierto(false); setPin(null); setMotivo(""); router.refresh(); }
  });
  return (
    <div data-pieza="punto-admin" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `800 10px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.45)" }}>PUNTO EN EL MAPA</div>
          <div style={{ marginTop: 6, font: "700 14px/1.4 Manrope,sans-serif" }}>{lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Sin punto: no sale como pin y cuenta como dentro del radio"}</div>
          {fijado ? <div style={{ marginTop: 4, font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{`Corregido por el equipo el ${fijado}${motivoFijado ? ` · ${motivoFijado}` : ""}`}</div> : null}
        </div>
        {puede && !abierto ? <Button variant="secondary" size="sm" icon="pin" onClick={() => { setAbierto(true); setMsg(null); }}>Corregir el punto</Button> : null}
      </div>
      {abierto ? (
        <>
          <MapaPin es origen={origen} pin={pin} onPin={setPin} maxM={60000} etiqueta="MUEVE EL MAPA · EL PIN QUEDA DONDE ESTÁ LA PUERTA" />
          {pin ? <div style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.55)" }}>{`NUEVO · ${pin[0].toFixed(5)}, ${pin[1].toFixed(5)} · ${metrosEntre(origen, pin)} M DEL PUNTO DE HOY`}</div> : null}
          <label style={{ display: "block" }}>
            <span style={{ font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>MOTIVO</span>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 300))} rows={2} placeholder="El pin estaba en la calle de atrás; la entrada da a N Wyoming St."
              style={{ marginTop: 8, width: "100%", boxSizing: "border-box", borderRadius: 13, border: "1.5px solid rgba(11,14,18,.14)", padding: "10px 12px", font: "500 14px/1.45 Manrope,sans-serif", resize: "vertical" }} />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" size="md" icon="check" disabled={pend || !pin || motivo.trim().length < 3} onClick={guardar}>Guardar punto</Button>
            <Button variant="secondary" size="md" onClick={() => { setAbierto(false); setPin(null); }}>Cancelar</Button>
          </div>
        </>
      ) : null}
      {msg ? <div role={msg.ok ? "status" : "alert"} style={{ font: "600 12.5px/1.45 Manrope,sans-serif", color: msg.ok ? "var(--tl-open-text)" : "var(--tl-danger)" }}>{msg.t}</div> : null}
    </div>
  );
}
