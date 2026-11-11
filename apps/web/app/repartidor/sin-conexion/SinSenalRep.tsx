"use client";
/* 8a · DLV sin señal (hueco #4 del plan de la Fase 8: compuesta como las islas de 6h, con PanelBloques del sistema): lo pendiente de enviar y
   las entregas del turno guardadas en este teléfono, con su dirección e indicaciones y «Abrir mapa» (la app de mapas del teléfono funciona
   sin la nuestra). Los pasos se marcan en la pantalla en línea: aquí solo se ve. Sin teléfonos ni montos de propina. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useEffect, useState } from "react";
import { abrirFuera } from "@/lib/nativo/externo";
import { irAlServidor } from "@/lib/nativo/puente";
import { leerCola, leerTurno, type Cola, type Turno } from "./local";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const PASO: Record<string, [string, string]> = { recogi: ["Recogí", "Picked up"], llegue: ["Llegué", "Arrived"], entregado: ["Entregado", "Delivered"] };

export function SinSenalRep() {
  const [t, setT] = useState<Turno | null | undefined>(undefined), [cola, setCola] = useState<Cola>([]), [linea, setLinea] = useState(false), [abierta, setAbierta] = useState<string | null>(null);
  useEffect(() => {
    void leerTurno().then(setT); void leerCola().then(setCola);
    const f = () => setLinea(navigator.onLine); f();
    window.addEventListener("online", f); window.addEventListener("offline", f);
    return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); };
  }, []);
  const es = t?.es ?? !/^en/i.test(typeof navigator === "undefined" ? "es" : navigator.language ?? "es");
  const E2 = (a: string, b: string) => (es ? a : b);
  const hora = (ms: number) => new Date(ms).toLocaleTimeString(es ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" });
  const B: Bloque[] = [{ type: "head", eye: E2("TO’LATINO REPARTIDOR · SIN CONEXIÓN", "TO’LATINO DRIVER · OFFLINE"), t: E2("Tus entregas en este teléfono", "Your deliveries on this phone"),
    s: t ? E2(`Guardadas a las ${hora(t.at)}. Los pasos se marcan con señal; lo que marcaste sin señal se envía solo.`, `Saved at ${hora(t.at)}. Steps are marked with signal; what you marked offline sends on its own.`) : undefined }];
  if (linea) B.push({ type: "note", tone: "ok", icon: "wifi", t: E2("Hay señal.", "There is signal."), cta: E2("Abrir el Repartidor", "Open Driver"), onCta: () => { void irAlServidor("/repartidor"); } });
  else B.push({ type: "note", tone: "warn", icon: "wifi", t: E2("Sin señal: ves lo que guardó este teléfono.", "No signal: you see what this phone saved.") });
  if (cola.length) B.push({ type: "note", tone: "warn", icon: "clock", t: E2(`${cola.length} ${cola.length === 1 ? "paso espera" : "pasos esperan"} enviarse: ${cola.map((x) => `#${x.numero} ${PASO[x.paso]?.[0] ?? x.paso}`).join(", ")}.`, `${cola.length} ${cola.length === 1 ? "step is" : "steps are"} waiting to send: ${cola.map((x) => `#${x.numero} ${PASO[x.paso]?.[1] ?? x.paso}`).join(", ")}.`) });
  const L = t?.entregas ?? [], act = L.filter((x) => x.status === "confirmed"), hechas = L.filter((x) => x.status === "done");
  const fila = (x: Turno["entregas"][number]): Fila => ({ key: x.numero, icon: x.status === "done" ? "check" : "truck", t: `#${x.numero} · ${x.calle ?? E2("Sin dirección", "No address")}`,
    s: `${x.negocio} · ${x.cliente}${x.efectivo != null ? ` · ${E2("cobrar", "collect")} ${money(x.efectivo)}` : x.pagado ? E2(" · pagado", " · paid") : ""}`, chev: x.status !== "done",
    onClick: x.status !== "done" ? () => setAbierta(abierta === x.numero ? null : x.numero) : undefined, bd: abierta === x.numero ? "1.5px solid var(--tl-ink)" : undefined });
  if (t === null || (t && !L.length)) B.push({ type: "empty", icon: "truck", t: E2("No hay entregas guardadas", "No saved deliveries"), s: E2("Abre el Repartidor una vez con señal y tus entregas de hoy quedan en este teléfono.", "Open Driver once with signal and today's deliveries stay on this phone.") });
  if (act.length) B.push({ type: "rows", k: E2("POR ENTREGAR", "TO DELIVER"), items: act.map(fila) });
  const x = act.find((y) => y.numero === abierta);
  if (x) {
    B.push({ type: "kv", cols: 1, items: [
      { k: E2("RECOGER EN", "PICK UP AT"), v: `${x.negocio}${x.dirNegocio ? ` · ${x.dirNegocio}` : ""}` },
      { k: E2("ENTREGAR EN", "DELIVER TO"), v: [x.calle, x.apto, x.zip].filter(Boolean).join(" · ") || E2("Sin dirección", "No address") },
      ...(x.indicaciones ? [{ k: E2("INDICACIONES", "NOTES"), v: x.indicaciones }] : []),
      { k: E2("COBRO", "PAYMENT"), v: x.efectivo != null ? E2(`Cobrar ${money(x.efectivo)} en efectivo`, `Collect ${money(x.efectivo)} in cash`) : E2("Pagado en la app", "Paid in the app") },
    ] });
    B.push({ type: "acts", items: [{ l: E2("Abrir mapa", "Open map"), v: "secondary", icon: "pin", onClick: () => { void abrirFuera(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${x.calle ?? ""}, ${x.zip ?? ""}`)}`); } }] });
  }
  if (hechas.length) B.push({ type: "rows", k: E2("ENTREGADAS HOY", "DELIVERED TODAY"), items: hechas.map(fila) });
  return (
    <div data-pantalla="DLV-SIN-SENAL" style={{ minHeight: "100dvh", background: "var(--tl-paper)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "max(16px, env(safe-area-inset-top)) 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        {t === undefined ? null : <PanelBloques bloques={B} h1={24} />}
      </div>
    </div>);
}
