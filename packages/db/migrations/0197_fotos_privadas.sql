-- 0197 · Fotos a la medida · F3 · Las fotos de destino PRIVADO (docs/diseno/plan/fotos-a-la-medida.md F3; fotos-revision-automatica.md «Fotos que van
-- solo a un negocio o al equipo»). Desde aquí /api/medios guarda una foto con destino=privado bajo privado/o/<uuid>.jpg (nginx nunca sirve
-- /medios/privado/), con media.private = true y la dirección de la ruta con permiso (/api/medios/privada/<uuid>; lib/fotos-privadas.ts). Aquí:
-- · Las de ANTES: las fotos de una solicitud (pre-estimado, presupuesto, emergencia), una cita o visita, un viaje o mudanza, la balanza del mercado,
--   la línea de un estimado, una ayuda que no era privada y el daño de una renta se subían por /api/medios como públicas (n/<uuid>.jpg). Antes del
--   20 nov ni siquiera llevaban la marca de destino «privado» (rev_sin_c2): se la pone (nunca van a la segunda opinión ni se pueden adjuntar a algo
--   público) y el barrido (lib/fotos-privadas.ts barrerPrivadas) las mueve a la llave privada, por tandas, con el índice de abajo. Solo marca: el
--   archivo lo mueve la app (la base no toca el almacén).
-- · Índices: el de las de antes por mover (se vacía solo), el de las privadas sin variantes (las completa el barrido), el del daño de una renta
--   (el permiso de la ruta busca la renta por su foto: rentals.damage_photo) y el de las subidas de cada persona en la última hora (el tope de
--   /api/medios, lib/fotos-revision.ts topeSubidas: antes recorría media en cada subida).
-- Idempotente; solo expande (no cambia columnas ni checks).
begin;

update media m set rev_sin_c2 = true
 where not m.rev_sin_c2 and not m.private and m.purged_at is null
   and (m.owner_kind in ('request', 'appointment', 'trip', 'line', 'estimate_line', 'help')
        or exists (select 1 from rentals r where r.damage_photo = m.id));

create index if not exists media_privadas_por_mover_idx on media (created_at) where rev_sin_c2 and not private and purged_at is null;
create index if not exists media_privadas_sin_variantes_idx on media (created_at)
  where private and var_at is null and status = 'visible' and purged_at is null and url like '/api/medios/privada/%';
create index if not exists rentals_dano_foto_idx on rentals (damage_photo) where damage_photo is not null;
create index if not exists media_subidas_idx on media (uploaded_by, created_at desc);

commit;
