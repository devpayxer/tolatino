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
