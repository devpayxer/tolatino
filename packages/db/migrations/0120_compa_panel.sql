-- 0120 · compa_panel (7e · docs/diseno/plan/fase7-compa.md §2 0120, §3 «Qué datos ve · Panel» y §4 7e). El Compa en el panel del negocio
-- (DASH-COMPA): el asistente que explica el panel y lleva a la sección. El motor es de 0118; esta base solo suma:
-- · compa_panel_guide: la guía del panel (= cpaGuide del prototipo, Panel negocio v2 L1096): una fila por sección de la NAVEGACIÓN del panel
--   (las rutas de app/panel/[id]/[[...r]]/page.tsx y los apartados de Tu página de Panel.tsx PARTS; guardián guiaDelPanelCompleta). Cada fila:
--   el código (la ruta bajo /panel/{negocio}), la PARTE que pide accesoPanel (page · ord · msg · cat · dlv · pay · evt; null = cualquier miembro),
--   cuándo aplica (siempre · si vende · eventos · entrega · licencias), título y «qué hay» ES/EN (sin nombrar otras secciones: lo lee quien
--   solo puede abrir esa), los artículos de ayuda que explican esa
--   sección (para no darle a un miembro la ayuda de una parte que no puede abrir) y las palabras con las que el servidor reconoce de qué
--   sección se habla (sin el modelo). El servidor solo da al modelo — y solo ofrece «Ir a …» — las filas que ESA persona puede abrir.
--   La escribe esta migración (no se edita a mano); se apaga con «enabled», no se borra.
-- · Plantilla compa_caso_negocio (en la app): «Tu caso pasó a Soporte» cuando El Compa del panel pasa el caso del negocio a una persona.
-- Sin semilla (la 0042 es de 7f). Idempotente: se puede aplicar dos veces.
begin;

create table if not exists compa_panel_guide (
  code        text primary key check (code ~ '^[a-z]+(/[a-z]+)?$' and char_length(code) <= 20),
  ruta        text not null check (ruta ~ '^([a-z]+(/[a-z]+)?)?$'),
  parte       text check (parte in ('page', 'ord', 'msg', 'cat', 'dlv', 'pay', 'evt')),
  needs       text not null default 'always' check (needs in ('always', 'sells', 'events', 'delivery', 'licenses')),
  title       jsonb not null check (title ? 'es' and title ? 'en'),
  what        jsonb not null check (what ? 'es' and what ? 'en' and char_length(what->>'es') <= 300 and char_length(what->>'en') <= 300),
  help_slugs  text[] not null default '{}',
  words       text[] not null default '{}',
  sort        integer not null default 0,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);
create or replace function compa_panel_guide_no_borra() returns trigger language plpgsql as $$
begin raise exception 'una sección de la guía del panel no se borra: se apaga (enabled = false)'; end $$;
drop trigger if exists compa_panel_guide_no_borra on compa_panel_guide;
create trigger compa_panel_guide_no_borra before delete on compa_panel_guide for each row execute function compa_panel_guide_no_borra();

