"use client";
/* 8a · El Repartidor sin señal (fase8-apps.md §3.1 «Islas», §4 8a): lo que vive en el teléfono.
   - La COLA de pasos (recogí, llegué, entregado…) que se marcaron sin señal y se envían solos al volver (2l; el servidor ignora un paso
     repetido). Antes vivía en localStorage («tl-rep-cola-v1»): se pasa una vez al almacén y se borra de ahí.
   - El TURNO, solo dentro de la app To'Latino Repartidor: las entregas de hoy con lo que el repartidor ya ve en su pantalla para llevarlas
     (número, negocio y su dirección, nombre del cliente, dirección de entrega e indicaciones, cobrar o pagado). Sin teléfonos ni montos de
     propina. En la web no se guarda (sin la cáscara, la página sin señal no abre en frío de todos modos).
   Dónde: lib/nativo/almacen.ts (IndexedDB «tl-repartidor» en la web; TLLocal —llavero del teléfono, cifrado— en la app). Salir de la cuenta
   lo borra (olvidarTodo). */
import type { EntregaRep, PasoRep } from "@/lib/repartidor";
import { REPARTIDOR } from "@/lib/nativo/almacen";
import { esApp } from "@/lib/nativo/puente";

export type Cola = { numero: string; paso: PasoRep; efectivo?: number; at: number }[];
type FilaCola = Cola[number] & { id: string };
export type EntregaIsla = {
  numero: string; negocio: string; dirNegocio: string | null; cliente: string; calle: string | null; apto: string | null; zip: string | null;
  indicaciones: string | null; efectivo: number | null; pagado: boolean; stage: string; status: string;
};
export type Turno = { k: "turno"; at: number; es: boolean; entregas: EntregaIsla[] };
const ALM = REPARTIDOR(), VIEJA = "tl-rep-cola-v1";

export async function leerCola(): Promise<Cola> {
  try {
    const vieja = (() => { try { return JSON.parse(localStorage.getItem(VIEJA) ?? "[]") as Cola; } catch { return []; } })();
    if (vieja.length) { for (const x of vieja) await ALM.poner("cola", { ...x, id: `${x.numero}:${x.paso}:${x.at}` }); localStorage.removeItem(VIEJA); }
    return (await ALM.todos<FilaCola>("cola")).sort((a, b) => a.at - b.at).map(({ numero, paso, efectivo, at }) => ({ numero, paso, efectivo, at }));
  } catch { return []; }
}
export async function guardarCola(c: Cola) {
  try {
    await ALM.vaciar("cola");
    for (const x of c) await ALM.poner("cola", { ...x, id: `${x.numero}:${x.paso}:${x.at}` });
  } catch { /* sin almacenamiento: el paso sigue en la pantalla */ }
}
export async function guardarTurno(entregas: EntregaRep[], es: boolean) {
  if (!esApp()) return;
  try {
    const hoy = entregas.map((x): EntregaIsla => ({
      numero: x.numero, negocio: x.negocio.nombre, dirNegocio: x.negocio.direccion, cliente: x.cliente, calle: x.calle, apto: x.apto, zip: x.zip,
      indicaciones: x.entrega?.note?.slice(0, 300) || null, efectivo: x.efectivo, pagado: x.pagado, stage: x.stage, status: x.status,
    }));
    await ALM.poner("turno", { k: "turno", at: Date.now(), es, entregas: hoy } satisfies Turno);
  } catch { /* sin almacenamiento */ }
}
export async function leerTurno(): Promise<Turno | null> {
  try { return (await ALM.leer<Turno>("turno", "turno")) ?? null; } catch { return null; }
}
