#!/usr/bin/env node
// seed-muebles.mjs — seed "Muebles El Encanto" (hz-muebles-encanto): a furniture
// store that exercises the OPTIONAL rich product page (Ficha detallada): brand,
// long description, spec table (dimensions/material/warranty/assembly), photo
// gallery, color/fabric variants, compare-at sales. 8 categories × 6 products.
// Same owner + test Stripe account as El Sabor so card checkout works.
// Idempotent. Run: node scripts/seed-muebles.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = 'hz-muebles-encanto';

const TILES = [
  ['#EFEBFF', '#E5DEF9'], ['#FCEBD6', '#F6DEC0'], ['#E3F5EA', '#D6EFDF'], ['#FBE9F0', '#F5D8E6'],
  ['#E5EFFB', '#D8E6F8'], ['#FCEFD6', '#F8E4BC'], ['#D6F3EF', '#C4EAE4'], ['#F3D9C8', '#E8C3AC'],
];
const tile = (i) => `${TILES[i % TILES.length][0]} 0 8px,${TILES[i % TILES.length][1]} 8px 16px`;

// Invented house brands (never real manufacturers).
const BRANDS = ['Nova Living', 'Casa Bella', 'DelSur Muebles', 'Encanto Home'];

// One product: [es, en, price, compareAt?, badge?, brand, dims, material, colorTxt, weight, warranty, assembly, longEs, longEn, options[]]
const P = (es, en, price, compareAt, badge, brand, dims, material, colorTxt, weight, warranty, assembly, longEs, longEn, options = []) =>
  ({ es, en, price, compareAt, badge, brand, dims, material, colorTxt, weight, warranty, assembly, longEs, longEn, options });

