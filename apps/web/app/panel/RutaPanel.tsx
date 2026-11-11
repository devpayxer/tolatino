"use client";
/* 8e · Panel › pedido de delivery › el repartidor en el mapa (Entrega › Despacho; hueco #6 del plan). RutaVivoPanel escucha el SSE de la ruta
   (/api/ruta/vivo con el negocio: el servidor revisa que seas del negocio de ESE pedido con «Hoy y pedidos») y deja lo último en la pantalla;
   rutaBloque arma el bloque «mapa» (RadiusMap del sistema) con la posición, el rastro desde que empezó y la dirección del cliente. Al entregar o
   cancelar llega «fin» y el mapa desaparece. Sin ruta (todavía no empieza, otra app entrega, o no es tu pedido) no sale nada. */
import { useEffect } from "react";
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import { haceCuanto, horaCorta, mapaRuta } from "@/lib/mapa-ruta";
import { useAhora, useRutaVivo, type VistaRuta } from "@/app/_ruta/MapaVivo";

export type RutaUi = { n: string; v: VistaRuta | null; at: number };

export function RutaVivoPanel({ negocio, numero, setUi }: { negocio: string; numero: string; setUi: (p: Record<string, unknown>) => void }) {
  const { v, fin } = useRutaVivo(numero, negocio), ahora = useAhora();
  useEffect(() => { setUi({ ruta: { n: numero, v: fin ? null : v, at: ahora } satisfies RutaUi }); }, [v, fin, numero, ahora, setUi]);
  return null;
}

export function rutaBloque(r: RutaUi | undefined, numero: string, es: boolean, repartidor: string | null): Bloque | null {
  if (!r || r.n !== numero || !r.v) return null;
  const E2 = (a: string, b: string) => (es ? a : b), v = r.v, quien = repartidor ?? E2("El repartidor", "The driver");
  if (!v.pos) return { type: "mapa", k: E2("REPARTIDOR · EN VIVO", "DRIVER · LIVE"), tiles: [], dots: [], place: E2("ESPERANDO LA PRIMERA POSICIÓN", "WAITING FOR THE FIRST POSITION"),
    towns: E2(`${quien} empezó la entrega. El mapa aparece con su primera posición.`, `${quien} started the delivery. The map shows up with their first position.`) };
  const m = mapaRuta([v.pos.lat, v.pos.lng], { rastro: v.rastro ?? [], destino: v.destino ?? null, zoom: 15 });
  const vieja = r.at - Date.parse(v.pos.at) > v.viejaS * 1000;
  return { type: "mapa", k: E2("REPARTIDOR · EN VIVO", "DRIVER · LIVE"), r: horaCorta(v.pos.at, es), tiles: m.tiles, dots: m.dots,
    place: vieja ? E2(`ÚLTIMA POSICIÓN ${haceCuanto(v.pos.at, true, r.at).toUpperCase()}`, `LAST POSITION ${haceCuanto(v.pos.at, false, r.at).toUpperCase()}`) : E2("EN VIVO", "LIVE"),
    note: vieja ? E2(`Sin posición nueva desde las ${horaCorta(v.pos.at, true)}: puede que ${quien} no tenga señal.`, `No new position since ${horaCorta(v.pos.at, false)}: ${quien} may have no signal.`) : undefined,
    towns: E2(`El punto grande es ${quien}; los tenues, por dónde pasó desde que empezó; el negro, el cliente. Desaparece al entregar.`, `The big dot is ${quien}; the faint ones, where they went since starting; the black one, the client. It disappears on delivery.`) };
}
