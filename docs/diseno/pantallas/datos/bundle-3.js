
/* ==== prototype/neg-merc-flow.js ==== */
/* Mercados (NEG-MERC) — Etapa 3: pedido (pickup / envío), peso real y estado. Hoy = jue 24 sep 2026, 12:30 PM.
   Tesis: ¿lo pesan delante de mí? Línea fija: "Lo que va por peso se pesa delante de ti y pagas el peso real." (pedido, revisión, estado).
   Mismas vistas ab / ac; estado s.mb (pedido en curso), s.mped (pedidos). Carrito = s.mcart (ficha).
   APP-NEG-MERC-PEDIDO: 1 Tu pedido (resumen del carrito · pickup o envío · si algo no hay: llámame / uno parecido / no sustituir · nota) →
     2 Cuándo (hoy / mañana, franjas) → 3 Revisa y envía (líneas con estimado; se retiene estimado + 10 % en lo que va por peso; nada se cobra aún).
   APP-NEG-MERC-ESTADO: pend → ok (preparando) → pesado (vista est "Así lo pesaron": peso real por línea + foto de la balanza; lo que no había
     con la sustitución propuesta: Sí / No) → "Está bien, cobrar $X" → listo (pickup) | en camino (envío) → done (cobrado vs liberado).
   RESPUESTA: ok · rechaza → no (retención liberada) · nada → exp (10 min, liberada) · cambio → falta un artículo y proponen otro · tarjeta → rechazada. */
(function boot() {
  const ML = window.TLMercL, ME = window.TLMerc, X = window.TLListing, ALL = window.TLAll, PAY = window.TLPay;
  if (!ML || !ME || !X || !ALL) return setTimeout(boot, 40);
  const fmt = X.fmt, biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const LINE = ME.line, NOW = 12.5, SCALE = 4047146;
  const SUB = [['call', 'Llámame', 'Call me'], ['similar', 'Uno parecido, con mi OK', 'A similar one, with my OK'], ['no', 'No sustituir', 'Do not swap']];
  const dayN = (i, es) => i === 0 ? (es ? 'Hoy' : 'Today') : (es ? 'Mañana' : 'Tomorrow');

  function start(C, bid) { const s = C.state, b = biz(bid), cart = ML.cartOf(s, bid); if (!b || !cart || !cart.lines.length) return;
    C.setState({ mb: { biz: bid, step: 0, how: b.tags.includes('pickup') ? 'pickup' : 'envio', sub: 'call', note: '', i: 0, h: null, sms: true, pm: null } });
    C.nav({ code: 'APP-NEG-MERC-PEDIDO', biz: bid, from: 'APP-NEG-LISTING · Tu pedido' }); C.scrollTop(); }
  const slotsOf = (b, how, i) => { const tt = [b.hrs, b.hrs][i] || b.hrs, out = []; for (let h = Math.max(tt[0] + 1, i === 0 ? Math.ceil((NOW + (how === 'envio' ? 1.5 : .75)) * 2) / 2 : tt[0] + 1); h + (how === 'envio' ? 1 : .5) <= tt[1]; h += how === 'envio' ? 1 : .5) out.push({ h, l: how === 'envio' ? fmt(h) + '–' + fmt(h + 1) : fmt(h), taken: hash(b.id + how + i + h) < .2 }); return out; };
  const linesOf = (b, cart, es) => cart.lines.map(l => { const it = ML.itOf(b.id, l.key); if (!it) return null; const oL = it.cut || it.punto; return { it, q: l.q, key: l.key, o: l.o, name: es ? it.n : it.ne, opt: oL && l.o && l.o.o != null ? oL[l.o.o][es ? 0 : 1] : '', est: ML.lineEst(it, l.q) }; }).filter(Boolean);

  const AB0 = { lbl: {}, veh: {}, lights: [], phs: [], dirt: [], kinds: [], days: [], slots: [], addrs: [], rows2: [], price: [], cobro: [], pol2: [], bar: {}, dBar: {}, miss: [], cobroBar: {}, dep2: {}, sumH: {} };
  function bookVals(C, s, es) { const q = s.mb; if (!q) return AB0;
    const E2 = (a, b) => es ? a : b, ob = biz(q.biz), cart = ML.cartOf(s, q.biz); if (!ob || !cart) return AB0;
    const up = o => C.setState(z => ({ mb: { ...z.mb, ...o } })), dk = s.view === 'desktop', op = ML.optOf(ob.id), L = linesOf(ob, cart, es), CT = ML.cartTot(ob, cart);
    const env = q.how === 'envio' ? (op.envio || 0) : 0, hold = CT.hold + env, belowMin = q.how === 'envio' && op.min && CT.est < op.min;
    const days = [0, 1].map(i => ({ id: 'd' + i, dow: dayN(i, es).toUpperCase(), num: String(24 + i), off: !slotsOf(ob, q.how, i).some(z => !z.taken) }));
    const SLt = slotsOf(ob, q.how, q.i), sel = SLt.find(z => z.h === q.h && !z.taken), whenL = sel ? dayN(q.i, es) + ' · ' + sel.l : '—';
    const miss = [belowMin ? E2('El envío pide un mínimo de ', 'Delivery needs a minimum of ') + money(op.min) : null, !sel ? E2('Elige cuándo', 'Pick when') : null].filter(Boolean), ok0 = !belowMin, ok1 = !!sel, can = ok0 && ok1;
    const pmId = q.pm || (PAY ? PAY.cards(s)[0].id : ''), pmL = PAY ? PAY.label(s, pmId) : 'Visa ·· 4242', pmB = PAY ? PAY.badge(s, pmId) : 'VISA';
    const onPm = () => PAY && PAY.open(C, { ctx: 'mb', amt: hold, wallet: true, sel: pmId, declined: q.declined ? pmId : null });
    const kinds = [ob.tags.includes('pickup') ? ['pickup', E2('Pickup en el mercado', 'Pickup at the market'), E2('Gratis', 'Free')] : null, ob.tags.includes('envio') && op.envio != null ? ['envio', E2('Envío a tu casa', 'Home delivery'), op.envio ? money(op.envio) : E2('Gratis', 'Free')] : null].filter(Boolean);
    const cobro = [[E2('Hoy, al enviar · se retiene', 'Today, on sending · held'), money(hold), E2('No se cobra todavía. Incluye un 10 % extra en lo que va por peso.', 'Not charged yet. Includes 10% extra on by-weight items.')], [E2('Al pesar', 'When weighed'), E2('Peso real', 'Real weight'), E2('Te mandan la foto de la balanza y se cobra lo que pesó.', 'They send the scale photo and charge what it weighed.')], [E2('Al terminar', 'When done'), E2('Se libera', 'Released'), E2('Lo que sobre de la retención, en 3–5 días.', 'Whatever is left of the hold, in 3–5 days.')]].map(([k, v, sub], i) => ({ k, v, s: sub, dot: i === 0 ? '#0B0E12' : 'rgba(11,14,18,.25)' }));
    const price = L.map(l => ({ l: l.name + (l.opt ? ' · ' + l.opt : '') + ' · ' + (l.it.k === 'lb' ? l.q + E2(' lb aprox.', ' lb approx.') : '× ' + l.q), v: money(l.est), fg: '#0B0E12' })).concat(env ? [{ l: E2('Envío', 'Delivery'), v: money(env), fg: 'rgba(11,14,18,.6)' }] : []).concat(CT.byLb ? [{ l: E2('Extra retenido por peso (10 %)', 'Extra held for weight (10%)'), v: money(CT.byLb * .1), fg: 'rgba(11,14,18,.6)' }] : []);
    const rows = [[E2('ARTÍCULOS', 'ITEMS'), String(L.length)], [E2('CÓMO', 'HOW'), q.how === 'envio' ? E2('Envío a tu casa', 'Home delivery') : E2('Pickup', 'Pickup')], [E2('CUÁNDO', 'WHEN'), whenL], [E2('SI ALGO NO HAY', 'IF SOMETHING IS OUT'), (SUB.find(z => z[0] === q.sub) || SUB[0])[es ? 1 : 2]], [E2('DÓNDE', 'WHERE'), q.how === 'envio' ? (s.user ? '112 W Oak St' : E2('Tu dirección', 'Your address')) : (X.ADDR[ob.id] || ob.addr || '').replace(', Hazleton PA', '')]].map(([k, v], i) => ({ k, v, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const pol2 = [LINE[es ? 0 : 1], E2('Si algo no hay, te preguntan antes; si no contestas en 10 minutos, se quita y no se cobra.', 'If something is out, they ask first; if you do not answer in 10 minutes, it is removed and not charged.'), E2('Si el mercado no acepta el pedido en 10 minutos, se libera la retención.', 'If the market does not accept within 10 minutes, the hold is released.')].concat(ob.tags.includes('ebt') && q.how === 'pickup' ? [E2('¿Pagas con EBT? Elige pagar en el mercado al recoger.', 'Paying with EBT? Choose to pay at the market at pickup.')] : []).map(t => ({ t }));
    const send = () => { if (!can) return; if (!s.user) { C.setState({ auth: { step: 'phone', next: { ...s.route }, top: C.vTop(), ctx: 'bk' } }); return; } if ((s.scen || 'ok') === 'tarjeta' && !q.declined) { up({ declined: true }); return; } sendNow(C, es); };
    const next = () => { if (q.step === 0 && ok0) { up({ step: 1 }); C.scrollTop(); } else if (q.step === 1 && ok1) { up({ step: 2 }); C.scrollTop(); } else if (q.step === 2) send(); };
    const back = () => C.nav({ code: 'APP-NEG-LISTING-PRO', biz: ob.id, from: 'APP-NEG-MERC-PEDIDO' });
    return { has: true, cobro, cobroBar: { has: false }, dep2: { has: false }, pol2, sumH: { ph: PX(ob.ph[0], 200), k: E2('RESUMEN', 'SUMMARY'), t: E2('Tu pedido', 'Your order'), s: ob.name.toUpperCase() }, rows2: rows,
      title: E2('Tu pedido', 'Your order'), sub: ob.name.toUpperCase(), stepT: [E2('Tu pedido', 'Your order'), E2('Cuándo', 'When'), E2('Revisa y envía', 'Review and send')][q.step], step: q.step + 1, total: 3, isS0: q.step === 0, isS1: q.step === 1, isS2: q.step === 2,
      onBack: () => { if (q.step > 0 && !dk) { up({ step: q.step - 1 }); C.scrollTop(); } else back(); },
      veh: { ic: 'bag', k: E2('TU PEDIDO', 'YOUR ORDER'), t: L.length + (L.length === 1 ? E2(' artículo', ' item') : E2(' artículos', ' items')) + ' · ' + E2('estimado ', 'estimate ') + money(CT.est), s: L.map(l => l.name).slice(0, 3).join(' · ').toUpperCase(), hasOk: CT.byLb > 0, okT: E2('Lo que va por peso se cobra al pesar', 'By-weight items are charged when weighed'), okFg: '#00695B', okIc: 'scale', cta: E2('Editar', 'Edit'), onClick: e => { stop(e); back(); } }, hasMi: false, mi: '', onMi: () => {},
      isEst: true, isLav: false, lights: SUB.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.sub === k ? 'selected' : 'filter', onClick: () => up({ sub: k }) })),
      note: q.note, onNote: e => up({ note: e.target.value.slice(0, 300) }), noteN: q.note.length + ' / 300', symWarn: false, phs: [], canPh: false, onPh: () => {}, dirt: [], hasDirt: false, dirtNote: '',
      isPreAsk: false, preAsk: false, onPreAsk: () => {}, preBg: '', preX: '', hasPreHint: false, preHint: '', hasPre: belowMin, preNote: belowMin ? E2('El envío pide un mínimo de ' + money(op.min) + '. Agrega más o elige pickup.', 'Delivery needs a ' + money(op.min) + ' minimum. Add more or choose pickup.') : '',
      hasKinds: kinds.length > 0, kinds: kinds.map(([k, l, p]) => { const on = q.how === k; return { l, p, bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', onClick: () => up({ how: k, h: null }) }; }),
      days, dSel: 'd' + q.i, onDay: id => up({ i: +id.slice(1), h: null }), slots: SLt.map(z => ({ t: z.l, taken: z.taken })), hSel: sel ? sel.l : '', onH: tl => { const z = SLt.find(y => y.l === tl); if (z) up({ h: z.h }); },
      hasSlots: SLt.length > 0, noSlots: E2('Ya no hay horas hoy. Elige mañana.', 'No times left today. Pick tomorrow.'), slotK: q.how === 'envio' ? E2('FRANJA DE ENVÍO', 'DELIVERY WINDOW') : E2('HORA DE PICKUP', 'PICKUP TIME'),
      hasBack: false, backL: '', backK: '', isAddr: false, addrK: '', addrs: [], addrNote: '',
      price, totalK: E2('HOY SE RETIENE', 'HELD TODAY'), totalV: money(hold), hasEstNote: CT.byLb > 0, estNote: CT.byLb > 0 ? E2('Es un estimado. Pagas lo que pese, con la foto de la balanza.', 'This is an estimate. You pay what it weighs, with the scale photo.') : '',
      pmL, pmB, onPm, declined: !!q.declined, decT: E2('Tu tarjeta fue rechazada. No se retuvo nada; cambia la tarjeta.', 'Your card was declined. Nothing was held; change the card.'),
      hasKeep: false, keepBg: '', keepX: '', onKeep: () => {},
      sms: q.sms, onSms: () => up({ sms: !q.sms }), smsBg: q.sms ? '#0B0E12' : 'rgba(11,14,18,.15)', smsX: q.sms ? '18px' : '2px',
      line: LINE[es ? 0 : 1], miss: miss.map(t => ({ t })), hasMiss: miss.length > 0,
      bar: { k: E2('SE RETIENE', 'HELD'), v: money(hold), s: E2('SE COBRA EL PESO REAL', 'YOU PAY THE REAL WEIGHT'), cta: q.step < 2 ? E2('Continuar', 'Continue') : E2('Enviar pedido', 'Send order'), dis: q.step === 0 ? !ok0 : q.step === 1 ? !ok1 : !can, on: next },
      dBar: { cta: E2('Enviar pedido', 'Send order'), dis: !can, on: send },
      lbl: { secCar: E2('Tu pedido', 'Your order'), secPre: E2('Antes de enviar', 'Before you send'), goodK: E2('BUENO SABER', 'GOOD TO KNOW'), prefK: E2('PREFERENCIAS', 'PREFERENCES'), howK: E2('CÓMO SE COBRA', 'HOW YOU PAY'), payK: E2('SE RETIENE', 'HELD'), back: E2('Volver', 'Back'), vehK: E2('Tu pedido', 'Your order'), miK: '', miPh: '',
        symT: E2('Si algo no hay', 'If something is out'), symS: E2('Sin tu OK no se cambia nada.', 'Nothing is swapped without your OK.'), lightsK: E2('SUSTITUCIONES', 'SWAPS'), notePh: E2('Ej.: el pernil con cuero, plátanos bien verdes…', 'E.g. pork with skin, very green plantains…'), phK: '', phAdd: '', symWarn: '',
        kindT: E2('¿Cómo lo recibes?', 'How do you get it?'), dayT: E2('Cuándo', 'When'), priceK: E2('ESTIMADO', 'ESTIMATE'), pmK: E2('TARJETA', 'CARD'), change: E2('Cambiar', 'Change'),
        keepT: '', keepS: '', smsT: E2('Avisos por SMS', 'Text updates'), smsS: E2('Cuando lo pesan y cuando está listo.', 'When it is weighed and when it is ready.'), preT: '', preS: '', dirtT: '' } };
  }
  function sendNow(C, es) { const s = C.state, q = s.mb, ob = biz(q.biz), cart = ML.cartOf(s, q.biz), CT = ML.cartTot(ob, cart), op = ML.optOf(ob.id), id = 'M-' + (6100 + Math.floor(Math.random() * 800));
    const x = { id, biz: q.biz, own: q.biz, lines: cart.lines.map(l => ({ ...l })), how: q.how, sub: q.sub, note: q.note, i: q.i, h: q.h, env: q.how === 'envio' ? (op.envio || 0) : 0, est: CT.est, hold: CT.hold + (q.how === 'envio' ? (op.envio || 0) : 0), st: 'pend', sentAt: '12:31 PM', pm: q.pm || (PAY ? PAY.cards(s)[0].id : '') };
    C.setState(z => ({ mped: (z.mped || []).concat(x), mb: null, mcart: null })); C.nav({ code: 'APP-NEG-MERC-ESTADO', biz: q.biz, cid: id, from: 'APP-NEG-MERC-PEDIDO' }); C.scrollTop(); respond(C, id); }
  function upC(C, id, o) { C.setState(z => ({ mped: (z.mped || []).map(y => y.id === id ? { ...y, ...(typeof o === 'function' ? o(y) : o) } : y) })); }
  /* Peso real: entre −6 % y +9 % del estimado; con "cambio", el último artículo no había y proponen otro. */
  function weigh(x, sc) { const ob = biz(x.own); return x.lines.map((l, k) => { const it = ML.itOf(ob.id, l.key), f = it.k === 'lb' ? 0.94 + hash(x.id + k) * 0.15 : 1, out = sc === 'cambio' && k === x.lines.length - 1;
    return { ...l, real: it.k === 'lb' ? Math.round(l.q * f * 100) / 100 : l.q, out, alt: out ? { n: 'Otra marca parecida', ne: 'A similar brand', p: Math.round(it.p * 1.1 * 100) / 100 } : null, altOk: null }; }); }
  const sumOf = (x, ob) => { let t = 0; (x.w || []).forEach(l => { const it = ML.itOf(ob.id, l.key); if (l.out) { if (l.altOk) t += l.alt.p * l.q; return; } t += it.p * l.real; }); return t + (x.env || 0); };
  const reply = (x, sc) => sc === 'rechaza' ? { st: 'no' } : { st: 'ok', okAt: '12:35 PM', sc };
  function respond(C, id) { clearTimeout(C._mpT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._mpT = setTimeout(() => upC(C, id, x => x.st === 'pend' ? reply(x, sc) : {}), 3000); }

  const AC0 = { lbl: {}, hdr: {}, steps: [], est: { groups: [], rows: [] }, xtra: {}, money: { rows: [] }, rows: [], acts: [], alt: {}, others: [], cx: {}, ready: { rows: [] }, done: { stars: [], rows: [] } };
  function citaVals(C, s, es) { const x = (s.mped || []).find(y => y.id === s.route.cid); if (!x) return AC0;
    const E2 = (a, b) => es ? a : b, ob = biz(x.own), up = o => upC(C, x.id, o), st = x.st, env = x.how === 'envio', when = dayN(x.i, es) + ' · ' + fmt(x.h), tot = sumOf(x, ob), back = Math.max(0, x.hold - tot);
    const H = { pend: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PEDIDO ENVIADO', 'ORDER SENT'), E2('Esperando a ', 'Waiting for ') + ob.name, E2('Se retuvieron ', 'Held ') + money(x.hold) + E2('. Si no aceptan en 10 min, se libera.', '. If not accepted in 10 min, it is released.')],
      ok: ['bag', 'rgba(0,229,196,.18)', '#00695B', E2('PREPARANDO', 'PREPARING'), E2('Están armando tu pedido', 'They are putting your order together'), E2('Te mandan la foto de la balanza de lo que va por peso.', 'They send the scale photo for by-weight items.')],
      pesado: ['scale', 'rgba(255,176,32,.2)', '#8A5A00', E2('ASÍ LO PESARON', 'HERE IS THE WEIGHT'), E2('Total real: ', 'Real total: ') + money(tot), E2('Revísalo. Se cobra cuando digas que está bien.', 'Check it. It is charged when you say it is fine.')],
      listo: ['check', 'rgba(0,229,196,.18)', '#00695B', env ? E2('EN CAMINO', 'ON THE WAY') : E2('LISTO PARA RECOGER', 'READY FOR PICKUP'), env ? E2('Llega entre ', 'Arrives between ') + fmt(x.h) + '–' + fmt(x.h + 1) : E2('En el mostrador de ', 'At the counter of ') + ob.name, E2('Cobrado ', 'Charged ') + money(tot) + E2(' · se liberan ', ' · releasing ') + money(back)],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', env ? E2('ENTREGADO', 'DELIVERED') : E2('RECOGIDO', 'PICKED UP'), E2('Gracias por usar To\'Latino', 'Thanks for using To\'Latino'), E2('Pagaste ', 'You paid ') + money(tot) + E2(' · liberados ', ' · released ') + money(back)],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO ACEPTARON', 'NOT ACCEPTED'), E2('El mercado no puede hoy', 'The market cannot today'), E2('Liberamos los ', 'We released the ') + money(x.hold) + E2('. No se cobró nada.', '. Nothing was charged.')],
      exp: ['clock', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('SIN RESPUESTA', 'NO REPLY'), E2('No aceptaron en 10 min', 'Not accepted in 10 min'), E2('Liberamos los ', 'We released the ') + money(x.hold) + '.'],
      cx: ['close', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('CANCELADO', 'CANCELLED'), E2('Cancelaste el pedido', 'You cancelled the order'), E2('Liberamos la retención.', 'The hold was released.')] }[st];
    const flow = ['sent', 'ok', 'pesado', 'listo', 'done'], pos = { pend: 0, ok: 1, pesado: 2, listo: 3, done: 4 }[st];
    const SLb = { sent: E2('Enviado', 'Sent'), ok: E2('Preparando', 'Preparing'), pesado: E2('Pesado', 'Weighed'), listo: env ? E2('En camino', 'On the way') : E2('Listo', 'Ready'), done: env ? E2('Entregado', 'Delivered') : E2('Recogido', 'Picked up') };
    const steps = pos == null ? [] : flow.map((k, i) => ({ label: SLb[k], time: k === 'sent' ? x.sentAt : k === 'ok' ? x.okAt || '' : '', state: i < pos || st === 'done' ? 'done' : i === pos ? 'current' : 'next' }));
    const LI = (l, k) => { const it = ML.itOf(ob.id, l.key), nm = es ? it.n : it.ne, lb = it.k === 'lb';
      if (l.out) return { t: nm + E2(' · no había', ' · out of stock'), tot: l.altOk ? money(l.alt.p * l.q) : '$0.00', why: E2('Proponen: ', 'They propose: ') + (es ? l.alt.n : l.alt.ne) + ' · ' + money(l.alt.p) + (lb ? '/lb' : '') + E2('. Toca para aceptar.', '. Tap to accept.'), parts: E2('SIN TU OK NO SE COBRA', 'NOT CHARGED WITHOUT YOUR OK'), lab: '', tax: '', bg: PX(it.ph, 120), bd: '1px solid rgba(255,176,32,.5)', box: l.altOk ? '#0B0E12' : '#fff', boxBd: l.altOk ? 'none' : '1.5px solid rgba(11,14,18,.25)', chk: l.altOk ? 'grid' : 'none', cur: 'pointer', onToggle: () => up(y => ({ w: y.w.map((z, j) => j === k ? { ...z, altOk: !z.altOk } : z) })) };
      return { t: nm, tot: money(it.p * l.real), why: lb ? E2('Pediste ', 'You asked for ') + l.q + E2(' lb · pesó ', ' lb · weighed ') + l.real.toFixed(2) + ' lb × ' + money(it.p) + '/lb' : '× ' + l.q, parts: lb ? E2('FOTO DE LA BALANZA', 'SCALE PHOTO') : '', lab: '', tax: '', bg: PX(lb ? SCALE : it.ph, 120), bd: '1px solid rgba(11,14,18,.1)', box: '#0B0E12', boxBd: 'none', chk: 'grid', cur: 'default', onToggle: () => {} }; };
    const w = x.w || [], estTot = x.est + (x.env || 0);
    let wE = 0, wR = 0, nOut = 0; w.forEach(l => { const it = ML.itOf(ob.id, l.key); if (l.out) { nOut++; return; } if (it.k === 'lb') { wE += it.p * l.q; wR += it.p * l.real; } }); const cmpOk = wR <= wE + .005;
    const cmpT = (wE ? (cmpOk ? E2('Lo que va por peso pesó menos que el estimado: pagas ' + money(wE - wR) + ' menos.', 'By-weight items weighed less than the estimate: you pay ' + money(wE - wR) + ' less.') : E2('Lo que va por peso pesó ' + money(wR - wE) + ' más que el estimado. Está dentro de lo retenido.', 'By-weight items came to ' + money(wR - wE) + ' over the estimate. It is within the hold.')) : E2('Todo al precio del estante.', 'Everything at shelf price.')) + (nOut ? E2(' ' + nOut + ' artículo no había: sin tu OK no se cobra.', ' ' + nOut + ' item was out: not charged without your OK.') : '');
    const est = st === 'pesado' ? { has: true, k: (ob.name + E2(' · PESADO A LAS 1:05 PM', ' · WEIGHED AT 1:05 PM')).toUpperCase(), by: E2('Cada foto muestra la pantalla de la balanza.', 'Each photo shows the scale display.'), hasCmp: true, cmpBg: cmpOk && !nOut ? 'rgba(0,229,196,.12)' : 'rgba(255,176,32,.16)', cmpIc: cmpOk && !nOut ? 'check' : 'scale', cmpFg: cmpOk && !nOut ? '#00695B' : '#8A5A00', cmp: cmpT,
        groups: [{ k: E2('TU PEDIDO', 'YOUR ORDER'), fg: '#0B0E12', s: '', items: w.map(LI) }], rows: [[E2('Estimado', 'Estimate'), money(estTot)], [E2('Peso real', 'Real weight'), money(tot)]].concat(x.env ? [[E2('Incluye envío', 'Includes delivery'), money(x.env)]] : []).concat([[E2('Retenido', 'Held'), money(x.hold)]]).map(([k, v]) => ({ k, v })),
        open: true, holdK: E2('SE COBRA', 'CHARGED'), hold: money(tot), ready: E2('Se liberan ', 'Releasing ') + money(back) + E2(' de la retención.', ' of the hold.'), onApprove: () => up({ st: 'listo' }), cta: E2('Está bien, cobrar ', 'Looks right, charge ') + money(tot), onCall: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-MERC-ESTADO', ob.name, E2('Llamar al mercado', 'Call the market')), call: E2('Llamar al mercado', 'Call the market'), onNone: () => window.TLMercRev ? window.TLMercRev.startHelp(C, x.id) : C.encargo('APP-NEG-MERC-AYUDA', 'APP-NEG-MERC-ESTADO · peso', x.id, E2('Ayuda con el pedido', 'Order help')), none: E2('El peso no me cuadra', 'The weight does not add up') } : { has: false, groups: [], rows: [] };
    const acts = st === 'pend' ? [['close', E2('Cancelar', 'Cancel'), () => up({ st: 'cx' })]] : st === 'listo' || st === 'done' ? [['bag', E2('Volver a pedir', 'Order again'), () => { C.setState({ mcart: { biz: x.biz, lines: x.lines.map(l => ({ ...l })) } }); C.nav({ code: 'APP-NEG-LISTING-PRO', biz: x.biz, from: 'APP-NEG-MERC-ESTADO' }); }], ['help', E2('Ayuda con el pedido', 'Order help'), () => window.TLMercRev ? window.TLMercRev.startHelp(C, x.id) : C.encargo('APP-NEG-MERC-AYUDA', 'APP-NEG-MERC-ESTADO', x.id, E2('Ayuda con el pedido', 'Order help'))]] : ['no', 'exp', 'cx'].includes(st) ? [['search', E2('Buscar otro mercado', 'Find another market'), () => C.nav({ code: 'APP-NEG-CAT', cat: 'NEG-MERC', from: 'APP-NEG-MERC-ESTADO' })]] : [];
    const rows = [[E2('CÓMO', 'HOW'), env ? E2('Envío a tu casa', 'Home delivery') : E2('Pickup', 'Pickup')], [E2('CUÁNDO', 'WHEN'), when], [E2('ARTÍCULOS', 'ITEMS'), String(x.lines.length)], [E2('SI ALGO NO HAY', 'IF SOMETHING IS OUT'), (SUB.find(z => z[0] === x.sub) || SUB[0])[es ? 1 : 2]]].map(([k, v]) => ({ k, v }));
    const mon = ['listo', 'done'].includes(st) ? { has: true, rows: [[E2('Retenido', 'Held'), money(x.hold), ''], [E2('Cobrado · peso real', 'Charged · real weight'), money(tot), ''], [E2('Liberado', 'Released'), money(back), E2('3–5 días hábiles', '3–5 business days')]].map(([k, v, s2]) => ({ k, v, s: s2 })), k: 'TOTAL', v: money(tot), s: LINE[es ? 0 : 1] } : { has: false, rows: [] };
    return { has: true, num: (E2('PEDIDO #', 'ORDER #') + x.id + ' · ' + ob.name).toUpperCase(), title: E2('Tu pedido', 'Your order'), hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, hasSteps: steps.length > 0, steps, isPend: st === 'pend',
      est, xtra: { has: false }, money: mon, ready: { has: false, rows: [] },
      done: { has: st === 'done', t: E2('¿Cómo estuvo?', 'How was it?'), s: E2('Tu reseña sale verificada.', 'Your review shows as verified.'), stars: [1, 2, 3, 4, 5].map(n => ({ onClick: () => window.TLMercRev ? C.revOpen(x.own, 'cita', n, x.id) : C.encargo('APP-NEG-RESENA', 'APP-NEG-MERC-ESTADO · ' + n + ' estrellas', ob.name, E2('Reseña · Mercados', 'Review · Markets')) })), rows: [[E2('Pagaste', 'You paid'), money(tot)], [E2('Liberado', 'Released'), money(back)]].map(([k, v]) => ({ k, v })) },
      isAlt: false, alt: {}, hasOthers: false, others: [], othersK: '',
      rows, acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0, line: LINE[es ? 0 : 1], hasLate: false, lateL: '', onLate: () => {},
      cx: { open: false, t: '', s: '', yes: '', no: '', onYes: () => {}, onNo: () => {} },
      onBack: () => C.nav({ code: 'APP-NEG-LISTING-PRO', biz: x.biz, from: 'APP-NEG-MERC-ESTADO' }),
      lbl: { back: E2('Volver al mercado', 'Back to the market'), rowsK: E2('TU PEDIDO', 'YOUR ORDER'), estT: E2('Así lo pesaron', 'Here is the weight'), xtraT: '', moneyT: E2('Tu dinero', 'Your money'), readyT: '', partsK: '', totK: 'TOTAL' } };
  }
  function sim(C, s) { const x = (s.mped || []).find(y => y.id === s.route.cid), es = (s.lang || 'es') === 'es'; if (!x) return { has: false }; const sc = s.scen || 'ok';
    if (x.st === 'pend') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 10 min' : '10 min pass') : (es ? 'El mercado responde' : 'Market replies'), on: () => { clearTimeout(C._mpT); upC(C, x.id, sc === 'nada' ? { st: 'exp' } : reply(x, sc)); } };
    if (x.st === 'ok') return { has: true, l: es ? 'Lo pesaron' : 'Weighed', on: () => upC(C, x.id, y => ({ st: 'pesado', w: weigh(y, y.sc || sc) })) };
    if (x.st === 'listo') return { has: true, l: x.how === 'envio' ? (es ? 'Llegó' : 'Delivered') : (es ? 'Lo recogí' : 'Picked up'), on: () => upC(C, x.id, { st: 'done' }) };
    return { has: false }; }
  function mineCard(C, s, es, b) { const x = (s.mped || []).filter(y => y.own === b.id && ['pend', 'ok', 'pesado', 'listo'].includes(y.st)).slice(-1)[0]; if (!x) return null; const E2 = (a, c) => es ? a : c;
    const TG = { pend: [E2('ENVIADO', 'SENT'), 'action'], ok: [E2('PREPARANDO', 'PREPARING'), 'signal'], pesado: [E2('REVISA EL PESO', 'CHECK THE WEIGHT'), 'action'], listo: [x.how === 'envio' ? E2('EN CAMINO', 'ON THE WAY') : E2('LISTO', 'READY'), 'signal'] }[x.st];
    return { k: E2('TU PEDIDO', 'YOUR ORDER'), tag: TG[0], tone: TG[1], t: x.lines.length + E2(' artículos · retenido ', ' items · held ') + money(x.hold), s: '', onClick: () => C.nav({ code: 'APP-NEG-MERC-ESTADO', biz: x.own, cid: x.id, from: 'APP-NEG-LISTING · Tu pedido' }) }; }
  window.TLMercFlow = { start, bookVals, citaVals, sim, mineCard, weigh, sumOf, AB0, AC0 };
})();

/* ==== prototype/neg-merc-rev.js ==== */
/* Mercados (NEG-MERC) — Etapa 4: reseña del mercado + Ayuda con el pedido. Hoy = jue 24 sep 2026.
   RESEÑA (APP-NEG-RESENA): revWVals llama a TLMercRev cuando b.merc. Verificada = pedido 'done' en s.mped.
     "Pesaron delante / foto de la balanza" y "cobraron el peso real" salen del pedido (no se editan). Preguntas: fresco · estante = caja ·
     sustituciones · trato (visitante también balanza y cobro). ≤2 ★ → "la reseña no devuelve dinero" → Ayuda con el pedido.
   AYUDA (APP-NEG-MERC-AYUDA → -ESTADO; vistas pe/ps, TLHogarExt.mhelp): el peso no cuadra · faltó algo · no estaba fresco · cambiaron algo sin
     preguntar · la caja no cobró el precio del estante · llegó tarde · otra → detalle + foto (obligatoria en peso, faltó, fresco y precio) →
     que me devuelvan · que me lo repongan · solo avisar. Respuesta: acepta · otra cosa · no acepta → revisión de To'Latino · sin respuesta 24 h. */
(function boot() {
  const SL = window.TLMercL, SF = window.TLMercFlow, SA = window.TLMerc, X = window.TLListing, ALL = window.TLAll, HP = window.TLHogarPre;
  if (!SL || !SF || !SA || !X || !ALL || !HP) return setTimeout(boot, 40);
  const biz = id => ALL.B.find(b => b.id === id), money = n => '$' + Math.round(n).toLocaleString('en-US'), fmt = X.fmt;
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 200) + ')';
  const upP = (C, id, o) => C.setState(z => ({ hpres: (z.hpres || []).map(p => p.id === id ? { ...p, ...(typeof o === 'function' ? o(p) : o) } : p) }));
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)' });
  const LINE = SA.line, NOMED = ['Cuenta cómo te fue: la balanza, lo fresco, los precios.', 'Tell how it went: the scale, freshness, prices.'];
  const withOf = x => '';

  /* ---------- Reseña ---------- */
  const paidOf = x => { const ob = biz(x.own); return '$' + SF.sumOf(x, ob).toFixed(2); };
  const cita = (s, bid, cid) => { const L = (s.mped || []).filter(x => x.own === bid && x.st === 'done'), x = (cid && L.find(y => y.id === cid)) || L[L.length - 1] || null; return x ? { ...x, withL: withOf(x), total: 0, paid: paidOf(x) } : null; };
  function srcs(ctA, es) { const E2 = (a, b) => es ? a : b;
    return (ctA ? [['cita', E2('Pedido #', 'Order #') + ctA.id + ' · ' + ctA.lines.length + E2(' artículos', ' items'), ctA.how === 'envio' ? E2('Envío', 'Delivery') : E2('Pickup', 'Pickup'), E2('VERIFICADA', 'VERIFIED'), 'signal']] : [])
      .concat([['vis', E2("Compré en la tienda", "I bought in store"), E2('Sin pedido de To\'Latino', 'Without a To\'Latino order'), E2('VISITANTE', 'VISITOR'), 'neutral']]); }
  function groups(G, isCita, ctA, es) { const E2 = (a, b) => es ? a : b;
    return (isCita ? [] : [G(E2('¿PESARON DELANTE DE TI?', 'WEIGHED IN FRONT OF YOU?'), 'whoOk', [[1, E2('Sí', 'Yes')], [0, E2('No', 'No')]]), G(E2('¿COBRARON EL PESO REAL?', 'CHARGED THE REAL WEIGHT?'), 'clean', [[1, E2('Sí', 'Yes')], [-1, E2('Cobraron más', 'Charged more')]])])
      .concat([G(E2('¿ESTABA FRESCO?', 'WAS IT FRESH?'), 'asked', [[1, E2('Todo fresco', 'All fresh')], [0, E2('Algo no', 'Something was not')], [-1, E2('No', 'No')]]),
        G(E2('¿LA CAJA COBRÓ EL PRECIO DEL ESTANTE?', 'REGISTER MATCHED THE SHELF?'), 'price', [[1, E2('Sí', 'Yes')], [0, E2('No', 'No')]]),
        G(E2('SI ALGO NO HABÍA', 'IF SOMETHING WAS OUT'), 'wait', [['a', E2('Me preguntaron', 'They asked me')], ['b', E2('No hizo falta', 'Not needed')], ['c', E2('Cambiaron sin preguntar', 'Swapped without asking')]]),
        G(E2('TRATO', 'HOW THEY TREATED YOU'), 'trato', [[1, E2('Con respeto', 'With respect')], [0, E2('Normal', 'Okay')], [-1, E2('Mal trato', 'Treated badly')]])]); }
  function tm(ctA, es) { const E2 = (a, b) => es ? a : b;
    return [[E2('PEDIDO', 'ORDER'), ctA.lines.length + E2(' artículos', ' items'), '#0B0E12'], [E2('BALANZA', 'SCALE'), E2('Foto de cada peso', 'Photo of each weight'), '#00695B'], [E2('PAGASTE', 'YOU PAID'), ctA.paid + E2(' · peso real', ' · real weight'), '#00695B']].concat(ctA.withL ? [[E2('CON', 'WITH'), ctA.withL, '#0B0E12']] : []).map(([k, v, fg]) => ({ k, v, fg })); }
  function pool(b, ctA, isCita, es) { const L = [].concat(...SL.svcs(b.id).map(g => g[2])); return (isCita && ctA ? [es ? ctA.svc : ctA.svcEn] : []).concat(L.map(it => es ? it.n : it.ne || it.n)).filter((k, i, a) => a.indexOf(k) === i).slice(0, 6); }
  function draft(F, isCita, ctA, es) { return { src: isCita ? 'cita' : 'vis', hot: null, val: null, taste: null, late: null, wait: '', lateK: '', asked: null, price: null, clean: null, trato: F.trato, whoOk: null, pro: isCita && ctA ? ctA.withL : '', cid: isCita && ctA ? ctA.id : '',
    svc: '', pesa: isCita ? 1 : F.whoOk == null ? null : F.whoOk, peso: isCita ? 1 : F.clean == null ? null : F.clean === -1 ? 0 : 1, fresco: F.asked == null ? null : F.asked === 1 ? 1 : 0, caja: F.price == null ? null : F.price, sust: F.wait === 'a' ? 1 : F.wait === 'c' ? 0 : null }; }
  function fix(V, C, s, es, b, isCita, ctA) { const E2 = (a, c) => es ? a : c;
    return { ...V, tmK: E2('TU PEDIDO · DATO DEL PEDIDO', 'YOUR ORDER · FROM THE ORDER'), tmNote: E2("Los pesos y lo que pagaste salen de tu pedido en To'Latino. No se editan.", "Weights and what you paid come from your To'Latino order. They cannot be edited."),
      meta: (b.name + (isCita && ctA ? E2(' · PEDIDO #', ' · ORDER #') + ctA.id : '')).toUpperCase(),
      lowT: E2('La reseña no devuelve dinero. Si el peso no cuadra, faltó algo o no estaba fresco, pídelo en Ayuda con el pedido.', 'A review does not refund money. If the weight is off, something was missing or not fresh, ask in Order help.'),
      onHelpOrd: () => ctA ? startHelp(C, ctA.id) : C.encargo('APP-NEG-MERC-AYUDA', 'APP-NEG-RESENA', b.name, E2('Ayuda con el pedido', 'Order help')),
      lbl: { ...V.lbl, srcNote: E2("Solo sale verificada si pediste por To'Latino.", "It only shows as verified if you ordered through To'Latino."), aspK: E2('LO QUE IMPORTA EN UN MERCADO', 'WHAT MATTERS AT A MARKET'), recK: E2('¿QUÉ SERVICIO RECOMIENDAS?', 'WHICH SERVICE DO YOU RECOMMEND?'), recS: E2('Opcional. Sale en tu reseña.', 'Optional. Shows in your review.'),
        textPh: NOMED[es ? 0 : 1], helpOrd: E2('Ir a Ayuda con el pedido', 'Go to Order help') } }; }

  /* ---------- Ayuda con la cita ---------- */
  const RSN = [['peso', 'El peso no cuadra', 'The weight is off', 1], ['falto', 'Faltó algo', 'Something was missing', 1], ['fresco', 'No estaba fresco', 'It was not fresh', 1], ['sust', 'Cambiaron algo sin preguntar', 'Swapped without asking', 0], ['caja', 'No cobraron el precio del estante', 'Register did not match the shelf', 1], ['tarde', 'Llegó tarde', 'It arrived late', 0], ['otro', 'Otra cosa', 'Something else', 0]];
  const SOL = [['rev', 'Que me devuelvan', 'Refund me', 'Lo que se cobró de más o faltó'], ['corr', 'Que me lo repongan', 'Replace it', 'En tu próximo pickup o envío'], ['avis', 'Solo quiero avisar', 'I just want to let them know', 'Lo lee el mercado y To\'Latino']];
  const isBill = r => { const z = RSN.find(y => y[0] === r); return !!(z && z[3]); };
  function startHelp(C, cid) { const x = (C.state.mped || []).find(y => y.id === cid); if (!x) return; const open = (C.state.hpres || []).find(p => p.mode === 'mhelp' && p.cid === cid && !['done'].includes(p.st));
    if (open) { C.nav({ code: 'APP-NEG-MERC-AYUDA-ESTADO', biz: x.own, pid: open.id, from: 'APP-NEG-MERC-ESTADO' }); C.scrollTop(); return; }
    C.setState({ hpe: { mode: 'mhelp', cid, biz: x.biz, own: x.own, r: null, note: '', phs: [], sol: 'rev', amt: '', code: '', areas: [] } }); C.nav({ code: 'APP-NEG-MERC-AYUDA', biz: x.own, cid, from: 'APP-NEG-MERC-ESTADO' }); C.scrollTop(); }
  function helpForm(C, s, es) { const q = s.hpe, E2 = (a, b) => es ? a : b, x = (s.mped || []).find(y => y.id === q.cid); if (!x) return { has: false };
    const ob = biz(x.own), upF = o => C.setState(z => ({ hpe: { ...z.hpe, ...o } })), bill = isBill(q.r);
    const miss = [!q.r ? E2('Elige qué pasó', 'Pick what happened') : null, q.note.trim().length < 15 ? E2('Cuéntanos qué pasó (15 letras o más)', 'Tell us what happened (15+ characters)') : null, bill && !q.phs.length ? E2('Agrega una foto del producto o del recibo', 'Add a photo of the product or receipt') : null].filter(Boolean);
    const send = () => { if (miss.length) return; const id = 'Q-' + (2100 + Math.floor(Math.random() * 800)); const p = { id, mode: 'mhelp', cid: x.id, biz: x.biz, own: x.own, r: q.r, note: q.note, phs: q.phs, sol: q.sol, amt: q.amt, st: 'sent', at: '5:40 PM', svc: E2('Pedido', 'Order'), svcEn: 'Order', price: paidOf(x) };
      C.setState(z => ({ hpres: (z.hpres || []).concat(p), hpe: null })); C.nav({ code: 'APP-NEG-MERC-AYUDA-ESTADO', biz: x.own, pid: id, from: 'APP-NEG-MERC-AYUDA' }); C.scrollTop(); respond(C, id); };
    return { has: true, scr: 'APP-NEG-MERC-AYUDA', hasVid: false, showPh: true, showNote: true, showCode: bill && q.sol === 'rev', title: E2('Ayuda con el pedido', 'Order help'), sub: (E2('PEDIDO #', 'ORDER #') + x.id + ' · ' + ob.name).toUpperCase(),
      veh: { ic: 'bag', k: E2('TU PEDIDO', 'YOUR ORDER'), t: x.lines.length + E2(' artículos', ' items'), s: (x.how === 'envio' ? E2('ENVÍO', 'DELIVERY') : 'PICKUP'), hasOk: true, okT: E2('Pagaste: ', 'You paid: ') + paidOf(x), okFg: '#00695B', okIc: 'check', cta: E2('Ver', 'See'), onClick: () => C.nav({ code: 'APP-NEG-MERC-ESTADO', biz: x.own, cid: x.id, from: 'APP-NEG-MERC-AYUDA' }) },
      lights: RSN.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.r === k ? 'selected' : 'filter', onClick: () => upF({ r: q.r === k ? null : k }) })), note: q.note, onNote: e => upF({ note: e.target.value.slice(0, 500) }), noteN: q.note.length + ' / 500',
      code: q.amt, onCode: e => upF({ amt: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) }),
      phs: q.phs.map((p, i) => ({ bg: PX(p.ph), vid: false, onDel: () => upF({ phs: q.phs.filter((_, j) => j !== i) }) })), canPh: q.phs.length < 4, onPh: () => upF({ phs: q.phs.concat([{ ph: [7111490, 7926666, 7688191][q.phs.length % 3], vid: false }]) }), onVid: () => {}, phN: q.phs.length + ' / 4',
      whens: SOL.map(([k, l1, l2, sub]) => ({ l: es ? l1 : l2, s: es ? sub : k === 'rev' ? 'If you were overcharged' : k === 'corr' ? 'They send the corrected bill' : 'Read by the clinic and To\'Latino', hasS: true, ...radio(q.sol === k), onClick: () => upF({ sol: k }) })),
      how: [E2(ob.name + ' recibe tu solicitud y responde en 24 h.', ob.name + ' gets your request and replies within 24 h.'), E2("Si no responde o no estás de acuerdo, To'Latino la revisa en 48 h.", "If they do not reply or you disagree, To'Latino reviews it within 48 h."), E2('Nada se da por resuelto hasta que respondan.', 'Nothing is resolved until they reply.')].map((z, i) => ({ n: String(i + 1), t: z })),
      miss: miss.map(z => ({ t: z })), hasMiss: miss.length > 0, dis: miss.length > 0, onSend: send, cta: E2('Enviar solicitud', 'Send request'), free: E2('RESPONDE EN 24 H', 'REPLIES WITHIN 24 H'),
      onBack: () => C.nav({ code: 'APP-NEG-MERC-ESTADO', biz: x.own, cid: x.id, from: 'APP-NEG-MERC-AYUDA' }),
      lbl: { back: E2('Volver', 'Back'), vehT: E2('Tu cita', 'Your appointment'), symT: E2('¿Qué pasó?', 'What happened?'), symS: NOMED[es ? 0 : 1], lightsK: E2('MOTIVO', 'REASON'), notePh: E2('Ej.: pedí 3 lb y la foto dice 2.6, pero me cobraron 3…', 'E.g. I asked for 3 lb, the photo says 2.6, but I was charged 3…'),
        codeK: E2('¿CUÁNTO? · OPCIONAL', 'HOW MUCH? · OPTIONAL'), codePh: E2('Ej.: 60', 'E.g. 60'), phT: bill ? E2('Fotos · obligatorias', 'Photos · required') : E2('Fotos · opcional', 'Photos · optional'), phS: E2('Del producto, la etiqueta o el recibo.', 'Of the product, the label or the receipt.'), addPh: E2('Foto', 'Photo'), addVid: '', vidTag: '',
        whenT: E2('¿Qué quieres?', 'What would you like?'), howK: E2('CÓMO FUNCIONA', 'HOW IT WORKS'), missK: E2('TE FALTA', 'STILL NEEDED'), honest: LINE[es ? 0 : 1] + ' ' + (q.r === 'peso' ? E2('Compararemos tu foto con la foto de la balanza del mercado.', 'We compare your photo with the market scale photo.') : '') } };
  }
  function reply(p, sc) { const amt = p.amt ? +p.amt : 60; return sc === 'rechaza' ? { st: 'no', repAt: '6:20 PM' } : sc === 'cambio' ? { st: 'alt', repAt: '6:20 PM', altAmt: Math.round(amt * .5) } : { st: 'ok', repAt: '6:20 PM', okAmt: p.sol === 'rev' ? amt : 0 }; }
  function respond(C, id) { clearTimeout(C._mhT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._mhT = setTimeout(() => upP(C, id, p => p.st === 'sent' ? reply(p, sc) : {}), 4000); }
  function helpStatus(C, s, es, p) { const E2 = (a, b) => es ? a : b, ob = biz(p.own), st = p.st, rsn = RSN.find(z => z[0] === p.r), sol = SOL.find(z => z[0] === p.sol);
    const okT = p.sol === 'rev' ? E2('Te devolvemos ', 'Refunding ') + money(p.okAmt || 0) : p.sol === 'corr' ? E2('Te lo reponen', 'They replace it') : E2('Gracias por avisar', 'Thanks for letting us know');
    const H = { sent: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, E2("Responde en 24 h. Si no, To'Latino la revisa en 48 h.", "Replies within 24 h. Otherwise, To'Latino reviews it within 48 h.")],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('ACEPTÓ', 'ACCEPTED'), okT, p.sol === 'rev' ? E2('Vuelve a tu tarjeta en 3–5 días hábiles.', 'Back to your card in 3–5 business days.') : p.sol === 'corr' ? E2('Va en tu próximo pickup o envío, sin costo.', 'It comes with your next pickup or delivery, free.') : ''],
      alt: ['dollar', 'rgba(255,176,32,.2)', '#8A5A00', E2('PROPONE OTRA COSA', 'PROPOSES SOMETHING ELSE'), E2('Devolverte ', 'Refund ') + money(p.altAmt || 0), E2("Tú decides. Si no te sirve, pide revisión a To'Latino.", "You decide. If it does not work for you, ask To'Latino to review.")],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO ACEPTÓ', 'DECLINED'), ob.name + E2(' dice que cumplió lo acordado', ' says they did what was agreed'), E2("Si no estás de acuerdo, To'Latino revisa la foto de la balanza y las tuyas en 48 h.", "If you disagree, To'Latino reviews the scale photo and yours within 48 h.")],
      rev: ['shield', 'rgba(75,55,245,.1)', '#4B37F5', E2("EN REVISIÓN DE TO'LATINO", "UNDER TO'LATINO REVIEW"), E2('Revisamos en 48 h', 'We review within 48 h'), E2('Miramos la foto de la balanza, lo que pagaste y tus fotos. Te escribimos por SMS.', 'We look at the scale photo, what you paid and your photos. We will text you.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('LISTO', 'DONE'), p.doneT || '', E2('Gracias por avisarnos.', 'Thanks for letting us know.')] }[st];
    const acts = st === 'ok' ? [['check', E2('Entendido', 'Got it'), () => upP(C, p.id, { st: 'done', doneT: okT })]] : st === 'alt' ? [['dollar', E2('Aceptar ', 'Accept ') + money(p.altAmt || 0), () => upP(C, p.id, { st: 'done', doneT: E2('Devuelto ', 'Refunded ') + money(p.altAmt || 0) })], ['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : st === 'no' ? [['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : [];
    return { has: true, title: E2('Ayuda con el pedido', 'Order help'), num: (E2('SOLICITUD #', 'REQUEST #') + p.id + E2(' · PEDIDO #', ' · ORDER #') + p.cid).toUpperCase(), hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, big: false, small: true,
      steps: [[E2('Enviada', 'Sent'), p.at, 1], [E2('Respuesta de ', 'Reply from ') + ob.name, p.repAt || '', st !== 'sent'], [E2('Resuelta', 'Resolved'), '', st === 'done']].map(([label, time, d], i, a) => ({ label, time, state: d ? 'done' : (i === 0 || a[i - 1][2]) ? 'current' : 'next' })),
      rep: { has: ['ok', 'alt', 'no'].includes(st), who: ob.name, ph: PX(ob.ph[0], 120), at: p.repAt, t: st === 'ok' ? E2('Revisamos y tienes razón. Disculpa el error.', 'We checked and you are right. Sorry for the mistake.') : st === 'alt' ? E2('Tienes razón en parte. Podemos devolverte ' + money(p.altAmt || 0) + '.', 'You are partly right. We can refund ' + money(p.altAmt || 0) + '.') : E2('La foto de la balanza muestra el peso cobrado. Si quieres, lo hablamos por teléfono.', 'The scale photo shows the charged weight. We can talk by phone if you want.'),
        hasInc: false, inc: [], chg: [], valid: '', time: '', cta: E2('Llamar al mercado', 'Call the market'), onCta: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-MERC-AYUDA-ESTADO', ob.name, E2('Llamar al mercado', 'Call the market')) },
      req: { rows: [[E2('MOTIVO', 'REASON'), rsn ? rsn[es ? 1 : 2] : '—'], [E2('QUIERES', 'YOU WANT'), sol ? sol[es ? 1 : 2] : '—']].concat(p.amt ? [[E2('MONTO', 'AMOUNT'), money(+p.amt)]] : []).concat([[E2('LES CONTASTE', 'YOU SAID'), '«' + p.note + '»']]).map(([k, v]) => ({ k, v })), phs: (p.phs || []).map(z => ({ bg: PX(z.ph), vid: false })) },
      hasOthers: false, others: [], acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0,
      onBack: () => C.nav({ code: 'APP-NEG-MERC-ESTADO', biz: p.own, cid: p.cid, from: 'APP-NEG-MERC-AYUDA-ESTADO' }),
      lbl: { back: E2('Volver al pedido', 'Back to the order'), repK: E2('RESPUESTA DE ', 'REPLY FROM ') + ob.name.toUpperCase(), incK: '', chgK: '', reqK: E2('LO QUE MANDASTE', 'WHAT YOU SENT'), othersK: '', vidTag: '', honest: LINE[es ? 0 : 1] } };
  }
  const EXT = window.TLHogarExt = window.TLHogarExt || {};
  EXT.mhelp = { form: helpForm, status: helpStatus, sim: (C, s, p) => { const es = (s.lang || 'es') === 'es', sc = s.scen || 'ok';
    if (p.st === 'sent') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 24 h' : '24 h pass') : (es ? 'El mercado responde' : 'Market replies'), on: () => { clearTimeout(C._mhT); upP(C, p.id, sc === 'nada' ? { st: 'rev' } : reply(p, sc)); } };
    if (p.st === 'rev') return { has: true, l: es ? "To'Latino decide" : "To'Latino decides", on: () => upP(C, p.id, { st: 'done', doneT: (es ? 'Te devolvemos ' : 'Refunding ') + money(p.amt ? +p.amt : 30) }) };
    return null; } };
  window.TLMercRev = { cita, srcs, groups, tm, pool, draft, fix, startHelp };
})();

/* ==== prototype/neg-fiesta-listing.js ==== */
/* Ficha de Fiestas (APP-NEG-LISTING-PRO/FREE · NEG-FIESTA) — datos + motor. Hoy: jue 24 sep 2026, 12:30 PM.
   Tesis: ¿esa fecha está libre? Línea fija: "La fecha no es tuya hasta que te la confirmen." (ficha, hoja, Booking, estado).
   Tu fecha (como Mi vehículo / Tu seguro): s.fev = { e: tipo, i: día (offset), g: invitados, w: dónde }. Hoja = plantilla `hc` (s.hcs.fiesta).
     Cada servicio y la ficha dicen "Libre el …" u "Ocupada el …" + próximas fechas libres. Sin fecha: próximo sábado libre.
   Servicio k: pack (paquete cerrado; h horas; inc = lo que incluye) · hora (p por hora, min horas mínimas) · unid (por unidad; u = unidad) ·
     fijo · visita (visita al salón, gratis) · cotiza (desde p; total por escrito). cap = invitados · mont = incluye montaje · env = entrega incluida o precio.
   Reseñas: respetaron la fecha · llegaron a la hora · cobraron lo del paquete · quedó como en las fotos · recogieron y limpiaron · trato.
   Booking y estado = etapa 3 (encargo APP-NEG-FIESTA-BOOKING). */
(function boot() {
  const X = window.TLListing, SD = window.TLStaff, FI = window.TLFiesta, ALL = window.TLAll; if (!X || !SD || !FI || !ALL) return setTimeout(boot, 40);
  const NOW = 12.5, fmt = X.fmt, money = n => '$' + Math.round(n).toLocaleString('en-US');
  const U = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const PX = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const day = i => new Date(2026, 8, 24 + i), DS = [['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']];
  const MO = [['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']];
  const dayL = (i, es) => { const d = day(i); return es ? DS[0][d.getDay()] + ' ' + d.getDate() + ' ' + MO[0][d.getMonth()] : DS[1][d.getDay()] + ' ' + MO[1][d.getMonth()] + ' ' + d.getDate(); };
  const PH = FI.SUBPH, sv = (n, ne, d, de, p, k, o) => Object.assign({ n, ne, d, de, p, k }, o || {}), W = (...a) => a, WK = (h, sat, sun) => W(sun || null, h, h, h, h, h, sat || null);
  const LINE = FI.line;
  const SVC = {
    'salon-imperial': [['Salón', 'Hall', [
      sv('Sábado · 6 horas', 'Saturday · 6 hours', 'Salón para 250, mesas redondas, sillas, manteles y pista. Tú traes la comida o la ponemos nosotros.', 'Hall for 250, round tables, chairs, linens and dance floor. Bring your food or we provide it.', 1800, 'pack', { h: 6, cap: 250, mont: 1, ph: PH['Salón de fiestas'], inc: [['Mesas, sillas y manteles', 'Tables, chairs and linens'], ['Pista y sonido básico', 'Dance floor and basic sound'], ['Seguridad y limpieza', 'Security and cleanup']] }),
      sv('Viernes o domingo · 6 horas', 'Friday or Sunday · 6 hours', 'Lo mismo que el sábado, 20 % menos.', 'Same as Saturday, 20% less.', 1440, 'pack', { h: 6, cap: 250, mont: 1, ph: PH['Salón de fiestas'] }),
      sv('Hora extra', 'Extra hour', 'Hasta la 1 AM.', 'Until 1 AM.', 200, 'hora', { min: 1, ph: PH['Salón de fiestas'] }),
      sv('Visita al salón', 'Venue tour', 'Ven a verlo antes de apartar. Gratis, 30 minutos.', 'See it before you book. Free, 30 minutes.', 0, 'visita', { ph: PH['Salón de fiestas'] })]],
      ['Decoración', 'Décor', [sv('Centros de mesa', 'Centerpieces', 'Flores o velas, por mesa.', 'Flowers or candles, per table.', 25, 'unid', { u: ['mesa', 'table'], ph: PH['Decoración y centros de mesa'] })]]],
    'suenos-de-quince': [['Quince', 'Quince', [
      sv('Paquete quince completo', 'Full quince package', 'Organización, coreografía, vestido, decoración y el día coordinado de principio a fin.', 'Planning, choreography, dress, décor and day-of coordination start to finish.', 3900, 'pack', { h: 0, ph: PH['Organizador de quinceañeras'], inc: [['Coordinación del día', 'Day-of coordination'], ['8 ensayos de coreografía', '8 choreography rehearsals'], ['Vestido y 2 cambios', 'Dress and 2 changes'], ['Decoración del salón', 'Hall décor']] }),
      sv('Coreografía y chambelanes', 'Choreography and escorts', '8 ensayos y el vals el día de la fiesta.', '8 rehearsals and the waltz on the day.', 650, 'fijo', { ph: PH['Chambelanes y coreografía'] }),
      sv('Renta de vestido', 'Dress rental', 'Con prueba y ajuste. Se devuelve el lunes.', 'With fitting and alterations. Return on Monday.', 280, 'fijo', { ph: PH['Renta de vestidos y trajes'] }),
      sv('Primera cita', 'First meeting', 'Te mostramos vestidos, fotos y paquetes. Gratis.', 'We show you dresses, photos and packages. Free.', 0, 'visita', { ph: PH['Organizador de quinceañeras'] })]]],
    'hazleton-party-rentals': [['Renta', 'Rentals', [
      sv('Mesa + 8 sillas', 'Table + 8 chairs', 'Mesa redonda o larga, sillas blancas.', 'Round or long table, white chairs.', 14, 'unid', { u: ['juego', 'set'], ph: PH['Renta de mesas y sillas'] }),
      sv('Carpa 20 × 30', '20 × 30 tent', 'Para 60 personas sentadas. Montaje incluido.', 'Seats 60. Setup included.', 450, 'fijo', { cap: 60, mont: 1, ph: PH['Renta de carpas'] }),
      sv('Manteles', 'Linens', 'Blancos o de color, lavados y planchados.', 'White or colored, washed and pressed.', 8, 'unid', { u: ['mantel', 'linen'], ph: PH['Mantelería'] }),
      sv('Brincolín', 'Bounce house', '6 horas, con entrega.', '6 hours, delivered.', 150, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Entrega, montaje y recogida', 'Delivery, setup and pickup', 'Hasta 25 millas de Hazleton.', 'Up to 25 miles from Hazleton.', 60, 'fijo', { ph: PH['Renta de artículos para fiesta'] })]]],
    'dj-el-cibaeno': [['Música', 'Music', [
      sv('DJ · 4 horas', 'DJ · 4 hours', 'Merengue, bachata, salsa, reguetón y lo que pidan. Con luces y micrófono.', 'Merengue, bachata, salsa, reggaeton and requests. Lights and mic included.', 450, 'pack', { h: 4, mont: 1, ph: PH['DJ'], inc: [['Sonido para 200 personas', 'Sound for 200 people'], ['Luces de pista', 'Dance floor lights'], ['Micrófono inalámbrico', 'Wireless mic']] }),
      sv('Hora extra', 'Extra hour', 'Se pide el mismo día.', 'Can be added on the day.', 90, 'hora', { min: 1, ph: PH['DJ'] }),
      sv('Animador y hora loca', 'Host and hora loca', 'Maestro de ceremonias, juegos y 30 min de hora loca.', 'MC, games and 30 min of hora loca.', 250, 'fijo', { ph: PH['Maestro de ceremonias y animador'] })]]],
    'mariachi-real-hazleton': [['Música', 'Music', [
      sv('Serenata · 45 minutos', 'Serenade · 45 minutes', '7 músicos con traje de gala.', '7 musicians in full dress.', 380, 'pack', { h: 0.75, ph: PH['Mariachi'] }),
      sv('Fiesta · 2 horas', 'Party · 2 hours', 'Con Las Mañanitas y las que pidan.', 'With Las Mañanitas and requests.', 900, 'pack', { h: 2, ph: PH['Mariachi'] }),
      sv('Trío romántico · 1 hora', 'Romantic trio · 1 hour', 'Boleros y bachata de guitarra.', 'Boleros and guitar bachata.', 300, 'pack', { h: 1, ph: PH['Trío y serenata'] })]]],
    'globos-y-mas': [['Decoración', 'Décor', [
      sv('Arco de globos', 'Balloon arch', '2.5 metros, dos o tres colores. Montaje incluido.', '8 feet, two or three colors. Setup included.', 180, 'fijo', { mont: 1, ph: PH['Decoración con globos'] }),
      sv('Fondo con nombre', 'Backdrop with name', 'Para la foto de la mesa principal.', 'For the head-table photo.', 220, 'fijo', { mont: 1, ph: PH['Fondos y arcos'] }),
      sv('Paquete quince o cumpleaños', 'Quince or birthday package', 'Arco, fondo, mesa principal y mesa de dulces.', 'Arch, backdrop, head table and candy table.', 520, 'pack', { h: 0, mont: 1, ph: PH['Mesa de dulces'], inc: [['Arco de globos', 'Balloon arch'], ['Fondo con nombre', 'Name backdrop'], ['Mesa de dulces', 'Candy table']] })]]],
    'momentos-foto-video': [['Fotos y video', 'Photo & video', [
      sv('Fotos · 4 horas', 'Photos · 4 hours', '300 fotos editadas en 2 semanas, en línea.', '300 edited photos in 2 weeks, online.', 650, 'pack', { h: 4, ph: PH['Fotógrafo'] }),
      sv('Fotos y video · 6 horas', 'Photos and video · 6 hours', 'Con video resumen de 5 minutos.', 'With a 5-minute highlight video.', 1400, 'pack', { h: 6, ph: PH['Videógrafo'] }),
      sv('Cabina 360', '360 booth', '3 horas, videos al teléfono al momento.', '3 hours, videos to phones instantly.', 450, 'pack', { h: 3, mont: 1, ph: PH['Cabina 360'] }),
      sv('Dron', 'Drone', 'Tomas del lugar desde arriba.', 'Aerial shots of the venue.', 200, 'fijo', { ph: PH['Fotografía con dron'] })]]],
    'dulce-tentacion': [['Bizcochos', 'Cakes', [
      sv('Bizcocho dominicano', 'Dominican cake', 'Relleno de piña o dulce de leche, suspiro. Por porción; mínimo 20.', 'Pineapple or dulce de leche filling, meringue. Per slice; 20 minimum.', 4, 'unid', { u: ['porción', 'slice'], ph: PH['Pastel y postres de evento'] }),
      sv('Mesa de dulces', 'Candy table', 'Para 50: cupcakes, galletas y dulces con tus colores.', 'For 50: cupcakes, cookies and sweets in your colors.', 250, 'fijo', { ph: PH['Mesa de dulces'] }),
      sv('Fuente de chocolate', 'Chocolate fountain', 'Con fruta y malvaviscos para 80.', 'With fruit and marshmallows for 80.', 280, 'fijo', { ph: PH['Fuente de chocolate'] })]]],
    'brincolines-la-alegria': [['Inflables', 'Inflatables', [
      sv('Brincolín · 6 horas', 'Bounce house · 6 hours', 'Entrega, montaje y recogida incluidos.', 'Delivery, setup and pickup included.', 150, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Tobogán de agua', 'Water slide', 'Para el verano; con lona para el patio.', 'For summer; with a yard tarp.', 250, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Juegos de feria', 'Carnival games', '5 juegos y premios para 30 niños.', '5 games and prizes for 30 kids.', 180, 'fijo', { ph: PH['Juegos y renta de feria'] })]]],
    'andrea-events': [['Organización', 'Planning', [
      sv('Coordinación del día', 'Day-of coordination', 'Llego a las 8 AM y me encargo de proveedores, horarios y ceremonia.', 'I arrive at 8 AM and handle vendors, timeline and ceremony.', 900, 'pack', { h: 12, ph: PH['Organizador de bodas'] }),
      sv('Boda completa', 'Full wedding', 'Desde la fecha hasta el último baile. Presupuesto y proveedores contigo.', 'From the date to the last dance. Budget and vendors with you.', 2500, 'cotiza', { ph: PH['Organizador de bodas'] }),
      sv('Primera cita', 'First meeting', 'Te cuento cómo trabajo y cuánto cuesta. Gratis.', 'I tell you how I work and what it costs. Free.', 0, 'visita', { ph: PH['Organizador de eventos'] })]]],
    'barra-movil-tropical': [['Barra', 'Bar', [
      sv('Barra · 4 horas', 'Bar · 4 hours', '2 bartenders, hielo, vasos y mezcladores. Tú traes la bebida.', '2 bartenders, ice, cups and mixers. You bring the drinks.', 550, 'pack', { h: 4, cap: 300, mont: 1, ph: PH['Barra móvil'] }),
      sv('Meseros', 'Waitstaff', 'Por mesero, 5 horas.', 'Per server, 5 hours.', 150, 'unid', { u: ['mesero', 'server'], ph: PH['Meseros'] })]]],

    'fiestas-magicas': [['Cumpleaños', 'Birthdays', [
      sv('Cumpleaños · 3 horas', 'Birthday · 3 hours', 'Animadora, juegos, piñata y la mesa decorada con tus colores. Para 30 niños.', 'Host, games, piñata and the table decorated in your colors. For 30 kids.', 420, 'pack', { h: 3, mont: 1, ph: PH['Fiestas de cumpleaños'], inc: [['Animadora y juegos', 'Host and games'], ['Piñata', 'Piñata'], ['Mesa decorada', 'Decorated table']] }),
      sv('Personaje · 1 hora', 'Character · 1 hour', 'Llega vestido: fotos, baile y la entrega del pastel.', 'Arrives in costume: photos, dancing and cake time.', 150, 'pack', { h: 1, ph: PH['Personajes y botargas'] }),
      sv('Show de magia · 45 minutos', 'Magic show · 45 minutes', 'Magia de cerca y en escena; el cumpleañero participa.', 'Close-up and stage magic; the birthday kid joins in.', 250, 'pack', { h: 0.75, ph: PH['Mago'] })]],
      ['Baby shower', 'Baby shower', [sv('Baby shower organizado', 'Planned baby shower', 'Fondo, mesa principal, juegos con premios y quien lleva el programa.', 'Backdrop, head table, games with prizes and someone running the program.', 600, 'pack', { h: 3, mont: 1, ph: PH['Organizador de baby shower'], inc: [['Fondo y mesa principal', 'Backdrop and head table'], ['Juegos con premios', 'Games with prizes'], ['Coordinación del programa', 'Program coordination']] }),
      sv('Primera cita', 'First meeting', 'Te cuento opciones y precios. Gratis.', 'Options and prices. Free.', 0, 'visita', { ph: PH['Organizador de baby shower'] })]]],
    'patio-en-grande': [['Montaje', 'Setup', [
      sv('Patio listo para 100', 'Backyard ready for 100', 'Carpa, 12 mesas, 100 sillas, pista y luces. Montamos el día antes y recogemos el día después.', 'Tent, 12 tables, 100 chairs, dance floor and lights. Set up the day before, picked up the day after.', 1650, 'pack', { h: 0, cap: 100, mont: 1, ph: PH['Montaje en patio'], inc: [['Carpa 20 × 40', '20 × 40 tent'], ['12 mesas y 100 sillas', '12 tables and 100 chairs'], ['Pista y luces', 'Dance floor and lights']] }),
      sv('Pista de baile 16 × 16', '16 × 16 dance floor', 'Negra o blanca, sobre grama o cemento.', 'Black or white, on grass or concrete.', 380, 'fijo', { mont: 1, ph: PH['Escenario y pista'] }),
      sv('Escenario 12 × 8', '12 × 8 stage', 'Para la banda o el DJ, con escalera y faldón.', 'For the band or DJ, with steps and skirting.', 450, 'fijo', { mont: 1, ph: PH['Escenario y pista'] }),
      sv('Planta de luz', 'Generator', '7,500 W silenciosa, con gasolina para 8 horas.', 'Quiet 7,500 W, fuel for 8 hours.', 220, 'fijo', { ph: PH['Plantas de luz'] }),
      sv('Baño portátil', 'Portable restroom', 'Uno por cada 50 invitados. Se entrega y se recoge.', 'One per 50 guests. Delivered and picked up.', 140, 'unid', { u: ['baño', 'unit'], ph: PH['Baños portátiles'] }),
      sv('Visita a tu patio', 'Backyard visit', 'Medimos y te decimos qué cabe. Gratis.', 'We measure and tell you what fits. Free.', 0, 'visita', { ph: PH['Montaje en patio'] })]]],
    'hora-loca-tropical': [['Animación', 'Entertainment', [
      sv('Hora loca · 30 minutos', 'Hora loca · 30 minutes', '4 bailarines con zancos y máscaras; pitos y collares para los invitados.', '4 dancers on stilts and in masks; whistles and necklaces for guests.', 350, 'pack', { h: 0.5, ph: PH['Bailarines y hora loca'], inc: [['4 bailarines', '4 dancers'], ['Pitos y collares para 100', 'Whistles and necklaces for 100']] }),
      sv('Cantante · 1 hora', 'Singer · 1 hour', 'Merengue, bachata y baladas, con su propio sonido.', 'Merengue, bachata and ballads, with own sound.', 300, 'pack', { h: 1, ph: PH['Cantante'] }),
      sv('Animador toda la fiesta', 'Host for the whole party', 'Presenta, lleva el programa y anima el vals y el brindis. 5 horas.', 'Emcees, runs the program, leads the waltz and toast. 5 hours.', 400, 'pack', { h: 5, ph: PH['Maestro de ceremonias y animador'] })]]],
  };
  Object.assign(SVC, {
    'payasita-chispita': [['Shows', 'Shows', [sv('Show de payasita · 1 hora', 'Clown show · 1 hour', 'Juegos, globos y concurso de baile para hasta 30 niños.', 'Games, balloons and a dance contest for up to 30 kids.', 180, 'pack', { h: 1, ph: PH['Payasos'] }), sv('Pintacaritas · 2 horas', 'Face painting · 2 hours', 'Hasta 40 caritas, pintura para piel sensible.', 'Up to 40 faces, paint for sensitive skin.', 120, 'pack', { h: 2, ph: PH['Payasos'] })]]],
    'floreria-la-orquidea': [['Flores', 'Flowers', [sv('Ramo de novia', 'Bridal bouquet', 'Lo ves en foto antes de hacerlo; flores de temporada.', 'You see it in a photo first; seasonal flowers.', 150, 'unid', { u: ['ramo', 'bouquet'], ph: PH['Florería'] }), sv('Centro de mesa', 'Centerpiece', 'Precio por mesa; mínimo 10.', 'Price per table; minimum 10.', 35, 'unid', { u: ['mesa', 'table'], ph: PH['Florería'] })]]],
    'sonido-perez': [['Sonido', 'Sound', [sv('Sonido para 150 · 5 horas', 'Sound for 150 · 5 hours', '2 bocinas, consola y micrófono; lo montan y lo recogen.', '2 speakers, mixer and mic; set up and picked up.', 250, 'pack', { h: 5, mont: 1, ph: PH['Renta de sonido'] }), sv('Luces de pista', 'Dance floor lights', 'Luces y máquina de humo.', 'Lights and fog machine.', 120, 'pack', { h: 5, ph: PH['Renta de sonido'] })]]],
    'hazleton-limo': [['Vehículos', 'Vehicles', [sv('Limosina · 3 horas', 'Limo · 3 hours', 'Hasta 10 personas, chofer con licencia; sin alcohol para menores.', 'Up to 10 people, licensed driver; no alcohol for minors.', 450, 'pack', { h: 3, ph: PH['Limosina y party bus'] }), sv('Party bus · 4 horas', 'Party bus · 4 hours', 'Hasta 20 personas, luces y sonido.', 'Up to 20 people, lights and sound.', 750, 'pack', { h: 4, ph: PH['Limosina y party bus'] })]]],
    'salon-los-compadres': [['Salón', 'Hall', [sv('Sábado · 5 horas', 'Saturday · 5 hours', 'Salón para 120 con mesas, sillas y cocina para tu comida.', 'Hall for 120 with tables, chairs and a kitchen for your food.', 950, 'pack', { h: 5, cap: 120, mont: 1, ph: PH['Salón de fiestas'] }), sv('Visita al salón', 'Hall visit', 'Gratis, con cita.', 'Free, by appointment.', 0, 'visita', { ph: PH['Salón de fiestas'] })]]],
    'taquiza-don-chuy': [['Taquiza', 'Taco bar', [sv('Taquiza para 50', 'Taco bar for 50', '4 guisos, tortillas a mano, salsas y 3 horas de servicio.', '4 fillings, handmade tortillas, salsas and 3 hours of service.', 650, 'pack', { h: 3, ph: PH['Taquiza y parrillada'] }), sv('Parrillada para 50', 'Grill for 50', 'Carne asada, pollo, cebollitas y frijoles.', 'Carne asada, chicken, grilled onions and beans.', 850, 'pack', { h: 3, ph: PH['Taquiza y parrillada'] })]]],
    'banda-la-dinastia': [['Música', 'Music', [sv('Banda en vivo · 3 horas', 'Live banda · 3 hours', '10 músicos con su propio sonido.', '10 musicians with their own sound.', 1800, 'pack', { h: 3, ph: PH['Banda & norteño'] }), sv('Norteño · 2 horas', 'Norteño · 2 hours', '4 músicos.', '4 musicians.', 800, 'pack', { h: 2, ph: PH['Banda & norteño'] })]]],
    'fiesta-mart': [['Tienda', 'Store', [sv('Piñata', 'Piñata', 'Hecha aquí; la de tu personaje por encargo.', 'Made here; your character to order.', 25, 'unid', { u: ['piñata', 'piñata'], ph: PH['Tienda de artículos de fiesta'] }), sv('50 invitaciones impresas', '50 printed invitations', 'Listas en 3 días.', 'Ready in 3 days.', 45, 'unid', { u: ['paquete', 'pack'], ph: PH['Tienda de artículos de fiesta'] })]]],
    'invitaciones-gaby': [['Invitaciones', 'Invitations', [sv('50 invitaciones', '50 invitations', 'Diseño contigo y prueba antes de imprimir.', 'Design with you and a proof before printing.', 60, 'unid', { u: ['paquete', 'pack'], ph: PH['Invitaciones e impresión'] }), sv('Invitación digital', 'Digital invitation', 'Para WhatsApp, con confirmación.', 'For WhatsApp, with RSVP.', 25, 'unid', { u: ['diseño', 'design'], ph: PH['Invitaciones e impresión'] })]]],
    'cabina-selfie-hazleton': [['Cabina', 'Booth', [sv('Cabina · 3 horas', 'Booth · 3 hours', 'Fotos ilimitadas impresas, accesorios y galería en línea.', 'Unlimited printed photos, props and online gallery.', 395, 'pack', { h: 3, mont: 1, ph: PH['Cabina de fotos'] }), sv('Hora extra', 'Extra hour', '', '', 95, 'hora', { ph: PH['Cabina de fotos'] })]]],
    'chispas-frias-pa': [['Efectos', 'Effects', [sv('4 máquinas · 2 tiros', '4 machines · 2 shots', 'Chispas frías para el vals o la entrada; con operador y seguro.', 'Cold sparks for the waltz or entrance; operator and insurance.', 450, 'pack', { h: 1, ph: PH['Pirotecnia y chispas frías'] }), sv('Humo bajo para el primer baile', 'Low fog for the first dance', '', '', 250, 'pack', { h: 1, ph: PH['Pirotecnia y chispas frías'] })]]],
    'keystone-eventos': [['Eventos', 'Events', [sv('Planeación del evento', 'Event planning', 'Lugar, proveedores y el día del evento; presupuesto por escrito.', 'Venue, vendors and day-of; budget in writing.', 1200, 'cotiza', { ph: PH['Eventos corporativos'] }), sv('Coordinación del día', 'Day-of coordination', '8 horas.', '8 hours.', 600, 'pack', { h: 8, ph: PH['Eventos corporativos'] })]]]
  });
  const STAFF = {
    'floreria-la-orquidea': [['Orquídea Valdez', 'Dueña · florista', 'Owner · florist', 2011, 5410101, ['es', 'en'], [['Ramos de novia', 'Bridal bouquets'], ['Centros de mesa', 'Centerpieces']], ['Te mando foto del ramo antes de hacerlo; si no te gusta, lo cambio.', 'I send you a photo of the bouquet first; if you do not like it, I change it.'], WK([10, 18], [9, 18], null)]],
    'salon-imperial': [['Rosa Imperial Díaz', 'Dueña', 'Owner', 2012, 37302655, ['es', 'en'], [['Bodas', 'Weddings'], ['Quinces', 'Quinces']], ['Te enseño el salón y te digo qué fechas tengo, sin apuro.', 'I show you the hall and tell you which dates I have, no rush.'], WK([10, 20], [10, 24], [10, 22])], ['Luis Batista', 'Montaje y seguridad', 'Setup and security', 2016, 39284039, ['es', 'en'], [['Montaje', 'Setup']], ['El salón listo 2 horas antes.', 'The hall ready 2 hours early.'], WK([12, 22], [10, 24], [10, 22])]],
    'suenos-de-quince': [['Yamilet Rosario', 'Organizadora · dueña', 'Planner · owner', 2017, 39283716, ['es', 'en'], [['Quinces', 'Quinces'], ['Vestidos', 'Dresses']], ['He organizado más de 200 quinces en Hazleton.', 'I have planned 200+ quinces in Hazleton.'], WK([11, 19], [10, 16])], ['Jonathan Peña', 'Coreógrafo', 'Choreographer', 2019, 10959917, ['es', 'en'], [['Vals', 'Waltz'], ['Sorpresa', 'Surprise dance']], ['Ensayos los sábados en el salón.', 'Rehearsals Saturdays at the hall.'], WK([15, 19], [10, 16])]],
    'hazleton-party-rentals': [['Mike Santana', 'Dueño', 'Owner', 2014, 39283964, ['es', 'en'], [['Carpas', 'Tents']], ['Si llueve, te avisamos el día antes para cambiar la carpa.', 'If it rains, we call the day before to switch the tent.'], WK([8, 18], [8, 20], [8, 14])], ['Kelvin Mota', 'Entregas y montaje', 'Delivery and setup', 2020, 19785046, ['es'], [['Montaje', 'Setup']], ['Llego a la hora que dijimos.', 'I arrive when we said.'], WK([8, 18], [8, 20])]],
    'mariachi-real-hazleton': [['Gerardo Ríos', 'Director', 'Band leader', 2010, 37664403, ['es', 'en'], [['Serenatas', 'Serenades']], ['Llegamos 15 minutos antes, afinados y listos.', 'We arrive 15 minutes early, tuned and ready.'], WK([10, 21], [9, 24], [9, 22])]],
    'momentos-foto-video': [['Paola Almonte', 'Fotógrafa', 'Photographer', 2016, 28386388, ['es', 'en'], [['Quinces', 'Quinces'], ['Bodas', 'Weddings']], ['Te entrego las fotos en 2 semanas o te devuelvo el depósito.', 'Photos in 2 weeks or your deposit back.'], WK([10, 19], [8, 24], [9, 22])], ['Rafael Méndez', 'Videógrafo', 'Videographer', 2018, 39284036, ['es', 'en'], [['Video', 'Video'], ['Dron', 'Drone']], ['Video resumen listo en 10 días.', 'Highlight video ready in 10 days.'], WK([12, 19], [8, 24], [9, 22])]],
    'brincolines-la-alegria': [['Marcos Liriano', 'Dueño', 'Owner', 2021, 34299170, ['es'], [['Inflables', 'Inflatables']], ['Los limpio y reviso antes de cada fiesta.', 'I clean and check them before every party.'], WK([8, 18], [7, 20], [7, 18])]],
    'dj-el-cibaeno': [['Yoel Taveras', 'DJ · dueño', 'DJ · owner', 2015, 3758102, ['es', 'en'], [['Merengue', 'Merengue'], ['Bachata', 'Bachata']], ['Llego una hora antes a montar y probar el sonido.', 'I arrive an hour early to set up and test the sound.'], WK([12, 22], [10, 24], [12, 22])]],
    'globos-y-mas': [['Milagros Peña', 'Decoradora · dueña', 'Decorator · owner', 2020, 6146948, ['es', 'en'], [['Arcos', 'Arches'], ['Mesas de dulces', 'Candy tables']], ['Te mando la foto de los colores antes de inflar.', 'I send you a photo of the colors before inflating.'], WK([10, 19], [8, 18])]],
    'dulce-tentacion': [['Yolanda Báez', 'Repostera · dueña', 'Baker · owner', 2018, 37330783, ['es'], [['Bizcocho dominicano', 'Dominican cake']], ['El bizcocho se hace el día antes, nunca congelado.', 'The cake is baked the day before, never frozen.'], WK([9, 18], [8, 15])]],
    'andrea-events': [['Andrea Fermín', 'Organizadora · dueña', 'Planner · owner', 2014, 6347901, ['es', 'en'], [['Bodas', 'Weddings'], ['Quinces', 'Quinces']], ['Te doy el presupuesto por escrito y lo cuidamos juntas.', 'I give you the budget in writing and we stick to it together.'], WK([10, 18])]],
    'fiestas-magicas': [['Karina Jáquez', 'Organizadora · dueña', 'Planner · owner', 2019, 4473398, ['es', 'en'], [['Cumpleaños', 'Birthdays'], ['Baby shower', 'Baby showers']], ['Los personajes llegan vestidos y se quedan la hora completa.', 'Characters arrive in costume and stay the full hour.'], WK([10, 19], [9, 20], [10, 18])]],
    'patio-en-grande': [['Ramón Ureña', 'Dueño', 'Owner', 2017, 10392126, ['es', 'en'], [['Montajes', 'Setups']], ['Antes de cobrarte, voy a medir tu patio.', 'Before I charge you, I come measure your yard.'], WK([8, 18], [7, 20], [8, 16])]],
    'hora-loca-tropical': [['Franklin Polanco', 'Animador · dueño', 'Host · owner', 2020, 34330228, ['es', 'en'], [['Hora loca', 'Hora loca'], ['Animación', 'Hosting']], ['Llegamos con todo puesto: zancos, máscaras y collares.', 'We arrive ready: stilts, masks and necklaces.'], WK([12, 21], [10, 24], [10, 22])]],
    'barra-movil-tropical': [['Carla Jiménez', 'Dueña · bartender', 'Owner · bartender', 2022, 28386386, ['es', 'en'], [['Cócteles', 'Cocktails']], ['Te ayudo a calcular cuánto comprar para que no sobre.', 'I help you figure out how much to buy so nothing is wasted.'], WK([12, 20], [10, 24], [10, 22])], ['Anthony Reyes', 'Bartender', 'Bartender', 2023, 4560374, ['es', 'en'], [['Mojitos', 'Mojitos']], ['Rápido en la barra.', 'Fast at the bar.'], WK([16, 20], [10, 24], [10, 22])]],
  };
  const ABOUT = {
    'salon-imperial': ['Salón para 250 con mesas, sillas y pista incluidas. Te mostramos el calendario real.', 'Hall for 250 with tables, chairs and dance floor included. We show you the real calendar.', 2012],
    'suenos-de-quince': ['Quinces completos: vestido, coreografía, decoración y el día coordinado.', 'Full quinces: dress, choreography, décor and the day coordinated.', 2017],
    'hazleton-party-rentals': ['Mesas, sillas, carpas y brincolines con entrega y montaje.', 'Tables, chairs, tents and bounce houses with delivery and setup.', 2014],
    'dj-el-cibaeno': ['DJ de merengue y bachata para fiestas en todo el condado.', 'Merengue and bachata DJ for parties across the county.', 2015],
    'mariachi-real-hazleton': ['Mariachi de 7 músicos para serenatas y fiestas.', 'Seven-piece mariachi for serenades and parties.', 2010],
    'globos-y-mas': ['Arcos, fondos y mesas de dulces con tus colores.', 'Arches, backdrops and candy tables in your colors.', 2020],
    'momentos-foto-video': ['Fotos y video de quinces y bodas. Entrega en 2 semanas.', 'Quince and wedding photo and video. Delivered in 2 weeks.', 2016],
    'dulce-tentacion': ['Bizcocho dominicano por porción para cualquier celebración.', 'Dominican cake by the slice for any celebration.', 2018],
    'brincolines-la-alegria': ['Brincolines limpios, entregados y montados.', 'Clean bounce houses, delivered and set up.', 2021],
    'andrea-events': ['Organizo bodas y quinces de principio a fin.', 'I plan weddings and quinces start to finish.', 2014],
    'barra-movil-tropical': ['Barra móvil con bartenders. Tú traes la bebida.', 'Mobile bar with bartenders. You bring the drinks.', 2022],
    'fiestas-magicas': ['Cumpleaños y baby showers con personajes, magia y juegos.', 'Birthdays and baby showers with characters, magic and games.', 2019],
    'patio-en-grande': ['Convertimos tu patio en salón: carpa, pista, escenario, luz y baños.', 'We turn your backyard into a venue: tent, dance floor, stage, power and restrooms.', 2017],
    'hora-loca-tropical': ['Hora loca, cantante y animador para quinces, bodas y cumpleaños.', 'Hora loca, singer and host for quinces, weddings and birthdays.', 2020],
  };
  /* Reseñas: fecha = respetaron la fecha · hora = llegaron a la hora · tot = cobraron lo del paquete · foto = quedó como en las fotos · limp = recogieron */
  const RV = {
    'salon-imperial': [
      { n: 'Yokasta M.', lvl: 4, cnt: 23, d: 12, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'El quince de mi hija quedó precioso. Cobraron lo del paquete, ni un peso más.', en: 'My daughter’s quince was beautiful. They charged the package, not a cent more.', rep: ['Gracias, Yokasta.', 'Thanks, Yokasta.', 10], help: 18 },
      { n: 'Ramón A.', lvl: 6, cnt: 58, d: 40, st: 3, src: 'cita', fecha: 1, hora: 0, tot: 1, foto: 1, limp: 1, es: 'Abrieron 40 minutos tarde y los invitados esperaron afuera.', en: 'They opened 40 minutes late and guests waited outside.', rep: ['Ramón, tienes razón. Te devolvimos la hora extra.', 'Ramón, you are right. We refunded the extra hour.', 38], help: 12 }],
    'suenos-de-quince': [{ n: 'Anny V.', lvl: 4, cnt: 17, d: 20, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Yamilet estuvo en todo. El vals salió perfecto.', en: 'Yamilet handled everything. The waltz was perfect.', help: 15 }],
    'hazleton-party-rentals': [{ n: 'Freddy D.', lvl: 7, cnt: 96, d: 6, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Carpa, mesas y sillas montadas a las 10 como dijeron. Recogieron el lunes.', en: 'Tent, tables and chairs set by 10 as promised. Picked up Monday.', help: 9 }],
    'dj-el-cibaeno': [{ n: 'Mariela S.', lvl: 3, cnt: 9, d: 9, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Puso a bailar hasta a mi abuela. Llegó una hora antes a montar.', en: 'Got even my grandma dancing. Arrived an hour early to set up.', help: 11 }],
    'globos-y-mas': [{ n: 'Carmen G.', lvl: 5, cnt: 41, d: 15, st: 4, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 0, limp: 1, es: 'Bonito, pero los colores no eran exactamente los de la foto.', en: 'Pretty, but the colors were not exactly like the photo.', rep: ['Carmen, faltó un tono. Te lo avisamos tarde; disculpa.', 'Carmen, we ran out of one shade and told you late; sorry.', 14], help: 7 }],
    'momentos-foto-video': [{ n: 'Wilfredo C.', lvl: 5, cnt: 34, d: 30, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Fotos en 12 días. Paola sabe dónde ponerse.', en: 'Photos in 12 days. Paola knows where to stand.', help: 10 }],
    'dulce-tentacion': [{ n: 'Daisy T.', lvl: 1, cnt: 2, d: 5, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'El bizcocho como el de allá. Lo entregaron a tiempo.', en: 'Cake like back home. Delivered on time.', help: 13 }],
    'andrea-events': [{ n: 'Héctor B.', lvl: 2, cnt: 3, d: 25, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Andrea manejó a todos los proveedores. Yo solo disfruté.', en: 'Andrea handled every vendor. I just enjoyed it.', help: 8 }],
  };
  const STATS = { 'salon-imperial': { ver: 120, orders: 110, fecha: 100, hora: 88, tot: 97, foto: 95, limp: 96, trato: 95 }, 'suenos-de-quince': { ver: 70, orders: 60, fecha: 100, hora: 95, tot: 98, foto: 97, limp: 97, trato: 98 },
    'hazleton-party-rentals': { ver: 190, orders: 170, fecha: 99, hora: 93, tot: 98, foto: 96, limp: 95, trato: 95 }, 'dj-el-cibaeno': { ver: 100, orders: 90, fecha: 100, hora: 97, tot: 98, foto: 97, limp: 98, trato: 97 },
    'mariachi-real-hazleton': { ver: 70, orders: 60, fecha: 100, hora: 96, tot: 99, foto: 98, limp: 99, trato: 98 }, 'globos-y-mas': { ver: 90, orders: 80, fecha: 99, hora: 94, tot: 97, foto: 88, limp: 97, trato: 96 },
    'momentos-foto-video': { ver: 80, orders: 70, fecha: 100, hora: 97, tot: 99, foto: 96, limp: 99, trato: 98 }, 'dulce-tentacion': { ver: 160, orders: 150, fecha: 100, hora: 96, tot: 99, foto: 95, limp: 99, trato: 98 } };

  const PEOPLE0 = {}; Object.keys(STAFF).forEach(id => { PEOPLE0[id] = STAFF[id].map(p => ({ ph: p[4], langs: p[5], sp: p[6], bio: p[7], wk: p[8], cert: null, rate: '', dishes: [] })); });
  const CAT0 = { title: ['El equipo', 'The team'], rate: 0, next: 0, cert: 0, cta: 'booking' };
  const mk = (b, r, k) => ({ id: b.id + '-f' + k, name: r.n, lvl: r.lvl, cnt: r.cnt, d: r.d, stars: r.st, src: r.src, fecha: r.fecha, hora: r.hora, tot: r.tot, foto: r.foto, limp: r.limp, es: r.es, en: r.en, reply: r.rep || null, help: r.help || 0, ph: [], rec: [], topics: [] });
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k)); const i = b.id.length;
    return [{ n: ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.'][i % 4], lvl: 3, cnt: 8, d: 6, st: 5, src: 'vis', fecha: 1, hora: 1, tot: 1, es: 'Llegaron el día y a la hora que dijeron.', en: 'They came on the day and at the time they said.', help: 3 }].map((r, k) => mk(b, r, k)); }
  const stats = b => STATS[b.id] || { ver: 0, orders: 0, fecha: 99, hora: 93, tot: 97, foto: 94, limp: 96, trato: 95 };
  function asp(b, st, es) { const E2 = (x, y) => es ? x : y;
    return [['dateFree', E2('RESPETARON LA FECHA', 'KEPT THE DATE'), st.fecha, 'rgba(0,229,196,.16)', '#00695B'], ['clock', E2('LLEGARON A LA HORA', 'ARRIVED ON TIME'), st.hora, 'rgba(255,176,32,.16)', '#8A5A00'],
      ['dollar', E2('COBRARON LO DEL PAQUETE', 'CHARGED THE PACKAGE PRICE'), st.tot, 'rgba(255,176,32,.16)', '#8A5A00'], ['image', E2('QUEDÓ COMO EN LAS FOTOS', 'LOOKED LIKE THE PHOTOS'), st.foto, 'rgba(75,55,245,.1)', '#4B37F5'],
      ['check', E2('RECOGIERON Y LIMPIARON', 'PICKED UP AND CLEANED'), st.limp, 'rgba(11,14,18,.06)', '#0B0E12'], ['heart', E2('TRATO', 'HOW THEY TREATED YOU'), st.trato, 'rgba(0,229,196,.16)', '#00695B']].map(([ic, k, v, bg, fg]) => ({ ic, k, v: v + '%', bg, fg })); }
  const aspNote = (b, st, es) => es ? 'De ' + st.orders + " fiestas reservadas en To'Latino en los últimos 12 meses." : 'From ' + st.orders + " To'Latino-booked parties in the last 12 months.";
  function facts(r, es) { const E2 = (x, y) => es ? x : y, G = '#00695B', R = '#C0392B', A = '#8A5A00', f = [];
    if (r.fecha === 1) f.push(['dateFree', E2('Respetaron la fecha', 'Kept the date'), G]); else if (r.fecha === 0) f.push(['dateFree', E2('Cancelaron la fecha', 'Cancelled the date'), R]);
    if (r.hora === 1) f.push(['clock', E2('A la hora', 'On time'), G]); else if (r.hora === 0) f.push(['clock', E2('Llegaron tarde', 'Arrived late'), A]);
    if (r.tot === 0) f.push(['dollar', E2('Cobraron más del paquete', 'Charged more than the package'), R]);
    if (r.foto === 0) f.push(['image', E2('No quedó como en las fotos', 'Did not look like the photos'), A]);
    return f; }
  function reg() { const X2 = window.TLListing, S2 = window.TLStaff, R2 = window.TLRev, A2 = window.TLAll; if (!X2 || !S2 || !A2) return;
    FI.B.forEach(b => { b.fiesta = 1; if (!A2.B.some(x => x.id === b.id)) A2.B.push(b); });
    if (!X2.ABOUT['salon-imperial']) { Object.keys(SVC).forEach(id => { X2.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, 0, 0])]); }); Object.assign(X2.ABOUT, ABOUT); FI.B.forEach(b => { if (b.addr && !/alrededores/.test(b.addr)) X2.ADDR[b.id] = b.addr + ', Hazleton PA'; }); Object.keys(STAFF).forEach(id => { X2.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]); }); }
    if (!S2.PEOPLE['salon-imperial']) { Object.keys(STAFF).forEach(id => { S2.PEOPLE[id] = PEOPLE0[id]; }); } S2.CAT.fiesta = CAT0;
    if (R2 && !R2._fiesta) { const f = R2.forBiz, st = R2.stats, tp = R2.top, tc = R2.topics; R2._fiesta = 1; R2.forBiz = (b, i) => b.fiesta ? rev(b) : f(b, i); R2.stats = b => b.fiesta ? stats(b) : st(b); R2.top = b => b.fiesta ? [] : tp(b); R2.topics = b => b.fiesta ? [] : tc(b); } }
  reg(); (window.TLReg = window.TLReg || []).push(reg);

  /* ---------- Tu fecha ---------- */
  const EVT = [['quince', 'Quinceañera', 'Quinceañera'], ['boda', 'Boda', 'Wedding'], ['cumple', 'Cumpleaños', 'Birthday'], ['baby', 'Baby shower', 'Baby shower'], ['bautizo', 'Bautizo', 'Baptism'], ['grad', 'Graduación', 'Graduation'], ['empresa', 'Empresa', 'Company']];
  const DATES = [2, 3, 9, 10, 16, 23, 30, 37];
  const GUESTS = [25, 50, 100, 150, 200, 300];
  const WHERE = [['salon', 'En un salón', 'At a venue'], ['casa', 'En mi casa o patio', 'At home or backyard'], ['nose', 'Aún no sé', 'Not sure yet']];
  const fevOf = s => s.fev || null;
  const freeOn = (b, i) => !(b.busy || []).includes(i);
  const nextFree = (b, from) => { const out = []; for (const i of [2, 3, 9, 10, 16, 17, 23, 24, 30, 31, 37]) { if (i >= (from || 0) && freeOn(b, i)) out.push(i); if (out.length >= 3) break; } return out; };
  const capOk = (b, g) => b.cap == null || !g || b.cap >= g;
  function availOf(b, fe, es) { const E2 = (a, c) => es ? a : c; if (!fe || fe.i == null) { const nx = nextFree(b, 2)[0]; return { ok: true, none: true, t: nx != null ? E2('Próxima fecha libre: ', 'Next free date: ') + dayL(nx, es) : E2('Pregunta por fechas', 'Ask for dates'), short: nx != null ? dayL(nx, es) : '—' }; }
    const f = freeOn(b, fe.i), cp = capOk(b, fe.g), alt = nextFree(b, 2).filter(i => i !== fe.i).slice(0, 2);
    if (f && cp) return { ok: true, t: E2('Libre el ', 'Free on ') + dayL(fe.i, es) + (b.cap && fe.g ? E2(' · caben tus ' + fe.g, ' · fits your ' + fe.g) : ''), short: E2('Libre', 'Free') };
    if (!cp) return { ok: false, t: E2('Caben hasta ' + b.cap + ' · tú esperas ' + fe.g, 'Fits up to ' + b.cap + ' · you expect ' + fe.g), short: E2('No caben', 'Too small') };
    return { ok: false, t: E2('Ocupada el ', 'Booked on ') + dayL(fe.i, es) + (alt.length ? E2(' · libre ', ' · free ') + alt.map(i => dayL(i, es)).join(E2(' y ', ' and ')) : ''), short: E2('Ocupada', 'Booked') }; }
  function openFecha(C, s) { const fe = fevOf(s) || {}; C.setState({ hcs: { fiesta: 1, mode: 'form', f: { e: fe.e || '', i: fe.i == null ? '' : fe.i, g: fe.g || '', w: fe.w || '' }, top: s.view === 'desktop' ? C.vTop() : 0 } }); }
  function fechaVals(C, s, es) { const q = s.hcs, E2 = (a, c) => es ? a : c, dk = s.view === 'desktop', f = q.f || {};
    const up = o => C.setState(z => ({ hcs: { ...z.hcs, f: { ...z.hcs.f, ...o } } }));
    const ch = (key, opts) => opts.map(o => ({ l: o[1], v: f[key] === o[0] ? 'selected' : 'filter', onClick: () => up({ [key]: f[key] === o[0] ? '' : o[0] }) }));
    const F = (k, o) => Object.assign({ k, isChips: true, isInput: false, chips: [], val: '', onChange: () => {}, ph: '', hasHint: false, hint: '', hasSuf: false, suf: '' }, o);
    const fields = [F(E2('¿QUÉ CELEBRAS?', 'WHAT ARE YOU CELEBRATING?'), { chips: ch('e', EVT.map(e => [e[0], es ? e[1] : e[2]])) }),
      F(E2('¿QUÉ DÍA?', 'WHICH DAY?'), { chips: ch('i', DATES.map(i => [i, dayL(i, es)])), hasHint: true, hint: E2('Te decimos en cada negocio si esa fecha está libre.', 'We tell you at each business if that date is free.') }),
      F(E2('¿CUÁNTOS INVITADOS?', 'HOW MANY GUESTS?'), { chips: ch('g', GUESTS.map(g => [g, g === 300 ? '300+' : String(g)])) }),
      F(E2('¿DÓNDE?', 'WHERE?'), { chips: ch('w', WHERE.map(w => [w[0], es ? w[1] : w[2]])) })];
    const can = f.i !== '' && f.i != null;
    return { open: !dk, dlg: dk, top: (q.top || 80) + 'px', onClose: () => C.setState({ hcs: null }), stop, isList: false, isForm: true, hasBack: false, onBack: () => {}, onAdd: () => {}, list: [], fields,
      note: LINE[es ? 0 : 1] + ' ' + E2('Guardar tu fecha no aparta nada: solo te muestra quién está libre.', 'Saving your date holds nothing: it only shows who is free.'),
      cta: E2('Ver quién está libre', 'See who is free'), dis: !can, onCta: () => { if (!can) return; C.setState({ fev: { e: f.e, i: +f.i, g: +f.g || 0, w: f.w }, hcs: null }); },
      lbl: { title: E2('Tu fecha', 'Your date'), sub: E2('Día, invitados y dónde. Cambia cuando quieras.', 'Day, guests and where. Change it any time.'), add: '' } }; }

  /* ---------- Precios y rótulos ---------- */
  const svcs = id => SVC[id] || [], flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  const wkOf = id => { const b = biz(id); return [0, 1, 2, 3, 4, 5, 6].map(d => (b.closed || []).includes(d) ? null : d === 0 ? (b.sun || null) : d === 6 ? (b.sat || null) : b.hrs); };
  function priceFor(it, b, es) { const E2 = (a, c) => es ? a : c;
    if (it.k === 'visita') return { l: E2('Gratis', 'Free'), s: '', tot: 0 };
    if (it.k === 'hora') return { l: money(it.p) + E2('/hora', '/hr'), s: it.min ? E2('MÍNIMO ', 'MIN ') + it.min + ' H' : '', tot: it.p };
    if (it.k === 'unid') return { l: (it.p % 1 ? '$' + it.p.toFixed(2) : money(it.p)) + E2(' por ', ' per ') + it.u[es ? 0 : 1], s: '', tot: it.p };
    if (it.k === 'cotiza') return { l: E2('Desde ', 'From ') + money(it.p), s: E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), tot: it.p };
    return { l: money(it.p), s: it.k === 'pack' ? E2('PAQUETE', 'PACKAGE') : '', tot: it.p }; }
  function metaOf(it, b, es) { const E2 = (a, c) => es ? a : c, a = [];
    if (it.k === 'pack' && it.h) a.push(it.h < 1 ? Math.round(it.h * 60) + ' MIN' : it.h + (it.h === 1 ? E2(' HORA', ' HOUR') : E2(' HORAS', ' HOURS'))); if (it.k === 'visita') a.push(E2('VISITA · 30 MIN', 'TOUR · 30 MIN'));
    if (it.cap) a.push(E2('HASTA ', 'UP TO ') + it.cap + E2(' INVITADOS', ' GUESTS')); if (it.mont) a.push(E2('MONTAJE INCLUIDO', 'SETUP INCLUDED'));
    return a.join(' · '); }
  const walkOnly = b => b.tags.includes('walk') && !b.tags.includes('cita') && !b.tags.includes('visita');
  const depOf = b => b.dep || 0;

  /* ---------- Ficha ---------- */
  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), line = LINE[es ? 0 : 1], fe = fevOf(s), av = availOf(b, fe, es);
    const openSheet = key => e => { stop(e); C.setState({ ash: { biz: b.id, own: b.id, key, opt: {}, add: [], stf: 'any', fiesta: 1, qty: 1 }, bshTop: dk ? C.vTop() : 0 }); };
    const dirs = e => { stop(e); C.encargo('APP-MAPA', 'APP-NEG-LISTING · Fiestas · Cómo llegar', b.name, E2('Cómo llegar', 'Directions')); };
    const secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => { const key = si + ':' + ii, P = priceFor(it, b, es), m = metaOf(it, b, es);
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: U(it.ph || b.ph[0], 200), meta: [m, P.s, fe && it.k !== 'visita' ? av.short.toUpperCase() + E2(' EL ', ' ON ') + dayL(fe.i, es).toUpperCase() : ''].filter(Boolean).join(' · '), price: P.l, sym: [], hasPre: false, preL: '', onPre: () => {},
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(key) : () => {}, onBook: openSheet(key), btnL: it.k === 'visita' ? E2('Pedir visita', 'Request tour') : 'Booking' }; }) }));
    const notes = [['dateFree', line + ' ' + E2('Cada negocio muestra su calendario real; el depósito aparta la fecha solo cuando confirman.', 'Each business shows its real calendar; the deposit holds the date only once they confirm.')]];
    if (depOf(b)) notes.push(['dollar', E2('Depósito de ' + money(depOf(b)) + ' para apartar: se cobra al enviar y se descuenta del total. Si no confirman, se devuelve completo.', money(depOf(b)) + ' deposit to hold: charged on sending and credited to the total. If they do not confirm, refunded in full.')]);
    if (tg('traslado') && b.zone) notes.push(['truck', E2('Van a tu lugar hasta ' + b.zone + ' millas de Hazleton.', 'They come to you up to ' + b.zone + ' miles from Hazleton.')]);
    if (tg('montaje')) notes.push(['check', E2('Montaje incluido: llegan antes y recogen al terminar.', 'Setup included: they arrive early and pick up after.')]);
    V.sv = { isChair: false, modes: [], bySvc: true, byPro: false, secs, pros: [], notes: pro ? notes.slice(0, 4).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: false, mine: {}, lbl: { page: '', book: 'Booking' } };
    V.sh = s.ash && s.ash.biz === b.id && s.ash.fiesta ? sheetVals(C, s, es, b) : EMPTY_SH;
    const oc = e => { stop(e); openFecha(C, s); };
    V.ax = { veh: fe ? { has: pro, ic: 'dateFree', k: E2('TU FECHA', 'YOUR DATE'), t: dayL(fe.i, es) + (fe.g ? ' · ' + fe.g + E2(' invitados', ' guests') : ''), hasS: false, s: '', hasP: false, p: '', hasOk: true, okT: av.t, okFg: av.ok ? '#00695B' : '#C0392B', okIc: av.ok ? 'check' : 'warning', cta: E2('Cambiar', 'Change'), onClick: oc }
        : { has: pro, ic: 'dateFree', k: E2('¿ESTÁ LIBRE TU FECHA?', 'IS YOUR DATE FREE?'), t: E2('Agrega tu fecha', 'Add your date'), hasS: false, s: '', hasP: true, p: av.t, hasOk: false, okT: '', okFg: '#00695B', okIc: 'check', cta: E2('Agregar', 'Add'), onClick: oc },
      sz: { has: false, chips: [] }, q: { has: false },
      line: { has: pro, t: line, s: E2('Aquí ves el calendario real, el precio del paquete y lo que incluye. El depósito se devuelve si no te confirman.', 'Here you see the real calendar, the package price and what it includes. The deposit is refunded if they do not confirm.') },
      how: { has: pro, t: line, steps: [E2('Agrega tu fecha: te decimos si está libre.', 'Add your date: we tell you if it is free.'), E2('Pides la fecha y pagas el depósito para apartarla.', 'Request the date and pay the deposit to hold it.'), E2('El negocio confirma por escrito. Si no puede, te devolvemos el depósito completo.', 'The business confirms in writing. If they cannot, the deposit is refunded in full.'), E2('El resto lo pagas como diga el acuerdo, nunca más de lo confirmado.', 'You pay the rest per the agreement, never more than confirmed.')].map((x, i) => ({ n: String(i + 1), t: x })) } };
    V.shop = { items: [], hold: '', hasChips: false, chips: [], empty: true, note: '' };
    V.hx = { gal: { has: false, items: [] } };
    const f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'pack') || f0.find(x => x.k !== 'visita') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    const TD = [[fe ? E2('TU FECHA', 'YOUR DATE') : E2('PRÓXIMA LIBRE', 'NEXT FREE'), fe ? av.short + ' · ' + dayL(fe.i, es) : av.short], [E2('DEPÓSITO', 'DEPOSIT'), depOf(b) ? money(depOf(b)) : E2('No pide', 'None')], b.cap ? [E2('INVITADOS', 'GUESTS'), E2('Hasta ', 'Up to ') + b.cap] : b.zone ? [E2('VA HASTA', 'TRAVELS'), b.zone + ' mi'] : [E2('DESDE', 'FROM'), cP ? cP.l : '—']];
    const AM = { paquete: ['party', 'Paquetes', 'Packages'], montaje: ['check', 'Montaje incluido', 'Setup included'], traslado: ['truck', 'Va a tu lugar', 'Comes to you'], visita: ['pin', 'Visita al salón', 'Venue tour'], esp: ['language', 'Atiende en español', 'Serves in Spanish'], finde: ['calendar', 'Fines de semana', 'Weekends'], noche: ['clock', 'Hasta tarde', 'Late nights'], ninos: ['smile', 'Para niños', 'For kids'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const facts = [{ icon: 'dateFree', k: E2('FECHAS LIBRES', 'FREE DATES'), v: nextFree(b, 2).map(i => dayL(i, es)).join(' · ') || '—' }, { icon: 'dollar', k: E2('DEPÓSITO', 'DEPOSIT'), v: depOf(b) ? money(depOf(b)) + E2(' · se devuelve si no confirman', ' · refunded if not confirmed') : E2('No pide', 'None') },
      { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: tg('esp') ? 'Español · English' : 'English' }, { icon: 'card', k: E2('PAGO', 'PAYMENT'), v: E2('Depósito con tarjeta · el resto como diga el acuerdo', 'Deposit by card · the rest per the agreement') }].map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [[E2('¿Está libre mi fecha?', 'Is my date free?'), E2('Agrega tu fecha arriba y te lo decimos. Próximas libres: ', 'Add your date above and we tell you. Next free: ') + (nextFree(b, 2).map(i => dayL(i, es)).join(', ') || '—') + '.'],
      [E2('¿Qué pasa con el depósito?', 'What about the deposit?'), depOf(b) ? E2('Se cobra al enviar la solicitud y se descuenta del total. Si no confirman o proponen otra fecha que no aceptas, se devuelve completo. Si cancelas después de confirmar, depende de la política del negocio.', 'Charged when you send the request and credited to the total. If they do not confirm or propose another date you decline, refunded in full. If you cancel after confirming, it depends on the business policy.') : E2('No pide depósito.', 'No deposit.')],
      [E2('¿Qué incluye el paquete?', 'What does the package include?'), E2('Cada paquete dice lo que incluye y lo que no. Lo que no está escrito, no está incluido.', 'Each package lists what is and is not included. If it is not written, it is not included.')],
      [E2('¿Y si llueve?', 'What if it rains?'), tg('montaje') ? E2('Te llaman el día antes para cambiar el plan sin costo.', 'They call the day before to change plans at no cost.') : E2('Pregúntalo al pedir la fecha.', 'Ask when requesting the date.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, { cta: walkOnly(b) ? E2('Cómo llegar', 'Directions') : pro ? 'Booking' : t.call, ctaIcon: walkOnly(b) ? 'pin' : pro ? 'calendar' : 'phone', onCta: walkOnly(b) ? dirs : pro ? toSvc : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: false, isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta ? it.meta.charAt(0) + it.meta.slice(1).toLowerCase() : '', price: it.price })),
      amen, facts, faq: pro ? FQ.map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      fromLabel: !pro ? (walkOnly(b) ? E2('Ve directo a la tienda', 'Walk in') : E2('Llama para tu fecha', 'Call about your date')) : cP ? E2('Desde ', 'From ') + cP.l : V.fromLabel, barSub: pro ? (TD[0][0] + ' · ' + TD[0][1]).toUpperCase() : b.zone && !walkOnly(b) ? E2('VA HASTA ', 'TRAVELS ') + b.zone + ' MI' : E2('HOY HASTA LAS ', 'TODAY UNTIL ') + fmt((b.hrs || [9, 17])[1]), svc: [], hasSvc: false,
      railNote: pro ? E2(line + ' Pides la fecha aquí; el negocio confirma por escrito.', line + ' Request the date here; the business confirms in writing.') : E2(line + ' Llama para preguntar por tu fecha.', line + ' Call to ask about your date.'),
      lbl: { ...V.lbl, items: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services') } });
    V.bkRail = { has: pro, rows: TD.map(([k, x]) => ({ k, v: x })), note: V.railNote, hasMine: false, mine: {} };
    V.silla = { has: false };
    const m = window.TLFiestaFlow && window.TLFiestaFlow.mineCard(C, s, es, b); if (m) { V.sv.hasMine = true; V.sv.mine = m; V.bkRail.hasMine = true; V.bkRail.mine = m; }
  }
  function sheetVals(C, s, es, b) { const E2 = (x, y) => es ? x : y, q = s.ash, dk = s.view === 'desktop', [si, ii] = String(q.key).split(':').map(Number), sec = svcs(b.id)[si], it = sec && sec[2][ii]; if (!it) return EMPTY_SH;
    const P = priceFor(it, b, es), fe = fevOf(s), av = availOf(b, fe, es), dep = depOf(b);
    const go = () => { C.setState({ ash: null }); if (window.TLFiestaFlow) return window.TLFiestaFlow.start(C, { biz: b.id, own: b.id, key: q.key }); C.encargo('APP-NEG-FIESTA-BOOKING', 'APP-NEG-LISTING-PRO · Servicios · ' + (es ? it.n : it.ne), b.name + ' · ' + (es ? it.n : it.ne), E2('Booking · Fiestas', 'Booking · Parties')); };
    const veh = { ic: 'dateFree', k: fe ? E2('TU FECHA', 'YOUR DATE') : E2('¿ESTÁ LIBRE TU FECHA?', 'IS YOUR DATE FREE?'), t: fe ? dayL(fe.i, es) + (fe.g ? ' · ' + fe.g + E2(' invitados', ' guests') : '') : E2('Agrégala y te decimos', 'Add it and we tell you'), s: '', hasOk: true, okT: av.t, okFg: av.ok ? '#00695B' : '#C0392B', okIc: av.ok ? 'check' : 'warning', cta: fe ? E2('Cambiar', 'Change') : E2('Agregar', 'Add'), onClick: e => { stop(e); openFecha(C, s); } };
    const inc = (it.inc || []).map(z => ({ t: z[es ? 0 : 1] }));
    const payT = it.k === 'visita' ? E2('La visita es gratis y no aparta la fecha.', 'The tour is free and does not hold the date.') : dep ? E2('Hoy pagas el depósito de ' + money(dep) + ' para apartar la fecha; se descuenta del total. Si no confirman, se devuelve completo.', 'Today you pay the ' + money(dep) + ' deposit to hold the date; credited to the total. If they do not confirm, refunded in full.') : E2('No pide depósito. Pagas como diga el acuerdo.', 'No deposit. You pay per the agreement.');
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop, name: es ? it.n : it.ne, desc: es ? it.d : it.de, bg: U(it.ph || b.ph[0], 700), price: P.l, meta: metaOf(it, b, es),
      groups: [], adds: [], hasAdds: false, hasWho: false, isPick: false, isStaff: false, pros: [], people: [], stf: 'any', onStf: () => {},
      whoPend: false, whoDone: false, whoMeta: '', hasDep: true, depT: payT + ' ' + LINE[es ? 0 : 1], total: P.l,
      durL: P.s || E2('PRECIO', 'PRICE'), cta: it.k === 'visita' ? E2('Pedir visita', 'Request tour') : fe && !av.ok ? E2('Ver otra fecha', 'Pick another date') : E2('Pedir la fecha', 'Request the date'), dis: false, onGo: fe && !av.ok && it.k !== 'visita' ? () => { C.setState({ ash: null }); openFecha(C, s); } : go,
      lbl: { req: '', ready: '', adds: '', addsM: '', who: '', any: '', incK: E2('INCLUYE', 'INCLUDES'), noK: E2('IMPORTANTE', 'IMPORTANT') },
      x: { hasPre: false, preT: '', preS: '', preCta: '', onPre: () => {}, hasVeh: true, veh, hasInc: inc.length > 0, inc, hasNo: false, no: [] } }; }
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), fe = fevOf(s), av = availOf(b, fe, es);
    if (!b.pro) { const wo = walkOnly(b); Object.assign(td, { s: wo ? E2('Tienda: ve directo, no hace falta cita.', 'Store: just walk in, no appointment needed.') : E2('No toma reservas en To\'Latino: llama para preguntar por tu fecha.', 'No To\'Latino bookings: call to ask about your date.') + ' ' + LINE[es ? 0 : 1], cols: [b.cap ? [E2('INVITADOS', 'GUESTS'), E2('Hasta ', 'Up to ') + b.cap] : b.zone && !wo ? [E2('VA HASTA', 'TRAVELS'), b.zone + ' mi'] : null, [E2('IDIOMA', 'LANGUAGE'), tg('esp') ? E2('Español', 'Spanish') : 'English'], [E2('HOY HASTA', 'TODAY UNTIL'), fmt((b.hrs || [9, 17])[1])]].filter(Boolean).map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false }); return; }
    const f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'pack') || f0.find(x => x.k !== 'visita') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    Object.assign(td, { s: E2('Pides la fecha aquí y apartas con depósito; el negocio confirma por escrito. ', 'Request the date here and hold it with a deposit; the business confirms in writing. ') + LINE[es ? 0 : 1],
      cols: [[fe ? E2('TU FECHA', 'YOUR DATE') : E2('PRÓXIMA LIBRE', 'NEXT FREE'), fe ? av.short : av.short], [E2('DEPÓSITO', 'DEPOSIT'), depOf(b) ? money(depOf(b)) : E2('No pide', 'None')], [E2('DESDE', 'FROM'), cP ? cP.l : '—']].map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false });
    const mk = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const T = [trust[0], mk('dateFree', E2('Calendario al día', 'Calendar up to date'), 'ok'), b.cap ? mk('users', E2('Hasta ' + b.cap + ' invitados', 'Up to ' + b.cap + ' guests'), 'info') : tg('traslado') && b.zone ? mk('truck', E2('Va hasta ' + b.zone + ' millas', 'Travels ' + b.zone + ' miles'), 'info') : null, trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }
  window.TLFiestaL = { SVC, STAFF, RV, rev, stats, asp, aspNote, facts, listingAdd, sheetVals, resAdd, priceFor, metaOf, wkOf, svcs, flatOf, walkOnly, depOf, availOf, nextFree, freeOn, fevOf, openFecha, fechaVals, dayL, EVT, DATES, GUESTS, WHERE, PEOPLE0 };
})();

/* ==== prototype/neg-fiesta-flow.js ==== */
/* Fiestas (NEG-FIESTA) — Etapa 3: pedir la fecha (Booking), depósito y estado. Hoy = jue 24 sep 2026, 12:30 PM.
   Tesis: ¿esa fecha está libre? Línea fija: "La fecha no es tuya hasta que te la confirmen." (Booking, revisión, estado).
   Mismas vistas que Salud/Pro/Hogar (ab / ac); estado s.fb (Booking) y s.fcitas.
   APP-NEG-FIESTA-BOOKING: 1 Tu fiesta (qué celebras · invitados · detalles y dirección si van a tu lugar) → 2 Fecha y hora de inicio (calendario real:
     ocupada = no se elige) → 3 Revisa y envía (cantidad según invitados en renta por unidad; hoy pagas el depósito, se descuenta del total;
     el resto el día del evento o como diga el acuerdo). Visita al salón = solicitud sin depósito.
   APP-NEG-FIESTA-CITA: pend (depósito cobrado, "Solicitud enviada", nunca "confirmada") → ok (fecha apartada; acuerdo por escrito) | no (ocupada:
     depósito devuelto + fechas libres) | alt (otra hora) | exp (sin respuesta 24 h: devuelto) → "Pasó la fiesta" → done (estrellas → reseña).
   Cancelar: antes de confirmar = se devuelve; confirmada y faltan 30+ días = se devuelve; menos de 30 días = el depósito se queda.
   RESPUESTA: ok · rechaza → no · nada → exp · cambio → otra hora · tarjeta → tarjeta rechazada al enviar. */
(function boot() {
  const FL = window.TLFiestaL, FI = window.TLFiesta, X = window.TLListing, ALL = window.TLAll, PAY = window.TLPay;
  if (!FL || !FI || !X || !ALL) return setTimeout(boot, 40);
  const fmt = X.fmt, biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const day = i => new Date(2026, 8, 24 + i), cap = x => x.charAt(0).toUpperCase() + x.slice(1), dayL = FL.dayL;
  const DS = [['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']];
  const itOf = (own, key) => { const [si, ii] = String(key).split(':').map(Number), g = FL.svcs(own)[si]; return g && g[2][ii]; };
  const LINE = FI.line, EVT = FL.EVT, GUESTS = FL.GUESTS;
  const DAYS = [2, 3, 8, 9, 10, 15, 16, 17, 22, 23, 24, 29, 30, 31];
  const qtyOf = (it, g) => { if (it.k !== 'unid') return 1; const u = it.u[0]; g = g || 50; return u === 'juego' ? Math.ceil(g / 8) : u === 'mantel' || u === 'mesa' ? Math.ceil(g / 8) : u === 'porción' ? Math.max(20, g) : u === 'mesero' ? Math.max(1, Math.ceil(g / 40)) : 1; };
  const totOf = (it, g) => it.k === 'visita' ? 0 : it.k === 'hora' ? it.p * (it.min || 1) : it.p * qtyOf(it, g);
  const depFor = (b, it, g) => it.k === 'visita' ? 0 : Math.min(FL.depOf(b), totOf(it, g));
  const starts = it => it.k === 'visita' ? [10, 11, 13, 14, 15, 16] : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const busyH = (own, i, h) => { let x = 2166136261; const s = own + '|' + i + '|' + h; for (let k = 0; k < s.length; k++) { x ^= s.charCodeAt(k); x = Math.imul(x, 16777619); } return (x >>> 0) % 1000 / 1000 < .25; };

  function start(C, q, extra) { const s = C.state, it = itOf(q.own, q.key), b = biz(q.own); if (!it || !b) return; const fe = FL.fevOf(s) || {};
    const i0 = fe.i != null && FL.freeOn(b, fe.i) ? fe.i : (FL.nextFree(b, 2)[0] || 2);
    C.setState({ ash: null, fb: { biz: q.biz || q.own, own: q.own, key: q.key, step: 0, i: i0, h: null, e: fe.e || '', g: fe.g || 50, note: '', addr: '', sms: true, pm: null, ...(extra || {}) } });
    C.nav({ code: 'APP-NEG-FIESTA-BOOKING', biz: q.own, from: 'APP-NEG-LISTING · Servicios' }); C.scrollTop(); }

  const AB0 = { lbl: {}, veh: {}, lights: [], phs: [], dirt: [], kinds: [], days: [], slots: [], addrs: [], rows2: [], price: [], cobro: [], pol2: [], bar: {}, dBar: {}, miss: [], cobroBar: {}, dep2: {}, sumH: {} };
  function bookVals(C, s, es) { const q = s.fb; if (!q) return AB0;
    const E2 = (a, b) => es ? a : b, ob = biz(q.own), it = itOf(q.own, q.key); if (!ob || !it) return AB0;
    const up = o => C.setState(z => ({ fb: { ...z.fb, ...o } })), dk = s.view === 'desktop', name = es ? it.n : it.ne || it.n, vis = it.k === 'visita', away = ob.tags.includes('traslado');
    const qty = qtyOf(it, q.g), tot = totOf(it, q.g), dep = depFor(ob, it, q.g), rest = Math.max(0, tot - dep), capBad = it.cap && q.g > it.cap || ob.cap && q.g > ob.cap;
    const days = DAYS.map(i => { const d = day(i), off = !FL.freeOn(ob, i); return { id: 'd' + i, dow: DS[es ? 0 : 1][d.getDay()], num: String(d.getDate()), off }; });
    const free = FL.freeOn(ob, q.i), SLt = free ? starts(it).map(h => ({ h, l: fmt(h), taken: busyH(q.own, q.i, h) })) : [], sel = SLt.find(z => z.h === q.h && !z.taken), whenL = sel ? cap(dayL(q.i, es)) + E2(' · empieza ', ' · starts ') + sel.l : '—';
    const miss = [!vis && !q.e ? E2('Elige qué celebras', 'Pick what you are celebrating') : null, capBad ? E2('Son más invitados de los que caben', 'More guests than fit') : null, !sel ? E2('Elige fecha y hora', 'Pick a date and time') : null, away && !vis && !q.addr ? E2('Elige dónde es la fiesta', 'Pick where the party is') : null].filter(Boolean);
    const ok0 = (vis || !!q.e) && !capBad, ok1 = !!sel && (!away || vis || !!q.addr), can = ok0 && ok1;
    const pmId = q.pm || (PAY ? PAY.cards(s)[0].id : ''), pmL = PAY ? PAY.label(s, pmId) : 'Visa ·· 4242', pmB = PAY ? PAY.badge(s, pmId) : 'VISA';
    const onPm = () => PAY && PAY.open(C, { ctx: 'fb', amt: dep, wallet: true, sel: pmId, declined: q.declined ? pmId : null });
    const qL = it.k === 'unid' ? qty + ' × ' + (it.p % 1 ? '$' + it.p.toFixed(2) : money(it.p)) : it.k === 'hora' ? (it.min || 1) + ' h × ' + money(it.p) : '';
    const cobro = vis ? [[E2('Hoy', 'Today'), '$0', E2('La visita es gratis y no aparta la fecha.', 'The tour is free and does not hold the date.')]] : [[E2('Hoy, al enviar · depósito', 'Today, on sending · deposit'), money(dep), E2('Aparta la fecha cuando confirmen. Si no confirman, se devuelve completo.', 'Holds the date once they confirm. If they do not, it is refunded in full.')], [E2('El día del evento', 'On the event day'), money(rest), E2('A ', 'To ') + ob.name + E2(', como diga el acuerdo por escrito.', ', per the written agreement.')]];
    const cobroRows = cobro.map(([k, v, sub], i) => ({ k, v, s: sub, dot: i === 0 ? '#0B0E12' : 'rgba(11,14,18,.25)' }));
    const evL = (EVT.find(e => e[0] === q.e) || [0, '—', '—'])[es ? 1 : 2];
    const rows = [[E2('SERVICIO', 'SERVICE'), name + (qL ? ' · ' + qL : '')], [E2('FECHA', 'DATE'), whenL]].concat(vis ? [] : [[E2('EVENTO', 'EVENT'), evL + ' · ' + q.g + E2(' invitados', ' guests')]]).concat(away && !vis ? [[E2('DÓNDE', 'WHERE'), q.addr === 'salon' ? E2('En un salón', 'At a venue') : q.addr === 'otra' ? E2('Otra dirección', 'Another address') : q.addr || '—']] : [[E2('DÓNDE', 'WHERE'), (X.ADDR[q.own] || ob.addr || '').replace(', Hazleton PA', '')]]).map(([k, v], i) => ({ k, v, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const pol2 = (vis ? [E2('La visita no aparta la fecha. Si te gusta, pides la fecha con depósito.', 'The tour does not hold the date. If you like it, request the date with a deposit.')] : [E2('Tu depósito de ' + money(dep) + ': si no confirman, proponen otra hora que no aceptas o no contestan en 24 h, se devuelve completo.', 'Your ' + money(dep) + ' deposit: if they do not confirm, propose another time you decline or do not reply within 24 h, it is refunded in full.'), E2('Cancelar: gratis hasta 30 días antes. Después: el depósito se queda con el negocio.', 'Once confirmed: cancel 30+ days before and it is refunded; later, the business keeps it.'), E2('Lo que no está escrito en el paquete, no está incluido.', 'If it is not written in the package, it is not included.')]).map(t => ({ t }));
    const send = () => { if (!can) return; if (!s.user) { C.setState({ auth: { step: 'phone', next: { ...s.route }, top: C.vTop(), ctx: 'bk' } }); return; } if ((s.scen || 'ok') === 'tarjeta' && !q.declined && dep) { up({ declined: true }); return; } sendNow(C, es); };
    const next = () => { if (q.step === 0 && ok0) { up({ step: 1 }); C.scrollTop(); } else if (q.step === 1 && ok1) { up({ step: 2 }); C.scrollTop(); } else if (q.step === 2) send(); };
    const avT = free ? E2('Libre el ', 'Free on ') + dayL(q.i, es) : E2('Ocupada el ', 'Booked on ') + dayL(q.i, es);
    const veh = { ic: 'dateFree', k: E2('TU FECHA', 'YOUR DATE'), t: cap(dayL(q.i, es)), s: (q.g + E2(' INVITADOS', ' GUESTS')), hasOk: true, okT: avT, okFg: free ? '#00695B' : '#C0392B', okIc: free ? 'check' : 'warning', cta: '' };
    return { has: true, cobro: cobroRows, cobroBar: { has: false }, dep2: { has: false }, pol2, sumH: { ph: PX(it.ph || ob.ph[0], 200), k: E2('RESUMEN', 'SUMMARY'), t: name, s: ob.name.toUpperCase() }, rows2: rows,
      title: name, sub: ob.name.toUpperCase(), stepT: [E2('Tu fiesta', 'Your party'), E2('Fecha y hora', 'Date and time'), E2('Revisa y envía', 'Review and send')][q.step], step: q.step + 1, total: 3, isS0: q.step === 0, isS1: q.step === 1, isS2: q.step === 2,
      onBack: () => { if (q.step > 0 && !dk) { up({ step: q.step - 1 }); C.scrollTop(); } else C.nav({ code: 'APP-NEG-LISTING-PRO', biz: q.biz, from: 'APP-NEG-FIESTA-BOOKING' }); },
      veh: { ...veh, onClick: e => stop(e) }, hasMi: false, mi: '', onMi: () => {},
      isEst: !vis, isLav: false, lights: EVT.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.e === k ? 'selected' : 'filter', onClick: () => up({ e: q.e === k ? '' : k }) })),
      note: q.note, onNote: e => up({ note: e.target.value.slice(0, 300) }), noteN: q.note.length + ' / 300', symWarn: false, phs: [], canPh: false, onPh: () => {}, dirt: [], hasDirt: false, dirtNote: '',
      isPreAsk: false, preAsk: false, onPreAsk: () => {}, preBg: '', preX: '', hasPreHint: false, preHint: '', hasPre: capBad, preNote: capBad ? E2('Caben hasta ' + (it.cap || ob.cap) + ' invitados.', 'Fits up to ' + (it.cap || ob.cap) + ' guests.') : '',
      hasKinds: !vis, kinds: GUESTS.map(g => { const on = q.g === g; return { l: (g === 300 ? '300+' : String(g)) + E2(' invitados', ' guests'), p: it.k === 'unid' ? money(it.p * qtyOf(it, g)) : '', bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', onClick: () => up({ g }) }; }),
      days, dSel: 'd' + q.i, onDay: id => up({ i: +id.slice(1), h: null }), slots: SLt.map(z => ({ t: z.l, taken: z.taken })), hSel: sel ? sel.l : '', onH: tl => { const z = SLt.find(y => y.l === tl); if (z) up({ h: z.h }); },
      hasSlots: SLt.length > 0, noSlots: E2('Esa fecha está ocupada. Elige otra.', 'That date is booked. Pick another.'), slotK: vis ? E2('HORA DE LA VISITA', 'TOUR TIME') : E2('HORA DE INICIO', 'START TIME'),
      hasBack: !!it.h, backL: it.h ? (it.h < 1 ? Math.round(it.h * 60) + ' min' : it.h + E2(' horas', ' hours')) : '', backK: E2('DURA', 'LENGTH'),
      isAddr: away && !vis, addrK: E2('¿DÓNDE ES LA FIESTA?', 'WHERE IS THE PARTY?'), addrs: [[s.user ? '112 W Oak St, Hazleton' : '', E2('Tu casa', 'Your home'), '112 W OAK ST · HAZLETON'], ['salon', E2('En un salón', 'At a venue'), E2('ESCRIBE CUÁL EN LA NOTA', 'NAME IT IN THE NOTE')], ['otra', E2('Otra dirección', 'Another address'), E2('ESCRÍBELA EN LA NOTA', 'WRITE IT IN THE NOTE')]].filter(o => o[0]).map(([k, t2, s2]) => { const on = q.addr === k; return { t: t2, s: s2, sFg: 'rgba(11,14,18,.5)', op: 1, bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', onClick: () => up({ addr: k }) }; }), addrNote: ob.zone ? E2('Van hasta ' + ob.zone + ' millas de Hazleton.', 'They travel up to ' + ob.zone + ' miles from Hazleton.') : '',
      price: [{ l: name + (qL ? ' · ' + qL : ''), v: vis ? E2('Gratis', 'Free') : money(tot), fg: '#0B0E12' }], totalK: 'TOTAL', totalV: vis ? '$0' : money(tot), hasEstNote: false, estNote: '',
      pmL, pmB, onPm, declined: !!q.declined, decT: E2('Tu tarjeta fue rechazada. No se cobró nada; cambia la tarjeta.', 'Your card was declined. Nothing was charged; change the card.'),
      hasKeep: false, keepBg: '', keepX: '', onKeep: () => {},
      sms: q.sms, onSms: () => up({ sms: !q.sms }), smsBg: q.sms ? '#0B0E12' : 'rgba(11,14,18,.15)', smsX: q.sms ? '18px' : '2px',
      line: LINE[es ? 0 : 1], miss: miss.map(t => ({ t })), hasMiss: miss.length > 0,
      bar: { k: E2('HOY PAGAS', 'TODAY YOU PAY'), v: money(dep), s: vis ? E2('VISITA GRATIS', 'FREE TOUR') : (E2('RESTO ', 'REST ') + money(rest) + E2(' · EL DÍA DEL EVENTO', ' · ON THE DAY')), cta: q.step < 2 ? E2('Continuar', 'Continue') : E2('Enviar solicitud', 'Send request'), dis: q.step === 0 ? !ok0 : q.step === 1 ? !ok1 : !can, on: next },
      dBar: { cta: E2('Enviar solicitud', 'Send request'), dis: !can, on: send },
      lbl: { secCar: E2('Tu fiesta', 'Your party'), secPre: E2('Antes de enviar', 'Before you send'), goodK: E2('BUENO SABER', 'GOOD TO KNOW'), prefK: E2('PREFERENCIAS', 'PREFERENCES'), howK: E2('CÓMO SE PAGA', 'HOW YOU PAY'), payK: E2('HOY PAGAS', 'TODAY YOU PAY'), back: E2('Volver', 'Back'), vehK: E2('Tu fecha', 'Your date'), miK: '', miPh: '',
        symT: E2('¿Qué celebras?', 'What are you celebrating?'), symS: E2('Y lo que quieras contarles: colores, horario, montaje.', 'And anything else: colors, timeline, setup.'), lightsK: E2('EVENTO', 'EVENT'), notePh: E2('Ej.: quince de Ashley, colores rosa y dorado…', 'E.g. Ashley’s quince, pink and gold…'), phK: '', phAdd: '', symWarn: '',
        kindT: E2('¿Cuántos invitados?', 'How many guests?'), dayT: E2('Fecha y hora', 'Date and time'), priceK: E2('PRECIO', 'PRICE'), pmK: E2('TARJETA DEL DEPÓSITO', 'DEPOSIT CARD'), change: E2('Cambiar', 'Change'),
        keepT: '', keepS: '', smsT: E2('Avisos por SMS', 'Text updates'), smsS: E2('Confirmación y recordatorio una semana antes.', 'Confirmation and a reminder a week before.'), preT: '', preS: '', dirtT: '' } };
  }
  function sendNow(C, es) { const s = C.state, q = s.fb, it = itOf(q.own, q.key), ob = biz(q.own), id = q.edit || ('F-' + (5100 + Math.floor(Math.random() * 800)));
    const addrL = q.addr === 'salon' ? (es ? 'En un salón' : 'At a venue') : q.addr === 'otra' ? (es ? 'Otra dirección' : 'Another address') : q.addr; const x = { id, biz: q.biz, own: q.own, key: q.key, svc: it.n, svcEn: it.ne || it.n, k: it.k, i: q.i, h: q.h, e: q.e, g: q.g, note: q.note, addr: addrL, qty: qtyOf(it, q.g), tot: totOf(it, q.g), dep: depFor(ob, it, q.g), depSt: depFor(ob, it, q.g) ? 'paid' : 'none', st: 'pend', sentAt: '12:31 PM', okAt: '', pm: q.pm || (PAY ? PAY.cards(s)[0].id : '') };
    C.setState(z => ({ fcitas: (z.fcitas || []).filter(y => y.id !== id).concat(x), fb: null, fev: { ...(z.fev || {}), i: q.i, g: q.g, e: q.e } })); C.nav({ code: 'APP-NEG-FIESTA-CITA', biz: q.own, cid: id, from: 'APP-NEG-FIESTA-BOOKING' }); C.scrollTop(); respond(C, id); }
  function upC(C, id, o) { C.setState(z => ({ fcitas: (z.fcitas || []).map(y => y.id === id ? { ...y, ...(typeof o === 'function' ? o(y) : o) } : y) })); }
  const reply = (x, sc) => sc === 'rechaza' ? { st: 'no', depSt: x.dep ? 'back' : 'none' } : sc === 'cambio' ? { st: 'alt', altH: x.h >= 18 ? x.h - 2 : x.h + 2 } : { st: 'ok', okAt: '1:05 PM' };
  function respond(C, id) { clearTimeout(C._fcT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._fcT = setTimeout(() => upC(C, id, x => x.st === 'pend' ? reply(x, sc) : {}), 3500); }

  const AC0 = { lbl: {}, hdr: {}, steps: [], est: { groups: [], rows: [] }, xtra: {}, money: { rows: [] }, rows: [], acts: [], alt: {}, others: [], cx: {}, ready: { rows: [] }, done: { stars: [], rows: [] } };
  function citaVals(C, s, es) { const x = (s.fcitas || []).find(y => y.id === s.route.cid); if (!x) return AC0;
    const E2 = (a, b) => es ? a : b, ob = biz(x.own), up = o => upC(C, x.id, o), st = x.st, name = es ? x.svc : x.svcEn, vis = x.k === 'visita', when = cap(dayL(x.i, es)) + ' · ' + fmt(x.h);
    const evL = (EVT.find(e => e[0] === x.e) || [0, '', ''])[es ? 1 : 2], far = x.i >= 30, rest = Math.max(0, x.tot - x.dep);
    const depT = { paid: E2('Depósito ' + money(x.dep) + ' pagado', money(x.dep) + ' deposit paid'), back: E2('Depósito ' + money(x.dep) + ' devuelto · 3–5 días', money(x.dep) + ' deposit refunded · 3–5 days'), kept: E2('El depósito de ' + money(x.dep) + ' se quedó con el negocio', 'The business kept the ' + money(x.dep) + ' deposit'), none: '' }[x.depSt || 'none'];
    const H = { pend: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, LINE[es ? 0 : 1] + ' ' + E2('Responden en menos de 24 h. ', 'They reply within 24 h. ') + (x.dep ? E2('Si no confirman, te devolvemos el depósito completo.', 'If they do not confirm, the deposit is refunded in full.') : '')],
      ok: ['dateFree', 'rgba(0,229,196,.18)', '#00695B', vis ? E2('VISITA CONFIRMADA', 'TOUR CONFIRMED') : E2('FECHA CONFIRMADA', 'DATE CONFIRMED'), cap(dayL(x.i, es)) + E2(' a las ', ' at ') + fmt(x.h), vis ? E2('La visita no aparta la fecha.', 'The tour does not hold the date.') : E2('La fecha es tuya. Te mandan el acuerdo por escrito con lo que incluye.', 'The date is yours. They send the written agreement with what is included.')],
      alt: ['calendar', 'rgba(255,176,32,.2)', '#8A5A00', E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), cap(dayL(x.i, es)) + E2(' a las ', ' at ') + fmt(x.altH), E2('La fecha está libre, pero a otra hora. Si no te sirve, te devolvemos el depósito.', 'The date is free, but at another time. If it does not work, the deposit is refunded.')],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO PUDIERON', 'NOT AVAILABLE'), E2('Esa fecha ya no está libre', 'That date is no longer free'), (x.dep ? E2('Te devolvimos el depósito completo. ', 'Your deposit was refunded in full. ') : '') + E2('Mira sus fechas libres o busca otro negocio.', 'See their free dates or find another business.')],
      exp: ['clock', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('SIN RESPUESTA', 'NO REPLY'), E2('No contestaron en 24 h', 'No reply within 24 h'), (x.dep ? E2('Te devolvimos el depósito completo. ', 'Your deposit was refunded in full. ') : '') + E2('La fecha no quedó apartada.', 'The date was not held.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('FIESTA TERMINADA', 'PARTY DONE'), E2('Gracias por usar To\'Latino', 'Thanks for using To\'Latino'), E2('Pagaste ', 'You paid ') + money(x.tot) + E2(' en total.', ' in total.')],
      cx: ['close', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('CANCELADA', 'CANCELLED'), E2('Cancelaste la fecha', 'You cancelled the date'), depT || E2('No se cobró nada.', 'Nothing was charged.')] }[st];
    const flow = ['sent', 'ok', 'day', 'done'], pos = { pend: 0, alt: 0, ok: 1, done: 3 }[st];
    const SLb = { sent: E2('Solicitud enviada', 'Request sent'), ok: E2('Fecha confirmada', 'Date confirmed'), day: vis ? E2('Visita', 'Tour') : E2('El día', 'The day'), done: E2('Terminada', 'Done') };
    const steps = pos == null ? [] : flow.map((k, i) => ({ label: SLb[k], time: k === 'sent' ? x.sentAt : k === 'ok' ? x.okAt : k === 'day' ? when : '', state: i < pos || st === 'done' ? 'done' : i === pos ? 'current' : 'next' }));
    const others = ['no', 'exp'].includes(st) ? FL.nextFree(ob, 2).filter(i => i !== x.i).slice(0, 4).map(i => ({ l: cap(dayL(i, es)), onClick: () => start(C, { biz: x.biz, own: x.own, key: x.key }, { i, e: x.e, g: x.g, note: x.note }) })) : [];
    const acts = st === 'pend' || st === 'ok' ? [['calendar', E2('Calendario', 'Calendar'), () => C.encargo('APP-CALENDARIO', 'APP-NEG-FIESTA-CITA', ob.name, E2('Agregar al calendario', 'Add to calendar'))], ['chat', E2('Mensaje', 'Message'), () => C.encargo('APP-NEG-MENSAJE', 'APP-NEG-FIESTA-CITA', ob.name, E2('Mensaje al negocio', 'Message the business'))], ['close', E2('Cancelar', 'Cancel'), () => C.setState({ fcx: x.id })]]
      : st === 'done' ? [['calendar', E2('Otra fiesta', 'Another party'), () => start(C, { biz: x.biz, own: x.own, key: x.key })], ['help', E2('Ayuda con la fiesta', 'Party help'), () => window.TLFiestaRev ? window.TLFiestaRev.startHelp(C, x.id) : C.encargo('APP-NEG-FIESTA-AYUDA', 'APP-NEG-FIESTA-CITA', x.id, E2('Ayuda con la fiesta', 'Party help'))]]
      : st === 'cx' ? [] : [['search', E2('Buscar otro negocio', 'Find another business'), () => C.nav({ code: 'APP-NEG-CAT', cat: 'NEG-FIESTA', from: 'APP-NEG-FIESTA-CITA' })]];
    const rows = [[E2('SERVICIO', 'SERVICE'), name + (x.k === 'unid' ? ' · ' + x.qty : '')], [E2('FECHA', 'DATE'), when]].concat(vis ? [] : [[E2('EVENTO', 'EVENT'), (evL ? evL + ' · ' : '') + x.g + E2(' invitados', ' guests')], [E2('TOTAL', 'TOTAL'), money(x.tot)]]).concat(x.addr ? [[E2('DÓNDE', 'WHERE'), x.addr]] : []).map(([k, v]) => ({ k, v }));
    const mon = !vis && x.dep ? { has: true, rows: [[E2('Depósito', 'Deposit'), money(x.dep), depT], [E2('Resto el día del evento', 'Rest on the day'), money(rest), ['back', 'kept'].includes(x.depSt) ? E2('No se cobra', 'Not charged') : E2('Según el acuerdo', 'Per the agreement')]].map(([k, v, s2]) => ({ k, v, s: s2 })), k: 'TOTAL', v: money(x.tot), s: LINE[es ? 0 : 1] } : { has: false, rows: [] };
    return { has: true, num: (E2('FIESTA #', 'PARTY #') + x.id + ' · ' + ob.name).toUpperCase(), title: name, hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, hasSteps: steps.length > 0, steps, isPend: st === 'pend',
      est: { has: false, groups: [], rows: [] }, xtra: { has: false }, money: mon, ready: { has: false, rows: [] },
      done: { has: st === 'done', t: E2('¿Cómo salió la fiesta?', 'How did the party go?'), s: E2('Tu reseña sale verificada.', 'Your review shows as verified.'), stars: [1, 2, 3, 4, 5].map(n => ({ onClick: () => window.TLFiestaRev ? C.revOpen(x.own, 'cita', n, x.id) : C.encargo('APP-NEG-RESENA', 'APP-NEG-FIESTA-CITA · ' + n + ' estrellas', ob.name, E2('Reseña · Fiestas', 'Review · Parties')) })), rows: [[E2('Fecha', 'Date'), cap(dayL(x.i, es))], [E2('Pagaste', 'You paid'), money(x.tot)]].map(([k, v]) => ({ k, v })) },
      isAlt: st === 'alt', alt: { t: cap(dayL(x.i, es)) + ' · ' + fmt(x.altH || x.h), ok: E2('Aceptar esta hora', 'Accept this time'), no: E2('No me sirve', 'Does not work'), onOk: () => up({ st: 'ok', h: x.altH, okAt: '1:10 PM' }), onNo: () => up({ st: 'no', depSt: x.dep ? 'back' : 'none' }) },
      hasOthers: others.length > 0, others, othersK: E2('FECHAS LIBRES EN ', 'FREE DATES AT ') + ob.name.toUpperCase(),
      rows, acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0, line: LINE[es ? 0 : 1], hasLate: false, lateL: '', onLate: () => {},
      cx: { open: s.fcx === x.id, t: E2('¿Cancelar la fecha?', 'Cancel the date?'), s: st === 'pend' || !x.dep ? E2('Aún no confirman: te devolvemos todo.', 'Not confirmed yet: everything is refunded.') : far ? E2('Faltan 30 días o más: te devolvemos el depósito.', '30+ days away: the deposit is refunded.') : E2('Faltan menos de 30 días: el depósito de ' + money(x.dep) + ' se queda con el negocio.', 'Less than 30 days away: the business keeps the ' + money(x.dep) + ' deposit.'), yes: E2('Sí, cancelar', 'Yes, cancel'), no: 'No',
        onYes: () => { up({ st: 'cx', depSt: !x.dep ? 'none' : st === 'pend' || far ? 'back' : 'kept' }); C.setState({ fcx: null }); }, onNo: () => C.setState({ fcx: null }) },
      onBack: () => C.nav({ code: 'APP-NEG-LISTING-PRO', biz: x.biz, from: 'APP-NEG-FIESTA-CITA' }),
      lbl: { back: E2('Volver al negocio', 'Back to the business'), rowsK: E2('TU FIESTA', 'YOUR PARTY'), estT: '', xtraT: '', moneyT: E2('Tu dinero', 'Your money'), readyT: '', partsK: '', totK: 'TOTAL' } };
  }
  function sim(C, s) { const x = (s.fcitas || []).find(y => y.id === s.route.cid), es = (s.lang || 'es') === 'es'; if (!x) return { has: false }; const sc = s.scen || 'ok';
    if (x.st === 'pend') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 24 h' : '24 h pass') : (es ? 'El negocio responde' : 'Business replies'), on: () => { clearTimeout(C._fcT); upC(C, x.id, sc === 'nada' ? { st: 'exp', depSt: x.dep ? 'back' : 'none' } : reply(x, sc)); } };
    if (x.st === 'ok') return { has: true, l: es ? 'Pasó la fiesta' : 'Party happened', on: () => upC(C, x.id, { st: 'done' }) };
    return { has: false }; }
  function mineCard(C, s, es, b) { const x = (s.fcitas || []).filter(y => y.own === b.id && ['pend', 'ok', 'alt'].includes(y.st)).slice(-1)[0]; if (!x) return null; const E2 = (a, c) => es ? a : c;
    const TG = { pend: [E2('PENDIENTE', 'PENDING'), 'action'], ok: [E2('CONFIRMADA', 'CONFIRMED'), 'signal'], alt: [E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), 'action'] }[x.st];
    return { k: E2('TU FECHA', 'YOUR DATE'), tag: TG[0], tone: TG[1], t: (es ? x.svc : x.svcEn) + ' · ' + cap(dayL(x.i, es)), s: x.dep ? E2('Depósito ', 'Deposit ') + money(x.dep) : '', onClick: () => C.nav({ code: 'APP-NEG-FIESTA-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-LISTING · Tu fecha' }) }; }
  window.TLFiestaFlow = { start, bookVals, citaVals, sim, mineCard, qtyOf, totOf, depFor, itOf, AB0, AC0 };
})();

/* ==== prototype/neg-fiesta-rev.js ==== */
/* Fiestas (NEG-FIESTA) — Etapa 4: reseña de la fiesta + Ayuda con la fiesta. Hoy = jue 24 sep 2026.
   RESEÑA (APP-NEG-RESENA): revWVals llama a TLFiestaRev cuando b.fiesta. Verificada = fiesta 'done' en s.fcitas.
     "Respetaron la fecha" y "cobraron lo del paquete" salen de la reserva (no se editan). Preguntas: llegaron a la hora · quedó como en las fotos ·
     recogieron y limpiaron · trato (visitante también fecha y precio). ≤2 ★ → "la reseña no devuelve dinero" → Ayuda con la fiesta.
   AYUDA (APP-NEG-FIESTA-AYUDA → -ESTADO; vistas pe/ps, TLHogarExt.fhelp): no llegaron · llegaron tarde · no quedó como lo acordado · faltó algo del
     paquete · cobraron más · dañaron algo o no recogieron · otra → detalle + fotos (obligatorias si no quedó como lo acordado, faltó algo o daños)
     → que me devuelvan · un descuento · solo avisar. Respuesta: acepta · propone otra cosa · no acepta → revisión de To'Latino · sin respuesta 48 h. */
(function boot() {
  const SL = window.TLFiestaL, SF = window.TLFiestaFlow, SA = window.TLFiesta, X = window.TLListing, ALL = window.TLAll, HP = window.TLHogarPre;
  if (!SL || !SF || !SA || !X || !ALL || !HP) return setTimeout(boot, 40);
  const biz = id => ALL.B.find(b => b.id === id), money = n => '$' + Math.round(n).toLocaleString('en-US'), fmt = X.fmt;
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 200) + ')';
  const upP = (C, id, o) => C.setState(z => ({ hpres: (z.hpres || []).map(p => p.id === id ? { ...p, ...(typeof o === 'function' ? o(p) : o) } : p) }));
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)' });
  const LINE = SA.line, NOMED = ['Cuenta cómo salió: la hora, el montaje, lo que incluía el paquete.', 'Tell how it went: timing, setup, what the package included.'];
  const withOf = x => '';

  /* ---------- Reseña ---------- */
  const paidOf = x => money(x.tot || 0);
  const cita = (s, bid, cid) => { const L = (s.fcitas || []).filter(x => x.own === bid && x.st === 'done'), x = (cid && L.find(y => y.id === cid)) || L[L.length - 1] || null; return x ? { ...x, withL: withOf(x), total: 0, paid: paidOf(x) } : null; };
  function srcs(ctA, es) { const E2 = (a, b) => es ? a : b;
    return (ctA ? [['cita', E2('Fiesta #', 'Party #') + ctA.id + ' · ' + (es ? ctA.svc : ctA.svcEn), SL.dayL(ctA.i, es), E2('VERIFICADA', 'VERIFIED'), 'signal']] : [])
      .concat([['vis', E2("Reservé sin To'Latino", "I booked without To'Latino"), E2('Por teléfono o sin cita', 'By phone or walk-in'), E2('VISITANTE', 'VISITOR'), 'neutral']]); }
  function groups(G, isCita, ctA, es) { const E2 = (a, b) => es ? a : b;
    return (isCita ? [] : [G(E2('¿RESPETARON LA FECHA?', 'DID THEY KEEP THE DATE?'), 'whoOk', [[1, E2('Sí', 'Yes')], [0, E2('Cancelaron', 'Cancelled')]]), G(E2('¿COBRARON LO DEL PAQUETE?', 'DID THEY CHARGE THE PACKAGE PRICE?'), 'clean', [[1, E2('Sí', 'Yes')], [-1, E2('Cobraron más', 'Charged more')]])])
      .concat([G(E2('¿LLEGARON A LA HORA?', 'DID THEY ARRIVE ON TIME?'), 'wait', [['a', E2('Sí', 'Yes')], ['b', E2('Un poco tarde', 'A bit late')], ['c', E2('Muy tarde', 'Very late')]]),
        G(E2('¿QUEDÓ COMO EN LAS FOTOS?', 'DID IT LOOK LIKE THE PHOTOS?'), 'asked', [[1, E2('Igual o mejor', 'Same or better')], [0, E2('Más o menos', 'Sort of')], [-1, E2('No', 'No')]]),
        G(E2('¿RECOGIERON Y LIMPIARON?', 'DID THEY PICK UP AND CLEAN?'), 'price', [[1, E2('Sí', 'Yes')], [0, E2('No', 'No')]]),
        G(E2('TRATO', 'HOW THEY TREATED YOU'), 'trato', [[1, E2('Con respeto', 'With respect')], [0, E2('Normal', 'Okay')], [-1, E2('Mal trato', 'Treated badly')]])]); }
  function tm(ctA, es) { const E2 = (a, b) => es ? a : b;
    return [[E2('SERVICIO', 'SERVICE'), es ? ctA.svc : ctA.svcEn, '#0B0E12'], [E2('FECHA', 'DATE'), SL.dayL(ctA.i, es) + E2(' · respetada', ' · kept'), '#00695B'], [E2('PAGASTE', 'YOU PAID'), ctA.paid + E2(' · lo del paquete', ' · package price'), '#00695B']].concat(ctA.withL ? [[E2('CON', 'WITH'), ctA.withL, '#0B0E12']] : []).map(([k, v, fg]) => ({ k, v, fg })); }
  function pool(b, ctA, isCita, es) { const L = [].concat(...SL.svcs(b.id).map(g => g[2])); return (isCita && ctA ? [es ? ctA.svc : ctA.svcEn] : []).concat(L.map(it => es ? it.n : it.ne || it.n)).filter((k, i, a) => a.indexOf(k) === i).slice(0, 6); }
  function draft(F, isCita, ctA, es) { return { src: isCita ? 'cita' : 'vis', hot: null, val: null, taste: null, late: null, wait: '', lateK: '', asked: null, price: null, clean: null, trato: F.trato, whoOk: null, pro: isCita && ctA ? ctA.withL : '', cid: isCita && ctA ? ctA.id : '',
    svc: '', fecha: isCita ? 1 : F.whoOk == null ? null : F.whoOk, tot: isCita ? 1 : F.clean == null ? null : F.clean === -1 ? 0 : 1, hora: F.wait == null || F.wait === '' ? null : F.wait === 'a' ? 1 : 0, foto: F.asked == null ? null : F.asked === 1 ? 1 : 0, limp: F.price == null ? null : F.price }; }
  function fix(V, C, s, es, b, isCita, ctA) { const E2 = (a, c) => es ? a : c;
    return { ...V, tmK: E2('TU FIESTA · DATO DE LA RESERVA', 'YOUR PARTY · FROM THE BOOKING'), tmNote: E2("La fecha y lo que pagaste salen de tu reserva en To'Latino. No se editan.", "The date and what you paid come from your To'Latino booking. They cannot be edited."),
      meta: (b.name + (isCita && ctA ? E2(' · FIESTA #', ' · PARTY #') + ctA.id : '')).toUpperCase(),
      lowT: E2('La reseña no devuelve dinero. Si faltó algo del paquete, llegaron tarde o cobraron más, pídelo en Ayuda con la fiesta.', 'A review does not refund money. If something in the package was missing, they were late or charged more, ask in Party help.'),
      onHelpOrd: () => ctA ? startHelp(C, ctA.id) : C.encargo('APP-NEG-FIESTA-AYUDA', 'APP-NEG-RESENA', b.name, E2('Ayuda con la fiesta', 'Party help')),
      lbl: { ...V.lbl, srcNote: E2("Solo sale verificada si reservaste por To'Latino.", "It only shows as verified if you booked through To'Latino."), aspK: E2('LO QUE IMPORTA EN UNA FIESTA', 'WHAT MATTERS FOR A PARTY'), recK: E2('¿QUÉ SERVICIO RECOMIENDAS?', 'WHICH SERVICE DO YOU RECOMMEND?'), recS: E2('Opcional. Sale en tu reseña.', 'Optional. Shows in your review.'),
        textPh: NOMED[es ? 0 : 1], helpOrd: E2('Ir a Ayuda con la fiesta', 'Go to Party help') } }; }

  /* ---------- Ayuda con la cita ---------- */
  const RSN = [['nollego', 'No llegaron', 'They did not show up', 0], ['tarde', 'Llegaron tarde', 'They arrived late', 0], ['nocomo', 'No quedó como lo acordado', 'Not what was agreed', 1], ['falto', 'Faltó algo del paquete', 'Something in the package was missing', 1], ['cobro', 'Cobraron más del paquete', 'Charged more than the package', 1], ['dano', 'Dañaron algo o no recogieron', 'Damaged something or did not pick up', 1], ['otro', 'Otra cosa', 'Something else', 0]];
  const SOL = [['rev', 'Que me devuelvan', 'Refund me', 'Lo que faltó o se cobró de más'], ['corr', 'Un descuento', 'A discount', 'Lo acuerdas con el negocio'], ['avis', 'Solo quiero avisar', 'I just want to let them know', 'Lo lee el negocio y To\'Latino']];
  const isBill = r => { const z = RSN.find(y => y[0] === r); return !!(z && z[3]); };
  function startHelp(C, cid) { const x = (C.state.fcitas || []).find(y => y.id === cid); if (!x) return; const open = (C.state.hpres || []).find(p => p.mode === 'fhelp' && p.cid === cid && !['done'].includes(p.st));
    if (open) { C.nav({ code: 'APP-NEG-FIESTA-AYUDA-ESTADO', biz: x.own, pid: open.id, from: 'APP-NEG-FIESTA-CITA' }); C.scrollTop(); return; }
    C.setState({ hpe: { mode: 'fhelp', cid, biz: x.biz, own: x.own, r: null, note: '', phs: [], sol: 'rev', amt: '', code: '', areas: [] } }); C.nav({ code: 'APP-NEG-FIESTA-AYUDA', biz: x.own, cid, from: 'APP-NEG-FIESTA-CITA' }); C.scrollTop(); }
  function helpForm(C, s, es) { const q = s.hpe, E2 = (a, b) => es ? a : b, x = (s.fcitas || []).find(y => y.id === q.cid); if (!x) return { has: false };
    const ob = biz(x.own), upF = o => C.setState(z => ({ hpe: { ...z.hpe, ...o } })), bill = isBill(q.r);
    const miss = [!q.r ? E2('Elige qué pasó', 'Pick what happened') : null, q.note.trim().length < 15 ? E2('Cuéntanos qué pasó (15 letras o más)', 'Tell us what happened (15+ characters)') : null, bill && !q.phs.length ? E2('Agrega una foto de cómo quedó o del recibo', 'Add a photo of how it looked or the receipt') : null].filter(Boolean);
    const send = () => { if (miss.length) return; const id = 'Y-' + (2100 + Math.floor(Math.random() * 800)); const p = { id, mode: 'fhelp', cid: x.id, biz: x.biz, own: x.own, r: q.r, note: q.note, phs: q.phs, sol: q.sol, amt: q.amt, st: 'sent', at: '5:40 PM', svc: x.svc, svcEn: x.svcEn, price: paidOf(x) };
      C.setState(z => ({ hpres: (z.hpres || []).concat(p), hpe: null })); C.nav({ code: 'APP-NEG-FIESTA-AYUDA-ESTADO', biz: x.own, pid: id, from: 'APP-NEG-FIESTA-AYUDA' }); C.scrollTop(); respond(C, id); };
    return { has: true, scr: 'APP-NEG-FIESTA-AYUDA', hasVid: false, showPh: true, showNote: true, showCode: bill && q.sol === 'rev', title: E2('Ayuda con la fiesta', 'Party help'), sub: (E2('FIESTA #', 'PARTY #') + x.id + ' · ' + ob.name).toUpperCase(),
      veh: { ic: 'party', k: E2('TU FIESTA', 'YOUR PARTY'), t: es ? x.svc : x.svcEn, s: SL.dayL(x.i, es).toUpperCase(), hasOk: true, okT: E2('Pagaste: ', 'You paid: ') + paidOf(x), okFg: '#00695B', okIc: 'check', cta: E2('Ver', 'See'), onClick: () => C.nav({ code: 'APP-NEG-FIESTA-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-FIESTA-AYUDA' }) },
      lights: RSN.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.r === k ? 'selected' : 'filter', onClick: () => upF({ r: q.r === k ? null : k }) })), note: q.note, onNote: e => upF({ note: e.target.value.slice(0, 500) }), noteN: q.note.length + ' / 500',
      code: q.amt, onCode: e => upF({ amt: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) }),
      phs: q.phs.map((p, i) => ({ bg: PX(p.ph), vid: false, onDel: () => upF({ phs: q.phs.filter((_, j) => j !== i) }) })), canPh: q.phs.length < 4, onPh: () => upF({ phs: q.phs.concat([{ ph: [7111490, 7926666, 7688191][q.phs.length % 3], vid: false }]) }), onVid: () => {}, phN: q.phs.length + ' / 4',
      whens: SOL.map(([k, l1, l2, sub]) => ({ l: es ? l1 : l2, s: es ? sub : k === 'rev' ? 'If you were overcharged' : k === 'corr' ? 'They send the corrected bill' : 'Read by the clinic and To\'Latino', hasS: true, ...radio(q.sol === k), onClick: () => upF({ sol: k }) })),
      how: [E2(ob.name + ' recibe tu solicitud y responde en 24 h.', ob.name + ' gets your request and replies within 24 h.'), E2("Si no responde o no estás de acuerdo, To'Latino la revisa en 48 h.", "If they do not reply or you disagree, To'Latino reviews it within 48 h."), E2('Nada se da por resuelto hasta que respondan.', 'Nothing is resolved until they reply.')].map((z, i) => ({ n: String(i + 1), t: z })),
      miss: miss.map(z => ({ t: z })), hasMiss: miss.length > 0, dis: miss.length > 0, onSend: send, cta: E2('Enviar solicitud', 'Send request'), free: E2('RESPONDE EN 24 H', 'REPLIES WITHIN 24 H'),
      onBack: () => C.nav({ code: 'APP-NEG-FIESTA-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-FIESTA-AYUDA' }),
      lbl: { back: E2('Volver', 'Back'), vehT: E2('Tu cita', 'Your appointment'), symT: E2('¿Qué pasó?', 'What happened?'), symS: NOMED[es ? 0 : 1], lightsK: E2('MOTIVO', 'REASON'), notePh: E2('Ej.: el arco llegó a las 6 y la fiesta empezaba a las 5…', 'E.g. the arch arrived at 6 and the party started at 5…'),
        codeK: E2('¿CUÁNTO? · OPCIONAL', 'HOW MUCH? · OPTIONAL'), codePh: E2('Ej.: 60', 'E.g. 60'), phT: bill ? E2('Fotos · obligatorias', 'Photos · required') : E2('Fotos · opcional', 'Photos · optional'), phS: E2('De cómo quedó, lo que faltó o el recibo.', 'Of how it looked, what was missing or the receipt.'), addPh: E2('Foto', 'Photo'), addVid: '', vidTag: '',
        whenT: E2('¿Qué quieres?', 'What would you like?'), howK: E2('CÓMO FUNCIONA', 'HOW IT WORKS'), missK: E2('TE FALTA', 'STILL NEEDED'), honest: LINE[es ? 0 : 1] + ' ' + (q.r === 'nollego' ? E2('Si no llegaron, te devolvemos el depósito mientras revisamos.', 'If they did not show up, your deposit is refunded while we review.') : '') } };
  }
  function reply(p, sc) { const amt = p.amt ? +p.amt : 60; return sc === 'rechaza' ? { st: 'no', repAt: '6:20 PM' } : sc === 'cambio' ? { st: 'alt', repAt: '6:20 PM', altAmt: Math.round(amt * .5) } : { st: 'ok', repAt: '6:20 PM', okAmt: p.sol === 'rev' ? amt : 0 }; }
  function respond(C, id) { clearTimeout(C._fhT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._fhT = setTimeout(() => upP(C, id, p => p.st === 'sent' ? reply(p, sc) : {}), 4000); }
  function helpStatus(C, s, es, p) { const E2 = (a, b) => es ? a : b, ob = biz(p.own), st = p.st, rsn = RSN.find(z => z[0] === p.r), sol = SOL.find(z => z[0] === p.sol);
    const okT = p.sol === 'rev' ? E2('Te devolvemos ', 'Refunding ') + money(p.okAmt || 0) : p.sol === 'corr' ? E2('Te dan un descuento', 'They give you a discount') : E2('Gracias por avisar', 'Thanks for letting us know');
    const H = { sent: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, E2("Responde en 24 h. Si no, To'Latino la revisa en 48 h.", "Replies within 24 h. Otherwise, To'Latino reviews it within 48 h.")],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('ACEPTÓ', 'ACCEPTED'), okT, p.sol === 'rev' ? E2('Vuelve a tu tarjeta en 3–5 días hábiles.', 'Back to your card in 3–5 business days.') : p.sol === 'corr' ? E2('Vuelve a tu tarjeta en 3–5 días hábiles.', 'Back to your card in 3–5 business days.') : ''],
      alt: ['dollar', 'rgba(255,176,32,.2)', '#8A5A00', E2('PROPONE OTRA COSA', 'PROPOSES SOMETHING ELSE'), E2('Devolverte ', 'Refund ') + money(p.altAmt || 0), E2("Tú decides. Si no te sirve, pide revisión a To'Latino.", "You decide. If it does not work for you, ask To'Latino to review.")],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO ACEPTÓ', 'DECLINED'), ob.name + E2(' dice que cumplió lo acordado', ' says they did what was agreed'), E2("Si no estás de acuerdo, To'Latino revisa el paquete y tus fotos en 48 h.", "If you disagree, To'Latino reviews the package and your photos within 48 h.")],
      rev: ['shield', 'rgba(75,55,245,.1)', '#4B37F5', E2("EN REVISIÓN DE TO'LATINO", "UNDER TO'LATINO REVIEW"), E2('Revisamos en 48 h', 'We review within 48 h'), E2('Miramos el paquete, lo que pagaste y tus fotos. Te escribimos por SMS.', 'We look at the package, what you paid and your photos. We will text you.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('LISTO', 'DONE'), p.doneT || '', E2('Gracias por avisarnos.', 'Thanks for letting us know.')] }[st];
    const acts = st === 'ok' ? [['check', E2('Entendido', 'Got it'), () => upP(C, p.id, { st: 'done', doneT: okT })]] : st === 'alt' ? [['dollar', E2('Aceptar ', 'Accept ') + money(p.altAmt || 0), () => upP(C, p.id, { st: 'done', doneT: E2('Devuelto ', 'Refunded ') + money(p.altAmt || 0) })], ['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : st === 'no' ? [['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : [];
    return { has: true, title: E2('Ayuda con la fiesta', 'Party help'), num: (E2('SOLICITUD #', 'REQUEST #') + p.id + E2(' · FIESTA #', ' · PARTY #') + p.cid).toUpperCase(), hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, big: false, small: true,
      steps: [[E2('Enviada', 'Sent'), p.at, 1], [E2('Respuesta de ', 'Reply from ') + ob.name, p.repAt || '', st !== 'sent'], [E2('Resuelta', 'Resolved'), '', st === 'done']].map(([label, time, d], i, a) => ({ label, time, state: d ? 'done' : (i === 0 || a[i - 1][2]) ? 'current' : 'next' })),
      rep: { has: ['ok', 'alt', 'no'].includes(st), who: ob.name, ph: PX(ob.ph[0], 120), at: p.repAt, t: st === 'ok' ? E2('Revisamos y tienes razón. Disculpa el error.', 'We checked and you are right. Sorry for the mistake.') : st === 'alt' ? E2('Tienes razón en parte. Podemos devolverte ' + money(p.altAmt || 0) + '.', 'You are partly right. We can refund ' + money(p.altAmt || 0) + '.') : E2('Entregamos lo que decía el paquete. Si quieres, lo hablamos por teléfono.', 'We delivered what the package said. We can talk by phone if you want.'),
        hasInc: false, inc: [], chg: [], valid: '', time: '', cta: E2('Llamar al negocio', 'Call the business'), onCta: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-FIESTA-AYUDA-ESTADO', ob.name, E2('Llamar al negocio', 'Call the business')) },
      req: { rows: [[E2('MOTIVO', 'REASON'), rsn ? rsn[es ? 1 : 2] : '—'], [E2('QUIERES', 'YOU WANT'), sol ? sol[es ? 1 : 2] : '—']].concat(p.amt ? [[E2('MONTO', 'AMOUNT'), money(+p.amt)]] : []).concat([[E2('LES CONTASTE', 'YOU SAID'), '«' + p.note + '»']]).map(([k, v]) => ({ k, v })), phs: (p.phs || []).map(z => ({ bg: PX(z.ph), vid: false })) },
      hasOthers: false, others: [], acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0,
      onBack: () => C.nav({ code: 'APP-NEG-FIESTA-CITA', biz: p.own, cid: p.cid, from: 'APP-NEG-FIESTA-AYUDA-ESTADO' }),
      lbl: { back: E2('Volver a la fiesta', 'Back to the party'), repK: E2('RESPUESTA DE ', 'REPLY FROM ') + ob.name.toUpperCase(), incK: '', chgK: '', reqK: E2('LO QUE MANDASTE', 'WHAT YOU SENT'), othersK: '', vidTag: '', honest: LINE[es ? 0 : 1] } };
  }
  const EXT = window.TLHogarExt = window.TLHogarExt || {};
  EXT.fhelp = { form: helpForm, status: helpStatus, sim: (C, s, p) => { const es = (s.lang || 'es') === 'es', sc = s.scen || 'ok';
    if (p.st === 'sent') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 24 h' : '24 h pass') : (es ? 'El negocio responde' : 'Business replies'), on: () => { clearTimeout(C._fhT); upP(C, p.id, sc === 'nada' ? { st: 'rev' } : reply(p, sc)); } };
    if (p.st === 'rev') return { has: true, l: es ? "To'Latino decide" : "To'Latino decides", on: () => upP(C, p.id, { st: 'done', doneT: (es ? 'Te devolvemos ' : 'Refunding ') + money(p.amt ? +p.amt : 30) }) };
    return null; } };
  window.TLFiestaRev = { cita, srcs, groups, tm, pool, draft, fix, startHelp };
})();

/* ==== prototype/neg-pro-listing.js ==== */
/* Ficha de Servicios Profesionales (APP-NEG-LISTING-PRO/FREE · NEG-PRO) — datos + motor. Hoy: jue 24 sep 2026, 12:30 PM.
   Tesis: ¿puede hacerlo por ley y cuánto es en total? Línea fija: "Nadie te garantiza un resultado." (ficha, hoja, Booking, estado).
   Servicio k: cons (consulta; p 0 = gratis; cred = se descuenta si lo contratas) · fijo (honorario p + gov = tarifa del gobierno aparte → TOTAL)
     · hora (p por hora; hrs = horas estimadas) · pct (p % solo si ganas) · walk (sin cita, precio por unidad) · cotiza (desde p, total en la consulta).
     mi minutos · rem = también por video o teléfono · who = índices del staff que lo hace · no = lo que NO hacen (honestidad).
   Licencia: tarjeta "¿Puede hacerlo por ley?" (V.ax.veh) con la licencia verificada, qué permite y lo que no puede hacer (b.cant).
   Staff: licencia de cada persona (cert). Reseñas: hizo lo que dijo que podía · cobró el total que dijo · te explicó · en tu idioma · cumplió la fecha · trato.
   Nunca se publica el caso ni datos personales del cliente. Booking y estado = etapa 3 (encargo APP-NEG-PRO-BOOKING). */
(function boot() {
  const X = window.TLListing, SD = window.TLStaff, PR = window.TLPro, ALL = window.TLAll; if (!X || !SD || !PR || !ALL) return setTimeout(boot, 40);
  const NOW = 12.5, fmt = X.fmt, money = n => '$' + Math.round(n).toLocaleString('en-US');
  const U = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const PX = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const day = i => new Date(2026, 8, 24 + i), DS = [['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']];
  const dayS = (i, es) => i === 0 ? (es ? 'Hoy' : 'Today') : i === 1 ? (es ? 'Mañana' : 'Tomorrow') : DS[es ? 0 : 1][day(i).getDay()] + ' ' + day(i).getDate();
  const PH = PR.SUBPH, sv = (n, ne, d, de, p, k, o) => Object.assign({ n, ne, d, de, p, k }, o || {}), W = (...a) => a, WK = (h, sat) => W(null, h, h, h, h, h, sat || null);
  const C_ = (es, en, y) => ({ es, en, ok: 1, exp: ['Vence en ' + y, 'Expires ' + y] });
  const BAR = y => C_('Abogado con licencia en PA · Colegio de Abogados verificado', 'Licensed PA attorney · Bar verified', y);
  const LINE = PR.line;

  const SVC = {
    'bufete-almonte': [['Inmigración', 'Immigration', [
      sv('Consulta de inmigración', 'Immigration consultation', 'Una abogada revisa tu caso, te dice qué opciones tienes y cuánto cuesta cada una. Se descuenta si la contratas.', 'An attorney reviews your case, tells you your options and what each costs. Credited if you hire.', 75, 'cons', { mi: 45, rem: 1, cred: 1, ph: PH['Abogado de inmigración'], who: [0, 1] }),
      sv('Renovar la green card (I-90)', 'Renew green card (I-90)', 'Llenan y envían el formulario, revisan tus papeles y te acompañan hasta la cita de huellas.', 'They fill and file the form, check your papers and guide you to the biometrics appointment.', 350, 'fijo', { gov: 465, mi: 60, rem: 1, ph: PH['n:greencard'], who: [0, 1, 2] }),
      sv('Ciudadanía (N-400)', 'Citizenship (N-400)', 'Formulario, revisión de tu historial y preparación para la entrevista y el examen.', 'Form, history review and prep for the interview and test.', 950, 'fijo', { gov: 760, mi: 60, rem: 1, ph: PH['n:ciudadania'], who: [0, 1], no: [['Si tienes un arresto en tu historial, primero hace falta la consulta.', 'If you have an arrest on record, the consultation comes first.']] }),
      sv('Petición familiar (I-130)', 'Family petition (I-130)', 'Para pedir a tu esposo o esposa, hijos o padres.', 'To petition your spouse, children or parents.', 1200, 'fijo', { gov: 675, mi: 60, ph: PH['Ayuda con documentos de inmigración'], who: [0, 1] }),
      sv('Defensa en corte de inmigración', 'Immigration court defense', 'Te representa ante el juez. El precio depende del caso; te lo dan por escrito en la consulta.', 'Represents you before the judge. Price depends on the case; you get it in writing at the consultation.', 3500, 'cotiza', { mi: 60, ph: PH['Abogado de inmigración'], who: [0] })]],
      ['Familia', 'Family', [sv('Divorcio sin pelea', 'Uncontested divorce', 'Cuando los dos están de acuerdo. Incluye los papeles de la corte.', 'When both agree. Includes court papers.', 1100, 'fijo', { gov: 250, mi: 45, ph: PH['Divorcio y custodia'], who: [1] })]]],
    'centro-legal-comunitario': [['Inmigración', 'Immigration', [
      sv('Consulta gratis de inmigración', 'Free immigration consultation', 'Con un representante acreditado por el Departamento de Justicia. Los martes y jueves.', 'With a Department of Justice accredited representative. Tuesdays and Thursdays.', 0, 'cons', { mi: 45, rem: 1, ph: PH['Ayuda con documentos de inmigración'], who: [0, 1] }),
      sv('Renovar DACA', 'Renew DACA', 'Formulario y revisión. El honorario baja según tus ingresos.', 'Form and review. Fee lowers based on income.', 150, 'fijo', { gov: 555, mi: 60, esc: 1, ph: PH['n:greencard'], who: [0, 1] }),
      sv('Permiso de trabajo (I-765)', 'Work permit (I-765)', 'Primera vez o renovación.', 'First time or renewal.', 100, 'fijo', { gov: 520, mi: 45, esc: 1, ph: PH['Ayuda con documentos de inmigración'], who: [0, 1] }),
      sv('Ciudadanía (N-400)', 'Citizenship (N-400)', 'Te ayudan a pedir que te quiten la tarifa del gobierno si calificas.', 'They help you request a government fee waiver if you qualify.', 200, 'fijo', { gov: 760, mi: 60, esc: 1, ph: PH['n:ciudadania'], who: [0, 1], no: [['No lleva casos en corte: te refiere a un abogado.', 'Does not take court cases: refers you to an attorney.']] })]],
      ['Documentos', 'Documents', [sv('Pasaporte y actas dominicanas', 'Dominican passport and records', 'Te llenan la solicitud y te dicen qué llevar al consulado de Nueva York.', 'They fill the application and tell you what to bring to the New York consulate.', 40, 'fijo', { gov: 110, mi: 30, ph: PH['Trámites de consulado y pasaporte'], who: [2] })]]],
    'multiservicios-la-patria': [['Documentos', 'Documents', [
      sv('Notarizar una firma', 'Notarize a signature', 'Traes tu documento sin firmar y una identificación con foto.', 'Bring your unsigned document and a photo ID.', 5, 'walk', { mi: 10, ph: PH['Notario público'], who: [0], no: [['Notaria no es abogada: no llena formularios de inmigración ni da consejo legal.', 'A notary is not a lawyer: no immigration forms or legal advice.']] }),
      sv('Traducción certificada de un acta', 'Certified translation of a record', 'Nacimiento, matrimonio o divorcio. La acepta USCIS. Lista en 24 h.', 'Birth, marriage or divorce. USCIS accepts it. Ready in 24 h.', 30, 'walk', { mi: 10, ph: PH['Traducción certificada'], who: [1] }),
      sv('Poder notarial para República Dominicana', 'Power of attorney for the Dominican Republic', 'Redactado, notarizado y con apostilla del estado.', 'Drafted, notarized and apostilled by the state.', 85, 'fijo', { gov: 15, mi: 30, ph: PH['Apostilla y legalización'], who: [0] }),
      sv('Pasaporte dominicano', 'Dominican passport', 'Llenamos la solicitud y te sacamos las fotos.', 'We fill the application and take your photos.', 35, 'fijo', { gov: 110, mi: 30, ph: PH['Trámites de consulado y pasaporte'], who: [0, 2] })]],
      ['Envíos y pagos', 'Transfers & bills', [sv('Envío a República Dominicana', 'Send to the Dominican Republic', 'Llega hoy a Banreservas, Popular o para recoger. Ves la tasa antes de pagar.', 'Arrives today at Banreservas, Popular or for pickup. See the rate before paying.', 4.99, 'walk', { mi: 10, ph: PH['Envío de dinero y remesas'], who: [2] })]]],
    'rosario-tax-itin': [['Impuestos', 'Taxes', [
      sv('Declaración con W-2', 'Return with W-2', 'Federal y de Pennsylvania. Te dicen el reembolso antes de firmar.', 'Federal and Pennsylvania. They tell you the refund before you sign.', 95, 'fijo', { mi: 45, rem: 1, ph: PH['Preparación de impuestos'], who: [0, 1, 2], no: [['Nadie puede prometerte un reembolso: depende de tus papeles.', 'No one can promise a refund: it depends on your paperwork.']] }),
      sv('Declaración con 1099 o negocio propio', 'Return with 1099 or self-employed', 'Con gastos del trabajo, millas y herramientas.', 'With work expenses, miles and tools.', 175, 'fijo', { mi: 60, rem: 1, ph: PH['Contador'], who: [0, 1] }),
      sv('Declaraciones atrasadas', 'Late returns', 'Por año atrasado. Te dicen si debes algo antes de enviar.', 'Per late year. They tell you if you owe before filing.', 120, 'fijo', { mi: 60, ph: PH['Preparación de impuestos'], who: [0] })]],
      ['ITIN', 'ITIN', [sv('Solicitud de ITIN (W-7)', 'ITIN application (W-7)', 'Agente certificador del IRS: verifican tu pasaporte aquí y no lo mandas por correo.', 'IRS Certifying Acceptance Agent: they verify your passport here so you do not mail it.', 175, 'fijo', { gov: 0, mi: 45, ph: PH['Solicitud de ITIN'], who: [0, 3] }),
      sv('Renovar ITIN', 'Renew ITIN', 'Si no lo usaste en 3 años o venció.', 'If unused for 3 years or expired.', 125, 'fijo', { mi: 30, ph: PH['n:itin'], who: [0, 3] })]],
      ['Tu negocio', 'Your business', [sv('Libros y nómina por mes', 'Monthly books and payroll', 'Hasta 5 empleados.', 'Up to 5 employees.', 150, 'fijo', { mi: 60, rem: 1, ph: PH['Contabilidad y libros'], who: [0], mes: 1 })]]],
    'mercedes-guzman-cpa': [['Servicios', 'Services', [
      sv('Consulta con la contadora', 'Consultation with the CPA', 'Impuestos, cartas del IRS o abrir un negocio. Por video o en la oficina.', 'Taxes, IRS letters or starting a business. Video or in the office.', 60, 'cons', { mi: 30, rem: 1, cred: 1, ph: PH['Contador'] }),
      sv('Abrir una LLC', 'Form an LLC', 'Registro en Pennsylvania, EIN y cuenta de banco del negocio.', 'Pennsylvania registration, EIN and business bank account.', 450, 'fijo', { gov: 125, mi: 60, rem: 1, ph: PH['Formación de empresa y LLC'] }),
      sv('Carta del IRS', 'IRS letter', 'Te la explico y respondo por ti. Por hora; casi todas toman 1 o 2 horas.', 'I explain it and respond for you. Hourly; most take 1 or 2 hours.', 120, 'hora', { hrs: '1–2', mi: 60, rem: 1, ph: PH['Solicitud de ITIN'] }),
      sv('Nómina por mes', 'Monthly payroll', 'Cheques, impuestos del empleado y W-2 al final del año.', 'Paychecks, employee taxes and year-end W-2s.', 95, 'fijo', { mi: 30, rem: 1, ph: PH['Nómina'], mes: 1 })]]],
    'lcda-ines-cabrera': [['Familia', 'Family', [
      sv('Consulta de familia', 'Family law consultation', 'Divorcio, custodia, manutención o testamento. Te digo el precio total antes de empezar.', 'Divorce, custody, support or will. You get the total before we start.', 60, 'cons', { mi: 45, rem: 1, cred: 1, ph: PH['Derecho familiar'] }),
      sv('Divorcio sin pelea', 'Uncontested divorce', 'Cuando los dos están de acuerdo. Papeles y una audiencia.', 'When both agree. Papers and one hearing.', 1200, 'fijo', { gov: 250, mi: 60, ph: PH['Divorcio y custodia'] }),
      sv('Custodia y visitas', 'Custody and visitation', 'Por hora. Te doy un estimado por escrito después de la consulta.', 'Hourly. Written estimate after the consultation.', 200, 'hora', { hrs: '8–15', mi: 60, ph: PH['Divorcio y custodia'], no: [['La custodia la decide el juez. Nadie te la garantiza.', 'The judge decides custody. No one can guarantee it.']] }),
      sv('Testamento simple', 'Simple will', 'Con poder médico y financiero.', 'With medical and financial power of attorney.', 450, 'fijo', { mi: 60, rem: 1, ph: PH['Testamentos y sucesiones'] })]]],
    'ferreira-injury-law': [['Accidentes', 'Accidents', [
      sv('Consulta gratis de accidente', 'Free accident consultation', 'Carro, trabajo, caída. Te llaman hoy y te dicen si hay caso.', 'Car, work, fall. They call you today and tell you if there is a case.', 0, 'cons', { mi: 30, rem: 1, ph: PH['n:accidente'], who: [0, 1] }),
      sv('Caso de accidente de carro', 'Car accident case', 'Solo cobran si ganas: 33 % de lo que recibas, 40 % si llega a juicio. Si no ganas, no pagas.', 'Paid only if you win: 33% of what you get, 40% if it goes to trial. No win, no fee.', 33, 'pct', { mi: 60, ph: PH['Accidentes y lesiones'], who: [0, 1], no: [['Nadie puede decirte cuánto vas a recibir antes de ver el caso.', 'No one can tell you how much you will get before reviewing the case.']] }),
      sv('Compensación laboral', "Workers' comp", 'Te lastimaste en el trabajo. La ley de PA pone el pago en 20 %.', 'Injured at work. PA law caps the fee at 20%.', 20, 'pct', { mi: 45, ph: PH['Compensación laboral'], who: [1] })]]],
    'seguros-el-cibao': [['Seguros', 'Insurance', [
      sv('Cotización de seguro de auto', 'Auto insurance quote', 'Comparamos 6 compañías y te damos el precio por mes. Con licencia dominicana o internacional también.', 'We compare 6 insurers and give you the monthly price. Dominican or international license welcome.', 0, 'cons', { mi: 20, rem: 1, ph: PH['Seguros de auto'], who: [0, 1, 2] }),
      sv('Seguro de renta', "Renter's insurance", 'Desde $12 al mes. Lo necesita tu landlord en el contrato.', 'From $12 a month. Your landlord may require it.', 12, 'fijo', { mi: 15, rem: 1, ph: PH['Seguros de casa y renta'], mes: 1, who: [1, 2] }),
      sv('Seguro de vida', 'Life insurance', 'Término de 20 años. El precio depende de tu edad y salud.', '20-year term. Price depends on age and health.', 20, 'cotiza', { mi: 30, rem: 1, ph: PH['Seguros de vida y salud'], mes: 1, who: [0] }),
      sv('Seguro de tu negocio', 'Business insurance', 'Para tu bodega, salón o camión.', 'For your bodega, salon or truck.', 60, 'cotiza', { mi: 30, ph: PH['Seguros comerciales'], mes: 1, who: [0] })]]],
    'imprenta-quisqueya': [['Imprenta', 'Printing', [
      sv('500 tarjetas de presentación', '500 business cards', 'A dos lados, listas en 24 h. Si traes tu diseño.', 'Double-sided, ready in 24 h. With your design.', 45, 'fijo', { mi: 15, ph: PH['Imprenta y rótulos'] }),
      sv('Diseño de logo', 'Logo design', '3 ideas y 2 cambios. Te lo damos en todos los formatos.', '3 concepts and 2 revisions. All formats.', 150, 'fijo', { mi: 30, ph: PH['Diseño gráfico y logotipos'] }),
      sv('Rótulo para tu negocio', 'Sign for your business', 'Vinil o luminoso. Se mide en el local.', 'Vinyl or lit. Measured on site.', 250, 'cotiza', { mi: 30, ph: PH['Imprenta y rótulos'] }),
      sv('Camisetas con tu logo', 'T-shirts with your logo', 'Desde 12 piezas, por pieza.', 'From 12 pieces, per piece.', 9, 'fijo', { mi: 15, ph: PH['Bordado y serigrafía'] })]]],
    'tecnofix-hazleton': [['Reparaciones', 'Repairs', [
      sv('Cambio de pantalla', 'Screen replacement', 'iPhone y Samsung. En 1 hora, con 90 días de garantía.', 'iPhone and Samsung. In 1 hour, 90-day warranty.', 89, 'walk', { mi: 60, ph: PH['Reparación de celulares'], no: [['No desbloquea teléfonos reportados o de otra persona.', 'Does not unlock reported phones or phones that are not yours.']] }),
      sv('Diagnóstico', 'Diagnosis', 'Gratis. Te dicen el precio antes de arreglar.', 'Free. You get the price before any repair.', 0, 'walk', { mi: 20, ph: PH['Reparación de computadoras'] }),
      sv('Computadora lenta o con virus', 'Slow computer or virus', 'Limpieza y respaldo de tus fotos.', 'Cleanup and backup of your photos.', 69, 'fijo', { mi: 120, ph: PH['Soporte técnico'] })]]],
    'lopez-defensa-penal': [['Defensa', 'Defense', [
      sv('Consulta gratis', 'Free consultation', 'Arresto, citación o cargos. Si es urgente, te llaman en 15 minutos a cualquier hora.', 'Arrest, summons or charges. If urgent, they call within 15 minutes, any hour.', 0, 'cons', { mi: 30, rem: 1, ph: PH['Defensa penal'], who: [0, 1] }),
      sv('Multa de tránsito', 'Traffic ticket', 'Van a la audiencia por ti. Muchas veces no tienes que ir.', 'They go to the hearing for you. Often you do not need to attend.', 250, 'fijo', { mi: 30, rem: 1, ph: PH['Multas de tránsito y DUI'], who: [1] }),
      sv('Primer DUI', 'First DUI', 'Precio fijo hasta el acuerdo. Si va a juicio, se cotiza aparte.', 'Flat price up to a plea. Trial is quoted separately.', 2500, 'fijo', { mi: 60, ph: PH['Multas de tránsito y DUI'], who: [0], no: [['Nadie puede prometer que retiren los cargos.', 'No one can promise charges will be dropped.']] }),
      sv('Caso penal', 'Criminal case', 'Te dan el total por escrito en la consulta.', 'You get the total in writing at the consultation.', 3000, 'cotiza', { mi: 60, ph: PH['Defensa penal'], who: [0] })]]],
    'peguero-law': [['Bancarrota', 'Bankruptcy', [
      sv('Consulta de bancarrota', 'Bankruptcy consultation', 'Revisa tus deudas y te dice si te conviene, qué protege la ley y cuánto cuesta. Gratis.', 'Reviews your debts and tells you if it makes sense, what the law protects and the cost. Free.', 0, 'cons', { mi: 45, rem: 1, ph: PH['Bancarrota'] }),
      sv('Bancarrota capítulo 7', 'Chapter 7 bankruptcy', 'Formularios, la audiencia con el síndico y el seguimiento hasta el final.', 'Forms, the trustee hearing and follow-up to the end.', 1500, 'fijo', { gov: 338, mi: 60, ph: PH['Bancarrota'], no: [['No todas las deudas se borran: impuestos recientes y manutención se quedan.', 'Not every debt is cleared: recent taxes and child support remain.']] })]],
      ['Bienes raíces', 'Real estate', [sv('Revisión de contrato de compra', 'Purchase contract review', 'Antes de que firmes, con lo que te conviene cambiar.', 'Before you sign, with what you should change.', 350, 'fijo', { mi: 45, rem: 1, ph: PH['Abogado de bienes raíces'] }),
      sv('Cierre de compra', 'Closing', 'Va contigo al cierre y revisa cada papel.', 'Goes with you to closing and checks every paper.', 900, 'fijo', { mi: 90, ph: PH['Abogado de bienes raíces'] })]]],
    'hogar-propio-prestamos': [['Préstamos', 'Loans', [
      sv('Consulta de hipoteca', 'Mortgage consultation', 'Revisa tus ingresos y tu crédito, y te dice cuánto podrías pedir. Gratis.', 'Reviews your income and credit and tells you how much you could borrow. Free.', 0, 'cons', { mi: 40, rem: 1, ph: PH['Broker hipotecario'] }),
      sv('Comparar bancos', 'Compare lenders', 'Te trae ofertas de varios bancos con la tasa, el pago por mes y todos los cargos.', 'Brings offers from several lenders with rate, monthly payment and every fee.', 0, 'cons', { mi: 30, rem: 1, ph: PH['Préstamos'], no: [['Quien aprueba el préstamo es el banco.', 'The lender approves the loan.']] }),
      sv('Préstamo para tu negocio', 'Business loan', 'Para equipo o local; te dicen qué papeles necesitas.', 'For equipment or a space; they tell you which papers you need.', 0, 'cons', { mi: 30, rem: 1, ph: PH['Préstamos'] })]]],
    'ortega-consultoria': [['Consultoría', 'Consulting', [
      sv('Primera cita', 'First meeting', 'Revisamos tu negocio y te digo por escrito qué haría y cuánto cuesta. Gratis.', 'We review your business and I tell you in writing what I would do and the cost. Free.', 0, 'cons', { mi: 45, rem: 1, ph: PH['Consultoría de negocios'] }),
      sv('Plan de negocio', 'Business plan', 'Números, precios y metas; sirve para pedir un préstamo.', 'Numbers, prices and goals; useful for a loan application.', 450, 'fijo', { mi: 60, rem: 1, ph: PH['Consultoría de negocios'] }),
      sv('Ordenar tus precios y costos', 'Pricing and costs review', 'Para saber cuánto ganas de verdad en cada venta.', 'To know what you really earn on each sale.', 300, 'fijo', { mi: 60, rem: 1, ph: PH['Consultoría de negocios'] })]]],
    'solis-foto-video': [['Foto y video', 'Photo and video', [
      sv('Fotos de productos o del menú', 'Product or menu photos', 'Hasta 20 fotos editadas, listas en 5 días.', 'Up to 20 edited photos, ready in 5 days.', 250, 'fijo', { mi: 120, ph: PH['Fotografía comercial'] }),
      sv('Video de 1 minuto', '1-minute video', 'Para redes y tu página, con música y subtítulos.', 'For social and your site, with music and captions.', 600, 'fijo', { mi: 240, ph: PH['Producción de video'] }),
      sv('Retratos del equipo', 'Team portraits', 'En tu local, por persona.', 'At your place, per person.', 45, 'fijo', { mi: 15, ph: PH['Fotografía comercial'] })]]],
    'nunez-software': [['Software', 'Software', [
      sv('Primera llamada', 'First call', 'Me cuentas qué necesitas y te doy el precio total por escrito. Gratis.', 'Tell me what you need and I give you the total in writing. Free.', 0, 'cons', { mi: 30, rem: 1, ph: PH['Desarrollo de software y apps'] }),
      sv('Página para tu negocio', 'Business website', '5 páginas, en español e inglés. Todo queda a tu nombre.', '5 pages, Spanish and English. Everything stays in your name.', 900, 'fijo', { mi: 60, rem: 1, ph: PH['Diseño web'] }),
      sv('App a la medida', 'Custom app', 'Citas, pedidos o inventario. Total por escrito antes de empezar.', 'Bookings, orders or inventory. Total in writing before starting.', 4500, 'cotiza', { mi: 60, rem: 1, ph: PH['Desarrollo de software y apps'] })]]],
    'ventura-arquitectura': [['Planos', 'Plans', [
      sv('Visita para medir', 'Measuring visit', 'Vamos a tu casa o local, medimos y te escuchamos.', 'We visit your home or space, measure and listen.', 150, 'cons', { mi: 60, cred: 1, ph: PH['Arquitectura'] }),
      sv('Planos para permiso', 'Permit plans', 'Firmados y sellados, como los pide la ciudad de Hazleton.', 'Signed and sealed, as Hazleton requires.', 1200, 'cotiza', { mi: 60, ph: PH['Arquitectura'], no: [['El permiso lo aprueba la ciudad; la tarifa de la ciudad va aparte.', 'The city approves the permit; the city fee is separate.']] }),
      sv('Topografía del terreno', 'Land survey', 'Límites y medidas, con plano firmado.', 'Boundaries and measurements, with signed plan.', 650, 'fijo', { mi: 120, ph: PH['Topografía'] })]]],
  };
  /* STAFF: [nombre, rol es, rol en, desde, foto, idiomas, especialidades, bio, semana, cert] */
  Object.assign(SVC, {
    'envios-caribe': [['Envíos', 'Transfers', [sv('Envío a República Dominicana', 'Transfer to the DR', 'El total con la tasa del día antes de pagar.', 'Total with today’s rate before you pay.', 5.99, 'walk', { ph: PH['Envío de dinero y remesas'] }), sv('Cambio de cheque', 'Check cashing', '1 % del cheque, con ID.', '1% of the check, with ID.', 1, 'pct', { s0: ['DEL CHEQUE', 'OF THE CHECK'], ph: PH['Envío de dinero y remesas'] })]]],
    'traducciones-ana-beltre': [['Traducción', 'Translation', [sv('Traducción certificada · por página', 'Certified translation · per page', 'Actas, diplomas y récords; lista en 2 días.', 'Birth certificates, diplomas and records; ready in 2 days.', 35, 'fijo', { mi: 15, rem: 1, ph: PH['Traducción certificada'] }), sv('Apostilla', 'Apostille', 'Te dicen qué paga el estado aparte.', 'State fee stated separately.', 75, 'fijo', { gov: 15, mi: 15, ph: PH['Traducción certificada'] })]]],
    'hazleton-notary-tags': [['Notaría', 'Notary', [sv('Notarizar un documento', 'Notarize a document', 'Con tu ID.', 'With your ID.', 5, 'walk', { ph: PH['Notario público'] }), sv('Placas y título del carro', 'Tags and title', 'El cargo del estado va aparte y te lo dicen antes.', 'State fees are separate and stated first.', 45, 'fijo', { gov: 0, mi: 20, ph: PH['Notario público'] })]]],
    'fianzas-luzerne': [['Fianzas', 'Bail', [sv('Fianza', 'Bail bond', '10 % de la fianza; te explican en español qué firmas.', '10% of the bail; they explain in Spanish what you sign.', 10, 'pct', { s0: ['DE LA FIANZA', 'OF THE BAIL'], ph: PH['Fianzas'] }), sv('Consulta', 'Consultation', '24 horas, por teléfono.', '24 hours, by phone.', 0, 'cons', { mi: 15, rem: 1, ph: PH['Fianzas'] })]]],
    'agencia-progreso': [['Empleo', 'Jobs', [sv('Registro para buscar trabajo', 'Job seeker sign-up', 'Gratis para ti; nunca te cobran por un empleo.', 'Free for you; never charged for a job.', 0, 'cons', { mi: 30, ph: PH['Agencia de empleo'] }), sv('Recursos humanos para negocios', 'HR for businesses', 'Nómina, I-9 y reglas del trabajo.', 'Payroll, I-9 and workplace rules.', 300, 'cotiza', { ph: PH['Agencia de empleo'] })]]],
    'dr-truck-dispatch': [['Despacho', 'Dispatch', [sv('Despacho de cargas', 'Load dispatch', '5 % por carga; sin contrato largo.', '5% per load; no long contract.', 5, 'pct', { s0: ['POR CARGA', 'PER LOAD'], ph: PH['Despacho de camiones'] }), sv('Papeles DOT y CDL', 'DOT and CDL paperwork', '', '', 150, 'fijo', { mi: 45, rem: 1, ph: PH['Despacho de camiones'] })]]],
    'credito-nuevo': [['Crédito', 'Credit', [sv('Consulta de crédito', 'Credit consultation', 'Revisan tu reporte contigo; gratis.', 'They review your report with you; free.', 0, 'cons', { mi: 30, rem: 1, ph: PH['Reparación de crédito'] }), sv('Plan mensual', 'Monthly plan', 'Cartas de disputa y seguimiento; cancelas cuando quieras.', 'Dispute letters and follow-up; cancel any time.', 79, 'fijo', { mi: 30, rem: 1, ph: PH['Reparación de crédito'] })]]],
    'latino-web-studio': [['Web', 'Web', [sv('Página web', 'Website', 'Hasta 5 páginas, en español e inglés; lista en 3 semanas.', 'Up to 5 pages, Spanish and English; ready in 3 weeks.', 600, 'fijo', { mi: 30, rem: 1, ph: PH['Diseño web'] }), sv('Logotipo', 'Logo', '3 ideas y 2 cambios.', '3 ideas and 2 revisions.', 250, 'fijo', { mi: 30, rem: 1, ph: PH['Diseño web'] })]]],
    'rev-carmen-soto': [['Ceremonias', 'Ceremonies', [sv('Boda', 'Wedding', 'Ceremonia en español o inglés; ensayo incluido.', 'Ceremony in Spanish or English; rehearsal included.', 250, 'fijo', { mi: 60, ph: PH['Oficiante de bodas y eventos'] }), sv('Renovación de votos', 'Vow renewal', '', '', 150, 'fijo', { mi: 45, ph: PH['Oficiante de bodas y eventos'] })]]],
    'paredes-seguridad': [['Seguridad', 'Security', [sv('Guardia para tu evento', 'Event guard', 'Guardia con licencia; mínimo 4 horas.', 'Licensed guard; 4-hour minimum.', 35, 'hora', { ph: PH['Seguridad privada'] }), sv('Investigación privada', 'Private investigation', 'Primero una consulta; el precio por escrito.', 'Consultation first; price in writing.', 400, 'cotiza', { ph: PH['Seguridad privada'] })]]],
    'mensajeria-rapida-hzl': [['Mensajería', 'Courier', [sv('Entrega en Hazleton', 'Hazleton delivery', 'El mismo día; foto al entregar.', 'Same day; photo on delivery.', 15, 'fijo', { ph: PH['Mensajería'] }), sv('Documentos a la corte o al condado', 'Court or county filings', '', '', 25, 'fijo', { ph: PH['Mensajería'] })]]],
    'lugo-interiores': [['Diseño', 'Design', [sv('Consulta en tu casa', 'In-home consult', 'Una hora; te dejo ideas y un presupuesto por escrito.', 'One hour; ideas and a written budget.', 95, 'cons', { mi: 60, ph: PH['Diseño de interiores'] }), sv('Diseño de un cuarto', 'One-room design', 'Plano, colores y lista de compras.', 'Layout, colors and shopping list.', 450, 'fijo', { mi: 60, ph: PH['Diseño de interiores'] })]]]
  });
  const STAFF = {
    'peguero-law': [['Lcdo. Rafael Peguero', 'Abogado · socio', 'Attorney · partner', 2013, 7841442, ['es', 'en'], [['Bancarrota', 'Bankruptcy'], ['Compra de casa', 'Home buying']], ['Te digo si la bancarrota te conviene o no. A veces la respuesta es no.', 'I tell you whether bankruptcy makes sense. Sometimes the answer is no.'], WK([9, 18]), BAR('dic 2027')]],
    'hogar-propio-prestamos': [['Lucía Ferraro', 'Originadora de préstamos · NMLS', 'Loan originator · NMLS', 2017, 26692095, ['es', 'en'], [['Primera casa', 'First home'], ['ITIN', 'ITIN']], ['Te enseño la tasa, el pago y cada cargo antes de que firmes nada.', 'I show you the rate, payment and every fee before you sign anything.'], WK([9, 18], [10, 13]), C_('Licencia NMLS de originadora · verificada', 'NMLS loan originator license · verified', 'dic 2026')]],
    'ortega-consultoria': [['Daniela Ortega', 'Consultora · dueña', 'Consultant · owner', 2018, 25651531, ['es', 'en'], [['Restaurantes', 'Restaurants'], ['Precios', 'Pricing']], ['Primero los números: cuánto ganas de verdad en cada venta.', 'Numbers first: what you really earn on each sale.'], WK([9, 17]), null]],
    'solis-foto-video': [['Iván Solís', 'Fotógrafo y videógrafo', 'Photographer and videographer', 2020, 18790049, ['es', 'en'], [['Productos', 'Products'], ['Video', 'Video']], ['Las fotos son tuyas: no las vendo ni las uso sin tu permiso.', 'The photos are yours: I do not sell or use them without permission.'], WK([10, 18], [9, 15]), null]],
    'nunez-software': [['Gabriel Núñez', 'Desarrollador · dueño', 'Developer · owner', 2021, 13450799, ['es', 'en'], [['Apps', 'Apps'], ['Páginas web', 'Websites']], ['Todo queda a tu nombre: el dominio, las cuentas y el código.', 'Everything stays in your name: domain, accounts and code.'], WK([9, 18]), null]],
    'ventura-arquitectura': [['Arq. Raquel Ventura', 'Arquitecta · directora', 'Architect · director', 2012, 8279501, ['es', 'en'], [['Remodelaciones', 'Remodels'], ['Permisos', 'Permits']], ['Antes de dibujar, voy a medir y a escucharte.', 'Before drawing, I come to measure and listen.'], WK([8, 17]), C_('Licencia de arquitecta de PA · verificada', 'PA architect license · verified', 'jun 2027')]],
    'bufete-almonte': [
      ['Lcda. Patricia Almonte', 'Abogada de inmigración · socia', 'Immigration attorney · partner', 2010, 5699505, ['es', 'en'], [['Ciudadanía', 'Citizenship'], ['Corte', 'Court']], ['Nací en Santo Domingo. Te digo lo que se puede y lo que no, aunque no sea lo que quieres oír.', 'I was born in Santo Domingo. I tell you what can and cannot be done, even if it is not what you want to hear.'], WK([9, 18], [9, 13]), BAR('dic 2027')],
      ['Lcdo. Julio Taveras', 'Abogado de inmigración y familia', 'Immigration and family attorney', 2016, 31409070, ['es', 'en'], [['Familia', 'Family'], ['Green card', 'Green card']], ['Llevo peticiones familiares y divorcios. Te explico cada formulario.', 'I handle family petitions and divorces. I walk you through every form.'], WK([10, 18], [9, 13]), BAR('jun 2027')],
      ['Rosanna Pichardo', 'Asistente legal', 'Paralegal', 2014, 28386396, ['es', 'en'], [['Formularios', 'Forms'], ['Seguimiento', 'Follow-up']], ['Reviso tus papeles antes de que la abogada los firme y te aviso de cada paso de USCIS.', 'I check your papers before the attorney signs and update you at every USCIS step.'], WK([9, 18], [9, 13])]],
    'centro-legal-comunitario': [
      ['Ana Lucía Veras', 'Representante acreditada (DOJ)', 'DOJ accredited representative', 2015, 37302652, ['es', 'en'], [['DACA', 'DACA'], ['Ciudadanía', 'Citizenship']], ['Aquí nadie paga lo que no puede. Si tu caso necesita abogado, te digo a quién ir.', 'No one here pays what they cannot. If your case needs a lawyer, I tell you where to go.'], WK([9, 17]), C_('Representante acreditada · Departamento de Justicia · verificada', 'Accredited representative · Department of Justice · verified', 'mar 2027')],
      ['Carlos Mejía', 'Representante acreditado (DOJ)', 'DOJ accredited representative', 2019, 22719301, ['es', 'en'], [['Permisos de trabajo', 'Work permits']], ['Veo las consultas gratis de los martes.', 'I run the free Tuesday consultations.'], WK([9, 17]), C_('Representante acreditado · Departamento de Justicia · verificado', 'Accredited representative · Department of Justice · verified', 'ago 2027')],
      ['Yudelka Rosario', 'Documentos y consulado', 'Documents and consulate', 2017, 28386378, ['es'], [['Pasaportes', 'Passports'], ['Actas', 'Records']], ['Te lleno la solicitud del consulado y te digo qué llevar.', 'I fill out your consulate application and tell you what to bring.'], WK([9, 17])],
      ['Miguel Ángel Cruz', 'Coordinador', 'Coordinator', 2012, 5931195, ['es', 'en'], [['Citas', 'Appointments']], ['Te doy la cita y te recuerdo qué traer.', 'I book you and remind you what to bring.'], WK([9, 17])]],
    'multiservicios-la-patria': [
      ['Altagracia Núñez', 'Notaria · dueña', 'Notary · owner', 2005, 35278204, ['es', 'en'], [['Poderes', 'Powers of attorney'], ['Apostilla', 'Apostille']], ['Soy notaria, no abogada. Si tu caso es de inmigración, te mando a quien sí puede.', 'I am a notary, not a lawyer. If your case is immigration, I send you to someone who can.'], WK([9, 19], [9, 15]), C_('Notaria comisionada en PA · verificada', 'PA commissioned notary · verified', 'ene 2028')],
      ['Luis Emilio Durán', 'Traductor certificado', 'Certified translator', 2012, 20586318, ['es', 'en'], [['Actas', 'Records'], ['Diplomas', 'Diplomas']], ['Traducciones que acepta USCIS, en 24 horas.', 'USCIS-ready translations in 24 hours.'], WK([10, 19], [9, 15]), C_('Traductor certificado (ATA) · verificado', 'Certified translator (ATA) · verified', 'oct 2027')],
      ['Keyla Santos', 'Envíos y pagos', 'Transfers and bills', 2019, 28386397, ['es', 'en'], [['Envíos', 'Transfers']], ['Te digo la tasa antes de que pagues.', 'I tell you the rate before you pay.'], WK([9, 19], [9, 15])]],
    'rosario-tax-itin': [
      ['Francisco Rosario, EA', 'Agente registrado ante el IRS · dueño', 'IRS Enrolled Agent · owner', 2012, 39283831, ['es', 'en'], [['ITIN', 'ITIN'], ['Cartas del IRS', 'IRS letters']], ['Te digo cuánto te toca antes de que firmes. Si no te toca nada, también te lo digo.', 'I tell you your refund before you sign. If there is none, I tell you that too.'], W([11, 15], [9, 20], [9, 20], [9, 20], [9, 20], [9, 20], [9, 17]), C_('Agente registrado (EA) · IRS · verificado', 'Enrolled Agent (EA) · IRS · verified', 'mar 2028')],
      ['Milagros Peña', 'Preparadora de impuestos', 'Tax preparer', 2016, 37302641, ['es', 'en'], [['W-2', 'W-2'], ['Familias', 'Families']], ['Declaraciones de familia, en español y rápido.', 'Family returns, in Spanish and fast.'], WK([9, 18], [9, 17]), C_('Preparadora con PTIN · IRS · verificada', 'PTIN preparer · IRS · verified', 'dic 2026')],
      ['Joel Almonte', 'Preparador de impuestos', 'Tax preparer', 2021, 39283983, ['es', 'en'], [['1099', '1099'], ['Uber y DoorDash', 'Uber and DoorDash']], ['Si trabajas por tu cuenta, te ayudo a descontar las millas.', 'If you are self-employed, I help you deduct your miles.'], WK([12, 20], [9, 17]), C_('Preparador con PTIN · IRS · verificado', 'PTIN preparer · IRS · verified', 'dic 2026')],
      ['Daniela Reyes', 'Agente certificadora de ITIN', 'ITIN Certifying Acceptance Agent', 2019, 39283836, ['es', 'en'], [['ITIN', 'ITIN']], ['Verifico tu pasaporte aquí mismo; no lo mandas por correo.', 'I verify your passport right here; you do not mail it.'], WK([9, 17]), C_('Agente certificadora (CAA) · IRS · verificada', 'Certifying Acceptance Agent (CAA) · IRS · verified', 'jul 2027')]],
    'mercedes-guzman-cpa': [['Mercedes Guzmán, CPA', 'Contadora pública certificada', 'Certified Public Accountant', 2008, 28386379, ['es', 'en'], [['Negocios', 'Businesses'], ['IRS', 'IRS']], ['Trabajo sola y contesto yo misma. Te doy el precio completo antes de empezar.', 'I work alone and answer myself. You get the full price before I start.'], W(null, [9, 17], [9, 17], [9, 17], [9, 17], [9, 17], null), C_('CPA con licencia en PA · verificada', 'PA licensed CPA · verified', 'jun 2028')]],
    'lcda-ines-cabrera': [['Lcda. Inés Cabrera', 'Abogada de familia', 'Family law attorney', 2017, 33438842, ['es', 'en'], [['Divorcio', 'Divorce'], ['Custodia', 'Custody']], ['Te digo el total antes de empezar y te llamo yo con cada novedad.', 'I tell you the total before we start and I call you with every update.'], W(null, [9, 17], [9, 17], [9, 17], [9, 17], [9, 17], null), BAR('abr 2028')]],
    'ferreira-injury-law': [
      ['Lcdo. Rafael Ferreira', 'Abogado de accidentes · socio', 'Injury attorney · partner', 2004, 19785045, ['es', 'en'], [['Accidentes de carro', 'Car accidents'], ['Juicios', 'Trials']], ['Si no hay caso, te lo digo en la primera llamada y no te cobro nada.', 'If there is no case, I tell you on the first call and charge nothing.'], WK([8, 18], [9, 14]), BAR('sep 2027')],
      ['Lcda. Karina Soto', 'Abogada laboral', 'Workers’ comp attorney', 2018, 39283969, ['es', 'en'], [['Trabajo', 'Work injuries']], ['Te lastimaste trabajando: tienes derechos aunque no tengas papeles.', 'Hurt at work: you have rights even without papers.'], WK([10, 20], [9, 14]), BAR('feb 2028')]],
    'seguros-el-cibao': [
      ['Ramón Estévez', 'Agente de seguros · dueño', 'Insurance agent · owner', 2011, 19785047, ['es', 'en'], [['Auto', 'Auto'], ['Negocios', 'Business']], ['Te comparo las compañías y te digo la más barata, aunque no sea la que más me paga.', 'I compare insurers and show you the cheapest, even if it pays me less.'], WK([9, 18], [10, 14]), C_('Agente con licencia de seguros en PA · verificado', 'PA licensed insurance agent · verified', 'nov 2027')],
      ['Yahaira Cruz', 'Agente de seguros', 'Insurance agent', 2018, 16995710, ['es', 'en'], [['Casa y renta', 'Home and renters']], ['Seguro de renta el mismo día.', 'Renters insurance the same day.'], WK([9, 18], [10, 14]), C_('Agente con licencia de seguros en PA · verificada', 'PA licensed insurance agent · verified', 'may 2027')],
      ['Brayan Liriano', 'Agente de seguros', 'Insurance agent', 2021, 22719302, ['es', 'en'], [['Auto', 'Auto']], ['Te ayudo con la licencia internacional.', 'I help with international licenses.'], WK([10, 18]), C_('Agente con licencia de seguros en PA · verificado', 'PA licensed insurance agent · verified', 'ene 2028')]],
    'imprenta-quisqueya': [
      ['Wilfredo Báez', 'Impresor · dueño', 'Printer · owner', 2013, 27347648, ['es', 'en'], [['Rótulos', 'Signs']], ['Te enseño la prueba antes de imprimir.', 'I show you the proof before printing.'], WK([9, 18], [9, 14])],
      ['Nicole Báez', 'Diseñadora gráfica', 'Graphic designer', 2019, 19899325, ['es', 'en'], [['Logos', 'Logos'], ['Redes', 'Social media']], ['Diseños para negocios del barrio.', 'Designs for neighborhood businesses.'], WK([10, 18], [9, 14])],
      ['Tony Guerrero', 'Serigrafía y bordado', 'Screen printing and embroidery', 2016, 28243016, ['es'], [['Camisetas', 'T-shirts']], ['Uniformes para equipos y negocios.', 'Uniforms for teams and businesses.'], WK([9, 17])]],
    'tecnofix-hazleton': [
      ['Edwin Paulino', 'Técnico · dueño', 'Technician · owner', 2019, 6587211, ['es', 'en'], [['iPhone', 'iPhone'], ['Samsung', 'Samsung']], ['Te digo el precio antes de abrir tu teléfono.', 'I tell you the price before opening your phone.'], WK([10, 19], [10, 17])],
      ['Kevin Ureña', 'Técnico de computadoras', 'Computer technician', 2021, 17492491, ['es', 'en'], [['Laptops', 'Laptops']], ['Salvo tus fotos primero.', 'I save your photos first.'], WK([12, 19], [10, 17])]],
    'lopez-defensa-penal': [
      ['Lcdo. Héctor López', 'Abogado penalista · socio', 'Criminal defense attorney · partner', 2009, 36934777, ['es', 'en'], [['DUI', 'DUI'], ['Juicios', 'Trials']], ['Contesto a cualquier hora si alguien de tu familia está detenido.', 'I answer any time if someone in your family is detained.'], WK([8, 18]), BAR('oct 2027')],
      ['Lcda. Mariela Gómez', 'Abogada · tránsito', 'Attorney · traffic', 2020, 5699505 && 35843378, ['es', 'en'], [['Multas', 'Tickets']], ['Voy a la audiencia por ti.', 'I go to the hearing for you.'], WK([9, 17]), BAR('mar 2028')]],
  };
  const ABOUT = {
    'peguero-law': ['Bancarrota y compra de casa, con el total por escrito y la consulta gratis.', 'Bankruptcy and home buying, with the total in writing and a free consultation.', 2013],
    'hogar-propio-prestamos': ['Comparamos bancos para tu casa o tu negocio. Quien aprueba es el banco.', 'We compare lenders for your home or business. The lender approves.', 2017],
    'ortega-consultoria': ['Ayudo a negocios del barrio a ordenar precios, costos y su plan.', 'I help neighborhood businesses sort out pricing, costs and their plan.', 2018],
    'solis-foto-video': ['Fotos y videos para tu negocio, listos para redes y tu página.', 'Photos and videos for your business, ready for social and your site.', 2020],
    'nunez-software': ['Páginas y apps para negocios latinos. Todo queda a tu nombre.', 'Websites and apps for Latino businesses. Everything stays in your name.', 2021],
    'ventura-arquitectura': ['Planos para permisos, remodelaciones y topografía en Hazleton.', 'Permit plans, remodels and land surveys in Hazleton.', 2012],
    'bufete-almonte': ['Abogados de inmigración y familia desde 2010. Te damos el total por escrito antes de empezar.', 'Immigration and family attorneys since 2010. You get the total in writing before we start.', 2010],
    'centro-legal-comunitario': ['Sin fines de lucro. Representantes acreditados por el Departamento de Justicia. Pagas según tus ingresos.', 'Nonprofit. Department of Justice accredited representatives. Pay based on income.', 2014],
    'multiservicios-la-patria': ['Notaría, traducciones, pasaportes y envíos. No somos abogados: te decimos a dónde ir si tu trámite lo necesita.', 'Notary, translations, passports and transfers. We are not lawyers: we tell you where to go if you need one.', 2005],
    'rosario-tax-itin': ['Impuestos e ITIN todo el año. Agente certificador del IRS: tu pasaporte no sale de aquí.', 'Taxes and ITIN year-round. IRS Certifying Acceptance Agent: your passport never leaves the office.', 2012],
    'mercedes-guzman-cpa': ['Contadora para negocios latinos. Precio completo antes de empezar.', 'Accountant for Latino businesses. Full price before I start.', 2008],
    'lcda-ines-cabrera': ['Abogada de familia: divorcio, custodia y testamentos.', 'Family attorney: divorce, custody and wills.', 2017],
    'ferreira-injury-law': ['Accidentes y lesiones en el trabajo. Consulta gratis; solo cobramos si ganas.', 'Accidents and work injuries. Free consultation; we only get paid if you win.', 2004],
    'seguros-el-cibao': ['Agencia independiente: comparamos 6 compañías.', 'Independent agency: we compare 6 insurers.', 2011],
    'imprenta-quisqueya': ['Tarjetas, rótulos, camisetas y logos para negocios del barrio.', 'Cards, signs, shirts and logos for neighborhood businesses.', 2013],
    'tecnofix-hazleton': ['Reparamos celulares y computadoras. Precio antes de arreglar.', 'Phone and computer repair. Price before repair.', 2019],
    'lopez-defensa-penal': ['Defensa penal y tránsito. Urgencias 24 horas por teléfono.', 'Criminal and traffic defense. 24-hour emergency line.', 2012],
  };
  /* Reseñas: lic = hizo lo que dijo que podía · tot = cobró el total que dijo · expl · lang · time = cumplió la fecha · nunca el caso ni datos personales */
  const RV = {
    'bufete-almonte': [
      { n: 'Yokasta M.', lvl: 4, cnt: 23, d: 5, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Me dieron el total por escrito: honorario y lo del gobierno. No hubo sorpresas.', en: 'They gave me the total in writing: fee and government fee. No surprises.', rep: ['Gracias, Yokasta.', 'Thanks, Yokasta.', 4], help: 26 },
      { n: 'Ramón A.', lvl: 6, cnt: 58, d: 14, st: 4, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 0, es: 'Todo bien explicado. Tardaron una semana más de lo que dijeron en enviar el formulario.', en: 'Everything explained well. They took a week longer than promised to file.', rep: ['Ramón, tienes razón. Faltaba una traducción y debimos avisarte antes.', 'Ramón, you are right. A translation was missing and we should have told you sooner.', 12], help: 11 },
      { n: 'Daisy T.', lvl: 1, cnt: 2, d: 30, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Me dijeron claro que mi caso no tenía salida por ahora. No me cobraron más que la consulta.', en: 'They told me clearly my case had no option for now. They only charged the consultation.', help: 31 }],
    'centro-legal-comunitario': [
      { n: 'José L.', lvl: 2, cnt: 6, d: 4, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Consulta gratis y me ayudaron con el DACA pagando según lo que gano.', en: 'Free consultation and they helped with DACA at an income-based fee.', help: 22 },
      { n: 'Anny V.', lvl: 4, cnt: 17, d: 18, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Mi caso necesitaba abogado y me mandaron a uno. No me quisieron cobrar por algo que no podían hacer.', en: 'My case needed a lawyer and they referred me. They would not charge for what they could not do.', help: 18 }],
    'multiservicios-la-patria': [
      { n: 'Freddy D.', lvl: 7, cnt: 96, d: 2, st: 5, src: 'vis', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Traducción del acta en 24 horas y USCIS la aceptó.', en: 'Record translation in 24 hours and USCIS accepted it.', help: 9 },
      { n: 'Carmen G.', lvl: 5, cnt: 41, d: 20, st: 4, src: 'vis', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Le pregunté por un formulario de inmigración y me dijo que ella no podía, que fuera a un abogado. Honesta.', en: 'I asked about an immigration form and she said she could not, go to a lawyer. Honest.', help: 14 }],
    'rosario-tax-itin': [
      { n: 'Wilfredo C.', lvl: 5, cnt: 34, d: 8, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Sacaron el ITIN sin mandar mi pasaporte. Cobraron los $175 que decía.', en: 'Got my ITIN without mailing my passport. Charged the $175 listed.', help: 17 },
      { n: 'Kathy P.', lvl: 3, cnt: 11, d: 25, st: 3, src: 'cita', lic: 1, tot: 0, lang: 'esp', expl: 1, time: 1, es: 'El precio decía $95 y me cobraron $140 por un formulario extra. Lo explicaron, pero después.', en: 'Listed $95 and I paid $140 for an extra form. They explained, but afterward.', rep: ['Kathy, debimos decírtelo antes de empezar. Ya lo hacemos así.', 'Kathy, we should have told you before starting. We do now.', 24], help: 13 }],
    'mercedes-guzman-cpa': [{ n: 'Héctor B.', lvl: 2, cnt: 3, d: 9, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Abrió mi LLC en una semana. Me explicó cada impuesto del negocio.', en: 'Formed my LLC in a week. Explained every business tax.', help: 7 }],
    'lcda-ines-cabrera': [{ n: 'Mariela S.', lvl: 3, cnt: 9, d: 12, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Me dijo desde el principio que la custodia la decide el juez. Me preparó bien.', en: 'She told me from the start the judge decides custody. She prepared me well.', help: 10 }],
    'ferreira-injury-law': [{ n: 'Luis R.', lvl: 3, cnt: 9, d: 6, st: 4, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 0, es: 'Me llamaron el mismo día. El caso tardó meses, pero me avisaban.', en: 'They called the same day. The case took months, but they kept me posted.', help: 8 }],
    'seguros-el-cibao': [{ n: 'Yokasta M.', lvl: 4, cnt: 23, d: 10, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Me bajaron el seguro del carro $38 al mes cambiando de compañía.', en: 'They cut my car insurance by $38 a month switching insurers.', help: 12 }],
    'tecnofix-hazleton': [{ n: 'Ramón A.', lvl: 6, cnt: 58, d: 3, st: 5, src: 'vis', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Pantalla en una hora, el precio que dijeron.', en: 'Screen in an hour, the price they quoted.', help: 5 }],
    'lopez-defensa-penal': [{ n: 'Anónimo', lvl: 2, cnt: 1, d: 16, st: 5, src: 'cita', lic: 1, tot: 1, lang: 'esp', expl: 1, time: 1, es: 'Me llamó a las 2 de la mañana. Precio fijo como dijo.', en: 'He called me at 2 AM. Flat price as promised.', help: 9 }],
  };
  const STATS = { 'bufete-almonte': { ver: 140, orders: 120, lic: 99, tot: 96, expl: 97, lang: 99, time: 84, trato: 96 }, 'centro-legal-comunitario': { ver: 200, orders: 180, lic: 100, tot: 99, expl: 97, lang: 99, time: 88, trato: 98 },
    'multiservicios-la-patria': { ver: 260, orders: 240, lic: 98, tot: 97, expl: 92, lang: 100, time: 95, trato: 94 }, 'rosario-tax-itin': { ver: 230, orders: 210, lic: 99, tot: 91, expl: 94, lang: 99, time: 93, trato: 95 },
    'mercedes-guzman-cpa': { ver: 50, orders: 44, lic: 100, tot: 98, expl: 99, lang: 100, time: 96, trato: 99 }, 'lcda-ines-cabrera': { ver: 40, orders: 36, lic: 100, tot: 97, expl: 98, lang: 100, time: 90, trato: 98 },
    'ferreira-injury-law': { ver: 110, orders: 90, lic: 99, tot: 98, expl: 93, lang: 97, time: 79, trato: 94 }, 'seguros-el-cibao': { ver: 90, orders: 80, lic: 100, tot: 95, expl: 94, lang: 99, time: 97, trato: 95 },
    'imprenta-quisqueya': { ver: 60, orders: 55, lic: 100, tot: 96, expl: 93, lang: 99, time: 92, trato: 96 }, 'tecnofix-hazleton': { ver: 150, orders: 140, lic: 100, tot: 95, expl: 92, lang: 98, time: 90, trato: 94 }, 'lopez-defensa-penal': { ver: 70, orders: 60, lic: 99, tot: 97, expl: 95, lang: 98, time: 91, trato: 96 } };

  /* ---------- Registro ---------- */
  const PEOPLE0 = {}; Object.keys(STAFF).forEach(id => { PEOPLE0[id] = STAFF[id].map(p => ({ ph: p[4], langs: p[5], sp: p[6], bio: p[7], wk: p[8], cert: p[9], rate: '', dishes: [] })); });
  const CAT0 = { title: ['Quién te atiende', 'Who helps you'], rate: 0, next: 1, cert: 1, cta: 'booking' };
  const mk = (b, r, k) => ({ id: b.id + '-p' + k, name: r.n, lvl: r.lvl, cnt: r.cnt, d: r.d, stars: r.st, src: r.src, lic: r.lic, tot: r.tot, lang: r.lang, expl: r.expl, time: r.time, es: r.es, en: r.en, reply: r.rep || null, help: r.help || 0, ph: [], rec: [], topics: [] });
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k)); const i = b.id.length;
    return [{ n: ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.'][i % 4], lvl: 3, cnt: 8, d: 6, st: 5, src: 'vis', lic: 1, tot: 1, lang: 'esp', es: 'Me atendieron en español y cobraron lo que dijeron.', en: 'They helped me in Spanish and charged what they said.', help: 3 }].map((r, k) => mk(b, r, k)); }
  const stats = b => STATS[b.id] || { ver: 0, orders: 0, lic: 99, tot: 95, expl: 93, lang: 97, time: 90, trato: 95 };
  function asp(b, st, es) { const E2 = (x, y) => es ? x : y;
    return [['verified', E2('HIZO LO QUE DIJO QUE PODÍA', 'DID WHAT THEY SAID THEY COULD'), st.lic, 'rgba(75,55,245,.1)', '#4B37F5'], ['dollar', E2('COBRÓ EL TOTAL QUE DIJO', 'CHARGED THE TOTAL THEY QUOTED'), st.tot, 'rgba(255,176,32,.16)', '#8A5A00'],
      ['chat', E2('TE EXPLICÓ', 'EXPLAINED IT TO YOU'), st.expl, 'rgba(11,14,18,.06)', '#0B0E12'], ['language', E2('EN TU IDIOMA', 'IN YOUR LANGUAGE'), st.lang, 'rgba(0,229,196,.16)', '#00695B'],
      ['clock', E2('CUMPLIÓ LA FECHA', 'MET THE DATE'), st.time, 'rgba(255,176,32,.16)', '#8A5A00'], ['heart', E2('TRATO', 'HOW THEY TREATED YOU'), st.trato, 'rgba(0,229,196,.16)', '#00695B']].map(([ic, k, v, bg, fg]) => ({ ic, k, v: v + '%', bg, fg })); }
  const aspNote = (b, st, es) => es ? 'De ' + st.orders + " trámites calificados en To'Latino en los últimos 90 días. Las reseñas nunca dicen de qué trataba el caso." : 'From ' + st.orders + " rated To'Latino cases in the last 90 days. Reviews never say what the case was about.";
  function facts(r, es) { const E2 = (x, y) => es ? x : y, G = '#00695B', R = '#C0392B', A = '#8A5A00', f = [];
    if (r.tot === 1) f.push(['dollar', E2('Cobró el total que dijo', 'Charged the quoted total'), G]); else if (r.tot === 0) f.push(['dollar', E2('Cobró más de lo que dijo', 'Charged more than quoted'), R]);
    if (r.lic === 0) f.push(['warning', E2('Ofreció algo que no podía hacer', 'Offered something they could not do'), R]);
    if (r.lang === 'esp') f.push(['language', E2('En español', 'In Spanish'), G]); else if (r.lang === 'interp') f.push(['language', E2('Con intérprete', 'With an interpreter'), A]);
    if (r.time === 1) f.push(['clock', E2('Cumplió la fecha', 'Met the date'), G]); else if (r.time === 0) f.push(['clock', E2('Tardó más de lo que dijo', 'Took longer than promised'), A]);
    return f; }
  function reg() { const X2 = window.TLListing, S2 = window.TLStaff, R2 = window.TLRev, A2 = window.TLAll; if (!X2 || !S2 || !A2) return;
    PR.B.forEach(b => { b.prof = 1; if (!A2.B.some(x => x.id === b.id)) A2.B.push(b); });
    if (!X2.STAFF['bufete-almonte']) { Object.keys(SVC).forEach(id => { X2.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, it.mi || 0, 0])]); }); Object.assign(X2.ABOUT, ABOUT); PR.B.forEach(b => { if (b.addr) X2.ADDR[b.id] = b.addr + ', Hazleton PA'; }); Object.keys(STAFF).forEach(id => { X2.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]); }); }
    if (!S2.PEOPLE['bufete-almonte']) { Object.keys(STAFF).forEach(id => { S2.PEOPLE[id] = PEOPLE0[id]; }); } S2.CAT.pro = CAT0;
    if (R2 && !R2._pro) { const f = R2.forBiz, st = R2.stats, tp = R2.top, tc = R2.topics; R2._pro = 1; R2.forBiz = (b, i) => b.prof ? rev(b) : f(b, i); R2.stats = b => b.prof ? stats(b) : st(b); R2.top = b => b.prof ? [] : tp(b); R2.topics = b => b.prof ? [] : tc(b); } }
  reg(); (window.TLReg = window.TLReg || []).push(reg);

  /* ---------- Horas, precios y rótulos ---------- */
  const svcs = id => SVC[id] || [], flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  const wkOf = id => { const b = biz(id); return [0, 1, 2, 3, 4, 5, 6].map(d => (b.closed || []).includes(d) ? null : d === 0 ? (b.sun || null) : d === 6 ? (b.sat || null) : b.hrs); };
  function nextSlot(key, wk) { for (let i = 0; i < 14; i++) { const tt = wk[day(i).getDay()]; if (!tt) continue; for (let h = tt[0]; h + .5 <= tt[1]; h += .5 + (hash(key + i + h) > .6 ? .5 : 0)) { if (i === 0 && h < NOW + 1.5) continue; if (hash(key + '|' + i + '|' + h) > .55) return { i, h }; } } return null; }
  const slotL = (x, es) => x ? dayS(x.i, es) + ' · ' + fmt(x.h) : '—';
  const nextOf = b => nextSlot(b.id, wkOf(b.id)), nextStaff = (id, k) => { const pp = (PEOPLE0[id] || [])[k]; return pp && pp.wk ? nextSlot(id + '|' + k, pp.wk) : null; };
  Object.keys(STAFF).forEach(id => (PEOPLE0[id] || []).forEach((pp, k) => { if (!STAFF[id][k][9]) return; const nx = nextStaff(id, k); pp.next = nx ? ['Próxima consulta: ' + slotL(nx, true), 'Next opening: ' + slotL(nx, false)] : ''; }));
  const total = it => (it.p || 0) + (it.gov || 0);
  function priceFor(it, b, es) { const E2 = (a, c) => es ? a : c, mes = it.mes ? E2('/mes', '/mo') : '';
    if (it.k === 'pct') return { l: it.p + ' %', s: it.s0 ? E2(it.s0[0], it.s0[1]) : E2('SOLO SI GANAS · SI NO, $0', 'ONLY IF YOU WIN · OTHERWISE $0'), tot: 0 };
    if (it.k === 'cons') return { l: it.p ? money(it.p) : E2('Gratis', 'Free'), s: it.cred ? E2('SE DESCUENTA SI LO CONTRATAS', 'CREDITED IF YOU HIRE') : '', tot: it.p || 0 };
    if (it.k === 'hora') return { l: money(it.p) + E2('/hora', '/hr'), s: E2('ESTIMADO ', 'ESTIMATE ') + it.hrs + E2(' H', ' HRS'), tot: it.p };
    if (it.k === 'cotiza') return { l: E2('Desde ', 'From ') + money(it.p) + mes, s: E2('TOTAL POR ESCRITO EN LA CONSULTA', 'WRITTEN TOTAL AT CONSULTATION'), tot: it.p };
    if (it.k === 'walk') return { l: it.p ? (it.p % 1 ? '$' + it.p.toFixed(2) : money(it.p)) : E2('Gratis', 'Free'), s: '', tot: it.p || 0 };
    return { l: money(total(it)) + mes, s: it.gov ? E2('HONORARIO ', 'FEE ') + money(it.p) + E2(' + GOBIERNO ', ' + GOVERNMENT ') + money(it.gov) : E2('TOTAL', 'TOTAL'), tot: total(it) }; }
  function metaOf(it, b, es) { const E2 = (a, c) => es ? a : c, a = [];
    a.push({ cons: E2('CONSULTA', 'CONSULTATION'), fijo: E2('PRECIO FIJO', 'FLAT PRICE'), hora: E2('POR HORA', 'HOURLY'), pct: E2('SOLO SI GANAS', 'CONTINGENCY'), walk: E2('SIN CITA', 'WALK-IN'), cotiza: E2('SE COTIZA', 'QUOTED') }[it.k]);
    if (it.rem) a.push(E2('VIDEO O TELÉFONO', 'VIDEO OR PHONE')); if (it.mi && it.k !== 'fijo') a.push(it.mi + ' MIN');
    return a.join(' · '); }
  const walkOnly = b => b.tags.includes('walk') && !b.tags.includes('cita');
  function licCard(b, es) { const E2 = (a, c) => es ? a : c, L = (b.lic || []).map(k => PR.LIC[k]).filter(Boolean);
    if (!L.length) return null; return { t: (b.licL || [L[0][0], L[0][1]])[es ? 0 : 1], p: L.map(x => x[es ? 2 : 3]).join(' '), cant: b.cant ? b.cant[es ? 0 : 1] : '' }; }

  /* ---------- Ficha ---------- */
  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), line = LINE[es ? 0 : 1], lc = licCard(b, es);
    const openSheet = key => e => { stop(e); C.setState({ ash: { biz: b.id, own: b.id, key, opt: {}, add: [], stf: 'any', prof: 1 }, bshTop: dk ? C.vTop() : 0 }); };
    const dirs = e => { stop(e); C.encargo('APP-MAPA', 'APP-NEG-LISTING · Profesionales · Cómo llegar', b.name, E2('Cómo llegar', 'Directions')); };
    const secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => { const key = si + ':' + ii, P = priceFor(it, b, es), walk = it.k === 'walk';
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: U(it.ph || b.ph[0], 200), meta: metaOf(it, b, es) + (P.s ? ' · ' + P.s : ''), price: P.l, sym: [], hasPre: false, preL: '', onPre: () => {},
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(key) : () => {}, onBook: walk ? dirs : openSheet(key), btnL: walk ? E2('Cómo llegar', 'Directions') : 'Booking' }; }) }));
    const notes = [['shield', line + ' ' + E2('Nadie puede prometerte una visa, una green card, un reembolso ni ganar un caso.', 'No one can promise a visa, a green card, a refund or winning a case.')]];
    if (lc) notes.push(['verified', lc.t + '. ' + lc.p]);
    if (b.cant) notes.push(['ban', E2('No puede: ', 'Cannot: ') + b.cant[es ? 0 : 1]]);
    notes.push(['dollar', E2('El precio dice el total: el honorario y lo que se paga al gobierno, por separado.', 'Prices show the total: the fee and what is paid to the government, separately.')]);
    notes.push(['calendar', walkOnly(b) ? E2('No toma citas: llegas y te atienden por orden.', 'No appointments: walk in and you are seen in order.') : E2('Booking es una solicitud: la oficina confirma la hora. No se cobra nada al pedirla.', 'Booking is a request: the office confirms the time. Nothing is charged to request it.')]);
    V.sv = { isChair: false, modes: [], bySvc: true, byPro: false, secs, pros: [], notes: pro ? notes.slice(0, 5).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: false, mine: {}, lbl: { page: '', book: 'Booking' } };
    V.sh = s.ash && s.ash.biz === b.id && s.ash.prof ? sheetVals(C, s, es, b) : EMPTY_SH;
    const oc = e => { stop(e); C.encargo('APP-NEG-LICENCIA', 'APP-NEG-LISTING · Profesionales · licencia', b.name, E2('Verificar la licencia', 'Verify the license')); };
    V.ax = { veh: lc ? { has: pro, ic: 'verified', k: E2('¿PUEDE HACERLO POR LEY?', 'ARE THEY ALLOWED BY LAW?'), t: lc.t, hasS: false, s: '', hasP: true, p: lc.p, hasOk: !!lc.cant, okT: lc.cant ? E2('No puede: ', 'Cannot: ') + lc.cant : '', okFg: '#8A5A00', okIc: 'warning', cta: E2('Verificar', 'Verify'), onClick: oc }
        : { has: pro && !!b.cant, ic: 'verified', k: E2('LO QUE NO HACE', 'WHAT THEY DO NOT DO'), t: b.cant ? b.cant[es ? 0 : 1] : '', hasS: false, s: '', hasP: false, p: '', hasOk: false, okT: '', okFg: '#8A5A00', okIc: 'warning', cta: '', onClick: () => {} },
      sz: { has: false, chips: [] }, q: { has: false },
      line: { has: pro, t: line, s: E2('En EE. UU. un notario no es abogado. Aquí ves la licencia de cada persona, el total con lo del gobierno y lo que no puede hacer.', 'In the U.S. a notary is not a lawyer. Here you see each person’s license, the total with government fees and what they cannot do.') },
      how: { has: pro, t: line, steps: [E2('Mira la licencia: te dice si puede hacer tu trámite por ley.', 'Check the license: it tells you if they can legally do your case.'), E2('El precio es el total: honorario y gobierno por separado.', 'The price is the total: fee and government separately.'), E2('La consulta es una solicitud: la oficina confirma la hora.', 'The consultation is a request: the office confirms the time.'), E2('Antes de contratar, te dan el total por escrito. Nada se cobra sin tu OK.', 'Before hiring, you get the total in writing. Nothing is charged without your OK.')].map((x, i) => ({ n: String(i + 1), t: x })) } };
    V.shop = { items: [], hold: '', hasChips: false, chips: [], empty: true, note: '' };
    V.hx = { gal: { has: false, items: [] } };
    const nx = nextOf(b), f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'cons') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    const TD = walkOnly(b) ? [[E2('SIN CITA', 'WALK-IN'), E2('Hasta las ', 'Until ') + fmt((b.hrs || [9, 17])[1])], [E2('LICENCIA', 'LICENSE'), lc ? E2('Verificada', 'Verified') : '—'], [E2('DESDE', 'FROM'), cP ? cP.l : '—']]
      : [[E2('PRÓXIMA CONSULTA', 'NEXT OPENING'), slotL(nx, es)], [E2('LICENCIA', 'LICENSE'), lc ? E2('Verificada', 'Verified') : '—'], [E2('CONSULTA', 'CONSULTATION'), cP ? cP.l : '—']];
    const AM = { gratis: ['dollar', 'Consulta gratis', 'Free consultation'], esp: ['language', 'Atiende en español', 'Serves in Spanish'], remoto: ['phone', 'Por video o teléfono', 'Video or phone'], fijo: ['check', 'Precio fijo', 'Flat prices'], plan: ['card', 'Plan de pagos', 'Payment plans'], walk: ['clock', 'Sin cita', 'Walk-in'], urgente: ['warning', 'Urgencias', 'Emergencies'], sabado: ['calendar', 'Sábados', 'Saturdays'], noche: ['clock', 'De noche', 'Evenings'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const facts = [{ icon: 'verified', k: E2('LICENCIA', 'LICENSE'), v: lc ? lc.t : E2('No requiere licencia', 'No license required') }, { icon: 'ban', k: E2('NO PUEDE', 'CANNOT'), v: b.cant ? b.cant[es ? 0 : 1] : '—' },
      { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: tg('esp') ? 'Español · English' : 'English' }, { icon: 'card', k: E2('PAGO', 'PAYMENT'), v: tg('plan') ? E2('Tarjeta, efectivo · plan de pagos', 'Card, cash · payment plan') : E2('Tarjeta o efectivo', 'Card or cash') }].filter(f => f.v !== '—').map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [[E2('¿Puede hacer mi trámite por ley?', 'Can they legally handle my case?'), lc ? lc.t + '. ' + lc.p + (lc.cant ? E2(' No puede: ', ' Cannot: ') + lc.cant : '') : E2('Este servicio no necesita licencia.', 'This service needs no license.')],
      [E2('¿Cuánto es en total?', 'What is the total?'), E2('Cada servicio dice el honorario y lo que se paga al gobierno por separado. Antes de contratar te dan el total por escrito.', 'Each service lists the fee and the government fee separately. Before hiring you get the total in writing.')],
      [E2('¿Me garantizan el resultado?', 'Do they guarantee the result?'), E2('No. Nadie te garantiza un resultado. Si alguien te lo promete, desconfía.', 'No. No one can guarantee a result. If someone promises one, be wary.')],
      [E2('¿Piden papeles o seguro social?', 'Do they ask for papers or SSN?'), E2('Para la consulta solo tu nombre y una forma de contactarte. Cada trámite dice qué documentos necesita.', 'For the consultation, just your name and contact. Each service says which documents it needs.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, { cta: walkOnly(b) ? E2('Cómo llegar', 'Directions') : pro ? 'Booking' : t.call, ctaIcon: walkOnly(b) ? 'pin' : pro ? 'calendar' : 'phone', onCta: walkOnly(b) ? dirs : pro ? toSvc : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: false, isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta.charAt(0) + it.meta.slice(1).toLowerCase(), price: it.price })),
      amen, facts, faq: pro ? FQ.map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      fromLabel: !pro ? (walkOnly(b) ? E2('Ve directo', 'Walk in') : E2('Llama para tu cita', 'Call to book')) : cP ? (c0.k === 'cons' ? E2('Consulta ', 'Consultation ') : E2('Desde ', 'From ')) + cP.l : V.fromLabel, barSub: pro ? (TD[0][0] + ' · ' + TD[0][1]).toUpperCase() : b.zone && !b.addr ? E2('VA HASTA ', 'TRAVELS ') + b.zone + ' MI' : E2('HOY HASTA LAS ', 'TODAY UNTIL ') + fmt((b.hrs || [9, 17])[1]), svc: [], hasSvc: false,
      railNote: pro ? E2(line + ' Booking es una solicitud: la oficina confirma la hora.', line + ' Booking is a request: the office confirms the time.') : E2(line + ' Llama para pedir tu consulta.', line + ' Call to book.'),
      lbl: { ...V.lbl, items: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services') } });
    V.bkRail = { has: pro, rows: TD.map(([k, x]) => ({ k, v: x })), note: V.railNote, hasMine: false, mine: {} };
    V.silla = { has: false };
    const m = window.TLProFlow && window.TLProFlow.mineCard(C, s, es, b); if (m) { V.sv.hasMine = true; V.sv.mine = m; V.bkRail.hasMine = true; V.bkRail.mine = m; }
  }
  function sheetVals(C, s, es, b) { const E2 = (x, y) => es ? x : y, q = s.ash, dk = s.view === 'desktop', [si, ii] = String(q.key).split(':').map(Number), sec = svcs(b.id)[si], it = sec && sec[2][ii]; if (!it) return EMPTY_SH;
    const up = o => C.setState(z => ({ ash: { ...z.ash, ...o } })), P = priceFor(it, b, es), SF = (window.TLListing.STAFF[b.id] || []), PP = PEOPLE0[b.id] || [], lc = licCard(b, es);
    const docs = (it.who || SF.map((_, i) => i)).filter(i => SF[i] && STAFF[b.id][i][9]);
    const people = docs.map(j => { const nx = nextStaff(b.id, j); return { id: j, name: SF[j][0].replace(/^(Lcda?\.) /, '').split(' ')[0], image: PX(PP[j].ph, 200), next: nx ? (nx.i === 0 ? fmt(nx.h) : dayS(nx.i, es)).toUpperCase() : '', soon: !!nx && nx.i === 0 }; });
    const stf = q.stf != null && q.stf !== 'any' && SF[q.stf] ? q.stf : null, cert = stf != null ? STAFF[b.id][stf][9] : null;
    const walk = it.k === 'walk', go = () => { C.setState({ ash: null }); if (walk) return C.encargo('APP-MAPA', 'APP-NEG-LISTING · Profesionales · hoja', b.name, E2('Cómo llegar', 'Directions')); if (window.TLProFlow) return window.TLProFlow.start(C, { biz: b.id, own: b.id, key: q.key, stf: q.stf == null ? 'any' : q.stf }); C.encargo('APP-NEG-PRO-BOOKING', 'APP-NEG-LISTING-PRO · Servicios · ' + (es ? it.n : it.ne), b.name + ' · ' + (es ? it.n : it.ne), E2('Booking · Profesionales', 'Booking · Professional')); };
    const veh = lc ? { ic: 'verified', k: E2('¿PUEDE HACERLO POR LEY?', 'ARE THEY ALLOWED BY LAW?'), t: cert ? cert[es ? 'es' : 'en'] : lc.t, s: '', hasOk: !!lc.cant, okT: lc.cant ? E2('No puede: ', 'Cannot: ') + lc.cant : '', okFg: '#8A5A00', okIc: 'warning', cta: '', onClick: () => {} } : null;
    const inc = it.k === 'fijo' && it.gov ? [[E2('Honorario de ', 'Fee to ') + b.name, money(it.p)], [E2('Tarifa del gobierno (se paga aparte, a la agencia)', 'Government fee (paid separately, to the agency)'), money(it.gov)], [E2('Total', 'Total'), money(total(it))]].map(([l, v]) => ({ t: l + ' · ' + v })) : [];
    const payT = walk ? E2('No toma citas: llegas y te atienden por orden. Pagas al terminar.', 'No appointments: walk in and you are seen in order. Pay when done.')
      : it.k === 'pct' ? E2('No pagas nada por adelantado. Si ganas, se descuenta el ' + it.p + ' % de lo que recibas; si no ganas, no pagas.', 'Nothing up front. If you win, ' + it.p + '% of what you get; if you lose, you pay nothing.')
      : it.k === 'cons' ? (it.p ? E2('Pagas la consulta en la oficina' + (it.cred ? '; se descuenta si contratas el servicio.' : '.'), 'You pay the consultation at the office' + (it.cred ? '; credited if you hire.' : '.')) : E2('La consulta es gratis.', 'The consultation is free.'))
      : E2('Antes de empezar te dan el total por escrito y lo apruebas. Nada se cobra al pedir la cita.', 'Before starting you get the written total and approve it. Nothing is charged to request.');
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop, name: es ? it.n : it.ne, desc: es ? it.d : it.de, bg: U(it.ph || b.ph[0], 700), price: P.l, meta: metaOf(it, b, es),
      groups: [], adds: [], hasAdds: false, hasWho: !walk && people.length > 1, isPick: false, isStaff: !walk && people.length > 1, pros: [], people, stf: q.stf == null ? 'any' : q.stf, onStf: id => up({ stf: id }),
      whoPend: false, whoDone: false, whoMeta: cert ? cert[es ? 'es' : 'en'].toUpperCase() : E2('CUALQUIERA: EL PRIMERO LIBRE', 'ANYONE: FIRST AVAILABLE'), hasDep: true, depT: payT + ' ' + LINE[es ? 0 : 1], total: P.l,
      durL: P.s || E2('PRECIO', 'PRICE'), cta: walk ? E2('Cómo llegar', 'Directions') : E2('Elegir hora', 'Choose a time'), dis: false, onGo: go,
      lbl: { req: '', ready: '', adds: '', addsM: '', who: E2('¿Con quién?', 'With whom?'), any: E2('Cualquiera', 'Anyone'), incK: E2('EL TOTAL', 'THE TOTAL'), noK: E2('IMPORTANTE', 'IMPORTANT') },
      x: { hasPre: false, preT: '', preS: '', preCta: '', onPre: () => {}, hasVeh: !!veh, veh: veh || {}, hasInc: inc.length > 0, inc, hasNo: !!(it.no && it.no.length), no: (it.no || []).map(z => ({ t: es ? z[0] : z[1] })) } }; }
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), lc = licCard(b, es);
    if (!b.pro) { const wo = walkOnly(b), zn = !!b.zone && !b.addr; Object.assign(td, { s: (wo ? E2('Ve directo: no hace falta cita.', 'Just walk in: no appointment needed.') : E2('No toma citas en To\'Latino: llama para pedir tu cita.', 'No To\'Latino bookings: call to book.')) + ' ' + LINE[es ? 0 : 1], cols: [lc ? [E2('LICENCIA', 'LICENSE'), E2('Verificada', 'Verified')] : zn ? [E2('VA HASTA', 'TRAVELS'), b.zone + ' mi'] : null, [E2('IDIOMA', 'LANGUAGE'), tg('esp') ? E2('Español', 'Spanish') : 'English'], [E2('HOY HASTA', 'TODAY UNTIL'), (b.hrs || [9, 17])[1] >= 24 ? E2('24 horas', '24 hours') : fmt((b.hrs || [9, 17])[1])]].filter(Boolean).map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false }); return; }
    const nx = nextOf(b), f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'cons') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    const TD = walkOnly(b) ? [[E2('SIN CITA', 'WALK-IN'), E2('Hasta las ', 'Until ') + fmt((b.hrs || [9, 17])[1])], [E2('LICENCIA', 'LICENSE'), lc ? E2('Verificada', 'Verified') : '—'], [E2('DESDE', 'FROM'), cP ? cP.l : '—']] : [[E2('PRÓXIMA CONSULTA', 'NEXT OPENING'), slotL(nx, es)], [E2('LICENCIA', 'LICENSE'), lc ? E2('Verificada', 'Verified') : '—'], [E2('CONSULTA', 'CONSULTATION'), cP ? cP.l : '—']];
    Object.assign(td, { s: (walkOnly(b) ? E2('Sin cita: llegas y te atienden por orden. ', 'Walk-in: arrive and you are seen in order. ') : E2('Pides la consulta aquí; la oficina confirma la hora. ', 'Request here; the office confirms the time. ')) + LINE[es ? 0 : 1], cols: TD.map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false });
    const mk = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const T = [trust[0], lc ? mk('verified', lc.t, 'ok') : null, tg('gratis') ? mk('dollar', E2('Consulta gratis', 'Free consultation'), 'info') : null, tg('esp') ? mk('language', E2('Atiende en español', 'Serves in Spanish'), 'ok') : trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }
  window.TLProL = { SVC, STAFF, RV, rev, stats, asp, aspNote, facts, listingAdd, sheetVals, resAdd, priceFor, metaOf, total, nextOf, nextStaff, slotL, wkOf, svcs, flatOf, walkOnly, licCard, PEOPLE0 };
})();

/* ==== prototype/neg-pro-flow.js ==== */
/* Servicios Profesionales (NEG-PRO) — Etapa 3: Booking de la consulta, estado y "total por escrito". Hoy = jue 24 sep 2026, 12:30 PM.
   Tesis: ¿puede hacerlo por ley y cuánto es en total? Línea fija: "Nadie te garantiza un resultado." (Booking, revisión, estado, propuesta).
   Mismas vistas que Salud/Hogar/Auto (ab / ac); estado s.pb (Booking) y s.pcitas.
   APP-NEG-PRO-BOOKING: 1 Tu trámite (licencia de quien te atiende · cómo: oficina / video / teléfono · qué pasa: primera vez / ya tengo caso /
     me llegó una carta / tengo fecha límite · nota opcional, solo la ve la oficina) → 2 Día y hora → 3 Revisa y envía (hoy $0; consulta en la oficina;
     el total por escrito antes de contratar; solo si ganas = $0 por adelantado).
   APP-NEG-PRO-CITA: pend → ok | alt | no | exp → (Pasó la consulta) → quote (TOTAL POR ESCRITO: honorario, gobierno aparte, crédito de la consulta;
     Aceptar y contratar | No, gracias) → hired (contratado: nada extra sin tu OK) → done. Servicios de precio fijo o % pasan de ok a hired.
   RESPUESTA: ok · rechaza → no · nada → exp · cambio → otra hora (y en la propuesta, un extra que pide tu OK). */
(function boot() {
  const PL = window.TLProL, PR = window.TLPro, X = window.TLListing, SD = window.TLStaff, ALL = window.TLAll, PAY = window.TLPay;
  if (!PL || !PR || !X || !SD || !ALL) return setTimeout(boot, 40);
  const NOW = 12.5, fmt = X.fmt, biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };
  const day = i => new Date(2026, 8, 24 + i), cap = x => x.charAt(0).toUpperCase() + x.slice(1);
  const DS = [['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']];
  const DL = [['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']];
  const MO = [['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']];
  const dayL = (i, es) => { const d = day(i); return i === 0 ? (es ? 'hoy' : 'today') : i === 1 ? (es ? 'mañana' : 'tomorrow') : es ? DL[0][d.getDay()] + ' ' + d.getDate() + ' ' + MO[0][d.getMonth()] : DL[1][d.getDay()] + ' ' + MO[1][d.getMonth()] + ' ' + d.getDate(); };
  const itOf = (own, key) => { const [si, ii] = String(key).split(':').map(Number), g = PL.svcs(own)[si]; return g && g[2][ii]; };
  const LINE = PR.line;
  const HOW = [['ofi', 'En la oficina', 'At the office', 'pin'], ['video', 'Por video', 'By video', 'video'], ['tel', 'Por teléfono', 'By phone', 'phone']];
  const WHY = [['nuevo', 'Primera vez', 'First time'], ['caso', 'Ya tengo un caso', 'I have a case'], ['carta', 'Me llegó una carta', 'I got a letter'], ['fecha', 'Tengo fecha límite', 'I have a deadline']];
  const quoteFirst = it => it.k === 'cons' || it.k === 'cotiza' || it.k === 'hora';
  const certOf = (own, stf) => { const S = PL.STAFF[own] || []; return stf !== 'any' && S[stf] ? S[stf][9] : null; };
  const nameOf = (own, stf, es) => { const S = X.STAFF[own] || []; return stf !== 'any' && S[stf] ? S[stf][0] : (es ? 'El primero libre' : 'First available'); };

  function slotsOf(own, stf, i) { const pp = stf != null && stf !== 'any' ? (SD.PEOPLE[own] || [])[stf] : null, wk = pp && pp.wk ? pp.wk : PL.wkOf(own), tt = wk[day(i).getDay()]; if (!tt) return [];
    const out = []; for (let h = tt[0]; h + .5 <= tt[1]; h += .5) { if (i === 0 && h < NOW + 1) continue; if (h === 12 || h === 12.5) continue; out.push({ h, l: fmt(h), taken: hash(own + '|' + (stf == null ? 'a' : stf) + '|' + i + '|' + h) < (i === 0 ? .6 : .45) }); } return out; }

  function start(C, q, extra) { const it = itOf(q.own, q.key); if (!it) return; let fi = 0; for (let i = 0; i < 14; i++) if (slotsOf(q.own, q.stf, i).some(z => !z.taken)) { fi = i; break; }
    C.setState({ ash: null, pb: { biz: q.biz || q.own, own: q.own, key: q.key, stf: q.stf == null ? 'any' : q.stf, step: 0, i: fi, h: null, how: 'ofi', why: '', note: '', sms: true, pm: null, ...(extra || {}) } });
    C.nav({ code: 'APP-NEG-PRO-BOOKING', biz: q.own, from: 'APP-NEG-LISTING · Servicios' }); C.scrollTop(); }

  const AB0 = { lbl: {}, veh: {}, lights: [], phs: [], dirt: [], kinds: [], days: [], slots: [], addrs: [], rows2: [], price: [], cobro: [], pol2: [], bar: {}, dBar: {}, miss: [], cobroBar: {}, dep2: {}, sumH: {} };
  function bookVals(C, s, es) { const q = s.pb; if (!q) return AB0;
    const E2 = (a, b) => es ? a : b, ob = biz(q.own), it = itOf(q.own, q.key); if (!ob || !it) return AB0;
    const up = o => C.setState(z => ({ pb: { ...z.pb, ...o } })), dk = s.view === 'desktop', P = PL.priceFor(it, ob, es), name = es ? it.n : it.ne || it.n, lc = PL.licCard(ob, es), cert = certOf(q.own, q.stf);
    const hows = HOW.filter(h => h[0] === 'ofi' || it.rem);
    const days = [...Array(14)].map((_, i) => { const d = day(i), off = !slotsOf(q.own, q.stf, i).some(z => !z.taken); return { id: 'd' + i, dow: i === 0 ? E2('HOY', 'TODAY') : DS[es ? 0 : 1][d.getDay()], num: String(d.getDate()), off }; });
    const SLt = slotsOf(q.own, q.stf, q.i), sel = SLt.find(z => z.h === q.h && !z.taken), whenL = sel ? cap(dayL(q.i, es)) + ' · ' + sel.l : '—';
    const miss = [!sel ? E2('Elige día y hora', 'Pick a day and time') : null].filter(Boolean), ok1 = !!sel, can = ok1;
    const pmId = q.pm || (PAY ? PAY.cards(s)[0].id : ''), pmL = PAY ? PAY.label(s, pmId) : 'Visa ·· 4242', pmB = PAY ? PAY.badge(s, pmId) : 'VISA';
    const onPm = () => PAY && PAY.open(C, { ctx: 'pb', amt: 0, wallet: false, sel: pmId, declined: null });
    const howL = (HOW.find(h => h[0] === q.how) || HOW[0])[es ? 1 : 2];
    const payAt = it.k === 'pct' ? E2('Solo si ganas', 'Only if you win') : it.k === 'cons' ? (q.how === 'ofi' ? E2('En la consulta', 'At the consultation') : E2('Antes de la llamada', 'Before the call')) : E2('Al aceptar el total por escrito', 'When you accept the written total');
    const cobro = [[E2('Hoy, al enviar', 'Today, on sending'), '$0', E2('No se cobra nada al pedir la consulta.', 'Nothing is charged to request.')],
      [payAt, P.l, it.k === 'pct' ? E2('Si no ganas, no pagas nada.', 'If you lose, you pay nothing.') : it.k === 'cons' ? (it.p ? E2('A ' + ob.name + (it.cred ? '. Se descuenta si contratas el servicio.' : '.'), 'To ' + ob.name + (it.cred ? '. Credited if you hire.' : '.')) : E2('La consulta es gratis.', 'The consultation is free.')) : it.gov ? E2('Honorario ' + money(it.p) + ' a ' + ob.name + ' · gobierno ' + money(it.gov) + ' aparte, a la agencia.', 'Fee ' + money(it.p) + ' to ' + ob.name + ' · government ' + money(it.gov) + ' separately, to the agency.') : E2('Te dan el total por escrito antes de empezar.', 'You get the written total before they start.')]].map(([k, v, sub], i) => ({ k, v, s: sub, dot: i === 0 ? '#0B0E12' : 'rgba(11,14,18,.25)' }));
    const rows = [[E2('SERVICIO', 'SERVICE'), name], [E2('CUÁNDO', 'WHEN'), whenL], [E2('CÓMO', 'HOW'), howL], [E2('CON', 'WITH'), nameOf(q.own, q.stf, es)], [E2('LICENCIA', 'LICENSE'), cert ? cert[es ? 'es' : 'en'] : lc ? lc.t : '—']].concat(q.how === 'ofi' ? [[E2('DÓNDE', 'WHERE'), (X.ADDR[q.own] || ob.addr || '').replace(', Hazleton PA', '')]] : []).map(([k, v], i) => ({ k, v, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const pol2 = [E2('Cancelar o cambiar: gratis hasta 24 h antes. Después: cuenta como cancelación tardía.', 'Cancel or change free up to 24 hours before.'), E2('Antes de contratar, la oficina te da el total por escrito. Nada se cobra sin tu OK.', 'Before hiring, the office gives you the written total. Nothing is charged without your OK.'),
      q.how === 'ofi' ? E2('Trae tu identificación y los papeles de tu trámite.', 'Bring your ID and the papers for your case.') : E2('El enlace o la llamada te llegan por SMS 10 minutos antes.', 'The link or call reaches you by text 10 minutes before.'), E2("To'Latino no da consejo legal. Lo que cuentes solo lo ve la oficina.", "To'Latino does not give legal advice. What you share is only seen by the office.")].map(t => ({ t }));
    const send = () => { if (!can) return; if (!s.user) { C.setState({ auth: { step: 'phone', next: { ...s.route }, top: C.vTop(), ctx: 'bk' } }); return; } sendNow(C, es); };
    const next = () => { if (q.step === 0) { up({ step: 1 }); C.scrollTop(); } else if (q.step === 1 && ok1) { up({ step: 2 }); C.scrollTop(); } else if (q.step === 2) send(); };
    const veh = lc ? { ic: 'verified', k: E2('¿PUEDE HACERLO POR LEY?', 'ARE THEY ALLOWED BY LAW?'), t: cert ? cert[es ? 'es' : 'en'] : lc.t, s: nameOf(q.own, q.stf, es).toUpperCase(), hasOk: !!lc.cant, okT: lc.cant ? E2('No puede: ', 'Cannot: ') + lc.cant : '', okFg: '#8A5A00', okIc: 'warning', cta: '' }
      : { ic: 'check', k: E2('QUIÉN TE ATIENDE', 'WHO HELPS YOU'), t: nameOf(q.own, q.stf, es), s: ob.name.toUpperCase(), hasOk: false, okT: '', okFg: '#00695B', okIc: 'check', cta: '' };
    return { has: true, cobro, cobroBar: { has: false }, dep2: { has: false }, pol2, sumH: { ph: PX(it.ph || ob.ph[0], 200), k: E2('RESUMEN', 'SUMMARY'), t: name, s: ob.name.toUpperCase() }, rows2: rows,
      title: name, sub: ob.name.toUpperCase(), stepT: [E2('Tu trámite', 'Your case'), E2('Día y hora', 'Day and time'), E2('Revisa y envía', 'Review and send')][q.step], step: q.step + 1, total: 3, isS0: q.step === 0, isS1: q.step === 1, isS2: q.step === 2,
      onBack: () => { if (q.step > 0 && !dk) { up({ step: q.step - 1 }); C.scrollTop(); } else C.nav({ code: 'APP-NEG-LISTING-PRO', biz: q.biz, from: 'APP-NEG-PRO-BOOKING' }); },
      veh: { ...veh, onClick: e => stop(e) }, hasMi: false, mi: '', onMi: () => {},
      isEst: true, isLav: false, lights: WHY.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.why === k ? 'selected' : 'filter', onClick: () => up({ why: q.why === k ? '' : k }) })),
      note: q.note, onNote: e => up({ note: e.target.value.slice(0, 300) }), noteN: q.note.length + ' / 300', symWarn: false, phs: [], canPh: false, onPh: () => {}, dirt: [], hasDirt: false, dirtNote: '',
      isPreAsk: false, preAsk: false, onPreAsk: () => {}, preBg: '', preX: '', hasPreHint: false, preHint: '', hasPre: q.why === 'fecha', preNote: q.why === 'fecha' ? E2('Escribe la fecha límite en la nota. Si es en menos de 3 días, llama también a la oficina.', 'Write the deadline in the note. If it is within 3 days, call the office too.') : '',
      hasKinds: hows.length > 1, kinds: hows.map(([k, l1, l2]) => { const on = q.how === k; return { l: es ? l1 : l2, p: '', bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)', onClick: () => up({ how: k }) }; }),
      days, dSel: 'd' + q.i, onDay: id => up({ i: +id.slice(1), h: null }), slots: SLt.map(z => ({ t: z.l, taken: z.taken })), hSel: sel ? sel.l : '', onH: tl => { const z = SLt.find(y => y.l === tl); if (z) up({ h: z.h }); },
      hasSlots: SLt.length > 0, noSlots: E2('Ese día no hay consultas. Elige otro.', 'No openings that day. Pick another.'), slotK: E2('HORA', 'TIME'),
      hasBack: true, backL: (it.mi ? it.mi + ' min · ' : '') + howL.toLowerCase(), backK: E2('DURA · CÓMO', 'LENGTH · HOW'), isAddr: false, addrK: '', addrs: [], addrNote: '',
      price: [{ l: name, v: P.l, fg: '#0B0E12' }].concat(it.k === 'fijo' && it.gov ? [{ l: E2('Honorario', 'Fee'), v: money(it.p), fg: 'rgba(11,14,18,.6)' }, { l: E2('Gobierno (aparte)', 'Government (separate)'), v: money(it.gov), fg: 'rgba(11,14,18,.6)' }] : []), totalK: it.k === 'pct' ? E2('SI GANAS', 'IF YOU WIN') : E2('TOTAL', 'TOTAL'), totalV: P.l, hasEstNote: quoteFirst(it), estNote: quoteFirst(it) ? E2('Después de la consulta te mandan el total por escrito. Tú decides si contratas.', 'After the consultation you get the written total. You decide whether to hire.') : '',
      pmL, pmB, onPm, declined: false, decT: '',
      hasKeep: false, keepBg: '', keepX: '', onKeep: () => {},
      sms: q.sms, onSms: () => up({ sms: !q.sms }), smsBg: q.sms ? '#0B0E12' : 'rgba(11,14,18,.15)', smsX: q.sms ? '18px' : '2px',
      line: LINE[es ? 0 : 1], miss: miss.map(t => ({ t })), hasMiss: miss.length > 0,
      bar: { k: E2('HOY PAGAS', 'TODAY YOU PAY'), v: '$0', s: (it.k === 'pct' ? E2('SOLO SI GANAS: ', 'ONLY IF YOU WIN: ') : it.k === 'cons' ? E2('CONSULTA: ', 'CONSULTATION: ') : E2('TOTAL: ', 'TOTAL: ')) + P.l.toUpperCase(), cta: q.step < 2 ? E2('Continuar', 'Continue') : E2('Enviar solicitud', 'Send request'), dis: q.step === 1 ? !ok1 : q.step === 2 ? !can : false, on: next },
      dBar: { cta: E2('Enviar solicitud', 'Send request'), dis: !can, on: send },
      lbl: { secCar: E2('Tu trámite', 'Your case'), secPre: E2('Antes de enviar', 'Before you send'), goodK: E2('BUENO SABER', 'GOOD TO KNOW'), prefK: E2('PREFERENCIAS', 'PREFERENCES'), howK: E2('CÓMO SE PAGA', 'HOW YOU PAY'), payK: E2('HOY PAGAS', 'TODAY YOU PAY'), back: E2('Volver', 'Back'), vehK: E2('Quién te atiende', 'Who helps you'), miK: '', miPh: '',
        symT: E2('¿Qué pasa con tu trámite?', 'What is going on with your case?'), symS: E2('Opcional. Solo lo ve la oficina; nunca sale en reseñas.', 'Optional. Only the office sees it; it never appears in reviews.'), lightsK: E2('SITUACIÓN', 'SITUATION'), notePh: E2('Ej.: mi green card vence en noviembre…', 'E.g. my green card expires in November…'), phK: '', phAdd: '', symWarn: '',
        kindT: E2('¿Cómo quieres la consulta?', 'How do you want the consultation?'), dayT: E2('Día y hora', 'Day and time'), priceK: E2('PRECIO', 'PRICE'), pmK: E2('TARJETA · NO SE COBRA HOY', 'CARD · NOT CHARGED TODAY'), change: E2('Cambiar', 'Change'),
        keepT: '', keepS: '', smsT: E2('Avisos por SMS', 'Text updates'), smsS: E2('Confirmación y recordatorio el día antes.', 'Confirmation and a reminder the day before.'), preT: '', preS: '', dirtT: '' } };
  }
  function sendNow(C, es) { const s = C.state, q = s.pb, it = itOf(q.own, q.key), ob = biz(q.own), id = q.edit || ('P-' + (4100 + Math.floor(Math.random() * 800)));
    const x = { id, biz: q.biz, own: q.own, key: q.key, svc: it.n, svcEn: it.ne || it.n, k: it.k, stf: q.stf, i: q.i, h: q.h, how: q.how, why: q.why, note: q.note, price: PL.priceFor(it, ob, true).l, priceEn: PL.priceFor(it, ob, false).l, st: 'pend', sentAt: '12:31 PM', okAt: '', pm: q.pm || (PAY ? PAY.cards(s)[0].id : '') };
    C.setState(z => ({ pcitas: (z.pcitas || []).filter(y => y.id !== id).concat(x), pb: null })); C.nav({ code: 'APP-NEG-PRO-CITA', biz: q.own, cid: id, from: 'APP-NEG-PRO-BOOKING' }); C.scrollTop(); respond(C, id); }
  function upC(C, id, o) { C.setState(z => ({ pcitas: (z.pcitas || []).map(y => y.id === id ? { ...y, ...(typeof o === 'function' ? o(y) : o) } : y) })); }
  const altOf = x => { const i = x.i === 0 ? 1 : x.i + 1, L = slotsOf(x.own, x.stf, i).filter(z => !z.taken); return { altI: i, altH: L.length ? L[Math.floor(L.length / 2)].h : 10 }; };
  const reply = (x, sc) => sc === 'rechaza' ? { st: 'no' } : sc === 'cambio' ? { st: 'alt', ...altOf(x) } : { st: 'ok', okAt: '12:52 PM' };
  function respond(C, id) { clearTimeout(C._pcT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._pcT = setTimeout(() => upC(C, id, x => x.st === 'pend' ? reply(x, sc) : {}), 3500); }
  /* Total por escrito: el servicio que contratas después de la consulta (el primero de precio fijo o cotizado de la oficina). */
  function quoteOf(x, sc) { const it = itOf(x.own, x.key), L = PL.flatOf(x.own), tgt = it.k === 'cons' ? (L.find(y => y.k === 'fijo' && y.gov) || L.find(y => y.k === 'fijo' || y.k === 'cotiza') || it) : it;
    const fee = tgt.k === 'hora' ? tgt.p * (parseInt(String(tgt.hrs).split('–').pop(), 10) || 4) : tgt.k === 'cotiza' ? Math.round(tgt.p * 1.2 / 50) * 50 : tgt.p || 0, gov = tgt.gov || 0, cred = it.k === 'cons' && it.cred ? (it.p || 0) : 0;
    return { n: tgt.n, ne: tgt.ne || tgt.n, fee, gov, cred, xtra: sc === 'cambio' ? { n: 'Traducción certificada de 2 actas', ne: 'Certified translation of 2 records', p: 60 } : null, hrs: tgt.k === 'hora' ? tgt.hrs : '' }; }
  const qTotal = (q, withX) => q.fee + q.gov - q.cred + (withX && q.xtra ? q.xtra.p : 0);

  const AC0 = { lbl: {}, hdr: {}, steps: [], est: { groups: [], rows: [] }, xtra: {}, money: { rows: [] }, rows: [], acts: [], alt: {}, others: [], cx: {}, ready: { rows: [] }, done: { stars: [], rows: [] } };
  function citaVals(C, s, es) { const x = (s.pcitas || []).find(y => y.id === s.route.cid); if (!x) return AC0;
    const E2 = (a, b) => es ? a : b, ob = biz(x.own), up = o => upC(C, x.id, o), st = x.st, name = es ? x.svc : x.svcEn, it = itOf(x.own, x.key), withN = nameOf(x.own, x.stf, es), howL = (HOW.find(h => h[0] === x.how) || HOW[0])[es ? 1 : 2];
    const when = cap(dayL(x.i, es)) + ' · ' + fmt(x.h), qf = quoteFirst(it), Q = x.quote, qt = Q ? qTotal(Q, x.xOk) : 0;
    const H = { pend: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, E2('Confirman la hora en unos 45 min. No se ha cobrado nada.', 'They confirm the time in about 45 min. Nothing has been charged.')],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('CONFIRMADA', 'CONFIRMED'), cap(dayL(x.i, es)) + E2(' a las ', ' at ') + fmt(x.h), x.how === 'ofi' ? E2('Trae tu identificación y los papeles de tu trámite.', 'Bring your ID and your case papers.') : E2('El enlace o la llamada te llegan por SMS 10 min antes.', 'The link or call comes by text 10 min before.')],
      alt: ['calendar', 'rgba(255,176,32,.2)', '#8A5A00', E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), cap(dayL(x.altI, es)) + E2(' a las ', ' at ') + fmt(x.altH), E2('A la hora que pediste no pueden. Si no te sirve, no pasa nada.', 'Your time does not work for them. If this one does not suit you, no problem.')],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO PUDIERON', 'NOT AVAILABLE'), E2('No hay consulta a esa hora', 'No opening at that time'), E2('No se cobró nada. Elige otra hora.', 'Nothing was charged. Pick another time.')],
      exp: ['clock', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('SIN RESPUESTA', 'NO REPLY'), E2('No contestaron a tiempo', 'They did not reply in time'), E2('La solicitud se canceló sola. Llama a la oficina o pide otra hora.', 'The request expired. Call the office or request another time.')],
      quote: ['dollar', 'rgba(255,176,32,.2)', '#8A5A00', E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), E2('Te mandaron el total: ', 'Your total: ') + money(qt), E2('Revísalo con calma. Nada se cobra hasta que lo aceptes.', 'Take your time. Nothing is charged until you accept.')],
      hired: ['verified', 'rgba(0,229,196,.18)', '#00695B', E2('CONTRATADO', 'HIRED'), E2('Tu trámite está en manos de ', 'Your case is with ') + withN.replace(E2('El primero libre', 'First available'), ob.name), Q ? E2('Total por escrito: ' + money(qt) + '. Si algo cambia, te piden tu OK primero.', 'Written total: ' + money(qt) + '. If anything changes, they ask your OK first.') : E2('Precio: ' + x.price + '. Si algo cambia, te piden tu OK primero.', 'Price: ' + x.priceEn + '. If anything changes, they ask your OK first.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('TERMINADO', 'DONE'), x.noHire ? E2('No contrataste', 'You did not hire') : E2('Trámite terminado', 'Case finished'), x.noHire ? E2('Solo pagaste la consulta: ', 'You only paid the consultation: ') + (es ? x.price : x.priceEn) + '.' : E2('Pagaste lo que decía el total por escrito.', 'You paid what the written total said.')],
      cx: ['close', 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)', E2('CANCELADA', 'CANCELLED'), E2('Cancelaste la consulta', 'You cancelled'), E2('No se cobró nada.', 'Nothing was charged.')] }[st];
    const flow = qf ? ['sent', 'ok', 'day', 'quote', 'hired', 'done'] : ['sent', 'ok', 'day', 'hired', 'done'], pos = { pend: 0, alt: 0, ok: 1, quote: flow.indexOf('quote'), hired: flow.indexOf('hired'), done: flow.length - 1 }[st];
    const SLb = { sent: E2('Solicitud enviada', 'Request sent'), ok: E2('Confirmada', 'Confirmed'), day: E2('Consulta', 'Consultation'), quote: E2('Total por escrito', 'Written total'), hired: E2('Contratado', 'Hired'), done: E2('Terminado', 'Done') };
    const steps = pos == null ? [] : flow.map((k, i) => ({ label: SLb[k], time: k === 'sent' ? x.sentAt : k === 'ok' ? x.okAt : k === 'day' ? when : '', state: i < pos || st === 'done' ? 'done' : i === pos ? 'current' : 'next' }));
    const others = ['no', 'exp'].includes(st) ? (() => { const out = []; for (let i = x.i; i < 14 && out.length < 4; i++) slotsOf(x.own, x.stf, i).filter(z => !z.taken && !(i === x.i && z.h === x.h)).slice(0, 2).forEach(z => { if (out.length < 4) out.push({ i, h: z.h }); }); return out; })().map(o => ({ l: cap(dayL(o.i, es)) + ' · ' + fmt(o.h), onClick: () => rebook(C, x, { step: 2, i: o.i, h: o.h }) })) : [];
    const acts = st === 'pend' || st === 'ok' ? [['edit', E2('Cambiar', 'Change'), () => rebook(C, x, { step: 1 })], ['calendar', E2('Calendario', 'Calendar'), () => C.encargo('APP-CALENDARIO', 'APP-NEG-PRO-CITA', ob.name, E2('Agregar al calendario', 'Add to calendar'))], [x.how === 'ofi' ? 'pin' : 'phone', x.how === 'ofi' ? E2('Cómo llegar', 'Directions') : E2('Llamar', 'Call'), () => C.encargo(x.how === 'ofi' ? 'APP-MAPA' : 'APP-NEG-CONTACTO', 'APP-NEG-PRO-CITA', ob.name, x.how === 'ofi' ? E2('Cómo llegar', 'Directions') : E2('Llamar a la oficina', 'Call the office'))], ['close', E2('Cancelar', 'Cancel'), () => C.setState({ pcx: x.id })]]
      : st === 'hired' ? [['chat', E2('Mensaje a la oficina', 'Message the office'), () => C.encargo('APP-NEG-MENSAJE', 'APP-NEG-PRO-CITA', ob.name, E2('Mensaje a la oficina', 'Message the office'))], ['help', E2('Ayuda con el trámite', 'Help with the case'), () => window.TLProRev ? window.TLProRev.startHelp(C, x.id) : C.encargo('APP-NEG-PRO-AYUDA', 'APP-NEG-PRO-CITA', x.id, E2('Ayuda con el trámite', 'Help with the case'))]]
      : st === 'done' ? [['calendar', E2('Otra consulta', 'Another consultation'), () => start(C, { biz: x.biz, own: x.own, key: x.key, stf: x.stf })], ['help', E2('Ayuda con el trámite', 'Help with the case'), () => window.TLProRev ? window.TLProRev.startHelp(C, x.id) : C.encargo('APP-NEG-PRO-AYUDA', 'APP-NEG-PRO-CITA', x.id, E2('Ayuda con el trámite', 'Help with the case'))]]
      : st === 'quote' ? [['phone', E2('Llamar para preguntar', 'Call with questions'), () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-PRO-CITA · total', ob.name, E2('Llamar a la oficina', 'Call the office'))]]
      : st === 'cx' ? [] : [['calendar', E2('Pedir otra hora', 'Request another time'), () => start(C, { biz: x.biz, own: x.own, key: x.key, stf: x.stf })]];
    const rows = [[E2('SERVICIO', 'SERVICE'), name], [E2('CUÁNDO', 'WHEN'), when], [E2('CÓMO', 'HOW'), howL], [E2('CON', 'WITH'), withN], [E2('PRECIO', 'PRICE'), es ? x.price : x.priceEn]].concat(x.how === 'ofi' ? [[E2('DÓNDE', 'WHERE'), (X.ADDR[x.own] || ob.addr || '').replace(', Hazleton PA', '')]] : []).map(([k, v]) => ({ k, v }));
    const L1 = (t, tot, why, parts) => ({ t, tot, why, parts, lab: '', tax: '', bg: PX(ob.ph[0], 120), bd: '1px solid rgba(11,14,18,.1)', box: '#0B0E12', boxBd: 'none', chk: 'grid', cur: 'default', onToggle: () => {} });
    const est = st === 'quote' && Q ? { has: true, k: (E2('DE ', 'FROM ') + ob.name + ' · ' + E2('VÁLIDO 30 DÍAS', 'VALID 30 DAYS')).toUpperCase(), by: withN + ' · ' + E2('hoy, 4:10 PM', 'today, 4:10 PM'), hasCmp: true, cmpBg: 'rgba(0,229,196,.12)', cmpIc: 'shield', cmpFg: '#00695B', cmp: LINE[es ? 0 : 1] + ' ' + E2('Este total es lo que cobran por el trabajo, no una promesa de resultado.', 'This total is what they charge for the work, not a promise of a result.'),
        groups: [{ k: E2('LO QUE INCLUYE', 'WHAT IT INCLUDES'), fg: '#0B0E12', s: '', items: [L1(es ? Q.n : Q.ne, money(Q.fee), Q.hrs ? E2('Estimado de ' + Q.hrs + ' horas. Si pasa, te piden tu OK antes.', 'Estimate of ' + Q.hrs + ' hours. If it goes over, they ask your OK first.') : E2('Precio cerrado por escrito.', 'Written flat price.'), E2('HONORARIO', 'FEE'))].concat(Q.xtra ? [Object.assign(L1(es ? Q.xtra.n : Q.xtra.ne, money(Q.xtra.p), E2('Te lo piden aparte. Puedes traerla tú.', 'Asked separately. You can bring your own.'), E2('OPCIONAL · TU OK', 'OPTIONAL · YOUR OK')), { box: x.xOk ? '#0B0E12' : '#fff', boxBd: x.xOk ? 'none' : '1.5px solid rgba(11,14,18,.25)', chk: x.xOk ? 'grid' : 'none', cur: 'pointer', onToggle: () => up({ xOk: !x.xOk }) })] : []) }],
        rows: [[E2('Honorario', 'Fee'), money(Q.fee)]].concat(Q.gov ? [[E2('Gobierno (se paga aparte, a la agencia)', 'Government (paid separately, to the agency)'), money(Q.gov)]] : []).concat(Q.cred ? [[E2('Crédito de la consulta', 'Consultation credit'), '−' + money(Q.cred)]] : []).concat(Q.xtra && x.xOk ? [[es ? Q.xtra.n : Q.xtra.ne, money(Q.xtra.p)]] : []).map(([k, v]) => ({ k, v })),
        open: true, holdK: E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), hold: money(qt), ready: ob.tags.includes('plan') ? E2('Puedes pagarlo en plan de pagos. Se cobra al aceptar el primer pago.', 'You can pay on a plan. The first payment is charged when you accept.') : E2('Se cobra el honorario al aceptar. Lo del gobierno lo pagas tú a la agencia.', 'The fee is charged when you accept. You pay the government fee to the agency.'),
        onApprove: () => up({ st: 'hired' }), cta: E2('Aceptar y contratar', 'Accept and hire'), onCall: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-PRO-CITA · total', ob.name, E2('Llamar a la oficina', 'Call the office')), call: E2('Llamar para preguntar', 'Call with questions'), onNone: () => up({ st: 'done', noHire: true }), none: E2('No, gracias · solo la consulta', 'No thanks · consultation only') } : { has: false, groups: [], rows: [] };
    const money2 = st === 'hired' || (st === 'done' && !x.noHire) ? { has: true, rows: (Q ? [[E2('Honorario', 'Fee'), money(Q.fee), E2('A ', 'To ') + ob.name]].concat(Q.gov ? [[E2('Gobierno', 'Government'), money(Q.gov), E2('Lo pagas tú a la agencia', 'You pay the agency')]] : []).concat(Q.cred ? [[E2('Crédito de la consulta', 'Consultation credit'), '−' + money(Q.cred), '']] : []).concat(Q.xtra && x.xOk ? [[es ? Q.xtra.n : Q.xtra.ne, money(Q.xtra.p), E2('Con tu OK', 'With your OK')]] : []) : [[name, es ? x.price : x.priceEn, it.k === 'pct' ? E2('Solo si ganas', 'Only if you win') : '']]).map(([k, v, s2]) => ({ k, v, s: s2 })), k: E2('TOTAL', 'TOTAL'), v: Q ? money(qt) : (es ? x.price : x.priceEn), s: E2('Si algo cambia, te piden tu OK primero.', 'If anything changes, they ask your OK first.') } : { has: false, rows: [] };
    return { has: true, num: (E2('CONSULTA #', 'CONSULTATION #') + x.id + ' · ' + ob.name).toUpperCase(), title: name, hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, hasSteps: steps.length > 0, steps, isPend: st === 'pend',
      est, xtra: { has: false }, money: money2, ready: { has: false, rows: [] },
      done: { has: st === 'done', t: E2('¿Cómo te fue?', 'How did it go?'), s: E2('Tu reseña sale verificada. Nunca se publica de qué trataba tu caso.', 'Your review shows as verified. What your case was about is never published.'), stars: [1, 2, 3, 4, 5].map(n => ({ onClick: () => window.TLProRev ? C.revOpen(x.own, 'cita', n, x.id) : C.encargo('APP-NEG-RESENA', 'APP-NEG-PRO-CITA · ' + n + ' estrellas', ob.name, E2('Reseña · Profesionales', 'Review · Professional')) })), rows: [[E2('Contrataste', 'You hired'), x.noHire ? E2('No', 'No') : E2('Sí', 'Yes')], [E2('Pagaste', 'You paid'), x.noHire ? (es ? x.price : x.priceEn) : Q ? money(qt) : (es ? x.price : x.priceEn)]].map(([k, v]) => ({ k, v })) },
      isAlt: st === 'alt', alt: { t: cap(dayL(x.altI || x.i, es)) + ' · ' + fmt(x.altH || 10), ok: E2('Aceptar esta hora', 'Accept this time'), no: E2('Buscar otra', 'Find another'), onOk: () => up({ st: 'ok', i: x.altI, h: x.altH, okAt: '12:55 PM' }), onNo: () => up({ st: 'no' }) },
      hasOthers: others.length > 0, others, othersK: E2('HORAS LIBRES EN ', 'OPEN TIMES AT ') + ob.name.toUpperCase(),
      rows, acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0, line: LINE[es ? 0 : 1], hasLate: false, lateL: '', onLate: () => {},
      cx: { open: s.pcx === x.id, t: E2('¿Cancelar la consulta?', 'Cancel the consultation?'), s: E2('Es gratis: no se ha cobrado nada.', 'It is free: nothing has been charged.'), yes: E2('Sí, cancelar', 'Yes, cancel'), no: 'No', onYes: () => { up({ st: 'cx' }); C.setState({ pcx: null }); }, onNo: () => C.setState({ pcx: null }) },
      onBack: () => C.nav({ code: 'APP-NEG-LISTING-PRO', biz: x.biz, from: 'APP-NEG-PRO-CITA' }),
      lbl: { back: E2('Volver a la oficina', 'Back to the office'), rowsK: E2('TU CONSULTA', 'YOUR CONSULTATION'), estT: E2('El total, por escrito', 'The total, in writing'), xtraT: '', moneyT: E2('Lo que pagas', 'What you pay'), readyT: '', partsK: '', totK: 'TOTAL' } };
  }
  function rebook(C, x, extra) { C.setState({ pb: { biz: x.biz, own: x.own, key: x.key, stf: x.stf, step: 0, i: x.i, h: x.h, how: x.how, why: x.why, note: x.note, sms: true, pm: x.pm, edit: x.id, ...(extra || {}) } }); C.nav({ code: 'APP-NEG-PRO-BOOKING', biz: x.own, from: 'APP-NEG-PRO-CITA' }); C.scrollTop(); }
  function sim(C, s) { const x = (s.pcitas || []).find(y => y.id === s.route.cid), es = (s.lang || 'es') === 'es'; if (!x) return { has: false }; const sc = s.scen || 'ok', it = itOf(x.own, x.key);
    if (x.st === 'pend') return { has: true, l: sc === 'nada' ? (es ? 'Pasa el tiempo' : 'Time passes') : (es ? 'La oficina responde' : 'Office replies'), on: () => { clearTimeout(C._pcT); upC(C, x.id, sc === 'nada' ? { st: 'exp' } : reply(x, sc)); } };
    if (x.st === 'ok') return { has: true, l: es ? 'Pasó la consulta' : 'Consultation happened', on: () => upC(C, x.id, quoteFirst(it) ? { st: 'quote', quote: quoteOf(x, sc), xOk: false } : { st: 'hired' }) };
    if (x.st === 'hired') return { has: true, l: es ? 'Terminó el trámite' : 'Case finished', on: () => upC(C, x.id, { st: 'done' }) };
    return { has: false }; }
  function mineCard(C, s, es, b) { const x = (s.pcitas || []).filter(y => y.own === b.id && ['pend', 'ok', 'alt', 'quote', 'hired'].includes(y.st)).slice(-1)[0]; if (!x) return null; const E2 = (a, c) => es ? a : c;
    const TG = { pend: [E2('PENDIENTE', 'PENDING'), 'action'], ok: [E2('CONFIRMADA', 'CONFIRMED'), 'signal'], alt: [E2('TE PROPONEN UN CAMBIO', 'THEY PROPOSE A CHANGE'), 'action'], quote: [E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), 'action'], hired: [E2('CONTRATADO', 'HIRED'), 'signal'] }[x.st];
    return { k: E2('TU CONSULTA', 'YOUR CONSULTATION'), tag: TG[0], tone: TG[1], t: (es ? x.svc : x.svcEn) + ' · ' + cap(dayL(x.i, es)) + ' · ' + fmt(x.h), s: (HOW.find(h => h[0] === x.how) || HOW[0])[es ? 1 : 2], onClick: () => C.nav({ code: 'APP-NEG-PRO-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-LISTING · Tu consulta' }) }; }
  window.TLProFlow = { start, bookVals, citaVals, sim, mineCard, slotsOf, quoteOf, qTotal, AB0, AC0, itOf };
})();

/* ==== prototype/neg-pro-rev.js ==== */
/* Servicios Profesionales (NEG-PRO) — Etapa 4: reseña del trámite + Ayuda con el trámite. Hoy = jue 24 sep 2026.
   RESEÑA (APP-NEG-RESENA, la misma pantalla): revWVals llama a TLProRev cuando b.prof. Verificada = consulta 'done' en s.pcitas.
     "Cobró el total que dijo" sale de la consulta (total por escrito vs. lo pagado; no se edita). Preguntas: hizo lo que dijo que podía ·
     te explicó · en tu idioma · cumplió la fecha · trato. NUNCA de qué trataba el caso: aviso fijo "No escribas datos de tu caso".
     ≤2 ★ → "la reseña no devuelve dinero" → Ayuda con el trámite.
   AYUDA (APP-NEG-PRO-AYUDA → -ESTADO; vistas pe/ps, TLHogarExt.phelp): cobró más del total por escrito · ofreció algo que no podía hacer por ley ·
     no hizo lo acordado · perdió una fecha o un documento · no me contesta · trato · otra → detalle (sin datos del caso) + foto del recibo o del
     total por escrito (obligatoria en cobros) → qué quieres (que me devuelvan · que terminen lo acordado · solo avisar). Respuesta: acepta ·
     propone otra cosa · no acepta → revisión de To'Latino · sin respuesta 48 h → To'Latino revisa.
     Si alguien ofreció algo que no podía hacer por ley, además se indica dónde reportarlo. Línea fija: "Nadie te garantiza un resultado." */
(function boot() {
  const SL = window.TLProL, SF = window.TLProFlow, SA = window.TLPro, X = window.TLListing, ALL = window.TLAll, HP = window.TLHogarPre;
  if (!SL || !SF || !SA || !X || !ALL || !HP) return setTimeout(boot, 40);
  const biz = id => ALL.B.find(b => b.id === id), money = n => '$' + Math.round(n).toLocaleString('en-US'), fmt = X.fmt;
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 200) + ')';
  const upP = (C, id, o) => C.setState(z => ({ hpres: (z.hpres || []).map(p => p.id === id ? { ...p, ...(typeof o === 'function' ? o(p) : o) } : p) }));
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)' });
  const LINE = SA.line, NOMED = ['No escribas datos de tu caso, números de expediente ni documentos. Cuenta cómo te atendieron.', 'Do not write case details, file numbers or documents. Tell how you were treated.'];
  const withOf = x => { const S = X.STAFF[x.own] || []; return x.stf !== 'any' && S[x.stf] ? S[x.stf][0] : ''; };

  /* ---------- Reseña ---------- */
  const paidOf = x => x.noHire ? x.price : x.quote ? '$' + Math.round(SF.qTotal(x.quote, x.xOk)).toLocaleString('en-US') : x.price;
  const cita = (s, bid, cid) => { const L = (s.pcitas || []).filter(x => x.own === bid && x.st === 'done'), x = (cid && L.find(y => y.id === cid)) || L[L.length - 1] || null; return x ? { ...x, withL: withOf(x), total: 0, paid: paidOf(x) } : null; };
  function srcs(ctA, es) { const E2 = (a, b) => es ? a : b;
    return (ctA ? [['cita', E2('Consulta #', 'Consultation #') + ctA.id + ' · ' + (es ? ctA.svc : ctA.svcEn), E2('Hoy', 'Today') + (ctA.withL ? ' · ' + ctA.withL : ''), E2('VERIFICADA', 'VERIFIED'), 'signal']] : [])
      .concat([['vis', E2("Me atendieron sin reservar por To'Latino", "They helped me without a To'Latino booking"), E2('Por teléfono o sin cita', 'By phone or walk-in'), E2('VISITANTE', 'VISITOR'), 'neutral']]); }
  function groups(G, isCita, ctA, es) { const E2 = (a, b) => es ? a : b;
    return (isCita ? [] : [G(E2('¿COBRÓ EL TOTAL QUE DIJO?', 'DID THEY CHARGE THE QUOTED TOTAL?'), 'clean', [[1, E2('Sí', 'Yes')], [-1, E2('Cobró más', 'Charged more')]])])
      .concat([G(E2('¿HIZO LO QUE DIJO QUE PODÍA?', 'DID THEY DO WHAT THEY SAID THEY COULD?'), 'price', [[1, E2('Sí', 'Yes')], [0, E2('Ofreció algo que no podía', 'Offered something they could not do')]]),
        G(E2('¿TE EXPLICÓ?', 'DID THEY EXPLAIN?'), 'asked', [[1, E2('Todo claro', 'All clear')], [0, E2('Más o menos', 'Sort of')], [-1, E2('No', 'No')]]),
        G(E2('¿EN TU IDIOMA?', 'IN YOUR LANGUAGE?'), 'whoOk', [[1, E2('En español', 'In Spanish')], [2, E2('Con intérprete', 'With an interpreter')], [0, E2('No me entendieron', 'They did not understand me')]]),
        G(E2('¿CUMPLIÓ LA FECHA?', 'DID THEY MEET THE DATE?'), 'wait', [['a', E2('Sí', 'Yes')], ['b', E2('Un poco tarde, avisó', 'A bit late, told me')], ['c', E2('Tarde, sin avisar', 'Late, no notice')]]),
        G(E2('TRATO', 'HOW THEY TREATED YOU'), 'trato', [[1, E2('Con respeto', 'With respect')], [0, E2('Normal', 'Okay')], [-1, E2('Mal trato', 'Treated badly')]])]); }
  function tm(ctA, es) { const E2 = (a, b) => es ? a : b;
    return [[E2('SERVICIO', 'SERVICE'), es ? ctA.svc : ctA.svcEn, '#0B0E12'], [E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), ctA.noHire ? E2('No contrataste', 'Not hired') : ctA.paid, '#0B0E12'], [E2('PAGASTE', 'YOU PAID'), ctA.paid + (ctA.noHire ? '' : E2(' · lo que dijo', ' · as quoted')), '#00695B']].concat(ctA.withL ? [[E2('CON', 'WITH'), ctA.withL, '#0B0E12']] : []).map(([k, v, fg]) => ({ k, v, fg })); }
  function pool(b, ctA, isCita, es) { const L = [].concat(...SL.svcs(b.id).map(g => g[2])); return (isCita && ctA ? [es ? ctA.svc : ctA.svcEn] : []).concat(L.map(it => es ? it.n : it.ne || it.n)).filter((k, i, a) => a.indexOf(k) === i).slice(0, 6); }
  function draft(F, isCita, ctA, es) { return { src: isCita ? 'cita' : 'vis', hot: null, val: null, taste: null, late: null, wait: '', lateK: '', asked: null, price: null, clean: null, trato: F.trato, whoOk: null, pro: isCita && ctA ? ctA.withL : '', cid: isCita && ctA ? ctA.id : '',
    svc: '', lic: F.price == null ? null : F.price, tot: isCita ? 1 : F.clean == null ? null : F.clean === -1 ? 0 : 1, lang: F.whoOk === 1 ? 'esp' : F.whoOk === 2 ? 'interp' : F.whoOk === 0 ? 'no' : null, time: F.wait == null || F.wait === '' ? null : F.wait === 'a' ? 1 : 0, expl: F.asked == null ? null : F.asked === 1 ? 1 : 0 }; }
  function fix(V, C, s, es, b, isCita, ctA) { const E2 = (a, c) => es ? a : c;
    return { ...V, tmK: E2('TU CONSULTA · DATO DEL TRÁMITE', 'YOUR CONSULTATION · FROM THE BOOKING'), tmNote: E2("El total por escrito y lo que pagaste salen de tu consulta en To'Latino. No se editan. Nunca se publica de qué trataba tu caso.", "The written total and what you paid come from your To'Latino consultation. They cannot be edited. What your case was about is never published."),
      meta: (b.name + (isCita && ctA ? E2(' · CONSULTA #', ' · CONSULTATION #') + ctA.id : '')).toUpperCase(),
      lowT: E2('La reseña no devuelve dinero. Si te cobraron más del total por escrito o no hicieron lo acordado, pídelo en Ayuda con el trámite.', 'A review does not refund money. If you were charged more than the written total or they did not do what was agreed, ask in Case help.'),
      onHelpOrd: () => ctA ? startHelp(C, ctA.id) : C.encargo('APP-NEG-PRO-AYUDA', 'APP-NEG-RESENA', b.name, E2('Ayuda con el trámite', 'Case help')),
      lbl: { ...V.lbl, srcNote: E2("Solo sale verificada si la consulta fue por To'Latino.", "It only shows as verified if the consultation was through To'Latino."), aspK: E2('LO QUE IMPORTA EN UN TRÁMITE', 'WHAT MATTERS IN A CASE'), recK: E2('¿QUÉ SERVICIO RECOMIENDAS?', 'WHICH SERVICE DO YOU RECOMMEND?'), recS: E2('Opcional. Sale en tu reseña.', 'Optional. Shows in your review.'),
        textPh: NOMED[es ? 0 : 1], helpOrd: E2('Ir a Ayuda con el trámite', 'Go to Case help') } }; }

  /* ---------- Ayuda con la cita ---------- */
  const RSN = [['cobro', 'Cobró más del total por escrito', 'Charged more than the written total', 1], ['ley', 'Ofreció algo que no podía hacer por ley', 'Offered something they could not legally do', 0], ['nohizo', 'No hizo lo acordado', 'Did not do what was agreed', 0], ['fecha', 'Perdió una fecha o un documento', 'Missed a deadline or lost a document', 0], ['contesta', 'No me contesta', 'Does not answer me', 0], ['trato', 'Mal trato', 'Treated badly', 0], ['otro', 'Otra cosa', 'Something else', 0]];
  const SOL = [['rev', 'Que me devuelvan', 'Refund me', 'Lo cobrado de más o lo no hecho'], ['corr', 'Que terminen lo acordado', 'Finish what was agreed', 'Sin cobrarte más'], ['avis', 'Solo quiero avisar', 'I just want to let them know', 'Lo lee la oficina y To\'Latino']];
  const isBill = r => { const z = RSN.find(y => y[0] === r); return !!(z && z[3]); };
  function startHelp(C, cid) { const x = (C.state.pcitas || []).find(y => y.id === cid); if (!x) return; const open = (C.state.hpres || []).find(p => p.mode === 'phelp' && p.cid === cid && !['done'].includes(p.st));
    if (open) { C.nav({ code: 'APP-NEG-PRO-AYUDA-ESTADO', biz: x.own, pid: open.id, from: 'APP-NEG-PRO-CITA' }); C.scrollTop(); return; }
    C.setState({ hpe: { mode: 'phelp', cid, biz: x.biz, own: x.own, r: null, note: '', phs: [], sol: 'rev', amt: '', code: '', areas: [] } }); C.nav({ code: 'APP-NEG-PRO-AYUDA', biz: x.own, cid, from: 'APP-NEG-PRO-CITA' }); C.scrollTop(); }
  function helpForm(C, s, es) { const q = s.hpe, E2 = (a, b) => es ? a : b, x = (s.pcitas || []).find(y => y.id === q.cid); if (!x) return { has: false };
    const ob = biz(x.own), upF = o => C.setState(z => ({ hpe: { ...z.hpe, ...o } })), bill = isBill(q.r);
    const miss = [!q.r ? E2('Elige qué pasó', 'Pick what happened') : null, q.note.trim().length < 15 ? E2('Cuéntanos qué pasó (15 letras o más)', 'Tell us what happened (15+ characters)') : null, bill && !q.phs.length ? E2('Agrega una foto del recibo o del total por escrito', 'Add a photo of the receipt or the written total') : null].filter(Boolean);
    const send = () => { if (miss.length) return; const id = 'T-' + (2100 + Math.floor(Math.random() * 800)); const p = { id, mode: 'phelp', cid: x.id, biz: x.biz, own: x.own, r: q.r, note: q.note, phs: q.phs, sol: q.sol, amt: q.amt, st: 'sent', at: '5:40 PM', svc: x.svc, svcEn: x.svcEn, price: paidOf(x) };
      C.setState(z => ({ hpres: (z.hpres || []).concat(p), hpe: null })); C.nav({ code: 'APP-NEG-PRO-AYUDA-ESTADO', biz: x.own, pid: id, from: 'APP-NEG-PRO-AYUDA' }); C.scrollTop(); respond(C, id); };
    return { has: true, scr: 'APP-NEG-PRO-AYUDA', hasVid: false, showPh: true, showNote: true, showCode: bill && q.sol === 'rev', title: E2('Ayuda con el trámite', 'Case help'), sub: (E2('CONSULTA #', 'CONSULTATION #') + x.id + ' · ' + ob.name).toUpperCase(),
      veh: { ic: 'law', k: E2('TU TRÁMITE', 'YOUR CASE'), t: es ? x.svc : x.svcEn, s: (withOf(x) || ob.name).toUpperCase(), hasOk: true, okT: E2('Pagaste: ', 'You paid: ') + paidOf(x), okFg: '#00695B', okIc: 'check', cta: E2('Ver', 'See'), onClick: () => C.nav({ code: 'APP-NEG-PRO-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-PRO-AYUDA' }) },
      lights: RSN.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.r === k ? 'selected' : 'filter', onClick: () => upF({ r: q.r === k ? null : k }) })), note: q.note, onNote: e => upF({ note: e.target.value.slice(0, 500) }), noteN: q.note.length + ' / 500',
      code: q.amt, onCode: e => upF({ amt: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) }),
      phs: q.phs.map((p, i) => ({ bg: PX(p.ph), vid: false, onDel: () => upF({ phs: q.phs.filter((_, j) => j !== i) }) })), canPh: q.phs.length < 4, onPh: () => upF({ phs: q.phs.concat([{ ph: [7111490, 7926666, 7688191][q.phs.length % 3], vid: false }]) }), onVid: () => {}, phN: q.phs.length + ' / 4',
      whens: SOL.map(([k, l1, l2, sub]) => ({ l: es ? l1 : l2, s: es ? sub : k === 'rev' ? 'If you were overcharged' : k === 'corr' ? 'They send the corrected bill' : 'Read by the clinic and To\'Latino', hasS: true, ...radio(q.sol === k), onClick: () => upF({ sol: k }) })),
      how: [E2(ob.name + ' recibe tu solicitud y responde en 24 h.', ob.name + ' gets your request and replies within 24 h.'), E2("Si no responde o no estás de acuerdo, To'Latino la revisa en 48 h.", "If they do not reply or you disagree, To'Latino reviews it within 48 h."), E2('Nada se da por resuelto hasta que respondan.', 'Nothing is resolved until they reply.')].map((z, i) => ({ n: String(i + 1), t: z })),
      miss: miss.map(z => ({ t: z })), hasMiss: miss.length > 0, dis: miss.length > 0, onSend: send, cta: E2('Enviar solicitud', 'Send request'), free: E2('RESPONDE EN 24 H', 'REPLIES WITHIN 24 H'),
      onBack: () => C.nav({ code: 'APP-NEG-PRO-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-PRO-AYUDA' }),
      lbl: { back: E2('Volver', 'Back'), vehT: E2('Tu cita', 'Your appointment'), symT: E2('¿Qué pasó?', 'What happened?'), symS: NOMED[es ? 0 : 1], lightsK: E2('MOTIVO', 'REASON'), notePh: E2('Ej.: el total decía $815 y me cobraron $900…', 'E.g. the total said $815 and they charged $900…'),
        codeK: E2('¿CUÁNTO? · OPCIONAL', 'HOW MUCH? · OPTIONAL'), codePh: E2('Ej.: 60', 'E.g. 60'), phT: bill ? E2('Foto del recibo o del total por escrito · obligatoria', 'Photo of the receipt or written total · required') : E2('Foto · opcional', 'Photo · optional'), phS: E2('Tapa los números de tu caso si aparecen; solo hace falta el cobro.', 'Cover any case numbers; only the charge is needed.'), addPh: E2('Foto', 'Photo'), addVid: '', vidTag: '',
        whenT: E2('¿Qué quieres?', 'What would you like?'), howK: E2('CÓMO FUNCIONA', 'HOW IT WORKS'), missK: E2('TE FALTA', 'STILL NEEDED'), honest: LINE[es ? 0 : 1] + ' ' + (q.r === 'ley' ? E2('Si te ofrecieron un trámite de inmigración sin ser abogado ni representante acreditado, también puedes reportarlo a la Fiscalía de Pennsylvania.', 'If someone who is not an attorney or accredited representative offered you an immigration service, you can also report it to the Pennsylvania Attorney General.') : E2("To'Latino no da consejo legal.", "To'Latino does not give legal advice.")) } };
  }
  function reply(p, sc) { const amt = p.amt ? +p.amt : 60; return sc === 'rechaza' ? { st: 'no', repAt: '6:20 PM' } : sc === 'cambio' ? { st: 'alt', repAt: '6:20 PM', altAmt: Math.round(amt * .5) } : { st: 'ok', repAt: '6:20 PM', okAmt: p.sol === 'rev' ? amt : 0 }; }
  function respond(C, id) { clearTimeout(C._phT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._phT = setTimeout(() => upP(C, id, p => p.st === 'sent' ? reply(p, sc) : {}), 4000); }
  function helpStatus(C, s, es, p) { const E2 = (a, b) => es ? a : b, ob = biz(p.own), st = p.st, rsn = RSN.find(z => z[0] === p.r), sol = SOL.find(z => z[0] === p.sol);
    const okT = p.sol === 'rev' ? E2('Te devolvemos ', 'Refunding ') + money(p.okAmt || 0) : p.sol === 'corr' ? E2('Terminan lo acordado sin cobrarte más', 'They finish what was agreed at no extra cost') : E2('Gracias por avisar', 'Thanks for letting us know');
    const H = { sent: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, E2("Responde en 24 h. Si no, To'Latino la revisa en 48 h.", "Replies within 24 h. Otherwise, To'Latino reviews it within 48 h.")],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('ACEPTÓ', 'ACCEPTED'), okT, p.sol === 'rev' ? E2('Vuelve a tu tarjeta en 3–5 días hábiles.', 'Back to your card in 3–5 business days.') : p.sol === 'corr' ? E2('Te escriben con la fecha en que lo terminan.', 'They write you with the date they finish.') : ''],
      alt: ['dollar', 'rgba(255,176,32,.2)', '#8A5A00', E2('PROPONE OTRA COSA', 'PROPOSES SOMETHING ELSE'), E2('Devolverte ', 'Refund ') + money(p.altAmt || 0), E2("Tú decides. Si no te sirve, pide revisión a To'Latino.", "You decide. If it does not work for you, ask To'Latino to review.")],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO ACEPTÓ', 'DECLINED'), ob.name + E2(' dice que cumplió lo acordado', ' says they did what was agreed'), E2("Si no estás de acuerdo, To'Latino revisa el total por escrito y tus fotos en 48 h.", "If you disagree, To'Latino reviews the written total and your photos within 48 h.")],
      rev: ['shield', 'rgba(75,55,245,.1)', '#4B37F5', E2("EN REVISIÓN DE TO'LATINO", "UNDER TO'LATINO REVIEW"), E2('Revisamos en 48 h', 'We review within 48 h'), E2('Miramos el total por escrito, lo que pagaste y tus fotos. Te escribimos por SMS.', 'We look at the written total, what you paid and your photos. We will text you.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('LISTO', 'DONE'), p.doneT || '', E2('Gracias por avisarnos.', 'Thanks for letting us know.')] }[st];
    const acts = st === 'ok' ? [['check', E2('Entendido', 'Got it'), () => upP(C, p.id, { st: 'done', doneT: okT })]] : st === 'alt' ? [['dollar', E2('Aceptar ', 'Accept ') + money(p.altAmt || 0), () => upP(C, p.id, { st: 'done', doneT: E2('Devuelto ', 'Refunded ') + money(p.altAmt || 0) })], ['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : st === 'no' ? [['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : [];
    return { has: true, title: E2('Ayuda con el trámite', 'Case help'), num: (E2('SOLICITUD #', 'REQUEST #') + p.id + E2(' · CONSULTA #', ' · CONSULTATION #') + p.cid).toUpperCase(), hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, big: false, small: true,
      steps: [[E2('Enviada', 'Sent'), p.at, 1], [E2('Respuesta de ', 'Reply from ') + ob.name, p.repAt || '', st !== 'sent'], [E2('Resuelta', 'Resolved'), '', st === 'done']].map(([label, time, d], i, a) => ({ label, time, state: d ? 'done' : (i === 0 || a[i - 1][2]) ? 'current' : 'next' })),
      rep: { has: ['ok', 'alt', 'no'].includes(st), who: ob.name, ph: PX(ob.ph[0], 120), at: p.repAt, t: st === 'ok' ? E2('Revisamos y tienes razón. Disculpa el error.', 'We checked and you are right. Sorry for the mistake.') : st === 'alt' ? E2('Parte de lo cobrado estaba en el total. Podemos devolverte ' + money(p.altAmt || 0) + '.', 'Part of the charge was in the total. We can refund ' + money(p.altAmt || 0) + '.') : E2('Hicimos lo que dice el total por escrito. Si quieres, lo revisamos juntos por teléfono.', 'We did what the written total says. If you want, we can go over it by phone.'),
        hasInc: false, inc: [], chg: [], valid: '', time: '', cta: E2('Llamar a la oficina', 'Call the office'), onCta: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-PRO-AYUDA-ESTADO', ob.name, E2('Llamar a la oficina', 'Call the office')) },
      req: { rows: [[E2('MOTIVO', 'REASON'), rsn ? rsn[es ? 1 : 2] : '—'], [E2('QUIERES', 'YOU WANT'), sol ? sol[es ? 1 : 2] : '—']].concat(p.amt ? [[E2('MONTO', 'AMOUNT'), money(+p.amt)]] : []).concat([[E2('LES CONTASTE', 'YOU SAID'), '«' + p.note + '»']]).map(([k, v]) => ({ k, v })), phs: (p.phs || []).map(z => ({ bg: PX(z.ph), vid: false })) },
      hasOthers: false, others: [], acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0,
      onBack: () => C.nav({ code: 'APP-NEG-PRO-CITA', biz: p.own, cid: p.cid, from: 'APP-NEG-PRO-AYUDA-ESTADO' }),
      lbl: { back: E2('Volver a la consulta', 'Back to the consultation'), repK: E2('RESPUESTA DE ', 'REPLY FROM ') + ob.name.toUpperCase(), incK: '', chgK: '', reqK: E2('LO QUE MANDASTE', 'WHAT YOU SENT'), othersK: '', vidTag: '', honest: LINE[es ? 0 : 1] } };
  }
  const EXT = window.TLHogarExt = window.TLHogarExt || {};
  EXT.phelp = { form: helpForm, status: helpStatus, sim: (C, s, p) => { const es = (s.lang || 'es') === 'es', sc = s.scen || 'ok';
    if (p.st === 'sent') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 24 h' : '24 h pass') : (es ? 'La oficina responde' : 'Office replies'), on: () => { clearTimeout(C._phT); upP(C, p.id, sc === 'nada' ? { st: 'rev' } : reply(p, sc)); } };
    if (p.st === 'rev') return { has: true, l: es ? "To'Latino decide" : "To'Latino decides", on: () => upP(C, p.id, { st: 'done', doneT: (es ? 'Te devolvemos ' : 'Refunding ') + money(p.amt ? +p.amt : 30) }) };
    return null; } };
  window.TLProRev = { cita, srcs, groups, tm, pool, draft, fix, startHelp };
})();

/* ==== prototype/neg-listing.js ==== */
/* Página base del negocio (APP-NEG-LISTING-PRO / -FREE) — contenido de ejemplo por negocio. Hoy: jue 24 sep 2026. */
(function () {
  const P = (id, h) => /^(data:|https?:)/.test(String(id)) ? 'url(' + id + ')' : 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 350) + ')';
  const POSTS = {
    'sabor-dominicano': [['of', 'Mofongo de chicharrón $12, hasta agotar.', 'Pork-rind mofongo $12, while it lasts.', 2, 0], ['nv', 'Hoy hay sancocho, desde las 12 PM.', 'Sancocho today, from 12 PM.', 4, 1], ['of', 'Delivery gratis en pedidos de más de $30.', 'Free delivery on orders over $30.', 6, 2]],
    'panaderia-la-espiga': [['nv', 'Pan de agua caliente desde las 7 AM.', 'Hot pan de agua from 7 AM.', 3, 0], ['ll', 'Bizcocho dominicano por libra, pídelo hoy.', 'Dominican cake by the pound, order today.', 5, 1]],
    'pollo-don-lucho': [['of', 'Pollo entero + papas $19 los martes.', 'Whole chicken + fries $19 on Tuesdays.', 4, 0]],
    'empanadas-dona-tere': [['of', 'Docena de empanadas $15 este sábado.', 'A dozen empanadas $15 this Saturday.', 8, 0], ['nv', 'Nuevo relleno: pollo con queso.', 'New filling: chicken and cheese.', 9, 1], ['of', 'Pedidos para el domingo hasta el viernes 6 PM.', 'Sunday orders until Friday 6 PM.', 11, 2]],
    'jugos-tropical': [['ll', 'Llegó la chinola: jugo grande $4.', 'Passion fruit is in: large juice $4.', 1, 0], ['of', 'Morir soñando 2 por $7 hasta las 3 PM.', 'Morir soñando 2 for $7 until 3 PM.', 3, 1]],
    'dulces-mama-yoli': [['nv', 'Tomando pedidos de bizcocho para el sábado.', 'Taking cake orders for Saturday.', 3, 0]],
  };
  const ABOUT = {
    'sabor-dominicano': ['Cocina dominicana en Wyoming St desde 2014. Doña Rosa y su familia cocinan todos los días: la bandera al mediodía, mofongo y chivo guisado en la noche. Catering para bautizos, cumpleaños y oficinas.', 'Dominican kitchen on Wyoming St since 2014. Doña Rosa and her family cook every day: la bandera at noon, mofongo and goat stew at night. Catering for baptisms, birthdays and offices.', 2014],
    'panaderia-la-espiga': ['Pan de agua, pan sobao y bizcocho dominicano horneados aquí desde las 5 AM. Encargos de bizcocho con 48 horas.', 'Pan de agua, pan sobao and Dominican cake baked here from 5 AM. Cake orders with 48 hours notice.', 2011],
    'fritura-dona-carmen': ['Frituras de la casa: quipes, pastelitos, chicharrón y yaniqueques. Pickup en la ventana de Alter St.', 'Home-style fried food: quipes, pastelitos, chicharrón and yaniqueques. Pickup at the Alter St window.', 2020],
    'el-fogon': ['Parrilla dominicana en Wyoming St: churrasco, chuleta ahumada y pica pollo al carbón. Abierto hasta la medianoche.', 'Dominican grill on Wyoming St: churrasco, smoked pork chops and charcoal fried chicken. Open until midnight.', 2017],
    "el-coqui-boricua": ["Comida puertorriqueña en Hazleton: mofongo, arroz con gandules, alcapurrias y alitas. Cocina la familia Rivera, de Bayamón.","Puerto Rican food in Hazleton: mofongo, arroz con gandules, alcapurrias and wings. Cooked by the Rivera family, from Bayamón.",2020],
    "la-habana-sandwich": ["Sándwich cubano, medianoche y tortas mexicanas en pan del día. Café cubano desde las 7 AM.","Cuban sandwich, medianoche and Mexican tortas on fresh bread. Cuban coffee from 7 AM.",2021],
    "asados-la-pampa": ["Parrilla argentina y brasileña a la leña: vacío, entraña, picanha y choripán. Argentinos y un parrillero brasileño en Hazleton.","Argentinian and Brazilian wood-fired grill: vacío, skirt steak, picanha and choripán. Argentinians and a Brazilian grill cook in Hazleton.",2019],
    "meal-prep-yuli": ["Comida de la semana hecha en cocina certificada: almuerzos dominicanos balanceados y un plan vegano. Pides hasta el domingo, llega el lunes.","Weekly meals from a certified kitchen: balanced Dominican lunches and a vegan plan. Order by Sunday, delivered Monday.",2022],
    "chef-ramon": ["Chef privado: cocino en tu casa cenas dominicanas y españolas para 2 a 20 personas. Cotización por escrito.","Private chef: I cook Dominican and Spanish dinners at your home for 2 to 20 people. Written quote.",2018],
    "barra-movil-el-trago": ["Barra móvil y bartenders para bodas, quinceañeras y cumpleaños. Tú pones las bebidas; nosotros, la barra y el servicio.","Mobile bar and bartenders for weddings, quinceañeras and birthdays. You bring the drinks; we bring the bar and service.",2021],
    "pasteles-arte-dulce": ["Pasteles decorados para bautizos, quinceañeras y bodas. Bizcocho dominicano con suspiro o fondant, hecho por encargo.","Decorated cakes for baptisms, quinceañeras and weddings. Dominican cake with meringue or fondant, made to order.",2017],
    "cocina-alma-delivery": ["Cocina solo para entrega, de 4 PM a 11 PM: burgers, bowls y chimis con sabor latino. Sin local: todo llega a tu puerta.","Delivery-only kitchen, 4 PM to 11 PM: burgers, bowls and chimis with Latin flavor. No storefront: everything comes to your door.",2023],
    'cafe-quisqueya': ['Café dominicano y desayunos desde las 7 AM: mangú, tostadas y café colado al momento.', 'Dominican coffee and breakfast from 7 AM: mangú, toast and fresh-brewed coffee.', 2019],
    'pollo-don-lucho': ['Pollo a la brasa al estilo peruano, marinado 24 horas y asado a la leña. También lomo saltado y ají de gallina.', 'Peruvian-style rotisserie chicken, marinated 24 hours and wood-roasted. Also lomo saltado and ají de gallina.', 2018],
    'tacos-el-guero': ['Camión de tacos en la esquina de Broad y Pine. Tortillas hechas a mano y al pastor del trompo, hasta las 2 AM.', 'Taco truck at the corner of Broad and Pine. Handmade tortillas and al pastor off the spit, until 2 AM.', 2021],
    'mariscos-la-bahia': ['Pescado y mariscos frescos al estilo de Samaná. Abre para la cena, de 4 PM a 10 PM.', 'Fresh fish and seafood, Samaná style. Open for dinner, 4 PM to 10 PM.', 2016],
    'empanadas-dona-tere': ['Empanadas colombianas hechas en casa, solo sábados y domingos. Pide con anticipación y pasa a recoger.', 'Homemade Colombian empanadas, Saturdays and Sundays only. Order ahead and pick up.', 2022],
    'jugos-tropical': ['Jugos naturales y batidos con la fruta del día: chinola, lechosa, guineo. Morir soñando como en la capital.', 'Fresh juices and shakes with the fruit of the day: passion fruit, papaya, banana. Morir soñando like back home.', 2020],
    'catering-hazleton': ['Catering dominicano para bautizos, quinceañeras y oficinas, de 20 a 200 personas. Cotización gratis; el precio final se confirma por escrito.', 'Dominican catering for baptisms, quinceañeras and offices, 20 to 200 guests. Free quote; the final price is confirmed in writing.', 2015],
    'dulces-mama-yoli': ['Bizcocho dominicano, suspiro y dulces caseros por encargo. Se recoge en N Laurel St.', 'Dominican cake, meringue frosting and homemade sweets to order. Pickup on N Laurel St.', 2019],
    'cocina-miguelina': ['Comida casera los fines de semana: sancocho, locrio y moro. Se acaba temprano.', 'Home cooking on weekends: sancocho, locrio and moro. It sells out early.', 2021],
    'pupuseria-morazan': ['Pupusas salvadoreñas hechas al momento, con curtido y salsa de la casa.', 'Salvadoran pupusas made to order, with curtido and house salsa.', 2017],
    'pizza-express': ['Pizza, calzones y alitas para llevar o delivery, hasta la medianoche.', 'Pizza, calzones and wings for pickup or delivery, until midnight.', 2012],
    'burger-81': ['Hamburguesas a la plancha y papas fritas, cerca de la I-81.', 'Griddled burgers and fries, near I-81.', 2018],
    'arepas-caracas': ['Arepas, cachapas y tequeños venezolanos desde el desayuno.', 'Venezuelan arepas, cachapas and tequeños from breakfast on.', 2020],
    'chimi-el-primo': ['Chimi, hot dog dominicano y papas locas en el camión de Alter St, de 6 PM a 2 AM.', 'Chimi burgers, Dominican hot dogs and loaded fries at the Alter St truck, 6 PM to 2 AM.', 2019],
    'flan-y-mas': ['Flanes y tres leches por porción o enteros, sábados y domingos.', 'Flan and tres leches by the slice or whole, Saturdays and Sundays.', 2022],
    'desayunos-mi-viejo': ['Desayuno dominicano desde las 6 AM: mangú, huevos con salami y café con leche.', 'Dominican breakfast from 6 AM: mangú, eggs with salami and café con leche.', 2016],
    'taqueria-guerrero': ['Tacos de trompo y de lengua, y tortas al estilo de Guerrero. Pozole los fines de semana.', 'Trompo and tongue tacos, and Guerrero-style tortas. Pozole on weekends.', 2015],
    'batidos-dona-ana': ['Batidos y jugos naturales hechos al momento con la fruta del día.', 'Shakes and fresh juices made to order with the fruit of the day.', 2021],
    'antojitos-la-guera': ['Elotes, esquites, raspados y mangonadas los fines de semana.', 'Elotes, esquites, shaved ice and mangonadas on weekends.', 2023],
  };
  const MENU = {
    'sabor-dominicano': [['Almuerzo', 'Lunch', [['La bandera', 'Arroz, habichuelas, pollo guisado y ensalada', 12], ['Chivo guisado', 'Con arroz blanco y tostones', 16], ['Pescado frito', 'Con tostones y ensalada', 18]]], ['De la casa', 'House specials', [['Mofongo de chicharrón', 'Con caldo de pollo', 12], ['Sancocho', 'Solo sábados y domingos', 14], ['Mangú con los tres golpes', 'Salami, queso frito y huevo', 11]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 5], ['Jugo de chinola', 'Natural', 4]]]],
    'panaderia-la-espiga': [['Pan', 'Bread', [['Pan de agua', 'Docena', 6], ['Pan sobao', 'Docena', 7]]], ['Bizcochos', 'Cakes', [['Bizcocho dominicano', 'Por libra, relleno de piña', 18], ['Tres leches', 'Porción', 5]]]],
    'fritura-dona-carmen': [['Frituras', 'Fried', [['Quipe', 'Unidad', 2], ['Pastelito de pollo', 'Unidad', 2.5], ['Chicharrón', 'Libra', 12], ['Yaniqueque', 'Unidad', 2], ['Plato mixto', 'Salami, queso y tostones', 10]]]],
    'el-fogon': [['Parrilla', 'Grill', [['Churrasco', 'Con tostones y chimichurri', 24], ['Chuleta ahumada', 'Con moro y ensalada', 16], ['Pica pollo', 'Cuarto de pollo frito con tostones', 9]]], ['Acompañantes', 'Sides', [['Tostones', 'Porción', 5], ['Yuca frita', 'Porción', 5]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 5]]]],
    'cafe-quisqueya': [['Desayunos', 'Breakfast', [['Mangú con los tres golpes', 'Salami, queso frito y huevo', 11], ['Tostada con huevo', 'Pan de agua, huevo y queso', 7], ['Avena caliente', 'Con canela', 4]]], ['Café', 'Coffee', [['Café con leche', 'Colado al momento', 3], ['Cortadito', 'Pequeño', 2.5], ['Chocolate caliente', 'Con queso de hoja', 3.5]]]],
    'pollo-don-lucho': [['Pollo a la brasa', 'Rotisserie chicken', [['Pollo entero', 'Con papas y ensalada', 22], ['Medio pollo', 'Con papas y ensalada', 12], ['Cuarto de pollo', 'Con papas', 8]]], ['Peruano', 'Peruvian', [['Lomo saltado', 'Con arroz y papas', 17], ['Ají de gallina', 'Con arroz', 14]]], ['Bebidas', 'Drinks', [['Chicha morada', 'Grande', 4], ['Inca Kola', 'Lata', 2.5]]]],
    'tacos-el-guero': [['Tacos', 'Tacos', [['Al pastor', 'Del trompo, con piña', 3.5], ['Asada', 'Con cebolla y cilantro', 3.5], ['Carnitas', 'Estilo Michoacán', 3.5]]], ['Platos', 'Plates', [['Quesabirria', 'Tres, con consomé', 14], ['Burrito de asada', 'Con frijoles y arroz', 12]]], ['Bebidas', 'Drinks', [['Horchata', 'Grande', 4]]]],
    'mariscos-la-bahia': [['Del mar', 'From the sea', [['Pescado frito', 'Chillo entero con tostones', 22], ['Camarones al ajillo', 'Con arroz blanco', 21], ['Mofongo de camarones', 'Con salsa criolla', 22]]], ['Sopas', 'Soups', [['Sopa de mariscos', 'Para uno', 16]]], ['Bebidas', 'Drinks', [['Jugo de chinola', 'Natural', 4]]]],
    'empanadas-dona-tere': [['Empanadas', 'Empanadas', [['De carne', 'Masa de maíz, papa y res', 1.75], ['De pollo', 'Masa de maíz, papa y pollo', 1.75], ['Pollo con queso', 'Nueva', 2], ['Docena surtida', 'Doce, con ají de la casa', 20]]], ['Para acompañar', 'Extras', [['Ají de la casa', 'Vasito', 1], ['Avena colombiana', 'Fría', 3.5]]]],
    'jugos-tropical': [['Jugos', 'Juices', [['Jugo de chinola', 'Grande', 4], ['Morir soñando', 'Grande', 4], ['Jugo verde', 'Apio, piña y espinaca', 5]]], ['Batidos', 'Shakes', [['Batido de lechosa', 'Grande', 5], ['Batido de guineo', 'Grande', 5]]]],
    'catering-hazleton': [['Bandejas', 'Trays', [['Arroz con pollo', 'Para 20 personas', 90], ['Pica pollo', 'Para 20 personas', 120], ['Pastelitos', '50 unidades', 60]]], ['Servicio', 'Service', [['Montaje y servicio', 'Hasta 4 horas', 150]]]],
    "el-coqui-boricua": [["Platos","Plates",[["Mofongo con pernil","Con caldo de pollo",15],["Arroz con gandules y pernil","Con ensalada",14]]],["Alitas y frituras","Wings & fritters",[["Alitas (10)","Guayaba BBQ o picantes",13],["Alcapurrias (2)","De carne",6]]]],
    "la-habana-sandwich": [["Sándwiches","Sandwiches",[["Cubano","Pernil, jamón, queso suizo, pepinillo",11],["Medianoche","En pan dulce",10],["Torta de milanesa","Pan telera, aguacate, jalapeño",12]]],["Café","Coffee",[["Café cubano","Colado al momento",2.5]]]],
    "asados-la-pampa": [["Parrilla","Grill",[["Parrillada para 2","Vacío, chorizo, morcilla, pollo",42],["Picanha","Con farofa y vinagreta",26],["Choripán","Con chimichurri",9]]],["Para empezar","Starters",[["Empanada argentina","Carne cortada a cuchillo",3.5],["Pan de queso (6)","Pão de queijo",6]]]],
    "meal-prep-yuli": [["Planes","Plans",[["Plan de 5 comidas","Almuerzo de lunes a viernes",55],["Plan de 10 comidas","Almuerzo y cena",99],["Plan vegano · 5","Cambia cada semana",58]]]],
    "chef-ramon": [["Cenas","Dinners",[["Cena para 6","Tres tiempos · desde",240],["Cena para 12","Tres tiempos · desde",420]]],["Clases","Classes",[["Clase en tu cocina","2 horas, hasta 6 personas",150]]]],
    "barra-movil-el-trago": [["Paquetes","Packages",[["Barra para 50 personas","4 horas, 1 bartender",450],["Bartender extra","Por hora",45],["Mocktails para niños","Hasta 30 niños",120]]]],
    "pasteles-arte-dulce": [["Pasteles","Cakes",[["Pastel decorado · 1 piso","Para 25 personas",85],["Pastel decorado · 2 pisos","Para 60 personas",160],["Cupcakes decorados (12)","Con tu tema",36]]]],
    "cocina-alma-delivery": [["Lo de la casa","House",[["Burger dominicana","Con salami frito y queso de hoja",12],["Bowl de pernil","Arroz, habichuelas, maduros",13],["Chimi de pollo","Con papas",10]]]],
    "hielo-agua-cristal": [["Hielo","Ice",[["Bolsa de hielo 10 lb","En cubos",3],["Bolsa de hielo 20 lb","En cubos",5]]],["Agua","Water",[["Botellón 5 gal","Trae el vacío",7]]]],
    "paella-valencia": [["Paellas","Paellas",[["Paella mixta para 2","Mariscos y pollo",34]]],["Tapas","Tapas",[["Tortilla española","Con alioli",9],["Croquetas de jamón (6)","Caseras",8]]]],
    "tamales-dona-chayo": [["Tamales","Tamales",[["Tamal colorado","Cerdo, en hoja de plátano",3.5],["Docena de tamales","Colorados o negros",38],["Chuchito","En tuza",2.5]]]],
    "baleadas-la-ceiba": [["Baleadas","Baleadas",[["Baleada sencilla","Frijoles, queso, mantequilla",3],["Baleada con todo","Con huevo y aguacate",5]]],["Platos","Plates",[["Pollo con tajadas","Con repollo y salsa",12]]]],
    "encebollado-el-guayas": [["Desayuno","Breakfast",[["Encebollado","Con chifles",12],["Bolón de verde","Queso o chicharrón",6]]],["Platos","Plates",[["Ceviche de camarón","Con canguil",14]]]],
    "wok-chofan-express": [["Platos","Plates",[["Chofán de la casa","Cerdo, pollo y camarón",12],["Pollo agridulce","Con arroz blanco",11],["Wonton frito (8)","Con salsa",6]]]],
    "buffet-la-mesa-latina": [["Buffet","Buffet",[["Almuerzo","Hasta las 4 PM",13.99],["Cena","Desde las 4 PM",16.99],["Caja para llevar","Por libra",7.99]]]],
    "paleteria-la-michoacana": [["Paletas y helado","Pops & ice cream",[["Paleta de fruta","Mango, fresa, coco",2.5],["Helado (2 bolas)","En vaso o cono",4.5]]],["Aguas y raspados","Aguas & raspados",[["Raspado","Tamarindo, mango, fresa",4],["Agua fresca grande","Horchata o jamaica",4.5]]]],
    "boba-tropical": [["Boba","Boba",[["Boba de dulce de leche","Con tapioca",6],["Boba de chinola","Sin té",6]]],["Frías","Cold",[["Café frío de horchata","Con canela",5.5]]]],
    "carrito-don-nico": [["Frituras","Fritters",[["Yaniqueque","Recién hecho",2],["Quipe","De carne",1.5],["Chicharrón (1/2 lb)","Con limón",6]]]],
    'empanadas-dona-luz': [['Empanadas', 'Empanadas', [['Empanada de pollo', 'Hecha en casa', 2.5], ['Empanada de queso', 'Hecha en casa', 2.5], ['Docena surtida', 'Pollo, carne y queso', 26]]]],
    'dulces-mama-yoli': [['Dulces', 'Sweets', [['Bizcocho dominicano', 'Por libra, con suspiro', 18], ['Majarete', 'Vasito', 4], ['Dulce de leche cortada', 'Porción', 5], ['Suspiritos', 'Docena', 6]]]],
    'cocina-miguelina': [['Fin de semana', 'Weekends', [['Sancocho', 'Con arroz blanco y aguacate', 12], ['Locrio de pollo', 'Con ensalada', 11], ['Moro con chuleta', 'Moro de guandules', 12], ['Asopao de pollo', 'Para uno', 10]]]],
    'pupuseria-morazan': [['Pupusas', 'Pupusas', [['Revuelta', 'Chicharrón, frijol y queso', 3], ['Queso con loroco', 'Unidad', 3.25], ['Frijol con queso', 'Unidad', 3]]], ['Más', 'More', [['Plátano frito', 'Con crema y frijoles', 6], ['Horchata', 'Grande', 3]]]],
    'pizza-express': [['Pizzas', 'Pizzas', [['Pizza de queso', 'Grande, 8 pedazos', 14], ['Pizza pepperoni', 'Grande, 8 pedazos', 16], ['Calzone', 'Jamón y queso', 11]]], ['Más', 'More', [['Alitas', '10 unidades', 13], ['Refresco', '2 litros', 4]]]],
    'burger-81': [['Hamburguesas', 'Burgers', [['Clásica', 'Con papas', 9], ['Doble con queso', 'Con papas', 12]]], ['Más', 'More', [['Papas fritas', 'Porción grande', 4], ['Batida de vainilla', 'Grande', 5]]]],
    'arepas-caracas': [['Arepas', 'Arepas', [['Reina pepiada', 'Pollo y aguacate', 9], ['Pabellón', 'Carne mechada, caraotas y plátano', 11]]], ['Más', 'More', [['Cachapa con queso', 'De mano', 10], ['Tequeños', '6 unidades', 8]]]],
    'chimi-el-primo': [['Del camión', 'From the truck', [['Chimi de res', 'Con repollo y salsa', 8], ['Chimi de pollo', 'Con repollo y salsa', 8], ['Hot dog dominicano', 'Con papitas', 5], ['Papas locas', 'Con queso y salami', 7]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 4]]]],
    'flan-y-mas': [['Flanes', 'Flan', [['Flan de leche', 'Porción', 4], ['Flan de coco', 'Porción', 4.5], ['Flan entero', '8 porciones, por encargo', 24]]], ['Más', 'More', [['Tres leches', 'Porción', 5]]]],
    'desayunos-mi-viejo': [['Desayunos', 'Breakfast', [['Mangú con los tres golpes', 'Salami, queso frito y huevo', 10], ['Huevos con salami', 'Con pan tostado', 8], ['Avena', 'Caliente, con canela', 3.5]]], ['Bebidas', 'Drinks', [['Café con leche', 'Grande', 2.5]]]],
    'taqueria-guerrero': [['Tacos', 'Tacos', [['Tacos de trompo', 'Tres, con piña', 9], ['Tacos de lengua', 'Tres', 11]]], ['Platos', 'Plates', [['Torta de milanesa', 'Con aguacate', 11], ['Pozole rojo', 'Sábados y domingos', 13]]], ['Bebidas', 'Drinks', [['Agua de jamaica', 'Grande', 3]]]],
    'batidos-dona-ana': [['Batidos', 'Shakes', [['Batido de lechosa', 'Grande', 5], ['Batido de zapote', 'Grande', 5.5], ['Morir soñando', 'Grande', 4.5], ['Jugo de naranja', 'Natural', 4]]]],
    'antojitos-la-guera': [['Antojitos', 'Snacks', [['Elote preparado', 'Con mayonesa, queso y chile', 4], ['Esquites', 'Vaso grande', 4], ['Mangonada', 'Con chamoy y tajín', 6], ['Raspado de mango', 'Grande', 3.5]]]],
  };
  const GEN = [['Del día', 'Today', [['Plato del día', 'Pregunta qué hay hoy', 12], ['Especial de la casa', 'Con acompañante', 14], ['Bebida natural', 'Grande', 4]]]];
  const ADDR = {
    'sabor-dominicano-alter': '412 Alter St, Hazleton PA', 'sabor-dominicano': '412 N Wyoming St, Hazleton PA', 'panaderia-la-espiga': '28 E Broad St, Hazleton PA', 'el-fogon': '690 N Wyoming St, Hazleton PA', 'cafe-quisqueya': '15 W Broad St, Hazleton PA', 'pollo-don-lucho': '221 N Church St, Hazleton PA', 'tacos-el-guero': 'E Broad St y N Pine St, Hazleton PA', 'mariscos-la-bahia': '318 W Diamond Ave, Hazleton PA', 'empanadas-dona-tere': '144 N Laurel St, Hazleton PA', 'jugos-tropical': '57 E Broad St, Hazleton PA', 'catering-hazleton': '900 N Church St, Hazleton PA', 'fritura-dona-carmen': '155 Alter St, Hazleton PA', 'dulces-mama-yoli': '402 N Laurel St, Hazleton PA', 'empanadas-dona-luz': 'Peace St, Hazleton PA', 'cocina-miguelina': '233 Carson St, Hazleton PA', 'pupuseria-morazan': '18 N Wyoming St, Hazleton PA', 'pizza-express': '101 S Wyoming St, Hazleton PA', 'burger-81': '520 Airport Rd, Hazleton PA', 'arepas-caracas': '77 W Diamond Ave, Hazleton PA', 'chimi-el-primo': 'Alter St y E Oak St, Hazleton PA', 'flan-y-mas': '36 N Vine St, Hazleton PA', 'desayunos-mi-viejo': '12 S Laurel St, Hazleton PA', 'taqueria-guerrero': '300 N James St, Hazleton PA', 'batidos-dona-ana': '9 E Diamond Ave, Hazleton PA', 'antojitos-la-guera': '22 N Wyoming St, Hazleton PA' };
  const REV = [
    ['Yokasta M.', 'HACE 3 DÍAS', 5, 'La bandera como en casa. Pedí pickup y a los 20 minutos estaba lista, caliente.', 'The bandera tastes like home. Ordered pickup and it was ready and hot in 20 minutes.', 'Gracias, Yokasta. Te esperamos el sábado para el sancocho.', 4.12],
    ['Luis R.', 'HACE 1 SEMANA', 5, 'El mofongo vale la pena. Los viernes en la noche hay espera, llega temprano.', 'The mofongo is worth it. Friday nights there is a wait, get there early.', '', 2.14],
    ['Kathy P.', 'HACE 2 SEMANAS', 4, 'Buena comida y precio justo. El delivery tardó más de lo que decía la app.', 'Good food, fair price. Delivery took longer than the app said.', 'Tienes razón, ese día tuvimos un solo chofer. Ya contratamos otro.', 38.98],
  ];
  const NAMES = ['Yokasta M.', 'Luis R.', 'Kathy P.', 'Ramón A.', 'Daisy T.', 'Wilfredo C.', 'Mariela S.', 'José L.', 'Anny V.'];
  function revFor(b, i) {
    if (b.id === 'sabor-dominicano') return REV;
    const fin = b.days === 'finde';
    const G = [
      ['HACE 3 DÍAS', 5, 'Todo fresco y bien servido. Pedí para llevar y estaba listo a tiempo.', 'Everything fresh and generous. Ordered to go and it was ready on time.', 1],
      ['HACE 1 SEMANA', 5, fin ? 'Buen precio y te atienden en español. El sábado temprano hay fila.' : 'Buen precio y te atienden en español. Los viernes hay fila, llega temprano.', fin ? 'Fair prices and they speak Spanish. Early Saturday there is a line.' : 'Fair prices and they speak Spanish. Fridays there is a line, get there early.', 0],
      ['HACE 2 SEMANAS', 4, 'Rico, pero esperé más de lo que me dijeron. Igual vuelvo.', 'Tasty, but I waited longer than they said. I will be back anyway.', 2],
    ];
    return G.map((g, k) => { const name = NAMES[(i * 2 + k) % NAMES.length], first = name.split(' ')[0];
      return [name, g[0], g[1], g[2], g[3], g[4] === 1 ? 'Gracias, ' + first + '. Te esperamos pronto.' : g[4] === 2 ? 'Tienes razón, ese día estábamos cortos de personal. Ya lo resolvimos.' : '']; });
  }
  const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], DOWEN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dur = m => { const h = Math.floor(m / 60), mm = m % 60; return h ? h + ' h' + (mm ? ' ' + mm + ' min' : '') : mm + ' min'; };
  const fmt = h => { const hh = Math.floor(h) % 24, m = Math.round((h - Math.floor(h)) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const rng = (a, b) => fmt(a) + ' – ' + fmt(b);
  const closeH = st => { const m = /cierra (\d+) (AM|PM)/.exec(st || ''); if (!m) return 21; const h = +m[1] % 12 + (m[2] === 'PM' ? 12 : 0); return h === 0 ? 24 : h < 6 ? h + 24 : h; };
  function hoursPro(b, es) {
    const NOW = 12.5, HR = b.hrs || [11, closeH(b.st)], o = HR[0], c = HR[1], fin = b.days === 'finde', open = !!b.open;
    const cl = (es ? ' · cierra a las ' : ' · closes at ') + fmt(c);
    const tl = fin ? [] : o >= 16 ? [[o, c, (es ? 'Cena' : 'Dinner') + cl]] : o < 11 ? [[o, 12, es ? 'Mañana' : 'Morning'], [12, c, (es ? 'Tarde' : 'Afternoon') + cl]] : [[o, 16, es ? 'Almuerzo' : 'Lunch'], [16, c, (es ? 'Cena' : 'Dinner') + cl]];
    const hpToday = fin ? [{ range: es ? 'Hoy cerrado' : 'Closed today', label: (es ? 'Abre sáb y dom · ' : 'Open Sat & Sun · ') + rng(o, c), op: 1, dot: '#fff', ring: 'rgba(11,14,18,.3)', nowDisp: 'none', lineDisp: 'none' }]
      : tl.map((t, i) => { const now = open && NOW >= t[0] && NOW < t[1], past = NOW >= t[1];
        return { range: rng(t[0], t[1]), label: t[2], op: past ? .45 : 1, dot: now ? '#00A88F' : '#fff', ring: now ? '#00A88F' : '#0B0E12', nowDisp: now ? 'inline-block' : 'none', lineDisp: i < tl.length - 1 ? 'block' : 'none' }; });
    const hpCountdown = fin ? (es ? 'sábado a las ' : 'Saturday at ') + fmt(o) : dur(Math.round(((open ? c : o) - NOW) * 60));
    const nextLabel = fin ? (es ? 'Abre el' : 'Opens') : open ? (es ? 'Cierra en' : 'Closes in') : (es ? 'Abre en' : 'Opens in');
    const CD = es ? 'Cerrado' : 'Closed', hol = [];
    if (fin) hol.push({ dateLong: es ? 'Sábado 31 oct' : 'Saturday Oct 31', name: es ? 'Halloween · horario extendido' : 'Halloween · extended hours', tagFg: '#4B37F5', text: rng(o, 21) });
    else if (o >= 16) hol.push({ dateLong: es ? 'Lunes 12 oct' : 'Monday Oct 12', name: es ? 'Día de la Raza · feriado' : 'Columbus Day · holiday', tagFg: '#C0392B', text: CD });
    else if (c > 18) hol.push({ dateLong: es ? 'Lunes 12 oct' : 'Monday Oct 12', name: es ? 'Día de la Raza · feriado' : 'Columbus Day · holiday', tagFg: '#4B37F5', text: rng(o, 18) });
    hol.push(fin ? { dateLong: es ? 'Domingo 29 nov' : 'Sunday Nov 29', name: es ? 'Fin de semana de Acción de Gracias' : 'Thanksgiving weekend', tagFg: '#C0392B', text: CD } : { dateLong: es ? 'Jueves 26 nov' : 'Thursday Nov 26', name: es ? 'Acción de Gracias' : 'Thanksgiving', tagFg: '#C0392B', text: CD });
    /* Próximos cambios: si el negocio está en el Panel v2, salen los feriados que eligió en Tu página · Horario (over.sched o la base) con sus fechas (TLDash2.HOLD). */
    { const T2 = window.TLDash2, b2 = T2 && T2.BIZ && T2.BIZ[b.id]; if (b2 && T2.HOLD) { let sc = b2.sched || [], b2h = b2.hours || null; try { const o2 = ((JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})[b.id]) || {}; if (Array.isArray(o2.sched)) sc = o2.sched; if (Array.isArray(o2.hours) && o2.hours.length === 7) b2h = o2.hours; } catch (e) {}
      const DWL = es ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MOL = es ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], T0 = new Date(2026, 8, 24).getTime();
      const L2 = sc.map(k => T2.HOLD[k]).filter(Boolean).map(H2 => { const a = new Date(H2.d[0][0], H2.d[0][1], H2.d[0][2]), z = H2.d[H2.d.length - 1], e = new Date(z[0], z[1], z[2]);
        return { t: a.getTime(), te: e.getTime(), dateLong: H2.d.length > 1 ? (es ? a.getDate() + '–' + e.getDate() + ' ' + MOL[e.getMonth()] : MOL[e.getMonth()] + ' ' + a.getDate() + '–' + e.getDate()) : (es ? DWL[a.getDay()] + ' ' + a.getDate() + ' ' + MOL[a.getMonth()] : DWL[a.getDay()] + ' ' + MOL[a.getMonth()] + ' ' + a.getDate()), name: H2.n[es ? 0 : 1], ...(() => { const W = b2h ? b2h[(a.getDay() + 6) % 7] : null, wc = W && W.on ? (W.two ? W.b2 : W.b) : 0, wo = W && W.on ? W.a : o, shut2 = !H2.b || (b2h && !(W && W.on)) || (H2.b && wo >= H2.b); return { tagFg: shut2 ? '#C0392B' : '#4B37F5', text: shut2 ? CD : rng(wo, Math.min(H2.b, wc || H2.b)) }; })() }; }).filter(x => x.te >= T0).sort((x, y) => x.t - y.t).slice(0, 3);
      hol.length = 0; (L2.length ? L2 : [{ dateLong: es ? 'Sin cambios programados' : 'No scheduled changes', name: es ? 'Tu horario de siempre' : 'Regular hours', tagFg: 'rgba(11,14,18,.35)', text: '' }]).forEach(x => { delete x.t; delete x.te; hol.push(x); }); } }
    const SHUT = { range: CD, type: '', color: 'rgba(11,14,18,.12)', dash: 'transparent', fg: 'rgba(11,14,18,.45)', weight: 600 };
    const hpWeek = [...Array(7)].map((_, i) => { const d = new Date(2026, 8, 21 + i), dow = d.getDay(), isT = i === 3;
      const shut = (fin && !(dow === 0 || dow === 6)) || (b.closed || []).includes(dow) || (!!b.auto && dow === 0 && !b.sun), sp = dow === 6 && b.sat ? b.sat : dow === 0 && b.sun ? b.sun : null, early = !fin && !shut && !sp && dow === 0 && o < 16 && c > 18;
      return { d: isT ? (es ? 'HOY' : 'TODAY') : (es ? DOW[dow] : DOWEN[dow]), dc: isT ? (open ? '#00695B' : '#C0392B') : 'rgba(11,14,18,.55)',
        lines: shut ? [SHUT] : [{ range: sp ? rng(sp[0], sp[1]) : rng(o, early ? 18 : c), type: '', color: '#0B0E12', dash: 'transparent', fg: '#0B0E12', weight: isT ? 800 : 600 }],
        tag: early ? (es ? 'CIERRA TEMPRANO' : 'CLOSES EARLY') : '', tagDisp: early ? 'inline-block' : 'none', tagBg: 'rgba(192,57,43,.1)', tagFg: '#C0392B' }; });
    return { data: { hpToday, hpChanges: hol, hpWeek, hpCountdown }, dateLabel: es ? 'HOY · JUE 24 SEP' : 'TODAY · THU SEP 24', nextLabel };
  }
  function simpleWeek(b, es) {
    const HR = b.hrs || [11, closeH(b.st || 'cierra 11 PM')], fin = b.days === 'finde';
    const L = es ? ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return L.map((d, i) => { const dw = (i + 1) % 7, shut = fin ? i < 5 : b.closed ? b.closed.includes(dw) || (!!b.auto && dw === 0 && !b.sun && b.closed.length > 0) : i === 0, isT = i === 3, sp = dw === 6 && b.sat ? b.sat : dw === 0 && b.sun ? b.sun : null;
      return { d: isT ? (es ? 'HOY' : 'TODAY') : d, v: shut ? (es ? 'Cerrado' : 'Closed') : sp ? rng(sp[0], sp[1]) : HR[0] === 0 && HR[1] >= 24 ? (es ? '24 horas' : '24 hours') : rng(HR[0], HR[1]), dc: isT ? (b.open ? '#00695B' : '#C0392B') : 'rgba(11,14,18,.55)', w: isT ? 800 : 600, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }; });
  }
  /* Pestañas por contenido: solo aparecen si el negocio tiene datos aquí. */
  const EVENTS = {
    'sabor-dominicano': [['Noche de merengue en vivo', 'Live merengue night', 'VIE 25 SEP · 8 PM', 'FRI SEP 25 · 8 PM', 'ENTRADA LIBRE', 'FREE ENTRY'], ['Sancocho del domingo en familia', 'Sunday family sancocho', 'DOM 27 SEP · 1 PM', 'SUN SEP 27 · 1 PM', '$14 POR PERSONA', '$14 PER PERSON']],
    'el-fogon': [['Playoffs de Grandes Ligas en pantalla grande', 'MLB playoffs on the big screen', 'SÁB 3 OCT · 7 PM', 'SAT OCT 3 · 7 PM', 'ENTRADA LIBRE', 'FREE ENTRY']],
    'panaderia-la-espiga': [['Clase de bizcocho dominicano', 'Dominican cake class', 'SÁB 10 OCT · 10 AM', 'SAT OCT 10 · 10 AM', '$25 · 12 CUPOS', '$25 · 12 SPOTS']],
  };
  const STAFF = {
    'sabor-dominicano': [['Rosa Peña', 'Dueña y cocinera', 'Owner and cook', 2014], ['Juan Carlos Peña', 'Cocina y parrilla', 'Kitchen and grill', 2014], ['Yanet Almonte', 'Salón y caja', 'Front and register', 2019], ['Miguel Reyes', 'Delivery', 'Delivery', 2022]],
    'el-fogon': [['Freddy Batista', 'Dueño y parrillero', 'Owner and grill master', 2017], ['Carolina Batista', 'Salón', 'Front of house', 2018]],
    'pollo-don-lucho': [['Luis Huamán', 'Dueño', 'Owner', 2018], ['Rocío Quispe', 'Cocina', 'Kitchen', 2019]],
    'el-coqui-boricua': [['Wanda Rivera', 'Dueña y cocinera', 'Owner and cook', 2020], ['Héctor Rivera', 'Frituras y alitas', 'Fritters and wings', 2020]],
    'la-habana-sandwich': [['Yoel Castillo', 'Dueño', 'Owner', 2021], ['Maritza Castillo', 'Plancha y café', 'Press and coffee', 2021]],
    'asados-la-pampa': [['Martín Ferreyra', 'Dueño y parrillero', 'Owner and grill master', 2019], ['Thiago Souza', 'Parrilla brasileña', 'Brazilian grill', 2021]],
    'meal-prep-yuli': [['Yulissa Mota', 'Dueña y cocinera', 'Owner and cook', 2022]],
    'chef-ramon': [['Ramón Estévez', 'Chef privado', 'Private chef', 2018]],
    'barra-movil-el-trago': [['Kelvin Durán', 'Dueño y bartender', 'Owner and bartender', 2021], ['Yesenia Durán', 'Bartender', 'Bartender', 2022]],
    'pasteles-arte-dulce': [['Dulce María Peña', 'Repostera y decoradora', 'Baker and cake decorator', 2017]],
    'cocina-alma-delivery': [['Andrés Molina', 'Dueño y cocinero', 'Owner and cook', 2023], ['Leidy Molina', 'Pedidos y entregas', 'Orders and delivery', 2023]],
    'panaderia-la-espiga': [['Ana Tavárez', 'Panadera', 'Baker', 2011], ['Héctor Tavárez', 'Horno y encargos', 'Oven and orders', 2013]],
  };
  const JOBS = {
    'sabor-dominicano': [['Ayudante de cocina', 'Kitchen helper', 'TIEMPO COMPLETO', 'FULL TIME', '$15–17/H', 'Preparación, limpieza y apoyo en la línea. Experiencia en cocina dominicana es un plus.', 'Prep, cleaning and line support. Dominican cooking experience is a plus.', 3], ['Chofer de delivery', 'Delivery driver', 'MEDIO TIEMPO', 'PART TIME', '$13/H + PROPINAS', 'Carro propio y licencia de PA. Tardes y fines de semana.', 'Own car and PA license. Evenings and weekends.', 6]],
    'el-fogon': [['Mesero o mesera', 'Server', 'MEDIO TIEMPO', 'PART TIME', '$10/H + PROPINAS', 'Jueves a domingo, de 6 PM al cierre. Español e inglés básico.', 'Thursday to Sunday, 6 PM to close. Spanish and basic English.', 2]],
    'pizza-express': [['Chofer de delivery', 'Delivery driver', 'TIEMPO COMPLETO', 'FULL TIME', '$14/H + PROPINAS', 'Carro propio, licencia de PA y récord limpio.', 'Own car, PA license and clean record.', 4]],
  };
  const RSV = ['sabor-dominicano', 'el-fogon', 'mariscos-la-bahia'];
  MENU['sabor-dominicano-alter'] = MENU['sabor-dominicano'];
  window.TLListing = { P, POSTS, ABOUT, MENU, GEN, ADDR, REV, revFor, hoursPro, simpleWeek, fmt, EVENTS, STAFF, JOBS, RSV };
})();

/* ==== prototype/neg-menu.js ==== */
/* Módulo Menú (F-COMIDA) — carta completa de ejemplo: Sabor Dominicano, Hazleton. Hoy: jue 24 sep 2026, 12:30 PM.
   Grupos de opciones: req = obligatorio (elige 1), max = tope de selección. Precio en dólares. */
(function () {
  const P = (id, h) => /^(data:|https?:)/.test(String(id)) ? String(id) : 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const G = {
    carne: { es: 'Elige la carne', en: 'Choose the meat', req: 1, max: 1, o: [['Pollo guisado', 'Stewed chicken', 0], ['Res guisada', 'Stewed beef', 2], ['Cerdo guisado', 'Stewed pork', 1.5], ['Chivo guisado', 'Goat stew', 4]] },
    arroz: { es: 'Arroz', en: 'Rice', req: 1, max: 1, o: [['Blanco con habichuelas', 'White rice and beans', 0], ['Moro de guandules', 'Rice with pigeon peas', 1]] },
    lado: { es: 'Acompañante', en: 'Side', req: 1, max: 1, o: [['Tostones', 'Tostones', 0], ['Maduros', 'Sweet plantains', 0], ['Ensalada verde', 'Green salad', 0], ['Yuca hervida', 'Boiled yuca', 0]] },
    prep: { es: 'Preparación', en: 'Style', req: 1, max: 1, o: [['Frito', 'Fried', 0], ['En salsa criolla', 'In creole sauce', 2], ['Al ajillo', 'Garlic sauce', 2]] },
    relleno: { es: 'Relleno', en: 'Filling', req: 1, max: 1, o: [['Chicharrón', 'Pork rinds', 0], ['Pollo guisado', 'Stewed chicken', 0], ['Camarones al ajillo', 'Garlic shrimp', 6]] },
    caldo: { es: 'Caldo', en: 'Broth', req: 1, max: 1, o: [['Caldo de pollo aparte', 'Chicken broth on the side', 0], ['Sin caldo', 'No broth', 0]] },
    quita: { es: 'Quítale', en: 'Leave out', req: 0, max: 3, o: [['Sin salami', 'No salami', 0], ['Sin queso frito', 'No fried cheese', 0], ['Sin huevo', 'No egg', 0]] },
    extra: { es: 'Agrégale', en: 'Add', req: 0, max: 3, o: [['Aguacate', 'Avocado', 2.5], ['Tostones extra', 'Extra tostones', 3], ['Maduros extra', 'Extra sweet plantains', 3], ['Queso frito', 'Fried cheese', 2.5], ['Huevo frito', 'Fried egg', 1.5]] },
    salsa: { es: 'Salsas', en: 'Sauces', req: 0, max: 2, o: [['Salsa de ajo', 'Garlic sauce', 0], ['Pique de la casa', 'House hot sauce', 0]] },
    tam: { es: 'Tamaño', en: 'Size', req: 1, max: 1, o: [['Vaso grande', 'Large glass', 0], ['Jarra, 4 vasos', 'Pitcher, 4 glasses', 9]] },
    azucar: { es: 'Azúcar', en: 'Sugar', req: 1, max: 1, o: [['Normal', 'Regular', 0], ['Poca azúcar', 'Less sugar', 0], ['Sin azúcar', 'No sugar', 0]] },
  };
  /* ítem: [id, es, en, desc es, desc en, precio, foto, opciones, marcas]  marcas: pop · of (oferta, was = precio normal) · finde (solo sáb y dom) · t (min de cocina) */
  const CATS = [
    { k: 'almuerzo', es: 'Almuerzo', en: 'Lunch', until: 16, note: ['HASTA LAS 4 PM', 'UNTIL 4 PM'], items: [
      ['bandera', 'La bandera', 'La bandera', 'Arroz, habichuelas, carne guisada y ensalada.', 'Rice, beans, stewed meat and salad.', 12, 27556972, ['carne', 'arroz', 'extra'], { pop: 1 }],
      ['picapollo', 'Pica pollo', 'Fried chicken', 'Cuarto de pollo frito con tostones.', 'Quarter fried chicken with tostones.', 12, 14686443, ['salsa', 'extra'], { pop: 1 }],
      ['chivo', 'Chivo guisado', 'Goat stew', 'Con arroz blanco y tostones.', 'With white rice and tostones.', 16, 27556981, ['arroz', 'extra'], { ago: 1 }],
      ['pescado', 'Pescado frito', 'Fried fish', 'Chillo entero con tostones y ensalada.', 'Whole red snapper with tostones and salad.', 18, 36857725, ['prep', 'lado'], { t: 25 }],
    ] },
    { k: 'casa', es: 'De la casa', en: 'House specials', items: [
      ['mofongo', 'Mofongo de chicharrón', 'Mofongo with pork rinds', 'Plátano majado con ajo y chicharrón.', 'Mashed plantain with garlic and pork rinds.', 12, 37121074, ['relleno', 'caldo', 'extra'], { pop: 1, of: 1, was: 14 }],
      ['mangu', 'Mangú con los tres golpes', 'Mangú with los tres golpes', 'Salami, queso frito y huevo.', 'Salami, fried cheese and egg.', 11, 14810483, ['quita', 'extra']],
      ['chicharron', 'Chicharrón de cerdo', 'Fried pork belly', 'Una libra, con tostones y limón.', 'One pound, with tostones and lime.', 14, 8954034, []],
      ['sancocho', 'Sancocho', 'Sancocho', 'De siete carnes, con arroz blanco y aguacate.', 'Seven-meat stew with white rice and avocado.', 14, 27397342, [], { finde: 1 }],
    ] },
    { k: 'lados', es: 'Acompañantes', en: 'Sides', items: [
      ['tostones', 'Tostones', 'Tostones', 'Ocho piezas, con sal y ajo.', 'Eight pieces, salt and garlic.', 5, 27556971, []],
      ['maduros', 'Maduros', 'Sweet plantains', 'Plátano maduro frito.', 'Fried ripe plantain.', 5, 12362298, []],
      ['moro', 'Moro de guandules', 'Rice with pigeon peas', 'Porción grande.', 'Large portion.', 4, 8992843, []],
      ['aguacate', 'Aguacate', 'Avocado', 'Medio aguacate con sal.', 'Half an avocado with salt.', 3, 10839334, []],
    ] },
    { k: 'bebidas', es: 'Bebidas', en: 'Drinks', items: [
      ['morir', 'Morir soñando', 'Morir soñando', 'Jugo de naranja con leche, bien frío.', 'Orange juice with milk, ice cold.', 5, 20300401, ['tam', 'azucar'], { pop: 1 }],
      ['chinola', 'Jugo de chinola', 'Passion fruit juice', 'Natural, hecho al momento.', 'Fresh, made to order.', 4, 33709196, ['tam', 'azucar']],
      ['limonada', 'Limonada', 'Lemonade', 'Con limón fresco.', 'Made with fresh lemons.', 3.5, 3651045, ['azucar']],
    ] },
    { k: 'postres', es: 'Postres', en: 'Desserts', items: [
      ['flan', 'Flan de leche', 'Milk flan', 'Porción, con caramelo.', 'Slice, with caramel.', 4.5, 9501562, []],
      ['tresleches', 'Tres leches', 'Tres leches', 'Porción, con canela.', 'Slice, with cinnamon.', 5, 32590852, []],
    ] },
  ];
  const ITEMS = {};
  CATS.forEach(c => c.items = c.items.map(([id, es, en, ds, de, p, ph, opts, f]) => (ITEMS[id] = Object.assign({ id, es, en, ds, de, p, ph, opts, cat: c.k, until: c.until }, f || {}))));
  const BIZ = { name: 'Sabor Dominicano', ini: 'SD', ph: [39122376, 38330332, 39143744], pickup: 25, delivery: [35, 45], fee: 3, freeOver: 30, tax: 0.06, now: 12.5, closes: 21 };
  const POP = ['bandera', 'mofongo', 'picapollo', 'morir'];
  const XSELL = ['morir', 'chinola', 'tostones', 'flan'];
  /* pedido de ejemplo: [id, {grupo: [índices]}, cantidad] */
  const START = [['bandera', { carne: [1], arroz: [1], extra: [0] }, 1], ['morir', { tam: [0], azucar: [0] }, 2], ['tostones', {}, 1]];
  /* Horario propio (Panel v2 · Menú · Categorías y platos): avail 'own' + av { f, t (min desde 0:00), d [0–6, 0 = dom] }; los viejos almuerzo · cena · finde se convierten. Hoy en el prototipo: jue 12:30 PM. */
  const DOW = 4, DN = [['DOM', 'SUN'], ['LUN', 'MON'], ['MAR', 'TUE'], ['MIÉ', 'WED'], ['JUE', 'THU'], ['VIE', 'FRI'], ['SÁB', 'SAT']], ALL = [0, 1, 2, 3, 4, 5, 6];
  const LGV = { almuerzo: { f: 0, t: 960, d: ALL }, cena: { f: 960, t: 1440, d: ALL }, finde: { f: 0, t: 1440, d: [0, 6] } };
  const avN = (avail, av) => avail === 'own' && av && av.d ? av : LGV[avail] || null;
  const tl = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
  const dl = (d, es) => { const S = d.slice().sort().join(); return S === '0,1,2,3,4,5,6' ? '' : S === '1,2,3,4,5' ? (es ? 'LUN–VIE' : 'MON–FRI') : S === '0,6' ? (es ? 'SÁB Y DOM' : 'SAT AND SUN') : [1, 2, 3, 4, 5, 6, 0].filter(z => d.includes(z)).map(z => DN[z][es ? 0 : 1]).join(' · '); };
  const both = fn => [fn(true), fn(false)];
  /* hrs(avail del plato o null = como su categoría, av del plato, cfg de la categoría, ahora en min) → null (todo el horario) | { off, l: [es, en] | null } */
  function hrs(avail, av, cc, now) { const a = avail && avail !== 'cat' ? avN(avail, av) : cc ? avN(cc.avail, cc.av) : null; if (!a) return null;
    const inDay = a.d.includes(DOW), off = !inDay || now < a.f || now >= a.t;
    const l = !inDay ? both(es => dl(a.d, es)) : now < a.f ? both(es => (es ? 'DESDE ' : 'FROM ') + tl(a.f)) : a.t < 1440 ? both(es => (es ? 'HASTA ' : 'UNTIL ') + tl(a.t)) : null;
    return { off, l: l && l[0] ? l : null }; }
  /* Para el Super Admin: el horario del plato como lo dejó el negocio en su panel (o el de su categoría). */
  function hrsLive(id) { let ov = null; try { ov = (JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})['sabor-dominicano']; } catch (e) {} const it0 = ITEMS[id] || {};
    const i = ov && ov.items ? ov.items.find(x => x.id === id) : null, cc = ov && ov.catCfg && i ? ov.catCfg[i.cat] : null, own = i && i.avail && i.avail !== 'cat';
    const a = i && (own || (cc && cc.avail)) ? (own ? avN(i.avail, i.av) : avN(cc.avail, cc.av)) : it0.finde ? LGV.finde : it0.until ? { f: 0, t: it0.until * 60, d: ALL } : null; if (!a) return null;
    const tm = es => a.f <= 0 && a.t < 1440 ? (es ? 'hasta ' : 'until ') + tl(a.t) : a.f > 0 && a.t >= 1440 ? (es ? 'desde ' : 'from ') + tl(a.f) : a.f > 0 ? tl(a.f) + '–' + tl(a.t) : '';
    return both(es => [dl(a.d, es).toLowerCase(), tm(es)].filter(Boolean).join(' · ')); }
  window.TLMenu = { P, G, CATS, ITEMS, BIZ, POP, XSELL, START, hrs, hrsLive };
})();

/* ==== prototype/neg-rsv.js ==== */
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

/* ==== prototype/neg-nov.js ==== */
/* Novedades del negocio (pestaña base, solo Pro). Cada publicación es una herramienta: oferta · hoy hay · aviso de horario · encuesta · cupón para seguidores · novedad · evento · vacante.
   h = horas desde que se publicó (< 24 → también sale en "Hoy en el barrio"). up/dn = votos. cm = comentarios [nombre, es, en, h, votos, respuesta del negocio [es, en]]. */
(function () {
  const POSTS = {
    'sabor-dominicano': [
      { id: 'n1', k: 'oferta', pin: 1, h: 2, es: 'Mofongo de chicharrón a $12 hoy, hasta agotar. Con caldo de pollo.', en: 'Pork-rind mofongo for $12 today, while it lasts. With chicken broth.', item: 'mofongo', was: 14, now: 12, left: 14, endEs: 'Hasta agotar · hoy', endEn: 'While it lasts · today', up: 48, dn: 2,
        cm: [['Yesenia M.', '¿Lo tienen para delivery también?', 'Is it available for delivery too?', 1, 9, ['Sí, Yesenia. El precio es el mismo en delivery y pickup.', 'Yes, Yesenia. Same price for delivery and pickup.']], ['Rafael T.', 'El mejor mofongo de Hazleton, sin discusión.', 'Best mofongo in Hazleton, no contest.', 1, 14]] },
      { id: 'n2', k: 'encuesta', h: 5, es: '¿Qué cocinamos el sábado en la noche?', en: 'What should we cook Saturday night?', opts: [['Chivo guisado', 'Goat stew', 41], ['Pescado frito', 'Fried fish', 33], ['Locrio de pollo', 'Chicken locrio', 19]], endsH: 43, up: 22, dn: 0,
        cm: [['Carmen R.', 'Chivo, como el del mes pasado.', 'Goat, like last month.', 3, 6]] },
      { id: 'n3', k: 'cupon', h: 9, es: 'Para quienes nos siguen: $3 de descuento en pedidos de $15 o más.', en: 'For our followers: $3 off orders of $15 or more.', code: 'SABOR3', off: 3, min: 15, left: 37, endEs: 'Vence el domingo 27 sep', endEn: 'Expires Sunday Sep 27', up: 30, dn: 1, cm: [] },
      { id: 'n4', k: 'horario', h: 20, es: 'El lunes 12 de octubre, Día de la Raza, cerramos a las 6 PM.', en: 'Monday October 12, Columbus Day, we close at 6 PM.', dayEs: 'Lunes 12 oct', dayEn: 'Monday Oct 12', hrs: '11 AM – 6 PM', up: 12, dn: 0,
        cm: [['Luis P.', '¿Y el domingo abren normal?', 'Are you open as usual on Sunday?', 18, 3, ['Sí, Luis: domingo de 11 AM a 9 PM.', 'Yes, Luis: Sunday 11 AM to 9 PM.']]] },
      { id: 'n5', k: 'hoy', h: 30, es: 'Llegó el flan de leche de doña Rosa. Son poquitos.', en: "Doña Rosa's flan is in. Just a few.", item: 'flan', up: 35, dn: 1, cm: [] },
      { id: 'n6', k: 'evento', h: 34, es: 'Este viernes: noche de merengue en vivo. Entrada libre.', en: 'This Friday: live merengue night. Free entry.', ev: 0, up: 57, dn: 3, cm: [['Wendy S.', '¡Allá nos vemos!', 'See you there!', 20, 4]] },
      { id: 'n7', k: 'nov', h: 72, es: 'Estrenamos terraza: 8 mesas afuera para las noches de septiembre. Se puede reservar.', en: 'Our new patio is open: 8 tables outside for September nights. Reservations available.', up: 64, dn: 2, cm: [] },
      { id: 'n8', k: 'vacante', h: 96, es: 'Buscamos ayudante de cocina. Tiempo completo.', en: "We're hiring a kitchen helper. Full time.", job: 0, up: 18, dn: 0, cm: [] }
    ]
  };
  window.TLNov = { POSTS };
})();

/* ==== prototype/neg-staff.js ==== */
/* Staff del negocio (pestaña base). La estructura es la misma para todas las categorías; CAT decide qué muestra cada una.
   Solo aparece quien aceptó la invitación; la persona controla su foto y su bio. El contacto pasa por el negocio (salvo silla o cabina propia).
   wk = horario por día de la semana (0 = dom … 6 = sáb): [entra, sale] o null. Hoy = jue 24 sep 2026, 12:30 PM. */
(function () {
  const P = (id, h) => /^(data:|https?:)/.test(String(id)) ? String(id) : 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 500);
  /* rate = calificación propia · next = próxima hora libre · dishes = sus platos · works = trabajos · dates = próximas fechas · cert = licencias · cta = acción principal */
  const CAT = {
    comida: { title: ['El equipo', 'The team'], dishes: 1, cert: 1, cta: 'menu' },
    belleza: { title: ['Barberos y estilistas', 'Barbers and stylists'], rate: 1, next: 1, works: 1, cert: 1, cta: 'booking' },
    noche: { title: ['DJs y equipo', 'DJs and team'], dates: 1, cta: 'mesa' },
    salud: { title: ['Profesionales', 'Providers'], rate: 1, next: 1, cert: 1, cta: 'cita' }
  };
  const LANG = { es: ['Español', 'Spanish'], en: ['Inglés', 'English'], qu: ['Quechua', 'Quechua'] };
  const CERT = (y) => ({ es: 'Certificación en seguridad alimentaria · Pensilvania', en: 'Food safety certification · Pennsylvania', ok: 1, exp: ['Vence en ' + y, 'Expires ' + y] });
  const D = (a, b, c, d, e, f, g) => [a, b, c, d, e, f, g];
  const PEOPLE = {
    'sabor-dominicano': [
      { ph: 16810622, langs: ['es'], sp: [['Guisos', 'Stews'], ['Sancocho', 'Sancocho'], ['Catering', 'Catering']], wk: D([11, 17], null, [11, 17], [11, 17], [11, 17], [11, 17], [11, 17]), dishes: ['bandera', 'chivo', 'sancocho'], cert: CERT('mar 2028'),
        bio: ['Aprendí a cocinar con mi abuela en Moca. Llegué a Hazleton en 2009 y en 2014 abrimos Sabor Dominicano con mi hijo Juan Carlos. El sancocho del domingo sigue siendo su receta.', 'I learned to cook with my grandmother in Moca. I came to Hazleton in 2009 and in 2014 we opened Sabor Dominicano with my son Juan Carlos. The Sunday sancocho is still her recipe.'] },
      { ph: 20147040, langs: ['es', 'en'], sp: [['Parrilla', 'Grill'], ['Chicharrón', 'Chicharrón'], ['Mofongo', 'Mofongo']], wk: D([15, 21], [15, 21], null, null, [15, 21], [15, 21], [15, 21]), dishes: ['chicharron', 'mofongo', 'picapollo'],
        bio: ['Me encargo de la parrilla y del chicharrón. Si pides mofongo en la noche, lo más seguro es que lo pise yo.', 'I run the grill and the chicharrón. If you order mofongo at night, I am most likely the one mashing it.'] },
      { ph: 6223005, langs: ['es', 'en'], sp: [['Pedidos grandes', 'Large orders'], ['Catering', 'Catering'], ['Reservaciones', 'Reservations']], wk: D(null, [11, 19], [11, 19], [11, 19], null, [11, 19], [11, 19]), dishes: [],
        bio: ['Te recibo en el salón y en la caja. Coordino los pedidos grandes y el catering para bautizos y cumpleaños.', 'I welcome you in the dining room and at the register. I coordinate large orders and catering for baptisms and birthdays.'] },
      { ph: 13443789, langs: ['es', 'en'], sp: [['Delivery en Hazleton', 'Hazleton delivery'], ['Pedidos grandes', 'Large orders']], wk: D([12, 21], [12, 21], null, null, [12, 21], [12, 21], [12, 21]), dishes: [],
        bio: ['Llevo los pedidos por todo Hazleton. Si me dejas instrucciones de cómo entrar, llego más rápido.', 'I deliver orders all over Hazleton. If you leave instructions on how to get in, I get there faster.'] }
    ],
    'el-fogon': [
      { ph: 31752160, langs: ['es'], sp: [['Parrilla al carbón', 'Charcoal grill'], ['Churrasco', 'Churrasco']], wk: D([16, 24], null, null, [16, 24], [16, 24], [16, 24], [16, 24]), dishes: ['Churrasco', 'Chuleta ahumada'], cert: CERT('ago 2027'),
        bio: ['Parrillero desde los 15 años en Santiago. En El Fogón la carne se hace al carbón, sin apuro.', 'Grill master since I was 15 in Santiago. At El Fogón the meat is cooked over charcoal, no rush.'] },
      { ph: 4349799, langs: ['es', 'en'], sp: [['Grupos', 'Groups'], ['Reservaciones', 'Reservations']], wk: D([18, 24], null, null, null, [18, 24], [18, 24], [18, 24]), dishes: [],
        bio: ['Atiendo el salón de jueves a domingo. Si vienen en grupo, reserven y les preparo la mesa.', 'I run the dining room Thursday to Sunday. If you come as a group, book ahead and I will set up your table.'] }
    ],
    'pollo-don-lucho': [
      { ph: 17861364, langs: ['es', 'en'], sp: [['Pollo a la brasa', 'Rotisserie chicken'], ['Cocina peruana', 'Peruvian food']], wk: D(null, [11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 22]), dishes: ['Pollo entero', 'Lomo saltado'], cert: CERT('ene 2028'),
        bio: ['Traje de Lima la receta del pollo a la brasa de mi papá. El ají de la casa lo hacemos todos los días.', "I brought my dad's rotisserie chicken recipe from Lima. We make the house ají every day."] },
      { ph: 16782090, langs: ['es', 'qu'], sp: [['Ají de gallina', 'Ají de gallina'], ['Salsas', 'Sauces']], wk: D([11, 19], null, [11, 19], [11, 19], [11, 19], [11, 19], [11, 19]), dishes: ['Ají de gallina'],
        bio: ['Soy de Cusco. Hago el ají de gallina y las salsas de la casa.', "I'm from Cusco. I make the ají de gallina and the house sauces."] }
    ],
    'panaderia-la-espiga': [
      { ph: 16937177, langs: ['es'], sp: [['Pan de agua', 'Pan de agua'], ['Bizcochos', 'Cakes'], ['Encargos', 'Special orders']], wk: D(null, [5, 13], [5, 13], [5, 13], [5, 13], [5, 13], [5, 13]), dishes: ['Pan de agua', 'Bizcocho dominicano'], cert: CERT('jun 2027'),
        bio: ['Horneo desde las 5 de la mañana. El pan de agua sale a las 7 y el bizcocho se encarga con 48 horas.', 'I bake from 5 in the morning. Pan de agua comes out at 7 and cakes are ordered 48 hours ahead.'] },
      { ph: 16239806, langs: ['es', 'en'], sp: [['Horno', 'Oven'], ['Encargos', 'Special orders']], wk: D(null, [12, 19], [12, 19], [12, 19], [12, 19], [12, 19], null), dishes: ['Pan sobao', 'Tres leches'],
        bio: ['Me ocupo del horno y de los encargos. Si tu bizcocho es para el sábado, pídelo el jueves.', 'I handle the oven and special orders. If your cake is for Saturday, order it on Thursday.'] }
    ]
  };
  window.TLStaff = { P, CAT, LANG, PEOPLE, TODAY: 4, NOW: 12.5 };
})();

/* ==== prototype/neg-jobs.js ==== */
/* Jobs del negocio (pestaña base, solo Pro). Pago real por hora obligatorio. Sin CV, sin estatus migratorio ni SSN.
   pay = [mín, máx] por hora · tips = lleva propinas · sch = [días es, días en, horas] · lang = idiomas (req = obligatorio) · req = requisitos · ben = beneficios · ago = días publicada · left = cupos. */
(function () {
  const J = {
    'sabor-dominicano': [
      { id: 'j-sd-1', t: ['Ayudante de cocina', 'Kitchen helper'], k: ['Tiempo completo', 'Full time'], pay: [15, 17], tips: 0, sch: ['Martes a domingo', 'Tuesday to Sunday', '11 AM – 7 PM'], lang: [['es', 1], ['en', 0]],
        d: ['Preparación, limpieza y apoyo en la línea con Rosa y Juan Carlos. Si sabes de cocina dominicana, mejor; si no, te enseñamos.', 'Prep, cleaning and line support with Rosa and Juan Carlos. Dominican cooking experience is a plus; if not, we teach you.'],
        req: [['Mayor de 18 años', '18 or older'], ['Poder estar de pie todo el turno', 'Able to stand the whole shift']], ben: [['Comida del turno gratis', 'Free shift meal'], ['Pago cada semana', 'Paid weekly'], ['Aumento a los 90 días', 'Raise after 90 days']], ago: 3, left: 1 },
      { id: 'j-sd-2', t: ['Chofer de delivery', 'Delivery driver'], k: ['Medio tiempo', 'Part time'], pay: [13, 13], tips: 1, sch: ['Jueves a domingo', 'Thursday to Sunday', '5 PM – 9 PM'], lang: [['es', 1], ['en', 1]],
        d: ['Llevas los pedidos por Hazleton. Te damos la bolsa térmica y la gasolina se paga por milla.', 'You deliver orders around Hazleton. We give you the thermal bag and gas is paid per mile.'],
        req: [['Carro propio', 'Own car'], ['Licencia de Pensilvania', 'Pennsylvania license'], ['Seguro del carro al día', 'Current car insurance']], ben: [['Propinas completas para ti', 'You keep all tips'], ['Millaje pagado', 'Mileage paid'], ['Comida del turno gratis', 'Free shift meal']], ago: 6, left: 2 }
    ],
    'el-fogon': [
      { id: 'j-ef-1', t: ['Mesero o mesera', 'Server'], k: ['Medio tiempo', 'Part time'], pay: [10, 10], tips: 1, sch: ['Jueves a domingo', 'Thursday to Sunday', '6 PM – cierre'], lang: [['es', 1], ['en', 1]],
        d: ['Atiendes el salón y la terraza los fines de semana. Noches movidas con la Serie del Caribe.', 'You serve the dining room and patio on weekends. Busy nights during the Caribbean Series.'], req: [['Mayor de 18 años', '18 or older']], ben: [['Propinas', 'Tips'], ['Comida del turno gratis', 'Free shift meal']], ago: 2, left: 1 }
    ],
    'pizza-express': [
      { id: 'j-pe-1', t: ['Chofer de delivery', 'Delivery driver'], k: ['Tiempo completo', 'Full time'], pay: [14, 14], tips: 1, sch: ['Lunes a sábado', 'Monday to Saturday', '4 PM – 11 PM'], lang: [['es', 0], ['en', 1]],
        d: ['Delivery de pizzas en Hazleton y West Hazleton.', 'Pizza delivery in Hazleton and West Hazleton.'], req: [['Carro propio', 'Own car'], ['Licencia de Pensilvania', 'Pennsylvania license'], ['Récord de manejo limpio', 'Clean driving record']], ben: [['Propinas', 'Tips'], ['Millaje pagado', 'Mileage paid']], ago: 4, left: 1 }
    ]
  };
  window.TLJobs = { J };
})();

/* ==== prototype/neg-rel.js ==== */
/* Relacionados: negocios conectados por decisión de los dos (el negocio propone, el otro acepta). Tipos: sucursal · mismo dueño.
   La relación es de dos lados: na = nota que ve el cliente en la página de a (describe a b) · nb = nota en la página de b (describe a a). */
(function () {
  const REL = [
    { a: 'sabor-dominicano', b: 'sabor-dominicano-alter', k: 'sucursal', na: ['Nuestra segunda cocina, en Alter St. La misma carta y los mismos precios.', 'Our second kitchen, on Alter St. Same menu, same prices.'], nb: ['Donde empezó todo en 2014, en Wyoming St. La misma carta y los mismos precios.', 'Where it all began in 2014, on Wyoming St. Same menu, same prices.'] },
    { a: 'sabor-dominicano', b: 'catering-hazleton', k: 'dueno', na: ['El catering de la familia Peña: bautizos, bodas y cumpleaños.', "The Peña family's catering: baptisms, weddings and birthdays."], nb: ['El restaurante de la familia Peña, en Wyoming St.', "The Peña family's restaurant, on Wyoming St."] },
    { a: 'sabor-dominicano', b: 'flan-y-mas', k: 'dueno', na: ['Los flanes de doña Rosa, los sábados y domingos.', "Doña Rosa's flans, on Saturdays and Sundays."], nb: ['El restaurante de doña Rosa, en Wyoming St.', "Doña Rosa's restaurant, on Wyoming St."] }
  ];
  window.TLRel = { REL };
})();

/* ==== prototype/neg-rev.js ==== */
/* Reseñas (base, todas las categorías · hoy Comida). Hoy: jue 24 sep 2026, 12:30 PM.
   src: dl = pedido delivery · pk = pickup · rsv = reservó mesa · vis = visitante (sin compra en To'Latino, se marca).
   hot: 1 caliente · 0 tibio · -1 frío · late: min después de la hora prometida (dato del pedido, no se edita) · val: 1 vale · 0 más o menos · -1 caro · taste: 1 · 0 · -1
   rec = platos que recomienda (ids de TLMenu o nombres) · ph = fotos (ids Pexels) · reply = [es, en, días] */
(function () {
  const RANKS = ['Recluta', 'Vecino', 'Cabo', 'Sargento', 'Sargento Mayor', 'Teniente', 'Capitán', 'Comandante', 'Coronel', 'General del Barrio'];
  const SD = [
    { id: 'sd1', name: 'Yokasta M.', lvl: 4, cnt: 23, d: 3, stars: 5, src: 'dl', hot: 1, late: -2, val: 1, taste: 1, rec: ['bandera'], ph: [27556972], help: 18, topics: ['bandera', 'delivery'],
      es: 'La bandera como en casa: el pollo guisado suave y las habichuelas con sazón. Pedí delivery y llegó caliente, antes de la hora que decía.', en: 'La bandera tastes like home: tender stewed chicken and well-seasoned beans. Ordered delivery and it arrived hot, before the time it said.',
      reply: ['Gracias, Yokasta. Te esperamos el sábado para el sancocho.', 'Thank you, Yokasta. See you Saturday for the sancocho.', 2] },
    { id: 'sd2', name: 'Mariela S.', lvl: 3, cnt: 9, d: 2, stars: 5, src: 'dl', hot: 1, late: 3, val: 1, taste: 1, rec: ['mangu', 'morir'], ph: [14810483, 20300401], help: 9, topics: ['desayuno'],
      es: 'Mangú con los tres golpes a las 11 de la mañana, como en la capital. El morir soñando llegó bien frío, que es como tiene que llegar.', en: 'Mangú with los tres golpes at 11 in the morning, just like back home. The morir soñando arrived ice cold, the way it should.',
      reply: ['Gracias, Mariela. Buen provecho.', 'Thank you, Mariela. Enjoy.', 1] },
    { id: 'sd3', name: 'Ramón A.', lvl: 6, cnt: 58, d: 5, stars: 5, src: 'pk', hot: 1, late: 0, val: 1, taste: 1, rec: ['chivo'], ph: [27556981], help: 15, topics: ['pickup'],
      es: 'El chivo guisado es el mejor de Hazleton. Pedí pickup para las 12:30 y a las 12:25 ya estaba listo en el mostrador.', en: 'The goat stew is the best in Hazleton. Ordered pickup for 12:30 and it was ready at the counter by 12:25.',
      reply: ['Gracias, Ramón. El chivo sale todos los días hasta que se acaba.', 'Thank you, Ramón. The goat stew is on every day until it runs out.', 4] },
    { id: 'sd4', name: 'Luis R.', lvl: 2, cnt: 4, d: 7, stars: 5, src: 'rsv', val: 1, taste: 1, rec: ['mofongo'], ph: [37121074, 39143744], help: 31, topics: ['mofongo', 'espera'],
      es: 'El mofongo de chicharrón vale la pena. Los viernes en la noche hay espera de unos 20 minutos aunque reserves; llega temprano.', en: 'The pork-rind mofongo is worth it. Friday nights there is about a 20 minute wait even with a reservation; get there early.',
      reply: null },
    { id: 'sd5', name: 'Daisy T.', lvl: 1, cnt: 1, d: 9, stars: 5, src: 'vis', taste: 1, rec: [], ph: [], help: 6, topics: ['atencion'],
      es: 'Fui con mi mamá un domingo. Nos atendió Yanet, súper amable, y nos explicó los platos en español y en inglés.', en: 'Went with my mom on a Sunday. Yanet served us, super kind, and explained the dishes in Spanish and English.',
      reply: null },
    { id: 'sd6', name: 'José L.', lvl: 2, cnt: 6, d: 11, stars: 4, src: 'pk', hot: 1, late: 12, val: 1, taste: 1, rec: ['flan'], ph: [], help: 7, topics: ['pickup', 'espera'],
      es: 'Rico todo, pero el pickup se atrasó 12 minutos a la hora del almuerzo. El flan, de lo mejor que he probado aquí.', en: 'Everything was tasty, but pickup ran 12 minutes late at lunchtime. The flan is some of the best I have had here.',
      reply: null },
    { id: 'sd7', name: 'Kathy P.', lvl: 3, cnt: 11, d: 14, stars: 4, src: 'dl', hot: 0, late: 22, val: 1, taste: 1, rec: ['picapollo'], ph: [], help: 24, topics: ['delivery', 'precio'],
      es: 'Buena comida y precio justo. El delivery llegó 22 minutos tarde y los tostones tibios. El pica pollo, perfecto.', en: 'Good food, fair price. Delivery was 22 minutes late and the tostones lukewarm. The fried chicken was perfect.',
      reply: ['Tienes razón, Kathy. Ese día tuvimos un solo chofer. Ya contratamos otro y te devolvimos el envío.', 'You are right, Kathy. We had one driver that day. We hired another and refunded your delivery fee.', 13] },
    { id: 'sd8', name: 'Wilfredo C.', lvl: 5, cnt: 34, d: 18, stars: 3, src: 'dl', hot: -1, late: 9, val: -1, taste: 1, rec: [], ph: [36857725], help: 29, topics: ['delivery', 'porciones'], edited: 1,
      es: 'El pescado llegó frío y para $18 esperaba más porción. El sabor sí estaba bien. Pedí ayuda con el pedido y me devolvieron el plato.', en: 'The fish arrived cold and for $18 I expected a bigger portion. The flavor was good. I used order help and they refunded the dish.',
      reply: ['Wilfredo, tienes razón. El pescado no viaja bien lejos; ahora solo lo mandamos hasta 2 millas.', 'Wilfredo, you are right. Fish does not travel well; we now only deliver it within 2 miles.', 17] },
    { id: 'sd9', name: 'Anny V.', lvl: 4, cnt: 17, d: 21, stars: 5, src: 'rsv', val: 1, taste: 1, rec: ['sancocho'], ph: [27397342, 38330332], help: 22, topics: ['sancocho'],
      es: 'Reservamos para 8 el domingo por el cumpleaños de mi papá. La mesa estaba lista a la hora y el sancocho de siete carnes, espectacular.', en: 'We booked for 8 on Sunday for my dad’s birthday. The table was ready on time and the seven-meat sancocho was spectacular.',
      reply: ['Felicidades a tu papá, Anny. Los esperamos otra vez.', 'Happy birthday to your dad, Anny. Come back soon.', 20] },
    { id: 'sd10', name: 'Héctor B.', lvl: 2, cnt: 3, d: 26, stars: 2, src: 'vis', taste: 0, rec: [], ph: [], help: 12, topics: ['espera'],
      es: 'Esperé 40 minutos por una mesa un viernes y nadie me dijo nada. La comida bien, pero así no vuelvo un viernes.', en: 'I waited 40 minutes for a table on a Friday and nobody said a word. The food was fine, but I won’t come back on a Friday like that.',
      reply: ['Héctor, lo sentimos. Ahora los viernes hay lista de espera en To’Latino y te avisamos por SMS cuando se libera la mesa.', 'Héctor, we are sorry. Fridays now have a To’Latino waitlist and we text you when your table is ready.', 25] },
    { id: 'sd11', name: 'Carmen G.', lvl: 5, cnt: 41, d: 30, stars: 5, src: 'dl', hot: 1, late: -4, val: 1, taste: 1, rec: ['mofongo'], ph: [], help: 14, topics: ['mofongo', 'delivery'],
      es: 'Pedí para la oficina, seis mofongos. Llegaron calientes, bien empacados y con el caldo aparte para que no se ablandaran.', en: 'Ordered six mofongos for the office. They arrived hot, well packed and with the broth on the side so they wouldn’t go soft.',
      reply: ['Gracias, Carmen. Para la oficina también hacemos catering.', 'Thank you, Carmen. We also cater for offices.', 29] },
    { id: 'sd12', name: 'Pedro N.', lvl: 3, cnt: 8, d: 35, stars: 5, src: 'pk', hot: 1, late: 0, val: 1, taste: 1, rec: ['chicharron'], ph: [8954034], help: 5, topics: ['porciones'],
      es: 'La libra de chicharrón da para tres. Crujiente de verdad.', en: 'The pound of pork belly feeds three. Truly crispy.', reply: null },
    { id: 'sd13', name: 'Rosanna F.', lvl: 1, cnt: 2, d: 40, stars: 4, src: 'vis', val: 0, taste: 1, rec: ['bandera'], ph: [], help: 3, topics: ['precio', 'bandera'],
      es: 'Rica la bandera. Un poco cara desde que subieron el precio, pero la porción es grande.', en: 'The bandera is tasty. A bit pricey since they raised it, but the portion is big.', reply: null },
    { id: 'sd14', name: 'Freddy D.', lvl: 7, cnt: 96, d: 45, stars: 5, src: 'dl', hot: 1, late: 1, val: 1, taste: 1, rec: ['chinola'], ph: [33709196], help: 11, topics: ['delivery'],
      es: 'Pido casi todas las semanas. Nunca me ha llegado frío y el jugo de chinola es natural de verdad.', en: 'I order almost every week. It has never arrived cold and the passion fruit juice is truly fresh.',
      reply: ['Freddy, gracias por ser de la casa.', 'Freddy, thanks for being family.', 44] },
  ];
  const SD_STATS = { ver: 168, orders: 148, hot: 94, time: 88, val: 90, taste: 4.9 };
  const SD_TOP = [['bandera', 41], ['mofongo', 36], ['chivo', 22], ['morir', 19]];
  const SD_TOPICS = [['bandera', 'La bandera', 'La bandera'], ['mofongo', 'Mofongo', 'Mofongo'], ['delivery', 'Delivery', 'Delivery'], ['pickup', 'Pickup', 'Pickup'], ['espera', 'Espera los viernes', 'Friday waits'], ['porciones', 'Porciones', 'Portions'], ['precio', 'Precio', 'Price'], ['atencion', 'Atención', 'Service']];
  const MORE = [
    [21, 3, 'Bien, pero la porción más pequeña que la última vez.', 'Good, but a smaller portion than last time.', 'Gracias por decirnos. Volvimos a la porción de antes.', 'Thanks for telling us. We went back to the usual portion.'],
    [33, 5, 'Siempre amables. Se nota que es negocio de familia.', 'Always kind. You can tell it is a family business.', '', ''],
  ];
  const DAYS = { 'HACE 3 DÍAS': 3, 'HACE 1 SEMANA': 7, 'HACE 2 SEMANAS': 14 };
  function forBiz(b, i) {
    const hid = r => !(window.TLAdm && window.TLAdm.revHidden(r.id));
    if (b.id === 'sabor-dominicano') return SD.filter(hid);
    const X = window.TLListing, base = X.revFor(b, i), pro = !!b.pro, dl = b.tags.includes('delivery'), pk = b.tags.includes('pickup'), di = b.tags.includes('dinein');
    const NM = ['Ramón A.', 'Daisy T.', 'Wilfredo C.', 'Mariela S.', 'José L.', 'Anny V.'];
    const rows = base.map(([name, meta, stars, es, en, reply], k) => ({ name, d: DAYS[meta] || 7, stars, es, en, reply: reply ? [reply, reply, Math.max(1, (DAYS[meta] || 7) - 1)] : null }))
      .concat(MORE.map(([d, stars, es, en, re, rn], k) => ({ name: NM[(i + k * 3) % NM.length], d, stars, es, en, reply: re ? [re, rn, d - 1] : null })));
    return rows.map((r, k) => { const src = !pro ? 'vis' : k === 0 ? (dl ? 'dl' : pk ? 'pk' : 'vis') : k === 1 ? 'vis' : k === 2 ? (pk ? 'pk' : dl ? 'dl' : 'vis') : k === 3 ? (di ? 'vis' : 'pk') : (dl ? 'dl' : 'vis');
      const ord = src === 'dl' || src === 'pk';
      return Object.assign({ id: b.id + '-r' + k, lvl: 1 + ((i + k * 2) % 6), cnt: 2 + ((i * 3 + k * 7) % 30), src, hot: ord ? (r.stars >= 4 ? 1 : 0) : undefined, late: ord ? (r.stars >= 5 ? 0 : r.stars === 4 ? 14 : 6) : undefined,
        val: r.stars >= 4 ? 1 : 0, taste: 1, rec: [], ph: k === 0 && b.ph[1] ? [b.ph[1]] : k === 2 && b.ph[2] ? [b.ph[2]] : [], help: 2 + ((i + k * 5) % 14), topics: [] }, r); }).filter(hid);
  }
  function stats(b) {
    if (b.id === 'sabor-dominicano') return SD_STATS;
    const pro = !!b.pro, ord = pro && (b.tags.includes('delivery') || b.tags.includes('pickup')) && b.tags.includes('online');
    return { ver: pro ? Math.round(b.n * 0.7) : 0, orders: ord ? Math.round(b.n * 0.6) : 0, hot: 86 + (b.n % 9), time: 79 + (b.n % 13), val: 84 + (b.n % 11), taste: Math.min(5, Math.round((b.r + 0.1) * 10) / 10) };
  }
  function top(b) {
    if (b.id === 'sabor-dominicano') return SD_TOP.map(([id, n]) => ({ id, n }));
    if (!b.pro) return [];
    const X = window.TLListing, m = (X.MENU[b.id] || []), flat = [].concat(...m.map(s => s[2]));
    return flat.slice(0, 3).map((it, k) => ({ name: it[0], n: Math.max(4, Math.round(b.n / (5 + k * 3))), ph: b.ph[k % b.ph.length] }));
  }
  function topics(b) { return b.id === 'sabor-dominicano' ? SD_TOPICS : []; }
  window.TLRev = { RANKS, forBiz, stats, top, topics };
})();

/* ==== prototype/neg-bell-listing.js ==== */
/* Ficha de Belleza (APP-NEG-LISTING-PRO/FREE · NEG-BELL) — contenido de ejemplo. Hoy: jue 24 sep 2026, 12:30 PM.
   Se registra en TLListing (ABOUT, MENU, ADDR, POSTS, STAFF) y TLStaff.PEOPLE para que la ficha base funcione igual que Comida.
   SVC: [sección es, en, [[servicio, detalle, precio, minutos, varía por profesional]]]. SHOP: [producto, detalle, precio, foto, quedan].
   STAFF: [nombre, rol es, rol en, desde, silla propia, calificación propia, reseñas propias, próxima hora libre, foto, idiomas, especialidades, bio es, bio en, semana]. */
(function () {
  const X = window.TLListing, SD = window.TLStaff, BB = window.TLBeauty; if (!X || !SD || !BB) return;
  BB.B.forEach(b => { b.bell = 1; });
  const ALL0 = window.TLAll = window.TLAll || { B: [] };
  ((window.TLFood && window.TLFood.B) || []).concat(BB.B).forEach(b => { if (!ALL0.B.some(x => x.id === b.id)) ALL0.B.push(b); });
  const W = (a, b2, c, d, e, f, g) => [a, b2, c, d, e, f, g];
  const ABOUT = {
    'barberia-el-primo': ['Barbería de barrio en Wyoming St desde 2016. Somos cuatro barberos y cada uno renta su silla: tiene su agenda, sus precios y sus reseñas. Llegas y esperas turno, o reservas con el barbero que quieras.', 'Neighborhood barbershop on Wyoming St since 2016. Four barbers, each renting their own chair: their own schedule, prices and reviews. Walk in and wait, or book the barber you want.', 2016],
    'salon-glamour': ['Salón dominicano en Broad St: blower, planchado, tinte, keratina y peinados para toda ocasión. Tres estilistas de planta, cita o sin cita.', 'Dominican salon on Broad St: blowouts, flat iron, color, keratin and styling for every occasion. Three staff stylists, walk-in or by appointment.', 2012],
    'fade-factory': ['Fades, diseños y barba con navaja. Darío abrió el local en 2019: cinco sillas, tres con barbero que toma citas, cada uno con su agenda y su precio. Abierto hasta las 9 PM.', 'Fades, designs and straight-razor beards. Darío opened the shop in 2019: five chairs, three with barbers who take bookings, each with their own schedule and prices. Open until 9 PM.', 2019],
    'trenzas-yaritza': ['Trenzas, box braids y extensiones hechas en mi casa en N Laurel St. Trabajo sola y con cita, porque una trenza bien hecha lleva su tiempo.', 'Braids, box braids and extensions done at my home on N Laurel St. I work alone and by appointment, because good braids take time.', 2018],
    'junior-a-domicilio': ['Voy a tu casa con todo: silla, capa, máquina y aspiradora. Cortes para toda la familia, hasta 10 millas de Hazleton.', 'I come to your home with everything: chair, cape, clippers and vacuum. Cuts for the whole family, up to 10 miles from Hazleton.', 2021],
    'studio-bella-novia': ['Peinado y maquillaje para novias y quinceañeras. Prueba antes del día y vamos al lugar de la fiesta hasta 20 millas.', 'Hair and makeup for brides and quinceañeras. Trial before the day, and we travel to the venue up to 20 miles.', 2015],
    'pequenos-cortes': ['Barbería para niños: sillas de carrito, caricaturas y paciencia. Primer corte con certificado y mechón de recuerdo.', 'Kids barbershop: car chairs, cartoons and patience. First haircut with a certificate and a lock of hair to keep.', 2020],
    'rizos-color': ['Especialistas en rizos y color. Nicole abrió el estudio en 2017 y le renta una estación a Laura: cada una con su agenda y sus precios.', 'Curl and color specialists. Nicole opened the studio in 2017 and rents a station to Laura: each with her own schedule and prices.', 2017],
    'barberia-quisqueya': ['La barbería de siempre en Broad St. Sin cita: llegas, te sientas y esperas turno.', 'The classic barbershop on Broad St. Walk-in only: come in, sit down and wait your turn.', 2009],
    'salon-nuevo-estilo': ['Salón recién abierto en Diamond Ave. Blower, planchado y alisados.', 'Newly opened salon on Diamond Ave. Blowouts, flat iron and straightening.', 2026],
    'unas-bella-luz': ['Salón de uñas en Alter St: manicura, pedicura spa, acrílico y diseños a mano. Luz y dos técnicas; sin cita según la espera, o reservas tu hora.', 'Nail salon on Alter St: manicures, spa pedicures, acrylics and hand-painted designs. Luz and two techs; walk in depending on the wait, or book your time.', 2019],
    'lash-brow-yokasta': ['Pestañas, cejas y maquillaje permanente en mi estudio de Broad St. Una clienta a la vez y siempre con cita.', 'Lashes, brows and permanent makeup at my studio on Broad St. One client at a time, always by appointment.', 2020],
    'laser-piel-hazleton': ['Depilación láser, borrado de tatuajes y tratamientos de piel. La primera cita es una consulta con prueba de piel; el precio del paquete te lo damos por escrito.', 'Laser hair removal, tattoo removal and skin treatments. The first visit is a consultation with a skin test; package pricing comes in writing.', 2021],
    'manos-de-angel': ['Masajes relajantes, deportivos y en pareja. Cuatro cabinas y una sala doble para parejas.', 'Relaxing, sports and couples massage. Four rooms and a double room for couples.', 2018],
    'drenaje-altagracia': ['Drenaje linfático post-operatorio y moldeamiento. Trabajamos con la orden de tu cirujano: no damos consejo médico.', 'Post-op lymphatic drainage and body contouring. We follow your surgeon\u2019s orders: we do not give medical advice.', 2017],
    'tinta-quisqueya': ['Tatuajes a mano y perforaciones con material estéril de un solo uso. Solo mayores de 18 con ID; el tatuaje se cotiza por diseño.', 'Custom tattoos and piercings with single-use sterile tools. 18+ with ID only; tattoos are quoted by design.', 2014],
    'naturales-la-salud': ['Tienda de productos naturales, tés y vitaminas en Wyoming St. Te orientamos, pero no sustituimos a tu médico.', 'Natural products, teas and vitamins on Wyoming St. We guide you, but we do not replace your doctor.', 2011],
    'glam-nathaly': ['Maquillaje, peinado y uñas en tu casa o en el lugar de tu evento, hasta 15 millas. Llevo luz, silla y todo el material.', 'Makeup, hair and nails at your home or event venue, up to 15 miles. I bring lights, a chair and everything I need.', 2022],
  };
  const SVC = {
    'barberia-el-primo': [['Cortes', 'Cuts', [['Corte clásico', 'Máquina y tijera, con lavado', 20, 30, 1], ['Fade', 'Low, mid o high, con navaja', 25, 40, 1], ['Corte + barba', 'Fade y barba perfilada con toalla caliente', 35, 55, 1], ['Corte de niño', 'Hasta 12 años', 15, 25, 1]]], ['Barba', 'Beard', [['Arreglo de barba', 'Perfilado con navaja', 12, 20, 1], ['Afeitado clásico', 'Toalla caliente y navaja', 20, 30, 1]]], ['Extras', 'Extras', [['Diseño', 'Líneas o diseño en la nuca', 5, 10, 1], ['Cejas', 'Con navaja', 5, 5, 0]]]],
    'salon-glamour': [['Peinado', 'Styling', [['Blower y planchado', 'Lavado, secado y plancha', 35, 60, 0], ['Rolos', 'Lavado y rolos, estilo dominicano', 30, 75, 0], ['Peinado de fiesta', 'Recogido o semirrecogido', 55, 60, 0]]], ['Color', 'Color', [['Tinte completo', 'Un tono, incluye lavado', 65, 90, 0], ['Mechas', 'Con papel, desde', 95, 150, 0], ['Retoque de raíz', 'Hasta 1 pulgada', 45, 60, 0]]], ['Tratamientos', 'Treatments', [['Keratina', 'Pelo mediano, dura 3 a 4 meses', 150, 180, 0], ['Hidratación profunda', 'Con vapor', 25, 30, 0]]]],
    'trenzas-yaritza': [['Trenzas', 'Braids', [['Box braids medianas', 'Hasta la espalda, incluye pelo', 180, 300, 0], ['Knotless', 'Medianas, incluye pelo', 220, 330, 0], ['Cornrows', 'Hasta 10 trenzas', 60, 90, 0], ['Trenzas de niña', 'Con cuentas, hasta 10 años', 50, 90, 0]]], ['Extensiones', 'Extensions', [['Sew-in', 'Pelo del cliente', 150, 180, 0], ['Retoque de trenzas', 'Bordes y frente', 45, 60, 0]]]],
    'junior-a-domicilio': [['A domicilio', 'At home', [['Corte a domicilio', 'Hasta 10 mi, incluye traslado', 35, 40, 0], ['Corte + barba', 'A domicilio', 45, 55, 0], ['Familia (3 cortes)', 'Misma casa, mismo día', 85, 100, 0]]]],
    'studio-bella-novia': [['Novias', 'Brides', [['Peinado de novia', 'Incluye prueba', 150, 120, 0], ['Maquillaje de novia', 'Con pestañas, incluye prueba', 130, 90, 0]]], ['Quinceañeras', 'Quinceañeras', [['Peinado y maquillaje de quinceañera', 'Con corona', 180, 150, 0], ['Damas y corte', 'Por persona', 65, 60, 0]]]],
    'pequenos-cortes': [['Niños', 'Kids', [['Corte de niño', 'Hasta 12 años', 15, 25, 0], ['Primer corte', 'Con certificado y mechón', 20, 30, 0], ['Diseño', 'Líneas', 5, 10, 0]]]],
    'rizos-color': [['Rizos', 'Curls', [['Corte en seco para rizos', 'Rizo por rizo', 60, 75, 1], ['Definición de rizos', 'Lavado y definición', 45, 60, 1]]], ['Color', 'Color', [['Balayage', 'Desde', 150, 180, 1], ['Tinte completo', 'Un tono', 70, 90, 1]]]],
    'fade-factory': [['Cortes', 'Cuts', [['Fade', 'Con navaja', 25, 40, 1], ['Corte + barba', 'Con toalla caliente', 35, 55, 1], ['Diseño', 'Freestyle', 10, 15, 1]]]],
    'barberia-quisqueya': [['Cortes', 'Cuts', [['Corte clásico', 'Sin cita', 18, 30, 0], ['Corte + barba', 'Sin cita', 28, 45, 0], ['Corte de niño', 'Sin cita', 12, 25, 0]]]],
    'salon-nuevo-estilo': [['Peinado', 'Styling', [['Blower y planchado', 'Lavado incluido', 30, 60, 0], ['Alisado', 'Pelo mediano', 120, 150, 0]]]],
    'barberia-la-esquina': [['Cortes', 'Cuts', [['Corte', 'Sin cita', 17, 30, 0], ['Barba', 'Sin cita', 10, 20, 0]]]],
    'marys-beauty-salon': [['Salón', 'Salon', [['Blower', 'Lavado incluido', 30, 60, 0], ['Tinte', 'Un tono', 55, 90, 0]]]],
    'cortes-don-pepe': [['Cortes', 'Cuts', [['Corte', 'Sin cita', 15, 30, 0], ['Corte de niño', 'Sin cita', 10, 25, 0]]]],
    'extensiones-karla': [['Extensiones', 'Extensions', [['Sew-in', 'Con cita', 140, 180, 0], ['Pelucas a la medida', 'Con cita', 120, 120, 0]]]],
    'keratina-express': [['Alisados', 'Straightening', [['Keratina', 'Pelo mediano', 130, 180, 0], ['Botox capilar', 'Pelo mediano', 90, 120, 0]]]],
    'luis-el-barbero': [['A domicilio', 'At home', [['Corte a domicilio', 'Hasta 5 mi', 30, 40, 0]]]],
    'pelucas-la-reina': [['Pelucas', 'Wigs', [['Instalación de peluca', 'Lace front', 80, 90, 0], ['Lavado y peinado de peluca', 'Se deja y se recoge', 35, 0, 0]]]],
    'color-lab': [['Color', 'Color', [['Tinte completo', 'Un tono', 60, 90, 0], ['Mechas', 'Desde', 90, 150, 0]]]],
    'unas-bella-luz': [['Manos y pies', 'Hands and feet', [['Manicura', 'Con esmalte normal', 20, 30, 0], ['Pedicura spa', 'Con exfoliación y masaje', 35, 45, 0], ['Gel polish', 'Dura 2 a 3 semanas', 28, 40, 0]]], ['Acrílico y gel', 'Acrylic and gel', [['Acrílico · set completo', 'Largo corto o mediano', 45, 75, 0], ['Relleno de acrílico', 'Hasta 3 semanas', 30, 60, 0]]], ['Diseño', 'Nail art', [['Diseño a mano', 'Por uña', 3, 5, 0]]]],
    'lash-brow-yokasta': [['Pestañas', 'Lashes', [['Extensiones clásicas', 'Una por pestaña', 120, 120, 0], ['Extensiones de volumen', 'Abanicos a mano', 150, 150, 0], ['Relleno', 'Hasta 2 semanas', 55, 60, 0], ['Lifting de pestañas', 'Con tinte, dura 6 a 8 semanas', 65, 60, 0]]], ['Cejas', 'Brows', [['Laminado de cejas', 'Con diseño', 55, 45, 0], ['Microblading', 'Incluye el retoque a las 6 semanas', 350, 150, 0]]], ['Maquillaje permanente', 'Permanent makeup', [['Labios', 'Incluye el retoque', 300, 150, 0]]]],
    'cejas-cera-express': [['Hilo', 'Threading', [['Cejas con hilo', 'Sin cita', 12, 15, 0], ['Bigote con hilo', 'Sin cita', 8, 10, 0]]], ['Cera', 'Waxing', [['Axilas', 'Cera tibia', 15, 15, 0], ['Piernas completas', 'Cera tibia', 45, 40, 0], ['Brasileña', 'Con cita', 50, 30, 0]]]],
    'laser-piel-hazleton': [['Consulta', 'Consultation', [['Consulta y prueba de piel', 'Se descuenta del paquete', 25, 30, 0]]], ['Depilación láser', 'Laser hair removal', [['Axilas · una sesión', 'Hacen falta de 6 a 8', 60, 20, 0], ['Axilas · paquete de 6', 'Precio por escrito', 300, 20, 0], ['Piernas completas · una sesión', '', 180, 60, 0]]], ['Piel y tatuajes', 'Skin and tattoos', [['Borrado de tatuaje pequeño', 'Por sesión, hasta 3 in', 90, 30, 0], ['Tratamiento de acné', 'Limpieza y luz azul', 85, 60, 0]]]],
    'estetica-marisol': [['Faciales', 'Facials', [['Limpieza facial profunda', 'Con extracción', 65, 60, 0], ['Tratamiento de acné', 'Por sesión', 75, 60, 0], ['Peeling suave', 'Para manchas', 85, 45, 0]]]],
    'manos-de-angel': [['Masajes', 'Massage', [['Masaje relajante · 60 min', 'Aceite tibio', 75, 60, 0], ['Masaje relajante · 90 min', 'Aceite tibio', 105, 90, 0], ['Masaje deportivo o profundo', '60 min', 90, 60, 0]]], ['En pareja', 'Couples', [['Masaje en pareja · 60 min', 'Para dos personas, en la misma sala', 150, 60, 0]]]],
    'drenaje-altagracia': [['Post-operatorio', 'Post-op', [['Drenaje linfático', 'Con la orden de tu cirujano', 70, 60, 0], ['Paquete de 5 drenajes', 'Precio por escrito', 325, 60, 0]]], ['Moldeamiento', 'Contouring', [['Moldeamiento corporal', 'Maderoterapia y cavitación', 90, 60, 0]]]],
    'spa-caribe': [['Spa', 'Spa', [['Pase de día · sauna y vapor', 'Hasta 3 horas · toalla y bata incluidas', 25, 180, 0], ['Masaje relajante · 60 min', 'Con cita', 70, 60, 0]]]],
    'sonrisa-blanca': [['Blanqueamiento', 'Whitening', [['Blanqueamiento cosmético', 'Con luz LED, 30 min', 99, 45, 0], ['Retoque', 'Hasta 3 meses después', 59, 30, 0]]]],
    'tinta-quisqueya': [['Tatuajes', 'Tattoos', [['Tatuaje pequeño', 'Hasta 3 in · se cotiza por diseño', 80, 60, 0], ['Sesión de tatuaje · 3 horas', 'Para piezas grandes', 300, 180, 0]]], ['Perforaciones', 'Piercings', [['Perforación de oreja', 'Incluye el arete de titanio', 35, 20, 0], ['Perforación de nariz', 'Incluye el arete de titanio', 45, 20, 0]]]],
    'nutrivida-coach': [['Consultas', 'Sessions', [['Consulta inicial', 'Plan de comidas y medidas', 60, 60, 0], ['Seguimiento', 'Cada 2 semanas', 35, 30, 0]]]],
    'naturales-la-salud': [['En la tienda', 'In store', [['Té de jengibre y canela', 'Caja de 20', 8, 0, 0], ['Multivitamínico', '60 tabletas', 18, 0, 0], ['Aceite de coco', 'Prensado en frío · 16 oz', 12, 0, 0]]]],
    'beauty-supply-hzl': [['Lo que vende', 'What they sell', [['Extensiones de cabello', 'Paquete', 25, 0, 0], ['Crema para peinar', '16 oz', 9, 0, 0], ['Gorra de satén', 'Para dormir', 6, 0, 0]]]],
    'glam-nathaly': [['A domicilio', 'At home', [['Maquillaje social', 'Con pestañas', 85, 60, 0], ['Peinado y maquillaje', 'Para tu evento', 140, 120, 0], ['Manicura y pedicura', 'En tu casa', 60, 75, 0]]]],
    'capilar-renacer': [['Cabello', 'Hair', [['Evaluación del cuero cabelludo', 'Con cámara', 40, 30, 0], ['Tratamiento con láser capilar', 'Por sesión', 65, 45, 0]]]],
  };
  const SHOP = {
    'barberia-el-primo': [['Pomada de fijación fuerte', 'Acabado mate · 4 oz', 16, 7755553, 6], ['Aceite para barba', 'Con aceite de argán · 1 oz', 14, 4969864, 9], ['Cepillo de 360 waves', 'Cerdas de jabalí', 12, 18213699, 3], ['Máquina de detallado', 'Inalámbrica', 45, 10517484, 2]],
    'salon-glamour': [['Crema de rolos', 'Para pelo rizado · 16 oz', 18, 14615064, 8], ['Protector térmico', 'Hasta 450 °F', 15, 7819734, 5], ['Mascarilla de sábila', 'Hidratación profunda', 22, 3993132, 4]],
    'naturales-la-salud': [['Té de jengibre y canela', 'Caja de 20 bolsitas', 8, 38843494, 12], ['Multivitamínico', '60 tabletas', 18, 13787562, 7], ['Aceite de coco', 'Prensado en frío · 16 oz', 12, 4929677, 3]],
    'tinta-quisqueya': [['Crema para tatuajes', 'Para la cicatrización · 2 oz', 14, 20830475, 9]],
    'rizos-color': [['Gel definidor de rizos', 'Sin alcohol · 12 oz', 19, 7665704, 7], ['Champú sin sulfatos', '16 oz', 17, 3993136, 5]],
  };
  const STAFF = {
    'barberia-el-primo': [
      ['Luis "El Primo" Batista', 'Dueño y barbero', 'Owner and barber', 2016, 1, 4.9, 88, 'Hoy 2:40 PM', 8552627, ['es', 'en'], [['Fades', 'Fades'], ['Barba con navaja', 'Straight-razor beard'], ['Silla propia', 'Own chair']], ['Empecé cortando a mis primos en el patio en Santiago. Abrí El Primo en 2016 y hoy rento tres sillas a barberos que respeto. Cada uno maneja lo suyo.', 'I started cutting my cousins in the backyard in Santiago. I opened El Primo in 2016 and now rent three chairs to barbers I respect. Each one runs their own business.'], W(null, [9, 19], [9, 19], [9, 19], [9, 19], [9, 20], [9, 17])],
      ['Kelvin Rosario', 'Barbero · renta su silla', 'Barber · rents his chair', 2019, 1, 4.8, 54, 'Hoy 1:15 PM', 18483772, ['es'], [['Diseños', 'Designs'], ['Taper', 'Taper'], ['Silla propia', 'Own chair']], ['Me especializo en diseños y tapers. Si me enseñas la foto, lo hacemos.', 'I specialize in designs and tapers. Show me the photo and we will make it happen.'], W(null, [10, 19], null, [10, 19], [10, 19], [10, 20], [10, 16])],
      ['Andy Mejía', 'Barbero · renta su silla', 'Barber · rents his chair', 2021, 1, 4.7, 21, 'Mañana 10:00 AM', 12946033, ['es', 'en'], [['Cortes de niño', 'Kids cuts'], ['Clásico', 'Classic'], ['Silla propia', 'Own chair']], ['Paciencia con los niños y cortes clásicos para los papás.', 'Patience with kids and classic cuts for the dads.'], W(null, null, [11, 19], [11, 19], [15, 20], [11, 20], [9, 17])],
      ['Johan Peralta', 'Barbero · renta su silla', 'Barber · rents his chair', 2024, 1, 0, 0, 'Hoy 4:00 PM', 9387375, ['es'], [['Barba', 'Beard'], ['Afeitado clásico', 'Classic shave'], ['Silla propia', 'Own chair']], ['Nuevo en El Primo. Afeitado con toalla caliente como se hacía antes.', 'New at El Primo. Hot towel shaves the old-school way.'], W(null, [12, 20], [12, 20], [12, 20], [12, 20], [12, 20], null)],
    ],
    'salon-glamour': [
      ['Carmen Tavárez', 'Dueña y estilista', 'Owner and stylist', 2012, 0, 0, 0, 'Hoy 3:30 PM', 3993458, ['es', 'en'], [['Blower dominicano', 'Dominican blowout'], ['Color', 'Color']], ['Aprendí en un salón de la capital y abrí Glamour en 2012. Aquí el blower se hace como en casa: con paciencia y bien hecho.', 'I learned in a salon back home and opened Glamour in 2012. Here blowouts are done like at home: with patience and done right.'], W(null, [9, 19], [9, 19], [9, 19], [9, 19], [9, 19], [8, 17])],
      ['Yessenia Almonte', 'Estilista', 'Stylist', 2018, 0, 0, 0, 'Hoy 1:00 PM', 8834020, ['es'], [['Keratina', 'Keratin'], ['Rolos', 'Rollers']], ['Keratina y rolos. Te explico cuánto dura cada cosa antes de empezar.', 'Keratin and rollers. I explain how long each thing lasts before we start.'], W(null, null, [10, 19], [10, 19], [10, 19], [10, 19], [8, 17])],
      ['Paola Guzmán', 'Colorista', 'Colorist', 2022, 0, 0, 0, 'Mañana 11:00 AM', 8834025, ['es', 'en'], [['Mechas', 'Highlights'], ['Balayage', 'Balayage']], ['Colorista. Siempre hacemos prueba de mechón antes de un cambio grande.', 'Colorist. We always do a strand test before a big change.'], W(null, [11, 19], [11, 19], null, [11, 19], [11, 19], [9, 17])],
    ],
    'trenzas-yaritza': [['Yaritza Paulino', 'Trenzista', 'Braider', 2018, 0, 0, 0, 'Sáb 9:00 AM', 3993302, ['es', 'en'], [['Box braids', 'Box braids'], ['Knotless', 'Knotless'], ['Trenzas de niña', "Girls' braids"]], ['Aprendí a trenzar con mi abuela en Samaná. Trabajo sola en mi casa, con cita, y una clienta a la vez.', 'I learned to braid with my grandmother in Samaná. I work alone at home, by appointment, one client at a time.'], W([10, 18], null, [10, 18], [10, 18], [10, 18], [10, 18], [9, 17])]],
    'unas-bella-luz': [['Luz Marte', 'Dueña y técnica de uñas', 'Owner and nail tech', 2019, 0, 0, 0, 'Hoy 1:30 PM', 13781166, ['es', 'en'], [['Acrílico', 'Acrylic'], ['Diseño a mano', 'Hand-painted art']], ['Empecé haciendo uñas en la sala de mi casa. Hoy somos tres en Alter St y todas trabajamos con material limpio para cada clienta.', 'I started doing nails in my living room. Now there are three of us on Alter St, with clean tools for every client.'], W(null, [10, 19], [10, 19], [10, 19], [10, 19], [10, 19], [9, 17])]],
    'lash-brow-yokasta': [['Yokasta Rosario', 'Técnica de pestañas y cejas', 'Lash and brow artist', 2020, 0, 0, 0, 'Mañana 11:00 AM', 7593048, ['es', 'en'], [['Volumen', 'Volume lashes'], ['Microblading', 'Microblading']], ['Me certifiqué en Filadelfia. Antes de microblading te dibujo la ceja y no empezamos hasta que te guste.', 'I got certified in Philadelphia. Before microblading I draw the brow and we do not start until you like it.'], W(null, null, [10, 18], [10, 18], [10, 18], [10, 18], [9, 16])]],
    'tinta-quisqueya': [['Wander Jiménez', 'Dueño y tatuador', 'Owner and tattoo artist', 2014, 0, 0, 0, 'Sáb 2:00 PM', 7005734, ['es', 'en'], [['Realismo', 'Realism'], ['Letras', 'Lettering']], ['Tatúo desde hace 15 años. Primero hablamos del diseño y te doy el precio; nada se empieza sin tu OK.', 'Tattooing for 15 years. First we talk about the design and I give you the price; nothing starts without your OK.'], W(null, null, [12, 21], [12, 21], [12, 21], [12, 21], [12, 20])]],
    'glam-nathaly': [['Nathaly Pimentel', 'Maquillista a domicilio', 'Mobile makeup artist', 2022, 0, 0, 0, 'Hoy 3:00 PM', 38468701, ['es', 'en'], [['Novias y quinceañeras', 'Brides and quinceañeras'], ['Uñas', 'Nails']], ['Voy a tu casa o al salón de la fiesta con luz, silla y todo el material. Antes del día te mando fotos de looks para escoger.', 'I come to your home or the venue with lights, a chair and everything. Before the day I send you looks to choose from.'], W([8, 18], null, [9, 20], [9, 20], [9, 20], [9, 20], [7, 20])]],
    'laser-piel-hazleton': [['Marta Encarnación', 'Dueña · técnica de láser certificada', 'Owner · certified laser technician', 2021, 0, 0, 0, 'Hoy 1:00 PM', 20788693, ['es', 'en'], [['Piel morena', 'Darker skin'], ['Borrado de tatuajes', 'Tattoo removal']], ['Antes de la primera sesión te hago la prueba de piel. Te doy por escrito cuántas sesiones y cuánto cuesta el paquete.', 'Before the first session I do a skin test. I give you in writing how many sessions and what the package costs.'], W(null, null, [10, 18], [10, 18], [10, 18], [10, 18], [9, 14])]],
    'manos-de-angel': [['Ángel Herrera', 'Dueño y masajista', 'Owner and massage therapist', 2018, 0, 0, 0, 'Hoy 1:00 PM', 33278910, ['es', 'en'], [['Deportivo', 'Sports massage'], ['En pareja', 'Couples']], ['Antes de empezar te pregunto qué te duele y cuánta presión quieres. Si prefieres a una masajista mujer, ponlo en la nota.', 'Before we start I ask what hurts and how much pressure you want. If you prefer a female therapist, say so in the note.'], W(null, [10, 20], [10, 20], [10, 20], [10, 20], [10, 20], [10, 18])]],
    'drenaje-altagracia': [['Altagracia Jiménez', 'Dueña · drenaje post-operatorio', 'Owner · post-op drainage', 2017, 0, 0, 0, 'Mañana 10:00 AM', 36659397, ['es'], [['Post-operatorio', 'Post-op'], ['Moldeamiento', 'Contouring']], ['Trabajo con la orden de tu cirujano y sigo lo que él diga. Si tienes fiebre o mucho dolor, llámalo a él primero.', 'I work from your surgeon\u2019s order and follow what they say. If you have a fever or a lot of pain, call them first.'], W(null, [9, 17], [9, 17], [9, 17], [9, 17], [9, 17], [9, 13])]],
    'naturales-la-salud': [['Doña Mercedes Paulino', 'Dueña', 'Owner', 2011, 0, 0, 0, '', 16817337, ['es'], [['Tés y hierbas', 'Teas and herbs'], ['Vitaminas', 'Vitamins']], ['Te oriento con los productos, pero no soy médico. Si tomas medicinas, pregúntale a tu doctor antes de mezclar.', 'I guide you with the products, but I am not a doctor. If you take medication, ask your doctor before mixing.'], W(null, [9, 19], [9, 19], [9, 19], [9, 19], [9, 19], [9, 17])]],
    'junior-a-domicilio': [['Junior Ramírez', 'Barbero a domicilio', 'Mobile barber', 2021, 0, 0, 0, 'Hoy 3:00 PM', 19225142, ['es', 'en'], [['A domicilio', 'Mobile'], ['Familias', 'Families']], ['Llevo la barbería a tu casa. Funciona bien para familias y para gente que trabaja en la fábrica y no tiene tiempo.', 'I bring the barbershop to your home. Great for families and folks working factory shifts with no time.'], W([8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20])]],
  };
  const POSTS = {
    'barberia-el-primo': [['of', 'Corte + barba $30 hoy, hasta las 5 PM.', 'Cut + beard $30 today, until 5 PM.', 2, 0], ['nv', 'Johan se unió a El Primo: afeitado clásico con toalla caliente.', 'Johan joined El Primo: classic hot towel shave.', 20, 2]],
    'salon-glamour': [['of', 'Blower + planchado $35 hoy.', 'Blowout + flat iron $35 today.', 3, 1]],
  };
  const ADDR = { 'barberia-el-primo': '205 N Wyoming St, Hazleton PA', 'salon-glamour': '18 E Broad St, Hazleton PA', 'fade-factory': '440 Alter St, Hazleton PA', 'studio-bella-novia': '75 W Diamond Ave, Hazleton PA', 'pequenos-cortes': '130 N Church St, Hazleton PA', 'rizos-color': '62 E Broad St, Hazleton PA', 'barberia-quisqueya': '9 W Broad St, Hazleton PA', 'salon-nuevo-estilo': '210 E Diamond Ave, Hazleton PA', 'barberia-la-esquina': '301 N Wyoming St, Hazleton PA', 'marys-beauty-salon': '88 N Laurel St, Hazleton PA', 'cortes-don-pepe': '14 S Church St, Hazleton PA', 'keratina-express': '500 N Church St, Hazleton PA', 'pelucas-la-reina': '27 E Broad St, Hazleton PA', 'color-lab': '19 W Diamond Ave, Hazleton PA', 'unas-bella-luz': '388 Alter St, Hazleton PA', 'lash-brow-yokasta': '41 E Broad St, Hazleton PA', 'cejas-cera-express': '226 N Wyoming St, Hazleton PA', 'laser-piel-hazleton': '1001 N Church St, Hazleton PA', 'estetica-marisol': '57 W Diamond Ave, Hazleton PA', 'manos-de-angel': '120 S Laurel St, Hazleton PA', 'drenaje-altagracia': '310 E Broad St, Hazleton PA', 'spa-caribe': '1450 N Church St, Hazleton PA', 'sonrisa-blanca': '95 N Wyoming St, Hazleton PA', 'tinta-quisqueya': '17 W Broad St, Hazleton PA', 'nutrivida-coach': '200 N Laurel St, Hazleton PA', 'naturales-la-salud': '415 N Wyoming St, Hazleton PA', 'beauty-supply-hzl': '33 E Broad St, Hazleton PA', 'capilar-renacer': '680 W Diamond Ave, Hazleton PA' };
  const FAQ = {
    chair: [['¿Puedo llegar sin cita?', 'Sí. Llegas y esperas turno con el barbero que esté libre. Si quieres a uno en particular, reserva con él.'], ['¿Por qué cambia el precio?', 'Cada barbero renta su silla y pone sus precios. En Servicios ves el rango y en su página el precio exacto.'], ['¿Piden depósito?', 'Depende del barbero. Si pide, se retiene y solo se cobra cuando confirma tu cita.']],
    shop: [['¿Atienden sin cita?', 'Sí, según la espera del día. Con cita tienes tu hora guardada.'], ['¿Piden depósito?', 'Para color y keratina, sí: se retiene y solo se cobra cuando confirmamos tu cita.'], ['¿Cuánto dura una keratina?', 'De 3 a 4 meses, según el cuidado.']],
    solo: [['¿Dónde es?', 'La calle y la zona se ven aquí; la dirección exacta te llega cuando confirmo tu cita.'], ['¿Piden depósito?', 'Sí, para trenzas largas. Se retiene y solo se cobra al confirmar.'], ['¿Incluye el pelo?', 'Sí, en box braids y knotless. En los demás, pregúntame.']],
  };
  Object.keys(SVC).forEach(id => { X.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(([n, d, p, mi, v]) => [n, (mi ? mi + ' min · ' : '') + d, p, mi, v])]); });
  Object.assign(X.ABOUT, ABOUT); Object.assign(X.ADDR, ADDR); Object.assign(X.POSTS, POSTS);
  Object.keys(STAFF).forEach(id => { X.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]);
    SD.PEOPLE[id] = STAFF[id].map(p => ({ ph: p[8], langs: p[9], sp: p[10], bio: p[11], wk: p[12], dishes: [], chair: p[4], rate: p[5] ? ['★ ' + p[5] + ' · ' + p[6] + ' reseñas', '★ ' + p[5] + ' · ' + p[6] + ' reviews'] : (p[4] ? ['Nuevo en su silla', 'New in his chair'] : ''), next: ['Próxima hora libre: ' + p[7], 'Next open slot: ' + p[7].replace('Hoy', 'Today').replace('Mañana', 'Tomorrow').replace('Sáb', 'Sat')] })); });
  SD.CAT.belleza = { title: ['El equipo', 'The team'], rate: 1, next: 1, cta: 'booking' };
  /* Reseñas de cita. src: cita (verificada por To'Latino) · vis. late: min de espera sobre la hora de la cita (dato de la cita). asked 1 = quedó como lo pidió. price 1 = pagó el precio publicado. who = profesional. */
  const RV = {
    'barberia-el-primo': [
      ['Ramón A.', 6, 58, 4, 5, 'cita', 0, 1, 1, 'Kelvin', 'Le enseñé una foto del diseño y quedó igual. Kelvin trabaja con calma y te explica.', 'I showed a photo of the design and it came out the same. Kelvin takes his time and explains.', ['Gracias, Ramón. Kelvin ya tiene tu hora del mes que viene.', 'Thanks, Ramón. Kelvin already has your spot next month.', 3], 14],
      ['José L.', 2, 6, 9, 5, 'cita', 5, 1, 1, 'El Primo', 'Reservé con El Primo a las 11 y me sentó a las 11:05. Fade perfecto y la barba con toalla caliente.', 'Booked with El Primo at 11 and was seated at 11:05. Perfect fade and hot towel beard.', null, 9],
      ['Wilfredo C.', 5, 34, 16, 4, 'vis', null, null, null, '', 'Llegué sin cita un sábado y esperé 45 minutos. El corte bien, pero los sábados hay que reservar.', 'Walked in on a Saturday and waited 45 minutes. Good cut, but on Saturdays you need to book.', ['Tienes razón, Wilfredo. Los sábados recomendamos reservar; ahora se ve la espera en la ficha.', 'You are right, Wilfredo. On Saturdays we recommend booking; the wait now shows on our page.', 15], 21],
      ['Anny V.', 4, 17, 22, 5, 'cita', 0, 1, 1, 'Andy', 'Llevé a mis dos hijos con Andy. Mucha paciencia y les puso caricaturas.', 'Took my two sons to Andy. Very patient and put cartoons on for them.', null, 11],
      ['Daisy T.', 1, 1, 30, 3, 'cita', 20, 1, 0, 'Kelvin', 'Me cobraron $5 más por el diseño y no lo decía en el precio. El corte bien, pero esperé 20 minutos.', 'They charged $5 more for the design and it was not in the price. Good cut, but I waited 20 minutes.', ['Daisy, el diseño va aparte y ahora lo mostramos en Servicios. Disculpa la espera.', 'Daisy, the design is extra and now shows in Services. Sorry for the wait.', 28], 7],
    ],
    'salon-glamour': [
      ['Mariela S.', 3, 9, 5, 5, 'cita', 0, 1, 1, 'Carmen', 'El blower me duró toda la semana. Carmen te dice el precio antes de empezar.', 'The blowout lasted all week. Carmen tells you the price before starting.', ['Gracias, Mariela. Te esperamos.', 'Thanks, Mariela. See you soon.', 4], 12],
      ['Kathy P.', 3, 11, 12, 4, 'cita', 15, 1, 1, 'Yessenia', 'La keratina quedó muy bien, pero empezaron 15 minutos tarde.', 'The keratin turned out great, but they started 15 minutes late.', null, 8],
      ['Rosanna F.', 1, 2, 19, 5, 'vis', null, null, null, '', 'Fui sin cita un martes y me atendieron enseguida. Salón limpio y buen trato.', 'Walked in on a Tuesday and was seen right away. Clean salon and kind service.', null, 4],
    ],
    'trenzas-yaritza': [
      ['Milagros R.', 3, 12, 6, 5, 'cita', 0, 1, 1, 'Yaritza', 'Knotless perfectas en 5 horas y media, como me dijo. Me mandó la dirección al confirmar.', 'Perfect knotless in 5 and a half hours, just as she said. She sent the address when she confirmed.', ['Gracias, Milagros. Cuídalas con la gorra de satén.', 'Thanks, Milagros. Keep them under the satin cap.', 5], 10],
      ['Anny V.', 4, 17, 20, 5, 'cita', 0, 1, 1, 'Yaritza', 'Le hizo trenzas con cuentas a mi hija de 7 años. Muy paciente.', 'She did braids with beads for my 7-year-old daughter. Very patient.', null, 6],
    ],
    'junior-a-domicilio': [['Freddy D.', 7, 96, 8, 5, 'cita', 0, 1, 1, 'Junior', 'Vino a la casa a las 7 PM después de mi turno y cortó a mis tres hijos. Dejó todo limpio.', 'Came at 7 PM after my shift and cut my three kids. Left everything clean.', null, 9]],
  };
  const STATS = { 'barberia-el-primo': { ver: 131, orders: 118, hot: 95, time: 91, val: 93, who: 99, taste: 4.9 }, 'salon-glamour': { ver: 102, orders: 96, hot: 94, time: 88, val: 96, who: 97, taste: 4.8 }, 'trenzas-yaritza': { ver: 44, orders: 41, hot: 98, time: 97, val: 96, who: 100, taste: 5 } };
  const NAMES = ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.', 'Mariela S.', 'José L.', 'Anny V.'];
  const mk = (b, r, k) => ({ id: b.id + '-v' + k, name: r[0], lvl: r[1], cnt: r[2], d: r[3], stars: r[4], src: r[5], late: r[6], asked: r[7], price: r[8], pro: r[9], es: r[10], en: r[11], reply: r[12], help: r[13], ph: [], rec: [], topics: [] });
  /* Tipo de negocio para reseñas y preguntas: cómo atiende (sin cita, a domicilio, en su casa, sillas) y qué hace. */
  function kindOf(b) { const tg = k => (b.tags || []).includes(k), s0 = (b.subs || [])[0] || '', all = (b.subs || []).join('|');
    if (b.m === 'silla') return 'silla'; if (b.k) return b.k;
    if (!tg('cita')) return /Pelucas|Tienda/.test(all) ? 'wig' : 'walk';
    if (b.m === 'solo' && b.zone && tg('domicilio')) return 'mobile';
    if (/novia/i.test(all)) return 'novia'; if (b.casa) return 'casa'; if (b.m === 'chair') return 'chair';
    if (/niños/.test(s0)) return 'kids'; if (/Tinte|Keratina|rizos/.test(s0)) return 'color';
    return /Barbería|Barba/.test(s0) ? 'barber' : 'salon'; }
  /* Reseñas de ejemplo por tipo: [texto es, en, sin cita (1 = fue sin cita)]. */
  const RK = {
    walk: [['Llegué un martes a las 11 y me sentaron en 10 minutos. Corte limpio y el precio que dice.', 'Walked in on a Tuesday at 11 and was in the chair in 10 minutes. Clean cut at the listed price.', 1], ['El sábado había seis delante de mí y esperé casi una hora. Bien el corte, pero ve temprano.', 'On Saturday there were six ahead of me and I waited almost an hour. Good cut, but go early.', 1]],
    wig: [['Me medí tres pelucas sin apuro y me ajustaron la que escogí.', 'Tried on three wigs with no rush and they fitted the one I picked.', 1], ['Dejé mi peluca para lavar y me la dieron al otro día como nueva.', 'Left my wig to be washed and got it back the next day like new.', 1]],
    mobile: [['Llegó a la hora que dijo, cortó a los dos nenes en la sala y recogió todo.', 'Arrived when he said, cut both kids in the living room and cleaned everything up.', 0], ['Vino a las 8 de la mañana antes de una boda. Trae su propia luz y su silla.', 'Came at 8 in the morning before a wedding. Brings his own light and chair.', 0]],
    casa: [['Es en su casa, pero muy limpio y organizado. Me dijo cuánto iba a durar y cumplió.', 'It is at her home, but very clean and organized. She told me how long it would take and kept to it.', 0], ['Me mandó la dirección al confirmar y una foto de la entrada para encontrarla.', 'She sent the address when she confirmed, plus a photo of the entrance to find it.', 0]],
    novia: [['Hicimos la prueba un mes antes y el día de la boda quedó igual. Llegaron puntuales al salón.', 'We did the trial a month before and on the wedding day it looked the same. They arrived on time at the venue.', 0], ['Peinaron a mi hija y a cuatro damas para los quince. Todo listo antes de la misa.', 'They did my daughter and four court girls for the quinceañera. All ready before mass.', 0]],
    kids: [['Mi hijo llora con la máquina y aquí lo calmaron con caricaturas. Salió feliz.', 'My son cries at the clippers and here they calmed him with cartoons. He left happy.', 0], ['Fuimos sin cita un sábado y esperamos 20 minutos. Muy pacientes con los niños.', 'We walked in on a Saturday and waited 20 minutes. Very patient with kids.', 1]],
    color: [['Me hicieron prueba de mechón antes y me dijeron el precio con mi largo. Quedó el tono que pedí.', 'They did a strand test first and told me the price for my length. Got the shade I asked for.', 0], ['Me cobraron lo que salía en la app para mi largo de pelo y tardó lo que dijeron.', 'Charged what the app showed for my hair length and took as long as they said.', 0]],
    salon: [['El blower me duró la semana. Me dijeron el precio antes de empezar.', 'The blowout lasted all week. They told me the price before starting.', 0], ['Llegué sin cita y esperé 25 minutos. Buen trato y el salón limpio.', 'Walked in and waited 25 minutes. Kind service and a clean salon.', 1]],
    barber: [['Fade bien hecho y me sentaron a la hora de mi cita.', 'Clean fade and I was seated at my appointment time.', 0], ['Fui sin cita y esperé poco. Cobran lo que dice.', 'Walked in and barely waited. They charge what is listed.', 1]],
    chair: [['Reservé con quien siempre me atiende y me sentó a la hora. Cada uno tiene su precio y lo ves antes.', 'Booked the person who always does my hair and was seated on time. Each has their own price and you see it first.', 0], ['Llegué sin cita y me tocó con quien estaba libre. Bien hecho.', 'Walked in and got whoever was free. Well done.', 1]],
    nails: [['El acrílico me duró tres semanas sin levantarse. Cambian la lima con cada clienta.', 'The acrylic lasted three weeks without lifting. They use a new file for every client.', 0], ['Fui sin cita y esperé 20 minutos. El diseño quedó igual a la foto.', 'Walked in and waited 20 minutes. The design matched the photo.', 1]],
    lash: [['Me dibujó la ceja antes de empezar y no hizo nada hasta que le dije que sí.', 'She drew the brow first and did nothing until I said yes.', 0], ['Las pestañas de volumen me duraron casi un mes. Puntual y muy limpia.', 'The volume lashes lasted almost a month. On time and very clean.', 0]],
    wax: [['Cejas con hilo en 10 minutos y sin cita. Quedaron parejas.', 'Brows threaded in 10 minutes, no appointment. Even on both sides.', 1], ['La cera estaba tibia, no caliente, y la muchacha fue rápida.', 'The wax was warm, not hot, and she was quick.', 1]],
    laser: [['Me hicieron la prueba de piel primero y me dieron el precio del paquete por escrito.', 'They did a skin test first and gave me the package price in writing.', 0], ['Voy por la cuarta sesión de borrado y ya casi no se ve. Te dicen cuántas faltan.', 'On my fourth removal session and it is almost gone. They tell you how many are left.', 0]],
    facial: [['La limpieza me dejó la piel suave y me explicó qué usar en casa.', 'The facial left my skin soft and she explained what to use at home.', 0], ['Me dijo cuántas sesiones de acné iba a necesitar antes de empezar.', 'She told me how many acne sessions I would need before starting.', 0]],
    massage: [['Fuimos en pareja por nuestro aniversario. La sala doble estaba limpia y tranquila.', 'We went as a couple for our anniversary. The double room was clean and quiet.', 0], ['El deportivo me quitó el dolor de espalda del trabajo. Te pregunta antes qué te duele.', 'The sports massage took away my back pain from work. They ask first what hurts.', 0]],
    postop: [['Me pidió la orden del cirujano antes del primer drenaje. Muy cuidadosa.', 'She asked for my surgeon\u2019s order before the first drainage. Very careful.', 0], ['Hice el paquete de 5 después de la lipo. Siempre a la hora.', 'Did the 5-session package after lipo. Always on time.', 0]],
    spa: [['El sauna estaba limpio y la toalla incluida. Buen plan para un domingo.', 'The sauna was clean and the towel included. Nice Sunday plan.', 1], ['El masaje bien, pero el vapor estaba lleno a las 6.', 'Good massage, but the steam room was full at 6.', 0]],
    white: [['Me dijeron claro que no son dentistas y que si me dolía una muela fuera al dentista.', 'They were clear they are not dentists and to see one if a tooth hurt.', 0], ['Quedaron dos tonos más blancos. Cobraron lo que decía.', 'Two shades whiter. Charged what was listed.', 1]],
    tattoo: [['Me cotizó el diseño antes y me pidió la ID. Todo estéril y abierto delante de mí.', 'Quoted the design first and asked for my ID. Everything sterile and opened in front of me.', 0], ['Me perforé la nariz sin cita un sábado. Rápido y me explicó cómo cuidarla.', 'Got my nose pierced as a walk-in on a Saturday. Quick, and explained aftercare.', 1]],
    nutri: [['Me hizo un plan con la comida que ya como, no con cosas que no consigo aquí.', 'She made a plan with the food I already eat, not things I cannot find here.', 0], ['En dos meses bajé 12 libras con los seguimientos.', 'Lost 12 pounds in two months with the follow-ups.', 0]],
    natural: [['Tienen tés que no encuentro en el supermercado. Te atienden en español.', 'They have teas I cannot find at the supermarket. Served in Spanish.', 1], ['Aparté las vitaminas en la app y las recogí al salir del trabajo.', 'Held the vitamins in the app and picked them up after work.', 1]],
    supply: [['Tienen las cremas dominicanas que uso. Buenos precios.', 'They carry the Dominican creams I use. Good prices.', 1], ['Mucha variedad de extensiones. Los sábados hay fila.', 'Lots of extensions to choose from. Saturdays there is a line.', 1]],
    glam: [['Me maquilló en mi casa para la boda de mi hermana. Llegó a la hora con su luz.', 'Did my makeup at home for my sister\u2019s wedding. Arrived on time with her lights.', 0], ['Arregló a cuatro damas en el salón de la fiesta. Todo listo antes de la foto.', 'Did four bridesmaids at the venue. All ready before the photos.', 0]],
    hair: [['Me revisó el cuero cabelludo con cámara y me dijo honesto lo que podía esperar.', 'Checked my scalp with a camera and told me honestly what to expect.', 0], ['Llevo 6 sesiones y se nota menos caída.', 'Six sessions in and less hair is falling out.', 0]],
    silla: [['Reservé por la app y me sentó a la hora. Le pagas a él directo, no al local.', 'Booked in the app and was seated on time. You pay him directly, not the shop.', 0], ['Le enseñé una foto y quedó como la pedí.', 'Showed a photo and it came out as I asked.', 0]],
  };
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k));
    const i = b.id.length, K = RK[kindOf(b)] || RK.salon, cita = b.pro && (b.m === 'silla' || (b.tags || []).includes('cita'));
    return K.slice(0, Math.min(2, b.n)).map(([es, en, walk], k) => { const c = cita && !walk;
      return mk(b, [NAMES[(i + k * 2) % 7], 3 - k, k ? 4 : 8, k ? 12 : 4, k ? 4 : 5, c ? 'cita' : 'vis', c ? 0 : null, c || !k ? 1 : null, c || !k ? 1 : null, '', es, en, null, k ? 3 : 5], k); }); }
  /* Preguntas frecuentes por tipo (es, en). */
  function faqOf(b, es) { const k = kindOf(b), E2 = (x, y) => es ? x : y, tg = t => (b.tags || []).includes(t), all = (b.subs || []).join('|');
    const BK = window.TLBook, c = (BK && BK.CFG && BK.CFG[b.id]) || {}, P = BK && BK.PROI ? BK.PROI[b.id] : null, dep = P ? P.dep : c.dep;
    const ST = window.TLListing && window.TLListing.STAFF && window.TLListing.STAFF[b.id], first = P ? P.first : ST && ST[0] ? ST[0][0].split(' ')[0] : b.name;
    const depQ = [E2('¿Piden depósito?', 'Do they take a deposit?'), dep ? E2('Sí, $' + dep + (c.depSecs ? ' en color y tratamientos' : '') + '. Se cobra al enviar la solicitud y se descuenta del total. Si no te confirman, te lo devolvemos.', 'Yes, $' + dep + (c.depSecs ? ' for color and treatments' : '') + '. It is charged when you send the request and taken off the total. Refunded if not confirmed.') : E2('No. Si no puedes ir, avisa con tiempo.', 'No. If you cannot make it, let them know in time.')];
    const ker = /Keratina/.test(all) ? [[E2('¿Cuánto dura una keratina?', 'How long does keratin last?'), E2('De 3 a 4 meses, según el cuidado.', '3 to 4 months, depending on care.')]] : [];
    const wkQ = [E2('¿Atienden sin cita?', 'Do they take walk-ins?'), tg('walkin') ? E2('Sí, según la espera del día; arriba ves la de ahora. Con cita tienes tu hora guardada.', 'Yes, depending on the wait; you see the current one above. With a booking your time is held.') : E2('No, solo con cita.', 'No, by appointment only.')];
    const w = { 'rizos-color': ['estilista', 'stylist', 'estación', 'station'] }[b.id] || ['barbero', 'barber', 'silla', 'chair'];
    const F = {
      walk: [[E2('¿Hay que hacer cita?', 'Do I need an appointment?'), E2('No. Aquí no se reserva: llegas, te sientas y esperas turno. Arriba ves la espera de ahora.', 'No. No bookings here: walk in, sit down and wait your turn. You see the current wait above.')], [E2('¿Cuándo hay menos espera?', 'When is the wait shortest?'), E2('Entre semana antes de las 3 PM. Los sábados se llena.', 'Weekdays before 3 PM. Saturdays get busy.')], [E2('¿Cómo se paga?', 'How do I pay?'), E2('En el local, efectivo o tarjeta.', 'In store, cash or card.')]],
      wig: [[E2('¿Me la puedo medir?', 'Can I try it on?'), E2('Sí. Pasas, te la mides y la ajustan a tu medida.', 'Yes. Stop by, try it on and they fit it to you.')], [E2('¿Cuánto tarda el lavado de una peluca?', 'How long does a wig wash take?'), E2('La dejas y la recoges en 1 o 2 días. Te avisan cuando esté.', 'Drop it off and pick it up in 1 or 2 days. They let you know when it is ready.')], [E2('¿Hay que hacer cita?', 'Do I need an appointment?'), E2('No. Para instalar una peluca, mejor llama antes para que te esperen.', 'No. For an install, call ahead so they expect you.')]],
      mobile: [[E2('¿Hasta dónde va?', 'How far does he travel?'), E2('Hasta ' + b.zone + ' millas de Hazleton. Al pedir tu hora pones la dirección y ves si llega.', 'Up to ' + b.zone + ' miles from Hazleton. You enter the address when booking and see if it is covered.')], [E2('¿Qué necesito en casa?', 'What do I need at home?'), E2('Un espacio con luz y un enchufe. ' + first + ' lleva la silla, la capa y la aspiradora, y deja todo limpio.', 'A space with light and an outlet. ' + first + ' brings the chair, cape and vacuum, and leaves everything clean.')], [E2('¿Cobra el traslado?', 'Is travel extra?'), E2('No, va incluido en el precio.', 'No, it is included in the price.')]],
      casa: [[E2('¿Dónde es?', 'Where is it?'), E2('En su casa en ' + b.casa + '. La dirección exacta te llega cuando ' + first + ' confirma tu cita.', 'At her home on ' + b.casa + '. The exact address arrives when ' + first + ' confirms your booking.')], depQ, /Trenzas/.test((b.subs || [])[0] || '') && b.pro ? [E2('¿Incluye el pelo?', 'Is the hair included?'), E2('Sí, en box braids y knotless. Si traes el tuyo, se descuenta del precio.', 'Yes, for box braids and knotless. If you bring your own, it comes off the price.')] : [E2('¿Puedo traer mi pelo?', 'Can I bring my own hair?'), E2('Sí. El precio es con tu pelo; si necesitas que lo consiga, pregúntale antes.', 'Yes. The price is with your hair; if you need her to get it, ask first.')]],
      novia: [[E2('¿Con cuánto tiempo reservo?', 'How far ahead should I book?'), E2('Para bodas y quinceañeras, de 2 a 3 meses antes. Los sábados se llenan primero.', 'For weddings and quinceañeras, 2 to 3 months ahead. Saturdays fill first.')], [E2('¿La prueba está incluida?', 'Is the trial included?'), E2('Sí, en el peinado y el maquillaje de novia. Se hace unas semanas antes del día.', 'Yes, for bridal hair and makeup. It is done a few weeks before the day.')], [E2('¿Van al lugar de la fiesta?', 'Do they come to the venue?'), E2('Sí, hasta ' + (b.zone || 20) + ' millas. El traslado cuesta $40 y se suma al total.', 'Yes, up to ' + (b.zone || 20) + ' miles. Travel is $40, added to the total.')]],
      kids: [[E2('¿Desde qué edad?', 'From what age?'), E2('Desde el primer corte y hasta los 12 años.', 'From the first haircut up to age 12.')], [E2('¿Puedo quedarme con mi hijo?', 'Can I stay with my child?'), E2('Sí, siempre. Hay caricaturas y sillas de carrito para que estén tranquilos.', 'Yes, always. There are cartoons and car chairs to keep them calm.')], wkQ],
      chair: [[E2('¿Puedo llegar sin cita?', 'Can I walk in?'), E2('Sí. Llegas y esperas turno con quien esté libre. Si quieres a alguien en particular, reserva con esa persona.', 'Yes. Walk in and wait for whoever is free. If you want someone in particular, book with them.')], [E2('¿Por qué cambia el precio?', 'Why does the price vary?'), E2('Cada ' + w[0] + ' renta su ' + w[2] + ' y pone sus precios. En Servicios ves el rango y en su página el precio exacto.', 'Each ' + w[1] + ' rents their ' + w[3] + ' and sets their prices. Services shows the range; their page shows the exact price.')], [E2('¿Piden depósito?', 'Do they take a deposit?'), E2('Depende de cada ' + w[0] + '. Si pide, se retiene y solo se cobra cuando confirma tu cita.', 'It depends on each ' + w[1] + '. If they do, it is held and only charged when they confirm.')]],
      silla: [[E2('¿A quién le pago?', 'Who do I pay?'), E2('A ' + first + ', en su ' + (b.at === 'rizos-color' ? 'estación' : 'silla') + ': efectivo o tarjeta. El local solo le renta el espacio.', 'To ' + first + ', at their ' + (b.at === 'rizos-color' ? 'station' : 'chair') + ': cash or card. The shop only rents the space.')], [E2('¿Puedo llegar sin cita?', 'Can I walk in?'), E2('Si ' + first + ' está libre, sí. Con Booking tienes tu hora.', 'If ' + first + ' is free, yes. Booking holds your time.')], depQ],
      color: [[E2('¿Hacen prueba de mechón?', 'Do they do a strand test?'), E2('Sí, antes de un cambio grande y sin costo.', 'Yes, before a big change, at no cost.')], ker.length ? ker[0] : [E2('¿Cuánto dura el tinte?', 'How long does color last?'), E2('De 4 a 6 semanas hasta el retoque de raíz.', '4 to 6 weeks until a root touch-up.')], depQ],
      nails: [wkQ, [E2('¿Cuánto dura el acrílico?', 'How long do acrylics last?'), E2('De 2 a 3 semanas; después se hace relleno.', '2 to 3 weeks; then you get a fill.')], [E2('¿Usan material limpio?', 'Are the tools clean?'), E2('Sí: lima y pulidor nuevos para cada clienta y el metal se esteriliza.', 'Yes: new file and buffer for each client, and metal tools are sterilized.')]],
      lash: [depQ, [E2('¿Cuánto duran las extensiones?', 'How long do extensions last?'), E2('De 3 a 4 semanas. Con relleno cada 2 semanas se mantienen.', '3 to 4 weeks. A fill every 2 weeks keeps them full.')], [E2('¿El microblading incluye retoque?', 'Does microblading include a touch-up?'), E2('Sí, a las 6 semanas. Antes de empezar te dibujo la ceja.', 'Yes, at 6 weeks. Before starting I draw the brow.')]],
      wax: [wkQ, [E2('¿Hacen brasileña sin cita?', 'Brazilian without an appointment?'), E2('No, la brasileña es con cita. Cejas, bigote y axilas, sin cita.', 'No, Brazilian is by appointment. Brows, lip and underarms are walk-in.')], [E2('¿Atienden hombres?', 'Do you serve men?'), E2('Sí, cejas y cera para hombres.', 'Yes, brows and waxing for men.')]],
      laser: [[E2('¿Cuántas sesiones necesito?', 'How many sessions do I need?'), E2('Depende de tu piel y del vello. En la consulta te decimos cuántas y el precio del paquete por escrito.', 'It depends on your skin and hair. At the consultation we tell you how many and the package price in writing.')], depQ, [E2('¿Borran cualquier tatuaje?', 'Can you remove any tattoo?'), E2('Casi todos se aclaran; los colores claros tardan más. Te lo decimos al verlo.', 'Most fade; light colors take longer. We tell you when we see it.')]],
      facial: [[E2('¿Es médico?', 'Is it medical?'), E2('No. Es estética: para acné fuerte o una infección, ve al dermatólogo.', 'No. It is cosmetic: for severe acne or an infection, see a dermatologist.')], wkQ, depQ],
      massage: [[E2('¿Cómo funciona el masaje en pareja?', 'How do couples massages work?'), E2('Dos personas en la misma sala, cada una con su terapeuta. Se reserva una sola cita para los dos.', 'Two people in the same room, each with their own therapist. One booking for both.')], depQ, [E2('¿Puedo escoger hombre o mujer?', 'Can I choose a man or a woman?'), E2('Sí, dilo en la nota de tu cita.', 'Yes, mention it in your booking note.')]],
      postop: [[E2('¿Necesito la orden del cirujano?', 'Do I need my surgeon\u2019s order?'), E2('Sí, para el drenaje post-operatorio. Seguimos sus indicaciones; no damos consejo médico.', 'Yes, for post-op drainage. We follow their instructions; we do not give medical advice.')], [E2('¿Cuándo empiezo después de la cirugía?', 'When do I start after surgery?'), E2('Cuando tu cirujano lo indique. Si tienes fiebre o dolor fuerte, llámalo a él primero.', 'When your surgeon says so. If you have a fever or strong pain, call them first.')], depQ],
      spa: [[E2('¿Necesito cita para el sauna?', 'Do I need a booking for the sauna?'), E2('No, el pase de día es sin cita. El masaje sí es con cita.', 'No, the day pass is walk-in. Massages are by appointment.')], [E2('¿Qué debo traer?', 'What should I bring?'), E2('Traje de baño. La toalla y la bata van incluidas.', 'A swimsuit. Towel and robe are included.')], [E2('¿Cómo se paga?', 'How do I pay?'), E2('En el local, efectivo o tarjeta.', 'In store, cash or card.')]],
      white: [[E2('¿Son dentistas?', 'Are you dentists?'), E2('No. Es un blanqueamiento cosmético. Si tienes caries, dolor o encías sangrando, ve al dentista primero.', 'No. It is cosmetic whitening. If you have cavities, pain or bleeding gums, see a dentist first.')], wkQ, [E2('¿Cuánto dura?', 'How long does it last?'), E2('De 3 a 6 meses, según lo que tomes y comas.', '3 to 6 months, depending on what you eat and drink.')]],
      tattoo: [[E2('¿Atienden menores?', 'Do you serve minors?'), E2('No. Solo mayores de 18 con ID, para tatuajes y perforaciones.', 'No. 18+ with ID only, for tattoos and piercings.')], [E2('¿Cómo se cotiza un tatuaje?', 'How is a tattoo quoted?'), E2('Por diseño, tamaño y lugar. Te damos el precio antes de empezar; el depósito de $50 se descuenta.', 'By design, size and placement. You get the price before we start; the $50 deposit comes off.')], [E2('¿Las perforaciones son sin cita?', 'Are piercings walk-in?'), E2('Sí, según la espera. Los tatuajes, con cita.', 'Yes, depending on the wait. Tattoos are by appointment.')]],
      nutri: [[E2('¿Es nutricionista con licencia?', 'Is she a licensed dietitian?'), E2('Es coach de nutrición certificada. Para diabetes u otra condición, sigue a tu médico.', 'She is a certified nutrition coach. For diabetes or another condition, follow your doctor.')], [E2('¿Las consultas pueden ser por video?', 'Can sessions be by video?'), E2('Los seguimientos sí; la primera es en persona para tomar medidas.', 'Follow-ups yes; the first one is in person to take measurements.')], wkQ],
      natural: [[E2('¿Necesito cita?', 'Do I need an appointment?'), E2('No, es una tienda: pasas cuando quieras. También puedes apartar en la app y pagar al recoger.', 'No, it is a store: stop by anytime. You can also hold items in the app and pay at pickup.')], [E2('¿Sustituyen al médico?', 'Do they replace a doctor?'), E2('No. Te orientamos sobre los productos; si tomas medicinas, pregúntale a tu médico.', 'No. We guide you on products; if you take medication, ask your doctor.')], [E2('¿Cómo se paga?', 'How do I pay?'), E2('En la tienda, efectivo o tarjeta.', 'In store, cash or card.')]],
      supply: [[E2('¿Necesito cita?', 'Do I need an appointment?'), E2('No, es una tienda: pasas cuando quieras.', 'No, it is a store: stop by anytime.')], [E2('¿Tienen productos dominicanos?', 'Do you carry Dominican products?'), E2('Sí, cremas, tratamientos y gorras para el pelo.', 'Yes, creams, treatments and hair caps.')], [E2('¿Cómo se paga?', 'How do I pay?'), E2('En la tienda, efectivo o tarjeta.', 'In store, cash or card.')]],
      glam: [[E2('¿Hasta dónde va?', 'How far does she travel?'), E2('Hasta ' + (b.zone || 15) + ' millas de Hazleton, a tu casa o al lugar de tu evento.', 'Up to ' + (b.zone || 15) + ' miles from Hazleton, to your home or venue.')], depQ, [E2('¿Hace grupos?', 'Does she do groups?'), E2('Sí, damas y familia el mismo día. Pide una cita por persona o escríbele.', 'Yes, bridesmaids and family the same day. Book one per person or message her.')]],
      hair: [[E2('¿Es médico?', 'Is it medical?'), E2('No. Si la caída es de repente o con manchas, ve al dermatólogo primero.', 'No. If hair loss is sudden or patchy, see a dermatologist first.')], [E2('¿Cuántas sesiones hacen falta?', 'How many sessions are needed?'), E2('En la evaluación te decimos cuántas y qué esperar.', 'At the evaluation we tell you how many and what to expect.')], wkQ],
      salon: [wkQ, depQ].concat(ker),
      barber: [wkQ, depQ],
    };
    return (F[k] || F.salon).slice(0, 3); }
  function revTuples(b) { const D = ['HOY', 'AYER', 'HACE 3 DÍAS', 'HACE 1 SEMANA', 'HACE 2 SEMANAS']; return rev(b).map(r => [r.name, r.d < 7 ? 'HACE ' + r.d + ' DÍAS' : r.d < 14 ? 'HACE 1 SEMANA' : 'HACE 2 SEMANAS', r.stars, r.es, r.en, r.reply ? r.reply[0] : '']); }
  function stats(b) { if (STATS[b.id]) return STATS[b.id]; const bk = b.m === 'silla' || b.tags.includes('cita'); return { ver: b.pro && bk ? Math.round(b.n * .6) : 0, orders: b.pro && bk && b.tags.includes('online') ? Math.round(b.n * .5) : 0, hot: 85 + b.n % 9, time: 88 + b.n % 8, val: 90 + b.n % 7, taste: b.r }; }
  window.TLBellL = { SVC, SHOP, FAQ, RV, rev, revTuples, stats, kindOf, faqOf, RK };
  const R = window.TLRev; if (R && !R._bell) { const f = R.forBiz, st = R.stats, tp = R.top, tc = R.topics; R._bell = 1;
    R.forBiz = (b, i) => b.bell ? rev(b) : f(b, i); R.stats = b => b.bell ? stats(b) : st(b); R.top = b => b.bell ? [] : tp(b); R.topics = b => b.bell ? [] : tc(b); }
})();

/* ==== prototype/pay-methods.js ==== */
/* Método de pago (compartido). Hoja móvil / ventana 560 desktop: tarjetas guardadas, To'Latino Wallet, agregar tarjeta.
   open(C, { ctx, amt, wallet, sel, declined, note }) · vals(C, s, es) · label/badge/refundL para mostrar el método elegido.
   ctx 'bk' = depósito del Booking (bk.pm). Invitado → "Entra para elegir tu tarjeta" y vuelve aquí. */
(function () {
  const CARDS = [{ id: 'v4242', brand: 'visa', l4: '4242', exp: '08/28', def: 1 }, { id: 'm8812', brand: 'mc', l4: '8812', exp: '03/27' }];
  const BR = { visa: ['VISA', 'Visa'], mc: ['MC', 'Mastercard'], amex: ['AMEX', 'Amex'], disc: ['DISC', 'Discover'] };
  const brandOf = n => /^4/.test(n) ? 'visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'mc' : /^3[47]/.test(n) ? 'amex' : /^6(011|5)/.test(n) ? 'disc' : null;
  const money = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  const bal = s => s.walBal != null ? s.walBal : 18.4;
  const cards = s => s.cards || CARDS;
  const find = (s, id) => cards(s).find(c => c.id === id) || cards(s)[0];
  const label = (s, id) => id === 'wal' ? "To'Latino Wallet" : (c => BR[c.brand][1] + ' ·· ' + c.l4)(find(s, id));
  const badge = (s, id) => id === 'wal' ? '' : BR[find(s, id).brand][0];
  const refundL = (s, id, es) => id === 'wal' ? (es ? 'al instante a tu Wallet' : 'instantly to your Wallet') : (es ? 'a tu ' + label(s, id) + ' en 3 a 5 días hábiles' : 'to your ' + label(s, id) + ' in 3 to 5 business days');
  const dg = x => (x || '').replace(/\D/g, '');
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)' });
  const stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };

  function open(C, o) { const s = C.state;
    if (!s.user) { C.setState({ auth: { step: 'phone', next: { ...s.route }, top: C.vTop(), ctx: 'pm', after: () => open(C, o) } }); return; }
    C.setState({ pmSh: { ...o, step: 'list', top: C.vTop(), f: { n: '', e: '', c: '', z: '', nm: s.user.name || '', save: true } } }); }
  function apply(C, q, id) { if (q.ctx === 'bk') C.setState(z => ({ bk: z.bk ? { ...z.bk, pm: id, declined: false } : z.bk, pmSh: null })); else if (q.ctx === 'ab') C.setState(z => ({ ab: z.ab ? { ...z.ab, pm: id, declined: false } : z.ab, pmSh: null })); else if (q.ctx === 'eb') C.setState(z => ({ eb: z.eb ? { ...z.eb, pm: id, declined: false } : z.eb, pmSh: null })); else if (q.ctx === 'trb') C.setState(z => ({ trb: z.trb ? { ...z.trb, pm: id, declined: false } : z.trb, pmSh: null })); else if (q.ctx === 'tb') C.setState(z => ({ tb: z.tb ? { ...z.tb, pm: id, declined: false } : z.tb, pmSh: null })); else if (q.ctx === 'nb') C.setState(z => ({ nb: z.nb ? { ...z.nb, pm: id, declined: false } : z.nb, pmSh: null })); else if (q.ctx === 'mb') C.setState(z => ({ mb: z.mb ? { ...z.mb, pm: id, declined: false } : z.mb, pmSh: null })); else if (q.ctx === 'fb') C.setState(z => ({ fb: z.fb ? { ...z.fb, pm: id, declined: false } : z.fb, pmSh: null })); else if (q.ctx === 'pb') C.setState(z => ({ pb: z.pb ? { ...z.pb, pm: id } : z.pb, pmSh: null })); else if (q.ctx === 'sb') C.setState(z => ({ sb: z.sb ? { ...z.sb, pm: id } : z.sb, pmSh: null })); else if (q.ctx === 'hb') C.setState(z => ({ hb: z.hb ? { ...z.hb, pm: id, declined: false } : z.hb, pmSh: null })); else if (q.ctx === 'ck') C.setState(z => ({ ck: { ...(z.ck || {}), pm: id, declined: false }, pmSh: null })); else C.setState({ pmSh: null }); }

  function vals(C, s, es) {
    const q = s.pmSh, E2 = (a, b) => es ? a : b, none = { open: false, dlg: false, cards: [], w: {}, f: {}, lbl: {} };
    if (!q || (q.ctx === 'bk' && !(s.bk && s.route && s.route.code === 'APP-NEG-BOOKING')) || (q.ctx === 'ck' && !(s.route && s.route.code === 'APP-NEG-CHECKOUT')) || (q.ctx === 'ab' && !(s.ab && s.route && s.route.code === 'APP-NEG-AUTO-BOOKING')) || (q.ctx === 'hb' && !(s.hb && s.route && s.route.code === 'APP-NEG-HOGAR-BOOKING'))) return none;
    const dk = s.view === 'desktop', up = o => C.setState(z => ({ pmSh: { ...z.pmSh, ...o } })), uf = o => C.setState(z => ({ pmSh: { ...z.pmSh, f: { ...z.pmSh.f, ...o } } }));
    const sel = q.sel || cards(s)[0].id, B = bal(s), add = q.step === 'add';
    const rows = cards(s).map(c => { const dec = q.declined === c.id;
      return { b: BR[c.brand][0], l: BR[c.brand][1] + ' ·· ' + c.l4, s: dec ? E2('TU BANCO LA RECHAZÓ HACE UN MOMENTO', 'YOUR BANK DECLINED IT A MOMENT AGO') : E2('VENCE ', 'EXPIRES ') + c.exp + (c.def ? E2(' · PREDETERMINADA', ' · DEFAULT') : '') + (c.once ? E2(' · SOLO PARA ESTE PAGO', ' · THIS PAYMENT ONLY') : ''),
        sFg: dec ? '#C0392B' : 'rgba(11,14,18,.5)', dim: 1, cur: 'pointer', ...radio(sel === c.id), onClick: () => up({ sel: c.id }) }; });
    const wOk = B >= (q.amt || 0), short = Math.round(((q.amt || 0) - B) * 100) / 100;
    const w = { l: "To'Latino Wallet", s: E2('SALDO ', 'BALANCE ') + money(B) + (wOk ? '' : E2(' · TE FALTAN ', ' · ') + money(short) + E2('', ' SHORT')), sFg: wOk ? '#00695B' : '#C0392B', dim: wOk ? 1 : .55, cur: wOk ? 'pointer' : 'default', ...radio(sel === 'wal' && wOk), onClick: () => { if (wOk) up({ sel: 'wal' }); } };
    /* Agregar tarjeta */
    const f = q.f || {}, n = dg(f.n), br = brandOf(n), nMax = br === 'amex' ? 15 : 16, nDone = n.length >= nMax;
    const ex = dg(f.e), mm = +ex.slice(0, 2), yy = +ex.slice(2, 4), eDone = ex.length === 4, eBadM = eDone && (mm < 1 || mm > 12), ePast = eDone && !eBadM && (2000 + yy < 2026 || (2000 + yy === 2026 && mm < 9));
    const cv = dg(f.c), cMax = br === 'amex' ? 4 : 3, cDone = cv.length === cMax, zp = dg(f.z), zDone = zp.length === 5, nm = (f.nm || '').trim();
    const nErr = nDone && !br ? E2('No reconocemos esta tarjeta. Revisa el número.', 'We do not recognize this card. Check the number.') : '';
    const eErr = eBadM ? E2('El mes va del 01 al 12.', 'The month goes from 01 to 12.') : ePast ? E2('Esta tarjeta ya venció.', 'This card has expired.') : '';
    const ok = nDone && !!br && eDone && !eErr && cDone && zDone && nm.length > 1;
    const miss = !nDone || nErr ? E2('el número', 'number') : !eDone || eErr ? E2('la fecha', 'expiry') : !cDone ? 'CVC' : !zDone ? E2('el código postal', 'ZIP code') : E2('el nombre', 'name');
    const fmtN = d => d.replace(/(\d{4})(?=\d)/g, '$1 '), fmtE = d => d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2, 4) : d;
    const save = () => { if (!ok) return; const dup = cards(s).find(c => c.l4 === n.slice(-4) && c.brand === br); if (dup) return apply(C, q, dup.id);
      const c = { id: 'c' + n.slice(-4) + (Date.now() % 1000), brand: br, l4: n.slice(-4), exp: fmtE(ex), once: !f.save }; C.setState(z => ({ cards: (z.cards || CARDS).concat(c) })); apply(C, q, c.id); };
    const bdOf = err => err ? '1.5px solid #C0392B' : '1px solid rgba(11,14,18,.12)';
    return { open: !dk, dlg: dk, top: (q.top || 80) + 'px', stop, onClose: () => C.setState({ pmSh: null }), isList: !add, isAdd: add, onAdd: () => up({ step: 'add' }), onBack: () => up({ step: 'list' }),
      title: add ? E2('Agregar tarjeta', 'Add a card') : E2('Método de pago', 'Payment method'), sub: q.note || '',
      cards: rows, hasW: !!q.wallet, w, hasRef: q.ctx === 'bk' || q.ctx === 'ck' || q.ctx === 'hb' || q.ctx === 'ab', ref: (q.ctx === 'ck' ? E2('Si hay un reembolso, vuelve ', 'If there is a refund, it goes back ') : E2('Si te devolvemos el depósito, vuelve ', 'If we refund the deposit, it goes back ')) + refundL(s, sel === 'wal' && !wOk ? cards(s)[0].id : sel, es) + '.',
      cta: add ? (ok ? E2('Usar esta tarjeta', 'Use this card') : E2('Falta: ', 'Missing: ') + miss) : E2('Usar ', 'Use ') + (sel === 'wal' ? 'Wallet' : label(s, sel)), dis: add ? !ok : false, onUse: add ? save : () => apply(C, q, sel),
      f: { n: f.n || '', e: f.e || '', c: f.c || '', z: f.z || '', nm: f.nm || '', hasB: !!br, b: br ? BR[br][0] : '', nBd: bdOf(!!nErr), eBd: bdOf(!!eErr), hasNErr: !!nErr, nErr, hasEErr: !!eErr, eErr, cPh: br === 'amex' ? '1234' : '123',
        onN: e => { const d = dg(e.target.value); uf({ n: fmtN(d.slice(0, brandOf(d) === 'amex' ? 15 : 16)) }); }, onE: e => uf({ e: fmtE(dg(e.target.value).slice(0, 4)) }), onC: e => uf({ c: dg(e.target.value).slice(0, 4) }), onZ: e => uf({ z: dg(e.target.value).slice(0, 5) }), onNm: e => uf({ nm: e.target.value.replace(/[0-9]/g, '').slice(0, 40) }),
        svBg: f.save ? '#0B0E12' : 'rgba(11,14,18,.18)', svX: f.save ? '18px' : '0px', onSave: () => uf({ save: !f.save }) },
      lbl: { cardsK: E2('TUS TARJETAS', 'YOUR CARDS'), walK: E2("SALDO EN TO'LATINO", "TO'LATINO BALANCE"), add: E2('Agregar tarjeta de crédito o débito', 'Add a credit or debit card'), numK: E2('NÚMERO DE LA TARJETA', 'CARD NUMBER'), expK: E2('VENCE', 'EXPIRES'), expPh: E2('MM/AA', 'MM/YY'), zipK: E2('CÓD. POSTAL', 'ZIP CODE'),
        nameK: E2('NOMBRE EN LA TARJETA', 'NAME ON CARD'), namePh: E2('Como aparece en la tarjeta', 'As it appears on the card'), saveT: E2('Guardar para la próxima', 'Save for next time'), saveS: E2("To'Latino nunca ve el número completo.", "To'Latino never sees the full number."), secure: E2('PAGO SEGURO CON STRIPE · 3D SECURE', 'SECURED BY STRIPE · 3D SECURE') } };
  }
  window.TLPay = { CARDS, cards, label, badge, refundL, bal, open, vals };
})();
