// Prueba al revés de los guardianes de 9l (Avisos, correo y canales: el único camino de los SMS con reintentos, el correo entrante de Soporte solo firmado,
// las firmas y el contrato de los canales, las promesas de SMS sin excepciones y las plantillas que existen). Se inyecta el defecto, el guardián debe fallar
// con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0142_canales.sql', S = 'apps/web/lib/sms/index.ts', SIM = 'apps/web/lib/sms/simulador.ts', A = 'apps/web/lib/avisos.ts', K = 'apps/web/lib/compa/canales.ts',
  CU = 'apps/web/lib/cuenta.ts', CO = 'apps/web/lib/sms/codigo.ts', BA = 'apps/web/lib/barrido.ts', E = 'apps/web/lib/correo/entrante.ts', RE = 'apps/web/app/api/correo/entrada/route.ts',
  RC = 'apps/web/app/api/compa/entrada/[proveedor]/route.ts', CS = 'scripts/contrato-canales/correr.sh', CP = 'scripts/contrato-canales/prueba.cjs', CI = 'apps/web/lib/correo/index.ts',
  TX = 'apps/web/lib/textos.ts', EQ = 'apps/web/app/panel/acciones-equipo.ts';
const casos = [
  // smsConReintento: el reclamo sin tope, sin anotar el intento, el código vencido sale, reintentar sin espera o sin tope, el aviso viejo mueve el SMS, el barrido
  // no retoma, el simulador en producción, los avisos o El Compa por fuera, el código que no sale, el texto en claro, la base deja retroceder
  ['smsConReintento', S, 'where id = $1::bigint and attempts < max_attempts and purged_at is null', 'where id = $1::bigint and purged_at is null'],
  ['smsConReintento', S, 'await db().query(`insert into sms_attempts (sms_id, n, provider, provider_msg_id, accepted, error_code) values ($1::bigint, $2, $3, $4, $5, $6)`,', 'await db().query(`select $1, $2, $3, $4, $5, $6`,'],
  ['smsConReintento', S, 'if (f.vencido || !tel || !texto) return cerrar(id, "vencido"', 'if (!tel || !texto) return cerrar(id, "vencido"'],
  ['smsConReintento', S, 'if (permanente || n >= max || v?.vencido) return cerrar(id, "fallo"', 'if (permanente) return cerrar(id, "fallo"'],
  ['smsConReintento', S, '[id, base * 2 ** (n - 1), codigo ? codigo.slice(0, 40) : null]', '[id, 0, codigo ? codigo.slice(0, 40) : null]'],
  ['smsConReintento', S, 'if (!s || s.status !== "enviado" || s.attempts !== a.n) return', 'if (!s || s.status !== "enviado") return'],
  ['smsConReintento', BA, '["sms", async () => (await import("./sms")).reintentarSms()], ', ''],
  ['smsConReintento', SIM, '  if (ENTORNO === "produccion") throw new Error("CANDADO: el simulador de SMS no existe en producción.");\n', ''],
  ['smsConReintento', A, '  const r = await enviarSms({ tel, texto, tpl, origen:', '  const r = await fetch("https://sms.ejemplo.invalid", { method: "POST" }).then(() => null) ?? await enviarSms({ tel, texto, tpl, origen:'],
  ['smsConReintento', K, '    const s = await enviarSms({ tel: o.tel, texto, origen: { kind: "compa", id }, ciudad: o.ciudad, de: o.n.address });', '    const s = await mandar("telnyx", o.n.address, o.tel, texto).then(() => null);'],
  ['smsConReintento', CU, '  const sms = await (await import("./sms/codigo")).smsCodigo(tel, codigo, CODIGO_MIN, await langPantalla());\n  if (MODO_SMS === "pruebas") return { reenviarEn: REENVIO_SEG, codigoPrueba: codigo };\n  if (!sms', '  const sms = null as { estado: string } | null;\n  if (MODO_SMS === "pruebas") return { reenviarEn: REENVIO_SEG, codigoPrueba: codigo };\n  if (!sms'],
  ['smsConReintento', CO, 'venceSeg: minutos * 60', 'venceSeg: null'],
  ['smsConReintento', M, "  body_enc         bytea,", "  body             text,"],
  ['smsConReintento', M, "    raise exception 'ese SMS ya se decidió (% → %)', old.status, new.status;", "    null;"],
  // correoEntranteFirmado: leer el aviso antes de la firma, aceptar con firma mala, sin el tema propio, otro host o http en producción, pasar spam o sin SPF/DKIM,
  // un correo sin confirmar, el texto sin tapar, otro archivo que escribe, la base sin ids únicos
  ['correoEntranteFirmado', RE, '  const f = await firmaSns(m);\n  if (!f.ok) return no(401);', '  const previo = await recibirCorreo("x", JSON.parse(String(m.Message ?? "{}"))).catch(() => null); void previo;\n  const f = await firmaSns(m);\n  if (!f.ok) return no(401);'],
  ['correoEntranteFirmado', RE, '  if (!f.ok) return no(401);', '  if (!f.ok && false) return no(401);'],
  ['correoEntranteFirmado', E, '  if (m.TopicArn !== tema) return { ok: false, motivo: "tema" };\n', ''],
  ['correoEntranteFirmado', E, 'const HOST_SNS = /^sns\\.[a-z0-9-]+\\.amazonaws\\.com$/;', 'const HOST_SNS = /^[a-z0-9.-]+$/;'],
  ['correoEntranteFirmado', E, '    if (x.protocol === "https:" && (x.port === "" || x.port === "443") && HOST_SNS.test(x.hostname)) return true;', '    if ((x.protocol === "https:" || x.protocol === "http:") && HOST_SNS.test(x.hostname)) return true;'],
  ['correoEntranteFirmado', E, '  if (ENTORNO === "produccion") return [];\n', ''],
  ['correoEntranteFirmado', E, 'virus !== "PASS" ? "virus" : spam !== "PASS" ? "spam" : spf !== "PASS" && dkim !== "PASS"', 'virus !== "PASS" ? "virus" : spf !== "PASS" && dkim !== "PASS"'],
  ['correoEntranteFirmado', E, "where lower(email::text) = $1 and coalesce(email_verified, false) and status", "where lower(email::text) = $1 and status"],
  ['correoEntranteFirmado', E, 'const texto = tapar(sinCitas(textoDelCorreo(', 'const texto = ((x: string) => ({ texto: x }))(sinCitas(textoDelCorreo('],
  ['correoEntranteFirmado', M, "  sns_message_id  text not null unique check", "  sns_message_id  text not null check"],
  // canalConFirma (ampliado): los avisos de entrega antes de la firma, Telnyx desde los avisos, el contrato a master o sin probar una función
  ['canalConFirma', RC, '  let j: unknown;\n  try { j = JSON.parse(cuerpo.toString("utf8")); }', '  if (cuerpo.length < 0) await anotar(leerEstadosTelnyx(null), []);\n  let j: unknown;\n  try { j = JSON.parse(cuerpo.toString("utf8")); }'],
  ['canalConFirma', CS, '"https://raw.githubusercontent.com/team-telnyx/openapi/$TELNYX_COMMIT/openapi/spec3.json"', 'https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json'],
  ['canalConFirma', CS, 'echo "$META_SHA256  $SPECS/meta.yaml" | sha256sum -c --quiet - || { echo "✗ la especificación de Meta no es la fijada ($META_COMMIT)" >&2; exit 1; }\n', ''],
  ['canalConFirma', CS, 'echo "$TELNYX_SHA256  $SPECS/telnyx.json" | sha256sum -c --quiet - || { echo "✗ la especificación de Telnyx no es la fijada ($TELNYX_COMMIT)" >&2; exit 1; }\n', ''],
  ['canalConFirma', CP, "const r3 = await P.mandarPlantilla(", "const r3 = await P.mandar('whatsapp', "],
  // promesaSms (sin excepciones): una promesa nueva sin su plantilla, la plantilla que la cumple sin SMS, o que nadie manda
  ['promesaSms', 'apps/web/lib/textos-cuenta.ts', 'export ', 'const PROMESA_9L = "Te avisamos por SMS cuando llegue."; void PROMESA_9L;\nexport '],
  ['promesaSms', M, "('equipo_invitado', 'tx', null, true, 'sin_push', false,", "('equipo_invitado', 'tx', null, false, 'nunca', false,"],
  ['promesaSms', EQ, 'await avisarTelefono(tel, "equipo_invitado", ', 'await avisarTelefono(tel, "biz_job", '],
  ['promesaSms', 'apps/web/app/admin/acciones-colas.ts', 'accion === "quitar" ? "foto_rep_quitada" : "foto_rep_queda"', 'accion === "quitar" ? "foto_rep_quitada" : "foto_rep_quitada"'],
  // avisoConPlantilla (ampliado): un correo que la base no acepta, un SMS con plantilla inventada
  ['avisoConPlantilla', CI, '| "support_ack" | "weekly";', '| "support_ack" | "weekly" | "promo_flash";'],
  ['avisoConPlantilla', CO, 'tpl: "cuenta_codigo"', 'tpl: "cuenta_codigo_v2"'],
  // smsSoloRespaldo (ampliado): el aviso manda en línea el SMS de respaldo
  ['smsSoloRespaldo', A, 'if (st === "pendiente" || st === "pruebas") await salirSms("notifications", id,', 'if (st1 === "pendiente" || st1 === "pruebas") await salirSms("notifications", id,'],
];
const crear = [
  // smsConReintento: otro archivo que escribe sms_outbox o manda por Telnyx o usa el simulador
  ['smsConReintento', 'apps/web/lib/zz9l.ts', 'import "server-only";\nexport const q = `insert into sms_outbox (to_hash) values ($1)`;\n'],
  ['smsConReintento', 'apps/web/lib/zz9l.ts', 'import "server-only";\nimport { mandar } from "./compa/canales-proveedor";\nexport const f = (t: string) => mandar("telnyx", "+15705559001", t, "hola");\n'],
  ['smsConReintento', 'apps/web/lib/zz9l.ts', 'import "server-only";\nexport const u = "https://api.telnyx.com/v2/messages";\n'],
  ['smsConReintento', 'apps/web/lib/zz9l.ts', 'import "server-only";\nimport { simularEnvio } from "./sms/simulador";\nexport const f = (t: string) => simularEnvio(t, 1);\n'],
  // correoEntranteFirmado: otro archivo que escribe el correo entrante
  ['correoEntranteFirmado', 'apps/web/lib/zz9l.ts', 'import "server-only";\nexport const q = `insert into support_email_in (sns_message_id) values ($1)`;\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
