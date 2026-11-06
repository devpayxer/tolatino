-- 0040 · Cola «Mensajes reportados» (bloque 2p). Un reporte de conversación abre un caso: solo mientras está abierto el
-- equipo puede leer el hilo. Ocultar un mensaje avisa a quien lo escribió con el motivo; nada se borra.
begin;
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change', 'review', 'help_request', 'chat_thread'));
alter table chat_messages add column if not exists hidden_by uuid references users (id);
commit;
