/* Jobs (Panel v2 · Lo que vendes · Jobs = Tu página · Vacantes) = una sola lista para el panel, la pestaña Jobs del cliente, compartir y el Super Admin.
   Reglas del plan: pago real por hora siempre visible; se aplica dentro de To'Latino sin CV; nunca se pide estatus migratorio, SSN ni pago para aplicar.
   Guardado: tl-dash2-v1 · over[id].jobs (lista entera, jobsV: 2) · over[id].jobAns { idSolicitud: { st, iv } } (respuestas a las solicitudes de ejemplo).
   Vacante: { id, t [es,en], kk ft|pt|fds, pay [desde, hasta], tips, dd [0 = lun … 6 = dom], h0, h1, lang [[es|en, 1 obligatorio | 0 suma]], d [es,en],
   req [[es,en]], ben [[es,en]], left (cupos), st live|paused|filled|draft, ago, at }. To'Latino oculta una con tl-adm-v1.biz[id].jobOff[id] y pausa el
   módulo con modOff.jobs. sync() reescribe TLJobs.J[id] (solo las que se ven) y TLJobs.ALL[id] (todas, para las solicitudes ya enviadas). Hoy = jue 24 sep 2026. */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1';
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const cl = o => JSON.parse(JSON.stringify(o));
  const KL = { ft: ['Tiempo completo', 'Full time'], pt: ['Medio tiempo', 'Part time'], fds: ['Fines de semana', 'Weekends'] };
  const DN = [['lunes', 'Monday', 'Lun', 'Mon'], ['martes', 'Tuesday', 'Mar', 'Tue'], ['miércoles', 'Wednesday', 'Mié', 'Wed'], ['jueves', 'Thursday', 'Jue', 'Thu'], ['viernes', 'Friday', 'Vie', 'Fri'], ['sábado', 'Saturday', 'Sáb', 'Sat'], ['domingo', 'Sunday', 'Dom', 'Sun']];
  const fm = (h, es) => { if (h >= 24) return es === false ? 'close' : 'cierre'; const H = ((h % 24) + 24) % 24, hh = Math.floor(H), mm = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const hrsL = (j, es) => fm(j.h0, es) + ' – ' + fm(j.h1, es);
  function daysL(dd, es) { const L = (dd || []).slice().sort((a, b) => a - b); if (!L.length) return es ? 'Por acordar' : 'To be agreed'; if (L.length === 7) return es ? 'Todos los días' : 'Every day';
    const run = L.every((d, i) => !i || d === L[i - 1] + 1); const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (run && L.length >= 3) return es ? cap(DN[L[0]][0]) + ' a ' + DN[L[L.length - 1]][0] : DN[L[0]][1] + ' to ' + DN[L[L.length - 1]][1];
    return L.map(d => DN[d][es ? 2 : 3]).join(', '); }
  const J = (o) => Object.assign({ kk: 'ft', tips: 0, dd: [1, 2, 3, 4, 5], h0: 11, h1: 19, lang: [['es', 1]], d: ['', ''], req: [['Mayor de 18 años', '18 or older']], ben: [], left: 1, st: 'live', ago: 0 }, o);
  const LOCAL = { 'sabor-dominicano': [
    J({ id: 'j-sd-1', t: ['Ayudante de cocina', 'Kitchen helper'], kk: 'ft', pay: [15, 17], dd: [1, 2, 3, 4, 5, 6], h0: 11, h1: 19, lang: [['es', 1], ['en', 0]], d: ['Preparación, limpieza y apoyo en la línea con Rosa y Juan Carlos. Si sabes de cocina dominicana, mejor; si no, te enseñamos.', 'Prep, cleaning and line support with Rosa and Juan Carlos. Dominican cooking experience is a plus; if not, we teach you.'], req: [['Mayor de 18 años', '18 or older'], ['Poder estar de pie todo el turno', 'Able to stand the whole shift']], ben: [['Comida del turno gratis', 'Free shift meal'], ['Pago cada semana', 'Paid weekly'], ['Aumento a los 90 días', 'Raise after 90 days']], ago: 3, left: 1 }),
    J({ id: 'j-sd-2', t: ['Chofer de delivery', 'Delivery driver'], kk: 'pt', pay: [13, 13], tips: 1, dd: [3, 4, 5, 6], h0: 17, h1: 21, lang: [['es', 1], ['en', 1]], d: ['Llevas los pedidos por Hazleton. Te damos la bolsa térmica y la gasolina se paga por milla.', 'You deliver orders around Hazleton. We give you the thermal bag and gas is paid per mile.'], req: [['Carro propio', 'Own car'], ['Licencia de Pensilvania', 'Pennsylvania license'], ['Seguro del carro al día', 'Current car insurance']], ben: [['Propinas completas para ti', 'You keep all tips'], ['Millaje pagado', 'Mileage paid'], ['Comida del turno gratis', 'Free shift meal']], ago: 6, left: 2 })
  ] };
  /* Base de los demás negocios: la de TLJobs (fichas de cada categoría), copiada una vez. sch [días es, días en, horas] → dd, h0, h1. */
  const DE = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], KK = { 'Tiempo completo': 'ft', 'Medio tiempo': 'pt', 'Fines de semana': 'fds' };
  const hP = s => { const m = String(s || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i); if (!m) return /cierre|close/i.test(s) ? 24 : null; let h = +m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0); return h + (+m[2] || 0) / 60; };
  function fromOld(j) { const m = String((j.sch || [])[0] || '').toLowerCase().split(' a '), a = DE.indexOf(m[0]), z = DE.indexOf(m[1] || m[0]), dd = []; if (a >= 0 && z >= a) for (let i = a; i <= z; i++) dd.push(i);
    const hh = String((j.sch || [])[2] || '').split(/\s*[–-]\s*/); return J({ ...cl(j), kk: KK[(j.k || [])[0]] || 'ft', dd: dd.length ? dd : [0, 1, 2, 3, 4], h0: hP(hh[0]) != null ? hP(hh[0]) : 9, h1: hP(hh[1]) != null ? hP(hh[1]) : 17, b0: 1 }); }
  function base(id) { if (LOCAL[id]) return LOCAL[id].map(j => Object.assign(cl(j), { b0: 1 })); const TJ = W.TLJobs; if (!TJ) return null; TJ._j0 = TJ._j0 || {}; if (!(id in TJ._j0)) TJ._j0[id] = TJ.J[id] ? cl(TJ.J[id]) : null; return TJ._j0[id] ? TJ._j0[id].map(fromOld) : null; }
  const ovOf = (id, ov) => ov || ((rd(DK) || {}).over || {})[id] || {};
  const admB = id => ((((rd(AK) || {}).biz || {})[id]) || {});
  function of(id, ov) { const o = ovOf(id, ov), B0 = base(id) || [], own = Array.isArray(o.jobs) ? o.jobs : null; let list;
    if (own && o.jobsV === 2) list = own.map(j => J(cl(j)));
    else list = (own || []).map(j => J({ ...cl(j), dd: Array.isArray(j.dd) ? j.dd : (j.days || []).map(k => ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do'].indexOf(k)).filter(x => x >= 0), kk: j.kk || 'ft', h0: j.h0 != null ? j.h0 : (hP(String((j.sch || [])[2] || '').split(/\s*[–-]\s*/)[0]) || 11), h1: j.h1 != null ? j.h1 : (hP(String((j.sch || [])[2] || '').split(/\s*[–-]\s*/)[1]) || 19) })).concat(B0.filter(b => !(own || []).some(m => m.id === b.id)));
    const off = admB(id).jobOff || {}; list.forEach(j => { j.adm = !!off[j.id]; });
    return { list, ans: o.jobAns || {}, off: (Array.isArray(o.mods) && !o.mods.includes('jobs')), admOff: !!((admB(id).modOff || {}).jobs) }; }
  const has = id => !!LOCAL[id] || !!(W.TLJobs && (W.TLJobs._j0 && W.TLJobs._j0[id] || W.TLJobs.J[id])) || Array.isArray(ovOf(id).jobs);
  /* Forma del cliente (la que leen la pestaña Jobs, el detalle, aplicar y compartir). */
  const view = j => ({ ...j, k: KL[j.kk] || KL.ft, sch: [daysL(j.dd, true), daysL(j.dd, false), hrsL(j, true)], schEn: hrsL(j, false) });
  const shown = j => j.st === 'live' && !j.adm;
  /* Solicitudes de ejemplo, estables por vacante (las de la sesión llegan aparte, por props.live). */
  const NM = [['Wendy Tavárez', '(570) 555-0134'], ['Junior Almánzar', '(570) 555-0187'], ['Kenia Rosario', '(570) 555-0119'], ['Darlin Mejía', '(570) 555-0172'], ['Yokasta Peña', '(570) 555-0145'], ['Elvin Castillo', '(570) 555-0163'], ['Mariela Cruz', '(570) 555-0128']];
  const NOTE = [['Trabajé 2 años en un restaurante en Santiago.', 'I worked 2 years at a restaurant in Santiago.'], ['Puedo empezar el lunes.', 'I can start Monday.'], ['', ''], ['Vivo cerca, en Alter St.', 'I live close, on Alter St.'], ['', '']];
  const hs = s => { let x = 7; for (const c of String(s)) x = (Math.imul(x, 31) + c.charCodeAt(0)) >>> 0; return Math.imul(x ^ (x >>> 13), 2654435761) >>> 0; };
  function apps(id, j, ans) { if (!j || !j.b0) return []; const n = 2 + hs(j.id) % 4, out = [];
    for (let i = 0; i < n; i++) { const x = hs(j.id + '|' + i), p = NM[(hs(j.id) % NM.length + i) % NM.length], ST = ['seen', 'contact', 'iv', 'no'], st0 = i === 0 ? 'sent' : ST[(i - 1 + (hs(j.id) >>> 17)) % ST.length], a = (ans || {})['A-' + j.id + '-' + i];
      out.push({ id: 'A-' + j.id + '-' + i, job: j.id, name: p[0], phone: p[1], exp: [0, 1, 3, 4][(x >>> 5) % 4], days: (j.dd || []).filter((d, k) => (x >>> (k + 7)) % 3), langs: (x >>> 11) % 2 ? ['es', 'en'] : ['es'], note: NOTE[(x >>> 9) % NOTE.length], st: a ? a.st : st0, iv: a ? a.iv || '' : st0 === 'iv' ? 'Sáb 26 sep · 3:00 PM' : '', at: i === 0 ? ['hoy 11:52 AM', 'today 11:52 AM'] : [['ayer', 'yesterday'], ['hace 2 días', '2 days ago'], ['hace 3 días', '3 days ago']][i % 3], sample: 1 }); }
    return out; }
  let _k = null;
  function sync(force) { const TJ = W.TLJobs; if (!TJ || !TJ.J) return false; let key = ''; try { key = (localStorage.getItem(DK) || '') + '|' + (localStorage.getItem(AK) || '') + '|' + Object.keys(TJ.J).length; } catch (e) {} if (!force && key === _k) return false; _k = key;
    TJ.ALL = TJ.ALL || {}; const ovA = (rd(DK) || {}).over || {}, ids = Array.from(new Set(Object.keys(TJ._j0 || {}).concat(Object.keys(TJ.J), Object.keys(LOCAL), Object.keys(ovA).filter(k => Array.isArray(ovA[k].jobs)))));
    ids.forEach(id => { base(id); const R = of(id); if (!R) return; const all = R.list.map(view); TJ.ALL[id] = all; TJ.J[id] = R.off ? [] : all.filter(shown); });
    return true; }
  W.TLJobP = { KL, DN, has, of, view, shown, apps, sync, daysL, hrsL, fm };
  (function boot(n) { if (!W.TLJobs) { if (n < 120 && (W.TLAll || n < 30)) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
