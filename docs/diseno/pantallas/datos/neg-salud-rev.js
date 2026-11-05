/* Salud (NEG-SALUD) — Etapa 4: reseña de salud + Ayuda con la cita. Hoy = jue 24 sep 2026.
   RESEÑA (APP-NEG-RESENA, la misma pantalla): revWVals llama a TLSaludRev cuando b.salud. Verificada = cita 'done' en s.scitas.
     "Aceptaron tu seguro" sale de la cita (no se edita). Preguntas: te entendieron en tu idioma · esperaste lo que dijeron · te explicaron ·
     cobraron lo que dijeron · trato. NUNCA el motivo de la consulta ni datos de salud: aviso fijo "No escribas diagnósticos ni medicinas".
     ≤2 ★ → "la reseña no devuelve dinero" → Ayuda con la cita.
   AYUDA (APP-NEG-SALUD-AYUDA → -ESTADO; vistas pe/ps, TLHogarExt.shelp): cobro que no dijeron · cobraron a mi seguro algo que no pedí ·
     no aceptaron mi seguro después de confirmar · no había intérprete · esperé mucho · trato · otra → detalle (sin datos médicos) + foto de la
     factura (obligatoria en cobros) → qué quieres (que lo revisen y me devuelvan · que corrijan el cobro al seguro · solo avisar).
     Respuesta: acepta · propone otra cosa · no acepta → revisión de To'Latino · sin respuesta 48 h → To'Latino revisa.
     Línea fija: "Si es una emergencia, llama al 911." y "To'Latino no da consejo médico." */
