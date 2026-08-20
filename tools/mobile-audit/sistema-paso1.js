// El arnés de la migración al «Sistema To'Latino» (handoff 2026-08-20).
// Es la PRUEBA de que los pasos llegaron al navegador — no al código, al
// navegador. Nació con el paso 1 (tokens y tipografías) y en el paso 3 se le
// añadió la comprobación de CONTRASTE, que es la que más ha encontrado.
//
// QUÉ COMPRUEBA, y por qué cada cosa:
//  · CONTRASTE de todo el texto pintado, contra el umbral AA de WCAG. Encontró
//    ~60 fallos reales en su primera pasada, empezando por el propio rosa del
//    handoff con texto blanco encima (3.59). Ver el bloque `MEDIR_CONTRASTE`.
//  · Las tres familias (Onest · Bricolage Grotesque · Space Mono) están
//    CARGADAS de verdad (`document.fonts.check`), no solo pedidas. Una fuente
//    que no llega no rompe nada: cae a system-ui y la app sigue andando, solo
//    se ve genérica. Es la regresión que se cuela sin que nadie la note.
//  · El `body` hereda Onest y la tinta nueva (#16112E).
//  · El acento de marca llegó: hay algo pintado con el rosa #E9005E.
//  · No queda `Plus Jakarta Sans` aplicada en ningún elemento visible.
//  · Nada desborda en horizontal a 402px (el móvil manda).
//
// CÓMO SE EJECUTA (importa — con `-s` todas las rutas devuelven la portada):
//   VERCEL_ENV=preview pnpm -C apps/web build
//   npx serve apps/web/out -l 4173 --no-clipboard
//   SHOTS_DIR=<dir> node tools/mobile-audit/sistema-paso1.js

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';

function relay(req) {
  return new Promise((r) => {
    const a = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) a.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) a.push('--data-binary', b);
    a.push(req.url());
    execFile('curl', a, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => {
      o = o || ''; if (e && !o) return r({ status: 502, body: '' });
      const n = o.lastIndexOf('\n'); r({ status: parseInt(o.slice(n + 1), 10) || 500, body: o.slice(0, n) });
    });
  });
}
function bin(url) {
  return new Promise((r) => execFile('curl', ['-sS', '--max-time', '25', '-H', 'Accept: image/webp,image/*,*/*', '--output', '-', url],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (e, o) => r(e && !o?.length ? null : o)));
}

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

