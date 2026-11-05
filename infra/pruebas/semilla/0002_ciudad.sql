-- Semilla SOLO del sandbox (decisión I): Hazleton abierta para probar con los negocios de ejemplo.
-- En producción las 5 ciudades empiezan «pronto» y se abren juntas en la Fase 9 (decisión A).
begin;
update cities set status = 'on', opened_at = coalesce(opened_at, now()) where id = 'hzl';
commit;
