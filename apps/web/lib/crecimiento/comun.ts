
type EF = (es: string, en: string) => string;
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
export const TIPO_ENLACE = (E2: EF): Record<TipoEnlace, string> => ({
  calle: E2("Calle", "Street"), volante: E2("Volante", "Flyer"), iglesia: E2("Iglesia", "Church"), negocio: E2("Negocio", "Business"),
  redes: E2("Redes", "Social"), prensa: E2("Prensa", "Press")
});

export const CANALES = ["inapp", "push", "sms", "correo"] as const;
export type Canal = (typeof CANALES)[number];
export const PLANTILLA: Record<Canal, string> = { inapp: "mkt_campana_app", push: "mkt_campana_push", sms: "mkt_campana_sms", correo: "mkt_campana_correo" };
export const CANAL = (E2: EF): Record<Canal, string> => ({ inapp: E2("En la app", "In the app"), push: "Push", sms: "SMS", correo: E2("Correo", "Email") });
export const TIPOS_CAMPANA = ["lanzamiento", "promocion", "reclutamiento", "aviso"] as const;
export type TipoCampana = (typeof TIPOS_CAMPANA)[number];
export const TIPO_CAMPANA = (E2: EF): Record<TipoCampana, string> => ({
  lanzamiento: E2("Lanzamiento", "Launch"), promocion: E2("Promoción", "Promotion"), reclutamiento: E2("Reclutar negocios", "Recruit businesses"),
  aviso: E2("Aviso", "Notice")
});
/* El segmento: a quién (vecinos de la ciudad o dueños de negocios), inactivos desde N días, categoría y plan (solo dueños). */
/* 9n-7 · items: el negocio tiene al menos N ítems a la venta en su catálogo (no retirados), p. ej. «Free con 10+ ítems» para ofrecerle Pro. */
export type Segmento = { rol: "vecinos" | "negocios"; inactivos?: number | null; cat?: string | null; plan?: "free" | "pro" | null; items?: number | null };
export const ITEMS_SEGMENTO = [5, 10, 20, 50] as const;

/* ¿Cómo trabaja el negocio? (landing, «Tengo un negocio»; Coming Soon v3). */
export const MODOS = ["local", "casa", "domicilio", "encargo", "tiempo_libre"] as const;
export type Modo = (typeof MODOS)[number];
export const MODO = (E2: EF): Record<Modo, string> => ({
  local: E2("Con local", "With a storefront"), casa: E2("Desde casa", "From home"), domicilio: E2("A domicilio", "At your door"),
  encargo: E2("Por encargo", "Made to order"), tiempo_libre: E2("En su tiempo libre", "In their free time")
});
