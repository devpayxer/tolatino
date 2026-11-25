-- 0224 · «Te proponen otra hora» (noche, fiesta) y «Te proponen otra salida» (viaje) dicen lo que se va a PEDIR con el dinero si no te sirve, según lo
-- que está en la base, y nada si no hay nada retenido (25 nov, la misma clase que 0219–0223: «lo que se dice ANTES de actuar», guardián
-- devueltoSoloSiSalio, regla 13).
-- Antes: noche_alt (0082), fiesta_alt (0073) y viaje_alt (0075) prometían «si no te sirve, se libera tu depósito / lo retenido» a todos, también a quien no
-- dejó depósito (una mesa sin depósito) y como si ya fuera un hecho. «No me sirve» y su vencimiento solo sueltan la retención (cobros › soltarRetencion), y
-- la pasarela puede no soltarla todavía. Ahora la frase es {dinero}, que el código llena con lib/devolucion-cancelar.ts › pideSoltarSi("sirve", …): «Si no
-- te sirve, pedimos que se suelte la retención de $X de tu tarjeta» solo si el cobro está retenido; vacío si no. {dinero} llega con su espacio delante.
-- Solo si nadie los cambió a mano (el texto sigue siendo el original en los dos idiomas, byte a byte): si el Super Admin ya los editó, manda lo suyo.
begin;
update notif_templates set body = '{"es":"{negocio} no tiene mesa a tu hora; te proponen las {alt}. Acéptala o elige «No me sirve».{dinero}","en":"{negocio} has no table at your time; they propose {alt}. Accept it or choose “Doesn’t work”.{dinero}"}'::jsonb, updated_at = now()
 where key = 'noche_alt'
   and body->>'es' = '{negocio} no tiene mesa a tu hora; te proponen las {alt}. Acéptala o elige «No me sirve» y se libera tu depósito.'
   and body->>'en' = '{negocio} has no table at your time; they propose {alt}. Accept it or choose “Doesn’t work” and your deposit is released.';
update notif_templates set body = '{"es":"{negocio}: el {dia} está libre, pero a las {alt}. Acéptala o no en la app.{dinero}","en":"{negocio}: {dia} is free, but at {alt}. Accept it or not in the app.{dinero}"}'::jsonb, updated_at = now()
 where key = 'fiesta_alt'
   and body->>'es' = '{negocio}: el {dia} está libre, pero a las {alt}. Acéptala o no en la app; si no te sirve, se libera tu depósito.'
   and body->>'en' = '{negocio}: {dia} is free, but at {alt}. Accept it or not in the app; if it does not work, your deposit is released.';
update notif_templates set body = '{"es":"{negocio} no tiene cupo a esa hora y te propone {alt}. Acéptala o no en la app.{dinero}","en":"{negocio} has no room at that time and proposes {alt}. Accept it or not in the app.{dinero}"}'::jsonb, updated_at = now()
 where key = 'viaje_alt'
   and body->>'es' = '{negocio} no tiene cupo a esa hora y te propone {alt}. Acéptala o no en la app; si no te sirve, se libera lo retenido.'
   and body->>'en' = '{negocio} has no room at that time and proposes {alt}. Accept it or not in the app; if it does not work, the hold is released.';
commit;
