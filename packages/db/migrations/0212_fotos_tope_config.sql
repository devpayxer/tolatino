-- 0212 · 9t (23 nov) · El tope de subidas de fotos a la vez entra al catálogo de Configuración (LAUNCH «Tope de subidas de fotos, lo que queda (22 nov)»,
-- punto 1; regla 8: nada existe sin su gestión en el Super Admin). Hasta hoy eran tres constantes en apps/web/lib/subida.ts (conFotoSubida):
--   · fotos_a_la_vez (FOTOS_A_LA_VEZ = 2): cuántas fotos subidas abre sharp a la vez en UN proceso (el turno). 1–4: con 1 las fotos siguen subiendo
--     (una detrás de otra, nunca cerrado); más de 4 en un proceso de 4 núcleos ya no acelera y vuelve a subir la memoria (medido el 22 y el 23 nov).
--   · fotos_dentro (FOTOS_DENTRO = 16): cuántas puede tener un proceso a la vez entre llegando, esperando turno y abriéndose (el lugar). 6–32: siempre
--     más lugar que el turno más alto (4), así nunca se rechaza una foto que tenía turno libre; 32 es el techo que ya fijaba el guardián subidaConTope
--     (cada una que espera está en el disco, no en memoria, pero ocupa una conexión y un archivo temporal de hasta 12 MB).
--   · fotos_espera_s (FOTOS_ESPERA_MS = 30 000): cuánto espera su turno una foto ya recibida antes del «Prueba en un momento» (503). 5–60 s: menos de 5
--     rechaza casi todo con una ráfaga; más de 60 se acerca al corte de 100 s de Cloudflare delante del servidor (la persona vería un error de red).
-- De fábrica, los valores de hoy: nada cambia al aplicarla. Los lee lib/subida.ts con valores() de lib/config.ts (la copia de 15 s que el aviso de la
-- base olvida al momento: un cambio en Configuración se nota en la siguiente subida, sin consulta de más por subida); si la Configuración no responde,
-- la subida usa los de fábrica (nunca «sin tope» ni «cerrado»). cfg_int los acota a [min, max] y el trigger de platform_config rechaza lo que se sale.
-- Configuración › Apps (con los otros topes del servidor: errores por minuto, push por minuto), después de las claves de errores y del programa beta.
-- config_keys es el catálogo (unas 250 filas): sin candados largos, no hace falta lock_timeout. Solo expande (tres filas nuevas; ninguna tabla,
-- columna ni función cambia). Para deshacerla: delete from platform_config y de config_keys de las tres claves (pruebas: aplicada → revertida → aplicada).
-- Idempotente: insert … on conflict do nothing.
begin;

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('fotos_a_la_vez', 1, 4, 2, '{"es":"fotos","en":"photos"}', 'apps', '{"es":"Fotos que se suben · a la vez por proceso","en":"Photo uploads · at once per process"}',
    '{"es":"Cuántas fotos subidas prepara a la vez cada proceso del servidor (enderezar, reducir y guardar). Las demás esperan su turno. Más rápido con más, pero cada una pide memoria; con 1 siguen subiendo, una detrás de otra.","en":"How many uploaded photos each server process prepares at once (straighten, resize and save). The rest wait their turn. Faster with more, but each one needs memory; with 1 they still upload, one after another."}',
    true, null, null, 348),
  ('fotos_dentro', 6, 32, 16, '{"es":"fotos","en":"photos"}', 'apps', '{"es":"Fotos que se suben · lugar por proceso","en":"Photo uploads · room per process"}',
    '{"es":"Cuántas fotos puede tener cada proceso a la vez entre llegando, esperando turno y preparándose. Sin lugar, la persona ve «Estamos preparando otras fotos en este momento. Prueba en un momento.» al instante, sin mandar la foto.","en":"How many photos each process can hold at once while arriving, waiting their turn and being prepared. With no room, the person sees «We are processing other photos right now. Try again in a moment.» right away, without sending the photo."}',
    true, null, null, 349),
  ('fotos_espera_s', 5, 60, 30, '{"es":"segundos","en":"seconds"}', 'apps', '{"es":"Fotos que se suben · espera del turno","en":"Photo uploads · turn wait"}',
    '{"es":"Cuánto espera su turno una foto que ya llegó. Pasado este tiempo, la persona ve el mismo «Prueba en un momento.». Los rechazos de la última hora se ven en Sistema › Salud.","en":"How long a photo that already arrived waits for its turn. After this time, the person sees the same «Try again in a moment.». Rejections in the last hour show in System › Health."}',
    true, null, null, 350)
on conflict (key) do nothing;

commit;
