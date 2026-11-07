// Saca del prototipo «Esta noche» y los servicios de Noche (neg-noche.js TLNoche.B nt/tags, neg-noche-listing.js TLNocheL.SVC)
// → infra/pruebas/semilla/0023_noche.sql. SOLO SANDBOX (datos de ejemplo, decisión I).
// Repetible: no toca un negocio que ya tenga «Esta noche» o servicios. La fila del prototipo («~15 min el sáb a las 11:30 PM») se
// siembra con su hora real (la última noche de ese día), nunca como «ahora». La Barra del demo (cubeta, mojito, hookah, botella)
// NO se siembra: la app no vende tragos (Preguntas #14). Un dueño de prueba para el panel: La Terraza Night Club (Héctor).
// Uso (desde el repo): node scripts/semilla/extraer-noche.cjs > infra/pruebas/semilla/0023_noche.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-noche.js", "neg-noche-listing.js"]) if (!(f === "neg-noche.js" ? w.TLNoche : w.TLNocheL)) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const KINDS = new Set(["cover", "lista", "mesa", "vip", "evento", "fecha"]);
// El tipo por subcategoría (neg-noche-kind.js KS): DJ, promotor y salón trabajan por fecha y no tienen «Esta noche».
const POR_FECHA = new Set(["DJ de discoteca", "Promotor de eventos nocturnos", "Local para fiestas privadas"]);
// La fila del prototipo (0, 5, 10, 15, 35 min) a los pasos de la herramienta (Sin fila · 10 · 20 · 30 o más).
const FILA = (m) => (m <= 0 ? 0 : m <= 10 ? 10 : m <= 20 ? 20 : 35);
const DOW = { dom: 0, lun: 1, mar: 2, "mié": 3, jue: 4, vie: 5, "sáb": 6 };
// «11:30 PM» → minutos desde las 12 PM de la noche.
const minN = (s) => { const m = /(\d+)(?::(\d+))?\s*(AM|PM)/.exec(s || ""); if (!m) return 660; let h = Number(m[1]) % 12 + (m[3] === "PM" ? 12 : 0); const t = h * 60 + Number(m[2] || 0) - 720; return t < 0 ? t + 1440 : t; };
// Cuántas mesas de cada tipo (hueco #2 del diseño: el prototipo no lo dice; se pone algo creíble y se anota en REVISION).
const MESAS = { vip: 2, mesa: 4, billar: 6 };
const LIC = ["la-terraza-night", "mambo-lounge", "club-caliente", "casa-borinquen", "el-rincon-sports", "karaoke-estrella", "skyline-rooftop"];
const DUENO = { "la-terraza-night": ["+15705550366", "Héctor", "Almánzar", "Dueño", "Owner", 2014] };

