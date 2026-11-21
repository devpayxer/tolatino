// Fotos a la medida · F4 (21 nov) · El espejo en el Super Admin: Contenido › Auto-moderación › «Fotos a la medida». De punta a punta con el servidor y la
// base; NO necesita el almacén (solo se leen cifras: las filas de fotos se siembran en la base y se retiran al final).
//   1 una cuenta del equipo abre la pantalla y las cifras del bloque (públicas, con sus tamaños, faltan, sin archivo, peso de las originales, peso de los
//     tamaños, ahorro a 640 en % y en MB, y las mismas de las privadas) COINCIDEN con la base (una consulta aparte, escrita de otro modo)
//   2 teléfono (390) y escritorio (1360), español e inglés: las mismas cifras, sin errores de consola, sin desborde horizontal
//   3 solo lectura: ningún botón en el bloque; una cuenta sin permiso de Contenido no ve la pantalla
// Puede correr dos veces seguidas: lo que siembra lo retira (status removed + purged_at) y no toca nada más.
// Guardián fotosCifrasEnElAdmin (al revés: alreves9ufotosadmin). La función que da las cifras: cifrasFotos / cifrasFotosPrivadas.
const ENT = require('../lib/entorno.cjs');
const { randomUUID } = require('crypto');
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, equipo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');

// Lo que dice la base, con otra consulta que la de la pantalla (unnest con orden en lugar de índices fijos).
const base = () => {
  const pub = JSON.parse(sql(`select row_to_json(x) from (select count(*)::int as total,
      count(*) filter (where cardinality(var_widths) > 0)::int as conv, count(*) filter (where var_at is null)::int as pend, count(*) filter (where cardinality(var_widths) = 0)::int as sin,
      coalesce(sum(bytes), 0)::float8 as maes, coalesce(sum((select sum(v) from unnest(var_bytes) v)), 0)::float8 as vars,
      coalesce(sum(bytes) filter (where cardinality(var_widths) > 0), 0)::float8 as m640,
      coalesce(sum((select v from unnest(var_bytes) with ordinality t(v, i) order by (var_widths[i] >= 640) desc, case when var_widths[i] >= 640 then var_widths[i] else -var_widths[i] end limit 1)) filter (where cardinality(var_widths) > 0), 0)::float8 as v640
    from media where status = 'visible' and purged_at is null and url ~ '^/medios/n/[0-9a-f-]+\\.jpg$' and url = '/medios/n/' || id || '.jpg') x`));
  const pri = JSON.parse(sql(`select row_to_json(x) from (select count(*)::int as total,
      count(*) filter (where cardinality(var_widths) > 0)::int as conv, count(*) filter (where var_at is null)::int as pend, count(*) filter (where cardinality(var_widths) = 0)::int as sin,
      coalesce(sum(bytes), 0)::float8 as maes, coalesce(sum((select sum(v) from unnest(var_bytes) v)), 0)::float8 as vars
    from media where private and status = 'visible' and purged_at is null and url ~ '^/api/medios/privada/') x`));
  return { pub, pri };
};
// Cómo las escribe la pantalla (1 MB = 1 048 576 bytes, un decimal; coma en español).
const fmt = (en) => ({ dec: (x) => (en ? x.toFixed(1) : x.toFixed(1).replace('.', ',')), mb(b) { return `${this.dec(b / 1048576)} MB`; } });
const esperado = (d, en) => {
  const f = fmt(en), a = d.pub, p = d.pri, ahorro = a.m640 > 0 ? Math.round((1 - a.v640 / a.m640) * 1000) / 1000 : 0;
  const L = en ? { pub: 'PUBLIC PHOTOS', con: 'WITH THEIR SIZES', falta: 'PENDING', sin: 'NO FILE', pm: 'WEIGHT OF THE ORIGINALS', pv: 'WEIGHT OF THE SIZES', ah: 'SAVING AT 640', pr: 'PRIVATE', prc: 'PRIVATE WITH SIZES', prf: 'PRIVATE PENDING', prs: 'PRIVATE NO FILE' }
    : { pub: 'FOTOS PÚBLICAS', con: 'CON SUS TAMAÑOS', falta: 'FALTAN', sin: 'SIN ARCHIVO', pm: 'PESO DE LAS ORIGINALES', pv: 'PESO DE LOS TAMAÑOS', ah: 'AHORRO A 640', pr: 'PRIVADAS', prc: 'PRIVADAS CON SUS TAMAÑOS', prf: 'PRIVADAS QUE FALTAN', prs: 'PRIVADAS SIN ARCHIVO' };
  return [`${L.pub} ${a.total} `, `${L.con} ${a.conv} `, `${L.falta} ${a.pend} `, `${L.sin} ${a.sin} `, `${L.pm} ${f.mb(a.maes)} `, `${L.pv} ${f.mb(a.vars)} `, `${L.ah} ${f.dec(ahorro * 100)} % `,
    en ? `${f.mb(a.m640)} of originals against ${f.mb(a.v640)} served at 640 (${f.mb(a.m640 - a.v640)} less)` : `${f.mb(a.m640)} de originales contra ${f.mb(a.v640)} servidas a 640 (${f.mb(a.m640 - a.v640)} menos)`,
    `${L.pr} ${p.total} `, en ? `originals ${f.mb(p.maes)} · sizes ${f.mb(p.vars)}` : `originales ${f.mb(p.maes)} · tamaños ${f.mb(p.vars)}`, `${L.prc} ${p.conv} `, `${L.prf} ${p.pend} `, `${L.prs} ${p.sin} `];
};

