-- 0013 · Recomendar un negocio (APP-NEG-RECOMENDAR): el «por qué lo recomiendas» (opcional, 280) y lo necesario
-- para no duplicar ni abusar (la misma persona no recomienda dos veces el mismo negocio en la misma ciudad).
begin;
alter table recommendations add column if not exists note text check (char_length(note) <= 280);
alter table recommendations add column if not exists contact_kind text check (contact_kind in ('phone', 'instagram', 'otro'));
create index if not exists recommendations_user_idx on recommendations (by_user_id, created_at desc);
create unique index if not exists recommendations_dedupe on recommendations (by_user_id, city_id, lower(business_name))
  where status in ('sent', 'draft');
commit;
