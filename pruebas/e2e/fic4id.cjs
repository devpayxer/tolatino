// 4id · Fichas de Iglesias, Bienes Raíces y Venta de Autos y sus páginas de categoría (teléfono 390 y escritorio 1360).
// Iglesia: la próxima misa sale de worship_times, «Gratis», nada se cobra, la funeraria «Pedir información» = contacto sin presión.
// Renta: «Para mudarte» = move_in_cents de la base, pie de igualdad de oportunidad y nota de animales de servicio; un cuarto muestra la
// zona y su dirección exacta NO está en el HTML. Venta: «estimada». Dealer: en la puerta = otd_cents, el pago con APR, meses y enganche,
// la línea del salvage. Free y las tres categorías con su cifra. La prueba deja la base como estaba (se puede volver a correr).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const { requiere } = require('../lib/requiere.cjs');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const ve = async (l) => { for (let i = 0; i < 24; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const usd = (c) => '$' + Math.round(c / 100).toLocaleString('en-US');
const hora = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };
const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
(async () => {
  // El carro salvage de prueba (oculto por el equipo en 4ic) se muestra solo durante la prueba.
  // 9b-3 · El carro salvage lo crea autos4ic de punta a punta: si no está (otro orden, base nueva), se corre (antes se daba por hecho).
  const salv = requiere('autos4ic', () => sql(`select i.id from vehicle_listings v join items i on i.id = v.item_id where v.business_id = 'autos-el-cibao' and v.title = 'salvage' and i.removed_at is null limit 1`), { que: 'el carro salvage de autos-el-cibao' });
  const salvSt = salv ? sql(`select status from items where id = ${salv}`) : '';
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage(); m.on('pageerror', (e) => err.push(e.message));
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message));
  try {
    // ── Iglesia: la próxima misa desde worship_times con la hora de la ciudad. ──
    const [dow, min] = sql(`select extract(dow from now() at time zone timezone)::int || '|' || (extract(hour from now() at time zone timezone) * 60 + extract(minute from now() at time zone timezone))::int from cities where id = 'hzl'`).split('|').map(Number);
    const misas = sql(`select dow || '|' || start_min from worship_times where business_id = 'parroquia-santa-maria' and removed_at is null and kind = 'misa'`).split('\n').filter(Boolean).map((x) => x.split('|').map(Number));
    let best = null; for (const [w, s] of misas) { let dd = (w - dow + 7) % 7; if (dd === 0 && s <= min) dd = 7; if (!best || dd < best.dd || (dd === best.dd && s < best.s)) best = { dd, w, s }; }
    const esperado = best.dd === 0 ? `Hoy ${hora(best.s)}` : best.dd === 1 ? `Mañana ${hora(best.s)}` : `${DIA[best.w]} ${hora(best.s)}`;
    await m.goto(`${B}/n/parroquia-santa-maria`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText('PRÓXIMA MISA').first()) && await ve(m.getByText(esperado, { exact: true }).first()), `Iglesia: PRÓXIMA MISA «${esperado}» sale de worship_times`);
    ok(await ve(m.getByText('¿HAY QUE INSCRIBIRSE?')) && await ve(m.getByText('No: llegas al servicio')), 'Iglesia: «¿HAY QUE INSCRIBIRSE? No: llegas al servicio»');
    ok(await ve(m.getByText('Gratis', { exact: true }).first()), 'Iglesia: «Gratis» en la misa');
    const html = await m.content();
    ok(html.includes('La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.'), 'Iglesia: la línea fija verbatim');
    ok(html.includes('SI NO PUEDES, NO SE COBRA'), 'Iglesia: el donativo dice «si no puedes, no se cobra»');
    ok(!/Pagar|Pay now|Retener|tarjeta de crédito|Donar ahora/i.test(await m.innerText('body')), 'Iglesia: ningún cobro, pago ni donación en la página');
    await m.screenshot({ path: OUT + 'f4id-iglesia-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Misas y sacramentos' }).or(m.getByText('Misas y sacramentos', { exact: true })));
    await clic(m.getByText('Bautizo', { exact: true }));
    ok(await ve(m.getByText(/El donativo es sugerido: si no puedes, no se cobra/)), 'Iglesia: la hoja del bautizo (donativo sugerido, nunca se cobra)');
    ok(!(await vis(m.getByRole('button', { name: /Pagar|Donar/ }))), 'Iglesia: la hoja no tiene botón de pagar');
    await m.screenshot({ path: OUT + 'f4id-iglesia-hoja-m.png' });
    await d.goto(`${B}/n/parroquia-santa-maria`); await d.waitForLoadState('networkidle'); await d.screenshot({ path: OUT + 'f4id-iglesia-d.png', fullPage: true });
    // Funeraria: «Pedir información» = contacto, sin presión.
    await m.goto(`${B}/n/funeraria-la-paz`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText('¿ME DAN EL PRECIO ANTES?')) && await ve(m.getByText('Sí, el total por escrito')), 'Funeraria: «¿ME DAN EL PRECIO ANTES?»');
    await clic(m.locator('[data-screen-label="Ficha · barra de iglesia"]').getByRole('button', { name: 'Pedir información' }));
    ok(await ve(m.getByText('SIN PRESIÓN')) && await ve(m.getByText(/La familia decide con calma/)), 'Funeraria: «Pedir información» abre el contacto con «Sin presión»');
    ok(await ve(m.getByRole('button', { name: 'Llamar' }).last()) && await ve(m.getByRole('button', { name: 'Escribir' })), 'Funeraria: llamar o escribir (nada se cobra ni se agenda)');
    await m.screenshot({ path: OUT + 'f4id-funeraria-contacto-m.png' });

    // ── Renta: «Para mudarte» = move_in_cents de la base; EHO y animales de servicio. ──
    const [pid, pnom, mv, rent, dep] = sql(`select i.id || '|' || (i.name->>'es') || '|' || pl.move_in_cents || '|' || pl.rent_cents || '|' || pl.deposit_cents from property_listings pl join items i on i.id = pl.item_id where pl.business_id = 'rentas-hazleton-latino' and pl.status = 'available' and i.status = 'live' and i.removed_at is null and pl.kind = 'apto' order by i.sort, i.id limit 1`).split('|');
    await m.goto(`${B}/n/rentas-hazleton-latino?tab=svc`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText('¿PIDEN SEGURO SOCIAL?')), 'Renta: «¿PIDEN SEGURO SOCIAL?»');
    ok(await ve(m.getByText('IGUALDAD DE OPORTUNIDAD EN LA VIVIENDA')), 'Renta: el pie de igualdad de oportunidad bajo la lista');
    await clic(m.getByText(pnom, { exact: true }));
    const caja = `Para mudarte: ${usd(+rent)} + depósito ${usd(+dep)}`;
    ok(await ve(m.getByText(new RegExp(`^${caja.replace(/[$+]/g, '\\$&')}.*= ${usd(+mv).replace('$', '\\$')}$`))), `Renta: hoja «${caja} … = ${usd(+mv)}» (= move_in_cents)`);
    ok(await ve(m.getByText('Los animales de servicio y de apoyo no son mascotas: se aceptan siempre.').last()) && await ve(m.getByText('IGUALDAD DE OPORTUNIDAD EN LA VIVIENDA').last()), 'Renta: la hoja lleva el pie y la nota de animales de servicio');
    ok(await ve(m.getByText('Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.').last()), 'Renta: la hoja dice «Nunca pagues un depósito…»');
    await m.screenshot({ path: OUT + 'f4id-renta-hoja-m.png' });
    await d.goto(`${B}/n/rentas-hazleton-latino?tab=svc`); await d.waitForLoadState('networkidle'); await clic(d.getByText(pnom, { exact: true })); await d.screenshot({ path: OUT + 'f4id-renta-hoja-d.png' });
    // Cuarto: la zona, nunca la dirección exacta.
    const calles = sql(`select distinct addr_line from property_listings where business_id = 'cuartos-dona-mary' and not addr_public and addr_line is not null`).split('\n').filter(Boolean);
    ok(calles.length > 0, `Cuarto: hay ${calles.length} dirección(es) privada(s) en la base`);
    await m.goto(`${B}/n/cuartos-dona-mary`); await m.waitForLoadState('networkidle');
    let h = await m.content();
    ok(calles.every((c) => !h.includes(c)), `Cuarto: «${calles[0]}» NO está en el HTML de la ficha`);
    ok(await ve(m.getByText('LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA')), 'Cuarto: «LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA»');
    await m.screenshot({ path: OUT + 'f4id-cuarto-m.png', fullPage: true });
    await m.goto(`${B}/n/cuartos-dona-mary?tab=svc`); await m.waitForLoadState('networkidle');
    await clic(m.getByRole('button', { name: 'Pedir visita' }).first());
    ok(await ve(m.getByText('ZONA', { exact: true })) && await ve(m.getByText('La dirección exacta te llega cuando aceptan la visita.')), 'Cuarto: la hoja dice la zona y que la dirección llega al aceptar');
    h = await m.content(); ok(calles.every((c) => !h.includes(c)), 'Cuarto: ni en la hoja');
    await m.screenshot({ path: OUT + 'f4id-cuarto-hoja-m.png' });
    // Venta: la cuota siempre «estimada».
    await m.goto(`${B}/n/realty-bilingue-hzl?tab=svc`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText(/CUOTA ESTIMADA \$[\d,]+ AL MES/).first()), 'Venta: la fila dice «CUOTA ESTIMADA … AL MES»');
    await clic(m.getByRole('button', { name: 'Pedir visita' }).first());
    ok(await ve(m.getByText(/^Cuota estimada \$[\d,]+ al mes con \d+ % de enganche$/)), 'Venta: la hoja dice «Cuota estimada $X al mes con N % de enganche»');
    await m.screenshot({ path: OUT + 'f4id-venta-hoja-m.png' });

    // ── Dealer: en la puerta = otd_cents; pago con APR, meses y enganche; la línea del salvage. ──
    if (salv) sql(`update items set status = 'live' where id = ${salv}`);
    const [cid, cnom, otd, apr, mes, eng, pago] = sql(`select i.id || '|' || (i.name->>'es') || '|' || v.otd_cents || '|' || v.est_apr_bp || '|' || v.est_months || '|' || v.est_down_cents || '|' || v.est_payment_cents from vehicle_listings v join items i on i.id = v.item_id where v.business_id = 'autos-el-cibao' and v.status = 'lot' and v.title = 'limpio' and v.est_payment_cents is not null and i.status = 'live' and i.removed_at is null order by v.price_cents limit 1`).split('|');
    await m.goto(`${B}/n/autos-el-cibao?tab=svc`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText('¿CUÁNTO PAGO EN TOTAL?')) && await ve(m.getByText(/^Precio \+ 6 % \+ placas \+ cargo$/)), 'Dealer: «¿CUÁNTO PAGO EN TOTAL? Precio + 6 % + placas + cargo» (el 6 % de tax_rules)');
    ok(await ve(m.getByText(/^Título salvage: no se maneja en la calle hasta pasar la inspección de PA\.$/).first()), 'Dealer: la fila del salvage lleva su línea');
    await clic(m.getByText(cnom, { exact: true }));
    ok(await ve(m.getByText(usd(+otd), { exact: true }).first()), `Dealer: en la puerta ${usd(+otd)} (= otd_cents)`);
    const pl = `Pago de ejemplo: ${usd(+pago)} al mes con ${usd(+eng)} de enganche, ${mes} meses al ${(apr / 100).toFixed(2).replace(/\.?0+$/, '')} % APR (estimado, sujeto a aprobación)`;
    ok(await ve(m.getByText(pl, { exact: true })), `Dealer: «${pl}»`);
    await m.screenshot({ path: OUT + 'f4id-dealer-hoja-m.png' });
    await m.keyboard.press('Escape').catch(() => {});
    if (salv) {
      await m.goto(`${B}/n/autos-el-cibao?tab=svc`); await m.waitForLoadState('networkidle');
      await clic(m.getByText(sql(`select name->>'es' from items where id = ${salv}`), { exact: true }));
      ok(await ve(m.getByText('Título salvage: no se maneja en la calle hasta pasar la inspección de PA.').last()), 'Dealer: la hoja del salvage dice su línea');
      await m.screenshot({ path: OUT + 'f4id-dealer-salvage-m.png' });
    }
    await d.goto(`${B}/n/autos-el-cibao`); await d.waitForLoadState('networkidle'); await d.screenshot({ path: OUT + 'f4id-dealer-d.png', fullPage: true });
    await d.goto(`${B}/n/autos-el-cibao?tab=svc`); await d.waitForLoadState('networkidle'); await clic(d.getByText(cnom, { exact: true })); await d.screenshot({ path: OUT + 'f4id-dealer-hoja-d.png' });
    // Compre aquí pague aquí: el total pagado con su tasa.
    await m.goto(`${B}/n/compre-aqui-hzl?tab=svc`); await m.waitForLoadState('networkidle');
    await clic(m.getByRole('button', { name: 'Prueba de manejo' }).first());
    ok(await ve(m.getByText(/^Sin crédito: \$[\d,]+ de enganche y \$\d+ a la semana por \d+ meses \(\d+ pagos\)\. Total pagado: \$[\d,]+ · [\d.]+ % APR \(estimado, sujeto a aprobación\)$/)), 'Compre aquí: enganche, pago, semanas, total pagado y APR juntos');
    await m.screenshot({ path: OUT + 'f4id-bhph-hoja-m.png' });

    // ── Free: llamar; la fila no abre hoja; la propiedad Free también lleva el pie. ──
    await m.goto(`${B}/n/iglesia-bautista-hispana`); await m.waitForLoadState('networkidle');
    ok(await ve(m.getByText('Ve al servicio')), 'Iglesia Free: «Ve al servicio»');
    await m.screenshot({ path: OUT + 'f4id-iglesia-free-m.png', fullPage: true });
    await m.goto(`${B}/n/locales-centro`); await m.waitForLoadState('networkidle');
    // 4ie (§6 #6): Free recibe solicitudes (10 al mes): la fila va directo a pedir (sin hoja) y la barra sigue siendo llamar.
    ok(!!(await vis(m.getByRole('button', { name: 'Pedir visita' }))) && await ve(m.getByText('Pide la visita o la cita aquí, o llama al lugar.')) && !(await vis(m.getByRole('dialog'))), 'Bienes Raíces Free: «Pedir visita» va directo (sin hoja) o llama');
    ok(await ve(m.getByText('IGUALDAD DE OPORTUNIDAD EN LA VIVIENDA')), 'Bienes Raíces Free: el pie de igualdad de oportunidad');
    ok(!(await m.content()).includes('AQUÍ NO SE PIDE CITA POR LA APP'), 'Free: no promete que nunca se pedirá por la app');
    await m.screenshot({ path: OUT + 'f4id-inm-free-m.png', fullPage: true });
    await m.goto(`${B}/n/lote-la-81`); await m.waitForLoadState('networkidle');
    ok(!!(await vis(m.getByRole('button', { name: 'Prueba de manejo' }))) && await ve(m.getByText(/EN LA PUERTA \$/)), 'Autos Free: el total en la puerta y «Prueba de manejo» (4ie)');
    await m.screenshot({ path: OUT + 'f4id-autos-free-m.png', fullPage: true });

    // ── Las tres categorías con su cifra (de filter_values). ──
    for (const [slug, cat, tag, label] of [['iglesias', 'NEG-FE', 'esp', 'EN ESPAÑOL'], ['bienes-raices', 'NEG-INMUEBLE', 'sinssn', 'SIN SEGURO SOCIAL'], ['venta-de-autos', 'NEG-DEALER', 'itin', 'CON ITIN']]) {
      const n = +sql(`select count(*) from businesses where category_id = '${cat}' and status = 'active' and city_id = 'hzl' and filter_values @> '{${tag}}'`);
      await d.goto(`${B}/c/${slug}`); await d.waitForLoadState('networkidle');
      const t = await d.innerText('body'), mm = new RegExp(`(\\d+) ${label}`).exec(t);
      ok(mm && +mm[1] > 0 && +mm[1] <= n, `/c/${slug}: «${mm?.[0]}» (base: ${n} con «${tag}»)`);
      await d.screenshot({ path: OUT + `f4id-cat-${slug}-d.png` });
      await m.goto(`${B}/c/${slug}`); await m.waitForLoadState('networkidle'); await m.screenshot({ path: OUT + `f4id-cat-${slug}-m.png`, fullPage: true });
    }
    await m.goto(`${B}/c/iglesias`); await m.waitForLoadState('networkidle');
    ok(!(await vis(m.getByRole('button', { name: 'Inscribirme' }))), 'Categoría Iglesias: la tarjeta no dice «Inscribirme»');
  } finally {
    if (salv) sql(`update items set status = '${salvSt}' where id = ${salv}`);
  }
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fic4id');
})().catch((e) => { console.error(e); process.exit(1); });
