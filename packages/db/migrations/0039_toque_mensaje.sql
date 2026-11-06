-- 0039 · «Mensaje» en la ficha (bloque 2p) cuenta como contacto en las cifras del panel, igual que llamar o WhatsApp.
begin;
alter table contact_taps drop constraint if exists contact_taps_kind_check;
alter table contact_taps add constraint contact_taps_kind_check check (kind in ('call', 'whatsapp', 'directions', 'share', 'calendar', 'copy', 'message'));
commit;