(async () => {
  const b = await chromium.launch();
  const sembradas = [];
  try {
    // Siembra: dos públicas (una convertida, una que falta), una pública que ya no tiene archivo, una privada convertida y una privada que falta.
    const fila = (url, id, priv, w, vb, bytes) => {
      sql(`insert into media (id, owner_kind, owner_id, url, w, h, status, bytes, var_widths, var_bytes, var_at${priv ? ', private, rev_sin_c2' : ''})
           values ('${id}', 'user', 'fot9uadmin', '${url}', 1200, 800, 'visible', ${bytes}, ${w === null ? 'null' : `'{${w}}'`}, ${vb === null ? 'null' : `'{${vb}}'`}, ${w !== null ? 'now()' : 'null'}${priv ? ', true, true' : ''})`);
      sembradas.push(id);
    };
    const id = () => randomUUID();
    let x = id(); fila(`/medios/n/${x}.jpg`, x, false, '320,640,1080,1600', '11000,30000,66000,120000', 400000);
    x = id(); fila(`/medios/n/${x}.jpg`, x, false, null, null, 250000);
    x = id(); fila(`/medios/n/${x}.jpg`, x, false, '', '', 90000);
    x = id(); fila(`/api/medios/privada/${x}`, x, true, '320,640', '9000,25000', 150000);
    x = id(); fila(`/api/medios/privada/${x}`, x, true, null, null, 120000);
    equipo('5705550188');

    const corrida = async (ancho, lang, etiqueta) => {
      const ctx = await b.newContext({ viewport: { width: ancho, height: ancho < 600 ? 844 : 900 }, ...(ancho < 600 ? { isMobile: true, hasTouch: true } : {}) });
      await ctx.addCookies([{ name: 'tl_lang', value: lang, url: B }]);
      const p = await ctx.newPage(), errores = [];
      p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); }); p.on('pageerror', (e) => errores.push(String(e)));
      await entrarComo(p, '5705550188');
      // El barrido puede mover las cifras entre la consulta y la pantalla: se repite una vez con la base de ese momento.
      let faltan = [];
      for (let i = 0; i < 3; i++) {
        const d = base();
        await p.goto(B + '/admin/contenido?tab=auto'); await p.waitForLoadState('networkidle');
        await p.getByText(lang === 'en' ? 'PHOTOS SIZED TO FIT' : 'FOTOS A LA MEDIDA').first().waitFor({ timeout: 20000 });
        const t = await texto(p);
        faltan = esperado(d, lang === 'en').filter((s) => !t.includes(s));
        if (!faltan.length) break;
      }
      ok(!faltan.length, `${etiqueta}: las cifras del bloque coinciden con la base${faltan.length ? ' (falta: ' + faltan.join(' | ') + ')' : ''}`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${etiqueta}: sin desborde horizontal`);
      ok(!errores.length, `${etiqueta}: sin errores de consola${errores.length ? ' (' + errores[0] + ')' : ''}`);
      await ctx.close();
    };
    console.log('1 · Teléfono y escritorio, español e inglés: las cifras del bloque coinciden con la base');
    await corrida(390, 'es', 'teléfono ES'); await corrida(390, 'en', 'teléfono EN');
    await corrida(1360, 'es', 'escritorio ES'); await corrida(1360, 'en', 'escritorio EN');

    console.log('2 · Solo lectura y permiso');
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } }), p = await ctx.newPage();
    await entrarComo(p, '5705550188');
    await p.goto(B + '/admin/contenido?tab=auto'); await p.getByText('FOTOS A LA MEDIDA').first().waitFor({ timeout: 20000 });
    const y0 = await p.locator('text=FOTOS A LA MEDIDA').first().evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const y1 = await p.locator('text=LISTAS DE TÉRMINOS').first().evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const botones = await p.evaluate(([a, c]) => [...document.querySelectorAll('button,[role=switch],a[href]')].filter((e) => { const y = e.getBoundingClientRect().top + scrollY; return y > a && y < c; }).length, [y0, y1]);
    ok(botones === 0, 'ningún botón, interruptor ni enlace dentro del bloque (solo lectura)');
    await ctx.close();
    const tel = telLibre(), cs = await b.newContext({ viewport: { width: 390, height: 844 } }), ps = await cs.newPage();
    await entrarComo(ps, tel, { nombre: 'Sin', apellido: 'Permiso' });
    await ps.goto(B + '/admin/contenido?tab=auto'); await ps.waitForLoadState('networkidle');
    const ts = await texto(ps);
    ok(!ts.includes('FOTOS A LA MEDIDA') && !ts.includes('PESO DE LAS ORIGINALES'), 'una cuenta que no es del equipo no ve el bloque ni sus cifras');
    await cs.close();
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally {
    for (const s of sembradas) { try { sql(`update media set status = 'removed', removed_reason = 'admin', removed_note = 'Prueba', removed_at = now(), purged_at = now() where id = '${s}'`); } catch { /* ya retirada */ } }
    await b.close();
  }
})();
