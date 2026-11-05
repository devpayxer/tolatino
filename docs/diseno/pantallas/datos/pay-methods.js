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
