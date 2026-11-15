-- 0149 · Fase 9 · 9n-5 — los plazos de la Fase 4 que estaban en SOLO LECTURA se abren en Sistema › Configuración (LAUNCH «5i · Plazos de la
-- Fase 4 en SOLO LECTURA», «Educación + Niños + Deporte · Configuración», «Configuración (Fase 5): hacer editables los plazos de Doctores y
-- Profesionales», «4ie · Plazo de 4 h hábiles y 24 h de "Pasó"»). Ya se leían de aquí; ahora cada texto que ve la persona dice el valor
-- (guardián plazoAbiertoSeLee), así que se pueden cambiar sin que la pantalla diga otra cosa que la regla.
-- Solo cambia la marca (editable, bloqueo): los límites y el de fábrica siguen los de 0105. Idempotente.
begin;

update config_keys set editable = true, bloqueo = null
 where key in ('insc_responder_h', 'insc_oferta_h', 'insc_baja_h', 'ninos_purga_dias')
   and not editable;

-- El aviso al negocio de una baja pedida decía «a las 72 h»: ahora {horas}, que manda inscripciones.ts con el valor de insc_baja_h.
update notif_templates set body = '{"es":"{cliente} pidió cancelar su membresía. Confírmala en To''Latino; a las {horas} h queda cancelada sola.","en":"{cliente} asked to cancel their membership. Confirm it in To''Latino; after {horas} h it is cancelled automatically."}'::jsonb
 where key = 'biz_insc_cancel_req' and body->>'es' like '%a las 72 h%';

commit;
