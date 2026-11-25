-- 0220 · Cuando el NEGOCIO cancela (la salida de un viaje, la mesa de la noche, la inscripción o el grupo que no abre, la fecha de la fiesta), el aviso dice lo
-- que PASÓ con el dinero, no lo decidido (9v, 25 nov, tercera tanda; la misma clase que 0219 y el patrocinio: guardián devueltoSoloSiSalio). Antes
-- viaje_cancelada, noche_biz_cx, insc_biz_cx, insc_grupo_cx y fiesta_biz_cx (0075, 0082, 0088, 0073) decían «Te devolvemos todo» / «Te devolvemos el depósito
-- completo» sin mirar a la pasarela: con la devolución en camino o fallida (Stripe dijo que no), o con nada cobrado (solo retenido), el aviso prometía lo que
-- no había pasado. Ahora la frase del dinero es {dinero}, que el código llena con lo que de verdad pasó (lib/devolucion-cancelar.ts › dineroAlCancelar, del
-- resultado de cobros › devolverAlCancelar): «Te devolvimos $X…» solo si salió; «va en camino» si sigue pendiente; «no salió» si quedó fallida (el equipo de
-- dinero ya tiene la alerta); «No se cobró nada» si solo estaba retenido o no había cobro.
-- Y los títulos de 0109 / 0110 que también lo daban por hecho: «Te devolvieron tus boletos» → «Tus boletos: la devolución»; «Te devolvemos todo» →
-- «Devolución total» (el cuerpo, de 0219, ya dice lo que pasó).
-- Solo si nadie los cambió a mano (el texto sigue siendo el original en los dos idiomas): si el Super Admin ya los editó, manda lo suyo.
begin;
update notif_templates set body = '{"es":"{negocio} canceló la salida del {dia} a las {hora}: {motivo}. {dinero}","en":"{negocio} cancelled the {dia} {hora} departure: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'viaje_cancelada'
   and body->>'es' = '{negocio} canceló la salida del {dia} a las {hora}: {motivo}. Te devolvemos todo.'
   and body->>'en' = '{negocio} cancelled the {dia} {hora} departure: {motivo}. You get everything back.';
update notif_templates set body = '{"es":"{negocio} canceló tu mesa de {noche}: {motivo}. {dinero}","en":"{negocio} cancelled your table for {noche}: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'noche_biz_cx'
   and body->>'es' = '{negocio} canceló tu mesa de {noche}: {motivo}. Te devolvemos todo.'
   and body->>'en' = '{negocio} cancelled your table for {noche}: {motivo}. Full refund.';
update notif_templates set body = '{"es":"{negocio} canceló tu inscripción: {motivo}. {dinero}","en":"{negocio} cancelled your enrollment: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'insc_biz_cx'
   and body->>'es' = '{negocio} canceló tu inscripción: {motivo}. Te devolvemos todo.'
   and body->>'en' = '{negocio} cancelled your enrollment: {motivo}. Full refund.';
update notif_templates set body = '{"es":"{negocio} canceló el grupo: {motivo}. {dinero}","en":"{negocio} cancelled the group: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'insc_grupo_cx'
   and body->>'es' = '{negocio} canceló el grupo: {motivo}. Te devolvemos todo.'
   and body->>'en' = '{negocio} cancelled the group: {motivo}. Full refund.';
update notif_templates set body = '{"es":"{negocio} canceló tu fecha del {dia}: {motivo}. {dinero}","en":"{negocio} cancelled your date on {dia}: {motivo}. {dinero}"}'::jsonb, updated_at = now()
 where key = 'fiesta_biz_cx'
   and body->>'es' = '{negocio} canceló tu fecha del {dia}: {motivo}. Te devolvemos el depósito completo.'
   and body->>'en' = '{negocio} cancelled your date on {dia}: {motivo}. Your deposit is refunded in full.';
update notif_templates set title = '{"es":"Tus boletos: la devolución","en":"Your tickets: the refund"}'::jsonb, updated_at = now()
 where key = 'bol_devuelto'
   and title->>'es' = 'Te devolvieron tus boletos'
   and title->>'en' = 'Your tickets were refunded';
update notif_templates set title = '{"es":"Devolución total","en":"Full refund"}'::jsonb, updated_at = now()
 where key = 'evt_devolucion_total'
   and title->>'es' = 'Te devolvemos todo'
   and title->>'en' = 'We refund everything';
commit;
