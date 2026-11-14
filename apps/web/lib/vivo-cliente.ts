"use client";
/* 9m · El lado de la pantalla de Mensajes en vivo (/api/vivo, SSE propio; guardián mensajesEnVivo): una conexión EventSource por pantalla. Cada
   aviso dice de qué conversación es; la pantalla trae lo nuevo por su camino de siempre. Al conectarse (y al volver después de un corte) avisa
   «listo» para traer UNA vez lo que se perdió. Si se cae, se vuelve a conectar sola con espera creciente (1 s, 2 s, 4 s… hasta 30 s): nunca
   pregunta cada N segundos. Con la pestaña escondida no hace nada distinto: el aviso llega igual y la pantalla decide. */
import { useEffect, useRef } from "react";

export type AvisoVivo = { k: "chat" | "dm"; t: string; con: string; para: "yo" | "negocio" };

export function useMensajesVivo(o: { negocio?: string | null; on: (x: AvisoVivo) => void; listo?: () => void; apagado?: boolean }) {
  const cb = useRef(o.on), lc = useRef(o.listo);
  cb.current = o.on; lc.current = o.listo;
  useEffect(() => {
    if (o.apagado || typeof EventSource === "undefined") return;
    let s: EventSource | null = null, otra: ReturnType<typeof setTimeout> | null = null, vivo = true, espera = 1000;
    const abrir = () => {
      if (!vivo) return;
      s = new EventSource(`/api/vivo${o.negocio ? `?negocio=${encodeURIComponent(o.negocio)}` : ""}`);
      s.addEventListener("listo", () => { espera = 1000; try { lc.current?.(); } catch { /* la pantalla decide */ } });
      s.addEventListener("msg", (e) => { try { cb.current(JSON.parse((e as MessageEvent<string>).data) as AvisoVivo); } catch { /* un aviso roto no cambia nada */ } });
      s.onerror = () => {
        s?.close(); s = null;
        if (vivo && !otra) otra = setTimeout(() => { otra = null; abrir(); }, espera);
        espera = Math.min(espera * 2, 30000);
      };
    };
    abrir();
    return () => { vivo = false; s?.close(); if (otra) clearTimeout(otra); };
  }, [o.negocio, o.apagado]);
}