-- La navegación del panel, en su orden. «what» = cpaGuide del prototipo, ajustado a lo que el panel tiene hoy.
insert into compa_panel_guide (code, ruta, parte, needs, title, what, help_slugs, words, sort) values
  ('pagina', '', 'page', 'always', '{"es":"Tu página","en":"Your page"}',
    '{"es":"Cómo te ven los clientes: tu negocio en una tarjeta, lo que le falta a tu página y sus apartados.","en":"How clients see you: your business on a card, what your page is missing and its sections."}',
    '{panel}', '{pagina,perfil,fuerza,page,profile,strength}', 10),
  ('pagina/hor', 'pagina/hor', 'page', 'always', '{"es":"Horario","en":"Hours"}',
    '{"es":"Tu semana, feriados y vacaciones.","en":"Your week, holidays and time off."}',
    '{}', '{horario,hora de abrir,hora de cerrar,abro,cierro,abrimos,cerramos,feriado,vacacion,hours,opening,closing,holiday}', 20),
  ('pagina/fotos', 'pagina/fotos', 'page', 'always', '{"es":"Fotos y portada","en":"Photos and cover"}',
    '{"es":"Portada, logo y galería.","en":"Cover, logo and gallery."}',
    '{}', '{foto,portada,logo,galeria,imagen,photo,cover,gallery,picture}', 30),
  ('pagina/about', 'pagina/about', 'page', 'always', '{"es":"Quiénes somos","en":"About us"}',
    '{"es":"Tus palabras y lo que hay en tu negocio.","en":"Your words and what your place offers."}',
    '{}', '{quienes somos,descripcion,about us,description}', 40),
  ('pagina/nov', 'pagina/nov', 'page', 'always', '{"es":"Novedades","en":"Updates"}',
    '{"es":"Ofertas, avisos y encuestas en tu página.","en":"Deals, notices and polls on your page."}',
    '{}', '{novedad,oferta,encuesta,publicacion,update,deal,poll,post}', 50),
  ('pagina/cup', 'pagina/cup', 'page', 'always', '{"es":"Cupones por monedas","en":"Coupons for coins"}',
    '{"es":"Lo que das por las monedas de los vecinos; valida su código.","en":"What you give for neighbors'' coins; validate their code."}',
    '{panel-cupones-por-monedas}', '{cupon,moneda,coupon,coin}', 60),
  ('pagina/resenas', 'pagina/resenas', 'page', 'always', '{"es":"Reseñas","en":"Reviews"}',
    '{"es":"Lo que dicen tus clientes; respóndeles.","en":"What clients say; reply to them."}',
    '{panel-resenas}', '{resena,estrella,opinion,review,star,rating}', 70),
  ('pagina/equipo', 'pagina/equipo', 'page', 'always', '{"es":"Equipo","en":"Team"}',
    '{"es":"Las personas que salen en tu página.","en":"The people who show on your page."}',
    '{}', '{equipo,empleado,trabajador,invitar,team,staff,employee,invite}', 80),
  ('pagina/ver', 'pagina/ver', 'page', 'always', '{"es":"Verificación y sello","en":"Verification and badge"}',
    '{"es":"Teléfono, correo y el sello Verificado.","en":"Phone, email and the Verified badge."}',
    '{}', '{sello,verific,badge,verified}', 90),
  ('pagina/lic', 'pagina/lic', 'page', 'licenses', '{"es":"Tus licencias","en":"Your licenses"}',
    '{"es":"Lo que puedes hacer por ley y lo que no haces.","en":"What you may do by law and what you do not do."}',
    '{licencias-inmuebles-y-autos,licencia-de-licor,licencia-de-guarderia,cupos-y-licencia}', '{licencia,license,nmls}', 100),
  ('hoy', 'hoy', 'ord', 'sells', '{"es":"Hoy","en":"Today"}',
    '{"es":"Lo de hoy: solicitudes por aprobar, la agenda y lo vendido.","en":"Today: requests to approve, the agenda and sales."}',
    '{panel-pedidos,panel-reservaciones,panel-mesas-y-lista,panel-evento-privado}', '{hoy,agenda,solicitud,por aprobar,aceptar,rechazar,today,request,approve,accept,decline}', 110),
  ('clientes', 'clientes', 'ord', 'sells', '{"es":"Clientes","en":"Clients"}',
    '{"es":"Todos los pedidos, citas y reservaciones, cada uno con su detalle.","en":"All orders, bookings and reservations, each with its detail."}',
    '{}', '{cliente,historial,clients,customers}', 120),
  ('mensajes', 'mensajes', 'msg', 'always', '{"es":"Mensajes","en":"Messages"}',
    '{"es":"Conversaciones con clientes, quién las lleva y la respuesta automática fuera de horario.","en":"Client conversations, who handles them and the after-hours auto-reply."}',
    '{}', '{mensaje,chat,conversacion,contestar,message,conversation,reply}', 130),
  ('vendes', 'vendes', 'cat', 'always', '{"es":"Lo que vendes","en":"What you sell"}',
    '{"es":"Tu herramienta de la categoría: menú, servicios o productos, qué se pide en línea, agotado y pausar pedidos.","en":"Your category tool: menu, services or products, what can be ordered online, sold out and pausing orders."}',
    '{panel-menu,servicios-citas,servicios-taller-hogar,servicios-salud-profesionales,tu-herramienta-mercados-tiendas,tu-herramienta-salud-profesionales,productos-mercados-tiendas,inventario-del-lote,membresias-y-liga,grupos-y-cupos,horarios-y-ayuda,esta-noche-negocio,salidas-y-asientos-transporte,calendario-y-deposito-fiestas,panel-fiestas-y-transporte-negocio,panel-inscripciones,panel-visitas}',
    '{menu,platillo,servicio,producto,precio,agotado,pausar,pauso,pausa los pedidos,pedidos en linea,inventario,catalogo,dish,service,product,price,sold out,pause,inventory}', 140),
  ('entrega', 'entrega', 'dlv', 'delivery', '{"es":"Entrega","en":"Delivery"}',
    '{"es":"Zona, costo, tiempo y repartidores.","en":"Area, fee, time and drivers."}',
    '{panel-entrega}', '{entrega,delivery,repartidor,zona de entrega,driver}', 150),
  ('eventos', 'eventos', 'evt', 'events', '{"es":"Eventos","en":"Events"}',
    '{"es":"Eventos con boletos o gratis, mesas, códigos y el modo puerta.","en":"Events with tickets or free, tables, codes and door mode."}',
    '{panel-eventos-crear,panel-eventos-boletos-mesas-y-extras,panel-eventos-cancelar-cambiar-y-avisar,panel-eventos-codigos,panel-eventos-cortesias-y-devoluciones,panel-eventos-series-y-varios-dias,panel-eventos-cobros,panel-porteros-y-modo-puerta}',
    '{evento,boleto,entrada,portero,puerta,event,ticket,door}', 160),
  ('cobros', 'cobros', 'pay', 'always', '{"es":"Cobros y plan","en":"Payouts and plan"}',
    '{"es":"Los pagos a tu banco, lo cobrado con tarjeta y tu plan.","en":"Payouts to your bank, card sales and your plan."}',
    '{panel-eventos-cobros,plan-pro}', '{cobro,cobrar,me pagan,pagan,pago,pagos,banco,transferencia,deposito,stripe,payout,paid,pay me,bank,transfer,deposit}', 170),
  ('cobros/plan', 'cobros/plan', 'pay', 'always', '{"es":"Tu plan","en":"Your plan"}',
    '{"es":"Tu plan Free o Pro, la prueba de 30 días y las facturas.","en":"Your Free or Pro plan, the 30-day trial and invoices."}',
    '{plan-pro}', '{plan,pro,prueba,suscripcion,factura,trial,subscription,invoice,upgrade}', 180),
  ('mas', 'mas', null, 'always', '{"es":"Más","en":"More"}',
    '{"es":"El resto de tu panel (lo que tu acceso permite), la Ayuda del panel y Ayuda y Soporte.","en":"The rest of your dashboard (what your access allows), dashboard Help and Help and Support."}',
    '{panel-ayuda-y-soporte}', '{ayuda y soporte,soporte,help and support,support}', 190),
  ('compa', 'compa', null, 'always', '{"es":"El Compa","en":"El Compa"}',
    '{"es":"Este asistente: te explica tu panel y te lleva a la sección.","en":"This assistant: it explains your dashboard and takes you to the section."}',
    '{panel-el-compa}', '{el compa,asistente,assistant}', 200)
