-- 0083 · Ayuda con la noche (Fase 4 · 4nd · fase4-noche.md §4nd): el mismo motor de ayuda que las citas, las compras, las fiestas
-- y los viajes (help_requests, el local responde en 24 h, To'Latino revisa en 48 h). Motivos nuevos: «Cobraron más cover» (cover),
-- «No respetaron la lista» (lista), «No respetaron la mesa» (mesa), «Cobraron el mínimo aparte» (minimo). «Me sentí inseguro» reusa
-- `inseguro` (directo a To'Latino con prioridad) y «No me descontaron el depósito» reusa `dep` (con foto del recibo). Idempotente.
begin;
alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array['falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas', 'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha',
  'contesta', 'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio', 'nocomo', 'inseguro', 'equipaje', 'cover', 'lista', 'mesa', 'minimo']));
commit;
