/* To'Latino · soporte (P9 · 20 oct 2026). Casos del vecino con el equipo de To'Latino.
   localStorage tl-sop-v1 [{ id, cat, ref, refL, biz, st: 'open'|'done', at, by, msgs: [{ who: 'me'|'tl'|'sys', t, te, ph, at, key, sim, name }] }].
   Las respuestas del equipo se escriben en el Super Admin (tl-adm-v1.notes[id].msgs, st 'espera'|'res'; dec[id] al resolver):
   thread() las mezcla por hora. Estados para el vecino: nuevo (recibido) · curso (lo está viendo alguien) · espera (te respondieron) · res. */
(function () {
  const W = window, KEY = 'tl-sop-v1';
  const rd = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } };
  const wr = L => { try { localStorage.setItem(KEY, JSON.stringify(L.slice(0, 60))); } catch (e) {} };
  const adm = () => { try { return JSON.parse(localStorage.getItem('tl-adm-v1') || '{}') || {}; } catch (e) { return {}; } };
  const CAT = { pedido: ['Un pedido', 'An order', 'Pedido', 'Order'], cita: ['Una cita o reservación', 'A booking or reservation', 'Cita', 'Booking'], pago: ['Un pago o un cobro', 'A payment or a charge', 'Pago', 'Payment'], negocio: ['Un negocio o una reseña', 'A business or a review', 'Negocio', 'Business'], cuenta: ['Mi cuenta', 'My account', 'Cuenta', 'Account'], tecnico: ['La app no funciona bien', 'The app is not working well', 'Técnico', 'Technical'], sugerencia: ["Una idea para To'Latino", "An idea for To'Latino", 'Sugerencia', 'Suggestion'] };
  const list = () => rd(), get = id => rd().find(t => t.id === id) || null;
  function add(x, user) { const L = rd(), id = 'TK-' + (5203 + L.length * 7), at = Date.now();
    const t = { id, cat: x.cat || 'cuenta', ref: x.ref || '', refL: x.refL || '', biz: x.biz || '', st: 'open', at, msgs: [{ who: 'me', t: x.text, ph: x.ph || null, at }, { who: 'sys', key: 'ack', at: at + 1, t: 'Recibimos tu caso ' + id + '. Una persona del equipo te responde hoy, en español.', te: 'We got your case ' + id + '. A person from the team replies today.' }] };
    L.unshift(t); wr(L); return t; }
  function push(id, m) { const L = rd(), i = L.findIndex(t => t.id === id); if (i < 0) return; L[i] = Object.assign({}, L[i], { msgs: L[i].msgs.concat([Object.assign({ at: Date.now() }, m)]) }); wr(L); }
  function set(id, p) { const L = rd(), i = L.findIndex(t => t.id === id); if (i < 0) return; L[i] = Object.assign({}, L[i], p); wr(L); }
  function pick(id, first) { const t = get(id); if (!t || t.st === 'done' || t.msgs.some(m => m.who === 'tl')) return; const f = first ? ' ' + first : '';
    push(id, { who: 'tl', name: 'Dayana', sim: 1, key: 'pick', t: 'Hola' + f + ', soy Dayana del equipo de To\u2019Latino. Ya estoy viendo tu caso. Te escribo aquí en cuanto tenga respuesta; no tienes que hacer nada más.', te: 'Hi' + f + ', I am Dayana from the To\u2019Latino team. I am looking at your case now. I will write here as soon as I have an answer; you do not need to do anything else.' }); set(id, { by: 'dayana' }); }
  function team(id) { const S = adm(), n = (S.notes || {})[id] || {}; return { msgs: (n.msgs || []).map(m => ({ who: 'tl', name: String(m.meta || '').split(' · ')[0] || 'To\u2019Latino', t: m.t, at: m.at || 0 })), st: n.st || '', dec: !!(S.dec || {})[id], by: (S.assign || {})[id] || '' }; }
  function thread(id) { const t = get(id); if (!t) return []; return t.msgs.concat(team(id).msgs).sort((a, b) => (a.at || 0) - (b.at || 0)); }
  function stOf(t) { if (!t) return 'nuevo'; const T = team(t.id); if (t.st === 'done' || T.st === 'res' || T.dec) return 'res'; const th = thread(t.id).filter(m => m.who !== 'sys'), last = th[th.length - 1];
    if (last && last.who === 'tl' && !last.sim) return 'espera'; if (t.by || T.by || (last && last.who === 'tl')) return 'curso'; return 'nuevo'; }
  const resBy = t => { const T = team(t.id); return t.st === 'done' ? 'me' : (T.st === 'res' || T.dec) ? 'tl' : ''; };
  const openCount = () => rd().filter(t => stOf(t) !== 'res').length;
  W.TLSop = { KEY, CAT, list, get, add, push, set, pick, team, thread, stOf, resBy, openCount };
})();
