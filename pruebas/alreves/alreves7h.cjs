// Prueba al revés de los guardianes de 7h (WhatsApp y SMS con enlace): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const RT = 'apps/web/app/api/compa/entrada/[proveedor]/route.ts', P = 'apps/web/lib/compa/canales-proveedor.ts', K = 'apps/web/lib/compa/canales.ts', E = 'apps/web/lib/compa/enlace.ts',
  PG = 'apps/web/app/(app)/compa/e/[token]/page.tsx', AC = 'apps/web/app/(app)/compa/e/[token]/acciones.ts', EC = 'apps/web/app/(app)/compa/e/[token]/EnlaceCompa.tsx',
  M = 'packages/db/migrations/0123_compa_canales.sql', C = 'apps/web/lib/compa/conversacion.ts', BA = 'apps/web/lib/barrido.ts';
const casos = [
  // canalConFirma · la ruta: firma antes de leer, 401, solo Telnyx y WhatsApp, la hora
  ['canalConFirma', RT, "  // ── La firma, antes de leer nada ──\n", "  const j0 = JSON.parse(cuerpo.toString(\"utf8\")); void j0;\n  // ── La firma, antes de leer nada ──\n"],
  ['canalConFirma', RT, "  if (!f.ok) { await contarRechazo(p, f.motivo); return no(401); }", "  if (!f.ok) { await contarRechazo(p, f.motivo); }"],
  ['canalConFirma', RT, 'if (p !== "telnyx" && p !== "whatsapp") return no(404);', 'if (p !== "telnyx" && p !== "whatsapp" && p !== "sim") return no(404);'],
  ['canalConFirma', RT, 'await valor("compa_canal_firma_seg"))', '86400 * 365)'],
  ['canalConFirma', RT, '(!m.hora || Math.abs(Date.now() - m.hora.getTime()) > DIA_MS)', '(!m.hora)'],
  ['canalConFirma', RT, 'const cuerpo = Buffer.from(await req.arrayBuffer());', 'const cuerpo = Buffer.from(JSON.stringify(await req.json()));'],
  // canalConFirma · el proveedor: sin secreto nada entra, Ed25519 con la hora, tiempo constante
  ['canalConFirma', P, '  if (!llave) return { ok: false, motivo: "sin_secreto" };', '  if (!llave) return { ok: true };'],
  ['canalConFirma', P, '  if (!secreto) return { ok: false, motivo: "sin_secreto" };', '  if (!secreto) return { ok: true };'],
  ['canalConFirma', P, 'ok = verify(null, Buffer.concat([Buffer.from(`${hora}|`, "utf8"), cuerpo]), k, sig);', 'ok = verify(null, cuerpo, k, sig);'],
  ['canalConFirma', P, '  if (Math.abs(ahora - Number(hora)) > ventana) return { ok: false, motivo: "hora" };\n', ''],
  ['canalConFirma', P, 'return a.length === b.length && timingSafeEqual(a, b) ? { ok: true } : { ok: false, motivo: "firma" };', 'return m[1] === b.toString("hex") ? { ok: true } : { ok: false, motivo: "firma" };'],
  ['canalConFirma', P, 'return a.length === b.length && timingSafeEqual(a, b) ? reto : null;', 'return token === esperado ? reto : null;'],
  // canalConFirma · idempotencia, identidad, nada por mensaje, la salida, el simulador
  ['canalConFirma', K, 'on conflict (provider, provider_msg_id) do nothing returning id::text', 'returning id::text'],
  ['canalConFirma', M, '  unique (provider, provider_msg_id)\n', '  check (true)\n'],
  ['canalConFirma', K, "phone_verified_at is not null and cuenta_estado(status, status_until) in ('active', 'muted')", "cuenta_estado(status, status_until) in ('active', 'muted')"],
  ['canalConFirma', K, "\n        and coalesce(notif_prefs->>'cpa', 'false') = 'true' limit 2", " limit 2"],
  ['canalConFirma', K, '  if (U.length !== 1) {', '  if (!U.length) {'],
  ['canalConFirma', K, 'import { crearEnlace } from "./enlace";', 'import { crearEnlace, usarEnlace } from "./enlace"; void usarEnlace;'],
  ['canalConFirma', K, '  let enlace: string | null = null;', '  let enlace: string | null = null;\n  if (r.accion) await (await import("./acciones")).confirmar({ userId: u.id }, r.accion.id, "link");'],
  ['canalConFirma', K, '  else if (!(await canalEncendido(canal))) st = "apagado";', '  else if (false) st = "apagado";'],
  ['canalConFirma', K, "received_at > now() - interval '24 hours'", "received_at > now() - interval '7 days'"],
  ['canalConFirma', K, '(await tarde(o))) st = "silencio"', '(false)) st = "silencio"'],
  ['canalConFirma', K, '  if (ENTORNO === "produccion") return { ok: false, msg: "El simulador no existe en producción." };\n', ''],
  ['canalConFirma', K, '  } catch {\n    // Sin el error en el registro', '  } catch (err) {\n    console.error("[canal]", err);\n    // Sin el error en el registro'],
  // canalConFirma · el enlace: huella, de esa cuenta, una vez, sin vencer, sin sesión → Entrar, mismo origen
  ['canalConFirma', E, '[sha(token), x.accion', '[token.padEnd(64, "0").slice(0, 64), x.accion'],
  ['canalConFirma', E, '    if (l.user_id !== q.userId) return', '    if (false) return'],
  ['canalConFirma', E, '    if (l.usado) return', '    if (false) return'],
  ['canalConFirma', E, '    if (l.vencido) return', '    if (false) return'],
  ['canalConFirma', E, 'from compa_links where token_hash = $1 for update`, [h]', 'from compa_links where token_hash = $1`, [h]'],
  ['canalConFirma', E, 'await confirmar({ userId: q.userId }, l.action_id, "link")', 'await confirmar({ userId: l.user_id }, l.action_id, "link")'],
  ['canalConFirma', PG, '  if (!u?.first_name) redirect(`/entrar?volver=', '  if (!u?.first_name && false) redirect(`/entrar?volver='],
  ['canalConFirma', PG, 'import { yo } from "@/lib/cuenta";', 'import { yo } from "@/lib/cuenta";\nimport { cookies } from "next/headers"; void cookies();'],
  ['canalConFirma', AC, '  if (!(await mismoOrigen())) return { ok: false, estado: "no", msg: SIN };\n', ''],
  ['canalConFirma', 'packages/db/migrations/0142_canales.sql', "if texto_con_secretos(coalesce(new.body, '')) then raise exception 'compa_sin_secretos: la salida", "if false then raise exception 'compa_sin_secretos: la salida"],  // 9l: la última definición de compa_outbound_antes es la de 0142 (también lo enviado → entregado)
  ['canalConFirma', 'apps/web/lib/avisos.ts', 'async function enBajaSms(', 'const META = "https://graph.facebook.com"; void META;\nasync function enBajaSms('],
  // libroSoloInsercion (7h)
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'compa_inbound es solo de inserción'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', M, "  if old.used_at is not null then raise exception 'compa_enlace_usado: ese enlace ya se usó'; end if;\n", ''],
  ['libroSoloInsercion', M, "    raise exception 'compa_inbound: el procesamiento solo avanza';", "    null;"],
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'compa_canal_consent es solo de inserción'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'un número de El Compa no se borra: se retira'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', K, "  const a = (await db().query(`update compa_inbound set body = null", "  await db().query(`delete from compa_canal_consent where at < now() - interval '1 year'`);\n  const a = (await db().query(`update compa_inbound set body = null"],
  ['libroSoloInsercion', E, "update compa_links set used_at = now(), used_result = case", "update compa_links set expires_at = now() + interval '1 day', used_at = now(), used_result = case"],
  // compaTapaSecretos (7h): la entrada y la salida tapadas
  ['compaTapaSecretos', K, 'const body = e.texto.trim() ? tapar(e.texto.slice(0, 2000)).texto : null;', 'const body = e.texto.trim() ? e.texto.slice(0, 2000) : null;'],
  ['compaTapaSecretos', K, 'texto = plano(tapar(o.texto).texto, canal), guardado = plano(tapar(o.guardar ?? o.texto).texto, canal)', 'texto = plano(o.texto, canal), guardado = plano(o.guardar ?? o.texto, canal)'],
  // compaTapaEnElMotor (7h): el mensaje de un contacto sin cuenta tapado
  ['compaTapaEnElMotor', C, '[v.id, ciudad, x.contacto.hash, tapar(ultimo || "(sin texto)").texto]', '[v.id, ciudad, x.contacto.hash, x.texto || "(sin texto)"]'],
  // compaSiempreIA (7h): el enlace con el aviso de IA y «Con una persona»
  ['compaSiempreIA', EC, '"EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE. LO QUE MUEVE DINERO O CAMBIA TU CUENTA LO REVISA UNA PERSONA."', '"EL COMPA PUEDE EQUIVOCARSE."'],
  ['compaSiempreIA', EC, 'personLabel={E2("Con una persona", "Talk to a person")}', 'personLabel={ok ? E2("Con una persona", "Talk to a person") : null}'],
  ['compaSiempreIA', EC, 'disclaimer={disc}', 'disclaimer={null}'],
  // privacidadSalud: descifrar solo en los archivos permitidos (el teléfono de canales sí; otro archivo de El Compa no)
  ['privacidadSalud', E, 'import { opVecino, type OpHoja } from "./hoja";', 'import { opVecino, type OpHoja } from "./hoja";\nimport { descifrar } from "../cifrado"; void descifrar(null);'],
  // barridoCompleto: la retoma de canales corre en el barrido central
  ['barridoCompleto', BA, '        ["compaCanales", async () => (await import("./compa/canales")).barrerCanales()],\n', ''],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${casos.length} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
