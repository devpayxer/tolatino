/* Tu negocio publicado (Publica tu negocio · tl-onb-neg-v1) → Panel v2. Cuando el dueño publica, aparece en el panel como un negocio más
   (TLDash2.BIZ['mi-negocio-tl']) con lo que llenó: nombre, categoría, especialidades, dirección, teléfono, horario, fotos, módulos, lo que vende y,
   en Belleza, cómo trabaja su equipo (d.team → modelo de Servicios). Lo que después cambie en el panel vive en tl-dash2-v1 · over['mi-negocio-tl'] y manda. */
(function () {
  const W = window, ID = 'mi-negocio-tl', KEY = 'tl-onb-neg-v1';
  const rd = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const cl = o => JSON.parse(JSON.stringify(o));
  const TEAM = { solo: 'staff', chair: 'chair', comm: 'comm', staff: 'staff' };
  let _raw = null;
  function build() { const X = W.TLDash2, O = W.TLOnbNeg; if (!X || !X.BIZ) return false; let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} if (raw === _raw && (X.BIZ[ID] || !raw)) return false; _raw = raw;
    const d = rd(); if (!d || !d.pub || !d.cat || !(d.name || '').trim()) { if (X.BIZ[ID]) delete X.BIZ[ID]; return true; }
    const base = cl(X.BIZ['empanadas-dona-luz'] || X.BIZ['sabor-dominicano']), c = O && O.CFG ? O.CFG[d.cat] : null;
    const mo = d.mods || Object.fromEntries(((c && c.on) || []).map(k => [k, true])), mods = Object.keys(mo).filter(k => mo[k] && !(d.op === 'rento' && k === 'staff'));
    const iw = c && c.items ? c.items[0] : 'servicios', icat = iw.charAt(0).toUpperCase() + iw.slice(1), H = x => ({ on: !!x.on, a: +x.a || 9, b: +x.b || 18, two: !!x.two, a2: +x.a2 || 17, b2: +x.b2 || 21 });
    const items = (d.items || []).map((it, i) => ({ id: 'o' + (i + 1), name: it.name, ne: it.ne || '', price: +it.price || 0, unit: it.unit || 'fijo', dur: +it.dur || 30, cat: icat, ph: it.ph || null, sell: it.sell === 'pedir' ? 1 : 0, ago: 0, desc: it.desc || '', pop: 0, opts: 0 }));
    const own = (d.nick || '').trim() || 'Tú', zero = o => { const z = cl(o || {}); ['views', 'contacts', 'orders', 'series7', 'series30'].forEach(k => { if (Array.isArray(z[k])) z[k] = z[k].map(() => 0); }); if (Array.isArray(z.clicks)) z.clicks = z.clicks.map(c => [c[0], c[1], 0]); z.followers = 0; z.saves = 0; return z; };
    /* v2 (Publica tu negocio v2, 3 nov): lo propio de la categoría llega como la herramienta del panel (d.tool) y el negocio nuevo empieza en cero (vistas, contactos). */
    X.BIZ[ID] = Object.assign(base, { name: d.name.trim(), cat: d.cat, plan: d.plan === 'pro' ? 'pro' : 'free', ph: d.cover || null, logo: d.logo || null, owner: (d.owner || '').trim() || own, nick: own, ins: zero(base.ins), tool: d.tool && Object.keys(d.tool).length ? cl(d.tool) : undefined, opK: d.opK || d.op || 'local', seats: +((d.own || {}).seats) || 0, phone: d.phone || '', wa: d.wa !== false, ig: d.ig || '', fb: d.fb || '', op: d.op === 'casa' ? 'casa' : 'local',
      subs: (d.subs || []).slice(0, 3), addr: d.addr || '', ref: d.ref || '', casa: !!d.casa, zone: +d.zone || 0, langs: d.langs || ['es'], hours: (d.days || []).length === 7 ? d.days.map(H) : base.hours, sched: d.sched || [], byMod: !!d.byMod, modOff: +d.modOff || 30,
      about: d.about || '', amen: (d.amen || []).map(a => Array.isArray(a) ? a[1] || a[0] : a), gallery: (d.gallery || []).slice(), seal: 'none', email: d.email || '', mods, itemCats: [icat], items,
      reviews: [], nov: [], faq: [], rel: [], team: [], req: [], msgs: [], events: [], riders: [], pay: (d.pay || []).includes('app') ? 'rev' : 'na', bank: '', dlv: null, log: [], mods_: [], onb: 1, team0: d.team || null });
    /* Belleza: los servicios del alta van a Servicios con el modelo que eligió (Solo yo = empleados sin equipo todavía). */
    if (d.cat === 'NEG-BELL') { const barber = (d.subs || []).some(s => /barb/i.test(s)), sv = items.map((it, i) => ({ id: 'sv' + (i + 1), k0: it.name, cat: 'Servicios', n: [it.name, ''], d: ['', ''], p: it.price, dur: it.dur, buf: 0, vary: it.unit === 'desde' ? 1 : 0, hid: 0, ph: it.ph }));
      const def = { model: TEAM[d.team] || 'staff', rent: 150, comm: 60, word: barber ? ['barbero', 'barber', 'barberos', 'barbers'] : ['estilista', 'stylist', 'estilistas', 'stylists'], cats: [['Servicios', 'Services'], ['Extras', 'Extras']], svcs: sv,
        pros: [{ id: 'own-' + ID, seat: 1, first: own.split(' ')[0], own: 1, ph: null, pr: Object.fromEntries(sv.map(s => [s.k0, s.p])) }] };
      W.__svcReg = W.__svcReg || {}; W.__svcReg[ID] = def; if (W.TLSvc && W.TLSvc.reg) W.TLSvc.reg(ID, def); }
    return true; }
  /* Para el cliente y el Super Admin: el mismo negocio en TLAll (búsqueda, categoría, ficha) con su menú o servicios, dirección y quiénes somos. */
  const GL = { 'NEG-FOOD': 'TLFood', 'NEG-BELL': 'TLBeauty', 'NEG-AUTO': 'TLAuto', 'NEG-HOGAR': 'TLHogar', 'NEG-SALUD': 'TLSalud', 'NEG-PRO': 'TLPro', 'NEG-FIESTA': 'TLFiesta', 'NEG-MERC': 'TLMerc', 'NEG-NOCHE': 'TLNoche', 'NEG-TIENDA': 'TLTienda', 'NEG-TRANS': 'TLTrans', 'NEG-EDU': 'TLEdu', 'NEG-NINOS': 'TLNinos', 'NEG-DEPORTE': 'TLDeporte', 'NEG-FE': 'TLFe', 'NEG-INMUEBLE': 'TLInmueble', 'NEG-DEALER': 'TLDealer' }, DW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const fH = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  function client(d, PB) { const ALL = W.TLAll, X = W.TLListing; if (!ALL || !ALL.B || !X || !X.MENU) return false;
    const lists = [ALL.B].concat(GL[d && d.cat] && W[GL[d.cat]] && W[GL[d.cat]].B ? [W[GL[d.cat]].B] : []), drop = () => [ALL.B].concat(Object.values(GL).map(g => W[g] && W[g].B).filter(Boolean)).forEach(L => { for (let i = L.length - 1; i >= 0; i--) if (L[i].id === ID) L.splice(i, 1); });
    drop(); if (!PB) return true;
    const t = PB.hours[3] || {}, NOW = 12.5, open = !!t.on && NOW >= t.a && NOW < (t.two ? t.b2 : t.b), bell = d.cat === 'NEG-BELL', mo = PB.mods, nx = (() => { for (let k = 1; k < 8; k++) { const h = PB.hours[(3 + k) % 7]; if (h && h.on) return [k, h.a]; } return null; })();
    const ph = [PB.ph].concat(PB.gallery || []).filter(Boolean); const b = { id: ID, name: PB.name, pro: PB.plan === 'pro' ? 1 : 0, verified: 0, nuevo: 1, _cat: d.cat, subs: (PB.subs || []).length ? PB.subs.slice() : ['Negocio nuevo'],
      tags: [mo.includes('citas') ? 'cita' : null, mo.includes('pedidos') ? 'pickup' : null, mo.includes('shop') ? 'tienda' : null, bell && (d.team === 'solo' || !mo.includes('citas')) ? 'walkin' : null, PB.plan === 'pro' ? 'online' : null].concat(d.tags || []).filter((x, i, a) => x && a.indexOf(x) === i),
      r: 0, n: 0, d: 0.5, open: open ? 1 : 0, hrs: t.on ? [t.a, t.two ? t.b2 : t.b] : [9, 18], st: open ? 'cierra ' + fH(t.two ? t.b2 : t.b) : nx ? 'abre ' + (nx[0] === 1 ? 'mañana ' : DW[(new Date(2026, 8, 24 + nx[0])).getDay()].toLowerCase() + ' ') + fH(nx[1]) : 'cerrado', ph: ph.length ? ph : [4969842], offer: '', cat: (PB.subs[0] || 'Negocio nuevo').toUpperCase(), catEn: (PB.subs[0] || 'New business').toUpperCase(), zone: (d.op === 'casa' || d.op === 'ambos') ? (+PB.zone || 10) : 0 };
    b.photos = b.ph.map(p => 'url(' + (typeof p === 'string' && /^(data:|https?:)/.test(p) ? p : 'https://images.pexels.com/photos/' + p + '/pexels-photo-' + p + '.jpeg?auto=compress&cs=tinysrgb&h=350') + ')');
    /* v2: lo propio de la categoría (cover y edad de la noche, seguros y precio sin seguro, depósito, licencias…) llega a la página y a los filtros. */
    const cx = d.cx || {}; Object.keys(cx).forEach(k => { if (k === 'mopts') { if (W.TLMercL && W.TLMercL.OPTS) W.TLMercL.OPTS[ID] = Object.assign({}, W.TLMercL.OPTS[ID] || {}, cx.mopts); } else if (k === 'topts') { if (W.TLTienda && W.TLTienda.OPTS) W.TLTienda.OPTS[ID] = Object.assign({}, W.TLTienda.OPTS[ID] || {}, cx.topts); } else if (cx[k] != null && !(k in b)) b[k] = cl(cx[k]); });
    b.amen = (PB.amen || []).slice();
    if (bell) Object.assign(b, { bell: 1, m: d.team === 'solo' ? 'solo' : 'shop', who: (PB.subs || []).some(s => /barb/i.test(s)) ? ['h'] : ['m'], cat: (PB.subs[0] || 'Belleza').toUpperCase() });
    lists.forEach(L => L.push(b));
    const items = PB.items.filter(i => i.sell !== -1), cat = PB.itemCats[0] || 'Lo que vendo';
    X.MENU[ID] = items.length ? [[cat, cat, items.map(i => bell ? [i.name, (i.dur ? i.dur + ' min · ' : '') + (i.desc || ''), +i.price || 0, +i.dur || 30, i.unit === 'desde' ? 1 : 0] : [i.name, i.desc || '', +i.price || 0])]] : [];
    if (X.ABOUT) X.ABOUT[ID] = [PB.about || '', PB.about || '', 2026]; if (X.ADDR && PB.addr) X.ADDR[ID] = PB.addr + ', Hazleton PA';
    if (bell) { const BL = W.TLBellL, SD = W.TLStaff; if (BL && BL.SVC) BL.SVC[ID] = items.length ? [['Servicios', 'Services', items.map(i => [i.name, i.desc || '', +i.price || 0, +i.dur || 30, i.unit === 'desde' ? 1 : 0])]] : [];
      if (X.STAFF) X.STAFF[ID] = [[PB.owner, 'Dueño', 'Owner', 2026]]; if (SD && SD.PEOPLE) SD.PEOPLE[ID] = [{ ph: null, langs: PB.langs || ['es'], sp: [], bio: ['', ''], wk: [0, 1, 2, 3, 4, 5, 6].map(js => { const h = PB.hours[(js + 6) % 7]; return h && h.on ? [h.a, h.two ? h.b2 : h.b] : null; }), cert: [], rate: '', dishes: [] }]; }
    if (W.TLAdm && W.TLAdm.apply) try { W.TLAdm.apply(); } catch (e) {}
    return true; }
  let _cRaw = null;
  function sync() { build(); let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} const ALL = W.TLAll; if (raw === _cRaw && ALL && ALL.B && (!!ALL.B.find(b => b.id === ID)) === !!(W.TLDash2 && W.TLDash2.BIZ[ID])) return; const d = rd(), PB = W.TLDash2 && W.TLDash2.BIZ[ID]; if (client(d, PB && d && d.pub ? PB : null)) _cRaw = raw; }
  W.TLOnbBiz = { ID, build, sync };
  (function boot(n) { if (!(W.TLDash2 && W.TLDash2.BIZ)) { if (n < 150) setTimeout(() => boot(n + 1), 80); return; } sync(); })(0);
  (W.TLReg = W.TLReg || []).push(() => sync());
  try { W.addEventListener('storage', e => { if (!e || e.key === KEY) sync(); }); } catch (e) {}
})();
