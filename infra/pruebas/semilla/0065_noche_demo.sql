-- Semilla de pruebas · 9n-3 · Noche: el demo del sandbox. SOLO SANDBOX (decisión I; regla 13: nunca corre contra producción).
-- La semilla 0023 trae los locales y sus servicios pero ninguna reserva: para ver Transacciones › Noche, Colas (Mesas no respetadas, Sin identificación), la ficha
-- de un local y la Analítica con algo, aquí van operaciones de Noche de La Terraza Night Club (la-terraza-night), todas is_test, SIN cobro de tarjeta:
--   · 2 personas en la LISTA de esta noche (Marisol y Pedro),
--   · una MESA confirmada para esta noche (Lucía) y una PENDIENTE de respuesta (Kelvin),
--   · una mesa de AYER que sí llegó (Marisol), con su reseña,
--   · una mesa de AYER que NO respetaron (Pedro): ayuda abierta «quedó» (reason 'quedo') para la cola de Soporte,
--   · una mesa de hace 3 noches marcada «sin identificación» (Luis).
-- Idempotente: cada operación por su client_key fijo (on conflict do nothing); la reseña por su operación; la ayuda por su operación.
begin;

do $$
declare
  negocio text := 'la-terraza-night';
  hoy date := ((now() - interval '6 hours') at time zone 'America/New_York')::date;
  tz text := 'America/New_York';
  lista bigint; mesa bigint;
  u record; op bigint;
begin
  if not exists (select 1 from businesses where id = negocio) then return; end if;
  select id into lista from items where business_id = negocio and name->>'es' = 'Lista de la noche' order by id limit 1;
  select id into mesa from items where business_id = negocio and name->>'es' = 'Mesa en la terraza' order by id limit 1;
  if lista is null or mesa is null then return; end if;

  -- (cliente, client_key, número, tipo, noche, llegada (min después del mediodía), personas, estado, detalle, código, depósito)
  for u in
    select * from (values
      ('+15705550122', '00000065-0000-4000-8000-000000000001'::uuid, 'N-906501', 'lista', hoy,      600, 2, 'confirmed', null,    '4101', 0),
      ('+15705550133', '00000065-0000-4000-8000-000000000002'::uuid, 'N-906502', 'lista', hoy,      660, 3, 'confirmed', null,    '4102', 0),
      ('+15705550155', '00000065-0000-4000-8000-000000000003'::uuid, 'N-906503', 'mesa',  hoy,      600, 4, 'confirmed', null,    '4103', 0),
      ('+15705550177', '00000065-0000-4000-8000-000000000004'::uuid, 'N-906504', 'mesa',  hoy,      660, 5, 'pending',   null,    '4104', 0),
      ('+15705550122', '00000065-0000-4000-8000-000000000005'::uuid, 'N-906505', 'mesa',  hoy - 1,  600, 4, 'done',      'llego', '4105', 0),
      ('+15705550133', '00000065-0000-4000-8000-000000000006'::uuid, 'N-906506', 'mesa',  hoy - 1,  600, 6, 'done',      'nollegaron', '4106', 0),
      ('+15705550166', '00000065-0000-4000-8000-000000000007'::uuid, 'N-906507', 'mesa',  hoy - 3,  660, 4, 'done',      'noid',  '4107', 0)
    ) as t(tel, ck, num, k, noche, llega, pax, st, det, cod, dep)
  loop
    if not exists (select 1 from users where phone = u.tel) then continue; end if;
    insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, buffer_min, details, party_size, night_date, door_code,
                            subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, done_at, client_key, is_test)
    select u.num, 'night', 'hzl', negocio, x.id, u.st, u.det, (u.noche + time '12:00' + make_interval(mins => u.llega)) at time zone tz, 60, 0,
           jsonb_build_object('k', u.k, 'item', case when u.k = 'lista' then lista else mesa end, 'svc', case when u.k = 'lista' then '{"es":"Lista de la noche","en":"Night list"}'::jsonb else '{"es":"Mesa en la terraza","en":"Terrace table"}'::jsonb end,
                              'night', u.noche::text, 'arrive', u.llega, 'edad', 21, 'hold', 30, 'sms', true, 'cut', case when u.k = 'lista' then null else least(360, u.llega - 120) end),
           u.pax, u.noche, u.cod, 0, 0, u.dep, 'none',
           case when u.st = 'pending' then now() + interval '50 minutes' end,
           case when u.st in ('confirmed', 'done') then now() - interval '1 day' end,
           case when u.st = 'done' then (u.noche + time '12:00' + make_interval(mins => u.llega + 90)) at time zone tz end,
           u.ck, true
      from users x where x.phone = u.tel
    on conflict (user_id, client_key) do nothing;
    select id into op from operations where client_key = u.ck;
    if op is not null and not exists (select 1 from operation_events where operation_id = op) then
      insert into operation_events (operation_id, kind, actor, actor_id)
      select op, case when u.k = 'lista' then 'night_list' else 'night_sent' end, 'user', user_id from operations where id = op;
    end if;
  end loop;

  -- La reseña de la mesa de ayer que sí llegó (Marisol).
  select o.id into op from operations o where o.client_key = '00000065-0000-4000-8000-000000000005'::uuid;
  if op is not null and not exists (select 1 from reviews r where r.operation_id = op) and not exists (select 1 from reviews r where r.business_id = negocio and r.user_id = (select user_id from operations where id = op) and r.status <> 'removed') then
    insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang)
    select negocio, 'hzl', user_id, id, 'rsv', 5, 'La mesa estaba lista a la hora, la música buenísima y el trato de primera. Volvemos el próximo sábado.', 'es' from operations where id = op;
  end if;

  -- La ayuda abierta de la mesa que no respetaron (Pedro): «La mesa no me la respetaron».
  select o.id into op from operations o where o.client_key = '00000065-0000-4000-8000-000000000006'::uuid;
  if op is not null and not exists (select 1 from help_requests h where h.operation_id = op) then
    insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, body, status)
    select 'H-906506', id, negocio, 'hzl', user_id, 'quedo', 'avisar', 'Llegamos a la hora y la mesa ya estaba dada a otro grupo. Nadie nos avisó.', 'open' from operations where id = op;
  end if;
end $$;

commit;
