-- 0219 · Los avisos de devolución de boletos dicen lo que PASÓ con el dinero, no lo decidido (9v, 25 nov; misma clase que el plan Pro y el patrocinio:
-- guardián devueltoSoloSiSalio). Antes, «Cancelaste tus boletos», «Te devolvieron tus boletos» y «Te devolvemos todo» decían «te devolvemos / te devolvió
-- {monto} … llega en 3–5 días hábiles» sin mirar a la pasarela: con la devolución en camino (Stripe no contestó; el barrido la sigue mandando sola) o
-- fallida, el aviso prometía lo que no había pasado. Ahora la frase del dinero es {dinero}, que el código llena con lo que de verdad pasó
-- (lib/boletos-despues.ts › dineroDevolucion): «Te devolvimos $X…» solo si salió; «va en camino» si sigue pendiente; «no salió» si quedó fallida.
-- Solo si nadie las cambió a mano (el texto sigue siendo el de 0109 / 0110 en los dos idiomas): si el Super Admin ya las editó, manda lo suyo (el código
-- sigue mandando {monto}, que ese texto usa).
begin;
update notif_templates set body = '{"es":"{evento}: cancelaste {cuantos}. {dinero} El cargo de servicio no se devuelve.","en":"{evento}: you cancelled {cuantos}. {dinero} The service fee is not refunded."}'::jsonb, updated_at = now()
 where key = 'bol_cancelado'
   and body->>'es' = '{evento}: cancelaste {cuantos}. Te devolvemos {monto} a tu tarjeta (3–5 días hábiles). El cargo de servicio no se devuelve.'
   and body->>'en' = '{evento}: you cancelled {cuantos}. We refund {monto} to your card (3–5 business days). The service fee is not refunded.';
update notif_templates set body = '{"es":"{negocio} devolvió {cuantos} de {evento}. {dinero} Esos boletos ya no entran.","en":"{negocio} refunded {cuantos} for {evento}. {dinero} Those tickets no longer get in."}'::jsonb, updated_at = now()
 where key = 'bol_devuelto'
   and body->>'es' = '{negocio} te devolvió {monto} de {evento} ({cuantos}). Llega a tu tarjeta en 3–5 días hábiles. Esos boletos ya no entran.'
   and body->>'en' = '{negocio} refunded you {monto} for {evento} ({cuantos}). It reaches your card in 3–5 business days. Those tickets no longer get in.';
update notif_templates set body = '{"es":"{evento}: pediste la devolución total, cargos incluidos. {dinero} Esos boletos ya no entran.","en":"{evento}: you asked for a full refund, fees included. {dinero} Those tickets no longer get in."}'::jsonb, updated_at = now()
 where key = 'evt_devolucion_total'
   and body->>'es' = '{evento}: te devolvemos {monto} completo, cargos incluidos. Llega a tu tarjeta en 3–5 días hábiles. Esos boletos ya no entran.'
   and body->>'en' = '{evento}: we refund {monto} in full, fees included. It reaches your card in 3–5 business days. Those tickets no longer get in.';
commit;
