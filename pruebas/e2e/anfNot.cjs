// AO 5b · Noticias de las voces de la casa por RSS/Atom (lib/noticias-lector.ts, lib/compa/noticias.ts). Teléfono 390 y escritorio 1360.
// Todo contra el servidor de mentira de scripts/proveedores-sim (NOTICIAS_RSS_BASE): nunca sale a internet.
// 1 el Super Admin da de alta una fuente desde Contenido › Anfitriones › Fuentes (la que resuelve a una IP privada se rechaza al guardar) y «Probar»
// enseña cuántas notas trajo · 2 el barrido lee la fuente buena con 3 notas una vez; la del suceso violento queda descartada con su motivo ·
// 3 Yadira publica UNA nota, con su marca «Anfitriona» y el enlace al medio (noopener, nofollow), por la puerta de siempre · 4 en la segunda
// pasada no se repite ninguna nota y, con el cupo de la ciudad usado, no publica otra · 5 las fuentes malas (redirige a 127.0.0.1, entrega 5 MB,
// XML con entidad externa, servidor que resuelve a 10.x) se rechazan sin tumbar el barrido, con el error a la vista y su espera creciente; la
// de la IP privada nunca se pide · 6 un vecino no puede publicar con enlace (la base lo cierra). Deja todo como estaba.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process');
const SIMPROV = require('../../scripts/proveedores-sim/sim.cjs');
const OUT = ENT.S + '/cap/', B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let k = 0; k < 40; k++) { const x = await vis(l); if (x) { await x.click(); return; } await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
// El barrido, SIN bloquear este proceso: el simulador de las fuentes corre aquí mismo y tiene que poder contestar mientras el servidor lee.
const barrido = () => new Promise((ok, mal) => exec(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`, (e, o) => (e ? mal(e) : ok(String(o)))));
const shot = async (p, n, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ADM = '5705550199', VA = '5705550861';
const YAD = '0a0f0000-0000-4000-8000-000000000003';
const DOM = 'periodico-de-mentira.com', RUN = Date.now().toString(36);
const H = { a: `www.${DOM}`, b: `redirige.${DOM}`, c: `grande.${DOM}`, d: `xxe.${DOM}`, e: `privada.${DOM}` };
const RUTA = `/rss-${RUN}.xml`;
const item = (n, t, d) => `<item><title>${t}</title><link>https://${H.a}/n/${RUN}-${n}?utm_source=rss</link><pubDate>${new Date(Date.now() - n * 600000).toUTCString()}</pubDate><description><![CDATA[<p>${d}</p>]]></description></item>`;
const rss = (items) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Periódico de Mentira</title><link>https://${H.a}/</link>${items.join('')}</channel></rss>`;
const ITEMS3 = [item(1, 'Abren un nuevo malecón en Santo Domingo con área para familias', 'La obra incluye bancos, luces y un paseo junto al mar.'),
  item(2, 'Tiroteo en una avenida deja heridos', 'Detalles del suceso en la capital.'),
  item(3, 'Llega la temporada de mangos a los mercados del Cibao', 'Los productores esperan una buena cosecha este año.')];
const fuenteSql = (nombre, h, estado = 'off') => sql(`insert into com_host_sources (name, url, host, country, topic, host_user_id, status) values ('${nombre}', 'https://${h}${RUTA}', '${h}', 'DO', 'noticias', '${YAD}', '${estado}') returning id`).split('\n')[0];
let CITY_T = null;
const limpiar = () => {
  sql(`update com_host_sources set status = 'retired' where host like '%${DOM}' and status <> 'retired'`);
  sql(`update com_hosts set active = false`); sql(`update com_host_kinds set active = false`);
  sql(`update com_host_cities set mode = 'off', manual_posts = 0, manual_replies = 0`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where source_url like 'https://${H.a}/%' and status <> 'deleted'`);
};

(async () => {
  limpiar();
  const SIM = await SIMPROV.iniciar({ rss: ENT.P.provRss });
  const b = await chromium.launch(); const err = []; globalThis.__p = []; globalThis.__sim = SIM;
  const mira = (pg) => { globalThis.__p.push(pg); pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503|pexels/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };

  // ── El servidor de mentira: DNS y fuentes ──
  for (const h of [H.a, H.b, H.c, H.d]) SIM.dns(h, ['93.184.215.14']);
  SIM.dns(H.e, ['93.184.215.14', '10.0.0.5']); // una de sus direcciones es privada
  const FA = SIM.fuente(H.a, RUTA, { cuerpo: rss(ITEMS3) });
  SIM.fuente(H.b, RUTA, { estado: 302, ubicacion: 'https://127.0.0.1/rss.xml' });
  SIM.fuente(H.c, RUTA, { bytes: 5 * 1024 * 1024 });
  SIM.fuente(H.d, RUTA, { cuerpo: `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss version="2.0"><channel><item><title>&xxe;</title><link>https://${H.d}/x</link></item></channel></rss>` });
  const FE = SIM.fuente(H.e, RUTA, { cuerpo: rss(ITEMS3) });

  // ── 1 · Alta desde el Super Admin y «Probar» ──
  const ad = await esc(); await entrar(ad, ADM);
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('FUENTES DE NOTICIAS', { exact: false }).first().waitFor();
  const alta = async (nombre, url) => {
    await clic(ad.getByText('Agregar fuente', { exact: true }));
    await ad.getByPlaceholder('Nombre del medio').fill(nombre);
    await ad.getByPlaceholder('https://').fill(url);
    await clic(ad.getByRole('button', { name: 'Guardar' }));
  };
  await alta('Privada de Mentira', `https://${H.e}${RUTA}`);
  ok(await contiene(ad, 'El servidor resuelve a una dirección privada') && sql(`select count(*) from com_host_sources where url = 'https://${H.e}${RUTA}'`) === '0', 'al guardar, una fuente cuyo servidor resuelve a una dirección privada se rechaza (las reglas del lector) y no se guarda');
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('FUENTES DE NOTICIAS', { exact: false }).first().waitFor();
  const T1 = sql('select now()');
  await alta('Periódico de Mentira', `https://${H.a}${RUTA}`);
  ok(await espera(() => sql(`select count(*) from com_host_sources where url = 'https://${H.a}${RUTA}' and status = 'off'`) === '1'), 'el admin da de alta la fuente: queda apagada');
  const A = sql(`select id from com_host_sources where url = 'https://${H.a}${RUTA}'`);
  ok(sql(`select count(*) from audit_entries where action = 'anfitrion.fuente_alta' and target_id = '${A}' and at > '${T1}'`) === '1', 'el alta queda en la auditoría');
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('Periódico de Mentira', { exact: false }).first().waitFor();
  await clic(ad.getByRole('button', { name: 'Probar' }));
  ok(await contiene(ad, 'La fuente se leyó bien') && (await texto(ad)).includes(' 3 notas'), '«Probar» hace una lectura y enseña cuántas notas trajo');
  ok(FA.llamadas === 1 && sql(`select count(*) from com_host_news where source_id = ${A}`) === '0', '«Probar» lee una vez y no guarda notas');
  ok(sql(`select count(*) from com_host_source_reads where source_id = ${A} and via = 'probar' and ok`) === '1', 'la prueba queda en el registro de lecturas');

  // ── Encender: Yadira, solo «noticias», Hazleton en manual con 1 publicación más de lo usado hoy; las fuentes ──
  sql(`update com_hosts set active = (slug = 'yadira')`); sql(`update com_host_kinds set active = (key = 'noticias')`);
  const usadas = () => Number(sql(`select count(*) from com_host_log where city_id = 'hzl' and outcome = 'publicada' and kind <> 'respuesta' and local_day = (now() at time zone 'America/New_York')::date`));
  const UP = usadas(); if (UP >= 20) throw new Error('el cupo manual de hoy en Hazleton ya no alcanza (base nueva)');
  sql(`update com_host_cities set mode = 'manual', manual_posts = ${UP + 1}, manual_replies = 0 where city_id = 'hzl'`);
  const FB = fuenteSql('Redirige de Mentira', H.b, 'on'), FC = fuenteSql('Grande de Mentira', H.c, 'on'), FD = fuenteSql('Entidad de Mentira', H.d, 'on');
  const FEid = sql(`insert into com_host_sources (name, url, host, country, topic, host_user_id, status) values ('Privada de Mentira', 'https://${H.e}${RUTA}', '${H.e}', 'DO', 'noticias', '${YAD}', 'on') returning id`).split('\n')[0];
  sql(`update com_host_sources set status = 'on', next_read_at = now() where id = ${A}`);

  // ── 2 y 3 · Una pasada: lee la buena una vez, descarta el suceso violento, Yadira publica una con enlace; las malas no tumban nada ──
  await barrido();
  ok(FA.llamadas === 2, 'el barrido leyó la fuente buena una vez');
  ok(sql(`select count(*) from com_host_news where source_id = ${A}`) === '3', 'las 3 notas entraron una vez cada una');
  ok(sql(`select status || ':' || reason from com_host_news where source_id = ${A} and link like '%/n/${RUN}-2'`) === 'descartada:violencia', 'la nota del tiroteo queda descartada con su motivo (suceso violento)');
  ok(sql(`select count(*) from com_host_news where source_id = ${A} and link like '%utm_%'`) === '0', 'el enlace se guarda normalizado (sin utm_*)');
  const P = sql(`select coalesce(max(post_id)::text, '') from com_host_log where city_id = 'hzl' and kind = 'noticias' and outcome = 'publicada' and source_ref in (select 'news:' || id from com_host_news where source_id = ${A})`);
  ok(!!P, 'Yadira publicó una nota en Hazleton');
  const fila = sql(`select author_user_id || '|' || source_name || '|' || source_url from com_posts where id = ${P}`).split('|');
  ok(fila[0] === YAD && fila[1] === 'Periódico de Mentira' && new RegExp(`^https://${H.a.replace(/\./g, '\\.')}/n/${RUN}-[13]$`).test(fila[2]), 'la publica la cuenta de Yadira con el medio y el enlace a la nota');
  const cuerpo = sql(`select body from com_posts where id = ${P}`);
  ok(/Lo publicó Periódico de Mentira; el enlace está abajo\./.test(cuerpo) && !/https?:/.test(cuerpo), `la nota lleva el medio y una pregunta, sin copiar el artículo ni el enlace en el texto: «${cuerpo.slice(0, 120)}…»`);
  ok(sql(`select motor from com_host_log where post_id = ${P}`) === 'simulador', 'el resumen sale del simulador (fuera de producción nunca el proveedor real)');
  const errDe = (id) => sql(`select fails || '|' || coalesce(last_error, '') || '|' || (next_read_at > now() + interval '50 minutes')::text from com_host_sources where id = ${id}`);
  ok(/^1\|La fuente redirige a otro servidor/.test(errDe(FB)), `la que redirige a 127.0.0.1 se rechaza: ${errDe(FB)}`);
  ok(/^1\|La fuente es demasiado grande/.test(errDe(FC)), `la de 5 MB se rechaza cortando el flujo: ${errDe(FC)}`);
  ok(/^1\|El XML no se lee: XML con DOCTYPE/.test(errDe(FD)), `la del XML con entidad externa se rechaza: ${errDe(FD)}`);
  ok(/^1\|El servidor resuelve a una dirección privada/.test(errDe(FEid)) && FE.llamadas === 0, 'la que resuelve a una IP privada se rechaza y nunca se pide');
  ok(/\|true$/.test(errDe(FB)), 'una fuente que falla espera más que la frecuencia normal (respaldo exponencial)');
  ok(sql(`select count(*) from com_host_source_reads where source_id in (${FB}, ${FC}, ${FD}, ${FEid}) and not ok`) === '4', 'cada fallo queda en el registro de lecturas');

  // ── 4 · Segunda pasada: nada se repite y, con el cupo usado, no publica otra ──
  sql(`update com_host_sources set next_read_at = now() where id = ${A}`);
  await barrido();
  ok(FA.llamadas === 3 && sql(`select count(*) from com_host_news where source_id = ${A}`) === '3', 'la segunda lectura no repite ninguna nota');
  ok(sql(`select new_items from com_host_source_reads where source_id = ${A} and via = 'barrido' order by id desc limit 1`) === '0', 'y lo anota: 0 nuevas');
  ok(usadas() === UP + 1, 'el cupo del día está usado: no publica otra nota');
  ok(sql(`select count(*) from com_host_news where source_id = ${A} and status = 'nueva'`) === '1', 'la otra nota buena queda nueva, sin publicar');

  // ── La nota en la Comunidad: marca y enlace de fuera (teléfono y escritorio) ──
  const pa = await tel(); await entrar(pa, VA); await api(pa, '/api/cuenta/perfil', { nombre: 'Ana', apellido: 'Prueba' });
  const VAID0 = sql(`select id from users where phone = '+1${VA}'`);
  sql(`insert into community_profiles (user_id) values ('${VAID0}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id = '${VAID0}'`);
  sql(`update users set status = 'active', status_until = null, status_reason = null, home_city_id = 'hzl', zone_id = null where id = '${VAID0}'`);
  await pa.goto(B + `/comunidad/p/${P}`); await pa.getByText('Yadira').first().waitFor();
  ok(/Anfitriona/i.test(await texto(pa)), 'teléfono: la nota dice «Anfitriona» junto a Yadira');
  const a = pa.locator(`a[href="${fila[2]}"]`);
  ok(await a.count() === 1, 'el enlace a la fuente se ve en la nota');
  const rel = await a.getAttribute('rel'), tgt = await a.getAttribute('target');
  ok(/noopener/.test(rel) && /nofollow/.test(rel) && /noreferrer/.test(rel) && tgt === '_blank', `enlace de fuera seguro: rel="${rel}" target="${tgt}"`);
  ok(await contiene(pa, H.a.replace(/^www\./, '')), 'se ve el dominio del medio');
  await shot(pa, 'anfnot-nota-m.png', true);
  const pad = await esc(); await entrar(pad, VA);
  await pad.goto(B + `/comunidad/p/${P}`); await pad.getByText('Yadira').first().waitFor(); await shot(pad, 'anfnot-nota-d.png');

  // ── 5 · El Super Admin: los números, los fallos a la vista y «Probar» con error ──
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('FUENTES DE NOTICIAS', { exact: false }).first().waitFor();
  ok(await contiene(ad, 'FALLOS DE LECTURA') && await contiene(ad, 'La fuente redirige a otro servidor'), 'el Super Admin ve los números y el fallo de cada fuente');
  ok(await contiene(ad, 'Suceso violento'), 'y las últimas notas con su estado y motivo');
  await ad.getByText('FUENTES DE NOTICIAS', { exact: false }).first().scrollIntoViewIfNeeded(); await shot(ad, 'anfnot-fuentes-d.png');
  const adm = await tel(); await entrar(adm, ADM); await adm.goto(B + '/admin/contenido?tab=anf');
  await adm.getByText('FUENTES DE NOTICIAS', { exact: false }).first().waitFor(); await adm.getByText('FUENTES DE NOTICIAS', { exact: false }).first().scrollIntoViewIfNeeded(); await shot(adm, 'anfnot-fuentes-m.png');

  // ── 6 · Un vecino no puede publicar con enlace (la base lo cierra) ──
  const VAID = sql(`select id from users where phone = '+1${VA}'`);
  let cerrado = false; try { sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, source_url, source_name) values ('hzl', 'user', '${VAID}', 'publicacion', 'Prueba de enlace de un vecino', 'https://${H.a}/x', 'Medio')`); } catch (e) { cerrado = /anfitrion_fuente/.test(String(e.stderr || e.message)); }
  ok(cerrado, 'la base no deja a un vecino publicar con enlace de fuente');

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); await SIM.cerrar(); console.log('OK anfNot');
})().catch(async (e) => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'failanfnot-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch { /* nada */ } try { limpiar(); } catch { /* nada */ } try { await globalThis.__sim?.cerrar(); } catch { /* nada */ } process.exit(1); });
