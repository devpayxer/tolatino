// Prueba al revés de los guardianes de 8c (avisos push propios): se inyecta el defecto, el guardián debe fallar; se restaura.
// Casos de «crear»: se crea el archivo, se corre el guardián y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const C = 'apps/web/lib/push/cola.ts', T = 'apps/web/lib/push/tokens.ts', W = 'apps/web/lib/push/webpush.ts', L = 'apps/web/lib/push/llaves.ts', AD = 'apps/web/lib/push/admin.ts',
  AV = 'apps/web/lib/avisos.ts', M = 'packages/db/migrations/0126_push.sql', AN = 'apps/web/app/admin/acciones-notif.ts', SW = 'apps/web/public/sw-push.js', NA = 'apps/web/lib/nativo/avisos.ts',
  CH = 'apps/web/lib/chofer.ts', PA = 'apps/web/app/(app)/n/[id]/pagar/Pagar.tsx', UU = 'apps/web/lib/uuid.ts', BOO = 'apps/web/app/(app)/n/[id]/cita/Booking.tsx',
  PM = 'apps/web/lib/apelaciones.ts';
const casos = [
  // pushConPlantilla
  ['pushConPlantilla', C, 'join notifications n on n.id = x.nid join notif_templates tp on tp.key = n.tpl', 'join notifications n on n.id = x.nid'],
  ['pushConPlantilla', AD, 'await avisar(s.id, "push_prueba", {}, { href: "/avisos" });', 'await (await import("./cola")).encolar([]);'],
  ['pushConPlantilla', M, 'notification_id bigint not null references notifications (id),\n  token_id        bigint not null references push_tokens (id),\n  city_id', 'notification_id bigint references notifications (id),\n  token_id        bigint not null references push_tokens (id),\n  city_id'],
  // pushPrivadoSinTexto
  ['pushPrivadoSinTexto', C, 'JSON.stringify(x.priv ? GENERICO[x.lang === "en" ? "en" : "es"] : {', 'JSON.stringify(false ? GENERICO[x.lang === "en" ? "en" : "es"] : {'],
  ['pushPrivadoSinTexto', C, 'b: "Tienes un aviso nuevo en To\'Latino." }', 'b: "Tienes un aviso de Salud." }'],
  ['pushPrivadoSinTexto', M, "check (push_private or not (key ~ '^(sal_|biz_sal_|nin_|ninos_|cuenta_)' or grp in ('support', 'mod')))", "check (push_private or not (key ~ '^(sal_|biz_sal_)'))"],
  ['pushPrivadoSinTexto', AN, 'if (campo === "priv" && p.fija && valor !== "si") return', 'if (campo === "priv" && false) return'],
  // smsSoloRespaldo
  ['smsSoloRespaldo', AV, 'const st = pst === "pendiente" && r.sms_mode === "sin_push" && (st1 === "pendiente" || st1 === "pruebas") ? "respaldo" : st1;', 'const st = st1;'],
  ['smsSoloRespaldo', AV, "where n.id = $1::bigint and n.sms_status = 'respaldo' and tp.key = n.tpl", "where n.id = $1::bigint and tp.key = n.tpl"],
  ['smsSoloRespaldo', C, 'for (const r of R) if (!r.ok && r.sms === "respaldo")', 'for (const r of R) if (r.sms === "respaldo")'],
  ['smsSoloRespaldo', M, "and (sms_mode <> 'siempre' or grp = 'crit'))", ")"],
  // pushFueraDeTx
  ['pushFueraDeTx', T, '    return { ok: true, id, nuevo: true };', '    await (await import("./cola")).enviarPendientes();\n    return { ok: true, id, nuevo: true };'],
  ['pushFueraDeTx', AV, '      await c.query(`insert into notif_digests', '      await encolar([nid ?? ""]);\n      await c.query(`insert into notif_digests'],
  // tokensCifrados
  ['tokensCifrados', T, '[userId, ses.id, ses.city, app, ses.platform, p, cifrar(tok), h,', '[userId, ses.id, ses.city, app, ses.platform, p, Buffer.from(tok), h,'],
  ['tokensCifrados', AD, 'right(token_hash, 6) as huella', 'encode(token_enc, \'escape\') as huella'],
  ['tokensCifrados', T, 'select t.id::text, coalesce(t.label, t.platform) as label', 'select t.id::text, t.token_hash, coalesce(t.label, t.platform) as label'],
  // pushSoloServiciosConocidos
  ['pushSoloServiciosConocidos', W, 'return u.protocol === "https:" && (u.port === "" || u.port === "443") && HOSTS.some', 'return (u.protocol === "https:" || u.protocol === "http:") && HOSTS.some'],
  ['pushSoloServiciosConocidos', W, '  if (!endpointPermitido(s.endpoint, o.extra ?? [])) return { result: "invalido", code: "endpoint_no_permitido" };\n', ''],
  ['pushSoloServiciosConocidos', L, 'const env = (k: string) => (PROD ? undefined : process.env[k] || undefined);', 'const env = (k: string) => process.env[k] || undefined;'],
  ['pushSoloServiciosConocidos', L, 'fcm = { ...j, token_uri: TOKEN_URI }', 'fcm = j'],
  ['pushSoloServiciosConocidos', T, '    if (!endpointPermitido(t, HOSTS_WEB_EXTRA())) return { ok: false, msg: "endpoint" };\n', ''],
  // pushSinDuplicados
  ['pushSinDuplicados', M, '  unique (notification_id, token_id),\n', ''],
  ['pushSinDuplicados', C, 'on conflict (notification_id, token_id) do nothing\n', '\n'],
  ['pushSinDuplicados', C, 'limit $1 for update skip locked', 'limit $1'],
  ['pushSinDuplicados', C, "from r where n.id = r.nid and n.push_status = 'pendiente'", 'from r where n.id = r.nid'],
  // swPushSoloAbre
  ['swPushSoloAbre', SW, 'self.addEventListener("push", function (e) {', 'self.addEventListener("fetch", function (e) { e.respondWith(caches.match(e.request)); });\nself.addEventListener("push", function (e) {'],
  ['swPushSoloAbre', SW, 'RUTA.test(e.notification.data.u) ? e.notification.data.u : "/avisos"', 'e.notification.data.u'],
  ['swPushSoloAbre', SW, 'return self.clients.openWindow(destino);\n  }));', 'return self.clients.openWindow(e.notification.data.u);\n  }));'],
  ['swPushSoloAbre', NA, 'if (/^\\/app\\/aviso\\/\\d{1,18}(\\?v=push)?$/.test(u)) location.href = u;', 'location.href = u;'],
  // pushAbreSuApp (la clase que cazó chofer_salida)
  ['pushAbreSuApp', M, "when key like 'drv\\_%' or key like 'chofer\\_%' then 'delivery'", "when key like 'drv\\_%' then 'delivery'"],
  // uuidSinContextoSeguro
  ['uuidSinContextoSeguro', PA, 'const clave = useMemo(() => (uuid()), []);', 'const clave = useMemo(() => (crypto.randomUUID()), []);'],
  ['uuidSinContextoSeguro', UU, '  b[6] = (b[6]! & 0x0f) | 0x40;\n', ''],
  // permisosMinimos ampliado (POST_NOTIFICATIONS solo con el plugin de avisos: quitarlo de apps.json deja el permiso del manifiesto sin uso)
  ['permisosMinimos', 'apps/mobile/apps.json', '"plugins": ["App", "AppLauncher", "PushNotifications", "SplashScreen", "StatusBar", "TLAlcance", "TLLocal", "TLReporte"],', '"plugins": ["App", "AppLauncher", "SplashScreen", "StatusBar", "TLAlcance", "TLLocal", "TLReporte"],'],
];
const crear = [
  ['pushConPlantilla', 'apps/web/lib/push/otra-cola.ts', 'import "server-only";\nimport { db } from "../db";\nexport async function meter() { await db().query(`insert into push_outbox (notification_id, token_id, payload_enc, expires_at) values (1, 1, null, now())`); }\n'],
  ['pushConPlantilla', 'apps/web/app/admin/acciones-push-directo.ts', '"use server";\nimport { enviarApns } from "@/lib/push/apns";\nexport async function x() { return enviarApns("https://api.push.apple.com", { llavePem: "", idLlave: "", equipo: "" }, { token: "", topic: "", cuerpo: "", prioridad: 10, vence: 0 }); }\n'],
  ['tokensCifrados', 'apps/web/lib/push/robar.ts', 'import "server-only";\nimport { db } from "../db";\nexport async function ver(u: string) { return (await db().query(`select token_enc from push_tokens where user_id = $1`, [u])).rows; }\n'],
  ['pushAbreSuApp', 'apps/web/lib/aviso-mal.ts', 'import "server-only";\nimport { avisar } from "./avisos";\nexport async function x(u: string) { await avisar(u, "ord_ok", {}, { href: `/panel/sabor` }); }\n'],
];
let bien = 0, total = 0;
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { return [true, String(e.stderr).split('\n').find((l) => l.includes('[')) || '']; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r;
  r = correr(g); fs.writeFileSync(ruta, orig);
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.writeFileSync(ruta, c);
  const [falla, out] = correr(g);
  fs.unlinkSync(ruta);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
