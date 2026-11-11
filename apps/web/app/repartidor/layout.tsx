import { CompuertaApp } from "@/app/_cascara/Compuerta";

/* 8a · Dentro de To'Latino Repartidor: «Actualiza la app», la pausa o el aviso suave (en la web y en la isla estática /repartidor/sin-conexion,
   nada). La página revisa la cuenta como siempre. */
export default async function LayoutRepartidor({ children }: { children: React.ReactNode }) {
  const aviso = await CompuertaApp();
  return <>{aviso}{children}</>;
}
