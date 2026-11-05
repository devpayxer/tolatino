-- Semilla del SANDBOX (solo pruebas): las licencias de los negocios de ejemplo del prototipo (attrs.lic), como
-- verificadas, para que la ficha «Licencia», la tarjeta y el filtro se vean con datos. Sin número (el prototipo lo
-- inventaba). Repetible: una viva por clave y negocio.
begin;
insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key,
       case when o.n = 1 and jsonb_typeof(b.category_attrs->'licL') = 'array' then jsonb_build_object('es', b.category_attrs->'licL'->>0, 'en', b.category_attrs->'licL'->>1) else k.title end,
       k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral jsonb_array_elements_text(case when jsonb_typeof(b.category_attrs->'lic') = 'array' then b.category_attrs->'lic' else '[]'::jsonb end) with ordinality o(k, n)
  join license_kinds k on k.key = o.k
 where b.is_demo
on conflict do nothing;
select licencias_refrescar(id) from businesses where is_demo and category_id = 'NEG-PRO';
commit;
