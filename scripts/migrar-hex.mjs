#!/usr/bin/env node
// migrar-hex.mjs — PASO 2 de la migración al «Sistema To'Latino».
//
// QUÉ HACE: lleva los 1.263 hex crudos que quedaban repartidos por 69 archivos
// a los colores del sistema (`apps/web/src/lib/paleta.ts`).
//
// POR QUÉ UN SCRIPT Y NO A MANO: son 190 valores distintos. Hacerlo a ojo
// garantiza incoherencias, y ya pasó una vez en este repo — el barrido de las
// sombras (2026-08-06) se hizo con una regla mal elegida y dejó 41 controles
// sin sombra sobre una foto. La lección de aquello: **la regla tiene que ser
// explícita y verificable, y hay que comprobar el resultado, no la intención.**
//
// DOS CAMINOS, y el orden importa:
//
//  1. MAPA EXPLÍCITO (abajo). Para los colores que tienen SIGNIFICADO. El
//     vecino más cercano se equivocaría en todos ellos: el morado de marca
//     #7B61FF tiene como vecino el morado de Eventos, así que «acercarlo» lo
//     dejaría morado — cuando lo que toca es que pase a ser el ROSA de marca.
//     El significado no se deduce del color; hay que declararlo.
//
//  2. VECINO MÁS CERCANO EN OKLCH. Para el resto: los pares de rayas de los
//     marcadores de foto y los tintes sueltos. Ahí «el mismo color, pero del
//     sistema» SÍ es la respuesta correcta, y OKLCH es el espacio donde
//     «parecido» significa parecido para el ojo (en RGB no).
//
// Lo que NO toca: `paleta.ts` (es la fuente), y los sitios documentados donde
// el hex es inevitable — `CheckoutSheet.tsx` pinta dentro de un iframe de
// Stripe, donde nuestro CSS no llega.
//
// Uso:
//   node scripts/migrar-hex.mjs --dry     # solo informa
//   node scripts/migrar-hex.mjs           # escribe

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'apps/web/src';
const SECO = process.argv.includes('--dry');
const EXENTOS = ['lib/paleta.ts', 'components/CheckoutSheet.tsx'];

