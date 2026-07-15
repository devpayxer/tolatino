#!/usr/bin/env node
// seed-updates.mjs — seed realistic Novedades (business_updates) for the test
// businesses so the consumer tab + dashboard module have real content: an offer
// (pinned), a news post and an event per business; the furniture store gets a
// photo post (reuses the seeded sofa image). El Sabor keeps the founder's own
// post untouched. Idempotent (wipes + reseeds only these three businesses).
// Run: node scripts/seed-updates.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/'/g, "''");
const SOFA = 'https://zpkaxojonufdwgahiqjh.supabase.co/storage/v1/object/public/post-photos/19fc443e-bd1d-4416-8593-9f9a3d97c8c3/seed-sofa-aurora-1.png';

// [slug, [kind, es, en, pinned, image|null, daysAgo]]
const DATA = [
  ['hz-barberia-primera', [
    ['offer', '💈 Martes de caballeros: corte + barba por $30 (ahorra $8). Solo con cita.', "💈 Gentlemen's Tuesday: cut + beard for $30 (save $8). Appointment only.", true, null, 1],
    ['news', 'Junior se une al equipo ✂️ Especialista en cortes clásicos y niños. ¡Resérvalo!', 'Junior joins the team ✂️ Classic & kids cuts specialist. Book him!', false, null, 3],
    ['event', 'Sábado de fade challenge 🏆 Los mejores 3 cortes del día se llevan su próximo corte gratis.', 'Saturday fade challenge 🏆 Top 3 cuts of the day win their next cut free.', false, null, 5],
  ]],
  ['hz-muebles-encanto', [
    ['offer', '🛋️ Rebajas de temporada: hasta 25% en salas y comedores. Entrega y armado incluidos en Hazleton.', '🛋️ Seasonal sale: up to 25% off living & dining. Delivery & assembly included in Hazleton.', true, SOFA, 1],
    ['news', 'Llegó la nueva colección Aurora — telas anti-manchas, perfectas con niños y mascotas.', 'The new Aurora collection is here — stain-resistant fabrics, perfect with kids & pets.', false, null, 4],
    ['event', 'Este domingo: asesoría de decoración GRATIS en tienda, 11am–3pm. Trae las medidas de tu sala.', 'This Sunday: FREE in-store decor consults, 11am–3pm. Bring your room measurements.', false, null, 6],
  ]],
  ['hz-aqua-shine', [
    ['offer', '🚗 Miércoles 2×1 en Lavado Express antes de las 11am. Reserva tu bahía en línea.', '🚗 Wednesday 2-for-1 Express wash before 11am. Book your bay online.', true, null, 2],
    ['news', 'Ya aceptamos reservas en línea con pago adelantado — llega directo a tu bahía, sin filas. 💳', 'Online bookings with prepay are live — drive straight to your bay, no lines. 💳', false, null, 3],
  ]],
];

let sql = `-- seed-updates generated ${new Date().toISOString()}\n`;
for (const [slug, rows] of DATA) {
  sql += `delete from public.business_updates where business_id=(select id from public.businesses where slug='${slug}');\n`;
  sql += `insert into public.business_updates (business_id, kind, body_es, body_en, image_url, status, pinned, created_at) values\n`;
  sql += rows.map(([kind, es, en, pinned, img, days]) =>
    `((select id from public.businesses where slug='${slug}'), '${kind}', '${esc(es)}', '${esc(en)}', ${img ? `'${esc(img)}'` : 'null'}, 'live', ${pinned}, now() - interval '${days} days')`,
  ).join(',\n') + ';\n';
}
sql += `select b.slug, count(*) as novedades from public.business_updates u join public.businesses b on b.id=u.business_id group by b.slug order by b.slug;\n`;

const out = resolve(HERE, '../.seed-updates.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out}`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
