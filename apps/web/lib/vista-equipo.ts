import "server-only";
import { cache } from "react";

/* 9n-23 · «Panel del dueño» (Super Admin › Negocio 360°): la marca de SOLO LECTURA de una petición. La pone UNA sola pieza, la página del panel
   (app/panel/[id]/[[...r]]/page.tsx), cuando entra alguien del equipo con neg:ver por accesoPanelSoloLectura (lib/panel.ts). Vive lo que vive la
   petición (cache de React: cada petición tiene la suya; fuera de una petición, o en una acción del servidor, siempre es «no»).

   Para qué sirve: leer el panel no puede dejar huella del dueño ni sacar lo privado. Con la marca puesta:
   - no se marca nada como visto o leído (conversacionNegocio, solicitudPanel) y no se cobran ni liberan retenciones al mirar (repararPagos,
     repararEstimados; la página tampoco llama a procesar, verSolicitud, actualizarCuenta ni a la hoja de términos);
   - lo cifrado de op_private no se abre (datos del niño, la nota de consejería, la nota de salud o del trámite y su motivo, la dirección de la
     casa de una prueba de manejo, el destinatario de un envío): el Super Admin nunca lo muestra, así que el equipo tampoco lo ve aquí.
   Lo que se deja (comprobado): los vencimientos por hora que corren al mirar (vencer*, barrer*: pedidos, citas, mesas, apartados, boletos…) son
   los mismos que el barrido corre cada minuto (lib/barrido.ts), con actor «sistema» y sin repetir nada: mirar solo los adelanta; el derivado
   business_stats_cache.profile_strength se recalcula igual a como está (solo escribe si cambió); trip_runs arma las salidas que ya dice el horario.
   Guardián panelEquipoSoloLectura. */
const marca = cache(() => ({ on: false }));

export function marcarSoloLectura(): void {
  marca().on = true;
}

export function soloLectura(): boolean {
  try { return marca().on; } catch { return false; }
}
