-- 0223 · La cita que cancela el cliente y el pedido que el negocio no acepta dicen lo que PASÓ con el dinero, no lo decidido (9v, 25 nov, sexta tanda;
-- la misma clase que 0219–0222: guardián devueltoSoloSiSalio).
-- (a) Al negocio: biz_cita_cx (0045) llevaba {dep}, que el código llenaba con «El depósito de $X se queda contigo» con el depósito entero aunque ya hubiera
--     una devolución parcial, y callaba lo que pasaba con la devolución de una cancelación a tiempo (que además se tiraba sin mirar). Ahora la frase es
--     {dinero}, que el código llena con lo que de verdad pasó (lib/devolucion-cancelar.ts › dineroAlNegocio, del resultado de cobros › devolverAlCancelar:
--     devuelta · en camino · no salió · retención soltada · retención que no se soltó todavía) o con lo que de verdad queda del depósito.
-- (b) Al cliente: ord_no (0032) decía «No se te cobró nada» a secas aunque la pasarela no hubiera soltado la retención de la tarjeta (sigue en la tarjeta).
--     Ahora {dinero}, que avisos › avisarPedido lee del cobro después de soltarlo (cobros › soltarRetencion): lo de siempre si se soltó o no había tarjeta; si
--     no, que todavía no se soltó (el barrido la sigue soltando y el equipo de dinero tiene la alerta hold_stuck).
-- {dinero} llega con su espacio delante (o vacío cuando no hay nada que decir), como {dep} y {dev}.
-- Solo si nadie los cambió a mano (el texto sigue siendo el original en los dos idiomas, byte a byte): si el Super Admin ya los editó, manda lo suyo.
begin;
update notif_templates set body = '{"es":"{cliente} canceló {servicio} del {dia} a las {hora}.{dinero}","en":"{cliente} cancelled {servicio} on {dia} at {hora}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'biz_cita_cx'
   and body->>'es' = '{cliente} canceló {servicio} del {dia} a las {hora}.{dep}'
   and body->>'en' = '{cliente} cancelled {servicio} on {dia} at {hora}.{dep}';
update notif_templates set body = '{"es":"{negocio} no pudo aceptar tu pedido #{num}.{dinero}","en":"{negocio} could not accept your order #{num}.{dinero}"}'::jsonb, updated_at = now()
 where key = 'ord_no'
   and body->>'es' = '{negocio} no pudo aceptar tu pedido #{num}. No se te cobró nada.'
   and body->>'en' = '{negocio} could not accept your order #{num}. You were not charged.';
commit;
