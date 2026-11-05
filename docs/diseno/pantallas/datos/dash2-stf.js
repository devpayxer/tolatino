/* Staff (Panel v2 · Lo que vendes · Staff) = una sola lista para el panel, la pestaña Staff y el Resumen del cliente, el Booking del local y el Super Admin.
   Regla del plan: solo sale quien aceptó; la foto, la bio y los idiomas los pone cada persona (el dueño, los suyos). El negocio pone el rol, las
   especialidades, el horario de sus empleados, sus platos y si sale en la página. Dos caminos: el negocio invita por SMS o la persona pide unirse.
   Guardado: tl-dash2-v1 · over[id].stf [{ id, n0, name, role [es,en], y, st ok|inv|req|gone, kind own|emp|renta, ph, langs, sp [[es,en]], bio [es,en],
   wk [7 × [entra, sale] | null · 0 = dom], same (horario del negocio), show, dishes [ids del menú], phone, sent, msg [es,en] }].
   To'Latino quita a una persona de la página con tl-adm-v1.biz[id].stfOff[id de la persona] = { at, why }.
   sync() reescribe TLListing.STAFF[id] y TLStaff.PEOPLE[id]: las posiciones de la base no cambian (quien no sale queda con off: 1) y en Belleza marca
   off en TLBook.PROS para que esa silla no salga en el Booking del local. Hoy = jue 24 sep 2026, 12:30 PM. */
