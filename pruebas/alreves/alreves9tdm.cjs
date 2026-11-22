// Prueba al revés de 9t (19 nov) · Mensajes ENTRE VECINOS: fotos y «Ver traducción» (guardián fotoDmPrivada; fotosSinEnviarSePurgan y traductorFueraDeTx
// ampliados a lo de los vecinos). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const UP = 'apps/web/app/api/mensajes/foto/route.ts', VE = 'apps/web/app/api/mensajes/foto/[id]/route.ts', MV = 'apps/web/lib/mensajes-vecinos.ts',
  AD = 'apps/web/lib/admin-dm.ts', TR = 'apps/web/lib/traduccion.ts', CH = 'apps/web/app/(app)/comunidad/mensajes/[id]/Chat.tsx', AC = 'apps/web/lib/admin-colas.ts',
  PU = 'apps/web/lib/datos/purgar.ts', MIG = 'packages/db/migrations/0187_mensajes_vecinos_fotos_traduccion.sql', PG = 'apps/web/lib/mensajes-purga.ts', G = 'fotoDmPrivada';
const casos = [
  // · subir: cualquier «para» como 'dm', sin la Comunidad, el tope por hora que no cuenta las de vecinos
  // 22 nov · Con la foto al disco (conFotoSubida): el destino sale de los campos leídos de paso (f.textos) y la Comunidad se mira antes del turno
  // (antes) y cuando no llegó la foto (sinArchivo).
  [G, UP, 'const kind = f.textos.para === "dm" ? "dm" : "chat"', 'const kind = f.textos.para ? "dm" : "chat"'],
  [G, UP, 'x.para === "dm" && !(await enComunidad(me.id)).ok', 'x.para === "dm" && false && !(await enComunidad(me.id)).ok'],
  [G, UP, 'antes: async (f) => (await sinComunidad(f.textos))\n', 'antes: async (f) => (await Promise.resolve(null))\n'],
  [G, UP, 'sinArchivo: async (x) => (await sinComunidad(x)) ?? err(400,', 'sinArchivo: async (x) => err(400,'],
  [G, UP, 'tope: MAX_FOTO_MSJ, textos: ["para"],', 'tope: MAX_FOTO_MSJ,'],
  [G, UP, "owner_kind in ('chat', 'dm') and created_at > now() - interval '1 hour'", "owner_kind = 'chat' and created_at > now() - interval '1 hour'"],
  // · ver: cualquier foto (no solo privadas 'dm'), la otra persona en revisión, sin fotoDmVecino, el equipo sin su cola o sin auditoría, cacheada
  [G, VE, "x.owner_kind = 'dm' and x.private and x.purged_at is null", "x.owner_kind = 'dm' and x.purged_at is null"],
  [G, VE, 'if (!ok && d.status === "visible") ok = await fotoDmVecino(me.id, id);', 'if (!ok) ok = await fotoDmVecino(me.id, id);'],
  [G, VE, 'colas.includes("chat") && enCiudad(rep.city)', 'enCiudad(rep.city)'],
  [G, VE, '        await tx((c) => auditar(c, { actor: s.id, action: "mensajes.foto.ver", targetKind: caso.msg ? "dm_message" : "media",', '        void tx; void (async (c: unknown) => ({ c, actor: s.id, action: "mensajes.foto.verX", targetKind: caso.msg ? "dm_message" : "media",'],
  [G, VE, '"cache-control": "private, no-store"', '"cache-control": "public, max-age=3600"'],
  // · lib/mensajes-vecinos.ts: tomar la foto de otra persona, sin marcar la que está en revisión, la dirección a quien no la puede ver, la foto antes de
  //   mirar los bloqueos, fotoDmVecino sin bloqueo o con la conversación cerrada, «Ver traducción» para cualquiera
  [G, MV, "owner_kind = 'dm' and owner_id = 'pendiente' and uploaded_by = $2 and private", "owner_kind = 'dm' and owner_id = 'pendiente' and private and $2::uuid is not null"],
  [G, MV, '  if (fo.status !== "review") return;\n', '  if (fo.status !== "review" || true) return;\n'],
  [G, MV, 'const ve = est === "ok" || fsub === viewer;', 'const ve = true || fsub === viewer;'],
  [G, MV, '    if (fo) await ponerFoto(c, fo, m.id, viewer, t.city);\n', '    void fo;\n'],
  [G, MV, "where m.media_id = $2::uuid and m.hidden_at is null and x.status = 'visible' and x.owner_kind = 'dm' and t.closed_at is null", "where m.media_id = $2::uuid and m.hidden_at is null and x.status = 'visible' and x.owner_kind = 'dm'"],
  [G, MV, "     where m.id = $2::bigint and m.hidden_at is null and m.lang is not null and m.body <> '' and t.closed_at is null\n       and (t.a_user_id = $1::uuid or t.b_user_id = $1::uuid)", "     where m.id = $2::bigint and m.hidden_at is null and m.lang is not null and m.body <> '' and t.closed_at is null"],
  // · el equipo: la foto de una conversación sin el reporte abierto; la rama 'dm' de «medios» después de la de la Comunidad
  [G, AD, "where m.media_id = $1::uuid and ${CON_REPORTE(\"m.thread_id\")}`", "where m.media_id = $1::uuid`"],
  [G, AC, "         from media x join users u on u.id = x.uploaded_by where x.id::text = $1 and x.owner_kind = 'dm'`", "         from media x join users u on u.id = x.uploaded_by where x.id::text = $1 and x.owner_kind = 'dmx'`"],
  // · «Ver traducción»: sin la fuente de vecinos, sin pedir la Comunidad; la pantalla sin el botón o subiendo como foto del chat con negocios
  [G, TR, ' || k === "dm_message";', ';'],
  [G, CH, 'tr("dm_message", m.id, m.lang, m.t, m.mio)', '({ body: m.t, translate: undefined as undefined | ReturnType<typeof tr>["translate"] })'],
  [G, CH, 'subirFotoMensaje(f, "dm")', 'subirFotoMensaje(f)'],
  // · la purga de la cuenta sin las traducciones de sus mensajes entre vecinos
  [G, PU, "\n           or (t.target_kind = 'dm_message' and t.target_id in (${MENSAJES_DE(\"$1::uuid\")}))", ''],
  // · la base: sin media_dm_privada, sin el índice único, el mensaje que cambia su foto, la foto de otro, body '' que vuelve a chocar con la purga
  [G, MIG, "alter table media add constraint media_dm_privada check (owner_kind <> 'dm' or (private and (url like 'privado/m/%' or url = 'privado/borrada')));", ''],
  [G, MIG, 'create unique index if not exists dm_messages_media_uidx on dm_messages (media_id) where media_id is not null;', 'create index if not exists dm_messages_media_idx on dm_messages (media_id);'],
  [G, MIG, "    if (new.media_id, new.lang) is distinct from (old.media_id, old.lang) then raise exception 'un mensaje no se edita'; end if;\n", ''],
  [G, MIG, "and x.owner_kind = 'dm' and x.private\n       and x.uploaded_by = new.sender_user_id", "and x.owner_kind = 'dm' and x.private"],
  [G, MIG, "check ((char_length(btrim(body)) between 1 and 1000) or (body = '' and (hidden_at is not null or media_id is not null)));", "check ((char_length(btrim(body)) between 1 and 1000) or (body = '' and media_id is not null));"],
  // · la prueba de punta a punta sin su parte de fotos
  [G, 'pruebas/e2e/dm9t.cjs', '// ── F2 · Con el almacén de fotos (CI) ──', '// ── F2 · (fuera) ──'],
  // fotosSinEnviarSePurgan: la purga sin las de vecinos, o tomarFoto de vecinos con otras horas
  ['fotosSinEnviarSePurgan', PG, "where owner_kind in ('chat', 'dm') and owner_id = 'pendiente'", "where owner_kind = 'chat' and owner_id = 'pendiente'"],
  ['fotosSinEnviarSePurgan', MV, "created_at > now() - interval '24 hours' for update", "created_at > now() - interval '48 hours' for update"],
  // traductorFueraDeTx: enviar entre vecinos sin detectar el idioma
  ['traductorFueraDeTx', MV, '  const lang = body ? idiomaTexto(await detectarIdioma(body), app) : null;', '  const lang = body ? idiomaTexto(null, app) : null;'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
