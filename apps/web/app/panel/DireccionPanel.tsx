"use client";
/* 9m · Panel › Tu página › Dirección y mapa: la dirección del negocio como DoorDash (sugerencias reales, «Usar mi ubicación», el pin en la puerta)
   con DireccionCampo y el botón del sistema. El servidor decide el punto (acciones-direccion.ts). Si el equipo de To'Latino corrigió el punto, se
   dice aquí (el dueño ve lo que hizo el admin: triángulo panel ↔ página ↔ admin). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType } from "react";
import { DireccionCampo, type ValorDir } from "@/app/_dir/DireccionCampo";
import { direccionGuardar, direccionLeer, type DirNegocio } from "./acciones-direccion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<"Button", ComponentType<any>>;

export function DireccionPanel({ negocio, es, desk }: { negocio: string; es: boolean; desk: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), [pend, start] = useTransition();
  const [d, setD] = useState<DirNegocio | null>(null), [v, setV] = useState<ValorDir | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => {
    let vivo = true;
    void direccionLeer(negocio).then((x) => {
      if (!vivo || !x) return;
      setD(x);
      setV({ calle: x.calle, zip: x.zip, lugar: null, estado: null, origen: x.lat != null && x.lng != null ? [x.lat, x.lng] : null, pin: null, calidad: null });
    });
    return () => { vivo = false; };
  }, [negocio]);
  if (!d || !v) return <div style={{ minHeight: 180 }} aria-busy="true" />;
  const guardar = () => start(async () => {
    setMsg(null);
    const r = await direccionGuardar(negocio, { calle: v.calle, zip: v.zip, pin: v.pin }).catch(() => ({ ok: false as const, mensaje: { es: "No se pudo guardar. Revisa tu conexión.", en: "Could not save. Check your connection." } }));
    if (!r.ok) { setMsg({ ok: false, t: es ? r.mensaje.es : r.mensaje.en }); return; }
    setMsg({ ok: true, t: E2("Guardado. Tu página y el mapa ya muestran este punto.", "Saved. Your page and the map now show this point.") });
    const x = await direccionLeer(negocio); if (x) { setD(x); setV({ ...v, origen: x.lat != null && x.lng != null ? [x.lat, x.lng] : v.origen, pin: null }); }
    router.refresh();
  });
  return (
    <div data-pantalla="PANEL-DIRECCION" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {d.casa ? <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(75,55,245,.07)", color: "var(--tl-action-ink)", font: "600 12.5px/1.5 Manrope,sans-serif" }}>{E2("Trabajas desde casa: en tu página sale solo la calle; la dirección exacta la ve quien confirmas.", "You work from home: your page shows only the street; people you confirm see the exact address.")}</div> : null}
      {d.fijadoPorEquipo ? <div data-fijado="1" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,176,32,.14)", color: "var(--tl-pro-ink)", font: "600 12.5px/1.5 Manrope,sans-serif" }}>{E2(`To'Latino corrigió el punto de tu negocio el ${d.fijadoPorEquipo}. Si lo cambias, queda el tuyo.`, `To'Latino corrected your business point on ${d.fijadoPorEquipo}. If you change it, yours stays.`)}</div> : null}
      <DireccionCampo es={es} desk={desk} v={v} onV={setV} centro={d.centro} etiqueta={E2("DIRECCIÓN DEL NEGOCIO", "BUSINESS ADDRESS")} ph="412 N Wyoming St" />
      {msg ? <div role={msg.ok ? "status" : "alert"} style={{ padding: "12px 14px", borderRadius: 14, background: msg.ok ? "rgba(0,229,196,.12)" : "rgba(192,57,43,.08)", color: msg.ok ? "var(--tl-open-text)" : "var(--tl-danger)", font: "600 12.5px/1.5 Manrope,sans-serif" }}>{msg.t}</div> : null}
      <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="check" disabled={pend || v.calle.trim().length < 4 || !/^\d{5}$/.test(v.zip)} onClick={guardar}>{E2("Guardar dirección", "Save address")}</Button></div>
    </div>
  );
}
