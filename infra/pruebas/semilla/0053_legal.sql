-- Semilla de pruebas · 9e · Legales (fase9-apertura.md §3.6, §4 9e). SOLO SANDBOX (decisión I; regla 13).
-- La base del sandbox dice que es el sandbox: platform_config «entorno» = «pruebas». Con eso (y solo con eso) la base deja:
--   · ver y aceptar los BORRADORES de docs/legal/ mientras nada está publicado (cada página dice «BORRADOR — pendiente de revisión legal»);
--   · publicar una versión sin la revisión del abogado (para probar la hoja «Aceptar los términos nuevos» y Publica tu negocio).
-- Producción nunca corre esta semilla: sin esta fila, la base se comporta como producción (legal_entorno() = 'produccion') y una página legal no
-- se publica sin reviewed_by_counsel (guardián legalRevisado). Los textos NO van aquí: son contenido del repo (docs/legal/) y el despliegue los
-- indexa (scripts/legal/indexar.mjs). Idempotente. Nada se borra.
begin;
insert into platform_config (key, value, note, updated_by) values
  ('entorno', '"pruebas"'::jsonb, 'Esta base es el sandbox (semilla de pruebas 0053). En producción esta fila no existe.', 'semilla')
on conflict (key) do update set value = excluded.value, note = excluded.note, updated_at = now(), updated_by = excluded.updated_by;
commit;
