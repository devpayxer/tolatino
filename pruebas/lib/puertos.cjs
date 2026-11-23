// 22 nov · Los puertos de una corrida de pruebas, en UN sitio. Dos encargos a la vez en la misma máquina, cada uno con su servidor, no se pisan si cada
// uno corre con su propia dirección. MANDA UNA SOLA VARIABLE: PRUEBAS_URL (por ejemplo http://localhost:3120). Sin variables, todo queda como siempre
// (servidor en :3100 y simuladores en sus puertos de siempre).
//   · Solo PRUEBAS_PUERTO (sin PRUEBAS_URL): la dirección sale de ahí (http://localhost:<puerto>).
//   · Las dos y no coinciden: error claro ANTES de arrancar nada.
// Los simuladores y servicios de las pruebas se desplazan igual que el servidor: puerto = nominal + (puerto del servidor - 3100). Con el servidor en
// :3100 el desplazamiento es 0 y nada cambia. Dos corridas a la vez: sus servidores a 20 puertos o más de distancia (3100 y 3120, no 3100 y 3101, o los
// simuladores de una caerían sobre los de la otra). Quién lo usa: pruebas/lib/entorno.cjs (ENT.B, ENT.P), pruebas/servir/servir.sh (por --sh),
// pruebas/correr.mjs y las pruebas que levantan un simulador (ENT.P.<nombre>).
// La base (PRUEBAS_DB_PUERTO / PRUEBAS_DB_CONT) y el almacén (PRUEBAS_S3_PUERTO / PRUEBAS_WEB_PUERTO / PRUEBAS_MEDIOS_CONT) ya tienen su propia variable en
// pruebas/servir/base.sh y no se desplazan: son contenedores con nombre, no procesos de la corrida.
const SERVIDOR = 3100;
// Los puertos nominales (con el servidor en :3100). El nombre es el de la clave en ENT.P y, en mayúsculas con «P_» delante, el de la variable de servir.sh.
const NOMINAL = {
  servidor: SERVIDOR,
  apns: 4401, fcm: 4402, webpush: 4403,   // 8c · simuladores de push (scripts/push-sim)
  asc: 4404,                              // 8f/8h · App Store Connect (scripts/tiendas-sim)
  google: 4405, pases: 4406,              // 8g · Google Wallet + OAuth + AIA (4405) y APNs de pases con TLS (4406)
  github: 4407, play: 4408,               // 8h · GitHub (JWKS + workflow_dispatch) y Google Play
  sns: 4409,                              // 9l · el certificado de «SNS» del correo entrante
  provStripe: 4410, provTelnyx: 4411, provMeta: 4412,   // 23 nov · las lecturas de «Probar» de Stripe, Telnyx y Meta (scripts/proveedores-sim; los usa prov9v)
  provSes: 4413, provAnthropic: 4414,     // 23 nov · y las de SES (firma SigV4 recalculada) y del proveedor de IA (solo /v1/models)
  moderacion: 8790, video: 8791,          // 5d / C-001 · servicios propios (moderación de imágenes y video)
  traductorDm: 5098, traductor: 5099,     // 5h / 9t · el traductor de mentira (dm9t · com5h y msg9t)
};

function leerPuerto(txt, de) {
  if (!/^[0-9]+$/.test(String(txt))) throw new Error(`${de} no es un puerto: «${txt}»`);
  return Number(txt);
}

// → { url, puerto, desp, p } · p: todos los puertos (servidor incluido) ya desplazados. Lanza Error con el motivo en español.
function resolver(env = process.env) {
  const u = (env.PRUEBAS_URL || '').trim(), p = (env.PRUEBAS_PUERTO || '').trim();
  let url = null, puerto = null;
  if (u) {
    let x; try { x = new URL(u); } catch { throw new Error(`PRUEBAS_URL no es una dirección: «${u}» (ejemplo: http://localhost:3120)`); }
    if (!/^https?:$/.test(x.protocol) || !x.port || (x.pathname !== '/' && x.pathname !== '') || x.search || x.hash) {
      throw new Error(`PRUEBAS_URL tiene que ser http://servidor:puerto, sin ruta (ejemplo: http://localhost:3120); llegó «${u}»`);
    }
    url = `${x.protocol}//${x.host}`; puerto = Number(x.port);
  }
  if (p) {
    const q = leerPuerto(p, 'PRUEBAS_PUERTO');
    if (puerto !== null && q !== puerto) throw new Error(`PRUEBAS_URL (${u}, puerto ${puerto}) y PRUEBAS_PUERTO (${q}) no coinciden: manda UNA, PRUEBAS_URL; quita PRUEBAS_PUERTO o ponle el mismo puerto`);
    if (puerto === null) { puerto = q; url = `http://localhost:${q}`; }
  }
  if (puerto === null) { puerto = SERVIDOR; url = `http://localhost:${SERVIDOR}`; }
  const desp = puerto - SERVIDOR, pp = {};
  for (const [k, v] of Object.entries(NOMINAL)) {
    pp[k] = v + desp;
    if (pp[k] < 1024 || pp[k] > 65535) throw new Error(`el puerto ${puerto} deja el puerto de «${k}» fuera de 1024–65535 (${pp[k]}): usa uno entre 1024 y 59000`);
  }
  return { url, puerto, desp, p: pp };
}

module.exports = { NOMINAL, SERVIDOR, resolver };

// Para bash (servir.sh): node pruebas/lib/puertos.cjs --sh  →  PUERTO=3120 P_APNS=4421 … (una por renglón; se evalúa). Con error sale 2 y dice el motivo.
if (require.main === module) {
  try {
    const r = resolver();
    if (process.argv.includes('--sh')) { console.log(`PUERTO=${r.puerto}`); for (const [k, v] of Object.entries(r.p)) if (k !== 'servidor') console.log(`P_${k.toUpperCase()}=${v}`); }
    else console.log(JSON.stringify(r, null, 1));
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
}
