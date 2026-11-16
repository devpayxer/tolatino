/* C-005 → C-008 · La ficha nueva del negocio (cambios.md del canvas tolatino-master+). Lo comparten la página (servidor: qué
   negocios la usan) y FichaNueva.tsx (cliente: cómo se ve). */
/* Lo que cambia por categoría (tabla de ficha3 · cambios.md): nombre y ícono de lo que vende, nombre del equipo, si se elige persona,
   la acción y los pasos de la hoja. C-005 enciende Belleza; C-006 suma las demás con su adaptador. */
export type Cfg = { tab: [string, string]; icon: string; title: [string, string]; staffTab: [string, string]; staffTitle: [string, string]; pick: boolean;
  label: [string, string]; cta: [string, string]; s1: [string, string]; s2: [string, string] };
export const CFG_FICHA: Record<string, Cfg> = {
  "NEG-BELL": { tab: ["SERVICIOS", "SERVICES"], icon: "scissors", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Equipo", "Team"], pick: true,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Booking", "Booking"], s1: ["Servicio y con quién", "Service and who"], s2: ["Día y hora", "Day and time"] },
};

