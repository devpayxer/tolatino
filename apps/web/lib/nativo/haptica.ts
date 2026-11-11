"use client";
/* 8e · Háptica en lo que confirma (fase8-apps.md §3.1 «Lo que se siente nativo»: escaneo, pagar, confirmar, entregado). En la app: el motor de
   vibración del sistema (@capacitor/haptics: el golpe de «hecho» de iOS y Android). En la web: navigator.vibrate donde exista (Android; iOS
   Safari no vibra). Nunca es la única señal: la pantalla siempre dice lo que pasó. Ningún otro archivo llama a navigator.vibrate (guardián
   hapticaPorElPuente). */
import { plugin } from "./puente";

type Haptics = { notification(o: { type: "SUCCESS" | "WARNING" | "ERROR" }): Promise<void>; impact(o: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void> };
export type Golpe = "hecho" | "aviso" | "error" | "toque";
const WEB: Record<Golpe, number | number[]> = { hecho: 80, aviso: [60, 60, 60], error: [120, 80, 120], toque: 20 };

export function vibrar(g: Golpe): void {
  const p = plugin<Haptics>("Haptics");
  if (!p) { try { navigator.vibrate?.(WEB[g]); } catch { /* sin vibración no pasa nada */ } return; }
  void (g === "toque" ? p.impact({ style: "LIGHT" }) : p.notification({ type: g === "hecho" ? "SUCCESS" : g === "aviso" ? "WARNING" : "ERROR" })).catch(() => undefined);
}
