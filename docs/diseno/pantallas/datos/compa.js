/* El Compa · asistente de IA de To'Latino (decisión del usuario, 22 oct · patrones 2as hoja de ayuda y 2at pasos guiados).
   Contesta con la ayuda (TLWeb) y los datos de la sesión, prepara acciones que el vecino confirma y nunca mueve dinero ni cambia
   la cuenta: eso pasa a una persona (TLSop) con el resumen. En el prototipo usa IA real (window.claude.complete); si no hay IA,
   responde con reglas fijas. Conversaciones en tl-compa-v1 (las lee el Super Admin). */
(function () {
  const KEY = 'tl-compa-v1';
  const rd = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const wr = L => { try { localStorage.setItem(KEY, JSON.stringify(L.slice(0, 40))); } catch (e) {} };
  const list = () => rd(), get = id => rd().find(c => c.id === id) || null;
  function save(c) { const L = rd(), i = L.findIndex(x => x.id === c.id); const v = Object.assign({}, c, { upd: Date.now() }); if (i < 0) L.unshift(v); else L[i] = v; wr(L); return v; }
  function newId() { return 'CP-' + (6100 + rd().length * 3 + Math.floor(Math.random() * 3)); }
  /* Personas del equipo: lunes a viernes, 9 AM a 6 PM (hora de Hazleton). */
  function team(es) { const E2 = (a, b) => es ? a : b, d = new Date(), w = d.getDay(), h = d.getHours() + d.getMinutes() / 60, open = w >= 1 && w <= 5 && h >= 9 && h < 18;
    const when = open ? E2('hoy antes de las 6 PM', 'today before 6 PM') : (w >= 1 && w <= 5 && h < 9) ? E2('hoy desde las 9 AM', 'today from 9 AM') : (w === 5 || w === 6 || w === 0) ? E2('el lunes desde las 9 AM', 'on Monday from 9 AM') : E2('mañana desde las 9 AM', 'tomorrow from 9 AM');
    return { open, when, hours: E2('lunes a viernes, de 9 AM a 6 PM', 'Monday to Friday, 9 AM to 6 PM') }; }
  function kb(es) { const W = window.TLWeb; if (!W) return ''; const T = x => Array.isArray(x) ? (es ? x[0] : x[1]) : x, val = v => typeof v === 'function' ? v() : v;
    return ['help', 'faq', 'safe', 'pay', 'plans', 'verif', 'priv', 'rules'].filter(k => W.P[k]).map(k => { const p = W.P[k];
      return '## ' + T(p.t) + '\n' + T(val(p.lead)) + '\n' + val(p.s).map(s => (s.h ? T(s.h) + ': ' : '') + (s.p ? T(s.p) : '') + (s.li || []).map(x => ' - ' + T(x)).join('')).join('\n'); }).join('\n\n'); }
  function sys(es, ctx) { const tm = team(es);
    return ['Eres El Compa, el asistente de IA de To\u2019Latino, el marketplace de la comunidad latina en Hazleton, PA. Eres una IA y lo dices si te preguntan; nunca te haces pasar por una persona.',
      'Responde en ' + (es ? 'español neutro, tuteando (tú: «quieres», «tienes»; nunca vos: «querés», «tenés»)' : 'English') + ', con frases cortas y sobrias (máximo 3). Sin emoji. Si el vecino escribe en otro idioma, responde en ese idioma.',
      'Reglas:',
      '- Usa solo la AYUDA y los DATOS DEL VECINO. Si no lo sabes, dilo y ofrece pasar el caso a una persona.',
      '- Una cita o reservación es una solicitud hasta que el negocio la confirma. Nunca digas «confirmada» si su estado no lo es.',
      '- No mueves dinero ni cambias la cuenta. Cobros dobles, devoluciones, disputas, cambios de cuenta, cuenta robada, acoso o seguridad: handoff true. Para todo lo demás handoff false: si no sabes algo, dilo y sugiere en chips «Con una persona».',
      '- Para horarios, dirección o qué ofrece un negocio usa NEGOCIOS dentro de DATOS DEL VECINO. Si un dato no está ahí, di que no lo tienes.',
      '- Emergencia médica o de seguridad: di que llamen al 911.',
      '- No das consejo legal, médico ni de inmigración: sugiere buscar en To\u2019Latino un negocio con licencia.',
      '- Nunca pidas número de tarjeta, contraseñas, códigos SMS, SSN ni estatus migratorio. Si te los dan, di que no los compartan.',
      '- Personas del equipo: ' + tm.hours + '. Si pasas el caso, te escriben ' + tm.when + '.',
      '- Acciones que preparas (el vecino las confirma en pantalla): "cancel" solo para una solicitud PENDIENTE; "open" para abrir la pantalla de esa operación. ref = id exacto de la operación.',
      'Devuelve SOLO un objeto JSON, sin texto alrededor: {"reply":"...","src":"de dónde sale, en mayúsculas: «SEGÚN LA PÁGINA DE <NEGOCIO>», «SEGÚN EL CENTRO DE AYUDA», «SEGÚN LA POLÍTICA DE <NEGOCIO>» o vacío (nunca «DATOS DEL VECINO»)","action":null o {"type":"cancel"|"open","ref":"id"},"handoff":true|false,"chips":["hasta 3 respuestas cortas que el vecino podría tocar"]}',
      'DATOS DEL VECINO:', JSON.stringify(ctx || {}), 'AYUDA:', kb(es)].join('\n'); }
  function parse(t) { const m = String(t || '').match(/\{[\s\S]*\}/); if (!m) return null; try { const o = JSON.parse(m[0]); if (!o || typeof o.reply !== 'string') return null;
    const a = o.action && typeof o.action === 'object' && /^(cancel|open)$/.test(o.action.type) ? { type: o.action.type, ref: String(o.action.ref || '') } : null;
    return { reply: o.reply.trim(), src: typeof o.src === 'string' ? o.src.trim().toUpperCase() : '', action: a, handoff: !!o.handoff, chips: Array.isArray(o.chips) ? o.chips.filter(x => typeof x === 'string').slice(0, 3) : [] }; } catch (e) { return null; } }
  /* Sin IA: reglas fijas, mismas salidas. */
  function fallback(text, ctx, es) { const E2 = (a, b) => es ? a : b, t = String(text || '').toLowerCase(), ops = (ctx && ctx.ops) || [];
    if (/911|emergenc|ambulanc|polic/.test(t)) return { reply: E2('Si es una emergencia, llama al 911 ahora.', 'If this is an emergency, call 911 now.'), src: '', action: null, handoff: false, chips: [] };
    if (/cobr|dos veces|devol|reembols|dinero|refund|charge|tarjeta|card|robad|acoso|hack/.test(t)) return { reply: E2('Eso lo revisa una persona del equipo: yo no muevo dinero ni cambio tu cuenta. Te paso con el resumen.', 'A person on the team reviews that: I don\u2019t move money or change your account. I\u2019ll pass it on with a summary.'), src: '', action: null, handoff: true, chips: [] };
    const p = ops.find(o => o.st === 'pend');
    if (/cancel/.test(t) && p) return { reply: E2('Te preparé la cancelación de tu solicitud en ' + p.biz + '. Como todavía no está confirmada, no pagas nada.', 'I prepared the cancellation of your request at ' + p.biz + '. It isn\u2019t confirmed yet, so you pay nothing.'), src: E2('SEGÚN EL CENTRO DE AYUDA', 'PER THE HELP CENTER'), action: { type: 'cancel', ref: p.id }, handoff: false, chips: [] };
    return { reply: E2('No estoy seguro de entenderte. ¿Es sobre una cita, un pedido o un pago? Si prefieres, te paso con una persona.', 'I\u2019m not sure I follow. Is it about a booking, an order or a payment? If you prefer, I\u2019ll pass you to a person.'), src: '', action: null, handoff: false, chips: [E2('Una cita', 'A booking'), E2('Un pedido', 'An order'), E2('Un pago', 'A payment')] }; }
  async function ask(o) { const es = o.es !== false, ctx = o.ctx || {}, msgs = (o.msgs || []).filter(m => m && m.t).slice(-12).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.t }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return fallback('', ctx, es);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!(window.claude && window.claude.complete)) return Object.assign(fallback(msgs[msgs.length - 1].content, ctx, es), { ai: false });
    try { const out = await window.claude.complete({ system: sys(es, ctx), messages: msgs, max_tokens: 500 }); const r = parse(out); if (r) return Object.assign(r, { ai: true }); } catch (e) {}
    return Object.assign(fallback(msgs[msgs.length - 1].content, ctx, es), { ai: false }); }
  window.TLCompa = { KEY, list, get, save, newId, team, kb, ask, fallback };
})();

