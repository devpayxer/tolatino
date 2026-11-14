// Prueba al revés de los guardianes de 9h (Crecimiento: enlaces y QR de calle que solo llevan a rutas propias, escaneos sin personas, campañas con permiso,
// silencio y tope, el sandbox que no se indexa, la lista de la landing sin copiar teléfonos y con las líneas fijas de §1c, los dos idiomas de la landing).
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0138_crecimiento.sql', C = 'apps/web/lib/crecimiento/comun.ts', E = 'apps/web/lib/crecimiento/enlaces.ts', Q = 'apps/web/app/q/[code]/route.ts',
  K = 'apps/web/lib/crecimiento/campanas.ts', AD = 'apps/web/lib/crecimiento/admin.ts', PF = 'apps/web/lib/perfil.ts', LI = 'apps/web/lib/crecimiento/lista.ts',
  RB = 'apps/web/app/robots.ts', SM = 'apps/web/lib/seo/mapa.ts', SX = 'apps/web/app/sitemap.xml/route.ts', LY = 'apps/web/app/layout.tsx', NG = 'infra/pruebas/nginx-pruebas.conf', AC = 'apps/web/app/acceso/acciones.ts',
  LA = 'apps/web/app/acceso/Landing.tsx', TX = 'apps/web/lib/textos-acceso.ts';
