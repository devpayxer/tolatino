-- 9t · Los activos por rango (7 · 30 · 90 días, Super Admin › Analítica › Comunidad) se rehacen cada HORA; los rangos por ciudad y los candidatos
-- de Recomendados, cada 10 minutos como siempre. Con 1 M de vecinos los activos son el 85 % del barrido (7,5 s de 8,7 en la carga 44577890861;
-- rangos 0,7 s, Recomendados 0,5 s): son una cifra de análisis acumulada de días, no algo que alguien espere al momento. Así cada vuelta de
-- 10 minutos queda en ~1,2 s y la de los activos tiene su propio presupuesto (15 s, una vez por hora). Fuera del camino de cualquier pantalla.

begin;

create or replace function com_cifras_al_dia() returns integer language plpgsql as $$
declare n integer := 0;
begin
  if not exists (select 1 from com_rangos_ciudad where refreshed_at > now() - interval '10 minutes') then
    n := n + com_rangos_resumir() + com_recomendados_resumir();
  end if;
  if not exists (select 1 from com_activos_cache where refreshed_at > now() - interval '60 minutes') then
    n := n + com_activos_resumir();
  end if;
  return n;
end $$;

commit;
