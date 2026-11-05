/* Relacionados (Panel v2 · Tu página · Relacionados) = una sola lista de vínculos para el panel de los dos negocios, la pestaña Relacionados y el Super Admin.
   Regla del plan: el negocio propone, el otro acepta; sale en las dos páginas solo cuando los dos dijeron que sí. Tipos: sucursal · mismo dueño. Solo Pro.
   Base = TLRel.REL (vínculos ya confirmados). Guardado en tl-dash2-v1 · over[id]: relOut [{ key, oid, k, note, at }] = solicitudes que mandé ·
   relAns { key: { ok 1 | no 1, note } } = mi respuesta a una que me mandaron · relGone { key: 1 } = lo quité (sale de las dos) · relNote { key: nota } = mi nota.
   To'Latino oculta un vínculo con tl-adm-v1.biz[id].relOff[key] (cualquiera de los dos lados) y pausa la pestaña con modOff.rel.
   sync() reescribe TLRel.REL con los vínculos vivos (lo leen la pestaña y el Super Admin); TLRel._base guarda la base. */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1';
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const keyOf = (a, b) => [a, b].sort().join('|');
  /* Ejemplos del panel: Sabor pidió a Mercado Quisqueyano (esperando) y Frutas El Conuco le pidió a Sabor (por responder). */
  const SEED = { 'sabor-dominicano': [{ oid: 'mercado-quisqueyano', k: 'dueno', note: ['El mercado de la familia Peña, en Alter St. Ahí compramos el plátano y la yuca.', 'The Peña family market, on Alter St. That is where we buy plantains and cassava.'], at: ['mar 22 sep', 'Tue Sep 22'] }] };
  const SEED_IN = [{ a: 'frutas-el-conuco', b: 'sabor-dominicano', k: 'dueno', note: ['El restaurante de doña Rosa, la mamá de Juan Carlos. Usan nuestras frutas en los jugos.', 'Doña Rosa’s restaurant, Juan Carlos’s mother. They use our fruit in their juices.'], at: ['hoy 10:15 AM', 'today 10:15 AM'] }];
  /* Directorio mínimo para el panel suelto (sin TLAll): nombre, especialidades y foto. */
  const DIR = { 'sabor-dominicano': ['Sabor Dominicano', ['Dominicana', 'Catering'], 39122376], 'sabor-dominicano-alter': ['Sabor Dominicano · Alter St', ['Dominicana'], 38330332], 'catering-hazleton': ['Catering Hazleton Latino', ['Catering', 'Dominicana'], 2337843], 'flan-y-mas': ['Flan y Más', ['Postres'], 33674417], 'mercado-quisqueyano': ['Mercado Quisqueyano', ['Productos dominicanos', 'Frutas y verduras'], 12199572], 'frutas-el-conuco': ['Frutas y Vegetales El Conuco', ['Frutas y verduras'], 9811241], 'barberia-el-primo': ['Barbería El Primo', ['Barbería'], 4969842], 'empanadas-dona-luz': ['Empanadas Doña Luz', ['Empanadas'], 6166796], 'cafe-quisqueya': ['Café Quisqueya', ['Cafetería'], 19252265], 'jugos-tropical': ['Jugos Tropical', ['Jugos y batidos'], 27518954], 'panaderia-la-espiga': ['Panadería La Espiga', ['Panadería'], 35993723], 'salon-glamour': ['Salón Glamour', ['Salón de belleza'], 7195805], 'rizos-color': ['Rizos & Color', ['Especialista en rizos'], 9146943], 'trenzas-yaritza': ['Trenzas Yaritza', ['Trenzas y extensiones'], 35382770] };
  /* Sin las listas del cliente (panel suelto): los mismos sugeridos que ve la página. */
  const SUGD = { 'sabor-dominicano': [['cafe-quisqueya', 0.1], ['jugos-tropical', 0.2], ['panaderia-la-espiga', 0.4]], 'barberia-el-primo': [['salon-glamour', 0.3], ['rizos-color', 0.5], ['trenzas-yaritza', 1.2]] };
  const ovA = () => (rd(DK) || {}).over || {};
  const adm = () => (rd(AK) || {}).biz || {};
  const bizL = () => [].concat((W.TLAll && W.TLAll.B) || [], (W.TLFood && W.TLFood.B) || []);
  const biz = id => bizL().find(b => b.id === id) || (DIR[id] ? { id, name: DIR[id][0], subs: DIR[id][1], ph: [DIR[id][2]], tags: [], r: 0, n: 0, d: 0, dir: 1 } : null);
  function base() { const R = W.TLRel; if (!R) return []; if (!R._base) R._base = (R.REL || []).map(r => Object.assign({}, r)); return R._base; }
  /* Todos los vínculos con su estado: ok (los dos), out (yo pedí), in (me pidieron), no (rechazado), gone (quitado). */
  function all(OV) { const O = OV || ovA(), A = adm(), L = [];
    base().forEach(r => L.push({ key: keyOf(r.a, r.b), a: r.a, b: r.b, k: r.k, na: r.na, nb: r.nb, by: r.a, st: 'ok', b0: 1 }));
    const outs = []; Object.keys(SEED).forEach(a => { if (!Array.isArray((O[a] || {}).relOut)) SEED[a].forEach(x => outs.push(Object.assign({ a }, x, { seed: 1 }))); });
    SEED_IN.forEach(x => outs.push(Object.assign({}, x, { oid: x.b, seed: 1 })));
    Object.keys(O).forEach(a => ((O[a] && O[a].relOut) || []).forEach(x => outs.push(Object.assign({ a }, x))));
    outs.forEach(x => { const a = x.a, b = x.oid || x.b, key = keyOf(a, b); if (a === b || L.some(y => y.key === key)) return; const an = ((O[b] || {}).relAns || {})[key];
      L.push({ key, a, b, k: x.k, na: x.note, nb: an && an.note ? an.note : null, by: a, at: x.at, st: an ? (an.ok ? 'ok' : 'no') : 'pend', seed: !!x.seed }); });
    L.forEach(r => { const gA = ((O[r.a] || {}).relGone || {})[r.key], gB = ((O[r.b] || {}).relGone || {})[r.key]; if (gA || gB) { r.st = 'gone'; r.goneBy = gA ? r.a : r.b; }
      const nA = ((O[r.a] || {}).relNote || {})[r.key], nB = ((O[r.b] || {}).relNote || {})[r.key]; if (nA) r.na = nA; if (nB) r.nb = nB;
      r.adm = !!(((A[r.a] || {}).relOff || {})[r.key] || ((A[r.b] || {}).relOff || {})[r.key]); });
    return L; }
  const paused = id => !!(((adm()[id] || {}).modOff || {}).rel);
  /* Vista desde un negocio: oid = el otro, mine = mi nota (lo que mi página dice del otro), theirs = la del otro, dir out|in. */
  function of(id, OV) { return all(OV).filter(r => r.a === id || r.b === id).map(r => { const me = r.a === id; return Object.assign({}, r, { oid: me ? r.b : r.a, mine: me ? r.na : r.nb, theirs: me ? r.nb : r.na, dir: r.by === id ? 'out' : 'in' }); }); }
  const live = r => r.st === 'ok' && !r.adm;
  function liveOf(id) { if (paused(id)) return []; return of(id).filter(r => live(r) && !paused(r.oid) && biz(r.oid)); }
  let _k = null;
  function sync(force) { const R = W.TLRel; if (!R) return false; let key = ''; try { key = (localStorage.getItem(DK) || '') + '|' + (localStorage.getItem(AK) || ''); } catch (e) {} if (!force && key === _k) return false; _k = key;
    base(); R.REL = all().filter(r => live(r) && !paused(r.a) && !paused(r.b)).map(r => ({ a: r.a, b: r.b, k: r.k, na: r.na || ['', ''], nb: r.nb || ['', ''] })); return true; }
  /* Sugeridos «cerca de ti» (plan · flujos-transversales): To'Latino los elige solo; negocios cercanos de la misma categoría que no hacen lo mismo
     (no competidores directos: ninguna especialidad en común), los Pro primero. El dueño los apaga (over.relSug = 0) o quita uno (over.relSugOff[id]). */
  const GL = ['TLFood', 'TLBeauty', 'TLAuto', 'TLHogar', 'TLSalud', 'TLPro', 'TLFiesta', 'TLMerc', 'TLNoche', 'TLTienda', 'TLTrans', 'TLEdu', 'TLNinos', 'TLDeporte', 'TLFe', 'TLInmueble', 'TLDealer'];
  function sug(id, OV, n) { const O = OV || ovA(), o = O[id] || {}; if (o.relSug === 0 || paused(id)) return []; const me = bizL().find(b => b.id === id); if (!me) { const off = o.relSugOff || {}; return (SUGD[id] || []).filter(([x]) => !off[x]).slice(0, n || 3).map(([x, mi]) => ({ oid: x, mi, sub: (DIR[x] || ['', ['']])[1][0] })); }
    const L = GL.map(g => W[g] && W[g].B).find(B => B && B.some(x => x.id === id)) || [], linked = of(id, O).filter(r => r.st !== 'gone' && r.st !== 'no').map(r => r.oid), off = o.relSugOff || {}, ms = me.subs || [], d0 = +me.d || 0;
    return L.filter(x => x && x.id !== id && !linked.includes(x.id) && !off[x.id] && !x.at && !(x.subs || []).some(z => ms.includes(z)) && !/^silla-/.test(x.id))
      .map(x => ({ x, dd: Math.abs((+x.d || 0) - d0) })).sort((p, q) => (q.x.pro ? 1 : 0) - (p.x.pro ? 1 : 0) || p.dd - q.dd || (q.x.r || 0) - (p.x.r || 0)).slice(0, n || 3)
      .map(({ x, dd }) => ({ oid: x.id, mi: Math.max(0.1, Math.round(dd * 10) / 10), sub: (x.subs || [])[0] || '' })); }
  const search = (q, me) => { const nm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), Q = nm(q).trim(); if (Q.length < 2) return []; const seen = {}, L = bizL().concat(Object.keys(DIR).map(biz)); return L.filter(b => b && b.id !== me && !seen[b.id] && (seen[b.id] = 1) && nm(b.name).includes(Q)).slice(0, 6); };
  W.TLRelP = { keyOf, all, of, liveOf, live, paused, biz, bizL, search, sug, sync, SEED, SEED_IN, DIR };
  (function boot(n) { if (!W.TLRel) { if (n < 120 && (W.TLAll || n < 30)) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
