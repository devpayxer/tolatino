-- 0202 · Cobros fuera de sesión con la intención anotada antes (9t4, 21 nov; LAUNCH «Dinero por clase, 21 nov · lo que quedó», punto 4).
-- Idempotente. Nada se borra (estados); la auditoría y las alertas, solo inserción.
--
-- Los cobros con la tarjeta guardada que To'Latino hace sin la persona delante (el plan del Hogar cada mes, la renta al recoger, «un día más» y los
-- días tarde, la renovación sola de un patrocinio) siguen el patrón del cobro de Pro (0199, subscription_charges): (1) la INTENCIÓN se anota en una
-- transacción (esta tabla, con su llave, el monto, la comisión, la tarjeta y a qué corresponde, fijos); (2) la pasarela con ESA llave; (3) el cierre en
-- otra transacción, una vez ('done' where status = 'pending'). Sin respuesta de Stripe sigue 'pending' (no es un «no» del banco): la termina el barrido
-- (lib/cobro-fuera.ts › barrerCobrosFuera) con la MISMA llave dentro de HORAS_LLAVE (23 h, lib/cobros); pasado eso, la alerta offsession_stuck (una vez)
-- y nunca otro cobro. Una tabla para los tres flujos (una sola forma de hacerlo); Pro sigue con la suya (0199), que ya tiene su 3-D Secure y su período.
begin;

-- Dos alertas del dinero nuevas (money_alerts, una por tipo y objeto, como las demás):
--   offsession_stuck:     un cobro con tarjeta guardada anotado que lleva 23 h sin respuesta de Stripe: no se cobra otra vez; el equipo lo mira en Stripe.
--   offsession_unapplied: un cobro con tarjeta guardada que salió cuando lo que pagaba ya había cambiado (el plan se canceló, la renta volvió, el
--                         patrocinio terminó o ya no había puesto): no se aplicó; el equipo decide si se devuelve.
alter table money_alerts drop constraint if exists money_alerts_kind_check;
alter table money_alerts add constraint money_alerts_kind_check
  check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed', 'refund_failed', 'charge_unapplied',
                  'transfer_stuck', 'charge_stuck', 'offsession_stuck', 'offsession_unapplied'));

-- kind + ref_id = el objeto que paga (plan_subscriptions.id, rentals.id, sponsorships.id o event_sponsorships.id); purpose = a qué corresponde el
-- cobro dentro de ese objeto (el período del plan, «recoger», «dia-3», «tarde», «renovacion»). Una sola intención en camino por objeto (si Stripe no
-- contestó, nadie le cobra otra cosa hasta que esa termine) y un solo cobro hecho por objeto y propósito. sent_at: cuándo se mandó a Stripe por primera
-- vez (se anota ANTES de la llamada): sin él, nada salió y la intención se puede soltar sin preguntar. hold_pi: el depósito retenido al recoger una renta.
create table if not exists offsession_charges (
  id             bigint generated always as identity primary key,
  kind           text not null check (kind in ('plan', 'renta', 'patrocinio_negocio', 'patrocinio_evento')),
  ref_id         text not null check (ref_id ~ '^[0-9]{1,18}$'),
  purpose        text not null check (purpose ~ '^[a-z0-9_-]{1,40}$'),
  operation_id   bigint references operations (id),
  business_id    text not null references businesses (id),
  city_id        text references cities (id),
  payer_user_id  uuid not null references users (id),
  amount_cents   integer not null check (amount_cents > 0),
  fee_cents      integer not null default 0 check (fee_cents >= 0 and fee_cents <= amount_cents),
  destination    text check (char_length(destination) between 3 and 200),
  pm             text not null check (char_length(pm) between 3 and 200),
  idem_key       text not null unique check (char_length(idem_key) between 8 and 200),
  detail         jsonb not null default '{}'::jsonb,
  status         text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  sent_at        timestamptz,
  attempts       smallint not null default 0 check (attempts between 0 and 10000),
  last_error     text check (char_length(last_error) <= 120),
  stripe_pi      text check (char_length(stripe_pi) <= 200),
  hold_pi        text check (char_length(hold_pi) <= 200),
  created_at     timestamptz not null default now(),
  done_at        timestamptz
);
create unique index if not exists offsession_charges_una_en_camino on offsession_charges (kind, ref_id) where status = 'pending';
create unique index if not exists offsession_charges_un_cobro_por_proposito on offsession_charges (kind, ref_id, purpose) where status = 'done';
create index if not exists offsession_charges_camino_idx on offsession_charges (created_at) where status = 'pending';
create index if not exists offsession_charges_pi_idx on offsession_charges (stripe_pi) where stripe_pi is not null;
create index if not exists offsession_charges_payer_idx on offsession_charges (payer_user_id);
create index if not exists offsession_charges_city_idx on offsession_charges (city_id, created_at);

create or replace function offsession_charges_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cobro fuera de sesión no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_pi := null; new.hold_pi := null; new.sent_at := null; new.done_at := null; new.created_at := now();
    return new;
  end if;
  if (new.kind, new.ref_id, new.purpose, new.operation_id, new.business_id, new.city_id, new.payer_user_id, new.amount_cents, new.fee_cents, new.destination, new.pm, new.idem_key, new.detail, new.created_at)
     is distinct from (old.kind, old.ref_id, old.purpose, old.operation_id, old.business_id, old.city_id, old.payer_user_id, old.amount_cents, old.fee_cents, old.destination, old.pm, old.idem_key, old.detail, old.created_at) then
    raise exception 'de un cobro fuera de sesión solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not (old.status = 'pending' and new.status in ('done', 'failed')) then
    raise exception 'cobro_fuera_estado: % no pasa a %', old.status, new.status;
  end if;
  if old.status <> 'pending' and (new.attempts, new.last_error, new.stripe_pi, new.hold_pi, new.sent_at) is distinct from (old.attempts, old.last_error, old.stripe_pi, old.hold_pi, old.sent_at) then
    raise exception 'cobro_fuera_cerrado: un cobro % ya no cambia', old.status;
  end if;
  -- Lo que se anota una vez: cuándo se mandó, el PaymentIntent y el depósito retenido.
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'cobro_fuera: sent_at se anota una vez'; end if;
  if old.stripe_pi is not null and new.stripe_pi is distinct from old.stripe_pi then raise exception 'cobro_fuera: stripe_pi se anota una vez'; end if;
  if old.hold_pi is not null and new.hold_pi is distinct from old.hold_pi then raise exception 'cobro_fuera: hold_pi se anota una vez'; end if;
  -- Un cobro hecho salió por Stripe: trae su PaymentIntent y se mandó.
  if new.status = 'done' and old.status <> 'done' then
    if new.stripe_pi is null or new.sent_at is null then raise exception 'cobro_fuera: hecho sin PaymentIntent o sin mandarse'; end if;
    new.done_at := now();
  end if;
  return new;
end $$;
drop trigger if exists offsession_charges_antes on offsession_charges;
create trigger offsession_charges_antes before insert or update or delete on offsession_charges for each row execute function offsession_charges_antes();

commit;
