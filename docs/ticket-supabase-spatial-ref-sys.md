# Ticket para Supabase — `spatial_ref_sys` sin RLS y con escritura abierta

## ✅ RESPONDIERON (2026-08-16) — y qué hacer con su respuesta

John Pena, de soporte, confirma el diagnóstico y **se ofrece a mover PostGIS**
del esquema `public` al esquema `extensions` con este SQL, previa autorización:

```sql
BEGIN;
UPDATE pg_extension SET extrelocatable = true WHERE extname = 'postgis';
ALTER EXTENSION postgis SET SCHEMA extensions;
ALTER EXTENSION postgis UPDATE TO "3.3.7next";
ALTER EXTENSION postgis UPDATE;
UPDATE pg_extension SET extrelocatable = false WHERE extname = 'postgis';
COMMIT;
```

**Su arreglo es correcto y el problema es real.** Comprobado en producción el
2026-08-06: `anon` puede SELECT, **DELETE e INSERT** sobre
`public.spatial_ref_sys` (8.500 filas), y la llave `anon` viaja en el paquete
del navegador por diseño. Cualquiera puede vaciar esa tabla y tumbar toda la
geolocalización.

**PERO SI LO EJECUTAN HOY, LA APP SE ROMPE ENTERA.** Medido antes de responder:

| | |
|---|---|
| Funciones nuestras que usan PostGIS | **89** |
| Funciones con `search_path` fijado **sin** `extensions` | **226** |
| Columnas `geography`/`geometry` | 8 |
| Índices GIST | 6 |
| Vistas que usan PostGIS | 2 |

El cuerpo de una función `AS $$ … $$` se resuelve **cada vez que se ejecuta**,
con su `search_path`. La migración `0147` los fijó todos a `public` (buen
refuerzo entonces, y justo lo que ahora los vuelve frágiles): si PostGIS sale
de `public`, `st_dwithin` deja de existir para esas 89 funciones y se caen
«negocios cerca de ti», el mapa, el radio de entrega y la búsqueda por
distancia.

Lo que **no** se rompe, y por eso no hay que tocarlo: columnas, índices y
vistas se enlazan por OID al crearse. Solo los cuerpos de función resuelven por
nombre.

### El orden correcto — no se puede alterar

- [x] **1. Migración `0156`** — añade `extensions` al camino de todas nuestras
  funciones. Hoy es inofensiva (PostGIS sigue en `public`, que va primero en el
  camino); el día del traslado es lo único que evita la caída.
  **APLICADA el 2026-08-06 en PRUEBAS y en PRODUCCIÓN.** Verificado en las dos:
  0 funciones sin `extensions`, `verify-permisos` limpio, y la búsqueda geo
  respondiendo (en pruebas, 5 negocios con distancias correctas).
- [x] **1b. Guardián `scripts/verify-geo.mjs`** — comprueba las 12 funciones
  geo que un usuario toca de verdad, en cualquiera de los dos proyectos.
  Probado al revés en PRUEBAS (rompiendo a propósito el `search_path` de
  `search_businesses`): cazó el fallo y lo diagnosticó solo —
  *«type "geography" does not exist ← PostGIS movido sin extensions en el
  camino»*. Foto de referencia tomada en las dos bases, ambas limpias.
  **Correrlo justo después de que ellos toquen cada proyecto.**
- [x] **2. Mensaje enviado a soporte** (2026-08-16) pidiendo el traslado SOLO
  en pruebas primero.
- [x] **2b. HECHO EN PRUEBAS (2026-08-31).** John Pena: *«I have moved your
  PostGIS extension to extensions schema»*. Confirmado: PostGIS 3.3.7 vive
  ahora en `extensions` en `zpkaxojonufdwgahiqjh`.
- [x] **2c. Su aviso automático volvió a señalarlo** (23-08-2026, correo
  «These issues require your immediate attention», regla `rls_disabled_in_public`,
  los DOS proyectos). Es el mismo problema del ticket, no uno nuevo.
  **Y se comprobó que ni nosotros ni el botón «Resolve issue» pueden
  arreglarlo** — esto es lo que conviene mandarles para desatascar el ticket:

  ```
  owner de public.spatial_ref_sys ... supabase_admin   (nosotros: postgres)
  grantor de los permisos de anon .. supabase_admin, is_grantable = NO

  REVOKE insert,update,delete ON public.spatial_ref_sys FROM anon;
    → no da error y NO cambia nada (solo quien concede puede revocar)

  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    → ERROR 42501: must be owner of table spatial_ref_sys
  ```

  O sea: su propio aviso pide una acción que su propio modelo de permisos nos
  prohíbe. El arreglo tiene que salir de ellos, y ya nos dijeron cuál es.
