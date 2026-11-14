// 4ig · Super Admin del grupo Iglesias + Bienes Raíces + Venta de Autos: Colas › «Vivienda justa» (texto frenado → advertencia con aviso;
// vivienda para mayores → confirmar con aviso), Licencias por vencer y vencidas (el barrido las reabre; «Verificada» mueve la revisión),
// rutas de «Posible estafa» / Plantones / ayudas, Notificaciones con las plantillas nuevas, Analítica › Iglesias · Bienes Raíces · Autos con
// sus cifras contra SQL, y el triángulo (Tu herramienta → ficha, tarjeta de categoría y Buscar → Super Admin lo ve y puede pausar u ocultar)
// en las tres. Escritorio 1360 y un pase en teléfono 390. Deja todo como lo encontró.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const INM = 'rentas-hazleton-latino', MAY = 'vivienda-accesible-hazleton', DEA = 'autos-el-cibao', DES = 'despensa-manos-unidas';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const ve = (l) => l.first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const llenar = async (p, label, v) => { const x = await vis(p.getByLabel(label, { exact: true })); if (!x) throw new Error('sin campo ' + label); await x.fill(v); };
const guardar = (p) => clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
const fv = (n) => sql(`select filter_values from businesses where id = '${n}'`);
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
// Elige la plantilla del ReasonConfirm (o escribe el motivo) y confirma.
const decidir = async (p, plantilla, cta) => { await clic(p.getByText(plantilla, { exact: true })); await clic(p.getByRole('button', { name: cta, exact: true }).last()); };
// Botón de una fila de Negocios 360° (la fila que tiene el título y el botón).
const enFila = (p, titulo, boton) => p.getByText(titulo, { exact: true }).first().locator(`xpath=ancestor::*[.//*[normalize-space(text())='${boton}']][1]`).getByText(boton, { exact: true }).first();
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  // ── Punto de partida conocido ──
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where queue = 'vivienda' and status = 'open'`);
  sql(`update sanctions set lifted_at = now(), lift_reason = 'Prueba 4ig' where target_kind = 'business' and target_id = '${INM}' and reason like 'Vivienda justa:%' and lifted_at is null`);
  sql(`update licenses set status = 'withdrawn', updated_at = now() where number in ('PRUEBA-4IG-1', 'PRUEBA-4IG-2') and status <> 'withdrawn'`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where queue = 'lic' and status = 'open' and subject_id in (select id::text from licenses where number like 'PRUEBA-4IG-%')`);
  sql(`update fe_settings set out_today_on = null, derived_on = null where business_id = '${DES}'`);
  sql(`update businesses set modules_off = modules_off - 'svc' where id = '${DES}'`);
  sql(`update property_listings set ssn_required = false where business_id = '${INM}' and kind not in ('local','oficina','bodega','cocina','salon','almacen')`);
  sql(`update dealer_settings set itin = true, derived_on = null where business_id = '${DEA}'`);
  barrer();
  ok(/despensa/.test(fv(DES)) && /sinssn/.test(fv(INM)) && /\bitin\b/.test(fv(DEA)), 'filtros de partida: despensa, sin seguro social, con ITIN');

  const b = await chromium.launch(); const err = [];
  // Fotos de negocios que crearon pruebas anteriores (barberías de 2q/4a) cuyo archivo no está en el almacenamiento local: se cuentan aparte y
  // se dicen al final; cualquier otro 404 o error sí rompe la prueba.
  const sinArchivo = new Set(), medio404 = (u) => /\/medios\/n\/[0-9a-f-]+\.jpg$/.test(u) && sql(`select coalesce(string_agg(owner_id, ','), '') from media where url = '${new URL(u).pathname}'`).split(',').every((o) => /^barberia-\d+$/.test(o));
  const mira = (pg) => { pg.on('response', (r) => { if (r.status() === 404) { if (medio404(r.url())) sinArchivo.add(r.url()); else err.push('404 ' + r.url()); } }); pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_TUNNEL_CONNECTION_FAILED/.test(m.text()) && !/status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(ad); await entrar(ad, '5705550199');
  const yes = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(yes); await entrar(yes, '5705550433');

  // ── 1 · Vivienda justa: un texto frenado abre el caso del negocio ──
  const PROP = sql(`select i.id from property_listings pl join items i on i.id = pl.item_id where pl.business_id = '${INM}' and pl.status = 'available' and i.status = 'live' and i.removed_at is null and i.name->>'es' not like 'Prueba%' order by i.id limit 1`);
  const DESC0 = sql(`select coalesce(descr->>'es', '') from items where id = ${PROP}`);
  const a0 = Number(sql(`select count(*) from audit_entries where action = 'inm.vivienda_justa.frenada' and target_id = '${INM}'`));
  await yes.goto(`${B}/panel/${INM}/vendes/propiedades?det=inm:${PROP}`); await yes.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  await llenar(yes, 'DESCRIPCIÓN · OPCIONAL', 'Ideal para pareja, no niños.'); await guardar(yes);
  ok(await ve(yes.getByText(/No puede ir «no niños»/)), 'el panel frena «no niños» y no guarda');
  ok(sql(`select coalesce(descr->>'es', '') from items where id = ${PROP}`) === DESC0, 'la descripción no cambió (nada se publicó)');
  ok(Number(sql(`select count(*) from audit_entries where action = 'inm.vivienda_justa.frenada' and target_id = '${INM}'`)) === a0 + 1, 'la frase queda en la auditoría');
  const QV = sql(`select id from queue_items where queue = 'vivienda' and subject_kind = 'business' and subject_id = '${INM}' and status = 'open'`);
  ok(/^\d+$/.test(QV), `abrió el caso en Colas › Vivienda justa (${QV})`);
  await ad.goto(B + '/admin/colas?cola=' + sql(`select queue from queue_items where id = ${QV}`)); ok(await ve(ad.getByText(/Vivienda justa · Rentas Hazleton Latino/)), 'la cola Vivienda justa: «Vivienda justa · Rentas Hazleton Latino»'); // 9a: en su cola (la general tiene cientos)
  ok(await ve(ad.getByText(/texto(s)? frenado(s)? en 30 días · «no niños» · nada se publicó/)), 'con la última frase y «nada se publicó»');
  await ad.goto(B + `/admin/colas?cola=vivienda&caso=${QV}`); await ad.getByText(/^(CADA TEXTO FRENADO|LAS ÚLTIMAS \d+)$/).first().waitFor();
  const nF = sql(`select count(*) from audit_entries where action = 'inm.vivienda_justa.frenada' and target_id = '${INM}' and at > now() - interval '30 days'`);
  ok((await texto(ad)).includes(`FRENADAS EN 30 DÍAS ${nF} `), `el caso cuenta ${nF} frenadas en 30 días (SQL)`);
  ok(await ve(ad.getByText(/«no niños» · /).first()), 'el caso lista cada frase con su propiedad, quién y cuándo');
  await ad.screenshot({ path: OUT + 'g4ig-vivienda-frase-d.png', fullPage: true });
  const n0 = Number(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550433' and n.tpl = 'biz_vivienda_aviso'`));
  await clic(ad.getByRole('button', { name: 'Advertir al negocio' })); await decidir(ad, 'Intentó varias veces preferir o excluir a personas por quién vive.', 'Advertir');
  ok(await espera(() => sql(`select status || ':' || decision from queue_items where id = ${QV}`) === 'decided:advertir'), 'advertir cierra el caso');
  ok(sql(`select count(*) from sanctions where target_kind = 'business' and target_id = '${INM}' and kind = 'adv' and reason like 'Vivienda justa:%' and lifted_at is null`) === '1', 'queda una advertencia en el negocio');
  ok(await espera(() => Number(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550433' and n.tpl = 'biz_vivienda_aviso'`)) === n0 + 1), 'el negocio recibe «Aviso de vivienda justa»');
  ok(sql(`select count(*) from audit_entries where action = 'vivienda.advertir' and target_id = '${INM}' and reason is not null`) !== '0', 'la decisión queda en la auditoría con el motivo');

  // ── 2 · Vivienda para mayores: la declaración por revisar abre su caso; confirmar avisa al negocio ──
  // 9b-3 · Yesenia entra al panel de la vivienda para mayores porque es SU miembro: antes se lo daba inm4ib y, barajada, adm4ig corría primero.
  sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select '${MAY}', u.id, 'owner', 'Yesenia Batista', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+15705550433' and not exists (select 1 from business_members m where m.business_id = '${MAY}' and m.user_id = u.id)`);
  sql(`update business_members set status = 'active', panel_access = '{all}' where business_id = '${MAY}' and user_id = (select id from users where phone = '+15705550433')`);
  sql(`update items set status = 'live', hidden_reason = null where business_id = '${MAY}' and status = 'hidden'`);
  const PM = sql(`select item_id from property_listings where business_id = '${MAY}' and senior_62 order by item_id limit 1`);
  sql(`update property_listings set senior_status = 'review' where item_id = ${PM}`);
  await yes.goto(`${B}/panel/${MAY}/vendes/propiedades?det=inm:${PM}`); await yes.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  const dsc = await vis(yes.getByLabel('DESCRIPCIÓN · OPCIONAL', { exact: true })); await dsc.fill((await dsc.inputValue()) + ' '); await guardar(yes); // el servidor recorta: guarda lo mismo
  const QM = await (async () => { let q = ''; await espera(() => /^\d+$/.test(q = sql(`select id from queue_items where queue = 'vivienda' and subject_kind = 'listing' and subject_id = '${PM}' and status = 'open'`))); return q; })();
  ok(/^\d+$/.test(QM), `guardar una propiedad «para mayores» por revisar abre su caso (${QM})`);
  await ad.goto(B + `/admin/colas?cola=vivienda&caso=${QM}`); await ad.getByText('DECLARACIÓN').first().waitFor();
  ok(await ve(ad.getByText('Vivienda para mayores de 62').first()) && await ve(ad.getByText('Por revisar').first()), 'el caso: tipo y declaración por revisar');
  ok(!(await texto(ad)).match(/\d+ [A-Z][a-z]+ (St|Ave)\b.*mayores/), 'el caso muestra la zona, no la calle');
  await ad.screenshot({ path: OUT + 'g4ig-vivienda-mayores-d.png', fullPage: true });
  const m0 = Number(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550433' and n.tpl = 'biz_mayores_ok'`));
  await clic(ad.getByRole('button', { name: 'Confirmar mayores' })); await decidir(ad, 'La declaración de vivienda para mayores está en orden.', 'Confirmar');
  ok(await espera(() => sql(`select senior_status from property_listings where item_id = ${PM}`) === 'ok' && sql(`select status from queue_items where id = ${QM}`) === 'decided'), 'confirmada y el caso se cierra');
  ok(await espera(() => Number(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550433' and n.tpl = 'biz_mayores_ok'`)) === m0 + 1), 'el negocio recibe «Vivienda para mayores confirmada»');

  // ── 3 · Licencias de las tres: por vencer y vencida vuelven a la cola; «Verificada» mueve la revisión ──
  const L1 = sql(`insert into licenses (business_id, city_id, kind, title, status, source, number, next_review, verified_at, checked_at) select id, city_id, 'pa_dealer', '{}', 'valid', 'panel', 'PRUEBA-4IG-1', current_date + 5, now() - interval '3 months', now() - interval '3 months' from businesses where id = '${DEA}' returning id`).split('\n')[0];
  const L2 = sql(`insert into licenses (business_id, city_id, kind, title, status, source, number, next_review, verified_at, checked_at) select id, city_id, 'pa_corredor', '{}', 'valid', 'panel', 'PRUEBA-4IG-2', current_date - 2, now() - interval '3 months', now() - interval '3 months' from businesses where id = '${INM}' returning id`).split('\n')[0];
  // 9b-3 · Si la prueba se cae a la mitad, sus licencias de prueba igual se retiran: verificadas, autos4ic e inm4ib (barajadas después) no veían «sin verificar».
  process.on('exit', () => { try { sql(`update licenses set status = 'withdrawn', updated_at = now() where id in (${L1}, ${L2}) and status <> 'withdrawn'`); } catch { /* la base ya no está */ } });
  barrer();
  ok(sql(`select priority from queue_items where queue = 'lic' and subject_id = '${L1}' and status = 'open'`) === 'normal' && sql(`select priority from queue_items where queue = 'lic' and subject_id = '${L2}' and status = 'open'`) === 'alta', 'el barrido reabre la licencia por vencer (normal) y la vencida (alta)');
  barrer(); ok(sql(`select count(*) from queue_items where queue = 'lic' and subject_id in ('${L1}', '${L2}')`) === '2', 'el barrido no duplica casos');
  await ad.goto(B + '/admin/colas?cola=lic'); ok(await ve(ad.getByText(/Dealer con licencia de PA · revisión por vencer · /)) && await ve(ad.getByText(/Corredor o vendedor de bienes raíces de PA · revisión vencida desde el /)), 'Licencias: «por vencer» y «vencida» con su fecha');
  const QL = sql(`select id from queue_items where queue = 'lic' and subject_id = '${L1}' and status = 'open'`);
  await ad.goto(B + `/admin/colas?cola=lic&caso=${QL}`); ok(await ve(ad.getByText('PRÓXIMA REVISIÓN')), 'el caso dice la próxima revisión');
  await ad.screenshot({ path: OUT + 'g4ig-licencia-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Verificada' }));
  ok(await espera(() => sql(`select (next_review > current_date + 60)::text from licenses where id = ${L1}`) === 'true'), '«Verificada» mueve la revisión 3 meses');
  ok(sql(`select before->>'estado' from audit_entries where action = 'licencia.verificar' order by id desc limit 1`) === 'verificada, revisión por vencer', 'la auditoría dice de qué estado venía');

  // ── 4 · Rutas: «Posible estafa», Plantones y las ayudas de las tres ──
  ok(sql(`select count(*) from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id join businesses bz on bz.id = h.business_id
          where bz.category_id in ('NEG-FE','NEG-INMUEBLE','NEG-DEALER') and q.subject_kind = 'help_request'
            and ((h.reason in ('ver','mudar') or (h.reason = 'cobro' and bz.category_id = 'NEG-FE')) <> (q.queue = 'estafa'))`) === '0', 'cada ayuda de las tres está en su cola: estafa directo, lo demás en «Ayuda con pedidos y citas»');
  ok(sql(`select count(*) from queue_items q where q.queue = 'plantones' and not exists (select 1 from businesses bz where bz.id = q.subject_id and bz.category_id in ('NEG-INMUEBLE','NEG-DEALER'))`) === '0', 'Plantones solo de Bienes Raíces y Autos');
  const QP = sql(`select id from queue_items where queue = 'plantones' and status = 'open' order by id desc limit 1`);
  if (/^\d+$/.test(QP)) { await ad.goto(B + `/admin/colas?cola=plantones&caso=${QP}`); ok(await ve(ad.getByText('CADA UNA')), 'un caso de Plantones abre con cada «No vino»'); }

  // ── 5 · Notificaciones: las plantillas del grupo con su español e inglés ──
  ok(sql(`select count(*) from notif_templates where (key like 'vis_%' or key like 'biz_vis%' or key like 'insc_fe%' or key like 'fe_help%' or key like 'biz_help%' or key in ('help_directo','biz_fe_help','biz_mayores_ok','biz_mayores_no','biz_vivienda_aviso'))
          and (coalesce(title->>'es','') = '' or coalesce(title->>'en','') = '' or coalesce(body->>'es','') = '' or coalesce(body->>'en','') = '')`) === '0', 'cada plantilla del grupo trae español e inglés');
  await ad.goto(B + '/admin/notificaciones'); await ad.getByText(/plantilla/i).first().waitFor().catch(() => undefined);
  const TN = await texto(ad);
  ok(['Aviso de vivienda justa', 'Vivienda para mayores confirmada', 'Pausamos un anuncio', 'La revisa To\'Latino', 'Te proponen otra hora'].every((t) => TN.includes(t)), 'Notificaciones lista las plantillas nuevas (vivienda, estafa, visitas)');
  await ad.screenshot({ path: OUT + 'g4ig-notif-d.png', fullPage: true });

  // ── 6 · Analítica › Iglesias · Bienes Raíces · Autos, contra SQL ──
  const vis30 = (r) => Number(sql(`select count(*) from operations where kind = 'visit' and details->>'rubro' = '${r}' and sent_at > now() - interval '30 days'`));
  const nI = vis30('inm'), nD = vis30('dealer'), nAll = nI + nD;
  const aT = Number(sql(`select count(*) from operations where kind = 'visit' and sent_at > now() - interval '30 days' and confirmed_at is not null`));
  const ns = Number(sql(`select count(*) from operations where kind = 'visit' and sent_at > now() - interval '30 days' and status = 'done' and status_detail = 'noshow'`));
  const vig = Number(sql(`select count(*) from licenses l join license_kinds k on k.key = l.kind join businesses bz on bz.id = l.business_id where k.category_id in ('NEG-FE','NEG-INMUEBLE','NEG-DEALER') and bz.status = 'active' and l.status = 'valid' and (l.next_review is null or l.next_review >= current_date)`));
  const [mn, mok, pn, pok] = sql(`select count(*) filter (where r.answers ? 'mudarOk'), count(*) filter (where (r.answers->>'mudarOk')::int = 1), count(*) filter (where r.answers ? 'puertaOk'), count(*) filter (where (r.answers->>'puertaOk')::int = 1) from reviews r join operations o on o.id = r.operation_id where o.kind = 'visit' and r.status <> 'removed' and r.created_at > now() - interval '30 days'`).split('|').map(Number);
  const pc = (a, b2) => (b2 ? `${Math.round((a / b2) * 100)} %` : '—');
  await ad.goto(B + '/admin/analitica?tab=ia'); await ad.getByText('SOLICITUDES DE VISITA').first().waitFor();
  const TA = await texto(ad);
  ok(TA.includes(`SOLICITUDES DE VISITA ${nI} `), `solicitudes de visita = ${nI} (SQL)`);
  ok(TA.includes(`PRUEBAS DE MANEJO Y CITAS ${nD} `), `pruebas de manejo = ${nD} (SQL)`);
  ok(TA.includes(`CONFIRMADAS A TIEMPO ${pc(aT, nAll)}`), `confirmadas a tiempo = ${pc(aT, nAll)} (SQL)`);
  ok(TA.includes(`PLANTONES («NO VINO») ${ns} `), `plantones = ${ns} (SQL)`);
  ok(TA.includes(`«EL TOTAL FUE EL QUE VI» ${pc(mok + pok, mn + pn)}`), `«el total fue el que vi» = ${pc(mok + pok, mn + pn)} (SQL)`);
  ok(TA.includes(`LICENCIAS VIGENTES ${vig} `), `licencias vigentes = ${vig} (SQL)`);
  ok(TA.includes('A LA VISTA HOY POR CIUDAD') && TA.includes('Hazleton'), 'propiedades y carros a la vista por ciudad');
  ok(!/cat[oó]lic|evang[eé]lic|cristian|bautist|denominac/i.test(TA) && !/puntaje de cr[eé]dito|seguro social de/i.test(TA), 'sin religión ni datos de crédito en Analítica');
  await ad.screenshot({ path: OUT + 'g4ig-analitica-d.png', fullPage: true });

  // ── 7 · Triángulo (regla 8): Tu herramienta → ficha, tarjeta de categoría y Buscar → Super Admin lo ve y puede pausar u ocultar ──
  const pub = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(pub);
  // 9b-3 · Luis entra al panel de la despensa porque es SU miembro: antes se lo daba fe4ia y, barajada, adm4ig corría primero.
  for (const n of [DES]) sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select '${n}', u.id, 'owner', 'Padre Luis Herrera', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+15705550422' and not exists (select 1 from business_members m where m.business_id = '${n}' and m.user_id = u.id)`);
  const fe = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(fe); await entrar(fe, '5705550422');
  // 7a · Iglesias: «Se acabó por hoy» en la despensa.
  await fe.goto(`${B}/panel/${DES}/vendes/herramienta`); await fe.getByText('La ayuda de hoy', { exact: true }).first().waitFor();
  await clic(fe.getByRole('switch', { name: 'Se acabó por hoy' }));
  ok(await espera(() => sql(`select category_attrs->'tarjeta'->'eta'->>'es' from businesses where id = '${DES}'`) === 'Se acabó por hoy'), 'Iglesias: el toque guarda y deriva la tarjeta');
  await pub.goto(`${B}/n/${DES}`); ok(await contiene(pub, 'Se acabó por hoy') && await contiene(pub, 'Resumen Ayuda Reseñas'), 'Iglesias → ficha: «Se acabó por hoy» (con su pestaña «Ayuda»)');
  await pub.goto(`${B}/c/iglesias?f=despensa`); ok(await contiene(pub, 'Despensa Manos Unidas') && await contiene(pub, 'Se acabó por hoy'), 'Iglesias → tarjeta de la categoría');
  await pub.goto(`${B}/buscar?q=${encodeURIComponent('despensa manos unidas')}`); ok(await contiene(pub, 'Despensa Manos Unidas') && await contiene(pub, 'Se acabó por hoy'), 'Iglesias → Buscar');
  await ad.goto(`${B}/admin/negocios/${DES}?tab=vende`); ok(await ve(ad.getByText(/Se acabó por hoy · /).first()), 'Iglesias → Super Admin 360 lo ve (solo lectura)');
  await enFila(ad, 'Servicios', 'Pausar').click(); await decidir(ad, 'Reportes de clientes', 'Confirmar');
  ok(await espera(() => sql(`select modules_off ? 'svc' from businesses where id = '${DES}'`) === 't'), 'el Super Admin pausa Servicios');
  await pub.goto(`${B}/n/${DES}`); await contiene(pub, 'Despensa Manos Unidas'); ok(await espera(async () => { const t = await texto(pub); return t.includes('Resumen Reseñas') && !t.includes('Resumen Ayuda Reseñas') && !t.includes('Ver detalles'); }), 'pausado: la pestaña «Ayuda» y sus servicios salen de la ficha');
  await ad.goto(`${B}/admin/negocios/${DES}?tab=vende`); await enFila(ad, 'Servicios', 'Reanudar').click(); await (await vis(ad.getByRole('textbox').last())).fill('Prueba 4ig: se revisó'); await clic(ad.getByRole('button', { name: 'Confirmar', exact: true }).last());
  ok(await espera(() => sql(`select modules_off ? 'svc' from businesses where id = '${DES}'`) === 'f'), 'y lo reanuda');
  await clic(fe.getByRole('switch', { name: 'Se acabó por hoy' }));
  ok(await espera(() => sql(`select category_attrs->'tarjeta'->'eta'->>'es' from businesses where id = '${DES}'`) !== 'Se acabó por hoy'), 'Iglesias: apagado otra vez');

  // 7b · Bienes Raíces: «Sin seguro social · aceptas ITIN».
  await yes.goto(`${B}/panel/${INM}/vendes/herramienta`); await yes.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  await clic(yes.getByRole('switch', { name: 'Sin seguro social · aceptas ITIN' }));
  ok(await espera(() => !/sinssn/.test(fv(INM))), 'Bienes Raíces: apagar «Sin seguro social» quita el filtro');
  await pub.goto(`${B}/n/${INM}`); ok(await contiene(pub, 'Sí, o ITIN'), 'Bienes Raíces → ficha: «¿PIDEN SEGURO SOCIAL? Sí, o ITIN»');
  await pub.goto(`${B}/c/bienes-raices?f=sinssn`); await pub.waitForLoadState('networkidle'); ok(!(await texto(pub)).includes('Rentas Hazleton Latino'), 'Bienes Raíces → la categoría con «Sin seguro social» ya no la lista');
  await pub.goto(`${B}/buscar?cat=bienes-raices&f=sinssn&tab=biz`); await pub.waitForLoadState('networkidle'); ok(!(await texto(pub)).includes('Rentas Hazleton Latino'), 'Bienes Raíces → Buscar «Sin seguro social» ya no la muestra');
  await clic(yes.getByRole('switch', { name: 'Sin seguro social · aceptas ITIN' }));
  ok(await espera(() => /sinssn/.test(fv(INM))), 'encendido otra vez');
  await pub.goto(`${B}/c/bienes-raices?f=sinssn`); ok(await contiene(pub, 'Rentas Hazleton Latino'), 'la categoría la lista otra vez');
  await pub.goto(`${B}/buscar?cat=bienes-raices&f=sinssn&tab=biz`); ok(await contiene(pub, 'Rentas Hazleton Latino'), 'y Buscar también');
  await ad.goto(`${B}/admin/negocios/${INM}?tab=vende`); ok(await ve(ad.getByText(/sin seguro social/).first()), 'Bienes Raíces → Super Admin 360 lo ve');
  const PN = sql(`select i.name->>'es' from property_listings pl join items i on i.id = pl.item_id where pl.business_id = '${INM}' and pl.status = 'available' and i.status = 'live' and i.removed_at is null and i.name->>'es' not like 'Prueba%'
    and not exists (select 1 from operations o where o.kind = 'visit' and o.details->>'item_id' = i.id::text and o.status in ('pending','confirmed','change_proposed')) order by i.id limit 1`);
  await enFila(ad, PN, 'Ocultar').click(); await decidir(ad, 'Texto contra la vivienda justa', 'Confirmar');
  ok(await espera(() => sql(`select status from items where name->>'es' = '${PN}' and business_id = '${INM}' and removed_at is null`) === 'hidden'), `el Super Admin oculta «${PN}»`);
  await pub.goto(`${B}/n/${INM}`); await contiene(pub, 'Rentas Hazleton Latino'); ok(!(await texto(pub)).includes(PN), 'oculta: sale de la ficha');
  await ad.goto(`${B}/admin/negocios/${INM}?tab=vende`); await enFila(ad, PN, 'Volver a mostrar').click(); await (await vis(ad.getByRole('textbox').last())).fill('Prueba 4ig: se revisó'); await clic(ad.getByRole('button', { name: 'Confirmar', exact: true }).last());
  ok(await espera(() => sql(`select status from items where name->>'es' = '${PN}' and business_id = '${INM}' and removed_at is null`) === 'live'), 'y la vuelve a mostrar');

  // 7c · Venta de Autos: «Financias con ITIN».
  const ju = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(ju); await entrar(ju, '5705550444');
  await ju.goto(`${B}/panel/${DEA}/vendes/herramienta`); await ju.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  await clic(ju.getByRole('switch', { name: 'Financias con ITIN' }));
  ok(await espera(() => !/\bitin\b/.test(fv(DEA))), 'Autos: apagar «Financias con ITIN» quita el filtro');
  await pub.goto(`${B}/n/${DEA}`); ok(await contiene(pub, 'CON ITIN No') && !(await texto(pub)).includes('CON ITIN Sí'), 'Autos → ficha: «CON ITIN No»');
  await pub.goto(`${B}/c/venta-de-autos?f=itin`); await pub.waitForLoadState('networkidle'); ok(!(await texto(pub)).includes('Autos El Cibao'), 'Autos → la categoría «Con ITIN» ya no lo lista');
  await pub.goto(`${B}/buscar?q=${encodeURIComponent('autos el cibao')}`); await contiene(pub, 'Autos El Cibao'); ok(!(await texto(pub)).includes('Financian con ITIN · tasa'), 'Autos → Buscar: la tarjeta ya no dice «Financian con ITIN»');
  await clic(ju.getByRole('switch', { name: 'Financias con ITIN' }));
  ok(await espera(() => /\bitin\b/.test(fv(DEA))), 'encendido otra vez');
  await pub.goto(`${B}/n/${DEA}`); ok(await contiene(pub, 'CON ITIN Sí'), 'la ficha dice «CON ITIN Sí» otra vez');
  await pub.goto(`${B}/c/venta-de-autos?f=itin`); ok(await contiene(pub, 'Autos El Cibao'), 'la categoría lo lista otra vez');
  await pub.goto(`${B}/buscar?q=${encodeURIComponent('autos el cibao')}`); ok(await contiene(pub, 'Financian con ITIN · tasa'), 'y Buscar lo dice otra vez');
  await ad.goto(`${B}/admin/negocios/${DEA}?tab=vende`); ok(await ve(ad.getByText(/ITIN desde \$/).first()), 'Autos → Super Admin 360 lo ve');
  const CN = sql(`select i.name->>'es' from vehicle_listings v join items i on i.id = v.item_id where v.business_id = '${DEA}' and v.status = 'lot' and i.status = 'live' and i.removed_at is null and i.name->>'es' not like '%P4IC%'
    and not exists (select 1 from operations o where o.kind = 'visit' and o.details->>'item_id' = i.id::text and o.status in ('pending','confirmed','change_proposed'))
    and (select count(*) from items j where j.business_id = i.business_id and j.name->>'es' = i.name->>'es' and j.removed_at is null) = 1 order by i.id limit 1`);
  await enFila(ad, CN, 'Ocultar').click(); await decidir(ad, 'Título salvage sin decirlo', 'Confirmar');
  ok(await espera(() => sql(`select status from items where name->>'es' = '${CN}' and business_id = '${DEA}' and removed_at is null`) === 'hidden'), `el Super Admin oculta «${CN}»`);
  await pub.goto(`${B}/n/${DEA}`); await contiene(pub, 'Autos El Cibao'); ok(!(await texto(pub)).includes(CN), 'oculto: sale de la ficha');
  await ad.goto(`${B}/admin/negocios/${DEA}?tab=vende`); await enFila(ad, CN, 'Volver a mostrar').click(); await (await vis(ad.getByRole('textbox').last())).fill('Prueba 4ig: se revisó'); await clic(ad.getByRole('button', { name: 'Confirmar', exact: true }).last());
  ok(await espera(() => sql(`select status from items where name->>'es' = '${CN}' and business_id = '${DEA}' and removed_at is null`) === 'live'), 'y lo vuelve a mostrar');
  await ad.screenshot({ path: OUT + 'g4ig-triangulo-autos-d.png', fullPage: true });

  // ── 7d · Free: recibe solicitudes hasta el tope del mes (platform_config.free_ops_cap, hoy 10). Se baja el tope a lo ya usado para probar
  //    que el servidor frena la siguiente; luego se deja como estaba. ──
  const FREE = 'lote-la-81', CAP0 = sql(`select value #>> '{}' from platform_config where key = 'free_ops_cap'`);
  const usados = sql(`select count(*) from operations o join cities ci on ci.id = o.city_id where o.business_id = '${FREE}' and o.kind <> 'table' and o.free_quota_month = to_char(now() at time zone ci.timezone, 'YYYY-MM')`);
  ok(CAP0 === '10', 'el tope de Free es 10 al mes');
  const carF = sql(`select i.id from vehicle_listings v join items i on i.id = v.item_id where v.business_id = '${FREE}' and v.status = 'lot' and i.status = 'live' and i.removed_at is null order by i.id limit 1`);
  const cf = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(cf); await entrar(cf, '5705550288');
  sql(`update platform_config set value = '${usados}'::jsonb where key = 'free_ops_cap'`);
  try {
    await cf.goto(`${B}/n/${FREE}/ver?item=${carF}`);
    const tope = cf.getByText(/ya recibió las solicitudes de este mes/);
    if (!(await ve(tope))) {
      await (await vis(cf.locator('button[role="radio"]:not([disabled])'))).click(); await clic(cf.getByRole('button', { name: 'Continuar' }));
      await cf.getByText('BUENO SABER').first().waitFor();
      const lic = await vis(cf.getByRole('checkbox', { name: /Sí, tengo licencia vigente/ })); if (lic) await lic.click();
      await clic(cf.getByRole('button', { name: 'Enviar solicitud' }));
    }
    ok(await ve(tope), `Free con ${usados} de ${usados} usadas: «ya recibió las solicitudes de este mes en la app: llama al lugar»`);
    ok(sql(`select count(*) from operations o join cities ci on ci.id = o.city_id where o.business_id = '${FREE}' and o.kind <> 'table' and o.free_quota_month = to_char(now() at time zone ci.timezone, 'YYYY-MM')`) === usados, 'y no se guardó ninguna');
  } finally { sql(`update platform_config set value = '${CAP0}'::jsonb where key = 'free_ops_cap'`); }

  // ── 7e · «No se puede»: la persona pide una visita y el negocio responde que no; se libera la hora, se le avisa y no se cobró nada ──
  sql(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'prueba', respond_by = null
        where kind = 'visit' and status in ('pending', 'change_proposed') and user_id = (select id from users where phone = '+15705550288')`);
  const PV = sql(`select i.id from property_listings pl join items i on i.id = pl.item_id where pl.business_id = '${INM}' and pl.status = 'available' and i.status = 'live' and i.removed_at is null and i.name->>'es' not like 'Prueba%'
    and exists (select 1 from class_groups g where g.item_id = i.id and g.status = 'open' and g.starts_on > current_date) order by i.id limit 1`);
  await cf.goto(`${B}/n/${INM}/ver?item=${PV}`); await cf.getByRole('radiogroup').first().waitFor();
  await (await vis(cf.locator('button[role="radio"]:not([disabled])'))).click(); await clic(cf.getByRole('button', { name: 'Continuar' }));
  await clic(cf.getByRole('button', { name: 'Enviar solicitud' })); await cf.waitForURL(/\/vis\/D-\d+/, { timeout: 15000 });
  const VD = cf.url().match(/D-\d+/)[0], GD = sql(`select details->>'group_id' from operations where number = '${VD}'`);
  ok(sql(`select status || ':' || total_cents || ':' || pay_mode from operations where number = '${VD}'`) === 'pending:0:none', `visita ${VD} pedida: pendiente, $0 y sin pago`);
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${VD}`); await clic(yes.getByRole('button', { name: 'No se puede' }));
  ok(await espera(() => sql(`select status from operations where number = '${VD}'`) === 'declined'), '«No se puede» → la solicitud queda «no se puede»');
  ok(await espera(() => sql(`select count(*) from operations o where o.kind = 'visit' and o.status in ('pending','confirmed','change_proposed') and o.details->>'group_id' = '${GD}' and o.number = '${VD}'`) === '0'), 'la solicitud ya no ocupa esa hora');
  ok(await espera(() => sql(`select count(*) from notifications where ref_id = '${VD}' and tpl = 'vis_no'`) === '1'), 'le llega «No hay visita a esa hora» (ES/EN, sin cobro)');
  await cf.goto(`${B}/vis/${VD}`); ok(await contiene(cf, 'No se cobró nada') || await contiene(cf, 'Hoy no pagas nada') || await contiene(cf, 'NO SE PUEDE') || await contiene(cf, 'No hay visita'), 'Tu visita dice lo que pasó');

  // ── 8 · Teléfono: Colas › Vivienda justa y Analítica ──
  const tel = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(tel); await entrar(tel, '5705550199');
  await yes.goto(`${B}/panel/${INM}/vendes/propiedades?det=inm:${PROP}`); await yes.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  await llenar(yes, 'DESCRIPCIÓN · OPCIONAL', 'Solo parejas, no kids.'); await guardar(yes); await yes.getByText(/No puede ir «/).first().waitFor();
  const QV2 = sql(`select id from queue_items where queue = 'vivienda' and subject_kind = 'business' and subject_id = '${INM}' and status = 'open'`);
  ok(/^\d+$/.test(QV2), 'una frenada nueva después de la decisión abre otro caso');
  await tel.goto(B + `/admin/colas?cola=vivienda&caso=${QV2}`); await tel.getByText(/^(CADA TEXTO FRENADO|LAS ÚLTIMAS \d+)$/).first().waitFor();
  await tel.screenshot({ path: OUT + 'g4ig-vivienda-m.png', fullPage: true });
  await clic(tel.getByRole('button', { name: 'Revisado, sin acción' })); await decidir(tel, 'Error de buena fe: lo corrigió y guardó sin la frase.', 'Cerrar el caso');
  ok(await espera(() => sql(`select decision from queue_items where id = ${QV2}`) === 'revisado'), 'teléfono: «Revisado, sin acción» cierra el caso');
  await tel.goto(B + '/admin/analitica?tab=ia'); await tel.getByText('SOLICITUDES DE VISITA').first().waitFor();
  ok(await tel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'teléfono: Analítica sin scroll horizontal');
  await tel.screenshot({ path: OUT + 'g4ig-analitica-m.png', fullPage: true });

  // ── Deja todo como estaba ──
  sql(`update sanctions set lifted_at = now(), lift_reason = 'Prueba 4ig' where target_kind = 'business' and target_id = '${INM}' and reason like 'Vivienda justa:%' and lifted_at is null`);
  sql(`update licenses set status = 'withdrawn', updated_at = now() where id in (${L1}, ${L2})`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where queue = 'lic' and status = 'open' and subject_id in ('${L1}', '${L2}')`);
  if (sinArchivo.size) console.log(`  · aviso: ${sinArchivo.size} fotos de barberías de pruebas anteriores sin archivo en el almacenamiento local (no son de este grupo)`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4ig');
})().catch((e) => { console.error(e); process.exit(1); });
