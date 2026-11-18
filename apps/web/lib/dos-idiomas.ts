/* 9f-3 · Todas las pantallas por el CMS sin reescribir sus textos (LAUNCH «9f-3 · Más cadenas por el CMS»; REVISION «Todas las pantallas por el CMS»).
   Cada pantalla escribe sus textos con su E2 local: `const E2 = (a: string, b: string) => dosIdiomas(es, a, b)` (lo deja así scripts/cms/e2-al-cms.mjs;
   el guardián e2PorElCms no deja volver la forma vieja `es ? a : b`). dosIdiomas elige el idioma IGUAL que antes y, si alguien editó ese par en el Super
   Admin (Textos y páginas › Cadenas), sale lo editado:
   - Sin ediciones (el caso de siempre): `es ? a : b` y nada más (un tamaño de mapa vacío). Nada se ve distinto hasta que alguien edita.
   - Con ediciones: busca el par EXACTO del código (español y después inglés, tal como está escrito) en el mapa de lo editado. Solo se edita un par escrito
     con dos textos fijos, E2("Guardar", "Save"); uno con ${…} (E2(`Hola ${n}`, `Hi ${n}`)) sigue saliendo del código y no se edita.
   - El mismo par en muchos lugares es UNA cadena (como gettext): editar «Guardar» lo cambia en todos los lugares donde aparece; el Super Admin muestra
     cuántos y cuáles antes de guardar.
   - El mapa trae SOLO lo editado y vivo (pocas filas). En el servidor lo carga y lo refresca lib/cms.ts (edicionesE2: al arrancar, a los 15 s y al
     momento con el aviso de la base); en el navegador lo pone el layout raíz (EdicionesE2) antes de pintar a sus hijos, así el primer pintado y la
     hidratación ven lo mismo que el servidor.
   Sin imports a propósito: lo usan el servidor, el navegador y el borde. Vive en globalThis porque el servidor carga el módulo en más de una capa
   (componentes del servidor y el render de los de cliente) y todas tienen que ver el mismo mapa. */
/* El mapa va por el español y después por el inglés (sin armar una llave nueva en cada llamada: los textos del código ya traen su huella calculada). */
type Caja = { v: string; m: Map<string, Map<string, readonly [string, string]>> };
const G = globalThis as typeof globalThis & { __tlEdicionesE2?: Caja };

/* El texto en el idioma de quien mira: `es` decide como siempre (verdadero = español). */
export function dosIdiomas(es: unknown, a: string, b: string): string {
  const c = G.__tlEdicionesE2;
  if (c === undefined || c.m.size === 0) return es ? a : b;
  const x = c.m.get(a)?.get(b);
  return x === undefined ? (es ? a : b) : es ? x[0] : x[1];
}

/* Lo editado: [español del código, inglés del código, español editado, inglés editado]. v = la huella de la lista (si es la misma, no se rehace). */
export type EdicionE2 = readonly [string, string, string, string];
export function ponerEdicionesE2(v: string, l: readonly EdicionE2[]): void {
  if (G.__tlEdicionesE2?.v === v) return;
  const m = new Map<string, Map<string, readonly [string, string]>>();
  for (const [a, b, x, y] of l) { let n = m.get(a); if (!n) m.set(a, (n = new Map())); n.set(b, [x, y] as const); }
  G.__tlEdicionesE2 = { v, m };
}
export const versionEdicionesE2 = (): string => G.__tlEdicionesE2?.v ?? "";
