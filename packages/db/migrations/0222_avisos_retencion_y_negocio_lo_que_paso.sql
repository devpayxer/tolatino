-- 0222 · Los avisos que hablan de una retención que se suelta y los avisos AL NEGOCIO cuando cancela quien pagó dicen lo que PASÓ con el dinero, no lo
-- decidido (9v, 25 nov, quinta tanda; la misma clase que 0219, 0220 y 0221: guardián devueltoSoloSiSalio).
-- (a) Al negocio: biz_noche_cx, biz_fiesta_cx y biz_insc_cx (0082, 0073, 0088) llevaban {dep} / {mat}, que el código llenaba con «Se le devuelve el depósito
--     de $X» sin mirar a la pasarela (y «El depósito de $X se queda contigo» con el depósito entero aunque ya hubiera una devolución parcial). Ahora la frase
--     es {dinero}, que el código llena con lo que de verdad pasó (lib/devolucion-cancelar.ts › dineroAlNegocio, del resultado de cobros › devolverAlCancelar:
--     devuelta · en camino · no salió · retención soltada · retención que no se soltó todavía) o con lo que de verdad queda del depósito.
-- (b) Lo retenido que se suelta sin cancelación (vence, «No hay cupo», «No me sirve», el mercado no acepta, la tienda no lo tiene): biz_noche_alt_no y
--     biz_fiesta_alt_no decían «Se liberó su depósito» / «Se le liberó el depósito», viaje_no y viaje_exp «Liberamos lo retenido», y merc_no, merc_exp y
--     apt_no «No se cobró nada» a secas, aunque la pasarela no hubiera soltado la retención (sigue en la tarjeta). Ahora {dinero}, de cobros ›
--     soltarRetencion: lo de siempre si se soltó; si no, que todavía no se soltó (el barrido la sigue soltando y el equipo de dinero tiene la alerta hold_stuck).
-- {dinero} llega con su espacio delante (o vacío cuando no hay nada que decir), como {dep} y {dev}.
-- Solo si nadie los cambió a mano (el texto sigue siendo el original en los dos idiomas, byte a byte): si el Super Admin ya los editó, manda lo suyo.
begin;
update notif_templates set body = '{"es":"{cliente} canceló su {servicio} de {noche}.{dinero}","en":"{cliente} cancelled their {servicio} for {noche}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_noche_cx'
   and body->>'es' = '{cliente} canceló su {servicio} de {noche}.{dep}'
   and body->>'en' = '{cliente} cancelled their {servicio} for {noche}.{dep}';
update notif_templates set body = '{"es":"{cliente} canceló la fiesta del {dia}.{dinero}","en":"{cliente} cancelled the party on {dia}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_fiesta_cx'
   and body->>'es' = '{cliente} canceló la fiesta del {dia}.{dep}'
   and body->>'en' = '{cliente} cancelled the party on {dia}.{dep}';
update notif_templates set body = '{"es":"{cliente} canceló su inscripción en {servicio}.{dinero}","en":"{cliente} cancelled their enrollment in {servicio}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_insc_cx'
   and body->>'es' = '{cliente} canceló su inscripción en {servicio}.{mat}'
   and body->>'en' = '{cliente} cancelled their enrollment in {servicio}.{mat}';
update notif_templates set body = '{"es":"{cliente} no aceptó la otra hora.{dinero}","en":"{cliente} did not accept the new time.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_noche_alt_no'
   and body->>'es' = '{cliente} no aceptó la otra hora. Se liberó su depósito.'
   and body->>'en' = '{cliente} did not accept the new time. Their deposit was released.';
update notif_templates set body = '{"es":"A {cliente} no le sirvió la otra hora del {dia}.{dinero}","en":"The new time on {dia} did not work for {cliente}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_fiesta_alt_no'
   and body->>'es' = 'A {cliente} no le sirvió la otra hora del {dia}. Se le liberó el depósito.'
   and body->>'en' = 'The new time on {dia} did not work for {cliente}. The deposit was released.';
update notif_templates set body = '{"es":"{negocio} no tiene cupo para el {dia} a las {hora}.{dinero}","en":"{negocio} has no room on {dia} at {hora}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'viaje_no'
   and body->>'es' = '{negocio} no tiene cupo para el {dia} a las {hora}. Liberamos lo retenido.'
   and body->>'en' = '{negocio} has no room on {dia} at {hora}. We released the hold.';
update notif_templates set body = '{"es":"{negocio} no contestó tu reserva del {dia}.{dinero}","en":"{negocio} did not reply to your booking for {dia}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'viaje_exp'
   and body->>'es' = '{negocio} no contestó tu reserva del {dia}. Liberamos lo retenido.'
   and body->>'en' = '{negocio} did not reply to your booking for {dia}. We released the hold.';
update notif_templates set body = '{"es":"{negocio} no puede con tu pedido {num}.{dinero}","en":"{negocio} cannot take your order {num}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'merc_no'
   and body->>'es' = '{negocio} no puede con tu pedido {num}. No se cobró nada.'
   and body->>'en' = '{negocio} cannot take your order {num}. Nothing was charged.';
update notif_templates set body = '{"es":"{negocio} no aceptó tu pedido {num} en 10 minutos.{dinero}","en":"{negocio} did not accept your order {num} within 10 minutes.{dinero}"}'::jsonb, updated_at = now()
 where key = 'merc_exp'
   and body->>'es' = '{negocio} no aceptó tu pedido {num} en 10 minutos. No se cobró nada.'
   and body->>'en' = '{negocio} did not accept your order {num} within 10 minutes. Nothing was charged.';
update notif_templates set body = '{"es":"{negocio} no tiene tu apartado.{dinero}","en":"{negocio} does not have your hold.{dinero}"}'::jsonb, updated_at = now()
 where key = 'apt_no'
   and body->>'es' = '{negocio} no tiene tu apartado. No se cobró nada.'
   and body->>'en' = '{negocio} does not have your hold. Nothing was charged.';
commit;
