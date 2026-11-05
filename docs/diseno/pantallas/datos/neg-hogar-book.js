/* Servicios del Hogar (NEG-HOGAR) — motor de la ficha: pestaña Servicios, hoja del servicio, Tienda (con renta de herramienta), Mi casa, Hoy, trabajos hechos y columna desktop.
   Tesis: ¿cuándo llega y cuánto cuesta de verdad? Línea fija: "Precio completo antes de empezar. Si algo cambia, te pregunta primero."
   Modelos: shop (cuadrilla) · solo · red (técnicos independientes; cada uno es su propio negocio, m: 'tec') · gc (contratista con subcontratistas).
   Mi casa: guardada en la cuenta (ACC al entrar) o solo en esta visita (s.casas); s.casaSel = la elegida. La zona sale de la distancia a tu casa.
   Estado: ash = hoja del servicio · hcs = hoja Mi casa · svMode = por servicio / por técnico (red).
   Booking, emergencia, presupuestos y planes: etapa 3 (encargo). Hoy = jue 24 sep 2026, 12:30 PM. */
(function boot() {
  const HO = window.TLHogar, HL = window.TLHogarL, X = window.TLListing, SD = window.TLStaff, ALL = window.TLAll;
  if (!HO || !HL || !X || !SD || !ALL) return setTimeout(boot, 40);
  const NOW = 12.5, TODAY = 4, fmt = X.fmt;
  const PX = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 500);
  const U = (id, h) => 'url(' + PX(id, h) + ')';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const day = i => new Date(2026, 8, 24 + i);
  const money = n => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2));
  const dur = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  const DS = [['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']];
  const dayS = (i, es) => i === 0 ? (es ? 'Hoy' : 'Today') : i === 1 ? (es ? 'Mañana' : 'Tomorrow') : DS[es ? 0 : 1][day(i).getDay()] + ' ' + day(i).getDate();
  const hh = h => ((Math.floor(h) + 11) % 12 + 1) + (h % 1 ? ':30' : ''), ap = h => (h % 24) < 12 ? 'AM' : 'PM';
  const rng = (a, b) => ap(a) === ap(b) ? hh(a) + '–' + hh(b) + ' ' + ap(b) : hh(a) + ' ' + ap(a) + '–' + hh(b) + ' ' + ap(b);
  const winL = (w, es) => w ? dayS(w.i, es) + ' · ' + rng(w.h, w.h + 2) : '';
  const biz = id => ALL.B.find(b => b.id === id);
  const stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const names = (a, es) => a.length > 1 ? a.slice(0, -1).join(', ') + (es ? ' y ' : ' and ') + a[a.length - 1] : a[0] || '';

  /* ---------- Configuración por negocio ---------- */
  const CFG = {
    'hermanos-diaz-multiservicios': { apr: 20, pick: [0, 1, 2], warr: 12 }, 'plomeria-rodriguez': { apr: 15, pick: [0, 1], warr: 12, eta24: 60 }, 'julio-almonte-electricista': { apr: 30, warr: 24, eta24: 75 },
    'calefaccion-aire-cibao': { apr: 20, pick: [0, 1], warr: 12, eta24: 90 }, 'arreglos-ya-hazleton': { apr: 20 }, 'constructora-peralta': { apr: 60, warr: 24 }, 'destapes-express': { apr: 10, warr: 3, eta24: 45 },
    'nelson-electrodomesticos': { apr: 30, warr: 3 }, 'mantenimiento-la-montana': { apr: 45, pick: [0, 1], warr: 6 }, 'santana-calentadores': { apr: 20, warr: 12, eta24: 60 }, 'electro-hogar-pa': { apr: 30, pick: [0, 1], warr: 12 } };
  const PROS = HL.PROS, PROI = {}; PROS.forEach(p => { PROI[p.id] = p; CFG[p.id] = { apr: p.apr || 30, auto: p.auto, warr: p.warr }; });
  /* Depósito (opción de cada negocio): se cobra al enviar y se descuenta del total. k = solo esos tipos · big = [desde $, monto] · cx = horas para cancelar y que se devuelva. */
  const DEP = { 'plomeria-rodriguez': { amt: 40, k: ['fijo'], big: [1000, 150], cx: 24 }, 'calefaccion-aire-cibao': { amt: 50, k: ['fijo', 'area'], cx: 24 }, 'tec-richard-batista': { amt: 20, cx: 12 }, 'santana-calentadores': { amt: 150, k: ['fijo'], min: 1000, cx: 24 } };
  Object.keys(DEP).forEach(id => { CFG[id] = { ...(CFG[id] || {}), dep: DEP[id] }; });
  const cfg = id => CFG[id] || {};
  const svcs = id => HL.SVC[id] || [];
  const flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  function depOf(own, key, price) { const d = cfg(own).dep; if (!d) return 0; const [si, ii] = String(key).split(':').map(Number), g = svcs(own)[si], it = g && g[2][ii];
    if (!it || ['pres', 'emer', 'plan'].includes(it.k)) return 0; if (d.k && !d.k.includes(it.k)) return 0; const p = price != null ? price : it.p; if (d.min && p < d.min) return 0;
    const amt = d.big && p >= d.big[0] ? d.big[1] : d.amt; return p > 0 ? Math.min(amt, p) : amt; }
  const firstOf = id => { if (PROI[id]) return PROI[id].first; const b = biz(id), x = (X.STAFF[id] || [])[0]; return b && b.m === 'solo' && x ? x[0].split(' ')[0] : ''; };
  const whoOf = (b, es) => firstOf(b.id) || (b.m === 'gc' ? (es ? 'el contratista' : 'the contractor') : (es ? 'el negocio' : 'the business'));

  /* ---------- Franjas de llegada (2 h) ---------- */
  function wkOf(id) { const p = PROI[id]; if (p) return p.wk; const b = biz(id), h = (b && b.hrs) || [8, 18], cl = (b && b.closed) || [];
    return [0, 1, 2, 3, 4, 5, 6].map(d => cl.includes(d) ? null : d === 0 ? (b.sun || null) : d === 6 ? (b.sat || h) : h); }
  function freeW(key, wk, i, h) { const tt = wk[day(i).getDay()]; if (!tt) return false; const a = Math.max(tt[0], 8), z = Math.min(tt[1], 20); if (h < a || h + 2 > z) return false; if (i === 0 && h < NOW + 1) return false;
    const dens = .4 + (day(i).getDay() === 6 ? .15 : 0) + (i === 0 ? .15 : 0); return hash(key + '|' + i + '|' + h) >= dens; }
  function nextWinWk(key, wk) { for (let i = 0; i < 14; i++) { const tt = wk[day(i).getDay()]; if (!tt) continue; for (let h = Math.max(tt[0], 8); h + 2 <= Math.min(tt[1], 20); h += 2) if (freeW(key, wk, i, h)) return { i, h }; } return null; }
  const nextWin = id => nextWinWk(id, wkOf(id));
  const nextStaff = (id, k) => { const pp = (SD.PEOPLE[id] || [])[k]; return pp && pp.wk ? nextWinWk(id + '|' + k, pp.wk) : null; };
  const aprL = (id, es) => cfg(id).auto ? (es ? 'CONFIRMA AL INSTANTE' : 'CONFIRMS INSTANTLY') : (es ? 'RESPONDE EN ~' : 'REPLIES IN ~') + (cfg(id).apr || 30) + ' MIN';
  const aprT = (id, es) => cfg(id).auto ? (es ? 'Al instante' : 'Instantly') : '~' + (cfg(id).apr || 30) + ' min';
  const aprC = id => cfg(id).auto ? ['rgba(0,229,196,.18)', '#00695B'] : ['rgba(255,176,32,.2)', '#8A5A00'];
  const warrL = (m, es) => m >= 12 && m % 12 === 0 ? (m / 12) + (es ? (m === 12 ? ' año' : ' años') : (m === 12 ? ' year' : ' years')) : m + (es ? ' meses' : ' months');
  Object.keys(HL.STAFF).forEach(id => (SD.PEOPLE[id] || []).forEach((pp, k) => { const p = PROS.find(x => x.at === id && x.j === k), nx = p ? nextWin(p.id) : nextStaff(id, k);
    pp.next = nx ? ['Próxima franja: ' + winL(nx, true), 'Next window: ' + winL(nx, false)] : ''; }));

  /* ---------- Mi casa ---------- */
  const TIPO = [['casa', 'Casa', 'House'], ['apto', 'Apartamento', 'Apartment'], ['duplex', 'Dúplex o twin', 'Duplex or twin'], ['movil', 'Casa móvil', 'Mobile home']];
  const OWN = [['dueno', 'Soy dueño', 'I own'], ['inq', 'Soy inquilino', 'I rent'], ['land', 'Tengo propiedades de renta', 'I have rental properties']];
  const YR = [['pre50', 'Antes de 1950', 'Before 1950'], ['50', '1950–1979', '1950–1979'], ['80', '1980–1999', '1980–1999'], ['00', '2000 o después', '2000 or later']];
  const PETS = [['no', 'No', 'No'], ['perro', 'Perro', 'Dog'], ['gato', 'Gato', 'Cat'], ['otra', 'Otra', 'Other']];
  const HEAT = [['caldera', 'Caldera (agua o vapor)', 'Boiler (water or steam)'], ['horno', 'Horno de aire', 'Furnace'], ['bomba', 'Bomba de calor', 'Heat pump'], ['zocalo', 'Eléctrica de zócalo', 'Electric baseboard']];
  const WH = [['gas', 'Gas', 'Gas'], ['elec', 'Eléctrico', 'Electric'], ['sintanque', 'Sin tanque', 'Tankless'], ['aceite', 'Aceite', 'Oil']];
  const AGE = [['5', 'Menos de 5 años', 'Under 5 years'], ['10', '5 a 10', '5 to 10'], ['20', '10 a 20', '10 to 20'], ['mas', 'Más de 20', 'Over 20'], ['ns', 'No sé', 'Not sure']];
  const BEDS = ['1', '2', '3', '4', '5+'], BATHS = ['1', '1.5', '2', '3+'];
  const lab = (L, k, es) => { const x = L.find(y => y[0] === k); return x ? x[es ? 1 : 2] : ''; };
  const ACC = [{ id: 'c-acc-1', addr: '112 W Oak St, Hazleton', tipo: 'casa', own: 'dueno', beds: '3', baths: '1.5', sqft: '1400', yr: 'pre50', pets: 'perro', heat: 'caldera', heatAge: '20', wh: 'gas', whAge: '10', park: 'Entrada al lado. El perro queda en el patio.', acc: 1 }];
  const casaList = s => (s.user ? ACC : []).concat(s.casas || []);
  const casaCur = s => { const L = casaList(s); return L.find(c => c.id === s.casaSel) || L[0] || null; };
  function distOf(c, b) { const a = (c.addr || '').toLowerCase(), k = hash(a + '|' + b.id);
    if (/hazleton|hazle|w hazleton|west hazleton/.test(a) || !/,/.test(a)) return Math.round((0.4 + k * 3.4) * 10) / 10;
    if (/freeland|drums|conyngham|sugarloaf|mountaintop|mcadoo|weatherly|tresckow/.test(a)) return Math.round((7 + k * 7) * 10) / 10;
    return Math.round((24 + k * 20) * 10) / 10; }
  const casaName = c => (c.addr || '').replace(/, (PA|Pennsylvania)$/i, '');
  const casaMeta = (c, es) => [lab(TIPO, c.tipo, es), c.beds ? c.beds + (es ? ' cuartos' : ' bedrooms') : '', c.baths ? c.baths + (es ? ' baños' : ' baths') : '', lab(OWN, c.own, es)].filter(Boolean).join(' · ').toUpperCase();
  function compat(b, c, es) { if (!b || !c) return null; const E2 = (x, y) => es ? x : y, d = distOf(c, b), z = b.zone || 15;
    if (d > z) return { ok: false, d, t: E2('Tu casa queda a ' + d + ' mi: llegan hasta ' + z + ' mi', 'Your home is ' + d + ' mi away: they go up to ' + z + ' mi') };
    if (c.own === 'inq' && !b.tags.includes('inq')) return { ok: false, d, t: E2('Solo trabajan con dueños de casa', 'They only work with homeowners') };
    if (c.own === 'inq') return { ok: true, d, warn: 1, t: E2('Llega a tu casa (' + d + ' mi). Necesitas el permiso de tu landlord', 'They reach you (' + d + ' mi). You need your landlord’s permission') };
    return { ok: true, d, t: E2('Llega a tu casa · ' + d + ' mi', 'They reach your home · ' + d + ' mi') }; }
  function openCasa(C, s) { C.setState({ hcs: { mode: casaList(s).length ? 'list' : 'form', f: {}, top: s.view === 'desktop' ? C.vTop() : 0 } }); }

  /* ---------- Precio y rótulos ---------- */
  const UNIT = { pie2: ['pie²', 'sq ft'], cuarto: ['cuarto', 'room'], salida: ['salida', 'vent'] };
  function priceOf(it, q) { let p = it.k === 'hora' ? it.p * (it.mh || 1) : it.k === 'area' ? (it.min || it.p) : (it.p || 0), m = it.mi || 0;
    (it.opt || []).forEach((g, gi) => { const o = g[2][(q.opt || {})[gi]]; if (o) { p += o[2]; m += o[3]; } });
    (it.x || []).forEach((a, i) => { if ((q.add || []).includes(i)) { p += a[2]; m += a[3]; } });
    return { p, m }; }
  function priceL(it, p, es) { const E2 = (x, y) => es ? x : y;
    if (it.k === 'hora') return money(it.p) + '/h'; if (it.k === 'area') return money(it.p) + '/' + UNIT[it.u || 'pie2'][es ? 0 : 1];
    if (it.k === 'pres') return it.p ? money(it.p) : E2('Gratis', 'Free'); if (it.k === 'plan') return money(it.p) + (it.fr === 'temp' ? E2('/temporada', '/season') : E2('/mes', '/mo'));
    return p ? money(p) : E2('Gratis', 'Free'); }
  function totalL(it, p, es) { const E2 = (x, y) => es ? x : y;
    if (it.k === 'hora') return money(p) + E2(' · mín. ', ' · min. ') + (it.mh || 1) + ' h'; if (it.k === 'area') return E2('Desde ', 'From ') + money(p);
    if (it.k === 'pres') return it.p ? money(it.p) : E2('Presupuesto gratis', 'Free estimate'); if (it.k === 'plan') return priceL(it, p, es); return money(p); }
  function whenL(it, es) { const E2 = (x, y) => es ? x : y;
    if (it.days) return it.days[0] === it.days[1] ? it.days[0] + (it.days[0] === 1 ? E2(' DÍA', ' DAY') : E2(' DÍAS', ' DAYS')) : it.days[0] + '–' + it.days[1] + E2(' DÍAS', ' DAYS');
    return it.mi ? dur(it.mi).toUpperCase() : ''; }
  function metaOf(it, es, prov) { const E2 = (x, y) => es ? x : y, a = [];
    if (it.k === 'visita') a.push(it.free ? E2('GRATIS SI LO ARREGLAN · SI NO, ', 'FREE WITH THE REPAIR · OTHERWISE ') + money(it.p) : E2('VISITA', 'VISIT') + (it.cred ? E2(' · SE DESCUENTA SI LO ARREGLAN', ' · CREDITED IF THEY FIX IT') : ''));
    if (it.k === 'fijo') a.push(whenL(it, es), E2('PRECIO CERRADO', 'FIXED PRICE'));
    if (it.k === 'hora') a.push(E2('MÍNIMO ', 'MINIMUM ') + (it.mh || 1) + ' H', E2('MATERIALES APARTE', 'MATERIALS EXTRA'));
    if (it.k === 'area') a.push(whenL(it, es), E2('MÍNIMO ', 'MINIMUM ') + money(it.min || it.p));
    if (it.k === 'pres') a.push(E2('PRESUPUESTO EN TU CASA', 'ESTIMATE AT YOUR HOME'), it.rng ? E2('SUELE SER ', 'USUALLY ') + money(it.rng[0]) + '–' + money(it.rng[1]) : '', whenL(it, es));
    if (it.k === 'emer') a.push('24/7', it.sur ? E2('INCLUYE RECARGO DE ', 'INCLUDES ') + money(it.sur) + E2('', ' SURCHARGE') : '');
    if (it.k === 'plan') a.push(it.fr === 'temp' ? E2('POR TEMPORADA', 'PER SEASON') : E2('CADA MES', 'MONTHLY'), E2('CANCELAS CUANDO QUIERAS', 'CANCEL ANY TIME'));
    if (prov) a.push(E2('LO HACE ', 'BY ') + prov.first.toUpperCase());
    return a.filter(Boolean).join(' · '); }
  function payNote(it, b, es) { const E2 = (x, y) => es ? x : y, who = whoOf(b, es);
    if (it.k === 'visita') return (it.free ? E2('Gratis si hacen el arreglo; si no, pagas ' + money(it.p) + '.', 'Free if they do the repair; otherwise you pay ' + money(it.p) + '.') : E2('Pagas ' + money(it.p) + ' por la visita' + (it.cred ? '; si hacen el arreglo, se descuenta del total' : '') + '.', 'You pay ' + money(it.p) + ' for the visit' + (it.cred ? '; if they do the repair, it comes off the total' : '') + '.')) + E2(' Antes de empezar, el precio completo del arreglo te llega a la app; sin tu OK no se hace.', ' Before starting, the full repair price reaches the app; nothing is done without your OK.');
    if (it.k === 'fijo') return E2('Precio cerrado. Si ' + who + ' encuentra algo más, te manda foto y precio antes; sin tu OK no se hace ni se cobra.', 'Fixed price. If ' + who + ' finds something else, you get a photo and price first; without your OK it isn’t done or charged.');
    if (it.k === 'hora') return E2('Mínimo ' + (it.mh || 1) + ' h y luego por hora. Los materiales te los enseñan con precio antes de comprarlos. Antes de pasar de lo que calcularon, te preguntan.', (it.mh || 1) + ' h minimum, then hourly. Materials are shown to you with a price before buying. Before going past the estimate, they ask you.');
    if (it.k === 'area') return E2('Precio por ' + UNIT[it.u || 'pie2'][0] + ', con un mínimo de ' + money(it.min || it.p) + '. Miden en tu casa y el total te llega a la app antes de empezar.', 'Price per ' + UNIT[it.u || 'pie2'][1] + ', with a ' + money(it.min || it.p) + ' minimum. They measure at your home and the total reaches the app before starting.');
    if (it.k === 'pres') return (it.p ? E2('La visita cuesta ' + money(it.p) + '. ', 'The visit costs ' + money(it.p) + '. ') : E2('La visita y el presupuesto son gratis. ', 'The visit and the estimate are free. ')) + E2('El presupuesto llega a la app por línea, con materiales, mano de obra y permisos' + (it.rng ? '; aquí suele salir entre ' + money(it.rng[0]) + ' y ' + money(it.rng[1]) : '') + '. Apruebas cada parte.', 'The estimate reaches the app line by line, with materials, labor and permits' + (it.rng ? '; here it usually comes to ' + money(it.rng[0]) + '–' + money(it.rng[1]) : '') + '. You approve each part.');
    if (it.k === 'emer') return E2('Sale a cualquier hora. El precio ya incluye el recargo de ' + money(it.sur || 0) + ' y la primera hora. Lo que haga falta después te lo cotiza antes.', 'Goes out any time. The price already includes the ' + money(it.sur || 0) + ' surcharge and the first hour. Anything after that is quoted first.');
    if (it.k === 'plan') return E2('Se cobra cada ' + (it.fr === 'temp' ? 'temporada' : 'mes') + ' con tu tarjeta. Cancelas cuando quieras desde la app, sin cargo.', 'Charged every ' + (it.fr === 'temp' ? 'season' : 'month') + ' to your card. Cancel any time in the app, no fee.');
    return ''; }

  /* ---------- Hoy ---------- */
  function today(b, es) { const E2 = (x, y) => es ? x : y, c = cfg(b.id), tg = k => b.tags.includes(k), f = flatOf(b.id), nx = nextWin(b.id), who = whoOf(b, es);
    if (b.m === 'tec') { const p = PROI[b.id], tt = p.wk[TODAY], on = !!b.open;
      return { t: on ? E2('Trabajando hasta las ', 'Working until ') + fmt(tt[1]) : tt ? E2('Hoy empieza a las ', 'Starts today at ') + fmt(tt[0]) : E2('Hoy no trabaja', 'Off today'), dot: on ? '#00A88F' : '#FFB020',
        s: p.auto ? E2(p.first + ' confirma al instante: si ves la franja libre, es tuya.', p.first + ' confirms instantly: if you see the window open, it’s yours.') : E2('Eliges una franja de 2 horas y ' + p.first + ' confirma en unos ' + p.apr + ' min.', 'Pick a 2-hour window and ' + p.first + ' confirms in about ' + p.apr + ' min.'),
        cols: [[E2('PRÓXIMA FRANJA', 'NEXT WINDOW'), winL(nx, es) || '—'], [E2('RESPONDE', 'REPLIES'), aprT(b.id, es)], [E2('ZONA', 'AREA'), E2('Hasta ', 'Up to ') + b.zone + ' mi']] }; }
    const v = f.find(x => x.k === 'visita'), pr = f.find(x => x.k === 'pres'), hr = f.find(x => x.k === 'hora'), cols = [];
    if (b.m === 'red') { const L = PROS.filter(p => p.at === b.id), fr = L.map(p => nextWin(p.id)).filter(Boolean).sort((a, z) => a.i - z.i || a.h - z.h)[0];
      return { s: E2('Eliges técnico o servicio. Cada uno pone su precio y su agenda; confirma tu franja.', 'Pick a tech or a service. Each sets their own price and schedule and confirms your window.'), cols: [[E2('TÉCNICOS', 'TECHS'), L.length + E2(' independientes', ' independent')], [E2('PRÓXIMA FRANJA', 'NEXT WINDOW'), winL(fr, es) || '—'], [E2('ZONA', 'AREA'), E2('Hasta ', 'Up to ') + b.zone + ' mi']] }; }
    cols.push([E2('PRÓXIMA FRANJA', 'NEXT WINDOW'), winL(nx, es) || '—']);
    if (pr && !v && !hr) cols.push([E2('PRESUPUESTO', 'ESTIMATE'), pr.p ? money(pr.p) : E2('Gratis', 'Free')]); else if (v) cols.push([E2('VISITA', 'VISIT'), v.free ? E2('Gratis con el arreglo', 'Free with the repair') : money(v.p) + (v.cred ? E2(' · se descuenta', ' · credited') : '')]); else if (hr) cols.push([E2('POR HORA', 'HOURLY'), money(hr.p) + E2(' · mín. ', ' · min. ') + (hr.mh || 1) + ' h']);
    if (tg('h24')) cols.push([E2('EMERGENCIA', 'EMERGENCY'), c.eta24 ? E2('24/7 · llega en ~', '24/7 · ~') + c.eta24 + ' min' : '24/7']); else cols.push([E2('ZONA', 'AREA'), E2('Hasta ', 'Up to ') + b.zone + ' mi']);
    return { s: b.m === 'gc' ? E2('Primero la visita y el presupuesto por línea. Apruebas cada parte en la app.', 'First the visit and a line-by-line estimate. You approve each part in the app.') : E2('Eliges una franja de 2 horas y ' + who + ' confirma. Te avisa cuando va en camino.', 'Pick a 2-hour window and ' + who + ' confirms. You get a text when they’re on the way.'), cols: cols.slice(0, 3) }; }
  function howSteps(b, es) { const E2 = (x, y) => es ? x : y, f = flatOf(b.id).concat(...PROS.filter(p => p.at === b.id).map(p => flatOf(p.id))), v = f.find(x => x.k === 'visita'), pr = f.find(x => x.k === 'pres'), hr = f.find(x => x.k === 'hora');
    const s1 = b.m === 'gc' || (pr && !v && !hr) ? (pr && pr.p ? E2('Visita de ' + money(pr.p) + ' para medir y darte el presupuesto.', money(pr.p) + ' visit to measure and give you the estimate.') : E2('Visita y presupuesto gratis en tu casa.', 'Free visit and estimate at your home.'))
      : v ? (v.free ? E2('Diagnóstico gratis si hacen el arreglo; si no, ' + money(v.p) + '.', 'Free diagnosis if they do the repair; otherwise ' + money(v.p) + '.') : E2('Visita ' + money(v.p) + (v.cred ? ': se descuenta si hacen el arreglo.' : '.'), 'Visit ' + money(v.p) + (v.cred ? ': credited if they do the repair.' : '.'))) : hr ? E2('Por hora: ' + money(hr.p) + ', mínimo ' + (hr.mh || 1) + ' h. Materiales aparte, con precio antes de comprarlos.', 'Hourly: ' + money(hr.p) + ', ' + (hr.mh || 1) + ' h minimum. Materials extra, priced before buying.') : E2('Precio cerrado para cada servicio.', 'A fixed price for each service.');
    return [s1, E2('Antes de empezar te llega el precio completo a la app: mano de obra, materiales y permiso.', 'Before starting, the full price reaches the app: labor, materials and permit.'), E2('Lo apruebas y se retiene. Si aparece algo más, te piden tu OK con foto.', 'You approve it and it is held. If anything else comes up, they ask your OK with a photo.'), E2('Al terminar se cobra lo final y se libera el resto.', 'When done, the final amount is charged and the rest is released.')]; }

  /* ---------- Ficha ---------- */
  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), c = cfg(b.id), red = b.m === 'red', tec = b.m === 'tec', gc = b.m === 'gc';
    const L = PROS.filter(p => p.at === b.id), home = casaCur(s), cp = compat(b, home, es), canBiz = pro && tg('cita') || pro && tec || pro && (tg('h24') || flatOf(b.id).length > 0) || (window.TLFreeOn && window.TLFreeOn(b));
    const openSheet = (own, key) => e => { stop(e); C.setState({ ash: { biz: b.id, own, key, opt: {}, add: [], stf: s.bkStf && s.bkStf.biz === b.id ? s.bkStf.k : 'any' }, bshTop: dk ? C.vTop() : 0 }); };
    const emerE = (own, it) => e => { stop(e); if (window.TLHogarMas) window.TLHogarMas.startEm(C, { biz: b.id, ek: (it.sym || []).find(k => /^e:/.test(k)) || null, from: 'APP-NEG-LISTING-PRO · Servicios' }); };
    const row = (own, it, key, prov) => { const dp0 = depOf(own, key), em = it.k === 'emer' && pro, ob = biz(own);
      const pre = pro && ['pres', 'visita', 'hora'].includes(it.k);
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: it.ph ? U(it.ph, 200) : U(b.ph[0], 200), meta: metaOf(it, es, prov) + (dp0 ? E2(' · DEPÓSITO ', ' · DEPOSIT ') + money(dp0) : ''), price: priceL(it, it.p, es), sym: it.sym || [],
        hasPre: pre, preL: it.k === 'pres' ? E2('Pedir presupuesto a hasta 3', 'Ask up to 3 for estimates') : E2('Pre-estimado con fotos', 'Pre-estimate from photos'),
        onPre: e => { stop(e); it.k === 'pres' && window.TLHogarMas ? window.TLHogarMas.startPq(C, { biz: b.id, own, key }) : window.TLHogarPre ? window.TLHogarPre.start(C, { biz: b.id, own, key }) : C.encargo('APP-NEG-HOGAR-PREEST', 'APP-NEG-LISTING-PRO · Servicios · ' + (es ? it.n : it.ne), ob.name, E2('Pre-estimado con fotos · Hogar', 'Photo pre-estimate · Home')); },
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(own, key) : () => {}, onBook: em ? emerE(own, it) : openSheet(own, key),
        btnL: em ? E2('Pedir ayuda', 'Get help') : it.k === 'plan' ? E2('Ver plan', 'See plan') : it.k === 'pres' ? E2('Pedir', 'Request') : 'Booking' }; };
    let secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => row(b.id, it, si + ':' + ii)) }));
    if (red) L.forEach(p => svcs(p.id).forEach(([te, tn, its], si) => secs.push({ title: ((es ? te : tn) + E2(' · con ', ' · with ') + p.first).toUpperCase(), items: its.map((it, ii) => row(p.id, it, si + ':' + ii, p)) })));
    const sk = s.negSub || '', symL = HO.SYM[sk] || HO.EMER[sk] || HO.TEMP[sk];
    if (pro && symL && /APP-NEG-CAT · Hogar/.test((s.route && s.route.from) || '')) { const hits = [].concat(...secs.map(g => g.items)).filter(x => x.sym.includes(sk)); if (hits.length) secs = [{ title: E2('PARA «', 'FOR "') + symL[es ? 0 : 1].toUpperCase() + E2('»', '"'), items: hits }].concat(secs); }
    const mode = red ? (s.svMode && s.svMode.biz === b.id ? s.svMode.m : 'pro') : 'svc';
    const modes = red ? [['pro', E2('Por técnico', 'By tech'), 'users'], ['svc', E2('Por servicio', 'By service'), 'wrench']].map(([k, l, icon]) => ({ l, icon, bg: mode === k ? '#fff' : 'transparent', sh: mode === k ? '0 1px 3px rgba(11,14,18,.12)' : 'none', fg: mode === k ? '#0B0E12' : 'rgba(11,14,18,.55)', onClick: () => C.setState({ svMode: { biz: b.id, m: k } }) })) : [];
    const pros = red ? L.map(p => { const nx = nextWin(p.id), [ab, af] = aprC(p.id), pb = biz(p.id), hr0 = flatOf(p.id).find(x => x.k === 'hora');
      return { name: p.name, ph: U(p.ph, 240), seat: E2('TÉCNICO INDEPENDIENTE · SU PROPIO NEGOCIO', 'INDEPENDENT TECH · OWN BUSINESS'), meta: '★ ' + p.r + ' · ' + p.n + E2(' RESEÑAS · ', ' REVIEWS · ') + (hr0 ? money(hr0.p) + E2('/H · ', '/H · ') : '') + p.sp.map(x => es ? x[0] : x[1]).join(' · ').toUpperCase(), apr: aprL(p.id, es), aprBg: ab, aprFg: af,
        next: nx ? E2('Próxima franja: ', 'Next window: ') + winL(nx, es) : E2('Sin franjas esta semana', 'No windows this week'), nextFg: nx && nx.i === 0 ? '#00695B' : 'rgba(11,14,18,.6)', pageL: E2('Ver su página', 'See profile'), pageIc: 'store',
        onPage: e => { stop(e); C.openBiz(pb, 'APP-NEG-LISTING-PRO · Servicios · Por técnico'); }, onBook: e => { stop(e); C.openBiz(pb, 'APP-NEG-LISTING-PRO · Servicios · Booking'); C.setState({ ltab: 'svc' }); } }; }) : [];
    const notes = [];
    if (red) notes.push(['users', E2('Cada técnico es su propio negocio: pone su precio, su agenda y su garantía. ' + b.name + ' los conecta y verifica su seguro.', 'Each tech is their own business: they set their price, schedule and warranty. ' + b.name + ' connects them and checks their insurance.')]);
    if (tec) { const p = PROI[b.id], sb = biz(p.at); notes.push(['dollar', E2(p.first + ' pone estos precios y ' + p.first + ' cobra. ' + sb.name + ' solo lo conecta contigo.', p.first + ' sets these prices and gets paid. ' + sb.name + ' only connects you.')]);
      notes.push([p.auto ? 'check' : 'clock', p.auto ? E2(p.first + ' activó la confirmación automática: si ves la franja libre, es tuya.', p.first + ' turned on instant confirmation: if the window is open, it’s yours.') : E2(p.first + ' responde en unos ' + p.apr + ' min.', p.first + ' replies in about ' + p.apr + ' min.')]); }
    if (gc && (X.STAFF[b.id] || []).length > 1) { const SF = X.STAFF[b.id] || []; notes.push(['users', E2(SF[0][0].split(' ')[0] + ' lleva la obra. ' + names(SF.slice(1).map(x => x[0].split(' ')[0]), true) + ' trabajan como subcontratistas con su propia licencia; ' + SF[0][0].split(' ')[0] + ' responde por todo.', SF[0][0].split(' ')[0] + ' runs the job. ' + names(SF.slice(1).map(x => x[0].split(' ')[0]), false) + ' work as subcontractors under their own license; ' + SF[0][0].split(' ')[0] + ' answers for everything.')]); }
    notes.push(['pin', E2('Va a tu casa, hasta ' + b.zone + ' mi de Hazleton. Te avisa cuando va en camino; la franja es de 2 horas.', 'Comes to your home, up to ' + b.zone + ' mi from Hazleton. You get a text when they’re on the way; the window is 2 hours.')]);
    if (tg('h24')) notes.push(['emergency', E2('Emergencia 24/7: el precio que ves ya incluye el recargo' + (c.eta24 ? '. Suele llegar en unos ' + c.eta24 + ' min.' : '.'), '24/7 emergency: the price you see already includes the surcharge' + (c.eta24 ? '. Usually arrives in about ' + c.eta24 + ' min.' : '.'))]);
    const dpc = c.dep; if (dpc && pro) notes.push(['lock', E2('Pide depósito de ' + money(dpc.amt) + (dpc.big ? ' (' + money(dpc.big[1]) + ' en trabajos de más de ' + money(dpc.big[0]) + ')' : '') + (dpc.min ? ' en trabajos de más de ' + money(dpc.min) : '') + ' para guardar tu franja: se cobra al enviar y se descuenta del total. Si no confirman o cancelas hasta ' + dpc.cx + ' h antes, te lo devolvemos.', 'Takes a ' + money(dpc.amt) + ' deposit' + (dpc.big ? ' (' + money(dpc.big[1]) + ' on jobs over ' + money(dpc.big[0]) + ')' : '') + (dpc.min ? ' on jobs over ' + money(dpc.min) : '') + ' to hold your window: charged when you send, taken off the total. If they don’t confirm or you cancel up to ' + dpc.cx + ' h before, you get it back.')]);
    if (c.warr && pro) notes.push(['shield', E2('Garantía de la mano de obra por escrito: ' + warrL(c.warr, true) + '.', 'Written labor warranty: ' + warrL(c.warr, false) + '.')]);
    if (tg('financia')) notes.push(['card', E2('Trabajos grandes: paga en 6 o 12 meses, sujeto a aprobación.', 'Big jobs: pay over 6 or 12 months, subject to approval.')]);
    V.sv = { isChair: red, modes, bySvc: mode === 'svc', byPro: mode === 'pro', secs, pros, notes: pro ? notes.slice(0, 4).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: false, mine: {}, lbl: { page: E2('Ver su página', 'See profile'), book: 'Booking' } };
    V.sh = s.ash && s.ash.biz === b.id ? sheetVals(C, s, es, b) : EMPTY_SH;
    const oc = e => { stop(e); openCasa(C, s); }, line = HO.line[es ? 0 : 1];
    V.ax = { veh: home ? { has: pro, k: E2('VA A TU CASA', 'COMING TO YOUR HOME'), t: casaName(home), hasS: true, s: casaMeta(home, es), hasP: false, p: '', hasOk: !!cp, okT: cp ? cp.t : '', okFg: cp && cp.ok ? (cp.warn ? '#8A5A00' : '#00695B') : '#C0392B', okIc: cp && cp.ok && !cp.warn ? 'check' : 'warning', cta: E2('Cambiar', 'Change'), onClick: oc }
        : { has: pro, k: E2('¿A QUÉ CASA VA?', 'WHICH HOME?'), t: E2('Agrega tu casa', 'Add your home'), hasS: false, s: '', hasP: true, p: E2('Te decimos si llegan hasta ahí, y la franja y el precio van con tu casa.', 'We tell you if they reach you; the window and price go with your home.'), hasOk: false, okT: '', okFg: '#00695B', okIc: 'check', cta: E2('Agregar', 'Add'), onClick: oc },
      sz: { has: false, chips: [] },
      q: tg('h24') && pro && c.eta24 ? { has: true, k: E2('EMERGENCIA AHORA · 24/7', 'EMERGENCY NOW · 24/7'), t: E2('Sale ahora · llega en ~', 'Leaves now · arrives in ~') + c.eta24 + ' min', s: E2('El recargo va incluido en el precio de la emergencia.', 'The surcharge is included in the emergency price.'), up: E2('HACE 4 MIN', '4 MIN AGO') } : { has: false },
      line: { has: pro, t: line, s: gc ? E2('Presupuesto por línea en la app; apruebas cada parte.', 'Line-by-line estimate in the app; you approve each part.') : E2('El precio completo te llega a la app antes de empezar; algo extra pide tu OK con foto.', 'The full price reaches the app before starting; extras need your OK with a photo.') },
      how: { has: pro, t: line, steps: howSteps(b, es).map((x, i) => ({ n: String(i + 1), t: x })) } };
    /* Tienda con apartado y renta de herramienta. */
    const SH = HL.SHOP[b.id] || [], hasRent = SH.some(x => x.rent);
    V.shop = { items: SH.map((x, xi) => ({ name: es ? x.n : x.ne || x.n, desc: es ? x.d : x.de || x.d, price: money(x.p) + (x.rent ? E2('/día', '/day') : ''), img: U(x.ph, 350), left: x.left <= 3 ? (x.rent ? E2('QUEDAN ', 'ONLY ') + x.left + E2(' PARA RENTAR', ' TO RENT') : E2('QUEDAN ', 'ONLY ') + x.left) : E2('EN EXISTENCIA', 'IN STOCK'), leftFg: x.left <= 3 ? '#8A5A00' : '#00695B',
        hasTag: !!x.rent, tag: E2('RENTA', 'RENTAL'), tagTone: 'signal', onClick: () => x.rent && window.TLHogarPlan ? window.TLHogarPlan.startRent(C, { biz: b.id, i: xi }) : C.encargo(x.rent ? 'APP-NEG-RENTAR' : 'APP-NEG-APARTAR', 'APP-NEG-LISTING-PRO · Tienda · ' + (x.rent ? 'Rentar ' : 'Apartar ') + x.n, b.name, x.rent ? E2('Rentar herramienta', 'Rent a tool') : E2('Apartar producto', 'Hold product')) })),
      hold: E2('Apartar', 'Hold'), hasChips: false, chips: [], empty: false,
      note: hasRent ? E2('Apartas en la app y pagas al recoger en el local; te lo guardan 48 horas. Herramienta: pagas el día y dejas un depósito que se devuelve al traerla.', 'Hold it in the app and pay at pickup; kept for 48 hours. Tools: pay the day and leave a deposit, returned when you bring it back.') : E2('Apartas en la app y pagas al recoger en el local. Te lo guardan 48 horas. Lo que dice "instalado" incluye la visita.', 'Hold it in the app and pay at pickup. Kept for 48 hours. "Installed" includes the visit.') };
    /* Trabajos hechos (antes y después). */
    const G = HL.GAL[b.id] || [];
    V.hx = { gal: { has: pro && G.length > 0, t: E2('Trabajos hechos', 'Past work'), s: E2('Fotos que sube el negocio al terminar, con el precio cobrado.', 'Photos the business uploads when done, with the price charged.'), kB: E2('ANTES', 'BEFORE'), kA: E2('DESPUÉS', 'AFTER'),
      items: G.map(g => ({ t: es ? g[0] : g[1], before: U(g[2], 300), after: U(g[3], 300), meta: [g[4] + (g[4] === 1 ? E2(' DÍA', ' DAY') : E2(' DÍAS', ' DAYS')), money(g[5]), g[6].toUpperCase()].join(' · ') })) } };
    /* Datos de la ficha. */
    const TD = today(b, es), f0 = flatOf(b.id), v0 = f0.find(x => x.k === 'visita'), p0 = f0.find(x => x.k === 'pres'), h0 = f0.find(x => x.k === 'hora') || (red ? [].concat(...L.map(p => flatOf(p.id))).find(x => x.k === 'hora') : null);
    const fromLabel = v0 ? (v0.free ? E2('Diagnóstico gratis con el arreglo', 'Free diagnosis with repair') : E2('Visita ', 'Visit ') + money(v0.p)) : h0 ? E2('Desde ', 'From ') + money(h0.p) + '/h' : p0 && !p0.p ? E2('Presupuesto gratis', 'Free estimate') : f0.length ? E2('Desde ', 'From ') + money(Math.min(...f0.map(x => x.p).filter(p => p > 0))) : V.fromLabel;
    const AM = { cita: ['calendar', 'Con cita y franja de 2 h', 'Booked 2-hour window'], sameday: ['check', 'Llega hoy', 'Same-day visits'], h24: ['emergency', 'Emergencia 24/7', '24/7 emergency'], lic: ['verified', 'Con licencia', 'Licensed'], seguro: ['shield', 'Con seguro', 'Insured'], garantia: ['check', 'Garantía del trabajo', 'Work warranty'], finde: ['calendar', 'Fines de semana', 'Weekends'], online: ['card', 'Pago en la app', 'Pay in app'], financia: ['dollar', 'Financiamiento', 'Financing'], plan: ['clock', 'Planes recurrentes', 'Recurring plans'], tienda: ['bag', 'Piezas y equipos', 'Parts and units'], renta: ['wrench', 'Renta de herramienta', 'Tool rental'], presfree: ['quote', 'Presupuesto gratis', 'Free estimate'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const addr = X.ADDR[b.id];
    const facts = [{ icon: 'card', k: E2('PAGO', 'PAYMENT'), v: tg('online') || tec ? E2('Tarjeta en la app: se retiene al aprobar y se cobra al terminar', 'Card in app: held when you approve, charged when done') : E2('Efectivo o tarjeta al terminar', 'Cash or card when done') },
      { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: 'Español · English' },
      { icon: 'pin', k: E2('ZONA', 'AREA'), v: E2('Va a tu casa, hasta ' + b.zone + ' mi de Hazleton', 'Comes to your home, up to ' + b.zone + ' mi from Hazleton') }]
      .concat(addr ? [{ icon: 'store', k: E2('OFICINA', 'OFFICE'), v: addr.replace(', Hazleton PA', '') }] : [])
      .concat(c.warr ? [{ icon: 'shield', k: E2('GARANTÍA', 'WARRANTY'), v: E2('Mano de obra, ' + warrL(c.warr, true) + ', por escrito', 'Labor, ' + warrL(c.warr, false) + ', in writing') }] : []).map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [
      [E2('¿Cobran por venir?', 'Do they charge to come out?'), v0 ? (v0.free ? E2('El diagnóstico es gratis si hacen el arreglo; si no, cuesta ' + money(v0.p) + '.', 'The diagnosis is free if they do the repair; otherwise it costs ' + money(v0.p) + '.') : E2('La visita cuesta ' + money(v0.p) + (v0.cred ? ' y se descuenta si hacen el arreglo.' : '.'), 'The visit costs ' + money(v0.p) + (v0.cred ? ' and is credited if they do the repair.' : '.'))) : p0 && !p0.p ? E2('No. La visita y el presupuesto son gratis.', 'No. The visit and estimate are free.') : h0 ? E2('Se cobra por hora desde que llegan, con mínimo de ' + (h0.mh || 1) + ' h.', 'Hourly from arrival, with a ' + (h0.mh || 1) + ' h minimum.') : E2('Cada servicio tiene su precio cerrado, con la visita incluida.', 'Each service has a fixed price, visit included.')],
      [E2('¿Qué pasa si encuentran algo más?', 'What if they find something else?'), E2('Te llega a la app con foto y precio. Sin tu OK no se hace ni se cobra.', 'It reaches the app with a photo and price. Without your OK it isn’t done or charged.')],
      [E2('¿Y si no llegan en la franja?', 'What if they miss the window?'), E2('Te avisan por SMS si se atrasan. Si no llegan ni avisan, puedes cancelar sin cargo y se libera lo retenido.', 'You get a text if they’re late. If they don’t show or call, you can cancel at no charge and we release what was held.')],
      [E2('¿Trabajan si soy inquilino?', 'Do they work for renters?'), tg('inq') ? E2('Sí. Necesitas el permiso de tu landlord; te lo pedimos en el Booking.', 'Yes. You need your landlord’s permission; we ask for it when you book.') : E2('Solo con dueños o con el landlord directamente.', 'Only with owners or directly with the landlord.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, {
      cta: canBiz ? 'Booking' : t.call, ctaIcon: canBiz ? 'calendar' : 'phone', onCta: canBiz ? toSvc : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: V.tab === 'shop', isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta ? it.meta.charAt(0) + it.meta.slice(1).toLowerCase() : '', price: it.price })),
      amen, facts, faq: pro ? (window.TLHogarK ? window.TLHogarK.faq(b, es, FQ[0]) : FQ).map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      addr: addr ? addr : E2('Va a tu casa · hasta ', 'Comes to your home · up to ') + b.zone + ' mi', addrMeta: addr ? (b.d + (b.taller ? E2(' MI · TALLER · RECOGE Y DEVUELVE HASTA ', ' MI · WORKSHOP · PICKUP AND RETURN UP TO ') : E2(' MI · OFICINA · VA A TU CASA HASTA ', ' MI · OFFICE · COMES TO YOU UP TO ')) + b.zone + ' MI') : E2('TRABAJA EN TU CASA', 'WORKS AT YOUR HOME'),
      metaRest: (b.taller ? E2('TALLER · RECOGE HASTA ', 'WORKSHOP · PICKUP UP TO ') : E2('VA A TU CASA · HASTA ', 'COMES TO YOU · UP TO ')) + b.zone + ' MI · HAZLETON', dist: E2('Hasta ', 'Up to ') + b.zone + ' mi',
      fromLabel, barSub: (TD.cols[0] ? TD.cols[0][0] + ' · ' + TD.cols[0][1] : '').toUpperCase(), svc: [], hasSvc: false,
      railNote: (pro || (window.TLFreeOn && window.TLFreeOn(b))) ? E2(HO.line[0] + ' Booking es una solicitud: ' + whoOf(b, true) + ' confirma tu franja.', HO.line[1] + ' Booking is a request: ' + whoOf(b, false) + ' confirms your window.') : E2('No toma citas en To\'Latino: llama para pedir tu visita. Pagas al terminar.', 'No To\'Latino bookings: call to request a visit. You pay when done.'),
      lbl: { ...V.lbl, items: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services'), map: addr ? E2('Zona y oficina', 'Area and office') : E2('Zona donde trabaja', 'Service area'), go: E2('Ver en el mapa', 'See on map'), amen: E2('Cómo trabaja', 'How they work'), ...(addr ? {} : { openMaps: E2('Ver la zona', 'See the area') }) } });
    V.bkRail = { has: pro, rows: TD.cols.map(([k, x]) => ({ k, v: x })), note: V.railNote, hasMine: false, mine: {} };
    if (tec) { const p = PROI[b.id], sb = biz(p.at), tt = p.wk[TODAY], open = !!b.open;
      V.silla = { has: true, k: (E2('EN ', 'ON ') + sb.name + E2(' DESDE ', ' SINCE ') + p.since).toUpperCase(), name: sb.name, meta: E2('RED DE TÉCNICOS INDEPENDIENTES · VER LA RED', 'INDEPENDENT TECH NETWORK · SEE THE NETWORK'), logo: U(sb.ph[0], 200), onClick: () => C.openBiz(sb, 'APP-NEG-LISTING-PRO · ' + p.name + ' · su red') };
      V.subsLine = E2('Técnico independiente · ', 'Independent tech · ') + p.subs.join(' · ');
      Object.assign(V, { stLabel: open ? E2('Trabajando', 'Working') : E2('No está ahora', 'Not working now'), stRest: '· ' + (open ? E2('hasta las ', 'until ') + fmt(tt[1]) : tt ? E2('empieza a las ', 'starts at ') + fmt(tt[0]) : E2('hoy no trabaja', 'off today')), stNote: (open ? E2('HASTA ', 'UNTIL ') + fmt(tt[1]) : tt ? E2('EMPIEZA ', 'STARTS ') + fmt(tt[0]) : E2('HOY LIBRE', 'OFF TODAY')), stDot: open ? '#00A88F' : '#FFB020', stColor: open ? '#00695B' : '#8A5A00', barSub: aprL(b.id, es) });
      if (V.hp && V.hp.hpWeek) V.hp = { ...V.hp, hpWeek: V.hp.hpWeek.map((r, i) => { const t2 = p.wk[(i + 1) % 7]; return { ...r, lines: t2 ? [{ ...r.lines[0], range: fmt(t2[0]) + ' – ' + fmt(t2[1]), color: '#0B0E12', fg: '#0B0E12' }] : [{ range: E2('Libre', 'Off'), type: '', color: 'rgba(11,14,18,.12)', dash: 'transparent', fg: 'rgba(11,14,18,.45)', weight: 600 }], tag: '', tagDisp: 'none' }; }) };
    } else V.silla = { has: false };
  }

  /* ---------- Hoja del servicio ---------- */
  function sheetVals(C, s, es, b) {
    const E2 = (x, y) => es ? x : y, q = s.ash, own = q.own, ob = biz(own), dk = s.view === 'desktop', [si0, ii0] = String(q.key).split(':').map(Number), sec = svcs(own)[si0], it = sec && sec[2][ii0];
    if (!it || !ob) return EMPTY_SH;
    const up = o => C.setState(z => ({ ash: { ...z.ash, ...o } })), home = casaCur(s), cp = compat(ob, home, es), name = es ? it.n : it.ne || it.n;
    const groups = (it.opt || []).map(([te, tn, os], gi) => { const sel = (q.opt || {})[gi]; return { title: es ? te : tn, meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: sel != null,
      opts: os.map(([oe, on, dp, dm], oi) => ({ label: (es ? oe : on) + (dm ? ' · +' + dur(dm) : ''), price: dp ? (dp > 0 ? '+' : '−') + money(Math.abs(dp)) : '', selected: sel === oi })), onToggle: oi => up({ opt: { ...(q.opt || {}), [gi]: oi } }) }; });
    const adds = (it.x || []).map((a, i) => ({ label: (es ? a[0] : a[1]) + (a[3] ? ' · +' + dur(a[3]) : ''), price: '+' + money(a[2]), checked: (q.add || []).includes(i), onToggle: () => up({ add: (q.add || []).includes(i) ? q.add.filter(x => x !== i) : (q.add || []).concat(i) }) }));
    const P = priceOf(it, q), tot = totalL(it, P.p, es), c = cfg(b.id), SF = X.STAFF[b.id] || [], PP = SD.PEOPLE[b.id] || [];
    let pros = [], people = [], whoMeta = '';
    if (ob.m === 'tec' && b.m === 'red') { const p = PROI[own], [ab, af] = aprC(own), nx = nextWin(own);
      pros = [{ name: p.name, ph: U(p.ph, 200), seat: E2('TÉCNICO INDEPENDIENTE', 'INDEPENDENT TECH'), meta: '★ ' + p.r + (nx ? ' · ' + E2('PRÓX ', 'NEXT ') + winL(nx, es).toUpperCase() : ''), price: tot, dep: E2('SU PRECIO', 'THEIR PRICE'), apr: aprL(own, es), aprBg: ab, aprFg: af, bd: '1.5px solid #0B0E12', pad: '11.5px', onClick: () => {} }];
      whoMeta = E2('SU PROPIO NEGOCIO: SU PRECIO, SU AGENDA Y SU GARANTÍA', 'OWN BUSINESS: THEIR PRICE, SCHEDULE AND WARRANTY'); }
    else if (c.pick && own === b.id && !['emer', 'plan', 'pres'].includes(it.k)) { people = c.pick.map(j => { const nx = nextStaff(b.id, j); return { id: j, name: SF[j][0].split(' ')[0], image: PX(PP[j].ph, 200), next: nx ? (nx.i === 0 ? rng(nx.h, nx.h + 2) : dayS(nx.i, es)).toUpperCase() : '', soon: !!nx && nx.i === 0 }; });
      whoMeta = q.stf != null && q.stf !== 'any' && SF[q.stf] ? (E2('VA ', 'COMING: ') + SF[q.stf][0].split(' ')[0]).toUpperCase() : E2('CUALQUIERA: VA QUIEN ESTÉ LIBRE EN TU FRANJA', 'ANYONE: WHOEVER IS FREE IN YOUR WINDOW'); }
    const oc = e => { stop(e); openCasa(C, s); };
    const veh = home ? { k: E2('TU CASA', 'YOUR HOME'), t: casaName(home), s: casaMeta(home, es), hasOk: !!cp, okT: cp ? cp.t : '', okFg: cp && cp.ok ? (cp.warn ? '#8A5A00' : '#00695B') : '#C0392B', okIc: cp && cp.ok && !cp.warn ? 'check' : 'warning', cta: E2('Cambiar', 'Change'), onClick: oc }
      : { k: E2('¿A QUÉ CASA VA?', 'WHICH HOME?'), t: E2('Agrégala: te decimos si llegan hasta ahí', 'Add it: we tell you if they reach you'), s: '', hasOk: false, okT: '', okFg: '#00695B', okIc: 'check', cta: E2('Agregar', 'Add'), onClick: oc };
    const pendG = groups.find(g => !g.done), bad = cp && !cp.ok, dp = depOf(own, q.key, it.k === 'fijo' ? P.p : null);
    const go = () => { if (bad || pendG) return; C.setState({ ash: null });
      if (it.k === 'emer') return window.TLHogarMas && window.TLHogarMas.startEm(C, { biz: b.id, ek: (it.sym || []).find(k => /^e:/.test(k)) || null, from: 'APP-NEG-LISTING-PRO · hoja' });
      if (it.k === 'plan') return window.TLHogarPlan ? window.TLHogarPlan.startPlan(C, { biz: b.id, own, key: q.key }) : C.encargo('APP-NEG-HOGAR-PLAN', 'APP-NEG-LISTING-PRO · Servicios · ' + name, ob.name, E2('Empezar un plan', 'Start a plan'));
      if (window.TLHogarFlow) window.TLHogarFlow.start(C, { biz: b.id, own, key: q.key, opt: q.opt || {}, add: q.add || [], stf: q.stf == null ? 'any' : q.stf }); else C.encargo('APP-NEG-HOGAR-BOOKING', 'APP-NEG-LISTING-PRO · Servicios · ' + name, ob.name + ' · ' + name, E2('Booking · Hogar', 'Booking · Home')); };
    const who = ob.m === 'tec' ? PROI[own].first : whoOf(ob, es);
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop,
      name, desc: es ? it.d : it.de || it.d, bg: U(it.ph || ob.ph[0], 700), price: tot, meta: metaOf(it, es),
      groups, adds, hasAdds: adds.length > 0, hasWho: pros.length > 0 || people.length > 1, isPick: pros.length > 0, isStaff: people.length > 1, pros, people, stf: q.stf == null ? 'any' : q.stf, onStf: id => up({ stf: id }),
      whoPend: false, whoDone: pros.length > 0, whoMeta, hasDep: true, depT: (dp ? E2('Depósito de ' + money(dp) + ' para guardar tu franja: se cobra al enviar y se descuenta del total. ', money(dp) + ' deposit to hold your window: charged when you send, taken off the total. ') : '') + payNote(it, ob, es), total: tot,
      durL: { visita: E2('VISITA', 'VISIT'), fijo: E2('PRECIO CERRADO', 'FIXED PRICE'), hora: E2('POR HORA', 'HOURLY'), area: E2('SE MIDE EN TU CASA', 'MEASURED AT YOUR HOME'), pres: E2('PRESUPUESTO', 'ESTIMATE'), emer: E2('EMERGENCIA 24/7', '24/7 EMERGENCY'), plan: E2('PLAN', 'PLAN') }[it.k],
      cta: bad ? (cp.d > (ob.zone || 15) ? E2('No llega hasta tu casa', 'They don’t reach your home') : E2('Solo con dueños', 'Owners only')) : pendG ? E2('Elige: ', 'Choose: ') + pendG.title.toLowerCase() : it.k === 'emer' ? E2('Pedir ayuda ahora', 'Get help now') : it.k === 'plan' ? E2('Empezar el plan', 'Start the plan') : it.k === 'pres' ? E2('Pedir presupuesto', 'Request estimate') : E2('Elegir franja', 'Choose a window'), dis: !!bad || !!pendG, onGo: go,
      lbl: { req: E2('OBLIGATORIO', 'REQUIRED'), ready: E2('LISTO', 'DONE'), adds: 'Extras', addsM: E2('OPCIONAL · SE SUMAN AL PRECIO Y AL TIEMPO', 'OPTIONAL · ADDS PRICE AND TIME'), who: ob.m === 'tec' && b.m === 'red' ? E2('¿Quién lo hace?', 'Who does it?') : E2('¿Quién va?', 'Who comes?'), any: E2('Cualquiera', 'Anyone'), incK: E2('INCLUYE', 'INCLUDES'), noK: E2('NO INCLUYE', 'NOT INCLUDED') },
      x: { hasPre: !!ob.pro && ['pres', 'visita', 'hora'].includes(it.k) && !bad,
        preT: it.k === 'pres' ? E2('¿Quieres comparar?', 'Want to compare?') : E2('¿No sabes cuánto va a salir?', 'Not sure what it will cost?'),
        preS: it.k === 'pres' ? E2('Manda la misma solicitud a hasta 3 negocios de Hazleton y compara los presupuestos en la app.', 'Send the same request to up to 3 Hazleton businesses and compare estimates in the app.') : E2('Manda fotos o un video y ' + who + ' te da un rango antes de reservar. No te compromete.', 'Send photos or a video and ' + who + ' gives you a range before you book. No commitment.'),
        preCta: it.k === 'pres' ? E2('Pedir a hasta 3', 'Ask up to 3') : E2('Pedir pre-estimado', 'Ask for a pre-estimate'),
        onPre: () => { C.setState({ ash: null }); it.k === 'pres' && window.TLHogarMas ? window.TLHogarMas.startPq(C, { biz: b.id, own, key: q.key }) : window.TLHogarPre ? window.TLHogarPre.start(C, { biz: b.id, own, key: q.key }) : C.encargo('APP-NEG-HOGAR-PREEST', 'APP-NEG-LISTING-PRO · hoja · ' + name, ob.name, E2('Pre-estimado con fotos · Hogar', 'Photo pre-estimate · Home')); },
        hasVeh: true, veh, hasInc: !!(it.inc && it.inc.length), inc: (it.inc || []).map(z => ({ t: es ? z[0] : z[1] })), hasNo: !!(it.no && it.no.length), no: (it.no || []).map(z => ({ t: es ? z[0] : z[1] })) } };
  }

  /* ---------- Hoja Mi casa ---------- */
  const HC0 = { open: false, dlg: false, list: [], fields: [], lbl: {} };
  function casaVals(C, s, es) { const q = s.hcs; if (!q) return HC0;
    const E2 = (x, y) => es ? x : y, dk = s.view === 'desktop', L = casaList(s), cur = casaCur(s), f = q.f || {}, list = q.mode === 'list' && L.length > 0;
    const up = o => C.setState(z => ({ hcs: { ...z.hcs, ...o } })), uf = o => up({ f: { ...f, ...o } });
    const ch = (key, opts) => opts.map(o => { const k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? (es ? o[1] : o[2]) : o; return { l, v: f[key] === k ? 'selected' : 'filter', onClick: () => uf({ [key]: f[key] === k ? '' : k }) }; });
    const F = (k, isChips, o) => Object.assign({ k, isChips, isInput: !isChips, chips: [], val: '', onChange: () => {}, ph: '', hasHint: false, hint: '', hasSuf: false, suf: '' }, o);
    const inp = (key, max, num) => ({ val: f[key] || '', onChange: e => uf({ [key]: num ? e.target.value.replace(/\D/g, '').slice(0, max) : e.target.value.slice(0, max) }) });
    const fields = [
      F(E2('DIRECCIÓN', 'ADDRESS'), false, { ...inp('addr', 60), ph: E2('Ej.: 112 W Oak St, Hazleton', 'E.g. 112 W Oak St, Hazleton') }),
      F(E2('TIPO', 'TYPE'), true, { chips: ch('tipo', TIPO) }),
      F(E2('¿ERES DUEÑO?', 'DO YOU OWN IT?'), true, { chips: ch('own', OWN), hasHint: f.own === 'inq', hint: E2('Para arreglos necesitas el permiso de tu landlord. Te lo pedimos en el Booking; algunos negocios solo trabajan con dueños.', 'For repairs you need your landlord’s permission. We ask for it when you book; some businesses only work with owners.') }),
      F(E2('CUARTOS', 'BEDROOMS'), true, { chips: ch('beds', BEDS) }), F(E2('BAÑOS', 'BATHROOMS'), true, { chips: ch('baths', BATHS) }),
      F(E2('PIES² · OPCIONAL', 'SQ FT · OPTIONAL'), false, { ...inp('sqft', 5, 1), ph: E2('Ej.: 1400', 'E.g. 1400'), hasSuf: true, suf: E2('PIE²', 'SQ FT') }),
      F(E2('AÑO DE LA CASA', 'YEAR BUILT'), true, { chips: ch('yr', YR), hasHint: f.yr === 'pre50', hint: E2('Casas de antes de 1978 pueden tener pintura con plomo: el negocio lo tiene en cuenta al lijar o romper paredes.', 'Homes built before 1978 may have lead paint: the business accounts for it when sanding or opening walls.') }),
      F(E2('MASCOTAS', 'PETS'), true, { chips: ch('pets', PETS) }),
      F(E2('CALEFACCIÓN', 'HEATING'), true, { chips: ch('heat', HEAT) }), F(E2('EDAD DE LA CALEFACCIÓN', 'HEATING AGE'), true, { chips: ch('heatAge', AGE) }),
      F(E2('CALENTADOR DE AGUA', 'WATER HEATER'), true, { chips: ch('wh', WH) }), F(E2('EDAD DEL CALENTADOR', 'WATER HEATER AGE'), true, { chips: ch('whAge', AGE) }),
      F(E2('DÓNDE ESTACIONAR Y CÓMO ENTRAR · OPCIONAL', 'PARKING AND ACCESS · OPTIONAL'), false, { ...inp('park', 120), ph: E2('Ej.: entrada al lado, timbre no sirve', 'E.g. side driveway, doorbell broken') })];
    const canSave = (f.addr || '').trim().length >= 5 && !!f.tipo && !!f.own;
    const save = () => { if (!canSave) return; const nc = { id: 'c-' + Date.now(), ...f, addr: f.addr.trim() }; C.setState(z => ({ casas: (z.casas || []).concat(nc), casaSel: nc.id, hcs: null })); };
    return { open: !dk, dlg: dk, top: (q.top || 80) + 'px', onClose: () => C.setState({ hcs: null }), stop, isList: list, isForm: !list, hasBack: !list && L.length > 0, onBack: () => up({ mode: 'list' }), onAdd: () => up({ mode: 'form', f: {} }),
      list: L.map(c => { const on = !!cur && cur.id === c.id; return { t: casaName(c), s: casaMeta(c, es), tag: c.acc || s.user ? E2('EN TU CUENTA', 'IN YOUR ACCOUNT') : E2('SOLO ESTA VISITA', 'THIS VISIT ONLY'), bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', onClick: () => C.setState({ casaSel: c.id }) }; }),
      fields, note: s.user ? E2('Se guarda en tu cuenta. La dirección exacta solo la ve el negocio que confirma tu visita.', 'Saved to your account. Only the business that confirms your visit sees the exact address.') : E2('Se guarda en tu cuenta cuando entras. Si no entras, solo dura esta visita.', 'It is saved to your account when you sign in. Otherwise it only lasts this visit.'),
      cta: list ? E2('Listo', 'Done') : E2('Guardar casa', 'Save home'), dis: !list && !canSave, onCta: list ? () => C.setState({ hcs: null }) : save,
      lbl: { title: E2('Tu casa', 'Your home'), sub: E2('Con esto te decimos quién llega hasta ahí y el negocio llega preparado.', 'With this we tell you who reaches you and the business comes prepared.'), add: E2('Agregar otra casa', 'Add another home') } };
  }

  /* ---------- Resumen: Hoy y franja de confianza ---------- */
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), c = cfg(b.id);
    if (!b.pro) { const HR = b.hrs || [8, 18]; Object.assign(td, { s: window.TLFreeOn && window.TLFreeOn(b) ? E2('Pide tu franja aquí o llama. Pagas al terminar.', 'Request a window here or call. You pay when done.') : E2('No toma citas en To\'Latino: llama para pedir tu visita. Pagas al terminar.', 'No To\'Latino bookings: call to request a visit. You pay when done.'), cols: [[E2('ZONA', 'AREA'), E2('Hasta ', 'Up to ') + b.zone + ' mi'], tg('h24') ? [E2('EMERGENCIA', 'EMERGENCY'), '24/7'] : [E2('PAGO', 'PAYMENT'), E2('Al terminar', 'When done')], HR[1] >= 24 ? [E2('ABIERTO', 'OPEN'), E2('24 horas', '24 hours')] : [E2('HASTA', 'UNTIL'), fmt(HR[1])]].map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false }); return; }
    const TD = today(b, es); Object.assign(td, { s: TD.s, cols: TD.cols.map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false }); if (TD.t) Object.assign(td, { t: TD.t, dot: TD.dot });
    const mk = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const w = c.warr ? mk('shield', E2('Garantía ', 'Warranty ') + warrL(c.warr, es), 'ok') : tg('seguro') ? mk('shield', E2('Con seguro', 'Insured'), 'info') : null;
    const lic = tg('lic') ? mk('verified', E2('Con licencia', 'Licensed'), 'info') : null;
    const T = [trust[0], trust.find(x => x.icon === 'store'), w, lic || trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }

  window.TLHogarBook = { PROS, PROI, CFG, casaList, casaCur, compat, openCasa, today, listingAdd, sheetVals, casaVals, resAdd, nextWin, nextStaff, winL, rng, cfg, svcs, depOf, priceOf, priceL, metaOf, payNote, flatOf, distOf };
})();
