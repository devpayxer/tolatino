-- Semilla de pruebas · 6a · Eventos de los negocios de prueba de Hazleton. SOLO SANDBOX.
-- De docs/diseno/pantallas/datos/evt-data.js (TLEvt.E) y dash2-evt.js (TLEvP.toPanel): los eventos cuyo organizador (org.biz) existe en
-- la semilla de negocios, con las fechas relativas al día de la ciudad y en cada estado de la revisión (en vivo aprobado, en revisión
-- con su caso en la cola «evt», cambios pedidos, borrador). Nada de negocios inventados. Extras de alcohol, botellas y hookah fuera (la
-- app no los vende); el premio «una botella» del karaoke pasa a «premio para tu mesa». Series y varios días (el sancocho de cada
-- domingo, la vigilia de cada mes, el festival de 3 días) entran como un solo día hasta 6f. El cartel es la primera foto del negocio.
-- La Parroquia Santa María es organizador verificado (publica al enviar). Idempotente: un evento que ya existe (mismo negocio y nombre)
-- no se repite.
begin;

do $$
declare
  x jsonb; b record; adm uuid; eid bigint; hoy date; st text; foto record;
  lista jsonb := $j$[
    {"biz":"la-terraza-night","fmt":"noche","ti":{"es":"Jueves de Bachata en Vivo","en":"Live Bachata Thursdays"},"desc":{"es":"Bachata en vivo con Grupo Ilusión y DJ Cri Cri hasta las 2.","en":"Live bachata with Grupo Ilusión and DJ Cri Cri until 2."},
     "d":3,"h0":1320,"h1":1560,"door":60,"entry":"tickets","age":21,"gen":["bachata"],"st":"live",
     "tks":[{"id":"gen","n":{"es":"Entrada general","en":"General admission"},"s":{"es":"Antes de las 11 PM","en":"Before 11 PM"},"p":1500,"cap":80,"off":false},{"id":"late","n":{"es":"Entrada después de las 11","en":"After 11 PM entry"},"s":{"es":"Vale desde las 11 PM","en":"Valid from 11 PM"},"p":2000,"cap":60,"off":false}],
     "mesas":[{"id":"pista","z":{"es":"Mesa · Pista","en":"Table · Dance floor"},"seats":4,"min":12000,"dep":4000,"cap":5},{"id":"vip","z":{"es":"Mesa VIP · Balcón","en":"VIP table · Balcony"},"seats":6,"min":25000,"dep":8000,"cap":4}],
     "adds":[{"id":"cum","n":{"es":"Detalle de cumpleaños","en":"Birthday setup"},"s":{"es":"Letrero y bengala en tu mesa","en":"Sign and sparkler at your table"},"p":3500,"kind":"detalle","mesa":true}],
     "lu":[{"h":1320,"who":"DJ Cri Cri","role":{"es":"Abre la noche","en":"Opens the night"}},{"h":1410,"who":"Grupo Ilusión","role":{"es":"Bachata en vivo","en":"Live bachata"}},{"h":1500,"who":"DJ Cri Cri","role":{"es":"Cierra hasta las 2","en":"Closes till 2"}}],
     "dress":{"es":"Casual elegante: sin gorras ni chancletas","en":"Smart casual: no caps, no flip flops"},
     "before":[{"es":"Estacionamiento gratis detrás del local.","en":"Free parking behind the venue."}]},
    {"biz":"la-terraza-night","fmt":"noche","ti":{"es":"Karaoke latino · entrada libre","en":"Latin karaoke · free entry"},"desc":{"es":"Sube a cantar tu bachata o tu balada favorita. Entrada libre: dinos cuántos vienen para guardarles espacio.","en":"Sing your favorite bachata or ballad. Free entry: tell us how many are coming so we save you room."},
     "d":2,"h0":1260,"h1":1500,"door":30,"entry":"rsvp","cap":120,"party":4,"age":21,"gen":["variado"],"st":"live",
     "lu":[{"h":1260,"who":"DJ Cri Cri","role":{"es":"Abre la noche","en":"Opens the night"}},{"h":1380,"who":"Concurso de karaoke","role":{"es":"Premio para tu mesa","en":"A prize for your table"}},{"h":1440,"who":"DJ Cri Cri","role":{"es":"Baile hasta cerrar","en":"Dancing till close"}}],
     "dress":{"es":"Casual: sin chancletas.","en":"Casual: no flip flops."},
     "before":[{"es":"Tu RSVP guarda tu lugar hasta las 11 PM; después entran según el cupo.","en":"Your RSVP holds your spot until 11 PM; after that, entry depends on capacity."}]},
    {"biz":"la-terraza-night","fmt":"noche","ti":{"es":"Merengue Classics · Los 80 y 90","en":"Merengue Classics · 80s & 90s"},"desc":{"es":"","en":""},
     "d":8,"h0":1320,"h1":1560,"door":60,"entry":"tickets","age":21,"gen":["merengue"],"st":"review",
     "tks":[{"id":"gen","n":{"es":"Entrada general","en":"General admission"},"s":{"es":"","en":""},"p":2000,"cap":150,"off":false}],
     "mesas":[{"id":"pista","z":{"es":"Mesa · Pista","en":"Table · Dance floor"},"seats":4,"min":12000,"dep":4000,"cap":6}],
     "lu":[{"h":1320,"who":"DJ Retro RD","role":{"es":"Toda la noche","en":"All night"}}]},
    {"biz":"la-terraza-night","fmt":"noche","ti":{"es":"DJ Adonis · Dembow hasta abajo","en":"DJ Adonis · Dembow all night"},"desc":{"es":"","en":""},
     "d":10,"h0":1320,"h1":1620,"door":60,"entry":"tickets","age":18,"gen":["dembow","reggaeton"],"st":"draft",
     "tks":[{"id":"gen","n":{"es":"Entrada general","en":"General admission"},"s":{"es":"","en":""},"p":2200,"cap":90,"off":false},{"id":"vip","n":{"es":"VIP · Fila rápida","en":"VIP · Fast lane"},"s":{"es":"Entras sin fila y área VIP","en":"Skip the line and VIP area"},"p":3800,"cap":14,"off":false}],
     "lu":[{"h":1320,"who":"DJ Flow PA","role":{"es":"Calienta","en":"Warm up"}},{"h":1440,"who":"DJ Adonis","role":{"es":"Set principal","en":"Main set"}}]},
    {"biz":"sabor-dominicano","fmt":"noche","ti":{"es":"Noche de merengue en vivo","en":"Live merengue night"},"desc":{"es":"Merengue en vivo en el comedor. Entrada libre; se pide de la carta.","en":"Live merengue in the dining room. Free entry; order from the menu."},
     "d":1,"h0":1200,"h1":1380,"door":30,"entry":"free","age":0,"gen":["merengue"],"st":"live",
     "before":[{"es":"La música empieza a las 8:30 PM.","en":"Music starts at 8:30 PM."}]},
    {"biz":"sabor-dominicano","fmt":"comida","ti":{"es":"Sancocho del domingo en familia","en":"Sunday family sancocho"},"desc":{"es":"Mesas largas para familias y sancocho como en casa.","en":"Long family tables and home-style sancocho."},
     "d":5,"h0":780,"h1":960,"door":0,"entry":"rsvp","cap":60,"party":6,"age":0,"kids":"fam","payAt":true,"st":"live",
     "before":[{"es":"El plato cuesta $14 por persona y se paga en el local.","en":"The plate is $14 per person, paid at the restaurant."}]},
    {"biz":"sabor-dominicano","fmt":"comida","ti":{"es":"Festival del Sancocho","en":"Sancocho Festival"},"desc":{"es":"Los mejores sancochos de Hazleton en un solo parque.","en":"Hazleton's best sancochos in one park."},
     "d":12,"h0":720,"h1":1080,"door":0,"entry":"rsvp","cap":0,"party":6,"age":0,"kids":"fam","venue":"Parque Memorial","addr":"Hazle Township","st":"changes",
     "note":"La capacidad supera el aforo del local: pon cuántos caben en el parque",
     "before":[{"es":"Trae silla plegable; hay mesas comunitarias.","en":"Bring a folding chair; there are shared tables."}]},
    {"biz":"parroquia-santa-maria","fmt":"fe","ti":{"es":"Vigilia de oración y alabanza","en":"Prayer and worship vigil"},"desc":{"es":"Alabanza, reflexión y adoración. Hay cuidado de niños en el salón parroquial.","en":"Worship, reflection and adoration. Childcare in the parish hall."},
     "d":2,"h0":1140,"h1":1320,"door":30,"entry":"rsvp","cap":0,"party":8,"age":0,"kids":"care","st":"live",
     "lu":[{"h":1140,"who":"Coro parroquial","role":{"es":"Alabanza","en":"Worship"}},{"h":1185,"who":"P. Julio Mercedes","role":{"es":"Reflexión","en":"Reflection"}},{"h":1230,"who":"Todos","role":{"es":"Adoración y oración","en":"Adoration and prayer"}}],
     "before":[{"es":"Estacionamiento en la escuela de al lado.","en":"Parking at the school next door."}]},
    {"biz":"parroquia-santa-maria","fmt":"fe","ti":{"es":"Retiro de jóvenes · Un día con propósito","en":"Youth retreat · A day with purpose"},"desc":{"es":"Para jóvenes de 13 a 18 años. Si no puedes pagar, habla con el padre: nadie se queda fuera.","en":"For ages 13 to 18. If you cannot pay, talk to the priest: no one is left out."},
     "d":16,"h0":540,"h1":1020,"door":30,"entry":"tickets","age":0,"st":"live",
     "tks":[{"id":"ins","n":{"es":"Inscripción","en":"Registration"},"s":{"es":"Incluye almuerzo y camiseta","en":"Includes lunch and a T-shirt"},"p":1500,"cap":40,"off":false}],
     "lu":[{"h":540,"who":"Bienvenida","role":{"es":"Con el grupo de jóvenes","en":"With the youth group"}},{"h":600,"who":"Charlas y talleres","role":{"es":"En grupos pequeños","en":"In small groups"}},{"h":960,"who":"Misa de cierre","role":{"es":"Con las familias","en":"With families"}}]},
    {"biz":"ingles-para-todos","fmt":"clase","ti":{"es":"Taller gratis: inglés para tu entrevista de trabajo","en":"Free workshop: English for your job interview"},"desc":{"es":"Las preguntas que siempre hacen y práctica en parejas.","en":"The questions they always ask and practice in pairs."},
     "d":5,"h0":1080,"h1":1170,"door":0,"entry":"rsvp","cap":20,"party":1,"age":0,"st":"live",
     "lu":[{"h":1080,"who":"Profe Miriam","role":{"es":"Preguntas que siempre hacen","en":"Questions they always ask"}},{"h":1125,"who":"En parejas","role":{"es":"Práctica de entrevista","en":"Mock interview"}}],
     "before":[{"es":"Trae tu currículum si tienes uno.","en":"Bring your résumé if you have one."}]},
    {"biz":"el-palacio-show","fmt":"noche","ti":{"es":"Comedia dominicana · Noche de risa","en":"Dominican comedy · A night of laughs"},"desc":{"es":"Dos horas de comedia en español.","en":"Two hours of comedy in Spanish."},
     "d":1,"h0":1260,"h1":1380,"door":60,"entry":"tickets","age":18,"gen":[],"st":"live",
     "tks":[{"id":"gen","n":{"es":"Boleto general","en":"General admission"},"s":{"es":"Asiento por orden de llegada","en":"First come, first seated"},"p":2500,"cap":70,"off":false}],
     "lu":[{"h":1260,"who":"Comediantes invitados de Santo Domingo","role":{"es":"Show completo","en":"Full show"}}],
     "before":[{"es":"El show empieza a la hora.","en":"The show starts on time."}]},
    {"biz":"welly-cruz-eventos","fmt":"noche","ti":{"es":"Noche Retro 2000 · reguetón viejo","en":"Retro 2000 night · old-school reggaeton"},"desc":{"es":"Una noche con el reguetón de los 2000.","en":"A night of 2000s reggaeton."},
     "d":15,"h0":1320,"h1":1620,"door":30,"entry":"tickets","age":21,"gen":["reggaeton"],"venue":"Club Caliente","addr":"700 S Wyoming St","st":"review",
     "tks":[{"id":"gen","n":{"es":"Entrada general","en":"General admission"},"s":{"es":"","en":""},"p":1500,"cap":120,"off":false},{"id":"vip","n":{"es":"VIP · sin fila","en":"VIP · no line"},"s":{"es":"Entras por la puerta VIP","en":"Enter through the VIP door"},"p":3500,"cap":30,"off":false}],
     "lu":[{"h":1320,"who":"DJ Rafy Mejía","role":{"es":"Reguetón de los 2000","en":"2000s reggaeton"}}],
     "dress":{"es":"Ven con tu ropa de los 2000.","en":"Come dressed 2000s style."}},
    {"biz":"cantina-don-beto","fmt":"noche","ti":{"es":"Banda La Dinastía en vivo","en":"Banda La Dinastía live"},"desc":{"es":"Banda sinaloense en vivo en la cantina. La cocina sigue abierta.","en":"Live Sinaloa-style banda at the cantina. The kitchen stays open."},
     "d":2,"h0":1320,"h1":1500,"door":60,"entry":"tickets","age":21,"gen":[],"st":"live",
     "tks":[{"id":"gen","n":{"es":"Entrada general","en":"General admission"},"s":{"es":"","en":""},"p":1000,"cap":110,"off":false}],
     "mesas":[{"id":"mesa","z":{"es":"Mesa · frente a la banda","en":"Table · by the band"},"seats":8,"min":10000,"dep":3000,"cap":5}],
     "lu":[{"h":1320,"who":"Banda La Dinastía","role":{"es":"Dos tandas","en":"Two sets"}}],
     "before":[{"es":"Estacionamiento detrás de la cantina.","en":"Parking behind the cantina."}]}
  ]$j$;