const CATS = [
  ['salas', 'Salas y sofás', 'Living room', [
    P('Sofá seccional Aurora · 3 piezas', 'Aurora sectional sofa · 3 pc', 899, 1099, 'Oferta', 'Nova Living', '284 × 157 × 85 cm', 'Estructura de pino · tapiz de lino', 'Gris claro', '95 lb', '1 año', 'Armado ligero (~30 min)',
      'El seccional Aurora convierte cualquier sala en el punto de reunión de la familia. Cojines de espuma de alta densidad que recuperan su forma, tapiz de lino suave al tacto y chaise reversible para acomodarlo a tu espacio. Las patas de madera maciza le dan un aire moderno y resisten el uso diario.',
      'The Aurora sectional turns any living room into the family gathering spot. High-density foam cushions, soft linen upholstery and a reversible chaise. Solid wood legs.', ['color', 'tela']),
    P('Sofá 3 plazas Marbella', 'Marbella 3-seat sofa', 649, null, 'Popular', 'Casa Bella', '210 × 92 × 88 cm', 'Madera de eucalipto · microfibra', 'Beige', '72 lb', '1 año', 'Solo atornillar patas',
      'Líneas clásicas con brazos anchos y asientos profundos. La microfibra repele líquidos — ideal con niños y mascotas.', 'Classic lines, wide arms, deep seats. Liquid-repelling microfiber — kid & pet friendly.', ['color']),
    P('Loveseat Cozy · 2 plazas', 'Cozy loveseat · 2-seat', 449, 529, 'Oferta', 'Nova Living', '152 × 90 × 86 cm', 'Pino + poliéster', 'Azul petróleo', '58 lb', '1 año', 'Armado ligero',
      'Compacto para apartamentos: entra por puertas estándar y se arma en 20 minutos.', 'Apartment-friendly: fits standard doorways, 20-minute assembly.', ['color']),
    P('Sillón reclinable Descanso', 'Descanso recliner', 379, null, null, 'DelSur Muebles', '98 × 95 × 103 cm', 'Acero + piel sintética', 'Café', '68 lb', '2 años', 'Listo para usar',
      'Reclinado manual de 3 posiciones con reposapiés extensible. La piel sintética se limpia con un paño húmedo.', '3-position manual recline with extending footrest. Wipe-clean faux leather.'),
    P('Mesa de centro Nórdica', 'Nordic coffee table', 189, null, 'Nuevo', 'Encanto Home', '110 × 60 × 45 cm', 'MDF laminado + patas de haya', 'Blanco / madera', '35 lb', '1 año', 'Requiere armado (45 min)',
      'Superficie resistente a rayones con un estante inferior para revistas y controles.', 'Scratch-resistant top with a lower shelf for magazines and remotes.'),
    P('Mueble para TV 65" Lima', 'Lima 65" TV stand', 259, 299, 'Oferta', 'Encanto Home', '160 × 40 × 52 cm', 'MDF enchapado', 'Nogal', '48 lb', '1 año', 'Requiere armado (60 min)',
      'Dos puertas con cierre suave, paso de cables oculto y soporta pantallas de hasta 65 pulgadas (80 lb).', 'Two soft-close doors, hidden cable pass-through, holds up to 65-inch TVs (80 lb).'),
  ]],
  ['comedores', 'Comedores', 'Dining', [
    P('Comedor Familia · mesa + 6 sillas', 'Familia dining set · table + 6 chairs', 1099, 1299, 'Oferta', 'DelSur Muebles', 'Mesa 180 × 90 × 76 cm', 'Madera de mango maciza', 'Nogal natural', '160 lb', '2 años', 'Requiere armado (90 min)',
      'Madera maciza de mango con vetas únicas en cada mesa. Las sillas llevan asiento tapizado y respaldo ergonómico. Para 6 personas cómodas — los domingos de sancocho caben todos.',
      'Solid mango wood with unique grain. Upholstered ergonomic chairs. Comfortably seats 6.', ['color']),
    P('Mesa redonda Bistró · 4 puestos', 'Bistró round table · seats 4', 429, null, 'Popular', 'Casa Bella', 'Ø 107 × 76 cm', 'MDF + base de acero', 'Blanco', '62 lb', '1 año', 'Requiere armado (40 min)',
      'La base de pedestal deja las piernas libres — perfecta para espacios pequeños.', 'Pedestal base keeps legs free — perfect for small spaces.'),
    P('Juego de 2 sillas Valencia', 'Valencia chairs · set of 2', 179, 219, 'Oferta', 'Nova Living', '46 × 54 × 92 cm (c/u)', 'Haya + tapiz de tela', 'Gris', '13 lb c/u', '1 año', 'Listas para usar',
      'Curva lumbar que sí se siente. Tapiz anti-manchas.', 'A lumbar curve you can feel. Stain-resistant fabric.', ['color']),
    P('Vitrina Colonial 4 puertas', 'Colonial 4-door hutch', 749, null, null, 'DelSur Muebles', '120 × 45 × 190 cm', 'Pino macizo', 'Miel', '140 lb', '2 años', 'Entrega con armado incluido',
      'Vidrio templado arriba para tus copas, gabinete cerrado abajo para la vajilla de diario.', 'Tempered-glass top for glassware, closed cabinet below for everyday dishes.'),
    P('Banco alto Cocina · par', 'Kitchen bar stools · pair', 149, null, null, 'Encanto Home', '43 × 43 × 105 cm (c/u)', 'Acero + asiento de PU', 'Negro', '11 lb c/u', '1 año', 'Armado ligero',
      'Altura de barra (75 cm al asiento), reposapiés y tapas antideslizantes.', 'Bar height (75 cm seat), footrest and non-slip caps.'),
    P('Aparador Moderno 3 cajones', 'Modern 3-drawer sideboard', 389, 459, 'Oferta', 'Nova Living', '140 × 40 × 80 cm', 'MDF enchapado + patas metálicas', 'Verde salvia', '70 lb', '1 año', 'Requiere armado (75 min)',
      'Cajones con rieles metálicos de extensión completa y espacio interno ajustable.', 'Full-extension metal drawer glides and adjustable inner shelf.'),
  ]],
  ['recamaras', 'Recámaras', 'Bedroom', [
    P('Cama Queen Luna con cabecera', 'Luna queen bed with headboard', 549, 649, 'Oferta', 'Nova Living', '163 × 213 × 120 cm', 'Acero + tapiz de lino', 'Gris oscuro', '85 lb', '1 año', 'Requiere armado (60 min)',
      'Cabecera acolchada de 120 cm para ver novelas sentado. Base de láminas — no necesita box spring.',
      'Tall padded headboard. Slat base — no box spring needed.', ['color']),
    P('Juego de recámara completa · 5 piezas', 'Bedroom set · 5 pieces', 1499, 1799, 'Oferta', 'DelSur Muebles', 'Cama King + 2 burós + cómoda + espejo', 'Madera de pino + MDF', 'Chocolate', '320 lb', '2 años', 'Entrega con armado incluido',
      'Todo lo que la recámara principal necesita, con acabados que combinan. Cómoda de 6 cajones con rieles suaves.',
      'Everything the main bedroom needs, in matching finishes. 6-drawer dresser with smooth glides.'),
    P('Buró Nube · 2 cajones', 'Nube 2-drawer nightstand', 129, null, 'Popular', 'Encanto Home', '45 × 40 × 55 cm', 'MDF laminado', 'Blanco', '22 lb', '1 año', 'Requiere armado (30 min)',
      'Puerto superior para pasar el cable del cargador. Cajones silenciosos.', 'Top cable pass-through for chargers. Quiet drawers.'),
    P('Cómoda Alta 5 cajones', 'Tall 5-drawer chest', 299, null, null, 'Casa Bella', '80 × 45 × 122 cm', 'MDF + herrajes metálicos', 'Roble claro', '78 lb', '1 año', 'Requiere armado (90 min)',
      'Anclaje a pared incluido (seguridad para niños). Cajones profundos para suéteres y jeans.', 'Wall-anchor kit included (child safety). Deep drawers for sweaters and jeans.'),
    P('Espejo de piso Elegancia', 'Elegancia floor mirror', 159, 189, 'Oferta', 'Casa Bella', '60 × 170 cm', 'Marco de aluminio', 'Dorado', '28 lb', '1 año', 'Listo para usar',
      'De cuerpo completo, se recarga o se ancla a la pared (kit incluido).', 'Full-length; lean or wall-mount (kit included).'),
    P('Ropero Portátil reforzado', 'Heavy-duty portable closet', 89, null, null, 'Encanto Home', '150 × 45 × 175 cm', 'Acero + cubierta de tela', 'Gris', '24 lb', '6 meses', 'Requiere armado (45 min)',
      'Doble tubo para colgar y 4 repisas laterales. Cubierta con cierre completo contra polvo.', 'Double hanging rods and 4 side shelves. Full-zip dust cover.'),
  ]],
  ['colchones', 'Colchones', 'Mattresses', [
    P('Colchón Queen híbrido Firmeza', 'Firmeza queen hybrid mattress', 499, 699, 'Oferta', 'Nova Living', '152 × 203 × 30 cm', 'Resortes ensacados + memory foam', 'Blanco', '92 lb', '10 años', 'Llega enrollado — se expande en 48 h',
      'Híbrido de firmeza media: resortes ensacados que aíslan el movimiento y capa de memory foam con gel que no da calor. Certificado CertiPUR-US.',
      'Medium-firm hybrid: pocketed coils isolate motion; gel memory foam sleeps cool. CertiPUR-US certified.'),
    P('Colchón Full espuma Descanso', 'Descanso full foam mattress', 299, null, 'Popular', 'Nova Living', '137 × 191 × 25 cm', 'Espuma de alta densidad', 'Blanco', '60 lb', '10 años', 'Llega enrollado',
      'Tres capas de espuma con zona lumbar reforzada.', 'Three foam layers with reinforced lumbar zone.'),
    P('Colchón Twin niños ProteKids', 'ProteKids twin mattress', 179, 219, 'Oferta', 'Encanto Home', '99 × 191 × 20 cm', 'Espuma + funda impermeable', 'Blanco', '38 lb', '5 años', 'Llega enrollado',
      'Funda lavable e impermeable — accidentes nocturnos sin drama.', 'Washable waterproof cover — nighttime accidents, no drama.'),
    P('Colchón King Nube Real', 'Nube Real king mattress', 699, 899, 'Oferta', 'Nova Living', '193 × 203 × 32 cm', 'Híbrido premium · euro top', 'Blanco', '115 lb', '10 años', 'Llega enrollado — 2 personas para moverlo',
      'Nuestro tope de línea: euro top acolchado, borde reforzado y 7 zonas de soporte.', 'Our flagship: quilted euro top, reinforced edge and 7 support zones.'),
    P('Base ajustable Queen ZeroG', 'ZeroG queen adjustable base', 599, null, 'Nuevo', 'DelSur Muebles', '152 × 203 cm', 'Acero + motor silencioso', 'Negro', '105 lb', '3 años', 'Requiere armado (30 min)',
      'Cabeza y pies ajustables con control remoto, posición Zero-G y puertos USB.', 'Adjustable head & feet, remote, Zero-G preset and USB ports.'),
    P('Protector de colchón Queen', 'Queen mattress protector', 29, 39, 'Oferta', 'Encanto Home', '152 × 203 cm', 'Algodón + membrana TPU', 'Blanco', '2 lb', '2 años', 'Listo para usar',
      'Impermeable pero silencioso (nada de plástico que suena). Se lava en máquina.', 'Waterproof yet quiet (no crinkly plastic). Machine washable.'),
  ]],
  ['oficina', 'Oficina en casa', 'Home office', [
    P('Escritorio Ejecutivo L', 'Executive L-shaped desk', 349, 429, 'Oferta', 'Nova Living', '150 × 150 × 76 cm', 'MDF + estructura de acero', 'Nogal / negro', '82 lb', '1 año', 'Requiere armado (90 min)',
      'Esquinero en L con superficie para doble monitor, gancho para audífonos y bandeja pasacables.',
      'L-shaped corner desk with dual-monitor room, headphone hook and cable tray.'),
    P('Silla ergonómica Confort Pro', 'Confort Pro ergonomic chair', 229, 279, 'Oferta', 'Nova Living', '66 × 66 × 120 cm', 'Malla + base de aluminio', 'Negro', '42 lb', '2 años', 'Armado ligero (15 min)',
      'Soporte lumbar ajustable, reposabrazos 3D y malla que respira en verano.', 'Adjustable lumbar, 3D armrests and breathable mesh.', ['color']),
    P('Librero 5 repisas Torre', 'Torre 5-shelf bookcase', 149, null, 'Popular', 'Encanto Home', '80 × 30 × 180 cm', 'MDF laminado', 'Roble', '55 lb', '1 año', 'Requiere armado (60 min)',
      'Cada repisa carga 40 lb — aguanta la colección completa.', 'Each shelf holds 40 lb.'),
    P('Escritorio compacto Estudio', 'Estudio compact desk', 119, null, null, 'Casa Bella', '100 × 50 × 75 cm', 'MDF + patas de acero', 'Blanco', '38 lb', '1 año', 'Requiere armado (30 min)',
      'Cabe en cualquier esquina; cajón lateral para cuadernos.', 'Fits any corner; side drawer for notebooks.'),
    P('Silla gamer Fuego RGB', 'Fuego RGB gaming chair', 259, 319, 'Oferta', 'DelSur Muebles', '70 × 70 × 130 cm', 'Piel sintética + espuma moldeada', 'Negro / rojo', '48 lb', '1 año', 'Armado ligero (20 min)',
      'Reclinado 165°, cojines lumbar y de cuello incluidos.', '165° recline, lumbar & neck pillows included.'),
    P('Archivero móvil 3 cajones', 'Mobile 3-drawer file cabinet', 99, null, null, 'Encanto Home', '40 × 50 × 60 cm', 'Acero', 'Blanco', '30 lb', '2 años', 'Listo para usar',
      'Cajón inferior para carpetas colgantes, ruedas con freno y cerradura.', 'Bottom drawer fits hanging files; locking casters and key lock.'),
  ]],
  ['exterior', 'Exterior y patio', 'Outdoor & patio', [
    P('Juego de patio Brisa · 4 piezas', 'Brisa patio set · 4 pc', 549, 699, 'Oferta', 'DelSur Muebles', 'Sofá 2p + 2 sillones + mesa', 'Ratán sintético + aluminio', 'Café / beige', '95 lb', '1 año (uso exterior)', 'Requiere armado (60 min)',
      'Ratán tejido a mano que aguanta sol y lluvia; cojines con funda lavable.', 'Hand-woven all-weather rattan; washable cushion covers.'),
    P('Asador de carbón Parrillero', 'Parrillero charcoal grill', 189, null, 'Popular', 'Encanto Home', '115 × 65 × 110 cm', 'Acero esmaltado', 'Negro', '58 lb', '1 año', 'Requiere armado (45 min)',
      'Parrilla principal + rejilla de calentamiento, termómetro en tapa y mesa lateral.', 'Main grate + warming rack, lid thermometer and side table.'),
    P('Hamaca doble con base', 'Double hammock with stand', 129, 159, 'Oferta', 'Casa Bella', '380 × 120 cm', 'Algodón + base de acero', 'Multicolor', '35 lb', '6 meses', 'Armado ligero (15 min)',
      'Tejido tradicional para dos personas; base incluida — no necesitas árboles.', 'Traditional two-person weave; stand included — no trees needed.'),
    P('Sombrilla de patio 10 pies', '10-ft patio umbrella', 99, null, null, 'Encanto Home', 'Ø 305 cm', 'Poliéster UV50+ + aluminio', 'Terracota', '20 lb', '1 año', 'Lista para usar',
      'Manivela y tilt ajustable; la tela bloquea 98% del UV.', 'Crank open with adjustable tilt; canopy blocks 98% of UV.'),
    P('Mecedora de exterior Abuela', 'Abuela outdoor rocking chair', 149, 179, 'Oferta', 'DelSur Muebles', '66 × 90 × 100 cm', 'HDPE (madera sintética)', 'Blanco', '38 lb', '3 años', 'Armado ligero (20 min)',
      'Como la del campo, pero que no se pudre ni se despinta.', 'Like the one back home — but it never rots or fades.'),
    P('Cooler de patio 80 qt', '80-qt patio cooler cart', 169, null, 'Nuevo', 'Encanto Home', '81 × 47 × 82 cm', 'Acero inoxidable', 'Acero', '32 lb', '1 año', 'Requiere armado (30 min)',
      'Mantiene el hielo 36 horas; destapador y desagüe integrados.', 'Holds ice 36 hours; built-in bottle opener and drain.'),
  ]],
  ['decoracion', 'Decoración', 'Décor', [
    P('Alfombra Fiesta 5×7', 'Fiesta area rug 5×7', 119, 149, 'Oferta', 'Casa Bella', '152 × 213 cm', 'Polipropileno tejido', 'Multicolor', '12 lb', '6 meses', 'Lista para usar',
      'Colores vivos que no destiñen; pelo corto fácil de aspirar.', 'Fade-resistant vibrant colors; low pile, easy to vacuum.'),
    P('Juego de 3 cuadros Caribe', 'Caribe canvas art · set of 3', 79, null, 'Popular', 'Casa Bella', '3 × (40 × 60 cm)', 'Canvas + bastidor de pino', 'Multicolor', '6 lb', '—', 'Listos para colgar',
      'Paisajes del Caribe impresos en canvas con marco interno.', 'Caribbean landscapes on framed canvas.'),
    P('Cortinas blackout · par', 'Blackout curtains · pair', 45, 59, 'Oferta', 'Encanto Home', '2 × (132 × 213 cm)', 'Poliéster triple tejido', 'Gris plata', '4 lb', '—', 'Listas para colgar',
      'Bloquean 99% de la luz y aíslan el calor — la siesta es sagrada.', 'Block 99% of light and insulate heat — naps are sacred.'),
    P('Reloj de pared Hacienda', 'Hacienda wall clock', 39, null, null, 'DelSur Muebles', 'Ø 60 cm', 'Metal envejecido', 'Bronce', '5 lb', '1 año', 'Listo para colgar',
      'Números romanos y manecillas silenciosas.', 'Roman numerals, silent sweep hands.'),
    P('Set de 4 cojines Tropical', 'Tropical throw pillows · set of 4', 49, 65, 'Oferta', 'Casa Bella', '4 × (45 × 45 cm)', 'Funda de algodón + relleno', 'Multicolor', '4 lb', '—', 'Listos para usar',
      'Fundas con cierre, lavables en máquina.', 'Zippered machine-washable covers.'),
    P('Espejo decorativo Sol', 'Sol accent mirror', 89, null, 'Nuevo', 'DelSur Muebles', 'Ø 80 cm', 'Metal dorado', 'Dorado', '9 lb', '1 año', 'Listo para colgar',
      'Marco de rayos estilo sol — el punto focal de la entrada.', 'Sunburst frame — the entryway focal point.'),
  ]],
  ['iluminacion', 'Iluminación', 'Lighting', [
    P('Lámpara de piso Arco', 'Arco floor lamp', 129, 159, 'Oferta', 'Nova Living', '170 × 32 × 180 cm', 'Acero + pantalla de tela', 'Dorado / blanco', '18 lb', '1 año', 'Armado ligero (15 min)',
      'El arco vuela sobre el sofá para leer sin lámpara de mesa. Foco LED incluido.', 'Arches over the sofa for reading light. LED bulb included.'),
    P('Candelabro Moderno 6 luces', 'Modern 6-light chandelier', 199, 249, 'Oferta', 'Casa Bella', 'Ø 60 × 50 cm', 'Metal + vidrio', 'Negro / dorado', '14 lb', '1 año', 'Instalación eléctrica requerida',
      'Seis brazos ajustables; compatible con dimmer.', 'Six adjustable arms; dimmer compatible.'),
    P('Par de lámparas de buró Twin', 'Twin table lamps · pair', 59, null, 'Popular', 'Encanto Home', '2 × (25 × 25 × 48 cm)', 'Cerámica + pantalla de lino', 'Gris', '7 lb', '1 año', 'Listas para usar',
      'Con puerto USB en la base para cargar el teléfono.', 'USB port in the base to charge your phone.'),
    P('Tira LED exterior 48 pies', '48-ft outdoor string lights', 45, 59, 'Oferta', 'Encanto Home', '14.6 m · 15 focos', 'Cable comercial + focos S14', 'Blanco cálido', '4 lb', '2 años', 'Listas para colgar',
      'A prueba de lluvia; focos de repuesto incluidos. El patio queda de fiesta.', 'Weatherproof; spare bulbs included.'),
    P('Lámpara colgante Cocina trio', 'Kitchen pendant trio', 89, null, null, 'Nova Living', '3 × Ø 20 cm · cable 150 cm', 'Metal + interior dorado', 'Negro mate', '9 lb', '1 año', 'Instalación eléctrica requerida',
      'Tres pendientes alineados para la barra de la cocina.', 'Three aligned pendants for the kitchen bar.'),
    P('Lámpara de pie con repisas', 'Shelf floor lamp', 79, 99, 'Oferta', 'DelSur Muebles', '26 × 26 × 160 cm', 'MDF + pantalla de tela', 'Nogal', '15 lb', '1 año', 'Requiere armado (25 min)',
      'Luz + 3 repisas para plantas y libros en el mismo pie cuadrado.', 'Light + 3 shelves in the same square foot.'),
  ]],
];

