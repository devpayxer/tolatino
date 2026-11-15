-- 0158 · Fase 9 · 9n-8 — Super Admin › Negocios: «Posibles duplicados», «Reclamos» y los cambios sensibles de un negocio
-- (LAUNCH «Admin Negocios › pestañas Reclamos y Duplicados» y «Acciones del 360° que dependen de otras piezas»).
--
-- Posibles duplicados (prototipo bizDups): dos negocios de la misma ciudad con el nombre casi igual (parecido de trigramas ≥ 0.75, o ≥ 0.6
-- con la misma primera palabra que cuenta). Los pares son un DERIVADO: los escribe la base al crear o renombrar un negocio (una búsqueda por
-- el índice de trigramas, tope 50 vecinos), nadie los edita; la lista los vuelve a comprobar al leer. «No es duplicado» queda para siempre
-- (solo inserción). Fusionar, cambiar de categoría y transferir el dueño entran a Cambios sensibles (sensitive_changes ya admite mergeBiz,
-- changeCategory y transferOwner desde 0019) y los aplica OTRA persona del equipo. Idempotente.
begin;

-- Nombre normalizado: sin acentos, en minúsculas, solo letras y números, un espacio entre palabras.
create or replace function tl_unaccent(t text) returns text language sql immutable parallel safe strict as $$
  select public.unaccent('public.unaccent'::regdictionary, t)
$$;
create or replace function biz_norm_name(t text) returns text language sql immutable parallel safe as $$
  select btrim(regexp_replace(regexp_replace(lower(tl_unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;
-- La primera palabra que cuenta (más de 2 letras y no «the, del, los, las, and»), como el prototipo.
create or replace function biz_first_word(t text) returns text language sql immutable parallel safe as $$
  select w from unnest(string_to_array(biz_norm_name(t), ' ')) with ordinality as x(w, i)
   where length(w) > 2 and w <> all (array['the', 'del', 'los', 'las', 'and']) order by i limit 1
$$;
create index if not exists businesses_norm_name_trgm on businesses using gin (biz_norm_name(name) gin_trgm_ops);

create table if not exists business_dup_pairs (
  a_id      text not null references businesses (id),
  b_id      text not null references businesses (id),
  city_id   text not null references cities (id),
  score     real not null check (score between 0 and 1),
  found_at  timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);
create index if not exists business_dup_pairs_city_idx on business_dup_pairs (city_id, a_id, b_id);
create index if not exists business_dup_pairs_b_idx on business_dup_pairs (b_id);

create table if not exists business_dup_decisions (
  a_id        text not null references businesses (id),
  b_id        text not null references businesses (id),
  city_id     text not null references cities (id),
  reason      text not null check (char_length(reason) between 1 and 500),
  decided_by  uuid not null references users (id),
  decided_at  timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);
create or replace function business_dup_decisions_solo_insercion() returns trigger language plpgsql as $$
begin
  raise exception 'business_dup_decisions es solo inserción' using errcode = 'P0001';
end $$;
drop trigger if exists business_dup_decisions_no_cambia on business_dup_decisions;
create trigger business_dup_decisions_no_cambia before update or delete on business_dup_decisions
  for each row execute function business_dup_decisions_solo_insercion();

-- Buscar los pares de un negocio: la base lo hace sola al crear un negocio o cambiarle el nombre, la ciudad o el estado.
create or replace function biz_dup_probe(bid text) returns void language plpgsql as $$
declare b record;
begin
  select id, city_id, name, status into b from businesses where id = bid;
  if b.id is null or b.status not in ('active', 'temp_closed', 'hidden', 'suspended') then return; end if;
  insert into business_dup_pairs (a_id, b_id, city_id, score)
  select least(b.id, o.id), greatest(b.id, o.id), b.city_id, s.sc
    from (select x.id, x.name from businesses x
           where x.city_id = b.city_id and x.id <> b.id and x.status in ('active', 'temp_closed', 'hidden', 'suspended')
             and biz_norm_name(x.name) % biz_norm_name(b.name)
           limit 50) o
    cross join lateral (select similarity(biz_norm_name(o.name), biz_norm_name(b.name)) as sc) s
   where s.sc >= 0.75 or (s.sc >= 0.6 and biz_first_word(o.name) = biz_first_word(b.name))
  on conflict (a_id, b_id) do update set score = excluded.score, found_at = now();
end $$;
create or replace function businesses_dup_probe() returns trigger language plpgsql as $$
begin
  perform biz_dup_probe(new.id);
  return null;
end $$;
drop trigger if exists businesses_dup on businesses;
create trigger businesses_dup after insert or update of name, city_id, status on businesses
  for each row execute function businesses_dup_probe();
select biz_dup_probe(id) from businesses where status in ('active', 'temp_closed', 'hidden', 'suspended');

-- El dueño que sale por una transferencia o porque su página se unió a otra.
alter table business_members drop constraint if exists business_members_removed_reason_check;
alter table business_members add constraint business_members_removed_reason_check
  check (removed_reason in ('owner', 'declined', 'canceled', 'expired', 'left', 'claim', 'transfer', 'merged'));

-- Los avisos: al dueño (grupo «biz»: el push abre la app Negocios) y al dueño que sale (su cuenta).
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('biz_categoria_cambio', 'biz', null, true, 'sin_push', true, false,
   '{"es":"Tu negocio cambió de categoría","en":"Your business changed category"}',
   '{"es":"{negocio} ahora está en {categoria}. Elige tus subcategorías en Tu página.","en":"{negocio} is now in {categoria_en}. Pick your subcategories in Your page."}'),
  ('biz_transferido_nuevo', 'biz', null, true, 'sin_push', true, false,
   '{"es":"Ahora eres el dueño","en":"You are now the owner"}',
   '{"es":"To''Latino te pasó {negocio}. Ya puedes entrar a su panel.","en":"To''Latino transferred {negocio} to you. You can now open its panel."}'),
  ('biz_transferido_antes', 'support', null, true, 'sin_push', true, false,
   '{"es":"Tu negocio pasó a otra persona","en":"Your business moved to someone else"}',
   '{"es":"{negocio} ya no está en tu cuenta. Si no lo esperabas, escríbenos desde Ayuda.","en":"{negocio} is no longer on your account. If you did not expect this, write to us from Help."}'),
  ('biz_fusionado', 'biz', null, true, 'sin_push', true, false,
   '{"es":"Tu página se unió a otra","en":"Your page was merged"}',
   '{"es":"{negocio} estaba repetido y se unió a {queda}: sus reseñas y seguidores pasaron allá.","en":"{negocio} was a duplicate and was merged into {queda}: its reviews and followers moved there."}')
on conflict (key) do nothing;

commit;
