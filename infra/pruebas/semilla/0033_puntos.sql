-- Semilla de pruebas · 5f · Puntos, rangos, insignias y Tabla del Barrio. SOLO SANDBOX (los vecinos de prueba de 0032, is_test).
-- De docs/diseno/pantallas/datos/com-data.js: U.pts (puntos totales), U.rk (rango), U.bdg (insignias; las de El Patio no, decisión G) y
-- TABLA L190–192 por vecino [general, recomendaciones, respuestas]: «sep» = el mes en curso de la ciudad, «ago» = el mes anterior.
-- El historial se asienta en el libro (points_entries) con reglas reales y sin pasar de 100 puntos por día local; lo de antes del mes
-- anterior va hacia atrás, día por día. El mes anterior se cierra con tabla_cerrar (la misma función del Super Admin y del barrido):
-- Ramón, el único de los 3 primeros que ya es Comandante, queda General del Barrio; Altagracia es Coronel (lo da el equipo).
-- Si los puntos totales son menos que los dos meses (José «Cheo» en el prototipo), lo que falta se resta después del cierre como algo
-- que se quitó por las reglas (asiento inverso: la Tabla cerrada no cambia). Idempotente: quien ya tiene su historial no se toca.
begin;

create temp table sem_u (n serial, rule text, delta int, tab text) on commit drop;

-- Las unidades de un mes: recomendaciones (+50 primera, +3 «Sumar mi voto», +2 voto en recomendación), respuestas (+10 «Me sirvió», +1
-- voto en comentario) y lo demás (+15 reseña verificada si hace falta un impar, +2 voto en publicación).
create or replace function pg_temp.sem_unidades(g int, r int, a int) returns void language plpgsql as $$
declare k int; t3 int; rem int; o int;
begin
  truncate sem_u;
  k := r / 100; rem := r - 50 * k; t3 := rem / 3; rem := rem - 3 * t3;
  if rem = 1 then t3 := t3 - 1; rem := 4; end if;
  insert into sem_u (rule, delta, tab) select 'primera_rec', 50, 'rec' from generate_series(1, k);
  insert into sem_u (rule, delta, tab) select 'yo_tambien', 3, 'rec' from generate_series(1, t3);
  insert into sem_u (rule, delta, tab) select 'voto_post', 2, 'rec' from generate_series(1, rem / 2);
  insert into sem_u (rule, delta, tab) select 'me_sirvio', 10, 'ans' from generate_series(1, a / 10);
  insert into sem_u (rule, delta, tab) select 'voto_comentario', 1, 'ans' from generate_series(1, a % 10);
  o := g - r - a;
  if o % 2 = 1 then insert into sem_u (rule, delta, tab) values ('resena_verificada', 15, null); o := o - 15; end if;
  insert into sem_u (rule, delta, tab) select 'voto_post', 2, null from generate_series(1, o / 2);
end $$;

-- Asienta las unidades día por día (de `desde` hacia `hasta`, o hacia atrás si `atras`), sin pasar de 100 por día.
create or replace function pg_temp.sem_asentar(uid uuid, ciudad text, tz text, desde date, hasta date, atras boolean, etiqueta text) returns void language plpgsql as $$
declare x record; d date := desde; usado int := 0; i int := 0;
begin
  for x in select * from sem_u order by n loop
    while usado + x.delta > 100 loop
      d := case when atras then d - 1 else d + 1 end; usado := 0;
      if (not atras and d > hasta) or (atras and d < hasta) then raise notice 'semilla de puntos: sin días para % (%)', uid, etiqueta; return; end if;
    end loop;
    i := i + 1; usado := usado + x.delta;
    insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, tab, month_key, local_day, created_at)
      values (uid, ciudad, x.delta, x.rule, 'regla', 'semilla', etiqueta || ':' || uid || ':' || i, x.tab, date_trunc('month', d)::date, d,
              least(now() - interval '1 minute', ((d + time '12:00') at time zone tz) + i * interval '1 second'));
  end loop;
end $$;

do $$
declare
  lista jsonb := '[
    {"tel":"+15705557001","pts":9820,"rk":10,"cur":[486,190,210],"prev":[470,170,220],"bdg":["avisos","mejor"]},
    {"tel":"+15705557002","pts":6140,"rk":9,"cur":[398,220,150],"prev":[520,260,180],"bdg":["mod","mejor"]},
    {"tel":"+15705557003","pts":3510,"rk":7,"cur":[301,80,120],"prev":[410,90,160],"bdg":[]},
    {"tel":"+15705557004","pts":2840,"rk":6,"cur":[412,150,230],"prev":[366,140,190],"bdg":["mejor"]},
    {"tel":"+15705557005","pts":2410,"rk":6,"cur":[355,240,70],"prev":[298,200,60],"bdg":["rec50"]},
    {"tel":"+15705557006","pts":1690,"rk":5,"cur":[288,90,170],"prev":[310,100,180],"bdg":["mejor"]},
    {"tel":"+15705557007","pts":910,"rk":4,"cur":[197,60,90],"prev":[180,50,80],"bdg":[]},
    {"tel":"+15705557008","pts":1020,"rk":4,"cur":[240,130,60],"prev":[201,110,50],"bdg":[]},
    {"tel":"+15705557009","pts":420,"rk":3,"cur":[131,50,40],"prev":[96,30,40],"bdg":[]},
    {"tel":"+15705557010","pts":380,"rk":3,"cur":[156,70,70],"prev":[110,50,40],"bdg":[]},
    {"tel":"+15705557011","pts":350,"rk":3,"cur":[118,20,60],"prev":null,"bdg":[]},
    {"tel":"+15705557012","pts":190,"rk":2,"cur":[90,30,40],"prev":[122,40,50],"bdg":[]},
    {"tel":"+15705557013","pts":140,"rk":2,"cur":[64,10,30],"prev":[70,10,40],"bdg":[]},
    {"tel":"+15705557014","pts":110,"rk":2,"cur":[41,0,10],"prev":null,"bdg":[]},
    {"tel":"+15705557015","pts":10,"rk":1,"cur":[10,0,0],"prev":null,"bdg":[]}
  ]';
  v jsonb; uid uuid; ciudad text; tz text; hoy date; mes date; ant date; h int; falta int; e points_entries; prev text; ciudades text[] := '{}';
