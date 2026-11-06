-- 0042 · Disputas con el banco (contracargos) · bloque 2r (Super Admin.dc.html, cola «disputa»: referencia, monto, plazo
-- del banco, motivo, la evidencia que tenemos; Responder con evidencia / Aceptar devolución). Llegan por el webhook de
-- Stripe (charge.dispute.*) o, en el sandbox, del simulador. Cada disputa abre un caso en la cola; el negocio recibe el
-- aviso y la ve en Cobros. Nada se borra: el estado cambia (needs_response → under_review → won | lost | accepted).
begin;

create table if not exists disputes (
  id                 bigint generated always as identity primary key,
  stripe_dispute_id  text not null unique,
  payment_id         bigint references payments (id),
  operation_id       bigint references operations (id),
  business_id        text references businesses (id),
  city_id            text references cities (id),
  amount_cents       integer not null check (amount_cents >= 0),
  reason             text not null default 'general' check (char_length(reason) <= 60),
  status             text not null default 'needs_response' check (status in ('needs_response', 'under_review', 'won', 'lost', 'accepted')),
  evidence_due_by    timestamptz,
  response_text      text check (char_length(response_text) <= 2000),
  responded_by       uuid references users (id),
  responded_at       timestamptz,
  closed_at          timestamptz,
  simulated          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists disputes_biz_idx on disputes (business_id, created_at desc);
create index if not exists disputes_open_idx on disputes (status, evidence_due_by) where status in ('needs_response', 'under_review');

alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute'));

-- Finanzas trabaja la cola de disputas (su rol solo ve esa cola).
insert into role_permissions (role, section, action, allowed) values ('finanzas', 'colas', 'ver', true), ('finanzas', 'colas', 'aprobar', true)
on conflict (role, section, action) do update set allowed = true, updated_at = now();

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_dispute', 'biz', null, true, '{"es": "Un cliente disputó un cobro", "en": "A customer disputed a charge"}', '{"es": "Un cliente disputó con su banco el cobro del pedido #{num} ({monto}). To’Latino responde con la evidencia del pedido; te avisamos el resultado.", "en": "A customer disputed the charge for order #{num} ({monto}) with their bank. To’Latino responds with the order evidence; we will tell you the result."}'),
  ('biz_dispute_end', 'biz', null, false, '{"es": "Resultado de la disputa", "en": "Dispute result"}', '{"es": "Disputa del pedido #{num}: {resultado}.", "en": "Dispute for order #{num}: {resultado}."}')
on conflict (key) do nothing;

commit;