// ── 1 · el mapa explícito: color viejo → color del sistema, con su razón ────
// Cada línea es una decisión de diseño, no una conversión. El comentario dice
// QUÉ papel hacía ese color, que es lo que determina a dónde va.
const MAPA = {
  // Marca. Era morado; el sistema nuevo la lleva a rosa.
  '#7B61FF': ['#FF2D6F', 'morado de marca → acento rosa'],
  '#6D4DF6': ['#C4144C', 'morado oscuro (texto de acento) → rosa que cumple AA'],
  '#6743E2': ['#A80F40', 'morado pulsado → rosa pulsado'],
  '#8268FF': ['#FF7A9E', 'morado claro → rosa claro'],
  '#9B85FF': ['#FF7A9E', 'morado sobre oscuro → rosa sobre oscuro'],
  '#7C6BFF': ['#FF7A9E', 'morado de serie de gráfica → rosa claro'],
  '#A78BFA': ['#FFC2D3', 'morado pálido de gráfica → rosa pálido'],
  '#5B3FD6': ['#4F46E5', 'morado profundo → índigo del sistema (Trabajos)'],
  '#4338CA': ['#4F46E5', 'índigo → índigo del sistema'],
  '#3A2E6E': ['#241C46', 'morado muy oscuro → panel oscuro del sistema'],
  '#EFEBFF': ['#FFECF2', 'tinte de marca → tinte rosa'],
  '#E5DEF9': ['#FED2DF', 'tinte de marca, paso oscuro → rosa, paso oscuro'],
  '#F3F0FF': ['#F3EEFF', 'tinte morado suave → tinte morado del sistema'],
  '#F1EFFA': ['#F1EEFA', 'neutro suave → tinte lila del sistema'],
  '#EFE9FB': ['#F3EEFF', 'tinte morado → tinte morado del sistema'],
  '#EDE7FC': ['#F5EBFF', 'tinte morado (Iglesias) → su tinte de rubro'],
  '#E8E4FB': ['#F0EDFF', 'tinte morado (Vida nocturna) → su tinte de rubro'],
  '#EAE2F8': ['#F0EDFF', 'tinte morado → tinte de rubro'],
  '#DCCEF2': ['#E0DAFF', 'morado, paso oscuro de raya → paso oscuro del sistema'],
  '#D9CEF3': ['#E0DAFF', 'morado, paso oscuro de raya'],
  '#ECE3F8': ['#F0EDFF', 'tinte morado'],
  '#ECE9F6': ['#F1EEFA', 'neutro suave → tinte lila'],
  '#E2D6F3': ['#E0DAFF', 'morado, paso oscuro de raya'],
  '#EFE9FF': ['#FFECF2', 'tinte de marca → tinte rosa'],
  '#F7F3FF': ['#FCFBFF', 'casi blanco morado → tinte blanco del sistema'],
  '#FAF9FE': ['#FCFBFF', 'casi blanco → tinte blanco del sistema'],
  '#F7F5FB': ['#F1EEFA', 'gris lila de relleno → tinte lila'],
  '#E7E3F4': ['#EAE6F5', 'contorno → contorno del sistema'],
  '#DCD4FA': ['#E4DFF2', 'contorno fuerte → contorno fuerte del sistema'],
  '#E4E0F0': ['#E4DFF2', 'contorno de campo → contorno fuerte'],
  '#E6E2F2': ['#EAE6F5', 'contorno → contorno del sistema'],
  '#C9C2E6': ['#E4DFF2', 'contorno al pasar el ratón → contorno fuerte'],
  '#D8D2EC': ['#E4DFF2', 'contorno apagado → contorno fuerte'],
  '#ECE8F4': ['#EAE6F5', 'carril de barra → contorno del sistema'],
  '#CFC7EC': ['#E4DFF2', 'botón deshabilitado → contorno fuerte'],
  '#EAE7F6': ['#EAE6F5', 'contorno'],
  '#EAEEF6': ['#EAE6F5', 'contorno'],
  '#D9D5E6': ['#E4DFF2', 'contorno fuerte'],
  '#CFC8E6': ['#E4DFF2', 'contorno fuerte'],
  '#C0BBD0': ['#B3ADC7', 'gris de icono apagado → tinta tenue'],
  '#B9B2D6': ['#B3ADC7', 'gris apagado → tinta tenue'],
  '#8B6BFF': ['#FF7A9E', 'morado sobre oscuro → rosa sobre oscuro'],
  '#B9A6FF': ['#FFC2D3', 'morado pálido sobre oscuro → rosa pálido'],
  '#A48CFF': ['#FF7A9E', 'morado sobre oscuro'],
  '#C9B6FF': ['#FFC2D3', 'morado pálido sobre oscuro'],

  // Tintas y grises. A la escala violeta-gris del handoff.
  '#1E1B2E': ['#16112E', 'tinta fuerte'],
  '#3A3650': ['#342F4E', 'cuerpo de texto'],
  '#4A4660': ['#403A5A', 'etiqueta de tono medio'],
  '#4A4763': ['#403A5A', 'etiqueta de tono medio'],
  '#5A5570': ['#4B4565', 'párrafo'],
  '#6E6A85': ['#625B7D', 'texto secundario'],
  '#6B6880': ['#625B7D', 'texto secundario'],
  '#8A86A0': ['#7E7798', 'metadatos'],
  '#9A96AE': ['#9A93B3', 'metadatos claros'],
  '#B7B3C6': ['#B3ADC7', 'deshabilitado'],
  '#B0ACC0': ['#ADA7C2', 'deshabilitado'],
  '#56506E': ['#4B4565', 'subtítulo'],
  '#7E7A92': ['#7E7798', 'texto apagado'],
  '#A9A4BD': ['#9A93B3', 'marcador de posición'],
  '#B7B0CE': ['#B3ADC7', 'índices y marquesina'],
  '#5B5570': ['#625B7D', 'avatar neutro'],
  '#120F20': ['#16112E', 'fondo oscuro → tinta fuerte'],
  '#151124': ['#1C1638', 'banda oscura'],
  '#2A2440': ['#241C46', 'panel de marca oscuro'],
  '#171426': ['#16112E', 'panel de marca oscuro, paso medio'],
  '#4A3B8A': ['#6D28D9', 'texto de insignia → morado de verificado'],
  '#E2DEF4': ['#EAE6F5', 'contorno'],
  '#E9E5F5': ['#EAE6F5', 'contorno'],
  '#F5F2FE': ['#FCFBFF', 'fondo al pasar el ratón'],
  '#FBFAFE': ['#F6F4FF', 'fondo de la portada → papel del sistema'],
  '#F4F2F9': ['#F1EEFA', 'relleno de campo → tinte lila'],
  '#FAFAFA': ['#F6F4FF', 'lienzo → papel del sistema'],
  '#FCF8F8': ['#F6F4FF', 'lienzo cálido → papel del sistema'],
  '#E7E5EC': ['#F6F4FF', 'gris del panel → papel del sistema'],

  // Éxito / abierto / verificado.
  '#1F9D57': ['#00A878', 'verde de éxito'],
  '#1F8A4C': ['#007A57', 'verde de éxito, en TEXTO → el que cumple AA'],
  '#176B3A': ['#007A57', 'verde oscuro de texto'],
  '#2E9E5B': ['#00A878', 'verde de éxito'],
  '#4FA02C': ['#2F8728', 'verde (Deportes) → su color de rubro'],
  '#34D399': ['#00A878', 'verde de gráfica'],
  '#A7E3C0': ['#C1EBD6', 'verde claro → paso oscuro de raya verde'],
  '#7BE0A8': ['#00C48C', 'verde sobre oscuro → acento de Bienes raíces'],
  '#E3F5EA': ['#E6FAF3', 'fondo de éxito'],
  '#EAF6EF': ['#E6FAF3', 'fondo de éxito'],
  '#D6E7D0': ['#CDE9C9', 'verde, paso oscuro de raya'],
  '#D6EFDF': ['#C1EBD6', 'verde, paso oscuro de raya'],
  '#EAF6E0': ['#E5F6E3', 'fondo verde (Deportes)'],
  '#0E9384': ['#008489', 'verde azulado (Salud) → su color de rubro'],
  '#0E9488': ['#008489', 'verde azulado (Servicios)'],
  '#D6F3EF': ['#DAF7F7', 'fondo verde azulado'],
  '#DCF3F0': ['#DAF7F7', 'fondo verde azulado'],

  // Aviso / ámbar / estrellas.
  '#F4B740': ['#FFB020', 'ámbar de marca → ámbar del sistema'],
  '#9A6A12': ['#8A5A00', 'ámbar en TEXTO → el que cumple AA'],
  '#B5791A': ['#8A5A00', 'ámbar en texto'],
  '#B26A00': ['#B85D00', 'ámbar oscuro (Educación) → su color de rubro'],
  '#B8860B': ['#8A5A00', 'ámbar en texto'],
  '#D6A22A': ['#AB6600', 'ámbar (Hogar) → su color de rubro'],
  '#E8954A': ['#C05702', 'naranja (Comida) → su color de rubro'],
  '#C26A1A': ['#FF7A1A', 'naranja de renta → acento de Negocios'],
  '#FCEFD6': ['#FFF6E3', 'fondo de aviso'],
  '#FCEBD6': ['#FFEBDF', 'fondo naranja (Comida)'],
  '#FCF1C7': ['#FFF6E3', 'fondo ámbar'],
  '#FCE9D6': ['#FFF1E5', 'fondo naranja → tinte naranja'],
  '#F2E3BF': ['#F4DBBA', 'ámbar, paso oscuro de raya'],
  '#F6E8AE': ['#F4DBBA', 'ámbar, paso oscuro de raya'],
  '#F5E1B0': ['#F4DBBA', 'ámbar, paso oscuro de raya'],
  '#F6E05E': ['#FFB020', 'amarillo → ámbar del sistema'],
  '#FDE68A': ['#F4DBBA', 'amarillo claro → ámbar, paso oscuro'],
  '#F3E2CE': ['#FAD9BD', 'naranja, paso oscuro de raya'],
  '#ECD3B4': ['#FAD9BD', 'naranja, paso oscuro de raya'],
  '#F6DEC0': ['#FAD9BD', 'naranja, paso oscuro de raya'],
  '#F6DCBF': ['#FED6C2', 'naranja, paso oscuro de raya'],
  '#FBEFD3': ['#FFF6E3', 'fondo ámbar'],
  '#EFE3D0': ['#FFECDC', 'fondo naranja'],
  '#E2CFB2': ['#FAD9BD', 'naranja, paso oscuro de raya'],
  '#EDE0D4': ['#FFECDC', 'fondo café → fondo naranja'],
  '#DFCBB6': ['#FAD9BD', 'café, paso oscuro de raya'],
  '#F3D9C8': ['#FFEBDF', 'fondo naranja'],
  '#E8C3AC': ['#FED6C2', 'naranja, paso oscuro de raya'],

  // Error / rosa / me gusta.
  '#D6336C': ['#E11D48', 'rosa de error'],
  '#F0466E': ['#FF2D6F', 'rosa → acento de marca'],
  '#E0568F': ['#C54C67', 'rosa (Belleza) → su color de rubro'],
  '#B0357E': ['#AE54A5', 'magenta → color de rubro (Fiestas)'],
  '#A81E4D': ['#C4144C', 'rosa oscuro de texto'],
  '#9F1239': ['#C4144C', 'rosa oscuro'],
  '#C24D9E': ['#AE54A5', 'magenta (Fiestas) → su color de rubro'],
  '#FDE7EF': ['#FFECF2', 'fondo rosa'],
  '#FBE9F0': ['#FFE8EB', 'fondo rosa (Belleza)'],
  '#F7E6F4': ['#FDE9F9', 'fondo magenta (Fiestas)'],
  '#F3D9E2': ['#FED2DF', 'rosa, paso oscuro de raya'],
  '#E8BFCD': ['#FED2DF', 'rosa, paso oscuro de raya'],
  '#F5D8E6': ['#FED2DF', 'rosa, paso oscuro de raya'],
  '#FCE3EC': ['#FFE8F0', 'fondo rosa'],
  '#F6CEDD': ['#FED2DF', 'rosa, paso oscuro de raya'],
  '#FCE3DC': ['#FFEBDF', 'fondo naranja claro'],
  '#F6CEC2': ['#FED6C2', 'naranja, paso oscuro de raya'],

  // Información / azul.
  '#2F6FED': ['#007CC1', 'azul (Servicios profesionales) → su color de rubro'],
  '#2A5C8A': ['#0369A1', 'azul oscuro en texto → azul de información AA'],
  '#2A6CB0': ['#007FA2', 'azul (Dealer) → su color de rubro'],
  '#4E7CC4': ['#007EB6', 'azul (Transporte) → su color de rubro'],
  '#34A5D6': ['#1678CD', 'azul (Niños) → su color de rubro'],
  '#8A5CF0': ['#935DC1', 'morado (Iglesias) → su color de rubro'],
  '#E5EFFB': ['#DEF4FF', 'fondo azul'],
  '#E5DEF9 ': ['#FED2DF', 'rosa, paso oscuro'],
  '#E4ECFB': ['#DEF4FF', 'fondo azul'],
  '#E4EEFB': ['#DAF6FD', 'fondo azul (Dealer)'],
  '#E4EDF9': ['#DCF5FF', 'fondo azul (Transporte)'],
  '#DEF1FA': ['#E2F2FF', 'fondo azul (Niños)'],
  '#D7E3F6': ['#C0E6FF', 'azul, paso oscuro de raya'],
  '#DAE5F6': ['#C0E6FF', 'azul, paso oscuro de raya'],
  '#E7EEFB': ['#DEF4FF', 'fondo azul'],
  '#D7E5F6': ['#C0E6FF', 'azul, paso oscuro de raya'],
  '#E7ECF3': ['#EAE6F5', 'gris azulado → contorno del sistema'],
  '#DCE3EC': ['#E4DFF2', 'gris azulado, paso oscuro'],
  '#8FC5F5': ['#0EA5E9', 'azul sobre oscuro → acento de Transporte'],
  '#E4EEFB ': ['#DAF6FD', 'fondo azul'],
  '#DCD6F6': ['#E0DAFF', 'morado, paso oscuro de raya'],

  // Los que el vecino más cercano habría resuelto MAL — cazados por el aviso
  // de «sin parecido claro» de este mismo script, en la simulación.
  '#26252B': ['#16112E', 'avatar oscuro de proveedor → tinta fuerte'],
  '#C7C2D6': ['#B3ADC7', 'rejilla de gráfica → tinta tenue'],
  '#FFD37A': ['#FFB020', 'ámbar pálido sobre oscuro → ámbar del sistema'],
  '#E14E8A': ['#FF2D6F', 'serie rosa de gráfica → acento de marca'],
  '#C77B2B': ['#FFB020', 'serie ámbar de gráfica → ámbar del sistema'],
  '#9A3412': ['#B85D00', 'naranja oscuro de BOGO → naranja de rubro'],
  '#065F46': ['#007A57', 'verde oscuro → verde de éxito en texto'],
  // Fondos oscuros del resultado de escanear un boleto (se lee a oscuras en la
  // puerta del evento). Van a los estados oscuros del sistema.
  '#123A26': ['#003825', 'fondo oscuro de éxito'],
  '#3A3212': ['#432601', 'fondo oscuro de aviso'],
  '#3A1420': ['#491F21', 'fondo oscuro de error'],
};

