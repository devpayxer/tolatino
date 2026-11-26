-- 0226 · La renovación de una retención dice lo que PASÓ con la vieja, y el push que no llegó a la cola lo encola el barrido (26 nov, LAUNCH «el dinero dice lo
-- que pasó» (i) y la (a) de la revisión de efe56b9; guardianes liberarSoloPorLaRegla y pushQueNoSeEncolo). Idempotente; nada se borra.
-- (1) Cuando la renovación de lo retenido de una cita (estimado o «algo más») no sale, la retención vieja se suelta y se avisaba «Pagas eso en el negocio» /
--     «cóbralo en el local» sin mirar a Stripe. Ahora (lib/renovar-retencion.ts › soltarVieja) el libro la dice soltada solo si Stripe la soltó, y los
--     avisos de siempre (hold_fallo, hold_no_renovada, biz_hold_fallo) salen solo entonces. Si Stripe no la soltó todavía o ya la había COBRADO, estos dos
--     avisos con {dinero}: el mismo texto de lo soltado (lib/devolucion-cancelar.ts › soltadaO: «todavía no se soltó de tu tarjeta…» · «ya se habían
--     cobrado $X en tu tarjeta…»), y al negocio «no lo cobres en el local» cuando ya se cobró. {dinero} llega con su espacio delante. Mismo grupo, modo de
--     SMS, push y app que sus pares (hold_no_renovada y biz_hold_fallo); el del negocio, en el grupo «citas» que apaga sus avisos.
-- (2) El índice de los avisos cuyo push sigue «pendiente» (pocas filas: el trabajador los resuelve en segundos). lib/push/cola.ts › barrerPush encola los
--     que quedaron en la campana sin una sola fila en la cola (encolar falló después de anotar el aviso: antes quedaban «pendiente» para siempre y solo en
--     el registro).
begin;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, biz_pref, title, body) values
  ('hold_fallo_suelta', 'tx', null, true, 'sin_push', true, false, 'cliente', null, '{"es": "Lo retenido de tu cita", "en": "The hold on your booking"}', '{"es": "La retención de {monto} de la cita {num} no se pudo renovar.{dinero}", "en": "The {monto} hold on booking {num} could not be renewed.{dinero}"}'),
  ('biz_hold_fallo_suelta', 'biz', null, true, 'sin_push', true, false, 'negocio', 'citas', '{"es": "Retención de una cita", "en": "Booking hold"}', '{"es": "La retención de {monto} de la cita {num} no se pudo renovar.{dinero}", "en": "The {monto} hold on booking {num} could not be renewed.{dinero}"}')
on conflict (key) do nothing;
create index if not exists notifications_push_pendiente on notifications (created_at) where push_status = 'pendiente';
commit;
