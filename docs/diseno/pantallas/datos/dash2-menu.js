/* Panel v2 · Menú — la carta real de Sabor Dominicano (prototype/neg-menu.js) convertida al modelo del panel.
   Plato: grp = grupos de opciones (reutilizables) · stk none|day|qty (left = quedan, par = cuenta del día) ·
   ago + agoU hoy|vie|manual · ch dlv/pick · tags · extra = min de cocina · feat = fijo en Populares · avail cat|siempre|almuerzo|cena|finde. */
(function run() {
  const X = window.TLDash2, T = window.TLMenu; if (!X || !T) { setTimeout(run, 40); return; } if (X.MENU_POOL) return;
  const B = X.BIZ['sabor-dominicano']; if (!B) return;
  const ORD = { bandera: 58, picapollo: 47, chivo: 19, pescado: 22, mofongo: 61, mangu: 33, chicharron: 26, sancocho: 31, tostones: 44, maduros: 29, moro: 17, aguacate: 12, morir: 40, chinola: 21, limonada: 9, flan: 18, tresleches: 24 };
  const STK = { bandera: ['day', 23, 40], pescado: ['day', 3, 12], sancocho: ['day', 30, 30], flan: ['day', 6, 10], tresleches: ['qty', 2, 8] };
  const TAGS = { pescado: ['mar'], mangu: ['lac', 'hue'], tostones: ['veg', 'sg'], maduros: ['veg', 'sg'], moro: ['veg'], aguacate: ['veg', 'sg'], morir: ['lac'], flan: ['lac', 'hue'], tresleches: ['lac', 'hue'], chivo: ['pica'] };
  const NOEN = { chicharron: 1, limonada: 1 }, NOPH = { aguacate: 1 }, PICK = { limonada: 1 };
  B.itemCats = T.CATS.map(c => c.es);
  B.catCfg = {}; T.CATS.forEach(c => { B.catCfg[c.es] = { en: c.en, avail: c.k === 'almuerzo' ? 'almuerzo' : 'siempre', on: 1 }; });
  B.mgroups = {}; Object.keys(T.G).forEach(k => { const g = T.G[k]; B.mgroups[k] = { es: g.es, en: g.en, req: g.req, max: g.max, o: g.o.map(([es, en, p]) => ({ es, en, p, on: !(k === 'carne' && es === 'Chivo guisado') ? 1 : 0 })) }; });
  B.menuCfg = { last: 15, pause: null, busy: 0, low: 3 };
  B.items = [];
  T.CATS.forEach(c => c.items.forEach(i => {
    const st = STK[i.id] || ['none', 0, 10];
    B.items.push({ id: i.id, name: i.es, en: NOEN[i.id] ? '' : i.en, desc: i.ds, descEn: NOEN[i.id] ? '' : i.de, price: i.p, unit: 'u', cat: c.es, ph: NOPH[i.id] ? null : i.ph, phs: NOPH[i.id] ? [] : [i.ph], sell: 1, ago: i.ago || (st[0] !== 'none' && st[1] === 0) ? 1 : 0, agoU: 'hoy', pop: ORD[i.id] || 8, opts: i.opts.length, grp: i.opts.slice(), stk: st[0], left: st[1], par: st[2], ch: PICK[i.id] ? ['pick'] : ['dlv', 'pick'], tags: TAGS[i.id] || [], extra: i.t ? 15 : 0, maxQ: 0, feat: T.POP.includes(i.id), avail: i.finde ? 'finde' : 'cat', tax: 6 });
  }));
  X.MENU_POOL = Object.values(T.ITEMS).map(i => i.ph);
})();