begin
  select m.user_id into adm from staff_members m join users u on u.id = m.user_id where m.role = 'admin' and m.status = 'active' and u.phone = '+15705550199' limit 1;
  if adm is null then select user_id into adm from staff_members where role = 'admin' and status = 'active' limit 1; end if;
  -- La Parroquia publica sin revisión previa.
  insert into event_organizers (business_id, city_id, verified_at, verified_by)
  select id, city_id, now(), adm from businesses where id = 'parroquia-santa-maria' and status = 'active' on conflict (business_id) do nothing;
  for x in select * from jsonb_array_elements(lista) loop
    select bz.id, bz.city_id, bz.geo, bz.owner_user_id, c.timezone into b from businesses bz join cities c on c.id = bz.city_id where bz.id = x->>'biz' and bz.status = 'active';
    if not found then continue; end if;
    if exists (select 1 from events e where e.business_id = b.id and e.title->>'es' = x->'ti'->>'es') then continue; end if;
    hoy := (now() at time zone b.timezone)::date;
    st := x->>'st';
    insert into events (slug, city_id, business_id, format, title, description, genres, min_age, id_required, dress_code, kids, food_paid_at_venue, before_you_go, venue_mode, venue_name, venue_address, geom,
                        start_date, start_min, end_min, doors_before_min, entry, rsvp_capacity, party_max, tickets_cfg, tables_cfg, addons_cfg, status, submitted_at, approved_at, approved_by, reviewed_at, reviewed_by,
                        review_reason_key, review_note, created_by)
    values ('', b.city_id, b.id, x->>'fmt', x->'ti', coalesce(x->'desc', '{"es":"","en":""}'), array(select jsonb_array_elements_text(coalesce(x->'gen', '[]'))), (x->>'age')::smallint, (x->>'age')::int > 0,
            x->'dress', x->>'kids', coalesce((x->>'payAt')::boolean, false), coalesce(x->'before', '[]'), case when x ? 'venue' then 'other' else 'own' end, x->>'venue', x->>'addr', case when x ? 'venue' then null else b.geo end,
            hoy + (x->>'d')::int, (x->>'h0')::smallint, (x->>'h1')::smallint, (x->>'door')::smallint, x->>'entry', coalesce((x->>'cap')::int, 0), coalesce((x->>'party')::smallint, 1),
            coalesce(x->'tks', '[]'), coalesce(x->'mesas', '[]'), coalesce(x->'adds', '[]'), st,
            case when st <> 'draft' then now() - interval '3 hours' end, case when st = 'live' then now() - interval '2 hours' end, case when st = 'live' and b.id <> 'parroquia-santa-maria' then adm end,
            case when st in ('live', 'changes') and b.id <> 'parroquia-santa-maria' then now() - interval '2 hours' end, case when st in ('live', 'changes') and b.id <> 'parroquia-santa-maria' then adm end,
            case when st = 'changes' then 'aforo' end, x->>'note', b.owner_user_id)
    returning id into eid;
    insert into event_lineup (event_id, at_min, who, role, sort)
    select eid, (l->>'h')::smallint, l->>'who', l->'role', (o - 1)::smallint from jsonb_array_elements(coalesce(x->'lu', '[]')) with ordinality as t (l, o);
    -- El cartel: la primera foto del negocio (otra fila de media, para no quitársela a su página).
    select url, w, h into foto from media where owner_kind = 'business' and owner_id = b.id and status = 'visible' order by sort, created_at limit 1;
    if found then insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) values ('event', eid::text, foto.url, foto.w, foto.h, 'visible', 0, b.owner_user_id); end if;
    perform evt_sincronizar_fechas(eid);
    if st <> 'draft' then
      insert into event_review_log (event_id, city_id, version, decision, by_user, by_kind, snapshot, at)
      values (eid, b.city_id, 1, 'submitted', b.owner_user_id, 'business', jsonb_build_object('title', x->'ti', 'status', 'review'), now() - interval '3 hours');
    end if;
    if st = 'live' then
      insert into event_review_log (event_id, city_id, version, decision, by_user, by_kind, snapshot, at)
      values (eid, b.city_id, 1, 'approved', case when b.id = 'parroquia-santa-maria' then null else adm end, case when b.id = 'parroquia-santa-maria' then 'auto' else 'staff' end, jsonb_build_object('title', x->'ti', 'status', 'live'), now() - interval '2 hours');
    elsif st = 'changes' then
      insert into event_review_log (event_id, city_id, version, decision, reason_key, note, by_user, by_kind, snapshot, at)
      values (eid, b.city_id, 1, 'changes', 'aforo', x->>'note', adm, 'staff', jsonb_build_object('title', x->'ti', 'status', 'changes'), now() - interval '2 hours');
    elsif st = 'review' then
      insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority, opened_at)
      values ('evt', 'event', eid::text, b.id, b.city_id, 'normal', now() - interval '3 hours') on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing;
    end if;
  end loop;
end $$;

commit;
