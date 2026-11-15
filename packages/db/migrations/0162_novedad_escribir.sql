-- 0162 · Fase 9 · 9n-12 — «Escribir» como botón de una novedad (LAUNCH «Evento y vacante como tipo y como botón … «Escribir»: con Mensajes»;
-- diseño Panel v2: lk 'msg' → «Escríbele a {negocio}» · Escribir). Abre Mensajes con el negocio. Idempotente.
begin;
alter table business_posts drop constraint if exists business_posts_link_kind_check;
alter table business_posts add constraint business_posts_link_kind_check check (link_kind in ('job', 'none', 'item', 'menu', 'tel', 'msg', 'web', 'event'));
commit;
