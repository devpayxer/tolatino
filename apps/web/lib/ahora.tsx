"use client";
/* 9b-1 · «Hace 5 min», «hace 2 h», «hace 3 días» en un componente del cliente: la hora de AHORA tiene que ser la MISMA en el servidor (que
   pinta el HTML) y en el navegador (que lo hidrata). Con Date.now() en cada lado, cuando entre los dos cambiaba el minuto (o la hora, o el día)
   el texto no coincidía y React daba el error 418 (hidratación) y volvía a pintar la página entera (adm7i lo vio en /soporte).
   La raíz (app/layout.tsx) pone <AhoraProvider t={Date.now()}>: el servidor y la hidratación usan ESE instante; ya montado, el navegador pasa a
   su reloj y lo refresca cada 30 s (el texto se actualiza solo). Guardián ahoraDeLaHidratacion. */
import { createContext, useContext, useEffect, useState } from "react";

const Ahora = createContext<number | null>(null);

export function AhoraProvider({ t, children }: { t: number; children: React.ReactNode }) {
  const [v, setV] = useState(t);
  useEffect(() => {
    setV(Date.now());
    const i = setInterval(() => setV(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);
  return <Ahora.Provider value={v}>{children}</Ahora.Provider>;
}

/* El «ahora» para pintar tiempos relativos. Fuera del proveedor (no debería pasar: está en la raíz) usa el reloj. */
export function useAhora(): number {
  return useContext(Ahora) ?? Date.now();
}
