/* Catálogo de sanciones a una persona (adm-data.js SANC, modelo Sanction). Lo usan el Super Admin y las pantallas
   que la persona ve. El servidor aplica el efecto: adv no restringe; mute7 y nopub no dejan publicar; susp14 y ban no
   dejan entrar (se cierran sus sesiones). Las que tienen días se levantan solas. */
export type Sancion = "adv" | "mute7" | "nopub" | "susp14" | "ban";
export const SANCIONES: Record<Sancion, { es: string; en: string; dias: number; estado: "active" | "muted" | "suspended" | "banned"; m: string; admin?: true }> = {
  adv: { es: "Advertencia", en: "Warning", dias: 0, estado: "active", m: "1.ª VEZ" },
  mute7: { es: "Silencio 7 días", en: "Mute 7 days", dias: 7, estado: "muted", m: "2.ª VEZ · SPAM" },
  nopub: { es: "Bloquear publicación 30 días", en: "Block posting 30 days", dias: 30, estado: "muted", m: "PUBLICACIÓN" },
  susp14: { es: "Suspender 14 días", en: "Suspend 14 days", dias: 14, estado: "suspended", m: "3.ª VEZ · ACOSO · DISCRIMINACIÓN" },
  ban: { es: "Banear", en: "Ban", dias: 0, estado: "banned", m: "AMENAZAS · FRAUDE · REINCIDENCIA", admin: true },
};
export const ORDEN_SANCIONES: Sancion[] = ["adv", "mute7", "nopub", "susp14", "ban"];
/* Motivos rápidos del diseño (TPL.usr). */
export const PLANTILLAS_USR = ["Reincidente", "Primera vez", "Cuentas vinculadas al mismo dispositivo", "El contexto justifica la acción"];
export const sub = (k: Sancion) => (SANCIONES[k].dias ? `${SANCIONES[k].dias} días · se levanta sola` : k === "ban" ? "Permanente · lo confirma un Admin" : "Hasta que una persona la levante");
