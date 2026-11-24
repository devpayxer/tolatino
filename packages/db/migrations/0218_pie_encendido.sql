-- 0218 · El pie de la web encendido (fundador, 24 nov: «enciende el footer, necesito que visualmente todo se vea para poder corregir»; decisión AT).
-- 0136 lo dejó apagado para no cambiar las capturas aprobadas; el fundador lo pide encendido en todas las pantallas públicas. Se enciende igual que lo haría
-- Super Admin › Textos y páginas › Páginas (lib/cms-admin.ts fijarPie): el interruptor y su auditoría en la misma transacción. Solo si sigue apagado y
-- nadie lo tocó a mano (updated_by sigue siendo «migración 0136»): si el Super Admin ya lo cambió, manda lo suyo. Se puede volver a apagar desde el Super Admin.
begin;
with prev as (
  select enabled from feature_flags where key = 'web.pie_todas' and enabled = false and updated_by = 'migración 0136' for update
), cambio as (
  update feature_flags set enabled = true, updated_at = now(), updated_by = 'migración 0218' where key = 'web.pie_todas' and exists (select 1 from prev) returning key
)
insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, before, after, reason)
select 'system', 'migracion-0218', 'cms.pie', 'feature_flag', 'web.pie_todas', '{"encendido": false}'::jsonb, '{"encendido": true}'::jsonb,
       'Pedido del fundador (24 nov, decisión AT): el pie de la web en todas las pantallas públicas'
  from cambio;
commit;
