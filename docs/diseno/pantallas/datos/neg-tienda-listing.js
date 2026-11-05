/* Ficha de Tiendas (APP-NEG-LISTING-PRO/FREE · NEG-TIENDA) — motor. Hoy: jue 24 sep 2026, 12:30 PM. Datos: prototype/neg-tienda.js (TLTienda).
   Tesis: ¿lo tienen y a qué precio de verdad? Línea fija: "El precio que ves es el que pagas en la caja." (ficha, hoja, apartado, estado).
   Pestaña Productos (svc): k ropa (tallas con existencia: [talla, quedan]) · unid · plan (apartado con abono: se paga en plazos) · serv (servicio en tienda).
   Hoja: talla (agotada = no se aparta) + cantidad → apartado de la tienda s.tcart = { biz, lines: [{ key, q, t }] }. Apartar no cobra nada (plan: abono).
   Reseñas: precio de la caja = el publicado · lo tenían como decía · la talla o medida correcta · guardaron el apartado · cambios y devoluciones · trato. */
(function boot() {
  const X = window.TLListing, SD = window.TLStaff, TI = window.TLTienda, ALL = window.TLAll; if (!X || !SD || !TI || !ALL) return setTimeout(boot, 40);
  const fmt = X.fmt, money = n => '$' + (Math.round(n * 100) % 100 ? (Math.round(n * 100) / 100).toFixed(2) : Math.round(n).toLocaleString('en-US'));
  const U = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const stop = e => { if (e && e.stopPropagation) e.stopPropagation(); }, LINE = TI.line, SVC = TI.SVC, STAFF = TI.STAFF || {}, ABOUT = TI.ABOUT || {}, RV = TI.RV || {}, STATS = TI.STATS || {};
  const PEOPLE0 = {}; Object.keys(STAFF).forEach(id => { PEOPLE0[id] = STAFF[id].map(p => ({ ph: p[4], langs: p[5], sp: p[6], bio: p[7], wk: p[8], cert: null, rate: '', dishes: [] })); });
  const CAT0 = { title: ['Quién te atiende', 'Who helps you'], rate: 0, next: 0, cert: 0, cta: 'menu' };
  const mk = (b, r, k) => ({ id: b.id + '-t' + k, name: r.n, lvl: r.lvl, cnt: r.cnt, d: r.d, stars: r.st, src: r.src, caja: r.caja, hay: r.hay, talla: r.talla, apa: r.apa, dev: r.dev, es: r.es, en: r.en, reply: r.rep || null, help: r.help || 0, ph: [], rec: [], topics: [] });
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k)); const i = b.id.length;
    return [{ n: ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.'][i % 4], lvl: 3, cnt: 8, d: 6, st: 4, src: 'vis', caja: 1, hay: 1, es: 'Lo que decía la página y al mismo precio.', en: 'What the page said, at the same price.', help: 3 }].map((r, k) => mk(b, r, k)); }
  const stats = b => STATS[b.id] || { ver: 0, orders: 0, caja: 97, hay: 93, talla: 94, apa: 96, dev: 90, trato: 94 };
  function asp(b, st, es) { const E2 = (x, y) => es ? x : y;
    return [['dollar', E2('PRECIO DE LA CAJA = EL PUBLICADO', 'REGISTER = POSTED PRICE'), st.caja, 'rgba(255,176,32,.16)', '#8A5A00'], ['check', E2('LO TENÍAN COMO DECÍA', 'IN STOCK AS SHOWN'), st.hay, 'rgba(0,229,196,.16)', '#00695B'],
      ['bag', E2('LA TALLA O MEDIDA CORRECTA', 'RIGHT SIZE'), st.talla, 'rgba(75,55,245,.1)', '#4B37F5'], ['clock', E2('GUARDARON EL APARTADO', 'HELD YOUR ITEMS'), st.apa, 'rgba(0,229,196,.16)', '#00695B'],
      ['arrowLeft', E2('CAMBIOS Y DEVOLUCIONES', 'EXCHANGES & RETURNS'), st.dev, 'rgba(11,14,18,.06)', '#0B0E12'], ['heart', E2('TRATO', 'HOW THEY TREATED YOU'), st.trato, 'rgba(0,229,196,.16)', '#00695B']].map(([ic, k, v, bg, fg]) => ({ ic: ic === 'arrowLeft' ? 'check' : ic, k, v: v + '%', bg, fg })); }
  const aspNote = (b, st, es) => es ? 'De ' + st.orders + " apartados y compras calificadas en To'Latino en los últimos 90 días." : 'From ' + st.orders + " rated To'Latino holds and purchases in the last 90 days.";
  function facts(r, es) { const E2 = (x, y) => es ? x : y, G = '#00695B', R = '#C0392B', A = '#8A5A00', f = [];
    if (r.caja === 1) f.push(['dollar', E2('Precio de la caja = el publicado', 'Register matched the price'), G]); else if (r.caja === 0) f.push(['dollar', E2('Cobraron más en la caja', 'Charged more at the register'), R]);
    if (r.hay === 0) f.push(['warning', E2('No lo tenían como decía', 'Not in stock as shown'), A]);
    if (r.apa === 1) f.push(['clock', E2('Guardaron el apartado', 'Held the items'), G]); else if (r.apa === 0) f.push(['clock', E2('No guardaron el apartado', 'Did not hold the items'), R]);
    if (r.dev === 0) f.push(['warning', E2('No aceptaron el cambio', 'Refused the exchange'), A]);
    return f; }
  function reg() { const X2 = window.TLListing, S2 = window.TLStaff, R2 = window.TLRev, A2 = window.TLAll; if (!X2 || !S2 || !A2) return;
    TI.B.forEach(b => { b.tienda = 1; if (!A2.B.some(x => x.id === b.id)) A2.B.push(b); });
    if (!X2.ABOUT[TI.B[0].id]) { Object.keys(SVC).forEach(id => { X2.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, 0, 0])]); }); Object.assign(X2.ABOUT, ABOUT); TI.B.forEach(b => { if (b.addr) X2.ADDR[b.id] = b.addr + ', Hazleton PA'; }); Object.keys(STAFF).forEach(id => { X2.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]); }); }
    if (!S2.PEOPLE[Object.keys(STAFF)[0]]) { Object.keys(STAFF).forEach(id => { S2.PEOPLE[id] = PEOPLE0[id]; }); } S2.CAT.tienda = CAT0;
    if (R2 && !R2._tienda) { const f = R2.forBiz, st = R2.stats, tp = R2.top, tc = R2.topics; R2._tienda = 1; R2.forBiz = (b, i) => b.tienda ? rev(b) : f(b, i); R2.stats = b => b.tienda ? stats(b) : st(b); R2.top = b => b.tienda ? [] : tp(b); R2.topics = b => b.tienda ? [] : tc(b); } }
  reg(); (window.TLReg = window.TLReg || []).push(reg);

  const svcs = id => SVC[id] || [], flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  const itOf = (own, key) => { const [si, ii] = String(key).split(':').map(Number), g = svcs(own)[si]; return g && g[2][ii]; };
  const canHold = b => b.pro && b.tags.includes('apartado');
  const optOf = id => (TI.OPTS || {})[id] || { envio: null, dev: 0, plan: null };
  function priceFor(it, b, es) { const E2 = (a, c) => es ? a : c;
    if (it.k === 'plan') { const o = optOf(b.id).plan || [20, 3]; return { l: money(it.p), s: E2('ABONO ' + o[0] + ' % · ' + o[1] + ' PAGOS', o[0] + '% DOWN · ' + o[1] + ' PAYMENTS') }; }
    if (it.k === 'serv') return { l: (it.desde ? E2('Desde ', 'From ') : '') + money(it.p), s: E2('EN LA TIENDA', 'IN STORE') };
    const left = (it.tallas || []).reduce((a, t) => a + t[1], 0);
    return { l: money(it.p), s: it.tallas ? (left ? E2('QUEDAN ', '') + left + E2('', ' LEFT') : E2('AGOTADO', 'SOLD OUT')) : '' }; }
  const cartOf = (s, bid) => s.tcart && s.tcart.biz === bid ? s.tcart : null;
  const cartTot = (b, cart) => { let tot = 0, plan = 0; (cart ? cart.lines : []).forEach(l => { const it = itOf(b.id, l.key); if (!it) return; tot += it.p * l.q; if (it.k === 'plan') plan += it.p * l.q; }); return { tot, plan, n: cart ? cart.lines.length : 0 }; };
  function addLine(C, s, b, key, q, t) { const cur = cartOf(s, b.id), lines = (cur ? cur.lines : []).filter(l => !(l.key === key && l.t === t)).concat({ key, q, t }); C.setState({ tcart: { biz: b.id, lines }, ash: null }); }

  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), line = LINE[es ? 0 : 1], hold = canHold(b), cart = cartOf(s, b.id), CT = cartTot(b, cart), op = optOf(b.id);
    const openSheet = key => e => { stop(e); C.setState({ ash: { biz: b.id, own: b.id, key, opt: { q: 0, t: null }, add: [], stf: 'any', tienda: 1 }, bshTop: dk ? C.vTop() : 0 }); };
    const dirs = e => { stop(e); C.encargo('APP-MAPA', 'APP-NEG-LISTING · Tiendas · Cómo llegar', b.name, E2('Cómo llegar', 'Directions')); };
    const secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => { const key = si + ':' + ii, P = priceFor(it, b, es), inC = cart ? cart.lines.filter(l => l.key === key).reduce((a, l) => a + l.q, 0) : 0, srv = it.k === 'serv';
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: U(it.ph || b.ph[0], 200), meta: [P.s, it.was ? E2('ANTES ', 'WAS ') + money(it.was) : '', inC ? E2('APARTADO: ', 'HELD: ') + inC : ''].filter(Boolean).join(' · '), price: P.l, sym: [], hasPre: false, preL: '', onPre: () => {},
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(key) : () => {}, onBook: hold && !srv ? openSheet(key) : dirs, btnL: hold && !srv ? E2('Apartar', 'Hold') : E2('Cómo llegar', 'Directions') }; }) }));
    const notes = [['dollar', line + ' ' + E2('Lo que dice "oferta" tiene el precio de antes al lado.', 'Anything marked on sale shows the previous price next to it.')]];
    if (hold) notes.push(['clock', E2('Apartar no cobra nada: te lo guardan 48 horas y pagas en la caja lo mismo que ves aquí.', 'Holding costs nothing: they keep it 48 hours and you pay at the register what you see here.')]);
    if (op.plan) notes.push(['card', E2('Muebles y electrodomésticos en plan: abono del ' + op.plan[0] + ' % y ' + op.plan[1] + ' pagos sin intereses. Si no terminas de pagar, te devuelven lo abonado menos ' + (op.planFee || 10) + ' %.', 'Furniture and appliances on layaway: ' + op.plan[0] + '% down and ' + op.plan[1] + ' interest-free payments. If you do not finish paying, you get back what you paid minus ' + (op.planFee || 10) + '%.')]);
    if (op.dev) notes.push(['check', E2('Cambios y devoluciones: ' + op.dev + ' días con el recibo.', 'Exchanges and returns: ' + op.dev + ' days with receipt.')]);
    const act = !(cart && CT.n) && window.TLTiendaFlow ? window.TLTiendaFlow.mineCard(C, s, es, b) : null;
    const mine = act ? act : cart && CT.n ? { k: E2('TU APARTADO', 'YOUR HOLD'), tag: CT.n + (CT.n === 1 ? E2(' ARTÍCULO', ' ITEM') : E2(' ARTÍCULOS', ' ITEMS')), tone: 'action', t: money(CT.tot) + E2(' en la caja', ' at the register'), s: CT.plan ? E2('Con plan de pagos', 'With a payment plan') : E2('Hoy no se cobra nada', 'Nothing is charged today'), onClick: () => window.TLTiendaFlow ? window.TLTiendaFlow.start(C, b.id) : C.encargo('APP-NEG-TIENDA-APARTADO', 'APP-NEG-LISTING · Tiendas · Tu apartado', b.name, E2('Apartado', 'Hold')) } : null;
    V.sv = { isChair: false, modes: [], bySvc: true, byPro: false, secs, pros: [], notes: pro ? notes.slice(0, 4).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: !!mine, mine: mine || {}, lbl: { page: '', book: E2('Apartar', 'Hold') } };
    V.sh = s.ash && s.ash.biz === b.id && s.ash.tienda ? sheetVals(C, s, es, b) : EMPTY_SH;
    V.ax = { veh: { has: pro, ic: 'dollar', k: E2('¿ES EL PRECIO DE LA CAJA?', 'IS IT THE REGISTER PRICE?'), t: E2('Sí: el precio de aquí es el de la caja', 'Yes: the price here is the register price'), hasS: false, s: '', hasP: true, p: E2('Existencia al día: si dice "quedan 2", hay 2.', 'Stock is current: if it says 2 left, there are 2.'), hasOk: true, okT: E2('Lo confirman las reseñas', 'Confirmed by reviews'), okFg: '#00695B', okIc: 'check', cta: '', onClick: () => {} },
      sz: { has: false, chips: [] }, q: { has: false }, line: { has: pro, t: line, s: E2('Aquí ves el precio, las tallas que quedan y cómo se aparta.', 'Here you see the price, sizes left and how to hold.') }, how: { has: false, t: '', steps: [] } };
    V.shop = { items: [], hold: '', hasChips: false, chips: [], empty: true, note: '' }; V.hx = { gal: { has: false, items: [] } };
    const TD = [[E2('APARTADO', 'HOLD'), hold ? E2('48 h · gratis', '48 h · free') : E2('No', 'No')], [E2('PLAN', 'LAYAWAY'), op.plan ? op.plan[0] + ' % + ' + op.plan[1] : E2('No', 'No')], [E2('CAMBIOS', 'RETURNS'), op.dev ? op.dev + E2(' días', ' days') : E2('Pregunta', 'Ask')]];
    const AM = { apartado: ['clock', 'Aparta 48 h', '48 h hold'], layaway: ['card', 'Plan de pagos', 'Layaway'], envio: ['truck', 'Envío', 'Delivery'], efectivo: ['dollar', 'Efectivo', 'Cash'], estac: ['parking', 'Estacionamiento', 'Parking'], domingo: ['calendar', 'Abre domingos', 'Open Sundays'], esp: ['language', 'Atienden en español', 'Serves in Spanish'], tallas: ['users', 'Tallas grandes', 'Plus sizes'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const facts = [{ icon: 'dollar', k: E2('PRECIOS', 'PRICES'), v: E2('Los de la caja', 'Register prices') }, { icon: 'check', k: E2('CAMBIOS', 'RETURNS'), v: op.dev ? op.dev + E2(' días con recibo', ' days with receipt') : E2('Pregunta en la tienda', 'Ask in store') }, { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: tg('esp') ? 'Español · English' : 'English' }].map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [[E2('¿El precio de aquí es el de la caja?', 'Is this the register price?'), E2('Sí. Si en la caja te cobran más, pide ayuda en To\'Latino y la tienda te devuelve la diferencia.', 'Yes. If the register charges more, ask for help in To\'Latino and the store refunds the difference.')], [E2('¿Cómo funciona el apartado?', 'How does holding work?'), E2('No cobra nada. Te lo guardan 48 horas; si no pasas, vuelve al estante.', 'It costs nothing. They keep it 48 hours; if you do not come, it goes back on the shelf.')], [E2('¿Aceptan cambios?', 'Do they take returns?'), op.dev ? E2(op.dev + ' días con el recibo, sin usar.', op.dev + ' days with receipt, unused.') : E2('Pregunta en la tienda.', 'Ask in store.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, { cta: hold ? (mine ? E2('Ver apartado', 'View hold') : E2('Apartar', 'Hold')) : pro ? E2('Cómo llegar', 'Directions') : t.call, ctaIcon: hold ? 'bag' : pro ? 'pin' : 'phone', onCta: hold ? (mine ? mine.onClick : toSvc) : pro ? dirs : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: false, isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta ? it.meta.charAt(0) + it.meta.slice(1).toLowerCase() : '', price: it.price })),
      amen, facts, faq: pro ? FQ.map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      fromLabel: mine && !act ? money(CT.tot) : V.fromLabel, barSub: (TD[0][0] + ' · ' + TD[0][1]).toUpperCase(), svc: [], hasSvc: false, railNote: line,
      lbl: { ...V.lbl, items: E2('Productos', 'Products'), menuAll: E2('Ver productos', 'See products') } });
    V.bkRail = { has: pro, rows: TD.map(([k, x]) => ({ k, v: x })), note: line, hasMine: !!mine, mine: mine || {} }; V.silla = { has: false };
  }
  function sheetVals(C, s, es, b) { const E2 = (x, y) => es ? x : y, q = s.ash, dk = s.view === 'desktop', it = itOf(b.id, q.key); if (!it) return EMPTY_SH;
    const up = o => C.setState(z => ({ ash: { ...z.ash, opt: { ...z.ash.opt, ...o } } })), P = priceFor(it, b, es), hold = canHold(b) && it.k !== 'serv', QS = [1, 2, 3], qi = q.opt.q || 0, T = it.tallas || null, ti = q.opt.t;
    const tOut = T && ti != null && !T[ti][1], needT = T && ti == null;
    const groups = (T ? [{ title: it.tallaK ? it.tallaK[es ? 0 : 1] : E2('Talla', 'Size'), meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: ti != null, opts: T.map(([tl, n], i) => ({ label: tl, price: n ? (n <= 2 ? E2('quedan ', '') + n + E2('', ' left') : '') : E2('agotada', 'sold out'), selected: ti === i })), onToggle: i => up({ t: i }) }] : [])
      .concat(it.k !== 'serv' && it.k !== 'plan' ? [{ title: E2('¿Cuántos?', 'How many?'), meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: true, opts: QS.map((n, i) => ({ label: String(n), price: money(it.p * n), selected: qi === i })), onToggle: i => up({ q: i }) }] : []);
    const op = optOf(b.id), qv = it.k === 'plan' ? 1 : QS[qi];
    const go = () => { if (!hold) { C.setState({ ash: null }); return C.encargo('APP-MAPA', 'APP-NEG-LISTING · Tiendas · hoja', b.name, E2('Cómo llegar', 'Directions')); } if (needT || tOut) return; addLine(C, s, b, q.key, qv, T ? T[ti][0] : ''); };
    const payT = it.k === 'plan' && op.plan ? E2('Plan: hoy pagas el abono de ' + money(it.p * op.plan[0] / 100) + ' y el resto en ' + op.plan[1] + ' pagos. Te lo entregan al terminar de pagar.', 'Layaway: today you pay ' + money(it.p * op.plan[0] / 100) + ' down and the rest in ' + op.plan[1] + ' payments. Delivered when paid off.') : it.k === 'serv' ? E2('Precio en la tienda. Te dicen el total antes de empezar.', 'In-store price. They tell you the total before starting.') : E2('Apartar no cobra nada. Te lo guardan 48 horas y pagas ' + money(it.p * qv) + ' en la caja.', 'Holding costs nothing. They keep it 48 hours and you pay ' + money(it.p * qv) + ' at the register.');
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop, name: es ? it.n : it.ne, desc: es ? it.d : it.de, bg: U(it.ph || b.ph[0], 700), price: P.l, meta: [P.s, it.was ? E2('ANTES ', 'WAS ') + money(it.was) : ''].filter(Boolean).join(' · '),
      groups, adds: [], hasAdds: false, hasWho: false, isPick: false, isStaff: false, pros: [], people: [], stf: 'any', onStf: () => {},
      whoPend: false, whoDone: false, whoMeta: '', hasDep: true, depT: payT + ' ' + LINE[es ? 0 : 1], total: money(it.p * qv),
      durL: E2('EN LA CAJA', 'AT THE REGISTER'), cta: !hold ? E2('Cómo llegar', 'Directions') : tOut ? E2('Agotada en esa talla', 'Sold out in that size') : needT ? E2('Elige la talla', 'Choose a size') : E2('Apartar', 'Hold'), dis: hold && (needT || tOut), onGo: go,
      lbl: { req: E2('Elige: ', 'Choose: '), ready: E2('Listo', 'Done'), adds: '', addsM: '', who: '', any: '', incK: '', noK: E2('IMPORTANTE', 'IMPORTANT') },
      x: { hasPre: false, preT: '', preS: '', preCta: '', onPre: () => {}, hasVeh: false, veh: {}, hasInc: false, inc: [], hasNo: !!it.no, no: it.no ? [{ t: it.no[es ? 0 : 1] }] : [] } }; }
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), op = optOf(b.id);
    Object.assign(td, { s: (canHold(b) ? E2('Aparta aquí y pagas en la caja. ', 'Hold here and pay at the register. ') : '') + LINE[es ? 0 : 1], cols: [[E2('HASTA', 'UNTIL'), fmt((b.hrs || [10, 19])[1])], [E2('APARTADO', 'HOLD'), canHold(b) ? '48 h' : E2('No', 'No')], [E2('CAMBIOS', 'RETURNS'), op.dev ? op.dev + E2(' días', ' days') : '—']].map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false });
    if (!b.pro) return; const mk2 = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const T = [trust[0], mk2('dollar', E2('Precio de la caja', 'Register price'), 'ok'), canHold(b) ? mk2('clock', E2('Aparta 48 h', '48 h hold'), 'info') : null, trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }
  window.TLTiendaL = { rev, stats, asp, aspNote, facts, listingAdd, sheetVals, resAdd, priceFor, svcs, flatOf, itOf, canHold, cartOf, cartTot, optOf, PEOPLE0 };
})();
