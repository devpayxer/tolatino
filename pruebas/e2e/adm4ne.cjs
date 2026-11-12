// 4ne · Super Admin de Noche: Transacciones › Noche (lista/mesa, noche, personas, cómo cerró, depósito) y «Devolver» un depósito;
// Colas «Sin identificación» y «Mesas no respetadas» (abiertas por la puerta real de noc4c), revisar y pausar; Analítica › Noche.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const NEG = 'la-terraza-night';
(async () => {
  const b = await chromium.launch(); const err = [];
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ad, '5705550199');
  ad.on('pageerror', e => err.push(e.message));

  // ── Transacciones › Noche ──
  await ad.goto(B + '/admin/transacciones?tab=noche');
  ok(await espera(ad.getByText(/^(Mesa|Lista) N-\d+ · La Terraza/).first()), 'pestaña Noche con reservas de noche');
  ok(await espera(ad.getByText(/no entró/).first()) || await espera(ad.getByText(/entró/).first()), 'dice cómo cerró la noche');
  ok(await espera(ad.getByText(/noche del 2026-/).first()), 'dice la noche');
  const html = await ad.content();
  const codigos = sql(`select string_agg(door_code, ',') from operations where kind = 'night' and door_code is not null`).split(',').filter(Boolean);
  ok(!codigos.some((c) => html.includes(`código ${c}`) || html.includes(`>${c}<`)), 'el código de la puerta no sale en Transacciones');
  await ad.screenshot({ path: OUT + 'n4e-tx-d.png', fullPage: true });
  // Devolver $20 de un depósito que se quedó con el local («no entró: sin identificación»).
  const N = sql(`select o.number from operations o join payments p on p.operation_id = o.id and p.kind = 'deposit' where o.kind = 'night' and o.business_id = '${NEG}' and o.status_detail = 'noid' and p.status in ('captured', 'partially_refunded') and p.amount_cents - p.refunded_cents >= 2000 order by p.refunded_cents, o.id limit 1`);
  ok(/^N-\d+$/.test(N), `depósito que se quedó, para devolver: ${N}`);
  await ad.goto(B + `/admin/transacciones?tab=noche&q=${N}`); await ad.getByText(new RegExp(`Mesa ${N}`)).first().waitFor();
  ok(await espera(ad.getByText(/no entró: sin identificación · depósito \$50\.00 (cobrado|devuelto en parte)/i).first()) , 'la fila dice «no entró» y el depósito cobrado');
  const R0 = Number(sql(`select p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${N}' and p.kind = 'deposit'`));
  const AUD = (a, t, k) => Number(sql(`select count(*) from audit_entries where action = '${a}' and ${k ?? 'target_id'} = '${t}'`));
  const aud0 = AUD('transacciones.devolver', N, "after->>'noche'");
  await clic(ad.getByRole('button', { name: 'Devolver' }));
  ok(await espera(ad.getByText(`Devolver depósito · noche ${N}`)), 'título «Devolver depósito · noche»');
  const monto = await vis(ad.getByLabel(/MONTO EN DÓLARES/)) ?? await vis(ad.locator('input').last()); await monto.fill('20');
  await clic(ad.getByText('El local no respetó la mesa.')); await clic(ad.getByRole('button', { name: 'Devolver', exact: true }).last());
  ok(await espera(ad.getByText(/Devueltos \$20\.00/)), 'Devolver desde el Super Admin funciona en una noche');
  ok(sql(`select p.refunded_cents || ':' || p.status from payments p join operations o on o.id = p.operation_id where o.number = '${N}' and p.kind = 'deposit'`) === `${R0 + 2000}:${R0 + 2000 >= 5000 ? 'refunded' : 'partially_refunded'}`, 'devueltos $20 más del depósito de $50');
  ok(AUD('transacciones.devolver', N, "after->>'noche'") === aud0 + 1, 'queda en la auditoría como noche');

  // ── Colas › Sin identificación (abierta por la puerta real: 3+ en 30 noches) ──
  const QN = sql(`select id from queue_items where queue = 'noid' and subject_id = '${NEG}' and status = 'open'`);
  const QM = sql(`select id from queue_items where queue = 'mesa' and subject_id = '${NEG}' and status = 'open'`);
  ok(!!QN && !!QM, `las dos colas se abrieron solas (noid ${QN}, mesa ${QM})`);
  // 9a · En la lista general (cientos de casos abiertos en la base local) pueden no caber en la primera página: cada una en su cola.
  await ad.goto(B + '/admin/colas?cola=noid'); const v1 = await espera(ad.getByText(/Sin identificación · La Terraza/).first());
  await ad.goto(B + '/admin/colas?cola=mesa'); const v2 = await espera(ad.getByText(/Mesas no respetadas · La Terraza/).first());
  ok(v1 && v2, 'las dos salen en su cola');
  await ad.goto(B + `/admin/colas?cola=noid&caso=${QN}`); await ad.getByText('CADA NOCHE').first().waitFor();
  ok(await espera(ad.getByText('EN 30 NOCHES').first()) && await espera(ad.getByText(/No entró: sin identificación/).first()), 'el caso lista cada noche «sin identificación»');
  ok(await espera(ad.getByText(/devuelto \$20/).first()), 'y lo devuelto desde Transacciones');
  await ad.screenshot({ path: OUT + 'n4e-cola-noid-d.png', fullPage: true });
  const aud1 = AUD('noche.cola_revisado', QN);
  await clic(ad.getByRole('button', { name: 'Revisado, sin cambios' })); await clic(ad.getByText('Los depósitos ya se devolvieron.'));
  await clic(ad.getByRole('button', { name: 'Cerrar el caso' }));
  ok(await espera(ad.getByText(/Caso cerrado como revisado/).first()), 'revisado, sin cambios');
  ok(sql(`select status || ':' || decision from queue_items where id = ${QN}`) === 'decided:revisado', 'el caso queda decidido');
  ok(AUD('noche.cola_revisado', QN) === aud1 + 1, 'auditoría con motivo');

  // ── Colas › Mesas no respetadas → pausar mesas y lista ──
  await ad.goto(B + `/admin/colas?cola=mesa&caso=${QM}`); await ad.getByText('CADA NOCHE').first().waitFor();
  ok(await espera(ad.getByText(/Canceló el local una mesa confirmada/).first()), 'el caso lista las mesas que canceló el local');
  await ad.screenshot({ path: OUT + 'n4e-cola-mesa-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Pausar mesas y lista' })); await clic(ad.getByText('Canceló mesas confirmadas varias noches.'));
  await clic(ad.getByRole('button', { name: 'Pausar', exact: true }));
  ok(await espera(ad.getByText(/Mesas y lista en pausa/).first()), 'mesas y lista en pausa');
  ok(sql(`select modules_off ? 'rsv' from businesses where id = '${NEG}'`) === 't', 'modules_off.rsv puesto');
  // La ficha deja de ofrecer reservar (el servidor decide).
  const c = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  const MESA = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'mesa' and removed_at is null limit 1`);
  await c.goto(B + `/n/${NEG}/noche?s=${MESA}&p=2`); await c.waitForURL(/tab=svc/);
  ok(!(await vis(c.getByText('¿CUÁNTOS VAN?'))), 'en pausa: pedir mesa ya no abre');
  await c.goto(B + `/n/${NEG}`); await c.waitForLoadState('networkidle'); await c.screenshot({ path: OUT + 'n4e-ficha-pausa-d.png' });
  // Volver a abrirlas (Negocios 360°) para no ensuciar las otras pruebas, y comprobar que vuelve.
  sql(`update businesses set modules_off = modules_off - 'rsv' where id = '${NEG}'`);
  await c.goto(B + `/n/${NEG}/noche?s=${MESA}&p=2`);
  ok(await espera(c.getByText('¿CUÁNTOS VAN?')), 'reanudado: pedir mesa abre otra vez');

  // ── Analítica › Noche ──
  await ad.goto(B + '/admin/analitica?tab=no'); await ad.getByText('CONFIRMADAS EN 60 MIN').first().waitFor();
  for (const t of ['SOLICITUDES DE MESA', 'VENCIDAS SIN RESPUESTA', 'MESAS NO RESPETADAS', 'DEPÓSITOS', 'DE LA LISTA ENTRÓ', 'EL COVER SUBIÓ DESPUÉS DE PUBLICADO', '«LA FILA, COMO DECÍA»', '«COBRARON MÁS COVER» POR CADA 100', 'LICENCIAS DE LICOR VENCIDAS']) ok(await espera(ad.getByText(t).first()), `Analítica: ${t}`);
  const nm = sql(`select count(*) from operations where kind = 'night' and details->>'k' <> 'lista' and sent_at > now() - interval '30 days'`);
  ok(await espera(ad.getByText(new RegExp(`^${nm}$`)).first()), `solicitudes de mesa = ${nm} (lo mismo que la base)`);
  await ad.screenshot({ path: OUT + 'n4e-analitica-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4ne');
})().catch((e) => { console.error(e); process.exit(1); });
