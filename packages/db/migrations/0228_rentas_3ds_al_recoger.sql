-- 0228 · Rentas: 3-D Secure al recogerlas (LAUNCH 9q, 27 nov). El depósito de una renta se retiene al recoger, sin la persona en la app; si el banco
-- pide verificar, antes se soltaba y se le pedía cambiar la tarjeta. Ahora (lib/rentas.ts › terminarCobroRenta) la verificación queda a nombre de quien
-- paga como una más de payment_actions, con su propia clase 'renta' y la operación de la renta, y le llega el aviso renta_verify con el enlace a la hoja
-- (/pago/verificar?pi=…, la misma de la renovación de Pro). Al confirmarla, la renta sigue sola (depósito retenido, renta cobrada); si no la confirma en
-- verificacion_min (Configuración › Dinero), se suelta y se aplica lo de siempre (falloRecoger: cambia la tarjeta).
-- (1) payment_actions.kind acepta 'renta' (la renta sigue al confirmar y al vencer), y operation_id: de qué operación es la verificación (el panel del
--     negocio, la renta del cliente y Super Admin › Transacciones la leen por su índice). Una de renta siempre lleva su operación. operation_id entra a lo
--     que nunca cambia de una verificación (el disparador, con la misma firma).
-- (2) La plantilla renta_verify (cliente, como renta_tarjeta: SMS si no hay push).
-- Compatible con la versión anterior de la app: no escribe 'renta' ni operation_id (nula). Idempotente; nada se borra.
-- compatible: el check de kind solo amplía lo permitido (la app anterior escribe en_sesion y renovacion, que siguen valiendo) y el disparador solo suma operation_id a lo que no cambia (la app anterior nunca lo escribe: queda nulo).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
alter table payment_actions drop constraint if exists payment_actions_kind_check;
alter table payment_actions add constraint payment_actions_kind_check check (kind in ('en_sesion', 'renovacion', 'renta'));
alter table payment_actions add column if not exists operation_id bigint references operations (id);
create index if not exists payment_actions_op_idx on payment_actions (operation_id, created_at desc) where operation_id is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payment_actions_renta_op') then
    alter table payment_actions add constraint payment_actions_renta_op check (kind <> 'renta' or operation_id is not null) not valid;
  end if;
end $$;
alter table payment_actions validate constraint payment_actions_renta_op;
create or replace function payment_actions_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una verificación del banco no se borra (estados)'; end if;
  if (new.pi, new.base_idem, new.idem, new.user_id, new.business_id, new.kind, new.amount_cents, new.pm, new.created_at, new.operation_id) is distinct from
     (old.pi, old.base_idem, old.idem, old.user_id, old.business_id, old.kind, old.amount_cents, old.pm, old.created_at, old.operation_id) then
    raise exception 'de una verificación solo cambia su estado';
  end if;
  if new.status <> old.status and not ((old.status = 'pendiente' and new.status in ('verificada', 'fallo', 'vencida')) or (old.status = 'verificada' and new.status = 'vencida')) then
    raise exception 'verificacion_estado: de % no se pasa a %', old.status, new.status;
  end if;
  if new.status <> old.status then new.done_at := now(); end if;
  return new;
end $$;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, biz_pref, title, body) values
  ('renta_verify', 'tx', null, true, 'sin_push', true, false, 'cliente', null, '{"es": "Tu banco pide confirmar el depósito", "en": "Your bank asks you to confirm the deposit"}',
   '{"es": "Para entregarte {articulo}, {negocio} retiene un depósito de {monto} y tu banco pide que confirmes que eres tú. Ábrelo y confírmalo en los próximos {min} minutos; si no, no se cobra nada y la renta sigue apartada.", "en": "To hand you {articulo}, {negocio} holds a {monto} deposit and your bank asks you to confirm it is you. Open it and confirm within the next {min} minutes; otherwise nothing is charged and the rental stays on hold."}')
on conflict (key) do nothing;
commit;