const casos = [
  // enlaceSoloPropio: la base deja otro origen, rutaPropia se afloja, crear no revisa, el escaneo redirige a lo que diga la base, /q lee un parámetro, la campaña sin revisar
  ['enlaceSoloPropio', M, "and target !~ '^//' and position('\\' in target) = 0", "and position('\\' in target) = 0"],
  ['enlaceSoloPropio', M, "href !~ '^//'))", "true))"],
  ['enlaceSoloPropio', C, '&& !t.startsWith("//")', ''],
  ['enlaceSoloPropio', E, 'if (!rutaPropia(target)) return mal(', 'if (false) return mal('],
  ['enlaceSoloPropio', E, 'if (!l || !l.vivo || !rutaPropia(l.target)) return { destino: "/"', 'if (!l || !l.vivo) return { destino: "/"'],
  ['enlaceSoloPropio', Q, 'NextResponse.redirect(new URL(r.destino, ', 'NextResponse.redirect(new URL(req.nextUrl.searchParams.get("a") ?? r.destino, '],
  ['enlaceSoloPropio', K, 'if (href && !rutaPropia(href)) return mal(', 'if (false) return mal('],
  // escaneosSinPersonas: el escaneo guarda la IP o el dispositivo, deja de ser de solo inserción, el derivado se puede escribir, el escaneo guarda más
  ['escaneosSinPersonas', M, "  ua_class  text not null check (ua_class in ('telefono', 'escritorio', 'otro'))\n);", "  ua_class  text not null check (ua_class in ('telefono', 'escritorio', 'otro')),\n  ip        inet\n);"],
  ['escaneosSinPersonas', M, "  app       text not null check (app in ('web', 'app')),", "  app       text not null check (app in ('web', 'app')),\n  device    uuid,"],
  ['escaneosSinPersonas', M, 'create trigger link_scans_no_cambia before update or delete on link_scans', 'create trigger link_scans_no_cambia before update on link_scans'],
  ['escaneosSinPersonas', M, "if coalesce(current_setting('tl.crec_derivado', true), '') <> 'on' then raise exception 'link_scan_days es un derivado", "if false then raise exception 'link_scan_days es un derivado"],
  ['escaneosSinPersonas', E, 'insert into link_scans (code, city_id, app, ua_class) values ($1, $2, $3, $4)', 'insert into link_scans (code, city_id, app, ua_class, ip) values ($1, $2, $3, $4, $5)'],
  ['escaneosSinPersonas', AD, 'select e.id::text, e.zip, ci.name as ciudad,', 'select e.id::text, e.zip, (select phone from users where id = e.user_id) as tel, ci.name as ciudad,'],
  // campanaConPermiso: el segmento sin «Novedades», manda de noche, sin tope, sin aprobación, la misma persona aprueba, mkt nace encendido, la landing lo enciende
  ['campanaConPermiso', K, "and (u.notif_prefs->>'mkt') = 'true' and cuenta_estado", 'and cuenta_estado'],
  ['campanaConPermiso', K, 'if (!x || x.silencio) return null;', 'if (!x) return null;'],
  ['campanaConPermiso', K, 'u.semana >= cfg.campana_por_semana', 'u.semana >= 1000'],
  ['campanaConPermiso', K, 'x.canal === "sms" && u.sms_mes >= cfg.campana_sms_por_mes', 'x.canal === "sms" && false'],
  ['campanaConPermiso', K, 'const porAprobar = n > cfg.campana_aprobar_desde;', 'const porAprobar = false;'],
  ['campanaConPermiso', K, 'if (x.by === s.id) return mal(', 'if (false) return mal('],
  ['campanaConPermiso', M, 'check (approved_by is null or approved_by <> created_by),', ''],
  ['campanaConPermiso', M, 'create trigger campaign_sends_no_cambia before update or delete on campaign_sends', 'create trigger campaign_sends_no_cambia before delete on campaign_sends'],
  ['campanaConPermiso', M, "('mkt_campana_push', 'mkt', 'mkt',", "('mkt_campana_push', 'mkt', null,"],
  ['campanaConPermiso', PF, 'cpa: false, mkt: false };', 'cpa: false, mkt: true };'],
  ['campanaConPermiso', LI, '    // La ciudad queda puesta en la cuenta', "    await q.query(`update users set notif_prefs = notif_prefs || '{\"mkt\": true}' where id = $1`, [uid]);\n    // La ciudad queda puesta en la cuenta"],
  // sandboxNoSeIndexa: robots deja indexar, el mapa sale en el sandbox o se arma en el build, el layout sin noindex, una página indexable a mano, nginx sin la cabecera
  ['sandboxNoSeIndexa', RB, 'if (ENTORNO !== "produccion") return { rules: [{ userAgent: "*", disallow: "/" }] };', 'if (ENTORNO === "local") return { rules: [{ userAgent: "*", disallow: "/" }] };'],
  ['sandboxNoSeIndexa', SM, 'export const mapaActivo = () => ENTORNO === "produccion";', 'export const mapaActivo = () => true;'],
  ['sandboxNoSeIndexa', SX, 'export const dynamic = "force-dynamic";', ''],
  ['sandboxNoSeIndexa', LY, '  ...(ENTORNO !== "produccion" ? { robots: { index: false, follow: false } } : {}),\n', ''],
  ['sandboxNoSeIndexa', 'apps/web/app/(app)/eventos/page.tsx', 'export const metadata: Metadata = { title:', 'export const metadata: Metadata = { robots: { index: true }, title:'],
  ['sandboxNoSeIndexa', NG, '    add_header X-Robots-Tag "noindex, nofollow" always;\n\n    # Página de estado', '\n    # Página de estado'],
  ['sandboxNoSeIndexa', NG, '        add_header Cache-Control "public, max-age=604800";\n        add_header X-Robots-Tag "noindex, nofollow" always;\n', '        add_header Cache-Control "public, max-age=604800";\n'],
  // listaConPermiso: la lista copia el teléfono, se puede borrar, se anota sin el código de entrada, una acción sin mismoOrigen, la frase fija reescrita, quitarse no sale de «Avísame»
  ['listaConPermiso', M, "  zip               text not null check (zip ~ '^[0-9]{5}$'),", "  zip               text not null check (zip ~ '^[0-9]{5}$'),\n  phone             text,"],
  ['listaConPermiso', M, "    if coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;\n    raise exception 'la lista no se borra: se quita (removed_at)';", '    return old;'],
  ['listaConPermiso', LI, 'try { uid = (await verificarCodigo(String(p.tel ?? ""), String(p.codigo ?? ""))).id; }', 'try { uid = String(p.tel); }'],
  ['listaConPermiso', AC, 'export async function listaQuitar() {\n  if (!(await mismoOrigen())) return NO;', 'export async function listaQuitar() {'],
  ['listaConPermiso', LA, '{d.fijas.landing}', '{t.sub}'],
  ['listaConPermiso', LI, "    await q.query(`update city_waitlist set removed_at = now() where user_id = $1 and source = 'coming_soon' and removed_at is null`, [uid]);\n", ''],
  // promotorAntiabuso: su propio código vale, el mismo dispositivo no se mira, se dan los días sin revisar, el referido fuera de la transacción, el código propio en F1, otra vez en el código
  ['promotorAntiabuso', 'apps/web/lib/crecimiento/promotores.ts', '  if (k.promotor === dueno) return false;\n', ''],
  ['promotorAntiabuso', 'apps/web/lib/crecimiento/promotores.ts', 'select pts_mismo_dispositivo($1::uuid, $2::uuid, $3::uuid) as v', 'select false as v'],
  ['promotorAntiabuso', 'apps/web/lib/crecimiento/promotores.ts', '[dueno, k.promotor, dev]', '[k.promotor, dueno, dev]'],
  ['promotorAntiabuso', 'apps/web/app/(app)/publica/acciones.ts', '  if (me && !(await tx((c) => codigoPermitido(c, k, me.id, dev)))) return { ok: false as const };\n', ''],
  ['promotorAntiabuso', 'apps/web/app/(app)/publica/acciones.ts', 'const dias = promoOk ? promo!.dias : 30;', 'const dias = promo ? promo.dias : 30;'],
  ['promotorAntiabuso', 'apps/web/app/(app)/publica/acciones.ts', '    if (promo) await anotarReferido(c, promo, slug, loc.ciudad, me.id, dev);\n', ''],
  ['promotorAntiabuso', 'apps/web/app/(app)/publica/acciones.ts', 'if (me && k.kind === "promotor" && k.promotor === me.id) return { ok: false as const };', ''],
  ['promotorAntiabuso', 'apps/web/lib/crecimiento/promotores.ts', 'ok ? "traido" : "rechazado"', '"traido"'],
  ['promotorAntiabuso', M, "if old.status in ('rechazado', 'pagado') and new.status <> old.status then raise exception 'un referido % no cambia', old.status; end if;", ''],
  // idioma: una cadena de la landing con un solo idioma
  ['idioma', TX, 'whatsapp: "Send on WhatsApp",', 'whatsapp: "",'],
];
const crear = [
  // enlaceSoloPropio: otro archivo que crea enlaces o les cambia el destino
  ['enlaceSoloPropio', 'apps/web/lib/zz9h.ts', 'import "server-only";\nexport const q = `insert into short_links (code, label, target) values ($1, $2, $3)`;\n'],
  ['enlaceSoloPropio', 'apps/web/lib/zz9h.ts', 'import "server-only";\nexport const q = `update short_links set target = $2 where code = $1`;\n'],
  // escaneosSinPersonas: otro archivo que anota escaneos o toca los días
  ['escaneosSinPersonas', 'apps/web/lib/zz9h.ts', 'import "server-only";\nexport const q = `update link_scan_days set n = n + 10 where code = $1`;\n'],
  // campanaConPermiso: otro archivo que manda con la plantilla de campaña o escribe los envíos
  ['campanaConPermiso', 'apps/web/lib/zz9h.ts', 'import "server-only";\nimport { avisar } from "./avisos";\nexport const f = (u: string) => avisar(u, "mkt_campana_push", { titulo: "x", texto: "y" });\n'],
  ['campanaConPermiso', 'apps/web/lib/zz9h.ts', 'import "server-only";\nexport const q = `insert into campaign_sends (campaign_id, user_id) values ($1, $2)`;\n'],
  // sandboxNoSeIndexa: volver al sitemap de Next (se arma en el build)
  ['sandboxNoSeIndexa', 'apps/web/app/sitemap.ts', 'export default function sitemap() { return []; }\n'],
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
