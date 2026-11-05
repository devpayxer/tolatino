/* To'Latino · evento privado (P7 · 20 oct 2026). Comida · grupos más grandes que el máximo de Reservaciones.
   Solicitud (ocasión, personas, área, fecha, hora, duración, menú, presupuesto por persona, extras, nota) → el negocio responde
   desde su panel con una propuesta (quote) · otra fecha (alt) · no puede (no); sin respuesta en 24 h = exp.
   Nada se cobra hasta aceptar la propuesta; al aceptar se cobra el depósito (TLAdm.cfg('evpDep', 25) %) y el resto se paga en el local.
   Cancelar gratis hasta TLAdm.cfg('evpCx', 72) h antes (se devuelve el depósito); después, se queda con el negocio.
   Estado en C.state.evps (lista del Prototipo). Negocios sin panel en el prototipo responden solos a los 4 s. */
(function () {
  const W = window, NOW = 12.5;
  const cfgN = (k, d) => W.TLAdm && W.TLAdm.cfg ? +W.TLAdm.cfg(k, d) : d;
  const CAP = { 'sabor-dominicano': 40, 'el-fogon': 60, 'mariscos-la-bahia': 30 };
  function cfg(b) { const R = (W.TLRsv && W.TLRsv.CFG && W.TLRsv.CFG[b.id]) || {}; const max = R.max || 8;
    return { max, cap: CAP[b.id] || Math.max(24, max * 4), lead: 3, areas: (R.areas || [['salon', 'Salón', 'Dining room']]).concat([['todo', 'Todo el local', 'The whole place']]), sv: R.sv || [[12, 15, 'Almuerzo', 'Lunch'], [18, 21, 'Cena', 'Dinner']], resp: 2 }; }
  const OCC = [['cumple', 'Cumpleaños', 'Birthday'], ['bautizo', 'Bautizo', 'Baptism'], ['familia', 'Reunión familiar', 'Family gathering'], ['grad', 'Graduación', 'Graduation'], ['despedida', 'Despedida', 'Farewell'], ['trabajo', 'Del trabajo', 'Work event'], ['otra', 'Otra', 'Other']];
  const MENU = [['buffet', 'Buffet criollo', 'Creole buffet', 'Arroz, habichuelas, dos carnes, ensalada y tostones.', 'Rice, beans, two meats, salad and tostones.'], ['fijo', 'Menú de 3 tiempos', '3-course set menu', 'Entrada, plato fuerte y postre servidos en la mesa.', 'Starter, main and dessert served at the table.'], ['prop', 'Que me propongan', 'Let them suggest', 'Te mandan opciones con precio por persona.', 'They send options with a price per person.']];
  const BUD = [['20', 'Hasta $20', 'Up to $20', 18], ['30', '$20–30', '$20–30', 26], ['45', '$30–45', '$30–45', 38], ['46', 'Más de $45', 'Over $45', 52]];
  const EXT = [['biz', 'Traemos el bizcocho', 'We bring the cake', 0, 'Lo sirven y lo cortan', 'They serve and cut it'], ['deco', 'Decoración', 'Decorations', 80, 'Mesa principal y globos', 'Head table and balloons'], ['dj', 'Música o DJ', 'Music or DJ', 180, 'DJ por 3 horas', 'DJ for 3 hours'], ['bebe', 'Silla para bebé', 'High chair', 0, 'Silla para bebé', 'High chair'], ['silla', 'Acceso para silla de ruedas', 'Wheelchair access', 0, 'Mesa con acceso para silla de ruedas', 'Wheelchair-accessible table']];
  const money = n => '$' + (Math.round(n * 100) / 100).toFixed(Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);
  const fT = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh >= 12 ? ' PM' : ' AM'); };
  const dayL = (i, es, long) => { const d = new Date(2026, 8, 24 + i); return d.toLocaleDateString(es ? 'es' : 'en', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''); };
  const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  function quote(ev, b, es) { const E2 = (x, y) => es ? x : y, m = MENU.find(x => x[0] === ev.menu) || MENU[0], bd = BUD.find(x => x[0] === ev.bud) || BUD[1], pp = bd[3] + (ev.menu === 'fijo' ? 4 : 0), rows = [];
    rows.push([(ev.menu === 'prop' ? E2('Buffet criollo', 'Creole buffet') : (es ? m[1] : m[2])) + ' · ' + ev.p + E2(' personas', ' guests'), money(pp) + E2(' c/u', ' each'), pp * ev.p]);
    rows.push(ev.area === 'todo' ? [E2('Todo el local para ustedes', 'The whole place for you'), ev.dur + ' h', 250] : [E2('Área para su grupo', 'Area for your group'), E2('Sin cargo', 'No charge'), 0]);
    EXT.forEach(x => { if (ev.ext && ev.ext[x[0]]) rows.push([es ? x[4] : x[5], x[3] ? '' : E2('Sin cargo', 'No charge'), x[3]]); });
    const sub = rows.reduce((a, r) => a + r[2], 0), tax = Math.round(sub * 0.06 * 100) / 100, tot = Math.round((sub + tax) * 100) / 100, dep = Math.round(tot * cfgN('evpDep', 25) / 100);
    return { rows, sub, tax, tot, dep, rest: Math.round((tot - dep) * 100) / 100, pp, validH: 24, cxH: cfgN('evpCx', 72) }; }
  const upd = (C, id, p) => C.setState(z => ({ evps: (z.evps || []).map(x => x.id === id ? Object.assign({}, x, typeof p === 'function' ? p(x) : p) : x) }));
  function respond(C, id, ans) { const x = (C.state.evps || []).find(y => y.id === id); if (!x || x.st !== 'pend') return; const b = W.TLAll && W.TLAll.B.find(y => y.id === x.biz); if (!b) return;
    const es = (C.state.lang || 'es') === 'es';
    if (ans === 'rechaza') return upd(C, id, { st: 'no', ans: 1, why: ['Ese día el local ya está reservado para otro evento.', 'The place is already booked for another event that day.'], respAt: Date.now() });
    if (ans === 'cambio') { const ni = x.i + (x.i % 7 === 2 ? 7 : 2); return upd(C, id, { st: 'alt', ans: 1, alt: { i: ni, h: x.h }, why: ['Ese día ya tienen otro evento. Te proponen esta fecha.', 'They already have another event that day. They suggest this date.'], q: quote(x, b, es), respAt: Date.now() }); }
    upd(C, id, { st: 'quote', ans: 1, q: quote(x, b, es), respAt: Date.now() }); }
  function sim(C, id) { const x = (C.state.evps || []).find(y => y.id === id); if (!x) return; const panel = !!(W.TLDash2 && W.TLDash2.BIZ && W.TLDash2.BIZ[x.biz]);
    if (panel && C.state.scen !== 'tarjeta') return; C._evT = C._evT || {}; clearTimeout(C._evT[id]); C._evT[id] = setTimeout(() => respond(C, id, 'ok'), 4000); }
  function add(C, ev) { const id = 'EP-' + (4100 + ((C.state.evps || []).length + 1) * 7); const x = Object.assign({ id, st: 'pend', scen: C.state.scen === 'tarjeta' ? 'tarjeta' : 'panel', sentAt: Date.now(), sentL: fT(NOW + 1 / 60) }, ev, { id });
    C.setState(z => ({ evps: (z.evps || []).concat([x]) })); setTimeout(() => sim(C, id), 30); return id; }
  W.TLEvp = { cfg, OCC, MENU, BUD, EXT, quote, respond, sim, add, upd, money, fT, dayL, cap, NOW };
})();
