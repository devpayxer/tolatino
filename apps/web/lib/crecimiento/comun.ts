/* 9h · Crecimiento: lo que comparten la landing, los enlaces, las campañas, los destacados y los promotores (sin servidor: lo usa también la pantalla). */
export type Bi = { es: string; en: string };
export type Res<T = object> = ({ ok: true; msg: Bi } & T) | { ok: false; msg: Bi };
export const mal = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
export const bien = <T extends object>(es: string, en: string, x?: T): { ok: true; msg: Bi } & T => ({ ok: true, msg: { es, en }, ...(x ?? ({} as T)) });

/* El código de un enlace corto: 7 letras y números sin los que se confunden al copiarlos de un volante (0 O 1 I L B 8 5 S). */
export const ALFABETO = "ACDEFGHJKMNPQRTUVWXYZ234679";
export const CODIGO = /^[ACDEFGHJKMNPQRTUVWXYZ234679]{7}$/;

/* Un destino es SIEMPRE una ruta propia: empieza con UNA «/», sin esquema, sin otro origen, sin barra invertida (guardián enlaceSoloPropio). La base lo
   vuelve a imponer (short_links.target check). */
export function rutaPropia(t: string): boolean {
  return typeof t === "string" && t.length <= 200 && /^\/[A-Za-z0-9/_?=&.%-]*$/.test(t) && !t.startsWith("//") && !t.includes("\\");
}

export const TIPOS_ENLACE = ["calle", "volante", "iglesia", "negocio", "redes", "prensa"] as const;
export type TipoEnlace = (typeof TIPOS_ENLACE)[number];
export const TIPO_ENLACE: Record<TipoEnlace, Bi> = {
  calle: { es: "Calle", en: "Street" }, volante: { es: "Volante", en: "Flyer" }, iglesia: { es: "Iglesia", en: "Church" },
  negocio: { es: "Negocio", en: "Business" }, redes: { es: "Redes", en: "Social" }, prensa: { es: "Prensa", en: "Press" },
};

export const CANALES = ["inapp", "push", "sms", "correo"] as const;
export type Canal = (typeof CANALES)[number];
export const PLANTILLA: Record<Canal, string> = { inapp: "mkt_campana_app", push: "mkt_campana_push", sms: "mkt_campana_sms", correo: "mkt_campana_correo" };
export const CANAL: Record<Canal, Bi> = { inapp: { es: "En la app", en: "In the app" }, push: { es: "Push", en: "Push" }, sms: { es: "SMS", en: "SMS" }, correo: { es: "Correo", en: "Email" } };
export const TIPOS_CAMPANA = ["lanzamiento", "promocion", "reclutamiento", "aviso"] as const;
export type TipoCampana = (typeof TIPOS_CAMPANA)[number];
export const TIPO_CAMPANA: Record<TipoCampana, Bi> = {
  lanzamiento: { es: "Lanzamiento", en: "Launch" }, promocion: { es: "Promoción", en: "Promotion" }, reclutamiento: { es: "Reclutar negocios", en: "Recruit businesses" }, aviso: { es: "Aviso", en: "Notice" },
};
/* El segmento: a quién (vecinos de la ciudad o dueños de negocios), inactivos desde N días, categoría y plan (solo dueños). */
export type Segmento = { rol: "vecinos" | "negocios"; inactivos?: number | null; cat?: string | null; plan?: "free" | "pro" | null };

/* ¿Cómo trabaja el negocio? (landing, «Tengo un negocio»; Coming Soon v3). */
export const MODOS = ["local", "casa", "domicilio", "encargo", "tiempo_libre"] as const;
export type Modo = (typeof MODOS)[number];
export const MODO: Record<Modo, Bi> = {
  local: { es: "Con local", en: "With a storefront" }, casa: { es: "Desde casa", en: "From home" }, domicilio: { es: "A domicilio", en: "At your door" },
  encargo: { es: "Por encargo", en: "Made to order" }, tiempo_libre: { es: "En su tiempo libre", en: "In their free time" },
};
