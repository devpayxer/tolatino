// Prueba al revés de 9t · Mensajes (2p): fotos en el chat y «Ver traducción» (guardián fotoMensajePrivada; traductorFueraDeTx y mensajesTapados
// ampliados a lo de 9t). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const UP = 'apps/web/app/api/mensajes/foto/route.ts', VE = 'apps/web/app/api/mensajes/foto/[id]/route.ts', ME = 'apps/web/lib/mensajes.ts',
  MIG = 'packages/db/migrations/0185_mensajes_fotos_traduccion.sql', TR = 'apps/web/lib/traduccion.ts', CH = 'apps/web/app/(app)/cuenta/mensajes/[negocio]/Chat.tsx',
  PM = 'apps/web/app/panel/MensajesPanel.tsx';
const casos = [
  // fotoMensajePrivada · subir: sin mismo origen, sin sesión, sin tope de tamaño o por hora, guardando los metadatos, pública, sin el modelo o «visible» siempre
  ['fotoMensajePrivada', UP, '  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");\n', ''],
  ['fotoMensajePrivada', UP, '  const me = await yo();\n  if (!me) return err(401, "Entra para mandar la foto.", "Sign in to send the photo.");', '  const me = (await yo())!;'],
  ['fotoMensajePrivada', UP, 'tope: MAX_FOTO_MSJ, textos', 'tope: Infinity, textos'],
  ['fotoMensajePrivada', UP, '  if (n >= FOTOS_MSJ_HORA) return err(', '  if (n >= 100000) return err('],
  ['fotoMensajePrivada', UP, '.jpeg({ quality: 82, mozjpeg: true })', '.withMetadata().jpeg({ quality: 82, mozjpeg: true })'],
  ['fotoMensajePrivada', UP, 'clave = `privado/m/${id}.jpg`', 'clave = `m/${id}.jpg`'],
  ['fotoMensajePrivada', UP, 'const estado = rv.estado === "ok" ? "visible" : "review";', 'const estado = rv.estado === "marcada" ? "review" : "visible";'],
  ['fotoMensajePrivada', UP, 'await revisarImagen(img, R.img.p.umbral ?? 0.6)', 'await Promise.resolve({ estado: "ok" as const, desnudez: null, ms: null })'],
  // · ver: cualquier foto (no solo privadas del chat), la otra parte la ve en revisión o con el mensaje oculto, el negocio sin la parte «Mensajes», el equipo sin auditoría
  // o sin su cola, cacheada
  ['fotoMensajePrivada', VE, " and x.private and x.purged_at is null", " and x.purged_at is null"],
  ['fotoMensajePrivada', VE, 'const lista = m.status === "visible" && !!m.msg && !m.oculto;', 'const lista = !!m.msg;'],
  ['fotoMensajePrivada', VE, 'ok = !!(await accesoPanel(m.biz, "msg"))', 'ok = !!(await accesoPanel(m.biz))'],
  ['fotoMensajePrivada', VE, '        await tx((c) => auditar(c, { actor: s.id, action: "mensajes.foto.ver",', '        void tx; void auditar; void (async (c: unknown) => ({ c, actor: s.id, action: "mensajes.foto.ver",'],
  ['fotoMensajePrivada', VE, 'if (caso && colas.includes(caso.q as (typeof colas)[number])) {', 'if (caso) { void colas;'],
  ['fotoMensajePrivada', VE, '"cache-control": "private, no-store"', '"cache-control": "public, max-age=3600"'],
  // · lib/mensajes.ts: tomar la foto de otra persona, sin marcar la que está en revisión, la dirección a quien no la puede ver, sin atarla en el envío
  ['fotoMensajePrivada', ME, "and owner_id = 'pendiente' and uploaded_by = $2 and private", "and owner_id = 'pendiente' and private and $2::uuid is not null"],
  ['fotoMensajePrivada', ME, '  if (fo.status !== "review") return;\n', '  if (fo.status !== "review" || true) return;\n'],
  ['fotoMensajePrivada', ME, 'const ve = !sv && (est === "ok" || (!!yo && fsub === yo));', 'const ve = !sv;'],
  ['fotoMensajePrivada', ME, '    if (fo) await ponerFoto(c, fo, m.id, userId, t.city);\n', '    void fo;\n'],
  // · la base: sin media_chat_privada, sin el índice único de la foto
  ['fotoMensajePrivada', MIG, "alter table media add constraint media_chat_privada check (owner_kind <> 'chat' or (private and (url like 'privado/m/%' or url = 'privado/borrada')));", ''],
  ['fotoMensajePrivada', MIG, 'create unique index if not exists chat_messages_media_uidx on chat_messages (media_id) where media_id is not null;', 'create index if not exists chat_messages_media_idx on chat_messages (media_id);'],
  // · «Ver traducción»: cualquiera traduce un mensaje; una pantalla de Mensajes sin «Ver traducción»
  ['fotoMensajePrivada', TR, "and (t.user_id = $1::uuid or exists (select 1 from business_members bm", "and (true or exists (select 1 from business_members bm"],
  ['fotoMensajePrivada', CH, 'tr("chat_message", m.id, m.lang, m.t, false)', '({ body: m.t, translate: undefined as undefined | ReturnType<typeof tr>["translate"] })'],
  ['fotoMensajePrivada', PM, 'tr("chat_message", m.id, m.lang, m.t, false)', '({ body: m.t, translate: undefined as undefined | ReturnType<typeof tr>["translate"] })'],
  // traductorFueraDeTx: enviar un mensaje sin detectar su idioma, o detectándolo dentro de la transacción
  ['traductorFueraDeTx', ME, '  const lang = L.t ? idiomaTexto(await detectarIdioma(L.t), app) : null;', '  const lang = L.t ? idiomaTexto(null, app) : null;'],
  ['traductorFueraDeTx', ME, "  const lang = L.t ? idiomaTexto(await detectarIdioma(L.t), yo?.lang) : null;\n  const r = await tx(async (c) => {\n", "  const r = await tx(async (c) => {\n    const lang = L.t ? idiomaTexto(await detectarIdioma(L.t), yo?.lang) : null;\n"],
  // mensajesTapados (con la foto, limpiar() sigue tapando antes de todo)
  ['mensajesTapados', ME, '  const tp = tapar(String(texto ?? ""));', '  const tp = { texto: String(texto ?? ""), tapado: false }; void tapar;'],
];
const crear = []; // (sin casos de crear: «falta la ruta de ver» se prueba abajo, apartándola)
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
// Sin la ruta que muestra la foto (se aparta y se devuelve): el guardián lo dice.
{
  const ruta = path.join(R, VE), orig = fs.readFileSync(ruta, 'utf8');
  fs.unlinkSync(ruta);
  let r; try { r = correr('fotoMensajePrivada'); } finally { fs.writeFileSync(ruta, orig); }
  informe('fotoMensajePrivada', 'sin la ruta de ver', r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
