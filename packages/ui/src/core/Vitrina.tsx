"use client";
import { useState, type ReactNode } from "react";
import { Foto } from "./Foto";
import { Esq } from "./Esqueleto";
import { Icon as IconoSistema } from "../ds/index";

/* Tarjeta de negocio «Vitrina» (decisión AK, 22 nov) · pieza TIPADA del sistema de diseño que reemplaza a BusinessCard en las listas.
   Fuente: docs/diseno/entrega/tarjeta-vitrina/README.md (alta fidelidad). Estilos: packages/ui/src/vitrina.css (clases tl-vit-* y tl-fila-*).
   - TarjetaVitrina (Pro): galería de 3 fotos (187 px; 2 fotos → dos columnas; 1 → una; 0 → el rayado del sistema) con el estado y «guardar» encima
     y «+N FOTOS» solo si el negocio tiene más de 3; nombre + verificado; calificación y dato en una línea; características (gris) u horarios
     libres (menta, uno a la vez); la oferta de HOY; botón principal + llamar.
   - FilaFree: la fila compacta de los negocios Free (foto de 96 px al lado, nombre, dato, calificación y «Llamar»).
   - TarjetaVitrinaEsqueleto / FilaFreeEsqueleto: la misma geometría mientras carga.
   Las fotos se pintan SIEMPRE con <Foto> (variante a la medida de cada celda). Toda cadena visible llega por props (quien compone la pone en ES/EN).
   Accesibilidad: la tarjeta entera abre la ficha (clic) y, para teclado y lector de pantalla, el nombre es el botón que la abre; cada control es
   un <button> con su nombre; las cajas de toque miden 44 (ver vitrina.css). Los clics de los controles no abren la tarjeta. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = IconoSistema as any;

export type VitrinaChip = { label: string; variant?: string };

export type TarjetaVitrinaProps = {
  nombre: string;
  verificado?: boolean;
  verificadoEtiqueta?: string;
  /* La calificación ya armada («4.8», «Nuevo», «3 reseñas»). Con `resenas` de 5 o más lleva ★ y «(212)»; con menos, sin estrellas y con la nota. */
  calificacion: string;
  resenas?: number;
  calificacionNota?: string;
  /* «DOMINICANA · CATERING · 0.3 MI» (una línea, con elipsis). */
  dato?: string;
  /* Estado sobre la foto («Abierto · hasta 9 PM») y su color. */
  estado?: string;
  abierto?: boolean;
  /* Hasta 3 fotos (la portada primero) y cuántas fotos públicas tiene el negocio en total (para «+N FOTOS»). */
  fotos?: (string | null | undefined)[];
  fotosTotal?: number;
  /* El texto del botón «+N FOTOS» (N = total − 3) y su nombre accesible; sin onMasFotos no hay botón. */
  masFotosEtiqueta?: (n: number) => string;
  masFotosNombre?: (n: number) => string;
  onMasFotos?: () => void;
  /* Lo que va dentro de la celda GRANDE de la galería (el video aprobado, sin sonido). */
  media?: ReactNode;
  /* Chips: 'slot' = horario libre (se elige uno a la vez); lo demás = característica (gris, sin acción). */
  chips?: VitrinaChip[];
  horario?: string | null;
  onHorario?: (label: string | null) => void;
  horarioNombre?: (label: string) => string;
  oferta?: string;
  ofertaEtiqueta?: string;
  /* Con historia de Hoy, la caja de la oferta es un botón que abre «Hoy en el barrio» de ese negocio. */
  onOferta?: () => void;
  ofertaNombre?: string;
  cta?: string;
  ctaIcono?: string;
  onCta?: () => void;
  llamarNombre?: string;
  onLlamar?: () => void;
  guardado?: boolean;
  guardarNombre?: string;
  quitarNombre?: string;
  onGuardar?: () => void;
  onAbrir?: () => void;
  /* La primera tarjeta de la página carga su foto al abrir (LCP); las demás, perezosas. */
  urgente?: boolean;
};

const parar = (f?: () => void) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); f?.(); };

/* El `sizes` de cada celda (px CSS de la caja): en el teléfono la tarjeta ocupa el ancho menos 40 de margen; en la lista de escritorio, 320 a 700. */
const SIZES = {
  3: { grande: "(max-width: 767px) 66vw, 440px", chica: "(max-width: 767px) 34vw, 220px" },
  2: { grande: "(max-width: 767px) 50vw, 330px", chica: "(max-width: 767px) 50vw, 330px" },
  1: { grande: "(max-width: 767px) 100vw, 660px", chica: "100vw" },
} as const;
const ANCHO = { 3: { grande: 360, chica: 180 }, 2: { grande: 270, chica: 270 }, 1: { grande: 540, chica: 540 } } as const;

