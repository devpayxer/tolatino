/* Tiendas (NEG-TIENDA) · cómo vende cada tienda (E5 · ficha por categoría, 28 oct 2026). Hoy = jue 24 sep 2026, 12:30 PM.
   kind(b): ropa · cel · casa · ferr · bell · joya · fam · svc (lavandería, sastre, tintorería, estética canina: servicios, no productos) · auto · pet · online · movil (b.k lo fuerza).
   post(C, s, es, b, v) corrige la ficha armada por TLTiendaL: preguntas por tipo (se queda «¿El precio de aquí es el de la caja?»; b.fq y Tu página ganan),
   «VERIFICADAS POR APARTADO», Free sin «Desde $» ni «APARTADO · NO» ni «CAMBIOS —», servicios = «Servicios» y «Cómo funciona», sin tienda = «Dónde vende».
   Envuelve TLRev.forBiz (reseñas por tipo si no tiene las suyas), TLRev.stats (verificadas de los Pro que apartan) y TLListing.hoursPro (sin feriados que el dueño no eligió). */
(function () {
  const W = window, tg = (b, t) => (b.tags || []).includes(t);
  const isT = b => !!b && !!b.tienda;
  const KS = [['Lavandería', 'svc'], ['Tintorería', 'svc'], ['Sastrería y arreglos de ropa', 'svc'], ['Estética canina', 'svc'], ['Tienda en línea', 'online'], ['Vendedor móvil', 'movil'],
    ['Tienda de celulares y planes', 'cel'], ['Electrónica', 'cel'], ['Computadoras', 'tec'], ['Videojuegos', 'tec'], ['Mueblería', 'casa'], ['Colchones', 'casa'], ['Electrodomésticos', 'casa'], ['Decoración del hogar', 'casa'], ['Artículos de cocina', 'casa'],
    ['Ferretería', 'ferr'], ['Tienda de pinturas', 'ferr'], ['Materiales de construcción', 'ferr'], ['Vivero y jardinería', 'ferr'], ['Renta de herramienta', 'ferr'], ['Productos de belleza', 'bell'],
    ['Joyería', 'joya'], ['Reparación de relojes y joyas', 'joya'], ['Casa de empeño', 'joya'], ['Tienda de autopartes', 'auto'], ['Tienda de mascotas', 'pet'],
    ['Ropa de mujer', 'ropa'], ['Ropa de hombre', 'ropa'], ['Ropa de niños', 'ropa'], ['Vestidos de quinceañera y novia', 'ropa'], ['Ropa formal y trajes', 'ropa'], ['Ropa vaquera, botas y sombreros', 'ropa'], ['Zapatería', 'ropa'], ['Tenis y ropa urbana', 'ropa'], ['Uniformes y ropa de trabajo', 'ropa'], ['Camisetas personalizadas', 'ropa'], ['Ropa de segunda', 'ropa'], ['Consignación', 'ropa'], ['Accesorios y bolsos', 'ropa']];
  function kind(b) { if (!b) return 'fam'; if (b.k) return b.k; for (const s of b.subs || []) { const m = KS.find(x => x[0] === s); if (m) return m[1]; } return 'fam'; }
  const isSvc = b => isT(b) && kind(b) === 'svc';
  const fmt = h => W.TLListing && W.TLListing.fmt ? W.TLListing.fmt(h) : String(h);
  const opOf = b => ((W.TLTienda && W.TLTienda.OPTS) || {})[b.id] || {};
  const HOW = { 'Lavandería': ['Lavado por libra. Si lo dejas antes de las 10 AM, está listo el mismo día.', 'Wash and fold by the pound. Drop off before 10 AM, ready the same day.'], 'Sastrería y arreglos de ropa': ['Bastas y arreglos en 3 días. Te dice el precio antes de cortar.', 'Hems and alterations in 3 days. You get the price before any cut.'], 'Estética canina': ['Baño y corte con cita. El precio va por tamaño y te lo dicen antes.', 'Bath and trim by appointment. Priced by size, told upfront.'], 'Tintorería': ['Limpieza en seco en 2 días.', 'Dry cleaning in 2 days.'] };
  const howOf = (b, es) => { for (const s of b.subs || []) if (HOW[s]) return HOW[s][es ? 0 : 1]; return ''; };

  /* ---------- Preguntas por tipo (la 1.ª, la del precio de la caja, se queda) ---------- */
  function faq(b, es, cur) { if (b.fq) return b.fq.map(q => es ? [q[0], q[1]] : [q[2], q[3]]); const E2 = (x, y) => es ? x : y, op = opOf(b), k = kind(b);
    const PLAN = op.plan ? [E2('¿Cómo funciona el plan de pagos?', 'How does layaway work?'), E2('Abonas el ' + op.plan[0] + ' % y pagas el resto en ' + op.plan[1] + ' pagos. Te lo llevas al terminar de pagar.', 'Pay ' + op.plan[0] + '% down and the rest in ' + op.plan[1] + ' payments. Take it home when paid off.')] : null;
    const ENV = [E2('¿Llevan a la casa?', 'Do you deliver?'), op.envio != null ? (op.envio ? E2('Sí, por $' + op.envio + '.', 'Yes, for $' + op.envio + '.') : E2('Sí, gratis.', 'Yes, free.')) : E2('No; se recoge en la tienda.', 'No; pick it up in store.')];
    const K = {
      ropa: [[E2('¿Y si no me queda la talla?', 'What if the size does not fit?'), op.dev ? E2('La cambias en ' + op.dev + ' días con el recibo, sin usar.', 'Exchange it within ' + op.dev + ' days with the receipt, unworn.') : E2('Pruébatela en la tienda antes de pagar.', 'Try it on in store before paying.')], [E2('¿Hacen arreglos?', 'Do you do alterations?'), E2('Pregunta al apartar: algunas bastas van incluidas.', 'Ask when holding: some hems are included.')]],
      cel: [[E2('¿Los teléfonos vienen liberados?', 'Are the phones unlocked?'), E2('Sí, los nuevos y los reacondicionados. No desbloquean teléfonos reportados.', 'Yes, new and refurbished. They do not unlock reported phones.')], [E2('¿Me reciben mi teléfono viejo?', 'Do you take trade-ins?'), E2('Te lo revisan y te dicen cuánto te descuentan antes de decidir.', 'They check it and tell you the credit before you decide.')]],
      tec: [[E2('¿Los usados tienen garantía?', 'Do used items have a warranty?'), E2('Cada juego y equipo usado se prueba antes; tienes ' + (op.dev || 14) + ' días para cambiarlo.', 'Every used game and device is tested first; you have ' + (op.dev || 14) + ' days to exchange it.')], PLAN || [E2('¿Arman computadoras?', 'Do you build PCs?'), E2('Sí, te dan el precio por escrito antes.', 'Yes, with the price in writing first.')]],
      casa: [ENV, PLAN || [E2('¿Tiene garantía?', 'Is there a warranty?'), E2('La del fabricante; te la dan por escrito.', 'The manufacturer’s; you get it in writing.')]],
      mat: [[E2('¿Llevan el material con camión?', 'Do you deliver by truck?'), op.envio != null ? E2('Sí, por $' + op.envio + ' en Hazleton.', 'Yes, for $' + op.envio + ' in Hazleton.') : E2('No; se recoge en el patio.', 'No; pick up at the yard.')], [E2('¿Me ayudan a calcular cuánto necesito?', 'Can you help me figure out how much I need?'), E2('Sí: trae las medidas y te dicen cuánto material comprar para que no sobre.', 'Yes: bring your measurements and they tell you how much to buy so nothing is left over.')]],
      ferr: [[E2('¿Rentan herramienta?', 'Do you rent tools?'), E2('Sí, por día, con depósito que se devuelve al regresarla.', 'Yes, by the day, with a deposit refunded on return.')], [E2('¿Mezclan pintura?', 'Do you mix paint?'), E2('Sí, al color que traigas, mientras esperas.', 'Yes, to the color you bring, while you wait.')]],
      bell: [[E2('¿Tienen productos dominicanos?', 'Do you carry Dominican products?'), E2('Sí: mascarillas, cremas de rolos y tratamientos que se usan en los salones de allá.', 'Yes: masks, setting creams and treatments used in salons back home.')], [E2('¿Venden a salones?', 'Do you sell to salons?'), E2('Sí, a todos; a salones con precio por caja.', 'Yes, to everyone; salons get case pricing.')]],
      joya: [[E2('¿El oro es de verdad?', 'Is the gold real?'), E2('Sí: cada pieza dice los quilates y te dan el recibo con el peso.', 'Yes: every piece shows the karat and you get a receipt with the weight.')], PLAN || [E2('¿Reparan joyas?', 'Do you repair jewelry?'), E2('Sí, te dicen el precio antes.', 'Yes, with the price upfront.')]],
      fam: [[E2('¿Envuelven para regalo?', 'Do you gift-wrap?'), E2('Sí, gratis.', 'Yes, free.')], PLAN || ENV]
    };
    const has = s => (b.subs || []).includes(s), kk = k === 'ferr' && !has('Ferretería') && !has('Renta de herramienta') && !has('Tienda de pinturas') ? 'mat' : k;
    const m = K[kk]; if (!m || cur.length < 3) return cur; return [cur[0], m[0], m[1], tg(b, 'apartado') ? cur[1] : cur[2]]; }

  /* ---------- Reseñas por tipo: [es, en, estrellas, caja, hay] ---------- */
  const RK = {
    ropa: [['La talla que decía la página estaba en la tienda.', 'The size the page showed was in the store.', 5, 1, 1], ['El precio de la caja fue el de la etiqueta.', 'The register price matched the tag.', 5, 1, 1], ['Bonita ropa, pero los probadores son pocos.', 'Nice clothes, but few fitting rooms.', 4, 1, 1]],
    tec: [['El juego usado funcionaba perfecto, lo probaron delante de mí.', 'The used game worked perfectly; they tested it in front of me.', 5, 1, 1], ['La laptop con plan de pagos, sin cargos escondidos.', 'The laptop on layaway, no hidden fees.', 5, 1, 1], ['Bien, pero a veces no tienen el juego nuevo.', 'Good, but sometimes the new release is out.', 4, 1, 0]],
    cel: [['Me dijeron qué teléfono me convenía sin presionar.', 'They told me which phone suited me with no pressure.', 5, 1, 1], ['El precio de la caja fue el de la página.', 'The register price matched the page.', 5, 1, 1], ['Bien, pero el sábado hay fila.', 'Good, but Saturdays have a line.', 4, 1, 1]],
    casa: [['Llegó el día que dijeron y lo subieron al segundo piso.', 'It arrived the day they said and they carried it upstairs.', 5, 1, 1], ['El plan de pagos sin cargos escondidos.', 'Layaway with no hidden fees.', 5, 1, 1], ['Buen precio, pero la entrega tardó un día más.', 'Good price, but delivery was a day late.', 4, 1, 1]],
    ferr: [['Me explicaron qué comprar para el arreglo.', 'They explained what to buy for the repair.', 5, 1, 1], ['Mezclaron la pintura mientras esperaba.', 'They mixed the paint while I waited.', 5, 1, 1], ['Bien, pero a veces no hay lo que buscas.', 'Good, but sometimes what you need is out.', 4, 1, 0]],
    bell: [['Tienen los productos de allá que no hay en otro lado.', 'They have products from back home you cannot find elsewhere.', 5, 1, 1], ['Me explicaron cuál usar para mi pelo.', 'They explained which to use for my hair.', 5, 1, 1], ['Bueno, pero a veces se acaba lo que buscas.', 'Good, but what you want sometimes runs out.', 4, 1, 0]],
    joya: [['Me dieron el recibo con el peso y los quilates.', 'They gave me a receipt with the weight and karat.', 5, 1, 1], ['La cadena quedó como nueva.', 'The chain looked brand new.', 5, 1, 1], ['Bonito, pero un poco caro.', 'Pretty, but a bit pricey.', 4, 1, 1]],
    fam: [['Encontré el regalo y me lo envolvieron gratis.', 'Found the gift and they wrapped it for free.', 5, 1, 1], ['El precio de la caja fue el de la etiqueta.', 'The register price matched the tag.', 5, 1, 1], ['Bien, pero el estacionamiento es difícil.', 'Good, but parking is hard.', 4, 1, 1]],
    svc: [['Me dijeron el precio antes y lo cumplieron.', 'They told me the price first and kept it.', 5, 1, 1], ['Listo el día que dijeron.', 'Ready the day they said.', 5, 1, 1], ['Bien, pero hay que esperar en la mañana.', 'Good, but mornings have a wait.', 4, 1, 1]],
    auto: [['Tenían la pieza y me dijeron si era la correcta.', 'They had the part and checked it was the right one.', 5, 1, 1], ['Buen precio y me la cambiaron sin problema.', 'Good price and they exchanged it, no problem.', 5, 1, 1], ['Bien, pero tuve que esperar un día por la pieza.', 'Fine, but I waited a day for the part.', 4, 1, 0]],
    online: [['Llegó en 2 días y bien empacado.', 'It arrived in 2 days, well packed.', 5, 1, 1], ['Contestan rápido por WhatsApp.', 'They answer fast on WhatsApp.', 5, 1, 1], ['Bien, pero el envío cuesta.', 'Good, but shipping costs extra.', 4, 1, 1]],
    movil: [['Pasa por la cuadra el sábado, como dijo.', 'Comes by the block on Saturday, as promised.', 5, 1, 1], ['Precios buenos y trato de vecino.', 'Good prices and neighborly service.', 5, 1, 1], ['Bien, pero a veces cambia de esquina.', 'Good, but sometimes changes corners.', 4, 1, 1]]
  };
  const NM = ['Yokasta M.', 'Luis R.', 'Daisy T.', 'Freddy D.', 'Anny V.', 'Ramón A.', 'Carmen P.', 'Wilfredo S.'];
  const revOf = b => { const K = b.rv || RK[kind(b)] || RK.fam, nn = Math.min(b.n || 0, K.length), h = b.id.length, st = W.TLRev.stats(b);
    return K.slice(0, nn).map((q, j) => ({ id: b.id + '-tk' + j, name: NM[(h + j) % NM.length], lvl: 3 + ((h + j) % 4), cnt: 5 + ((h * 7 + j * 5) % 40), d: 3 + j * 5 + (h % 3), stars: q[2], src: st.ver && j < 2 ? 'ord' : 'vis',
      caja: q[3], hay: q[4], es: q[0], en: q[1], reply: null, help: 12 - j * 4 + (h % 3), ph: [], rec: [], topics: [] })); };

  function wrap() { const R = W.TLRev, X = W.TLListing, TI = W.TLTienda; if (!R || !R._tienda || !X || !X.hoursPro || !TI || !W.TLTiendaL) return false; if (R._tk) return true; R._tk = 1;
    const f = R.forBiz; R.forBiz = function (b) { if (!isT(b) || (TI.RV && TI.RV[b.id])) return f.apply(this, arguments); return revOf(b); };
    const st = R.stats; R.stats = function (b) { const r = st.apply(this, arguments); if (!isT(b) || !b.pro || !tg(b, 'apartado') || r.ver || !b.n) return r; const v = Math.round(b.n * .5); return Object.assign({}, r, { ver: v, orders: Math.round(v * .9) }); };
    const hp = X.hoursPro; X.hoursPro = function (b) { const r = hp.apply(this, arguments); if (!r || !r.data || !isT(b)) return r; const es = arguments[1], T2 = W.TLDash2;
      if (!(T2 && T2.BIZ && T2.BIZ[b.id])) r.data.hpChanges = [{ dateLong: es ? 'Sin cambios programados' : 'No scheduled changes', name: es ? 'Horario de siempre' : 'Regular hours', tagFg: 'rgba(11,14,18,.35)', text: '' }];
      return r; };
    return true; }
  (function boot(n) { if (!wrap() && n < 600) setTimeout(() => boot(n + 1), 100); })(0); (W.TLReg = W.TLReg || []).push(() => { if (!wrap()) (function again(n) { if (!wrap() && n < 300) setTimeout(() => again(n + 1), 100); })(0); });

  /* ---------- La ficha ya armada ---------- */
  function post(C, s, es, b, v) { if (!isT(b) || !v) return v; const E2 = (x, y) => es ? x : y, pro = !!b.pro, k = kind(b), op = opOf(b), H = b.hrs || [10, 20], rb = v.rb, tc = rb && rb.tc;
    const PG = W.TLPagP ? W.TLPagP.page(b.id, es) : null;
    if (pro && Array.isArray(v.faq) && v.faq.length && !(PG && PG.faq && PG.faq.length)) { const fq = s.faqOpen, cur = v.faq.map(x => [x.q, x.a]); v.faq = faq(b, es, cur).map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })); }
    if (v.rv) { const st = W.TLRev.stats(b); v.rv.verL = pro && st.ver ? st.ver + E2(' VERIFICADAS POR APARTADO', ' VERIFIED BY HOLD') : pro ? E2('RESEÑAS DE VISITANTES · AÚN SIN APARTADOS VERIFICADOS', 'VISITOR REVIEWS · NO VERIFIED HOLDS YET') : E2('RESEÑAS DE VISITANTES · AQUÍ NO SE APARTA POR LA APP', 'VISITOR REVIEWS · NO IN-APP HOLDS HERE'); }
    const sv = k === 'svc';
    if (sv) { v.lbl = Object.assign({}, v.lbl, { items: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services') }); if (rb && rb.lbl) Object.assign(rb.lbl, { menu: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services') }); }
    if (!pro) { const pay = [tg(b, 'efectivo') ? E2('Efectivo', 'Cash') : '', E2('tarjeta', 'card')].filter(Boolean).join(' · ').replace(/^./, x => x.toUpperCase());
      v.fromLabel = sv ? E2('Llama o pasa', 'Call or stop by') : k === 'online' ? E2('Pide por WhatsApp', 'Order on WhatsApp') : k === 'movil' ? E2('Búscalo en su zona', 'Find them nearby') : E2('Ve directo', 'Walk in');
      v.barSub = k === 'movil' && b.zone ? E2('VA HASTA ', 'TRAVELS ') + b.zone + ' MI' : E2('HOY HASTA LAS ', 'TODAY UNTIL ') + fmt(H[1]);
      if (tc) Object.assign(tc, { sub: sv ? howOf(b, es) : k === 'online' ? E2('Solo en línea: pides por WhatsApp y te lo envían.', 'Online only: order on WhatsApp and they ship it.') : k === 'movil' ? E2('Vende en la calle; dice dónde está cada día.', 'Sells on the street; says where each day.') : E2('Ve directo: no hace falta apartar.', 'Just walk in: no need to hold.'),
        cols: [[E2('HOY HASTA', 'TODAY UNTIL'), fmt(H[1])], [E2('PAGO', 'PAYMENT'), pay], tg(b, 'estac') ? [E2('ESTACIONAMIENTO', 'PARKING'), E2('Propio', 'Own lot')] : [E2('DOMINGO', 'SUNDAY'), (b.closed || []).includes(0) ? E2('Cerrado', 'Closed') : b.sun ? fmt(b.sun[0]) + ' – ' + fmt(b.sun[1]) : E2('Abierto', 'Open')]].map(([k2, x]) => ({ k: k2, v: x })) }); }
    if (k === 'online' || (k === 'movil' && !b.addr)) { v.addr = k === 'online' ? E2('Solo en línea · envía a tu casa', 'Online only · ships to you') : E2('Vende en la calle · hasta ', 'Sells on the street · up to ') + (b.zone || 10) + ' mi'; v.addrMeta = k === 'online' ? E2('NO TIENE TIENDA FÍSICA', 'NO STOREFRONT') : E2('NO TIENE LOCAL · DICE DÓNDE ESTÁ CADA DÍA', 'NO SHOP · POSTS WHERE EACH DAY');
      v.lbl = Object.assign({}, v.lbl, { map: E2('Dónde vende', 'Where they sell'), openMaps: E2('Ver la zona', 'See the area') }); if (rb && rb.lbl) rb.lbl.amenK = E2('CÓMO VENDE', 'HOW THEY SELL'); }
    return v; }
  W.TLTiendaK = { kind, faq, post, RK, isSvc };
})();