// ── Contraste, medido sobre lo PINTADO ──────────────────────────────────────
// Por qué no se audita por clases: `text-amber` es perfecto en un icono de
// estrella o sobre una foto oscura, e ilegible en una línea de texto sobre
// blanco. La clase no lo dice; el píxel sí. Esto recorre los nodos de texto
// visibles, compone el fondo real subiendo por los padres hasta encontrar uno
// opaco, y aplica el umbral AA de WCAG (4.5 normal · 3.0 si el texto es grande
// o negrita grande).
//
// De dónde sale: el paso 3 (2026-08-20). En la primera captura con datos
// reales, «Abierto · cierra en 49 min» salía en ámbar sobre blanco — y ese
// ámbar da 1.9 de contraste. Se veía a simple vista en la captura, pero eso es
// suerte: en una pantalla llena, un texto flojo pasa desapercibido hasta que
// un usuario no lo lee. Un umbral numérico no tiene ese problema.
const MEDIR_CONTRASTE = `(() => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const Y = ([r,g,b]) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  const rgb = (s) => { const m = s && s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(/[,\\/\\s]+/).filter(Boolean).map(Number);
    return p.length >= 3 ? { c: p.slice(0,3), a: p.length > 3 ? p[3] : 1 } : null; };
  // Fondo efectivo: se sube por los padres componiendo capas hasta llegar a una opaca.
  const fondoDe = (el) => {
    let capas = [], n = el;
    while (n && n !== document.documentElement) {
      const b = rgb(getComputedStyle(n).backgroundColor);
      if (b && b.a > 0) { capas.push(b); if (b.a >= 1) break; }
      n = n.parentElement;
    }
    if (!capas.length) return [255,255,255];
    let out = capas[capas.length-1].c;
    for (let i = capas.length-2; i >= 0; i--) { const s = capas[i];
      out = out.map((v,j) => Math.round(s.c[j]*s.a + v*(1-s.a))); }
    return out;
  };
  // Lo que WCAG deja fuera del umbral, y por qué. La lista es CORTA a
  // propósito: una regla con muchas excepciones deja de ser una regla, y la
  // salida se vuelve ruido que nadie mira.
  //   · aria-hidden  → no es texto para nadie; es un icono dibujado con letras
  //                    (las estrellas) o adorno. El dato va al lado.
  //   · deshabilitado→ WCAG 1.4.3 excluye los controles inactivos. Aquí son los
  //                    módulos con etiqueta «Pronto», apagados a propósito.
  //   · data-decorativo → escotilla explícita, que obliga a escribir el motivo
  //                    en el código donde se pone.
  const exento = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n.getAttribute && (
        n.getAttribute('aria-hidden') === 'true' ||
        n.hasAttribute('data-decorativo') ||
        n.hasAttribute('disabled') ||
        n.getAttribute('aria-disabled') === 'true'
      )) return true;
    }
    return false;
  };
  const malos = [];
  for (const el of document.querySelectorAll('body *')) {
    // Solo nodos con texto PROPIO y visible.
    const txt = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!txt) continue;
    if (exento(el)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.6) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // Texto sobre una imagen o un degradado: el fondo no se puede calcular, se salta.
    let n = el, sobreImagen = false;
    while (n && n !== document.documentElement) {
      const bi = getComputedStyle(n).backgroundImage;
      if (bi && bi !== 'none') { sobreImagen = true; break; }
      if (rgb(getComputedStyle(n).backgroundColor)?.a >= 1) break;
      n = n.parentElement;
    }
    if (sobreImagen) continue;
    const f = rgb(s.color); if (!f) continue;
    const fondo = fondoDe(el);
    const frente = f.a >= 1 ? f.c : f.c.map((v,j) => Math.round(v*f.a + fondo[j]*(1-f.a)));
    const L1 = Y(frente), L2 = Y(fondo);
    const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
    const px = parseFloat(s.fontSize), peso = parseInt(s.fontWeight, 10) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;
    if (ratio < minimo) malos.push({ txt: txt.slice(0, 42), ratio: +ratio.toFixed(2), minimo, px, peso, clase: (el.className || '').toString().slice(0, 70) });
  }
  // Un mismo componente repetido en una lista sale N veces; se agrupa.
  const vistos = new Map();
  for (const m of malos) { const k = m.clase + '|' + m.ratio; if (!vistos.has(k)) vistos.set(k, { ...m, n: 0 }); vistos.get(k).n++; }
  return Array.from(vistos.values()).sort((a,b) => a.ratio - b.ratio);
})()`;

// Las pantallas que mejor delatan un cambio de tokens: la que ve todo el mundo
// al entrar, el directorio, una ficha con foto, y el panel del dueño.
const RUTAS = [
  ['comunidad', '/comunidad/'],
  ['negocios', '/negocios/'],
  ['ficha', '/negocios/?b=hz-food-p4'],
  ['portada', '/'],
];

