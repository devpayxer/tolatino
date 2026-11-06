-- 0030 · Mi cuenta (bloque 2h). Preferencias de avisos (se guardan hoy y se aplican cuando salgan los avisos), el
-- código para borrar la cuenta y el motivo del borrado. Borrar = 30 días para arrepentirse (delete_at); entrar o
-- «Cancelar el borrado» lo quita. Nada se borra aquí: el borrado definitivo es un trabajo programado (LAUNCH-CHECKLIST).
begin;

alter table users add column if not exists notif_prefs jsonb not null default '{}'::jsonb;
alter table users add column if not exists delete_reason text check (delete_reason is null or delete_reason in ('uso', 'avisos', 'priv', 'ciudad', 'otra', 'admin'));

alter table otp_codes drop constraint if exists otp_codes_purpose_check;
alter table otp_codes add constraint otp_codes_purpose_check check (purpose in ('login', 'phone_change', 'claim_call', 'account_delete'));

alter table account_changes drop constraint if exists account_changes_kind_check;
alter table account_changes add constraint account_changes_kind_check check (kind in ('phone', 'city', 'email', 'name', 'photo', 'delete', 'undelete'));

commit;
