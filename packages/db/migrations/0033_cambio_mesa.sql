-- 0033 · Cambiar una reservación ya confirmada (bloque 2k, REVISION 4). El prototipo del cliente: «Cambiar reservación» →
-- el cambio queda pendiente y la reservación actual sigue en pie hasta que el restaurante lo confirme; si no puede (o no
-- responde a tiempo), se queda como está. El lado del panel se compuso con el detalle de la reservación (sin diseño propio).
-- Se reusa change_proposals con el lado que propone: el negocio (otra hora a una solicitud) o el cliente (cambio a una
-- confirmada). Nada se borra.
begin;

alter table change_proposals add column if not exists side text not null default 'business' check (side in ('business', 'customer'));
alter table change_proposals add column if not exists respond_by timestamptz;   -- el cliente: hasta cuándo responde el restaurante
alter table change_proposals add column if not exists seen_at timestamptz;      -- el cliente ya vio «Cambio no confirmado» (Entendido)
create index if not exists change_proposals_abiertas_idx on change_proposals (respond_by) where status = 'open' and side = 'customer';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('rsv_chg_ok', 'tx', 'cit', true, '{"es": "Cambio confirmado", "en": "Change confirmed"}', '{"es": "{negocio} confirmó el cambio: tu mesa es el {dia} a las {hora}.", "en": "{negocio} confirmed the change: your table is on {dia} at {hora}."}'),
  ('rsv_chg_no', 'tx', null, true, '{"es": "Cambio no confirmado", "en": "Change not confirmed"}', '{"es": "{negocio} no pudo hacer el cambio. Tu mesa del {dia} a las {hora} sigue en pie.", "en": "{negocio} could not make the change. Your table on {dia} at {hora} still stands."}'),
  ('biz_rsv_chg', 'biz', null, true, '{"es": "Piden cambiar una mesa", "en": "A table change request"}', '{"es": "{cliente} pide cambiar su mesa {num} al {dia} a las {hora}. Responde en {min} minutos.", "en": "{cliente} asks to change table {num} to {dia} at {hora}. Reply within {min} minutes."}')
on conflict (key) do nothing;

commit;
