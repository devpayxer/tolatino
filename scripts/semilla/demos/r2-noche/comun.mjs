/* Ronda 2 · NOCHE · piezas propias: clientes y dueños en los rangos reservados de este agente (teléfonos ficticios 555). SOLO SANDBOX.
   Dueños +1484555 4200…4399 (200 negocios) · clientes +1717555 2100…2346 (247, para calzar con las funciones temporales de la ronda 1, que usan % 247). */
import { FIRST_F, FIRST_M, SURN } from "../a/comun.mjs";

export const N_CLIENTES = 247;
export const CLIENTES2 = Array.from({ length: N_CLIENTES }, (_, i) => {
  const fem = i % 2 === 1, F = fem ? FIRST_F : FIRST_M;
  const a = (i * 5 + 3) % F.length, b = (i * 13 + Math.floor(i / 37) * 3 + 7) % SURN.length;
  return { idx: i, phone: `+1717555${2100 + i}`, first: F[a], last: SURN[b], city: ["hzl", "alw", "wbr", "scr", "rdg"][(i * 3 + 2) % 5], lang: i % 6 === 4 ? "en" : "es" };
});
export const duenoTel = (idx) => `+1484555${4200 + idx}`;

export const CLIENTES_SQL2 = () => {
  const rows = CLIENTES2.map((c) => ({ p: c.phone, f: c.first, l: c.last, c: c.city, g: c.lang, i: c.idx }));
  return `insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '4 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 200 + (x->>'i')::int * 7)
  from jsonb_array_elements($j$${JSON.stringify(rows)}$j$::jsonb) x
on conflict (phone) do nothing;
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(CLIENTES2.map((c) => c.phone))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;
};

/* Reseñas de visitante (src 'vis', sin operación): quien trabaja por fecha (DJ, promotor, salón) no tiene mesa ni lista que se marque. */
export const FUNCION_VIS = String.raw`
create or replace function pg_temp.dr_vis(bz text, rv jsonb) returns void language plpgsql as $f$
declare x jsonb; cid text; ow uuid; uid uuid; rid bigint; ct timestamptz;
begin
  select city_id, owner_user_id into cid, ow from businesses where id = bz;
  for x in select value from jsonb_array_elements(rv) loop
    select id into uid from da_cli where idx = (x->>'u')::int;
    continue when uid is null;
    ct := now() - make_interval(days => (x->>'nd')::int, hours => abs(hashtext(x->>'b')) % 20);
    insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, reply_lang, created_at)
    values (bz, cid, uid, null, 'vis', (x->>'s')::int, x->>'b', x->>'l', '{}'::jsonb, '{}'::jsonb, '{}'::text[],
            x->>'r', case when x->>'r' is not null then ct + make_interval(hours => 5 + abs(hashtext(x->>'r')) % 40) end, case when x->>'r' is not null then ow end,
            case when x->>'r' is not null then coalesce(x->>'rl', 'es') end, ct)
    on conflict do nothing returning id into rid;
    continue when rid is null;
    if coalesce((x->>'h')::int, 0) > 0 then
      insert into review_helpful (review_id, user_id, created_at)
      select rid, c.id, ct + make_interval(hours => 2 + k * 9) from generate_series(0, (x->>'h')::int - 1) k join da_cli c on c.idx = (((x->>'u')::int + 1 + k * 7) % 247) on conflict do nothing;
      update reviews set helpful_count = (select count(*) from review_helpful h where h.review_id = rid) where id = rid;
    end if;
  end loop;
end $f$;
`;
