-- 0133_otp_deliveries.sql — bitácora de entrega del código de acceso (2026-08-02).
--
-- Acompaña a la función `send-otp`, que es NUESTRA capa de entrega del código de
-- 6 dígitos (WhatsApp primero, SMS de respaldo).
--
-- POR QUÉ. La pregunta que va a llegar mil veces es "no me llegó el código", y
-- sin esto no hay forma de responderla: ni por qué canal salió, ni si el
-- proveedor lo aceptó, ni qué dijo cuando lo rechazó.
--
-- QUÉ NO SE GUARDA, A PROPÓSITO:
--   · El CÓDIGO. Nunca, ni completo ni troceado. Una bitácora con códigos es
--     una lista de llaves de casa: quien la lea entra en cualquier cuenta.
--   · El teléfono completo. Solo los 4 últimos dígitos — suficiente para que el
--     usuario confirme "sí, ese es mi número" y para cruzarlo con un caso
--     concreto, sin acumular una agenda de números.
--
-- QUIÉN LA VE: nadie desde el navegador. Sin políticas RLS y sin permisos para
-- `anon`/`authenticated`, solo la alcanzan la función (con la clave de servicio)
-- y el panel de Supabase.

create table if not exists public.otp_deliveries (
  id          bigint generated always as identity primary key,
  channel     text        not null,          -- 'whatsapp' · 'sms' · 'blocked'
  ok          boolean     not null,
  last4       text,                          -- últimos 4 dígitos del teléfono
  error       text,                          -- lo que respondió el proveedor
  created_at  timestamptz not null default now()
);

comment on table public.otp_deliveries is
  'Entregas del código de acceso. Sin el código y sin el teléfono completo — ver 0133.';

-- Para "¿qué pasó en la última hora?" y para limpiar lo viejo.
create index if not exists otp_deliveries_created_idx
  on public.otp_deliveries (created_at desc);
-- Para "¿cuántos fallos llevamos hoy, y de qué canal?"
create index if not exists otp_deliveries_fallos_idx
  on public.otp_deliveries (created_at desc)
  where ok = false;

alter table public.otp_deliveries enable row level security;
-- Sin políticas a propósito: RLS activo y ninguna política = nadie pasa. La
-- función usa la clave de servicio, que salta RLS por diseño.

revoke all on public.otp_deliveries from anon, authenticated;

notify pgrst, 'reload schema';
