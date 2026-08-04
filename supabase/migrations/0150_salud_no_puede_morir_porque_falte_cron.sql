-- 0150_salud_no_puede_morir_porque_falte_cron.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: al dar de alta al fundador como `superadmin` en producción
-- (2026-08-04) probé el panel llamando a sus RPC como él. En pruebas salió todo;
-- en PRODUCCIÓN la cuarta reventó:
--
--   ERROR: 42P01: relation "cron.job" does not exist
--   CONTEXT: PL/pgSQL function admin_health() line 8
--
-- O sea: la pestaña **Salud** de `/admin` se cae en producción, y se habría
-- caído la primera vez que el fundador la abriera. `admin_health` consulta
-- `cron.job` sin comprobar que `pg_cron` esté instalada — y en producción no lo
-- está. En pruebas sí, así que allí parecía perfecta.
--
-- POR QUÉ NO SE VIO ANTES: en producción no había NINGÚN administrador (la tabla
-- `admins` estaba vacía), así que nadie había podido abrir el panel para
-- descubrirlo. El fallo llevaba ahí desde que se escribió.
--
-- LO QUE ARREGLA ESTO Y LO QUE NO. Esto evita que el panel se caiga. NO instala
-- `pg_cron` en producción, y esa es una decisión aparte del fundador: hoy
-- producción **no tiene ninguna tarea programada**, así que la única que existe
-- en pruebas —`fred-rates-weekly`, que refresca las tasas hipotecarias de Bienes
-- Raíces cada jueves— allí no corre. Por eso la fila sale en ROJO con el motivo
-- escrito, en vez de en verde fingiendo que todo va bien: el panel tiene que
-- decir la verdad, y la verdad es que no hay tareas.
create or replace function public.admin_health()
returns table(label text, value text, ok boolean)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare v_stuck int; v_last timestamptz; v_cron int; v_cron_txt text;
begin
  perform public._require_admin();
  select count(*) into v_stuck from public.pending_purchases
    where status in ('fulfilling','failed') or (status='pending' and stripe_payment_intent is not null and updated_at < now()-interval '30 minutes');
  select max(created_at) into v_last from public.payments;

  -- `to_regclass` devuelve NULL en vez de reventar cuando la tabla no existe, y
  -- el `execute` evita que PL/pgSQL intente planificar una referencia a una
  -- tabla ausente.
  if to_regclass('cron.job') is null then
    v_cron := 0;
    v_cron_txt := '0 · pg_cron no instalada';
  else
    execute 'select count(*) from cron.job where active' into v_cron;
    v_cron_txt := v_cron::text;
  end if;

  return query
  select 'Pagos por entregar'::text, v_stuck::text, (v_stuck = 0)
  union all select 'Último pago', coalesce(to_char(v_last, 'DD Mon HH24:MI'), '—'), (v_last is not null)
  union all select 'Tareas programadas activas', v_cron_txt, (v_cron > 0)
  union all select 'Pagos en línea', case when (select enabled from public.platform_flags where key='checkout.online') then 'ON' else 'OFF' end,
    (select enabled from public.platform_flags where key='checkout.online');
end $function$;

notify pgrst, 'reload schema';
