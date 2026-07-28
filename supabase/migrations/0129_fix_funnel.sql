-- 0129 · fix: la columna de salida `count` de admin_funnel ensombrecía la
-- función agregada count(*) y la columna business_metric_daily.count (bug de
-- plpgsql). Se renombra a `cnt` y se califican las columnas.
drop function if exists public.admin_funnel();
create function public.admin_funnel()
returns table (step text, label text, cnt bigint, pct numeric)
language plpgsql stable security definer set search_path = public as $fn$
declare v_views bigint; v_contact bigint; v_paid bigint;
begin
  perform public._require_admin(array['finanzas','moderador']);
  select coalesce(sum(b.count),0) into v_views from public.business_metric_daily b where b.kind='view' and b.day >= current_date - 30;
  select coalesce(sum(b.count),0) into v_contact from public.business_metric_daily b where b.kind in ('call','direction') and b.day >= current_date - 30;
  select count(*) into v_paid from public.payments p where p.status in ('paid','fulfilled') and p.created_at >= now()-interval '30 days';
  return query
  select 'view'::text, 'Vieron el negocio'::text, v_views, 100::numeric
  union all select 'contact', 'Contactaron (llamar / cómo llegar)', v_contact, round(v_contact::numeric/greatest(v_views,1)*100,0)
  union all select 'paid', 'Pagaron', v_paid, round(v_paid::numeric/greatest(v_views,1)*100,0);
end $fn$;
grant execute on function public.admin_funnel() to authenticated;
