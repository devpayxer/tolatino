#!/usr/bin/env node
// gen-deeplinks.mjs — los dos archivos que hacen que un enlace de tolatino.com
// abra la APP en vez del navegador (2026-11-05, Fase 0 del plan de tiendas).
//
// POR QUÉ EXISTE: iOS y Android no se creen que la app y el dominio son de la
// misma gente porque lo digamos en la app. Lo comprueban al revés — descargan
// un archivo del DOMINIO y verifican que nombra a la app:
//
//   · iOS     → https://tolatino.com/.well-known/apple-app-site-association
//               (Universal Links; el CDN de Apple lo lee al instalar la app)
//   · Android → https://tolatino.com/.well-known/assetlinks.json
//               (App Links; lo verifica el sistema al instalar)
//
// Sin ellos, `tolatino.com/negocios/?b=…` compartido por WhatsApp abre Safari o
// Chrome aunque el usuario tenga la app instalada — y el enlace mágico del
// correo tampoco aterriza dentro de la app, que es lo que de verdad importa:
// sin esto, registrarse desde la app empaquetada te saca al navegador a medias.
//
// POR QUÉ NO ESTÁN ESCRITOS A MANO EN `public/`: los dos llevan un identificador
// que SOLO existe cuando hay cuenta de desarrollador:
//   · iOS: `TEAM_ID.BUNDLE_ID` — el Team ID lo da Apple al pagar los $99/año.
//   · Android: la huella SHA-256 del certificado con el que Google Play FIRMA
//     la app — la da Play Console (App signing) después de subir el primer AAB.
// Inventarlos sería peor que no tenerlos: un archivo con un ID falso hace que
// los enlaces profundos fallen EN SILENCIO y es dificilísimo de diagnosticar.
// Así que este script escribe cada archivo solo cuando su dato REAL está
// presente, y si no está lo dice y no escribe nada.
//
// Uso (corre solo en `postbuild`):
//   node scripts/gen-deeplinks.mjs [ruta-del-build]        # por defecto apps/web/out
//
// Variables (se ponen en Vercel → Settings → Environment Variables, o en local):
//   TOLATINO_IOS_APP_ID            ej. ABCDE12345.com.tolatino.app
//   TOLATINO_ANDROID_PACKAGE       ej. com.tolatino.app  (por defecto este)
//   TOLATINO_ANDROID_FINGERPRINTS  una o varias huellas SHA-256 separadas por
//                                  coma. La de Play («App signing key») y, si se
//                                  prueba en un dispositivo, la de «Upload key».

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'apps/web/out';
const DIR = join(OUT, '.well-known');

// Nombre del paquete / bundle de la app. Mismo en las dos tiendas a propósito:
// un solo identificador que recordar, y los enlaces profundos de las dos
// plataformas apuntan al mismo sitio.
const PACKAGE = process.env.TOLATINO_ANDROID_PACKAGE || 'com.tolatino.app';

// Rutas que NO debe abrir la app, aunque estén en el dominio:
//   · /negocio/* → el panel del negocio se queda en la WEB a propósito. La
//     suscripción Verified/Premium se cobra ahí íntegra; dentro de la app, Apple
//     y Google exigirían su compra integrada (30 %, o 15 % en el programa de
//     pequeñas empresas) porque desbloquea funciones digitales. Ver §4 de
//     LAUNCH-CHECKLIST: «la primera app es la del CLIENTE».
//   · /admin/*   → panel del fundador, nunca en una tienda.
const EXCLUIR = ['/negocio/*', '/admin/*'];

const notas = [];
const errores = [];

/** `TEAM_ID.bundle.id` — 10 caracteres alfanuméricos + un bundle con puntos. */
function validaAppId(raw) {
  const v = raw.trim();
  if (!/^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/.test(v)) {
    errores.push(
      `TOLATINO_IOS_APP_ID="${v}" no tiene la forma TEAMID.bundle.id ` +
      '(10 caracteres alfanuméricos en mayúscula, un punto, y el bundle; ej. ABCDE12345.com.tolatino.app)',
    );
    return null;
  }
  return v;
}

