import type { CSSProperties, ReactNode } from "react";

/* 9t · Esqueletos de carga del sistema (esqueleto.css): bloques grises con el «fondo de foto mientras carga» que ocupan el lugar de lo que va a
   llegar, para que la página responda en el instante del toque. Sin texto visible; para el lector de pantalla, el contenedor dice «Cargando».
   Piezas: Esq (un bloque), EsqTexto (líneas de texto), EsqCirculo (avatar o ícono) y EsqZona (el contenedor con role="status"). */
type Medida = number | string;
const px = (v: Medida | undefined) => (typeof v === "number" ? `${v}px` : v);

export function Esq({ w = "100%", h = 14, r, suave, className, style }: { w?: Medida; h?: Medida; r?: Medida; suave?: boolean; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`tl-esq${suave ? " tl-esq-suave" : ""}${className ? ` ${className}` : ""}`} style={{ display: "block", width: px(w), height: px(h), ...(r !== undefined ? { borderRadius: px(r) } : null), ...style }} />;
}

export function EsqTexto({ lineas = 3, alto = 12, ultima = "60%", gap = 8 }: { lineas?: number; alto?: number; ultima?: Medida; gap?: number }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lineas }, (_, i) => <Esq key={i} h={alto} w={i === lineas - 1 && lineas > 1 ? ultima : "100%"} r={6} />)}
    </span>
  );
}

export function EsqCirculo({ d = 40 }: { d?: number }) {
  return <Esq w={d} h={d} r="50%" style={{ flex: "none" }} />;
}

/* El contenedor: anuncia «Cargando» una vez (ES/EN; el loading de Next no sabe el idioma de la persona sin volverse dinámico). */
export function EsqZona({ children, className, etiqueta }: { children: ReactNode; className?: string; etiqueta?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} data-esqueleto="">
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{etiqueta ?? "Cargando · Loading"}</span>
      {children}
    </div>
  );
}
