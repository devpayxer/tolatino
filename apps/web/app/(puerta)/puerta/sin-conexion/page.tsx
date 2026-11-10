import type { Metadata } from "next";
import { SinSenal } from "./SinSenal";

/* 6h · /puerta/sin-conexion: la cáscara de To'Latino Puerta que guarda el service worker (sin cuenta ni datos en el HTML: todo sale del
   paquete cifrado del teléfono). Si la app se abre sin señal, el service worker manda aquí; con la señal de vuelta, «Volver a la puerta». */
export const metadata: Metadata = { title: "To'Latino Puerta · sin conexión", robots: { index: false } };
export const dynamic = "force-static";

export default function Page() {
  return <SinSenal />;
}
