-- 9t · El resumen del barrido de la Comunidad en tres partes que se miden (y se pueden correr) por separado: rangos por ciudad, activos por
-- rango (7/30/90, de una pasada desde 0190) y candidatos de Recomendados. com_cifras_resumir sigue haciendo las tres (mismo resultado); la
-- carga mide cada parte (LAUNCH L631: 10,96 s en la carga 44575391134, en un runner que salió ~1,5 veces más lento en todo).

begin;

create or replace function com_rangos_resumir() returns integer language plpgsql as $$
begin
  delete from com_rangos_ciudad;
  insert into com_rangos_ciudad (city_id, rank_level, vecinos, monedas)
  select u.home_city_id, coalesce(cp.rank_level, 1), count(*)::int, coalesce(sum(greatest(cp.coins, 0)), 0)
    from community_profiles cp join users u on u.id = cp.user_id where u.home_city_id is not null group by 1, 2;
  -- Activos por rango: la misma regla que com_activos_por_rango (publicaron o comentaron EN la ciudad; votaron, por su ciudad), de una pasada
  -- para todas las ciudades por período (llamarla por ciudad y período eran 15 pasadas: 19 s con 1 M de vecinos en la carga).
  return (select count(*) from com_rangos_ciudad)::int;
end $$;

create or replace function com_activos_resumir() returns integer language plpgsql as $$
begin
  -- 9t · De UNA pasada para los tres períodos: la última actividad de cada vecino en cada ciudad en 90 días (publicó o comentó EN la ciudad;
  -- votó, por su ciudad) y se cuenta para 7, 30 y 90 con su corte. Antes eran tres pasadas sobre lo mismo (9,2 s de 10 con 1 M en la carga).
  -- Misma regla que com_activos_por_rango: un vecino cuenta una vez por ciudad y período si tuvo cualquier actividad desde el corte.
  delete from com_activos_cache;
  insert into com_activos_cache (city_id, dias, rango, activos)
  select a.c, p.d, coalesce(cp.rank_level, 1)::smallint, count(*)::int
    from (select z.c, z.u, max(z.at) as at
            from (select city_id as c, author_user_id as u, created_at as at from com_posts
                   where author_kind = 'user' and status <> 'deleted' and created_at >= ((now() at time zone 'America/New_York')::date - 89)::timestamp at time zone 'America/New_York'
                  union all select city_id, author_user_id, created_at from com_comments
                   where status <> 'deleted' and created_at >= ((now() at time zone 'America/New_York')::date - 89)::timestamp at time zone 'America/New_York'
                  union all select x.home_city_id, v.user_id, v.created_at from com_votes v join users x on x.id = v.user_id
                   where v.created_at >= ((now() at time zone 'America/New_York')::date - 89)::timestamp at time zone 'America/New_York') z
           where z.c is not null and z.u is not null
           group by z.c, z.u) a
    join (values (7), (30), (90)) as p(d) on a.at >= ((now() at time zone 'America/New_York')::date - (p.d - 1))::timestamp at time zone 'America/New_York'
    left join community_profiles cp on cp.user_id = a.u
   group by 1, 2, 3;
  return (select count(*) from com_activos_cache)::int;
end $$;

create or replace function com_recomendados_resumir() returns integer language plpgsql as $$
begin
  delete from com_recomendados_cache;
  insert into com_recomendados_cache (city_id, business_id, votos, vecinos)
  select city_id, b, votos, vecinos from (
    select r.city_id, r.b, sum(r.up)::int as votos, count(distinct r.u)::int as vecinos, row_number() over (partition by r.city_id order by sum(r.up) desc, count(distinct r.u) desc) as rn
      from (select p.city_id, p.business_id as b, p.author_user_id as u, greatest(p.up_n, 0) as up from com_posts p
             where p.kind = 'recomendacion' and p.status = 'visible' and p.publish_at <= now() and p.publish_at > now() - interval '180 days' and p.author_kind = 'user' and p.business_id is not null
            union all
            select c.city_id, c.business_id, c.author_user_id, greatest(c.up_n, 0) from com_comments c join com_posts p on p.id = c.post_id and p.status = 'visible'
             where c.business_id is not null and c.status = 'visible' and c.created_at > now() - interval '180 days') r
      join businesses b on b.id = r.b and b.status = 'active' and b.city_id = r.city_id
     group by r.city_id, r.b) t
   where rn <= 50;
  return (select count(*) from com_recomendados_cache)::int;
end $$;

create or replace function com_cifras_resumir() returns integer language plpgsql as $$
begin
  return com_rangos_resumir() + com_activos_resumir() + com_recomendados_resumir();
end $$;

commit;