/* C2 · El Compa en el negocio (22 oct). Dos piezas:
   1) asistente del panel (askOwner): explica el panel y lleva a la sección; dinero, cuenta o sanciones → Soporte.
   2) respuestas automáticas (solo Pro, apagables): contesta a los clientes en nombre del negocio con los datos de su página;
      nunca confirma, no da descuentos ni mueve dinero: eso se lo pasa al dueño. Ajustes en tl-dash2-v1 over[id].compa;
      el Super Admin puede apagarlo por negocio (tl-adm-v1 biz[id].compaOff). Registro en tl-compa-biz-v1. */
(function () {
  const C = window.TLCompa, BK = 'tl-compa-biz-v1', OK = 'tl-compa-own-v1';
  const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }, W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const DEF = { on: 0, when: 'closed', top: ['hor', 'menu', 'pedir', 'faq'], ch: { app: 1, wa: 1, sms: 0 }, note: '' };
  const SEED = { 'sabor-dominicano': { on: 1, note: 'Los sábados hay sancocho desde las 12. Catering con 3 días de aviso.' } };
  const TOP = { hor: ['Horario y dirección', 'Hours and address'], menu: ['Menú, servicios y precios', 'Menu, services and prices'], pedir: ['Cómo pedir o reservar', 'How to order or book'], faq: ['Tus preguntas frecuentes', 'Your FAQ'] };
  const WHEN = { closed: ['Fuera de tu horario', 'When you are closed'], wait: ['Si no contestas en 10 min', 'If you don\u2019t reply in 10 min'], always: ['Siempre, al instante', 'Always, right away'] };
  const CH = { app: ['Chat de To\u2019Latino', 'To\u2019Latino chat'], wa: ['WhatsApp', 'WhatsApp'], sms: ['SMS', 'SMS'] };
  const DN = [['lunes', 'Monday'], ['martes', 'Tuesday'], ['miércoles', 'Wednesday'], ['jueves', 'Thursday'], ['viernes', 'Friday'], ['sábado', 'Saturday'], ['domingo', 'Sunday']];
  const hh = h => { const H = Math.floor(h), m = Math.round((h - H) * 60), ap = H >= 12 && H < 24 ? 'PM' : 'AM', h12 = ((H + 11) % 12) + 1; return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap; };
  function biz(id) { const X = window.TLDash2; if (!X || !X.BIZ || !X.BIZ[id]) return null; const o = ((J('tl-dash2-v1', {}).over) || {})[id] || {}; return Object.assign({ id }, X.BIZ[id], o); }
  function pro(id) { const b = biz(id); if (!b) return false; const T = window.TLTrial, t = T && T.of ? T.of(id) : null; if (t && t.st) return t.st !== 'free'; return b.plan === 'pro'; }
  function admOff(id) { const A = window.TLAdm; if (A && A.bizSt) return A.bizSt(id).compaOff || 0; const a = J('tl-adm-v1', {}); return ((a.biz || {})[id] || {}).compaOff || 0; }
  function cfg(id) { const b = biz(id) || {}; return Object.assign({}, DEF, SEED[id] || {}, b.compa || {}); }
  function hours(b, es) { return (b.hours || []).map((d, i) => DN[i][es ? 0 : 1] + ': ' + (d && d.on ? hh(d.a) + '–' + hh(d.b) + (d.two ? ', ' + hh(d.a2) + '–' + hh(d.b2) : '') : (es ? 'cerrado' : 'closed'))).join('; '); }
  function open(id) { const b = biz(id); if (!b || !b.hours) return true; if (b.closedTmp) return false; const n = new Date(), d = b.hours[(n.getDay() + 6) % 7], h = n.getHours() + n.getMinutes() / 60; return !!(d && d.on && ((h >= d.a && h < d.b) || (d.two && h >= d.a2 && h < d.b2))); }
  /* null = El Compa no contesta en este negocio ahora; si no, cuánto espera (en el prototipo «10 min» = 6 s). */
  function auto(id, ch) { const c = cfg(id); if (!c.on || !pro(id) || admOff(id) || !on('auto', ch || 'app')) return null; if (ch && !c.ch[ch]) return null;
    if (c.when === 'always') return { delay: 1500, c }; if (c.when === 'wait') return { delay: 6000, c }; return open(id) ? null : { delay: 1500, c }; }
  function data(b, es, c) { const addr = window.TLContact && TLContact.addr ? TLContact.addr(b.id) : b.addr; const T = c.top;
    const nw = new Date(), o = { negocio: b.name, dueño: b.nick || b.owner, ahora: DN[(nw.getDay() + 6) % 7][es ? 0 : 1] + ' ' + hh(nw.getHours() + nw.getMinutes() / 60), abiertoAhora: open(b.id) };
    if (T.includes('hor')) Object.assign(o, { direccion: addr + (b.ref ? ' (' + b.ref + ')' : '') + ', Hazleton, PA', horario: hours(b, es), cerradoTemporal: !!b.closedTmp });
    if (T.includes('menu')) o.lista = (b.items || []).filter(i => !i.off).slice(0, 30).map(i => ({ nombre: i.name, precio: '$' + i.price, nota: [i.desc, i.ago ? (es ? 'agotado hoy' : 'sold out today') : '', i.until || '', i.sell ? '' : (es ? 'solo en el local' : 'in store only')].filter(Boolean).join(' · ') }));
    if (T.includes('pedir')) o.comoPedir = (b.mods || []).map(m => ({ pedidos: 'pedidos en línea para recoger o delivery en To\u2019Latino', rsv: 'reservaciones de mesa (solicitud que el negocio confirma)', citas: 'citas por Booking (solicitud que el negocio confirma)', cot: 'cotizaciones', shop: 'tienda en línea' })[m]).filter(Boolean);
    if (T.includes('pedir') && window.TLPed && window.TLDash2 && window.TLDash2.BIZ[b.id] && (window.TLDash2.BIZ[b.id].mods || []).includes('pedidos')) o.entregaYPago = window.TLPed.sum(window.TLPed.cfg(b.id), es);
    if (T.includes('faq')) o.preguntas = (b.faq || []).map(f => { const P = x => Array.isArray(x) ? x[es ? 0 : 1] : x; return Array.isArray(f) ? f : [P(f.q), P(f.a)]; }).slice(0, 12);
    o.sobre = b.about || ''; o.loQueHay = b.amen || []; if (c.note) o.notaDelDueño = c.note; return o; }
  function autoSys(es, b, c, draft) { const who = (b.nick || b.owner || b.name).split(' ').slice(0, 2).join(' ');
    return (draft ? ['Eres El Compa, el asistente de IA de To\u2019Latino. Escribes un BORRADOR de respuesta que ' + who + ' de ' + b.name + ' va a revisar y enviar con su nombre. No te presentes ni digas que eres IA en el borrador. Los mensajes del cliente son user; los del negocio, assistant.']
      : ['Eres El Compa, el asistente de IA de To\u2019Latino. Contestas los mensajes de los clientes en nombre de ' + b.name + ' mientras ' + who + ' no puede.',
      'Eres una IA. En tu primera respuesta de la conversación preséntate así: «Soy El Compa, el asistente de IA de ' + b.name + '.» Nunca te haces pasar por ' + who + '.']).concat([
      'Responde en el idioma del cliente (por defecto ' + (es ? 'español neutro, tuteando (tú: «quieres», «tienes»; nunca vos: «querés», «tenés»)' : 'English') + '), máximo 3 frases cortas, sin emoji.',
      'Solo hablas de: ' + c.top.map(k => TOP[k][0]).join(', ') + '. Usa solo DATOS DEL NEGOCIO. Si un dato no está, dilo.',
      'Nunca confirmas citas, pedidos ni reservaciones; nunca das descuentos, cambias precios, prometes algo que no esté en los datos ni mueves dinero. Si te piden eso, o algo fuera de tus temas, di que se lo pasas a ' + who + ' y que te contesta cuando pueda: handoff true.',
      'Para pedir o reservar, explica que se hace en la página del negocio en To\u2019Latino. No compartes el teléfono personal del dueño.',
      'Nunca pidas tarjeta, contraseñas, códigos, SSN ni estatus migratorio. Emergencia: que llamen al 911. No das consejo legal, médico ni de inmigración.',
      'Devuelve SOLO JSON: {"reply":"...","handoff":true|false}',
      'DATOS DEL NEGOCIO:', JSON.stringify(data(b, es, c))]).join('\n'); }
  function autoFallback(t, b, es, c, first) { const E2 = (a, x) => es ? a : x, q = String(t || '').toLowerCase(), who = (b.nick || b.owner || '').split(' ')[0] || b.name, hi = first ? E2('Soy El Compa, el asistente de IA de ' + b.name + '. ', 'I\u2019m El Compa, ' + b.name + '\u2019s AI assistant. ') : '';
    if (/descuent|rebaj|gratis|confirm|devol|reembols|cobr|discount|refund|confirm/.test(q)) return { reply: hi + E2('Eso lo decide ' + who + ': le pasé tu mensaje y te contesta cuando pueda.', who + ' decides that: I passed your message on and they\u2019ll reply when they can.'), handoff: true };
    if (c.top.includes('hor') && /hora|abre|cierr|abiert|open|close|hour|direcc|dónde|donde|where|address|llegar/.test(q)) return { reply: hi + E2('Estamos en ' + (b.addr || '') + '. Horario: ' + hours(b, true) + '.', 'We\u2019re at ' + (b.addr || '') + '. Hours: ' + hours(b, false) + '.'), handoff: false };
    if (c.top.includes('menu') && /precio|cuánto|cuanto|menú|menu|tienen|price|how much|have/.test(q)) { const L = (b.items || []).filter(i => !i.ago).slice(0, 3).map(i => i.name + ' $' + i.price).join(', '); return { reply: hi + E2('Algunos de lo que tenemos: ' + L + '. Todo está en nuestra página de To\u2019Latino.', 'Some of what we have: ' + L + '. Everything is on our To\u2019Latino page.'), handoff: false }; }
    return { reply: hi + E2('No tengo ese dato. Le paso tu mensaje a ' + who + ' y te contesta cuando pueda.', 'I don\u2019t have that. I\u2019ll pass your message to ' + who + ' and they\u2019ll reply when they can.'), handoff: true }; }
  /* o: { biz, msgs: [{me, t}], es, test } — test = la prueba del panel (no guarda en el registro). */
  async function autoReply(o) { const es = o.es !== false, b = biz(o.biz); if (!b) return null; const c = o.cfg || cfg(o.biz), M = (o.msgs || []).filter(m => m && m.t).slice(-10).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.t }));
    while (M.length && M[0].role !== 'user') M.shift(); if (!M.length) return null; const last = M[M.length - 1].content, first = !M.some(m => m.role === 'assistant');
    if (window.claude && window.claude.complete) { try { const out = await window.claude.complete({ system: autoSys(es, b, c, o.draft), messages: M, max_tokens: 300 }); const m = String(out || '').match(/\{[\s\S]*\}/); const r = m ? JSON.parse(m[0]) : null; if (r && typeof r.reply === 'string') return { reply: r.reply.trim(), handoff: !!r.handoff, ai: true }; } catch (e) {} }
    return Object.assign(autoFallback(last, b, es, c, first && !o.draft), { ai: false }); }
  /* Registro de lo que contestó El Compa por negocio. */
  const LOG0 = { 'sabor-dominicano': [
    { id: 'cb3', who: 'Ana R.', q: ['¿Me hacen un descuento para 20 personas el sábado?', 'Can you give me a discount for 20 people on Saturday?'], a: ['Soy El Compa, el asistente de IA de Sabor Dominicano. Los precios para grupos los decide Doña Mayra: le pasé tu mensaje y te contesta cuando abra.', 'I\u2019m El Compa, Sabor Dominicano\u2019s AI assistant. Group prices are up to Doña Mayra: I passed your message on and she\u2019ll reply when she opens.'], when: ['HOY · 7:15 AM', 'TODAY · 7:15 AM'], ch: 'wa', hand: 1 },
    { id: 'cb2', who: 'Luis P.', q: ['¿Tienen sancocho hoy?', 'Do you have sancocho today?'], a: ['Soy El Compa, el asistente de IA de Sabor Dominicano. El sancocho es solo los sábados, desde las 12. Hoy hay mofongo, pernil y pollo guisado.', 'I\u2019m El Compa, Sabor Dominicano\u2019s AI assistant. Sancocho is Saturdays only, from 12. Today there\u2019s mofongo, pernil and stewed chicken.'], when: ['AYER · 9:52 PM', 'YESTERDAY · 9:52 PM'], ch: 'sms', hand: 0 },
    { id: 'cb1', who: 'Joel M.', q: ['¿A qué hora abren mañana?', 'What time do you open tomorrow?'], a: ['Soy El Compa, el asistente de IA de Sabor Dominicano. Mañana abrimos a las 11 AM y cerramos a las 9 PM, en 412 N Wyoming St.', 'I\u2019m El Compa, Sabor Dominicano\u2019s AI assistant. Tomorrow we open at 11 AM and close at 9 PM, at 412 N Wyoming St.'], when: ['LUN · 10:40 PM', 'MON · 10:40 PM'], ch: 'app', hand: 0 } ] };
  function log(id) { const L = (J(BK, {})[id] || []); return L.concat((LOG0[id] || []).filter(x => !L.some(y => y.id === x.id))); }
  function addLog(id, e) { const S = J(BK, {}); S[id] = [Object.assign({ id: 'cb' + Date.now().toString(36), at: Date.now(), ch: 'app' }, e)].concat(S[id] || []).slice(0, 60); W(BK, S); try { window.dispatchEvent(new Event('tl-compa')); } catch (x) {} }
  /* Asistente del panel. o: { es, msgs, ctx, guide } */
  function ownSys(es, ctx, guide) { const tm = C.team(es);
    return ['Eres El Compa, el asistente de IA de To\u2019Latino. Ayudas al dueño o al equipo de un negocio a usar su panel. Eres una IA y lo dices si te preguntan.',
      'Responde en ' + (es ? 'español neutro, tuteando (tú: «quieres», «tienes»; nunca vos: «querés», «tenés»)' : 'English') + ' (o en el idioma en que te escriban), máximo 3 frases cortas, sin emoji.',
      'Usa solo la GUÍA DEL PANEL, la AYUDA y los DATOS DEL NEGOCIO. Si no lo sabes, dilo.',
      'Tú no cambias nada: explicas dónde se hace y llevas a esa sección con action {"type":"go","code":"<code exacto de la GUÍA>","sub":"<sub si la guía lo trae>"}.',
      'Dinero (pagos semanales, cobros de la tarjeta, Stripe, disputas, devoluciones), problemas con la cuenta, reclamar o transferir el negocio, sanciones o reseñas que crees falsas: handoff true. Personas del equipo: ' + tm.hours + '; contestan ' + tm.when + '.',
      'Nunca pidas contraseñas, códigos, números de tarjeta ni de cuenta del banco.',
      'Devuelve SOLO JSON: {"reply":"...","src":"«SEGÚN EL CENTRO DE AYUDA», «SEGÚN TU PANEL» o vacío","action":null o {"type":"go","code":"...","sub":"..."},"handoff":true|false,"chips":["hasta 3 preguntas cortas que podría hacer después"]}',
      'DATOS DEL NEGOCIO:', JSON.stringify(ctx || {}), 'GUÍA DEL PANEL:', JSON.stringify(guide || []), 'AYUDA:', C.kb(es)].join('\n'); }
  function ownFallback(t, es, guide) { const E2 = (a, b) => es ? a : b, q = String(t || '').toLowerCase(), G = guide || [], g = (code, sub) => G.find(x => x.code === code && (!sub || x.sub === sub));
    if (/pago|cobr|stripe|dinero|deposit|disput|payout|money|bank|banco|cuenta robad|hack|sanci|transfer/.test(q)) return { reply: E2('Eso lo revisa una persona del equipo: yo no muevo dinero ni cambio tu cuenta. Te paso con el resumen.', 'A person on the team reviews that: I don\u2019t move money or change your account. I\u2019ll pass it on with a summary.'), src: '', action: null, handoff: true, chips: [] };
    const M = [[/horario|hora|feriad|vacacion|hours|holiday/, 'DASH-PAGINA', 'hor'], [/foto|portada|photo|cover/, 'DASH-PAGINA', 'fotos'], [/reseñ|review/, 'DASH-PAGINA', 'resenas'], [/pausa|pausar|agotad|vender|menú|menu|pause|sold out/, 'DASH-MODULOS'], [/mensaje|chat|message|compa contest|automát|auto/, 'DASH-MENSAJES'], [/plan|pro|prueba|trial|día 30/, 'DASH-COBROS'], [/moderador|equipo|team|staff/, 'DASH-EQUIPO']];
    const h = M.find(m => m[0].test(q)), x = h && g(h[1], h[2]);
    if (x) return { reply: E2('Eso está en ' + x.t + ': ' + x.s, 'That\u2019s in ' + x.t + ': ' + x.s), src: E2('SEGÚN TU PANEL', 'PER YOUR PANEL'), action: { type: 'go', code: x.code, sub: x.sub || null }, handoff: false, chips: [] };
    return { reply: E2('No estoy seguro de entenderte. ¿Es sobre tu página, tus pedidos y citas, tus mensajes o tu plan?', 'I\u2019m not sure I follow. Is it about your page, orders and bookings, messages or your plan?'), src: '', action: null, handoff: false, chips: [E2('Mi horario', 'My hours'), E2('Pausar pedidos', 'Pause orders'), E2('¿Cuándo me pagan?', 'When do I get paid?')] }; }
  async function askOwner(o) { const es = o.es !== false, M = (o.msgs || []).filter(m => m && m.t).slice(-12).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.t }));
    while (M.length && M[0].role !== 'user') M.shift(); if (!M.length) return null; const last = M[M.length - 1].content;
    if (window.claude && window.claude.complete) { try { const out = await window.claude.complete({ system: ownSys(es, o.ctx, o.guide), messages: M, max_tokens: 450 }); const m = String(out || '').match(/\{[\s\S]*\}/); const r = m ? JSON.parse(m[0]) : null;
      if (r && typeof r.reply === 'string') { const a = r.action && r.action.type === 'go' && (o.guide || []).some(g => g.code === r.action.code) ? { type: 'go', code: r.action.code, sub: r.action.sub || null } : null;
        return { reply: r.reply.trim(), src: typeof r.src === 'string' ? r.src.toUpperCase() : '', action: a, handoff: !!r.handoff, chips: Array.isArray(r.chips) ? r.chips.filter(x => typeof x === 'string').slice(0, 3) : [], ai: true }; } } catch (e) {} }
    return Object.assign(ownFallback(last, es, o.guide), { ai: false }); }
  const ownGet = id => (J(OK, {})[id] || []), ownSet = (id, L) => { const S = J(OK, {}); S[id] = L.slice(-30); W(OK, S); };
  /* C3 · interruptores del Super Admin (tl-adm-v1 .compa): por nivel vec · own · auto · cop y por canal app · wa · sms. Encendido por defecto. */
  const LV = { vec: ['Vecinos: Soporte y la ayuda de cada pedido, cita o boleto', 'Neighbors: Support and help on each order, booking or ticket'], own: ['Panel del negocio: preguntas sobre el panel', 'Business panel: questions about the panel'], auto: ['Respuestas automáticas de los negocios (Pro)', 'Business auto-replies (Pro)'], cop: ['Copiloto del equipo en Soporte', 'Team copilot in Support'] };
  function glob() { return (J('tl-adm-v1', {}).compa) || {}; }
  function on(lv, ch) { const g = glob(); if (lv && (g.lv || {})[lv] === 0) return false; if (ch && (g.ch || {})[ch] === 0) return false; return true; }
  /* Copiloto: borrador para una persona del equipo. o: { es, ticket: { cat, text, ref, user, biz, thread: [{me, t}] } } — me = el equipo. */
  function copSys(es) { return ['Eres El Compa, el copiloto de IA del equipo de Soporte de To\u2019Latino (Hazleton, PA). Ayudas a una persona del equipo a contestar un caso; ella revisa, corrige y envía con su nombre.',
    'Escribe el borrador en el idioma del vecino (por defecto ' + (es ? 'español neutro, tuteando; nunca vos' : 'English') + '), cálido y concreto, máximo 4 frases, sin emoji, sin firma.',
    'No prometas devoluciones, montos, plazos ni sanciones que no estén en el caso: si hay que revisarlo, di qué se va a revisar. Nunca pidas tarjeta, contraseñas, códigos, SSN ni estatus migratorio.',
    'Devuelve SOLO JSON: {"summary":"una frase: qué pasa","reply":"borrador","next":"siguiente paso para el equipo, corto"}'].join('\n'); }
  async function copilot(o) { const es = o.es !== false, T = o.ticket || {}, M = [{ role: 'user', content: 'CASO:\n' + JSON.stringify({ tema: T.cat, referencia: T.ref || '', vecino: T.user || '', negocio: T.biz || '', conversacion: (T.thread || []).map(m => (m.me ? 'EQUIPO: ' : 'VECINO: ') + m.t) }) }];
    if (window.claude && window.claude.complete) { try { const out = await window.claude.complete({ system: copSys(es), messages: M, max_tokens: 400 }); const m = String(out || '').match(/\{[\s\S]*\}/); const r = m ? JSON.parse(m[0]) : null; if (r && typeof r.reply === 'string') return { summary: String(r.summary || ''), reply: r.reply.trim(), next: String(r.next || ''), ai: true }; } catch (e) {} }
    const E2 = (a, b) => es ? a : b, n = String(T.user || '').split(' ')[0], money = /cobr|pago|devol|reembols|charge|refund|pay/i.test((T.text || '') + ' ' + T.cat);
    return { summary: E2('El vecino escribe sobre ', 'The neighbor writes about ') + (T.cat || E2('su cuenta', 'their account')) + '.', reply: E2('Hola' + (n ? ' ' + n : '') + '. Gracias por escribirnos. ', 'Hi' + (n ? ' ' + n : '') + '. Thanks for writing to us. ') + (money ? E2('Ya estoy revisando el cobro con el negocio y te escribo hoy con lo que encontremos.', 'I\u2019m reviewing the charge with the business and will write to you today with what we find.') : E2('Ya estoy revisando tu caso y te escribo hoy con la respuesta.', 'I\u2019m reviewing your case and will write to you today with the answer.')), next: money ? E2('Revisar la operación en Transacciones.', 'Check the operation in Transactions.') : '', ai: false }; }
  Object.assign(C, { DEF, TOP, WHEN, CH, LV, biz, pro, cfg, admOff, open, auto, autoReply, log, addLog, askOwner, ownGet, ownSet, hours, glob, on, copilot });
})();
