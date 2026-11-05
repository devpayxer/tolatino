/* Módulo Menú (F-COMIDA) — carta completa de ejemplo: Sabor Dominicano, Hazleton. Hoy: jue 24 sep 2026, 12:30 PM.
   Grupos de opciones: req = obligatorio (elige 1), max = tope de selección. Precio en dólares. */
(function () {
  const P = (id, h) => /^(data:|https?:)/.test(String(id)) ? String(id) : 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const G = {
    carne: { es: 'Elige la carne', en: 'Choose the meat', req: 1, max: 1, o: [['Pollo guisado', 'Stewed chicken', 0], ['Res guisada', 'Stewed beef', 2], ['Cerdo guisado', 'Stewed pork', 1.5], ['Chivo guisado', 'Goat stew', 4]] },
    arroz: { es: 'Arroz', en: 'Rice', req: 1, max: 1, o: [['Blanco con habichuelas', 'White rice and beans', 0], ['Moro de guandules', 'Rice with pigeon peas', 1]] },
    lado: { es: 'Acompañante', en: 'Side', req: 1, max: 1, o: [['Tostones', 'Tostones', 0], ['Maduros', 'Sweet plantains', 0], ['Ensalada verde', 'Green salad', 0], ['Yuca hervida', 'Boiled yuca', 0]] },
    prep: { es: 'Preparación', en: 'Style', req: 1, max: 1, o: [['Frito', 'Fried', 0], ['En salsa criolla', 'In creole sauce', 2], ['Al ajillo', 'Garlic sauce', 2]] },
    relleno: { es: 'Relleno', en: 'Filling', req: 1, max: 1, o: [['Chicharrón', 'Pork rinds', 0], ['Pollo guisado', 'Stewed chicken', 0], ['Camarones al ajillo', 'Garlic shrimp', 6]] },
    caldo: { es: 'Caldo', en: 'Broth', req: 1, max: 1, o: [['Caldo de pollo aparte', 'Chicken broth on the side', 0], ['Sin caldo', 'No broth', 0]] },
    quita: { es: 'Quítale', en: 'Leave out', req: 0, max: 3, o: [['Sin salami', 'No salami', 0], ['Sin queso frito', 'No fried cheese', 0], ['Sin huevo', 'No egg', 0]] },
    extra: { es: 'Agrégale', en: 'Add', req: 0, max: 3, o: [['Aguacate', 'Avocado', 2.5], ['Tostones extra', 'Extra tostones', 3], ['Maduros extra', 'Extra sweet plantains', 3], ['Queso frito', 'Fried cheese', 2.5], ['Huevo frito', 'Fried egg', 1.5]] },
    salsa: { es: 'Salsas', en: 'Sauces', req: 0, max: 2, o: [['Salsa de ajo', 'Garlic sauce', 0], ['Pique de la casa', 'House hot sauce', 0]] },
    tam: { es: 'Tamaño', en: 'Size', req: 1, max: 1, o: [['Vaso grande', 'Large glass', 0], ['Jarra, 4 vasos', 'Pitcher, 4 glasses', 9]] },
    azucar: { es: 'Azúcar', en: 'Sugar', req: 1, max: 1, o: [['Normal', 'Regular', 0], ['Poca azúcar', 'Less sugar', 0], ['Sin azúcar', 'No sugar', 0]] },
  };
  /* ítem: [id, es, en, desc es, desc en, precio, foto, opciones, marcas]  marcas: pop · of (oferta, was = precio normal) · finde (solo sáb y dom) · t (min de cocina) */
  const CATS = [
    { k: 'almuerzo', es: 'Almuerzo', en: 'Lunch', until: 16, note: ['HASTA LAS 4 PM', 'UNTIL 4 PM'], items: [
      ['bandera', 'La bandera', 'La bandera', 'Arroz, habichuelas, carne guisada y ensalada.', 'Rice, beans, stewed meat and salad.', 12, 27556972, ['carne', 'arroz', 'extra'], { pop: 1 }],
      ['picapollo', 'Pica pollo', 'Fried chicken', 'Cuarto de pollo frito con tostones.', 'Quarter fried chicken with tostones.', 12, 14686443, ['salsa', 'extra'], { pop: 1 }],
      ['chivo', 'Chivo guisado', 'Goat stew', 'Con arroz blanco y tostones.', 'With white rice and tostones.', 16, 27556981, ['arroz', 'extra'], { ago: 1 }],
      ['pescado', 'Pescado frito', 'Fried fish', 'Chillo entero con tostones y ensalada.', 'Whole red snapper with tostones and salad.', 18, 36857725, ['prep', 'lado'], { t: 25 }],
    ] },
    { k: 'casa', es: 'De la casa', en: 'House specials', items: [
      ['mofongo', 'Mofongo de chicharrón', 'Mofongo with pork rinds', 'Plátano majado con ajo y chicharrón.', 'Mashed plantain with garlic and pork rinds.', 12, 37121074, ['relleno', 'caldo', 'extra'], { pop: 1, of: 1, was: 14 }],
      ['mangu', 'Mangú con los tres golpes', 'Mangú with los tres golpes', 'Salami, queso frito y huevo.', 'Salami, fried cheese and egg.', 11, 14810483, ['quita', 'extra']],
      ['chicharron', 'Chicharrón de cerdo', 'Fried pork belly', 'Una libra, con tostones y limón.', 'One pound, with tostones and lime.', 14, 8954034, []],
      ['sancocho', 'Sancocho', 'Sancocho', 'De siete carnes, con arroz blanco y aguacate.', 'Seven-meat stew with white rice and avocado.', 14, 27397342, [], { finde: 1 }],
    ] },
    { k: 'lados', es: 'Acompañantes', en: 'Sides', items: [
      ['tostones', 'Tostones', 'Tostones', 'Ocho piezas, con sal y ajo.', 'Eight pieces, salt and garlic.', 5, 27556971, []],
      ['maduros', 'Maduros', 'Sweet plantains', 'Plátano maduro frito.', 'Fried ripe plantain.', 5, 12362298, []],
      ['moro', 'Moro de guandules', 'Rice with pigeon peas', 'Porción grande.', 'Large portion.', 4, 8992843, []],
      ['aguacate', 'Aguacate', 'Avocado', 'Medio aguacate con sal.', 'Half an avocado with salt.', 3, 10839334, []],
    ] },
    { k: 'bebidas', es: 'Bebidas', en: 'Drinks', items: [
      ['morir', 'Morir soñando', 'Morir soñando', 'Jugo de naranja con leche, bien frío.', 'Orange juice with milk, ice cold.', 5, 20300401, ['tam', 'azucar'], { pop: 1 }],
      ['chinola', 'Jugo de chinola', 'Passion fruit juice', 'Natural, hecho al momento.', 'Fresh, made to order.', 4, 33709196, ['tam', 'azucar']],
      ['limonada', 'Limonada', 'Lemonade', 'Con limón fresco.', 'Made with fresh lemons.', 3.5, 3651045, ['azucar']],
    ] },
    { k: 'postres', es: 'Postres', en: 'Desserts', items: [
      ['flan', 'Flan de leche', 'Milk flan', 'Porción, con caramelo.', 'Slice, with caramel.', 4.5, 9501562, []],
      ['tresleches', 'Tres leches', 'Tres leches', 'Porción, con canela.', 'Slice, with cinnamon.', 5, 32590852, []],
    ] },
  ];
  const ITEMS = {};
  CATS.forEach(c => c.items = c.items.map(([id, es, en, ds, de, p, ph, opts, f]) => (ITEMS[id] = Object.assign({ id, es, en, ds, de, p, ph, opts, cat: c.k, until: c.until }, f || {}))));
  const BIZ = { name: 'Sabor Dominicano', ini: 'SD', ph: [39122376, 38330332, 39143744], pickup: 25, delivery: [35, 45], fee: 3, freeOver: 30, tax: 0.06, now: 12.5, closes: 21 };
  const POP = ['bandera', 'mofongo', 'picapollo', 'morir'];
  const XSELL = ['morir', 'chinola', 'tostones', 'flan'];
  /* pedido de ejemplo: [id, {grupo: [índices]}, cantidad] */
  const START = [['bandera', { carne: [1], arroz: [1], extra: [0] }, 1], ['morir', { tam: [0], azucar: [0] }, 2], ['tostones', {}, 1]];
  /* Horario propio (Panel v2 · Menú · Categorías y platos): avail 'own' + av { f, t (min desde 0:00), d [0–6, 0 = dom] }; los viejos almuerzo · cena · finde se convierten. Hoy en el prototipo: jue 12:30 PM. */
  const DOW = 4, DN = [['DOM', 'SUN'], ['LUN', 'MON'], ['MAR', 'TUE'], ['MIÉ', 'WED'], ['JUE', 'THU'], ['VIE', 'FRI'], ['SÁB', 'SAT']], ALL = [0, 1, 2, 3, 4, 5, 6];
  const LGV = { almuerzo: { f: 0, t: 960, d: ALL }, cena: { f: 960, t: 1440, d: ALL }, finde: { f: 0, t: 1440, d: [0, 6] } };
  const avN = (avail, av) => avail === 'own' && av && av.d ? av : LGV[avail] || null;
  const tl = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
  const dl = (d, es) => { const S = d.slice().sort().join(); return S === '0,1,2,3,4,5,6' ? '' : S === '1,2,3,4,5' ? (es ? 'LUN–VIE' : 'MON–FRI') : S === '0,6' ? (es ? 'SÁB Y DOM' : 'SAT AND SUN') : [1, 2, 3, 4, 5, 6, 0].filter(z => d.includes(z)).map(z => DN[z][es ? 0 : 1]).join(' · '); };
  const both = fn => [fn(true), fn(false)];
  /* hrs(avail del plato o null = como su categoría, av del plato, cfg de la categoría, ahora en min) → null (todo el horario) | { off, l: [es, en] | null } */
  function hrs(avail, av, cc, now) { const a = avail && avail !== 'cat' ? avN(avail, av) : cc ? avN(cc.avail, cc.av) : null; if (!a) return null;
    const inDay = a.d.includes(DOW), off = !inDay || now < a.f || now >= a.t;
    const l = !inDay ? both(es => dl(a.d, es)) : now < a.f ? both(es => (es ? 'DESDE ' : 'FROM ') + tl(a.f)) : a.t < 1440 ? both(es => (es ? 'HASTA ' : 'UNTIL ') + tl(a.t)) : null;
    return { off, l: l && l[0] ? l : null }; }
  /* Para el Super Admin: el horario del plato como lo dejó el negocio en su panel (o el de su categoría). */
  function hrsLive(id) { let ov = null; try { ov = (JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})['sabor-dominicano']; } catch (e) {} const it0 = ITEMS[id] || {};
    const i = ov && ov.items ? ov.items.find(x => x.id === id) : null, cc = ov && ov.catCfg && i ? ov.catCfg[i.cat] : null, own = i && i.avail && i.avail !== 'cat';
    const a = i && (own || (cc && cc.avail)) ? (own ? avN(i.avail, i.av) : avN(cc.avail, cc.av)) : it0.finde ? LGV.finde : it0.until ? { f: 0, t: it0.until * 60, d: ALL } : null; if (!a) return null;
    const tm = es => a.f <= 0 && a.t < 1440 ? (es ? 'hasta ' : 'until ') + tl(a.t) : a.f > 0 && a.t >= 1440 ? (es ? 'desde ' : 'from ') + tl(a.f) : a.f > 0 ? tl(a.f) + '–' + tl(a.t) : '';
    return both(es => [dl(a.d, es).toLowerCase(), tm(es)].filter(Boolean).join(' · ')); }
  window.TLMenu = { P, G, CATS, ITEMS, BIZ, POP, XSELL, START, hrs, hrsLive };
})();
