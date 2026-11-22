-- 0211 · Un toque, una fila; un mensaje del equipo nunca entra al archivo de una persona (LAUNCH, 22 nov).
-- · contact_taps.tap_key: el id del toque que genera la bandeja de salida (apps/web/lib/contar-toque.ts) y que ahora viaja a /api/toque («toque»).
--   La bandeja manda el mismo toque más de una vez (el beacon y los reintentos). Hasta hoy lo deduplicaba solo la ventana de 10 min por persona (o
--   red) y negocio de lib/toques.ts: una persona SIN sesión cuyo primer envío llegó, cuyo reintento falló y que vuelve desde OTRA red (otra IP) se
--   contaba dos veces. Con el id, la base lo impone: índice único parcial (solo las filas con id; las de antes y las de una página vieja abierta,
--   sin id, siguen como hoy) y la escritura va con «on conflict do nothing». Las reglas de lib/toques.ts no cambian.
-- · sponsorship_entries.tap_key: lo mismo para el «entraron» de un patrocinio. Allí la regla (una vez por persona o dispositivo y día) no depende
--   de la red; el hueco era otro: un reintento que cruza la medianoche de Nueva York contaba dos días. patrocinio_entro NO cambia (sus reglas son las
--   de siempre, y la llama lib/patrocinio.ts, que es de dinero y no se toca): la columna toma su valor por omisión de tl.tap_key, que pone
--   patrocinio_entro_toque solo para su llamada a patrocinio_entro; su «on conflict do nothing» (sin columnas) ya cubre el índice nuevo.
-- · support_messages: un mensaje del equipo o del sistema nunca lleva la cuenta de la persona (user_id), así nunca entra a «Descargar mis datos» de
--   nadie. Hoy ya es verdad en el código y en la semilla (nota9u2 lo comprobaba a mano en toda la base); ahora lo impone la base. «not valid» y
--   después «validate», como 0195.
-- Candados (LAUNCH «Índices sobre tablas grandes en producción»): los dos índices se crean dentro de la transacción (guardián migracionConTransaccion)
-- y contact_taps puede ser grande. Medido en local (PostGIS 16, 2 M de filas de contact_taps, 691 MB, en caché): el índice tarda 120–140 ms y la
-- transacción entera tiene contact_taps tomada (ni lectura ni escritura) 125–150 ms; en frío, leer 691 MB de disco puede llevarlo a segundos.
-- Con otra sesión leyendo contact_taps, la migración falla a los 3 s y no queda nada aplicado. «set local lock_timeout» acota lo que
-- esta migración ESPERA para tomar cada candado: si una consulta larga tiene la tabla, en vez de quedarse en la cola (y dejar detrás de ella todas
-- las lecturas y escrituras de la tabla) falla, se deshace entera y migrar.sh se detiene; el siguiente despliegue la reintenta. 3 s: un toque que
-- espera ese tiempo no se pierde (la bandeja reintenta 9 min) y una pantalla del panel tarda 3 s una vez; más largo ya se nota como caída.
-- Solo expande (dos columnas nulas sin reescribir la tabla, dos índices, una función nueva, un check). Para deshacerla: drop del check, de la
-- función, de los dos índices y de las dos columnas (pruebas: aplicada → revertida → aplicada).
begin;
set local lock_timeout = '3s';

alter table contact_taps add column if not exists tap_key uuid;
create unique index if not exists contact_taps_un_toque on contact_taps (tap_key) where tap_key is not null;

alter table sponsorship_entries add column if not exists tap_key uuid default nullif(current_setting('tl.tap_key', true), '')::uuid;
create unique index if not exists sponsorship_entries_un_toque on sponsorship_entries (tap_key) where tap_key is not null;

-- El «entraron» con el id del toque: las reglas son las de patrocinio_entro, sin copiarlas.
create or replace function patrocinio_entro_toque(k text, id bigint, quien uuid, dev uuid, llave uuid) returns boolean language plpgsql as $$
declare r boolean;
begin
  perform set_config('tl.tap_key', coalesce(llave::text, ''), true);
  r := patrocinio_entro(k, id, quien, dev);
  perform set_config('tl.tap_key', '', true);
  return r;
end $$;

alter table support_messages drop constraint if exists support_messages_equipo_sin_persona;
alter table support_messages add constraint support_messages_equipo_sin_persona check (sender = 'user' or user_id is null) not valid;
alter table support_messages validate constraint support_messages_equipo_sin_persona;

commit;
