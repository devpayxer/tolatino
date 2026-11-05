/* El Patio · Parchís (P13). Motor por turnos, sin dinero: 2 a 4 jugadores, clásico (4 fichas, sales con 5) o rápido (2 fichas,
   sales con 5 o con 6). Un dado. 6 = tiras otra vez (si no tienes fichas en casa, cuenta 7); tres 6 seguidos = tu última ficha
   vuelve a casa. Comer = cuentas 20 con otra ficha; llegar a la meta = cuentas 10. Casillas seguras: no se come. Barrera = dos
   fichas del mismo color: nadie pasa. Máximo 2 fichas por casilla. Para llegar a la meta hace falta el número exacto.
   Tablero 19×19: 68 casillas en la vuelta, 7 de pasillo por color y la meta al centro. Lo usa To'Latino Comunidad.dc.html. */
(function () {
  const COL = [
    { k: 'am', es: 'Amarillo', en: 'Yellow', c: '#FFB020', t: 'rgba(255,176,32,.26)', ink: '#8A5A00', S: 5, yard: [11, 11] },
    { k: 'az', es: 'Azul', en: 'Blue', c: '#4B37F5', t: 'rgba(75,55,245,.18)', ink: '#4B37F5', S: 22, yard: [0, 11] },
    { k: 'ro', es: 'Rojo', en: 'Red', c: '#C0392B', t: 'rgba(192,57,43,.16)', ink: '#C0392B', S: 39, yard: [0, 0] },
    { k: 've', es: 'Verde', en: 'Green', c: '#00A88F', t: 'rgba(0,168,143,.18)', ink: '#00695B', S: 56, yard: [11, 0] }
  ];
  const SAFE = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68], LOOP = 63, META = 71;
  const TR = {}; for (let i = 0; i < 8; i++) { TR[1 + i] = [18 - i, 10]; TR[9 + i] = [10, 11 + i]; TR[18 + i] = [8, 18 - i]; TR[26 + i] = [7 - i, 10]; TR[35 + i] = [i, 8]; TR[43 + i] = [8, 7 - i]; TR[52 + i] = [10, i]; TR[60 + i] = [11 + i, 8]; }
  TR[17] = [9, 18]; TR[34] = [0, 9]; TR[51] = [9, 0]; TR[68] = [18, 9];
  const PAS = [s => [18 - s, 9], s => [9, 18 - s], s => [s, 9], s => [9, s]];
  const SEATCOL = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
  const sqOf = (c, k) => ((COL[c].S - 1 + k) % 68) + 1;
  /* id de la casilla donde está una ficha: 't23' en la vuelta, 'p0-4' en un pasillo, 'meta', 'casa' */
  function cell(c, k) { if (k < 0) return 'casa'; if (k >= META) return 'meta'; if (k <= LOOP) return 't' + sqOf(c, k); return 'p' + c + '-' + (k - LOOP); }
  function rc(c, k) { if (k < 0 || k >= META) return null; if (k <= LOOP) return TR[sqOf(c, k)]; return PAS[c](k - LOOP); }
  function yardSlot(c, i) { const y = COL[c].yard; return [y[0] + 2.5 + (i >> 1) * 3, y[1] + 2.5 + (i & 1) * 3]; }
  function metaSlot(c, i) { const M = [[10.1, 9], [9, 10.1], [7.9, 9], [9, 7.9]][c], d = (i - 1.5) * .42; return c % 2 === 0 ? [M[0], M[1] + d] : [M[0] + d, M[1]]; }
  function create(o) { o = o || {}; const n = [2, 3, 4].includes(o.n) ? o.n : 4, mode = o.mode === 'rapido' ? 'rapido' : 'clasico', np = mode === 'rapido' ? 2 : 4, cols = SEATCOL[n];
    return { v: 1, n, mode, np, cols, seats: (o.seats || []).slice(0, n), pcs: cols.map(() => Array(np).fill(-1)), turn: 0, st: 'roll', die: null, mv: 0, bonus: 0, sixes: 0, last: cols.map(() => -1), ev: null, hist: [], win: null, moves: 0, at: Date.now(), priv: o.priv || null }; }
  const exitV = g => g.mode === 'rapido' ? [5, 6] : [5];
  function occ(g) { const O = {}; g.pcs.forEach((P, s) => P.forEach((k, i) => { const id = cell(g.cols[s], k); if (id === 'casa' || id === 'meta') return; (O[id] = O[id] || []).push({ s, i }); })); return O; }
  const barrier = L => L && L.length === 2 && L[0].s === L[1].s;
  function canExit(g, s, O) { const id = 't' + COL[g.cols[s]].S, L = (O || occ(g))[id] || []; return !(L.length >= 2 && L.every(x => x.s === s)); }
  /* Jugadas posibles del jugador s con v casillas (bonus = 20/10 no saca fichas de casa) */
  function legal(g, s, v, isBonus) { const O = occ(g), c = g.cols[s], P = g.pcs[s], out = [];
    if (!isBonus && exitV(g).includes(g.die) && P.some(k => k < 0) && canExit(g, s, O)) { const i = P.indexOf(-1), id = 't' + COL[c].S, L = O[id] || [], foe = L.filter(x => x.s !== s); return [{ i, from: -1, to: 0, exit: 1, cap: L.length >= 2 && foe.length ? foe[foe.length - 1] : null }]; }
    P.forEach((k, i) => { if (k < 0 || k >= META) return; const nk = k + v; if (nk > META) return;
      for (let j = k + 1; j < nk; j++) { if (barrier(O[cell(c, j)])) return; }
      const id = cell(c, nk), L = O[id] || []; if (nk < META && L.length >= 2) return;
      let cap = null; if (nk <= LOOP && L.length === 1 && L[0].s !== s && !SAFE.includes(sqOf(c, nk))) cap = L[0];
      out.push({ i, from: k, to: nk, cap, meta: nk === META, pas: nk > LOOP && k <= LOOP, safe: nk <= LOOP && SAFE.includes(sqOf(c, nk)) }); });
    return out; }
  const push = (g, e) => { g.ev = e; g.hist = [e].concat(g.hist).slice(0, 8); };
  const nextTurn = g => { g.turn = (g.turn + 1) % g.n; g.st = 'roll'; g.die = null; g.mv = 0; g.bonus = 0; g.sixes = 0; g.opts = null; };
  const done = (g, s) => g.pcs[s].every(k => k >= META);
  /* Tirar el dado (d opcional para pruebas) */
  function roll(g, d) { if (g.st !== 'roll') return null; const s = g.turn, die = d || 1 + Math.floor(Math.random() * 6); g.die = die;
    if (die === 6) g.sixes++; else g.sixes = 0;
    if (g.sixes >= 3) { const li = g.last[s], k = li >= 0 ? g.pcs[s][li] : -1; let back = null; if (li >= 0 && k >= 0 && k <= LOOP) { g.pcs[s][li] = -1; back = li; } push(g, { t: 'six3', s, die, i: back }); nextTurn(g); return g.ev; }
    const allOut = !g.pcs[s].some(k => k < 0), v = die === 6 && allOut ? 7 : die; g.mv = v;
    const L = legal(g, s, v, false); push(g, { t: 'roll', s, die, v, n: L.length });
    if (!L.length) { push(g, { t: 'pass', s, die, v, again: die === 6 }); if (die === 6) { g.st = 'roll'; g.die = die; } else nextTurn(g); return g.ev; }
    g.st = 'move'; g.opts = L; return g.ev; }
  /* Mover la ficha i con el dado o con el bonus pendiente */
  function move(g, i) { if (g.st !== 'move' && g.st !== 'bonus') return null; const s = g.turn, isB = g.st === 'bonus', v = isB ? g.bonus : g.mv, L = legal(g, s, v, isB), m = L.find(x => x.i === i); if (!m) return null;
    g.pcs[s][i] = m.to; g.last[s] = i; g.moves++; let bonus = 0;
    if (m.cap) { g.pcs[m.cap.s][m.cap.i] = -1; bonus = 20; }
    if (m.meta) bonus = 10;
    push(g, { t: m.exit ? 'exit' : m.meta ? 'meta' : 'move', s, i, from: m.from, to: m.to, v, cap: m.cap, bonus: isB, sq: m.to <= LOOP ? sqOf(g.cols[s], m.to) : null, pas: m.to > LOOP && m.to < META ? m.to - LOOP : null });
    if (done(g, s)) { g.st = 'over'; g.win = s; g.opts = null; push(g, { t: 'win', s }); return g.ev; }
    if (bonus) { const BL = legal(g, s, bonus, true); if (BL.length) { g.st = 'bonus'; g.bonus = bonus; g.opts = BL; return g.ev; } push(g, { t: 'nobonus', s, v: bonus }); }
    if (g.die === 6) { g.st = 'roll'; g.mv = 0; g.bonus = 0; g.opts = null; } else nextTurn(g); return g.ev; }
  function opts(g) { if (g.st === 'move') return legal(g, g.turn, g.mv, false); if (g.st === 'bonus') return legal(g, g.turn, g.bonus, true); return []; }
  /* La computadora: come primero, luego llega, luego a casilla segura, luego saca o adelanta la que va más atrás */
  function pick(g) { const L = opts(g); if (!L.length) return null; const sc = m => (m.cap ? 60 : 0) + (m.meta ? 45 : 0) + (m.pas ? 22 : 0) + (m.exit ? 18 : 0) + (m.safe ? 10 : 0) + (m.from >= 0 ? (LOOP - m.from) / 30 : 0) + Math.random(); return L.slice().sort((a, b) => sc(b) - sc(a))[0].i; }
  function bot(g) { if (g.st === 'roll') return roll(g); if (g.st === 'move' || g.st === 'bonus') { const i = pick(g); return i == null ? null : move(g, i); } return null; }
  function left(g, s) { return g.pcs[s].filter(k => k < META).length; }
  function prog(g, s) { return g.pcs[s].reduce((a, k) => a + Math.max(0, Math.min(META, k)), 0) / (META * g.np); }
  /* Celdas del tablero para dibujar (68 de la vuelta + 28 de pasillo) */
  function cells() { const out = []; Object.keys(TR).forEach(q => { const n = +q, [r, c] = TR[n], sal = COL.findIndex(x => x.S === n); out.push({ id: 't' + n, n, r, c, safe: SAFE.includes(n), sal }); });
    COL.forEach((x, ci) => { for (let s = 1; s <= 7; s++) { const [r, c] = PAS[ci](s); out.push({ id: 'p' + ci + '-' + s, r, c, pas: ci }); } }); return out; }
  window.TLParchis = { COL, SAFE, LOOP, META, TR, SEATCOL, create, legal, roll, move, opts, pick, bot, cell, rc, yardSlot, metaSlot, cells, occ, left, prog, sqOf, done, exitV };
})();
