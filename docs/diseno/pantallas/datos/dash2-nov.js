/* Novedades (Panel v2 · Tu página · Novedades) = una sola lista para el panel, la pestaña Novedades del cliente, «Hoy en el barrio» y el Super Admin.
   Base = las mismas publicaciones que ve el cliente (TLNov.POSTS · Sabor; las de la ficha de Belleza · El Primo) + 2 del panel (programada y terminada).
   Guardado: tl-dash2-v1 · over[id].nov (lista entera desde que el dueño toca algo, novV: 2) · over[id].pinned · over[id].novRp { idPost: { j: respuesta } }.
   Fila: { id, b0 (de la base), type oferta|hoy|aviso|encuesta|cupon|novedad, t [es,en], t0, txt, txt0, st live|prog|rep|done, h, when, views, saves, orders, cm }.
   To'Latino oculta una con tl-adm-v1.biz[id].novOff[idPost] y pausa el módulo con modOff.nov. Hoy = jue 24 sep 2026, 12:30 PM. */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1';
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const K2P = { oferta: 'oferta', hoy: 'hoy', horario: 'aviso', encuesta: 'encuesta', cupon: 'cupon', nov: 'novedad', evento: 'novedad', vacante: 'novedad' };
  const P2K = { oferta: 'oferta', hoy: 'hoy', aviso: 'horario', encuesta: 'encuesta', cupon: 'cupon', novedad: 'nov' };
  const BELL = { 'barberia-el-primo': [{ k: 'oferta', h: 2, es: 'Corte + barba $30 hoy, hasta las 5 PM.', en: 'Cut + beard $30 today, until 5 PM.', up: 14, dn: 0, cm: [] }, { k: 'nov', h: 20, es: 'Johan se unió a El Primo: afeitado clásico con toalla caliente.', en: 'Johan joined El Primo: classic hot towel shave.', up: 9, dn: 0, cm: [] }] };
  const EXTRA = { 'sabor-dominicano': [{ id: 'p-thx', type: 'aviso', t: ['Cerramos el jue 26 nov (Acción de Gracias)', 'Closed Thu Nov 26 (Thanksgiving)'], txt: '', st: 'prog', when: ['Programada · sale el 20 nov', 'Scheduled · goes out Nov 20'], views: 0, saves: 0, orders: 0, sch: { mode: 'once', date: 57, time: 600 } }, { id: 'p-sanc', type: 'novedad', t: ['Llegó el sancocho de siete carnes', 'Seven-meat sancocho is here'], txt: '', st: 'done', when: ['Terminada · sáb 19 sep', 'Ended · Sat Sep 19'], views: 412, saves: 31, orders: 27 }] };
  const hs = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const split = s => { const m = String(s || '').match(/^(.+?[.!?])\s+(.+)$/); return m ? [m[1].replace(/[.]$/, ''), m[2]] : [String(s || '').replace(/[.]$/, ''), '']; };
  function raw(id) { const T = W.TLNov && W.TLNov.POSTS && W.TLNov.POSTS[id]; if (T) return T; if (BELL[id]) return BELL[id].map((p, j) => Object.assign({ id: id + '-' + j }, p)); return null; }
  const whenOf = h => h < 24 ? ['En Hoy en el barrio · quedan ' + (24 - h) + ' h', 'In Today nearby · ' + (24 - h) + ' h left'] : ['En tu página · hace ' + (h < 48 ? '1 día' : Math.floor(h / 24) + ' días'), 'On your page · ' + (h < 48 ? '1 day' : Math.floor(h / 24) + ' days') + ' ago'];
  function base(id) { const R = raw(id); if (!R) return null;
    return R.map(p => { const a = split(p.es), b = split(p.en), x0 = hs(p.id + '|' + id + '|' + p.h), x = Math.imul(x0 ^ (x0 >>> 13), 2654435761) >>> 0, y = Math.imul(x ^ (x >>> 11), 2246822519) >>> 0;
      return { id: p.id, b0: 1, type: K2P[p.k] || 'novedad', t: [a[0], b[0]], t0: [a[0], b[0]], txt: a[1], txt0: a[1], st: 'live', h: p.h, when: whenOf(p.h), views: 60 + x % 380, saves: ['oferta', 'cupon'].includes(p.k) ? 6 + y % 34 : y % 9, orders: p.k === 'oferta' ? 3 + (y >>> 7) % 18 : 0, cm: (p.cm || []).length, pin0: p.pin ? 1 : 0 }; })
      .concat((EXTRA[id] || []).map(n => Object.assign({}, n))); }
  const ovOf = (id, ov) => ov || ((rd(DK) || {}).over || {})[id] || {};
  const admB = id => ((((rd(AK) || {}).biz || {})[id]) || {});
  function of(id, ov) { const o = ovOf(id, ov), B0 = base(id), own = Array.isArray(o.nov) ? o.nov : null; let list = null;
    if (own && o.novV === 2) list = own.map(n => Object.assign({}, n));
    else if (B0) list = (own || []).filter(n => /^n\d{9,}$/.test(n.id)).map(n => Object.assign({}, n)).concat(B0);
    else if (own) list = own.map(n => Object.assign({}, n));
    if (!list) return null;
    /* Programadas y que se repiten salen solas a su hora (hoy = jue 24 sep, 12:30 PM = 750 min; días 0 = dom). */
    const NOW = 750, DOW = 4, fT = m => { const h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
    list.forEach(n => { const sc = n.sch; if (!sc || n.adm) return; const t = +sc.time || 0;
      if (n.st === 'prog' && (+sc.date < 0 || (+sc.date === 0 && t <= NOW))) { n.st0 = 'prog'; n.st = 'live'; n.auto = 1; n.h = Math.max(0, Math.floor((NOW - t) / 60)); n.when = ['Salió sola hoy a las ' + fT(t) + ' · quedan ' + (24 - n.h) + ' h en Hoy en el barrio', 'Went out on its own today at ' + fT(t) + ' · ' + (24 - n.h) + ' h left in Today nearby']; }
      else if (n.st === 'rep' && (sc.days || []).includes(DOW) && t <= NOW) { n.st0 = 'rep'; n.st = 'live'; n.auto = 1; n.h = Math.max(0, Math.floor((NOW - t) / 60)); n.when = ['Se repite · hoy salió a las ' + fT(t), 'Repeats · today it went out at ' + fT(t)]; } });
    const off = admB(id).novOff || {}; list.forEach(n => { n.adm = !!off[n.id]; });
    const pinned = o.pinned !== undefined ? o.pinned : (((raw(id) || []).find(p => p.pin)) || {}).id || null;
    return { list, pinned, rp: o.novRp || {} }; }
  const has = id => !!raw(id) || Array.isArray(ovOf(id).nov);
  const modOff = (id, ov) => { const o = ovOf(id, ov); return (Array.isArray(o.mods) && !o.mods.includes('nov')) || !!((admB(id).modOff || {}).nov); };
  /* Lo que ve el cliente: filas en vivo (ni detenidas, ni quitadas, ni ocultas por To'Latino) y la fijada. */
  function live(id, ov) { const R = of(id, ov); if (!R) return null; return { off: modOff(id, ov), rows: R.list.filter(n => n.st === 'live' && !n.adm), pinned: R.pinned, rp: R.rp }; }
  /* Texto del cliente para una fila de la base: el original, o lo que editó el dueño. */
  function text(row, p, es) { const ed = row && (row.t[0] !== (row.t0 || [])[0] || (row.txt || '') !== (row.txt0 || '')); if (!ed) return es ? p.es : p.en; return row.t[0] + (row.txt ? '. ' + row.txt : ''); }
  const hOf = n => n.b0 ? n.h : n.at ? Math.max(0, Math.floor((Date.now() - n.at) / 3.6e6)) : 0;
  W.TLNovP = { has, of, live, text, raw, base, hOf, modOff, K2P, P2K };
})();
