import { CompuertaApp } from "@/app/_cascara/Compuerta";

/* 8a · Entrar es común a las cuatro cáscaras: aquí también, una app por debajo del build mínimo va a «Actualiza la app», una en pausa a «Esta
   app está en pausa» y una por debajo del de aviso ve la nota (en la web, nada). */
export default async function LayoutEntrar({ children }: { children: React.ReactNode }) {
  const aviso = await CompuertaApp();
  return <>{aviso}{children}</>;
}