on conflict (code) do update set ruta = excluded.ruta, parte = excluded.parte, needs = excluded.needs, title = excluded.title, what = excluded.what,
  help_slugs = excluded.help_slugs, words = excluded.words, sort = excluded.sort, updated_at = now()
  where (compa_panel_guide.ruta, compa_panel_guide.parte, compa_panel_guide.needs, compa_panel_guide.title, compa_panel_guide.what, compa_panel_guide.help_slugs, compa_panel_guide.words, compa_panel_guide.sort)
        is distinct from (excluded.ruta, excluded.parte, excluded.needs, excluded.title, excluded.what, excluded.help_slugs, excluded.words, excluded.sort);

-- ── Aviso al miembro del negocio (en la app) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('compa_caso_negocio', 'tx', null, false, '{"es":"Tu caso pasó a Soporte · {num}","en":"Your case went to Support · {num}"}',
    '{"es":"El Compa le pasó el caso de tu negocio con el resumen. Una persona del equipo te escribe {cuando}. Lo ves en tu panel › Más › Ayuda y Soporte.","en":"El Compa passed your business case on with a summary. A person from the team writes to you {cuando}. See it in your dashboard › More › Help and Support."}')
on conflict (key) do update set title = excluded.title, body = excluded.body
  where notif_templates.edited_by is null;

commit;
