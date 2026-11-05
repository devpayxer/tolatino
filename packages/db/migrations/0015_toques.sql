-- 0015 · Contactos del panel («CONTACTOS · 7 DÍAS»): un toque cuenta una vez cada 10 minutos por persona (o por
-- dirección de red si no entró) y negocio, con tope por red; la gente del propio negocio no cuenta.
begin;
alter table contact_taps add column if not exists ip inet;
create index if not exists contact_taps_ip_idx on contact_taps (ip, at desc) where ip is not null;
create index if not exists contact_taps_quien_idx on contact_taps (business_id, user_id, at desc);
commit;
