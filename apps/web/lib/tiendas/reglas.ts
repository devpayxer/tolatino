import "server-only";
import { deLaApp } from "../app-nativa";

/* 8i · Reglas de las tiendas que el servidor aplica dentro de las apps (fase8-apps.md §3.6, §6 #6; guardianes sinCompraDigitalEnApp y
   appNoAutoriza). El rótulo TLApp aquí SOLO QUITA: dentro de To'Latino Negocios (y de cualquiera de las cuatro apps) no se vende Pro, que es una
   función digital del panel (Apple 3.1.3(f): app gratuita compañera de una herramienta web pagada; Pagos de Google Play): ni botón, ni enlace,
   ni precio; se ve el estado del plan y se compra en la web. Un rótulo falso solo le quita la compra a quien lo pone (nunca da nada). Las reglas
   de EE. UU. sobre enlaces a compras externas cambiaron en 2025: a verificar el día del envío (Fase 9). */
export async function compraDigitalAqui(): Promise<boolean> {
  return !(await deLaApp());
}
