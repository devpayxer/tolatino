// Saca del prototipo la Comunidad de Hazleton (com-data.js TLCom: U, POSTS, BZ) → infra/pruebas/semilla/0032_comunidad.sql.
// SOLO SANDBOX (datos de ejemplo, decisión I; regla 13: nunca en producción). Repetible: nada se duplica al volver a correr.
// - 16 vecinos de prueba (TLCom.U, sin «tl») con teléfono de prueba +1 570 555 70NN, is_test, su zona (z) y su perfil de la Comunidad
//   (bio, «en Hazleton desde», rango de la semilla; los puntos y el rango de verdad llegan en 5f). Danny vive en Allentown: publica como Invitado.
// - La cuenta oficial no es una persona (city_official_accounts, migración 0097): sus publicaciones van con author_kind 'official'.
// - 14 publicaciones (POSTS) con sus comentarios y respuestas; h (horas atrás) → fecha relativa a cuando corre la semilla.
// - Votos sintéticos de «votantes de prueba» (+1 570 555 9NNN, sin teléfono verificado) para que up/dn, la encuesta y los contadores
//   cuadren con el prototipo: los contadores los calcula la base (triggers), nunca se escriben a mano.
// - Los negocios (BZ) son los de la semilla de negocios (mismos ids). Fotos: Pexels (como el resto de la semilla).
// Uso (desde el repo): node scripts/semilla/extraer-comunidad.cjs > infra/pruebas/semilla/0032_comunidad.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = { window: {} };
w.window = w;
vm.createContext(w);
vm.runInContext(fs.readFileSync("docs/diseno/pantallas/datos/com-data.js", "utf8"), w, { filename: "com-data.js" });
const C = w.TLCom;
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const ZONA = { "NORTH END": "hzl-north", DOWNTOWN: "hzl-centro", "SOUTH SIDE": "hzl-alter", HEIGHTS: "hzl-heights", "EAST END": "hzl-centro",
  "HAZLE TWP": "hzl-twp", "WEST HAZLETON": "hzl-west", "ALTER ST": "hzl-alter", "DIAMOND AVE": "hzl-north" };
