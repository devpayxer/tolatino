/* Cobros · fuente única (Panel v2 · Cobros y plan, Super Admin · Negocio · Dinero, El Compa).
   Reglas (las mismas del Super Admin · Planes · Comisiones): comisión solo sobre lo cobrado con tarjeta en la app
   (pedidos 10 % del subtotal —envío y propina van íntegros—, citas 8 %, boletos 5 % + $1 por boleto, apartados 6 %,
   reservaciones $0). El cargo de la tarjeta lo absorbe la comisión. Efectivo y pago en el local: sin comisión, la app
   solo lo registra. Pagos al banco: cada martes, lo cobrado de lunes a domingo; los boletos, el martes después del evento.
   Guardado: tl-dash2-v1 · over[id].stripe (none | rev | on) y .bank · tl-adm-v1.biz[id].payHold/payWhy (pagos retenidos)
   y .stripeR (Stripe pidió un dato) · tl-adm-v1.plan.fees[k] = { v, from } (cambio programado). */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1', T0 = new Date(2026, 8, 24, 12, 30).getTime();
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const r2 = n => Math.round((+n || 0) * 100) / 100, money = n => '$' + r2(n).toFixed(2);
  const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fd = (t, es) => { const d = new Date(t); return es ? DS[d.getDay()] + ' ' + d.getDate() + ' ' + MS[d.getMonth()] : DE[d.getDay()] + ' ' + ME[d.getMonth()] + ' ' + d.getDate(); };
  const ft = t => { const d = new Date(t), h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
  const at = (dago, h, m) => { const d = new Date(T0); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dago, h, m || 0).getTime(); };
  /* El martes que paga la semana (lunes–domingo) de t */
  const tue = t => { const d = new Date(t), w = d.getDay(), toSun = w === 0 ? 0 : 7 - w; return new Date(d.getFullYear(), d.getMonth(), d.getDate() + toSun + 2, 9, 0).getTime(); };
  const F0 = { ped: 10, cita: 8, bol: 5, apt: 6, rsv: 0 };
  function fees() { const P = ((rd(AK) || {}).plan || {}).fees || {}, o = {}; Object.keys(F0).forEach(k => { const p = P[k]; o[k] = p && +p.from <= T0 ? { v: +p.v } : { v: F0[k], pend: p ? { v: +p.v, from: +p.from } : null }; }); return o; }
  const commOf = (k, sub, n, FE) => k === 'bol' ? r2(sub * FE.bol.v / 100 + (n || 1)) : r2(sub * ((FE[k] || { v: 0 }).v) / 100);
  /* Movimientos de ejemplo (ids estables). pay card | cash · st ok | dev | noshow · k ped | cita | apt */
  const M0 = {
    'sabor-dominicano': [
      ['#1041', 'ped', 'Luis R.', 'Pickup', 0, 12, 10, 22, 0, 0, 'card'], ['#1039', 'ped', 'Carmen T.', 'Delivery', 0, 11, 40, 28.5, 3, 4, 'card'], ['#1037', 'ped', 'Pedro G.', 'Pickup', 0, 11, 5, 18, 0, 0, 'cash'],
      ['#1035', 'ped', 'María L.', 'Delivery', 1, 19, 20, 41.25, 3, 6, 'card'], ['#1034', 'ped', 'Ramón D.', 'Pickup', 1, 13, 15, 15.5, 0, 0, 'cash'], ['#1031', 'ped', 'Ana M.', 'Delivery', 2, 18, 45, 26, 3, 3, 'card'],
      ['#1030', 'ped', 'Jorge S.', 'Pickup', 2, 12, 30, 19.75, 0, 0, 'card', 'dev'], ['#1028', 'ped', 'Carmen T.', 'Pickup', 3, 12, 50, 33, 0, 0, 'card'],
      ['#1019', 'ped', 'Yesenia G.', 'Delivery', 5, 19, 5, 31.4, 3, 4, 'card'], ['#1016', 'ped', 'Iglesia Monte Sion', 'Pickup', 6, 11, 0, 96, 0, 0, 'card'], ['#1014', 'ped', 'Wilfredo C.', 'Pickup', 6, 13, 30, 22, 0, 0, 'cash'],
      ['#1012', 'ped', 'Ana M.', 'Delivery', 7, 18, 10, 24.5, 3, 3, 'card'], ['#1009', 'ped', 'Familia Peralta', 'Delivery', 8, 19, 40, 52, 3, 8, 'card'], ['#1006', 'ped', 'Kelvin R.', 'Pickup', 9, 12, 20, 16, 0, 0, 'cash'],
      ['#1004', 'ped', 'Luis R.', 'Delivery', 10, 18, 55, 38.25, 3, 4, 'card'], ['#0998', 'ped', 'Carlos P.', 'Pickup', 11, 12, 15, 29, 0, 0, 'card'], ['#0995', 'ped', 'María L.', 'Delivery', 13, 19, 30, 44, 3, 5, 'card'], ['#0991', 'ped', 'Jorge S.', 'Pickup', 15, 13, 0, 35.5, 0, 0, 'card']],
    'barberia-el-primo': [
      ['C-2214', 'cita', 'Héctor L.', 'Fade · depósito', 0, 9, 40, 10, 0, 0, 'card', 'ok', 12], ['C-2213', 'cita', 'Kevin S.', 'Corte + barba · depósito', 0, 8, 55, 10, 0, 0, 'card', 'ok', 18], ['A-2209', 'apt', 'Frank M.', 'Pomada Suavecito · apartado', 0, 10, 20, 16, 0, 0, 'cash'],
      ['C-2207', 'cita', 'Luis R.', 'Fade · depósito', 1, 17, 10, 10, 0, 0, 'card', 'ok', 12], ['C-2205', 'cita', 'Johan P.', 'Diseño · no llegó', 2, 15, 0, 10, 0, 0, 'card', 'noshow'], ['C-2203', 'cita', 'Ramón D.', 'Corte clásico · canceló a tiempo', 2, 11, 30, 10, 0, 0, 'card', 'dev'],
      ['C-2198', 'cita', 'Andy V.', 'Corte + barba · depósito', 3, 16, 20, 10, 0, 0, 'card', 'ok', 18], ['C-2190', 'cita', 'Wilfredo C.', 'Fade · depósito', 5, 18, 0, 10, 0, 0, 'card', 'ok', 12], ['C-2186', 'cita', 'Kelvin R.', 'Fade · depósito', 7, 10, 0, 10, 0, 0, 'card', 'ok', 12],
      ['C-2181', 'cita', 'Héctor L.', 'Corte + barba · depósito', 9, 12, 30, 10, 0, 0, 'card', 'ok', 18], ['C-2177', 'cita', 'Pedro G.', 'Fade · depósito', 12, 17, 45, 10, 0, 0, 'card', 'ok', 12]]
  };
  function ov(id, o) { return o || (((rd(DK) || {}).over || {})[id]) || {}; }
  function ab(id) { return (((rd(AK) || {}).biz || {})[id]) || {}; }
  function st(id, o) { const B = ((W.TLDash2 && W.TLDash2.BIZ) || {})[id] || {}, O = ov(id, o), A = ab(id), raw = O.stripe || O.pay || B.stripe || B.pay || 'none';
    const s = raw === 'on' ? 'on' : raw === 'rev' ? 'rev' : 'none';
    return { s: A.stripeR && s === 'on' ? 'restr' : s, raw: s, bank: O.bank || B.bank || '', hold: !!A.payHold, holdWhy: A.payWhy || '', restrWhy: A.stripeR || '', fixedAt: O.stripeAt || 0 }; }
  const L2 = (es, a, b) => es ? a : b;
  /* Devolución del dueño (Panel · Cobros · un cobro): over[id].refunds[movId] = { amt, why, at }. Total = devuelto; parcial = la comisión baja en proporción.
     Si ya se pagó al banco, lo devuelto (menos la comisión que se le regresa) se descuenta del martes siguiente. */
  function mk(x, FE) { const card = x.pay === 'card', gross = r2(x.sub + (x.fee || 0) + (x.tip || 0)); let comm = card ? commOf(x.k, x.sub, x.n, FE) : 0; const net = card ? r2(gross - comm) : 0, po = card && x.st !== 'held' ? (x.poAt || tue(x.at)) : 0;
    const o = Object.assign({ fee: 0, tip: 0, n: 0, local: 0 }, x, { gross, po });
    if (x.st === 'dev') { const paid = po && po <= T0 && x.refAt && x.refAt > po + 3600e3; return Object.assign(o, { comm: 0, net: 0, netO: paid ? net : 0 }); }
    const rf = card && x.rf && x.st !== 'held' ? Math.min(+x.rf.amt || 0, gross) : 0;
    if (rf > 0 && rf >= gross - 0.005) return Object.assign(o, { st: 'dev', refAt: x.rf.at, comm: 0, net: 0, netO: po <= T0 ? net : 0, rf, rfBy: 'biz', rfWhy: x.rf.why });
    if (rf > 0) { const cP = r2(comm * (gross - rf) / gross), back = r2(rf - (comm - cP)); if (po <= T0) return Object.assign(o, { comm, net, rf, rfNet: back, rfAt: x.rf.at, rfWhy: x.rf.why, rfPaid: 1 }); return Object.assign(o, { comm: cP, net: r2(gross - rf - cP), rf, rfAt: x.rf.at, rfWhy: x.rf.why }); }
    return Object.assign(o, { comm, net }); }
  /* live = props.live.items del Prototipo (pedidos de la sesión). */
  function moves(id, o, live) { const S = st(id, o), FE = fees(), out = [], RF = ov(id, o).refunds || {};
    (M0[id] || []).forEach(r => { const [ref, k, who, what, dago, h, m, sub, fee, tip, pay, s0, local] = r; if (pay === 'card' && S.raw !== 'on') return;
      const t = at(dago, h, m); out.push(mk({ id: id + ':' + ref, ref, k, who, what: [what, what.replace('depósito', 'deposit').replace('no llegó', 'no-show').replace('canceló a tiempo', 'cancelled in time').replace('apartado', 'hold')], at: t, sub, fee, tip, pay, st: s0 || 'ok', local: local || 0, refAt: s0 === 'dev' ? t + 3 * 3600e3 : 0, rf: RF[id + ':' + ref] || null }, FE)); });
    (live || []).filter(x => x && x.biz === id && x.k === 'ped' && x.amt > 0 && ['ok', 'done', 'in', 'hoy', 'ready', 'out', 'pend', 'no'].includes(x.st)).forEach(x => { const cash = /efectivo|cash/i.test(String(x.s || '')); if (!cash && S.raw !== 'on') return;
      const stt = x.st === 'pend' ? (cash ? 'ok' : 'held') : x.st === 'no' ? (cash ? null : 'dev') : 'ok'; if (!stt) return;
      out.push(mk({ id: id + ':live:' + x.id, ref: String(x.t || '').replace(/^(Pedido|Order)\s*/, ''), k: 'ped', who: x.who || '', what: [String(x.s || 'Pedido').split(' · ')[0], String(x.s || 'Order').split(' · ')[0]], at: T0, sub: r2(x.amt), pay: cash ? 'cash' : 'card', st: stt, live: 1, key: x.key, lid: x.id, refAt: stt === 'dev' ? T0 : 0, rf: RF[id + ':live:' + x.id] || null }, FE)); });
    const EP = W.TLEvP; if (EP && S.raw === 'on') { let evs = []; try { evs = EP.of(id, o) || []; } catch (e) {} const L = (rd('tl-evt-v2') || {}).orders || [];
      evs.forEach(e => { const c = e._c || {}; if (!c.gross || !(c.tks || []).length) return; const day = new Date(2026, 8, 24 + (+e.day || 0), 21, 0).getTime(), po = tue(day), cx = c.st === 'cx' || c.st === 'admcx';
        const lv = L.filter(z => z && z.evt && String(z.evt).split('@')[0] === e.id), lvG = lv.filter(z => z.st !== 'reembolsado').reduce((a, z) => a + (+z.total || 0), 0);
        const nT = (c.tks || []).reduce((a, t) => a + (+t.sold || 0), 0), nL = lv.filter(z => z.st !== 'reembolsado').reduce((a, z) => a + ((z.labels || []).length || 1), 0), base = r2(Math.max(0, c.gross - lvG));
        const tt = e.ti || [e.t, e.t];
        if (base > 0) out.push(mk({ id: id + ':evt:' + e.id, ref: 'B-' + String(e.id).slice(-4).toUpperCase(), k: 'bol', who: tt[0], what: [Math.max(0, nT - nL) + ' boletos · vendidos antes', Math.max(0, nT - nL) + ' tickets · sold earlier'], at: at(6, 20, 0), sub: base, n: Math.max(0, nT - nL), pay: 'card', st: cx ? 'dev' : 'ok', poAt: po, evt: e.id, evDay: day, refAt: cx ? T0 : 0 }, FE));
        lv.forEach(z => { const n = (z.labels || []).length || 1; out.push(mk({ id: id + ':evo:' + z.id, ref: String(z.id), k: 'bol', who: tt[0], what: [n + (n === 1 ? ' boleto' : ' boletos') + ' · por la app', n + (n === 1 ? ' ticket' : ' tickets') + ' · in the app'], at: +z.at || T0, sub: r2(+z.total || 0), n, pay: 'card', st: z.st === 'reembolsado' || cx ? 'dev' : 'ok', poAt: po, evt: e.id, evDay: day, live: 1, refAt: z.st === 'reembolsado' || cx ? T0 : 0 }, FE)); }); }); }
    return out.sort((a, b) => b.at - a.at); }
  /* Pagos al banco: uno por martes. Lo devuelto resta del martes en que se devolvió. */
  function payouts(id, o, live) { const S = st(id, o), M = moves(id, o, live).filter(m => m.pay === 'card' && m.st !== 'held'), G = {};
    const add = (t, m, v) => { const k = String(t); G[k] = G[k] || { at: t, items: [], amt: 0, comm: 0, gross: 0, dev: 0 }; G[k].items.push(m); G[k].amt = r2(G[k].amt + v); if (v > 0) { G[k].comm = r2(G[k].comm + m.comm); G[k].gross = r2(G[k].gross + m.gross); } else G[k].dev = r2(G[k].dev - v); };
    M.forEach(m => { if (m.st === 'dev') { if (m.netO && m.refAt) add(tue(m.refAt), m, -m.netO); return; } add(m.po, m, m.net); if (m.rfPaid) add(tue(m.rfAt), m, -m.rfNet); });
    return Object.values(G).filter(p => p.items.length).map(p => ({ ...p, id: 'po-' + new Date(p.at).toISOString().slice(0, 10), evt: p.items.length && p.items.every(m => m.k === 'bol'), st: p.at <= T0 ? 'paid' : S.hold ? 'hold' : S.s === 'restr' ? 'restr' : 'next' })).sort((a, b) => b.at - a.at); }
  function sum(id, es, o, live) { const S = st(id, o), P = payouts(id, o, live), nx = P.filter(p => p.st !== 'paid').sort((a, b) => a.at - b.at)[0], M = moves(id, o, live), wk = M.filter(m => m.at >= at(3, 0)), F = fees();
    return { S, next: nx || null, paid: P.filter(p => p.st === 'paid'), card7: r2(wk.filter(m => m.pay === 'card' && m.st === 'ok').reduce((a, m) => a + m.gross, 0)), cash7: r2(wk.filter(m => m.pay === 'cash').reduce((a, m) => a + m.gross, 0)), comm7: r2(wk.filter(m => m.pay === 'card' && m.st === 'ok').reduce((a, m) => a + m.comm, 0)), held: M.filter(m => m.st === 'held'), fees: F,
      text: S.s !== 'on' && S.s !== 'restr' ? L2(es, 'Sin cobros con tarjeta: cobra en el local o al entregar.', 'No card payments: get paid in person or on delivery.') : nx ? L2(es, 'Próximo pago a tu banco: ' + money(nx.amt) + ' el ' + fd(nx.at, true) + (nx.st === 'hold' ? ' · retenido por To\u2019Latino' : '') + '.', 'Next payout to your bank: ' + money(nx.amt) + ' on ' + fd(nx.at, false) + (nx.st === 'hold' ? ' · held by To\u2019Latino' : '') + '.') : L2(es, 'Sin pagos pendientes.', 'No pending payouts.') }; }
  /* Recibos de Pro (lo que To'Latino le cobra al negocio): de TLTrial (primer cobro, volver a Pro) o del plan Pro de base (el 1 de cada mes desde abr 2026). */
  const hsh = s => { let h = 7; const x = String(s); for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return Math.abs(h); };
  function rcpts(id) { const T = W.TLTrial, B = ((W.TLDash2 && W.TLDash2.BIZ) || {})[id] || {}, C = T ? T.cfg() : { price: 14.99, year: 149.9 }, tr = T ? T.of(id) : null, A = ab(id), out = [];
    const card = tr && tr.card ? tr.card.brand + ' ·· ' + tr.card.last4 : 'Visa ·· 4242';
    if (A.pro === 'cortesia') out.push({ at: A.proAt || T0 - 2 * 864e5, amt: 0, cyc: 'cort', card: '', k: 'cort' });
    if (tr && tr.r && tr.r.start) { if (tr.r.paidAt && tr.r.paidAt <= T0 + 864e5) out.push({ at: tr.r.paidAt, amt: tr.charge, cyc: tr.cycle, card, k: tr.back ? 'back' : 'first' }); else if (tr.conv && tr.since && tr.since <= T0) out.push({ at: tr.since, amt: tr.charge, cyc: tr.cycle, card, k: 'first' }); }
    else if (B.plan === 'pro' || (tr && tr.base)) for (let m = 3; m <= 8; m++) out.push({ at: new Date(2026, m, 1, 6).getTime(), amt: C.price, cyc: 'mes', card, k: 'mes' });
    const h = hsh(id) % 9000 + 1000; return out.sort((a, b) => a.at - b.at).map((r, i) => ({ ...r, id: 'IN-' + h + '-' + (i + 1) })).reverse(); }
  W.TLPayP = { rcpts, T0, F0, fees, commOf, st, moves, payouts, sum, tue, fd, ft, money, r2 };
})();