// ── 2 · vecino más cercano en OKLCH, para lo que no lleva significado ───────
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const dist = (a, b) => { const x = oklab(a), y = oklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

// El conjunto admitido se LEE de paleta.ts, para que no puedan separarse.
const fuente = readFileSync(join(RAIZ, 'lib/paleta.ts'), 'utf8');
const SISTEMA = Array.from(new Set((fuente.match(/'#[0-9A-Fa-f]{6}'/g) ?? []).map((s) => s.slice(1, -1).toUpperCase())));

function vecino(hex) {
  let mejor = null, d = Infinity;
  for (const c of SISTEMA) { const k = dist(hex, c); if (k < d) { d = k; mejor = c; } }
  return [mejor, d];
}

// ── 3 · el barrido ──────────────────────────────────────────────────────────
function archivos(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...archivos(p));
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const lejanos = [];
let cambios = 0, tocados = 0;
for (const f of archivos(RAIZ)) {
  if (EXENTOS.some((e) => f.endsWith(e))) continue;
  const antes = readFileSync(f, 'utf8');
  const despues = antes.replace(/#[0-9A-Fa-f]{6}\b/g, (h) => {
    const H = h.toUpperCase();
    if (SISTEMA.includes(H)) return h; // ya es del sistema
    const m = MAPA[H];
    if (m) { cambios++; return m[0]; }
    const [v, d] = vecino(H);
    cambios++;
    // Un salto grande significa que ese color no se parece a NADA del sistema:
    // casi siempre es que hacía un papel que el mapa no contempló. Se cambia
    // igual (el guardián no admitiría otra cosa) pero se reporta para mirarlo.
    if (d > 0.06) lejanos.push({ archivo: f, de: H, a: v, d: d.toFixed(3) });
    return v;
  });
  if (despues !== antes) { tocados++; if (!SECO) writeFileSync(f, despues); }
}

console.log(`\nmigrar-hex · ${cambios} hex reemplazados en ${tocados} archivos${SECO ? ' (SIMULACIÓN)' : ''}`);
console.log(`  mapa explícito: ${Object.keys(MAPA).length} colores con significado declarado`);
console.log(`  paleta del sistema: ${SISTEMA.length} colores admitidos`);
if (lejanos.length) {
  console.log(`\n  ⚠ ${lejanos.length} color(es) sin parecido claro en el sistema — revisar a ojo:`);
  for (const l of lejanos.slice(0, 25)) console.log(`      ${l.de} → ${l.a}  (Δ${l.d})  ${l.archivo}`);
  if (lejanos.length > 25) console.log(`      … y ${lejanos.length - 25} más`);
}
console.log('');