(function () {
  const W = window, DK = 'tl-dash2-v1', AK = 'tl-adm-v1', TODAY = 4, NOW = 12.5;
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const cl = o => JSON.parse(JSON.stringify(o));
  const D = (...a) => a;
  const M = o => Object.assign({ st: 'ok', kind: 'emp', ph: null, langs: ['es'], sp: [], bio: ['', ''], wk: D(null, null, null, null, null, null, null), same: 0, show: 1, dishes: [], phone: '', y: 2026, msg: null, sent: ['', ''] }, o, { n0: o.n0 !== undefined ? o.n0 : (o.st && o.st !== 'ok' ? null : o.name) });
  const BASE = {
    'sabor-dominicano': [
      M({ id: 'rosa', kind: 'own', name: 'Rosa Peña', role: ['Dueña y cocinera', 'Owner and cook'], y: 2014, ph: 16810622, langs: ['es'], sp: [['Guisos', 'Stews'], ['Sancocho', 'Sancocho'], ['Catering', 'Catering']], wk: D([11, 17], null, [11, 17], [11, 17], [11, 17], [11, 17], [11, 17]), dishes: ['bandera', 'chivo', 'sancocho'], phone: '(570) 455-0192',
        bio: ['Aprendí a cocinar con mi abuela en Moca. Llegué a Hazleton en 2009 y en 2014 abrimos Sabor Dominicano con mi hijo Juan Carlos. El sancocho del domingo sigue siendo su receta.', 'I learned to cook with my grandmother in Moca. I came to Hazleton in 2009 and in 2014 we opened Sabor Dominicano with my son Juan Carlos. The Sunday sancocho is still her recipe.'] }),
      M({ id: 'juanc', name: 'Juan Carlos Peña', role: ['Cocina y parrilla', 'Kitchen and grill'], y: 2014, ph: 20147040, langs: ['es', 'en'], sp: [['Parrilla', 'Grill'], ['Chicharrón', 'Chicharrón'], ['Mofongo', 'Mofongo']], wk: D([15, 21], null, [15, 21], null, [15, 21], [15, 21], [15, 21]), dishes: ['chicharron', 'mofongo', 'picapollo'], phone: '(570) 455-0418',
        bio: ['Me encargo de la parrilla y del chicharrón. Si pides mofongo en la noche, lo más seguro es que lo pise yo.', 'I run the grill and the chicharrón. If you order mofongo at night, I am most likely the one mashing it.'] }),
      M({ id: 'yanet', name: 'Yanet Almonte', role: ['Salón y caja', 'Front and register'], y: 2019, ph: 6223005, langs: ['es', 'en'], sp: [['Pedidos grandes', 'Large orders'], ['Catering', 'Catering'], ['Reservaciones', 'Reservations']], wk: D(null, null, [11, 19], [11, 19], null, [11, 19], [11, 19]), phone: '(570) 455-0733',
        bio: ['Te recibo en el salón y en la caja. Coordino los pedidos grandes y el catering para bautizos y cumpleaños.', 'I welcome you in the dining room and at the register. I coordinate large orders and catering for baptisms and birthdays.'] }),
      M({ id: 'miguel', name: 'Miguel Reyes', role: ['Delivery', 'Delivery'], y: 2022, ph: 13443789, langs: ['es', 'en'], sp: [['Delivery en Hazleton', 'Hazleton delivery'], ['Pedidos grandes', 'Large orders']], wk: D([12, 21], null, null, [12, 21], [12, 21], [12, 21], [12, 21]), phone: '(570) 455-0950',
        bio: ['Llevo los pedidos por todo Hazleton. Si me dejas instrucciones de cómo entrar, llego más rápido.', 'I deliver orders all over Hazleton. If you leave instructions on how to get in, I get there faster.'] }),
      M({ id: 'wilfredo', st: 'req', name: 'Wilfredo Santana', role: ['Cocina', 'Kitchen'], y: 2026, langs: ['es'], phone: '(570) 555-0162', sent: ['hoy 10:40 AM', 'today 10:40 AM'], msg: ['Trabajo contigo en la cocina los fines de semana. ¿Me agregas al equipo en To\u2019Latino?', 'I work with you in the kitchen on weekends. Can you add me to the team on To\u2019Latino?'] }),
      M({ id: 'yahaira', st: 'inv', name: 'Yahaira Cruz', role: ['Cocina', 'Kitchen'], y: 2026, same: 1, phone: '(570) 555-0148', sent: ['mar 22 sep', 'Tue Sep 22'] })
    ],
    'barberia-el-primo': [
      M({ id: 'luis', kind: 'own', name: 'Luis "El Primo" Batista', role: ['Dueño y barbero', 'Owner and barber'], y: 2016, ph: 8552627, langs: ['es', 'en'], sp: [['Fades', 'Fades'], ['Barba con navaja', 'Straight-razor beard']], wk: D(null, [9, 19], [9, 19], [9, 19], [9, 19], [9, 20], [9, 17]), phone: '(570) 455-0311',
        bio: ['Empecé cortando a mis primos en el patio en Santiago. Abrí El Primo en 2016 y hoy rento tres sillas a barberos que respeto. Cada uno maneja lo suyo.', 'I started cutting my cousins in the backyard in Santiago. I opened El Primo in 2016 and now rent three chairs to barbers I respect. Each one runs their own business.'] }),
      M({ id: 'kelvin', kind: 'renta', name: 'Kelvin Rosario', role: ['Barbero', 'Barber'], y: 2019, ph: 18483772, langs: ['es'], sp: [['Diseños', 'Designs'], ['Taper', 'Taper']], wk: D(null, [10, 19], null, [10, 19], [10, 19], [10, 20], [10, 16]), phone: '(570) 455-0627',
        bio: ['Me especializo en diseños y tapers. Si me enseñas la foto, lo hacemos.', 'I specialize in designs and tapers. Show me the photo and we will make it happen.'] }),
      M({ id: 'andy', kind: 'renta', name: 'Andy Mejía', role: ['Barbero', 'Barber'], y: 2021, ph: 12946033, langs: ['es', 'en'], sp: [['Cortes de niño', 'Kids cuts'], ['Clásico', 'Classic']], wk: D(null, null, [11, 19], [11, 19], [15, 20], [11, 20], [9, 17]), phone: '(570) 455-0784',
        bio: ['Paciencia con los niños y cortes clásicos para los papás.', 'Patience with kids and classic cuts for the dads.'] }),
      M({ id: 'johan', kind: 'renta', name: 'Johan Peralta', role: ['Barbero', 'Barber'], y: 2024, ph: 9387375, langs: ['es'], sp: [['Barba', 'Beard'], ['Afeitado clásico', 'Classic shave']], wk: D(null, [12, 20], [12, 20], [12, 20], [12, 20], [12, 20], null), phone: '(570) 455-0866',
        bio: ['Nuevo en El Primo. Afeitado con toalla caliente como se hacía antes.', 'New at El Primo. Hot towel shaves the old-school way.'] })
    ]
  };
  const ovOf = (id, ov) => ov || ((rd(DK) || {}).over || {})[id] || {};
  const admOf = id => ((((rd(AK) || {}).biz || {})[id]) || {});
  const bizOf = id => (W.TLDash2 && W.TLDash2.BIZ && W.TLDash2.BIZ[id]) || null;
  /* Horario del negocio (panel: 0 = lun) → semana del Staff (0 = dom). */
  function hoursWk(id, ov) { const B = bizOf(id), H = (ovOf(id, ov).hours) || (B && B.hours) || []; return [0, 1, 2, 3, 4, 5, 6].map(js => { const h = H[(js + 6) % 7]; return h && h.on ? [+h.a, h.two ? +h.b2 : +h.b] : null; }); }
  function base(id) { if (BASE[id]) return cl(BASE[id]); const B = bizOf(id); if (!B) return []; return [M({ id: 'own', kind: 'own', name: B.owner || B.name, role: ['Dueño', 'Owner'], y: 2026, ph: null, langs: B.langs || ['es'], same: 1, phone: B.phone || '' })]; }
  /* Belleza: el tipo de cada barbero sale de «Cómo trabaja tu barbería» (Servicios). */
  function of(id, ov) { const o = ovOf(id, ov), B = bizOf(id), bell = !!(B && B.cat === 'NEG-BELL'), S = bell && W.TLSvc && W.TLSvc.has && W.TLSvc.has(id) ? W.TLSvc.of(id, ov || null) : null, model = S ? S.model : null, wd = S ? S.word : ['barbero', 'barber', 'barberos', 'barbers'];
    const off = admOf(id).stfOff || {}, list0 = Array.isArray(o.stf) ? o.stf.map(m => M(m)) : base(id);
    const list = list0.map(m => { const kind = m.kind === 'own' ? 'own' : bell && model ? (model === 'chair' ? 'renta' : model === 'comm' ? 'comm' : 'emp') : m.kind, cap = s => s.charAt(0).toUpperCase() + s.slice(1);
      const roleE = m.kind !== 'own' && bell && model ? (kind === 'renta' ? [cap(wd[0]) + ' · renta su silla', cap(wd[1]) + ' · rents a chair'] : kind === 'comm' ? [cap(wd[0]) + ' · a comisión', cap(wd[1]) + ' · on commission'] : [cap(wd[0]), cap(wd[1])]) : [m.role[0] || '', m.role[1] || m.role[0] || ''];
      const spE = m.sp.slice(0, 4).concat(kind === 'renta' || (kind === 'own' && model === 'chair') ? [['Silla propia', 'Own chair']] : []);
      const wkE = kind === 'renta' ? m.wk : m.same ? hoursWk(id, ov) : m.wk, adm = off[m.id] || null;
      return Object.assign(m, { kindE: kind, roleE, spE, wkE, adm, offE: m.st !== 'ok' || !m.show || !!adm }); });
    return { id, bell, model, word: wd, list, own: list.find(m => m.kind === 'own') || null, sp: B ? ((W.TLOnbNeg && W.TLOnbNeg.CFG && W.TLOnbNeg.CFG[B.cat] && W.TLOnbNeg.CFG[B.cat].sp) || ['espacio', 'space']) : ['espacio', 'space'] }; }
  const has = id => !!BASE[id] || Array.isArray(ovOf(id).stf);
  /* Hoy, como lo ve el cliente. */
  function today(wk, es) { const E2 = (a, b) => es ? a : b, fm = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), mm = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); }, DL = es ? ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const t = (wk || [])[TODAY]; if (t && NOW >= t[0] && NOW < t[1]) return { k: 0, l: E2('En turno · hasta ', 'On shift · until ') + fm(t[1]) };
    if (t && NOW < t[0]) return { k: 1, l: E2('Hoy entra a las ', 'Starts today at ') + fm(t[0]) };
    let k = 1; while (k < 8 && !(wk || [])[(TODAY + k) % 7]) k++; if (k >= 8) return { k: 2, l: E2('Sin horario', 'No schedule') }; const nx = wk[(TODAY + k) % 7];
    return { k: 2, l: (t ? E2('Ya salió', 'Done for today') : E2('Hoy no trabaja', 'Off today')) + ' · ' + E2('vuelve ', 'back ') + (k === 1 ? E2('mañana', 'tomorrow') : DL[(TODAY + k) % 7]) + ' ' + fm(nx[0]) }; }
  let _k = null;
  function sync(force) { const X = W.TLListing, SD = W.TLStaff; if (!X || !X.STAFF || !SD || !SD.PEOPLE) return false;
    let key = ''; try { key = (localStorage.getItem(DK) || '') + '|' + (localStorage.getItem(AK) || '') + '|' + (W.TLBook ? 1 : 0) + '|' + (W.TLSvc ? 1 : 0) + '|' + Object.keys(X.STAFF).length; } catch (e) {}
    if (!force && key === _k) return false; _k = key;
    const ovA = (rd(DK) || {}).over || {}, ids = Object.keys(BASE).concat(Object.keys(ovA).filter(k => !BASE[k] && Array.isArray(ovA[k].stf)));
    X._stf0 = X._stf0 || {};
    ids.forEach(id => { if (!X.STAFF[id] && !bizOf(id)) return; const T = of(id); if (!T) return;
      if (!(id in X._stf0)) X._stf0[id] = { S: (X.STAFF[id] || []).map(r => r.slice()), P: (SD.PEOPLE[id] || []).map(p => Object.assign({}, p)) };
      const S0 = X._stf0[id], cur = SD.PEOPLE[id] || [], S = [], P = [], used = {};
      const put = (m, j) => { const p0 = j != null ? Object.assign({}, S0.P[j] || {}, cur[j] || {}) : {}; S.push([m.name, m.roleE[0], m.roleE[1], m.y]); P.push(Object.assign(p0, { ph: m.ph || p0.ph || null, langs: m.langs.length ? m.langs : ['es'], sp: m.spE, bio: m.bio, wk: m.wkE || D(null, null, null, null, null, null, null), dishes: m.dishes || [], off: m.offE ? 1 : 0, mid: m.id })); };
      S0.S.forEach((r, j) => { const m = T.list.find(x => x.n0 && x.n0 === r[0]); if (m) { used[m.id] = 1; put(m, j); } else { S.push(r.slice()); P.push(Object.assign({}, S0.P[j] || {}, cur[j] || {}, { off: 1 })); } });
      T.list.filter(m => !used[m.id] && m.st === 'ok').forEach(m => put(m, null));
      X.STAFF[id] = S; SD.PEOPLE[id] = P;
      ((W.TLBook && W.TLBook.PROS) || []).forEach(p => { if (p.at === id && p.j != null) p.off = P[p.j] && P[p.j].off ? 1 : 0; }); });
    return true; }
  W.TLStf = { BASE, has, of, sync, today, hoursWk, M };
  (function boot(n) { if (!(W.TLListing && W.TLStaff)) { if (n < 120 && (W.TLAll || n < 30)) setTimeout(() => boot(n + 1), 80); return; } sync(true); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', () => sync()); } catch (e) {}
})();
