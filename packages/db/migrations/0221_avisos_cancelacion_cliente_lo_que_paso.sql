-- 0221 · Cuando cancela QUIEN PAGÓ (su viaje, su mesa de la noche, su fecha de fiesta, su inscripción, su evento privado) y cuando el RESTAURANTE cancela un
-- evento privado, el aviso dice lo que PASÓ con el dinero, no lo decidido (9v, 25 nov, cuarta tanda; la misma clase que 0219 y 0220: guardián
-- devueltoSoloSiSalio). Antes viaje_cx, noche_cx, fiesta_cx, insc_cx y evp_cancelado (0075, 0082, 0073, 0088, 0114) llevaban {dev}, que el código llenaba con
-- lo decidido («Te devolvemos todo», «Te devolvemos $X», «Te devolvemos $X en 3 a 5 días hábiles») sin mirar a la pasarela; y evp_cancelado_negocio (0114)
-- decía «Te devolvemos el depósito completo ({dep})» aunque Stripe hubiera dicho que no o no contestara. Ahora la frase del dinero es {dinero}, que el código
-- llena con lo que de verdad pasó (lib/devolucion-cancelar.ts › dineroAlCancelarCliente / dineroAlCancelar, del resultado de cobros › devolverAlCancelar):
-- «Te devolvimos $X…» solo si salió; «va en camino» si sigue pendiente; «no salió» si quedó fallida (el equipo de dinero ya tiene la alerta); «No se cobró
-- nada» si solo estaba retenido; y lo que se queda el negocio por la regla («Se cobró la mitad», «El depósito … se quedó con …», «Saliste de la lista»).
-- Solo si nadie los cambió a mano (el texto sigue siendo el original en los dos idiomas): si el Super Admin ya los editó, manda lo suyo.
begin;
update notif_templates set body = '{"es":"Cancelaste tu viaje del {dia} con {negocio}. {dinero}","en":"You cancelled your trip on {dia} with {negocio}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'viaje_cx'
   and body->>'es' = 'Cancelaste tu viaje del {dia} con {negocio}.{dev}'
   and body->>'en' = 'You cancelled your trip on {dia} with {negocio}.{dev}';
update notif_templates set body = '{"es":"Cancelaste en {negocio} para {noche}. {dinero}","en":"You cancelled at {negocio} for {noche}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'noche_cx'
   and body->>'es' = 'Cancelaste en {negocio} para {noche}.{dev}'
   and body->>'en' = 'You cancelled at {negocio} for {noche}.{dev}';
update notif_templates set body = '{"es":"Cancelaste tu fecha del {dia} con {negocio}. {dinero}","en":"You cancelled your date on {dia} with {negocio}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'fiesta_cx'
   and body->>'es' = 'Cancelaste tu fecha del {dia} con {negocio}.{dev}'
   and body->>'en' = 'You cancelled your date on {dia} with {negocio}.{dev}';
update notif_templates set body = '{"es":"Cancelaste tu inscripción en {negocio}. {dinero}","en":"You cancelled your enrollment at {negocio}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'insc_cx'
   and body->>'es' = 'Cancelaste tu inscripción en {negocio}.{dev}'
   and body->>'en' = 'You cancelled your enrollment at {negocio}.{dev}';
update notif_templates set body = '{"es":"Cancelaste tu evento privado del {dia} con {negocio}. {dinero}","en":"You cancelled your private event on {dia} with {negocio}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'evp_cancelado'
   and body->>'es' = 'Cancelaste tu evento privado del {dia} con {negocio}.{dev}'
   and body->>'en' = 'You cancelled your private event on {dia} with {negocio}.{dev}';
update notif_templates set body = '{"es":"{negocio} canceló tu evento privado del {dia}: {motivo}. {dinero}","en":"{negocio} cancelled your private event on {dia}: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'evp_cancelado_negocio'
   and body->>'es' = '{negocio} canceló tu evento privado del {dia}: {motivo}. Te devolvemos el depósito completo ({dep}).'
   and body->>'en' = '{negocio} cancelled your private event on {dia}: {motivo}. Your full deposit ({dep}) is refunded.';
commit;
