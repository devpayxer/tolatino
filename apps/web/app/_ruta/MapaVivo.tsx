"use client";
/* 8e · El mapa en vivo de una entrega (hueco #6 del plan, compuesto con RadiusMap del sistema y las teselas propias; lib/mapa-ruta.ts).
   - useRutaVivo(): escucha /api/ruta/vivo (SSE). El servidor decide quién lo ve (el cliente de ese pedido desde «Recogí», el negocio de ese pedido);
     a cualquier otro le contesta 404 y aquí no se muestra nada. Si el SSE se cae, vuelve a intentar cada 10 s. «fin» = la entrega terminó: el
     mapa desaparece y la pantalla se actualiza.
   - <MapaVivo>: la pieza del pedido del cliente. Solo la última posición (sin rastro) y su hora; sin hora de llegada inventada. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { haceCuanto, horaCorta, mapaRuta } from "@/lib/mapa-ruta";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { RadiusMap } = UI as unknown as Record<"RadiusMap", ComponentType<any>>;
export type VistaRuta = { estado: "vivo"; pos: { lat: number; lng: number; at: string; acc: number | null } | null; desde: string; rastro?: [number, number][]; destino?: [number, number] | null; viejaS: number };

export function useRutaVivo(pedido: string | null, negocio?: string): { v: VistaRuta | null; fin: boolean } {
  const [v, setV] = useState<VistaRuta | null>(null), [fin, setFin] = useState(false);
  useEffect(() => {
    setV(null); setFin(false);
    if (!pedido) return;
    let s: EventSource | null = null, otra: ReturnType<typeof setTimeout> | null = null, vivo = true;
    const abrir = () => {
      if (!vivo) return;
      s = new EventSource(`/api/ruta/vivo?pedido=${encodeURIComponent(pedido)}${negocio ? `&negocio=${encodeURIComponent(negocio)}` : ""}`);
      s.addEventListener("pos", (e) => { try { setV(JSON.parse((e as MessageEvent<string>).data) as VistaRuta); } catch { /* un mensaje roto no cambia nada */ } });
      s.addEventListener("fin", () => { setFin(true); setV(null); s?.close(); s = null; });
      s.onerror = () => { s?.close(); s = null; if (vivo && !otra) otra = setTimeout(() => { otra = null; abrir(); }, 10000); };
    };
    abrir();
    return () => { vivo = false; s?.close(); if (otra) clearTimeout(otra); };
  }, [pedido, negocio]);
  return { v, fin };
}

/* El reloj para «hace N min» (cada 20 s). */
export function useAhora(cada = 20000): number {
  const [a, setA] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setA(Date.now()), cada); return () => clearInterval(i); }, [cada]);
  return a;
}

export function MapaVivo({ pedido, es, repartidor }: { pedido: string; es: boolean; repartidor: string | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), { v, fin } = useRutaVivo(pedido), ahora = useAhora();
  useEffect(() => { if (fin) router.refresh(); }, [fin, router]);
  if (!v || fin) return null;
  const quien = repartidor ?? E2("El repartidor", "The driver");
  if (!v.pos) return (
    <div data-pantalla="APP-PEDIDO-MAPA" className="rounded-[18px] border border-line bg-white px-4 py-3.5">
      <RadiusMap label={E2("EN CAMINO · EN VIVO", "ON THE WAY · LIVE")} tiles={[]} dots={[]} circle={0}
        place={E2("ESPERANDO LA PRIMERA POSICIÓN", "WAITING FOR THE FIRST POSITION")} towns={E2(`${quien} ya va en camino. El mapa aparece con su primera posición.`, `${quien} is on the way. The map shows up with their first position.`)} />
    </div>);
  const m = mapaRuta([v.pos.lat, v.pos.lng], { destino: v.destino ?? null, zoom: 16 });
  const vieja = ahora - Date.parse(v.pos.at) > v.viejaS * 1000;
  return (
    <div data-pantalla="APP-PEDIDO-MAPA" data-vieja={vieja ? "1" : "0"} className="rounded-[18px] border border-line bg-white px-4 py-3.5">
      <RadiusMap label={E2("EN CAMINO · EN VIVO", "ON THE WAY · LIVE")} radius={horaCorta(v.pos.at, es)} tiles={m.tiles} dots={m.dots} circle={0}
        place={vieja ? E2(`ÚLTIMA POSICIÓN ${haceCuanto(v.pos.at, true, ahora).toUpperCase()}`, `LAST POSITION ${haceCuanto(v.pos.at, false, ahora).toUpperCase()}`) : E2("EN VIVO", "LIVE")}
        note={vieja ? E2(`No llega una posición nueva desde las ${horaCorta(v.pos.at, true)}: puede que ${quien} no tenga señal. Se actualiza sola.`, `No new position since ${horaCorta(v.pos.at, false)}: ${quien} may have no signal. It updates on its own.`) : undefined}
        towns={E2(`El punto morado es ${quien}; el negro, tu dirección. Lo ves hasta que te entregue.`, `The purple dot is ${quien}; the black one, your address. You see it until delivery.`)} />
    </div>);
}