const esc = (s) => String(s).replace(/'/g, "''");

const config = {
  categories: CATS.map(([id, es, en], i) => ({ id, es, en, icon: 'box', tile: tile(i), visible: true })),
  optionSets: [
    { id: 'color', es: 'Color', en: 'Color', single: true, values: [{ es: 'Gris', en: 'Gray', price: 0 }, { es: 'Beige', price: 0 }, { es: 'Azul marino', en: 'Navy', price: 20 }] },
    { id: 'tela', es: 'Tela', en: 'Fabric', single: true, values: [{ es: 'Lino', en: 'Linen', price: 0 }, { es: 'Microfibra', en: 'Microfiber', price: 0 }, { es: 'Piel sintética', en: 'Faux leather', price: 80 }] },
  ],
  collections: [
    { id: 'ofertas', es: 'Rebajas de temporada', en: 'Seasonal sale', tile: '#FBE9F0 0 8px,#F5D8E6 8px 16px', productIds: [], featured: true },
    { id: 'sala', es: 'Renueva tu sala', en: 'Living room refresh', tile: '#EFEBFF 0 8px,#E5DEF9 8px 16px', productIds: [], featured: true },
  ],
  discounts: [], tags: [],
  automation: { trackStock: true, notifyLow: true, hideOutOfStock: false, backorders: false },
  selling: true,
};

const settings = {
  shipping: { delivery: { on: true, fee: '49', radius: '25', zones: [{ es: 'Hazleton y alrededores', en: 'Hazleton area', toMi: 25, fee: 49, time: '2–5 días', color: '#7B61FF' }] } },
  delivery_ops: { minOrder: '0', prep: 0 },
};

const stockFor = (ci, pi) => (ci === 2 && pi === 5 ? 0 : ci % 2 === 0 && pi === 3 ? 2 : 4 + ((ci * 7 + pi * 3) % 14));

let sql = `-- seed-muebles generated ${new Date().toISOString()}
insert into public.businesses (slug, name, category_id, tagline_es, tagline_en, tier, price_level,
  about_es, about_en, address, city, phone, is_open, rating, reviews_count,
  tile_a, tile_b, location, owner_id, modules, settings, product_config,
  stripe_account_id, connect_charges_enabled, connect_details_submitted, timezone,
  specialty_es, specialty_en, hours_es, hours_en)
values ('${SLUG}', 'Muebles El Encanto', 'Shops',
  'Muebles para tu hogar con entrega y armado', 'Home furniture with delivery & assembly',
  'verified', '$$',
  'Sala, comedor, recámara y patio con estilo latino y precios honestos. Entrega local con armado disponible y planes de apartado.',
  'Living, dining, bedroom and patio furniture with Latino style and honest prices. Local delivery with assembly available.',
  '415 Alter St, Hazleton, PA', 'Hazleton, PA', '(570) 555-0242', true, 0, 0,
  '#EFEBFF', '#E5DEF9', st_geogfromtext('POINT(-75.978 40.947)'),
  (select owner_id from public.businesses where slug='hz-sabor-quisqueya'),
  '{"updates": true}'::jsonb,
  '${esc(JSON.stringify(settings))}'::jsonb,
  '${esc(JSON.stringify(config))}'::jsonb,
  (select stripe_account_id from public.businesses where slug='hz-sabor-quisqueya'),
  true, true, 'America/New_York',
  'Muebles y decoración del hogar', 'Home furniture & décor',
  'Lun–Sáb 9am–8pm · Dom 10am–6pm', 'Mon–Sat 9am–8pm · Sun 10am–6pm')
on conflict (slug) do update set
  product_config = excluded.product_config,
  settings = excluded.settings,
  stripe_account_id = excluded.stripe_account_id,
  connect_charges_enabled = excluded.connect_charges_enabled;

delete from public.business_items where kind='product' and business_id=(select id from public.businesses where slug='${SLUG}');
insert into public.business_items (business_id, kind, name, description, price, section, available, sort, attrs) values
`;

const rows = [];
CATS.forEach(([catId, , catEn, prods], ci) => {
  prods.forEach((pr, pi) => {
    const stock = stockFor(ci, pi);
    const badges = [];
    if (pr.compareAt) badges.push('Oferta');
    if (pr.badge && pr.badge !== 'Oferta' && !badges.includes(pr.badge)) badges.push(pr.badge);
    const specs = [
      { es: 'Dimensiones', en: 'Dimensions', valEs: pr.dims, valEn: pr.dims },
      { es: 'Material', en: 'Material', valEs: pr.material, valEn: pr.material },
      { es: 'Color', en: 'Color', valEs: pr.colorTxt, valEn: pr.colorTxt },
      { es: 'Peso', en: 'Weight', valEs: pr.weight, valEn: pr.weight },
      { es: 'Garantía', en: 'Warranty', valEs: pr.warranty, valEn: pr.warranty },
      { es: 'Armado', en: 'Assembly', valEs: pr.assembly, valEn: pr.assembly },
    ];
    const attrs = {
      en: pr.en, sku: `${catId.slice(0, 3).toUpperCase()}-${String(pi + 1).padStart(3, '0')}`,
      stock, reorder: 2, compareAt: pr.compareAt ?? null,
      options: pr.options, fulfill: ['local', 'pickup'], tax: 'goods', badges, sales: '',
      brand: pr.brand, longEs: pr.longEs, longEn: pr.longEn, specs, photos: [],
    };
    rows.push(`((select id from public.businesses where slug='${SLUG}'), 'product', '${esc(pr.es)}', '${esc(catEn)}', ${pr.price}, '${catId}', true, ${ci * 100 + pi}, '${esc(JSON.stringify(attrs))}'::jsonb)`);
  });
});
sql += rows.join(',\n') + ';\n';
sql += `select count(*) as productos, count(*) filter (where (attrs->>'compareAt') is not null) as en_oferta from public.business_items where kind='product' and business_id=(select id from public.businesses where slug='${SLUG}');\n`;

const out = resolve(HERE, '../.seed-muebles.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out} (${rows.length} products)`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