- [x] **2d. Red de seguridad mientras tanto — migración `0157`.** No cierra el
  agujero (no podemos), pero convierte «nos vaciaron la tabla y la geo está
  caída» en un `select restaurar_srs();`. Copia las 8.500 filas a
  `public.srs_respaldo` (tabla nuestra, con RLS y sin permisos para nadie) y
  añade `restaurar_srs()`, que repone lo que falte.
  **Probada con dientes en PRUEBAS:** se borraron 5 sistemas de coordenadas,
  se restauraron los 5, y `verify-geo` salió limpio después.
  **Aplicada en las DOS bases el 2026-08-27**, con autorización expresa del
  fundador («haz la migración»). Verificado en producción: respaldo con 8.500
  filas incluida la 4326, RLS activo, `anon` y `authenticated` sin ver la tabla
  ni poder llamar a la función, y `restaurar_srs()` con `security definer` y
  `search_path = public, extensions, pg_temp`.
  **Ensayo del rescate hecho contra los datos reales de producción**, dentro de
  un bloque que termina en excepción (y una excepción deshace la transacción
  entera, así que no queda rastro): 8.500 → borradas 5 → repuestas 5 → 8.500,
  `4326` intacto. Comprobado después que las 5 seguían ahí y `verify-geo` salió
  limpio en producción. En producción no se borra nada «a ver qué pasa».
- [x] **3. VERIFICADO EN PRUEBAS (2026-09-03) — la preparación funcionó.**
  `verify-geo` en verde entero, las 12 comprobaciones:
  `search_businesses` con 5 negocios y **distancia calculada (0.24 mi)**,
  `business_by_slug` devolviendo **coordenada real** (40.9648, -75.9873),
  `delivery_range_check`, eventos, publicaciones cerca, propiedades y
  vehículos. **Ni una función se rompió**, que es exactamente lo que la `0156`
  existía para evitar: sin ella, esas 89 funciones habrían perdido
  `st_dwithin` en el momento del traslado.

  **Y el agujero quedó CERRADO.** Lo que importa no es el permiso, es la
  puerta: la llave `anon` solo llega a la base a través de PostgREST, y
  PostgREST solo publica el esquema `public`. Medido:

  ```
  GET    /rest/v1/spatial_ref_sys?select=srid&limit=1  → 404
  DELETE /rest/v1/spatial_ref_sys?srid=eq.-999         → 404
  ```

  (Antes: 200 y 204.) El privilegio de `anon` sobre la tabla sigue existiendo
  en el catálogo, pero ya no hay forma de alcanzarla desde fuera.
- [ ] **4. Pedirlo en PRODUCCIÓN** (`vurqsebgsacickxsxfeh`). **Bloqueado hasta
  despausar el proyecto**: el plan gratuito lo pausó el 2026-09-03 tras 7 días
  sin actividad (ver `LAUNCH-CHECKLIST.md` §4). Al despausar, pedirle a John
  Pena el mismo traslado y correr `verify-geo` justo después.
- [ ] **5. Repetir el ejercicio con `pg_trgm`, `unaccent` y `pg_net`**, que
  siguen en `public`. Ojo con `pg_trgm`: la búsqueda usa el operador `<%` y el
  ajuste `pg_trgm.word_similarity_threshold`; hay que comprobarlo aparte.

---

