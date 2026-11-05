/* Eventos del negocio (Panel v2 · Eventos) = fuente única de los eventos de cada negocio: módulo Eventos (búsqueda y ficha del evento),
   pestaña Eventos de su página y Super Admin. No todos los negocios hacen el mismo evento: cada categoría publica solo los formatos que le
   sirven (CAT) y cada formato muestra solo sus campos y sus palabras (FMT). Una disco vende boletos, mesas y botellas con line-up; una iglesia
   hace un culto con RSVP, programa y cuidado de niños; una escuela da un taller con cupo.
   Guardado: tl-dash2-v1 · over[id].evts (forma v2, abajo). Base: TLEvt (evt-data.js). Lo vivo del cliente (tl-evt-v2: órdenes con tks/mesa/adds,
   RSVP con n personas, me gusta) suma a lo vendido; lo del Super Admin (tl-adm-v1.evt[id] · hidden | cx) se respeta en la página y en el panel.
   sync() reescribe TLEvt.E (sin borradores; cancelados en TLEvt.CX para quien ya compró). */
(function () {
  const W = window;
  const FMT = {
    noche: { l: ['Fiesta o show', 'Party or show'], s: ['DJ, artista en vivo o noche temática. Boletos, mesas con consumo mínimo y extras.', 'DJ, live artist or theme night. Tickets, tables with minimum spend and extras.'], icon: 'drink', type: 'noche', dark: 1, entry: 'tix', ages: [0, 18, 21], age0: 21, mesas: 1, adds: 1, gen: 1, dress: 1, door: 1, party: 0, kids: null, payAt: 0, h0: 22, len: 4, dr: 60,
      luL: ['Line-up', 'Line-up'], luWho: ['Artista o DJ', 'Artist or DJ'], luRole: ['Ej. Set principal', 'e.g. Main set'], tkL: ['Boletos', 'Tickets'], cntL: ['boletos', 'tickets'], tk1: ['Boleto', 'Ticket'], tixL: ['Con boletos', 'Ticketed'], freeL: ['Entrada libre · RSVP', 'Free entry · RSVP'], galL: ['El ambiente', 'The vibe'], cta: ['Boletos', 'Tickets'], tk0: ['Entrada general', 'General admission'], p0: 15, c0: 100, ph: 'Ej. Jueves de bachata en vivo' },
    comida: { l: ['Comida y música', 'Food and music'], s: ['Sancocho del domingo, cena especial, partido en pantalla grande. Casi siempre entrada libre con RSVP.', 'Sunday sancocho, special dinner, game on the big screen. Usually free entry with RSVP.'], icon: 'restaurant', type: 'comida', dark: 0, entry: 'free', ages: [0, 18, 21], age0: 0, mesas: 0, adds: 1, gen: 0, dress: 0, door: 0, party: 1, kids: 'fam', payAt: 1, h0: 13, len: 3, dr: 0,
      luL: ['Programa', 'Schedule'], luWho: ['Qué pasa', 'What happens'], luRole: ['Ej. Música en vivo', 'e.g. Live music'], tkL: ['Entradas', 'Tickets'], cntL: ['entradas', 'tickets'], tk1: ['Entrada', 'Ticket'], tixL: ['Con precio', 'Paid'], freeL: ['Entrada libre · RSVP', 'Free entry · RSVP'], galL: ['Fotos', 'Photos'], cta: ['Reservar', 'Book'], tk0: ['Cena completa', 'Full dinner'], p0: 25, c0: 40, ph: 'Ej. Sancocho del domingo en familia' },
    clase: { l: ['Clase o taller', 'Class or workshop'], s: ['Bizcocho, salsa, inglés, finanzas. Cupo limitado, pagado o gratis.', 'Cake, salsa, English, finances. Limited spots, paid or free.'], icon: 'edit', type: 'clase', dark: 0, entry: 'tix', ages: [0, 12, 18], age0: 0, mesas: 0, adds: 1, gen: 0, dress: 0, door: 0, party: 0, kids: null, payAt: 0, h0: 18, len: 2, dr: 0,
      luL: ['Programa', 'Schedule'], luWho: ['Qué se hace', 'What you do'], luRole: ['Ej. Con la profe Miriam', 'e.g. With teacher Miriam'], tkL: ['Cupos', 'Spots'], cntL: ['cupos', 'spots'], tk1: ['Cupo', 'Spot'], tixL: ['Cupo pagado', 'Paid spot'], freeL: ['Gratis · con cupo', 'Free · limited spots'], galL: ['Fotos', 'Photos'], cta: ['Reservar cupo', 'Book a spot'], tk0: ['Cupo en la clase', 'Class spot'], p0: 20, c0: 12, ph: 'Ej. Clase de bizcocho dominicano' },
    fe: { l: ['Culto, vigilia o retiro', 'Service, vigil or retreat'], s: ['Alabanza, oración, retiro o conferencia. Entrada libre con RSVP o inscripción.', 'Worship, prayer, retreat or conference. Free with RSVP or registration.'], icon: 'heart', type: 'fe', dark: 0, entry: 'free', ages: [0], age0: 0, mesas: 0, adds: 0, gen: 0, dress: 0, door: 0, party: 1, kids: 'care', payAt: 0, h0: 19, len: 3, dr: 30,
      luL: ['Programa', 'Program'], luWho: ['Quién o qué', 'Who or what'], luRole: ['Ej. Alabanza', 'e.g. Worship'], tkL: ['Inscripción', 'Registration'], cntL: ['inscritos', 'registered'], tk1: ['Inscripción', 'Registration'], tixL: ['Con inscripción', 'With registration'], freeL: ['Entrada libre · RSVP', 'Free entry · RSVP'], galL: ['Fotos', 'Photos'], cta: ['Inscribirme', 'Register'], tk0: ['Inscripción', 'Registration'], p0: 15, c0: 40, ph: 'Ej. Vigilia de oración y alabanza' },
    comunidad: { l: ['Comunitario o benéfico', 'Community or charity'], s: ['Día familiar, colecta de juguetes, feria, torneo o festival. Casi siempre gratis.', 'Family day, toy drive, fair, tournament or festival. Usually free.'], icon: 'users', type: 'comunidad', dark: 0, entry: 'free', ages: [0, 18, 21], age0: 0, mesas: 0, adds: 0, gen: 0, dress: 0, door: 0, party: 1, kids: 'fam', payAt: 0, h0: 12, len: 5, dr: 0,
      luL: ['Programa', 'Schedule'], luWho: ['Qué pasa', 'What happens'], luRole: ['Ej. Final del torneo', 'e.g. Tournament final'], tkL: ['Entradas', 'Tickets'], cntL: ['entradas', 'tickets'], tk1: ['Entrada', 'Ticket'], tixL: ['Entrada pagada', 'Paid entry'], freeL: ['Gratis · RSVP', 'Free · RSVP'], galL: ['Fotos', 'Photos'], cta: ['Entradas', 'Tickets'], tk0: ['Entrada general', 'General admission'], p0: 10, c0: 100, ph: 'Ej. Feria de salud en el parque' }
  };
  const CAT = { 'NEG-NOCHE': ['noche', 'comida', 'clase', 'comunidad'], 'NEG-FIESTA': ['noche', 'comunidad'], 'NEG-FOOD': ['comida', 'noche', 'clase', 'comunidad'], 'NEG-FE': ['fe', 'comunidad'], 'NEG-DEPORTE': ['comunidad', 'clase'], 'NEG-EDU': ['clase', 'comunidad'], 'NEG-NINOS': ['clase', 'comunidad'], 'NEG-MERC': ['comunidad', 'comida', 'clase'], 'NEG-TIENDA': ['comunidad', 'clase'] };
  const fmtsOf = cat => CAT[cat] || ['comunidad', 'clase'];
  const GEN = ['Bachata', 'Merengue', 'Salsa', 'Dembow', 'Reggaetón', 'Típico', 'Variado'];
  const STRIP = ['t', 'd', 'ph', 'sold', 'cap', 'gross', '_c'];
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const hsh = s => String(s).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
  const pH = t => { const m = /(\d+)(?::(\d+))?\s*(AM|PM)/i.exec(t || ''); if (!m) return 20; return (+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0) + (m[2] ? +m[2] / 60 : 0); };
  const fH = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const dayL = (d, es) => { const dt = new Date(2026, 8, 24 + d), DN = es ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = es ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (d === 0 ? (es ? 'Hoy' : 'Today') : d === 1 ? (es ? 'Mañana' : 'Tomorrow') : DN[dt.getDay()]) + ' ' + (es ? dt.getDate() + ' ' + MN[dt.getMonth()] : MN[dt.getMonth()] + ' ' + dt.getDate()); };
  const E0 = () => { const X = W.TLEvt; if (!X) return []; if (!X._E0) X._E0 = X.E.slice(); return X._E0; };
  const fmtOf = e => e.fmt || (FMT[e.type] ? e.type : 'comunidad');
  const pair = x => Array.isArray(x) ? [x[0] || '', x[1] || ''] : [x || '', x || ''];
  /* Evento de TLEvt → forma del panel (v2). Lo vendido de ejemplo (sold0) sale estable del id. */
  function toPanel(e) { const h = hsh(e.id), fm = fmtOf(e), F = FMT[fm], h0 = pH(e.t0); let h1 = pH(e.t1); if (h1 <= h0) h1 += 24; const dh = e.dh ? e.dh.map(x => { const a = pH(x[0]); let b = pH(x[1]); if (b <= a) b += 24; return { h0: a, h1: b }; }) : null, hbd = j => j && dh && dh[j] ? dh[j].h0 : h0; const dr = Math.max(0, Math.round((h0 - pH(e.doors)) * 60));
    return { v: 2, id: e.id, fmt: fm, ti: pair(e.ti), desc: pair(e.desc), day: e.d, h0, h1, door: dr >= 45 ? 60 : dr >= 15 ? 30 : 0, where: e.org && e.venue === e.org.n ? 'own' : 'other', vn: e.venue, va: e.addr, dist: e.dist, phs: [e.ph].concat(e.gal || []),
      entry: e.free ? 'free' : 'tix', rcap: e.cap || 0, party: e.party != null ? e.party : (F.party ? 6 : 1), chkOn: e.chkOn != null ? (e.chkOn ? 1 : 0) : (e.free ? 0 : 1),
      tks: (e.tks || []).map((t, i) => { const s0 = Math.round((t.left || 0) * (0.3 + ((h >>> i) % 9) / 10)); return { id: t.id, n: pair(t.n), s: pair(t.s), p: t.p, cap: Math.min(999, (t.left || 0) + s0), sold0: s0, off: 0, dy: t.dy != null ? t.dy : null }; }),
      mesas: (e.mesas || []).map((m, i) => { const s0 = 2 + ((h >>> (i + 3)) % 4); return { id: m.id, z: pair(m.z), seats: m.seats, min: m.min, dep: m.dep, cap: m.left + s0, sold0: s0 }; }),
      adds: (e.adds || []).map((a, i) => ({ id: a.id, n: pair(a.n), s: pair(a.s), p: a.p, mesa: a.mesa ? 1 : 0, sold0: 3 + ((h >>> (i + 5)) % 9) })),
      lu: (e.lu || []).map(l => ({ h: (x => x < hbd(l[3] || 0) - 6 ? x + 24 : x)(pH(l[2])), who: l[0], role: pair(l[1]), dy: l[3] || 0 })), span: e.span || 1, dh, dcap: e.dcap || 0, gen: (e.gen || []).slice(), age: e.age || 0, dress: pair(e.dress), kids: e.kids != null ? (e.kids ? 1 : 0) : 0, payAt: e.payAt ? 1 : 0,
      before: (e.before || []).map(pair), perP: e.perP || 0, until: 'start', st: 'sale', going0: e.going || 0, codes: [], comps: [], staff: e.free ? [] : [['Portero · Junior', 'scan']], rules: { id: (e.age || 0) > 0 ? 1 : 0, re: 0 }, chk: [], rep: e.rep ? { k: e.rep.k, days: (e.rep.days || []).slice(), n: e.rep.n || 8, skip: [] } : { k: 'none', days: [], n: 8, skip: [] } }; }
  function fresh(cat, fm) { const F = FMT[fm || fmtsOf(cat)[0]], f = fm || fmtsOf(cat)[0];
    return { v: 2, id: 'new', fmt: f, ti: ['', ''], desc: ['', ''], day: 2, h0: F.h0, h1: F.h0 + F.len, door: F.dr, where: 'own', vn: '', va: '', dist: '', phs: [], entry: F.entry, rcap: 0, party: F.party ? 6 : 1, chkOn: 0,
      tks: [{ id: 't1', n: F.tk0.slice(), s: ['', ''], p: F.p0, cap: F.c0, sold0: 0, off: 0 }], mesas: [], adds: [], lu: [], gen: [], age: F.age0, dress: ['', ''], kids: F.kids === 'care' ? 1 : 0, payAt: F.payAt ? 1 : 0,
      before: [], perP: 0, until: 'start', st: 'sale', going0: 0, codes: [], comps: [], staff: [], rules: { id: F.age0 > 0 ? 1 : 0, re: 0 }, chk: [], rep: { k: 'none', days: [], n: 8, skip: [] }, span: 1, dh: null, dcap: 0 }; }
  /* Horas del día siguiente (1 AM de una fiesta que empieza 10 PM) se guardan como 25: así se ordenan y el paso de hora no salta. */
  const nlu = r => { if (!r || !Array.isArray(r.lu)) return r; const hb = l => (l.dy && r.dh && r.dh[l.dy] ? +r.dh[l.dy].h0 : +r.h0) || 0; return r.lu.some(l => +l.h < hb(l) - 6) ? { ...r, lu: r.lu.map(l => +l.h < hb(l) - 6 ? { ...l, h: +l.h + 24 } : l) } : r; };
  const strip = e => { const o = { ...e }; STRIP.forEach(k => delete o[k]); return o; };
  function raw(id, ov) { const o = ov || ((rd('tl-dash2-v1') || {}).over || {})[id] || {}; /* Lo que guardó el panel + los eventos de base nuevos que aún no estaban (los publicados no se borran, solo se cancelan). */
    if (Array.isArray(o.evts)) { const have = new Set(o.evts.map(r => r && r.id)); return o.evts.map(nlu).concat(E0().filter(e => e.org && e.org.biz === id && !have.has(e.id)).map(toPanel)); } return E0().filter(e => e.org && e.org.biz === id).map(toPanel); }
  function live() { const L = rd('tl-evt-v2') || {}; return { orders: L.orders || [], rsvp: L.rsvp || {}, likes: L.likes || {} }; }
  function adm(id) { const A = rd('tl-adm-v1') || {}; return ((A.evt || {})[id]) || {}; }
  /* Lo calculado: vendido (ejemplo + lo que compró el cliente en la app), quedan, cupo, bruto, estado con lo del admin. */
  /* oid = una fecha de la serie (id@día): cuenta solo lo vendido para esa fecha; el estado del admin es el de la serie. */
  function calc(r0, oid) { const occ = !!oid && oid !== r0.id, r = occ ? { ...r0, id: oid, going0: 0, chk: (r0.chkBy || {})[oid] || [], tks: r0.tks.map(t => ({ ...t, sold0: 0 })), mesas: r0.mesas.map(m => ({ ...m, sold0: 0 })), adds: r0.adds.map(a => ({ ...a, sold0: 0 })) } : r0, L = live(), A = adm(r0.id), ords = L.orders.filter(o => o.evt === r.id && o.st === 'ok'), tq = {}, mq = {}, aq = {};
    ords.forEach(o => { if (o.tks) Object.keys(o.tks).forEach(k => { tq[k] = (tq[k] || 0) + (+o.tks[k] || 0); }); else if (r.tks[0]) tq[r.tks[0].id] = (tq[r.tks[0].id] || 0) + (o.labels || []).length; if (o.mesa) mq[o.mesa] = (mq[o.mesa] || 0) + 1; (o.adds || []).forEach(k => { aq[k] = (aq[k] || 0) + 1; }); });
    const tks = r.tks.map(t => { const sold = (t.sold0 || 0) + (tq[t.id] || 0); return { ...t, sold, left: Math.max(0, t.cap - sold), live: tq[t.id] || 0 }; });
    const mesas = r.mesas.map(m => { const sold = (m.sold0 || 0) + (mq[m.id] || 0); return { ...m, sold, left: Math.max(0, m.cap - sold) }; });
    const adds = r.adds.map(a => ({ ...a, sold: (a.sold0 || 0) + (aq[a.id] || 0) }));
    const rs = L.rsvp[r.id], rsN = rs ? (+rs.n || 1) : 0, tix = r.entry === 'tix';
    const sold = tix ? tks.reduce((x, t) => x + t.sold, 0) : (r.going0 || 0) + rsN, cap = tix ? tks.reduce((x, t) => x + t.cap, 0) : (r.rcap || 0);
    const gross = tix ? Math.round(tks.reduce((x, t) => x + t.sold * t.p, 0) + mesas.reduce((x, m) => x + m.sold * m.dep, 0) + adds.reduce((x, a) => x + a.sold * a.p, 0)) : 0;
    const on = tks.filter(t => !t.off), soldOut = tix ? (!on.length || on.every(t => t.left <= 0)) : cap > 0 && sold >= cap;
    return { tks, mesas, adds, ords, rsN, sold, cap, gross, soldOut, st: A.cx ? 'admcx' : A.hidden ? 'admhid' : r.st, adm: A, inside: (r.chk || []).filter(c => c.ok).length, going: tix ? (r.going0 || 0) + ords.length : sold, views: 140 + hsh(r.id) % 700 + ords.length * 9, likes: (L.likes[r.id] ? 1 : 0) + hsh(r.id + 'l') % 40 }; }
  function of(id, ov) { return raw(id, ov).map(r => { const c = calc(r); return { ...r, _c: c, t: r.ti[0] || '', d: (r.span || 1) > 1 ? [spanL(r, 1), spanL(r, 0)] : [dayL(r.day, 1) + ' · ' + fH(r.h0), dayL(r.day, 0) + ' · ' + fH(r.h0)], ph: r.phs[0] || null, sold: c.sold, cap: c.cap, gross: c.gross }; }); }
  /* Eventos que se repiten: rep = { k: none | w | 2w | m, days: [0–6] (0 = dom), n: cuántas fechas, skip: [día] }. m = el mismo «n-ésimo» día de la semana cada mes (o el último). */
  const DOW = d => new Date(2026, 8, 24 + d).getDay(), DAY0 = Date.UTC(2026, 8, 24), MAXD = 180;
  const DN = [['domingo', 'Sunday'], ['lunes', 'Monday'], ['martes', 'Tuesday'], ['miércoles', 'Wednesday'], ['jueves', 'Thursday'], ['viernes', 'Friday'], ['sábado', 'Saturday']], NTH = [['primer', 'first'], ['segundo', 'second'], ['tercer', 'third'], ['cuarto', 'fourth']];
  function nthOf(day) { const dt = new Date(2026, 8, 24 + day), dim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(), n = Math.ceil(dt.getDate() / 7); return dt.getDate() + 7 > dim && n >= 4 ? 'last' : Math.min(4, n); }
  function occ(r) { if ((+r.span || 1) > 1) return [{ d: r.day, skip: false }]; const rp = r.rep || {}, k = rp.k || 'none', n = Math.max(1, Math.min(52, +rp.n || 1)), sk = rp.skip || [], out = [];
    if (k === 'none') return [{ d: r.day, skip: false }];
    if (k === 'm') { const dt0 = new Date(2026, 8, 24 + r.day), dw = dt0.getDay(), nth = nthOf(r.day);
      for (let i = 0; i < n; i++) { const y = dt0.getFullYear(), m = dt0.getMonth() + i, first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(); let dd;
        if (nth === 'last') { dd = dim - ((new Date(y, m, dim).getDay() - dw + 7) % 7); } else { dd = 1 + ((dw - first.getDay() + 7) % 7) + (nth - 1) * 7; if (dd > dim) continue; }
        const x = Math.round((Date.UTC(y, m, dd) - DAY0) / 864e5); if (x >= r.day && x <= MAXD) out.push(x); } }
    else { const step = k === '2w' ? 2 : 1, D = (rp.days && rp.days.length ? rp.days : [DOW(r.day)]).concat([DOW(r.day)]), ws = r.day - DOW(r.day);
      for (let x = r.day; x <= MAXD && out.length < n; x++) if (D.includes(DOW(x)) && Math.floor((x - ws) / 7) % step === 0) out.push(x); }
    const cxD = r.cxD || {}; return out.map(x => ({ d: x, skip: (x !== r.day || !!cxD[x]) && sk.includes(x) })); }
  function repL(r, es) { const rp = r.rep || {}, k = rp.k || 'none', L = i => DN[i][es ? 0 : 1], j = a => a.length > 1 ? a.slice(0, -1).join(', ') + (es ? ' y ' : ' and ') + a[a.length - 1] : a[0] || '';
    if (k === 'none') return ''; const ds = (rp.days && rp.days.length ? rp.days : [DOW(r.day)]).concat([DOW(r.day)]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(L);
    if (k === 'w') return (es ? 'Cada ' : 'Every ') + j(ds); if (k === '2w') return (es ? 'Cada 2 semanas · ' : 'Every 2 weeks · ') + j(ds);
    const nth = nthOf(r.day), nn = nth === 'last' ? (es ? 'último' : 'last') : NTH[nth - 1][es ? 0 : 1]; return es ? 'El ' + nn + ' ' + L(DOW(r.day)) + ' de cada mes' : 'The ' + nn + ' ' + L(DOW(r.day)) + ' of every month'; }
  const oidOf = (r, x) => x === r.day ? r.id : r.id + '@' + x;
  /* Varios días seguidos (span 2–30): una feria de 3 días, de una semana o de un mes. dh[j] = horario del día j (el día 0 usa h0/h1); cada boleto vale para un día (dy) o para todos (dy null = pase). */
  const dayH = (r, j) => j > 0 && r.dh && r.dh[j] ? { h0: +r.dh[j].h0, h1: +r.dh[j].h1 } : { h0: +r.h0, h1: +r.h1 };
  const spanL = (r, es) => dayL(r.day, es) + ' – ' + dayL(r.day + Math.max(1, +r.span || 1) - 1, es);
  function daysOf(r) { const S = Math.max(1, +r.span || 1); if (S > 1) return [...Array(S)].map((_, j) => r.day + j); return occ(r).filter(o => !o.skip).map(o => o.d); }
  function perDay(r, c) { c = c || calc(r); const S = Math.max(1, +r.span || 1); return [...Array(S)].map((_, j) => { const y = dayH(r, j); return { i: j, d: r.day + j, h0: y.h0, h1: y.h1, ppl: r.entry === 'tix' ? c.tks.reduce((a, t) => a + (t.dy == null || t.dy === j ? t.sold : 0), 0) : c.sold }; }); }
  function bizOf(id) { const D = W.TLDash2, b = (D && D.BIZ[id]) || {}, o = (((rd('tl-dash2-v1') || {}).over || {})[id]) || {}; return { id, name: o.name || b.name || id, addr: o.addr || b.addr || '' }; }
  /* Forma v2 → evento del módulo Eventos (lo que lee la ficha del evento, la pestaña Eventos y el admin). */
  function toClient(r, bz, dx, oid) { dx = dx == null ? r.day : dx; oid = oid || r.id; const c = calc(r, oid), F = FMT[r.fmt] || FMT.comunidad, own = r.where !== 'other', tix = r.entry === 'tix';
    const SPN = Math.max(1, +r.span || 1);
    return { id: oid, base: r.id, span: SPN, dEnd: dx + SPN - 1, dayH: SPN > 1 ? [...Array(SPN)].map((_, j) => { const y = dayH(r, j); return { d: dx + j, t0: fH(y.h0), t1: fH(y.h1) }; }) : null, sameH: !r.dh, dcap: r.dcap || 0, fmt: r.fmt, type: F.type, ti: [r.ti[0], r.ti[1] || r.ti[0]], desc: r.desc && r.desc[0] ? [r.desc[0], r.desc[1] || r.desc[0]] : null, gen: F.gen ? (r.gen || []) : [], d: dx, t0: fH(r.h0), t1: fH(r.h1), doors: fH(r.h0 - (r.door || 0) / 60), age: F.ages.includes(r.age) ? r.age : F.age0,
      venue: own ? bz.name : (r.vn || bz.name), addr: own ? bz.addr : (r.va || ''), dist: r.dist || '0.4 MI', org: { n: bz.name, biz: bz.id }, ph: r.phs[0] || 6166796, gal: r.phs.slice(1, 7),
      free: !tix, rsvp: !tix, rcap: tix ? 0 : (r.rcap || 0), party: !tix && F.party ? Math.max(1, r.party || 1) : 1, going: c.going,
      tks: tix ? c.tks.filter(t => !t.off).map(t => ({ id: t.id, n: [t.n[0], t.n[1] || t.n[0]], ...(t.s && t.s[0] ? { s: [t.s[0], t.s[1] || t.s[0]] } : SPN > 1 ? { s: t.dy == null ? ['Vale los ' + SPN + ' días · entras una vez cada día', 'Valid all ' + SPN + ' days · one entry per day'] : ['Vale solo el ' + dayL(dx + t.dy, 1).toLowerCase(), 'Valid only on ' + dayL(dx + t.dy, 0)] } : {}), p: t.p, left: t.left, dy: t.dy == null ? null : t.dy })) : [],
      mesas: tix && F.mesas ? c.mesas.filter(m => m.cap > 0).map(m => ({ id: m.id, z: [m.z[0], m.z[1] || m.z[0]], seats: m.seats, min: m.min, dep: m.dep, left: m.left })) : [],
      adds: tix && F.adds ? c.adds.map(a => ({ id: a.id, n: [a.n[0], a.n[1] || a.n[0]], ...(a.s && a.s[0] ? { s: [a.s[0], a.s[1] || a.s[0]] } : {}), p: a.p, mesa: !!(F.mesas && a.mesa) })) : [],
      lu: (((r.luD || {})[dx]) || r.lu || []).filter(l => (l.who || '').trim()).sort((a, b) => ((a.dy || 0) * 100 + a.h) - ((b.dy || 0) * 100 + b.h)).map(l => [l.who, [l.role[0] || '', l.role[1] || l.role[0] || ''], fH(l.h), l.dy || 0]),
      before: (r.msgs || []).filter(m => m.d === dx || m.d == null).slice(-1).map(m => ['Aviso de ' + bz.name + ': ' + m.t, 'Notice from ' + bz.name + ': ' + m.t]).concat((r.before || []).filter(x => (x[0] || '').trim()).map(x => [x[0], x[1] || x[0]])), dress: F.dress && r.dress && (r.dress[0] || '').trim() ? [r.dress[0], r.dress[1] || r.dress[0]] : null,
      kids: F.kids && r.kids ? F.kids : null, payAt: F.payAt && r.payAt ? 1 : 0, perP: +r.perP || 0, until: r.until || 'start', codes: tix ? (r.codes || []) : [], st: c.st, cxWhy: r.cxWhy || '', moved: r.moved || null, soldOut: c.soldOut, dark: !!F.dark, _panel: 1 }; }
  let _k = null;
  function sync(force) { const X = W.TLEvt, D = W.TLDash2; if (!X || !D || !D.BIZ) return false; let k = ''; try { k = (localStorage.getItem('tl-dash2-v1') || '') + '|' + (localStorage.getItem('tl-evt-v2') || '') + '|' + (localStorage.getItem('tl-adm-v1') || ''); } catch (e) {}
    if (!force && k === _k) return false; _k = k; const ids = Object.keys(D.BIZ), own = new Set(ids), out = E0().filter(e => !(e.org && own.has(e.org.biz))), cx = [], occL = [];
    const OV = (rd('tl-dash2-v1') || {}).over || {}, AB = (rd('tl-adm-v1') || {}).biz || {};
    ids.forEach(id => { const ov = OV[id]; if ((ov && ov.bdel) || (ov && Array.isArray(ov.mods) && !ov.mods.includes('eventos')) || ((AB[id] || {}).modOff || {}).eventos) return; const bz = bizOf(id); raw(id).forEach(r => { if (!r || r.st === 'draft') return; occ(r).filter(o => o.skip && (r.cxD || {})[o.d]).forEach(o => { const ce = toClient(r, bz, o.d, oidOf(r, o.d)); ce.st = 'cx'; ce.cxWhy = r.cxD[o.d]; cx.push(ce); }); const O = occ(r).filter(o => !o.skip);
      if (O.length <= 1) { const ce = toClient(r, bz, O.length ? O[0].d : r.day, O.length ? oidOf(r, O[0].d) : r.id); (ce.st === 'cx' || ce.st === 'admcx' ? cx : out).push(ce); return; }
      const ser = { id: r.id, l: [repL(r, 1), repL(r, 0)], dates: O.map(o => ({ d: o.d, id: oidOf(r, o.d) })) };
      O.forEach((o, i) => { const ce = toClient(r, bz, o.d, oidOf(r, o.d)); ce.series = { ...ser, i }; (ce.st === 'cx' || ce.st === 'admcx' ? cx : i === 0 ? out : occL).push(ce); }); }); });
    out.sort((a, b) => a.d - b.d); X.E.splice(0, X.E.length, ...out); X.CX = cx; X.OCC = occL;
    if (!X._byP) { X._byP = 1; X.byId = id => X.E.find(e => e.id === id) || (X.OCC || []).find(e => e.id === id) || (X.CX || []).find(e => e.id === id) || null; } return true; }
  W.TLEvP = { FMT, CAT, GEN, fmtsOf, toPanel, fresh, strip, raw, of, calc, toClient, sync, dayL, fH, pH, hsh, occ, repL, oidOf, DOW, nthOf, MAXD, dayH, spanL, daysOf, perDay };
  /* Los scripts del helmet pueden cargar en otro orden: reintenta hasta que existan TLEvt y TLDash2.BIZ. */
  (function boot(n) { if (!(W.TLEvt && W.TLDash2 && W.TLDash2.BIZ)) { if (n < 150) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
