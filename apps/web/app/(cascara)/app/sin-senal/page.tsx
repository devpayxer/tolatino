import type { Metadata } from "next";
import { SinSenalApp } from "../Estados";

/* 8a · «Sin señal» al abrir en frío (hueco #4): la página local de cada cáscara (server.errorPath y su index.html). Estática: se copia del build
   al paquete de la app (apps/mobile/scripts/islas.mjs) y abre sin servidor. Dice qué hacer y lleva a la isla de esa app (Puerta, Mis boletos,
   Repartidor) que funciona sin señal; «Probar otra vez» vuelve al servidor. Sin cuenta ni datos en el HTML. */
export const metadata: Metadata = { title: "Sin señal · To'Latino", robots: { index: false } };
export const dynamic = "force-static";

export default function Page() {
  return <SinSenalApp />;
}
