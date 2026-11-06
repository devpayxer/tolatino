-- 0056 · Ayuda con la visita (Hogar) y con la cita (Auto) (Fase 4 · bloque 4g-2). Diseño: neg-hogar-rev.js (RSN/SOL) y
-- neg-cita-help.js › CFG.ahelp. La misma solicitud de 3e (help_requests, una por cita) con los motivos de cada rubro.
begin;
alter table help_requests drop constraint help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array[
  'falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',          -- pedidos
  'cobro', 'quien', 'quedo', 'espera', 'dep',                                             -- citas de Belleza (y «cobro», «tarde» en Auto)
  'win', 'more', 'bad', 'dmg', 'who',                                                     -- visitas del Hogar
  'igual', 'dano', 'piezas']));                                                           -- citas de Auto
commit;
