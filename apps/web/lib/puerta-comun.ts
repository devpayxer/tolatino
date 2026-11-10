/* 6g · Lo que la pantalla de la puerta, el modo puerta del panel y el Super Admin comparten (tipos y textos; sin servidor).
   La puerta SOLO escanea (D1): ninguna de estas formas trae montos, teléfonos ni correos (guardián porteroSoloSuEvento). */
export type Bi = { es: string; en: string };
export type Resultado =
  | "valid" | "manual" | "count" | "already_used" | "wrong_event" | "wrong_day" | "not_found" | "forged" | "void" | "refunded"
  | "replaced" | "pending_transfer" | "over_capacity" | "door_closed" | "not_inside" | "no_reentry";
export type Tono = "ok" | "warn" | "bad";

/* El veredicto grande de la puerta: color + palabra + ícono (nunca solo color: accesibilidad). */
export const RESULTADO: Record<Resultado, { t: Bi; tono: Tono; icon: string }> = {
  valid: { t: { es: "VÁLIDO", en: "VALID" }, tono: "ok", icon: "check" },
  manual: { t: { es: "ENTRÓ · A MANO", en: "IN · BY HAND" }, tono: "ok", icon: "check" },
  count: { t: { es: "CONTADO", en: "COUNTED" }, tono: "ok", icon: "check" },
  already_used: { t: { es: "YA ENTRÓ", en: "ALREADY IN" }, tono: "bad", icon: "warning" },
  wrong_event: { t: { es: "NO ES DE ESTE EVENTO", en: "NOT FOR THIS EVENT" }, tono: "bad", icon: "ban" },
  wrong_day: { t: { es: "ES DE OTRO DÍA", en: "WRONG DAY" }, tono: "bad", icon: "calendar" },
  not_found: { t: { es: "NO ENCONTRADO", en: "NOT FOUND" }, tono: "bad", icon: "search" },
  forged: { t: { es: "QR NO VÁLIDO", en: "INVALID QR" }, tono: "bad", icon: "ban" },
  void: { t: { es: "ANULADO", en: "VOIDED" }, tono: "bad", icon: "ban" },
  refunded: { t: { es: "DEVUELTO", en: "REFUNDED" }, tono: "bad", icon: "ban" },
  replaced: { t: { es: "QR ANULADO", en: "QR VOIDED" }, tono: "bad", icon: "ban" },
  pending_transfer: { t: { es: "SE ESTÁ TRANSFIRIENDO", en: "BEING TRANSFERRED" }, tono: "bad", icon: "ban" },
  over_capacity: { t: { es: "AFORO LLENO", en: "AT CAPACITY" }, tono: "bad", icon: "users" },
  door_closed: { t: { es: "LA PUERTA YA CERRÓ", en: "DOOR IS CLOSED" }, tono: "bad", icon: "clock" },
  not_inside: { t: { es: "NO ESTÁ ADENTRO", en: "NOT INSIDE" }, tono: "warn", icon: "warning" },
  no_reentry: { t: { es: "SIN REENTRADA", en: "NO RE-ENTRY" }, tono: "bad", icon: "ban" },
};
/* Qué hacer en cada caso (una línea, sin culpar a nadie). */
export const QUE_HACER: Partial<Record<Resultado, Bi>> = {
  already_used: { es: "No lo dejes pasar otra vez.", en: "Do not let it in again." },
  wrong_event: { es: "Ese boleto es de otro evento.", en: "That ticket is for another event." },
  not_found: { es: "No es un boleto de To’Latino. Búscalo por nombre si dice que compró.", en: "Not a To’Latino ticket. Search by name if they say they bought one." },
  forged: { es: "La firma no es de To’Latino: el QR fue alterado o es falso. No entra.", en: "The signature is not To’Latino’s: the QR was altered or is fake. No entry." },
  void: { es: "Ese boleto se anuló. No entra.", en: "That ticket was voided. No entry." },
  refunded: { es: "Ese boleto se devolvió. No entra.", en: "That ticket was refunded. No entry." },
  replaced: { es: "Ese QR ya no vale: el boleto se transfirió o se reemitió. Pídele el QR nuevo.", en: "That QR is no longer valid: the ticket was transferred or reissued. Ask for the new QR." },
  pending_transfer: { es: "El dueño lo está mandando a otra persona. Hasta que se reciba o se deshaga, no entra.", en: "The owner is sending it to someone else. Until it is received or undone, no entry." },
  over_capacity: { es: "Deja entrar a medida que salgan, o manda a la otra puerta.", en: "Let people in as others leave, or send them to the other door." },
  door_closed: { es: "Pasó la hora de cerrar la puerta que puso el organizador.", en: "Past the door closing time the organizer set." },
  not_inside: { es: "No hay nadie adentro con ese boleto.", en: "Nobody is inside with that ticket." },
  no_reentry: { es: "Este evento no permite salir y volver a entrar.", en: "This event does not allow re-entry." },
};

