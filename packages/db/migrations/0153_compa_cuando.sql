-- 0153 · Fase 9 · 9n-7 — El Compa: «Si no contestas en N min» y «Siempre, al instante» (LAUNCH «7f · CUÁNDO del diseño»).
-- · «Si no contestas en N min»: el mensaje del cliente marca chat_threads.compa_wait_until (= ahora + compa_auto_espera_min); el barrido
--   de cada minuto pasa los hilos vencidos a compa_pending_until (el turno de siempre) y, si el negocio contestó antes, el turno no hace nada.
--   Columna aparte de compa_pending_until para que «El Compa está escribiendo» solo salga cuando de verdad le toca (no durante la espera).
-- · compa_auto_espera_min se abre en Configuración (1–60 min; 10 de fábrica) y su ayuda dice lo que hace ahora.
-- Idempotente.
begin;
alter table chat_threads add column if not exists compa_wait_until timestamptz;
create index if not exists chat_threads_compa_espera_idx on chat_threads (compa_wait_until) where compa_wait_until is not null;
update config_keys set editable = true, bloqueo = null,
       help = '{"es":"Con la opción «Si no contestas en N min» de El Compa: cuánto espera a que el negocio conteste antes de contestar él.","en":"With El Compa''s «If you do not reply in N min» option: how long it waits for the business to reply before it answers."}'::jsonb
 where key = 'compa_auto_espera_min' and (not editable or bloqueo is not null);
commit;
