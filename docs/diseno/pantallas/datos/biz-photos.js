/* To'Latino · fotos del negocio (P5 · 20 oct 2026). Una sola fuente para ficha, galería, tarjetas y Super Admin.
   Del negocio: galería del panel (tl-dash2-v1.over[id].gallery → TLDash2.BIZ[id].gallery) + b.ph + b.photos, sin repetir.
   De los vecinos: fotos de reseñas (TLRev.forBiz + la tuya). El Super Admin quita fotos: tl-adm-v1.biz[id].phOff[ph] = { at, why, by }.
   Las fotos quitadas salen de la ficha, la galería, las reseñas y las tarjetas (TLAdm.apply filtra b.ph).
   Reportes de vecinos: localStorage tl-ph-rep-v1 [{ id, biz, ph, kind, rid, why, note, at }] → Super Admin · Colas · Medios. */
(function () {
  const W = window, RK = 'tl-ph-rep-v1', memo = {};
  const ls = k => { let raw = null; try { raw = localStorage.getItem(k); } catch (e) {} if (memo[k] && memo[k].raw === raw) return memo[k].v; let v = null; try { v = JSON.parse(raw || 'null'); } catch (e) {} memo[k] = { raw, v }; return v; };
  const off = id => { const S = ls('tl-adm-v1'); return (S && S.biz && S.biz[id] && S.biz[id].phOff) || {}; };
  const isOff = (id, p) => !!off(id)[String(p)];
  const uniq = a => { const s = new Set(), o = []; a.forEach(x => { if (x == null || x === '' || s.has(String(x))) return; s.add(String(x)); o.push(x); }); return o; };
  function biz(b, o) { if (!b) return []; const all = o && o.all, D = ls('tl-dash2-v1'), ov = (D && D.over && D.over[b.id]) || {}, d2 = (W.TLDash2 && W.TLDash2.BIZ && W.TLDash2.BIZ[b.id]) || null;
    const L = uniq([].concat(ov.gallery || (d2 && d2.gallery) || [], b._ph0 || b.ph || [], Array.isArray(b.photos) ? b.photos.filter(x => typeof x === 'number' || /^\d+$/.test(String(x))) : []));
    if (all) return L; const L2 = L.filter(p => !isOff(b.id, p)); return b.pro || (o && o.full) ? L2 : L2.slice(0, (W.TLOnbNeg && W.TLOnbNeg.FREE_PHOTOS) || 3); }
  function rev(b, mine, o) { if (!b || !W.TLRev) return []; if (!b.pro && !(o && (o.all || o.full))) return []; const all = o && o.all, A = (W.TLAll && W.TLAll.B) || [], fb = W.TLRev.forBiz0 || W.TLRev.forBiz; let L = [];
    try { L = fb.call(W.TLRev, b, A.indexOf(b)) || []; } catch (e) { L = []; }
    if (mine && !L.some(r => r.id === mine.id)) L = [mine].concat(L);
    const out = []; L.forEach(r => (r.ph || []).forEach(p => { if (all || !isOff(b.id, p)) out.push({ ph: p, rid: r.id, name: r.name || '', stars: r.stars || 0, d: r.d || 0, vis: r.src === 'vis', mine: !!r.mine || (mine && r.id === mine.id) }); }));
    return out.sort((a, c) => a.d - c.d); }
  const count = (b, mine) => biz(b).length + rev(b, mine).length;
  const reps = () => ls(RK) || [];
  function report(x) { const L = reps().slice(); L.unshift(Object.assign({ id: 'PR' + Date.now().toString(36), at: Date.now() }, x)); try { localStorage.setItem(RK, JSON.stringify(L.slice(0, 200))); } catch (e) {} }
  const reported = (bid, p) => reps().some(r => r.biz === bid && String(r.ph) === String(p));
  (function wrap(n) { const R = W.TLRev; if (!R || !R.forBiz) { if (n < 150) setTimeout(() => wrap(n + 1), 60); return; } if (R.forBiz0) return;
    R.forBiz0 = R.forBiz; R.forBiz = function (b, i) { const L = R.forBiz0.call(R, b, i) || [], o = b ? off(b.id) : {}; if (!Object.keys(o).length) return L; return L.map(r => (r.ph || []).some(p => o[String(p)]) ? Object.assign({}, r, { ph: r.ph.filter(p => !o[String(p)]) }) : r); }; })(0);
  W.TLPhotos = { biz, rev, count, off, isOff, report, reported, reps, RK };
})();
