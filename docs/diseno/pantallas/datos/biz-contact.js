/* To'Latino · contacto del negocio y acciones del teléfono (P1 · 20 oct 2026).
   Una sola fuente para teléfono, dirección, estado de hoy y enlaces. La usan: Prototipo (Llamar, Cómo llegar, Calendario,
   Compartir, Llamar al repartidor y la dirección de la ficha), Mi cuenta, Panel negocio v2 y Super Admin.
   Teléfono y dirección: gana lo más reciente entre la edición del Super Admin (tl-adm-v1.biz[id].edit.{phone|addr}.at)
   y lo que el dueño guardó en su panel (tl-dash2-v1.over[id] · _at); si no hay, TLListing.ADDR / TLDash2.BIZ y, al final,
   un dato estable por id (la misma fórmula que ya usaba el Super Admin).
   Toques: localStorage tl-taps-v1 { [biz]: { call, wa, map, share, cal } } → Panel v2 (contactos) y Super Admin (Operación).
   Calendario agregado: tl-cal-v1 { [key]: fecha }. Enlaces: tolatino.app. */
(function () {
  const W = window, NOW = 12.5, HOST = 'tolatino.app', TK = 'tl-taps-v1', CK = 'tl-cal-v1', DRV = 'Miguel Reyes';
  const STREETS = ['N Wyoming St', 'E Broad St', 'Alter St', 'N Laurel St', 'W 9th St', 'N Church St'];
  const hash = s => { if (W.TLAdm && W.TLAdm.hash) return W.TLAdm.hash(s); let h = 7; const x = String(s); for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return Math.abs(h); };
  const memo = {};
  const ls = k => { let raw = null; try { raw = localStorage.getItem(k); } catch (e) {} if (memo[k] && memo[k].raw === raw) return memo[k].v; let v = null; try { v = JSON.parse(raw || 'null'); } catch (e) {} memo[k] = { raw, v }; return v; };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const full = a => !a ? '' : /hazleton/i.test(a) ? a : a + ', Hazleton PA';
  const short = a => String(a || '').replace(/,?\s*Hazleton,?\s*PA$/i, '');
  const editOf = id => { const S = ls('tl-adm-v1'); return (S && S.biz && S.biz[id] && S.biz[id].edit) || {}; };
  const overOf = id => { const S = ls('tl-dash2-v1'); return (S && S.over && S.over[id]) || {}; };
  const d2 = id => (W.TLDash2 && W.TLDash2.BIZ && W.TLDash2.BIZ[id]) || null;
  const admWins = (id, k) => { const e = editOf(id)[k], o = overOf(id); if (!e || !e.v) return null; const oa = (o._at && o._at[k]) || 0; return !o[k] || (e.at || 0) >= oa ? e.v : null; };
  function tel0(b) { const o = overOf(b.id), p = d2(b.id), h = hash(b.id); return o.phone || (p && p.phone) || '(570) ' + (400 + h % 500) + '-' + String(1000 + (h * 7) % 9000); }
  function addr0(b) { const o = overOf(b.id), p = d2(b.id), X = W.TLListing || {}, h = hash(b.id); return full(o.addr) || (X.ADDR && X.ADDR[b.id]) || full(p && p.addr) || (b.casa ? '' : (100 + h % 800) + ' ' + STREETS[h % 6] + ', Hazleton PA'); }
  const tel = b => admWins(b.id, 'phone') || tel0(b);
  const addr = b => full(admWins(b.id, 'addr')) || addr0(b);
  const edited = (id, k) => admWins(id, k) || '';
  const wa = b => { const o = overOf(b.id), p = d2(b.id); return o.wa != null ? !!o.wa : !!(p && p.wa); };
  const digits = t => '+1' + String(t).replace(/\D/g, '').slice(-10);
  const fT = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh >= 12 ? ' PM' : ' AM'); };
  const aLas = (h, es) => es ? ((Math.floor(((h % 24) + 24) % 24) % 12 || 12) === 1 ? 'a la ' : 'a las ') : 'at ';
  function today(b, es) { const E2 = (x, y) => es ? x : y, hr = b.hrs;
    if (!hr) return b.open == null ? '' : b.open ? E2('Abierto ahora', 'Open now') : E2('Cerrado ahora', 'Closed now');
    const open = b.open != null ? !!b.open : NOW >= hr[0] && NOW < hr[1];
    if (open) return E2('Abierto · cierra ', 'Open · closes ') + aLas(hr[1], es) + fT(hr[1]);
    if (b.days === 'finde') return E2('Cerrado · abre el sábado ', 'Closed · opens Saturday ') + aLas(hr[0], es) + fT(hr[0]);
    return (NOW < hr[0] ? E2('Cerrado · abre hoy ', 'Closed · opens today ') : E2('Cerrado · abre mañana ', 'Closed · opens tomorrow ')) + aLas(hr[0], es) + fT(hr[0]); }
  const link = { biz: b => HOST + '/hazleton/' + b.id, job: (b, j) => HOST + '/hazleton/' + b.id + '/jobs/' + j.id, post: (b, p) => HOST + '/hazleton/' + b.id + '/novedades/' + p.id, cita: id => HOST + '/c/' + id, evt: id => HOST + '/evt/' + id };
  function tap(id, k) { if (!id || !k) return; const S = Object.assign({}, ls(TK) || {}), o = Object.assign({}, S[id] || {}); o[k] = (o[k] || 0) + 1; S[id] = o; put(TK, S); }
  function taps(id) { const o = (ls(TK) || {})[id] || {}; return { call: o.call || 0, wa: o.wa || 0, map: o.map || 0, share: o.share || 0, cal: o.cal || 0 }; }
  const calAdded = key => (ls(CK) || {})[key] || 0;
  function calAdd(key) { const S = Object.assign({}, ls(CK) || {}); S[key] = Date.now(); put(CK, S); }
  const drvTel = num => '(570) 233-' + String(1000 + hash('drv:' + (num || '')) % 9000);
  const dateOf = (i, h) => { const d = new Date(2026, 8, 24 + (i || 0)); d.setMinutes(Math.round((h || 0) * 60)); return d; };
  function dayL(i, es) { if (i === 0) return es ? 'hoy' : 'today'; if (i === 1) return es ? 'mañana' : 'tomorrow'; return new Date(2026, 8, 24 + i).toLocaleDateString(es ? 'es' : 'en', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''); }
  const parseT = t => { const m = /(\d{1,2})(?::(\d{2}))?\s*([AP])M/i.exec(String(t || '')); return m ? (+m[1] % 12) + (/p/i.test(m[3]) ? 12 : 0) + (m[2] ? +m[2] / 60 : 0) : null; };
  const parseDur = d => { const s = String(d || ''), h = /(\d+)\s*h/.exec(s), m = /(\d+)\s*min/.exec(s); return ((h ? +h[1] : 0) + (m ? +m[1] / 60 : 0)) || null; };
  const lbl = (v, es) => Array.isArray(v) ? (v[es ? 0 : 1] || v[0] || '') : typeof v === 'string' ? v : '';
  const first = t => { const x = String(t || '').trim(), m = /^(.+?[.!?])(\s|$)/.exec(x); return m ? m[1] : x; };
  const PH = v => typeof v === 'number' || /^\d+$/.test(String(v)) ? 'https://images.pexels.com/photos/' + v + '/pexels-photo-' + v + '.jpeg?auto=compress&cs=tinysrgb&h=350' : String(v || '').replace(/^url\((.*)\)$/, '$1');
  const card = b => ({ name: b.name, meta: (b.r ? '★ ' + b.r + ' · ' : '') + (b.d != null ? b.d + ' MI · ' : '') + String((b.subs || [])[0] || 'Hazleton').toUpperCase(), image: b.ph && b.ph[0] ? PH(b.ph[0]) : '', verified: !!b.verified });
  const LSK = { 'APP-NEG-CITA': 'citas', 'APP-NEG-AUTO-CITA': 'acitas', 'APP-NEG-HOGAR-CITA': 'hcitas', 'APP-NEG-SALUD-CITA': 'scitas', 'APP-NEG-PRO-CITA': 'pcitas', 'APP-NEG-FIESTA-CITA': 'fcitas', 'APP-NEG-EDU-ESTADO': 'eins', 'APP-NEG-NOCHE-ESTADO': 'nres', 'APP-NEG-TRANS-ESTADO': 'trv', 'APP-NEG-RESERVA-ESTADO': 'rsvs' };
  const DUR = { citas: 1, acitas: 1, hcitas: 2, scitas: .5, pcitas: 1, fcitas: 4, eins: 1, nres: 3, trv: 1, rsvs: 1.5 };

  function calOf(s, from, ob, b, es, BZ) { const E2 = (x, y) => es ? x : y, r = s.route || {};
    if (ob && ob.t) { const bz = BZ(ob.biz), t0 = parseT(ob.t0), h0 = ob.h0 != null ? ob.h0 : t0 != null ? t0 : 12; let h1 = ob.h1 != null ? ob.h1 : ob.t1 ? parseT(ob.t1) : h0 + (ob.dur || parseDur(ob.durL) || 1); if (h1 <= h0) h1 += 24;
      const priv = bz && (bz.salud || bz.prof);
      return { title: priv ? E2('Cita · ', 'Appointment · ') + bz.name + (/\(por confirmar\)|\(not confirmed\)/.test(ob.t) ? E2(' (por confirmar)', ' (not confirmed)') : '') : ob.t, day: ob.day || 0, h0, h1, place: ob.place || (bz ? bz.name : ''), addr: full(ob.addr || (bz ? addr(bz) : '')), notes: ob.notes || '', url: ob.url || '', key: ob.key || ob.url || ob.t, biz: bz ? bz.id : null }; }
    const key = LSK[r.code] || LSK[String(from || '').split(' · ')[0]]; if (!key) return null;
    const L = (s[key] || []).filter(Boolean), id = r.cid || r.rid;
    const x = L.find(y => y.id === id) || L.filter(y => (y.own || y.biz) === (b && b.id)).pop(); if (!x) return null;
    const bz = BZ(x.own || x.biz) || b; if (!bz) return null;
    const gh = parseT(lbl(x.gL, es) || x.gL), day = x.i != null ? x.i : x.gi != null ? x.gi : 0, h0 = typeof x.h === 'number' ? x.h : gh != null ? gh : 12, mins = +x.mi || +x.min || 0, h1 = h0 + (mins ? mins / 60 : DUR[key]);
    const what = key === 'rsvs' ? E2('Mesa para ', 'Table for ') + (x.p || 2) : key === 'scitas' || key === 'pcitas' ? E2('Cita', 'Appointment') : (lbl(x.svcL, es) || lbl(x.svcName, es) || lbl(x.itemL, es) || lbl(x.title, es) || (typeof x.svc === 'string' && x.svc && !/^\d+(:\d+)*$/.test(x.svc) ? (es ? x.svc : x.svcEn || x.svc) : '') || E2('Cita', 'Appointment'));
    const pend = ['pend', 'sent'].includes(x.st), alt = ['alt', 'parcial', 'seg', 'quote'].includes(x.st);
    const st = pend ? E2('Solicitud enviada. ' + bz.name + ' todavía no confirma.', 'Request sent. ' + bz.name + ' has not confirmed yet.') : alt ? E2(bz.name + " te propuso un cambio. Revísalo en To'Latino.", bz.name + " suggested a change. Check it in To'Latino.") : E2('Confirmada por ' + bz.name + '.', 'Confirmed by ' + bz.name + '.');
    return { title: what + ' · ' + bz.name + (pend || alt ? E2(' (por confirmar)', ' (not confirmed)') : ''), day, h0, h1, place: key === 'hcitas' ? E2('Tu casa', 'Your home') : bz.name, addr: key === 'hcitas' && x.casa && x.casa.addr ? full(x.casa.addr) : addr(bz), notes: st + ' ' + E2("Para cambiar o cancelar, abre tu cita en To'Latino.", "To change or cancel, open your booking in To'Latino."), url: link.cita(x.id), key: key + ':' + x.id, biz: bz.id }; }

  function shareOf(s, code, from, xs, ob, title, b, es, BZ) { const E2 = (x, y) => es ? x : y, r = s.route || {}, f = String(from || ''), tt = String(title || '');
    const out = (ti, text, url, bz) => ({ title: ti, text, url, msg: text + ' ' + url, biz: bz ? bz.id : null, card: bz ? card(bz) : null });
    if (ob && ob.post) { const bz = BZ(ob.biz) || b; if (!bz) return null; return out(bz.name, bz.name + ': ' + first(lbl([ob.post.es, ob.post.en], es)), link.post(bz, ob.post), bz); }
    if (/APP-NEG-JOB/.test(f) && b) { const J = (W.TLJobs && W.TLJobs.J) || {}, j = (J[b.id] || []).find(x => x.id === xs);
      if (j) { const pay = '$' + j.pay[0] + (j.pay[1] && j.pay[1] !== j.pay[0] ? '–' + j.pay[1] : '') + E2(' por hora', ' an hour') + (j.tips ? E2(' + propinas', ' + tips') : '');
        return out(lbl(j.t, es) + ' · ' + b.name, E2('Vacante en ', 'Job at ') + b.name + ': ' + lbl(j.t, es) + ', ' + pay + '. ' + lbl([j.sch[0], j.sch[1]], es) + (j.sch[2] ? ', ' + j.sch[2] : '') + '.', link.job(b, j), b); } }
    if ((/reservaci|reservation/i.test(tt) || r.code === 'APP-NEG-RESERVA-ESTADO') && b) { const L = (s.rsvs || []).filter(Boolean), x = L.find(y => y.id === r.rid) || L.filter(y => y.biz === b.id).pop();
      if (x) { const pend = ['pend', 'sent', 'alt'].includes(x.st), h = typeof x.h === 'number' ? x.h : 19;
        return out(E2('Mesa para ', 'Table for ') + x.p + ' · ' + b.name, E2('Mesa para ', 'Table for ') + x.p + E2(' en ', ' at ') + b.name + ', ' + dayL(x.i || 0, es) + ' ' + aLas(h, es) + fT(h) + (pend ? E2(' (por confirmar)', ' (not confirmed yet)') : '') + '. ' + short(addr(b)) + '.', link.biz(b), b); } }
    if ((code === 'APP-COMPARTIR' || r.code === 'APP-NEG-NOCHE-ESTADO') && b) { const L = (s.nres || []).filter(Boolean), x = L.find(y => y.id === r.cid) || L.filter(y => (y.biz || y.own) === b.id).pop();
      const when = x && typeof x.h === 'number' ? dayL(x.i || 0, es) + ' ' + aLas(x.h, es) + fT(x.h) : E2('esta noche', 'tonight');
      return out(b.name, E2('Vamos a ', "We're going to ") + b.name + ', ' + when + '. ' + short(addr(b)) + E2('. ¿Vienes?', '. Coming?'), link.biz(b), b); }
    if (b) { const a = short(addr(b)); return out(b.name, b.name + E2(" en To'Latino: ", " on To'Latino: ") + (b.subs || []).slice(0, 2).join(' · ') + (a ? ', ' + a : '') + '.', link.biz(b), b); }
    return null; }

  /* Pedido de una acción del teléfono → datos listos para la hoja (o null: sigue a «por construir»). */
  function resolve(C, code, from, extra, title) {
    const s = C.state || {}, r = s.route || {}, es = (s.lang || 'es') === 'es', A = (W.TLAll && W.TLAll.B) || [];
    const BZ = v => (typeof v === 'string' && v) ? A.find(x => x.id === v || x.name === v) || null : null;
    const ob = extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : null, xs = typeof extra === 'string' ? extra : '';
    const isMap = code === 'APP-MAPA' || code === 'APP-NEG-MAPA';
    const bx = BZ(xs) || (ob && BZ(ob.biz)) || (xs.indexOf(' · ') > 0 ? BZ(xs.split(' · ')[0]) : null);
    const b = bx || (isMap && (xs || ob) ? null : BZ(r.biz));
    if (code === 'APP-NEG-CONTACTO') { if (!b) return null; const t = tel(b); return { k: 'call', biz: b.id, name: b.name, tel: t, telH: digits(t), wa: wa(b), st: today(b, es), card: card(b) }; }
    if (code === 'APP-NEG-PEDIDO-CHOFER') { const o = s.order || {}, t = drvTel(o.num || xs); return { k: 'drv', biz: b ? b.id : (o.biz || null), bizName: b ? b.name : '', name: DRV, tel: t, telH: digits(t), on: (s.oStage || 0) >= 2, mins: W.TLAdm && W.TLAdm.cfg ? W.TLAdm.cfg('drvMask', 30) : 30 }; }
    if (isMap) {
      if (b) { const X = W.TLListing || {}, o = overOf(b.id), p = d2(b.id), has = !!(edited(b.id, 'addr') || o.addr || (X.ADDR && X.ADDR[b.id]) || (p && p.addr));
        if (!b.casa && (b.tags || []).includes('domicilio') && !has) return { k: 'map', home: true, biz: b.id, name: b.name, zone: b.zone || 10, card: card(b) };
        if (b.casa && !has) { const ok = ['citas', 'acitas', 'hcitas', 'scitas', 'pcitas', 'fcitas'].some(k => (s[k] || []).some(x => x && (x.own || x.biz) === b.id && x.st === 'ok')), cf = W.TLBook && W.TLBook.CFG && W.TLBook.CFG[b.id], ex = ok && cf && cf.casa ? cf.casa : '';
          return { k: 'map', biz: b.id, name: b.name, addr: ex || full(b.casa), zoneOnly: !ex, dist: b.d, card: card(b) }; }
        return { k: 'map', biz: b.id, name: b.name, addr: addr(b), dist: b.d, card: card(b) }; }
      if (ob && (ob.addr || ob.name)) return { k: 'map', name: ob.name || short(ob.addr), addr: full(ob.addr || ob.name) };
      if (xs) { const pr = xs.split(' · '), last = pr[pr.length - 1]; return /^\d/.test(last) ? { k: 'map', name: pr.length > 1 ? pr[0] : short(last), addr: full(last) } : { k: 'map', name: xs, addr: full(xs) }; }
      return null; }
    if (code === 'APP-CALENDARIO') { const ev = calOf(s, from, ob, b, es, BZ); return ev ? Object.assign({ k: 'cal' }, ev) : null; }
    if (code === 'APP-SHARE' || code === 'APP-COMPARTIR') { const sh = shareOf(s, code, from, xs, ob, title, b, es, BZ); return sh ? Object.assign({ k: 'share' }, sh) : null; }
    return null; }

  W.TLContact = { HOST, DRV, tel, addr, tel0, addr0, edited, wa, digits, today, link, tap, taps, calAdded, calAdd, drvTel, dateOf, dayL, fT, aLas, full, short, resolve };
})();
