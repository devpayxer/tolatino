// Etiqueta (texto + colores) de cada tipo de publicación de Comunidad.
//
// Vive en su propio módulo, no dentro de `PostCard`, porque la portada también
// la usa: importarla desde `PostCard` arrastraría al paquete de la landing todo
// lo que esa tarjeta necesita (interacciones, follows, menú, avatares), y la
// portada es la página que más se carga y la que trae tráfico de buscadores.
//
// FUENTE ÚNICA: quien pinte una etiqueta de publicación llama aquí. Si algún día
// cambia un color, cambia en los dos sitios a la vez.

import type { PostType } from '@/data/fixtures';

export function postTag(type: PostType, L: (a: string, b: string) => string) {
  switch (type) {
    case 'ask':
      return { label: L('Pregunta', 'Asking'), color: '#6D4DF6', bg: '#EFEBFF' };
    case 'rec':
      return { label: L('Recomienda', 'Recommends'), color: '#1F8A4C', bg: '#E3F5EA' };
    case 'sale':
      return { label: L('Vendo', 'For sale'), color: '#B26A00', bg: '#FCEFD6' };
    case 'poll':
      return { label: L('Encuesta', 'Poll'), color: '#0E9384', bg: '#D6F3EF' };
    default:
      return { label: L('Mi barrio', 'Local'), color: '#2F6FED', bg: '#E5EFFB' };
  }
}
