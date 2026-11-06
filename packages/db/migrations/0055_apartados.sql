-- 0055 · Apartar productos (Fase 4 · bloque 4f-3). Diseño: TLApartar.hold → el apartado de Tiendas (neg-tienda-flow.js:
-- APP-NEG-TIENDA-APARTADO y -ESTADO). Lo usan las tiendas de Auto y Hogar ahora y Tiendas después (mismo motor).
-- Un apartado es una operación (A-…, kind 'hold', pago en la caja) con sus líneas en operation_lines:
--   enviado (la tienda confirma que lo tiene; la unidad ya está reservada) → te lo guardan hasta (el día y la hora que
--   pasas + 48 h) → recogido | falta uno (quitarlo o cancelar) | no lo tienen | vencido | cancelado. Apartar no cobra nada.
begin;
alter table items add column if not exists attrs jsonb not null default '{}'::jsonb;  -- tienda: {cond: 'n'|'u', size: '225/65R17'}
alter table operation_lines add column if not exists status text not null default 'ok' check (status in ('ok', 'out', 'removed'));
create sequence hold_seq start 9501;
create index if not exists operations_holds_idx on operations (business_id, status, ready_at) where kind = 'hold';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('apt_ok', 'tx', null, true, '{"es": "Te lo guardan", "en": "It is held for you"}', '{"es": "{negocio} tiene tu apartado. Te lo guardan hasta el {hasta}. Pagas {monto} en la caja.", "en": "{negocio} has your hold. Kept until {hasta}. You pay {monto} at the register."}'),
  ('apt_falta', 'tx', null, true, '{"es": "Falta algo de tu apartado", "en": "Part of your hold is missing"}', '{"es": "{negocio} no tiene {articulo}. Quítalo y sigue con lo demás, o cancela.", "en": "{negocio} does not have {articulo}. Remove it and keep the rest, or cancel."}'),
  ('apt_no', 'tx', null, true, '{"es": "No lo tienen", "en": "Not in stock"}', '{"es": "{negocio} no tiene tu apartado. No se cobró nada.", "en": "{negocio} does not have your hold. Nothing was charged."}'),
  ('apt_vence', 'tx', null, false, '{"es": "Tu apartado venció", "en": "Your hold expired"}', '{"es": "{que} No se cobró nada.", "en": "{que} Nothing was charged."}'),
  ('biz_apartado', 'biz', null, true, '{"es": "Apartado", "en": "Hold"}', '{"es": "{cliente}: {que}.", "en": "{cliente}: {que}."}')
on conflict (key) do nothing;
commit;
