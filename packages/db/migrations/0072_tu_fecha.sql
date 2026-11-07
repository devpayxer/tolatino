-- 4u · «Tu fecha» (neg-fiesta-listing.js fechaVals L193–205): para ver quién está libre basta el día; qué celebras y dónde son
-- opcionales. Guardarla no aparta nada. Idempotente.
begin;
alter table user_event_plans alter column kind drop not null;
alter table user_event_plans alter column where_kind drop not null;
alter table user_event_plans alter column where_kind drop default;
commit;
