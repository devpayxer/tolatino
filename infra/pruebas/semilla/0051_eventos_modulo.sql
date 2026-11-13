-- Semilla de pruebas · 9b-3 · Los negocios de la semilla que tienen eventos encienden su módulo Eventos. SOLO SANDBOX (decisión I; regla 13).
-- Las semillas ya confirmadas no se editan: esta las completa (como 0049 y 0050).
--   · Desde 0107 un evento sale (listable) solo si su negocio tiene el módulo Eventos encendido. El relleno de 0107 («los negocios que ya tienen
--     eventos encienden su módulo») corre con las MIGRACIONES, antes de las semillas: en una base nueva, los eventos de 0035–0039 (La Terraza,
--     Sabor Dominicano, la Parroquia, El Palacio, Cantina Don Beto…) quedaban sin salir en ningún lado, y la ficha y la compra daban 404. En el
--     sandbox de siempre el módulo lo encendía la prueba evt6b-6c; barajadas (9b-3), evt6e, evt6g y fich8i corrían antes y fallaban.
-- Solo los negocios con eventos y con Eventos permitido en su categoría; el disparador de businesses vuelve a calcular `listable` de sus fechas.
-- Idempotente. Nada se borra.
update businesses b
   set modules_on = array(select distinct x from unnest(coalesce(b.modules_on, '{}'::text[]) || array['eventos']) x),
       modules_off = coalesce(b.modules_off, '{}'::jsonb) - 'eventos'
 where exists (select 1 from events e where e.business_id = b.id)
   and exists (select 1 from categories c where c.id = b.category_id and coalesce(c.allowed_modules, '[]'::jsonb) ? 'eventos')
   and not ('eventos' = any(coalesce(b.modules_on, '{}'::text[])) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'eventos'));
