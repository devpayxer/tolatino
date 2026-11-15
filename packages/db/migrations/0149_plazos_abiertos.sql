-- 0149 · Fase 9 · 9n-5 — los plazos de la Fase 4 que estaban en SOLO LECTURA se abren en Sistema › Configuración (LAUNCH «5i · Plazos de la
-- Fase 4 en SOLO LECTURA», «Educación + Niños + Deporte · Configuración», «Configuración (Fase 5): hacer editables los plazos de Doctores y
-- Profesionales», «4ie · Plazo de 4 h hábiles y 24 h de "Pasó"»). Ya se leían de aquí; ahora cada texto que ve la persona dice el valor
-- (guardián plazoAbiertoSeLee), así que se pueden cambiar sin que la pantalla diga otra cosa que la regla.
-- Solo cambia la marca (editable, bloqueo): los límites y el de fábrica siguen los de 0105. Idempotente.
begin;

update config_keys set editable = true, bloqueo = null
 where key in ('insc_responder_h', 'insc_oferta_h', 'insc_baja_h', 'ninos_purga_dias',
               'fe_responder_h', 'vis_responder_h', 'vis_paso_h', 'vis_purga_dias',
               'sp_seguro_guardar_h', 'sp_total_escrito_dias', 'sp_notas_purga_dias', 'ayuda_negocio_h')
   and not editable;

-- El aviso al negocio de una baja pedida decía «a las 72 h»: ahora {horas}, que manda inscripciones.ts con el valor de insc_baja_h.
update notif_templates set body = '{"es":"{cliente} pidió cancelar su membresía. Confírmala en To''Latino; a las {horas} h queda cancelada sola.","en":"{cliente} asked to cancel their membership. Confirm it in To''Latino; after {horas} h it is cancelled automatically."}'::jsonb
 where key = 'biz_insc_cancel_req' and body->>'es' like '%a las 72 h%';

-- Los avisos que decían el número de fábrica: ahora {horas} (ES) y {hours} (EN), que el código manda con el valor de Configuración
-- («24 horas», «2 horas»: horasTxt de lib/plazo-txt.ts). Solo si todavía dicen el número (idempotente).
update notif_templates set body = replace(replace(body::text, 'Responde en 24 horas', 'Responde en {horas}'), 'Reply within 24 hours', 'Reply within {hours}')::jsonb
 where key in ('biz_help', 'biz_help_cita', 'biz_sal_help', 'biz_fe_help', 'biz_vis_help') and body::text like '%Responde en 24 horas%';
update notif_templates set body = replace(replace(body::text, 'sigue guardada 2 horas', 'sigue guardada {horas}'), 'is held 2 hours', 'is held {hours}')::jsonb
 where key = 'sal_cita_seg' and body::text like '%sigue guardada 2 horas%';

commit;