/* Lo que devuelve un escaneo. «pregunta» = antes de marcar (grupo o pedir ID): la puerta confirma con «Entró» y cuántos. */
export type VistaEscaneo = {
  id: string; res: Resultado; tono: Tono; dir: "in" | "out";
  /* Entran ahora (k) de cuántas entradas trae el boleto (de); cuántos entraron ya en total hoy. */
  k: number; de: number; entraron: number;
  nombre: string | null; tipo: string | null; code: string | null; cortesia: boolean; transferido: boolean;
  mesa: { zona: string; numero: number | null } | null; edad: number; pideId: boolean;
  /* YA ENTRÓ: por qué puerta y a qué hora (la última entrada). */
  ya: { puerta: string; hora: string } | null;
  /* ES DE OTRO DÍA: los días en que sí vale. */
  vale: string | null;
  reentrada: boolean;
};
export type Pregunta = { id: string; quedan: number; de: number; entraron: number; nombre: string | null; tipo: string | null; mesa: string | null; edad: number; pideId: boolean; cortesia: boolean; transferido: boolean; reentrada: boolean };
export type ResEscaneo = { ok: true; v: VistaEscaneo } | { ok: true; pregunta: Pregunta } | { ok: false; msg: Bi; cerrada?: boolean };

/* La cabecera viva (SSE): adentro, entraron, los que se esperan, rechazados y repetidos, aforo. */
export type Resumen = { adentro: number; entraron: number; esperados: number; faltan: number; rechazados: number; repetidos: number; aforo: number; pct: number; alerta: boolean; lleno: boolean; alertaPct: number };

export type FilaPuerta = {
  kind: "ticket" | "rsvp"; id: string; nombre: string; tipo: string; code: string | null; de: number; entraron: number; adentro: number;
  estado: "valid" | "used" | "void" | "refunded" | "replaced" | "going" | "attended" | "expired" | "cancelled" | "pending";
  mesa: string | null; cortesia: boolean; otroDia: string | null;
  /* El cursor de «Ver más» (orden|t|id). */
  cursor?: string;
};

export const INCIDENCIAS: { k: "duplicado" | "edad" | "seguridad" | "devolucion" | "otro"; l: Bi; icon: string }[] = [
  { k: "duplicado", l: { es: "Boleto duplicado", en: "Duplicate ticket" }, icon: "ticket" },
  { k: "edad", l: { es: "Edad o identificación", en: "Age or ID" }, icon: "shield" },
  { k: "seguridad", l: { es: "Seguridad", en: "Security" }, icon: "emergency" },
  { k: "devolucion", l: { es: "Pide devolución", en: "Wants a refund" }, icon: "card" },
  { k: "otro", l: { es: "Otra cosa", en: "Something else" }, icon: "info" },
];
export const MOTIVOS_MANUAL: { k: string; l: Bi }[] = [
  { k: "sin_qr", l: { es: "No trajo el QR", en: "No QR with them" } },
  { k: "no_lee", l: { es: "El QR no se lee", en: "QR won't scan" } },
  { k: "sin_bateria", l: { es: "Teléfono sin batería", en: "Phone is dead" } },
  { k: "otro", l: { es: "Otro motivo", en: "Other reason" } },
];
export const PUERTAS_SUGERIDAS: Bi[] = [{ es: "Principal", en: "Main" }, { es: "VIP", en: "VIP" }, { es: "Terraza", en: "Terrace" }, { es: "Lateral", en: "Side" }];

/* Hora corta 12 h desde «HH:MM» (la de la ciudad, ya convertida en el servidor). */
export function hora12(hhmm: string | null | undefined): string {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "";
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/* Nombre + inicial (lo único que ve la puerta de una persona). Una cortesía muestra el nombre que puso el organizador. */
export function nombreCorto(nombre: string | null | undefined, apellido?: string | null): string {
  const p = String(nombre ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!p.length) return "—";
  const ap = apellido != null ? String(apellido).trim() : p.length > 1 ? p[p.length - 1]! : "";
  return ap ? `${p[0]} ${ap.slice(0, 1).toUpperCase()}.` : p[0]!;
}
