import type { Metadata } from "next";
import { SinSenalRep } from "./SinSenalRep";

/* 8a · /repartidor/sin-conexion: la isla del Repartidor (fase8-apps.md §3.1, §4 8a). Estática: sin cuenta ni datos en el HTML; lo que muestra
   sale del teléfono (lo pendiente y las entregas del turno que la app guardó con señal). Se copia en la cáscara To'Latino Repartidor y abre
   en frío sin señal. */
export const metadata: Metadata = { title: "To'Latino Repartidor · sin conexión", robots: { index: false } };
export const dynamic = "force-static";

export default function Page() {
  return <SinSenalRep />;
}
