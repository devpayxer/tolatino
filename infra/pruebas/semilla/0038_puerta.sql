-- Semilla de pruebas · 6g · La puerta. SOLO SANDBOX.
-- Dos porteros de prueba con su cuenta (teléfonos +1570555051x, solo del sandbox) ya ACTIVOS en La Terraza Night Club: Junior (todos sus
-- eventos) y Karla (solo «Jueves de Bachata en Vivo»). Entran a /puerta con su teléfono (código en pantalla, modo pruebas) y ven las
-- puertas del día. El teléfono del portero se guarda cifrado con la llave del entorno, que esta semilla no conoce: aquí queda un marcador
-- («semilla») y una huella aparte (sha256 «semilla:…»), que nunca choca con una invitación real (esa usa la llave del entorno). Las
-- invitaciones con código de 7 días se prueban desde el panel (las crea la app con la llave). Sin escaneos sembrados: los eventos de la
-- semilla son de los próximos días y un escaneo inventado dejaría un boleto «usado» sin haber pasado por la puerta.
-- Base nueva sin equipo (CI): crea los usuarios y los porteros igual (no dependen de nadie del equipo). Idempotente: un portero por
-- teléfono y negocio (si ya existe, vivo o quitado, no se vuelve a crear); el evento de Karla, por su nombre.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550511', now(), 'Junior', 'Peralta', 'hzl'),
  ('+15705550512', now(), 'Karla', 'Ventura', 'hzl')
on conflict (phone) do nothing;

do $$
declare b businesses; u users; e bigint; x record;
begin
  select * into b from businesses where id = 'la-terraza-night';
  if not found then return; end if;
  select id into e from events where business_id = b.id and title->>'es' = 'Jueves de Bachata en Vivo' order by id limit 1;
  for x in select * from (values ('+15705550511', 'Junior', 'all'), ('+15705550512', 'Karla', 'events')) v(tel, nombre, alcance) loop
    select * into u from users where phone = x.tel;
    continue when not found;
    continue when x.alcance = 'events' and e is null;
    continue when exists (select 1 from door_staff f where f.business_id = b.id and (f.user_id = u.id or f.phone_hash = encode(sha256(convert_to('semilla:' || x.tel, 'UTF8')), 'hex')));
    -- Se invita (la base pone 'invited' y revisa el tope de Configuración) y se acepta en el acto con su cuenta.
    insert into door_staff (business_id, city_id, display_name, phone_enc, phone_hash, phone_last4, invite_code, invite_expires_at, scope, event_ids)
    values (b.id, b.city_id, x.nombre, convert_to('semilla', 'UTF8'), encode(sha256(convert_to('semilla:' || x.tel, 'UTF8')), 'hex'), right(x.tel, 4),
            translate(upper(substr(md5(x.tel || clock_timestamp()::text), 1, 6)), '01', 'XY'), now() + interval '7 days', x.alcance, case when x.alcance = 'events' then array[e] else '{}' end);
    update door_staff set user_id = u.id, status = 'active', invite_code = null, accepted_at = now()
     where business_id = b.id and phone_hash = encode(sha256(convert_to('semilla:' || x.tel, 'UTF8')), 'hex') and status = 'invited';
  end loop;
end $$;

commit;
