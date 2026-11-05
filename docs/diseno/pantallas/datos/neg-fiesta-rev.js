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