const KIND = { q: "pregunta", r: "recomendacion", e: "encuesta", p: "publicacion" };
const FOTO = (id, w0) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w0}`;
const TEL = {}; // id del prototipo → teléfono de prueba
const ids = Object.keys(C.U).filter((k) => k !== "tl");
ids.forEach((k, i) => { TEL[k] = `+157055570${String(i + 1).padStart(2, "0")}`; });
const UID = (k) => `(select id from users where phone = ${q(TEL[k])})`;
const VOT = 245; // la encuesta más votada (112 + 86 + 47)
const out = ["-- Generado por scripts/semilla/extraer-comunidad.cjs desde el prototipo (com-data.js). SOLO SANDBOX. No editar a mano.", "begin;"];

// Vecinos de prueba y su perfil.
for (const k of ids) {
  const u = C.U[k], partes = u.n.split(" "), first = partes[0], last = partes.slice(1).join(" ");
  const city = u.city ? "alw" : "hzl", zona = u.city ? null : ZONA[u.z[0]] ?? null;
  out.push(`insert into users (phone, phone_verified_at, first_name, last_name, nick, photo_url, lang, home_city_id, zone_id, founder, is_test)
  values (${q(TEL[k])}, now(), ${q(first)}, ${q(last)}, ${u.nick ? q(u.nick) : "null"}, ${q(FOTO(u.ph, 160))}, 'es', '${city}', ${zona ? q(zona) : "null"}, ${u.fund ? "true" : "false"}, true)
  on conflict (phone) do nothing;`);
  out.push(`insert into community_profiles (user_id, bio, bio_lang, since_year, rank_level, rules_version, rules_ok_at, adult_ok_at, welcome_at)
  select id, ${q(u.bio[0])}, 'es', ${u.since}, ${u.rk}, 1, now(), now(), now() from users where phone = ${q(TEL[k])}
  on conflict (user_id) do nothing;`);
}
// Votantes de prueba (sin teléfono verificado: no son vecinos que publiquen; solo hacen que los conteos cuadren).
out.push(`insert into users (phone, first_name, last_name, lang, home_city_id, is_test)
  select '+15705559' || lpad(n::text, 3, '0'), 'Votante', 'de prueba ' || n, 'es', 'hzl', true from generate_series(1, ${VOT}) n
  on conflict (phone) do nothing;`);
out.push(`create temp table semilla_votantes on commit drop as select id, row_number() over (order by phone) as rn from users where phone like '+15705559%' and phone between '+15705559001' and '+15705559${VOT}';`);

const votos = (kind, ref, up, dn) => {
  if (!up && !dn) return;
  out.push(`insert into com_votes (target_kind, target_id, user_id, v) select '${kind}', ${ref}, v.id, case when v.rn <= ${up} then 1 else -1 end
  from semilla_votantes v where v.rn <= ${up + dn} and ${ref} is not null on conflict do nothing;`);
};

for (const p of C.POSTS) {
  if (p.biz && !NEG.has(p.biz)) throw new Error(`negocio ${p.biz} no está en la semilla`);
  const of = p.u === "tl", kind = KIND[p.k];
  const topic = p.k === "q" ? q(p.tema || "otro") : p.tema ? q(p.tema) : "null";
  const para = p.para ? `array[${q(p.para[0])}]` : "'{}'::text[]";
  const opts = p.opts ? `array[${p.opts.map((o) => q(o[0])).join(", ")}]` : "null";
  const ends = p.opts ? `now() + interval '${p.left || 72} hours'` : "null";
  const pin = p.pin ? "now() + interval '5 days'" : "null";
  const at = `now() - interval '${Math.round(p.h * 60)} minutes'`;
  out.push(`-- ${p.id}`);
  out.push(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang, business_id, looking_for, poll_options, poll_ends_at, health_notice, pinned_until, publish_at, created_at, last_activity_at)
  select 'hzl', '${of ? "official" : "user"}', ${of ? "null" : UID(p.u)}, '${kind}', ${topic}, ${q(p.es)}, 'es', ${p.biz ? q(p.biz) : "null"}, ${para}, ${opts}, ${ends}, ${p.salud ? "true" : "false"}, ${pin}, ${at}, ${at}, ${at}
  where not exists (select 1 from com_posts where city_id = 'hzl' and body = ${q(p.es)});`);
  const PID = `(select id from com_posts where city_id = 'hzl' and body = ${q(p.es)} order by id limit 1)`;
  votos("post", PID, p.up || 0, p.dn || 0);
  if (p.opts) {
    let desde = 0;
    p.opts.forEach((o, i) => {
      out.push(`insert into com_poll_votes (post_id, user_id, opt) select ${PID}, v.id, ${i} from semilla_votantes v where v.rn > ${desde} and v.rn <= ${desde + o[2]} on conflict do nothing;`);
      desde += o[2];
    });
  }
  if (p.ph) p.ph.forEach((ph, i) => out.push(`insert into media (id, owner_kind, owner_id, url, credit, sort) select md5(${q(`semilla:com:${p.id}:${i}`)})::uuid, 'com_post', ${PID}::text, ${q(FOTO(ph, 900))}, 'Pexels', ${i} on conflict (id) do nothing;`));
  // Comentarios (raíz) y sus respuestas (un nivel; «re» = a quién contesta).
  const CID = (c) => `(select id from com_comments where post_id = ${PID} and body = ${q(c.es)} order by id limit 1)`;
  const comentario = (c, raiz) => {
    if (c.biz && !NEG.has(c.biz)) throw new Error(`negocio ${c.biz} no está en la semilla`);
    const cat = `now() - interval '${Math.round(c.h * 60)} minutes'`;
    const re = c.re ? (p.cm.flatMap((x) => [x, ...(x.rp || [])]).find((x) => x.id === c.re)) : null;
    out.push(`insert into com_comments (post_id, parent_id, reply_to_id, author_user_id, body, lang, business_id, created_at)
  select ${PID}, ${raiz ? CID(raiz) : "null"}, ${re ? CID(re) : "null"}, ${UID(c.u)}, ${q(c.es)}, 'es', ${c.biz ? q(c.biz) : "null"}, ${cat}
  where not exists (select 1 from com_comments where post_id = ${PID} and body = ${q(c.es)});`);
    votos("comment", CID(c), c.up || 0, c.dn || 0);
  };
  for (const c of p.cm || []) { comentario(c, null); for (const r of c.rp || []) comentario(r, c); }
  if (p.solved) {
    const best = p.cm.find((x) => x.id === p.solved);
    out.push(`update com_posts set best_comment_id = ${CID(best)}, solved_at = now() - interval '${Math.round((best.h - 0.5) * 60)} minutes' where id = ${PID} and best_comment_id is null;`);
  }
}
out.push("commit;");
console.log(out.join("\n"));