(function boot() {
  const SL = window.TLSaludL, SF = window.TLSaludFlow, SA = window.TLSalud, X = window.TLListing, ALL = window.TLAll, HP = window.TLHogarPre;
  if (!SL || !SF || !SA || !X || !ALL || !HP) return setTimeout(boot, 40);
  const biz = id => ALL.B.find(b => b.id === id), money = n => '$' + Math.round(n).toLocaleString('en-US'), fmt = X.fmt;
  const PX = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 200) + ')';
  const upP = (C, id, o) => C.setState(z => ({ hpres: (z.hpres || []).map(p => p.id === id ? { ...p, ...(typeof o === 'function' ? o(p) : o) } : p) }));
  const radio = on => ({ bd: on ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)', ring: on ? '6px solid #0B0E12' : '1.5px solid rgba(11,14,18,.25)' });
  const LINE = SA.line, NOMED = ['No escribas diagnósticos, medicinas ni resultados. Cuenta cómo te atendieron.', 'Do not write diagnoses, medications or results. Tell how you were treated.'];
  const withOf = x => { const S = X.STAFF[x.own] || []; return x.stf !== 'any' && S[x.stf] ? S[x.stf][0].replace(/, (PA-C|NP|DPT|CNM)$/, '') : ''; };

  /* ---------- Reseña ---------- */
  const cita = (s, bid, cid) => { const L = (s.scitas || []).filter(x => x.own === bid && x.st === 'done'), x = (cid && L.find(y => y.id === cid)) || L[L.length - 1] || null; return x ? { ...x, withL: withOf(x), total: 0 } : null; };
  function srcs(ctA, es) { const E2 = (a, b) => es ? a : b;
    return (ctA ? [['cita', E2('Cita #', 'Appointment #') + ctA.id + ' · ' + (es ? ctA.svc : ctA.svcEn), E2('Hoy', 'Today') + (ctA.withL ? ' · ' + ctA.withL : ''), E2('VERIFICADA', 'VERIFIED'), 'signal']] : [])
      .concat([['vis', E2("Fui sin cita de To'Latino", "I went without a To'Latino booking"), E2('Por teléfono o sin cita', 'By phone or walk-in'), E2('VISITANTE', 'VISITOR'), 'neutral']]); }
  function groups(G, isCita, ctA, es) { const E2 = (a, b) => es ? a : b;
    return (isCita ? [] : [G(E2('¿ACEPTARON TU SEGURO?', 'DID THEY TAKE YOUR INSURANCE?'), 'price', [[1, E2('Sí', 'Yes')], [0, E2('No', 'No')], [2, E2('Fui sin seguro', 'I went uninsured')]])])
      .concat([G(E2('¿TE ENTENDIERON EN TU IDIOMA?', 'DID THEY UNDERSTAND YOU?'), 'whoOk', [[1, E2('El médico habló español', 'Doctor spoke Spanish')], [2, E2('Con intérprete', 'With an interpreter')], [0, E2('No me entendieron', 'They did not understand me')]]),
        G(E2('¿ESPERASTE LO QUE DIJERON?', 'DID YOU WAIT WHAT THEY SAID?'), 'wait', [['a', E2('A la hora', 'On time')], ['b', E2('Hasta 30 min', 'Up to 30 min')], ['c', E2('Más de 30 min', 'Over 30 min')]]),
        G(E2('¿TE EXPLICARON?', 'DID THEY EXPLAIN?'), 'asked', [[1, E2('Todo claro', 'All clear')], [0, E2('Más o menos', 'Sort of')], [-1, E2('No', 'No')]]),
        G(E2('¿COBRARON LO QUE DIJERON?', 'DID THEY CHARGE WHAT THEY SAID?'), 'clean', [[1, E2('Sí', 'Yes')], [-1, E2('Cobraron algo más', 'Charged something extra')]]),
        G(E2('TRATO', 'HOW THEY TREATED YOU'), 'trato', [[1, E2('Con respeto', 'With respect')], [0, E2('Normal', 'Okay')], [-1, E2('Mal trato', 'Treated badly')]])]); }
  function tm(ctA, es) { const E2 = (a, b) => es ? a : b;
    return [[E2('SERVICIO', 'SERVICE'), es ? ctA.svc : ctA.svcEn, '#0B0E12'], [E2('SEGURO', 'INSURANCE'), ctA.segOk ? E2('Aceptado', 'Accepted') : E2('Sin seguro', 'Uninsured'), ctA.segOk ? '#00695B' : 'rgba(11,14,18,.6)'], [E2('PAGASTE', 'YOU PAID'), ctA.price, '#0B0E12']].concat(ctA.withL ? [[E2('CON', 'WITH'), ctA.withL, '#0B0E12']] : []).map(([k, v, fg]) => ({ k, v, fg })); }
  function pool(b, ctA, isCita, es) { const L = [].concat(...SL.svcs(b.id).map(g => g[2])); return (isCita && ctA ? [es ? ctA.svc : ctA.svcEn] : []).concat(L.map(it => es ? it.n : it.ne || it.n)).filter((k, i, a) => a.indexOf(k) === i).slice(0, 6); }
  function draft(F, isCita, ctA, es) { return { src: isCita ? 'cita' : 'vis', hot: null, val: null, taste: null, late: null, wait: '', lateK: '', asked: null, price: null, clean: null, trato: F.trato, whoOk: null, pro: isCita && ctA ? ctA.withL : '', cid: isCita && ctA ? ctA.id : '',
    svc: '', ins: isCita && ctA ? (ctA.segOk ? 1 : null) : F.price === 1 ? 1 : F.price === 0 ? 0 : null, lang: F.whoOk === 1 ? 'medesp' : F.whoOk === 2 ? 'interp' : F.whoOk === 0 ? 'no' : null, wait: F.wait === 'a' ? 0 : F.wait === 'b' ? 20 : F.wait === 'c' ? 45 : null, expl: F.asked == null ? null : F.asked === 1 ? 1 : 0, price: F.clean == null ? null : F.clean === -1 ? 0 : 1 }; }
  function fix(V, C, s, es, b, isCita, ctA) { const E2 = (a, c) => es ? a : c;
    return { ...V, tmK: E2('TU CITA · DATO DE LA CITA', 'YOUR APPOINTMENT · FROM THE BOOKING'), tmNote: E2('El seguro y lo que pagaste salen de tu cita. Nunca se publica el motivo de la consulta.', 'Insurance and what you paid come from your appointment. The reason for the visit is never published.'),
      meta: (b.name + (isCita && ctA ? E2(' · CITA #', ' · APPOINTMENT #') + ctA.id : '')).toUpperCase(),
      lowT: E2('La reseña no devuelve dinero. Si te cobraron de más o no aceptaron tu seguro, pídelo en Ayuda con la cita.', 'A review does not refund money. If you were overcharged or your insurance was refused, ask in Appointment help.'),
      onHelpOrd: () => ctA ? startHelp(C, ctA.id) : C.encargo('APP-NEG-SALUD-AYUDA', 'APP-NEG-RESENA', b.name, E2('Ayuda con la cita', 'Appointment help')),
      lbl: { ...V.lbl, srcNote: E2("Solo sale verificada si la cita fue por To'Latino.", "It only shows as verified if the appointment was through To'Latino."), aspK: E2('LO QUE IMPORTA EN SALUD', 'WHAT MATTERS IN HEALTH CARE'), recK: E2('¿QUÉ SERVICIO RECOMIENDAS?', 'WHICH SERVICE DO YOU RECOMMEND?'), recS: E2('Opcional. Sale en tu reseña.', 'Optional. Shows in your review.'),
        textPh: NOMED[es ? 0 : 1], helpOrd: E2('Ir a Ayuda con la cita', 'Go to Appointment help') } }; }

  /* ---------- Ayuda con la cita ---------- */
  const RSN = [['cobro', 'Me cobraron algo que no dijeron', 'Charged something not mentioned', 1], ['seguro', 'Cobraron a mi seguro algo que no pedí', 'Billed my insurance for something I did not get', 1], ['noseg', 'No aceptaron mi seguro después de confirmar', 'Refused my insurance after confirming', 1], ['interp', 'No había intérprete', 'No interpreter', 0], ['espera', 'Esperé mucho más de lo que dijeron', 'Waited much longer than they said', 0], ['trato', 'Mal trato', 'Treated badly', 0], ['otro', 'Otra cosa', 'Something else', 0]];
  const SOL = [['rev', 'Que lo revisen y me devuelvan', 'Review it and refund me', 'Si te cobraron de más'], ['corr', 'Que corrijan el cobro a mi seguro', 'Correct the insurance claim', 'Te mandan la factura corregida'], ['avis', 'Solo quiero avisar', 'I just want to let them know', 'Lo lee el consultorio y To\'Latino']];
  const isBill = r => { const z = RSN.find(y => y[0] === r); return !!(z && z[3]); };
  function startHelp(C, cid) { const x = (C.state.scitas || []).find(y => y.id === cid); if (!x) return; const open = (C.state.hpres || []).find(p => p.mode === 'shelp' && p.cid === cid && !['done'].includes(p.st));
    if (open) { C.nav({ code: 'APP-NEG-SALUD-AYUDA-ESTADO', biz: x.own, pid: open.id, from: 'APP-NEG-SALUD-CITA' }); C.scrollTop(); return; }
    C.setState({ hpe: { mode: 'shelp', cid, biz: x.biz, own: x.own, r: null, note: '', phs: [], sol: 'rev', amt: '', code: '', areas: [] } }); C.nav({ code: 'APP-NEG-SALUD-AYUDA', biz: x.own, cid, from: 'APP-NEG-SALUD-CITA' }); C.scrollTop(); }
  function helpForm(C, s, es) { const q = s.hpe, E2 = (a, b) => es ? a : b, x = (s.scitas || []).find(y => y.id === q.cid); if (!x) return { has: false };
    const ob = biz(x.own), upF = o => C.setState(z => ({ hpe: { ...z.hpe, ...o } })), bill = isBill(q.r);
    const miss = [!q.r ? E2('Elige qué pasó', 'Pick what happened') : null, q.note.trim().length < 15 ? E2('Cuéntanos qué pasó (15 letras o más)', 'Tell us what happened (15+ characters)') : null, bill && !q.phs.length ? E2('Agrega una foto de la factura o del estado de cuenta', 'Add a photo of the bill or statement') : null].filter(Boolean);
    const send = () => { if (miss.length) return; const id = 'M-' + (2100 + Math.floor(Math.random() * 800)); const p = { id, mode: 'shelp', cid: x.id, biz: x.biz, own: x.own, r: q.r, note: q.note, phs: q.phs, sol: q.sol, amt: q.amt, st: 'sent', at: '5:40 PM', svc: x.svc, svcEn: x.svcEn, price: x.price };
      C.setState(z => ({ hpres: (z.hpres || []).concat(p), hpe: null })); C.nav({ code: 'APP-NEG-SALUD-AYUDA-ESTADO', biz: x.own, pid: id, from: 'APP-NEG-SALUD-AYUDA' }); C.scrollTop(); respond(C, id); };
    return { has: true, scr: 'APP-NEG-SALUD-AYUDA', hasVid: false, showPh: true, showNote: true, showCode: bill && q.sol === 'rev', title: E2('Ayuda con la cita', 'Appointment help'), sub: (E2('CITA #', 'APPOINTMENT #') + x.id + ' · ' + ob.name).toUpperCase(),
      veh: { ic: 'medical', k: E2('TU CITA', 'YOUR APPOINTMENT'), t: es ? x.svc : x.svcEn, s: (x.seg ? SL.segName(x.seg, es) : '').toUpperCase(), hasOk: true, okT: E2('Pagaste en la consulta: ', 'You paid at the visit: ') + x.price, okFg: '#00695B', okIc: 'check', cta: E2('Ver', 'See'), onClick: () => C.nav({ code: 'APP-NEG-SALUD-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-SALUD-AYUDA' }) },
      lights: RSN.map(([k, l1, l2]) => ({ l: es ? l1 : l2, v: q.r === k ? 'selected' : 'filter', onClick: () => upF({ r: q.r === k ? null : k }) })), note: q.note, onNote: e => upF({ note: e.target.value.slice(0, 500) }), noteN: q.note.length + ' / 500',
      code: q.amt, onCode: e => upF({ amt: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) }),
      phs: q.phs.map((p, i) => ({ bg: PX(p.ph), vid: false, onDel: () => upF({ phs: q.phs.filter((_, j) => j !== i) }) })), canPh: q.phs.length < 4, onPh: () => upF({ phs: q.phs.concat([{ ph: [7111490, 7926666, 7688191][q.phs.length % 3], vid: false }]) }), onVid: () => {}, phN: q.phs.length + ' / 4',
      whens: SOL.map(([k, l1, l2, sub]) => ({ l: es ? l1 : l2, s: es ? sub : k === 'rev' ? 'If you were overcharged' : k === 'corr' ? 'They send the corrected bill' : 'Read by the clinic and To\'Latino', hasS: true, ...radio(q.sol === k), onClick: () => upF({ sol: k }) })),
      how: [E2(ob.name + ' recibe tu solicitud y responde en 24 h.', ob.name + ' gets your request and replies within 24 h.'), E2("Si no responde o no estás de acuerdo, To'Latino la revisa en 48 h.", "If they do not reply or you disagree, To'Latino reviews it within 48 h."), E2('Nada se da por resuelto hasta que respondan.', 'Nothing is resolved until they reply.')].map((z, i) => ({ n: String(i + 1), t: z })),
      miss: miss.map(z => ({ t: z })), hasMiss: miss.length > 0, dis: miss.length > 0, onSend: send, cta: E2('Enviar solicitud', 'Send request'), free: E2('RESPONDE EN 24 H', 'REPLIES WITHIN 24 H'),
      onBack: () => C.nav({ code: 'APP-NEG-SALUD-CITA', biz: x.own, cid: x.id, from: 'APP-NEG-SALUD-AYUDA' }),
      lbl: { back: E2('Volver', 'Back'), vehT: E2('Tu cita', 'Your appointment'), symT: E2('¿Qué pasó?', 'What happened?'), symS: NOMED[es ? 0 : 1], lightsK: E2('MOTIVO', 'REASON'), notePh: E2('Ej.: me dijeron $0 con Medicaid y me llegó una factura de $60…', 'E.g. they said $0 with Medicaid and I got a $60 bill…'),
        codeK: E2('¿CUÁNTO TE COBRARON DE MÁS? · OPCIONAL', 'HOW MUCH WERE YOU OVERCHARGED? · OPTIONAL'), codePh: E2('Ej.: 60', 'E.g. 60'), phT: bill ? E2('Foto de la factura · obligatoria', 'Photo of the bill · required') : E2('Foto · opcional', 'Photo · optional'), phS: E2('Tapa los datos médicos si aparecen; solo hace falta el cobro.', 'Cover any medical details; only the charge is needed.'), addPh: E2('Foto', 'Photo'), addVid: '', vidTag: '',
        whenT: E2('¿Qué quieres?', 'What would you like?'), howK: E2('CÓMO FUNCIONA', 'HOW IT WORKS'), missK: E2('TE FALTA', 'STILL NEEDED'), honest: LINE[es ? 0 : 1] + ' ' + E2("To'Latino no da consejo médico.", "To'Latino does not give medical advice.") } };
  }
  function reply(p, sc) { const amt = p.amt ? +p.amt : 60; return sc === 'rechaza' ? { st: 'no', repAt: '6:20 PM' } : sc === 'cambio' ? { st: 'alt', repAt: '6:20 PM', altAmt: Math.round(amt * .5) } : { st: 'ok', repAt: '6:20 PM', okAmt: p.sol === 'rev' ? amt : 0 }; }
  function respond(C, id) { clearTimeout(C._shT); const sc = C.state.scen || 'ok'; if (sc === 'nada') return; C._shT = setTimeout(() => upP(C, id, p => p.st === 'sent' ? reply(p, sc) : {}), 4000); }
  function helpStatus(C, s, es, p) { const E2 = (a, b) => es ? a : b, ob = biz(p.own), st = p.st, rsn = RSN.find(z => z[0] === p.r), sol = SOL.find(z => z[0] === p.sol);
    const okT = p.sol === 'rev' ? E2('Te devolvemos ', 'Refunding ') + money(p.okAmt || 0) : p.sol === 'corr' ? E2('Corrigen el cobro a tu seguro', 'Correcting the insurance claim') : E2('Gracias por avisar', 'Thanks for letting us know');
    const H = { sent: ['clock', 'rgba(75,55,245,.1)', '#4B37F5', E2('PENDIENTE', 'PENDING'), E2('Esperando a ', 'Waiting for ') + ob.name, E2("Responde en 24 h. Si no, To'Latino la revisa en 48 h.", "Replies within 24 h. Otherwise, To'Latino reviews it within 48 h.")],
      ok: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('ACEPTÓ', 'ACCEPTED'), okT, p.sol === 'rev' ? E2('Vuelve a tu tarjeta en 3–5 días hábiles.', 'Back to your card in 3–5 business days.') : p.sol === 'corr' ? E2('Te mandan la factura corregida en 10 días.', 'They send the corrected bill within 10 days.') : ''],
      alt: ['dollar', 'rgba(255,176,32,.2)', '#8A5A00', E2('PROPONE OTRA COSA', 'PROPOSES SOMETHING ELSE'), E2('Devolverte ', 'Refund ') + money(p.altAmt || 0), E2("Tú decides. Si no te sirve, pide revisión a To'Latino.", "You decide. If it does not work for you, ask To'Latino to review.")],
      no: ['warning', 'rgba(192,57,43,.1)', '#C0392B', E2('NO ACEPTÓ', 'DECLINED'), ob.name + E2(' dice que el cobro es correcto', ' says the charge is correct'), E2("Si no estás de acuerdo, To'Latino revisa la factura en 48 h.", "If you disagree, To'Latino reviews the bill within 48 h.")],
      rev: ['shield', 'rgba(75,55,245,.1)', '#4B37F5', E2("EN REVISIÓN DE TO'LATINO", "UNDER TO'LATINO REVIEW"), E2('Revisamos en 48 h', 'We review within 48 h'), E2('Miramos la factura y lo que se dijo en la cita. Te escribimos por SMS.', 'We look at the bill and what was said at booking. We will text you.')],
      done: ['check', 'rgba(0,229,196,.18)', '#00695B', E2('LISTO', 'DONE'), p.doneT || '', E2('Gracias por avisarnos.', 'Thanks for letting us know.')] }[st];
    const acts = st === 'ok' ? [['check', E2('Entendido', 'Got it'), () => upP(C, p.id, { st: 'done', doneT: okT })]] : st === 'alt' ? [['dollar', E2('Aceptar ', 'Accept ') + money(p.altAmt || 0), () => upP(C, p.id, { st: 'done', doneT: E2('Devuelto ', 'Refunded ') + money(p.altAmt || 0) })], ['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : st === 'no' ? [['shield', E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), () => upP(C, p.id, { st: 'rev' })]] : [];
    return { has: true, title: E2('Ayuda con la cita', 'Appointment help'), num: (E2('SOLICITUD #', 'REQUEST #') + p.id + E2(' · CITA #', ' · APPOINTMENT #') + p.cid).toUpperCase(), hdr: { ic: H[0], bg: H[1], fg: H[2], k: H[3], t: H[4], s: H[5] }, big: false, small: true,
      steps: [[E2('Enviada', 'Sent'), p.at, 1], [E2('Respuesta de ', 'Reply from ') + ob.name, p.repAt || '', st !== 'sent'], [E2('Resuelta', 'Resolved'), '', st === 'done']].map(([label, time, d], i, a) => ({ label, time, state: d ? 'done' : (i === 0 || a[i - 1][2]) ? 'current' : 'next' })),
      rep: { has: ['ok', 'alt', 'no'].includes(st), who: ob.name, ph: PX(ob.ph[0], 120), at: p.repAt, t: st === 'ok' ? E2('Revisamos y tienes razón. Disculpa el error.', 'We checked and you are right. Sorry for the mistake.') : st === 'alt' ? E2('Parte del cobro es correcto. Podemos devolverte ' + money(p.altAmt || 0) + '.', 'Part of the charge is correct. We can refund ' + money(p.altAmt || 0) + '.') : E2('El cobro es lo que tu seguro no cubre. Te explicamos por teléfono si quieres.', 'The charge is what your insurance does not cover. We can explain by phone if you want.'),
        hasInc: false, inc: [], chg: [], valid: '', time: '', cta: E2('Llamar al consultorio', 'Call the clinic'), onCta: () => C.encargo('APP-NEG-CONTACTO', 'APP-NEG-SALUD-AYUDA-ESTADO', ob.name, E2('Llamar al consultorio', 'Call the clinic')) },
      req: { rows: [[E2('MOTIVO', 'REASON'), rsn ? rsn[es ? 1 : 2] : '—'], [E2('QUIERES', 'YOU WANT'), sol ? sol[es ? 1 : 2] : '—']].concat(p.amt ? [[E2('MONTO', 'AMOUNT'), money(+p.amt)]] : []).concat([[E2('LES CONTASTE', 'YOU SAID'), '«' + p.note + '»']]).map(([k, v]) => ({ k, v })), phs: (p.phs || []).map(z => ({ bg: PX(z.ph), vid: false })) },
      hasOthers: false, others: [], acts: acts.map(([icon, l, onClick]) => ({ icon, l, onClick })), hasActs: acts.length > 0,
      onBack: () => C.nav({ code: 'APP-NEG-SALUD-CITA', biz: p.own, cid: p.cid, from: 'APP-NEG-SALUD-AYUDA-ESTADO' }),
      lbl: { back: E2('Volver a la cita', 'Back to the appointment'), repK: E2('RESPUESTA DE ', 'REPLY FROM ') + ob.name.toUpperCase(), incK: '', chgK: '', reqK: E2('LO QUE MANDASTE', 'WHAT YOU SENT'), othersK: '', vidTag: '', honest: LINE[es ? 0 : 1] } };
  }
  const EXT = window.TLHogarExt = window.TLHogarExt || {};
  EXT.shelp = { form: helpForm, status: helpStatus, sim: (C, s, p) => { const es = (s.lang || 'es') === 'es', sc = s.scen || 'ok';
    if (p.st === 'sent') return { has: true, l: sc === 'nada' ? (es ? 'Pasan 24 h' : '24 h pass') : (es ? 'El consultorio responde' : 'Clinic replies'), on: () => { clearTimeout(C._shT); upP(C, p.id, sc === 'nada' ? { st: 'rev' } : reply(p, sc)); } };
    if (p.st === 'rev') return { has: true, l: es ? "To'Latino decide" : "To'Latino decides", on: () => upP(C, p.id, { st: 'done', doneT: (es ? 'Te devolvemos ' : 'Refunding ') + money(p.amt ? +p.amt : 30) }) };
    return null; } };
  window.TLSaludRev = { cita, srcs, groups, tm, pool, draft, fix, startHelp };
})();