begin
  perform set_config('tl.puntos', 'si', true);
  for v in select * from jsonb_array_elements(lista) loop
    select u.id, u.home_city_id, coalesce(c.timezone, 'America/New_York') into uid, ciudad, tz from users u left join cities c on c.id = u.home_city_id where u.phone = v ->> 'tel' and u.is_test;
    continue when uid is null or exists (select 1 from points_entries where user_id = uid and ref_kind = 'semilla');
    hoy := (now() at time zone tz)::date; mes := date_trunc('month', hoy)::date; ant := (mes - interval '1 month')::date;
    ciudades := array_append(ciudades, ciudad);
    -- El mes anterior y lo de antes (hacia atrás desde el día antes del mes anterior).
    if v -> 'prev' <> 'null'::jsonb then
      perform pg_temp.sem_unidades((v -> 'prev' ->> 0)::int, (v -> 'prev' ->> 1)::int, (v -> 'prev' ->> 2)::int);
      perform pg_temp.sem_asentar(uid, ciudad, tz, ant, (mes - 1), false, 'ant');
    end if;
    h := (v ->> 'pts')::int - (v -> 'cur' ->> 0)::int - coalesce((v -> 'prev' ->> 0)::int, 0);
    if h > 0 then
      truncate sem_u;
      insert into sem_u (rule, delta, tab) select 'me_sirvio', 10, 'ans' from generate_series(1, h / 10);
      insert into sem_u (rule, delta, tab) select 'voto_post', 2, null from generate_series(1, (h % 10) / 2);
      insert into sem_u (rule, delta, tab) select 'voto_comentario', 1, 'ans' from generate_series(1, h % 2);
      perform pg_temp.sem_asentar(uid, ciudad, tz, ant - 1, '2020-01-01', true, 'hist');
    end if;
    -- El mes en curso, desde el día 1 hasta hoy.
    perform pg_temp.sem_unidades((v -> 'cur' ->> 0)::int, (v -> 'cur' ->> 1)::int, (v -> 'cur' ->> 2)::int);
    perform pg_temp.sem_asentar(uid, ciudad, tz, mes, hoy, false, 'mes');
    -- El rango que ya tenían (piso): hasta Comandante por la escalera; Coronel lo pone el equipo; General sale del cierre.
    prev := com_derivados_entrar();
    update community_profiles set rank_floor = case when (v ->> 'rk')::int = 10 then 8 else least((v ->> 'rk')::int, 9) end where user_id = uid;
    perform com_derivados_salir(prev);
    insert into user_badges (user_id, badge_key, reason) select uid, b, 'semilla' from jsonb_array_elements_text(v -> 'bdg') b on conflict do nothing;
  end loop;
  -- Cerrar el mes anterior de cada ciudad con vecinos de prueba (si todavía no se cerró).
  for ciudad in select distinct x from unnest(ciudades) x loop
    select coalesce(timezone, 'America/New_York') into tz from cities where id = ciudad;
    ant := (date_trunc('month', (now() at time zone tz)::date) - interval '1 month')::date;
    if not exists (select 1 from board_closures where city_id = ciudad and month = ant and closed_at is not null) and exists (select 1 from monthly_boards where city_id = ciudad and month = ant) then
      perform * from tabla_cerrar(ciudad, ant, null, 200);
    end if;
  end loop;
  -- Lo que se quitó después por las reglas (total menor que los dos meses): asientos inversos del mes anterior, ya cerrado.
  for v in select * from jsonb_array_elements(lista) loop
    select u.id into uid from users u where u.phone = v ->> 'tel' and u.is_test;
    continue when uid is null;
    falta := (select coalesce(points_total, 0) from community_profiles where user_id = uid) - (v ->> 'pts')::int;
    for e in select * from points_entries where user_id = uid and ref_kind = 'semilla' and ref_id like 'ant:%' and motive = 'regla' and reverses_id is null
               and not exists (select 1 from points_entries r where r.reverses_id = points_entries.id) order by delta desc, id desc loop
      exit when falta <= 0;
      if e.delta <= falta then perform pts_inverso(e, 'reverso', 'oculto'); falta := falta - e.delta; end if;
    end loop;
  end loop;
  -- El rango de cada vecino de prueba (la escalera, su piso y la plaza de General del último mes cerrado).
  for v in select * from jsonb_array_elements(lista) loop
    perform pts_rango(u.id) from users u where u.phone = v ->> 'tel' and u.is_test;
  end loop;
end $$;

commit;
