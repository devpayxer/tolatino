/* Booking de Belleza (NEG-BELL · Barbería y salón) — un solo motor para todos los modelos. Hoy = jue 24 sep 2026, 12:30 PM.
   Modelos: shop = el negocio maneja la agenda (eliges o no con quién) · chair = el local renta sillas: cada silla es su propio negocio
   (m: 'silla', con su página, agenda, precio, depósito y aprobación) · solo = una persona (en su casa · casa, o a domicilio · zone).
   Entrada por servicio (Servicios del local) o por persona (Staff, "Por barbero", su página): las dos llegan a la agenda del dueño de la cita (own).
   CFG[own]: apr = min típicos de respuesta · auto = aprobación automática (opción de cada profesional con silla propia) · dep = depósito (se cobra al enviar, se devuelve si no se confirma)
   (depSecs = solo en esas secciones) · cx = horas para cancelar gratis · tol = min de tolerancia · exp = horas para contestar · wk = horario (0 dom … 6 sáb).
   Vistas (listingAdd, sheetVals, bookVals, citaVals) reciben el componente del prototipo (C) para navegar y guardar estado. */
(function () {
  const BB = window.TLBeauty, BL = window.TLBellL, X = window.TLListing, SD = window.TLStaff, ALL = window.TLAll;
  if (!BB || !BL || !X || !SD || !ALL) return;
  const NOW = 12.5, fmt = X.fmt, W = (...a) => a;
  const PX = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 500);
  const U = (id, h) => 'url(' + PX(id, h) + ')';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const day = i => new Date(2026, 8, 24 + i);
  const money = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  const dur = (m, es) => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  const DS = [['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']];
  const DL = [['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']];
  const MO = [['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']];
  const dayS = (i, es) => { const d = day(i), k = es ? 0 : 1; return i === 0 ? (es ? 'Hoy' : 'Today') : i === 1 ? (es ? 'Mañana' : 'Tomorrow') : DS[k][d.getDay()] + ' ' + d.getDate(); };
  const dayL = (i, es) => { const d = day(i), k = es ? 0 : 1; return es ? DL[0][d.getDay()] + ' ' + d.getDate() + ' ' + MO[0][d.getMonth()] : DL[1][d.getDay()] + ' ' + MO[1][d.getMonth()] + ' ' + d.getDate(); };
  const biz = id => ALL.B.find(b => b.id === id);
  /* Se puede pedir hora: la silla siempre; el resto si da citas (Pro, o Free con solicitudes del mes). */
  const OFF = {}, offOf = b => !!b && !!(OFF[b.m === 'silla' ? b.at : b.id]);
  const canBk = b => !!b && !offOf(b) && (b.m === 'silla' || ((b.tags || []).includes('cita') && (!!b.pro || !!(window.TLFreeOn && window.TLFreeOn(b)))));

  /* Fotos por servicio (Pexels). */
  const SPH = { 'Corte clásico': 34702982, 'Fade': 39559270, 'Corte + barba': 897262, 'Corte de niño': 7697363, 'Arreglo de barba': 8867486, 'Afeitado clásico': 5568407, 'Diseño': 37339533,
    'Blower y planchado': 14615063, 'Rolos': 10028673, 'Peinado de fiesta': 31184235, 'Tinte completo': 8468125, 'Mechas': 29555682, 'Retoque de raíz': 29546551, 'Keratina': 3738339,
    'Hidratación profunda': 8467976, 'Box braids medianas': 4708719, 'Knotless': 10810251, 'Cornrows': 10825829, 'Trenzas de niña': 11482130, 'Sew-in': 7755171, 'Retoque de trenzas': 11482130,
    'Corte a domicilio': 4786272, 'Familia (3 cortes)': 3356174, 'Peinado de novia': 15507425, 'Maquillaje de novia': 16799888, 'Peinado y maquillaje de quinceañera': 26181061, 'Damas y corte': 11652342,
    'Primer corte': 7697399, 'Corte en seco para rizos': 7755215, 'Definición de rizos': 7755651, 'Balayage': 29555469, 'Alisado': 10318055 };

  Object.assign(SPH, { 'Manicura': 29877719, 'Pedicura spa': 7990099, 'Gel polish': 29877719, 'Acrílico · set completo': 10123923, 'Relleno de acrílico': 10123923, 'Diseño a mano': 10123923, 'Extensiones clásicas': 30896215, 'Extensiones de volumen': 30896215, 'Relleno': 30896215, 'Lifting de pestañas': 6089487, 'Laminado de cejas': 30509796, 'Microblading': 30509796, 'Labios': 11956948,
    'Consulta y prueba de piel': 16574941, 'Axilas · una sesión': 11781293, 'Axilas · paquete de 6': 11781293, 'Piernas completas · una sesión': 11781293, 'Borrado de tatuaje pequeño': 33716854, 'Tratamiento de acné': 16574941, 'Masaje relajante · 60 min': 36593691, 'Masaje relajante · 90 min': 36593691, 'Masaje deportivo o profundo': 36593691, 'Masaje en pareja · 60 min': 32767465,
    'Drenaje linfático': 8460603, 'Paquete de 5 drenajes': 8460603, 'Moldeamiento corporal': 18450477, 'Tatuaje pequeño': 20830475, 'Sesión de tatuaje · 3 horas': 7005734, 'Perforación de oreja': 37601638, 'Perforación de nariz': 37601638, 'Maquillaje social': 20186104, 'Peinado y maquillaje': 6954000, 'Manicura y pedicura': 30884522 });
  /* Opciones que cambian precio y tiempo: [título es, en, [[opción es, en, +$, +min]]]. */
  const LEN = (a, b2) => ['Largo del pelo', 'Hair length', [['Corto', 'Short', 0, 0], ['Mediano', 'Medium', a, 15], ['Largo', 'Long', b2, 30]]];
  const BRAID = [['Largo', 'Length', [['Hombros', 'Shoulders', -30, -60], ['Espalda', 'Mid-back', 0, 0], ['Cintura', 'Waist', 50, 90]]], ['El pelo', 'Hair', [['Incluido', 'Included', 0, 0], ['Lo traigo yo', 'I bring my own', -25, 0]]]];
  const OPT = { 'Blower y planchado': [LEN(10, 20)], 'Rolos': [LEN(10, 15)], 'Tinte completo': [LEN(15, 30)], 'Mechas': [['Cuánto', 'How much', [['Parciales', 'Partial', 0, 0], ['Completas', 'Full', 40, 45]]], LEN(15, 30)],
    'Keratina': [['Largo del pelo', 'Hair length', [['Corto', 'Short', -30, -30], ['Mediano', 'Medium', 0, 0], ['Largo', 'Long', 40, 45]]]], 'Alisado': [['Largo del pelo', 'Hair length', [['Corto', 'Short', -30, -30], ['Mediano', 'Medium', 0, 0], ['Largo', 'Long', 40, 45]]]],
    'Balayage': [['Largo del pelo', 'Hair length', [['Hasta los hombros', 'Shoulder length', 0, 0], ['Largo', 'Long', 40, 30]]]], 'Box braids medianas': BRAID, 'Knotless': BRAID };

  /* Extras por local: [es, en, +$, +min, secciones]. */
  const ADD = { 'barberia-el-primo': [['Diseño', 'Design', 5, 10, [0]], ['Cejas con navaja', 'Razor brows', 5, 5]], 'fade-factory': [['Cejas', 'Brows', 5, 5], ['Toalla caliente', 'Hot towel', 5, 5]],
    'salon-glamour': [['Hidratación con vapor', 'Steam treatment', 15, 20], ['Puntas', 'Trim ends', 10, 15, [0]]], 'rizos-color': [['Hidratación profunda', 'Deep conditioning', 20, 20]],
    'trenzas-yaritza': [['Cuentas', 'Beads', 10, 15], ['Lavado antes', 'Wash first', 15, 20]], 'junior-a-domicilio': [['Cejas', 'Brows', 5, 5]], 'pequenos-cortes': [['Diseño', 'Design', 5, 10]],
    'studio-bella-novia': [['Pestañas', 'Lashes', 20, 15], ['Retoque para la fiesta', 'Party touch-up', 40, 30]], 'salon-nuevo-estilo': [['Puntas', 'Trim ends', 10, 15]] };

  const CFG = {
    'salon-glamour': { apr: 20, dep: 15, depSecs: [1, 2], cx: 24, tol: 10, stf: { 'Blower y planchado': [0, 1], 'Rolos': [1, 0], 'Peinado de fiesta': [0], 'Tinte completo': [2, 0], 'Mechas': [2], 'Retoque de raíz': [2, 0], 'Keratina': [1], 'Hidratación profunda': [0, 1, 2] }, prep: 'color' },
    'studio-bella-novia': { apr: 180, exp: 24, dep: 50, cx: 72, tol: 10, evt: 1, zone: 20, wk: W(null, null, [10, 18], [10, 18], [10, 18], [10, 18], [6, 18]) },
    'pequenos-cortes': { apr: 15, cx: 2, tol: 10, kids: 1, wk: W(null, [10, 19], [10, 19], [10, 19], [10, 19], [10, 19], [9, 17]) },
    'salon-nuevo-estilo': { apr: 30, cx: 4, tol: 10, wk: W([11, 17], null, [10, 19], [10, 19], [10, 19], [10, 19], [9, 18]) },
    'trenzas-yaritza': { apr: 60, dep: 40, cx: 24, tol: 15, casa: '217 N Laurel St, Hazleton PA', kids: 1, prep: 'trenzas' },
    'junior-a-domicilio': { apr: 10, cx: 2, tol: 0, win: 1, zone: 10, kids: 1, prep: 'casa' },
    'unas-bella-luz': { apr: 15, cx: 2, tol: 10 },
    'lash-brow-yokasta': { apr: 60, dep: 30, cx: 24, tol: 10 },
    'laser-piel-hazleton': { apr: 60, dep: 25, cx: 24, tol: 10 },
    'manos-de-angel': { apr: 30, dep: 20, cx: 24, tol: 10 },
    'drenaje-altagracia': { apr: 60, dep: 20, cx: 24, tol: 10, wk: W(null, [9, 17], [9, 17], [9, 17], [9, 17], [9, 17], [9, 13]) },
    'tinta-quisqueya': { apr: 120, dep: 50, depSecs: [0], cx: 48, tol: 15 },
    'glam-nathaly': { apr: 30, dep: 20, cx: 24, tol: 0, zone: 15, prep: 'casa' },
  };
  const CH = { 'barberia-el-primo': ['barbero', 'barber', 'Silla', 'Chair', 'barberos', 'barbers'], 'fade-factory': ['barbero', 'barber', 'Silla', 'Chair', 'barberos', 'barbers'], 'rizos-color': ['estilista', 'stylist', 'Estación', 'Station', 'estilistas', 'stylists'] };

  /* Quien renta silla o estación = su propio negocio. j = posición en el Staff del local. who = nombre en las reseñas del local. */
  const PROS = [
    { id: 'silla-luis-batista', at: 'barberia-el-primo', seat: 1, j: 0, who: 'El Primo', first: 'Luis', apr: 15, dep: 10, cx: 4, r: 4.9, n: 88, pr: { 'Corte clásico': 22, 'Fade': 28, 'Corte + barba': 38, 'Corte de niño': 15, 'Arreglo de barba': 14, 'Afeitado clásico': 22 }, work: [18503633, 39559270, 12464841] },
    { id: 'silla-kelvin-rosario', at: 'barberia-el-primo', seat: 2, j: 1, who: 'Kelvin', first: 'Kelvin', auto: 1, dep: 5, cx: 4, r: 4.8, n: 54, pr: { 'Corte clásico': 20, 'Fade': 25, 'Corte + barba': 35, 'Corte de niño': 15, 'Arreglo de barba': 12, 'Afeitado clásico': 20 }, work: [37339533, 39559267, 37339530] },
    { id: 'silla-andy-mejia', at: 'barberia-el-primo', seat: 3, j: 2, who: 'Andy', first: 'Andy', apr: 30, dep: 0, cx: 2, r: 4.7, n: 21, pr: { 'Corte clásico': 18, 'Fade': 22, 'Corte + barba': 30, 'Corte de niño': 12, 'Arreglo de barba': 10 }, work: [7697399, 7697354, 34702982] },
    { id: 'silla-johan-peralta', at: 'barberia-el-primo', seat: 4, j: 3, who: 'Johan', first: 'Johan', apr: 60, dep: 0, cx: 2, r: 0, n: 0, pr: { 'Corte clásico': 20, 'Fade': 25, 'Corte + barba': 32, 'Arreglo de barba': 12, 'Afeitado clásico': 18 }, work: [8867486, 5568407, 36150782] },
    { id: 'silla-dario-almanzar', at: 'fade-factory', seat: 1, own: 1, name: 'Darío Almánzar', first: 'Darío', since: 2019, ph: 897273, apr: 20, dep: 5, cx: 4, r: 4.8, n: 41, pr: { 'Fade': 27, 'Corte + barba': 38, 'Diseño': 12 }, work: [12505400, 39559325, 12464841],
      wk: W([12, 19], null, [10, 21], [10, 21], [10, 21], [10, 21], [10, 20]), langs: ['es', 'en'], sp: [['Fades', 'Fades'], ['Barba con navaja', 'Razor beard']], bio: ['Llevo 12 años cortando. Fades limpios y barba con navaja; si no te gusta en el espejo, lo arreglo ahí mismo.', '12 years cutting. Clean fades and razor beards; if you do not like it in the mirror, I fix it right there.'] },
    { id: 'silla-bryan-cruz', at: 'fade-factory', seat: 3, name: 'Bryan Cruz', first: 'Bryan', since: 2022, ph: 13603680, apr: 45, dep: 0, cx: 2, r: 4.6, n: 19, pr: { 'Fade': 22, 'Corte + barba': 32, 'Diseño': 10 }, work: [29189823, 33448216, 3037244],
      wk: W(null, [12, 21], [12, 21], [12, 21], [12, 21], [12, 21], [10, 18]), langs: ['es'], sp: [['Taper', 'Taper'], ['Diseños', 'Designs']], bio: ['Tapers y diseños a mano alzada. Trabajo de tarde, perfecto si sales de la fábrica.', 'Tapers and freehand designs. I work afternoons, perfect if you are coming off a factory shift.'] },
    { id: 'silla-misael-ortiz', at: 'fade-factory', seat: 4, name: 'Misael Ortiz', first: 'Misael', since: 2020, ph: 5824206, auto: 1, dep: 10, cx: 6, r: 4.9, n: 33, pr: { 'Fade': 30, 'Corte + barba': 40, 'Diseño': 15 }, work: [39559270, 37339533, 12074386],
      wk: W([10, 17], null, null, [10, 20], [10, 20], [10, 21], [10, 21]), langs: ['es', 'en'], sp: [['Diseños', 'Designs'], ['Fades', 'Fades']], bio: ['Diseños con detalle. Activé la confirmación automática: si ves la hora libre, es tuya.', 'Detailed designs. I turned on instant confirmation: if you see the time open, it is yours.'] },
    { id: 'silla-nicole-santana', at: 'rizos-color', seat: 1, own: 1, name: 'Nicole Santana', first: 'Nicole', since: 2017, ph: 8834017, apr: 30, dep: 20, depSecs: [1], cx: 24, r: 4.9, n: 47, pr: { 'Corte en seco para rizos': 65, 'Definición de rizos': 45, 'Balayage': 160, 'Tinte completo': 70 }, work: [7755215, 7755651, 7665704],
      wk: W(null, null, [9, 18], [9, 18], [9, 18], [9, 18], [9, 16]), langs: ['es', 'en'], sp: [['Rizos', 'Curls'], ['Corte en seco', 'Dry cut']], bio: ['Corto el rizo en seco, uno por uno, para que veas cómo cae de verdad. Primera cita: 15 minutos de consulta.', 'I cut curls dry, one by one, so you see how they really fall. First visit: a 15-minute consultation.'] },
    { id: 'silla-laura-pena', at: 'rizos-color', seat: 2, name: 'Laura Peña', first: 'Laura', since: 2021, ph: 8834027, apr: 60, dep: 30, depSecs: [1], cx: 24, r: 4.7, n: 26, pr: { 'Corte en seco para rizos': 55, 'Definición de rizos': 45, 'Balayage': 145, 'Tinte completo': 75 }, work: [29555469, 29555682, 8468125],
      wk: W(null, [11, 20], [11, 20], [11, 20], [11, 20], [11, 20], null), langs: ['es'], sp: [['Balayage', 'Balayage'], ['Color', 'Color']], bio: ['Colorista. Siempre hago prueba de mechón antes de un cambio grande, sin costo.', 'Colorist. I always do a free strand test before a big change.'] },
  ];
  const PROI = {}; PROS.forEach(p => { PROI[p.id] = p; });

  const roleOf = p => p.at === 'rizos-color' ? (p.own ? ['Estilista · dueña del estudio', 'Stylist · studio owner'] : ['Estilista · renta su estación', 'Stylist · rents her station']) : p.j === 0 || p.own ? ['Barbero · dueño del local', 'Barber · shop owner'] : ['Barbero · renta su silla', 'Barber · rents his chair'];
  /* Registrar cada silla como negocio y en el Staff del local. */
  const shopStaff = {};
  PROS.forEach(p => {
    const s = biz(p.at), SP = SD.PEOPLE[p.at] || [], XS = X.STAFF[p.at] || [], cw = CH[p.at];
    if (p.j != null) { const x = XS[p.j], pp = SP[p.j]; p.name = x[0]; p.since = x[3]; p.ph = pp.ph; p.langs = pp.langs; p.sp = pp.sp.filter(c => c[0] !== 'Silla propia'); p.bio = pp.bio; p.wk = pp.wk; }
    const tt = p.wk[4], open = !!tt && NOW >= tt[0] && NOW < tt[1], min = Math.min(...Object.values(p.pr));
    const b = { id: p.id, m: 'silla', at: p.at, seat: p.seat, name: p.name, pro: 1, verified: s.verified, subs: s.subs.slice(0, 2), tags: ['cita', 'online'].concat(p.dep ? ['deposit'] : []), who: s.who,
      r: p.r, n: p.n, d: s.d, open: open ? 1 : 0, hrs: tt || [10, 19], st: open ? 'cierra ' + fmt(tt[1]) : 'abre ' + fmt((tt || [10])[0]), ph: [p.work[0], p.ph, p.work[1], p.work[2]], eta: '', fee: 'Desde $' + min, bell: 1 };
    b.photos = b.ph.map(id => U(id, 350)); { const k0 = ALL.B.findIndex(x => x.id === b.id); if (k0 >= 0) ALL.B[k0] = b; else ALL.B.push(b); }
    const role = roleOf(p);
    X.STAFF[p.id] = [[p.name, role[0], role[1], p.since]];
    SD.PEOPLE[p.id] = [{ ph: p.ph, langs: p.langs, sp: p.sp, bio: p.bio, wk: p.wk, dishes: [], chair: 1 }];
    X.ABOUT[p.id] = [p.bio[0], p.bio[1], p.since]; X.ADDR[p.id] = X.ADDR[p.at];
    X.MENU[p.id] = (BL.SVC[p.at] || []).filter(g => g[0] !== 'Extras').map(([te, tn, its]) => [te, tn, its.filter(it => p.pr[it[0]] != null).map(it => [it[0], it[3] + ' min · ' + it[1], p.pr[it[0]], it[3], 0])]).filter(g => g[2].length);
    CFG[p.id] = { apr: p.apr, auto: p.auto, dep: p.dep, depSecs: p.depSecs, cx: p.cx, tol: 10, wk: p.wk };
    if (p.j == null) { (shopStaff[p.at] = shopStaff[p.at] || []).push(p); }
  });
  Object.keys(shopStaff).forEach(id => { const L = shopStaff[id];
    X.STAFF[id] = L.map(p => [p.name, roleOf(p)[0], roleOf(p)[1], p.since]);
    SD.PEOPLE[id] = L.map(p => ({ ph: p.ph, langs: p.langs, sp: p.sp.concat([[id === 'rizos-color' ? 'Estación propia' : 'Silla propia', id === 'rizos-color' ? 'Own station' : 'Own chair']]), bio: p.bio, wk: p.wk, dishes: [], chair: 1, rate: p.n ? ['★ ' + p.r + ' · ' + p.n + ' reseñas', '★ ' + p.r + ' · ' + p.n + ' reviews'] : '' })); });
  /* Reseñas de cada silla: las del local que lo nombran + las suyas. */
  if (BL.RV) PROS.forEach(p => { const base = (BL.RV[p.at] || []).filter(r => r[9] === p.who); if (base.length) BL.RV[p.id] = base; });

  /* ---------- Motor ---------- */
  const shopOf = own => { const b = biz(own); return b && b.m === 'silla' ? b.at : own; };
  const kindOf = own => { const b = biz(own); return b ? b.m : 'shop'; };
  const firstOf = own => { const b = biz(own); if (!b) return ''; if (b.m === 'silla') return PROI[own].first; if (b.m === 'solo') { const x = (X.STAFF[own] || [])[0]; return x ? x[0].split(' ')[0] : b.name; } return b.name; };
  const cfg = own => CFG[own] || {};
  const apr = own => { const c = cfg(own); return { auto: !!c.auto, mins: c.apr || 30, exp: c.exp || 2 }; };
  const aprL = (own, es) => { const a = apr(own); return a.auto ? (es ? 'CONFIRMA AL INSTANTE' : 'CONFIRMS INSTANTLY') : (es ? 'RESPONDE EN ~' : 'REPLIES IN ~') + (a.mins >= 60 ? Math.round(a.mins / 60) + ' H' : a.mins + ' MIN'); };
  const aprT = (own, es) => { const a = apr(own); return a.auto ? (es ? 'Al instante' : 'Instantly') : '~' + (a.mins >= 60 ? Math.round(a.mins / 60) + ' h' : a.mins + ' min'); };
  const aprC = own => apr(own).auto ? ['rgba(0,229,196,.18)', '#00695B'] : ['rgba(255,176,32,.2)', '#8A5A00'];
  /* Dónde y a quién se paga el resto (Booking · Revisa y envía, estado de la cita). */
  function restWhereOf(own, ev, es) { const E2 = (x, y) => es ? x : y, b = biz(own), c = cfg(own), who1 = firstOf(own);
    if (ev) return ev.where === 'place' ? E2('en tu lugar', 'at your place') : E2('en el estudio', 'at the studio');
    return b.m === 'silla' ? E2('en la silla de ' + who1, 'at ' + who1 + "'s chair") : b.casa ? E2('en su casa', 'at her home') : b.m === 'solo' && c.zone && b.tags.includes('domicilio') ? E2('en tu casa, al terminar', 'at your place, when done') : E2('en el local', 'at the shop'); }
  function payHowOf(own, es) { const E2 = (x, y) => es ? x : y, b = biz(own), who1 = firstOf(own);
    return b.m === 'silla' ? E2('Efectivo o tarjeta, a ' + who1 + '. No al local.', 'Cash or card, to ' + who1 + '. Not to the shop.') : b.m === 'solo' ? E2('Efectivo o tarjeta, a ' + who1 + '.', 'Cash or card, to ' + who1 + '.') : E2('Efectivo o tarjeta.', 'Cash or card.'); }
  function svcs(own) { return (X.MENU[own] && biz(own) && biz(own).m === 'silla' ? X.MENU[own].map(([te, tn, its]) => [te, tn, its.map(it => [it[0], it[1].replace(/^\d+ min · /, ''), it[2], it[3]])]) : (BL.SVC[own] || [])).filter(g => g[0] !== 'Extras'); }
  function findSvc(own, n) { const S = svcs(own); for (let k = 0; k < S.length; k++) { const it = S[k][2].find(x => x[0] === n); if (it) return { sec: k, te: S[k][0], tn: S[k][1], n: it[0], d: it[1], p: it[2], mi: it[3] }; } return null; }
  function addsFor(own, sec) { return (ADD[shopOf(own)] || []).map((a, i) => ({ a, i })).filter(x => !x.a[4] || x.a[4].includes(sec)); }
  function priceOf(own, n, opt, add, evt) {
    const sv = findSvc(own, n); if (!sv) return { total: 0, min: 30, dep: 0, lines: [], sv: null };
    let p = sv.p, m = sv.mi || 30; const lines = [[n, sv.p]], ol = [];
    (OPT[n] || []).forEach((g, gi) => { const o = g[2][(opt || {})[gi]]; if (!o) return; p += o[2]; m += o[3]; ol.push([g, o]); if (o[2]) lines.push([o[0], o[2]]); });
    const al = addsFor(own, sv.sec).filter(x => (add || []).includes(x.i)); al.forEach(x => { p += x.a[2]; m += x.a[3]; lines.push([x.a[0], x.a[2]]); });
    if (evt) { if (evt.damas) { p += evt.damas * 65; lines.push(['Damas × ' + evt.damas, evt.damas * 65]); } if (evt.where === 'place') { p += 40; lines.push(['Traslado', 40]); } }
    const c = cfg(own), dep = c.dep && (!c.depSecs || c.depSecs.includes(sv.sec)) ? c.dep : 0;
    return { total: p, min: m, dep, lines, sv, ol, al };
  }
  const hasPriceOpts = n => (OPT[n] || []).some(g => g[2].some(o => o[2] > 0));
  function wkOf(own, stf) { const b = biz(own), c = cfg(own);
    const hasW = p => !!(p && p.wk && p.wk.some(Boolean));
    if (stf != null && stf !== 'any' && hasW((SD.PEOPLE[own] || [])[stf])) return SD.PEOPLE[own][stf].wk;
    if (c.wk) return c.wk; if (b && b.m === 'solo' && hasW((SD.PEOPLE[own] || [])[0])) return SD.PEOPLE[own][0].wk;
    if (b && !b.pro) { const h = b.hrs || [9, 19], cl = b.closed || [1]; return W(...[0, 1, 2, 3, 4, 5, 6].map(d => cl.includes(d) ? null : h)); }
    const h = (b && b.hrs) || [9, 19]; return W(null, h, h, h, h, h, [h[0], Math.min(h[1], 17)]); }
  function free1(own, stf, i, h, m) { const tt = wkOf(own, stf)[day(i).getDay()]; if (!tt || h < tt[0] || h + m / 60 > tt[1] + 1e-6) return false; if (i === 0 && h < NOW + .5) return false;
    const dw = day(i).getDay(), dens = .3 + (dw === 5 || dw === 6 ? .16 : 0) + (i === 0 ? .1 : 0) + (m >= 180 ? .2 : 0);
    return hash(own + '|' + stf + '|' + i + '|' + h + '|' + (m >= 180 ? 'L' : '')) >= dens; }
  function slotsFor(own, stf, i, m, evt) {
    const c = cfg(own), ids = stf === 'any' && c.stf ? null : null; let list = [];
    const idxs = (stf === 'any' || stf == null) && (SD.PEOPLE[own] || []).length > 1 && biz(own).m === 'shop' ? (SD.PEOPLE[own] || []).map((_, k) => k) : null;
    const wks = idxs ? idxs.map(k => wkOf(own, k)) : [wkOf(own, stf)], tts = wks.map(w => w[day(i).getDay()]).filter(Boolean);
    if (!tts.length) return [];
    let a = Math.min(...tts.map(t => t[0])), z = Math.max(...tts.map(t => t[1])); if (evt) { a = Math.max(a, 6); z = Math.min(z, 11.5 + m / 60); }
    const step = m >= 180 ? 1 : .5;
    for (let h = a; h + m / 60 <= z + 1e-6; h += step) {
      if (idxs) { const k = idxs.find(k => free1(own, k, i, h, m)); if (h >= a && !(i === 0 && h < NOW + .5)) list.push({ h, free: k != null, who: k }); }
      else if (!(i === 0 && h < NOW + .5)) list.push({ h, free: free1(own, stf == null ? 'any' : stf, i, h, m) });
    }
    return list; }
  function nextFree(own, stf, m, from) { for (let i = from || 0; i < 21; i++) { const x = slotsFor(own, stf, i, m).find(y => y.free); if (x) return { i, h: x.h }; } return null; }
  function nextN(own, stf, m, n, skip) { const out = []; for (let i = 0; i < 21 && out.length < n; i++) slotsFor(own, stf, i, m).filter(y => y.free && !(skip && skip.i === i && skip.h === y.h)).slice(0, 2).forEach(y => { if (out.length < n) out.push({ i, h: y.h }); }); return out; }
  const EVD = [9, 16, 23, 30, 37, 44];
  const evtSt = i => { const x = hash('evt|' + i); return x < .22 ? 'full' : x < .45 ? 'few' : 'free'; };
  const ADDRS = [['casa', 'Casa', 'Home', '412 Alter St, Apt 2', 1.2], ['trabajo', 'Trabajo', 'Work', 'Humboldt Industrial Park', 6.8], ['mama', 'Casa de mamá', "Mom's", '88 S Main St, Wilkes-Barre', 24]];

  /* Próxima hora libre en el Staff de los locales. */
  const nxL = (nx, es) => nx ? dayS(nx.i, es) + ' ' + fmt(nx.h) : '';
  Object.keys(CH).forEach(id => (SD.PEOPLE[id] || []).forEach((pp, k) => { const p = PROS.filter(x => x.at === id)[k]; if (!p) return; const nx = nextFree(p.id, null, 40); pp.next = nx ? ['Próxima hora libre: ' + nxL(nx, true), 'Next opening: ' + nxL(nx, false)] : ''; }));
  (SD.PEOPLE['salon-glamour'] || []).forEach((pp, k) => { const nx = nextFree('salon-glamour', k, 60); pp.next = nx ? ['Próxima hora libre: ' + nxL(nx, true), 'Next opening: ' + nxL(nx, false)] : ''; });

  const stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', bg: '#fff', dim: 1, sFg: 'rgba(11,14,18,.5)' });

  /* ---------- Hoy (TodayCard) ---------- */
  function today(b, es) {
    const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), wt = /espera (\d+ min)/.exec(b.eta || ''), c = cfg(b.id), cols = [];
    if (b.m === 'silla') { const p = PROI[b.id], tt = p.wk[4], nx = nextFree(b.id, null, 40);
      return { t: b.open ? E2('En su silla hasta las ', 'In the chair until ') + fmt(tt[1]) : tt ? E2('Hoy entra a las ', 'Starts today at ') + fmt(tt[0]) : E2('Hoy no trabaja', 'Off today'), dot: b.open ? '#00A88F' : '#FFB020',
        s: apr(b.id).auto ? E2(p.first + ' confirma al instante: si ves la hora libre, es tuya.', p.first + ' confirms instantly: if you see the time open, it is yours.') : E2(p.first + ' responde en unos ' + apr(b.id).mins + ' min. Tu solicitud se guarda 2 horas.', p.first + ' replies in about ' + apr(b.id).mins + ' min. Your request holds for 2 hours.'),
        cols: [[E2('PRÓXIMA HORA', 'NEXT OPENING'), nxL(nx, es) || '—'], [E2('RESPONDE', 'REPLIES'), aprT(b.id, es)], [E2('DEPÓSITO', 'DEPOSIT'), p.dep ? money(p.dep) : E2('No pide', 'None')]] }; }
    if (!tg('cita')) { const ps = [].concat(...svcs(b.id).map(g => g[2].map(x => x[2]))).filter(x => x > 0), kk = BL.kindOf ? BL.kindOf(b) : '', wig = kk === 'wig', store = ['natural', 'supply'].includes(kk);
      if (store) return { s: E2('Es una tienda: pasas cuando quieras, sin cita.', 'It is a store: stop by anytime, no appointment.'), cols: [[E2('SIN CITA', 'WALK-IN'), E2('Pasa cuando quieras', 'Stop by anytime')], [E2('CIERRA', 'CLOSES'), fmt((b.hrs || [9, 19])[1])], [E2('PRECIO', 'PRICE'), ps.length ? E2('Desde ', 'From ') + money(Math.min(...ps)) : '—']] };
      return { s: wig ? E2('Sin cita: pasas, te mides y te atienden.', 'No appointment: stop by, try on and get served.') : E2('Sin cita: llegas, te sientas y esperas turno.', 'Walk-in only: come in, sit down and wait your turn.'), cols: [[E2('SIN CITA', 'WALK-IN'), wt ? E2('Espera ', 'Wait ') + wt[1] : wig ? E2('Pasa y mídetela', 'Stop by') : E2('Llegas y esperas', 'Walk in')], [E2('CIERRA', 'CLOSES'), fmt((b.hrs || [9, 19])[1])], [E2('PRECIO', 'PRICE'), b.fee ? b.fee.replace('Desde', E2('Desde', 'From')) : ps.length ? E2('Desde ', 'From ') + money(Math.min(...ps)) : '—']] }; }
    if (b.m === 'chair') { const L = PROS.filter(p => p.at === b.id && !p.off), on = L.filter(p => p.wk[4]).length, nx = L.map(p => nextFree(p.id, null, 40)).filter(Boolean).sort((x, y) => x.i - y.i || x.h - y.h)[0], w = CH[b.id];
      return { s: E2('Llega y espera turno, o haz Booking con el ' + w[0] + ' que quieras.', 'Walk in and wait, or book the ' + w[1] + ' you want.'), cols: [[E2('SIN CITA', 'WALK-IN'), wt ? E2('Espera ', 'Wait ') + wt[1] : '—'], [E2('HOY TRABAJAN', 'IN TODAY'), on + E2(' de ', ' of ') + L.length], [E2('PRÓXIMA HORA', 'NEXT OPENING'), nxL(nx, es) || '—']] }; }
    const S = svcs(b.id), m0 = S[0] && S[0][2][0] ? S[0][2][0][3] : 40, nx = nextFree(b.id, 'any', m0);
    if (b.soloCita) cols.push(b.casa ? [E2('DÓNDE', 'WHERE'), E2('En su casa', 'At her home')] : (c.zone || b.zone) && tg('domicilio') ? [E2('A DOMICILIO', 'MOBILE'), E2('Hasta ', 'Up to ') + (c.zone || b.zone) + ' mi'] : [E2('CITA', 'BOOKING'), E2('Solo cita', 'By appointment')]);
    else cols.push([E2('SIN CITA', 'WALK-IN'), wt ? E2('Espera ', 'Wait ') + wt[1] : BL.kindOf && BL.kindOf(b) === 'tattoo' ? E2('Perforaciones', 'Piercings') : E2('Llegas y esperas', 'Walk in')]);
    cols.push([E2('PRÓXIMA HORA', 'NEXT OPENING'), nxL(nx, es) || '—']);
    cols.push([E2('DEPÓSITO', 'DEPOSIT'), c.dep ? (c.depSecs ? (BL.kindOf && BL.kindOf(b) === 'tattoo' ? E2('Tatuajes ', 'Tattoos ') + money(c.dep) : E2('Color y trat.', 'Color & treat.')) : money(c.dep)) : E2('No pide', 'None')]);
    const who = firstOf(b.id);
    if (!canBk(b)) return { s: E2('Llama para pedir tu hora o pasa por el local.', 'Call for a time or stop by.'), cols };
    return { s: b.soloCita ? E2('Con cita. Haz Booking y ' + (b.m === 'solo' ? who + ' te confirma' : 'el negocio confirma') + ' tu hora.', 'By appointment. Book and ' + (b.m === 'solo' ? who + ' confirms' : 'the business confirms') + ' your time.') : E2('Llega y espera turno, o haz Booking para tener tu hora.', 'Walk in and wait, or book to hold your time.'), cols };
  }

  /* ---------- Ficha: pestaña Servicios, hoja del servicio, tarjeta de la silla, columna desktop ---------- */
  function mineFor(s, b) { return (s.citas || []).filter(c => ['pend', 'ok', 'alt'].includes(c.st) && (c.own === b.id || c.shop === b.id)).slice(-1)[0]; }
  function mineCard(C, s, es, c) { const E2 = (x, y) => es ? x : y, T = { pend: [E2('PENDIENTE', 'PENDING'), 'action'], ok: [E2('CONFIRMADA', 'CONFIRMED'), 'signal'], alt: [E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), 'action'] }[c.st];
    return { k: E2('TU CITA', 'YOUR BOOKING'), tag: T[0], tone: T[1], t: c.svc + ' · ' + dayS(c.i, es) + ' · ' + fmt(c.h), s: (c.st === 'pend' ? E2(firstOf(c.own) + ' responde en ~' + apr(c.own).mins + ' min', firstOf(c.own) + ' replies in ~' + apr(c.own).mins + ' min') : c.st === 'ok' ? E2('Con ', 'With ') + c.withL : E2('Toca para ver la hora que te propone', 'Tap to see the proposed time')),
      onClick: () => C.nav({ code: 'APP-NEG-CITA', biz: c.biz, cid: c.id, from: 'APP-NEG-LISTING · Tu cita' }) }; }
  function listingAdd(C, s, es, b, V, setTab) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, kind = b.m, can = canBk(b), w = CH[b.id] || CH[b.at], dk = s.view === 'desktop';
    const openSheet = (n, own) => e => { stop(e); C.setState({ bsh: { biz: b.id, own: own || (kind === 'chair' ? null : b.id), svc: n, opt: {}, add: [], stf: s.bkStf && s.bkStf.biz === b.id ? s.bkStf.k : 'any' }, bshTop: dk ? C.vTop() : 0 }); };
    const L = PROS.filter(p => p.at === b.id && !p.off);
    const secs = svcs(b.id).map(([te, tn, its]) => ({ title: (es ? te : tn).toUpperCase(), items: its.map(([n, d, p0, mi]) => {
      let price, meta = mi || kind === 'silla' ? [dur(mi || 30).toUpperCase()] : [];
      if (kind === 'chair') { const ps = L.filter(p => p.pr[n] != null).map(p => p.pr[n]), lo = Math.min(...ps), hi = Math.max(...ps); price = ps.length ? (lo === hi ? money(lo) : money(lo) + '–' + money(hi)) : money(p0); meta.push(ps.length + ' ' + (ps.length === 1 ? E2(w[0], w[1]) : E2(w[4], w[5])).toUpperCase()); }
      else { const P = priceOf(b.id, n, {}, [], null); price = (hasPriceOpts(n) ? E2('Desde ', 'From ') : '') + money(p0); if (P.dep) meta.push(E2('DEPÓSITO ', 'DEPOSIT ') + money(P.dep)); }
      return { name: n, desc: d, bg: SPH[n] ? U(SPH[n], 200) : 'none', meta: meta.join(' · '), price, can, cur: can ? 'pointer' : 'default', onOpen: can ? openSheet(n) : () => {}, onBook: openSheet(n), btnL: 'Booking' }; }) }));
    const mode = kind === 'chair' ? (s.svMode && s.svMode.biz === b.id ? s.svMode.m : 'svc') : 'svc';
    const modes = kind === 'chair' ? [['svc', E2('Por servicio', 'By service'), 'scissors'], ['pro', E2('Por ' + w[0], 'By ' + w[1]), 'users']].map(([k, l, icon]) => ({ l, icon, bg: mode === k ? '#fff' : 'transparent', sh: mode === k ? '0 1px 3px rgba(11,14,18,.12)' : 'none', fg: mode === k ? '#0B0E12' : 'rgba(11,14,18,.55)', onClick: () => C.setState({ svMode: { biz: b.id, m: k } }) })) : [];
    const pros = L.map(p => { const pb = biz(p.id), nx = nextFree(p.id, null, 40), [ab, af] = aprC(p.id), mn = Math.min(...Object.values(p.pr));
      return { name: p.name, ph: U(p.ph, 240), seat: (E2(w[2], w[3]) + ' ' + p.seat).toUpperCase(), meta: (p.n >= 5 ? '★ ' + p.r + ' · ' + p.n + E2(' RESEÑAS', ' REVIEWS') : p.n > 0 ? p.n + E2(' RESEÑAS', ' REVIEWS') : E2('NUEVO EN SU SILLA', 'NEW IN HIS CHAIR')) + ' · ' + E2('DESDE ', 'FROM ') + money(mn),
        apr: aprL(p.id, es), aprBg: ab, aprFg: af, next: nx ? E2('Próxima hora: ', 'Next opening: ') + (es ? dayS(nx.i, es).toLowerCase() : dayS(nx.i, es)) + ' ' + fmt(nx.h) : E2('Sin horas esta semana', 'No openings this week'), nextFg: nx && nx.i === 0 ? '#00695B' : 'rgba(11,14,18,.6)',
        pageL: E2('Ver su página', 'See profile'), pageIc: 'store', onPage: e => { stop(e); C.openBiz(pb, 'APP-NEG-LISTING-PRO · Servicios · Por persona'); }, onBook: e => { stop(e); C.openBiz(pb, 'APP-NEG-LISTING-PRO · Servicios · Booking'); C.setState({ ltab: 'svc' }); } }; });
    const c = cfg(b.id), notes = [];
    if (kind === 'chair') { notes.push(['users', E2('Cada ' + w[0] + ' renta su ' + w[2].toLowerCase() + ' y pone su precio. Aquí ves el rango; el precio exacto, al elegir con quién.', 'Each ' + w[1] + ' rents their ' + w[3].toLowerCase() + ' and sets their price. Here you see the range; the exact price when you choose who.')]);
      if (b.chairs > L.length) notes.push(['clock', E2(b.chairs + ' ' + (w[2] === 'Estación' ? 'estaciones' : w[2].toLowerCase() + 's') + ' en el local: ' + L.length + ' toman citas aquí. ' + (b.chairs - L.length === 1 ? 'La otra atiende' : 'Las otras ' + (b.chairs - L.length) + ' atienden') + ' solo sin cita.', b.chairs + ' ' + w[3].toLowerCase() + 's: ' + L.length + ' take bookings here, the rest walk-ins only.')]); }
    if (kind === 'silla') { const p = PROI[b.id]; notes.push(['dollar', E2(p.first + ' pone estos precios y ' + p.first + ' cobra. El local solo le renta la ' + w[2].toLowerCase() + '.', p.first + ' sets these prices and ' + p.first + ' gets paid. The shop only rents the ' + w[3].toLowerCase() + '.')]);
      notes.push([p.auto ? 'check' : 'clock', p.auto ? E2(p.first + ' activó la confirmación automática: si ves la hora libre, es tuya.', p.first + ' turned on instant confirmation: if the time is open, it is yours.') : E2(p.first + ' responde en unos ' + p.apr + ' min. Tu solicitud se guarda 2 horas.', p.first + ' replies in about ' + p.apr + ' min. Your request holds for 2 hours.')]); }
    if (!can && pro && offOf(b)) notes.push(['clock', E2('Por ahora no toma citas en línea: llama o pasa por el local.', 'Not taking online bookings right now: call or stop by.')]);
    else if (!can && pro) notes.push(['clock', E2('Sin cita: llegas y esperas turno.' + (/espera/.test(b.eta || '') ? ' Ahora: ' + b.eta.replace('Sin cita · ', '') + '.' : ''), 'Walk-in only: come in and wait your turn.')]);
    if (kind !== 'chair' && c.dep && can) notes.push(['lock', c.depSecs ? E2('Color y tratamientos piden depósito de ' + money(c.dep) + ': se cobra al enviar y se descuenta del total. Si no se confirma, te lo devolvemos.', 'Color and treatments need a ' + money(c.dep) + ' deposit: charged when you send, taken off the total. Refunded if not confirmed.') : E2('Depósito de ' + money(c.dep) + ': se cobra al enviar y se descuenta del total. Si no se confirma, te lo devolvemos.', money(c.dep) + ' deposit: charged when you send, taken off the total. Refunded if not confirmed.')]);
    if (kind === 'silla' && PROI[b.id].dep) notes.push(['lock', E2('Depósito de ' + money(PROI[b.id].dep) + ': se cobra al ' + (PROI[b.id].auto ? 'confirmar' : 'enviar') + ' y se descuenta del total. Si no se confirma, te lo devolvemos.', money(PROI[b.id].dep) + ' deposit: charged when you ' + (PROI[b.id].auto ? 'confirm' : 'send') + ', taken off the total. Refunded if not confirmed.')]);
    if (b.casa) notes.push(['pin', E2('Atiende en su casa en ' + b.casa + '. La dirección exacta te llega al confirmar la cita.', 'Works from home on ' + b.casa + '. The exact address arrives when the booking is confirmed.')]);
    if (c.zone && b.tags.includes('domicilio')) notes.push(['truck', E2('A domicilio hasta ' + c.zone + ' mi de Hazleton.' + (c.evt ? ' Traslado $40.' : ' El traslado va incluido.'), 'Mobile service up to ' + c.zone + ' mi from Hazleton.' + (c.evt ? ' $40 travel.' : ' Travel included.'))]);
    const mc = mineFor(s, b);
    V.sv = { isChair: kind === 'chair', modes, bySvc: mode === 'svc', byPro: mode === 'pro', secs, pros, notes: notes.map(([icon, t]) => ({ icon, t })), hasMine: !!mc, mine: mc ? mineCard(C, s, es, mc) : {},
      lbl: { page: E2('Ver su página', 'See profile'), book: 'Booking' } };
    V.sh = s.bsh && s.bsh.biz === b.id ? sheetVals(C, s, es, b) : { groups: [], adds: [], pros: [], people: [], lbl: {} };
    V.itemsTop = [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta.charAt(0) + it.meta.slice(1).toLowerCase(), price: it.price }));
    const mn = kind === 'chair' ? Math.min(...[].concat(...L.map(p => Object.values(p.pr)))) : null; if (mn != null && isFinite(mn)) V.fromLabel = E2('Desde ', 'From ') + money(mn);
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, can ? { cta: 'Booking', ctaIcon: 'calendar', onCta: toSvc, barCta: 'Booking', barOn: toSvc, barIcon: 'calendar' } : pro && !b.casa && !(kind === 'solo' && b.zone && b.tags.includes('domicilio')) ? { cta: E2('Cómo llegar', 'Directions'), ctaIcon: 'pin', onCta: V.onDirections, barCta: E2('Cómo llegar', 'Directions'), barOn: V.onDirections, barIcon: 'pin' } : { cta: E2('Llamar', 'Call'), ctaIcon: 'phone', onCta: V.onCall, barCta: E2('Llamar', 'Call'), barOn: V.onCall, barIcon: 'phone' });
    if (kind === 'silla') { const p = PROI[b.id], sb = biz(b.at), open = !!b.open;
      V.silla = { has: true, k: (E2(w[2] + ' ' + p.seat + ' · desde ' + p.since, w[3] + ' ' + p.seat + ' · since ' + p.since)).toUpperCase(), name: sb.name, meta: ((X.ADDR[b.at] || '').replace(', Hazleton PA', '') + E2(' · VER EL LOCAL', ' · SEE THE SHOP')).toUpperCase(), logo: U(sb.ph[0], 200), onClick: () => C.openBiz(sb, 'APP-NEG-LISTING-PRO · ' + p.name + ' · su local') };
      V.subsLine = E2((p.at === 'rizos-color' ? 'Estilista' : 'Barbero') + ' · ' + w[2] + ' ' + p.seat + ' en ' + sb.name, (p.at === 'rizos-color' ? 'Stylist' : 'Barber') + ' · ' + w[3] + ' ' + p.seat + ' at ' + sb.name);
      const tt = p.wk[4]; Object.assign(V, { stLabel: open ? E2('Trabajando', 'Working') : E2('No está ahora', 'Not in now'), stRest: '· ' + (open ? E2('hasta las ', 'until ') + fmt(tt[1]) : tt ? E2('entra a las ', 'starts at ') + fmt(tt[0]) : E2('hoy no trabaja', 'off today')), stNote: (open ? E2('HASTA ', 'UNTIL ') + fmt(tt[1]) : tt ? E2('ENTRA ', 'STARTS ') + fmt(tt[0]) : E2('HOY LIBRE', 'OFF TODAY')), stDot: open ? '#00A88F' : '#FFB020', stColor: open ? '#00695B' : '#8A5A00', addrMeta: (b.d + E2(' MI · EN ', ' MI · AT ') + sb.name).toUpperCase(), barSub: aprL(b.id, es) });
      if (V.hp && V.hp.hpWeek) V.hp = { ...V.hp, hpWeek: V.hp.hpWeek.map((r, i) => { const t2 = p.wk[(i + 1) % 7]; return { ...r, lines: t2 ? [{ ...r.lines[0], range: fmt(t2[0]) + ' – ' + fmt(t2[1]) }] : [{ range: E2('Libre', 'Off'), type: '', color: 'rgba(11,14,18,.12)', dash: 'transparent', fg: 'rgba(11,14,18,.45)', weight: 600 }], tag: '', tagDisp: 'none' }; }) };
    } else V.silla = { has: false };
    const rows = kind === 'silla' ? today(b, es).cols : today(b, es).cols;
    { const who = kind === 'silla' ? PROI[b.id].first : kind === 'solo' ? firstOf(b.id) : '';
      const away = !!b.casa || (kind === 'solo' && !!b.zone && b.tags.includes('domicilio'));
      V.railNote = !can ? (b.tags.includes('cita') ? (offOf(b) ? E2('Por ahora no toma citas en línea: ', 'Not taking online bookings right now: ') : '') + (away ? E2('llama para pedir tu hora.', 'call for a time.') : E2('llama para pedir tu hora o pasa por el local. Pagas en el local.', 'call for a time or stop by. Pay in store.')).replace(/^./, x => offOf(b) ? x : x.toUpperCase()) : ['natural', 'supply'].includes(BL.kindOf ? BL.kindOf(b) : '') ? E2('Es una tienda: pasas cuando quieras. Pagas en la tienda.', 'It is a store: stop by anytime. Pay in store.') : E2('Aquí no se reserva: llegas y esperas turno. Pagas en el local.', 'No bookings here: walk in and wait your turn. Pay in store.'))
        : apr(b.id).auto ? E2((who || 'Confirman') + (who ? ' confirma' : '') + ' al instante: si ves la hora libre, es tuya. Si pide depósito, se cobra al confirmar.', (who ? who + ' confirms' : 'Confirmed') + ' instantly: if the time is open, it is yours. Any deposit is charged on confirmation.')
        : E2('Booking es una solicitud: ' + (kind === 'chair' ? 'confirma la persona que elijas' : who ? who + ' confirma' : 'el negocio confirma') + '. Si pide depósito, se retiene y solo se cobra al confirmar.', 'Booking is a request: ' + (kind === 'chair' ? 'the person you pick confirms' : who ? who + ' confirms' : 'the business confirms') + '. Any deposit is held and only charged on confirmation.'); }
    V.bkRail = { has: pro, rows: rows.map(([k, v]) => ({ k, v })), note: V.railNote, hasMine: !!mc, mine: V.sv.mine };
    V.railOrder = false;
    if (pro && kind === 'chair') V.barSub = (b.eta || '').toUpperCase();
  }
  function sheetVals(C, s, es, b) {
    const E2 = (x, y) => es ? x : y, q = s.bsh, kind = b.m, chair = kind === 'chair', own = q.own, w = CH[b.id] || CH[b.at] || [], dk = s.view === 'desktop';
    const up = o => C.setState(z => ({ bsh: { ...z.bsh, ...o } }));
    const sv = findSvc(own || b.id, q.svc) || findSvc(b.id, q.svc); if (!sv) return { groups: [], adds: [], pros: [], people: [], lbl: {} };
    const groups = (OPT[q.svc] || []).map(([te, tn, os], gi) => { const sel = (q.opt || {})[gi]; return { title: es ? te : tn, meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: sel != null,
      opts: os.map(([oe, on, dp, dm]) => ({ label: (es ? oe : on) + (dm ? ' · ' + (dm > 0 ? '+' : '−') + Math.abs(dm) + ' min' : ''), price: dp ? (dp > 0 ? '+' : '−') + '$' + Math.abs(dp) : '', selected: false })).map((o, oi) => ({ ...o, selected: sel === oi })), onToggle: oi => up({ opt: { ...(q.opt || {}), [gi]: oi } }) }; });
    const adds = addsFor(own || b.id, sv.sec).map(({ a, i }) => ({ label: (es ? a[0] : a[1]) + ' · ' + a[3] + ' min', price: '+$' + a[2], checked: (q.add || []).includes(i), onToggle: () => up({ add: (q.add || []).includes(i) ? q.add.filter(x => x !== i) : (q.add || []).concat(i) }) }));
    const cand = chair ? PROS.filter(p => p.at === b.id && !p.off && p.pr[q.svc] != null) : [];
    const pros = cand.map(p => { const P = priceOf(p.id, q.svc, q.opt, q.add), nx = nextFree(p.id, null, P.min), on = own === p.id, [ab, af] = aprC(p.id);
      return { name: p.name, ph: U(p.ph, 200), seat: (E2(w[2], w[3]) + ' ' + p.seat).toUpperCase(), meta: (p.n >= 5 ? '★ ' + p.r : E2('NUEVO', 'NEW')) + (nx ? ' · ' + E2('PRÓX ', 'NEXT ') + nxL(nx, es).toUpperCase() : ''), price: money(P.total), dep: P.dep ? E2('DEPÓSITO ', 'DEPOSIT ') + money(P.dep) : E2('SIN DEPÓSITO', 'NO DEPOSIT'),
        apr: aprL(p.id, es), aprBg: ab, aprFg: af, bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', pad: on ? '11.5px' : '12px', onClick: () => up({ own: p.id }) }; });
    const c = cfg(b.id), sidx = kind === 'shop' && c.stf && !c.pick0 ? (c.stf[q.svc] || []).filter(k => !((SD.PEOPLE[b.id] || [])[k] || {}).off) : [];
    const ownP = own || (chair ? null : b.id), P = ownP ? priceOf(ownP, q.svc, q.opt, q.add) : null;
    const people = sidx.map(k => { const pp = SD.PEOPLE[b.id][k], nm = X.STAFF[b.id][k][0], nx = nextFree(b.id, k, P ? P.min : 60); return { id: k, name: nm.split(' ')[0], image: PX(pp.ph, 200), next: nx ? (nx.i === 0 ? fmt(nx.h) : dayS(nx.i, es)).toUpperCase() : '', soon: !!nx && nx.i === 0 }; });
    const stfName = q.stf !== 'any' && q.stf != null && X.STAFF[b.id] && X.STAFF[b.id][q.stf] ? X.STAFF[b.id][q.stf][0].split(' ')[0] : null;
    const ps = cand.map(p => priceOf(p.id, q.svc, q.opt, q.add).total), rng = ps.length ? (Math.min(...ps) === Math.max(...ps) ? money(ps[0]) : money(Math.min(...ps)) + '–' + money(Math.max(...ps))) : money(sv.p);
    const pendG = groups.find(g => !g.done), needWho = chair && !own, who1 = ownP ? firstOf(ownP) : '';
    const depT = P && P.dep ? E2('Depósito de ' + money(P.dep) + ': se cobra al ' + (apr(ownP).auto ? 'confirmar' : 'enviar') + ' y se descuenta del total. Si ' + who1 + ' no confirma, te lo devolvemos completo.', money(P.dep) + ' deposit: charged when you ' + (apr(ownP).auto ? 'confirm' : 'send') + ', taken off the total. If ' + who1 + ' does not confirm, you get it all back.') : '';
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ bsh: null }), stop,
      name: q.svc, desc: sv.d, bg: SPH[q.svc] ? U(SPH[q.svc], 700) : U(b.ph[0], 700), price: P ? money(P.total) : rng, meta: (dur(P ? P.min : sv.mi || 30) + (chair && !own ? E2(' · varía por ' + w[0], ' · varies by ' + w[1]) : '')).toUpperCase(),
      groups, adds, hasAdds: adds.length > 0, hasWho: chair || people.length > 0, isPick: chair, isStaff: people.length > 0, pros, people, stf: q.stf == null ? 'any' : q.stf, onStf: id => up({ stf: id }),
      whoPend: needWho, whoDone: chair && !!own, whoMeta: chair ? E2('CADA UNO PONE SU PRECIO Y SU AGENDA', 'EACH SETS THEIR OWN PRICE AND SCHEDULE') : stfName ? (E2('CON ', 'WITH ') + stfName).toUpperCase() : E2('CUALQUIERA: TE TOCA QUIEN ESTÉ LIBRE', 'ANYONE: WHOEVER IS FREE'),
      hasDep: !!depT, depT, total: P ? money(P.total) : rng, durL: (P ? dur(P.min) : dur(sv.mi || 30)).toUpperCase(),
      cta: pendG ? E2('Elige: ', 'Choose: ') + pendG.title.toLowerCase() : needWho ? E2('Elige con quién', 'Choose who') : E2('Elegir día y hora', 'Choose day and time'), dis: !!pendG || needWho,
      onGo: () => { if (pendG || needWho) return; start(C, { biz: b.id, own: ownP, svc: q.svc, opt: q.opt || {}, add: q.add || [], stf: q.stf == null ? 'any' : q.stf }); },
      lbl: { req: E2('OBLIGATORIO', 'REQUIRED'), ready: E2('LISTO', 'DONE'), adds: 'Extras', addsM: E2('OPCIONAL · SE SUMAN AL TIEMPO', 'OPTIONAL · ADDS TIME'), who: E2('¿Con quién?', 'With whom?'), any: E2('Cualquiera', 'Anyone') } };
  }

  /* ---------- Booking ---------- */
  function start(C, q, extra) {
    const c = cfg(q.own), sv = findSvc(q.own, q.svc), kid = /niño|niña|Primer corte/i.test(q.svc) || (c.kids && biz(q.own).id === 'pequenos-cortes');
    const P = priceOf(q.own, q.svc, q.opt, q.add), nx = nextFree(q.own, q.stf, P.min);
    const bk = { biz: q.biz, own: q.own, shop: shopOf(q.own), svc: q.svc, opt: q.opt || {}, add: q.add || [], stf: q.stf == null ? 'any' : q.stf, i: nx ? nx.i : 0, h: null, as: null, step: 0,
      who: kid ? 'kid' : 'me', whoN: '', kidA: '', note: '', ph: [], sms: true, addr: 'casa', evt: c.evt ? { type: 0, date: null, where: 'studio', damas: 0 } : null, card2: false, declined: false, ...(extra || {}) };
    C.setState({ bsh: null, bk }); C.nav({ code: 'APP-NEG-BOOKING', biz: q.biz, from: 'APP-NEG-LISTING · Servicios' }); C.scrollTop();
  }
  function bookVals(C, s, es) {
    const E2 = (x, y) => es ? x : y, q = s.bk, b = biz(q.own), sb = biz(q.biz), shop = biz(q.shop), kind = b.m, c = cfg(q.own), A = apr(q.own), dk = s.view === 'desktop', w = CH[q.shop] || [];
    const up = o => C.setState(z => ({ bk: { ...z.bk, ...o } })), P = priceOf(q.own, q.svc, q.opt, q.add, q.evt), sv = P.sv;
    const steps = q.evt ? ['evt', 'time', 'det', 'rev'] : ['time', 'det', 'rev'], si = Math.min(q.step, steps.length - 1), st = steps[si];
    const who1 = firstOf(q.own), stfName = kind === 'shop' && q.stf !== 'any' && q.stf != null && X.STAFF[q.own] ? X.STAFF[q.own][q.stf][0] : null;
    const back = () => { C.setState({ ltab: 'svc', bk: null }); C.nav({ code: sb.pro ? 'APP-NEG-LISTING-PRO' : 'APP-NEG-LISTING-FREE', biz: q.biz, from: 'APP-NEG-BOOKING' }); };
    const reopen = () => { C.setState({ ltab: 'svc', bk: null, bsh: { biz: q.biz, own: kind === 'silla' || sb.m !== 'chair' ? q.own : q.own, svc: q.svc, opt: q.opt, add: q.add, stf: q.stf }, bshTop: dk ? 80 : 0 }); C.nav({ code: sb.pro ? 'APP-NEG-LISTING-PRO' : 'APP-NEG-LISTING-FREE', biz: q.biz, from: 'APP-NEG-BOOKING · Cambiar' }); };
    /* Evento (novias y quinceañeras) */
    const ev = q.evt, evt = ev ? {
      types: [['Boda', 'Wedding'], ['Quinceañera', 'Quinceañera'], ['Otra fiesta', 'Other party']].map(([a, z], k) => ({ l: es ? a : z, v: ev.type === k ? 'selected' : 'filter', onClick: () => up({ evt: { ...ev, type: k } }) })),
      dates: EVD.map(i => { const x = evtSt(i), on = ev.date === i, d = day(i); return { dow: DS[es ? 0 : 1][d.getDay()].toUpperCase(), d: d.getDate() + ' ' + MO[es ? 0 : 1][d.getMonth()].toUpperCase(), st: x === 'full' ? E2('OCUPADA', 'BOOKED') : x === 'few' ? E2('POCAS HORAS', 'FEW TIMES') : E2('LIBRE', 'OPEN'),
        stFg: on ? 'rgba(255,255,255,.75)' : x === 'full' ? 'rgba(11,14,18,.35)' : x === 'few' ? '#8A5A00' : '#00695B', bg: on ? '#0B0E12' : '#fff', fg: on ? '#fff' : x === 'full' ? 'rgba(11,14,18,.35)' : '#0B0E12', bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', cur: x === 'full' ? 'default' : 'pointer', strike: x === 'full' ? 'line-through' : 'none',
        onClick: () => { if (x !== 'full') up({ evt: { ...ev, date: i }, i, h: null }); } }; }),
      wheres: [['studio', E2('En el estudio', 'At the studio'), (X.ADDR[q.own] || '').replace(', Hazleton PA', '')], ['place', E2('En tu lugar', 'At your place'), E2('Casa, salón o iglesia · hasta 20 mi · +$40 traslado', 'Home, venue or church · up to 20 mi · +$40 travel')]].map(([k, l, sub]) => ({ l, s: sub, ...radio(ev.where === k), onClick: () => up({ evt: { ...ev, where: k } }) })),
      damas: ev.damas, onDec: () => up({ evt: { ...ev, damas: Math.max(0, ev.damas - 1) } }), onInc: () => up({ evt: { ...ev, damas: Math.min(6, ev.damas + 1) } }),
      lbl: { typeK: E2('¿QUÉ CELEBRAS?', 'WHAT ARE YOU CELEBRATING?'), dateK: E2('FECHA DEL EVENTO', 'EVENT DATE'), dateS: E2('Sábados con equipo disponible. Otra fecha: pregúntales.', 'Saturdays with the team available. Another date: ask them.'), whereK: E2('¿DÓNDE TE PREPARAS?', 'WHERE DO YOU GET READY?'), damasT: E2('Damas o familia', 'Bridesmaids or family'), damasS: E2('$65 por persona · peinado o maquillaje', '$65 per person · hair or makeup'), trial: E2('La prueba va incluida: la agendan contigo al confirmar, de 2 a 4 semanas antes del evento.', 'The trial is included: they schedule it with you after confirming, 2 to 4 weeks before.') } } : { types: [], dates: [], wheres: [], lbl: {} };
    /* Quién atiende */
    const c0 = cfg(q.own), sidx = kind === 'shop' && c0.stf ? (c0.stf[q.svc] || []) : [];
    const people = sidx.map(k => { const pp = SD.PEOPLE[q.own][k], nm = X.STAFF[q.own][k][0], nx = nextFree(q.own, k, P.min); return { id: k, name: nm.split(' ')[0], image: PX(pp.ph, 200), next: nx ? (nx.i === 0 ? fmt(nx.h) : dayS(nx.i, es)).toUpperCase() : '', soon: !!nx && nx.i === 0 }; });
    const pPh = kind === 'silla' ? PROI[q.own].ph : kind === 'solo' && SD.PEOPLE[q.own] ? SD.PEOPLE[q.own][0].ph : b.ph[1] || b.ph[0];
    const [ab, af] = aprC(q.own);
    const whoCard = { ph: U(pPh, 200), name: kind === 'silla' ? PROI[q.own].name : kind === 'solo' && X.STAFF[q.own] ? X.STAFF[q.own][0][0] : b.name,
      line: (kind === 'silla' ? E2(w[2], w[3]) + ' ' + PROI[q.own].seat + ' · ' + shop.name : b.casa ? E2('En su casa · ', 'At home · ') + b.casa : c.zone && b.tags.includes('domicilio') && kind === 'solo' ? E2('Va a tu casa · hasta ', 'Comes to you · up to ') + c.zone + ' mi' : (X.ADDR[q.own] || '').replace(', Hazleton PA', '')).toUpperCase(), apr: aprL(q.own, es), aprBg: ab, aprFg: af, canChange: sb.m === 'chair' };
    /* Día y hora */
    const di = ev ? ev.date : q.i, sl = di == null ? [] : slotsFor(q.own, q.stf, di, P.min, !!ev);
    const days = [...Array(14)].map((_, i) => ({ id: 'd' + i, dow: i === 0 ? E2('HOY', 'TODAY') : DS[es ? 0 : 1][day(i).getDay()].toUpperCase(), num: String(day(i).getDate()), off: !slotsFor(q.own, q.stf, i, P.min).some(x => x.free) }));
    const groups = [[E2('MAÑANA', 'MORNING'), x => x.h < 12], [E2('TARDE', 'AFTERNOON'), x => x.h >= 12 && x.h < 17], [E2('NOCHE', 'EVENING'), x => x.h >= 17]].map(([k, f]) => ({ k, slots: sl.filter(f).map(x => ({ t: fmt(x.h), taken: !x.free })) })).filter(g => g.slots.length);
    const hasFree = sl.some(x => x.free), nx = di != null && !hasFree && !ev ? nextFree(q.own, q.stf, P.min, di + 1) : null, aKey = q.own + '|' + di;
    const end = q.h != null ? q.h + P.min / 60 : null;
    const endNote = q.h == null ? '' : c.win ? E2(who1 + ' llega entre las ' + fmt(q.h) + ' y las ' + fmt(q.h + .5) + ' · ' + dur(P.min), who1 + ' arrives between ' + fmt(q.h) + ' and ' + fmt(q.h + .5) + ' · ' + dur(P.min)) : E2('De ' + fmt(q.h) + ' a ~' + fmt(end) + ' · ' + dur(P.min), 'From ' + fmt(q.h) + ' to ~' + fmt(end) + ' · ' + dur(P.min));
    const asName = kind === 'shop' && (q.stf === 'any' || q.stf == null) && q.as != null && X.STAFF[q.own] ? X.STAFF[q.own][q.as][0].split(' ')[0] : null;
    const agenda = kind === 'silla' ? E2('Estas horas son de la agenda de ' + who1 + '. El local puede estar abierto y su ' + w[2].toLowerCase() + ' ocupada.', 'These times come from ' + who1 + "'s own schedule. The shop can be open while the " + w[3].toLowerCase() + ' is busy.')
      : people.length ? (q.stf === 'any' ? E2('Con "Cualquiera" ves todas las horas del salón' + (asName ? '. A esa hora te atiende ' + asName + '.' : '; te toca quien esté libre.'), 'With "Anyone" you see every salon time' + (asName ? '. At that time ' + asName + ' takes you.' : '; whoever is free takes you.')) : E2('Horas de la agenda de ' + stfName.split(' ')[0] + '.', 'Times from ' + stfName.split(' ')[0] + "'s schedule."))
      : P.min >= 180 ? E2(who1 + ' atiende a una clienta a la vez: solo ves horas en que cabe tu servicio completo.', who1 + ' takes one client at a time: you only see times that fit your full service.') : ev ? E2('Empiezan temprano para que llegues lista. Hora de empezar el día del evento.', 'They start early so you are ready on time. Start time on the event day.') : '';
    const time = { days, day: 'd' + (q.i || 0), onDay: id => up({ i: +id.slice(1), h: null, as: null }), groups, hasSlots: hasFree, tSel: q.h != null ? fmt(q.h) : '',
      onSlot: t => { const x = sl.find(y => fmt(y.h) === t && y.free); if (x) up({ h: x.h, as: x.who != null ? x.who : null }); }, hasEnd: q.h != null, endNote, hasAgenda: !!agenda, agenda,
      hasPeople: people.length > 0, people, stf: q.stf == null ? 'any' : q.stf, onStf: id => up({ stf: id, h: null, as: null }),
      none: !hasFree && di != null, noneT: E2('No quedan horas el ' + dayL(di || 0, es), 'No times left on ' + dayL(di || 0, es)), hasNext: !!nx, nextL: nx ? E2('Ver el ' + dayS(nx.i, es).toLowerCase() + ' · desde las ' + fmt(nx.h), 'See ' + dayS(nx.i, es) + ' · from ' + fmt(nx.h)) : '', onNext: () => nx && up({ i: nx.i, h: null }),
      alertOn: !!(s.bkAlert || {})[aKey], alertL: (s.bkAlert || {})[aKey] ? E2('Te avisamos por SMS si se libera una hora', 'We will text you if a time opens up') : E2('Avísame si se libera una hora', 'Tell me if a time opens up'), onAlert: () => C.setState(z => ({ bkAlert: { ...(z.bkAlert || {}), [aKey]: !(z.bkAlert || {})[aKey] } })),
      evtDate: ev && ev.date != null ? dayL(ev.date, es) : '', isEvt: !!ev, notEvt: !ev,
      lbl: { dayK: E2('DÍA', 'DAY'), timeK: ev ? E2('HORA DE EMPEZAR', 'START TIME') : E2('HORA', 'TIME'), whoK: E2('¿CON QUIÉN?', 'WITH WHOM?'), any: E2('Cualquiera', 'Anyone'), change: E2('Cambiar', 'Change') } };
    /* Detalles */
    const u = s.user, kidOK = !!c.kids || /niño|niña|Primer corte/i.test(q.svc) || b.tags.includes('kids');
    const whos = [['me', E2('Para mí', 'For me'), u ? u.name + ' · ' + u.phone : E2('Con los datos de tu cuenta', 'With your account details')], ['other', E2('Para otra persona', 'For someone else'), E2('Tú recibes los avisos', 'You get the updates')], kidOK ? ['kid', E2('Para un niño o niña', 'For a child'), E2('Hasta 12 años · tú lo acompañas', 'Up to 12 · you come along')] : null].filter(Boolean).map(([k, l, sub]) => ({ l, s: sub, ...radio(q.who === k), onClick: () => up({ who: k }) }));
    const needAddr = (kind === 'solo' && c.zone && b.tags.includes('domicilio')) || (ev && ev.where === 'place'), zone = c.zone || 10;
    const addrs = ADDRS.map(([k, le, ln, a, d]) => { const ok = d <= zone, on = q.addr === k; return { l: (es ? le : ln) + ' · ' + a, s: ok ? (d + E2(' MI · DENTRO DE SU ZONA', ' MI · INSIDE THE AREA')) : (d + E2(' MI · FUERA DE SU ZONA (LLEGA HASTA ' + zone + ' MI)', ' MI · OUTSIDE THE AREA (UP TO ' + zone + ' MI)')), ...radio(on && ok), sFg: ok ? '#00695B' : '#C0392B', dim: ok ? 1 : .55, onClick: () => ok && up({ addr: k }) }; });
    const addrOk = !needAddr || ADDRS.some(x => x[0] === q.addr && x[4] <= zone);
    const phPool = [SPH[q.svc], ...b.ph].filter(Boolean);
    const prep = [];
    if (c.prep === 'trenzas') prep.push(['info', E2('Llega con el pelo lavado, seco y desenredado. Trae algo de comer: son varias horas.', 'Come with hair washed, dry and detangled. Bring a snack: it takes hours.')]);
    if (c.prep === 'color' && sv && sv.sec === 1) prep.push(['info', E2('Para color hacen prueba de mechón al llegar (10 min, sin costo).', 'For color they do a strand test when you arrive (10 min, free).')]);
    if (c.prep === 'casa') prep.push(['home', E2(who1 + ' lleva silla, capa y aspiradora. Solo necesita un espacio cerca de un enchufe.', who1 + ' brings chair, cape and vacuum. Just needs a spot near an outlet.')]);
    if (/Primer corte/.test(q.svc)) prep.push(['smile', E2('Te dan certificado y un mechón de recuerdo.', 'You get a certificate and a lock of hair to keep.')]);
    const notePh = /Trenzas|Box|Knotless|Cornrows|Sew/.test(q.svc) ? E2('Ej.: largo hasta la cintura, color 1B, sin cuentas', 'E.g.: waist length, color 1B, no beads') : sv && [1, 2].includes(sv.sec) && kind !== 'chair' && q.shop === 'salon-glamour' ? E2('Ej.: tengo el pelo teñido, quiero dos tonos más claro', 'E.g.: my hair is dyed, I want two shades lighter') : q.who === 'kid' ? E2('Ej.: es su primer corte y le dan miedo las máquinas', 'E.g.: first haircut, scared of clippers') : ev ? E2('Ej.: peinado recogido con velo, maquillaje natural', 'E.g.: updo with veil, natural makeup') : E2('Ej.: fade bajo, dejar largo arriba, sin diseño', 'E.g.: low fade, keep length on top, no design');
    const whoOk = q.who === 'me' || (q.who === 'other' && q.whoN.trim().length > 1) || (q.who === 'kid' && q.whoN.trim().length > 1 && !!q.kidA);
    const det = { whos, isOther: q.who === 'other', isKid: q.who === 'kid', whoN: q.whoN, onWhoN: e => up({ whoN: e.target.value.slice(0, 40) }), ages: ['1–3', '4–7', '8–12'].map(a => ({ l: a + E2(' años', ' yrs'), v: q.kidA === a ? 'selected' : 'filter', onClick: () => up({ kidA: a }) })),
      needAddr, addrs, note: q.note, onNote: e => up({ note: e.target.value.slice(0, 280) }), notePh, phs: q.ph.map((id, k) => ({ bg: U(id, 240), onRm: () => up({ ph: q.ph.filter((_, j) => j !== k) }) })), canPh: q.ph.length < 3, onPh: () => up({ ph: q.ph.concat(phPool[q.ph.length % phPool.length]) }),
      prep: prep.map(([icon, t]) => ({ icon, t })), hasPrep: prep.length > 0, sms: q.sms, smsBg: q.sms ? '#0B0E12' : 'rgba(11,14,18,.18)', smsX: q.sms ? '18px' : '0px', onSms: () => up({ sms: !q.sms }),
      lbl: { whoK: E2('¿PARA QUIÉN ES?', 'WHO IS IT FOR?'), nameK: q.who === 'kid' ? E2('NOMBRE DEL NIÑO O NIÑA', "CHILD'S NAME") : E2('NOMBRE', 'NAME'), namePh: E2('Nombre y apellido', 'First and last name'), ageK: E2('EDAD', 'AGE'), addrK: ev ? E2('DIRECCIÓN DEL LUGAR', 'VENUE ADDRESS') : E2('¿A DÓNDE VA ' + who1.toUpperCase() + '?', 'WHERE DOES ' + who1.toUpperCase() + ' GO?'), addAddr: E2('Otra dirección', 'Another address'),
        noteK: (E2('NOTA PARA ', 'NOTE FOR ') + (stfName ? stfName.split(' ')[0] : who1)).toUpperCase(), phK: E2('FOTO DE REFERENCIA · OPCIONAL', 'REFERENCE PHOTO · OPTIONAL'), phAdd: E2('Agregar', 'Add'), smsT: E2('Recordatorio por SMS', 'SMS reminder'), smsS: E2('24 horas y 2 horas antes', '24 hours and 2 hours before') } };
    /* Revisión */
    const whoL = q.who === 'me' ? (u ? u.name : E2('Tú', 'You')) : q.who === 'kid' ? (q.whoN || E2('Tu hijo o hija', 'Your child')) + (q.kidA ? ' · ' + q.kidA + E2(' años', ' yrs') : '') : q.whoN || E2('Otra persona', 'Someone else');
    const withL = kind === 'silla' ? PROI[q.own].name + ' · ' + E2(w[2], w[3]).toLowerCase() + ' ' + PROI[q.own].seat : stfName ? stfName : kind === 'shop' && people.length ? E2('Cualquiera', 'Anyone') + (asName ? ' · ' + asName : '') : kind === 'solo' ? whoCard.name : b.name;
    const whereL = kind === 'solo' && c.zone && b.tags.includes('domicilio') ? (ADDRS.find(x => x[0] === q.addr) || ADDRS[0])[3] + E2(' · en tu casa', ' · at your place') : b.casa ? b.casa + E2(' · dirección exacta al confirmar', ' · exact address on confirmation') : ev && ev.where === 'place' ? (ADDRS.find(x => x[0] === q.addr) || ADDRS[0])[3] : (X.ADDR[q.own] || '').replace(', Hazleton PA', '');
    const optL = (P.ol || []).map(([g, o]) => es ? o[0] : o[1]).join(' · '), addL = (P.al || []).map(x => es ? x.a[0] : x.a[1]).join(' · ');
    const rows = [[E2('SERVICIO', 'SERVICE'), q.svc + (optL ? ' · ' + optL : '')], addL ? [E2('EXTRAS', 'EXTRAS'), addL] : null, ev ? [E2('EVENTO', 'EVENT'), [['Boda', 'Wedding'], ['Quinceañera', 'Quinceañera'], ['Otra fiesta', 'Other party']][ev.type][es ? 0 : 1] + (ev.damas ? ' · ' + E2('+' + ev.damas + ' damas', '+' + ev.damas + ' guests') : '')] : null,
      [E2('CUÁNDO', 'WHEN'), di != null && q.h != null ? dayL(di, es) + ' · ' + (c.win ? fmt(q.h) + '–' + fmt(q.h + .5) : fmt(q.h) + ' – ' + fmt(end)) : E2('Elige día y hora', 'Choose day and time')], [E2('CON', 'WITH'), withL], [E2('DÓNDE', 'WHERE'), whereL], [E2('PARA', 'FOR'), whoL]].filter(Boolean).map(([k, v], i) => ({ k, v, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const optD = (P.ol || []).reduce((n, [g, o]) => n + o[2], 0), optG = (P.ol || []).map(([g, o]) => (es ? g[0] : g[1]) + ': ' + (es ? o[0] : o[1]).toLowerCase()).join(' · ');
    const lines = [{ k: q.svc, sub: optG, hasSub: !!optG, v: money((sv ? sv.p : 0) + optD) }].concat((P.al || []).map(x => ({ k: es ? x.a[0] : x.a[1], sub: '', hasSub: false, v: money(x.a[2]) })),
      ev && ev.damas ? [{ k: E2('Damas o familia × ', 'Guests × ') + ev.damas, sub: E2('$65 por persona', '$65 per person'), hasSub: true, v: money(ev.damas * 65) }] : [], ev && ev.where === 'place' ? [{ k: E2('Traslado', 'Travel'), sub: E2('Hasta 20 mi', 'Up to 20 mi'), hasSub: true, v: money(40) }] : []);
    const rest = P.total - (P.dep || 0), PM = window.TLPay, pm = q.pm || 'v4242', card = PM ? PM.label(s, pm) : 'Visa ·· 4242', WB = PM ? PM.bal(s) : 18.4;
    const depBox = !P.dep ? { t: E2('No pide depósito', 'No deposit'), s: E2('No se cobra nada ahora. ' + (c.win ? 'Pagas al terminar, en efectivo o tarjeta.' : 'Pagas todo en el local.'), 'Nothing is charged now. ' + (c.win ? 'Pay when done, cash or card.' : 'Pay everything at the shop.')), bg: 'rgba(11,14,18,.04)', bd: 'rgba(11,14,18,.08)', fg: 'rgba(11,14,18,.6)', hasCard: false }
      : A.auto ? { t: money(P.dep) + E2(' de depósito', ' deposit'), s: E2(who1 + ' confirma al instante: se cobra al confirmar y se descuenta de tus ' + money(P.total) + '. En el local pagas ' + money(rest) + '.', who1 + ' confirms instantly: charged on confirmation and taken off your ' + money(P.total) + '. You pay ' + money(rest) + ' at the shop.'), bg: 'rgba(0,229,196,.1)', bd: 'rgba(0,168,143,.3)', fg: '#00695B', hasCard: true, cardN: E2('SE COBRA AL CONFIRMAR', 'CHARGED ON CONFIRMATION') }
      : { t: money(P.dep) + E2(' de depósito al enviar', ' deposit when you send'), s: E2('Se cobra ahora y se descuenta de tus ' + money(P.total) + '. Si ' + who1 + ' no puede, te propone otra hora; si no se ponen de acuerdo o no contesta en ' + A.exp + ' horas, te devolvemos los ' + money(P.dep) + '. En el local pagas ' + money(rest) + '.', 'Charged now and taken off your ' + money(P.total) + '. If ' + who1 + ' cannot, they propose another time; if you do not agree or there is no reply in ' + A.exp + ' hours, we refund the ' + money(P.dep) + '. You pay ' + money(rest) + ' at the shop.'), bg: 'rgba(255,176,32,.12)', bd: 'rgba(255,176,32,.4)', fg: '#8A5A00', hasCard: true, cardN: E2('SE COBRA AL ENVIAR · SE DEVUELVE SI NO CONFIRMAN', 'CHARGED WHEN YOU SEND · REFUNDABLE') };
    const openPm = () => PM && PM.open(C, { ctx: 'bk', amt: P.dep || 0, wallet: true, sel: pm, declined: q.declined ? (q.declinedId || 'v4242') : null, note: (E2('PARA TU DEPÓSITO DE ', 'FOR YOUR ') + money(P.dep || 0) + E2('', ' DEPOSIT') + ' · ' + (A.auto ? E2('SE COBRA AL CONFIRMAR', 'CHARGED ON CONFIRMATION') : E2('SE COBRA AL ENVIAR', 'CHARGED WHEN YOU SEND'))) });
    Object.assign(depBox, { card, onCard: openPm });
    const pol = [P.dep ? null : ['clock', E2('Cancelar: gratis hasta ' + (c.cx || 2) + ' h antes. Después: avísale por aquí.', 'Free cancellation up to ' + (c.cx || 2) + ' h before. After that, let them know here.')],
      c.win ? ['truck', E2('Te avisamos cuando ' + who1 + ' vaya en camino.', 'We let you know when ' + who1 + ' is on the way.')] : ['users', E2('Tolerancia: ' + (c.tol || 10) + ' min. Más tarde, ' + (kind === 'shop' ? 'el negocio' : who1) + ' puede darte otra hora.', 'Grace period: ' + (c.tol || 10) + ' min. Later than that, you may get another time.')],
      A.auto ? ['check', E2(who1 + ' confirma al instante.', who1 + ' confirms instantly.')] : ['bell', E2((kind === 'shop' ? b.name : who1) + ' tiene ' + A.exp + ' h para contestar. Suele tardar ' + (A.mins >= 60 ? Math.round(A.mins / 60) + ' h' : A.mins + ' min') + '.', (kind === 'shop' ? b.name : who1) + ' has ' + A.exp + ' h to reply. Usually ' + (A.mins >= 60 ? Math.round(A.mins / 60) + ' h' : A.mins + ' min') + '.')],
      b.casa ? ['pin', E2('La dirección exacta te llega cuando ' + who1 + ' confirme.', 'The exact address arrives when ' + who1 + ' confirms.')] : null].filter(Boolean).map(([ic, l]) => ({ ic, l }));
    /* Pago: precio → total del servicio → cómo se paga (hoy / el día de la cita) → qué pasa con el depósito. */
    const old = q.chgOf ? (s.citas || []).find(x => x.id === q.chgOf && ['pend', 'ok', 'alt'].includes(x.st)) : null, dep = P.dep || 0, carry = old && old.dep ? Math.min(old.dep, dep) : 0, due = dep - carry, rw = restWhereOf(q.own, ev, es), dayB = di != null ? cap(dayL(di, es)) : E2('El día de tu cita', 'On the day');
    const pay = { hasBar: dep > 0, fa: dep, fb: Math.max(rest, 0.001), hasCard: due > 0, card: u ? card : E2('Tu tarjeta', 'Your card'), cardN: !u ? E2('ENTRA PARA ELEGIRLA', 'SIGN IN TO CHOOSE IT') : pm === 'wal' ? E2('SE DESCUENTA DE TU SALDO DE ', 'TAKEN FROM YOUR ') + money(WB) + E2('', ' BALANCE') : A.auto ? E2('EL DEPÓSITO SE COBRA AL CONFIRMAR', 'DEPOSIT CHARGED ON CONFIRMATION') : E2('EL DEPÓSITO SE COBRA AL ENVIAR', 'DEPOSIT CHARGED WHEN YOU SEND'), onCard: openPm,
      isW: !!u && pm === 'wal', isB: !!u && pm !== 'wal', guest: !u, b: PM ? PM.badge(s, pm) : 'VISA', chg: u ? E2('Cambiar', 'Change') : E2('Elegir', 'Choose'),
      rows: [carry ? { k: E2('Ya pagado', 'Already paid'), s: E2('Depósito de tu cita actual. Pasa a la nueva cuando ' + who1 + ' confirme; no se cobra otra vez.', 'Deposit from your current booking. It moves to the new one once ' + who1 + ' confirms; you are not charged again.'), v: money(carry), dot: '#00A88F', fg: '#00695B' } : dep ? { k: A.auto ? E2('Hoy, al confirmar', 'Today, on confirmation') : E2('Hoy, al enviar', 'Today, when you send'), s: E2('Depósito. Se descuenta del total.', 'Deposit. Taken off the total.'), v: money(dep), dot: '#0B0E12', fg: '#0B0E12' } : { k: E2('Hoy', 'Today'), s: E2('No pide depósito. No se cobra nada ahora.', 'No deposit. Nothing is charged now.'), v: '$0', dot: 'rgba(11,14,18,.18)', fg: 'rgba(11,14,18,.45)' },
        { k: dayB + ', ' + rw, s: payHowOf(q.own, es), v: money(rest), dot: dep ? 'rgba(11,14,18,.18)' : '#0B0E12', fg: '#0B0E12' }] };
    const refund = E2('Te devolvemos ', 'We refund ') + money(dep), GR = '#00695B';
    const out = { has: dep > 0, t: (E2('Tu depósito de ', 'Your deposit of ') + money(dep)).toUpperCase(), foot: !u ? E2('Los reembolsos vuelven a la tarjeta con que pagas, en 3 a 5 días hábiles.', 'Refunds go back to the card you pay with, in 3 to 5 business days.') : pm === 'wal' ? E2('Los reembolsos vuelven al instante a tu Wallet.', 'Refunds go back to your Wallet instantly.') : E2('Los reembolsos vuelven a tu ' + card + ' en 3 a 5 días hábiles.', 'Refunds go back to your ' + card + ' in 3 to 5 business days.'),
      rows: (carry ? [[E2(who1 + ' confirma la nueva hora', who1 + ' confirms the new time'), E2('El depósito pasa a la nueva', 'The deposit moves over'), GR], [E2('No la confirma o no contesta', 'Not confirmed or no reply'), E2('Sigues con tu cita actual', 'You keep your current booking'), '#4B37F5']] : A.auto ? [] : [[E2(who1 + ' no puede a esa hora', who1 + ' cannot make that time'), E2('Te propone otra', 'Proposes another'), '#4B37F5'], [E2('No te sirve la otra hora, o no tiene otra', 'The new time does not work, or there is none'), refund, GR], [E2('No contesta en ' + A.exp + ' h', 'No reply in ' + A.exp + ' h'), refund, GR]])
        .concat([[E2('Cancelas hasta ' + (c.cx || 2) + ' h antes', 'You cancel up to ' + (c.cx || 2) + ' h before'), refund, GR], [E2('Cancelas después o no llegas', 'You cancel later or do not show'), E2('Se queda con ', 'Kept by ') + who1, '#C0392B']])
        .map(([k, v, fg], i) => ({ k, v, fg, bt: i ? '1px solid rgba(11,14,18,.07)' : 'none' })) };
    const payK = dep ? E2('HOY PAGAS', 'TODAY YOU PAY') : 'TOTAL', payV = dep ? money(due) : money(P.total);
    const payNote = carry ? (E2('NADA NUEVO HOY · RESTO ', 'NOTHING NEW TODAY · REST ') + money(rest) + ' · ' + rw).toUpperCase() : dep ? (E2('RESTO ', 'REST ') + money(rest) + ' · ' + rw).toUpperCase() : (E2('NO SE COBRA NADA AHORA · PAGAS ', 'NOTHING CHARGED NOW · PAY ') + rw).toUpperCase();
    const ready = di != null && q.h != null && whoOk && addrOk && (!ev || ev.date != null);
    const miss = di == null || q.h == null ? E2('Elige día y hora', 'Choose day and time') : !whoOk ? E2('Falta el nombre', 'Name missing') : !addrOk ? E2('Elige una dirección dentro de su zona', 'Choose an address inside the area') : '';
    const submitL = q.chgOf ? (A.auto ? E2('Cambiar a esta hora', 'Move to this time') : E2('Pedir el cambio', 'Request the change')) : A.auto ? E2('Confirmar cita', 'Confirm booking') : E2('Enviar solicitud', 'Send request');
    const ctaNote = P.dep ? money(P.dep) + (A.auto ? E2(' SE COBRA AL CONFIRMAR', ' CHARGED ON CONFIRMATION') : E2(' SE COBRAN AL ENVIAR · SE DEVUELVEN SI NO CONFIRMAN', ' CHARGED NOW · REFUNDABLE')) : E2('NO PIDE DEPÓSITO', 'NO DEPOSIT');
    const okStep = st === 'evt' ? ev.date != null : st === 'time' ? q.h != null : st === 'det' ? whoOk && addrOk : true;
    const go = () => { if (!okStep) return; if (st === 'rev') return submit(C); up({ step: q.step + 1 }); C.scrollTop(); };
    const T = { evt: E2('Tu evento', 'Your event'), time: ev ? E2('Hora de empezar', 'Start time') : E2('Día y hora', 'Day and time'), det: E2('Detalles', 'Details'), rev: E2('Revisa y envía', 'Review and send') };
    return { title: 'Booking', meta: (sb.name + ' · ' + q.svc).toUpperCase(), name: sb.name, onExit: back, stepT: T[st], step: si + 1, total: steps.length, onBack: si > 0 ? () => { up({ step: si - 1 }); C.scrollTop(); } : back,
      isEvt: !!ev && st === 'evt', isTime: st === 'time', isDet: st === 'det', isRev: st === 'rev', hasEvt: !!ev, evt, time, det, who: whoCard,
      svc: { name: q.svc, sub: optL || (addL ? addL : sv ? sv.d : ''), meta: (dur(P.min) + ' · ' + money(P.total) + (P.dep ? ' · ' + E2('DEPÓSITO ', 'DEPOSIT ') + money(P.dep) : '')).toUpperCase(), bg: SPH[q.svc] ? U(SPH[q.svc], 200) : U(b.ph[0], 200), onChange: reopen },
      rev: { rows, lines, total: money(P.total), dep: depBox, declined: !!q.declined, decT: E2('Tu tarjeta fue rechazada', 'Your card was declined'), decS: E2('No se cobró nada. Usa otra tarjeta para enviar la solicitud.', 'Nothing was charged. Use another card to send the request.'), decFix: E2('Cambiar tarjeta', 'Change card'), onFix: openPm, pol,
        restL: P.dep ? E2('En el local pagas ', 'At the shop you pay ') + money(rest) : c.win ? E2('Pagas al terminar ', 'Pay when done ') + money(P.total) : E2('Pagas en el local ', 'Pay at the shop ') + money(P.total) },
      barK: st === 'rev' ? payK : dur(P.min).toUpperCase(), barV: st === 'rev' ? payV : money(P.total), cta: st === 'rev' ? submitL : E2('Continuar', 'Continue'), ctaDis: !okStep, onCta: go, ctaNote: st === 'rev' ? payNote : '', hasNote: st === 'rev', pay, out, payK, payV,
      submitL, submitDis: !ready, onSubmit: () => { if (ready) submit(C); }, miss, hasMiss: !ready, ctaNoteD: payNote,
      lbl: { change: E2('Cambiar', 'Change'), sumK: E2('TU CITA', 'YOUR BOOKING'), priceK: E2('PRECIO', 'PRICE'), totalK: E2('Total del servicio', 'Service total'), howK: E2('CÓMO SE PAGA', 'HOW YOU PAY'), secPol: E2('Antes de enviar', 'Before you send'), polK: E2('ANTES DE ENVIAR', 'BEFORE YOU SEND'), payK: E2('DEPÓSITO Y PAGO', 'DEPOSIT AND PAYMENT'), cardChange: E2('Cambiar', 'Change'), secSvc: E2('Servicio', 'Service'), secWho: E2('Con quién', 'With whom'), secTime: ev ? E2('Hora de empezar', 'Start time') : E2('Día y hora', 'Day and time'), secDet: E2('Detalles', 'Details'), secEvt: E2('Tu evento', 'Your event') } };
  }
  function submit(C) {
    const s = C.state, q = s.bk; if (!q) return;
    if (!s.user) { C.setState({ auth: { step: 'phone', next: { ...s.route }, top: C.vTop(), ctx: 'cita' } }); return; }
    const P = priceOf(q.own, q.svc, q.opt, q.add, q.evt), A = apr(q.own), b = biz(q.own), kind = b.m;
    const old = q.chgOf ? (s.citas || []).find(x => x.id === q.chgOf && ['pend', 'ok', 'alt'].includes(x.st)) : null, carry = !!(old && old.dep);
    const pm = carry ? old.pm || 'v4242' : q.pm || 'v4242', wb = z => Math.round(((z.walBal != null ? z.walBal : 18.4) + (P.dep || 0)) * 100) / 100;
    if (P.dep && !carry && (s.scen || 'ok') === 'tarjeta' && pm === 'v4242') { C.setState(z => ({ bk: { ...z.bk, declined: true, declinedId: pm, step: z.bk.evt ? 3 : 2 } })); return; }
    const di = q.evt ? q.evt.date : q.i, id = 'C-' + (4800 + Math.floor(Math.random() * 190)), atN = NOW + 1 / 60, w = CH[q.shop] || [];
    const stfName = kind === 'shop' && q.stf !== 'any' && q.stf != null && X.STAFF[q.own] ? X.STAFF[q.own][q.stf][0] : kind === 'shop' && q.as != null && X.STAFF[q.own] ? X.STAFF[q.own][q.as][0] : null;
    const ct = { id, biz: q.biz, own: q.own, shop: q.shop, svc: q.svc, opt: q.opt, add: q.add, stf: q.stf, as: q.as, evt: q.evt, i: di, h: q.h, min: P.min, total: P.total, dep: P.dep, who: q.who, whoN: q.whoN, kidA: q.kidA, note: q.note, ph: q.ph, addr: q.addr, sms: q.sms, card: window.TLPay ? window.TLPay.label(s, pm) : 'Visa ·· 4242', pm,
      withL: kind === 'silla' ? PROI[q.own].name : stfName || (kind === 'solo' && X.STAFF[q.own] ? X.STAFF[q.own][0][0] : b.name), st: A.auto ? 'ok' : 'pend', auto: A.auto, atN, respN: A.auto ? atN : null, scen: s.scen || 'ok', chgOf: q.chgOf || null, depFrom: carry ? q.chgOf : null };
    C.setState(z => { let L = (z.citas || []).concat(ct); if (ct.st === 'ok' && ct.chgOf) L = L.map(x => x.id === ct.chgOf ? { ...x, st: 'cx', cxWhy: 'chg', to: id } : x); return { citas: L, bk: null, ...(pm === 'wal' && P.dep && !carry ? { walBal: Math.round(((z.walBal != null ? z.walBal : 18.4) - P.dep) * 100) / 100 } : {}) }; });
    C.nav({ code: 'APP-NEG-CITA', biz: q.biz, cid: id, from: 'APP-NEG-BOOKING' });
    if (!A.auto) reply(C, id);
  }
  function reply(C, id) { C._ctT = C._ctT || {}; clearTimeout(C._ctT[id]); C._ctT[id] = setTimeout(() => C.setState(z => {
    const c = (z.citas || []).find(x => x.id === id); if (!c || c.st !== 'pend') return null; const sc = c.scen, tm = c.atN + 6 / 60; let n;
    if (sc === 'nada') n = { ...c, st: 'exp', respN: c.atN + apr(c.own).exp };
    else if (sc === 'cambio' || sc === 'rechaza') { const al = nextN(c.own, c.stf, c.min, 1, { i: c.i, h: c.h }).find(x => x.i > c.i || (x.i === c.i && x.h > c.h)) || nextFree(c.own, c.stf, c.min, c.i + 1); n = al ? { ...c, st: 'alt', alt: al, respN: tm } : { ...c, st: 'no', respN: tm }; }
    else n = { ...c, st: 'ok', respN: tm };
    let L = z.citas.map(x => x.id === id ? n : x);
    if (n.st === 'ok' && c.chgOf) L = L.map(x => x.id === c.chgOf ? { ...x, st: 'cx', cxWhy: 'chg', to: id } : x);
    return { citas: L, ...(['no', 'exp'].includes(n.st) && c.pm === 'wal' && c.dep && !c.depFrom ? { walBal: Math.round(((z.walBal != null ? z.walBal : 18.4) + c.dep) * 100) / 100 } : {}) }; }), 6000); }

  /* ---------- Estado de la cita ---------- */
  function citaVals(C, s, es) {
    const E2 = (x, y) => es ? x : y, c = (s.citas || []).find(x => x.id === s.route.cid), b = biz(c.own), sb = biz(c.biz), shop = biz(c.shop), kind = b.m, cf = cfg(c.own), A = apr(c.own), w = CH[c.shop] || [];
    const who1 = kind === 'shop' ? b.name : firstOf(c.own), set = o => C.setState(z => ({ citas: z.citas.map(x => x.id === c.id ? { ...x, ...o } : x) }));
    const setR = o => C.setState(z => ({ citas: z.citas.map(x => x.id === c.id ? { ...x, ...o } : x), ...(c.pm === 'wal' && c.dep ? { walBal: Math.round(((z.walBal != null ? z.walBal : 18.4) + c.dep) * 100) / 100 } : {}) }));
    const flash = t => { C.setState({ ctFlash: t }); clearTimeout(C._ctF); C._ctF = setTimeout(() => C.setState({ ctFlash: '' }), 3200); };
    const end = c.h + c.min / 60, whenL = dayL(c.i, es) + ' · ' + (cf.win ? fmt(c.h) + '–' + fmt(c.h + .5) : fmt(c.h) + ' – ' + fmt(end));
    const rest = c.total - (c.dep || 0), hrsTo = c.i * 24 + c.h - NOW, free = hrsTo >= (cf.cx || 2), mins = A.mins >= 60 ? Math.round(A.mins / 60) + E2(' h', ' h') : A.mins + ' min';
    const toListing = o => { C.setState({ ltab: 'svc', ctCx: null, ctLate: null, ...(o || {}) }); C.nav({ code: sb.pro ? 'APP-NEG-LISTING-PRO' : 'APP-NEG-LISTING-FREE', biz: c.biz, from: 'APP-NEG-CITA' }); };
    const rebook = (i, h, extra) => { start(C, { biz: c.biz, own: c.own, svc: c.svc, opt: c.opt, add: c.add, stf: c.stf }, { ...(i != null ? { i, h } : {}), ...(extra || {}), ...(extra && extra.chgOf ? { pm: c.pm || 'v4242' } : {}), who: c.who, whoN: c.whoN, kidA: c.kidA, note: c.note, ph: c.ph, addr: c.addr, evt: c.evt ? { ...c.evt } : null }); };
    const H = { pend: ['clock', 'rgba(255,176,32,.18)', '#8A5A00', E2('Solicitud enviada', 'Request sent'), E2(who1 + ' tiene ' + A.exp + ' horas para contestar. Suele tardar ' + mins + '. Te avisamos por SMS apenas responda.', who1 + ' has ' + A.exp + ' hours to reply. Usually ' + mins + '. We text you as soon as they do.'), E2('PENDIENTE DE CONFIRMAR', 'WAITING FOR CONFIRMATION'), 'rgba(255,176,32,.2)', '#8A5A00'],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('Cita confirmada', 'Booking confirmed'), cap(dayL(c.i, es)) + E2(' a las ', ' at ') + fmt(c.h) + E2(' con ', ' with ') + c.withL + '.', (E2('CONFIRMADA POR ', 'CONFIRMED BY ') + (kind === 'shop' ? E2('EL NEGOCIO', 'THE BUSINESS') : who1)).toUpperCase(), 'rgba(0,229,196,.2)', '#00695B'],
      alt: ['calendar', 'rgba(75,55,245,.1)', '#4B37F5', E2('Te propone otra hora', 'A new time was proposed'), E2(who1 + ' no puede a las ' + fmt(c.h) + '. ' + (c.dep ? 'Si no te sirve, te devolvemos los ' + money(c.dep) + '.' : 'Decide abajo.'), who1 + ' cannot do ' + fmt(c.h) + '. ' + (c.dep ? 'If it does not work for you, we refund the ' + money(c.dep) + '.' : 'Decide below.')), E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), 'rgba(75,55,245,.1)', '#4B37F5'],
      no: ['close', 'rgba(192,57,43,.1)', '#C0392B', E2('No pudo tomarla', 'Could not take it'), E2(who1 + ' no tiene otra hora que ofrecerte. ' + (c.dep ? 'Te devolvemos los ' + money(c.dep) + ' del depósito.' : 'No se cobró nada.'), who1 + ' has no other time to offer. ' + (c.dep ? 'We refund your ' + money(c.dep) + ' deposit.' : 'Nothing was charged.')), E2('NO PUDO', 'COULD NOT'), 'rgba(192,57,43,.1)', '#C0392B'],
      exp: ['clock', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('Sin respuesta', 'No reply'), E2(who1 + ' no contestó en ' + A.exp + ' horas. ' + (c.dep ? 'Te devolvemos los ' + money(c.dep) + ' del depósito.' : 'No se cobró nada.'), who1 + ' did not reply in ' + A.exp + ' hours. ' + (c.dep ? 'We refund your ' + money(c.dep) + ' deposit.' : 'Nothing was charged.')), E2('VENCIDA', 'EXPIRED'), 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)'],
      cx: ['close', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', c.cxWhy === 'chg' ? E2('La cambiaste', 'You changed it') : c.cxWhy === 'altNo' ? E2('No aceptaste la otra hora', 'You declined the new time') : E2('Cita cancelada', 'Booking cancelled'), c.cxWhy === 'chg' ? E2('Esta hora quedó libre porque confirmaron tu nueva hora. El depósito pasó a la nueva.', 'This time was freed because your new time was confirmed. The deposit moved to the new one.') : c.lost ? E2('Cancelaste con menos de ' + cf.cx + ' h: el depósito de ' + money(c.dep) + ' se queda con ' + who1 + '.', 'Cancelled less than ' + cf.cx + ' h before: the ' + money(c.dep) + ' deposit stays with ' + who1 + '.') : (c.cxWhy === 'altNo' ? E2('No hay cita. ', 'No booking. ') : E2('Cancelaste a tiempo. ', 'Cancelled in time. ')) + (c.dep ? E2('Te devolvemos los ' + money(c.dep) + ' del depósito.', 'We refund your ' + money(c.dep) + ' deposit.') : E2('No se cobró nada.', 'Nothing was charged.')), E2('CANCELADA', 'CANCELLED'), 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)'],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('Cita terminada', 'Appointment done'), cap(dayL(c.i, es)) + E2(' con ', ' with ') + c.withL + '.' + (c.dep ? E2(' El depósito de ' + money(c.dep) + ' se descontó del total.', ' The ' + money(c.dep) + ' deposit came off the total.') : ''), E2('TERMINADA', 'DONE'), 'rgba(0,229,196,.2)', '#00695B'] }[c.st];
    if (c.depFrom && ['no', 'exp', 'cx'].includes(c.st) && c.cxWhy !== 'chg') H[4] = (c.st === 'no' ? E2(who1 + ' no pudo tomar la nueva hora. ', who1 + ' could not take the new time. ') : c.st === 'exp' ? E2(who1 + ' no contestó el cambio. ', who1 + ' did not reply to the change. ') : E2('Cancelaste el cambio. ', 'You cancelled the change. ')) + E2('Tu cita actual sigue en pie, con su depósito.', 'Your current booking stays, with its deposit.');
    const pend = c.st === 'pend', ok = c.st === 'ok', alt = c.st === 'alt', done = c.st === 'done', mineR = (s.myRev || {})[c.own], dead = ['no', 'exp', 'cx'].includes(c.st);
    const others = kind === 'silla' ? PROS.filter(p => p.at === c.shop && p.id !== c.own && p.pr[c.svc] != null).map(p => { const nx = nextFree(p.id, null, c.min); const [ab, af] = aprC(p.id); return { name: p.name, ph: U(p.ph, 200), meta: (money(p.pr[c.svc]) + (nx ? ' · ' + E2('PRÓX ', 'NEXT ') + nxL(nx, es) : '')).toUpperCase(), apr: aprL(p.id, es), aprBg: ab, aprFg: af, onClick: () => { C.openBiz(biz(p.id), 'APP-NEG-CITA · otro ' + (w[0] || '')); C.setState({ ltab: 'svc' }); } }; }) : [];
    const altSlots = nextN(c.own, c.stf, c.min, 3, { i: c.i, h: c.h }).map(x => ({ l: dayS(x.i, es) + ' · ' + fmt(x.h), onClick: () => rebook(x.i, x.h) }));
    const stepsA = [{ label: E2('Solicitud enviada', 'Request sent'), time: fmt(c.atN), state: 'done' },
      { label: pend ? E2('Esperando a ', 'Waiting for ') + who1 : ok || done ? (c.auto ? E2('Confirmada al instante', 'Confirmed instantly') : E2('Confirmada por ', 'Confirmed by ') + who1) : alt ? E2('Propuso otra hora', 'Proposed another time') : c.st === 'no' ? E2('No pudo tomarla', 'Could not take it') : c.st === 'exp' ? E2('Sin respuesta', 'No reply') : E2('Cancelada', 'Cancelled'), time: c.respN ? fmt(c.respN) : '~' + mins.toUpperCase(), state: pend || alt ? 'current' : 'done' }]
      .concat(dead ? [] : [{ label: E2('Tu cita', 'Your appointment'), time: (dayS(c.i, es) + ' ' + fmt(c.h)).toUpperCase(), state: done ? 'done' : ok ? 'current' : 'next' }, { label: E2('Calificas a ', 'You rate ') + (kind === 'shop' ? b.name : who1), time: '', state: mineR && done ? 'done' : done ? 'current' : 'next' }]);
    const money1 = [];
    const refL = c.pm === 'wal' ? "To'Latino Wallet" + E2(' · al instante', ' · instantly') : c.card + E2(' · 3 a 5 días hábiles', ' · 3 to 5 business days');
    if (c.dep) { if (c.depFrom && (pend || alt)) money1.push(['check', E2('Ya pagado en tu cita actual', 'Already paid on your current booking'), money(c.dep), '#00695B', E2('Pasa a esta cuando confirmen', 'Moves here once confirmed')]); else if (c.depFrom && dead) money1.push(['check', E2('Sigue en tu cita actual', 'Stays on your current booking'), money(c.dep), '#00695B', c.card]); else if (pend || alt) money1.push(['card', E2('Depósito cobrado', 'Deposit charged'), money(c.dep), '#8A5A00', c.card + E2(' · se devuelve si no se confirma', ' · refunded if not confirmed')]); else if (ok || done) money1.push(['check', E2('Depósito pagado', 'Deposit paid'), money(c.dep), '#00695B', c.card + E2(' · se descuenta del total', ' · taken off the total')]); else if (c.cxWhy === 'chg') money1.push(['check', E2('Depósito pasó a la nueva cita', 'Deposit moved to the new booking'), money(c.dep), '#00695B', c.card]); else if (c.lost) money1.push(['warning', E2('Se queda con ', 'Kept by ') + who1, money(c.dep), '#C0392B', E2('Cancelación tardía', 'Late cancellation')]); else money1.push(['check', E2('Devolución en camino', 'Refund on its way'), money(c.dep), '#00695B', refL]); }
    if (!dead) money1.push(['store', cap(dayL(c.i, es)) + ', ' + restWhereOf(c.own, c.evt, es), money(c.dep ? rest : c.total), '#0B0E12', payHowOf(c.own, es)]);
    const optL = (OPT[c.svc] || []).map((g, gi) => { const o = g[2][(c.opt || {})[gi]]; return o ? (es ? o[0] : o[1]) : null; }).filter(Boolean).join(' · ');
    const addL = addsFor(c.own, (findSvc(c.own, c.svc) || { sec: 0 }).sec).filter(x => (c.add || []).includes(x.i)).map(x => es ? x.a[0] : x.a[1]).join(' · ');
    const whoL = c.who === 'me' ? (s.user ? s.user.name : E2('Tú', 'You')) : (c.whoN || E2('Otra persona', 'Someone else')) + (c.who === 'kid' && c.kidA ? ' · ' + c.kidA + E2(' años', ' yrs') : '');
    const whereL = kind === 'solo' && cf.zone && b.tags.includes('domicilio') ? (ADDRS.find(x => x[0] === c.addr) || ADDRS[0])[3] : b.casa ? (ok ? cf.casa : b.casa + E2(' · dirección exacta al confirmar', ' · exact address on confirmation')) : c.evt && c.evt.where === 'place' ? (ADDRS.find(x => x[0] === c.addr) || ADDRS[0])[3] : X.ADDR[c.own] || '';
    const rows = [[E2('SERVICIO', 'SERVICE'), c.svc + (optL ? ' · ' + optL : '')], addL ? ['EXTRAS', addL] : null, [E2('CUÁNDO', 'WHEN'), whenL], [E2('CON', 'WITH'), c.withL], [E2('DÓNDE', 'WHERE'), whereL], [E2('PARA', 'FOR'), whoL], c.note ? [E2('NOTA', 'NOTE'), c.note] : null, [E2('TOTAL', 'TOTAL'), money(c.total)]].filter(Boolean).map(([k, v], i) => ({ k, v, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const chgNew = (s.citas || []).find(x => x.chgOf === c.id && ['pend', 'alt'].includes(x.st));
    const lateOK = ok && c.i === 0 && c.h - NOW <= 2 && c.h - NOW > -0.25;
    const acts = ok ? [['calendar', E2('Al calendario', 'Add to calendar'), () => C.encargo('APP-CALENDARIO', 'APP-NEG-CITA', b.name, E2('Agregar al calendario', 'Add to calendar'))], ['pin', E2('Cómo llegar', 'Directions'), () => C.encargo('APP-NEG-MAPA', 'APP-NEG-CITA · Cómo llegar', b.name, E2('Cómo llegar', 'Directions'))],
        ['clock', E2('Voy tarde', 'Running late'), () => lateOK ? C.setState({ ctLate: c.id, ctTop: C.vTop() }) : flash(E2('Disponible 2 h antes de tu cita', 'Available 2 h before your booking'))], ['edit', E2('Cambiar hora', 'Change time'), () => rebook(null, null, { chgOf: c.id })]]
      : done ? [['calendar', E2('Volver a reservar', 'Book again'), () => rebook()], ['help', E2('Ayuda con la cita', 'Appointment help'), () => { if (!(window.TLCitaHelp && window.TLCitaHelp.start(C, 'bhelp', c.id))) C.encargo('APP-NEG-CITA-AYUDA', 'APP-NEG-CITA · Ayuda', c.id, E2('Ayuda con la cita', 'Appointment help')); }]]
      : pend ? [['edit', E2('Cambiar', 'Change'), () => rebook(null, null, { chgOf: c.id })], ['close', E2('Cancelar solicitud', 'Cancel request'), () => C.setState({ ctCx: c.id, ctTop: C.vTop() })]] : [];
    const cxOpen = s.ctCx === c.id, lateOpen = s.ctLate === c.id;
    return { hdr: H[3], num: ('CITA #' + c.id + ' · ' + shop.name).toUpperCase(), ic: H[0], icBg: H[1], icFg: H[2], t: H[3], line: H[4], pill: H[5], pillBg: H[6], pillFg: H[7],
      isPend: pend, isOk: ok, isDone: done, hasRate: done && !mineR, hasMine: done && !!mineR,
      rate: { k: E2('TU CITA DE HOY', 'YOUR APPOINTMENT TODAY'), t: E2('¿Cómo te quedó?', 'How did it turn out?'), s: E2('Toca las estrellas. Sale como reseña verificada en la página de ' + b.name + '.', 'Tap the stars. It posts as a verified review on ' + b.name + '’s page.'), stars: [1, 2, 3, 4, 5].map(n => ({ onClick: () => C.revOpen(c.own, 'cita', n, c.id) })), mineT: E2('Tu reseña está publicada', 'Your review is posted'), mineL: E2('Ver', 'See'), onMine: () => C.revOpen(c.own, 'cita', 0, c.id) }, isAlt: alt, isDead: dead, onBack: () => toListing(), flash: s.ctFlash || '', hasFlash: !!s.ctFlash,
      alt: alt ? { t: cap(dayL(c.alt.i, es)) + ' · ' + fmt(c.alt.h), s: E2('En lugar de ' + dayS(c.i, es).toLowerCase() + ' a las ' + fmt(c.h) + '.', 'Instead of ' + dayS(c.i, es) + ' at ' + fmt(c.h) + '.'), yes: E2('Aceptar esta hora', 'Accept this time'), other: E2('Buscar otra', 'Find another'), no: E2('No, gracias', 'No, thanks'),
        onYes: () => { C.setState(z => ({ citas: z.citas.map(x => x.id === c.id ? { ...x, st: 'ok', i: c.alt.i, h: c.alt.h, alt: null, respN: NOW + 8 / 60 } : c.chgOf && x.id === c.chgOf ? { ...x, st: 'cx', cxWhy: 'chg', to: c.id } : x) })); flash(E2('Listo: tu cita quedó confirmada', 'Done: your booking is confirmed')); }, onOther: () => rebook(null, null, { chgOf: null }), onNo: () => (c.depFrom ? set : setR)({ st: 'cx', cxWhy: 'altNo', alt: null }) } : {},
      hasAlts: dead && c.cxWhy !== 'chg', altSlots, hasAltSlots: altSlots.length > 0, others, hasOthers: others.length > 0,
      pay: { hasBar: !!c.dep && !dead, fa: c.dep || 0, fb: Math.max(rest, 0.001) }, steps: stepsA, money: money1.map(([icon, k, v, fg, sub]) => ({ icon, k, v, fg, sub })), rows, acts: acts.map(([icon, l, on]) => ({ icon, l, on })), hasActs: acts.length > 0,
      hasCx: ok, onCx: () => C.setState({ ctCx: c.id, ctTop: C.vTop() }), hasChg: !!chgNew, chgT: chgNew ? E2('Pediste cambiarla a ' + dayS(chgNew.i, es).toLowerCase() + ' · ' + fmt(chgNew.h) + '. Esta hora sigue tuya hasta que ' + who1 + ' confirme la nueva.', 'You asked to move it to ' + dayS(chgNew.i, es) + ' · ' + fmt(chgNew.h) + '. This time stays yours until ' + who1 + ' confirms the new one.') : '', onChg: chgNew ? () => C.nav({ code: 'APP-NEG-CITA', biz: c.biz, cid: chgNew.id, from: 'APP-NEG-CITA' }) : () => {},
      hasTo: !!c.to, onTo: c.to ? () => C.nav({ code: 'APP-NEG-CITA', biz: c.biz, cid: c.to, from: 'APP-NEG-CITA' }) : () => {},
      onAgain: () => rebook(), onCall: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-CITA · Llamar', b.name, E2('Llamar al negocio', 'Call the business')), onMsg: () => C.encargo('APP-MSG', 'APP-NEG-CITA · Mensaje', c.id, E2('Mensaje', 'Message')),
      photo: U(kind === 'silla' ? PROI[c.own].ph : kind === 'solo' && SD.PEOPLE[c.own] ? SD.PEOPLE[c.own][0].ph : b.ph[1] || b.ph[0], 200), withL: c.withL, whereS: (kind === 'silla' ? E2(w[2], w[3]) + ' ' + PROI[c.own].seat + ' · ' + shop.name : shop.name).toUpperCase(),
      cx: { open: cxOpen, top: (s.ctTop || 80) + 'px', t: pend ? E2('¿Cancelar la solicitud?', 'Cancel the request?') : E2('¿Cancelar tu cita?', 'Cancel your booking?'),
        s: c.depFrom && pend ? E2('Cancelas solo el cambio. Tu cita actual sigue en pie, con su depósito.', 'You only cancel the change. Your current booking stays, with its deposit.') : pend ? E2('Es gratis. ' + (c.dep ? 'Te devolvemos los ' + money(c.dep) + ' del depósito.' : ''), 'It is free. ' + (c.dep ? 'We refund your ' + money(c.dep) + ' deposit.' : '')) : free ? E2('Faltan más de ' + cf.cx + ' h: es gratis. ' + (c.dep ? 'Te devolvemos los ' + money(c.dep) + ' del depósito.' : ''), 'More than ' + cf.cx + ' h to go: it is free. ' + (c.dep ? 'We refund your ' + money(c.dep) + ' deposit.' : '')) : E2('Faltan menos de ' + cf.cx + ' h. ' + (c.dep ? 'El depósito de ' + money(c.dep) + ' se queda con ' + who1 + '.' : 'No hay cargo, pero avísale a ' + who1 + '.'), 'Less than ' + cf.cx + ' h to go. ' + (c.dep ? 'The ' + money(c.dep) + ' deposit stays with ' + who1 + '.' : 'No charge, but let ' + who1 + ' know.')),
        yes: E2('Sí, cancelar', 'Yes, cancel'), no: E2('No, mantenerla', 'No, keep it'), onYes: () => { const lost = ok && !free && !!c.dep; (lost || c.depFrom ? set : setR)({ st: 'cx', lost, respN: NOW + 2 / 60 }); C.setState({ ctCx: null }); }, onNo: () => C.setState({ ctCx: null }), stop },
      late: { open: lateOpen, top: (s.ctTop || 80) + 'px', t: E2('¿Cuánto tarde llegas?', 'How late are you?'), s: E2('Le avisamos a ' + who1 + '. Tolerancia: ' + (cf.tol || 10) + ' min.', 'We let ' + who1 + ' know. Grace period: ' + (cf.tol || 10) + ' min.'),
        opts: [5, 10, 15].map(n => ({ l: n + ' min', onClick: () => { set({ late: n }); C.setState({ ctLate: null }); flash(E2('Le avisamos a ' + who1 + ': llegas ' + n + ' min tarde', who1 + ' knows you are ' + n + ' min late')); } })), onClose: () => C.setState({ ctLate: null }), stop },
      lbl: { detK: E2('DETALLES', 'DETAILS'), moneyK: E2('DEPÓSITO Y PAGO', 'DEPOSIT AND PAYMENT'), stepsK: E2('SEGUIMIENTO', 'TRACKING'), altK: E2('OTRAS HORAS CON ', 'OTHER TIMES WITH ') + (kind === 'shop' ? b.name : who1).toUpperCase(), othersK: (E2('OTROS ' + (w[4] || '') + ' EN ', 'OTHER ' + (w[5] || '') + ' AT ') + shop.name).toUpperCase(), again: E2('Buscar otra hora', 'Find another time'), cancel: E2('Cancelar cita', 'Cancel booking'), call: E2('Llamar', 'Call'), msg: kind === 'shop' ? E2('Mensaje al negocio', 'Message the business') : E2('Mensaje a ', 'Message ') + who1, seeNew: E2('Ver la solicitud nueva', 'See the new request'), seeTo: E2('Ver tu cita nueva', 'See your new booking'), back: shop.name } };
  }
  const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
  window.TLBook = { OFF, canBk, reply, PROS, PROI, CFG, OPT, ADD, SPH, svcs, findSvc, priceOf, slotsFor, nextFree, apr, aprL, firstOf, today, listingAdd, sheetVals, start, bookVals, submit, citaVals, dayS, dayL };
})();
