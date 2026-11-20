import type { CSSProperties } from "react";
import { fotoSrc, fotoSrcSet } from "../foto";

/* Fotos a la medida (F2a) · Una foto de datos como <img>: la variante que le toca a su caja (`ancho` = ancho en px CSS de la caja), el
   srcset con los cuatro anchos, carga perezosa (salvo `urgente`, para lo que se ve al abrir) y la caja reservada con width/height o
   con `proporcion` para que la página no salte. No pinta nada nuevo: es solo un <img>. Lo que no es una foto nuestra (de afuera,
   data:, blob:) pasa sin cambio y sin srcset. */
export type FotoProps = {
  src: string | null | undefined;
  alt: string;
  /* Ancho de la caja en px CSS (elige la variante). */
  ancho?: number;
  /* El atributo `sizes` si no es `ancho` px (p. ej. "(min-width: 900px) 540px, 100vw"). */
  sizes?: string;
  width?: number;
  height?: number;
  /* Proporción de la caja (CSS aspect-ratio, p. ej. "4 / 3") cuando no se dan width y height. */
  proporcion?: string;
  /* true = se carga al abrir la página (portada de arriba); por defecto, perezosa. */
  urgente?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Foto({ src, alt, ancho, sizes, width, height, proporcion, urgente, className, style }: FotoProps) {
  const url = src ?? "";
  const srcSet = fotoSrcSet(url);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoSrc(url, ancho)}
      srcSet={srcSet}
      sizes={srcSet ? sizes ?? (ancho ? `${ancho}px` : "100vw") : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={urgente ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={proporcion && !(width && height) ? { aspectRatio: proporcion, ...style } : style}
    />
  );
}
