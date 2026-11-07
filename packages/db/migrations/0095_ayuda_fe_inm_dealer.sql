-- 0095 · Reseñas y Ayuda de Iglesias, Bienes Raíces y Venta de Autos (Fase 4 · 4if · fase4-iglesias-inmuebles-autos.md §2 «0095», §3 y §4if).
-- El mismo motor de ayuda que las citas, las inscripciones y la noche (help_requests: el negocio responde en 24 h, To'Latino revisa en 48 h),
-- con los motivos de las tres (RSNS L27–29). NADA se cobra en la app en este grupo: «Que me devuelvan» lo hace el negocio fuera de la app y la
-- persona confirma «Me lo devolvieron»; si no, To'Latino decide (nunca un reembolso que no pasó por la app).
--   Iglesias:      cobro «Me pidieron dinero por la ayuda» (foto; directo a To'Latino) · idioma · horario · trato · otro.
--   Bienes Raíces: ver «Me cobraron por ver la propiedad» (foto; directo) · mudar «Pidieron más para mudarme de lo publicado» (foto; directo)
--                  · fotos · nollego · otro.
--   Autos:         precio «El precio en la puerta fue más» (foto) · titulo · fotos · nollego («El carro no estaba») · otro.
-- Lo que se pide (SOLS L34–36): reusa devolver / avisar y suma llamar (Iglesias), otra_visita (Bienes Raíces) y arreglar_antes (Autos).
-- Cola «Posible estafa» (estafa): las ayudas directas de las tres. Mientras se revisa, el anuncio (la propiedad o el carro) queda en pausa
-- (items.status = 'hidden' con su motivo, como cuando el equipo oculta uno) o, en Iglesias, «Pedir fecha» e inscripciones (modules_off.svc).
-- help_requests guarda qué se pausó para poder reanudarlo (nada se borra). Idempotente: solo amplía checks y agrega columnas y plantillas.
begin;
alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array['falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas', 'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha',
  'contesta', 'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio', 'nocomo', 'inseguro', 'equipaje', 'cover', 'lista', 'mesa', 'minimo',
  'cert', 'horario', 'ensena', 'lic', 'cuidado', 'salir', 'equipo',
  'idioma', 'ver', 'mudar', 'fotos', 'precio', 'titulo']));
alter table help_requests drop constraint if exists help_requests_wants_check;
alter table help_requests add constraint help_requests_wants_check check (wants = any (array['reponer', 'devolver', 'avisar', 'seguro', 'terminar', 'descuento',
  'otro_grupo', 'arreglar', 'cancelar_membresia', 'llamar', 'otra_visita', 'arreglar_antes']));

-- «Me lo devolvieron»: el negocio devolvió fuera de la app (pending = aceptó devolver y la persona aún no confirma; confirmed = la persona
-- confirmó; denied = dice que no se lo devolvieron → To'Latino). Solo para ayudas sin dinero en la app.
alter table help_requests add column if not exists outside_refund text check (outside_refund in ('pending', 'confirmed', 'denied'));
alter table help_requests add column if not exists outside_at timestamptz;
-- La pausa mientras se revisa una posible estafa: qué se pausó (item = la propiedad o el carro; svc = «Pedir fecha» de la iglesia), cuándo y
-- cuándo se reanudó. La sanción (si To'Latino la decide) queda en sanctions (target_kind 'business') y en la auditoría.
alter table help_requests add column if not exists paused_kind text check (paused_kind in ('item', 'svc'));
alter table help_requests add column if not exists paused_ref text check (char_length(paused_ref) <= 40);
alter table help_requests add column if not exists paused_at timestamptz;
alter table help_requests add column if not exists unpaused_at timestamptz;
create index if not exists help_requests_pausa_idx on help_requests (paused_kind, paused_ref) where paused_at is not null and unpaused_at is null;

alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones', 'estafa']));

-- Avisos de la ayuda de las tres. A la persona de Iglesias, NEUTROS (ni el lugar ni el servicio en la pantalla bloqueada: puede ser consejería).
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('help_directo', 'tx', null, true, '{"es":"La revisa To''Latino","en":"To''Latino is reviewing it"}', '{"es":"Recibimos tu solicitud {num}. La revisa To''Latino directamente, con prioridad. Te escribimos aquí.","en":"We got your request {num}. To''Latino reviews it directly, with priority. We will write to you here."}'),
  ('fe_help_reply', 'tx', null, true, '{"es":"Respuesta a tu solicitud","en":"Reply to your request"}', '{"es":"Respondieron tu solicitud {num}. Detalles en To''Latino.","en":"Your request {num} got a reply. Details in To''Latino."}'),
  ('fe_help_done', 'tx', null, true, '{"es":"Solicitud resuelta","en":"Request resolved"}', '{"es":"To''Latino resolvió tu solicitud {num}. Detalles en To''Latino.","en":"To''Latino resolved your request {num}. Details in To''Latino."}'),
  ('biz_fe_help', 'biz', null, true, '{"es":"Te piden ayuda","en":"Someone asks for help"}', '{"es":"Una persona pide ayuda con la fecha {num}. Responde en 24 horas.","en":"Someone asks for help with date {num}. Reply within 24 hours."}'),
  ('biz_vis_help', 'biz', null, true, '{"es":"Un cliente pide ayuda con una visita","en":"A client asks for help with a visit"}', '{"es":"{cliente} pide ayuda con la solicitud {num}. Responde en 24 horas.","en":"{cliente} asks for help with request {num}. Reply within 24 hours."}'),
  ('biz_help_pausa', 'biz', null, true, '{"es":"Pausamos un anuncio","en":"We paused a listing"}', '{"es":"{item} está en pausa mientras To''Latino revisa la solicitud {num}. No se ve en tu página. Te escribimos si hace falta algo.","en":"{item} is paused while To''Latino reviews request {num}. It does not show on your page. We will write if we need anything."}'),
  ('biz_help_reanuda', 'biz', null, true, '{"es":"Se ve otra vez","en":"It shows again"}', '{"es":"{item} se ve otra vez en tu página. To''Latino revisó la solicitud {num}: {motivo}","en":"{item} shows again on your page. To''Latino reviewed request {num}: {motivo}"}'),
  ('biz_help_sancion', 'biz', null, true, '{"es":"Decisión de To''Latino","en":"To''Latino decision"}', '{"es":"To''Latino revisó la solicitud {num}: {motivo} {item} sigue en pausa y quedó una advertencia en tu negocio.","en":"To''Latino reviewed request {num}: {motivo} {item} stays paused and a warning was added to your business."}'),
  ('biz_help_devuelto', 'biz', null, false, '{"es":"Confirmó la devolución","en":"Refund confirmed"}', '{"es":"{cliente} confirmó que le devolviste lo cobrado. La solicitud {num} quedó cerrada.","en":"{cliente} confirmed you refunded the charge. Request {num} is closed."}')
on conflict (key) do nothing;
commit;