const out = ["-- Generado por scripts/semilla/extraer-noche.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const b of w.TLNoche.B) {
  if (!NEG.has(b.id) || (b.subs || []).some((s) => POR_FECHA.has(s))) continue;
  const nt = b.nt || null, tags = b.tags || [];
  const mus = tags.filter((t) => /^m:(salsa|bachata|tipico|reggaeton|banda|envivo|mixto)$/.test(t));
  const cover = nt ? c(nt.cover) : tags.includes("cover") ? 1000 : 0;
  const after = nt && nt.after && c(nt.after[1]) > cover ? [(nt.after[0] - 12) * 60, c(nt.after[1])] : null;
  const edad = nt ? nt.edad : tags.includes("e18") ? 18 : 21;
  const lista = nt && nt.list ? (nt.list - 12) * 60 : null;
  // La fila: la última noche de ese día (o anoche) a la hora del prototipo, en la zona de la ciudad.
  const fila = nt && nt.fila != null ? FILA(nt.fila) : null, dow = nt && nt.lastD ? DOW[nt.lastD[0]] : null, hm = nt ? minN(nt.filaH) : 0;
  const lineAt = fila == null ? "null" : `(select ((n.d + time '12:00') + make_interval(mins => ${hm})) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select ${dow == null ? "h.hoy - 1" : `h.hoy - (case when ((extract(dow from h.hoy)::int - ${dow} + 7) % 7) = 0 then 7 else ((extract(dow from h.hoy)::int - ${dow} + 7) % 7) end)`} as d) n where x.id = b)`;
  out.push("do $$", `declare b text := ${q(b.id)};`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;",
    `  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, ${cover}, ${after ? after[0] : "null"}, ${after ? after[1] : "null"}, ${edad}, ${lista != null}, ${lista ?? "null"}, ${fila ?? "null"}, ${lineAt}, ${q(`{${(mus.length ? mus : ["m:mixto"]).join(",")}}`)}::text[],
          ${nt && nt.mus ? J(bi(nt.mus[0], nt.mus[1])) : "null"}, ${nt && nt.dress ? J(bi(nt.dress[0], nt.dress[1])) : "null"} from businesses where id = b;`);
  if (LIC.includes(b.id)) out.push(`  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', ${J(bi("Licencia de licor (PLCB)", "Liquor license (PLCB)"))}, null, ${q("R-" + (10000 + LIC.indexOf(b.id) * 731))}, 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');`);
  out.push("end $$;");
}
// Los servicios (Esta noche, Mesas, Para tu fecha…). Por fecha también (DJ, promotor, salón).
for (const [id, secs] of Object.entries(w.TLNocheL.SVC || {})) {
  if (!NEG.has(id) || !secs.length) continue;
  const conMesa = secs.some((g) => g[2].some((it) => it.k === "mesa" || it.k === "vip"));
  out.push("do $$", `declare b text := ${q(id)}; s bigint;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;",
    `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc'${conMesa ? ",'rsv'" : ""}]::text[]))) where id = b;`);
  const cv = ((w.TLNoche.B.find((x) => x.id === id) || {}).nt || {}).cover;
  secs.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      if (!KINDS.has(it.k)) return;
      const a = {};
      if (it.k === "lista") a.until = (Number(it.until || 23) - 12) * 60;
      if (it.k === "mesa" || it.k === "vip") { a.pax = Number(it.pax || 4); a.tables = it.hora ? MESAS.billar : MESAS[it.k]; if (it.hora) a.hr = true; if (it.dep) a.dep = c(it.dep); }
      if (it.k === "fecha" && it.pax) a.pax = Number(it.pax);
      if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 6).map((z) => bi(z[0], z[1]));
      const price = it.k === "cover" ? c(cv != null ? cv : it.p) : c(it.p);
      const ph = typeof it.ph === "number" ? it.ph : null;
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${price}, 60, ${q(it.k)}, ${J(a)}, ${a.dep || 0}, ${it.k === "fecha"}, ${ph ? `array[${q(P(ph))}]` : "'{}'"}, ${ii});`);
    });
  });
  out.push("end $$;");
}
// La historia de la semana de La Terraza (lo que publicó cada noche): cover, «después de», fila. Solo si no tiene historia.
out.push(`insert into night_posts (business_id, city_id, night, field, value, at)
select b.id, b.city_id, n.d, v.f, v.val::jsonb, ((n.d + time '12:00') + make_interval(mins => v.m)) at time zone ci.timezone
  from businesses b join cities ci on ci.id = b.city_id
  cross join lateral (select (((now() at time zone ci.timezone) - interval '6 hours')::date - k) as d from generate_series(1, 7) k) n
  cross join lateral (values ('cover', '{"cents":1000}', 480), ('after', '{"min":660,"cents":1500}', 481), ('line', '0', 570), ('line', '10', 630), ('line', '20', 690), ('line', '10', 780)) v(f, val, m)
 where b.id = 'la-terraza-night' and b.is_demo and extract(dow from n.d)::int in (4, 5, 6)
   and not exists (select 1 from night_posts p where p.business_id = b.id);`);
// Fuera de los bloques: el dueño de prueba (idempotente) y su cuenta de cobro simulada.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner');`,
  `insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select ${q(id)}, ${q("acct_sim_" + id)}, 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (business_id) do nothing;`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
