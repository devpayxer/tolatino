-- 0152 · Fase 9 · 9n-7 — apelar una suspensión o un baneo desde «Entrar» (LAUNCH «5d · Apelar una suspensión o un baneo»).
-- Quien está suspendido o baneado no abre la app, así que la respuesta a SU apelación (levantada o se mantiene) también sale por SMS
-- cuando no hay push que la lleve (sms_mode 'sin_push', como mod_sancion en 0147). Para lo demás que se apela (una publicación, un
-- comentario, una foto, un mensaje, un silencio) el código sigue mandando sinSms: la persona entra y lo ve en la campana.
-- Idempotente: solo cambia si todavía no cambió.
begin;
update notif_templates set sms = true, sms_mode = 'sin_push' where key in ('apel_lifted', 'apel_upheld') and (not sms or sms_mode <> 'sin_push');
commit;
