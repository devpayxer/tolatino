-- 0154 · Fase 9 · 9n-7 — «Publicar otro negocio» (diseño ONB-NEG-A1: publicado → «Publicar otro negocio»; LAUNCH L49 (11)).
-- onboarding_drafts sigue siendo UNO por persona (el código de antes y el de ahora lo leen igual). Al empezar otro, el borrador publicado
-- se copia aquí tal cual (nada se borra) y el de la persona vuelve a empezar. Analítica › Embudo cuenta los dos.
-- No se edita (solo inserción); como el borrador, se borra con la cuenta (mapa de datos: borrar). Idempotente.
begin;
create table if not exists onboarding_drafts_done (
  id            bigserial primary key,
  user_id       uuid not null references users(id),
  step          text not null,
  answers       jsonb not null,
  imported_from jsonb,
  promo_code    text,
  started_at    timestamptz not null,
  completed_at  timestamptz not null,
  business_id   text,
  archived_at   timestamptz not null default now()
);
create index if not exists onboarding_drafts_done_user_idx on onboarding_drafts_done (user_id, completed_at desc);
create index if not exists onboarding_drafts_done_started_idx on onboarding_drafts_done (started_at);
create or replace function onboarding_drafts_done_solo_insercion() returns trigger language plpgsql as $$
begin
  raise exception 'los borradores publicados no se editan (solo inserción)';
end $$;
drop trigger if exists onboarding_drafts_done_inmutable on onboarding_drafts_done;
create trigger onboarding_drafts_done_inmutable before update on onboarding_drafts_done for each row execute function onboarding_drafts_done_solo_insercion();
commit;