// La ciudad de lanzamiento, que es la que tiene datos sembrados en PRUEBAS. Sin
// esto el listado sale vacío (por defecto arranca en Houston) y la comprobación
// de contraste no vería ni una tarjeta real — pasaría en verde sin haber mirado
// nada, que es el peor resultado posible.
const CIUDAD = { label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null, auto: false };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const abrir = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await ctx.addInitScript((c) => { try { localStorage.setItem('tl.city', JSON.stringify(c)); } catch { /* modo privado */ } }, CIUDAD);
    const page = await ctx.newPage();
    await page.route('**://*.supabase.co/**', async (route) => {
      const u = route.request().url();
      if (u.includes('/storage/v1/')) {
        const b = await bin(u);
        if (!b) return route.abort();
        return route.fulfill({ status: 200, headers: { 'content-type': 'image/webp', 'access-control-allow-origin': '*' }, body: b });
      }
      const r = await relay(route.request());
      return route.fulfill({ status: r.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: r.body });
    });
    return page;
  };

  for (const [ancho, alto, etiqueta] of [[402, 880, 'movil'], [1320, 1000, 'escritorio']]) {
    console.log(`\n── ${etiqueta} · ${ancho}px ──`);
    for (const [nombre, ruta] of RUTAS) {
      const page = await abrir(ancho, alto);
      await page.goto(BASE + ruta, { waitUntil: 'domcontentloaded' });
      // Esperar a que las fuentes web terminen de descargarse ANTES de medir o
      // capturar: si no, se fotografía la caída a system-ui y parece un fallo.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1400);

      const m = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        // `document.fonts.check` responde por la fuente REAL cargada, no por lo
        // que diga la hoja de estilos.
        const cargada = (f, peso) => document.fonts.check(`${peso} 16px "${f}"`);
        // ¿Hay algo pintado con el acento nuevo? Se recorre lo visible.
        let rosa = 0, jakarta = 0, display = 0, mono = 0;
        for (const el of document.querySelectorAll('body *')) {
          const s = getComputedStyle(el);
          const t = s.backgroundColor + ' ' + s.color + ' ' + s.borderColor + ' ' + s.backgroundImage;
          if (t.includes('233, 0, 94')) rosa++;
          const ff = s.fontFamily;
          if (ff.includes('Plus Jakarta')) jakarta++;
          if (ff.includes('Bricolage')) display++;
          if (ff.includes('Space Mono')) mono++;
        }
        return {
          fuenteBody: cs.fontFamily,
          tintaBody: cs.color,
          fondoBody: cs.backgroundColor,
          onest: cargada('Onest', 400),
          bricolage: cargada('Bricolage Grotesque', 700),
          spaceMono: cargada('Space Mono', 400),
          rosa, jakarta, display, mono,
          desborda: document.documentElement.scrollWidth > window.innerWidth + 1,
          ancho: document.documentElement.scrollWidth,
        };
      });

      const p = `${etiqueta}/${nombre}`;
      if (!m.onest) mal(`${p}: Onest NO llegó a cargar — la interfaz está en la fuente del sistema`);
      if (!m.bricolage) mal(`${p}: Bricolage Grotesque NO llegó a cargar`);
      if (!m.spaceMono) mal(`${p}: Space Mono NO llegó a cargar`);
      if (!m.fuenteBody.includes('Onest')) mal(`${p}: el body no aplica Onest (${m.fuenteBody})`);
      if (m.jakarta) mal(`${p}: ${m.jakarta} elemento(s) siguen con Plus Jakarta Sans aplicada`);
      if (m.tintaBody !== 'rgb(22, 17, 46)') mal(`${p}: la tinta del body es ${m.tintaBody}, se esperaba rgb(22, 17, 46)`);
      if (!m.rosa) mal(`${p}: no hay NADA pintado con el acento nuevo #E9005E — el token no llegó`);
      if (m.desborda) mal(`${p}: desborda en horizontal (${m.ancho}px en ${ancho}px)`);
      ok(`${p}: Onest+Bricolage+Mono cargadas · ${m.rosa} elemento(s) con el acento nuevo · display:${m.display} mono:${m.mono} · sin desborde`);

      const flojos = await page.evaluate(MEDIR_CONTRASTE);
      if (flojos.length) {
        mal(`${p}: ${flojos.length} texto(s) por debajo del contraste mínimo`);
        for (const f of flojos.slice(0, 6)) {
          console.log(`        ${f.ratio} (mín ${f.minimo}) · ${f.px}px/${f.peso} ×${f.n} · «${f.txt}»`);
          console.log(`        └ ${f.clase}`);
        }
      } else ok(`${p}: contraste — todo el texto llega al mínimo AA`);

      await page.screenshot({ path: `${SHOTS}/paso1-${etiqueta}-${nombre}.png`, fullPage: false });
      await page.close();
    }
  }

  await browser.close();
  if (fallos.length) {
    console.error(`\n✖ ${fallos.length} comprobación(es) fallaron.\n`);
    process.exit(1);
  }
  console.log('\n✅ Paso 1 servido: tres familias cargadas, tinta y acento nuevos en pantalla.\n');
})();
