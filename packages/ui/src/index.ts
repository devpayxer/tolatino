/* To'Latino Design System — fuente de verdad en código (decisión L).
   Los componentes se portan desde docs/diseno/design-system/components-web/ (132) en la Fase 0, bloque 2. */
export { Wordmark } from "./core/Wordmark";
export { Esq, EsqTexto, EsqCirculo, EsqZona } from "./core/Esqueleto";
export { Foto, type FotoProps } from "./core/Foto";
export { PestanasFicha, type PestanasFichaProps, type PestanaFicha } from "./core/PestanasFicha";
export { TarjetaVitrina, FilaFree, TarjetaVitrinaEsqueleto, FilaFreeEsqueleto, CATALOGO_TIPADAS, type TarjetaVitrinaProps, type FilaFreeProps, type VitrinaChip } from "./core/Vitrina";
export { ANCHOS_FOTO, fotoSrc, fotoFondo, fotoCss, fotoSrcSet } from "./foto";
export * from "./ds/index";
export { CATALOGO } from "./ds/catalogo";
export { PanelBloque, PanelBloques, pasoSrv, type PasoSrv, type Bloque as PanelBloqueT, type Fila as PanelFila, type Accion as PanelAccion, type Dia as PanelDia } from "./panel/Bloques";
