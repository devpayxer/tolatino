/* Prueba Pro y día 30 (M4). Fuente única del plan de un negocio cuando cambia desde su panel: prueba de 30 días
   (día 0 → resumen del día 20 → aviso del día 25 → último día → día 30), seguir con Pro (tarjeta; el primer cobro es
   el día 30), no seguir, Free con el contenido Pro guardado (nunca se borra) y volver a Pro (se cobra ese día; no hay
   segunda prueba). Hoy del prototipo = jue 24 sep 2026, 12:30 PM (TLAdm.T0).
   localStorage tl-trial-v1 = { [negocio]: registro | null } (null = sin prueba, vuelve a su plan de base).
   Semilla: Barbería El Primo entró con Pro el dom 30 ago (hoy es su día 25: ya recibió el aviso).
   Lo leen Panel v2 (Tu página, Hoy, Cobros y plan), el Prototipo (b.pro en TLAll: ficha y resultados bajan a Free),
   el Super Admin (Planes · Suscripciones, Negocio 360° · Dinero, Notificaciones) y lo que sale en los avisos. */
(function () {
  const KEY = 'tl-trial-v1', D = 864e5, H = 36e5;
  const T0 = () => (window.TLAdm && window.TLAdm.T0) || new Date(2026, 8, 24, 12, 30).getTime();
  const DAY0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const MES = [['ene', 'Jan'], ['feb', 'Feb'], ['mar', 'Mar'], ['abr', 'Apr'], ['may', 'May'], ['jun', 'Jun'], ['jul', 'Jul'], ['ago', 'Aug'], ['sep', 'Sep'], ['oct', 'Oct'], ['nov', 'Nov'], ['dic', 'Dec']];
  const DIA = [['dom', 'Sun'], ['lun', 'Mon'], ['mar', 'Tue'], ['mié', 'Wed'], ['jue', 'Thu'], ['vie', 'Fri'], ['sáb', 'Sat']];
  const r2 = n => Math.round(n * 100) / 100, money = n => '$' + (Math.round((n || 0) * 100) / 100).toFixed(2);
  function fd(ms, es, wd) { const d = new Date(ms), day = es ? d.getDate() + ' ' + MES[d.getMonth()][0] : MES[d.getMonth()][1] + ' ' + d.getDate(); return wd ? DIA[d.getDay()][es ? 0 : 1] + ' ' + day : day; }
  function ft(ms) { const d = new Date(ms), h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); }
  function addMonth(ms, cyc) { const d = new Date(ms); d.setMonth(d.getMonth() + (cyc === 'anio' ? 12 : 1)); return d.getTime(); }
  const SEED = { 'barberia-el-primo': () => ({ st: 'trial', start: T0() - 25 * D, src: 'onb', hist: [{ k: 'start', at: T0() - 25 * D }] }) };

  let _raw = null, _st = {}, _aRaw = null, _a = {};
  function read() { let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} if (raw === _raw) return _st; _raw = raw; let o = null; try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; } _st = o && typeof o === 'object' ? o : {}; return _st; }
  function adm() { let raw = null; try { raw = localStorage.getItem('tl-adm-v1'); } catch (e) {} if (raw === _aRaw) return _a; _aRaw = raw; try { _a = (raw && JSON.parse(raw)) || {}; } catch (e) { _a = {}; } return _a; }
  const has = id => Object.prototype.hasOwnProperty.call(read(), id);
  function rec(id) { if (!id) return null; if (has(id)) return read()[id] || null; return SEED[id] ? SEED[id]() : null; }
  function emit(id) { try { window.dispatchEvent(new CustomEvent('tl-trial', { detail: { id } })); } catch (e) {} }
  function save(id, r) { const S = Object.assign({}, read()); S[id] = r; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} _raw = null; apply(); emit(id); }
  function cfg() { const P = adm().plan || {}, price = +P.price > 0 ? +P.price : 14.99; return { price, year: r2(price * 10), len: +P.trial > 0 ? +P.trial : 30, cap: +P.cap > 0 ? +P.cap : 10 }; }

  /* Estado calculado: st trial | pro | free · phase build | d20 | d25 | last | pro | ended */
  function of(id) {
    const r = rec(id); if (!r) return null;
    const C = cfg(), now = T0(), ab = (adm().biz || {})[id] || {}, cx = ab.subX === 'cancelada';
    const o = { id, r, price: C.price, year: C.year, cap: C.cap, cycle: r.cycle || 'mes', card: r.card || null, cx, used: !!r.start, hist: r.hist || [] };
    o.charge = o.cycle === 'anio' ? C.year : C.price;
    if (r.start) { o.ext = +ab.trialAdd || 0; o.len = (r.len || C.len) + o.ext; o.start = r.start; o.end = r.start + o.len * D; o.day = Math.max(0, Math.floor((now - r.start) / D)); o.left = Math.max(0, Math.ceil((o.end - now) / D)); }
    if (r.st === 'trial') {
      if (now < o.end) { Object.assign(o, { st: 'trial', pro: true, trialOn: true, dec: r.dec || null, phase: o.left <= 1 ? 'last' : o.left <= 5 ? 'd25' : o.day >= 20 ? 'd20' : 'build' }); }
      else if (r.card && r.dec !== 'free' && !cx) Object.assign(o, { st: 'pro', pro: true, since: o.end, next: addMonth(o.end, o.cycle), conv: true, phase: 'pro' });
      else Object.assign(o, { st: 'free', pro: false, endedAt: o.end, phase: 'ended', why: r.dec === 'free' ? 'dec' : 'end' });
    } else if (r.st === 'pro') {
      const until = r.until || null;
      if ((r.dec === 'free' || cx) && until && now >= until) Object.assign(o, { st: 'free', pro: false, endedAt: until, phase: 'ended', why: 'dec' });
      else Object.assign(o, { st: 'pro', pro: true, since: r.paidAt || null, next: until || (r.paidAt ? addMonth(r.paidAt, o.cycle) : null), dec: r.dec || null, until, base: !!r.base, back: !!r.back, phase: 'pro' });
    } else Object.assign(o, { st: 'free', pro: false, endedAt: r.at || o.end || now, phase: 'ended', why: r.why || 'self' });
    const cort = ab.pro === 'cortesia' && (!ab.proUntil || ab.proUntil > now); if (cort && !o.pro) Object.assign(o, { pro: true, cort: true, cortUntil: ab.proUntil || null, phase: 'cort' });
    return o;
  }

  /* Acciones (las llama el panel del negocio; el prototipo también con la barra PRUEBA PRO) */
  const H2 = (r, k) => (r.hist || []).concat([{ k, at: T0() }]);
  function start(id) { const r = rec(id); if (r && r.start) return false; save(id, { st: 'trial', start: T0(), src: 'panel', hist: [{ k: 'start', at: T0() }] }); return true; }
  /* Publica tu negocio v2: al publicar empieza la prueba (30 días, o los del código de promotor). Es un negocio nuevo: reemplaza cualquier registro anterior de ese id. */
  function startOnb(id, len, promo) { const r = { st: 'trial', start: T0(), src: 'onb', hist: [{ k: 'start', at: T0() }] }; if (len && +len !== cfg().len) r.len = +len; if (promo) r.promo = promo; save(id, r); return of(id); }
  function addCard(id, card, cycle) { const o = of(id), r = Object.assign({}, rec(id) || {}), now = T0(); r.card = card || { brand: 'Visa', last4: '4242' }; r.cycle = cycle || r.cycle || 'mes';
    if (o && o.trialOn) { r.dec = 'pro'; r.cardAt = now; r.hist = H2(r, 'card'); }
    else { const was = o && o.st === 'free'; r.st = 'pro'; r.paidAt = now; r.back = was; r.dec = null; r.until = null; r.hist = H2(r, was ? 'back' : 'card'); }
    save(id, r); return of(id); }
  function setCycle(id, cycle) { const r = Object.assign({}, rec(id) || {}); r.cycle = cycle; save(id, r); }
  function noCont(id) { const r = Object.assign({}, rec(id)); r.dec = 'free'; r.decAt = T0(); r.card = null; r.hist = H2(r, 'dec'); save(id, r); }
  function undo(id) { const r = Object.assign({}, rec(id)); if (r.base && r.st === 'pro' && !r.paidAt) { save(id, null); return; } if (r.st === 'pro') { r.dec = null; r.until = null; } else r.dec = r.card ? 'pro' : null; r.hist = H2(r, 'undo'); save(id, r); }
  function leavePro(id, until) { const r = Object.assign({ st: 'pro', base: 1 }, rec(id) || {}); r.dec = 'free'; r.until = until; r.decAt = T0(); r.hist = H2(r, 'dec'); save(id, r); }
  function removeCard(id) { const r = Object.assign({}, rec(id)); r.card = null; r.dec = null; r.hist = H2(r, 'nocard'); save(id, r); }
  /* Barra del prototipo: n = día de la prueba (0, 20, 25, 29, 31 = ya terminó) · null = sin prueba (plan de base) · 'seed' = volver a la semilla */
  function setDay(id, n) { if (!id) return; if (n === 'seed') { const S = Object.assign({}, read()); delete S[id]; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} _raw = null; apply(); emit(id); return; } if (n == null) { save(id, null); return; } const st = T0() - n * D; save(id, { st: 'trial', start: st, sim: 1, src: 'onb', hist: [{ k: 'start', at: st }] }); }

  /* Avisos de la prueba: plantillas (el Super Admin las edita en Notificaciones · tl-adm-v1.notes['tpl:k']) */
  const TPL = {
    trial_d20: ['Prueba Pro · día 20', 'Pro trial · day 20', 'Push · Correo', 'En {dias} días con Pro: {vistas} vistas, {contactos} contactos y {ops}. Tu prueba termina el {fecha}.', 'In {days} days with Pro: {views} views, {contacts} contacts and {ops}. Your trial ends {date}.'],
    trial_d25: ['Prueba Pro · aviso de fin', 'Pro trial · ending notice', 'SMS · Push · Correo', 'Tu prueba Pro termina el {fecha}. Ese día tu página pasa a Free: {dormido}. Nada se borra. Para seguir con Pro: {link}', 'Your Pro trial ends {date}. That day your page switches to Free: {asleep}. Nothing is deleted. To keep Pro: {link}'],
    trial_d29: ['Prueba Pro · último día', 'Pro trial · last day', 'Push', 'Mañana tu página pasa a Free. Si quieres seguir con Pro, agrega una tarjeta hoy.', 'Tomorrow your page switches to Free. To keep Pro, add a card today.'],
    trial_end: ['Prueba Pro · terminó', 'Pro trial · ended', 'SMS · Correo', 'Tu página ya está en Free. Tu contenido Pro está guardado: {guardado}. Vuelve a Pro cuando quieras.', 'Your page is now on Free. Your Pro content is saved: {saved}. Come back to Pro anytime.'],
    pro_first: ['Pro · primer cobro', 'Pro · first charge', 'Push · Correo', 'Sigues con Pro. Cobramos {monto} a tu {tarjeta}. Próximo cobro: {fecha}.', 'You kept Pro. We charged {amount} to your {card}. Next charge: {date}.'],
    pro_back: ['Pro · volviste', 'Pro · welcome back', 'Push · Correo', 'Volviste a Pro: todo regresó como lo dejaste ({guardado}). Próximo cobro: {fecha}.', 'You are back on Pro: everything is back as you left it ({saved}). Next charge: {date}.']
  };
  function text(k, es) { const ov = ((adm().notes || {})['tpl:' + k] || {}).text; const t = TPL[k]; return ov || (t ? t[es ? 3 : 4] : ''); }
  function fill(s, v) { return String(s || '').replace(/\{([a-zñ]+)\}/gi, (m, k) => v && v[k] != null ? v[k] : m); }
  function tplRows(es) { return Object.keys(TPL).map(k => [k, TPL[k][es ? 0 : 1] + (es ? ' (negocio)' : ' (business)'), TPL[k][2], TPL[k][es ? 3 : 4], 'biz']); }
  function notices(id, es, B) { const o = of(id); if (!o || !o.start) return []; const now = T0(), at10 = ms => DAY0(ms) + 10 * H, r = o.r, L = [], v = vars(id, B, es), v20 = vars(id, B, es, 20);
    if (o.len >= 25) L.push({ k: 'trial_d20', at: at10(o.start + 20 * D) });
    L.push({ k: 'trial_d25', at: at10(o.end - 5 * D) });
    const d29 = at10(o.end - D), decided = (r.decAt && r.decAt < d29) || (r.cardAt && r.cardAt < d29); if (!decided) L.push({ k: 'trial_d29', at: d29 });
    const conv = r.card && r.cardAt && r.cardAt <= o.end && r.dec !== 'free' && !o.cx; L.push({ k: conv ? 'pro_first' : 'trial_end', at: o.end });
    if (r.back && r.paidAt) L.push({ k: 'pro_back', at: r.paidAt });
    return L.map(n => { const t = TPL[n.k], nx = n.k === 'pro_first' ? addMonth(o.end, o.cycle) : n.k === 'pro_back' ? addMonth(r.paidAt, o.cycle) : null, vv = n.k === 'trial_d20' ? v20 : nx ? Object.assign({}, v, { fecha: fd(nx, es, true), date: fd(nx, es, true) }) : v; return { k: n.k, at: n.at, sent: n.at <= now, name: t[es ? 0 : 1], ch: t[2], text: fill(text(n.k, es), vv) }; }); }

  /* Datos del panel de un negocio (base de TLDash2 + lo que el dueño cambió en tl-dash2-v1) */
  function bizB(id) { const X = window.TLDash2, base = X && X.BIZ && X.BIZ[id]; if (!base) return null; let ov = {}; try { ov = (((JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}') || {}).over) || {})[id] || {}; } catch (e) {} return Object.assign({ id }, base, ov); }
  const names = (a, es) => a.length > 1 ? a.slice(0, -1).join(', ') + (es ? ' y ' : ' and ') + a[a.length - 1] : a[0] || '';
  function words(B, es) { const O = window.TLOnbNeg, c = O && O.CFG && O.CFG[B.cat]; const iw = c ? c.items[es ? 0 : 1] : (es ? 'servicios' : 'services'); const M = B.mods || []; const op = M.includes('citas') ? (es ? ['cita', 'citas', 'a'] : ['booking', 'bookings', '']) : M.includes('pedidos') || M.includes('shop') ? (es ? ['pedido', 'pedidos', 'o'] : ['order', 'orders', '']) : M.includes('rsv') ? (es ? ['reservación', 'reservaciones', 'a'] : ['reservation', 'reservations', '']) : (es ? ['solicitud', 'solicitudes', 'a'] : ['request', 'requests', '']); return { iw, op }; }
  function modL(B, k, es) { const O = window.TLOnbNeg || {}, c = (O.CFG || {})[B.cat] || {}, m = (O.MOD || {})[k] || [k, k]; const l = (c.lbl && c.lbl[k]) || [m[0], m[1]]; return l[es ? 0 : 1]; }

  /* Qué se sigue viendo, qué se duerme (queda guardado) y qué se respeta el día 30 · con los números del negocio */
  function inv(B, es) {
    const E2 = (a, b) => es ? a : b, O = window.TLOnbNeg || {}, X = window.TLDash2 || {}, FP = O.FREE_PHOTOS || 3, FI = O.FREE_ITEMS || 5, cap = cfg().cap, W = words(B, es), iw = W.iw;
    const items = B.items || [], gal = B.gallery || [], team = (B.team || []).filter(t => t.st === 'ok'), M = B.mods || [], keep = [], sleep = [], honor = [], sh = [];
    const sells = items.some(i => i.sell) || ['pedidos', 'citas', 'rsv', 'cot'].some(k => M.includes(k));
    keep.push({ icon: 'store', t: E2('Tu página, en una sola', 'Your page, as a single page'), s: E2('Portada, horario, contacto y cómo llegar', 'Cover, hours, contact and directions') });
    if (gal.length) keep.push({ icon: 'image', t: Math.min(FP, gal.length) + E2(' fotos', ' photos'), s: gal.length > FP ? E2('Las primeras ' + FP + ' de tu galería', 'The first ' + FP + ' in your gallery') : E2('Todas las que tienes', 'All the ones you have'), ph: gal.slice(0, FP) });
    if (items.length) keep.push({ icon: 'grid', t: Math.min(FI, items.length) + ' ' + iw, s: items.slice(0, FI).map(i => i.name).join(' · ') });
    if (B.owner) sleep.push({ icon: 'users', t: E2('Tú y tu equipo en tu página', 'You and your team on your page'), s: E2('Tu foto, tus palabras y tu equipo vuelven con Pro', 'Your photo, your words and your team come back with Pro') });
    if ((B.amen || []).length) sleep.push({ icon: 'grid', t: E2('Lo que hay en tu negocio', 'What your place offers'), s: B.amen.slice(0, 4).join(' · ') });
    keep.push({ icon: 'star', t: E2('Tus reseñas y tu calificación', 'Your reviews and rating'), s: E2('Se ven todas; solo no se responden', 'All of them show; you just cannot reply') });
    if (sells) keep.push({ icon: 'calendar', t: E2('Hasta ' + cap + ' ' + W.op[1] + ' en línea al mes', 'Up to ' + cap + ' online ' + W.op[1] + ' a month'), s: E2('Después, te llaman o te escriben', 'After that, people call or message you') });
    if (B.seal === 'ok') keep.push({ icon: 'verified', t: E2('Tu sello Verificado', 'Your Verified badge'), s: E2('Free también lo tiene', 'Free keeps it too') });
    const nov = (B.nov || []).filter(n => n.st === 'live' || n.st === 'prog'), tabs = [];
    if (nov.length) tabs.push(E2('Novedades', 'Updates')); ['menu', 'rsv', 'svc', 'shop', 'renta'].filter(k => M.includes(k)).forEach(k => tabs.push(modL(B, k, es)));
    if ((B.events || []).length) tabs.push(E2('Eventos', 'Events')); if (team.length) tabs.push('Staff'); if ((B.rel || []).length) tabs.push(E2('Relacionados', 'Related')); if ((B.jobs || []).length) tabs.push('Jobs'); if ((B.reviews || []).length) tabs.push(E2('Reseñas', 'Reviews'));
    if (tabs.length > 1) sleep.push({ icon: 'grid', t: E2('Las pestañas de tu página', 'Your page tabs'), s: tabs.join(' · ') + E2(' quedan en una sola página', ' merge into one page') });
    if (items.length > FI) { const n = items.length - FI; sleep.push({ icon: 'grid', t: E2(n + ' de tus ' + items.length + ' ' + iw, n + ' of your ' + items.length + ' ' + iw), s: items.slice(FI).map(i => i.name).join(' · ') + E2(' no se muestra' + (n > 1 ? 'n' : ''), ' hidden') }); sh.push(E2(n + ' de tus ' + items.length + ' ' + iw, n + ' of your ' + items.length + ' ' + iw)); }
    if (gal.length > FP) { const n = gal.length - FP; sleep.push({ icon: 'image', t: E2(n + ' de tus ' + gal.length + ' fotos', n + ' of your ' + gal.length + ' photos'), s: E2('Quedan guardadas', 'They stay saved') }); sh.push(E2(n + ' fotos', n + ' photos')); }
    if (team.length) { const n = team.length; sleep.push({ icon: 'users', t: E2(n === 1 ? '1 persona de tu equipo' : 'Tu equipo · ' + n + ' personas', n === 1 ? '1 team member' : 'Your team · ' + n + ' people'), s: names(team.map(t => t.name), es) + E2(n > 1 ? ' no salen en tu página' : ' no sale en tu página', ' won’t show on your page') }); sh.push(E2('tu equipo', 'your team')); }
    if (M.includes('rsv')) { sleep.push({ icon: 'restaurant', t: E2('Reservaciones de mesa', 'Table reservations'), s: E2('No se piden nuevas; las confirmadas siguen', 'No new requests; confirmed ones stay') }); sh.push(E2('las reservaciones', 'reservations')); }
    if (nov.length) { sleep.push({ icon: 'news', t: E2('Tus novedades', 'Your updates'), s: E2(nov.length + (nov.length > 1 ? ' activas · dejan' : ' activa · deja') + ' de salir en Hoy en el barrio', nov.length + ' active · no longer in Today nearby') }); sh.push(E2('tus novedades', 'your updates')); }
    if ((B.faq || []).length) sleep.push({ icon: 'help', t: E2('Preguntas frecuentes', 'FAQ'), s: B.faq.length + E2(B.faq.length > 1 ? ' preguntas' : ' pregunta', B.faq.length > 1 ? ' questions' : ' question') });
    if ((B.rel || []).length) sleep.push({ icon: 'users', t: E2('Relacionados', 'Related'), s: names(B.rel.map(r => r.name), es) });
    if ((B.jobs || []).length) sleep.push({ icon: 'brief', t: E2('Vacantes', 'Job openings'), s: B.jobs.length + E2(' · no reciben solicitudes nuevas', ' · no new applications') });
    if (M.includes('eventos') || (B.events || []).length) sleep.push({ icon: 'ticket', t: E2('Crear eventos', 'Creating events'), s: E2('Lo que ya vendiste se respeta', 'What you already sold is honored') });
    const HL = (B.sched || []).map(k => (X.HOLI || []).find(h => h[0] === k)).filter(Boolean); if (HL.length) { const hn = HL.map(h => h[es ? 1 : 2].split(' · ')[0]); sleep.push({ icon: 'clock', t: E2('Horario programado', 'Scheduled hours'), s: hn.join(' · ') + E2(' no se anuncia' + (hn.length > 1 ? 'n' : '') + ' solo', ' won’t announce itself') }); sh.push(hn.length === 1 ? E2('tu horario de ', 'your hours for ') + hn[0] : E2('tus ' + hn.length + ' feriados programados', 'your ' + hn.length + ' scheduled holidays')); }
    if (B.byMod) sleep.push({ icon: 'clock', t: E2('Horario por módulo', 'Hours by module'), s: E2('Queda un solo horario por día', 'One schedule per day remains') });
    const rep = (B.reviews || []).filter(r => r.reply).length; sleep.push({ icon: 'chat', t: E2('Responder reseñas', 'Replying to reviews'), s: rep ? E2(rep === 1 ? 'Tu respuesta publicada se guarda' : 'Tus ' + rep + ' respuestas publicadas se guardan', rep === 1 ? 'Your posted reply is saved' : 'Your ' + rep + ' posted replies are saved') : E2('Las reseñas se ven; no se responden', 'Reviews show; you cannot reply') });
    const mods_ = B.mods_ || []; if (mods_.length) { sleep.push({ icon: 'shield', t: E2('Moderadores', 'Moderators'), s: names(mods_.map(m => m[0]), es) + E2(mods_.length > 1 ? ' pierden el acceso al panel' : ' pierde el acceso al panel', ' lose dashboard access') }); sh.push(E2(mods_.length > 1 ? 'tus moderadores' : 'tu moderador', mods_.length > 1 ? 'your moderators' : 'your moderator')); }
    sleep.push({ icon: 'bolt', t: E2('Insights completos', 'Full insights'), s: E2('Búsquedas, lo que tocan y horas pico; Free ve vistas y contactos', 'Searches, taps and peak hours; Free sees views and contacts') });
    sleep.push({ icon: 'search', t: E2('Tu lugar en Destacados', 'Your Featured spot'), s: E2('Tu tarjeta pasa a «También en Hazleton», después de los Pro', 'Your card moves to “Also in Hazleton”, after Pro') });
    const okR = (B.req || []).filter(x => ['ok', 'hoy', 'ready', 'out', 'in'].includes(x.st)).length;
    honor.push({ icon: 'check', t: E2('Lo ya confirmado', 'What is already confirmed'), s: okR ? E2(okR + ' ' + (okR === 1 ? W.op[0] + ' confirmad' + W.op[2] + ' se atiende' : W.op[1] + ' confirmad' + W.op[2] + 's se atienden') + ' igual', okR + ' confirmed ' + (okR === 1 ? W.op[0] : W.op[1]) + ' go ahead as planned') : E2('Pedidos, citas y reservaciones confirmados se atienden igual', 'Confirmed orders, bookings and reservations go ahead') });
    (B.events || []).filter(e => e.st === 'sale' && e.sold > 0).forEach(e => honor.push({ icon: 'ticket', t: e.t, s: e.sold + E2(' boletos vendidos · el evento sigue: ', ' tickets sold · the event goes on: ') + e.d[es ? 0 : 1] }));
    if ((B.stripe || B.pay) === 'on') honor.push({ icon: 'card', t: E2('Lo que cobras con tarjeta', 'Your card payments'), s: E2('Te sigue llegando martes y viernes', 'Still paid out Tuesdays and Fridays') });
    honor.push({ icon: 'shield', t: E2('Todo lo que subiste', 'Everything you uploaded'), s: E2('Nada se borra. Con Pro vuelve igual que lo dejaste.', 'Nothing is deleted. With Pro it comes back as you left it.') });
    if (!sh.length) sh.push(E2('tus pestañas y novedades', 'your tabs and updates'));
    return { keep, sleep, honor, short: names(sh, es), iw, op: W.op };
  }
  /* Lo que pasó en la prueba (resumen del día 20): proporción de los 30 días de insights */
  function wins(B, o, es, dd) { const I = B.ins || {}, d = Math.max(1, Math.min(dd || (o && o.day != null ? o.day : 20), 30)), f = d / 30, n = a => Array.isArray(a) ? Math.round((a[0] || 0) * f) : 0, W = words(B, es);
    const nv = (B.nov || []).reduce((a, x) => a + (x.views || 0), 0), ops = n(I.orders);
    return { days: d, views: n(I.views), contacts: n(I.contacts), ops, opsL: ops + ' ' + (ops === 1 ? W.op[0] : W.op[1]) + (es ? ' en línea' : ' online'), revs: (B.reviews || []).length, nov: nv, cap: cfg().cap, over: Math.max(0, ops - cfg().cap) }; }
  function vars(id, B, es, dd) { const o = of(id); if (!o) return {}; const v = B ? inv(B, es) : { short: '' }, w = B ? wins(B, o, es, dd) : {}, card = o.card ? o.card.brand + ' ·· ' + o.card.last4 : 'Visa ·· 4242', nx = o.next || (o.end ? addMonth(o.end, o.cycle) : T0());
    const date = fd(o.st === 'trial' ? o.end : nx, es, true); return { fecha: date, date, dias: w.days, days: w.days, vistas: w.views, views: w.views, contactos: w.contacts, contacts: w.contacts, ops: w.opsL, dormido: v.short, asleep: v.short, guardado: v.short, saved: v.short, link: 'tolatino.app/pro', monto: money(o.charge), amount: money(o.charge), tarjeta: card, card }; }

  /* Para el Super Admin · Suscripciones */
  function sub(id) { const o = of(id); if (!o) return null; const nm = ((window.TLDash2 || {}).BIZ || {})[id]; o.name = nm ? nm.name : id;
    if (o.st === 'trial') return { biz: id, name: o.name, st: 'prueba', price: o.charge, next: o.end, left: o.left, day: o.day, len: o.len, card: !!o.card, dec: o.r.dec || null, since: o.start, live: 1 };
    if (o.st === 'pro') return { biz: id, name: o.name, st: o.cx ? 'cancelada' : 'activa', price: o.charge, next: o.next || o.end, since: o.since || o.start || T0(), live: 1, conv: !!o.conv, back: !!o.back, leaving: o.r.dec === 'free', until: o.until || null };
    return { biz: id, name: o.name, st: o.cort ? 'cortesia' : 'terminada', price: 0, next: null, since: o.start || null, ended: o.endedAt, live: 1 }; }
  function ids() { const S = read(), L = Object.keys(S).filter(k => S[k]); Object.keys(SEED).forEach(k => { if (!has(k)) L.push(k); }); return L; }

  /* Vista previa Free | Pro (patrón 2ae) con los datos del panel: mismo formato que pvOf() de Publica tu negocio */
  function pv(B, es, st) {
    const E2 = (a, b) => es ? a : b, O = window.TLOnbNeg || {}, X = window.TLDash2 || {}, P = X.P || (() => ''), k = O.cat ? O.cat(B.cat) : null, c = (O.CFG || {})[B.cat];
    const DY = [['Lunes', 'Monday'], ['Martes', 'Tuesday'], ['Miércoles', 'Wednesday'], ['Jueves', 'Thursday'], ['Viernes', 'Friday'], ['Sábado', 'Saturday'], ['Domingo', 'Sunday']], TD = 3;
    const fmt = h => { const x = ((h % 24) + 24) % 24, hh = Math.floor(x), m = Math.round((x - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + (hh < 12 ? 'AM' : 'PM'); };
    const name = B.name || '', ini = name.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w[0] || '')).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'TL', catL = k ? k[es ? 1 : 2] : '';
    const im = ['menu', 'svc', 'shop', 'renta'].find(m => (B.mods || []).includes(m)) || 'svc', items = (B.items || []).map(it => ({ name: it.name, meta: [it.dur ? it.dur + ' MIN' : '', it.sell ? '' : E2('SOLO CATÁLOGO', 'CATALOG ONLY')].filter(Boolean).join(' · '), price: it.price ? '$' + it.price : '' }));
    const tabs = [{ id: 'res', label: E2('Resumen', 'Overview'), icon: 'grid' }]; if (items.length) tabs.push({ id: im, label: modL(B, im, es), icon: ((O.MOD || {})[im] || [])[2] || 'grid', kind: 'items' });
    const team = (B.team || []).filter(t => t.st === 'ok'); if (team.length) tabs.push({ id: 'staff', label: 'Staff', icon: 'users', kind: 'staff' });
    const hrs = (B.hours || []).map((x, i) => { const t1 = x.on ? fmt(x.a) + ' – ' + fmt(x.b) : E2('Cerrado', 'Closed'), t2 = x.on && x.two ? t1 + ', ' + fmt(x.a2) + ' – ' + fmt(x.b2) : t1; return { d: DY[i][es ? 0 : 1], hp: t2, hf: t1, fw: i === TD ? '800' : '600', fg: i === TD ? '#0B0E12' : 'rgba(11,14,18,.65)' }; });
    const sched = (B.sched || []).map(key => (X.HOLI || []).find(h => h[0] === key)).filter(Boolean).map(h => ({ l: h[es ? 1 : 2], v: h[es ? 3 : 4] }));
    const amenAll = ((c && c.amen) || []).concat(O.AMEN || []), amen = (B.amen || []).map(a => amenAll.find(x => x[1] === a)).filter(Boolean).map(a => ({ icon: a[0], l: es ? a[1] : a[2] }));
    const langs = (B.langs || []).map(l => ((O.LANGS || []).find(x => x[0] === l) || [])[es ? 1 : 2]).filter(Boolean).join(' · '), tdy = (B.hours || [])[TD] || {};
    const R = B.reviews || [], avg = R.length ? (R.reduce((a, x) => a + x.stars, 0) / R.length).toFixed(1) : '', minP = (B.items || []).map(i => +i.price || 0).filter(n => n > 0);
    const chips = minP.length ? [{ l: E2('Desde $', 'From $') + Math.min.apply(null, minP), v: 'slot' }] : [], S = st || { l: '', c: '#0B0E12', dot: '#00A88F' }, sp = String(S.l || '').split(' · ');
    const M = B.mods || [], how = M.includes('citas') ? E2('Pides hora en la app y te confirman.', 'Request a time in the app and they confirm.') : M.includes('pedidos') ? E2('Pides en la app; te avisan cuando lo aceptan.', 'Order in the app; you hear back when they accept.') : M.includes('rsv') ? E2('Pides mesa en la app; te confirman.', 'Request a table in the app; they confirm.') : E2('Llama o escribe para pedir.', 'Call or message to order.');
    const street = String(B.addr || '').replace(/^\d+\s*/, ''), o = of(B.id), since = o && o.start ? new Date(o.start) : new Date(2026, 8, 1);
    const trust = [{ icon: 'phone', label: E2('Teléfono verificado', 'Verified phone'), tone: 'ok' }]; if (B.seal === 'ok') trust.push({ icon: 'verified', label: E2("Sello To'Latino", "To'Latino badge"), tone: 'ok' }); else if (B.seal === 'pend') trust.push({ icon: 'shield', label: E2('Sello en revisión', 'Badge in review'), tone: 'wait' }); trust.push({ icon: 'calendar', label: E2("En To'Latino desde " + MES[since.getMonth()][0] + ' ' + since.getFullYear(), "On To'Latino since " + MES[since.getMonth()][1] + ' ' + since.getFullYear()), tone: 'info' });
    return { name, nameOr: name, logoBg: B.logo ? 'url(' + P(B.logo, 200) + ')' : '', logoC: B.logo ? '#E4E1DA' : '#0B0E12', logoTxt: B.logo ? '' : ini, logoIni: ini.slice(0, 1),
      cover: B.ph ? 'url(' + P(B.ph, 500) + ')' : '', noCover: !B.ph, meta: (((B.subs || []).slice(0, 2).join(' · ') || catL) + ' · HAZLETON').toUpperCase(), metaFree: (catL + ' · HAZLETON').toUpperCase(),
      subsLine: (B.subs || []).join(' · ') || catL, r: avg ? '★ ' + avg + ' (' + R.length + ')' : E2("Nuevo · en To'Latino", "New · on To'Latino"), s1: avg ? '★ ' + avg : E2('Nuevo', 'New'), s1Sub: avg ? R.length + E2(' RESEÑAS', ' REVIEWS') : "EN TO'LATINO",
      status: S.l, stLabel: sp[0] || '', stNote: (sp[1] || '').toUpperCase(), stColor: S.c, stDot: S.dot, dist: street ? street.split(' ').slice(0, 2).join(' ') : 'Hazleton', city: B.casa ? E2('A DOMICILIO', 'MOBILE') : 'HAZLETON',
      cta: c ? E2(c.cta[0], c.cta[1]) : 'Booking', ctaIc: c ? c.cta[2] : 'calendar', chips, hasChips: chips.length > 0, tabs, items, itemsT: modL(B, im, es), about: B.about || '', hasAbout: !!(B.about || '').trim(), hasOwner: true,
      oc: { name: B.owner || name, role: E2('La persona detrás', 'The person behind it'), nick: B.nick || '', about: B.about || '', teamLabel: E2('SU EQUIPO', 'THE TEAM') }, trust,
      tc: { eyebrow: E2('HOY · JUEVES 24 SEP', 'TODAY · THURSDAY SEP 24'), title: S.l, dot: S.dot, sub: how, cols: [{ k: E2('HOY', 'TODAY'), v: tdy.on ? fmt(tdy.a) + ' – ' + fmt(tdy.b) : E2('Cerrado', 'Closed') }, { k: E2('PAGO', 'PAYMENT'), v: (B.stripe || B.pay) === 'on' ? E2('Tarjeta en la app', 'Card in app') : E2('En el local', 'In store') }, { k: E2('IDIOMA', 'LANGUAGE'), v: langs || '—' }] },
      hours: hrs, sched, amen, hasAmen: amen.length > 0, addr: B.addr ? B.addr + ', Hazleton PA' : E2('Vas a domicilio · hasta ', 'Comes to you · up to ') + (B.zone || 5) + E2(' millas', ' miles'), addrMeta: String(B.ref || '').toUpperCase(), isZone: !B.addr, zoneD: Math.min(128, 36 + (B.zone || 5) * 3) + 'px',
      staff: team.map(p => ({ name: p.name, role: String((p.role || [])[es ? 0 : 1] || E2('EQUIPO', 'TEAM')).toUpperCase(), bg: p.ph ? 'url(' + P(p.ph, 200) + ')' : '', ini: p.name.slice(0, 1) })),
      photos: (B.gallery || []).map(id => 'url(' + P(id, 300) + ')'), freePhotos: O.FREE_PHOTOS || 6, line: c && c.line ? E2(c.line[0], c.line[1]) : '', hasLine: !!(c && c.line), sealPend: B.seal === 'pend',
      lbl: { blockPro: E2('EN RESULTADOS · DESTACADOS', 'IN RESULTS · FEATURED'), blockFree: E2('EN RESULTADOS · TAMBIÉN EN HAZLETON', 'IN RESULTS · ALSO IN HAZLETON'), call: E2('Llamar', 'Call'), coverHere: E2('TU PORTADA VA AQUÍ', 'YOUR COVER GOES HERE'), photos: E2('Fotos', 'Photos'), hours: E2('Horario', 'Hours'), map: B.addr ? E2('Cómo llegar', 'Directions') : E2('Zona de servicio', 'Service area'), about: E2('Quiénes somos', 'About us'), team: E2('Equipo', 'Team'), holi: E2('FERIADO', 'HOLIDAY'), freeCap: E2('FREE MUESTRA 5 · TIENES ', 'FREE SHOWS 5 · YOU HAVE ') + items.length, sealPend: E2('SELLO EN REVISIÓN', 'BADGE IN REVIEW') } };
  }

  /* La ficha y los resultados del Prototipo leen b.pro: el día 30 sin tarjeta, el negocio baja a Free sin borrar nada */
  function apply() { const A = window.TLAll && window.TLAll.B; if (!A || !A.length) return false; let ch = false;
    A.forEach(b => { const o = (has(b.id) || SEED[b.id]) ? of(b.id) : null; if (!o) { if (b._pro0 !== undefined && b.pro !== b._pro0) { b.pro = b._pro0; ch = true; } return; } if (b._pro0 === undefined) b._pro0 = b.pro; const v = o.pro ? 1 : 0; if (b.pro !== v) { b.pro = v; ch = true; } });
    if (ch && window.TLSearch && window.TLSearch.reset) { try { window.TLSearch.reset(); } catch (e) {} } return true; }
  (function boot(n) { if (!(window.TLAll && window.TLAll.B && window.TLAll.B.length)) { if (n < 150) setTimeout(() => boot(n + 1), 80); return; } apply(); emit(''); })(0);
  setTimeout(() => emit(''), 0);
  try { window.addEventListener('storage', e => { if (e.key === KEY || e.key === 'tl-adm-v1') { _raw = null; _aRaw = null; apply(); emit(''); } }); } catch (e) {}

  window.TLTrial = { KEY, D, T0, fd, ft, money, cfg, rec, of, ids, start, startOnb, addCard, setCycle, noCont, undo, leavePro, removeCard, setDay, TPL, text, fill, tplRows, notices, bizB, inv, wins, vars, sub, pv, apply, words };
})();
