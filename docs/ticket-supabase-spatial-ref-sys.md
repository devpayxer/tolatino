# Ticket para Supabase — `spatial_ref_sys` sin RLS y con escritura abierta

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
