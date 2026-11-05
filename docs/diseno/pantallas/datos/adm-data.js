/* Super Admin (ADM-*) — datos del panel interno de To'Latino. Hoy = jue 24 sep 2026, 12:30 PM.
   Lo de ejemplo (equipo, usuarios, transacciones, reportes, tickets) se genera estable aquí; lo vivo sale del
   prototipo (TLAll, TLEvt, TLCom, TLRev, localStorage de Panel v2, Publica tu evento, Recomendar, Ciudad) y de
   las props `live` que manda el Prototipo. Estado del admin en localStorage `tl-adm-v1` (decisiones, asignaciones,
   notas, sanciones, estado de negocios y usuarios, licencias, equipo y log de auditoría — solo se agrega). */
(function () {
  const KEY = 'tl-adm-v1', T0 = new Date(2026, 8, 24, 12, 30).getTime(), MIN = 60000, H = 3600000, D = 86400000;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => { let h = 7; const x = String(s); for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return Math.abs(h); };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const PX = (id, h) => typeof id === 'string' && /^(data:|https?:|blob:)/.test(id) ? id : id ? 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 200) : '';
  const money = n => { const v = Math.round((n || 0) * 100) / 100; return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const r2 = n => Math.round(n * 100) / 100;

  /* 17 categorías: clave, global con los negocios, nombre ES/EN, ícono, corto ES/EN, qué transacciona */
  const CATS = [
    ['NEG-FOOD', 'TLFood', 'Comida y Bebidas', 'Food and Drinks', 'restaurant', 'Comida', 'Food', 'ped'],
    ['NEG-BELL', 'TLBeauty', 'Belleza y Salud', 'Beauty and Health', 'scissors', 'Belleza', 'Beauty', 'cita'],
    ['NEG-AUTO', 'TLAuto', 'Servicios de Auto', 'Auto Services', 'car', 'Auto', 'Auto', 'cita'],
    ['NEG-HOGAR', 'TLHogar', 'Servicios del Hogar', 'Home Services', 'wrench', 'Hogar', 'Home', 'cita'],
    ['NEG-NOCHE', 'TLNoche', 'Vida Nocturna', 'Night Life', 'drink', 'Noche', 'Nightlife', 'bol'],
    ['NEG-MERC', 'TLMerc', 'Mercados y Bodegas', 'Markets and Bodegas', 'cart', 'Mercados', 'Markets', 'ped'],
    ['NEG-FIESTA', 'TLFiesta', 'Fiestas y Celebraciones', 'Party and Celebrations', 'party', 'Fiestas', 'Parties', 'cita'],
    ['NEG-SALUD', 'TLSalud', 'Doctores y Medicina', 'Doctors and Medicine', 'medical', 'Salud', 'Health', 'cita'],
    ['NEG-PRO', 'TLPro', 'Servicios Profesionales', 'Professional Services', 'brief', 'Trámites', 'Paperwork', 'cita'],
    ['NEG-TIENDA', 'TLTiendaB', 'Tiendas', 'Shops & Stores', 'bag', 'Tiendas', 'Shops', 'ped'],
    ['NEG-TRANS', 'TLTrans', 'Transporte', 'Transportation', 'truck', 'Transporte', 'Transport', 'cita'],
    ['NEG-EDU', 'TLEdu', 'Cursos y Educación', 'Courses & Education', 'grid', 'Cursos', 'Classes', 'cita'],
    ['NEG-NINOS', 'TLNinos', 'Niños', 'Children', 'smile', 'Niños', 'Kids', 'cita'],
    ['NEG-DEPORTE', 'TLDeporte', 'Vida Activa y Deporte', 'Active Life & Sport', 'bolt', 'Deporte', 'Sports', 'cita'],
    ['NEG-FE', 'TLFe', 'Iglesias y Religión', 'Churches & Religion', 'building', 'Iglesias', 'Churches', 'none'],
    ['NEG-INMUEBLE', 'TLInmueble', 'Bienes Raíces', 'Real Estate', 'key', 'Vivienda', 'Housing', 'cita'],
    ['NEG-DEALER', 'TLDealer', 'Venta de Autos', 'Car Dealers', 'car', 'Carros', 'Cars', 'cita'],
  ].map(([k, g, es, en, icon, s, se, tx]) => ({ k, g, es, en, icon, s, se, tx }));
  const CAT = {}; CATS.forEach(c => { CAT[c.k] = c; });
  let _cat = null, _catN = 0;
  function catOf(id) { const A = window.TLAll && window.TLAll.B; if (!A) return null; if (!_cat || _catN !== A.length) { _cat = {}; _catN = A.length; CATS.forEach(c => { const G = window[c.g]; ((G && G.B) || []).forEach(b => { _cat[b.id] = c.k; }); }); A.forEach(b => { if (!_cat[b.id]) _cat[b.id] = b._cat ? b._cat : b.bell ? 'NEG-BELL' : b.auto ? 'NEG-AUTO' : b.hogar ? 'NEG-HOGAR' : b.salud ? 'NEG-SALUD' : b.prof ? 'NEG-PRO' : b.fiesta ? 'NEG-FIESTA' : b.merc ? 'NEG-MERC' : b.noche ? 'NEG-NOCHE' : b.tienda ? 'NEG-TIENDA' : b.trans ? 'NEG-TRANS' : b.dealer ? 'NEG-DEALER' : b.inm ? 'NEG-INMUEBLE' : b.fe ? 'NEG-FE' : b.dep === 1 ? 'NEG-DEPORTE' : b.ninos ? 'NEG-NINOS' : b.edu ? 'NEG-EDU' : 'NEG-FOOD'; }); } return _cat[id] || null; }
  const ALLB = () => (window.TLAll && window.TLAll.B) || [];
  const BIZ = id => ALLB().find(b => b.id === id) || null;
  const bizPh = b => b && b.ph && b.ph.length ? (typeof b.ph[0] === 'number' ? PX(b.ph[0], 240) : String(b.ph[0]).replace(/^url\((.*)\)$/, '$1')) : '';
  /* Negocios de ejemplo si el prototipo no cargó TLAll (admin suelto sin bundles) */
  const FALLBACK = [['sabor-dominicano', 'Sabor Dominicano', 1, 1, 'NEG-FOOD', 39122376, 4.8, 212], ['panaderia-la-espiga', 'Panadería La Espiga', 1, 1, 'NEG-FOOD', 35993723, 4.9, 301], ['el-fogon', 'El Fogón de Wyoming St', 1, 1, 'NEG-FOOD', 34822475, 4.7, 158], ['tacos-el-guero', 'Tacos El Güero', 1, 0, 'NEG-FOOD', 6310256, 4.7, 140], ['barberia-el-primo', 'Barbería El Primo', 1, 0, 'NEG-BELL', 4969842, 4.8, 96], ['salon-glamour', 'Salón Glamour Dominicano', 1, 1, 'NEG-BELL', 7195805, 4.6, 88], ['taller-hermanos-pena', 'Taller Hermanos Peña', 1, 1, 'NEG-AUTO', 3806288, 4.7, 73], ['empanadas-dona-luz', 'Empanadas Doña Luz', 0, 0, 'NEG-FOOD', 6166796, 0, 3]].map(([id, name, pro, verified, cat, ph, r, n]) => ({ id, name, pro, verified, cat, ph: [ph], r, n, subs: [], tags: [], d: 0.8 }));
  const BIZL = () => { const A = ALLB(); return A.length ? A : FALLBACK; };
  const bizCat = b => b ? (catOf(b.id) || b.cat || 'NEG-FOOD') : 'NEG-FOOD';

  /* Equipo interno y roles */
  const TEAM = [
    { id: 'carolina', name: 'Carolina Reyes', role: 'admin', cities: ['all'], ph: 3763188, tfa: 1, last: T0 - 5 * MIN, since: 'jun 2026' },
    { id: 'luis', name: 'Luis Tavárez', role: 'city', cities: ['hzl'], ph: 13430312, tfa: 1, last: T0 - 42 * MIN, since: 'jul 2026' },
    { id: 'yesenia', name: 'Yesenia Cruz', role: 'verif', cities: ['hzl'], ph: 20454135, tfa: 1, last: T0 - 2 * H, since: 'jul 2026' },
    { id: 'marcos', name: 'Marcos Peña', role: 'mod', cities: ['all'], ph: 16160871, tfa: 1, last: T0 - 18 * MIN, since: 'ago 2026' },
    { id: 'dayana', name: 'Dayana Félix', role: 'sop', cities: ['all'], ph: 14566062, tfa: 1, last: T0 - 9 * MIN, since: 'ago 2026' },
    { id: 'omar', name: 'Omar Guzmán', role: 'fin', cities: ['all'], ph: 7665704, tfa: 1, last: T0 - 26 * H, since: 'jul 2026' },
    { id: 'ines', name: 'Inés Rodríguez', role: 'lectura', cities: ['hzl'], ph: 9159678, tfa: 0, last: T0 - 6 * D, since: 'sep 2026' },
  ];
  const ROLES = { admin: ['Admin', 'Admin'], city: ['Ciudad manager', 'City manager'], verif: ['Verificador', 'Verifier'], mod: ['Moderador de contenido', 'Content moderator'], sop: ['Soporte', 'Support'], fin: ['Finanzas', 'Finance'], lectura: ['Solo lectura', 'Read only'] };
  const SECS = ['home', 'colas', 'usr', 'neg', 'tx', 'sop', 'compa', 'cat', 'cont', 'evt', 'ciud', 'plan', 'mkt', 'notif', 'gam', 'conf', 'analit', 'cms', 'sys'];
  const ACTS = [['V', 'Ver', 'View'], ['E', 'Editar', 'Edit'], ['A', 'Aprobar', 'Approve'], ['X', 'Eliminar / sancionar', 'Delete / sanction'], ['D', 'Exportar', 'Export']];
  const ALLP = 'VEAXD';
  const PERM = {
    admin: Object.fromEntries(SECS.map(s => [s, ALLP])),
    city: { home: 'V', colas: 'VA', usr: 'V', neg: 'VEA', tx: 'V', sop: 'V', cat: 'V', cont: 'VEA', evt: 'VEA', ciud: 'VE', plan: 'V', mkt: 'VE', notif: 'VE', gam: 'V', conf: 'V', analit: 'VD', cms: 'V', compa: 'V', sys: '' },
    verif: { home: 'V', colas: 'VA', usr: 'V', neg: 'VA', tx: '', sop: '', cat: 'V', cont: '', evt: 'V', ciud: 'V', plan: '', mkt: '', notif: '', gam: '', conf: 'V', analit: '', cms: '', compa: '', sys: '' },
    mod: { home: 'V', colas: 'VAX', usr: 'VEX', neg: 'V', tx: '', sop: '', cat: '', cont: 'VEAX', evt: 'V', ciud: '', plan: '', mkt: '', notif: '', gam: 'V', conf: 'VEAX', analit: '', cms: '', compa: 'V', sys: '' },
    sop: { home: 'V', colas: 'VA', usr: 'VE', neg: 'V', tx: 'VE', sop: 'VEAX', cat: 'V', cont: 'V', evt: 'V', ciud: 'V', plan: 'V', mkt: '', notif: 'V', gam: 'V', conf: 'V', analit: '', cms: 'V', compa: 'VEA', sys: '' },
    fin: { home: 'V', colas: 'VA', usr: 'V', neg: 'V', tx: 'VEAXD', sop: 'V', cat: '', cont: '', evt: 'V', ciud: '', plan: 'VEAD', mkt: 'V', notif: '', gam: 'V', conf: 'V', analit: 'VD', cms: '', compa: '', sys: '' },
    lectura: Object.fromEntries(SECS.map(s => [s, s === 'sys' ? '' : 'V'])),
  };
  /* Colas: clave, ES, EN, ícono, SLA en horas, roles que la ven (null = todos los que ven Colas) */
  const QUEUES = [
    ['ayuda', 'Ayudas escaladas', 'Escalated help cases', 'warning', 2, ['admin', 'sop', 'fin', 'lectura']],
    ['medios', 'Medios marcados', 'Flagged media', 'image', 4, ['admin', 'mod', 'city', 'lectura']],
    ['ticket', 'Tickets de soporte', 'Support tickets', 'help', 8, ['admin', 'sop', 'lectura']],
    ['evt', 'Eventos a revisar', 'Events to review', 'ticket', 24, ['admin', 'city', 'lectura']],
    ['nuevo', 'Negocios nuevos', 'New businesses', 'store', 24, ['admin', 'city', 'verif', 'lectura']],
    ['rep', 'Reportes de contenido', 'Content reports', 'bubble', 24, ['admin', 'mod', 'lectura']],
    ['repBiz', 'Reportes de negocio', 'Business reports', 'warning', 24, ['admin', 'mod', 'city', 'lectura']],
    ['repUsr', 'Reportes de usuario', 'User reports', 'users', 24, ['admin', 'mod', 'lectura']],
    ['sello', 'Sello de verificación', 'Verification badge', 'shield', 48, ['admin', 'verif', 'lectura']],
    ['cambio', 'Cambios sensibles', 'Sensitive changes', 'edit', 48, ['admin', 'sop', 'city', 'lectura']],
    ['lic', 'Licencias', 'Licenses', 'law', 72, ['admin', 'verif', 'lectura']],
    ['apel', 'Apelaciones', 'Appeals', 'scale', 72, ['admin', 'mod', 'lectura']],
    ['disputa', 'Disputas', 'Disputes', 'card', 120, ['admin', 'fin', 'lectura']],
    ['rec', 'Recomendaciones de vecinos', 'Neighbor recommendations', 'like', 168, ['admin', 'city', 'lectura']],
    ['ciudad', 'Ciudad nueva', 'New city', 'globe', 720, ['admin', 'city', 'lectura']],
  ].map(([k, es, en, icon, sla, roles]) => ({ k, es, en, icon, sla, roles }));
  const Q = {}; QUEUES.forEach(q => { Q[q.k] = q; });

  /* Plantillas de motivo y catálogo de sanciones (ES/EN) */
  const TPL = {
    selloNo: [['La dirección no coincide con la página', 'The address does not match the page'], ['No pudimos confirmar que representas el negocio', 'We could not confirm you represent the business'], ['Las fotos no son del local', 'The photos are not of the venue'], ['El nombre puede confundirse con otro negocio', 'The name may be confused with another business']],
    selloInfo: [['Mándanos una foto de la fachada con el letrero', 'Send us a photo of the storefront with the sign'], ['Confírmanos el teléfono fijo del local', 'Confirm the venue landline'], ['Dinos en qué horario podemos llamar', 'Tell us when we can call']],
    evtNo: [['Falta la edad mínima', 'Minimum age is missing'], ['La capacidad supera el aforo del local', 'Capacity exceeds the venue limit'], ['La descripción promete algo que no se puede garantizar', 'The description promises something that cannot be guaranteed'], ['La foto no corresponde al evento', 'The photo does not match the event']],
    hide: [['Tiene datos personales', 'Contains personal data'], ['Ofensiva o discriminatoria', 'Offensive or discriminatory'], ['No fue cliente: sin transacción', 'Not a customer: no transaction'], ['Spam o publicidad', 'Spam or advertising'], ['Amenaza o acoso', 'Threat or harassment']],
    keep: [['No rompe las reglas del barrio', 'Does not break the neighborhood rules'], ['Es una opinión sobre el servicio', 'It is an opinion about the service'], ['El reporte no trae evidencia', 'The report has no evidence']],
    ayuda: [['El pedido llegó fuera de lo prometido', 'The order arrived outside what was promised'], ['La foto confirma el problema', 'The photo confirms the problem'], ['El negocio no respondió en 24 h', 'The business did not reply in 24 h'], ['La evidencia no sostiene el reclamo', 'The evidence does not support the claim']],
    biz: [['Varios reportes coinciden', 'Several reports match'], ['El negocio no responde a To\u2019Latino', 'The business does not respond to To\u2019Latino'], ['Datos de contacto falsos', 'False contact details'], ['Se resolvió con el dueño', 'Resolved with the owner']],
    usr: [['Reincidente', 'Repeat offender'], ['Primera vez', 'First time'], ['Cuentas vinculadas al mismo dispositivo', 'Accounts linked to the same device'], ['El contexto justifica la acción', 'Context justifies the action']],
  };
  const SANC = [['adv', 'Advertencia', 'Warning', 0], ['mute7', 'Silencio 7 días', 'Mute 7 days', 7], ['hide', 'Ocultar contenido', 'Hide content', 0], ['susp14', 'Suspender 14 días', 'Suspend 14 days', 14], ['ban', 'Banear', 'Ban', 0], ['nosello', 'Quitar sello', 'Remove badge', 0], ['nopro', 'Quitar Pro', 'Remove Pro', 0], ['nopub', 'Bloquear publicación 30 días', 'Block posting 30 days', 30]].map(([k, es, en, days]) => ({ k, es, en, days }));

  /* Usuarios de ejemplo (64) · estables */
  const FN = ['Ana', 'Yokasta', 'Mariela', 'Rosa', 'Daniela', 'Carmen', 'Lucía', 'Génesis', 'Altagracia', 'Yudelka', 'Massiel', 'Katherine', 'Wanda', 'Belkis', 'Dulce', 'Marisol', 'Miguel', 'José', 'Ramón', 'Franklin', 'Yefri', 'Kelvin', 'Misael', 'Richard', 'Elvis', 'Starlin', 'Junior', 'Wilson', 'Rafael', 'Pedro', 'Anderson', 'Juan'];
  const LN = ['Peña', 'Reyes', 'Tavárez', 'Cruz', 'Félix', 'Guzmán', 'Rodríguez', 'Martínez', 'De la Rosa', 'Jiménez', 'Santana', 'Vásquez', 'Castillo', 'Núñez', 'Polanco', 'Acosta', 'Mejía', 'Mota', 'Taveras', 'Ureña', 'Hernández', 'Lora', 'Almonte', 'Batista'];
  const ZONES = ['North End', 'Alter St', 'The Heights', 'West Hazleton', 'Hazle Township', 'Downtown'];
  const UPH = [13430312, 13430313, 20454135, 16160871, 14566062, 13975904, 7665704, 16160952, 6102841, 9159678, 29881401, 11579595, 29889352, 20045343, 1681010];
  const USERS = []; (function () { const r = rng(2026); for (let i = 0; i < 64; i++) { const f = FN[(i * 7 + 3) % FN.length], l = LN[(i * 11 + 5) % LN.length], l2 = LN[(i * 13 + 2) % LN.length]; const months = 1 + Math.floor(r() * 15), rk = Math.max(1, Math.min(10, Math.round(1 + (15 - months) / 15 * 2 + r() * 6)));
    const st = i === 9 ? 'susp' : i === 23 ? 'mute' : i === 41 ? 'ban' : 'ok', ped = Math.floor(r() * 24), citas = Math.floor(r() * 9), revs = Math.floor(r() * 7), posts = Math.floor(r() * 12);
    USERS.push({ id: 'u' + String(i + 1).padStart(2, '0'), name: f + ' ' + l + ' ' + l2, short: f + ' ' + l[0] + '.', phone: '(570) ' + (200 + Math.floor(r() * 700)) + '-' + String(1000 + Math.floor(r() * 9000)), zone: pick(r, ZONES), rk, since: new Date(2026, 8 - months, 1 + Math.floor(r() * 27)).getTime(), last: T0 - Math.floor(r() * (st === 'ok' ? 9 : 30)) * D - Math.floor(r() * 23) * H, st, lang: r() < .78 ? 'es' : 'en', ph: i % 4 === 0 ? UPH[i % UPH.length] : 0, owner: i < 40 && i % 2 === 0, promo: i === 4 || i === 18, c: { ped, citas, revs, posts, repsOn: i === 9 ? 3 : i === 23 ? 2 : i === 41 ? 6 : i % 17 === 0 ? 1 : 0, repsBy: Math.floor(r() * 3) }, wal: r2(r() * 40), pts: 120 + Math.floor(r() * 9000), dev: 1 + (r() < .2 ? 1 : 0) + (i === 41 ? 3 : 0), email: r() < .55 }); } })();
  /* Cuenta de prueba (u00): tiene de todo para revisar cada pieza del Super Admin */
  USERS.unshift({ id: 'u00', demo: true, name: 'Rosa Peña', short: 'Rosa P.', phone: '(570) 455-2081', zone: 'Alter St', rk: 7, since: new Date(2025, 10, 6).getTime(), last: T0 - 25 * MIN, st: 'mute', stWhy: 'Publicó el mismo anuncio en 6 hilos el mismo día (bloqueo de publicación 30 días)', lang: 'es', ph: 13430313, owner: true, promo: true,
    c: { ped: 14, citas: 6, revs: 5, posts: 8, repsOn: 2, repsBy: 2 }, wal: 23.5, pts: 6420, dev: 3, email: true,
    notes0: [{ t: 'Es dueña de 2 negocios y promotora. Si llama por pagos de promotor, pásala a Finanzas.', at: T0 - 20 * D, by: 'dayana' }, { t: 'Apeló el bloqueo de publicación. Dice que eran avisos de su negocio, no spam.', at: T0 - 2 * D, by: 'marcos' }],
    msgs0: [{ t: 'Recibimos tu apelación. Te respondemos en 72 h.', ch: 'SMS', at: T0 - 2 * D + 30 * MIN, by: 'marcos' }],
    cityLog0: [{ from: 'Allentown', to: 'Hazleton', at: T0 - 300 * D }],
    devs0: [['iPhone', 'App · iOS', 1, 'Hazleton, PA'], ['Chrome · Windows', 'Web', 0, 'Hazleton, PA'], ['Android', 'App · Android', 1, 'West Hazleton, PA']], shared0: ['u37', 'u61'],
    phoneCh0: [{ from: '(484) 330-7712', at: T0 - 290 * D }], emailV: true, email0: 'rosa.pena@gmail.com' });
  const UREG = USERS.filter(u => !u.demo);
  const USER = id => USERS.find(u => u.id === id) || null;
  function ownerBiz(u) { if (!u || !u.owner) return []; const L = BIZL(); const i = parseInt(u.id.slice(1), 10); const a = L[(i * 7) % L.length]; const out = [a]; if (i % 6 === 0 && L.length > 1) out.push(L[(i * 7 + 3) % L.length]); return out.filter(Boolean); }
  function bizOwner(bid) { const o = read().biz[bid]; if (o && o.owner) return USER(o.owner); const u = USERS.find(x => ownerBiz(x).some(b => b.id === bid)); return u || null; }

  /* Transacciones de 90 días (se generan cuando TLAll existe; estables por id) */
  let _tx = null, _txN = 0;
  function TX() { const L = BIZL(); if (_tx && _txN === L.length) return _tx; const r = rng(90), out = []; const KL = { ped: ['Pedido', 'Order'], cita: ['Cita', 'Appointment'], rsv: ['Reservación', 'Reservation'], bol: ['Boletos', 'Tickets'], apt: ['Apartado', 'Hold'] };
    const pros = L.filter(b => b.pro), pool = pros.length ? pros : L; let n = 1000;
    for (let i = 0; i < 420; i++) { const b = pool[Math.floor(r() * pool.length)], c = CAT[bizCat(b)] || CAT['NEG-FOOD']; let k = c.tx; if (k === 'none') k = 'cita'; if (k === 'ped' && c.k === 'NEG-FOOD' && r() < .18) k = 'rsv'; if (k === 'ped' && c.k === 'NEG-TIENDA' && r() < .5) k = 'apt'; if (k === 'ped' && c.k === 'NEG-MERC' && r() < .3) k = 'apt';
      const ageMs = Math.floor(Math.pow(r(), 1.6) * 90 * D), at = T0 - ageMs, u = UREG[Math.floor(r() * UREG.length)];
      const amt = k === 'ped' ? r2(12 + r() * 48) : k === 'cita' ? r2(c.k === 'NEG-AUTO' ? 60 + r() * 240 : c.k === 'NEG-HOGAR' ? 80 + r() * 300 : c.k === 'NEG-SALUD' ? 40 + r() * 120 : 18 + r() * 60) : k === 'bol' ? r2(10 + Math.floor(r() * 3) * 10) : k === 'rsv' ? 0 : r2(8 + r() * 90);
      const dep = k === 'cita' && amt > 0 ? r2(Math.min(amt, 10 + Math.round(amt * .2))) : 0;
      let st; const x = r(); if (ageMs < 3 * H) st = x < .55 ? 'ret' : x < .8 ? 'pend' : 'cob'; else if (ageMs < 2 * D) st = x < .7 ? 'cob' : x < .82 ? 'ret' : x < .9 ? 'lib' : x < .96 ? 'dev' : 'cx'; else st = x < .84 ? 'cob' : x < .9 ? 'lib' : x < .96 ? 'dev' : 'cx'; if (k === 'rsv') st = ageMs < 2 * H ? 'pend' : x < .8 ? 'ok' : x < .92 ? 'cx' : 'noshow'; if (k === 'bol' && st === 'ret') st = 'cob';
      const pay = k === 'rsv' ? 'none' : r() < .74 ? 'card' : r() < .5 ? 'wallet' : 'local'; const fee = k === 'ped' && r() < .55 ? 3 : 0, tax = k === 'ped' ? r2(amt * .06) : 0, tip = k === 'ped' && fee ? r2(amt * [0, .15, .18, .2][Math.floor(r() * 4)]) : 0; const total = r2(amt + fee + tax + tip);
      const comm = k === 'bol' ? r2(1 + amt * .05) : k === 'ped' ? r2(amt * .1) : k === 'cita' ? r2(amt * .08) : k === 'apt' ? r2(amt * .06) : 0;
      out.push({ id: (k === 'ped' ? '#' : k === 'cita' ? 'C-' : k === 'rsv' ? 'R-' : k === 'bol' ? 'B-' : 'A-') + (n++), k, kl: KL[k], biz: b.id, uid: u.id, amt, dep, fee, tax, tip, total, comm, pay, st, at, dl: k === 'ped' ? (fee ? 'delivery' : 'pickup') : null, p: k === 'rsv' ? 2 + Math.floor(r() * 5) : 0, qty: k === 'bol' ? 1 + Math.floor(r() * 3) : 1 }); }
    { const ub = id => L.find(b => b.id === id) || pool[0], X = [['#9101', 'ped', 'sabor-dominicano', 31.4, 'cob', 3 * H], ['#9102', 'ped', 'tacos-el-guero', 18.75, 'dev', 4 * D], ['#9103', 'ped', 'panaderia-la-espiga', 12.6, 'ret', 40 * MIN], ['#9104', 'ped', 'empanadas-dona-tere', 22.1, 'cob', 9 * D], ['#9105', 'ped', 'cafe-quisqueya', 9.8, 'cx', 15 * D],
      ['C-9201', 'cita', 'salon-glamour', 65, 'cob', 6 * D], ['C-9202', 'cita', 'taller-hermanos-pena', 180, 'pend', 2 * H], ['C-9203', 'cita', 'clinica-esperanza', 45, 'lib', 20 * D], ['C-9204', 'cita', 'dental-sonrisa', 120, 'cob', 33 * D],
      ['R-9301', 'rsv', 'sabor-dominicano', 0, 'ok', 12 * D], ['R-9302', 'rsv', 'el-fogon', 0, 'noshow', 27 * D], ['B-9401', 'bol', 'sabor-dominicano', 30, 'cob', 8 * D], ['A-9501', 'apt', 'electro-hogar-caribe', 89.99, 'cob', 18 * D]];
      X.forEach(([id, k, bid, amt, st, age]) => { const b = ub(bid), dep = k === 'cita' ? r2(Math.min(amt, 10 + Math.round(amt * .2))) : 0, fee = k === 'ped' && amt > 15 ? 3.99 : 0, tax = k === 'ped' ? r2(amt * .06) : 0, tip = k === 'ped' && fee ? r2(amt * .18) : 0, total = r2(amt + fee + tax + tip); out.push({ id, k, kl: KL[k], biz: b.id, uid: 'u00', amt, dep, fee, tax, tip, total, comm: r2(amt * (k === 'ped' ? .1 : k === 'cita' ? .08 : k === 'bol' ? .05 : k === 'apt' ? .06 : 0)), pay: 'card', st, at: T0 - age, dl: k === 'ped' ? (fee ? 'delivery' : 'pickup') : null, p: k === 'rsv' ? 4 : 0, qty: k === 'bol' ? 2 : 1, demo: true }); }); }
    out.sort((a, b) => b.at - a.at); _tx = out; _txN = L.length; return out; }
  /* Suscripciones Pro ($14.99/mes · prueba 30 días) */
  let _subs = null, _subsN = 0;
  function SUBS() { const L = BIZL(); if (!(_subs && _subsN === L.length)) { _subs = L.filter(b => b.pro || b._pro0).map(b => { const h = hash(b.id) % 100; const st = h < 84 ? 'activa' : h < 89 ? 'prueba' : h < 93 ? 'fallido' : h < 96 ? 'cortesia' : 'cancelada'; return { biz: b.id, st, price: 14.99, next: T0 + ((hash(b.id + 'n') % 28) + 1) * D, left: st === 'prueba' ? 3 + hash(b.id + 'p') % 25 : 0, tries: st === 'fallido' ? 1 + hash(b.id + 't') % 3 : 0, since: T0 - (30 + hash(b.id + 's') % 400) * D }; }); _subsN = L.length; } const TT = window.TLTrial; if (!TT) return _subs; const live = TT.ids().map(id => TT.sub(id)).filter(Boolean), seen = {}; live.forEach(x => { seen[x.biz] = 1; }); return _subs.filter(x => !seen[x.biz]).concat(live); }

  /* Licencias: estado por defecto estable (ok · rev · exp); el admin lo cambia en tl-adm-v1.lic */
  function licDefault(bid) { const h = hash('lic' + bid) % 100; return h < 70 ? { st: 'ok', at: new Date(2026, 8, 1).getTime() } : h < 88 ? { st: 'rev', at: T0 - (2 + h % 5) * D } : { st: 'exp', at: new Date(2026, 9, 1 + h % 20).getTime() }; }
  function lic(bid) { const o = read().lic[bid]; return o || licDefault(bid); }

  /* Colas de ejemplo (lo vivo lo suma el admin). at = cuándo entró. */
  function seeds() { const L = BIZL(), by = (i) => L[(i * 13 + 5) % L.length] || L[0]; const noVer = L.filter(b => b.pro && !b.verified), free = L.filter(b => !b.pro);
    const sello = (noVer.length ? noVer : L).slice(0, 3).map((b, i) => ({ id: 'SE-' + (410 + i), q: 'sello', biz: b.id, at: T0 - [31 * H, 52 * H, 6 * H][i], pri: i === 1 ? 'alta' : 'normal' }));
    const nuevo = (free.length ? free : L).filter((b, i) => i % 9 === 2).slice(0, 4).map((b, i) => ({ id: 'NB-' + (120 + i), q: 'nuevo', biz: b.id, at: T0 - [3 * H, 19 * H, 27 * H, 44 * H][i], src: ['app', 'app', 'import', 'app'][i] }));
    const licQ = L.filter(b => (b.lic || []).length && lic(b.id).st === 'rev').slice(0, 6).map((b, i) => ({ id: 'LI-' + (70 + i), q: 'lic', biz: b.id, at: lic(b.id).at, key: b.lic[0] }));
    const evt = [{ id: 'EV-5021', q: 'evt', org: (L.find(b => b.id === 'el-fogon') || by(3)).id, name: 'Bachata en la terraza', type: 'Música en vivo', day: 3, h0: 21, h1: 25, where: 'biz', entry: 'cover', price: '10', cap: '80', age: '21', desc: 'Trío de bachata en vivo, dos por uno en cervezas hasta las 11. Reserva tu mesa.', ph: 1763075, at: T0 - 5 * H, seed: 1 }];
    const ayuda = [{ id: 'AY-2420', q: 'ayuda', kind: 'falta', kindL: ['Faltó algo', 'Something missing'], biz: 'sabor-dominicano', uid: 'u00', num: 9101, amt: 4, total: 31.4, prevRes: 'no', sol: 'wallet', det: 'Faltaron los tostones del pedido.', lines: ['Tostones'], ph: 1, at: T0 - 2 * H, pri: 'normal' },
      { id: 'AY-2411', q: 'ayuda', kind: 'frio', kindL: ['Llegó frío', 'Arrived cold'], biz: (L.find(b => b.id === 'pollo-don-lucho') || by(5)).id, uid: 'u07', num: 1027, amt: 14.5, total: 31.9, prevRes: 'no', sol: 'visa', det: 'Llegó frío y 25 min después de la hora prometida (7:40 PM vs 7:15 PM).', lines: ['Pollo entero + papas'], ph: 1, at: T0 - 80 * MIN, pri: 'alta' },
      { id: 'AY-2398', q: 'ayuda', kind: 'falta', kindL: ['Falta algo', 'Something missing'], biz: (L.find(b => b.id === 'tacos-el-guero') || by(6)).id, uid: 'u15', num: 1012, amt: 6, total: 22.4, prevRes: 'auto', sol: 'wallet', det: 'Faltaron 2 tacos al pastor de 5. Lo demás bien.', lines: ['Tacos al pastor ×5'], ph: 0, at: T0 - 26 * H, pri: 'normal' }];
    const disputa = [{ id: 'DP-121', q: 'disputa', biz: 'taller-hermanos-pena', uid: 'u00', amt: 36, ref: 'C-9202', why: 'La clienta dice que le cobraron el depósito dos veces', deadline: T0 + 6 * D, at: T0 - 1 * D, evid: [['Solicitud C-9202 enviada hoy, 10:30 AM', 'Request C-9202 sent today, 10:30 AM'], ['Un solo depósito retenido de $46', 'A single $46 deposit held']] }, { id: 'DP-118', q: 'disputa', biz: (L.find(b => b.id === 'salon-glamour') || by(7)).id, uid: 'u22', amt: 35, ref: 'C-1188', why: 'El cliente dice que no reconoce el cargo', deadline: T0 + 5 * D, at: T0 - 2 * D, evid: [['Solicitud de cita C-1188 enviada el 9 sep, 4:12 PM', 'Booking C-1188 sent Sep 9, 4:12 PM'], ['Depósito retenido → cobrado al confirmar el salón', 'Deposit held → charged when the salon confirmed'], ['SMS de confirmación entregado al (570) 4••-••22', 'Confirmation SMS delivered to (570) 4••-••22'], ['Cita terminada · reseña de 5 ★ del mismo cliente', 'Appointment completed · 5-star review by the same client']] },
      { id: 'DP-121', q: 'disputa', biz: (L.find(b => b.id === 'el-fogon') || by(3)).id, uid: 'u33', amt: 40, ref: 'B-1203', why: 'Boletos comprados dos veces; el banco abrió el caso', deadline: T0 + 11 * D, at: T0 - 20 * H, evid: [['Dos compras con 40 s de diferencia, mismo dispositivo', 'Two purchases 40 s apart, same device'], ['4 boletos emitidos, 2 usados en la puerta', '4 tickets issued, 2 used at the door'], ['Devolución de 2 boletos ya iniciada por soporte', 'Refund of 2 tickets already started by support']] }];
    const rep = [{ id: 'RP-906', q: 'rep', type: 'com', ref: 'c-512', biz: null, why: 'off', byUid: 'u00', n: 1, at: T0 - 26 * H, text: 'Ese negocio es una estafa y el dueño es un ladrón.', author: 'Tito G.' },
      { id: 'RP-901', q: 'rep', type: 'rev', ref: 'sd7', biz: 'sabor-dominicano', why: 'fake', byUid: 'u14', n: 2, at: T0 - 3 * H, text: 'Pedí a las 8 y llegó a las 9:30, frío. El repartidor ni se disculpó.', author: 'Carlos V.' },
      { id: 'RP-902', q: 'rep', type: 'post', ref: 'tl-sastre', biz: null, why: 'spam', byUid: 'u02', n: 1, at: T0 - 9 * H, text: 'Vendo celulares baratos, escríbeme al 570-…', author: 'Junior A.' },
      { id: 'RP-903', q: 'rep', type: 'com', ref: 'c-441', biz: null, why: 'off', byUid: 'u27', n: 3, at: T0 - 14 * H, text: 'Esa gente no sabe ni cocinar, mejor que se devuelvan.', author: 'Wilson M.' },
      { id: 'RP-904', q: 'rep', type: 'rev', ref: 'sd11', biz: 'sabor-dominicano', why: 'pii', byUid: 'u31', n: 1, at: T0 - 29 * H, text: 'La cajera Yudelka (vive en la 3ra con Alter) me cobró de más.', author: 'Rosa T.' },
      { id: 'RP-905', q: 'rep', type: 'nov', ref: 'n-77', biz: (L.find(b => b.id === 'tacos-el-guero') || by(6)).id, why: 'spam', byUid: 'u08', n: 1, at: T0 - 40 * MIN, text: '¡50 % en TODO solo hoy! (válido con compra mínima de $80)', author: null }];
    const repBiz = [{ id: 'RB-305', q: 'repBiz', biz: by(17).id, why: 'precio', byUid: 'u00', n: 1, at: T0 - 50 * H, text: 'El precio de la página no es el que cobran en el local.' },
      { id: 'RB-306', q: 'repBiz', biz: 'sabor-dominicano', why: 'precio', byUid: 'u14', n: 2, at: T0 - 9 * H, text: 'En la página el mofongo dice $12 y en el local me cobraron $14.' },
      { id: 'RB-301', q: 'repBiz', biz: by(9).id, why: 'noexiste', byUid: 'u19', n: 2, at: T0 - 7 * H, text: 'Fui a la dirección y es una casa; nadie sabe del negocio.' },
      { id: 'RB-302', q: 'repBiz', biz: by(14).id, why: 'estafa', byUid: 'u36', n: 1, at: T0 - 30 * H, text: 'Cobran un depósito y después no contestan el teléfono.' },
      { id: 'RB-303', q: 'repBiz', biz: by(21).id, why: 'comport', byUid: 'u44', n: 1, at: T0 - 2 * D, text: 'Me trataron mal por no hablar inglés.' }];
    const repUsr = [{ id: 'RU-203', q: 'repUsr', uid: 'u00', why: 'spam', byUid: 'u12', n: 3, at: T0 - 4 * D, text: 'Pone el mismo anuncio de su tienda en todos los hilos.' }, { id: 'RU-201', q: 'repUsr', uid: 'u41', why: 'acoso', byUid: 'u12', n: 4, at: T0 - 5 * H, text: 'Escribe lo mismo en todos los hilos y manda mensajes privados insistentes.' }, { id: 'RU-202', q: 'repUsr', uid: 'u23', why: 'fake', byUid: 'u05', n: 1, at: T0 - 36 * H, text: 'Deja reseñas de 1 ★ a todos los negocios de Alter St el mismo día.' }];
    const apel = [{ id: 'AP-43', q: 'apel', uid: 'u00', sanc: 'nopub', by: 'marcos', orig: 'Publicó el mismo anuncio en 6 hilos el mismo día', text: 'Eran avisos de mi negocio, no spam. No sabía que había un límite.', at: T0 - 2 * D }, { id: 'AP-41', q: 'apel', uid: 'u23', sanc: 'mute7', by: 'marcos', orig: 'Reseñas en ráfaga sin transacción (5 en 10 min)', text: 'Sí fui a esos negocios, pagué en efectivo. No es justo que me silencien.', at: T0 - 20 * H }, { id: 'AP-42', q: 'apel', uid: 'u09', sanc: 'susp14', by: 'marcos', orig: 'Comentario discriminatorio en el hilo del sastre', text: 'Fue una broma entre conocidos; ya pedí disculpas en el hilo.', at: T0 - 50 * H }];
    const cambio = [{ id: 'CS-15', q: 'cambio', type: 'claim', biz: (L.find(b => !bizOwner(b.id) && !b.pro && /bodega|colmado|mini/i.test(b.name)) || L.find(b => !bizOwner(b.id) && !b.pro) || by(6)).id, toUid: 'u48', at: T0 - 14 * H, text: 'Este negocio es mío desde 2019. Alguien lo puso en la app sin preguntarme.', evid: [['Llamamos al teléfono del negocio y contestó la misma persona', 'We called the business phone and the same person answered'], ['Mandó foto de la licencia de negocio de Hazleton', 'Sent a photo of the Hazleton business license']] }, { id: 'CS-14', q: 'cambio', type: 'owner', biz: (ownerBiz(USERS[0])[1] || by(3)).id, toUid: 'u37', at: T0 - 6 * H, text: 'Quiero pasarle la tienda a mi hija; ella la va a manejar.' }, { id: 'CS-11', q: 'cambio', type: 'cat', biz: by(4).id, from: 'NEG-BELL', to: 'NEG-SALUD', byUid: null, at: T0 - 10 * H, text: 'Ahora ofrecemos masajes terapéuticos con licencia; la categoría de salud nos describe mejor.' }, { id: 'CS-12', q: 'cambio', type: 'owner', biz: by(8).id, toUid: 'u30', at: T0 - 33 * H, text: 'Le vendí el negocio a mi sobrino; la cuenta debe pasar a él.' }, { id: 'CS-13', q: 'cambio', type: 'delUsr', uid: 'u52', at: T0 - 3 * D, text: 'Quiero borrar mi cuenta y mis datos.' }];
    const medios = [{ id: 'MD-61', q: 'medios', ph: 7447291, biz: by(2).id, flag: 'texto', at: T0 - 50 * MIN, text: 'Texto en imagen: «50 % HOY» con precio tachado' }, { id: 'MD-62', q: 'medios', ph: 3993136, biz: by(11).id, flag: 'desnudez', at: T0 - 2 * H, text: 'Posible desnudez (probable falso positivo: tatuaje en brazo)' }, { id: 'MD-63', q: 'medios', ph: 29075345, biz: by(17).id, flag: 'violencia', at: T0 - 5 * H, text: 'Marcada por violencia (cuchillos de cocina en la mesa)' }];
    const rec = [{ id: 'R-3041', q: 'rec', name: 'Colmado La 27', cat: 'NEG-MERC', where: '27 E Diamond Ave', con: '', know: 'cliente', why: 'Siempre tienen plátano fresco y fían a los vecinos.', city: 'Hazleton', at: T0 - 2 * D, byUid: 'u06', seed: 1 }, { id: 'R-3044', q: 'rec', name: 'Yoselin Nails', cat: 'NEG-BELL', where: '', casa: true, con: '(570) 8••-••41', know: 'amiga', why: 'Hace uñas en su casa en West Hazleton, siempre llena.', city: 'Hazleton', at: T0 - 4 * D, byUid: 'u20', seed: 1 }];
    const ciudad = [{ id: 'CT-alw', q: 'ciudad', city: 'Allentown, PA', n: 312, biz: 23, at: T0 - 40 * D, seed: 1 }, { id: 'CT-rdg', q: 'ciudad', city: 'Reading, PA', n: 184, biz: 11, at: T0 - 33 * D, seed: 1 }, { id: 'CT-scr', q: 'ciudad', city: 'Scranton, PA', n: 97, biz: 2, at: T0 - 21 * D, seed: 1 }, { id: 'CT-wb', q: 'ciudad', city: 'Wilkes-Barre, PA', n: 61, biz: 0, at: T0 - 15 * D, seed: 1 }];
    const ticket = [{ id: 'TK-5112', q: 'ticket', uid: 'u00', ch: 'app', cat: 'pago', pri: 'normal', st: 'nuevo', text: 'Mi pago de promotora de septiembre no ha llegado a la Wallet.', at: T0 - 70 * MIN, ref: '' }, { id: 'TK-5101', q: 'ticket', uid: 'u11', ch: 'app', cat: 'pago', pri: 'alta', st: 'nuevo', text: 'Me cobraron dos veces el depósito de la cita del sábado.', at: T0 - 35 * MIN, ref: 'C-1261' }, { id: 'TK-5099', q: 'ticket', uid: 'u28', ch: 'wa', cat: 'cuenta', pri: 'normal', st: 'curso', asg: 'dayana', text: 'No me llega el código por SMS, cambié de número.', at: T0 - 3 * H }, { id: 'TK-5094', q: 'ticket', biz: by(1).id, ch: 'mail', cat: 'negocio', pri: 'normal', st: 'espera', asg: 'dayana', text: 'Quiero cambiar el nombre legal en mis pagos de Stripe.', at: T0 - 26 * H }, { id: 'TK-5090', q: 'ticket', uid: 'u47', ch: 'app', cat: 'cita', pri: 'normal', st: 'nuevo', text: 'La barbería confirmó y después canceló; el depósito sigue retenido.', at: T0 - 6 * H, ref: 'C-1244' }, { id: 'TK-5087', q: 'ticket', uid: 'u03', ch: 'app', cat: 'tecnico', pri: 'baja', st: 'curso', asg: 'dayana', text: 'El mapa no carga en mi Android cuando cambio el radio.', at: T0 - 2 * D }, { id: 'TK-5080', q: 'ticket', uid: 'u58', ch: 'mail', cat: 'sugerencia', pri: 'baja', st: 'nuevo', text: '¿Pueden agregar filtro «acepta EBT» en mercados?', at: T0 - 3 * D }];
    return [].concat(sello, nuevo, licQ, evt, ayuda, disputa, rep, repBiz, repUsr, apel, cambio, medios, rec, ciudad, ticket); }

  /* Auditoría de ejemplo (el admin agrega las suyas) */
  const AUDIT0 = () => { const L = BIZL(), b = i => (L[i] || L[0] || { id: '', name: '' }); return [
    { id: 'a1', at: T0 - 22 * MIN, by: 'marcos', sec: 'colas', act: 'hide', obj: { t: 'rev', id: 'sd6', l: 'Reseña de Pedro A. · Sabor Dominicano' }, before: 'visible', after: 'oculta', why: 'Tiene datos personales' },
    { id: 'a2', at: T0 - 58 * MIN, by: 'dayana', sec: 'sop', act: 'resolve', obj: { t: 'ticket', id: 'TK-5096', l: 'Ticket TK-5096 · código SMS' }, before: 'en curso', after: 'resuelto', why: 'Se reenvió el código al número nuevo' },
    { id: 'a3', at: T0 - 3 * H, by: 'yesenia', sec: 'colas', act: 'approve', obj: { t: 'biz', id: b(1).id, l: 'Sello · ' + b(1).name }, before: 'en revisión', after: 'verificado', why: 'Dirección, teléfono y fotos coinciden' },
    { id: 'a4', at: T0 - 5 * H, by: 'omar', sec: 'tx', act: 'refund', obj: { t: 'tx', id: '#1004', l: 'Pedido #1004 · devolución parcial $6.00' }, before: 'cobrado $22.40', after: 'devuelto $6.00', why: 'Faltaron 2 tacos; el negocio no respondió en 24 h' },
    { id: 'a5', at: T0 - 26 * H, by: 'luis', sec: 'neg', act: 'feature', obj: { t: 'biz', id: b(2).id, l: b(2).name }, before: '—', after: 'destacado 7 días', why: 'Rotación semanal de Destacados' },
    { id: 'a6', at: T0 - 2 * D, by: 'carolina', sec: 'sys', act: 'team', obj: { t: 'team', id: 'ines', l: 'Inés Rodríguez' }, before: '—', after: 'Solo lectura · Hazleton', why: 'Asesora del proyecto' },
    { id: 'a7', at: T0 - 3 * D, by: 'yesenia', sec: 'colas', act: 'reject', obj: { t: 'biz', id: b(5).id, l: 'Sello · ' + b(5).name }, before: 'en revisión', after: 'no aprobado', why: 'Las fotos no son del local' },
    { id: 'a9', at: T0 - 64 * D, by: 'marcos', sec: 'usr', act: 'sanction', obj: { t: 'usr', id: 'u00', l: 'Rosa Peña' }, before: 'activo', after: 'advertido', why: 'Comentario fuera de tono en el hilo de la feria' },
    { id: 'a10', at: T0 - 20 * D, by: 'dayana', sec: 'usr', act: 'note', obj: { t: 'usr', id: 'u00', l: 'Rosa Peña' }, before: '', after: 'nota interna', why: 'Dueña de 2 negocios y promotora' },
    { id: 'a11', at: T0 - 11 * D, by: 'omar', sec: 'usr', act: 'pay', obj: { t: 'usr', id: 'u00', l: 'Wallet · Rosa Peña' }, before: '$13.50', after: '$23.50', why: 'Compensación: el pedido #9104 llegó 40 min tarde' },
    { id: 'a12', at: T0 - 5 * D, by: 'marcos', sec: 'usr', act: 'sanction', obj: { t: 'usr', id: 'u00', l: 'Rosa Peña' }, before: 'activo', after: 'Bloquear publicación 30 días', why: 'Publicó el mismo anuncio en 6 hilos el mismo día' },
    { id: 'a13', at: T0 - 70 * D, by: 'yesenia', sec: 'colas', act: 'seal', obj: { t: 'biz', id: 'sabor-dominicano', l: 'Sello · Sabor Dominicano' }, before: 'en revisión', after: 'verificado', why: 'Dirección, teléfono y fotos del local coinciden' },
    { id: 'a14', at: T0 - 31 * D, by: 'luis', sec: 'neg', act: 'edit', obj: { t: 'biz', id: 'sabor-dominicano', l: 'Sabor Dominicano · cierre temporal' }, before: 'abierto', after: 'cerrado temporal 2 días', why: 'Arreglo de la cocina; lo pidió la dueña por teléfono' },
    { id: 'a15', at: T0 - 29 * D, by: 'luis', sec: 'neg', act: 'restore', obj: { t: 'biz', id: 'sabor-dominicano', l: 'Sabor Dominicano · cierre temporal' }, before: 'cerrado temporal', after: 'abierto', why: 'Terminaron el arreglo' },
    { id: 'a16', at: T0 - 2 * D, by: 'omar', sec: 'neg', act: 'note', obj: { t: 'biz', id: 'sabor-dominicano', l: 'Sabor Dominicano' }, before: '', after: 'nota interna', why: 'Cobro de septiembre falló y se reintentó con éxito' },
    { id: 'a8', at: T0 - 4 * D, by: 'carolina', sec: 'plan', act: 'edit', obj: { t: 'plan', id: 'free', l: 'Plan Free · techo mensual' }, before: '8 en línea / mes', after: '10 en línea / mes', why: 'Decisión de producto (28 sep)' },
  ]; };

  /* Estado del admin */
  const EMPTY = () => ({ dec: {}, assign: {}, notes: {}, biz: {}, usr: {}, rev: {}, lic: {}, log: [], me: 'carolina', city: 'hzl', team: {}, cont: {}, evt: {}, syn: {}, cat: {}, cityCfg: {}, gam: {}, cms: {}, cfg: {} });
  let _raw = null, _st = null;
  function read() { let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} if (raw === _raw && _st) return _st; _raw = raw; let o = null; try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; } _st = Object.assign(EMPTY(), o || {}); ['dec', 'assign', 'notes', 'biz', 'usr', 'rev', 'lic', 'team', 'cont', 'evt', 'syn', 'cat', 'cityCfg', 'gam', 'cms', 'cfg'].forEach(k => { if (!_st[k] || typeof _st[k] !== 'object') _st[k] = {}; }); if (!Array.isArray(_st.log)) _st.log = []; return _st; }
  function write(fn, o) { const cur = read(); if (!(o && o.noTrack) && !_pre) _pre = JSON.parse(JSON.stringify(cur)); const s = JSON.parse(JSON.stringify(cur)); const out = fn(s) || s; try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {} _raw = null; apply(); return read(); }
  /* Historial: lo que cambió desde la última entrada (para poder deshacerla). log y me no cuentan. */
  let _pre = null; const NOTRACK = { log: 1, me: 1 };
  function takeDiff() { const pre = _pre; _pre = null; if (!pre) return null; const now = read(), d = [], J = x => JSON.stringify(x), isO = x => x && typeof x === 'object' && !Array.isArray(x);
    new Set(Object.keys(pre).concat(Object.keys(now))).forEach(k => { if (NOTRACK[k]) return; const x = pre[k], y = now[k]; if (J(x) === J(y)) return;
      if (isO(x) && isO(y)) new Set(Object.keys(x).concat(Object.keys(y))).forEach(sk => { if (J(x[sk]) !== J(y[sk])) d.push(x[sk] === undefined ? { p: [k, sk], u: 1 } : { p: [k, sk], v: x[sk] }); });
      else d.push(x === undefined ? { p: [k], u: 1 } : { p: [k], v: x }); }); return d.length ? d : null; }
  function restore(d) { return write(s => { (d || []).forEach(x => { const k = x.p[0]; if (x.p.length === 1) { if (x.u) delete s[k]; else s[k] = x.v; } else { s[k] = s[k] || {}; if (x.u) delete s[k][x.p[1]]; else s[k][x.p[1]] = x.v; } }); }); }
  function bizSt(id) { return read().biz[id] || {}; }
  function usrSt(id) { return read().usr[id] || {}; }
  function revHidden(id) { return read().rev[id] === 'hidden'; }
  function postHidden(id) { return !!(read().cont || {})['post:' + id]; }
  function cmHidden(id) { return !!(read().cont || {})['cm:' + id]; }
  function evtHidden(id) { const e = (read().evt || {})[id]; return !!(e && (e.hidden || e.cx)); }
  function evtSt(id) { return (read().evt || {})[id] || {}; }
  /* Sinónimos del buscador: base de search-engine + altas/bajas del admin (tl-adm-v1.syn: { palabra: [..] | null }) */
  function syn() { const S = read().syn; if (!S || !Object.keys(S).length) return null; const base = (window.TLSearch && window.TLSearch.SYN) || {}; const out = Object.assign({}, base); Object.keys(S).forEach(k => { if (S[k] === null) out[k] = []; else out[k] = S[k]; }); return out; }
  function synAll() { const base = (window.TLSearch && window.TLSearch.SYN) || {}, S = read().syn || {}; const out = {}; Object.keys(base).forEach(k => { out[k] = { to: base[k], src: 'base' }; }); Object.keys(S).forEach(k => { if (S[k] === null) { if (out[k]) out[k] = Object.assign({}, out[k], { off: true }); } else out[k] = { to: S[k], src: out[k] ? 'edit' : 'adm' }; }); return out; }
  const NOSUP = [['cerrajero 24 horas', 'NEG-HOGAR', 41], ['dentista que acepte Medicaid los sábados', 'NEG-SALUD', 33], ['envíos a República Dominicana', 'NEG-TRANS', 29], ['uñas acrílicas a domicilio', 'NEG-BELL', 24], ['clases de inglés gratis', 'NEG-EDU', 22], ['lavandería', 'NEG-TIENDA', 19], ['pasteles de tres leches', 'NEG-FOOD', 17], ['veterinario en español', 'NEG-SALUD', 15], ['gomera abierta domingo', 'NEG-AUTO', 12], ['notario para poder', 'NEG-PRO', 11]].map(([q, cat, n]) => ({ q, cat, n }));
  function noSupply() { let A = null; try { A = JSON.parse(localStorage.getItem('tl-search-v1') || 'null'); } catch (e) {} const live = Object.keys((A && A.alerts) || {}).filter(k => A.alerts[k]).map(k => { const [q, cat] = k.split('|'); return { q, cat: cat || null, n: 1, live: true }; }); return live.concat(NOSUP); }
  function tickets(eid) { const E = window.TLEvt && window.TLEvt.byId(eid); if (!E) return []; const r = rng(hash(eid)), out = [], DEMO = { 'jueves-bachata': ['TL-JUE-7310', 'ok', 15, 2 * D], 'ladies-night': ['TL-LAD-4402', 'dev', 0, 9 * D] }[eid], tks = E.tks || [], n = Math.min(E.going || 20, E.free ? 40 : 60); for (let i = 0; i < n; i++) { const u = UREG[Math.floor(r() * UREG.length)], tk = tks.length ? tks[Math.floor(r() * tks.length)] : null; const x = r(); out.push({ code: 'TL-' + eid.slice(0, 3).toUpperCase() + '-' + String(1000 + Math.floor(r() * 9000)), uid: u.id, tk: tk ? tk.n : ['RSVP', 'RSVP'], p: tk ? tk.p : 0, st: x < .9 ? 'ok' : x < .96 ? 'dev' : 'void', at: T0 - Math.floor(r() * 6) * D - Math.floor(r() * 20) * H }); } if (DEMO) { const tk = (E.tks || [])[0]; out.unshift({ code: DEMO[0], uid: 'u00', tk: tk ? tk.n : ['RSVP', 'RSVP'], p: DEMO[2] || (tk ? tk.p : 0), st: DEMO[1], at: T0 - DEMO[3] }); } return out; }
  /* Gamification: el admin cambia nombres de rango, puntos, cupones (costo, pausa) y excluye vecinos de la Tabla (tl-adm-v1.gam) */
  let _gC = null, _gRaw = null, _gSrc = null;
  function gamOf(C) { if (!C) return C; const G = read().gam; const raw = JSON.stringify(G || {}); if (_gC && _gRaw === raw && _gSrc === C) return _gC; _gRaw = raw; _gSrc = C; if (!G || !Object.keys(G).length) { _gC = C; return C; }
    const rk = G.rk || {}, pts = G.pts || {}, cup = G.cup || {}, ex = G.ex || {};
    const RANKS = C.RANKS.map((r, i) => rk[i] ? [rk[i].es || r[0], rk[i].en || r[1], rk[i].req || r[2], rk[i].reqEn || r[3], r[4], r[5]] : r);
    const PTS = C.PTS.map((p, i) => pts[i] != null ? [p[0], p[1], pts[i]] : p);
    const COUPONS = C.COUPONS.filter(c => !(cup[c[0]] && cup[c[0]].off)).map(c => cup[c[0]] && cup[c[0]].cost ? [c[0], c[1], c[2], c[3], cup[c[0]].cost] : c);
    const TABLA = {}; Object.keys(C.TABLA).forEach(m => { TABLA[m] = {}; Object.keys(C.TABLA[m]).forEach(u => { if (!ex[u]) TABLA[m][u] = C.TABLA[m][u]; }); });
    const PTS_RULES = G.cap ? [[('M\u00e1ximo ' + G.cap + ' puntos al d\u00eda.'), ('Up to ' + G.cap + ' points a day.')]].concat(C.PTS_RULES.slice(1)) : C.PTS_RULES;
    _gC = Object.assign({}, C, { RANKS, PTS, COUPONS, TABLA, PTS_RULES }); return _gC; }
  /* Filtros apagados por categoría (tl-adm-v1.cat[k].foff) — la página de categoría los quita de la hoja y de los rápidos */
  function filtOff(k) { const c = read().cat[k]; return (c && c.foff) || []; }
  /* Semillas (negocios sin reclamar) creadas en el admin: solo desde recomendaciones de vecinos (D2, 22 oct); las búsquedas sin oferta no crean semillas */
  function seedsOf(cat) { const S = read(), out = []; let recs = null; Object.keys(S.dec).forEach(k => { const d = S.dec[k]; if (!d || d.act !== 'seed') return; let x = null;
    if (k.indexOf('seed:') === 0) return;
    if (d.name) x = { name: d.name, where: d.where || '', cat: d.cat || null, con: d.con || '' };
    else { recs = recs || seeds(); const it = recs.find(i => i.id === k); if (it) x = { name: it.name, where: it.where || '', cat: it.cat, con: it.con || '' }; }
    if (x && x.name && (!cat || x.cat === cat)) out.push(Object.assign({ id: k, at: d.at }, x)); }); return out; }
  /* Negocio: lo que el admin pausa o quita (tl-adm-v1.biz[id].modOff / itemOff / jobOff / novOff) */
  function bo(bid) { return read().biz[bid] || {}; }
  function modOff(bid, k) { return !!(bo(bid).modOff || {})[k]; }
  function itemOff(bid, id) { return !!(bo(bid).itemOff || {})[id]; }
  function jobOff(bid, id) { return !!(bo(bid).jobOff || {})[id]; }
  function novOff(bid, id) { return !!(bo(bid).novOff || {})[id]; }
  let _mR = null, _mS = null, _mO = null;
  function menuAdm(bid, D) { const o = bo(bid), off = o.itemOff || {}; if (!Object.keys(off).length) return D; const raw = JSON.stringify(off); if (_mS === D && _mR === raw) return _mO; const cats = D.cats.map(c => Object.assign({}, c, { items: c.items.filter(i => !off[i.id]) })).filter(c => c.items.length); _mO = Object.assign({}, D, { cats, pop: (D.pop || []).filter(id => !off[id]) }); _mS = D; _mR = raw; return _mO; }
  function cms(k) { return (read().cms || {})[k] || null; }
  function cfg(k, def) { const c = read().cfg || {}; return c[k] != null ? c[k] : def; }
  function evtLive() { let L = []; try { L = JSON.parse(localStorage.getItem('tl-evt-pub-v1') || '[]') || []; } catch (e) {} return L; }
  /* Marca en los objetos de TLAll lo que decidió el admin (oculto · suspendido · sello) para que listas y buscador lo respeten */
  function apply() { const A = ALLB(); if (!A.length) return false; const S = read(); let OV = {}; try { OV = (JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over) || {}; } catch (e) {} A.forEach(b => { const o = S.biz[b.id]; if (b._n0 == null) { b._n0 = b.name; b._o0 = b.open; b._s0 = b.st; } const ed = o && o.ed || {}; b.name = ed.name ? ed.name.v : b._n0; const tmp = o && o.temp && o.temp.until > T0 ? o.temp : null; if (tmp) { b.open = 0; b.st = 'cerrado temporalmente'; b.admTemp = tmp.until; } else { b.open = b._o0; b.st = b._s0; delete b.admTemp; } const hid = !!(o && (o.hidden || o.susp || o.closed)) || !!(OV[b.id] && OV[b.id].bdel); if (!!b.admHidden !== hid) b.admHidden = hid; if (b._ph0 == null && Array.isArray(b.ph)) b._ph0 = b.ph.slice(); if (b._ph0) { const po = (o && o.phOff) || {}, pv = b._ph0.filter(p => !po[String(p)]); b.ph = pv.length ? pv : b._ph0.slice(0, 1); } if (o && o.seal === 'ok' && !b.verified) { b.verified = 1; b.admSeal = 1; } else if (o && o.seal === 'off' && b.verified) { b.verified = 0; b.admSeal = 0; } }); if (window.TLTrial) window.TLTrial.apply(); return true; }
  (function boot(n) { if (!ALLB().length) { if (n < 120) setTimeout(() => boot(n + 1), 80); return; } apply(); })(0);

  /* Tiempo */
  function ago(ms, es) { const d = Math.max(0, T0 - ms); if (d < MIN) return es ? 'ahora' : 'now'; if (d < H) return (es ? 'hace ' : '') + Math.round(d / MIN) + ' min' + (es ? '' : ' ago'); if (d < D) return (es ? 'hace ' : '') + Math.round(d / H) + ' h' + (es ? '' : ' ago'); const dd = Math.round(d / D); if (dd === 1) return es ? 'ayer' : 'yesterday'; return (es ? 'hace ' : '') + dd + (es ? ' d' : ' d ago'); }
  function wait(ms, es) { const d = Math.max(0, T0 - ms); if (d < H) return Math.round(d / MIN) + ' min'; if (d < D) return Math.round(d / H) + ' h'; return Math.round(d / D) + (es ? ' d' : ' d'); }
  const MES = [['ene', 'Jan'], ['feb', 'Feb'], ['mar', 'Mar'], ['abr', 'Apr'], ['may', 'May'], ['jun', 'Jun'], ['jul', 'Jul'], ['ago', 'Aug'], ['sep', 'Sep'], ['oct', 'Oct'], ['nov', 'Nov'], ['dic', 'Dec']];
  function fdate(ms, es, withTime) { const d = new Date(ms); const h = d.getHours(), m = d.getMinutes(), hh = ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); const day = es ? d.getDate() + ' ' + MES[d.getMonth()][0] : MES[d.getMonth()][1] + ' ' + d.getDate(); return withTime ? day + ' · ' + hh : day; }
  function ftime(ms) { const d = new Date(ms), h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); }

  window.TLAdm = { KEY, T0, MIN, H, D, CATS, CAT, catOf, bizCat, BIZ, BIZL, bizPh, PX, money, r2, hash, TEAM, ROLES, SECS, ACTS, PERM, QUEUES, Q, TPL, SANC, USERS, USER, ownerBiz, bizOwner, TX, SUBS, lic, licDefault, seeds, AUDIT0, read, write, bizSt, usrSt, revHidden, postHidden, cmHidden, evtHidden, evtSt, syn, synAll, noSupply, tickets, evtLive, gamOf, cms, cfg, filtOff, seedsOf, modOff, itemOff, jobOff, novOff, menuAdm, takeDiff, restore, apply, ago, wait, fdate, ftime };
})();
