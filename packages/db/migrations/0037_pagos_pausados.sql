-- 0037 · Super Admin › Negocio 360° › Dinero (bloque 2o, prototipo Super Admin «din» · payHold). Pausar los pagos al banco
-- de un negocio (disputas o sospecha de fraude): se sigue cobrando pero nada sale al banco hasta reanudar. Quién y cuándo
-- quedan en la cuenta; el motivo, en la auditoría. Con Stripe real el calendario de pagos de la cuenta pasa a manual.
begin;

alter table stripe_accounts add column if not exists paused_at timestamptz;
alter table stripe_accounts add column if not exists paused_by uuid references users (id);

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pay_hold', 'biz', null, true, '{"es": "Pagos al banco en pausa", "en": "Bank payouts on hold"}', '{"es": "To’Latino pausó los pagos al banco de {negocio} mientras revisa un caso. Lo cobrado sigue guardado; te avisamos al reanudar.", "en": "To’Latino paused bank payouts for {negocio} while it reviews a case. What was charged is kept safe; we will tell you when they resume."}'),
  ('pay_resume', 'biz', null, false, '{"es": "Pagos al banco reanudados", "en": "Bank payouts resumed"}', '{"es": "Los pagos al banco de {negocio} vuelven a salir cada martes, con lo pendiente incluido.", "en": "Bank payouts for {negocio} go out every Tuesday again, including what was pending."}')
on conflict (key) do nothing;

commit;