> **Cómo enviarlo:** entra a
> [supabase.com/dashboard/support/new](https://supabase.com/dashboard/support/new)
> y rellena así:
>
> | Campo | Qué poner |
> |---|---|
> | **Project** | `tolatino-prod` (y repetir el ticket para `tolatino`, o mencionar los dos) |
> | **Category** | *Security* (si no está, *Database*) |
> | **Severity** | *Medium* — no hay fuga de datos, pero sí denegación de servicio |
> | **Subject** | El de abajo |
> | **Message** | El bloque de abajo, tal cual |
>
> Va **en inglés** a propósito: el soporte de Supabase trabaja en inglés y un
> ticket en español suele tardar más en llegar a alguien que lo entienda. Si
> prefieres mandarlo en español, dímelo y lo traduzco.

---

## Subject

```
spatial_ref_sys is writable by anon (rls_disabled_in_public) — cannot revoke as postgres
```

## Message

```
Hi,

The Security Advisor reports `rls_disabled_in_public` on `public.spatial_ref_sys`
in BOTH of my projects:

  - tolatino-prod : vurqsebgsacickxsxfeh
  - tolatino      : zpkaxojonufdwgahiqjh

I understand this table is part of the PostGIS extension and contains no user
data. My concern is not data disclosure — it is that the table is WRITABLE by
the `anon` role, so anyone holding the public anon key can delete its contents
and break every geo query in my app.

WHAT I VERIFIED

1) Privileges (both projects):

   relacl = {supabase_admin=arwdDxtm/supabase_admin,
             postgres=arwdDxtm/supabase_admin,
             anon=arwdDxtm/supabase_admin,
             authenticated=arwdDxtm/supabase_admin,
             service_role=arwdDxtm/supabase_admin,
             =r/supabase_admin}

   So `anon` holds INSERT/UPDATE/DELETE, granted by `supabase_admin`.

2) It is reachable through PostgREST with only the public anon key:

   GET    /rest/v1/spatial_ref_sys?select=srid&limit=1   -> 200
   DELETE /rest/v1/spatial_ref_sys?srid=eq.-999          -> 204

   (I used a filter matching zero rows on purpose, to confirm the permission
   without destroying anything.)

3) Impact is real, not theoretical. I emptied the table inside a transaction and
   rolled it back; with it empty, my geo RPCs fail with:

     ERROR: XX000: Cannot find SRID (4326) in spatial_ref_sys

   Location-based search is the core feature of my product, so an anonymous
   DELETE would take the whole app down until the catalog is restored.

WHAT I CANNOT DO

I cannot fix this from SQL as the `postgres` role. Three attempts, all refused:

  - ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
      -> ERROR: 42501: must be owner of table spatial_ref_sys

  - REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys
      FROM anon, authenticated;
      -> runs without error but leaves relacl unchanged (the grants were made by
         supabase_admin, so postgres cannot revoke them)

  - SET ROLE supabase_admin;
      -> ERROR: 42501: permission denied to set role "supabase_admin"

WHAT I AM ASKING FOR

Please revoke INSERT/UPDATE/DELETE/TRUNCATE on `public.spatial_ref_sys` from
`anon` and `authenticated` in both projects. SELECT should stay, since PostGIS
needs to read the catalog.

If revoking is not something you do per-project, I'd appreciate guidance on the
supported way to close this — I would rather not move the PostGIS extension to
another schema, since every table and function in my app depends on it.

SAME PROBLEM, SECOND CASE: pg_net

While locking down function privileges I hit the identical wall on `pg_net`.
`anon` and `authenticated` can EXECUTE `net.http_post` / `net.http_get`, which
make outbound HTTP requests from the database server. As `postgres` I cannot
close it:

  - REVOKE EXECUTE ON FUNCTION net.http_post(...) FROM public, anon, authenticated;
      -> removes only the explicit grants; the PUBLIC grant (`=X/supabase_admin`)
         survives, so has_function_privilege('anon', ..., 'execute') is still true

  - REVOKE USAGE ON SCHEMA net FROM public, anon, authenticated;
      -> runs without error and leaves nspacl byte-for-byte unchanged

The schema is not exposed through PostgREST today, so it is not reachable from
the browser — this is defence in depth, not an active incident. Could you either
revoke EXECUTE on the `net.*` functions from `anon`/`authenticated`, or tell me
the supported way to do it myself? Same two projects.

Thanks.
```

---

## Qué esperar

- Si te responden que «es un falso positivo porque no hay datos de usuario»:
  eso es cierto para la **fuga**, pero no responde a la **escritura**. Ahí
  conviene insistir señalando el `DELETE → 204` y el error de SRID.
- Si te lo arreglan, se nota al instante: el mismo `DELETE` desde fuera debe
  pasar de **204** a **401/403**. Mándame el aviso y lo compruebo por API.
- Si te dicen que no lo van a tocar, la alternativa es mover PostGIS a otro
  esquema — invasivo, toca todas las tablas y funciones geográficas. **No lo
  haría sin necesidad**, y desde luego no antes de lanzar.
