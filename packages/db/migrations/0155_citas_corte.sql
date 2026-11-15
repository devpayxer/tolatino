-- 0155 · Fase 9 · 9n-7 — Horario por módulo: las citas dejan de entrar antes de cerrar (LAUNCH «Horario distinto por módulo»; el «último
-- pedido» ya existía en menu_settings.last_min). booking_policies.close_cut_min: la última cita TERMINA ese tiempo antes de cerrar (0 =
-- hasta el cierre, como hoy). Panel › Lo que vendes › Citas › «LA ÚLTIMA CITA TERMINA»; lo aplica el motor de horas (lib/citas.ts huecos).
-- Idempotente.
begin;
alter table booking_policies add column if not exists close_cut_min smallint not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'booking_policies_close_cut_chk') then
    alter table booking_policies add constraint booking_policies_close_cut_chk check (close_cut_min between 0 and 240);
  end if;
end $$;
commit;
