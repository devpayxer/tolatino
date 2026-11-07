-- 0096 · Super Admin del grupo Iglesias + Bienes Raíces + Venta de Autos (Fase 4 · 4ig · fase4-iglesias-inmuebles-autos.md §4ig).
-- Cola «Vivienda justa» (vivienda), con dos clases de caso:
--   · subject_kind 'business': el negocio intentó guardar un texto con una frase de la lista de vivienda justa (no se guardó; la frase queda
--     en la auditoría `inm.vivienda_justa.frenada`). Un caso abierto por negocio junta todas las frenadas de 30 días. El equipo lo revisa
--     («Revisado, sin acción») o deja una advertencia al negocio con aviso.
--   · subject_kind 'listing': una propiedad que declara «vivienda para mayores de 62» (senior_62) nace «por revisar»; el equipo la confirma o
--     no (con motivo; «No se confirma» la oculta) y el negocio recibe el aviso.
-- Licencias: el barrido abre la cola «Licencias» para las licencias verificadas de las tres categorías cuya revisión vence en 14 días o ya
-- venció (lib/licencias.ts barrerLicencias); no hace falta columna nueva (licenses.next_review).
-- Idempotente: solo amplía checks, agrega plantillas (on conflict do nothing) y abre los casos que faltan sin repetir uno ya decidido.
begin;
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones', 'estafa', 'vivienda']));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim',
  'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing']));

-- Para juntar las frenadas de un negocio sin recorrer toda la auditoría.
create index if not exists audit_entries_vivienda_idx on audit_entries (target_id, at desc) where action = 'inm.vivienda_justa.frenada';

-- Avisos al negocio (ES/EN). Nunca dicen quién vive ni datos de nadie.
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_mayores_ok', 'biz', null, false, '{"es":"Vivienda para mayores confirmada","en":"Senior housing confirmed"}', '{"es":"{item} sale como vivienda para mayores de 62. To''Latino revisó la declaración.","en":"{item} shows as housing for people 62 and over. To''Latino reviewed the declaration."}'),
  ('biz_mayores_no', 'biz', null, true, '{"es":"Vivienda para mayores no confirmada","en":"Senior housing not confirmed"}', '{"es":"{item} quedó oculta: {motivo} Corrígela o cámbiala de tipo en tu panel.","en":"{item} is hidden: {motivo} Fix it or change its type in your dashboard."}'),
  ('biz_vivienda_aviso', 'biz', null, true, '{"es":"Aviso de vivienda justa","en":"Fair housing notice"}', '{"es":"To''Latino revisó los textos que no se guardaron por la ley de vivienda justa: {motivo} Quedó una advertencia en tu negocio.","en":"To''Latino reviewed the texts that were not saved under fair housing law: {motivo} A warning was added to your business."}')
on conflict (key) do nothing;

-- Casos que faltan: propiedades «para mayores» por revisar sin caso abierto.
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
select 'vivienda', 'listing', pl.item_id::text, pl.business_id, pl.city_id, 'normal'
  from property_listings pl join items i on i.id = pl.item_id
 where pl.senior_62 and pl.senior_status = 'review' and i.removed_at is null
   and not exists (select 1 from queue_items q where q.queue = 'vivienda' and q.subject_kind = 'listing' and q.subject_id = pl.item_id::text and q.status = 'open')
on conflict do nothing;

-- Frenadas de 30 días sin un caso abierto después de la última (un caso decidido no se repite: solo una frenada nueva abre otro).
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority, opened_at)
select 'vivienda', 'business', a.target_id, a.target_id, b.city_id, 'normal', max(a.at)
  from audit_entries a join businesses b on b.id = a.target_id
 where a.action = 'inm.vivienda_justa.frenada' and a.at > now() - interval '30 days'
 group by a.target_id, b.city_id
having not exists (select 1 from queue_items q where q.queue = 'vivienda' and q.subject_kind = 'business' and q.subject_id = a.target_id and q.opened_at >= max(a.at))
on conflict do nothing;
commit;
