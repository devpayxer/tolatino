// 4t · Fiestas: Lo que vendes con «Calendario y depósito», servicio de paquete (horas, invitados, montaje, lo que incluye),
// por unidad (unidad e invitados por unidad), marcar y liberar un sábado, depósito y filtros derivados (Libre este sábado),
// Super Admin 360 en solo lectura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'salon-imperial';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  const sab = sql(`select (h + ((6 - extract(dow from h)::int + 7) % 7))::text from (select (now() at time zone 'America/New_York')::date as h) z`);
  sql(`update party_days set removed_at = now() where business_id = '${F}' and day = '${sab}'::date and source = 'manual' and removed_at is null`);
  sql(`update fiesta_settings set deposit_cents = 50000 where business_id = '${F}'`);
  sql(`update items set removed_at = now() where business_id = '${F}' and name->>'es' in ('Paquete prueba', 'Sillas prueba') and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550311');
  h.on('pageerror', e => err.push(e.message)); h.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const det = h.locator('[data-screen-label="Panel v2 · detalle"]');

  // ── 1. Lo que vendes: Servicios + Calendario y depósito ──
  await h.goto(B + `/panel/${F}/vendes`); ok(await espera(h.getByText('Calendario y depósito')) && await espera(h.getByText(/depósito \$500 · hasta 250 invitados/)), 'Lo que vendes: Calendario y depósito con su resumen');
  await h.goto(B + `/panel/${F}/vendes/herramienta`); await h.getByText('Depósito para apartar la fecha').first().waitFor();
  await h.screenshot({ path: OUT + 'f1-herramienta-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Depósito para apartar la fecha +' })); await h.getByText(/Guardado/).first().waitFor();
  ok(await esperaV(() => sql(`select deposit_cents from fiesta_settings where business_id = '${F}'`), '55000') === '55000', 'depósito +$50 → $550 (guardado en el servidor)');
  ok(sql(`select count(*) from audit_entries where action = 'fiesta.herramienta' and target_id = '${F}' and at > now() - interval '1 minute'`) !== '0', 'auditoría del cambio');

  // ── 2. Marcar este sábado ocupado → el filtro «Libre este sábado» se va; liberarlo → vuelve ──
  sql(`select 1`);
  await h.goto(B + `/panel/${F}/vendes/herramienta`); await h.getByText('Depósito para apartar la fecha').first().waitFor();
  const libreAntes = sql(`select 'd:sab' = any(filter_values) from businesses where id = '${F}'`);
  const chip = h.getByRole('button', { name: new RegExp('^sáb ' + Number(sab.slice(8)) + ' ') });
  await clic(chip); await h.getByText(/Ocupada el sáb/).first().waitFor();
  ok(await esperaV(() => sql(`select count(*) from party_days where business_id = '${F}' and day = '${sab}'::date and source = 'manual' and removed_at is null`), '1') === '1', `sábado ${sab} marcado ocupado`);
  ok(sql(`select 'd:sab' = any(filter_values) from businesses where id = '${F}'`) === 'f', 'filtro: ya no sale en «Libre este sábado»' + ` (antes: ${libreAntes})`);
  await clic(chip); await h.getByText(/Libre el sáb/).first().waitFor();
  ok(await esperaV(() => sql(`select 'd:sab' = any(filter_values) from businesses where id = '${F}'`), 't') === 't', 'liberado: vuelve a «Libre este sábado»');

  // ── 3. Servicio de paquete y por unidad ──
  await h.goto(B + `/panel/${F}/vendes/servicios?det=svc:new`); await det.getByText('Nuevo servicio').first().waitFor();
  ok(await espera(det.getByText('CÓMO LO COBRAS')) && await espera(det.getByText('Paquete', { exact: true })), 'editor: cómo lo cobras de Fiestas (Paquete, Por hora, Por unidad…)');
  await (await vis(det.getByPlaceholder(/Ej\. /).first())).fill('Paquete prueba');
  await clic(det.getByRole('button', { name: 'Horas del paquete +' }));
  await (await vis(det.getByPlaceholder('250', { exact: true }))).fill('180');
  await clic(det.getByText('Montaje incluido', { exact: true }));
  await (await vis(det.locator('textarea').last())).fill('Mesas y sillas\nPista de baile');
  await (await vis(det.getByPlaceholder('0', { exact: true }).first())).fill('1500');
  await h.screenshot({ path: OUT + 'f2-servicio-paquete-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(800);
  ok(await esperaV(() => sql(`select svc_kind || '|' || price_cents || '|' || (svc_attrs->>'h') || '|' || (svc_attrs->>'cap') || '|' || (svc_attrs->>'mont') || '|' || jsonb_array_length(svc_attrs->'inc') from items where business_id = '${F}' and name->>'es' = 'Paquete prueba' and removed_at is null`), 'pack|150000|5|180|true|2') === 'pack|150000|5|180|true|2', 'paquete guardado: 5 h, 180 invitados, montaje, 2 cosas incluidas');
  ok(sql(`select 'paquete' = any(filter_values) and 'montaje' = any(filter_values) from businesses where id = '${F}'`) === 't', 'filtros derivados: paquete y montaje');
  await h.goto(B + `/panel/${F}/vendes/servicios?det=svc:new`); await det.getByText('Nuevo servicio').first().waitFor();
  await (await vis(det.getByPlaceholder(/Ej\. /).first())).fill('Sillas prueba');
  await clic(det.getByText('Por unidad', { exact: true }));
  await (await vis(det.getByPlaceholder('0', { exact: true }).first())).fill('3');
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(600);
  ok(await espera(h.getByText(/Escribe la unidad/)), 'por unidad sin unidad: no deja guardar');
  await (await vis(det.getByPlaceholder(/juego, mantel/))).fill('silla');
  await (await vis(det.getByPlaceholder('8', { exact: true }))).fill('1');
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(800);
  ok(await esperaV(() => sql(`select svc_kind || '|' || (svc_attrs->'u'->>'es') || '|' || (svc_attrs->>'per') from items where business_id = '${F}' and name->>'es' = 'Sillas prueba' and removed_at is null`), 'unid|silla|1') === 'unid|silla|1', 'por unidad guardado: silla, 1 invitado por unidad');

  // ── 4. Super Admin 360 ──
  const a = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(a, '5705550199');
  await a.goto(B + `/admin/negocios/${F}?tab=vende`);
  ok(await espera(a.getByText('Calendario y depósito')) && await espera(a.getByText(/depósito \$550/)) && await espera(a.getByText('Paquete').first()), 'Super Admin 360: herramienta en solo lectura y cómo cobra cada servicio');
  await a.screenshot({ path: OUT + 'f3-admin-360-d.png', fullPage: true });
  sql(`update fiesta_settings set deposit_cents = 50000 where business_id = '${F}'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fie4t');
})().catch((e) => { console.error(e); process.exit(1); });
