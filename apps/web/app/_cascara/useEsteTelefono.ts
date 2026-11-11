"use client";
/* 8c · «Avisos en este teléfono» (fase8-apps.md §4 8c, hueco #8): el mismo interruptor en Mi cuenta › Avisos y en Panel › Más › Tus apps. Lee el
   permiso del sistema o del navegador y si ESTA sesión tiene un token vivo (lo dice el servidor); encender pide el permiso en el mismo toque
   (Safari lo exige) y registra; apagar lo revoca en el servidor y suelta la suscripción. Lo crítico sigue llegando por SMS. */
import { useCallback, useEffect, useState } from "react";
import { avisosDispositivos } from "./acciones-avisos";
import { activarAvisos, desactivarAvisos, estadoAvisos, prepararAvisos, type EstadoAvisos } from "@/lib/nativo/avisos";

export type EsteTelefono = { est: EstadoAvisos | null; aqui: boolean; ocupado: boolean; tg: () => void };
export function useEsteTelefono(es: boolean, aviso: (m: string) => void, alCambiar?: () => void, esteInicial?: boolean): EsteTelefono {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [est, setEst] = useState<EstadoAvisos | null>(null), [este, setEste] = useState<boolean>(!!esteInicial), [ocupado, setOcupado] = useState(false);
  const leer = useCallback(async () => {
    setEst(await estadoAvisos());
    if (esteInicial === undefined) setEste((await avisosDispositivos().catch(() => [])).some((d) => d.este));
  }, [esteInicial]);
  useEffect(() => { void leer(); void prepararAvisos(); }, [leer]);
  useEffect(() => { if (esteInicial !== undefined) setEste(esteInicial); }, [esteInicial]);
  const aqui = est === "concedido" && este;
  const tg = () => {
    if (ocupado) return;
    setOcupado(true);
    const fin = (m: string, ahora: boolean) => { setOcupado(false); setEste(ahora); void estadoAvisos().then(setEst); aviso(m); alCambiar?.(); };
    if (aqui) void desactivarAvisos().then((ok) => fin(ok ? E2("Avisos apagados en este teléfono.", "Notifications turned off on this phone.") : E2("No se pudo. Prueba de nuevo.", "Could not. Try again."), !ok));
    else void activarAvisos().then((r) => fin(r.ok ? E2("Listo: los avisos te llegan a este teléfono.", "Done: notifications reach this phone.")
      : r.motivo === "negado" ? E2("Los avisos quedaron bloqueados para To'Latino en este teléfono.", "Notifications are blocked for To'Latino on this phone.")
      : E2("No se pudo encender. Prueba de nuevo.", "Could not turn on. Try again."), r.ok));
  };
  return { est, aqui, ocupado, tg };
}