/** SHA-256 en el formato de Play: 32 pares hexadecimales separados por `:`. */
function validaHuellas(raw) {
  const lista = raw.split(/[,\s]+/).map((h) => h.trim().toUpperCase()).filter(Boolean);
  const buenas = [];
  for (const h of lista) {
    if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h)) {
      errores.push(
        `huella "${h}" no es un SHA-256 válido — se esperan 32 pares hexadecimales separados por «:» ` +
        '(cópiala tal cual de Play Console → Integridad de la app → Firma de apps)',
      );
      continue;
    }
    buenas.push(h);
  }
  return buenas;
}

// ── iOS · apple-app-site-association ────────────────────────────────────────
// Formato moderno (`components`), no el `paths` antiguo. El orden importa: las
// exclusiones van ANTES del comodín, porque Apple aplica la primera que encaja.
// `webcredentials` es un regalo que sale gratis aquí: habilita el autorrelleno
// de la contraseña del llavero de iCloud dentro de la app.
function iosJson(appId) {
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: [
            ...EXCLUIR.map((p) => ({ '/': p, exclude: true, comment: 'se queda en la web' })),
            { '/': '/*', comment: 'todo lo demás abre la app' },
          ],
        },
      ],
    },
    webcredentials: { apps: [appId] },
  };
}

// ── Android · assetlinks.json ───────────────────────────────────────────────
// Android no sabe excluir rutas aquí: el filtro de rutas va en el manifiesto de
// la app (`<data android:pathPrefix>`), así que ahí hay que repetir la exclusión
// de `/negocio` y `/admin` cuando se arme el envoltorio.
function androidJson(huellas) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE,
        sha256_cert_fingerprints: huellas,
      },
    },
  ];
}

const iosRaw = process.env.TOLATINO_IOS_APP_ID;
const androidRaw = process.env.TOLATINO_ANDROID_FINGERPRINTS;
const escribir = [];

if (iosRaw) {
  const appId = validaAppId(iosRaw);
  // Sin extensión a propósito: Apple exige ESE nombre exacto. El tipo
  // `application/json` lo pone `vercel.json` (un archivo sin extensión se
  // serviría como binario y Apple lo rechazaría).
  if (appId) escribir.push(['apple-app-site-association', iosJson(appId)]);
} else {
  notas.push('iOS: falta TOLATINO_IOS_APP_ID (Team ID de Apple) → no se escribe apple-app-site-association');
}

if (androidRaw) {
  const huellas = validaHuellas(androidRaw);
  if (huellas.length) escribir.push(['assetlinks.json', androidJson(huellas)]);
} else {
  notas.push('Android: falta TOLATINO_ANDROID_FINGERPRINTS (SHA-256 de Play) → no se escribe assetlinks.json');
}

if (errores.length) {
  console.error('\n✖ gen-deeplinks: datos mal formados — NO se escribe nada:\n');
  for (const e of errores) console.error(`    ${e}`);
  console.error('\n  Un archivo con un identificador equivocado rompe los enlaces profundos');
  console.error('  en silencio, así que es mejor no publicarlo.\n');
  process.exit(1);
}

if (escribir.length) mkdirSync(DIR, { recursive: true });
for (const [nombre, cuerpo] of escribir) {
  writeFileSync(join(DIR, nombre), `${JSON.stringify(cuerpo, null, 2)}\n`, 'utf8');
}

console.log(
  `gen-deeplinks · ${escribir.length ? escribir.map(([n]) => n).join(' + ') : 'nada que escribir'} en ${DIR}`,
);
for (const n of notas) console.log(`  · ${n}`);
if (notas.length) {
  console.log('  → es lo esperado hasta que existan las cuentas de tienda (Fase 1/2 en docs/LAUNCH-CHECKLIST.md §4).');
}
