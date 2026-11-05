/* Tu página (Panel v2 · Tu página) → la ficha del cliente y el Super Admin. Una sola lectura de lo que el dueño deja en su página:
   nombre, cómo le dicen, especialidades, WhatsApp/redes, idiomas, horario, portada y galería, quiénes somos, lo que hay en el local y preguntas frecuentes.
   Fuente: tl-dash2-v1 · over[id] (lo del dueño) sobre TLDash2.BIZ[id] (base). Teléfono y dirección siguen en TLContact (biz-contact.js).
   To'Latino manda encima (adm-data · TLAdm.apply): nombre editado, fotos quitadas (phOff), cierre temporal y sello. Por eso sync() escribe la base
   del negocio (b._n0 nombre · b._ph0 fotos · b._o0 / b._s0 abierto y estado) y después llama TLAdm.apply(). Quiénes somos: gana lo más reciente entre
   el dueño (over._at.about) y la edición del Super Admin (tl-adm-v1.biz[id].edit.about). Hoy = jue 24 sep 2026, 12:30 PM (panel: 0 = lun → hoy 3). */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1', TODAY = 3, NOW = 12.5;
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const KEYS = ['name', 'aboutEn', 'season', 'back', 'nick', 'subs', 'wa', 'ig', 'fb', 'langs', 'op', 'ref', 'casa', 'zone', 'hours', 'sched', 'byMod', 'modOff', 'ph', 'logo', 'gallery', 'about', 'amen', 'faq', 'seal', 'email', 'settings', 'closedTmp', 'closedTo'];
  const GL = ['TLAll', 'TLFood', 'TLBeauty', 'TLAuto', 'TLHogar', 'TLSalud', 'TLPro', 'TLFiesta', 'TLMerc', 'TLNoche', 'TLTienda', 'TLTrans', 'TLEdu', 'TLNinos', 'TLDeporte', 'TLFe', 'TLInmueble', 'TLDealer'];
  const AMI = [[/mesa|comer/i, 'restaurant'], [/llevar|pickup/i, 'bag'], [/catering|fiesta/i, 'party'], [/estacion|parqueo|parking/i, 'parking'], [/tarjeta|card/i, 'card'], [/wifi/i, 'wifi'], [/niñ|kids/i, 'smile'], [/accesible|silla de ruedas/i, 'check'], [/efectivo|cash/i, 'dollar'], [/delivery/i, 'truck'], [/terraza|afuera/i, 'coffee']];
  const LANG = { es: ['Español', 'Spanish'], en: ['English', 'English'], pt: ['Português', 'Portuguese'], qu: ['Quechua', 'Quechua'] };
  const fH = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const DW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  function of(id, ov) { const B = (W.TLDash2 && W.TLDash2.BIZ || {})[id] || null, o = ov || (((rd(DK) || {}).over || {})[id]) || {}; if (!B) return null;
    const r = Object.assign({}, B); KEYS.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); if (o.closedTmp === undefined && o.settings && o.settings.closedTmp !== undefined) r.closedTmp = o.settings.closedTmp;
    const e = ((((rd(AK) || {}).biz || {})[id] || {}).edit || {}).about, oa = (o._at && o._at.about) || 0; if (e && e.v && (e.at || 0) >= oa) { r.about = e.v; r.aboutAdm = 1; }
    r.own = Object.keys(o._at || {}); return r; }
  /* Estado de hoy desde el horario del dueño (o cerrado por unos días desde Ajustes). */
  function today(P) { if (P.closedTmp === 'hoy') { const H = P.hours || []; for (let k = 1; k < 8; k++) { const h = H[(TODAY + k) % 7]; if (h && h.on) return { open: 0, st: 'cerrado hoy · abre ' + (k === 1 ? 'mañana ' : DW[(TODAY + k) % 7] + ' ') + fH(+h.a) }; } return { open: 0, st: 'cerrado hoy' }; } if (P.closedTmp === 'dias' && +P.closedTo > 0) { const d = new Date(2026, 8, 24 + +P.closedTo), MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']; return { open: 0, st: 'cerrado · vuelve el ' + DD[d.getDay()] + ' ' + d.getDate() + ' ' + MS[d.getMonth()] }; } if (P.closedTmp) return { open: 0, st: 'cerrado por unos días' }; if (P.season && P.back) return { open: 0, st: 'cerrado por temporada · vuelve el ' + P.back, season: 1 }; const H = P.hours || [], t = H[TODAY] || {};
    const end = t.two ? +t.b2 : +t.b, open = !!t.on && ((NOW >= +t.a && NOW < +t.b) || (t.two && NOW >= +t.a2 && NOW < +t.b2));
    if (open) return { open: 1, st: 'cierra ' + fH(end), hrs: [+t.a, end] };
    if (t.on && NOW < +t.a) return { open: 0, st: 'abre ' + fH(+t.a), hrs: [+t.a, end] };
    for (let k = 1; k < 8; k++) { const h = H[(TODAY + k) % 7]; if (h && h.on) return { open: 0, st: 'abre ' + (k === 1 ? 'mañana ' : DW[(TODAY + k) % 7] + ' ') + fH(+h.a), hrs: t.on ? [+t.a, end] : [+h.a, h.two ? +h.b2 : +h.b] }; }
    return { open: 0, st: 'cerrado' }; }
  const U = p => typeof p === 'string' && /^(data:|https?:)/.test(p) ? 'url(' + p + ')' : 'url(https://images.pexels.com/photos/' + p + '/pexels-photo-' + p + '.jpeg?auto=compress&cs=tinysrgb&h=350)';
  /* Lo que la ficha lee además de TLAll.B: idiomas, lo que hay, preguntas frecuentes, cómo le dicen, redes y referencia. */
  function page(id, es) { const P = of(id); if (!P) return null; const L = p => Array.isArray(p) ? (es ? p[0] : (p[1] || p[0])) : String(p || '');
    return { langs: (P.langs || []).map(k => (LANG[k] || [k, k])[es ? 0 : 1]).join(' · '), amen: (P.amen || []).map(a => { const t = Array.isArray(a) ? a[1] || a[0] : a, m = AMI.find(x => x[0].test(t)); return { icon: m ? m[1] : 'check', l: t }; }),
      faq: (P.faq || []).map(f => [L(f.q), L(f.a)]).filter(f => f[0] && f[1]), nick: P.nick || '', ref: P.ref || '', season: P.season && P.back ? P.back : '', ig: P.ig || '', fb: P.fb || '', wa: P.wa !== false, ref: P.ref || '', own: P.own, closedTmp: !!P.closedTmp }; }
  let _k = null;
  function sync(force) { const X = W.TLListing, D = W.TLDash2; if (!X || !D || !D.BIZ) return false; let key = ''; try { key = (localStorage.getItem(DK) || '') + '|' + (localStorage.getItem(AK) || '') + '|' + ((W.TLAll && W.TLAll.B) || []).length; } catch (e) {} if (!force && key === _k) return false; _k = key;
    const OV = (rd(DK) || {}).over || {};
    Object.keys(D.BIZ).forEach(id => { const o = OV[id] || {}, P = of(id, o); if (!P) return; const ed = k => o[k] !== undefined || (k === 'closedTmp' && (o.closedTo !== undefined || (o.settings && o.settings.closedTmp !== undefined)));
      const lists = GL.map(g => W[g] && W[g].B).filter(Boolean), seen = new Set();
      lists.forEach(Lb => Lb.forEach(b => { if (!b || b.id !== id || seen.has(b)) return; seen.add(b);
        if (!b._pg0) b._pg0 = { name: b._n0 != null ? b._n0 : b.name, subs: (b.subs || []).slice(), ph: b._ph0 ? b._ph0.slice() : (b.ph || []).slice(), photos: (b.photos || []).slice(), open: b._o0 != null ? b._o0 : b.open, st: b._s0 != null ? b._s0 : b.st, hrs: (b.hrs || []).slice() };
        const g0 = b._pg0, nm = ed('name') && String(P.name || '').trim() ? P.name.trim() : g0.name; b._n0 = nm; b.name = nm;
        b.subs = ed('subs') && (P.subs || []).length ? Array.from(new Set(P.subs.concat(g0.subs))) : g0.subs.slice();
        const phs = ed('ph') || ed('gallery') ? Array.from(new Set([P.ph].concat(P.gallery || []).filter(x => x != null && x !== ''))) : null;
        if (phs && phs.length) { b._ph0 = phs; b.ph = phs.slice(); b.photos = phs.map(U); } else { b._ph0 = g0.ph.slice(); b.ph = g0.ph.slice(); if (g0.photos.length) b.photos = g0.photos.slice(); }
        if (ed('hours') || ed('closedTmp') || (ed('season') && P.season && P.back)) { const T = today(P); b._o0 = T.open; b._s0 = T.st; b.open = T.open; b.st = T.st; if (T.hrs) b.hrs = T.hrs; } else { b._o0 = g0.open; b._s0 = g0.st; b.open = g0.open; b.st = g0.st; if (g0.hrs.length) b.hrs = g0.hrs.slice(); }
        b._pg = 1; }));
      if (X.ABOUT && (ed('about') || P.aboutAdm)) { const A0 = X._ab0 = X._ab0 || {}; if (!(id in A0)) A0[id] = X.ABOUT[id] ? X.ABOUT[id].slice() : null; const y = A0[id] ? A0[id][2] : 2016; X.ABOUT[id] = [P.about || '', P.aboutEn || P.about || '', y]; }
      else if (X._ab0 && id in X._ab0) { if (X._ab0[id]) X.ABOUT[id] = X._ab0[id].slice(); else delete X.ABOUT[id]; } });
    if (W.TLAdm && W.TLAdm.apply) try { W.TLAdm.apply(); } catch (e) {}
    return true; }
  /* «Horario distinto para citas» (Tu página · Horario): el Booking del negocio deja de dar horas «modOff» min antes de cerrar ese día. */
  function bookWrap() { const BK = W.TLBook; if (!BK || !BK.slotsFor || BK._pagW) return; BK._pagW = 1; const sO = BK.slotsFor;
    BK.slotsFor = function (own, stf, i, m, evt) { const L = sO.apply(this, arguments); const P = of(own); if (!P || !P.byMod || !Array.isArray(L)) return L; const js = (4 + (+i || 0)) % 7, h = (P.hours || [])[(js + 6) % 7]; if (!h || !h.on) return L;
      const close = h.two ? +h.b2 : +h.b, cut = close - (+P.modOff || 30) / 60; return L.filter(x => x.h <= cut + 1e-6); }; }
  W.TLPagP = { of, page, today, sync };
  (function bw(n) { if (W.TLBook && W.TLBook.slotsFor) bookWrap(); else if (n < 150) setTimeout(() => bw(n + 1), 100); })(0);
  (function boot(n) { if (!(W.TLDash2 && W.TLListing && W.TLAll)) { if (n < 150) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
