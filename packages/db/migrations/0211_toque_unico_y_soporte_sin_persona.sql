-- 0211 · Un toque, una fila (LAUNCH, 22 nov).
-- · contact_taps.tap_key: el id del toque que genera la bandeja de salida (apps/web/lib/contar-toque.ts) y que ahora viaja a /api/toque («toque»).
--   La bandeja manda el mismo toque más de una vez (el beacon y los reintentos). Hasta hoy lo deduplicaba solo la ventana de 10 min por persona (o
--   red) y negocio de lib/toques.ts: una persona SIN sesión cuyo primer envío llegó, cuyo reintento falló y que vuelve desde OTRA red (otra IP) se
--   contaba dos veces. Con el id, la base lo impone: índice único parcial (solo las filas con id; las de antes y las de una página vieja abierta,
--   sin id, siguen como hoy) y la escritura va con «on conflict do nothing». Las reglas de lib/toques.ts no cambian.
-- · sponsorship_entries.tap_key: lo mismo para el «entraron» de un patrocinio. Allí la regla (una vez por persona o dispositivo y día) no depende
--   de la red; el hueco era otro: un reintento que cruza la medianoche de Nueva York contaba dos días. patrocinio_entro NO cambia (sus reglas son las
--   de siempre, y la llama lib/patrocinio.ts, que es de dinero y no se toca): la columna toma su valor por omisión de tl.tap_key, que pone
--   patrocinio_entro_toque solo para su llamada a patrocinio_entro; su «on conflict do nothing» (sin columnas) ya cubre el índice nuevo.
-- Solo expande (dos columnas nulas sin reescribir la tabla, dos índices, una función nueva). Para deshacerla: drop de la función, de los dos
-- índices y de las dos columnas (pruebas: aplicada → revertida → aplicada).
begin;

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

commit;
