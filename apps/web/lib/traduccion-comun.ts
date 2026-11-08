/* 5h · «Ver traducción» (D3): lo que comparten la pantalla y el servidor (sin base ni red). */
type Bi = { es: string; en: string };

export const KINDS_TR = ["com_post", "com_comment", "review", "review_reply", "post_comment"] as const;
export type KindTr = (typeof KINDS_TR)[number];
export type LangTr = "es" | "en";
export const esKindTr = (k: unknown): k is KindTr => typeof k === "string" && (KINDS_TR as readonly string[]).includes(k);

/* Lo que devuelve «Ver traducción». motivo: servicio (caído, lento o cortado) · limite (tope por persona) · no_esta (ya no se puede ver)
   · mismo (ya está en tu idioma) · entrar (la Comunidad pide cuenta). */
export type MotivoTr = "servicio" | "limite" | "no_esta" | "mismo" | "entrar";
export type ResTr = { ok: true; texto: string; de: LangTr; cache: boolean } | { ok: false; motivo: MotivoTr; msg: Bi };

export const NO_DISPONIBLE: Bi = { es: "La traducción no está disponible ahora.", en: "Translation isn't available right now." };
