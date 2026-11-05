/* Reservaciones de mesa (restaurantes Pro con módulo Reservaciones). Disponibilidad simulada y estable por negocio, día, hora, personas y área. Hoy = jue 24 sep 2026, 12:30 PM.
   resp = minutos típicos de respuesta · max = personas en línea (más = evento privado) · sv = turnos [inicio, última hora, es, en] · tol = minutos que guardan la mesa · cxH = horas para cancelar gratis. */
(function () {
  const CFG = {
    'sabor-dominicano': { resp: 10, max: 8, areas: [['salon', 'Salón', 'Dining room'], ['terraza', 'Terraza', 'Patio']], sv: [[12, 15.5, 'Almuerzo', 'Lunch'], [17.5, 20.5, 'Cena', 'Dinner']], tol: 15, cxH: 2, full: { dow: [5, 6], p: 6 } },
    'el-fogon': { resp: 15, max: 10, areas: [['salon', 'Salón', 'Dining room'], ['barra', 'Barra', 'Bar'], ['terraza', 'Terraza', 'Patio']], sv: [[12, 15, 'Almuerzo', 'Lunch'], [18, 22.5, 'Cena', 'Dinner']], tol: 15, cxH: 2 },
    'mariscos-la-bahia': { resp: 20, max: 8, areas: [['salon', 'Salón', 'Dining room']], sv: [[16.5, 21, 'Cena', 'Dinner']], tol: 15, cxH: 2, closed: [1] }
  };
  const NOW = 12.5;
  const AR = { salon: ['salon', 'Salón', 'Dining room'], terraza: ['terraza', 'Terraza', 'Patio'], barra: ['barra', 'Barra', 'Bar'] };
  /* Lo que el negocio guarda en Panel v2 · Lo que vendes · Reservaciones (tl-dash2-v1 · over[id].modCfg.rsv) manda sobre la base:
     maxP · tables (mesas por turno) · areas salon|terraza|barra · sv { almuerzo|cena: { on, f, t } } · tol · cxH · minH (anticipación mínima, h) · maxD (días adelante) · resp. */
  let _raw, _ov = {};
  /* Horario del negocio (Panel v2 · Tu página · Horario; base en dash2-data): lun primero. Un día cerrado no se reserva y cada mesa tiene que caber en el horario de ese día. */
  const HOLS = id => { const T2 = window.TLDash2; if (!T2 || !T2.HOLD || !T2.BIZ || !T2.BIZ[id]) return []; let sc = T2.BIZ[id].sched || []; try { const o = ((JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})[id]) || {}; if (Array.isArray(o.sched)) sc = o.sched; } catch (e) {} const L = []; sc.forEach(k => { const H = T2.HOLD[k]; if (H) H.d.forEach(x => L.push([x[0], x[1], x[2], H.b])); }); return L; };
  const HRS = id => { let h = null; try { h = ((((JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})[id]) || {}).hours) || null; } catch (e) {} if (!h && window.TLDash2 && window.TLDash2.BIZ && window.TLDash2.BIZ[id]) h = window.TLDash2.BIZ[id].hours; return Array.isArray(h) && h.length === 7 ? h : null; };
  function cfg(id) { const c = CFG[id]; if (!c) return null; let raw = null; try { raw = localStorage.getItem('tl-dash2-v1'); } catch (e) {}
    if (raw !== _raw) { _raw = raw; _ov = {}; } if (_ov[id] !== undefined) return _ov[id];
    let m = null; try { m = (((JSON.parse(raw || '{}').over || {})[id] || {}).modCfg || {}).rsv || null; } catch (e) {}
    if (!m) return (_ov[id] = { ...c, hrs: HRS(id), hol: HOLS(id) });
    const ar = (m.areas || []).map(k => k === 'adentro' ? 'salon' : k).filter((k, i, a) => AR[k] && a.indexOf(k) === i).map(k => AR[k]);
    const sv = m.sv ? [['almuerzo', 'Almuerzo', 'Lunch'], ['cena', 'Cena', 'Dinner']].filter(([k]) => m.sv[k] && m.sv[k].on).map(([k, es, en]) => [+m.sv[k].f, +m.sv[k].t, es, en]) : m.turnos ? c.sv.filter(g => m.turnos.includes(g[2] === 'Almuerzo' ? 'almuerzo' : 'cena')) : c.sv;
    /* ar = mesas por área { salon|terraza|barra: { on, t: { 2|4|6|8: cuántas } } } · join + joinMax = juntan mesas · walk = mesas que no se reservan · dur = horas por reservación · days = días (0 = dom) */
    let fit = null, max = +m.maxP || c.max, areas = ar.length ? ar : c.areas;
    if (m.ar) { fit = {}; Object.keys(AR).forEach(k => { const a = m.ar[k]; if (!a || !a.on) return; const t = {}; let n = 0; [2, 4, 6, 8].forEach(z => { const v = +((a.t || {})[z]) || 0; if (v) { t[z] = v; n += v; } }); if (n) fit[k] = t; });
      const ks = Object.keys(fit); if (ks.length) { areas = ks.map(k => AR[k]); const big = Math.max(...ks.map(k => Math.max(...Object.keys(fit[k]).map(Number)))); max = m.join ? Math.max(big, +m.joinMax || big) : big; } else fit = null; }
    return (_ov[id] = { ...c, hrs: HRS(id), hol: HOLS(id), auto: !!m.auto, blk: Array.isArray(m.blk) ? m.blk : [], max, areas, fit, join: !!m.join, walk: +m.walk || 0, dur: +m.dur || 1.5, days: Array.isArray(m.days) && m.days.length ? m.days : null, sv: sv.length ? sv : c.sv, tol: +m.tol || c.tol, cxH: +m.cxH || c.cxH, resp: +m.resp || c.resp, minH: +m.minH || 1, maxD: +m.maxD || 14, tables: +m.tables || 12 }); }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const day = i => new Date(2026, 8, 24 + i);
  const hOf = (c, i) => { if (!c || !c.hrs) return undefined; const dt = day(i), H = c.hrs[(dt.getDay() + 6) % 7] || null, x = (c.hol || []).find(z => z[0] === dt.getFullYear() && z[1] === dt.getMonth() && z[2] === dt.getDate()); if (!x || !H || !H.on) return H; return x[3] ? { on: true, a: H.a, b: Math.min(x[3], H.two ? H.b2 : H.b), two: false } : { on: false }; };
  const inH = (c, i, h) => { const H = hOf(c, i); if (H === undefined) return true; if (!H || !H.on) return false; const du = c.dur || 1.5; return (h >= H.a - 1e-9 && h + du <= H.b + 1e-9) || (!!H.two && h >= H.a2 - 1e-9 && h + du <= H.b2 + 1e-9); };
  const svK = (c, h) => { const g = (c.sv || []).find(x => h >= x[0] - 1e-9 && h <= x[1] + 1e-9); return g ? (g[2] === 'Almuerzo' ? 'almuerzo' : 'cena') : ''; };
  const open = (id, i) => { const c = cfg(id), dw = day(i).getDay(), H = hOf(c, i); return !!c && !(c.closed || []).includes(dw) && (!c.days || c.days.includes(dw)) && (H === undefined || !!(H && H.on)); };
  function freeA(id, i, h, p, ar) {
    const c = cfg(id); if (!c || !open(id, i) || p > c.max) return false; if (i >= (c.maxD || 14) || i * 24 + h - NOW < (c.minH || 1)) return false; if (!inH(c, i, h)) return false;
    if ((c.blk || []).some(x => +x.d === i && (x.sv === 'all' || x.sv === svK(c, h)) && (x.ar === 'all' || x.ar === ar))) return false;
    const dw = day(i).getDay(), wk = dw === 5 || dw === 6; if (c.full && c.full.dow.includes(dw) && p >= c.full.p) return false;
    let tk = (12 - (c.tables || 12)) * .015;
    if (c.fit) { const t = c.fit[ar]; if (!t) return false; const S = Object.keys(t).map(Number), nA = S.reduce((x, z) => x + t[z], 0); let n = S.filter(z => z >= p).reduce((x, z) => x + t[z], 0);
      if (!n) { if (!c.join || p > c.max) return false; n = Math.floor(nA / 2); }
      const all = Object.keys(c.fit).reduce((x, k) => x + Object.values(c.fit[k]).reduce((a, b) => a + b, 0), 0); n -= Math.round((c.walk || 0) * nA / Math.max(1, all)); if (n <= 0) return false;
      tk = (6 - Math.min(n, 12)) * .03 + ((c.dur || 1.5) - 1.5) * .12; }
    const pr = Math.min(.95, Math.max(.05, .16 + (p >= 5 ? .2 : p >= 3 ? .07 : 0) + (wk ? .16 : 0) + (h >= 19 && h <= 20.5 ? .14 : 0) + (i === 0 ? .08 : 0) + tk));
    return hash(id + '|' + i + '|' + h + '|' + ar + '|' + (p >= 5 ? 'L' : p >= 3 ? 'M' : 'S')) >= pr;
  }
  const pick = (id, i, h, p, a) => { const c = cfg(id); if (!c) return ''; const ks = a ? [a] : c.areas.map(x => x[0]); return ks.find(k => freeA(id, i, h, p, k)) || ''; };
  const groups = (id, i, p, a) => { const c = cfg(id) || {}; return (c.sv || []).map(([s, e, es, en]) => { const sl = []; for (let h = s; h <= e + 1e-9; h += .5) if (inH(c, i, h)) sl.push({ h, free: !!pick(id, i, h, p, a) }); return { s, e, es, en, sl }; }).filter(g => g.sl.length); };
  const any = (id, i, p, a) => groups(id, i, p, a).some(g => g.sl.some(x => x.free));
  const days = (id, from, p, a, n) => { const o = [], mx = (cfg(id) || {}).maxD || 14; for (let i = 0; i < mx && o.length < (n || 3); i++) if (i !== from && any(id, i, p, a)) o.push(i); return o; };
  const near = (id, i, h, p, a) => { for (const d of [.5, -.5, 1, -1, 1.5]) { const x = h + d, ar = pick(id, i, x, p, a); if (ar) return { h: x, area: ar }; } return null; };
  const areaL = (id, k, es) => { const c = cfg(id), a = ((c ? c.areas : []).find(x => x[0] === k)) || AR[k]; return a ? a[es ? 1 : 2] : ''; };
  window.TLRsv = { CFG, NOW, AR, cfg, inH, svK, day, open, freeA, pick, groups, any, days, near, areaL };
})();
