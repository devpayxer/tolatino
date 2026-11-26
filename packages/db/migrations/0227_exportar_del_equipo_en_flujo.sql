-- 0227 · «Exportar sus datos» del equipo (Super Admin › Usuarios 360° › Privacidad) por el MISMO camino que «Descargar mis datos» de la persona
-- (26 nov, LAUNCH 9t «Armar el archivo de "Descargar mis datos"…»): el ZIP se arma a disco, sube al almacén privado y se baja en flujo UNA vez por
-- POST /api/admin/usuarios/archivo/<id>, solo por la persona del equipo que lo armó, con su permiso revisado en cada descarga, y vence a los pocos
-- minutos. Antes se armaba entero en memoria y viajaba en base64 por la acción del servidor.
-- Cada exportación del equipo es una fila de data_exports con requested_by = quien la armó (la columna ya existía para esto, y Usuarios 360° ya
-- la pinta: «Lo pidió <nombre> (equipo)»). Lo de la persona no cambia: su «uno vivo a la vez» deja fuera las del equipo, para que una exportación
-- del equipo nunca choque con el archivo que la persona pidió (ni se lo bloquee). Una del equipo es siempre de la cuenta, nunca de un negocio.
-- Compatible con la versión anterior de la app: no inserta filas del equipo, y para ella el índice sigue siendo único en lo que ella escribe.
-- Idempotente; nada se borra.
begin;
drop index if exists data_exports_viva_idx;
create unique index if not exists data_exports_viva_persona_idx on data_exports (user_id, coalesce(business_id, ''))
  where status in ('pendiente', 'armando', 'listo') and requested_by is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'data_exports_equipo_sin_negocio') then
    alter table data_exports add constraint data_exports_equipo_sin_negocio check (requested_by is null or business_id is null) not valid;
  end if;
end $$;
alter table data_exports validate constraint data_exports_equipo_sin_negocio;
commit;
