-- 0046 · Staff con silla propia (Fase 3 · bloque 3d). Quien renta una silla es su propio negocio para el cliente: pone
-- sus precios, su agenda y su depósito, y el depósito llega a SU banco (no al del local). Cada silla rentada tiene su
-- cuenta de cobro (Stripe Connect Express, o simulada en el sandbox); la conecta el barbero desde su cuenta de To'Latino
-- cuando el dueño se lo pide desde Panel › Lo que vendes › Sillas. Nada se borra.
begin;

create table if not exists member_payout_accounts (
  member_id         uuid primary key references business_members (id),
  business_id       text not null references businesses (id),
  stripe_account_id text not null unique,
  status            text not null default 'pending' check (status in ('pending', 'restricted', 'enabled')),
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  requirements      jsonb not null default '[]'::jsonb,
  bank_last4        text check (bank_last4 ~ '^[0-9]{4}$'),
  simulated         boolean not null default false,
  invited_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists member_payout_accounts_negocio on member_payout_accounts (business_id);

-- La silla también puede quedar invitada sin cuenta todavía (el dueño pidió que la conecte).
alter table business_members add column if not exists payout_invited_at timestamptz;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('silla_cobro', 'tx', null, true, '{"es": "Conecta tu cuenta de cobro", "en": "Connect your payout account"}', '{"es": "{negocio} te pide conectar tu cuenta de cobro: los depósitos de tus citas llegan directo a tu banco.", "en": "{negocio} asks you to connect your payout account: your booking deposits go straight to your bank."}'),
  ('biz_silla_cobro', 'biz', null, false, '{"es": "Silla con cobros", "en": "Chair payouts on"}', '{"es": "{persona} conectó su cuenta de cobro: su silla ya pide depósito en línea.", "en": "{persona} connected a payout account: the chair now takes online deposits."}')
on conflict (key) do nothing;

commit;
