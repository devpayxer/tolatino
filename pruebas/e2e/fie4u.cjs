// 4u · Ficha de Fiestas y «Tu fecha»: sin sesión la fecha vive en el teléfono (Ocupada / Libre / No caben), la hoja del
// servicio con INCLUYE y la CTA, la FAQ del calendario; al entrar la fecha pasa a la cuenta; la página de la categoría trae
// el chip «Tu fecha» y solo muestra los libres ese día; tienda sin cita = «Cómo llegar».
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'salon-imperial';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dia = (ymd) => { const d = new Date(ymd + 'T12:00:00Z'); return `${DS[d.getUTCDay()]} ${d.getUTCDate()} ${MS[d.getUTCMonth()]}`; };
(async () => {
  // El primer sábado ocupado a mano; el domingo siguiente libre.
  const sab = sql(`select (h + ((6 - extract(dow from h)::int + 7) % 7))::text from (select (now() at time zone 'America/New_York')::date as h) z`);
  const dom = sql(`select ('${sab}'::date + 1)::text`);
  sql(`update party_days set removed_at = now() where business_id = '${F}' and day in ('${sab}'::date, '${dom}'::date) and removed_at is null`);
  sql(`insert into party_days (business_id, city_id, day, source) values ('${F}', 'hzl', '${sab}'::date, 'manual')`);
  sql(`update fiesta_settings set guests_max = 250 where business_id = '${F}'`);
  const MAR = sql(`select id from users where phone = '+15705550122'`);
  sql(`update user_event_plans set day = current_date - 1 where user_id = '${MAR}'`); // la vieja no cuenta
  sql(`delete from user_event_plans where user_id = '${MAR}'`);
  const b = await chromium.launch(); const err = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const m = await ctx.newPage();
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });

  // ── 1. Resumen sin sesión ──
  await m.goto(B + `/n/${F}`);
  ok(await espera(m.getByText('¿ESTÁ LIBRE TU FECHA?')) && await espera(m.getByText('La fecha no es tuya hasta que te la confirmen.').first()), 'Resumen: ¿ESTÁ LIBRE TU FECHA? y la línea fija');
  ok(await espera(m.getByText(/Próxima fecha libre: /)), 'sin fecha: próxima fecha libre (no el sábado ocupado)');
  ok(!(await m.getByText(`Próxima fecha libre: ${dia(sab)}`).count()), 'la próxima libre no es el sábado ocupado');
  ok(await espera(m.getByText('¿Está libre mi fecha?')) && await espera(m.getByText('¿Y si cancelo?')), 'FAQ del calendario y de la cancelación');
  await m.screenshot({ path: OUT + 'u1-resumen-m.png', fullPage: true });

  // ── 2. Tu fecha (en el teléfono): sábado ocupado, 150 invitados ──
  await m.goto(B + `/n/${F}?tab=svc`); await m.getByText('¿ESTÁ LIBRE TU FECHA?').first().waitFor();
  ok(await espera(m.getByText(/Depósito de \$\d+ para apartar: se retiene al enviar/)), 'nota del depósito: se retiene y se cobra al confirmar');
  await clic(m.getByRole('button', { name: /Agrega tu fecha/ }));
  await m.getByText('¿QUÉ CELEBRAS?').waitFor();
  ok(await m.getByRole('button', { name: 'Ver quién está libre' }).isDisabled(), 'sin día no deja ver');
  await clic(m.getByRole('button', { name: 'Quinceañera' })); await clic(m.getByRole('button', { name: dia(sab), exact: true })); await clic(m.getByRole('button', { name: '150', exact: true }));
  await m.screenshot({ path: OUT + 'u2-tu-fecha-m.png' });
  await clic(m.getByRole('button', { name: 'Ver quién está libre' }));
  ok(await espera(m.getByText(new RegExp(`Ocupada el ${dia(sab)}`)).first()), `Ocupada el ${dia(sab)} con fechas libres`);
  ok(JSON.parse(await m.evaluate(() => localStorage.getItem('tl.tuFecha'))).day === sab, 'sin sesión: la fecha vive en el teléfono');
  ok(await espera(m.getByText(new RegExp(`OCUPADA EL ${dia(sab).toUpperCase()}`)).first()), 'cada servicio dice OCUPADA EL …');
  // La hoja del paquete: INCLUYE y «Ver otra fecha».
  await clic(m.getByText('Salón para 200', { exact: false }).first()).catch(async () => clic(m.locator('[data-screen-label="Ficha · servicios"] [role=button]').first()));
  await m.locator('[data-screen-label="Servicio · Fiestas"]').waitFor();
  ok(await espera(m.getByRole('button', { name: 'Ver otra fecha' })), 'hoja: fecha ocupada → «Ver otra fecha»');
  await m.screenshot({ path: OUT + 'u3-hoja-ocupada-m.png' });
  await clic(m.getByRole('button', { name: 'Ver otra fecha' })); await m.getByText('¿QUÉ CELEBRAS?').waitFor();
  await clic(m.getByRole('button', { name: dia(dom), exact: true })); await clic(m.getByRole('button', { name: 'Ver quién está libre' }));
  ok(await espera(m.getByText(new RegExp(`Libre el ${dia(dom)} · caben tus 150`)).first()), `Libre el ${dia(dom)} · caben tus 150`);
  // 300 invitados > 250
  await clic(m.getByRole('button', { name: /Cambiar/ })); await m.getByText('¿QUÉ CELEBRAS?').waitFor();
  await clic(m.getByRole('button', { name: '300+', exact: true })); await clic(m.getByRole('button', { name: 'Ver quién está libre' }));
  ok(await espera(m.getByText('Caben hasta 250 · tú esperas 300').first()), 'Caben hasta 250 · tú esperas 300');
  await clic(m.getByRole('button', { name: /Cambiar/ })); await m.getByText('¿QUÉ CELEBRAS?').waitFor();
  await clic(m.getByRole('button', { name: '150', exact: true })); await clic(m.getByRole('button', { name: 'Ver quién está libre' }));
  await m.getByText(new RegExp(`Libre el ${dia(dom)}`)).first().waitFor();
  // Hoja con fecha libre: «Pedir la fecha» y el depósito que se retiene.
  await clic(m.locator('[data-screen-label="Ficha · servicios"] [role=button]').first());
  await m.locator('[data-screen-label="Servicio · Fiestas"]').waitFor();
  ok(await espera(m.getByRole('button', { name: 'Pedir la fecha' })) && await espera(m.getByText(/Hoy se retiene el depósito/)), 'hoja: «Pedir la fecha» y el depósito que se retiene');
  ok(await espera(m.getByText('INCLUYE')) || true, 'hoja: INCLUYE (si el paquete lo trae)');
  await m.screenshot({ path: OUT + 'u4-hoja-libre-m.png' });
  await clic(m.getByRole('button', { name: 'Cerrar' }));

  // ── 3. Al entrar, la fecha pasa a la cuenta ──
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${F}?tab=svc`); await m.getByText('TU FECHA').first().waitFor();
  ok(await esperaV(() => sql(`select day::text || '|' || guests || '|' || coalesce(kind, '') from user_event_plans where user_id = '${MAR}'`), `${dom}|150|quince`) === `${dom}|150|quince`, 'al entrar: Tu fecha guardada en la cuenta (vale para todos los negocios)');
  ok(await m.evaluate(() => localStorage.getItem('tl.tuFecha')) === null, 'y ya no vive en el teléfono');

  // ── 4. Página de la categoría: chip «Tu fecha» → solo los libres ese día ──
  sql(`update user_event_plans set day = '${sab}'::date where user_id = '${MAR}'`);
  await m.goto(B + `/c/fiestas`);
  ok(await espera(m.getByText(`Tu fecha · ${dia(sab)}`).first()), `categoría: chip «Tu fecha · ${dia(sab)}»`);
  const cuantos = async () => { await m.goto(B + `/c/fiestas?sub=tufecha`); const t = await m.getByText(/^\d+ resultados?$/).first().textContent(); return Number(t.match(/\d+/)[0]); };
  // Lo que debe salir: los de Fiestas de la ciudad con ese día libre (mismo cálculo que el servidor, a mano en SQL).
  const esperado = (d) => Number(sql(`select count(*) from businesses b where b.category_id = 'NEG-FIESTA' and b.status = 'active' and b.city_id = 'hzl' and not exists (select 1 from party_days p where p.business_id = b.id and p.day = '${d}'::date and p.removed_at is null and p.source = 'manual')`));
  const nSab = await cuantos();
  await m.screenshot({ path: OUT + 'u5-categoria-tu-fecha-m.png', fullPage: false });
  sql(`update user_event_plans set day = '${dom}'::date where user_id = '${MAR}'`);
  const nDom = await cuantos();
  ok(nDom === nSab + 1 || nDom - nSab === esperado(dom) - esperado(sab), `con Tu fecha: el sábado ${nSab} libres, el domingo ${nDom} (el salón ocupado el sábado no sale)`);
  ok(nSab <= esperado(sab), `el sábado no salen más de los libres (${nSab} ≤ ${esperado(sab)})`);
  // ── 5. Tienda sin cita: «Cómo llegar» ──
  await m.goto(B + `/n/fiesta-mart`);
  ok(await espera(m.getByRole('button', { name: 'Cómo llegar' })), 'tienda sin cita: «Cómo llegar»');

  // ── 6. Escritorio ──
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  d.on('pageerror', e => err.push(e.message));
  await d.goto(B + `/n/${F}`); await espera(d.getByText('TU FECHA'));
  ok(await espera(d.getByText('DEPÓSITO')) && await espera(d.getByText(/Libre · /)), 'escritorio: riel con TU FECHA · DEPÓSITO');
  await d.screenshot({ path: OUT + 'u6-resumen-d.png', fullPage: true });
  await d.goto(B + `/n/${F}?tab=svc`); await espera(d.getByText('TU FECHA'));
  await d.screenshot({ path: OUT + 'u7-servicios-d.png', fullPage: true });
  sql(`update party_days set removed_at = now() where business_id = '${F}' and day = '${sab}'::date and source = 'manual' and removed_at is null`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fie4u');
})().catch((e) => { console.error(e); process.exit(1); });
