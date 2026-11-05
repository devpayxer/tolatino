/* Servicios de Belleza (Panel v2 · Lo que vendes · Servicios) = una sola lista para el panel, la página del negocio, el Booking y el Super Admin.
   Base = la misma de la ficha del cliente (neg-bell-listing SVC). Modelo silla: cada barbero renta su silla y pone su precio (pr por nombre de
   servicio, como neg-bell-book PROS); el dueño edita su propio precio (prOwn); los demás lo ponen desde su silla.
   Guardado: tl-dash2-v1 · over[id].svcs [{ id, k0, cat, n:[es,en], d:[es,en], p, dur, buf, vary, hid, ph }] · over[id].svcCats [[es,en]] · over[id].prOwn {id: $}.
   To'Latino oculta un servicio con tl-adm-v1.biz[id].itemOff['sv:'+id]. sync() reescribe TLBellL.SVC[id], TLListing.MENU[id] y el menú de cada silla. */
(function () {
  const W = window;
  const PH0 = {"Corte clásico":34702982,"Fade":39559270,"Corte + barba":897262,"Corte de niño":7697363,"Arreglo de barba":8867486,"Afeitado clásico":5568407,"Diseño":37339533};
  const S = (id, cat, es, d, p, dur, vary) => ({ id, k0: es, cat, n: [es, ''], d: [d, ''], p, dur, buf: 0, vary, hid: 0, ph: PH0[es] || null });
  const BASE = { 'barberia-el-primo': { model: 'chair', rent: 150, comm: 60, word: ['barbero', 'barber', 'barberos', 'barbers'],
    cats: [['Cortes', 'Cuts'], ['Barba', 'Beard'], ['Extras', 'Extras']],
    svcs: [S('sv1', 'Cortes', 'Corte clásico', 'Máquina y tijera, con lavado', 20, 30, 1), S('sv2', 'Cortes', 'Fade', 'Low, mid o high, con navaja', 25, 40, 1), S('sv3', 'Cortes', 'Corte + barba', 'Fade y barba perfilada con toalla caliente', 35, 55, 1), S('sv4', 'Cortes', 'Corte de niño', 'Hasta 12 años', 15, 25, 1),
      S('sv5', 'Barba', 'Arreglo de barba', 'Perfilado con navaja', 12, 20, 1), S('sv6', 'Barba', 'Afeitado clásico', 'Toalla caliente y navaja', 20, 30, 1), S('sv7', 'Extras', 'Diseño', 'Líneas o diseño en la nuca', 5, 10, 1), S('sv8', 'Extras', 'Cejas', 'Con navaja', 5, 5, 0)],
    pros: [{ id: 'silla-luis-batista', seat: 1, first: 'Luis', own: 1, ph: 8552627, pr: { 'Corte clásico': 22, 'Fade': 28, 'Corte + barba': 38, 'Corte de niño': 15, 'Arreglo de barba': 14, 'Afeitado clásico': 22 } },
      { id: 'silla-kelvin-rosario', seat: 2, first: 'Kelvin', own: 0, ph: 18483772, pr: { 'Corte clásico': 20, 'Fade': 25, 'Corte + barba': 35, 'Corte de niño': 15, 'Arreglo de barba': 12, 'Afeitado clásico': 20 } },
      { id: 'silla-andy-mejia', seat: 3, first: 'Andy', own: 0, ph: 12946033, pr: { 'Corte clásico': 18, 'Fade': 22, 'Corte + barba': 30, 'Corte de niño': 12, 'Arreglo de barba': 10 } },
      { id: 'silla-johan-peralta', seat: 4, first: 'Johan', own: 0, ph: 9387375, pr: { 'Corte clásico': 20, 'Fade': 25, 'Corte + barba': 32, 'Arreglo de barba': 12, 'Afeitado clásico': 18 } }] } };
  /* Salón con empleadas (Glamour) y una persona en su casa (Yaritza): mismas listas que la ficha (neg-bell-listing SVC, extras de neg-bell-book ADD). */
  const ALLN = L => Object.fromEntries(L.map(n => [n, 1]));
  BASE['salon-glamour'] = { model: 'staff', rent: 0, comm: 60, word: ['estilista', 'stylist', 'estilistas', 'stylists'], cats: [['Peinado', 'Styling'], ['Color', 'Color'], ['Tratamientos', 'Treatments'], ['Extras', 'Extras']],
    svcs: [S('sv1', 'Peinado', 'Blower y planchado', 'Lavado, secado y plancha', 35, 60, 0), S('sv2', 'Peinado', 'Rolos', 'Lavado y rolos, estilo dominicano', 30, 75, 0), S('sv3', 'Peinado', 'Peinado de fiesta', 'Recogido o semirrecogido', 55, 60, 0), S('sv4', 'Color', 'Tinte completo', 'Un tono, incluye lavado', 65, 90, 0), S('sv5', 'Color', 'Mechas', 'Con papel, desde', 95, 150, 0), S('sv6', 'Color', 'Retoque de raíz', 'Hasta 1 pulgada', 45, 60, 0), S('sv7', 'Tratamientos', 'Keratina', 'Pelo mediano, dura 3 a 4 meses', 150, 180, 0), S('sv8', 'Tratamientos', 'Hidratación profunda', 'Con vapor', 25, 30, 0), S('sv9', 'Extras', 'Hidratación con vapor', '', 15, 20, 0), S('sv10', 'Extras', 'Puntas', '', 10, 15, 0)],
    pros: [{ id: 'st-carmen', first: 'Carmen', own: 1, ph: 3993458, pr: ALLN(['Blower y planchado', 'Rolos', 'Peinado de fiesta', 'Tinte completo', 'Retoque de raíz', 'Hidratación profunda']) }, { id: 'st-yessenia', first: 'Yessenia', own: 0, ph: 8834020, pr: ALLN(['Blower y planchado', 'Rolos', 'Keratina', 'Hidratación profunda']) }, { id: 'st-paola', first: 'Paola', own: 0, ph: 8834025, pr: ALLN(['Tinte completo', 'Mechas', 'Retoque de raíz', 'Hidratación profunda']) }] };
  BASE['trenzas-yaritza'] = { model: 'staff', solo: 1, rent: 0, comm: 60, word: ['trenzista', 'braider', 'trenzistas', 'braiders'], cats: [['Trenzas', 'Braids'], ['Extensiones', 'Extensions'], ['Extras', 'Extras']],
    svcs: [S('sv1', 'Trenzas', 'Box braids medianas', 'Hasta la espalda, incluye pelo', 180, 300, 0), S('sv2', 'Trenzas', 'Knotless', 'Medianas, incluye pelo', 220, 330, 0), S('sv3', 'Trenzas', 'Cornrows', 'Hasta 10 trenzas', 60, 90, 0), S('sv4', 'Trenzas', 'Trenzas de niña', 'Con cuentas, hasta 10 años', 50, 90, 0), S('sv5', 'Extensiones', 'Sew-in', 'Pelo del cliente', 150, 180, 0), S('sv6', 'Extensiones', 'Retoque de trenzas', 'Bordes y frente', 45, 60, 0), S('sv7', 'Extras', 'Cuentas', '', 10, 15, 0), S('sv8', 'Extras', 'Lavado antes', '', 15, 20, 0)],
    pros: [{ id: 'st-yaritza', first: 'Yaritza', own: 1, ph: 3993302, pr: ALLN(['Box braids medianas', 'Knotless', 'Cornrows', 'Trenzas de niña', 'Sew-in', 'Retoque de trenzas']) }] };
  /* Opciones de base cuando el Panel abre solo (sin TLBook): mismas que neg-bell-book.js OPT. */
  const LEN = (a, b2) => ['Largo del pelo', 'Hair length', [['Corto', 'Short', 0, 0], ['Mediano', 'Medium', a, 15], ['Largo', 'Long', b2, 30]]];
  const BRAID = [['Largo', 'Length', [['Hombros', 'Shoulders', -30, -60], ['Espalda', 'Mid-back', 0, 0], ['Cintura', 'Waist', 50, 90]]], ['El pelo', 'Hair', [['Incluido', 'Included', 0, 0], ['Lo traigo yo', 'I bring my own', -25, 0]]]];
  const OPTB = { 'Blower y planchado': [LEN(10, 20)], 'Rolos': [LEN(10, 15)], 'Tinte completo': [LEN(15, 30)], 'Mechas': [['Cuánto', 'How much', [['Parciales', 'Partial', 0, 0], ['Completas', 'Full', 40, 45]]], LEN(15, 30)], 'Keratina': [['Largo del pelo', 'Hair length', [['Corto', 'Short', -30, -30], ['Mediano', 'Medium', 0, 0], ['Largo', 'Long', 40, 45]]]], 'Box braids medianas': BRAID, 'Knotless': BRAID };
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const ovOf = (id, ov) => ov || ((rd('tl-dash2-v1') || {}).over || {})[id] || {};
  const admOff = (id, sid) => !!((((rd('tl-adm-v1') || {}).biz || {})[id] || {}).itemOff || {})['sv:' + sid];
  /* Negocios que llegan del alta (dash2-onb.js) se registran aquí con su propia base. */
  const reg = (id, def) => { BASE[id] = def; _k = null; };
  const pull = id => { if (!BASE[id] && W.__svcReg && W.__svcReg[id]) BASE[id] = W.__svcReg[id]; };
  const has = id => { pull(id); return !!BASE[id]; };
  function of(id, ov) { pull(id); const B0 = BASE[id]; if (!B0) return null; const o = ovOf(id, ov), svcs = Array.isArray(o.svcs) ? o.svcs : B0.svcs.map(x => ({ ...x, n: x.n.slice(), d: x.d.slice() })), cats = Array.isArray(o.svcCats) && o.svcCats.length ? o.svcCats : B0.cats.map(c => c.slice());
    cats.forEach(c => { if (!svcs.some(s => s.cat === c[0]) && c[0] !== 'Extras') {} }); svcs.forEach(s => { if (!cats.some(c => c[0] === s.cat)) cats.push([s.cat, '']); });
    /* Modelo: chair = rentan silla (cada uno pone su precio) · comm = comisión (precio de la barbería, al barbero le toca un %) · staff = empleados (precio de la barbería). */
    const model = ['chair', 'comm', 'staff'].includes(o.svcModel) ? o.svcModel : B0.model, prOwn = o.prOwn || {}, svcDo = o.svcDo || {}, comm = { ...Object.fromEntries(B0.pros.filter(p => !p.own).map(p => [p.id, B0.comm || 60])), ...(o.svcComm || {}) }, rent = o.svcRent != null ? +o.svcRent : (B0.rent || 0);
    const isBase = s => B0.svcs.some(x => x.k0 === s.k0), does = (p, s) => svcDo[p.id] && svcDo[p.id][s.id] != null ? !!svcDo[p.id][s.id] : (p.pr[s.k0] != null || !isBase(s));
    /* Staff aceptado en el panel (over.team st 'ok') que aún no está en Servicios entra como uno más: sin precios (silla) o sin servicios marcados (empleados/comisión) hasta que el dueño lo ponga. */
    const team = (Array.isArray(o.team) ? o.team : ((W.TLDash2 && W.TLDash2.BIZ && W.TLDash2.BIZ[id]) || {}).team) || [], fN = s => String(s || '').replace(/".*?"\s*/, '').trim().split(' ')[0].toLowerCase();
    const extra = team.filter(t => t && t.st === 'ok' && !B0.pros.some(p => fN(p.first) === fN(t.name))).map((t, j) => ({ id: 'tm-' + t.id, first: String(t.name).split(' ')[0], own: 0, ph: t.ph || null, pr: {}, seat: (B0.pros.length + j + 1), fromTeam: 1 }));
    const pros = B0.pros.concat(extra).map(p => ({ ...p, pr: Object.fromEntries(svcs.map(s => [s.id, s.cat === 'Extras' ? null : model === 'chair' ? (p.own && prOwn[s.id] !== undefined ? prOwn[s.id] : (p.pr[s.k0] != null ? p.pr[s.k0] : null)) : (does(p, s) ? +s.p : null)])) }));
    const SPH0 = (W.TLBook && (W.TLBook._sph0 || W.TLBook.SPH)) || {};
    const OPT0 = (W.TLBook && (W.TLBook._opt0 || W.TLBook.OPT)) || OPTB, optOf = s => Array.isArray(s.opts) ? s.opts : (OPT0[s.k0] || OPT0[s.n[0]] || []).map(([te, tn, os]) => ({ t: [te, tn], o: os.map(([oe, on, p, m]) => ({ n: [oe, on], p: +p || 0, m: +m || 0 })) }));
    return { model, comm, rent, svcDo, solo: !!B0.solo, word: B0.word, cats, svcs: svcs.map(s => ({ ...s, ph: s.ph || SPH0[s.k0] || null, adm: admOff(id, s.id), opts: s.cat === 'Extras' ? [] : optOf(s) })), pros, prOwn }; }
  /* Lo que ve el cliente: rango de precio por servicio (modelo silla) y si sale o no. */
  function range(T, s) { if (T.model !== 'chair' || s.cat === 'Extras') return [s.p, s.p]; const L = T.pros.map(p => p.pr[s.id]).filter(v => v != null); return L.length ? [Math.min(...L), Math.max(...L)] : [s.p, s.p]; }
  const live = s => !s.hid && !s.adm;
  function items(id, ov) { const T = of(id, ov); if (!T) return null; return T.svcs.map(s => ({ id: s.id, name: s.n[0], en: s.n[1], price: range(T, s)[0], unit: (T.model === 'chair' ? s.vary : s.vary && s.cat !== 'Extras') || range(T, s)[0] !== range(T, s)[1] ? 'desde' : 'fijo', dur: s.dur, cat: s.cat, ph: s.ph, sell: live(s) ? 1 : 0, ago: 0, desc: s.d[0], pop: 0, opts: 0, hid: s.hid, admHid: s.adm, svc: 1 })); }
  var _k = null;
  function sync(force) { const BL = W.TLBellL, X = W.TLListing; if (!BL || !BL.SVC || !X || !X.MENU) return false; let key = ''; try { key = (localStorage.getItem('tl-dash2-v1') || '') + '|' + (localStorage.getItem('tl-adm-v1') || ''); } catch (e) {}
    if (!force && key === _k) return false; _k = key;
    { const BK = W.TLBook; if (BK && BK.OPT && BK._opt0) Object.keys(OPTSET).forEach(n => { if (BK._opt0[n]) BK.OPT[n] = JSON.parse(JSON.stringify(BK._opt0[n])); else delete BK.OPT[n]; delete OPTSET[n]; }); } const PR = (W.TLBook && W.TLBook.PROS) || [];
    Object.keys(BASE).forEach(id => { const T = of(id); if (!T) return; const o = ovOf(id); if (!o.svcs && !o.prOwn && !o.svcModel && !o.svcDo && !Object.keys((((rd('tl-adm-v1') || {}).biz || {})[id] || {}).itemOff || {}).some(k => k.indexOf('sv:') === 0)) return;
      const secs = T.cats.map(c => [c[0], c[1] || c[0], T.svcs.filter(s => s.cat === c[0] && live(s)).map(s => [s.n[0], s.d[0], range(T, s)[0], s.dur, (T.model === 'chair' ? s.vary : s.vary && s.cat !== 'Extras') || range(T, s)[0] !== range(T, s)[1] ? 1 : 0])]).filter(g => g[2].length);
      /* Comisión o empleados: la barbería maneja la agenda (flujo «shop» del Booking): precio único y quién hace cada servicio (CFG.stf = posiciones en el Staff). */
      { const BK = W.TLBook, bs = [].concat((W.TLAll && W.TLAll.B) || [], (W.TLBeauty && W.TLBeauty.B) || []).filter(b => b && b.id === id); bs.forEach(b => { if (b._m0 === undefined) b._m0 = b.m; b.m = T.model === 'chair' || b._m0 === 'solo' ? b._m0 : 'shop'; });
        /* Si la barbería no renta sillas, las sillas dejan de ser negocios propios: salen de búsqueda, listas y mapa (se guardan para volver). */
        { const AL = W.TLAll && W.TLAll.B, BE = W.TLBeauty && W.TLBeauty.B, ids = new Set(PR.filter(p => p.at === id).map(p => p.id)); W.__svcChairs = W.__svcChairs || {};
          [AL, BE].forEach((L, li) => { if (!Array.isArray(L)) return; const kk = id + '|' + li; if (T.model === 'chair') { const back = W.__svcChairs[kk] || []; back.forEach(b => { if (!L.some(x => x.id === b.id)) L.push(b); }); W.__svcChairs[kk] = []; }
            else { const out = L.filter(b => ids.has(b.id)); if (out.length) { W.__svcChairs[kk] = (W.__svcChairs[kk] || []).concat(out.filter(b => !(W.__svcChairs[kk] || []).some(x => x.id === b.id))); for (let q = L.length - 1; q >= 0; q--) if (ids.has(L[q].id)) L.splice(q, 1); } } }); }
        if (BK && BK.CFG) { BK._cfg0 = BK._cfg0 || {}; if (!(id in BK._cfg0)) BK._cfg0[id] = BK.CFG[id] ? { ...BK.CFG[id] } : null;
          if (T.model === 'chair') { if (BK._cfg0[id]) BK.CFG[id] = { ...BK._cfg0[id] }; else delete BK.CFG[id]; }
          else { const ow = T.pros.find(p => p.own) || T.pros[0], P0 = (BK.PROS || []).find(p => p.id === ow.id) || {}, stf = {}; T.svcs.filter(s => live(s) && s.cat !== 'Extras').forEach(s => { const SL = (X.STAFF && X.STAFF[id]) || []; stf[s.n[0]] = T.pros.map(p => p.pr[s.id] != null ? SL.findIndex(r => String(r[0]).split(' ')[0].toLowerCase() === String(p.first).toLowerCase()) : -1).filter(k => k >= 0); }); BK.CFG[id] = { ...(BK._cfg0[id] || {}), ...(P0.id ? { apr: P0.apr || 15, dep: P0.dep || 0, cx: P0.cx || 4 } : {}), tol: (BK._cfg0[id] || {}).tol || 10, stf }; } } }
      if (BL.SVC[id]) BL.SVC[id].splice(0, BL.SVC[id].length, ...secs); else BL.SVC[id] = secs;
      X.MENU[id] = secs.map(([te, tn, its]) => [te, tn, its.map(([n, d, p, mi, v]) => [n, (mi ? mi + ' min · ' : '') + d, p, mi, v])]);
      book(id, T);
      PR.filter(p => p.at === id).forEach(p => { if (!p._pr0) p._pr0 = { ...(p.pr || {}) }; const bp = T.pros.find(q => q.id === p.id), pr = {};
        T.svcs.forEach(s => { if (!live(s) || s.cat === 'Extras') return; const v = bp ? bp.pr[s.id] : p._pr0[s.k0]; if (v != null) pr[s.n[0]] = v; }); p.pr = pr;
        X.MENU[p.id] = secs.filter(g => g[0] !== 'Extras').map(([te, tn, its]) => [te, tn, its.filter(it => pr[it[0]] != null).map(it => [it[0], it[3] + ' min · ' + it[1], pr[it[0]], it[3], 0])]).filter(g => g[2].length); }); });
    citasSync(); return true; }
  /* Booking: los Extras del panel = los del paso de Booking (TLBook.ADD); la foto de cada servicio (TLBook.SPH por nombre); el tiempo entre citas
     (buf) se suma al bloque que ocupa la cita en la agenda (slotsFor), sin cambiar la duración que ve el cliente. */
  const BUFN = {}, OPTSET = {};
  function book(id, T) { const BK = W.TLBook; if (!BK || !BK.ADD) return; if (!BK._sph0) BK._sph0 = { ...BK.SPH }; if (!BK._add0) BK._add0 = JSON.parse(JSON.stringify(BK.ADD)); if (!BK._opt0) BK._opt0 = JSON.parse(JSON.stringify(BK.OPT || {}));
    /* Opciones del panel (grupos que cambian precio y tiempo) → TLBook.OPT por nombre del servicio (el Booking pide «Elige: …»). */
    if (BK.OPT) T.svcs.forEach(s => { if (s.cat === 'Extras') return; const g = (s.opts || []).filter(x => (x.t[0] || '').trim() && (x.o || []).filter(o => (o.n[0] || '').trim()).length >= 2); OPTSET[s.n[0]] = 1; if (g.length) BK.OPT[s.n[0]] = g.map(x => [x.t[0], x.t[1] || x.t[0], x.o.filter(o => (o.n[0] || '').trim()).map(o => [o.n[0], o.n[1] || o.n[0], +o.p || 0, +o.m || 0])]); else delete BK.OPT[s.n[0]]; });
    const A0 = BK._add0[id] || [], ex = T.svcs.filter(s => s.cat === 'Extras' && live(s)), secOf = s => { const a = A0.find(x => x[0] === s.k0 || x[0] === s.n[0]); return a && a[4] ? a[4] : null; };
    BK.ADD[id] = ex.map(s => { const sc = secOf(s), r = [s.n[0], s.n[1] || s.n[0], +s.p || 0, +s.dur || 0]; if (sc) r.push(sc); return r; });
    T.svcs.forEach(s => { if (s.ph) BK.SPH[s.n[0]] = s.ph; }); BUFN[id] = Object.fromEntries(T.svcs.filter(s => +s.buf > 0).map(s => [s.n[0], +s.buf]));
    if (!BK._bufW) { BK._bufW = 1; const pO = BK.priceOf, sO = BK.slotsFor, shop = own => { const p = (BK.PROS || []).find(q => q.id === own); return p ? p.at : own; }; let last = {};
      BK.priceOf = function (own, n) { const r = pO.apply(this, arguments); last[shop(own)] = ((BUFN[shop(own)] || {})[n]) || 0; return r; };
      BK.slotsFor = function (own, stf, i, m, evt) { return sO.call(this, own, stf, i, (+m || 0) + (last[shop(own)] || 0), evt); };
      BK.nextFree && (BK.nextFree = (f => function (own, stf, m, from) { return f.call(this, own, stf, (+m || 0) + (last[shop(own)] || 0), from); })(BK.nextFree)); } }
  /* Citas (Panel · Lo que vendes · Citas = over[id].modCfg.citas { auto, dep, cxh, apr, staffPick }) → Booking del cliente (TLBook.CFG).
     Renta de silla: aplica a la silla del dueño (cada barbero decide en la suya). Dueño apaga Citas (over.mods sin 'citas') o To'Latino la pausa
     (tl-adm-v1.biz[id].modOff.citas) → TLBook.OFF[id]: sin Booking, «llama o pasa por el local». */
  const CDEF = { 'barberia-el-primo': { auto: 0, dep: 10, cxh: 4, apr: 15, staffPick: 1 }, 'salon-glamour': { auto: 0, dep: 15, cxh: 24, apr: 20, staffPick: 1 }, 'trenzas-yaritza': { auto: 0, dep: 40, cxh: 24, apr: 60, staffPick: 1 } };
  function citaOf(id, ov) { const o = ovOf(id, ov), d = CDEF[id] || { auto: 0, dep: 0, cxh: 2, apr: 30, staffPick: 1 }; return { ...d, ...((o.modCfg || {}).citas || {}) }; }
  function citaOff(id, ov) { const o = ovOf(id, ov), a = ((((rd('tl-adm-v1') || {}).biz || {})[id] || {}).modOff || {}).citas; return a ? 'adm' : Array.isArray(o.mods) && !o.mods.includes('citas') ? 'own' : ''; }
  let _cT = 0; function citasSync() { const BK = W.TLBook; if (!BK || !BK.CFG || !BK.PROS) { if (_cT++ < 60) setTimeout(citasSync, 150); return; } const OV = (rd('tl-dash2-v1') || {}).over || {}, AD = (rd('tl-adm-v1') || {}).biz || {}, AL = (W.TLAll && W.TLAll.B) || [];
    BK._c0 = BK._c0 || {}; BK.OFF = BK.OFF || {};
    Object.keys(BK._c0).forEach(t => { const r = BK._c0[t]; if (r.pro) { const p = BK.PROS.find(q => q.id === t); if (p) p.cx = r.pro.cx; if (BK.CFG[t]) BK.CFG[t].cx = r.pro.cx; return; } if (r.cfg) BK.CFG[t] = { ...r.cfg }; else delete BK.CFG[t]; });
    Object.keys(BK.OFF).forEach(k => { delete BK.OFF[k]; });
    new Set(Object.keys(OV).concat(Object.keys(AD))).forEach(id => { const b = AL.find(x => x.id === id); if (!b || !b.bell || b.m === 'silla') return; const o = OV[id] || {};
      const off = (AD[id] && AD[id].modOff && AD[id].modOff.citas) ? 'adm' : Array.isArray(o.mods) && !o.mods.includes('citas') ? 'own' : ''; if (off) BK.OFF[id] = off;
      const c = (o.modCfg || {}).citas; if (!c) return; const v = { ...citaOf(id, o) };
      const p = b.m === 'chair' ? BK.PROS.find(q => q.at === id && (q.j === 0 || q.own)) : null, t = p ? p.id : id;
      if (!BK._c0[t]) BK._c0[t] = { cfg: BK.CFG[t] ? { ...BK.CFG[t] } : null, pro: p ? { cx: p.cx } : null };
      /* Silla: solo la cancelación (confirmar al instante, respuesta y depósito los maneja «Sillas y agenda», dash2-cat). */
      if (p) { p.cx = +v.cxh || 2; BK.CFG[t] = { ...(BK.CFG[t] || {}), cx: p.cx }; return; }
      const nc = { ...(BK.CFG[t] || {}), auto: v.auto ? 1 : 0, dep: +v.dep || 0, cx: +v.cxh || 2, apr: +v.apr || 30, pick0: v.staffPick === false ? 1 : 0 };
      if (BK._c0[t].cfg && BK._c0[t].cfg.dep !== nc.dep) delete nc.depSecs; BK.CFG[t] = nc; });
    /* Tienda: los productos del panel (Lo que vendes · items de «Tienda») = la pestaña Tienda de la ficha (TLBellL.SHOP, apartar y pagar al recoger).
       Agotado o «solo catálogo» = no sale; quedan = stock. To'Latino oculta uno con itemOff[id del producto]. */
    const BL = W.TLBellL; if (BL && BL.SHOP) { BL._shop0 = BL._shop0 || {}; Object.keys(BL._shop0).forEach(id => { BL.SHOP[id] = BL._shop0[id]; });
      Object.keys(OV).forEach(id => { const b = AL.find(x => x.id === id), o = OV[id] || {}; if (!b || !b.bell || !Array.isArray(o.items)) return; const off = ((AD[id] || {}).itemOff) || {};
        const L = o.items.filter(i => i.cat === 'Tienda' && i.sell && !i.ago && !off[i.id]); if (!(id in BL._shop0)) BL._shop0[id] = BL.SHOP[id];
        if (Array.isArray(o.mods) && !o.mods.includes('shop')) { BL.SHOP[id] = []; return; } BL.SHOP[id] = L.map(i => [i.name, i.desc || '', +i.price || 0, i.ph, i.stock != null ? +i.stock : 9]); }); } }
  W.TLSvc = { BASE, has, of, items, range, sync, book, reg, citaOf, citaOff, citasSync };
  (function boot(n) { if (!(W.TLBellL && W.TLListing)) { if (n < 120 && (W.TLAll || n < 30)) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
