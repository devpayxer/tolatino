-- 9n-19 · Impuestos editables desde el Super Admin (LAUNCH L471, 4g-3). tax_rules (por ciudad y categoría: impuesto sobre partes / el precio y
-- sobre la mano de obra, desde una fecha) solo se escribía en migraciones y semilla. Ahora el Super Admin programa una regla NUEVA desde una
-- fecha (ahora, el 1.º del mes que viene o el 1.º de enero), con motivo, como Comisiones de Planes:
--   · quién y por qué (created_by, reason): lo que había antes queda con los dos en null (semilla);
--   · solo inserción: una regla nunca se cambia ni se borra (el historial explica cada estimado y cada total en la puerta, que copian el
--     porcentaje de su momento);
--   · lo que ya se cotizó o se vendió no cambia (estimates y vehicle_listings guardan su copia; el total en la puerta se recalcula por lotes
--     cuando entra en vigor la regla nueva: lib/autos.ts firmaTotales usa la regla VIGENTE de cada ciudad, no la última creada).
-- Idempotente; nada se borra.

alter table tax_rules add column if not exists created_by uuid references users(id);
alter table tax_rules add column if not exists reason text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tax_rules_reason_len') then
    alter table tax_rules add constraint tax_rules_reason_len check (reason is null or char_length(reason) between 3 and 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tax_rules_parts_bp_check') then
    alter table tax_rules add constraint tax_rules_parts_bp_check check (parts_bp between 0 and 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tax_rules_labor_bp_check') then
    alter table tax_rules add constraint tax_rules_labor_bp_check check (labor_bp between 0 and 2000);
  end if;
end $$;

create or replace function tax_rules_no_cambia() returns trigger language plpgsql as $$
begin
  raise exception 'tax_rules es solo de inserción: para cambiar un impuesto se programa una regla nueva desde una fecha';
end $$;
drop trigger if exists tax_rules_no_cambia on tax_rules;
create trigger tax_rules_no_cambia before update or delete on tax_rules for each row execute function tax_rules_no_cambia();