function Calificacion({ clase, calificacion, resenas, nota }: { clase: string; calificacion: string; resenas?: number; nota?: string }) {
  // Con menos de 5 reseñas no se pintan estrellas (regla de resenas(): «3 reseñas» o «Nuevo · en To'Latino»).
  if (resenas != null && resenas < 5) return <span className={clase}>{calificacion}{nota ? <em> {nota}</em> : null}</span>;
  return <span className={clase}><b aria-hidden="true">★</b> {calificacion}{resenas != null ? <em> ({resenas})</em> : null}</span>;
}

export function TarjetaVitrina(p: TarjetaVitrinaProps) {
  const [local, setLocal] = useState<string | null>(null);
  const elegido = p.horario !== undefined ? p.horario : local;
  const elegir = (l: string) => { const v = elegido === l ? null : l; setLocal(v); p.onHorario?.(v); };
  const fotos = (p.fotos ?? []).filter((f): f is string => !!f).slice(0, 3);
  const n = fotos.length as 0 | 1 | 2 | 3;
  const total = Math.max(p.fotosTotal ?? 0, n), extra = total - 3;
  const horarios = (p.chips ?? []).filter((c) => c.variant === "slot").slice(0, 3);
  const caracteristicas = (p.chips ?? []).filter((c) => c.variant !== "slot").slice(0, 3);
  const guardado = !!p.guardado;
  return (
    <article className="tl-vit" data-vitrina="pro" onClick={p.onAbrir}>
      <div className="tl-vit-gal" data-fotos={n}>
        {n === 0 ? <div className="tl-vit-celda tl-vit-rayado" data-celda="grande">{p.media ?? null}</div> : fotos.map((f, i) => {
          const grande = i === 0, z = SIZES[n as 1 | 2 | 3], a = ANCHO[n as 1 | 2 | 3];
          return (
            <div key={`${f}-${i}`} className="tl-vit-celda" data-celda={grande ? "grande" : "chica"}>
              <Foto src={f} alt="" ancho={grande ? a.grande : a.chica} sizes={grande ? z.grande : z.chica} urgente={!!p.urgente && grande} />
              {grande ? p.media ?? null : null}
            </div>
          );
        })}
        {p.estado ? <span className="tl-vit-estado" data-estado={p.abierto === false ? "cerrado" : "abierto"} data-abierto={p.abierto === false ? "false" : "true"}><i aria-hidden="true" /><span>{p.estado}</span></span> : null}
        {p.onGuardar ? (
          <button type="button" className="tl-vit-guardar" data-guardar="" aria-pressed={guardado} aria-label={guardado ? p.quitarNombre ?? p.guardarNombre : p.guardarNombre} onClick={parar(p.onGuardar)}>
            <span><Icon name="heart" size={17} strokeWidth={1.9} color="var(--tl-ink)" fill={guardado ? "var(--tl-ink)" : "none"} /></span>
          </button>
        ) : null}
        {extra > 0 && p.onMasFotos && p.masFotosEtiqueta ? (
          <button type="button" className="tl-vit-mas" data-mas-fotos="" aria-label={p.masFotosNombre?.(extra) ?? p.masFotosEtiqueta(extra)} onClick={parar(p.onMasFotos)}>
            <span aria-hidden="true">{p.masFotosEtiqueta(extra)}</span>
          </button>
        ) : null}
      </div>
      <div className="tl-vit-cuerpo">
        <div className="tl-vit-ident">
          <div className="tl-vit-nombre-fila">
            <button type="button" className="tl-vit-nombre" data-toque="nombre" onClick={parar(p.onAbrir)}>{p.nombre}</button>
            {p.verificado ? <span className="tl-vit-verificado" role="img" aria-label={p.verificadoEtiqueta ?? "✓"}><Icon name="check" size={10} strokeWidth={2.8} color="var(--tl-white)" /></span> : null}
          </div>
          <div className="tl-vit-meta">
            <Calificacion clase="tl-vit-cal" calificacion={p.calificacion} resenas={p.resenas} nota={p.calificacionNota} />
            {p.dato ? <><span className="tl-vit-punto" aria-hidden="true">·</span><span className="tl-vit-dato">{p.dato}</span></> : null}
          </div>
        </div>
        {horarios.length ? (
          <div className="tl-vit-horas" data-horarios="">
            {horarios.map((c) => (
              <button key={c.label} type="button" className="tl-vit-hora" aria-pressed={elegido === c.label} aria-label={p.horarioNombre?.(c.label) ?? c.label} onClick={parar(() => elegir(c.label))}>
                <span aria-hidden="true">{c.label}</span>
              </button>
            ))}
          </div>
        ) : caracteristicas.length ? (
          <div className="tl-vit-chips" data-caracteristicas="">{caracteristicas.map((c) => <span key={c.label} className="tl-vit-car">{c.label}</span>)}</div>
        ) : null}
        {p.oferta ? (
          p.onOferta ? (
            <button type="button" className="tl-vit-oferta" data-oferta="" aria-label={p.ofertaNombre} onClick={parar(p.onOferta)}><i>{p.ofertaEtiqueta ?? "HOY"}</i><span>{p.oferta}</span></button>
          ) : (
            <div className="tl-vit-oferta" data-oferta=""><i>{p.ofertaEtiqueta ?? "HOY"}</i><span>{p.oferta}</span></div>
          )
        ) : null}
        {p.cta || p.onLlamar ? (
          <div className="tl-vit-acciones">
            {p.cta ? (
              <button type="button" className="tl-vit-cta" data-cta="" onClick={parar(p.onCta)}>
                <span>{p.ctaIcono ? <Icon name={p.ctaIcono} size={16} strokeWidth={1.9} /> : null}<span>{p.cta}</span></span>
              </button>
            ) : null}
            {p.onLlamar ? (
              <button type="button" className="tl-vit-llamar" data-llamar="" aria-label={p.llamarNombre} onClick={parar(p.onLlamar)}>
                <span><Icon name="phone" size={17} strokeWidth={1.9} color="var(--tl-ink)" /></span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export type FilaFreeProps = {
  nombre: string;
  dato?: string;
  calificacion: string;
  resenas?: number;
  calificacionNota?: string;
  foto?: string | null;
  llamarEtiqueta: string;
  llamarIcono?: string;
  llamarNombre?: string;
  onLlamar?: () => void;
  onAbrir?: () => void;
};

export function FilaFree(p: FilaFreeProps) {
  return (
    <article className="tl-fila" data-vitrina="free" onClick={p.onAbrir}>
      <div className={`tl-fila-foto${p.foto ? "" : " tl-vit-rayado"}`}>{p.foto ? <Foto src={p.foto} alt="" ancho={96} sizes="96px" /> : null}</div>
      <div className="tl-fila-cuerpo">
        <button type="button" className="tl-fila-nombre" data-toque="nombre" onClick={parar(p.onAbrir)}>{p.nombre}</button>
        {p.dato ? <div className="tl-fila-dato">{p.dato}</div> : null}
        <div className="tl-fila-abajo">
          <Calificacion clase="tl-fila-cal" calificacion={p.calificacion} resenas={p.resenas} nota={p.calificacionNota} />
          {p.onLlamar ? (
            <button type="button" className="tl-fila-llamar" data-llamar="" aria-label={p.llamarNombre} onClick={parar(p.onLlamar)}>
              <span><Icon name={p.llamarIcono ?? "phone"} size={16} strokeWidth={1.9} />{p.llamarEtiqueta}</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* Los esqueletos: la misma geometría que la pieza (foto en el fondo de foto del sistema, barras y botón en gris tenue). */
export function TarjetaVitrinaEsqueleto() {
  return (
    <div className="tl-vit tl-vit-esq" aria-hidden="true" data-vitrina-esqueleto="pro">
      <Esq h={187} r={0} />
      <div className="tl-vit-cuerpo">
        <div className="tl-vit-ident"><span className="tl-vit-esq-barra tl-esq" style={{ height: 20, width: "62%" }} /><span className="tl-vit-esq-barra tl-esq" style={{ height: 13, width: "80%" }} /></div>
        <span className="tl-vit-esq-boton tl-esq" />
      </div>
    </div>
  );
}

export function FilaFreeEsqueleto() {
  return (
    <div className="tl-fila" aria-hidden="true" data-vitrina-esqueleto="free" style={{ cursor: "default" }}>
      <div className="tl-fila-foto"><Esq w="100%" h="100%" r={0} style={{ position: "absolute", inset: 0 }} /></div>
      <div className="tl-fila-cuerpo">
        <span className="tl-vit-esq-barra tl-esq" style={{ height: 16, width: "60%" }} />
        <span className="tl-vit-esq-barra tl-esq" style={{ height: 11, width: "75%" }} />
        <span className="tl-vit-esq-barra tl-esq" style={{ height: 34, width: "45%", marginTop: 2 }} />
      </div>
    </div>
  );
}

/* Para el catálogo del sistema (/sistema): las piezas tipadas por grupo, que no pasan por el generador de scripts/portar-sistema.mjs. */
export const CATALOGO_TIPADAS: Record<string, string[]> = { cards: ["TarjetaVitrina", "FilaFree", "TarjetaVitrinaEsqueleto", "FilaFreeEsqueleto"] };
