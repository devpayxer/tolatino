/* Catálogo de sanciones a una persona (adm-data.js SANC, modelo Sanction). Lo usan el Super Admin y las pantallas
   que la persona ve. El servidor aplica el efecto: adv no restringe; mute7 y nopub no dejan publicar; susp14 y ban no
   dejan entrar (se cierran sus sesiones). Las que tienen días se levantan solas. */
export type Sancion = "adv" | "mute7" | "nopub" | "susp14" | "ban";
type Bi = { es: string; en: string };
/* 5d · `com` = su efecto en la Comunidad (lo aplica lib/moderacion.ts efectoSancion; lo ven la persona y el Super Admin).
   `puede` = lo que sí puede hacer en la Comunidad mientras dura. Toda sanción avisa con el motivo y se puede apelar 14 días. */
export const SANCIONES: Record<Sancion, { es: string; en: string; dias: number; estado: "active" | "muted" | "suspended" | "banned"; m: string; admin?: true; com: Bi;
  puede: { publicar: boolean; comentar: boolean; mensajes: boolean; votar: boolean; reportar: boolean } }> = {
  adv: { es: "Advertencia", en: "Warning", dias: 0, estado: "active", m: "1.ª VEZ", com: { es: "Sin efecto en la Comunidad: queda en tu historial y la siguiente sube un peldaño.", en: "No effect in the Community: it stays on your record and the next one moves up a step." },
    puede: { publicar: true, comentar: true, mensajes: true, votar: true, reportar: true } },
  mute7: { es: "Silencio 7 días", en: "Mute 7 days", dias: 7, estado: "muted", m: "2.ª VEZ · SPAM", com: { es: "7 días sin publicar, comentar ni escribir mensajes. Puede leer, votar y reportar.", en: "7 days without posting, commenting or messaging. Can read, vote and report." },
    puede: { publicar: false, comentar: false, mensajes: false, votar: true, reportar: true } },
  nopub: { es: "Bloquear publicación 30 días", en: "Block posting 30 days", dias: 30, estado: "muted", m: "PUBLICACIÓN", com: { es: "30 días sin publicar. Puede leer, comentar, votar, escribir mensajes y reportar.", en: "30 days without posting. Can read, comment, vote, message and report." },
    puede: { publicar: false, comentar: true, mensajes: true, votar: true, reportar: true } },
  susp14: { es: "Suspender 14 días", en: "Suspend 14 days", dias: 14, estado: "suspended", m: "3.ª VEZ · ACOSO · DISCRIMINACIÓN", com: { es: "14 días sin entrar a To'Latino (se cierran sus sesiones).", en: "14 days without signing in to To'Latino (sessions are closed)." },
    puede: { publicar: false, comentar: false, mensajes: false, votar: false, reportar: false } },
  ban: { es: "Banear", en: "Ban", dias: 0, estado: "banned", m: "AMENAZAS · FRAUDE · REINCIDENCIA", admin: true, com: { es: "No vuelve a entrar a To'Latino. Lo confirma un Admin.", en: "Cannot sign in to To'Latino again. Confirmed by an Admin." },
    puede: { publicar: false, comentar: false, mensajes: false, votar: false, reportar: false } },
};
export const ORDEN_SANCIONES: Sancion[] = ["adv", "mute7", "nopub", "susp14", "ban"];
/* Motivos rápidos del diseño (TPL.usr). */
export const PLANTILLAS_USR = ["Reincidente", "Primera vez", "Cuentas vinculadas al mismo dispositivo", "El contexto justifica la acción"];
export const sub = (k: Sancion) => (SANCIONES[k].dias ? `${SANCIONES[k].dias} días · se levanta sola` : k === "ban" ? "Permanente · lo confirma un Admin" : "Hasta que una persona la levante");
