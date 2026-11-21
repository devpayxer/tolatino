/* Fotos a la medida (F2a) · Una foto pública nuestra vive en `/medios/n/<uuid>.jpg`; el servidor ofrece variantes WebP en
   `/medios/n/<uuid>.w<W>.webp` (W = 320, 640, 1080, 1600) y, si falta una, contesta el JPEG original en esa misma dirección: pedir
   cualquiera de los cuatro anchos es siempre seguro. Aquí se elige el ancho que le toca a una caja. Todo lo demás (fotos de afuera,
   llaves privadas de Mensajes y ayuda, carteles de video, data:, blob:, variantes ya pedidas, vacío) pasa SIN CAMBIO. TypeScript plano: sin React ni dependencias. */
export const ANCHOS_FOTO = [320, 640, 1080, 1600] as const;

const NUESTRA = /^\/medios\/n\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/;

const variante = (id: string, w: number) => `/medios/n/${id}.w${w}.webp`;

/* F3 · Una foto de destino privado (la de una cita, una mudanza, la balanza…) vive en `/api/medios/privada/<uuid>`: la ruta decide quién la ve y,
   con `?w=<ancho>`, entrega la variante de ese ancho con el MISMO permiso (o la maestra si falta). Se le pide igual que a una pública. */
const PRIVADA = /^\/api\/medios\/privada\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* La dirección de la variante más chica que alcanza para `caja` (el ancho de la caja en px CSS) en pantallas de doble densidad, con tope en 1600. */
export function fotoSrc(url: string | null | undefined, caja?: number | null): string {
  const u = url ?? "";
  const m = NUESTRA.exec(u), priv = !m && PRIVADA.test(u);
  if ((!m && !priv) || !caja || !(caja > 0) || !Number.isFinite(caja)) return u;
  const w = ANCHOS_FOTO.find((a) => a >= caja * 2) ?? 1600;
  return m ? variante(m[1]!, w) : `${u}?w=${w}`;
}

/* `url("…")` para backgroundImage, con la dirección a salvo de comillas, barras invertidas y saltos de línea. Si ya llega envuelta
   (`url(/medios/…)`, como la pasan algunas pantallas al sistema de diseño) la desenvuelve antes. Vacío → "none". */
export function fotoFondo(url: string | null | undefined, caja?: number | null): string {
  let u = url ?? "";
  const e = /^url\(\s*(["']?)(.*)\1\s*\)$/s.exec(u);
  if (e) u = e[2]!;
  if (!u) return "none";
  const s = fotoSrc(u, caja).replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ").replace(/\r/g, "\\d ");
  return `url("${s}")`;
}

/* El `srcset` de una foto nuestra (los cuatro anchos); `undefined` si no es nuestra. */
export function fotoSrcSet(url: string | null | undefined): string | undefined {
  const u = url ?? "", m = NUESTRA.exec(u);
  if (m) return ANCHOS_FOTO.map((w) => `${variante(m[1]!, w)} ${w}w`).join(", ");
  return PRIVADA.test(u) ? ANCHOS_FOTO.map((w) => `${u}?w=${w} ${w}w`).join(", ") : undefined;
}

/* Un valor CSS de `background` que ya trae sus `url(…)` puestos (p. ej. `url(/medios/n/x.jpg) center/cover`, o un degradado): cada url() de
   una foto nuestra pasa a su variante; todo lo demás queda igual. Para las piezas que reciben el fondo ya armado por la pantalla. */
export function fotoCss(css: string | null | undefined, caja?: number | null): string {
  const c = css ?? "";
  if (!c.includes("url(")) return c;
  return c.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)/g, (t, a, b, d) => {
    const u = a ?? b ?? d ?? "";
    return fotoSrc(u, caja) === u ? t : fotoFondo(u, caja);
  });
}
