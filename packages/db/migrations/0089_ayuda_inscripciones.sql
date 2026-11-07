-- 0089 · Ayuda con la inscripción (Fase 4 · 4ef · fase4-edu-ninos-deporte.md §2 (0089) y §4ef): el mismo motor de ayuda que las citas,
-- las compras, las fiestas, los viajes y la noche (help_requests, el lugar responde en 24 h, To'Latino revisa en 48 h).
-- Motivos nuevos (RSNS L24–26): Educación «No me dieron el certificado» (cert) · «No cumplieron el horario» (horario) · «No enseñan
-- lo prometido» (ensena); Niños «No tenían licencia» (lic) · «No cuidaron bien a mi niño» (cuidado: directo a To'Latino con
-- prioridad, §6 #8); Deporte «No me dejan cancelar» (salir, con foto) · «El equipo no sirve» (equipo). «Cobraron más» reusa `cobro`.
-- Lo que se pide (SOLS L31–33): terminar en otro grupo sin pagar otra vez (otro_grupo), que lo arreglen (arreglar), cancelar la
-- membresía (cancelar_membresia). Idempotente.
begin;
alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array['falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas', 'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha',
  'contesta', 'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio', 'nocomo', 'inseguro', 'equipaje', 'cover', 'lista', 'mesa', 'minimo',
  'cert', 'horario', 'ensena', 'lic', 'cuidado', 'salir', 'equipo']));
alter table help_requests drop constraint if exists help_requests_wants_check;
alter table help_requests add constraint help_requests_wants_check check (wants = any (array['reponer', 'devolver', 'avisar', 'seguro', 'terminar', 'descuento',
  'otro_grupo', 'arreglar', 'cancelar_membresia']));
commit;
