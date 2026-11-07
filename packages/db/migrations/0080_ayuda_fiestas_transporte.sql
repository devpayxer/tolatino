-- 0080 · Ayuda con la fiesta y con el viaje (Fase 4 · 4z-2 · fase4-fiestas-transporte.md §4z): el mismo motor de ayuda que
-- las citas y las compras (help_requests, el negocio responde en 24 h, To'Latino revisa en 48 h). Motivos nuevos: Fiestas
-- «No quedó como lo acordado» (nocomo); Transporte «Manejo inseguro» (inseguro, va directo a To'Latino con prioridad) y «Perdió
-- o dañó mi equipaje o caja» (equipaje). Lo que se pide: «Un descuento» (descuento) en Fiestas.
begin;

alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array['falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas', 'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha',
  'contesta', 'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio', 'nocomo', 'inseguro', 'equipaje']));
alter table help_requests drop constraint if exists help_requests_wants_check;
alter table help_requests add constraint help_requests_wants_check check (wants = any (array['reponer', 'devolver', 'avisar', 'seguro', 'terminar', 'descuento']));

commit;
