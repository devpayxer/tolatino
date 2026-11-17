-- Sandbox: los cupos ocupados de los grupos de los negocios demo cuadran con sus inscripciones vivas.
-- Los generadores ponían un número a mano y algunas matrículas no quedaban ligadas a su grupo (ya corregido):
-- aquí se recalcula desde las operaciones, como lo lleva la app (sube al inscribir, baja al soltar el cupo).
-- Solo negocios is_demo, solo grupos de inscripción; idempotente (solo toca los que no cuadran).
begin;
with vivos as (
  select (o.details->>'group_id')::bigint as g, count(*)::int as n
    from operations o join businesses b on b.id = o.business_id
   where b.is_demo and coalesce(o.details->>'group_id', '') ~ '^\d+$'
     and o.status not in ('cancelled', 'rejected', 'expired')
   group by 1)
update class_groups g
   set seats_booked = coalesce(v.n, 0),
       seats_total = greatest(g.seats_total, g.seats_outside + coalesce(v.n, 0)),
       updated_at = now()
  from businesses b, class_groups g2 left join vivos v on v.g = g2.id
 where g.id = g2.id and b.id = g.business_id and b.is_demo and g.purpose = 'insc'
   and g.seats_booked is distinct from coalesce(v.n, 0);
commit;
