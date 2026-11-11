-- 9a · compa7d: una operación de cada familia de «Ayuda con …» de las cuentas de prueba (555), sin solicitud ni datos privados.
select distinct on (o.kind) o.kind, o.number, u.phone, o.status, b.name
  from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id
 where u.phone like '+1570555%' and not exists (select 1 from help_requests h where h.operation_id = o.id)
   and not exists (select 1 from op_private p where p.operation_id = o.id)
   and not (o.kind = 'appointment' and (coalesce(o.details->>'rubro','') in ('salud','pro') or b.category_id in ('NEG-SALUD','NEG-PRO')))
   and not (o.kind = 'enrollment' and b.category_id = 'NEG-NINOS')
   and o.kind in ('appointment','order','market_order','hold','party','trip','night','enrollment','visit','private_event','tickets')
   and u.phone not in ('+15705550199','+15705550677')
   and (o.kind <> 'order' or (o.ready_at is not null and o.respond_by is not null))
   and (o.kind <> 'tickets' or exists (select 1 from payments p where p.operation_id = o.id and p.status = 'captured'))
 order by o.kind, (o.status = 'done') desc, o.sent_at desc;
