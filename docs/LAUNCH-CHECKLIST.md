# To'Latino — Launch & Scale Checklist (deferred decisions)

> ## ⚡ ESTADO AL 2026-07-29 — lee esto primero
>
> **111 pendientes · 108 hechos.** No todos pesan igual. Esto es lo que de verdad
> bloquea abrir la puerta al público, en orden:
>
> **🔴 Bloquean el lanzamiento (sin esto no se puede abrir):**
> 1. **SMTP propio (Amazon SES)** — hoy Supabase limita a 2 correos/hora y **nadie
>    puede confirmar su cuenta**. Detalle y pasos en §0. Es EL bloqueador.
> 2. **Stripe en LIVE** — llaves `sk_live`/`pk_live`, webhook Live nuevo y Connect
>    en Live. Hoy todo está en modo PRUEBA a propósito.
> 3. **Rotar la `sk_test` expuesta** en chat durante la configuración (§Payments).
> 4. **Prueba real de punta a punta con dinero de verdad** (un cargo chico) una vez
>    hechos 1-3.
>
> **🟡 Importantes antes de crecer (no bloquean el día 1):**
> - Radio de entrega **no** se valida en el servidor al cobrar: alguien fuera de
>   zona puede pagar un envío que el negocio tendrá que cancelar.
> - Reconciliación "lo que pagó el comprador" vs "total del pedido".
> - Limpieza de `pending_purchases` abandonados.
> - Anti-spam / límites de publicación (hay un guard básico; falta lo compartido).
> - Escala: `count(*) over ()` en búsquedas de propiedades/autos y paginación por
>   OFFSET (ver §1, auditoría 0130).
>
> **🟢 Buenas noticias verificadas en código el 2026-07-29** (estaban marcadas
> pendientes pero YA estaban hechas):
> - El servidor **re-tarifica** pedidos y reservas desde el catálogo: el precio que
>   manda el navegador se ignora. Nadie puede pagar $0.55 por un pedido de $50.
> - El webhook de Stripe maneja los dos eventos con protección de carrera y reclamo
>   atómico: los reintentos no cobran ni entregan dos veces.
> - Producción está EN VIVO en `tolatino.com` con la base limpia.
> - El panel ya no muestra datos fabricados a nadie (auditoría del 2026-07-29).
>
> **🛡️ Guardián del build (nuevo, 2026-07-29): `scripts/verify-build.mjs`.**
> Corre SOLO después de cada `pnpm build` (script `postbuild`) y **rompe el
> despliegue** si detecta en el sitio compilado: negocios/personas fabricados,
> métricas inventadas, la base de datos equivocada horneada, o un secreto
> (`sk_live`, `sb_secret`…) filtrado al navegador. `STRIPE_EXPECT=live|test`
> además verifica que el modo de Stripe sea el esperado.
> **Ya demostró su valor:** encontró clientes, pedidos y reseñas fabricados en el
> módulo Clientes que la revisión manual había pasado por alto. Si algo legítimo
> lo dispara, ajusta la regla en el script **y deja escrito por qué** — una
> excepción sin explicación es una puerta abierta.
>
> **Cómo usar este archivo:** los ítems marcados `[x] VERIFICADO HECHO` llevan la
> evidencia de por qué. Si algo parece pendiente, comprueba primero en el código
> antes de rehacerlo — este checklist se adelanta a veces a la realidad.


> **Purpose.** A running list of everything we deliberately deferred while
> building fast in the **sandbox**, to revisit **before/at public launch** and
> **at scale (1M+/mo)**. The founder won't remember these by heart, and neither
> should we from memory — this file is the source of truth. `CLAUDE.md` points
> here.
>
> **Rule for the AI:** whenever a task produces a "we'll do X later / at scale /
> before launch / when it's real" decision, **append it here** in the right
> section (don't just say it in chat). Keep items accurate to what the code
> actually does today. Check items off (`[x]`) only when truly done.
>
> **Context:** today everything runs against a sandbox where Supabase, Photon/
> Nominatim and Vercel are network-blocked, so features are verified by build +
> code review, **not** real end-to-end runs. Production is a separate, real
> environment.

---

## 0. Sandbox → real environment (the big one)

- [x] **HECHO 2026-07-29 — Producción EN VIVO en `tolatino.com`.** El cutover se
  completó: `.env.production` apunta a la base de prod limpia (verificado sobre el
  JS servido: 3 ocurrencias del ref de prod, 0 de staging), dominio conectado
  (Cloudflare DNS → Vercel, proxy apagado, HTTP 200 + SSL en apex y www), URLs de
  Auth corregidas (venían en `localhost:3000` con allow-list vacía → nadie podría
  haber confirmado su cuenta) y `SITE_ORIGIN` movido al dominio. **Sigue pendiente
  y es lo único que falta para cobrar de verdad: Stripe en LIVE** (llaves
  `sk_live`/`pk_live`, webhook Live nuevo, Connect en Live) — hoy todo está en modo
  PRUEBA a propósito. Detalle completo en `docs/ENVIRONMENTS.md §7`.
  Contexto original del plan:
  Decidido: **Opción A** — el proyecto de hoy (`tolatino`, `zpkaxojonufdwgahiqjh`) es
  **staging**; nuevo proyecto **`tolatino-prod`** (`vurqsebgsacickxsxfeh`, us-east-1)
  es prod. Dominio final `tolatino.com`. **Hecho por Claude:** borrado del viejo
  `latinoplatform`, 129 migraciones, gazetteer 6 978 ciudades, 17 categorías
  canónicas, bucket `post-photos` + políticas, **0 datos de prueba**. **Falta
  (solo el fundador, dashboards):** (1) resetear contraseña de la BD de prod; (2)
  desplegar las 10 Edge Functions + secretos a prod (Stripe **LIVE**, VAPID,
  PUSH_HOOK_SECRET, push_config, FRED); (3) Vercel — variables **Production**→prod
  (URL `https://vurqsebgsacickxsxfeh.supabase.co` + anon key + `pk_live`) /
  **Preview**→staging (`pk_test`); (4) Stripe modo Live (llaves + webhook con
  `checkout.session.completed` **y** `payment_intent.succeeded` + Connect); (5) DNS
  de `tolatino.com` → Vercel Production. Checklist completo en `ENVIRONMENTS.md §7`.
  **Nota:** al lanzar público subir prod a Supabase **Pro** (sin auto-pausa +
  backups) — hoy Free.
- [ ] **Reloj de asistencia · Horarios · Nómina (módulo Equipo) siguen sin backend.**
  Para un dueño REAL el panel ya muestra tarjetas honestas de "lo estamos
  terminando" (ese gating `isReal ? soonCard : …` estaba bien hecho). Las tablas
  fabricadas (5 empleados fichando, nómina con sueldos y un botón "Nómina corrida ·
  depósito en 2 días") solo vivían en el modo demo, que se eliminó — así que hoy son
  código muerto e inalcanzable, pero siguen en el paquete. Al construir cada
  feature, borrar su tabla fabricada (`schedRaw`, `payRaw`, `shiftRaw` en
  `modules/Staff.tsx`). Nómina toca dinero real: no se lanza sin proveedor.
- [ ] **Portada OFICIAL (handoff 2026-08-02) — lo que queda pendiente.**
  El handoff "To'Latino — Official Home Page" reemplazó a los anteriores y la
  portada se rehízo entera. Es una página de PRE-LANZAMIENTO: sin conteos, sin
  prueba social, sin testimonios (el propio handoff lo prohíbe: *"do not add
  counts — deliberate pre-launch honesty"*). Pendientes:
  1. **🔴 La tarjeta del feed muestra 19 publicaciones DE MUESTRA (2026-08-02).**
     Personas y negocios que no existen ("José M.", "Tacos Yucatán", "Doña Chuy",
     "Barbería El Corte"), en la página más vista, con pinta de conversación real
     de vecinos. Es la misma clase de dato que se limpió el 2026-07-29 (regla #8).
     **Decisión explícita del fundador**: se había conectado al feed REAL
     (`posts_near`) — que es lo que pide el propio handoff para producción — pero
     hoy no hay publicaciones cerca y la tarjeta quedaba vacía, dejando el hero
     más pobre. Atenuantes: es ilustración, nada se puede abrir, guardar ni
     contactar. **Pendiente OBLIGATORIO antes de abrir el registro al público:**
     volver al feed real (sustituir `apps/web/src/lib/landing.ts` por la llamada a
     `posts_near`; la tarjeta ya está escrita para las dos fuentes) y decidir qué
     hacer si la ciudad arranca sin conversación — sembrarla con publicaciones
     REALES del equipo o ampliar el radio.
     ⚠️ Ojo: el guardián `scripts/verify-build.mjs` NO detiene estos nombres (sus
     reglas listan los de la limpieza anterior). Si se decide dejarlos hasta el
     lanzamiento, añadirlos como regla el día que se retiren, para que no puedan
     volver por accidente.
  2. **Revisar la copia cuando la plataforma deje de ser nueva.** La insignia dice
     "Nuevo · Llegando a {ciudad}" y la sección de negocios habla de ser de los
     primeros. Cuando haya negocios activos, esa copia deja de ser cierta y hay que
     pedirle a Claude Design la variante de post-lanzamiento (con conteos reales, que
     hoy están deliberadamente prohibidos).
  3. **Fotos reales**: la portada no usa fotografía; si algún día se añade, tiene
     que salir de negocios reales con permiso, nunca de banco de imágenes que
     simule negocios que no existen.
  4. **Modal de registro propio**: el handoff no lo trae y los CTA llevan al flujo
     real (`/entrar`, `/entrar?crear=1`, `/negocio/publicar`). Si algún día se
     construye un registro dentro de la portada, debe REUSAR `useAuth` — que ya
     resuelve el aviso de "confirma tu correo" y la creación del perfil.
- [ ] **Limpiar: `platform_stats()`, `landing_testimonials()` y
  `landing_marketplace()` quedaron sin llamador (2026-08-02).** Las creó la
  migración 0131 para la portada anterior; la portada oficial prohíbe los conteos,
  así que ya nadie las usa. No estorban (son de lectura pública y agregada), pero
  o se aprovechan en la variante post-lanzamiento o se borran con una migración.
  Si se reactivan: hacen `count(*)` exacto — a 1M+ hay que migrar a estimaciones de
  `pg_class.reltuples` (O(1)) o a una tabla de contadores refrescada por cron.
- [ ] **Ciudad automática: decidir qué pasa si el permiso se deniega (2026-08-02).**
  La app detecta la ciudad al entrar (ver `lib/state.tsx`), pero si el visitante
  DENIEGA el permiso del navegador se queda **Houston** por defecto — que hoy es
  la ciudad de lanzamiento, así que está bien. Cuando haya más ciudades activas,
  eso deja de ser razonable: alguien de Los Ángeles que dice "no" vería negocios
  de Houston sin entender por qué. Opciones a evaluar entonces: (a) preguntar la
  ciudad de entrada en vez de asumir una, o (b) una estimación por IP — hoy
  imposible sin un servicio externo, porque el sitio es export estático y no hay
  servidor que lea la IP. Revisar al abrir la segunda ciudad.
- [ ] **🔴 Alta sin contraseña: faltan las CUENTAS de los canales (2026-08-02).**
  La capa de entrega ya es NUESTRA: la función `send-otp` recibe el código de
  Supabase y decide por dónde sale (WhatsApp primero, SMS de respaldo). Está
  desplegada y probada en pruebas — firma verificada, reintento en cadena,
  bloqueo por país y bitácora sin datos sensibles. Lo que falta son las cuentas:
  1. **WhatsApp (principal)** — cuenta de Meta Business verificada, número
     dedicado y plantilla de autenticación aprobada. Luego los secretos
     `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID`.
  2. **SMS (respaldo)** — Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y
     `TWILIO_FROM` (o `TWILIO_MESSAGING_SERVICE_SID`). Antes hay que verificar
     un número toll-free (días) o registrar 10DLC (semanas).
  3. **Encender el teléfono en Supabase** — en PRODUCCIÓN `external_phone_enabled`
     sigue en `false` (en pruebas ya está en `true`); y conectar el hook:
     Authentication → Hooks → Send SMS → apuntar a la función y pegar su secreto
     en `SEND_OTP_HOOK_SECRET`.
  4. ~~**Correo**~~ — **RESUELTO en PRODUCCIÓN el 2026-08-03 con Brevo SMTP.**
     El fundador se registró y recibió un ENLACE en vez del código: las
     plantillas por defecto de Supabase usan `{{ .ConfirmationURL }}`, y
     cambiarlas por `{{ .Token }}` la API lo rechazaba — *"Email template
     modification is not available for free tier projects using the default email
     provider"*. O sea: **la plantilla no se toca sin SMTP propio.** Ya está
     puesto (`smtp-relay.brevo.com:587`, remitente `no-reply@tolatino.com`,
     dominio autenticado con DKIM y subdominio de marca `em`), y con ello:
     plantillas en español con el código de 6 dígitos (también en el asunto), y
     el tope pasó de **2 a 30 correos por hora**.
     **Lo que queda pendiente de esto:**
     - **PRUEBAS sigue SIN SMTP** → ahí el correo continúa mandando un enlace y
       con tope de 2/hora. Repetir la configuración con la misma cuenta de Brevo
       cuando estorbe.
     - **Amazon SES para el lanzamiento**: Brevo regala 300 correos/día
       COMPARTIDOS entre todo lo que salga de la cuenta. Con confirmaciones de
       pedido y avisos, ese techo llega rápido. Migrar son cuatro campos.
     - **`no-reply@` no recibe.** Cuando haya buzón real en el dominio, cambiarlo
       por una dirección que sí lea a alguien.
- [ ] **🔴 AUDITORÍA DE NEGOCIOS (2026-08-04) — EN CURSO.** ~27.000 líneas entre
  el panel del negocio (33 archivos), la ficha pública y el `/negocios` del
  cliente. Se audita **por clases**, no por pantallas. **Las 10 clases barridas**:
  1. ~~**Dinero.**~~ 🔴 **Un comprador podía ponerle el precio a su propio
     pedido**: 3 platos de $45 registrados como $0,01 (ataque real, no lectura de
     código). Lo mismo con el total de las reservas. El pedido con TARJETA sí se
     preciaba en el servidor; el de EFECTIVO lo insertaba el navegador. Cerrado en
     `0142` + la función de pago: el efectivo pasa por la MISMA implementación de
     precios, y el modelo canónico (¿tiene Stripe? → en línea; si no → en el
     local) lo decide ahora el SERVIDOR. Guardián `auditar_precio_del_comprador()`.
  2. ~~**La app finge éxito.**~~ Siete sitios del panel pintaban el cambio,
     tiraban el error y anunciaban «listo»: confirmar una CITA, el estado de una
     RENTA, rechazar un PEDIDO (lo anunciaba antes de esperar la escritura),
     notas de cliente, portada y borrado de FOTOS, niveles de BOLETOS (precio y
     aforo), y «Conectar con Stripe», que no hacía nada visible al fallar — ese
     módulo no tenía forma de avisar de nada. Un patrón único: `lib/escribir.ts`.
  3. ~~**«No hay nada» vs «no cargó».**~~ 14 lecturas convertían un fallo en una
     lista vacía: el dueño leía «Sin pedidos», «Sin citas», «Sin rentas» con la
     consulta caída. En un panel de negocio quien ve «0 pedidos» no cocina.
  4. ~~**Permisos.**~~ **Limpia** — y merece decirse: la tabla `businesses` es
     solo-del-dueño y todo lo público sale de RPCs con lista explícita de
     columnas, así que ni Stripe, ni ajustes, ni dueño, ni correo se escapan.
     Ocho ataques reales, todos rechazados: renombrar el negocio de otro, borrar
     sus fotos/equipo/novedades, ver sus clientes/pedidos/cobros, leer o inyectar
     mensajes en una conversación ajena, hacerse pasar por el negocio en el chat,
     dejar varias reseñas de 1★ en el mismo sitio, quedarse con el negocio
     cambiando `owner_id`, crear un negocio a nombre de otro, y llamar a las
     funciones de admin. Tres pruebas salieron «limpias» sin probar nada (la
     tabla estaba vacía para ese negocio) y hubo que sembrar datos reales.
  5. ~~**Datos fabricados.**~~ 🔴 «Entregas» abría con **cinco pedidos inventados**
     —nombres, platillos y direcciones de Houston— porque el estado inicial era
     `DEMO_ORDERS`. La auditoría de 2026-07-29 quitó los respaldos `?? DEMO` pero
     dejó los estados INICIALES, que se pintan antes de saber si hay negocio real.
     Eran **8 módulos**. Todos a vacío; la constante de pedidos, borrada.
     **Guardián nuevo** en `verify-build`: rompe el build si un `useState` del
     panel arranca con datos de ejemplo (probado inyectando la regresión), con
     una excepción escrita para los `*Config`, que son categorías de arranque y
     no datos de nadie.
     **Aviso honesto:** la fuga PERSISTENTE la introduje yo en la clase 3 (al
     dejar de pisar la lista al fallar, los ejemplos se quedaban fijos); lo
     pre-existente era un parpadeo. Las dos están cerradas.

  6. ~~**Visibilidad de módulos.**~~ La pestaña **Novedades salía con CERO
     publicaciones**: `fetchBusinessUpdates` devuelve `[]` (nunca `null`) y el
     gate era `realUpdates != null`, o sea siempre cierto. Es el ejemplo exacto
     de la regla («activo pero vacío → no aparece»). Ahora cuenta contenido, como
     eventos/propiedades/autos. Menú, Tienda, Servicios y Renta ya cumplían (sus
     `fetch…` devuelven `null` cuando no hay filas — comprobado leyendo cada uno).
     **Nivel de prueba: código y build, no navegador** — no conseguí montar la
     ficha en el banco de pruebas sin gastar de más; lo digo en vez de colármelo.
  7. ~~**Escala.**~~ Cero claves foráneas sin índice y cero N+1. El susto del geo
     fue **falsa alarma de mi propio regex**: las tres funciones que usan
     `st_distance` lo **calculan para mostrarlo**, no filtran con él (y la de
     reparto ya usa `st_dwithin`). Sí había **consultas sin tope**: la cuenta de
     un cliente se bajaba TODOS sus pedidos, reservas, rentas y boletos en cada
     visita, y un evento se bajaba TODOS sus asistentes. Topes puestos (200/500).
     **Pendiente:** «ver más» para historiales largos — hoy se corta por lo viejo.
  8. ~~**Móvil (44px).**~~ El cromo del panel —hamburguesa que abre la navegación
     (36px), campana, logotipo, «Pausar», «Ver más ›»— estaba por debajo. A cero
     en 390px. **Pendiente:** barrido módulo a módulo del panel; el cajón lateral
     no me dejó recorrerlos automáticamente (Servicios mostró 10 controles cortos).
  9. ~~**Idioma.**~~ Limpio: cero `aria-label` en inglés duro y cero texto de
     interfaz sin `L()` en el panel.
  10. **Stubs.** 🔴 Envíos ofrecía **USPS, UPS y FedEx con tarifas concretas**
     ($8.00, $10.00, $18.00) y plazos, sin decir en ningún sitio que no están
     conectados: un dueño configuraba envíos creyendo que ese era el precio real.
     Ahora lleva un aviso «Aún no conectado» explicando que son de referencia.
     Los mensajeros externos (DoorDash Drive, Rappi/Uber Eats) están en el mismo
     caso — **falta** ponerles el mismo aviso. El módulo Equipo ya se etiqueta
     «Próximamente», que es la forma correcta.

  **Repaso sobre el sitio EN VIVO (2026-08-04):** dos nombres inventados seguían
  en el paquete servido. Se persiguieron uno a uno: `DashboardHome` y `Mensajes`
  están BIEN (solo salen tras `admin.demo`, el modo explorar); `DEMO_BOOKINGS` de
  Servicios era **código muerto** —declarado y sin usar— y se borró; y el embudo
  de candidatos de Equipo enseñaba **9 postulantes inventados** sin decir que la
  bolsa de trabajo no está conectada: ahora lleva un aviso «Ejemplo». Ese último
  se me había escapado porque la auditoría recorrió los módulos y no el `Inicio`
  del panel ni las vistas secundarias de cada módulo.

  **Los tres pendientes, CERRADOS (2026-08-04):**
  · **«Ver más» del historial.** El tope de 200 cortaba en silencio y lo viejo
    quedaba inalcanzable — un tope sin salida es la otra forma de mentir. Ahora
    se pide una fila de más para saber si hay historial y sale el botón en los
    cuatro listados (pedidos, reservas, rentas, boletos). Verificado con 250
    pedidos: pide 201, enseña 200, y al pulsar llega a los 250.
  · **Mensajeros externos.** Uber Direct, DoorDash Drive y Rappi se ofrecían con
    tarifa concreta sin decir que no están conectados. Mismo aviso que los
    transportistas.
  · **44px módulo a módulo del panel.** El `?tab=` NO cambia de módulo (el tab es
    estado local, no va en la URL), así que el primer barrido midió 27 veces la
    misma pantalla y dio un «0» que no valía nada. Rehecho navegando por el
    cajón: **99 controles cortos** en 18 pantallas. Cerrados **89**; quedan
    **10**, todos entre 37 y 43px (pastillas dentro de tarjetas que recortan el
    pseudo-elemento unos pocos píxeles). Los peligrosos de verdad —enlaces de
    18px y el botón de borrar foto de 28px— están arreglados.
  · **El botón Atrás dentro del panel.** CORRECCIÓN a lo que dije antes: la
    sección **sí** vivía en la URL (`?t=`) y el refresco **sí** la conservaba —
    me equivoqué en esa mitad. Lo cierto era lo de Atrás: se usaba
    `replaceState` («para no ensuciar el historial»), así que Atrás desde
    cualquier sección sacaba del panel entero. En un teléfono, donde toda la
    navegación va por el cajón, eso es perder el sitio de golpe. Cambiado a
    `pushState`: Atrás vuelve a la sección anterior y solo sale desde Inicio.
    Verificado: Inicio → Reseñas → Mensajes, Atrás → Reseñas, Atrás → Inicio,
    Atrás → fuera; y un refresco en `?t=reviews` aterriza en Reseñas.

  **Lo que queda de esta auditoría:** visibilidad de módulos en la ficha,
  escala (índices, N+1, paginación), móvil (44px y desbordes), idioma, y stubs
  presentados como terminados. Y las tandas B (vender y cobrar), C
  (operar) y D (eventos) sin barrer del todo.
- [x] **✅ 2ª AUDITORÍA DE COMUNIDAD (2026-08-03) — LAS 23 CERRADAS.** Comunidad
  queda lista salvo lo que dependa del fundador (ver más abajo). 56 agentes, 8
  clases, 2.055 herramientas ejecutadas; 47 hallazgos, 7 refutados. Cerradas en
  las migraciones **0139–0141** (todas aplicadas a las dos bases y verificadas
  ejecutando cada caso, no leyendo el código) más los arreglos de cliente, con
  dos guardianes nuevos que impiden que dos de las clases vuelvan.
  **La migración 0139** (verificada re-ejecutando el ataque): 14 funciones
  con privilegios estaban abiertas a internet con la llave publicable — entre
  ellas `apply_subscription`, `mark_payment`, `fulfill_order` y las de boletos,
  o sea plan Premium gratis, pagos marcados como pagados y boletos sin comprar;
  más `notify_once`/`notify_user` (alertas falsas con enlace externo en la
  campana de cualquiera) y la suplantación que 0135 dejó abierta para quien no
  tiene fila en `profiles`. Producción no había sufrido abuso (0 pagos, 0
  suscripciones, 0 boletos). Queda el guardián `auditar_funciones_expuestas()`:
  debe devolver 0 filas salvo los 3 contadores de vistas.

  **✅ LOS CINCO 🔴 «ROMPEN LA CONFIANZA» — CERRADOS (2026-08-03, migración 0140
  aplicada a las DOS bases y verificada; cliente verificado en navegador real a
  390×700).** Lo que se hizo y cómo se comprobó:
  1. ~~El bloqueo no llega a las notificaciones.~~ `notify_once()` ahora consulta
     `user_blocks` y no crea el aviso si el destinatario bloqueó al actor. Además
     el bloqueo pasó de filtrar solo LECTURA a frenar la ESCRITURA: nuevo trigger
     `a_comments_check_target` (SECURITY DEFINER + `auth.uid()`, comprobación
     **en los dos sentidos**) y las mismas comprobaciones dentro de
     `toggle_post_like` y en la política INSERT de `post_likes`. Comprobado en la
     base: sin bloqueo el aviso llega (1); con bloqueo el comentario y el ♥ se
     rechazan y los avisos quedan en 0.
  2. ~~Un enlace a una publicación no abre nada.~~ Nuevo RPC `post_by_id(uuid)`
     (INVOKER, la RLS manda); `?post=<id>` que no está en el feed cargado se trae
     de la base. Verificado con el feed devolviendo VACÍO: el hilo abre igual.
  3. ~~Ocultar por moderación no cierra la publicación.~~ El trigger nuevo
     rechaza comentar en una publicación oculta, `toggle_post_like` igual, y
     `post_comment_counts` deja de contar lo escondido y lo bloqueado.
     Comprobado: comentar en una oculta → rechazado.
  4. ~~La app finge éxito cuando el servidor rechaza.~~ Guardar y ♥ revierten el
     pintado optimista si la escritura falla (y la llamada de red salió de dentro
     del updater de `setState`, donde React puede ejecutarla dos veces); el
     comentario rechazado enseña el motivo en español; la campana distingue «No
     pudimos cargar tus avisos» de «Todo al día»; el feed distingue «No pudimos
     cargar tu barrio» de «Todavía no hay publicaciones». Los cuatro verificados
     en navegador con el servidor devolviendo 403/500.
  5. ~~La campana está topada en 60.~~ Página de 40 + «Ver avisos anteriores», y
     la insignia sale de un `count: 'exact'` de la base, no del largo de la
     lista. Verificado con 150 avisos: 40 → 80 → 120 → 150.

  **✅ LOS CUATRO 🟠 «ALTA» — CERRADOS (2026-08-03).** Verificados en navegador
  real a 360/390/430px y con la función de push ejecutada de verdad:
  6. ~~15 tipos de notificación que la base emite y la interfaz no sabe dibujar.~~
     Eran **14 sin dibujar en la campana y 23 sin texto en el teléfono** — más de
     lo que decía la auditoría. Causa: TRES sitios tienen que conocer cada tipo
     (la base que lo emite, la campana, la función de push) y los tres se
     mantenían a mano, así que se separaron sin que nadie lo notara. Añadidos
     todos (cuenta suspendida/restaurada, cambio de plan, reclamos, reembolsos,
     interesados y visitas de carros y bienes raíces, reseñas, boletos, y las 4
     de comunidad). **Guardián nuevo en `scripts/verify-build.mjs`:** saca los
     tipos de las migraciones y rompe el build si a la campana o al push le falta
     alguno — probado inyectando una regresión de cada clase. Deja de ser posible
     que se vuelvan a separar.
  7. ~~Casi ningún botón llega a 44px.~~ Todos los controles de Comunidad llegan
     a 44 en 360, 390 y 430px, medido con `elementFromPoint` (dónde aterriza el
     dedo de verdad, no la caja CSS) y comprobando además que dos zonas no se
     pisen. Los iconos se siguen **dibujando** igual: la zona crece con padding +
     margen negativo, o con la utilidad `.tap` / `.tap-y` cuando el control tiene
     fondo propio. Diferencia visual total, comparada píxel a píxel: 0,43% — la
     pastilla ES/EN es más ancha (cada mitad son dos botones pegados, no podían
     crecer con un pseudo-elemento sin robarse el toque) y el marcador se separó
     12px de compartir. Trampa que costó encontrar: `overflow-x-auto` en la fila
     de barrios **recortaba también a lo alto** la zona ampliada.
  8. ~~Fijar una publicación vieja rompe la paginación.~~ El cursor de «Ver más»
     ya no puede salir de una publicación fijada (el servidor las sube a la
     primera página aunque sean de hace un año, y el cliente tomaba esa como
     «la más vieja que tengo»). Verificado con 100 publicaciones y la más vieja
     fijada: se cargan las 100, sin saltarse ninguna.
  9. ~~Lo que llega por «Ver más», búsqueda o el perfil de un vecino se pinta sin
     ♥ ni conteo.~~ Ahora **cada tarjeta pide sus propios datos** y las peticiones
     se juntan en un lote, así que ninguna superficie futura se puede olvidar.
     Verificado: 100 publicaciones en 3 lotes (50+30+20), todas con su conteo.

  **✅ LAS 14 RESTANTES (🟡 media y ⚪ baja) — CERRADAS (2026-08-03).** Base de
  datos: migración `0141`, aplicada a las DOS bases y verificada ejecutando cada
  caso. Cliente: verificado en navegador real.
  10. ~~Guardados y Siguiendo mienten cuando fallan.~~ Los errores se tiraban a la
     basura, así que una consulta caída decía «no tienes publicaciones guardadas»
     mientras las tuyas seguían ahí. Ahora se distingue. El descuadre del hilo
     («1 comentario» + «aún no hay comentarios») lo cerró 0140 al dejar de contar
     lo escondido; 0141 completa el caso de las respuestas huérfanas (16).
  11. ~~`featured_by` / `hidden_by` son públicos.~~ Una publicación DESTACADA es
     visible por definición y llevaba pegado el uuid del moderador; y al mostrar
     de nuevo algo oculto, `hidden_by` se quedaba escrito en una fila que vuelve
     a ser pública. Con `neighbor_profile` eso da nombre y ciudad de quien
     modera. Ya no se firma la fila: quién hizo qué queda en `admin_audit`, que
     es de solo-admin. **No se pudo arreglar con permisos por columna** —
     `authenticated` tiene SELECT de TABLA y un `revoke (columna)` no le quita
     nada (comprobado: `attacl` en null, `has_column_privilege` sigue en true).
     Guardián nuevo: `auditar_moderadores_expuestos()`.
  12. ~~`Overlay` no es un diálogo.~~ Ahora lleva `role="dialog"`, `aria-modal`,
     Escape, trampa de foco y devuelve el foco al cerrar — para TODAS las hojas
     de la app, no solo las de Comunidad.
  13. ~~El índice de 0138 nunca se creó.~~ `if not exists` mira el NOMBRE, no las
     columnas, y 0130 ya había creado un `posts_author_idx` distinto. Creado como
     `posts_author_created_idx (author_id, created_at desc)`.
  14. ~~Un comentario puede FINGIR que se publicó.~~ Con base de datos configurada
     ya no existe camino local: si algo falla se dice. Y se fue el barrio
     inventado «Bellaire», que aparecía aunque estuvieras en otra ciudad.
  15. ~~Con búsqueda activa el filtro de barrio no filtra.~~ Lo que devolvía la
     base se pintaba sin filtrar, así que la pastilla decía «Gulfton» y se veía
     media ciudad.
  16. ~~Ocultar un comentario manda sus respuestas a un limbo.~~ Trigger nuevo:
     al ocultar el padre se ocultan sus respuestas, y al mostrarlo vuelven solo
     las que se ocultaron por eso. Verificado: conteo 0 → 2 → 0.
  17. ~~Seguir y bloquear sin freno anti-spam.~~ Tope por hora (120 y 60) con el
     mismo limitador de 0111.
  18. ~~`create_report` acepta uuids inventados.~~ Ahora valida el tipo y que la
     cosa exista. Verificado con id inventado, tipo inventado, texto que no es
     uuid, y uno legítimo (que sigue pasando).
  19. ~~El perfil de vecino no tiene cerrar ni gesto Atrás.~~ Botón de cerrar, y
     la hoja vive en la URL (`?vecino=`) como el hilo: Atrás la cierra sin salir
     de Comunidad, y un refresco la reabre.
  20. ~~Etiquetas de accesibilidad sin `L()`.~~ Cerrado del todo: «TÚ», «clear»,
     «back», los `tile`/`color` de los editores del panel, y el botón de cerrar
     el hilo, que no tenía etiqueta ninguna.
  21. ~~`bloquear()` recarga pase lo que pase.~~ Si el servidor rechaza se dice y
     la hoja se queda abierta, en vez de recargar como si hubiera funcionado.
  22. ~~Bloquear no deja de seguir.~~ Trigger nuevo que corta el vínculo en los
     DOS sentidos, más el arreglo de lo ya contradictorio.
  23. ~~«Mis publicaciones» depende de la ciudad.~~ Salía del feed geográfico (30
     millas, 50 filas): al cambiar de ciudad tus publicaciones desaparecían.
     Ahora se piden por autor, que es lo que la pantalla dice que enseña.

- [ ] **Auditoría de Comunidad (2026-08-03) — lo que quedó ABIERTO.** Cerrado ya
  en la migración 0135 + cliente: el agujero de columnas (suplantar al autor,
  inflar ♥, auto-destacarse), el negocio etiquetado sin enlace y el botón de
  compartir que compartía el feed en vez de la publicación. Lo que sigue
  pendiente, por orden de importancia:
  **Cerrado TODO menos dos cosas** (2026-08-03, migraciones 0135–0138 + cliente):
  agujero de columnas, enlace al negocio, compartir, notificaciones, borrar
  comentario, barrios en móvil, chip de Evento, marca "editado", paginación por
  cursor, conteo de comentarios en el servidor, búsqueda real (con español y sin
  acentos), `pinned` visible, bloquear/desbloquear vecinos y perfil de vecino.
  Sigue abierto:
  1. **Menciones (@vecino) y temas/hashtags** — decidido NO hacerlo ahora: una
     mención sin buscador de personas ni avisos propios es media función, y
     los hashtags sin nadie que los use quedan vacíos. Se retoma cuando haya
     conversación real que lo pida.
  2. **Editar sigue tocando solo el texto**: la marca "editado" ya sale y la base
     ya permite cambiar las fotos, pero el formulario (`PostMenu`) no las ofrece.
     La encuesta y el negocio etiquetado se quedan fuera a propósito — cambiar
     opciones con votos ya emitidos los invalida.
  3. ~~Web Push sin configurar~~ — **FALSA ALARMA, comprobado el 2026-08-03**:
     producción YA tiene todo puesto — la función `send-push` desplegada y
     activa, los secretos `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
     `VAPID_SUBJECT` / `PUSH_HOOK_SECRET`, y `private.push_config` con su URL y
     su secreto. Verificado además que la clave pública del build es la MISMA que
     la del secreto (comparando su sha256; el API no devuelve el valor en claro).
     Lo único que falta es que alguien ACTIVE las notificaciones desde
     Mi cuenta → Configuración: hoy hay 0 suscripciones, y sin suscripción no
     hay a dónde enviar. No hace falta generar ninguna llave.
  4. **`featured` sigue sin leerse** (a diferencia de `pinned`, que ya sube las
     publicaciones fijadas al principio del feed). Decidir si "destacado" tiene
     un sitio propio o se borra la columna.
- [ ] **🔴 La llave SMTP de Brevo CADUCA — dos relojes distintos (2026-08-03).**
  Si muere, nadie puede registrarse y NADA avisa: el síntoma es "no me llega el
  código", igual que un problema de red.
  1. **Vence el 2 de agosto de 2027** (se generó a 1 año). Renovarla antes.
  2. **Y muere a los 90 DÍAS SIN ACTIVIDAD**, pase lo que pase con la fecha
     anterior — lo dice Brevo en la propia pantalla. Antes de lanzar, con poco
     tráfico, 90 días sin un solo registro es perfectamente posible.
  Mitigación cuando haya monitorización: alertar si `otp_deliveries` (o los
  registros de Auth) no ven un envío correcto en X días.
- [x] ~~**🔴 Producción NO tiene copias de seguridad utilizables (2026-08-03).**~~
  **RESUELTO el 2026-08-04, gratis.** Se eligió el `pg_dump` programado (la
  opción que no depende de un servicio de pago). Está en
  `.github/workflows/respaldo-produccion.yml` y documentado en
  **`docs/RESPALDOS.md`** — leer eso antes de necesitarlo.
  Diario, cifrado con AES-256 (el repo es PÚBLICO y los artifacts se descargan
  sin permiso), 90 días de retención, y con **ensayo de restauración diario**:
  levanta un Postgres limpio, restaura la copia del día y cuenta filas. Tener una
  copia y poder restaurarla no son lo mismo.
  **CAMBIO DE DECISIÓN EL MISMO DÍA:** el fundador prefiere **pagar el plan Pro
  de Supabase**, que añade lo que el script no puede dar: **PITR** (volver a un
  momento concreto, no solo al volcado nocturno). El diario del workflow queda
  **APAGADO**; el trabajo sigue en el repo y se lanza a mano, como copia de
  FUERA de Supabase — porque las copias de Supabase viven dentro de Supabase y
  se irían con la cuenta si esta se bloquea o el proyecto se borra.
  **PENDIENTE hasta que el pago esté hecho: NO HAY RESPALDOS.** Y al pagar, hay
  que comprobar tres cosas (detalle en `docs/RESPALDOS.md`): que las copias y el
  PITR salgan activos de verdad en el panel; que el proyecto de PRUEBAS no
  empiece a facturar cómputo sin querer (el plan es por organización, y hay dos
  proyectos); y si las copias incluyen **Storage** o solo la base.
  **Y lo que este respaldo NO cubre, que sigue abierto:**
  1. **Las FOTOS.** Viven en Supabase Storage (S3), fuera de Postgres: un
     `pg_dump` no las toca. Un desastre total dejaría las filas apuntando a
     archivos que ya no existen. Hace falta un segundo trabajo que liste el
     bucket y baje los objetos — necesita la clave `service_role` como secreto,
     que es mucho poder guardado en un repo público; decidir con cuidado.
  2. **Los secretos de las Edge Functions** (Stripe, VAPID) y la configuración
     del proyecto (SMTP, plantillas): se reponen a mano.
  3. **PITR.** Esto da una copia AL DÍA. Perder medio día de pedidos es
     asumible hoy y no lo será después: el día del primer pedido pagado de
     verdad, plan Pro.

- [ ] **🔴 LA BÚSQUEDA NO ENTIENDE ESPAÑOL (diagnosticado 2026-08-04).**
  El fundador escribió «mecanico» y no salió NINGÚN taller, habiendo 18 en el
  radio. Medido contra los 548 negocios de pruebas:
  `mecanico`→0 · `mecánico`→4 · `mecanica`→2 · `mecánica`→4 · `mecanioc`→0.
  **Tres causas, todas comprobadas por SQL:**
  1. El índice usa `to_tsvector('simple', …)`. El diccionario `simple` **no
     quita tildes y no reduce a la raíz**. Probado:
     `simple` → `'mecánica'` · `spanish` → `'mecan'`. Con español, «mecanico»,
     «mecánico», «mecanica», «mecánicos» y «MECANICO» caen todos en `mecan` y
     casan. Nadie escribe tildes en el teléfono.
  2. El índice mete `category_id` **en crudo y en inglés** (`AutoServices`) —
     nadie teclea eso. Las etiquetas legibles («Servicios de Auto», «taller
     mecánico») viven solo en el frontend (`CAT` en `lib/tiles.ts`, `SUBCATS` en
     `data/fixtures.ts`) y **nunca llegan al índice**.
  3. Las erratas se intentan con `similarity(b.name, t) > 0.2` — solo contra el
     NOMBRE, y `similarity` de una palabra corta contra un texto largo siempre
     puntúa bajo. La herramienta correcta es **`word_similarity` (`<%`)**, que
     compara contra la mejor palabra del texto.
  **Ganancia medida sobre los datos reales, sin tocar ni un negocio:**
  `mecanico` pasa de **0 a 18 resultados** solo con (1) diccionario español +
  `unaccent` y (2) la etiqueta legible de la categoría dentro del índice. Con
  `word_similarity` a 0.6, `mecaniko`, `mecanioc` y `taler` también dan 18.
  `unaccent` y `pg_trgm` ya están instaladas en las dos bases.
  **Afecta igual a `search_events`, `search_posts`, `properties_search` y
  `vehicles_search`** — mismo patrón `'simple'`; hay que revisarlas todas, no
  solo negocios.
  **Pendiente de diseño (el fundador lo prepara en Claude Design):** el buscador
  necesita además diccionario de SINÓNIMOS y jerga latina regional
  (mecánico=taller=automotriz=hojalatería; bodega=colmado=abarrotes; salón=
  estética=peluquería), «¿quisiste decir…?», estado sin-resultados con
  sugerencias, y las búsquedas recientes.

- [ ] **Búsqueda: cuando `businesses`/`properties`/`vehicles` crezcan, revisar
  el índice de tipo y el umbral de erratas (2026-08-04).** Dos apuntes que hoy
  no duelen:
  1. `search_tsv` de `vehicles` y `properties` es una columna GENERADA. Añadirle
     un campo (como se hizo con `vtype`/`ptype` en 0146) **reescribe la tabla
     entera** y hay que tirar y rehacer su índice GIN. Con 16 filas fue
     instantáneo; con un millón hay que planificarlo (ventana, o `concurrently`).
  2. El umbral de erratas va escrito como `word_similarity(...) > 0.45` porque
     Supabase no deja bajarlo por función. Eso no aprovecha el índice de
     trigramas que sí usaría el operador `<%`.

- [ ] **Analítica de búsqueda: úsala, y dos cabos sueltos (2026-08-04).**
  Migración `0145`. `search_log` cuenta, de forma **anónima y agregada**, qué se
  busca y cuántos resultados salieron: sin usuario, sin sesión, sin IP y sin
  hora (solo el día). Mil personas buscando «mecánico» son UNA fila con
  `veces = 1000`. Comprobado que ni `anon` ni `authenticated` pueden leerla
  (RLS sin políticas + `revoke select`).
  1. **Mirarla.** `select * from public.busquedas_sin_resultados(30);` en el SQL
     Editor devuelve lo que la gente buscó y **no encontró**: esa es la lista de
     a qué negocios ir a tocarles la puerta. Pendiente: llevarla al panel
     `/admin` (ver `docs/ADMIN-DASHBOARD-PLAN.md`) para no depender del SQL.
  2. **Solo registra Negocios.** Eventos, Comunidad, Renta y Carros aún no
     llaman a `registrar_busqueda`. La función ya acepta esas secciones; falta
     conectarlas donde cada pantalla conoce su número de resultados.
  3. **Escala.** El umbral de erratas va escrito como
     `word_similarity(...) > 0.45` porque Supabase no deja bajarlo por función
     (`alter function … set` → permiso denegado). Eso NO usa el índice de
     trigramas que sí usaría el operador `<%`. A la escala de hoy da igual;
     revisar cuando `businesses`, `properties` o `vehicles` crezcan de verdad.

- [ ] **🔴 La lista de espera «¡Avísame!» NO GUARDA NADA — está viva en
  producción (descubierto 2026-08-04).** En `/transporte` y `/trabajos`,
  `ComingSoonScreen` pide el correo, responde «¡Listo! Te avisamos cuando abra»
  y **tira el correo a la basura**: el `onSubmit` solo llama a
  `app.markWaitDone(view)`, no hay ni una escritura a la base. No existe tabla
  de lista de espera general (hay `event_waitlist`, que es otra cosa).
  Es una violación de la regla #8 de las caras: no es una pantalla incompleta,
  es una promesa explícita que no se cumple, hecha a la gente que más cuesta
  conseguir — los primeros interesados. Y bloquea cualquier plan de portada
  «coming soon», porque el único trabajo de esa página es justo ese.
  **Arreglo:** tabla `waitlist` (correo, ciudad, sección, origen, fecha) con RLS
  de solo-INSERT para `anon`, índice único por correo+sección, y que el formulario
  escriba de verdad y muestre el error si falla en vez de celebrar.

- [ ] **🔴 SISTEMA DE RESPALDO DEL LANZAMIENTO — montar ANTES del primer pedido
  pagado (acordado 2026-08-04).** Plan completo y razonado en
  **`docs/RESPALDOS.md` → «Plan para el LANZAMIENTO»**; esto es la lista de
  ejecución. Hoy no hace falta (una cuenta, 49 kB de fotos); el día que se cobre
  de verdad, sí.

  **Primero, una decisión que NO es técnica y que hay que escribir como número:**
  **¿cuántos minutos de pedidos se pueden perder?** Si una taquería recibe
  pedidos a la 1:40 pm y se restaura al volcado de las 2:40 am, esa gente pagó y
  no hay registro de su comida. Para una app que cobra, la respuesta razonable
  son **minutos** — y eso solo lo da el PITR. Ese número decide si el plan basta.

  **Las cuatro capas. Cada una cubre un desastre distinto y ninguna cubre las
  otras** — por eso hacen falta varias, no «la mejor»:
  1. **Supabase Pro con PITR** (~$25/mes) → el error humano de hace unas horas,
     que es el 90% de los sustos reales. Cero mantenimiento.
  2. **Copia FUERA de Supabase** → cuenta bloqueada, pago fallido, proyecto
     borrado por error, incidente del proveedor. El PITR **no** cubre esto: vive
     dentro de Supabase. Reactivar `.github/workflows/respaldo-produccion.yml`
     (descomentar el `schedule`) y **cambiar el destino de los artifacts de
     GitHub a Cloudflare R2** — los artifacts caducan a los 90 días y no sirven
     para retención larga. Retención: **diarias 30 días · semanales 3 meses ·
     mensuales 12 meses** (las mensuales porque una disputa de pago o una
     consulta fiscal llega meses después).
  3. **Las FOTOS (Storage)** → `pg_dump` guarda qué imagen tenía cada ficha, no
     la imagen. Restaurar solo la base deja todo apuntando a archivos que ya no
     existen. Sincronizar el bucket `post-photos` a R2 (habla S3: `rclone` vale).
     ⚠️ Necesita la clave `service_role` como secreto y **el repo es PÚBLICO** —
     decidir con cuidado, o pasar el repo a privado antes. Y comprobar primero
     si el Pro ya respalda Storage: si lo hace, esta capa se simplifica.
  4. **Cuaderno de reconstrucción** → con la base restaurada pero sin esto, no
     hay app. Ya en git: migraciones ✓ y las 11 Edge Functions ✓. **Falta
     documentar** (dónde están y cómo se reponen, NO los secretos en sí): claves
     de Stripe y VAPID, config de SMTP y plantillas de correo, límites de envío,
     URLs de redirección de auth, y el endpoint del webhook de Stripe con los
     eventos que escucha.

  **Las dos cosas que casi nadie hace y son justo las que fallan:**
  - **ENSAYO de restauración.** Un respaldo es una hipótesis hasta que se
    restaura. El workflow ya ensaya a diario, pero hace falta uno **trimestral a
    mano**: restaurar en un proyecto nuevo, abrir la app contra él, entrar, ver
    los pedidos, ver que las fotos cargan. **Cronometrarlo** — ese número es el
    tiempo real de recuperación.
  - **MONITORIZACIÓN.** El fallo más común de un respaldo no es corromperse: es
    que **dejó de ejecutarse hace tres semanas y nadie miró**. Aviso si no hay
    copia correcta en 48 h. Sin esto, lo demás es decorado.

  **Paracaídas que ya existe y conviene tener escrito en el procedimiento:**
  **Stripe es una fuente de verdad independiente para el dinero.** Si la base
  perdiera pedidos, los cobros siguen ahí con importe, fecha y comprador. No
  sustituye al respaldo (Stripe no sabe qué platillos llevaba el pedido ni a qué
  dirección iba), pero es la red por debajo de la red.

  **Coste total: ~$25/mes** — lo pone todo el Pro; R2 y GitHub Actions son
  gratis a este tamaño. El resto es trabajo, no dinero.

  **Orden de ejecución. Del 1 al 3 NO pueden faltar el día del lanzamiento; del
  4 al 6, la primera semana:**
  - [ ] 1. Pagar Pro y **VERIFICAR** que PITR sale activo (pagar ≠ estar
        respaldado). Comprobar de paso que el proyecto de PRUEBAS no empieza a
        facturar cómputo: el plan es por organización y hay dos proyectos.
  - [ ] 2. Reactivar la copia externa, destino R2, retención larga.
  - [ ] 3. Monitorización (aviso a las 48 h sin copia correcta).
  - [ ] 4. Sincronizar las fotos a R2.
  - [ ] 5. Escribir el cuaderno de reconstrucción.
  - [ ] 6. Primer ensayo completo cronometrado, y repetirlo cada trimestre.
  5. **Rate limits** — subir los de SMS/correo cuando haya tráfico real.
  Mientras tanto queda la puerta de la contraseña en "Entrar", que es lo único
  que permite entrar hoy.
- [ ] **🔴 Números de prueba con código `000000`: SOLO en pruebas, y caducan
  (2026-08-02).** Para poder recorrer el alta completa sin cuentas de WhatsApp ni
  Twilio, el proyecto de **pruebas** (`zpkaxojonufdwgahiqjh`) tiene configurado el
  mecanismo oficial de Supabase `sms_test_otp`: cinco números que aceptan `000000`
  y **no envían ningún SMS** (Supabase ni siquiera llama al proveedor).
  - Números: `+1 713 555-0101`, `+1 713 555-0102`, `+1 713 555-0103`,
    `+1 214 555-0101`, `+1 210 555-0101` — todos del rango 555-01xx, reservado por
    la ITU para ficción, así que no pertenecen a ninguna persona real.
  - `sms_test_otp_valid_until` = **2026-11-30**. Pasada esa fecha dejan de
    funcionar solos; es una fecha de caducidad a propósito, no un olvido.
  - **PRODUCCIÓN NO LOS TIENE** (`sms_test_otp` = vacío, `external_phone_enabled`
    = `false`) y no debe tenerlos nunca: un número de prueba en producción es una
    cuenta que cualquiera abre sabiendo el número.
  - **Antes de lanzar**: verificar que en producción `sms_test_otp` sigue vacío, y
    borrarlos también de pruebas en cuanto WhatsApp/Twilio estén conectados.
- [ ] **Alta: piezas del handoff que quedaron fuera a propósito (2026-08-02).**
  1. **Google / Apple / Facebook** — decisión del fundador: cada uno necesita
     una app de desarrollador suya (Apple cuesta $99/año) y claves en Supabase;
     un botón social sin configurar falla al pulsarlo. Se añaden cuando existan
     las cuentas.
  2. **Selector de país del teléfono** — hoy el prefijo es `+1` fijo (solo
     EE. UU.). Cuando haga falta otro país: selector real + validación con
     libphonenumber.
  3. ~~**Foto de perfil**~~ — **HECHA (2026-08-02)**, migración 0134. El botón
     "Agregar foto" del handoff sube de verdad: comprime en el teléfono (recorte
     cuadrado, 400 px, WebP, sin EXIF — 600 KB ⇢ 3 KB medido), guarda,
     borra la anterior al cambiarla y revierte si falla. Se ve en la cabecera, el
     compositor, las tarjetas del feed, los comentarios y Mi cuenta → Mi perfil.
     Lo que queda: **las demás superficies siguen con iniciales** — reseñas,
     chat con el negocio, respaldos del negocio (`endorsements_by_slug`), la
     ficha del cliente en el panel (CRM) y los pedidos. Todas ellas fabrican el
     avatar desde columnas denormalizadas (`author_initials`, `customer_color`…)
     y no llevan el id del usuario en su RPC; para que muestren la foto hay que
     añadir el id a cada RPC y pasarlo por `useAvatar`. No es urgente (las
     iniciales son un estado legítimo, no roto), pero está a medias mientras
     tanto.
  4. **Zona por COLONIA** — el handoff elige colonia y código postal; la app
     trabaja por ciudad y no tenemos datos de colonias. Si algún día se quiere
     esa granularidad, hace falta una tabla de colonias con sus polígonos.
  5. **Los intereses se guardan pero todavía no ordenan nada.** Están en
     `profiles.interests` y la copia ya no promete más de lo que hace ("con eso
     ordenamos lo que ves primero" ⇢ hay que cumplirlo). Pendiente: usarlos en
     el orden del inicio y de Negocios.
- [ ] **Cabeceras de seguridad: falta la CSP (2026-08-02).** Ya van
  `X-Frame-Options`, `X-Content-Type-Options` y `Referrer-Policy` en
  `vercel.json` (ver `docs/CABECERAS-SEGURIDAD.md`). Falta
  `Content-Security-Policy`, que es la que de verdad limita qué puede ejecutarse
  en la página. No se puso de golpe porque el sitio carga Stripe, tipografías de
  Google, mapas de OSM y usa estilos en línea: una CSP mal calibrada deja la
  pantalla en blanco o mata el pago. Camino correcto: publicar primero
  `Content-Security-Policy-Report-Only` unos días, recoger qué bloquearía, y
  solo entonces aplicarla. Tampoco se puso `Permissions-Policy`: la app necesita
  geolocalización, cámara (escáner de QR) y notificaciones, y apagarlas por
  descuido daría un fallo silencioso y difícil de diagnosticar.
- [ ] **🔴 BLOQUEADOR DE LANZAMIENTO: no hay servicio de correo propio (SMTP).**
  Descubierto 2026-07-29 al hacer el ensayo en producción. El proyecto de prod NO
  tiene SMTP configurado (`smtp_host = null`), así que usa el servicio integrado de
  Supabase: **`rate_limit_email_sent = 2` correos por HORA en todo el proyecto**, sin
  garantía de entrega (Supabase lo documenta como solo-para-pruebas). Con
  `mailer_autoconfirm = false` el registro EXIGE confirmar por correo → **nadie
  puede activar su cuenta**. El fundador se registró y su cuenta quedó sin confirmar
  (se confirmó a mano por SQL para desbloquear las pruebas).
  **Arreglo (ya decidido en CLAUDE.md): Amazon SES**, ~$0.10 / 1 000 correos.
  Pasos: crear identidad de dominio en SES para `tolatino.com` (registros DKIM en
  Cloudflare), salir del *sandbox* de SES (si no, solo se envía a correos
  verificados), crear credenciales SMTP y pegarlas en Supabase → Authentication →
  SMTP Settings (host `email-smtp.<región>.amazonaws.com`, puerto 587, remitente
  `hola@tolatino.com`). Subir después `rate_limit_email_sent`. **Sin esto no se
  puede abrir el registro al público.**
- [x] ~~Supabase avisó de que la base pasaba del límite gratuito (798 MB de 500).~~
  **RESUELTO el 2026-08-04, sin pagar nada.** Tres datos que importan:
  1. El aviso era del proyecto **`tolatino` = la base de PRUEBAS**
     (`zpkaxojonufdwgahiqjh`), NO de producción. Producción (`tolatino-prod`,
     `vurqsebgsacickxsxfeh`) estaba en **30 MB** y sigue limpia.
  2. No eran datos: eran **índices inflados**. `posts` tenía 30 filas y 24 kB de
     datos… con 115 MB de índices; `post_comments`, 6 filas y 62 MB. La causa está
     en `pg_stat_user_tables`: **2,2 M de publicaciones insertadas y 1,9 M
     borradas** (más 600 k comentarios) en las pruebas de escala de las
     auditorías. Postgres recupera el espacio de las filas borradas, pero **NO
     encoge los ficheros de índice**.
  3. Arreglo: `reindex table` sobre `posts`, `post_comments` y `notifications`.
     **233 MB → 56 MB**, en segundos, sin tocar un solo dato.
  **Regla para la próxima:** toda prueba de escala que inserte y borre en masa
  termina con un `reindex table` de las tablas tocadas. Si no, la basura se queda
  en el disco y parece que hace falta el plan de pago. Y antes de creerse un aviso
  de facturación, mirar **qué** proyecto es y **qué** ocupa:
  ```sql
  select n.nspname||'.'||c.relname as tabla,
         pg_size_pretty(pg_total_relation_size(c.oid)) as total,
         pg_size_pretty(pg_relation_size(c.oid)) as datos,
         c.reltuples::bigint as filas
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','m') and pg_total_relation_size(c.oid) > 1024*1024
  order by pg_total_relation_size(c.oid) desc limit 15;
  ```
  Datos MUY por debajo del total = índices inflados, no falta de espacio.

- [ ] **El perfil se puede quedar a medias, y nadie se lo recuerda al usuario.**
  Descubierto el 2026-08-04: la única cuenta de producción tenía foto e intereses
  pero seguía llamándose «Vecino» y sin ciudad. La causa inmediata ya está
  arreglada (las escrituras del alta fallaban en silencio y el usuario avanzaba
  igual; ahora se detiene y avisa), y entrar ya no exige tener el alta completa.
  **Lo que falta:** un recordatorio suave para quien quedó a medias — hoy entra a
  la app como «Vecino» y nada le sugiere ponerse nombre o ciudad. Sin ciudad, el
  feed no sabe qué barrio enseñarle. Decidir dónde va el aviso (¿banda en
  Comunidad? ¿punto en Mi cuenta?) — es UI nueva, así que hay que acordarla antes
  de construirla.

- [ ] **Construir de verdad dos secciones que se retiraron por ser falsas (2026-07-29).**
  Vivían en la columna derecha de Comunidad (tablet/escritorio) con datos 100%
  inventados y se mostraban a usuarios reales; se eliminaron por la regla #8. Hay que
  hacerlas con datos reales antes de reponerlas (Nextdoor las tiene):
  1. **Tendencias** — temas/etiquetas más activos de la zona. **SIGUE PENDIENTE.**
     Necesita extraer temas de los posts reales y contarlos por ciudad/barrio en una
     ventana de tiempo. Hoy no hay hashtags ni etiquetas en el modelo de datos, así
     que cualquier cifra que se pintara volvería a ser inventada. Requiere decidir
     antes de dónde sale el tema: ¿hashtags que el usuario escribe? ¿categoría del
     post? ¿palabras frecuentes? Ninguna de las tres existe todavía.
  2. **Vecinos sugeridos** — **construido y RETIRADO el mismo día (2026-08-04),
     por decisión del fundador.** Se hizo de verdad: migración `0143`, RPC
     `neighbors_nearby` (`SECURITY DEFINER`), que sale de `posts` — donde el nombre,
     las iniciales, el color y el barrio ya van desnormalizados — y NO toca
     `profiles`, así que las coordenadas de la casa de nadie se leen. Excluye a uno
     mismo, a quien ya sigues, a quien bloqueaste y a quien te bloqueó (los dos
     sentidos: la política de `user_blocks` solo deja ver los bloqueos propios, por
     eso hace falta DEFINER). Sin sesión no devuelve nada; `anon` no tiene permiso.
     **El fundador prefirió que esa columna trabajara para el negocio** (negocios
     destacados + invitación a publicar + eventos próximos), así que la tarjeta se
     quitó. **El RPC sigue aplicado en pruebas y en el repo (`0143`), listo para
     reusar** si algún día se quiere «descubrir vecinos» en otra superficie. Si se
     repone, el componente está en el historial de git (`VecinosCerca.tsx`).

- [x] ~~La columna derecha de Comunidad en escritorio.~~ **RESUELTA (2026-08-04).**
  Lleva dos bloques, los dos con datos que la pantalla ya tenía cargados (cero
  consultas nuevas):
  1. **Negocios destacados** — orden definido, no a ojo: verificados primero
     (`tier <> 'free'`), dentro de cada grupo quien tiene reseñas antes que quien
     no, luego mejor calificación y más reseñas. Lo segundo importa: sin ello un
     negocio recién dado de alta con 0 reseñas encabezaba la lista por una
     calificación que nadie le había puesto. Debajo, la invitación a publicar el
     propio negocio → `/negocio/publicar`.
  2. **Eventos próximos** — `events_near` ya devuelve solo lo que no ha terminado,
     ordenado por fecha, así que «los próximos» son los primeros. Sin eventos la
     tarjeta no se pinta.
  **Pendiente cuando haya monetización:** hoy «destacado» NO se puede comprar. Si
  algún día se vende ese puesto, hay que etiquetarlo como promocionado a la vista
  (Yelp y Google lo marcan; ocultarlo sería engañar al lector).
- [x] ~~Decidir: el hero de la landing muestra un negocio de ejemplo inventado.~~
  **RESUELTO (2026-08-02):** la portada oficial no tiene tarjetas decorativas de
  negocio. Lo único con datos es la tarjeta del feed, y lee publicaciones REALES.
- [ ] **Escala: pendientes de la auditoría 2026-07-29 (migración 0130 cerró lo crítico).**
  Lo ARREGLADO y verificado ya está en 0130 (geo indexado, guards de columnas,
  índices FK, orden determinista). Queda pendiente, por orden de impacto:
  1. **`properties_search` / `vehicles_search` usan `count(*) over ()`** para el
     total de resultados → obliga a materializar TODAS las filas que casan, aunque
     solo se devuelvan 100. A 1M de propiedades/autos cada búsqueda escanea todo.
     Además calculan `st_distance` sobre el conjunto completo (no tienen parámetro
     de radio, así que no aplica `st_dwithin`). Arreglo: contador estimado
     (`reltuples`/`EXPLAIN`) o tope ("+99 resultados"), y añadir radio opcional.
  2. **Paginación por OFFSET** en búsqueda/listados: `offset N` es O(N) — la
     página 500 lee 500 páginas. Migrar a keyset/cursor
     (`where (dist, id) > (last_dist, last_id)`) cuando haya volumen real.
     (0130 ya dejó el orden determinista, requisito previo para keyset.)
  3. **Bundle móvil**: `/negocio` (panel del dueño) pesa **482 kB** de First Load
     JS y `/negocios` 292 kB (medido en el build 2026-07-29). Los módulos del panel
     se cargan todos juntos; falta `dynamic()` por módulo. Afecta sobre todo a
     dueños en red lenta.
  4. **Catálogos sin paginación server-side** (tienda ~300 productos en un RPC,
     ya anotado): con miles de ítems hay que paginar en el servidor.
  5. **Realtime a escala**: revisar que las suscripciones filtren por fila/canal y
     no por tabla completa antes de crecer.
- [ ] **Verify Web Push on a real phone (2026-07-15, migration 0089).** The full
  server pipeline is built, deployed, and verified end-to-end *except delivery*:
  notification insert → `tg_push_fanout` (pg_net) → `send-push` Edge Function
  returned HTTP 200, the service worker registers, and the Settings card works.
  What the sandbox CANNOT do (same wall as Stripe): create a real browser push
  subscription and reach the push service (FCM/Mozilla). **Founder test:** open
  the site over HTTPS on your phone → Mi cuenta → Configuración → "Activar
  notificaciones" (grant permission) → place an order → advance it from Cocina
  (Confirmar → En camino → Entregado) → each step should pop a phone notification.
  Secrets already set on the project: `VAPID_PUBLIC_KEY/PRIVATE_KEY`,
  `VAPID_SUBJECT`, `PUSH_HOOK_SECRET`; `private.push_config` row inserted;
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` committed in `.env.production` (confirm it also
  reaches the Cloudflare build — it's a `NEXT_PUBLIC_*` read at build time).
  - **iOS caveat:** Safari only delivers Web Push to a PWA the user **added to the
    Home Screen** (iOS 16.4+). Android/desktop Chrome/Firefox work from the browser
    tab. A native FCM path (stack roadmap) can cover iOS-in-browser later.
  - **Portability (self-host):** the fan-out uses **pg_net** (Supabase extension).
    On self-hosted Postgres, drop `tg_push_fanout` and run a NestJS worker that
    LISTENs on `notifications` and calls web-push — table/RLS/subscriptions stay
    identical. Noted in `0089_web_push.sql`.
  - **Polish (deferred):** push `link` is generic `/cuenta`; deep-linking the tap
    straight to `?sec=pedidos&order=<id>` needs the order id in the notification
    `data` (today it carries `code`). Small trigger tweak later.
- [ ] **Real end-to-end testing.** Nothing here has been exercised against a
  live backend or real devices. Before launch, test on real phones:
  geolocation/GPS, iOS input auto-zoom, Supabase Realtime websockets (live
  likes/comments/new-post pill), the native Share sheet, and **photo upload**
  (compression + Storage). The sandbox cannot do any of these.
- [ ] **Rotate/secure secrets.** The Vercel token shared in chat during setup
  should be **revoked/rotated**. Never expose the Supabase DB connection string
  or service-role key. Keep only `NEXT_PUBLIC_*` (publishable) keys in the
  client build.
- [ ] **Self-hosting migration trigger** (from `CLAUDE.md` architecture
  decision): when Supabase + Cloudflare bills approach a Hetzner box + ops cost,
  move DB to **self-hosted Postgres + PostGIS** and introduce **NestJS**. Schema
  and frontend stay the same (`pg_dump`/restore). Avoid Supabase-proprietary
  features so this stays a restore, not a rewrite.

## 1. Scale (1M+ businesses / posts / users per month)

- [ ] **Realtime fan-out → per-city channels.** Today the community live layer
  uses **one global Supabase Realtime channel** (`tl-social` for likes/comment
  counts, `tl-comunidad-feed` for new-post INSERTs). Every client receives every
  event — fine for MVP, not for 1M+. Partition by **city/region** (or geohash)
  so a client only subscribes to nearby events. The scale note lives in
  `apps/web/src/lib/interactions.tsx` (lines 166-170); `screens/Comunidad.tsx`'s
  `tl-comunidad-feed` channel carries no such note yet.
- [ ] **Images → Cloudflare R2.** Photos upload to **Supabase Storage** now;
  move object storage to **Cloudflare R2** (free egress) at scale. Client-side
  compression stays identical; only the upload destination changes
  (`apps/web/src/lib/image.ts`).
- [ ] **Storefront catalog pagination (server-side).** The Tienda storefront
  (2026-07-15) fetches a store's whole catalog in one RPC
  (`business_products_by_slug`) and paginates client-side (24/page). Fine at
  hundreds of products (~300 verified); when real stores carry thousands, add
  keyset pagination + server-side search/filter to the RPC. The UI (search,
  category rail, sort, Ver más) won't need to change shape.
- [ ] **Feed thumbnails.** We currently generate **one ~1600px WebP** per photo
  and use it everywhere. Add a **~400px thumbnail** (also client-side) for the
  feed so lists load lighter; keep the 1600px for the detail view.
- [ ] **Compression in a Web Worker.** `compressImage` runs on the main thread
  (fine for a few photos). Move to a Web Worker for posts with many images so the
  UI never janks.
- [ ] **Search → Meilisearch.** Postgres full-text search now → self-hosted
  **Meilisearch** (OSS) at scale. Avoid paid Algolia.
- [ ] **Street-address geocoding — Pelias at/near launch (decided 2026-07-03).**
  The **city gazetteer is already owned** (Supabase `cities` +
  `search_cities`/`nearest_city`). Street addresses currently use a free 3-layer
  pipeline: **Photon** (streets/POIs, biased+fenced to the metro, US-only) +
  **synthesized house-number+street suggestions** + the **US Census Bureau
  geocoder** (official TIGER data — exact house-number match, "verified" badge,
  snap-on-pick, via JSONP since it has no CORS; free, no key) with graceful
  fallbacks; locality-aware (a typed city outside the metro → national search).
  **Nominatim** for GPS→address.
  - **Decision:** the free pipeline is good enough for dev + early testing;
    **don't pay for infra with no users yet.** The production answer is
    **self-hosted Pelias** (OpenAddresses + TIGER + OSM + WhosOnFirst, US-only
    build) — Google-class `/v1/autocomplete`, ours, no rate limits.
  - **Migration is a config flip, not a rewrite:** the app geocodes over HTTP.
    When we build it, put a **`NEXT_PUBLIC_GEOCODER_URL`** abstraction in
    `geo.ts` (Pelias adapter when set, current pipeline when empty) so launch =
    stand up the box + set one env var.
  - **Ops when we do it:** Hetzner ~16–32 GB box (**~€30–60/mo**, US-only fits),
    Docker Compose, a few hours to import, refresh data periodically, HTTPS +
    CORS behind Cloudflare. First "real server" of the project — not copy-paste.

## 2. Security, moderation & abuse (launch blockers)

- [ ] **Content moderation.** Post **reporting** now exists (per-post "…" menu →
  Report, stored in `post_reports`; authors can edit/delete their own posts —
  migration `0009`). Still missing before public launch: an **admin review
  dashboard/queue** for reports, **block user**, auto-hide on N reports,
  reporting for **comments**, profanity/abuse handling, and **image moderation**
  (photos are public). Still a launch blocker until the review side exists.
- [ ] **Rate limiting / anti-spam.** Posting, commenting, likes and uploads have
  no rate limits. Add throttling (Edge Function / DB) before opening signups.
- [ ] **Account verification.** Auth is **email + password with "Confirm email"
  turned OFF** for instant signup (chosen for velocity, no email deliverability
  dependency). Before launch decide the anti-fake-account path: enable email
  confirmation (needs **Amazon SES** for deliverability), and/or **WhatsApp OTP**
  (audience fits — Latinos use WhatsApp heavily).
- [ ] **Transactional email → ver el BLOQUEADOR detallado en §0** (2026-07-29).
  Sigue sin cablear y ahora se sabe que **bloquea el registro público**: sin SMTP
  propio, Supabase limita a 2 correos/hora y nadie puede confirmar su cuenta. Los
  pasos concretos de Amazon SES están en §0; este ítem queda como referencia
  cruzada para no resolverlo dos veces.
- [ ] **Supabase advisor: `rls_disabled_in_public` on `spatial_ref_sys`
  (known PostGIS exception — NOT a data risk).** The security-advisor email flags
  this table. Verified 2026-07-09: **every table holding user data already has RLS
  enabled with owner-scoped policies** (profiles/businesses/business_orders/
  payments/pending_purchases/user_addresses/notifications/… — checked the full
  `pg_class`/`pg_policies` list). The ONLY flagged table is **`spatial_ref_sys`**,
  a PostGIS system table of ~8,500 static EPSG map-projection rows — **no user
  data**. It's owned by `supabase_admin`, so we **cannot** self-remediate: enabling
  RLS fails (`must be owner of table spatial_ref_sys`) and revoking the `anon`
  INSERT/UPDATE/DELETE grant is a silent no-op (the grant was made by
  `supabase_admin`; our `postgres` role can't assume it — `pg_has_role` = false).
  Residual risk is low (an attacker with only the public key could delete/corrupt
  reference rows → break `ST_Transform`/geo, an availability nuisance, restorable;
  **no data leak**). **Do NOT click "Resolve issue" in the email** (act via the
  Supabase dashboard, not email links). Resolution options: (a) **dismiss** this
  finding in Supabase Security Advisor as a known PostGIS exception; (b) or open a
  Supabase support request to enable RLS / revoke on the extension table (needs
  their internal role); (c) heavier — move the PostGIS extension out of `public`
  into a `gis` schema (also needs elevated privileges; not worth it for reference
  data). Revisit if Supabase ships a way to lock it down.

### 2a. Code security audit (2026-07-14) — payments & RLS hardening before real-money launch

> Full audit of all 79 migrations, the 7 edge functions, `lib/stripe.ts`, every
> client write path, and committed secrets. **The foundation is strong:** every
> table has RLS enabled, no blanket `using(true)` write policies, no anon writes,
> service-role RPCs correctly `revoke`d from `public`, every `security definer`
> sets `search_path`, and the browser bundle + `.env.production` carry **only**
> public keys (service-role key confined to edge functions). Exposure is
> concentrated in **payments amount-trust** and a few **over-broad RLS write
> surfaces**. Most money-path items are in Stripe **test mode** today (no active
> real-money risk) but are inherent blockers before charging real cards. Fixes
> are drafted; apply on the founder's go-ahead (RLS ones are pasted migrations,
> edge-function ones redeploy via `deploy-fn.mjs`).

- [x] **C1 — Stripe webhook fails OPEN if the secret is unset. ✅ FIXED 2026-07-14.**
  Now fails **closed**: `if (!WHSEC) return 500` then always verify (stripe-webhook
  redeployed v8, `verify_jwt=false`). Verified: a forged event with an invalid
  signature is rejected `400`. Original finding:
  `supabase/functions/stripe-webhook/index.ts:159-162` only verifies the
  signature `if (WHSEC)`. The function runs `verify_jwt=false` (Stripe has no
  Supabase JWT), so an unset/typo'd `STRIPE_WEBHOOK_SECRET` skips verification
  entirely → an attacker can POST a forged `checkout.session.completed` (fulfill
  without paying) or `customer.subscription.updated` (grant premium free). **Fix:**
  fail closed — `if (!WHSEC) return 500` then always verify. *(2-line change,
  strictly safer; only precondition is that the secret is actually set in the
  function env — confirm before deploy.)*
- [x] **C2 — Marketplace ORDER total is trusted from the client. ✅ FIXED
  2026-07-14.** The order branch now **re-prices every line from authoritative DB
  prices** and ignores the client's `price`: each line carries a real
  `business_items` id + its structured add-on picks (`sel`), and the server
  recomputes `base + option prices` from the business's menu/product config
  (`buildPriceMap` mirrors `lib/live.tsx` for both `menu_config.mods` and
  `product_config.optionSets`; 86'd items excluded). Unknown id → `item_unavailable`,
  bad add-on ref → `bad_addon`. Client (`BizDetail`/`live.tsx`/`stripe.ts`) now
  sends `id`+`sel`; marketplace-checkout redeployed v7. **Verified end-to-end:** a
  tampered `price:0.01` order for a real $11.99 item + $2 add-on was charged the
  authoritative **$14.69** (1469¢), honest orders match, rejection cases fire, and
  a real-browser order sends `id`+`sel` and returns a checkout URL. (Booking/rental
  deposits — H3 — still client-supplied; separate item below.)
- [x] **H1 — `businesses` UPDATE policy is row-wide (self-grant tier/verified/
  rating/Connect). ✅ FIXED 2026-07-14 (migration 0081).** A `BEFORE UPDATE` guard
  trigger (`tg_businesses_guard_cols`) raises if a direct end-user write
  (`current_user in ('authenticated','anon')`) changes `tier/rating/reviews_count/
  owner_id/stripe_account_id/connect_charges_enabled/connect_details_submitted`.
  Every legitimate writer runs privileged (SECURITY DEFINER `apply_subscription`/
  `apply_connect_status`/rating-sync as `postgres`; webhook as `service_role`) so
  it passes. Verified via real PostgREST as the owner: `tier=premium` **blocked**
  (400), `connect_charges_enabled` flip **blocked** (value unchanged), a safe-column
  update **allowed**, and **review posting (rating sync) still works**. Original:
  *any* column via direct PostgREST (bypassing the app's client-only `WRITABLE`
  whitelist): `{"tier":"premium"}` unlocks the paid tier + "verified" badge for
  free, `{"rating":5.0}` defeats the review-integrity trigger, or flip
  `connect_charges_enabled`. **Fix:** enforce at the DB — a `BEFORE UPDATE` trigger
  that raises if a non-`service_role` caller changes `tier/rating/reviews_count/
  owner_id/stripe_account_id/connect_charges_enabled/connect_details_submitted`.
  *(Must be tested against `apply_subscription`/`apply_connect_status` — those run
  as service_role and must still pass — before shipping; RLS-sensitive.)*
- [x] **H2 — `event_tickets` INSERT policy lets any user mint confirmed tickets.
  ✅ FIXED 2026-07-14 (migration 0081).** Dropped both the direct `insert` **and**
  `update` policies (the update policy likewise let a holder reset `used_at` to
  re-use a scanned code). Creation/mutation stay via the SECURITY DEFINER RPCs;
  the `read` policy stays. Verified: a direct authenticated insert is now rejected
  `403`. Original finding:
  `0032_consumer_transactions.sql:89-90` (`with check (user_id = auth.uid())`) +
  `status` defaults `'confirmed'` + auto `code` → a user can insert tickets
  directly (`unit_price=0`, arbitrary `qty`/`tier_id`), bypassing
  `buy_event_tickets_multi` (the only place capacity/price/oversell is enforced).
  **Verified 2026-07-14: the app buys tickets ONLY via the `buy_event_tickets*`
  RPCs — never a direct insert** — so dropping the direct INSERT policy is safe
  and non-breaking. **Fix (ready):** `drop policy "insert event_tickets" on
  public.event_tickets;` (creation stays via the security-definer RPCs).
- [x] **H3 — Booking/rental checkout amount trusted from client. ✅ FIXED
  2026-07-14.** Both branches now **re-price from DB** and ignore `subtotal`:
  - **Booking:** `total = (persona ? price×party_size : price) + Σ allowed add-on
    prices`, loaded from `business_services_by_slug` (service by id + service_config
    add-ons). Requires `deposit=true`; unknown service → `item_unavailable`, bad
    add-on → `bad_addon`. The authoritative deposit overwrites `payload.deposit`.
  - **Rental:** `fee = unitFee(hour/day/week rates from DB) × units + Σ add-on
    prices`; the day **span is re-derived from the authoritative start/end dates**
    (weekly rate auto-applies at 7+ days) so a client can't pay 1 day and block 30.
    Deposit still collected at pickup.
  Client (`BizDetail`/`stripe.ts`) sends structured inputs (`party_size`/`mode`+
  `hours`+`units`+`addon_ids`). marketplace-checkout redeployed. **Verified E2E**
  against real service/rental config: tampered `subtotal:0.01` booking charged the
  authoritative **$26.25**, a 3-day×2-unit+add-on rental charged **$36.75**, and
  bad-add-on / fake-item rejected.
- [x] **M1 — Direct COD order/booking/rental insert (client controls total/status/
  target business). ✅ FIXED 2026-07-14 (migration 0083).** COD is paid in cash in
  person (the owner is the amount backstop), so the fix targets the real harms —
  status tampering + spam — without disturbing the working direct-insert flow:
  - The three customer INSERT policies now `with check` **force the initial status**
    (`new`/`pending`) and **bound the money columns** to `[0, 100000]`; the owner
    (manual-entry) branch is unchanged.
  - A per-user **hourly rate-limit trigger** (`tg_cod_ratelimit`, SECURITY INVOKER
    so `current_user` reflects the caller) caps a customer at **30 orders/hour** per
    table; owner/service-role inserts are exempt.
  - Added `(user_id, created_at)` indexes on all three tables.
  **Verified against live PostgREST:** a valid order inserts; `status=completed` and
  an over-cap total are both rejected `403`; the 31st order in an hour is blocked
  `400`. Full re-pricing of COD lines was deemed unnecessary (cash backstop);
  per-user *volume* limiting for posts/likes/uploads still rolls up under §2 "Rate
  limiting / anti-spam".
- [x] **M2 — Open redirect via client-supplied `origin` in Stripe return URLs.
  ✅ FIXED 2026-07-14.** All four functions (marketplace-checkout, stripe-checkout,
  stripe-portal, connect-onboard) now route `origin` through a shared `safeOrigin()`
  allowlist — only `tolatino.vercel.app`, `localhost`/`127.0.0.1` (dev), or an
  optional `SITE_ORIGIN` env host are echoed; anything else (incl. `evil.com`,
  `*.vercel.app` previews, `tolatino.vercel.app.evil.com`, `javascript:`) falls back
  to the default. Redeployed. Verified: unit-tested the allowlist + an `evil.com`
  order still returns a valid checkout URL with the redirect neutralized. Add a
  custom prod domain later via the `SITE_ORIGIN` function env var.
- [x] **M3 — `profiles` public read exposes every user's precise coordinates.
  ✅ FIXED 2026-07-14 (migration 0082).** Replaced the `using(true)` SELECT policy
  with **self-read-only** (`using (id = auth.uid())`). Nothing needs other users'
  profiles — post author display is denormalized on posts, and every
  profile-reading function is SECURITY DEFINER. Verified: the owner still reads
  their own profile (incl. coords); another user's profile and an anon table read
  both return empty; the community feed (posts) is unaffected. If a "view a
  neighbor's public profile" feature is added later, expose only display fields via
  a SECURITY DEFINER RPC — never re-open the table.
- [x] **M4 — Temporary `admin-diag` edge function has refund/forge power. ✅ FIXED
  2026-07-14 — DELETED.** The function (deployed + `supabase/functions/admin-diag/`)
  was removed entirely; it was an unused sandbox debug tool. If Stripe diagnostics
  are ever needed again, restore from git history and pin `verify_jwt=true` +
  verify the JWT signature in-function.
- [x] **M5 — Webhook accepts replays (no timestamp tolerance). ✅ FIXED 2026-07-14.**
  `verifySig` now rejects if the signed timestamp is more than 300s from now
  (Stripe's own tolerance) before checking the HMAC. Redeployed; a forged event is
  still rejected `400`.
- [ ] **L1 — Anon metric inflation** (DEFERRED — needs shared anti-spam infra, not
  a point fix). `track_listing_view`/`track_search_appearance` are anon-callable
  with no dedup (`0079:38,64`) — anyone can inflate a business's view/search
  counters. Real mitigation needs **IP/edge-level rate limiting** (the RPC has no
  session for an anon caller), so it belongs with the broader "Rate limiting /
  anti-spam" item in §2 rather than a standalone SQL change. Not urgent: these
  counters are analytics only and drive no billing today. Close before they inform
  pricing/ranking. (The authenticated action signals — saves/calls/directions —
  are already session-rate-limited.)
- [x] **L2/L3 — Non-column-scoped self-update policies. ✅ FIXED 2026-07-14
  (migration 0084).**
  - **L2:** a `BEFORE UPDATE` guard (`tg_txn_customer_update_guard`, SECURITY
    INVOKER) lets a customer update their own `business_orders`/`bookings`/`rentals`
    only to **cancel** (`status → 'cancelled'`) and blocks changes to
    `total`/`deposit`/`business_id`/`user_id`. Owner updates are exempt.
  - **L3:** column-level UPDATE grants — `authenticated` may update only
    `notifications(read)` and `business_conversations(unread, customer_unread)`;
    the SECURITY DEFINER `bump_conversation()` is unaffected.
  Verified: a customer marking their order `completed` or changing `total` → `400`;
  cancelling → allowed; marking a notification `read` → allowed but changing its
  `link` → `403`; changing a conversation's `business_id` → `403`.
- [ ] **L4 — `.env.production` is git-tracked** (public anon + publishable keys
  only — **safe by design, NOT a vulnerability**; verified the file holds no secret
  keys). Left as-is deliberately: the file's `NEXT_PUBLIC_*` values are needed at
  build time and `.gitignore`-ing it would require wiring them into the Cloudflare/
  Vercel build env, a change with deploy risk and no security benefit. Revisit only
  if a non-public value is ever added — then move it to host-injected env.

## 3. Incomplete / stubbed features

- [ ] **Rental cart — finer availability + hour mode (2026-07-16).** ~~(a) online
  multi-item payment~~ — **DONE 2026-07-16 (0099)**: `marketplace-checkout`
  (kind=rental + `lines[]`) re-prices every cart line server-side (day/week rate ×
  re-derived span × qty) + order-level extras by id, one PaymentIntent for the
  summed fee inside our CheckoutSheet; `stripe-webhook` routes `payload.order` to
  `fulfill_rental_order` → confirmed+**paid** order (paid flag surfaced in Mi
  cuenta + panel: "renta pagada en línea — solo cobra el depósito al entregar").
  Deposit stays at pickup (canonical rule #4).
  ~~(b) Per-item availability in the cart~~ — **DONE 2026-07-16 (0100)**:
  `rental_busy_by_slug` feeds real availability; each item shows "Agotado para esas
  fechas" / "Solo N disponibles" for the chosen range, steppers cap at what's free,
  the calendar greys days that would over-book a cart item, and BOTH write paths
  guard server-side (`create_rental_order` raises `overbooked`; `marketplace-checkout`
  returns `unavailable` before charging) via `rental_peak_booked`. Still pending:
  (c) **Hour-mode rentals** — the cart is day-based; hourly rentals (e.g. a 4-hour DJ
  rig) need an hour toggle at cart level.
  Residual: a true simultaneous online-pay race for the last unit is still possible
  (checked pre-charge, not locked); rare, and the webhook's refund-on-fulfillment-
  failure path covers it. Add a row lock if it ever bites.
- [ ] **Business-listing events are owner-scoped, not per-business (2026-07-15).**
  The `events` table keys on `owner_id` only (no `business_id`), so the consumer
  listing's Eventos tab (`fetchEventsByOwner(slug)` → `events_by_owner`) resolves
  the slug to its owner and returns **all that owner's events** — an owner with
  several businesses shows the same events on each of their listings. No business
  has the `events` module on today so nothing surfaces yet, but before enabling
  Eventos for a multi-business owner, add a `business_id` (or listing link) to
  `events` and filter the RPC by it. The tab is already gated on
  `modules.events === true && realEvents.length > 0` (active + content rule).
- [ ] **"Crear evento" form is a stub.** In `PublishModal.tsx` the event branch
  still just calls `setDone(true)` — it does **not** insert into `events`. Build
  real event creation (insert, geo, tickets, images). (Business publish is now
  real via `create_business`; community posts are real. The full multi-plan
  business onboarding at `/negocio/publicar` is still a separate stub flow.)
- [ ] **Precise address — delivery integration.** Phases 1 & 2 shipped: optional
  precise address (GPS / Photon), and a saved-addresses manager (`user_addresses`
  table, labels, default, add/rename/delete) that syncs for signed-in users and
  drives the geo origin; guests keep one address locally. Remaining: use the
  active address as the **delivery destination** at checkout (fees / ETA / "does
  this business deliver to me"), when the ordering flow exists.
- [ ] **Business publish — follow-ups.** `create_business` inserts a Free-tier
  listing with the category-gradient tile and the picked subcategories. Still
  TODO: real **address geocoding** (today it uses the city center or the owner's
  GPS pin), business **photos**, amenities capture, editing/deleting your
  own listing from the UI (RLS policies already exist), and the paid tiers
  (verified/premium).
  - [x] **Hours editor (2026-07-04).** `PublishModal` now has a mobile-first
    weekly **Horario** editor (`components/HoursEditor.tsx`): per-day Abierto/Cerrado,
    open/close selects, split slots ("Otra franja"), "Aplicar a toda la semana". It
    emits the exact `WeekHours` shape (`businesses.hours`, migration `0018`) and
    submits it as `p_hours`, so new listings get a real live open/closed status
    instead of `hours = null`. Optional — skipping it still falls back to `is_open`.
  - [x] **Feature picker (2026-07-04).** The publish form now collects **Características**
    (Sugeridos = `FEATURES_COMMON` + per-rubro `FEATURES_BY_CAT[cat]`, deduped) and
    submits the canonical es-labels as `p_features` (migration `0016`), so new
    listings are filterable in the Negocios directory the moment they're created.
  - ⚠️ **Both ride on the same blocking `0013`→`0018` batch** (see the blocking
    item below). `p_features`/`p_hours` only exist on the **16-arg `create_business`
    from `0018`**; the form now always sends them. Publish is already blocked until
    that batch is applied (`0013` is what creates `create_business` in the first
    place), so apply `0013`→`0018` **in full and in order** — a partial subset that
    stops before `0018` would make the publish RPC call fail to resolve (PostgREST
    can't match extra named args), not silently drop the fields.
- [ ] **Verified vs unverified listing tiers — claim/upgrade flow.** The Negocios
  directory now renders two card variants (`BizCardVerified` rich vs `BizCardBasic`
  simple + "Sin verificar" badge) and always ranks verified businesses on top
  (`vkey` sort in `Negocios.tsx`). "Verified" today just means `tier !== 'free'`.
  Still needed before launch: a **self-serve "¿Es tu negocio? Reclámalo / verifícate"
  flow** (claim an unverified listing, prove ownership, upgrade to Verified/Premium),
  and the paid-tier billing that gates it. Until then no owner can move their own
  listing from the basic card to the rich one.
- [ ] **Saved businesses — cross-city list.** The ♥ on a business now persists
  (`saved_businesses` table for signed-in users, migration `0017`; localStorage
  for guests; keyed by slug; guest saves merge up on login) and there's a
  "Guardados" toggle in Negocios. Limitation: that toggle **filters the current
  geo-scoped results**, so a saved business in another metro won't show while
  you're viewing a different city. Before launch, add a real saved list that
  **fetches the saved businesses by slug regardless of the active city** (a
  `businesses_by_slugs` RPC) so Guardados is truly global.
- [ ] **Push notifications.** Not built. Plan: **Web Push (VAPID)** for the PWA,
  **+ FCM** (free) for native later. Drives the "Alertas" tab and new-activity
  pings.
  - [ ] **Horario "Feriados y más" — day-before push reminder.** Holidays /
    vacations / special days are programmed in advance, so the owner should get a
    push **the day before** each one starts (and optionally the day of). Built
    **client-side today**: the dashboard **home** shows a `HoursReminders` banner
    for any `businesses.hours_exceptions` starting today/tomorrow (helper
    `upcomingExceptionReminders` in `lib/hours.ts`), dismissible via
    `localStorage`. That only fires **while the dashboard is open** — when Web
    Push lands, add a **scheduled server push** (Supabase Edge Function on a daily
    cron, or `pg_cron`) that scans `hours_exceptions` for start dates = tomorrow
    and pushes the owner, honoring the owner's notification prefs in
    `businesses.settings`. Reuse the same today/tomorrow window + copy as the
    banner. Also feed these into the header `Bell` count (currently a demo stub).
  - [ ] **Listados relacionados — cross-owner request notifications.** When a
    cross-owner link is requested (`business_relations` status `pending`,
    migration 0044), the TARGET owner only sees it in the Related module's
    "Solicitudes por aprobar" today — no push. When Web Push lands, notify the
    target owner on a new pending request, and notify the requester when it's
    approved/rejected. Feed both into the header `Bell` count.
- [ ] **i18n via next-intl.** Copy is bilingual today via inline `L('es','en')`
  + a global ES/EN toggle (works). `CLAUDE.md` targets **next-intl** — migrate
  when it's worth it (SEO/locale routing).
- [ ] **Payments.** Deferred to the transaction phase (event tickets, paid
  listings). Evaluate **Stripe** then; not needed for MVP discovery/listings.
- [ ] **Photo aspect ratio (cosmetic).** Feed photos are cropped **square**
  (Instagram-style). Optional: offer 4:5 or original-aspect. One-line change in
  `PostCard.tsx`.
- [ ] **Video in posts — DO NOT self-host raw.** Decision (2026-07-03): video is
  the #1 budget killer for a bootstrap — the cost is **egress**, not storage
  (each view streams the file; 1M short clips ≈ multi-TB storage + hundreds of TB
  egress). There is **no browser-side compression** equivalent to the photo
  pipeline (client transcoding via ffmpeg.wasm is heavy/unreliable on mobile).
  Plan, in order:
  1. **MVP/launch:** no native video upload.
  2. **Cheap, culturally-fit path (buildable now):** let users paste a
     **TikTok / YouTube / Instagram Reels** link → render the embed/thumbnail in
     the post. Hosting cost ≈ $0 (video stays on the source platform).
  3. **At traction, for native short video (≤30–60s):** use **Cloudflare Stream**
     (fits the Cloudflare stack — transcoding + adaptive bitrate + CDN +
     thumbnails, priced per delivered minute = predictable). Never DIY transcode
     on Supabase Storage.
  Also: video moderation is harder/costlier than images — another reason to
  defer past the moderation work.

## 3b. Business dashboard modules (new mobile handoff, 2026-07-03)

- [x] **Resumen (Inicio) del panel era 100% data demo en negocios REALES —
  RESUELTO (2026-07-12, flag HOME_V2).** El nuevo `DashboardHome.tsx` reemplaza
  `Insights.tsx`: un negocio real ve solo datos reales (pedidos/reservas/reseñas/
  mensajes/completitud), con estados vacíos honestos ("$0.00 · aún sin ventas
  hoy") y sin inventar descubrimiento. Demo sigue mostrando muestra. Reversible
  por flag.
  Pendientes relacionados (fases siguientes):
  - [~] **Estadísticas de descubrimiento — VISTAS + ACCIONES listas (Fase 3,
    2026-07-12/13, migraciones 0077 + 0078).** `business_metric_daily` +
    `track_listing_view` + `business_metrics`; cada apertura/acción de ficha
    cuenta (rollup diario, escalable); el Inicio muestra "Vistas de tu página ·
    7 días" real **+ la fila de acciones del cliente (Guardados · Cómo llegar ·
    Llamadas)** — el set clásico de Google Business. Cerrado desde la última
    revisión:
    - [x] **Acciones del cliente instrumentadas (2026-07-13):** `save` (♥ en
      BizDetail, solo al guardar, no al quitar), `direction` (tile "Cómo llegar"
      — ahora abre mapas de verdad, deep-link universal sin API key/cobro) y
      `call` (tile "Llamar" — ahora sí marca `tel:`). Se corrigieron dos tiles
      que antes no hacían nada (stubs).
    - [x] **Apariciones en búsqueda (`search`) — HECHO (2026-07-13, migración
      0079).** `track_search_appearance(slugs[])` batched (una llamada por
      búsqueda, un upsert masivo → escalable a 1M+/mo); instrumentado en
      `Negocios.tsx` (debounce 800ms + dedup por firma) cuando hay query o filtro
      de categoría; dueños de la ficha excluidos. Surface: fila **Alcance**
      (Búsquedas · Vistas) en la pestaña Estadísticas. Verificado E2E (RPC:
      owner-excl + batch + no-owner; y el cliente dispara la RPC al buscar).
    - [x] **Auto-vistas del dueño excluidas (2026-07-13, migración 0078):**
      `track_listing_view` retorna temprano si `auth.uid()` = `owner_id`. Ya no
      infla las estadísticas cuando el owner abre/prueba su propia ficha.
      Verificado E2E (owner no cuenta; comprador anónimo/autenticado sí).
    - [~] **Anti-inflación:** rate-limit **por sesión** hecho (2026-07-13) — las
      ACCIONES (save/direction/call) se deduplican por sesión (sessionStorage, 6h)
      para que un tap repetido no infle; las VISTAS siguen contando siempre
      ("cada vista cuenta", regla del founder). **Falta (infra a escala):** filtro
      de bots/crawlers y rate-limit por IP a nivel edge (Cloudflare bot score /
      rate-limiting) — no fakeable en app; entra cuando haya tráfico real.
    - [x] **Zona horaria — HECHO (2026-07-13, migración 0079):** se añadió
      `businesses.timezone` (default `America/Chicago`, editable); `track_listing_view`,
      `track_search_appearance` y `business_metrics` bucketan/filtran por la zona
      del negocio (`now() at time zone …`), y el Inicio + Estadísticas construyen
      las series con `tzDayKeys(tz)`. Server y cliente coinciden exactamente (sin
      corrimiento en el borde). Verificado (`buckets_match=true`).
    - [x] **Pestaña "Estadísticas" dedicada — HECHA (2026-07-13).**
      `Estadisticas.tsx` bajo "Cómo te encuentran": selector de rango 7/30/90 días,
      Interacciones totales + tendencia vs periodo anterior + gráfica de área,
      grid de acciones (Vistas/Guardados/Cómo llegar/Llamadas) con delta +
      sparkline c/u, Reputación, y Ventas (vendedores) desde `business_orders`.
      Todo real (business_metrics 0077/0078 + orders/reviews); demo muestra
      muestra; vacíos honestos. Verificado E2E (móvil + escritorio, cambio de
      rango, datos reales). **Decisión pendiente con el founder:** ¿gate por plan?
      Hoy está **abierta a todos los planes** (como Google Business Insights, y
      porque "el listado es el master" — ver quién te encuentra es el gancho). Si
      se quiere monetizar analítica avanzada (comparativas de mercado, export,
      rangos largos), definir qué queda en Free vs Premium.
  - [x] **Controles muertos del header del panel — RESUELTO (Fase 1b,
    2026-07-12).** El buscador ahora es un "ir a" real (filtra los destinos del
    nav y navega); la campana abre un dropdown de **Avisos reales** (pedidos
    nuevos · reseñas sin responder · mensajes sin leer, con badge y links);
    "Ver listado" → **"Ver mi página"** va a `/negocios?b=<slug>` (tu propia
    ficha); y en Free el bottom-nav "Pedidos" ahora respeta el candado (lleva a
    facturación). Verificado en navegador (`shoot-header.js`).
  - [x] **Default de módulos para listados nuevos — HECHO (2026-07-13, decidido
    con el founder).** Un negocio real ahora arranca **LISTING-ONLY** (venta
    apagada; `LISTING_ONLY_MODS` en `Panel.tsx`, con `updates`/`staff` en su
    default previo — solo se apaga el comercio). El demo sigue mostrando todo.
    El sidebar de un negocio nuevo colapsa a **"Activar ventas"** en vez de la
    lista larga. La pantalla **"Configurar módulos" se rediseñó** como activador
    guiado (`ModulesSetup.tsx`): enmarca "tu página ya está publicada ✓, vender es
    opcional", recomienda el canal según el rubro (★), explica qué añade cada
    módulo, y aclara que Pedidos/Entregas/Pagos se activan solos. **Migración de
    datos:** a los negocios existentes con catálogo real hay que fijarles sus
    módulos para no ocultar contenido — hecho para El Sabor (`modules={menu:true}`).
    - [ ] **Pendiente menor:** El Sabor tiene un producto suelto de prueba
      ("Carro electrico", $25, creado 2026-07-09) — su módulo Productos quedó
      apagado (no se muestra), pero el registro sigue en `business_items`. El
      founder decide si borrarlo. Y al abrir a más negocios reales, derivar sus
      módulos de su contenido (business_items/events) en una migración de datos.

The founder delivered a **mobile business-dashboard handoff** (shell + 9 modules,
`handoff_business_mobile/`). The shell + Inicio/Insights home already exist at
`/negocio` (plan- & rubro-aware, responsive to desktop). Now replacing the
uniform `GenericTab` with each module's **rich** screen, one at a time, in the
handoff's build order. Each is mobile-first and expanded to desktop.

All 9 module screens are **built, wired into `/negocio`, and pass the production
build** (each mobile-first + expanded to desktop, Spanish-first, tokens only,
real interactive state). Content is demo/fixture data — the remaining work is
backing them with real Supabase tables/RPCs when each feature goes live.
- [x] **Updates / Novedades** — composer (type chips + photo/video/offer +
  Borrador/Programar/Publicar), sub-tabs with live counts, post cards
  (live stats / per-status actions), perf + recent-followers rail.
- [x] **Billing** — Plan / Comparar / Pagos / Facturas; upgrade + cancel sheets; tier-aware.
- [x] **Customers / Orders / Reviews** — mode toggle + segments + order pipeline (advance) + AI-draft reply.
- [x] **Staff / Jobs** — roster, schedule (gantt), attendance, payroll, roles matrix; job pipeline. Free gates Horario/Asistencia/Nómina + 2-member cap.
- [x] **Rental** — items/availability, calendar, deposits, damages, pricing; rent-out + return/refund flows; add-item wizard.
- [x] **Events & Tickets** — upcoming/drafts/past/recurring/promoters, manage detail (check-in QR), 4-step add-event wizard.
- [x] **Products** — catalog/inventory/variants/collections/discounts; 4-step add-product wizard. (Delivery/shipping moved to the shared **Entregas y envíos** module — see below.)
- [x] **Services & Bookings** — catalog + bookable/inquiry toggle, reservations (calendar/tables/list/rules); 4-step add-service wizard.
- [x] **Food menu** — 7 sub-tabs (Platillos/Categorías/Modificadores/Horarios/Promociones/Alérgenos/Stock-86) + 6-step add-item wizard with live preview.
- [x] **Food menu — FULL admin (2026-07-06).** Every sub-tab is now real CRUD:
  items (create/edit/duplicate/delete → `business_items` kind='menu'), categories
  (create/edit/reorder/hide/delete-guarded), reusable modifier groups
  (single/multi, required, priced options, duplicate), dayparts, promotions
  (4 types + pause/activate/schedule), allergen matrix (tap-to-cycle, persisted
  per item), stock automation — structure persisted in `businesses.menu_config`
  (migration 0045). The public listing's **Menú tab renders the real menu**
  (grouped by the owner's categories, per-item option pickers from their
  modifier groups, active promo on the hero). Deferred:
  - [x] **Promo redemption analytics + checkout (2026-07-14)** — the Promociones
    hub (Premium) manages promos across Menú/Servicios/Renta/Tienda with REAL
    redemption counts (`owner_promo_stats`), and coded `%` promos apply at the
    cart/booking/rental checkout, server-validated business-absorbed
    (`check_promo` + `marketplace-checkout`, migrations 0086–0088).
  - [ ] **Shop (Tienda) coded discounts don't redeem at the order cart yet.**
    The hub can create Tienda `%`/`$`/envío codes (`product_config.discounts`),
    but the order cart's promo field + `marketplace-checkout` order branch only
    validate `menu_config.promos` (scope=menu). For a products-only business, a
    Tienda CODE therefore won't discount at checkout (auto discounts unaffected).
    Pre-existing (predates the hub). Close by giving the shop cart a
    `scope='shop'` promo path (`check_promo` already routes menu/service/rental;
    add `shop`→`product_config.discounts`) + apply it in the order branch when the
    cart is products-only. Until then the hub's Tienda codes are management-only.
  - [x] **Item photos (2026-07-06)** — real uploads via the shared image
    pipeline (client WebP + EXIF strip, 1200px edge) → `business_items.
    image_url`; wizard uploader with drag&drop/change/remove, edit-page
    change/remove, thumbnails on admin cards + the public menu card & modal.
  - [x] **Menu mode: display-only vs online orders (2026-07-06)** —
    `menu_config.ordering` (default FALSE = showcase). Dashboard toggle on the
    Platillos tab; the public Menú tab hides the +/Pedir buttons + cart and
    shows a "Menú informativo · Llamar" note when ordering is off. NOTE: online
    ordering itself is still not transactional (no payments/delivery) — turning
    it on today only surfaces the order buttons (orders create a record via
    myActivity). Wire real checkout/payments before promoting "Online orders".
  - [ ] **Daypart/schedule enforcement on the public menu** — per-item
    sched/days + dayparts are stored but the public Menú shows all published
    items regardless of the hour; filter by active daypart when it matters.
  - [ ] **Wizard "Programar" publish option** publishes immediately (only
    "Guardar borrador" hides); add real scheduled publishing later.
- [x] **Servicios — FULL admin (2026-07-06).** Replicated the Food treatment for
  bookable services (peluquería, carwash, tastings, classes, catering, etc.).
  Two top-level modes: **Servicios** (catalog + Categorías + Add-ons sub-tabs)
  and **Reservas** (manage bookings). Real CRUD: services (create/edit/duplicate/
  delete-confirmed → `business_items` kind='service'), categories (create/edit/
  reorder/hide/delete-guarded), reusable **add-ons** (priced extras, used across
  services). Shared **5-step wizard** (Detalles → Precio → Add-ons → Reserva →
  Revisar) for create AND edit, with live preview, service photos (shared image
  pipeline → `business_items.image_url`), price type (fijo/por persona/cotizar),
  duration, deposit toggle, bookable-vs-inquiry, capacity + available days.
  Structure persisted in `businesses.service_config` (migration **0046**). The
  **Reservas** mode reads real `business_bookings` (0027) with KPIs, a status
  filter and per-booking actions (confirmar → iniciar → completar / cancelar).
  The public listing's **Servicios tab renders the real services** (grouped by
  the owner's categories, add-on picker + per-person party size + deposit summary
  in the booking sheet). Deferred:
  - [x] **Service mode: display-only vs online bookings (2026-07-06)** —
    `service_config.booking` (default FALSE = showcase). Dashboard toggle on the
    Catálogo tab; the public Servicios tab hides the Reservar button and shows a
    "Servicios informativos · Llamar" note when booking is off. Per-service
    `bookable` still distinguishes Reservar (appointment + time slot) from
    Consultar (inquiry lead, no time slot) when booking mode is ON.
  - [ ] **Reservations pass — do it when Stripe/payments land (founder decision,
    2026-07-06).** The booking flow works end-to-end (create/manage bookings,
    deposit toggle, estimated total + deposit summary) but **no money moves**:
    the computed deposit is stored on the booking, not charged. When the payment
    system (Stripe or chosen gateway) is in place, do a proper refinement pass on
    reservations — actually charge/hold deposits, partial-deposit %, refunds/
    cancellation policy, and confirm-on-payment. Do NOT promote "paid deposits"
    until then.
  - [ ] **Availability/day enforcement.** Per-service available days + capacity
    are stored and shown, but the public date/time picker offers fixed sample
    slots (`SVC_DATES`/`SVC_TIMES`) regardless — generate real slots from the
    business hours + service days/capacity when scheduling matters.
  - [ ] **SMS reminders & auto-deposits** (Premium teaser in the module) — build
    when the notifications + payments phases land.
- [x] **Productos — FULL admin (2026-07-06).** Same treatment as the Food menu.
  Products live in `business_items` (kind='product'); the structure (categories,
  reusable option sets/variants, curated collections, discounts, sell mode) lives
  in `businesses.product_config` (migration **0048**). Sub-tabs, all real CRUD:
  **Catálogo** (product cards → shared **5-step wizard** Detalles → Precio →
  Variantes → Inventario → Revisar, for create AND edit, with live preview, real
  **photo upload** → `business_items.image_url`, compare-at/sale price, duplicate,
  delete-confirmed), **Categorías** (create/edit/reorder/hide/delete-guarded),
  **Variantes** (reusable option sets → sellable-variant count), **Colecciones**
  (curated groups with a featured flag + member picker), **Descuentos** (code/
  %/$/free-ship/BOGO, auto-apply, active/paused), and **Inventario** (real KPIs +
  stock from the catalog). A **"Modo de la tienda"** toggle (Solo catálogo vs
  Vender en línea) persists `product_config.selling`. The public listing's
  **Tienda tab renders the real shop** (grouped by the owner's categories, per-
  item option/variant picker, featured collections as a strip); display-only mode
  hides the +/cart and shows a "Catálogo informativo · Llamar" note. Delivery/
  shipping stays in the shared Entregas module. Deferred:
  - [ ] **Selling is not transactional.** "Vender en línea" surfaces the cart/+
    buttons (orders record via myActivity) but there's no payment/checkout — wire
    real checkout + payments before promoting online selling. Same status as the
    Food menu's online-ordering.
  - [ ] **Variant-level stock/price.** Option sets define sellable variants and
    per-value price deltas, but per-variant inventory (stock by SKU combination)
    is not tracked yet — product-level stock only. Add a variant matrix when
    inventory-by-variant matters.
  - [ ] **Discount redemption + cart application.** Discounts are managed (code/
    type/auto/status) and shown, but redemption analytics and applying them to
    cart pricing at checkout land with the transaction phase.
  - [ ] **Collections on membership sync.** A collection stores member product
    ids; if a product is deleted its id can linger in a collection (harmless —
    the public strip only shows the collection name). Prune on delete later.
- [x] **Renta — FULL admin (2026-07-06).** Same treatment as Servicios. Rental
  items live in `business_items` (kind='rental'); the structure (categories,
  reusable priced add-ons, rental mode) lives in `businesses.rental_config`
  (migration **0050**). New `lib/rentalConfig.ts` + `RentalEditors.tsx`
  (RentalCategoryEditor + RentalAddonEditor) mirror the service versions. Two
  top-level modes:
  - **Artículos** — sub-tabs **Catálogo** (item cards grouped by the owner's
    editable categories → shared **5-step wizard** Detalles → Tarifas → Extras →
    Políticas → Revisar, for create AND edit, with live preview, real **photo
    upload** → `business_items.image_url`, hour/day/week rates + deposit, tags,
    add-ons, waiver policies, duplicate, delete-confirmed; tapping a card opens
    the item detail with **Rentar** (walk-in rent-out flow) + **Devolver**
    (condition-check refund flow) + **Editar**), **Categorías** (create/edit/
    reorder/hide/delete-guarded), **Extras** (reusable priced add-ons: entrega,
    montaje, seguro…), **Políticas** (managed reusable rental terms — exención/
    depósito/cargo/seguro — full CRUD, each item toggles which apply; also
    creatable inline from the wizard), and **Precios** (rate overview). A **"Modo del listado"**
    toggle (Solo mostrar vs Aceptar rentas) persists `rental_config.renting`.
  - **Rentas** — operations: **Solicitudes** (real `business_rentals` requests
    with status progression), **Calendario**, **Depósitos**, **Daños**.
  - The public listing's **Renta tab renders real items** (`fetchBusinessRentals`
    → `business_rentals_by_slug`, migration 0050 — RPC includes `price`), with the
    Rentar sheet; display-only mode (renting off) hides Rentar and shows a "llama
    o visita para rentar" note. The item card tap → detail keeps the RentOut/Return
    ops (a superset of the Servicios tap→edit — Editar lives in the detail).
  - The consumer **Rentar sheet is a real month calendar** (2026-07-07): navigate
    months, pick a single day or a **start→end range** (day-count drives the fee;
    weekly rate auto-applies for 7+ day spans), or **by-hour** when the item has an
    hourly rate. Days are gated by the item's **availability config** (Siempre /
    Entre semana / Fines de semana / 48h aviso) + never past — carried to the
    consumer as `PubRental.avail`. Replaced the old hardcoded 5-chip date fixture. Deferred:
  - [ ] **Renting is not transactional.** "Aceptar rentas" surfaces the Rentar
    flow (requests insert via `business_rentals`) but there's no deposit charge /
    payment — wire real checkout + deposit holds with the payments phase (same
    status as Servicios bookings / online ordering).
  - [ ] **Ops panes (Calendario / Depósitos / Daños) are still sample data.**
    Solicitudes is real (`business_rentals`); the calendar, deposit ledger and
    damage log are illustrative fixtures — back them with real
    rentals/deposits/damage rows when the rental transaction loop is built.
  - [x] **Availability truth — no double-booking (2026-07-07).** The Rentar
    calendar now greys out (struck-through, non-selectable) days already booked to
    capacity: each rental request stores `item_id` (migration **0051**) and the
    consumer reads busy date-ranges via `rental_busy_by_item` (SECURITY DEFINER
    RPC → dates + qty only, no customer data; `business_rentals` RLS stays locked).
    A day is blocked when booked units ≥ stock. Plus the availability rule
    (weekday/weekend/48h) + past. Remaining refinements (deferred):
    - [ ] **Per-day-per-qty precision.** A day is blocked only when FULLY booked;
      it doesn't yet check that a multi-unit request fits every day of a range
      (e.g. 2 of 3 units taken, renter wants 2). Fine at low volume.
    - [x] **Productos: stock enforced on the consumer (2026-07-07).** The public
      shop reads each product's `stock` (business_items.attrs) → out-of-stock
      shows "Agotado" and blocks add/order/open; low stock (≤5) shows "Quedan N";
      the cart is capped at available units (simple + variant items). Product-level
      stock only — per-VARIANT (SKU) stock is still deferred. `stock` defaults to 0
      so sellers must set it (add an "untracked inventory" opt-out later).
    - [x] **Reservas: session capacity enforced (2026-07-07).** A bookable
      service's per-session capacity (from the `capacity` range, e.g. '8–16'→16)
      is now respected: each booking stores `service_id` (migration **0052**) and
      the booking sheet reads per-day seat load via `booking_load_by_service`
      (SECURITY DEFINER RPC → day + seats only, no PII). A full day shows "Lleno"
      + is disabled; ≤3 remaining shows "N libres". party_size counts toward the
      seat total. Deferred: real time-SLOT scheduling (the times are still fixture
      slots — capacity is enforced per DAY, not per time-slot) and per-variant SKU
      stock for products.
- [x] **Real reviews — persisted + rating sync (2026-07-07).** "Escribir reseña"
  only added to local state before; now reviews persist and drive the rating.
  Migration **0056**: `reviews.user_id` + a unique (business_id, user_id), author
  self-service RLS (insert/update/delete own), a `post_review` RPC (upsert one
  review per user per business), a `reviews_by_slug` RPC for the listing, and a
  **trigger that keeps `businesses.rating` (avg) + `reviews_count` in sync** on
  every review change (so cards/search stay accurate). BizDetail loads the real
  reviews (fixtures fallback when none) and "Publicar reseña" persists via
  `post_review` (auth-gated → /entrar) with optimistic add + refetch. Verified:
  a persisted review not in the fixtures renders in the Reseñas tab, 0 pageerrors
  / 0 overflow. Deferred: photo reviews, helpful-vote persistence,
  verified-purchase badge, moderation.
- [x] **Owner reply shown on the public listing (2026-07-07).** The owner could
  already reply to a review from the dashboard (`reply_es`/`reply_en`/`replied_at`,
  migration **0023**), but `reviews_by_slug` never returned those columns so the
  response never reached the consumer. Migration **0057** widens `reviews_by_slug`
  to include the reply; BizDetail renders it under the review as a purple-accented
  "Respuesta de {negocio} · {fecha}" block (design tokens, ES/EN). Table-stakes for
  a trustworthy listing (Yelp/Google both show it). Verified with an RPC intercept:
  the reply block renders and no h-overflow at 392px.
- [x] **Real time-slot booking (2026-07-07).** The Servicios booking sheet offered a
  fixed 4-time list (9/12/3/6) regardless of when the business is open. Now the time
  slots are generated from the business's **real open hours for the chosen day ×
  the service's duration** (`bookingSlots` in `lib/hours.ts`, using the same
  `effectiveIntervals`/exception logic that drives the open/closed badge). Slots
  that fit fully before close; on "today", slots already in the past are dropped;
  a closed day shows "Cerrado ese día — elige otra fecha" and blocks submit; the
  first slot auto-selects and the picked minute flows into the booking's real
  start datetime. No hours configured → falls back to the old fixed list so booking
  still works. No migration (client-side off existing `businesses.hours`). Verified:
  26 real slots render off fixture hours, 0 pageerrors / 0 overflow at 392px; logic
  unit-checked (stepping, past-slot filter, closed-day). Deferred: **per-slot**
  capacity (today capacity is per-day via 0052) — disable an individual time once
  it's fully booked; staff/resource-aware scheduling.
- [x] **Photo reviews (2026-07-07).** The last piece to reach review parity with
  Yelp/Google/DoorDash and the strongest trust signal a listing carries. Migration
  **0058**: `reviews.photos text[]`; `post_review` gains an optional photo-URL array
  (caps at 6; the old 3-arg overload is dropped so a 3-arg call isn't ambiguous —
  42725); `reviews_by_slug` returns `photos` (dropped+recreated because adding a
  return column can't be done with CREATE OR REPLACE — 42P13). Reviewers upload in
  the "Tu reseña" sheet (compress→WebP→own uid folder via the existing `post-photos`
  bucket + `uploadPostImages`; **no new bucket/policy**), see thumbnail previews with
  remove, and the sheet shows a "Publicando…" busy state during upload. The reviews
  list renders a horizontal thumbnail row under each review body. Verified with an
  RPC intercept: 3–4 thumbnails render + the picker shows, 0 pageerrors / 0 overflow
  at 392px. Deferred: full-screen photo lightbox; per-photo moderation.
- [x] **Per-slot booking capacity (2026-07-07).** 0052 exposed seat load per DAY, but
  capacity is "seats per session" (a session = a time slot), so three bookings in
  different slots wrongly marked the whole day full. Migration **0059** regroups
  `booking_load_by_service` by the exact slot timestamp (drop+recreate — return type
  changed, 42P13). The booking sheet now disables only the slots actually at capacity
  ("Lleno"), shows "N libres" when ≤3 seats remain, auto-selects the first open slot,
  greys a date only when EVERY slot that day is full, and blocks a full-slot submit.
  Slot↔booking matching is by **epoch(ms)** (a timestamptz round-trips as a different
  string than toISOString) — unit-verified. Still SECURITY DEFINER, no customer data.
  Verified: mocked service (cap 2) + a full-slot load → 5 "Lleno" disabled slots,
  first open slot auto-selected, 0 pageerrors / 0 overflow at 392px; consumer audit
  0/20. Deferred: staff/resource-aware capacity (multiple providers per slot).
- [x] **Per-variant / SKU stock (2026-07-07).** A product with a size/color axis had
  ONE stock number for all variants — now each sellable variant (cartesian over the
  product's SINGLE option sets) carries its own count. **No migration** (stored in
  `business_items.attrs.variantStock`, keyed `setId:idx|…` — the SAME key the consumer
  builds from its selected options, via the shared `variantCombos` in productConfig).
  Dashboard (Products wizard → Inventario): when a product has ≥1 variant axis, the
  single stock field is replaced by a **per-variant stock grid** (each combo → a qty
  input), and the product-level `stock` becomes the sum (so catalog pills + product
  gating stay correct). Consumer (item sheet): a variant value that would make the
  selection out of stock shows "Agotado" + is disabled + struck through; the sheet
  opens on the first in-stock variant; qty is capped at the picked variant's stock;
  "Solo N disponibles" hint; Add blocks/greys when the variant is sold out. Falls
  back to product-level stock when a product isn't per-variant tracked. Verified:
  mocked shop (Talla S/M/L, M=0) → M disabled+"Agotado", S auto-selected, 0 overflow;
  dashboard audit + consumer audit green; tsc + build. Deferred: per-variant SKU codes
  + price overrides; low-stock alerts per variant; hide-out-of-stock automation.
- [x] **Header search suggestions → server FTS (2026-07-07).** The global header's
  live-suggestions dropdown filtered only the loaded ~50-business geo slice, so a
  business beyond the radius showed "no results" in the preview even though the
  committed Negocios search (server FTS) would find it. The Negocios suggestion group
  now calls the same `search_businesses` RPC (debounced 220ms, geo-scoped), falling
  back to the client substring filter when empty/offline. Eventos/Comunidad stay
  client-side (small datasets). Fully closes the Handoff "global search with grouped
  live suggestions" rule. Verified: an RPC-intercepted full-catalog business (not in
  the client slice) appears in the dropdown, 0 pageerrors / 0 overflow.
- [x] **Realtime status on Mi cuenta (2026-07-07).** The customer's orders/bookings/
  rentals/tickets/RSVPs now update the instant the owner advances a status — not on
  the next reload. `MyActivityProvider` subscribes (one channel, `user_id`-filtered)
  to the five transaction tables and calls `refresh()` on any change, reusing the
  proven realtime pattern from notifications.tsx. Migration **0060** publishes the
  five tables to `supabase_realtime` (idempotent, guarded like 0007/0053/0054); dual
  customer↔owner RLS (0032) means each side only receives its own rows. Verified:
  tsc + build + consumer audit (/cuenta) green. (Realtime delivery itself needs a live
  Supabase session — can't be exercised in the sandbox; logic mirrors the working
  notifications subscription.)
- [x] **Eventos y boletos → Eventbrite parity (2026-07-07).** Benchmarked vs
  Eventbrite; rebuilt the whole events + ticketing spine. Migration **0061**:
  `event_tiers` (General/VIP/… each its own price, capacity, sold, sales window);
  `event_tickets` gains `tier_id` + `unit_price` snapshot + `used_at`; events gain
  `ends_at`/`cover_url`/`status`; **`buy_event_tickets`** (locks the tier, verifies
  availability + sales window, no overselling); **`event_by_slug`** (event + live
  tiers + organizer + geo); **`checkin_ticket`** (organizer validates a code → used,
  once); triggers keep `event_tiers.sold` + `events.going_count` accurate (the "N
  asisten" counter was dead) and notify the organizer on ticket sale + RSVP.
  - **Consumer:** rich event detail — full date, venue + OSM directions,
    organizer, attendee count, **add-to-calendar (ICS, no dependency)**, native
    share, and real **ticket tiers** (per-tier price + availability + "Agotado" +
    qty steppers, running total). Free events keep RSVP. Success shows the entry
    code. Mi cuenta "Mis boletos" is a ticket stub with the prominent code.
  - **Dashboard:** real **tier editor** (add/edit/delete on `event_tiers`),
    real **check-in** (code-entry → `checkin_ticket` → admitido/ya usado/no válido,
    with a live buyer list), real per-tier "Ventas por nivel" + hero KPIs from real
    tickets; the create wizard now collects a real price + capacity and seeds a real
    "Entrada general" tier (fixing the old always-$85 bug).
  - Verified: tsc + build + RPC-intercepted Playwright (3 tiers, VIP sold-out,
    running total $30, 0 overflow); dashboard + consumer audits green.
  - **Deferred (honest, need external setup / later):** real charging (Stripe —
    tickets are reserved, `unit_price` snapshotted); ticket **email** delivery (SES);
    **QR image + camera scanner** for check-in (code-entry validates now — no QR
    dependency); **map embed** (tiles — directions link works now); per-event **deep
    link** (`?e=slug`); recurring-series generation, saved drafts, promoter/affiliate
    (still fixture in the dashboard); waitlist capture; event notification **kinds**
    added client-side (`ticket_new`/`ticket_status`/`rsvp_new`).
- [x] **Professional event-creation wizard (2026-07-07).** The first wizard was too
  thin (4 fixed types, one flat ticket, free-text date/place, no coordinates). Fully
  rebuilt to Eventbrite standard. Migration **0062**: widened `events.cat` to 13 pro
  categories + a single atomic **`create_event_full`** RPC (event + cover + start/end
  time + real lat/lng + status + an ARRAY of tiers, returns slug).
  - **Step 1 Detalles:** cover-photo upload (`uploadImage` → `cover_url`), name,
    description, **13-category picker** (shared `EVENT_CATS` taxonomy — consumer
    filters read it too).
  - **Step 2 Fecha y lugar:** native **date picker** + **start/end time** pickers,
    online-event toggle, and **geo address autocomplete** (reuses `searchAddress` +
    `censusGeocode` — the same free pipeline as the business flow) capturing real
    **lat/lng** → drives the map/directions + geo radius. Replaces the old free-text
    date + plain location field.
  - **Step 3 Boletos:** **multi-tier builder** — add/remove multiple tiers, each
    name/price/capacity (was a single flat price).
  - **Step 4 Revisar:** live summary + per-step gating (can't advance without the
    essentials) + visibility.
  Verified: tsc + build + a Playwright walkthrough of all 4 steps (category chips,
  cover upload, date + 2 time pickers, address field, tier add 1→2, review) — 0
  overflow at 392px. Deferred: recurring-series generation, saved drafts, promoter/
  affiliate; address autocomplete needs live Photon/Census (sandbox-blocked; mirrors
  the working business address flow); cover persists once Supabase Storage is live.
- [x] **Eventos P0 — correctness & honesty pass (2026-07-07).** After a 10-agent
  ultracode audit of the whole Eventos flow, fixed the correctness bugs and removed
  every fixture that rendered as real. Migration **0063**:
  - **Discovery integrity:** `events_near` now returns only **published + still-upcoming**
    events (was: every event forever, incl. past/draft/cancelled), geo-filtered with
    **`st_dwithin`** (GIST-index-accelerated) + a partial `events_discovery_idx`.
    `event_by_slug` hides **drafts** (cancelled still resolve so the detail page can
    show a "Cancelado" banner). A **BEFORE-INSERT guard** blocks RSVP on non-published
    events at the DB (covers every client path).
  - **Real organizer dashboard:** `owner_events_summary()` RPC (owner-scoped, indexed)
    powers the top KPIs + "Tus totales" rail with **live** boletos/ingresos/asistentes
    (replaced hardcoded 186 / $14.2k / 212). Upcoming vs. **Pasados** split by real
    start time; **Asistentes** roster + **Resumen** 14-day sales sparkline built from
    real `event_tickets` (were fixtures); manage hero badge reflects real lifecycle.
  - **Proper cancel:** `cancel_event()` RPC **soft-cancels** (status→cancelled, tickets
    preserved) and **notifies every ticket holder + RSVP** (new `event_cancelled`
    notification kind) — the old button hard-deleted the row, cascading away all sold
    tickets. Consumer shows a Cancelado/terminado banner and disables buy/RSVP.
  - **No fake controls shipped as final:** the wizard's unbacked **online toggle** +
    **visibility chips** removed; the 5 fake Ajustes toggles replaced with an honest
    "Muy pronto" list; the fixture **Borradores / Recurrentes / Promotores** tabs
    replaced with honest "Muy pronto" placeholders; card/featured/detail "asisten"
    double-count fixed; date-chip year-collapse fixed (keys on real ISO date).
  - Verified: tsc + build clean; `tools/mobile-audit/eventos-p0.js` — 0 overflow at
    392px across consumer list/detail + dashboard tabs + manage/Ajustes.
  - **Deferred here → build in later phases (honest, logged):**
    - [ ] **Online events** — hidden until there's an `online_url` column + a join/link
      flow (a "share the link later" toggle with nowhere to store the link is a broken
      promise). Build with the event-detail phase.
    - [ ] **Event visibility** (public / followers-first / unlisted) — hidden until the
      access-control (RLS scoping + follower graph) exists; today all events are public.
    - [ ] **Saved drafts** — the wizard publishes in one pass; `events.status='draft'`
      exists but there's no save-draft/resume flow yet. Borradores tab is "Muy pronto".
    - [ ] **Recurring series** — auto-repeat generation not built. Tab is "Muy pronto".
    - [ ] **Promoters / affiliates** — promo codes + per-ticket commission need payments
      first. Tab is "Muy pronto"; the desktop tip is future-tense.
    - [ ] **Ajustes controls** — waitlist, ticket transfers, 24h reminders, refunds all
      need payments/notifications; listed as "Muy pronto", not faked.
    - [x] **Deep-link share** — DONE (Phase 1, 2026-07-07): `/eventos/?e=<slug>` opens the
      event detail (mirrors `?b=`), share button builds that URL basePath-correctly. The
      SEO half is the real deferral below (SSR).
- [x] **Eventos Phase 1 — deep-link, atomic order, event search (2026-07-07).** Migration
  **0064** + client wiring. (1) **Shareable deep link** `/eventos/?e=<slug>` (query-param
  pattern — a static `/eventos/[slug]` route is impossible for user-generated events under
  `output:'export'`); refactored the detail from an index into an OBJECT (`detailEv`) so
  deep-linked + server-only search results open correctly; share builds the slug URL from
  the current pathname (basePath-safe); a slug that no longer resolves flashes a message
  instead of failing silently. (2) **Atomic multi-tier purchase** `buy_event_tickets_multi`
  — locks every requested tier in deterministic id order (deadlock-free), validates all
  capacities/windows before issuing any ticket, all-or-nothing (fixes the old per-tier loop
  that could leave a partial order); ONE aggregated organizer notice per order via a
  txn-local flag; success screen lists every code labeled by tier. (3) **Server event
  search** `search_events` (FTS over a widened `search_tsv` trigger doc — title+venue+desc+
  cat — + trigram fuzzy, published+upcoming, geo-scoped, **category/free filters pushed
  into SQL** so a filtered search can't under-return, ranked+paginated); `/eventos` list
  gets debounced server search + a numbered pager (9/page); header dropdown Eventos group
  upgraded to the same server FTS. Retired the narrow 0002 generated `search_vector`.
  (4) **List-page static metadata** (crawler-visible in `out/eventos/index.html`) + a client
  effect that sets `document.title`/`meta description` per open event (browser tab/history +
  Googlebot JS render — honestly NOT social unfurls). Verified: tsc + build (metadata baked)
  + `eventos-p0.js` audit 0 overflow + deep-link renders & strips `?e=`.
  - **Deferred (honest, logged):**
    - [ ] **Per-event crawler + SOCIAL-share SEO needs SSR/ISR (infra decision).** Under
      `output:'export'` every `?e=` link serves the same shell HTML; social scrapers
      (WhatsApp/Facebook/iMessage/X/Slack/Discord) don't run JS → shared links preview the
      generic site card; Googlebot renders JS so the client title/meta are indexable but JS-
      render crawl budget doesn't scale to 1M+ UGC events. Real fix: `@cloudflare/next-on-pages`
      or OpenNext (edge SSR on Workers + `generateMetadata` per event = crawler- AND unfurl-
      safe, keeps Cloudflare) OR Next ISR on a Node host. Decide at the traffic/SEO-matters
      point; coordinate with the hosting item. **Must not claim the client metadata "fixes SEO".**
    - [ ] **Bounded events sitemap** — a build-time `app/sitemap.ts` emitting a BOUNDED
      featured/upcoming set of `/eventos/?e=<slug>` URLs (top N per active city), never 1M
      UGC URLs. Pairs with, doesn't replace, the SSR fix.
    - [ ] **Server-side event search: date filter + load-more** — `search_events` takes
      `in_cat`/`in_free` but not a date param, and the client fetches 60 relevance rows then
      paginates client-side (date chip applies over those 60). Add `in_date` + `in_offset`-
      driven "Cargar más" when event search volume grows so a date-filtered search can't
      under-return past the first 60 matches.
    - [ ] **Comunidad/posts server-FTS parity** — header + Comunidad post suggestions stay
      client-substring; `posts` already have a generated `search_vector` + GIN (0002), so a
      `search_posts` RPC mirroring `search_events` is a small add for full grouped-search parity.
- [x] **Eventos Phase 2 — run-the-event core (2026-07-07).** Designed via a 6-agent workflow
  (5 mappers → synthesis → critique); the QR encoder was pre-verified (`qrcode-generator`, MIT,
  zero-dep) before building. Migration **0065** + a large client pass. Ships, all real:
  - **Individual admissions** — `event_tickets.admitted` (0..qty) + redesigned `checkin_ticket(code,qty)`
    that admits N guests of a group ticket per scan (row-locked, no over-admit; flips `used` only on the
    last guest, so `tier.sold` + the one buyer notice stay correct). Dashboard shows `admitted/qty`, an
    "admit remaining" button + per-buyer +1; Mi cuenta shows a live `2/4 ingresaron`.
  - **Real QR** — `Qr` component renders a genuinely scannable SVG from `qrcode-generator` (structurally
    verified: dark-module count == path rects, quiet zone, `fill:#fff`/`fill:#1E1B2E` in CSS). Attendee
    sees it in Mi cuenta; organizer scans via `BarcodeDetector` (`QrScanner`, Chromium/Android) with a
    clean fallback to the existing code-entry on iOS/Firefox. The fake decorative `QrGrid` is deleted.
  - **Waitlist** — `event_waitlist` + RLS + `join/leave_waitlist` + `notify_waitlist` (organizer blast) +
    a seat-freed trigger (real, dormant until a ticket-refund flow exists). Consumer "Avísame" toggle on
    sold-out tiers (honest: notifies, doesn't hold — first to buy wins); organizer waitlist tab + KPI.
  - **Promo codes** — `event_promo_codes` + owner RLS + `validate_promo` + `buy_event_tickets_multi(…,in_promo)`.
    **Access codes unlock hidden tiers = fully real now**, and this closed a latent hole (the buy RPC never
    checked `tier.visible` — a hidden-tier UUID was buyable by anyone). The tier editor gains an **"Oculto"**
    toggle so organizers can create the hidden tier. %/$ discounts adjust the **snapshotted** total only
    (never "ahorraste $X"; inside the "el cobro se habilita al conectar pagos" frame).
  - **Map embed** — zero-dep OSM `export/embed.html` iframe with a pin (no MapLibre bundle/billing).
  - **Organizer profile** — `event_by_slug` gains `organizer_slug`; `events_by_owner` RPC; tap the organizer
    → a sheet of their other upcoming events (+ optional link to their `/negocios?b=` listing).
  - Verified: tsc + build clean; QR render structurally correct + CSS fills present; `/eventos` + dashboard
    Próximos 0 overflow at 392px.
  - **Deferred (honest, logged):**
    - [ ] **Single-ticket refund UI** — a `refunded` ticket is read-only at check-in today; building refund
      also **activates** the waitlist seat-freed trigger (already keyed on `→refunded`). Natural next step.
    - [ ] **Discount ACTUAL charging** — %/$ only shrink the reserved `unit_price`/`total`; no money until
      Stripe. `max_uses` counts reservations, not paid redemptions; amount-discount per-line cent rounding
      resolves at payments. Access codes are fully real now (a reservation IS the grant).
    - [ ] **No seat held for a notified waitlister** — first to re-buy wins (needs a payments/checkout hold).
    - [ ] **iOS/Firefox camera scan** — no `BarcodeDetector`; camera button hidden, manual code entry is the
      honest fallback. Add jsQR / zxing-wasm for iOS camera parity later.
    - [ ] **On-device QR scan confirmation** — render is structurally correct + battle-tested encoder; a
      real phone-camera scan of a live ticket is the final sign-off (sandbox has no camera).
    - [ ] **OSM public tile rate limits** — `export/embed.html` uses openstreetmap.org's shared tiles; self-host
      or move to MapLibre/MapTiler when event-detail traffic grows.
    - [ ] **Recurring events** — still "Muy pronto" (own phase).
    - [ ] At 1M+ rows, add the `event_tickets.admitted` CHECK as `NOT VALID` then `VALIDATE CONSTRAINT` to
      avoid a long ACCESS EXCLUSIVE lock (the inline CHECK is fine at current volume).
- [x] **Customer self-service cancel (2026-07-07).** "Mi cuenta" already showed the
  customer's real orders/bookings/rentals/tickets (`useMyActivity`); added a
  **Cancelar** action (with confirm) on still-early items (order `new`; booking /
  rental `pending`|`confirmed`) → `myActivity.cancel` updates status to `cancelled`
  under RLS (own rows) + refreshes; the owner sees it in their dashboard and the
  status-change notification fires (migration 0054). Verified: /cuenta renders 0
  pageerrors / 0 overflow (the action itself is auth-gated → needs a live session).
  Deferred: live realtime status on Mi cuenta; owner-notified-on-customer-cancel.
- [x] **Server-side search — scalable FTS (2026-07-07).** Consumer text search was
  a client-side substring match over the ~50-business geo slice (misses matches
  beyond the radius, no ranking). Now real Postgres full-text search (migration
  **0055**): a `businesses.search_tsv` (name + specialty + subcategories
  + category) maintained by a BEFORE INSERT/UPDATE trigger + backfill (a GENERATED
  column can't call `to_tsvector`, which is STABLE not IMMUTABLE — Postgres 42P17),
  with a GIN index, a `businesses_name` trigram index for fuzzy/typo
  matches, and a `search_businesses` RPC (FTS + `websearch_to_tsquery` + `similarity`
  fallback, geo-scoped, category/price/rating filters, ranked by relevance then
  distance, paginated) returning the same shape as `businesses_v2` (client reuses
  `mapBusinessRow`). `Negocios` calls it (debounced 250ms) when there's a query and
  falls back to the client substring filter when empty/offline. Scales to the 1M+
  target (non-negotiable #4). Verified: a query with no fixture substring match
  still returns the server row, 0 pageerrors / 0 overflow. Deferred: Meilisearch
  swap only if FTS volume demands it; search-as-you-type suggestions off the RPC.
- [x] **In-app notifications (2026-07-07).** A per-user feed auto-generated by DB
  triggers on the real events — no manual wiring. Migration **0054**:
  - `notifications` table (user_id, kind, data jsonb, link, read) + RLS (user reads/
    marks their own; only triggers insert) + realtime. Language-neutral rows —
    `lib/notifications.tsx` renders the localized (es/en) title/sub from kind+data,
    so it stays Spanish-first.
  - Triggers fan out on `business_orders` / `business_bookings` / `business_rentals`
    (new → owner, status change → customer) and `business_messages` (→ the
    recipient). This table is also the queue a future Edge Function reads for Web
    Push / email.
  - `NotificationsProvider` (real rows + realtime when signed in; demo fixtures when
    logged out) feeds the bell **badge** (AppHeader + BottomNav "Alertas") and the
    **NotifPanel** (Todas/No-leídas, Hoy/Esta semana/Anteriores, mark read / mark
    all read, tap → deep link). Verified: badge count + grouped list + filters +
    mark-all render in demo; 0 pageerrors / 0 overflow.
  - Deferred: **Web Push (VAPID)** + **email (SES)** delivery — needs a service
    worker + push-subscription table + an Edge Function reading `notifications`
    (+ keys). This in-app layer is the foundation they plug into. Also: notification
    preferences (per-type mute), batching/digest.
- [x] **In-app chat — buyer ↔ seller (2026-07-07).** Real two-way messaging, not
  just an external WhatsApp/SMS link. The owner inbox (`modules/Messages.tsx`,
  business_conversations + business_messages, migration 0029) already existed;
  this adds the CUSTOMER side + realtime (migration **0053**):
  - Customer participation: `business_conversations.customer_user_id` +
    `customer_unread`, one conversation per (business, customer), with RLS letting
    the customer read/update their own conversation and read/send its messages
    (owner policies unchanged — RLS combines with OR). A `start_conversation` RPC
    (SECURITY DEFINER) get-or-creates the conversation by slug; a trigger keeps
    `last_at` + per-side unread fresh on every insert.
  - Realtime: `business_messages` added to the `supabase_realtime` publication;
    both sides subscribe (`lib/chat.tsx` — startConversation / fetchChatMessages /
    sendChatMessage / markConversationRead / subscribeChat / subscribeInbox).
  - Consumer: BizDetail contact sheet → "Enviar mensaje" opens an in-app chat
    panel (auth-gated → /entrar); loads history, sends, live-updates. Dashboard
    Messages now subscribes to inbound messages (live thread + inbox refresh).
  - Deferred: attachments/images in chat, typing indicators, read receipts,
    push/email notification on a new message (see Notifications track), blocking/
    spam controls.
- [x] **Wizard UX across Menú / Servicios / Productos (2026-07-06).** Three
  shared improvements to all three create/edit wizards:
  - **Draft recovery.** The CREATE draft autosaves to `localStorage`
    (`lib/draftStore.ts`, keyed per business+module); if the owner leaves
    mid-creation, reopening the wizard restores it with a "Borrador recuperado"
    toast. Cleared on publish. (Client-only; not synced across devices — that
    would need a server drafts table, deferred.)
  - **Inline "+ Agregar" categoría.** A dashed chip in the wizard's Categoría row
    opens the module's existing category editor as a popup and auto-selects the
    new category on the draft — no need to leave the wizard.
  - **Inline "+ Agregar" etiqueta.** A shared popup (`components/QuickTagSheet.tsx`)
    creates a custom tag, stored in a reusable `tags: string[]` on each config
    (menu/service/product) and selected on the draft. Menú items gained a `tags`
    field (business_items.attrs) shown on the admin card. No migration (tags live
    in the existing config + attrs jsonb). Deferred: custom tags aren't yet shown
    on the PUBLIC listing (dashboard-only for now).
- [x] **Entregas y envíos — OPERATIONAL flow (DoorDash/Instacart-style, 2026-07-06).**
  Turned the fulfillment settings panel into a real ops experience on top of the
  config. Two sides, each with an operational board + setup tabs:
  - **Delivery · Despacho** — a live dispatch board over real `business_orders`
    (channel='delivery'): KPIs + status filter + order cards that advance through
    Nuevo → Aceptar → Preparando → Listo → **Asignar repartidor** (sheet: own
    drivers or external apps) → Recogido → **En camino** (live-tracking mini map +
    ETA) → Entregado, plus cancel. Setup tabs: Zonas, Repartidores (propios · apps
    externas), **Ajustes** (pedido mínimo, tiempo de prep, auto-asignar, live
    tracking).
  - **Shipping · Envíos** — a shipment queue (channel='ship'): Empacar → **Crear
    etiqueta** (sheet: transportista + paquete → tracking #) → Enviado → En
    tránsito → Entregado. Setup: Recoger, Transportistas (propio · USPS/UPS/FedEx),
    **Ajustes** (envío gratis, manejo, paquete, origen).
  - **Setup tabs are full CRUD (2026-07-06).** Zonas and Repartidores are no
    longer read-only: tap any card to edit, "+ Nueva zona" / "+ Agregar repartidor"
    to create, trash + confirm to delete — real editor sheets
    (`modules/FulfillmentEditors.tsx`: `ZoneEditor` edits name es/en · radio · ETA ·
    tarifa es/en · color; `DriverEditor` edits nombre · teléfono · estado · color,
    deriving initials/dot/status labels). Both persist to `businesses.settings`
    (`shipping.delivery.zones` + `drivers` jsonb). Ajustes (delivery + shipping)
    persist via "Guardar ajustes". No migration — flexible jsonb.
  - Per-order operational state persists to `business_orders.fulfillment` jsonb +
    a `ship` channel (migration **0049**); core `status` still writes the existing
    enum so the Pedidos tab keeps working. Best-effort persistence — the board is
    fully interactive in-session even before 0049 is applied; demo is fully
    interactive on sample orders. Setup persists to `businesses.settings`. Deferred:
  - [ ] **External couriers/carriers are stubs.** Uber Direct / DoorDash Drive /
    Rappi (dispatch) and USPS/UPS/FedEx via Shippo/EasyPost (labels+rates) toggle
    and are selectable, but call no real API — the tracking number on "Crear
    etiqueta" is a demo. Wire the real dispatch/label APIs from the **Admin
    dashboard** (founder's plan) in the logistics phase.
  - [ ] **No live GPS / real ETA.** The on-the-way mini map is a styled placeholder
    with a static ETA — real driver GPS + ETA needs the courier API or a driver
    app + MapLibre.
  - [ ] **Consumer doesn't create `ship` orders yet.** The channel + queue exist,
    but the public checkout still only places dinein/pickup/delivery orders — wire
    a "shipping" option at checkout (with the shipping address) when payments land.
  - [ ] **Order has no address column.** Delivery/ship destination is shown from a
    denormalized string in `fulfillment.address`; link real `user_addresses`
    (0014, has PostGIS geo) to the order at checkout for routing/zone assignment.
  - [ ] **Zone fee is NOT calculated by distance yet — DEFERRED to the payments
    phase (founder's call, 2026-07-06).** Today a zone's "Tarifa" (`Gratis +$25`,
    `$5`, `$12`) is descriptive config text, and the consumer cart uses a FIXED
    placeholder delivery fee (`deliveryFee = 2.99` in `BizDetail.tsx`) + a 10%
    service fee — it does not measure distance, match the customer to a zone, or
    read the zone tarifa. The founder decided to leave it as-is until the payment
    method is linked, then decide which pricing options actually work. When we wire
    it: the real design is **server-side PostGIS** (non-negotiable #5, never
    app-side math) — at checkout take the customer's `user_addresses.location`
    (0014, geo ready) + the `businesses.location` point (0001/0002, geo ready),
    compute distance with `ST_Distance`/`ST_DWithin` in an RPC/Edge Function, match
    it to the first zone whose radius covers it → add that zone's fee as a cart
    line; beyond the last zone → offer shipping/pickup. **Numeric radius per zone
    is now DONE (2026-07-12):** `zone.toMi` (outer radius, miles) + `zone.fee`
    (dollars) are structured/comparable, and the cart already enforces the
    outermost zone as the delivery limit via `delivery_range_check` (0076). Still
    missing to price the fee by distance: the **address-on-order** item above
    (match the customer's point to the covering zone at checkout) and the pricing
    model choice (radius bands vs. base + per-mile) — current zones use radius
    bands, matching the map rings.
  - [ ] **Delivery radius gate is client-side only (still deferred, 2026-07-12).**
    The zone-derived `radiusMi` now gates the cart UI (Pagar disabled out of
    range), but it's bypassable — re-check `delivery_range_check` server-side in
    the checkout edge function at charge time (same pass as order re-pricing).
- [x] **Entregas y envíos — SHARED fulfillment module (2026-07-06).** Pulled
  delivery/shipping OUT of Products into a standalone module
  (`modules/Fulfillment.tsx`) shared by BOTH the Food menu (local delivery) and
  Products (delivery + national shipping) — a restaurant and a shop configure
  fulfillment ONCE. Two sections matching the owner's model: **Delivery (entrega
  local)** = Zonas + Repartidores (propios / apps externas: Uber Direct, DoorDash
  Drive, Rappi/Uber Eats); **Shipping (envío)** = Recoger en tienda + Envío
  nacional (**Tarifa propia** / **Transportistas** USPS·UPS·FedEx). No migration
  — the data was already business-scoped in `businesses.settings` { shipping,
  drivers } (jsonb); this was a UI extraction + nav rewire. Sidebar shows the
  module whenever Menú **or** Productos is on; the legacy `shipping`/`drivers`
  tab ids deep-link into it; Products & Food each carry a shortcut card to it.
  Verified: tsc + build clean; 0 overflow at 392px across both sections,
  sub-tabs and own/external toggles. Deferred:
  - [ ] **External delivery/shipping integrations are display-only stubs.** The
    provider cards (Uber Direct, DoorDash Drive, Rappi; USPS/UPS/FedEx) toggle +
    persist a preference but call no real API. Wire the actual dispatch/label
    APIs (e.g. Shippo/EasyPost for carrier rates+labels; Uber Direct/DoorDash
    Drive APIs for on-demand couriers) when the logistics/payments phase lands.
  - [ ] **Own delivery zones are still editable-lite.** "Nueva zona" appends a
    placeholder zone; a full zone editor (draw radius on the map, per-zone fee/
    ETA/min-order) comes with the real MapLibre integration.
- [x] **Shell polish (mobile chrome, 2026-07-04)** — the dashboard now mirrors the
  handoff on mobile: dark top bar on Inicio (light elsewhere), business identity
  card at the top of Inicio, and the fixed bottom-tab bar
  (Inicio·Pedidos·Mensajes·Reseñas·Más→drawer). Verified via Playwright at 392px:
  0 horizontal overflow on all 12 dashboard views (fixed min-w-0 on module grid
  columns and scroll rows); desktop unchanged (light topbar + sidebar).
- [x] **Popups → full-screen pages (2026-07-04)** — every module edit/create/detail/
  wizard converted from cramped bottom-sheets to the shared `ModulePage`
  (`modules/_page.tsx`: own header, natural scroll, sticky footer actions). Verified
  by `tools/mobile-audit/` — **125 states / 0 overflow** at 392px.
- [ ] **Apply the missing DB migrations (BLOCKING).** The founder's Supabase is
  missing `0013`→`0018` (the `owner_id` ownership SQL failed: "column owner_id does
  not exist"). Apply `0013`→`0018` in order in the SQL Editor, then run the
  Hazleton→`b@b.com` ownership script (pasted in chat). Until then `create_business`
  (publish), features, hours and saved-businesses tables are absent in prod.
- [ ] **Wire modules to real data** — today all module content is fixture/demo state
  (local `useState`). Load the owner's business(es) by `owner_id`, add a business
  switcher, and back each module with Supabase tables/RPCs as features launch (so
  `b@b.com` sees the real Hazleton businesses, not the demo restaurant).

## 4. Infra & hosting

- [ ] **Frontend host: Vercel → Cloudflare Pages.** Currently auto-deploys on
  **Vercel** (Git integration). `CLAUDE.md` target is **Cloudflare Pages** (free,
  cheap bandwidth). Revisit before scale.
- [ ] **PWA / app stores.** Wrap with **Capacitor** for native app-store
  presence later; add offline/install polish.
- [ ] **Deploy process note.** Work is developed on `claude/new-prompt-xkubrd`
  and released by fast-forward-merging into `claude/tolatino-repo-setup-1efdil`
  (the branch Vercel auto-deploys). Keep DB migrations (`supabase/migrations/`)
  applied in order in the Supabase SQL Editor — they are pasted into chat when
  created (non-negotiable #6).

## 5. Consumer transaction loop (deferred pieces)

- [ ] **Business-side RSVP attendee names.** The two-sided loop is live: a
  customer's order / booking / rental / ticket / "Voy" is created from the
  listing (or Eventos) and shows in BOTH Mi cuenta and the business dashboard
  (orders → Pedidos/Pagos, bookings → Servicios, rentals → Renta·Solicitudes,
  tickets → Eventos·Boletos). `event_attendance` stores only `user_id` (no
  name) and profiles are self-read under RLS, so the business can show a **count**
  of "Voy" RSVPs but not the attendees **by name**. To surface names later,
  either denormalize `customer_name` onto `event_attendance` (like tickets) or
  add a scoped profiles-read policy for event owners. Non-transactional, low
  priority.
- [ ] **Rentals/tickets are request-stage, not paid.** Rentals insert as
  `pending` (business confirms → hand-out → returned); tickets/deposits are
  recorded but **not charged** — payments come in the transaction phase
  (Stripe/etc., see §2). No real money moves yet.

## 6. Moderation & admin

- [ ] **Server-side enforcement of Pro-gated listing fields.** Información
  general gates Subcategorías / Lo que ofrece / Destacar en la tarjeta /
  Contacto por mensaje / Sitio web behind the paid tier — but only in the UI
  (the client also stops sending those columns for free accounts). The RLS
  "update own business" policy does NOT check tier, so a technically savvy free
  owner could still write those columns via the API. Before real launch, add a
  DB-side guard (e.g. a BEFORE UPDATE trigger that rejects changes to gated
  columns when `tier = 'free'`). Same applies to the **photo cap** (Free 1 /
  Pro 20, enforced only in the Photos UI) — add a trigger/policy on
  `business_photos` insert that counts existing rows against the owner's tier.
  Same applies to the **Horario Pro-gate** (Free: one slot per day, no
  `hours_exceptions`): the "+ Otra franja" and "Feriados y más" limits are
  UI-only, so the trigger should also reject `hours` with >1 interval on any day
  and any non-empty `hours_exceptions` when `tier = 'free'`.

- [ ] **Subcategory suggestions — admin approval UI.** Owners can propose a new
  subcategory from Información general; it's stored `pending` in
  `subcategory_suggestions` (0038) and only publishes when approved. Approval is
  **currently manual**: set `status = 'approved'` in the Supabase Table Editor
  and a trigger appends the label to that business's `subcategories`. Before
  scale, build a proper **admin moderation queue** (review/approve/reject with
  `label_en`), and consider promoting popular approved labels into the shared
  `SUBCATS` taxonomy (today it's a hardcoded fixture — approved customs only go
  live on the proposing business, not as a standard chip for everyone).

- [ ] **BizDetail public events / staff / updates — wire real data (2026-07-08 audit).**
  Detail tabs are now gated: catalog tabs (Menú/Tienda/Servicios/Renta) show only
  when the owner published real items, and the fixture-only tabs (Updates/Eventos/
  Equipo) show only when the owner enabled that module in `businesses.modules` — so
  real unconfigured listings no longer render placeholder tacos/staff. But the
  **content** of those three tabs is still the prototype fixtures (DETAIL_EVENTS /
  STAFF / UPDATE_POSTS), even for a configured business (today only
  `hz-barberia-primera`). Before launch, wire real public data: owner events via
  `events_by_owner` (exists), plus new `business_staff`-by-slug and
  `business_updates`-by-slug RPCs, and render real rows instead of fixtures.

- [x] **HECHO 2026-07-29 — Business panel: signed-in user with NO business → uniform
  empty state (era 2026-07-08 audit, D3).** Resuelto de raíz y MEJOR que lo que
  pedía este ítem: en vez de arreglar módulo por módulo, `PanelScreen` ahora tiene
  una COMPUERTA — sin negocio real no se renderiza ningún módulo, sale un estado
  vacío honesto ("Inicia sesión para administrar tu negocio" si no hay sesión,
  "Publica mi negocio" si la hay). Uniforme por construcción: ningún módulo puede
  volver a enseñar sus semillas demo. Además se ELIMINARON las semillas (roster de
  7 empleados, DEMO_ORDERS, DEMO_BOOKINGS, novedades, la solicitud de "Aliado" de
  Related) y el modo demo ya no se activa nunca con backend configurado.
  Descripción original del hueco, para contexto: When a user is signed in but owns no business
  (`admin.active == null && !admin.demo`), the catalog/customer modules (Food,
  Products, Services, Rental, Events, Customers, Staff, Updates) currently fall
  back to their DEMO seed data (e.g. 9 sample dishes, fixture orders), while
  Listing/Photos/Hours/Messages/Payments/Related correctly show a "Conecta tu
  negocio" empty state — so the same panel looks half-real. Before launch, treat
  `active == null && !demo` as the empty state uniformly across all modules
  (show "Conecta tu negocio" instead of demo seeds). Edge state (most users reach
  the panel via onboarding which creates the business first), so deferred.

## Payments — marketplace checkout (Stripe Connect, 2026-07-09)

Real card checkout via **destination charges** is now live for **Pedidos (orders)**
and **Boletos (event tickets)**: the buyer pays `P + 5%`, To'Latino keeps `15% of P`
as the Stripe `application_fee`, and the seller's connected account receives `≈P − 10%`.
Purchases are staged in `pending_purchases`, charged on Stripe's hosted page, and
**fulfilled by `stripe-webhook`** (creates the order / issues the tickets + records
`payments`). Everything below is a deliberate follow-up:

- [x] **Efectivo contra entrega por defecto · Stripe = tarjeta en línea — DONE
  (2026-07-14, decisión del founder).** Stripe NO es obligatorio para vender.
  Activar un módulo → cobras en **efectivo contra entrega o al recoger**; conectar
  Stripe habilita **tarjeta en línea + depósito a tu banco**. (Reemplaza el enfoque
  breve de "modo catálogo sin Stripe" del 2026-07-13.) Consumidor: `deliveryAvailable
  = del.on` (entrega también en efectivo), `*DisplayOnly` dependen solo del toggle
  del dueño; sin Stripe total = subtotal+entrega (sin 5% ni propina online),
  `placeCart` guarda `fulfillment.payment:'cash'` + dirección, y Cocina muestra un
  chip **"Efectivo · cobra $X"**. Dueño: `ModulesSetup` muestra un diálogo
  profesional (efectivo activo + "Aceptar pagos con tarjeta"), y el Inicio lo pone
  como empujón suave (no "atención"). Verificado E2E (`cash-sales.js`, `cash-cart.js`).
  - [ ] **Cobro del 15% de comisión en pedidos en efectivo:** en efectivo To'Latino
    no puede retener su comisión automáticamente (no pasa por Stripe). Definir cómo
    se cobra/concilia la comisión de los pedidos en efectivo (o si se cobra) cuando
    haya volumen real — hoy el pedido en efectivo no genera application_fee.

- [ ] **Rotate the exposed `sk_test` key.** The test secret key was pasted in chat
  earlier; it's stored only in the Supabase secret store now, but still rotate it:
  Stripe → Developers → API keys → **Roll** the secret key, then update the
  `STRIPE_SECRET_KEY` secret. (Test mode → no real money, but do it before touching
  live keys.)
- [x] **Bookings + Rentals paid checkout — DONE (0073, 2026-07-09).** Same pattern
  as orders/tickets: `kind = 'booking' | 'rental'`, `fulfill_booking` /
  `fulfill_rental` service RPCs, BizDetail booking/rental buttons route through
  `startMarketplaceCheckout`. Booking charges the **deposit** (when the service has
  a deposit + price); rental charges the **rental fee** (`rentSubtotal`). Residual
  deferrals below.
- [~] **Rental security-deposit hold — BUILT 2026-07-16 (0101), needs one live
  test-mode payment to confirm end-to-end.** Online rentals now place a REAL
  authorization hold for the refundable deposit: the fee PI saves the card
  (`setup_future_usage=off_session` + a Stripe Customer), the webhook then creates
  a manual-capture PI (`capture_method=manual`, off_session, destination charge to
  the seller) for the deposit and records `deposit_status='held'`. The owner panel
  releases it on return (`rental-deposit` edge fn → cancel) or captures part/all for
  damage (→ partial capture, rest auto-released); Mi cuenta shows the renter
  "retenido / liberado / cobrado". If the off-session auth fails (SCA/decline) →
  `deposit_status='failed'` and the owner collects cash at pickup.
  **Verified:** migration + RPCs (set_rental_deposit, rental_deposit_ctx), the
  edge-fn auth gate (non-owner→403, owner→reaches Stripe), and the panel/consumer
  UI (held/released/captured chips + release/damage controls). **NOT yet verified
  in this env:** the actual card hold create→release→capture, because it needs a
  real Stripe.js payment (blocked in the sandbox). Before relying on it: do ONE
  test-mode rental with card 4242 on a Stripe-connected business, then release +
  capture from the panel and confirm on the Stripe dashboard. Residual: a true
  simultaneous online-pay race (see availability item) — unrelated to the hold.
- [x] **VERIFICADO HECHO (2026-07-29) — las reservas también se re-tarifican desde la BD, nunca desde `body.subtotal` (marketplace-checkout l.262+). Ítem original** · Re-price bookings/rentals server-side.** Like orders, the booking deposit /
  rental fee is computed client-side and validated (`> 0`, `< 100000`) server-side,
  not re-derived from the service/rental config. Recompute from
  `service_config`/`rental_config` before real-money launch (tickets are already
  server-priced).
- [x] **VERIFICADO HECHO (2026-07-29) — el servidor re-tarifica cada línea desde el catálogo y el precio del cliente se IGNORA (marketplace-checkout l.161-192: busca cada `business_items` id en el menú/tienda del negocio y recalcula base + extras). Un pedido de $50 no puede cobrarse a $0.55. Ítem original** · Re-price orders against the catalog before real-money launch.** For orders
  the checkout function totals the **submitted** line items (qty × unit, validated
  `> 0`), not a re-price against the live menu/product prices. A tampered client
  could submit a lower unit price. Tickets are already priced server-side from
  `event_tiers` (safe). Before going live, recompute order line prices from
  `business_items`/`menu_config` server-side (match variant/option modifiers).
- [ ] **Enforce the delivery radius server-side at charge time.** The radius gate
  (migration 0076, 2026-07-11) is enforced in the cart UI: `delivery_range_check`
  (PostGIS) marks the chosen address out-of-range → warning + Pagar disabled. A
  tampered client could still call the checkout function with an out-of-range
  address. When doing the re-price pass above, have the marketplace-checkout
  edge function geocode/verify the submitted delivery address against the same
  RPC and reject out-of-range orders — same "server stays authoritative at
  charge time" pattern.
- [ ] **Percent / amount promo codes on PAID ticket checkout.** Access-code
  unlocked tiers work on the paid path (priced from the DB), but `%`/`$` discount
  codes are **ignored** when paying online (the buyer is charged full tier price +
  5%). Wire discounts into the Stripe amount + `fulfill_event_tickets_multi` promo
  arg so paid checkout honors them.
- [ ] **Delivery logistics + delivery fee.** The old cart's fake `$2.99 Envío` +
  `10% Servicio` rows were removed (the only real fee now is the 5% buyer service
  fee that matches the Stripe charge). Real delivery (driver assignment, delivery
  fee that pays the courier, delivery vs pickup channel picker) is a separate
  feature — build when the delivery phase starts (benchmark: DoorDash/Uber Eats).
- [ ] **Paid tickets require the organizer to have connected Stripe.** Events link
  by `owner_id`; paid-ticket checkout routes payout to the **first connected
  business** owned by that user. If the organizer has no connected business, paid
  tiers show "Venta de boletos no disponible por ahora" (free tiers still issue).
  Consider an explicit per-event payout account + an organizer onboarding nudge.
- [ ] **Connect `account.updated` webhook (optional).** Seller charge-status is
  synced **on demand** (connect-status runs when the Payments tab loads / on return
  from onboarding), which is enough. For instant updates, add a Stripe **Connect**
  webhook endpoint listening to `account.updated` (the handler already exists in
  `stripe-webhook`; a normal account webhook won't receive connected-account events).
- [ ] **Buyer-paid amount vs order total.** `business_orders.total` stores the goods
  subtotal `P` (the seller-facing order value); the buyer actually paid `P + 5%`
  (visible on the Stripe receipt + in `payments.amount`). If "Mi cuenta" should show
  the exact amount charged, read it from `payments` instead of the order total.
- [ ] **Abandoned `pending_purchases` cleanup.** Rows left `pending` (buyer never
  finished Stripe checkout) accumulate. Add a periodic cleanup (e.g. delete/expire
  `pending` older than 24h). Harmless (nothing was charged/fulfilled), just hygiene.

### Ordering flow — design handoff "Ordenar" (2026-07-09)
**Correction (2026-07-10):** the Cliente ordering experience does NOT live in a
standalone `OrderFlow.tsx` full-screen takeover anymore — the founder rejected
that (it replaced the whole business single-page). Online ordering lives inside
`BizDetail.tsx`'s **"Menú" tab**, additive to the existing single-page design.
`OrderFlow.tsx`/`orderIcons.tsx` were deleted. **Cocina + Menú Builder are also
resolved:** Cocina's new capabilities (accept w/ prep time, real driver
assignment, reject w/ reason, payout breakdown) were grafted additively into the
dashboard's existing Pedidos screen (`Customers.tsx`), not a standalone rebuild;
the existing Food module already matches/exceeds the Menú Builder spec (see
PROGRESS.md 2026-07-10 entries for both). Remaining follow-ups:
- [ ] **Fee rates: design uses 10% service + 8.25% tax + 15% commission; we kept
  the founder's tested economics (5% buyer service fee, 15% platform commission,
  no separate tax line).** The handoff README says "ajustar tasas a las reales del
  negocio", so the STRUCTURE is faithful and the RATES are the real ones. If the
  founder wants the literal 10% + tax, wire real tax collection/remittance first
  (per-jurisdiction) — do NOT charge tax without remittance set up.
- [ ] **AMIGO10 promo** is wired end-to-end (client summary + server discount,
  platform-absorbed). Make promo codes real/configurable per business later.
- [ ] **Payment method list is display-only** (Visa/MC/Apple Pay chips) — the real
  charge always goes through Stripe Checkout on "Realizar pedido". Wire saved
  cards / Payment Element when moving off Stripe-hosted Checkout.

### Menú tab / carrito — add-to-cart stepper for items WITH addons (2026-07-10)
- [x] **Menú tab card stepper — DONE (2026-07-10, `BizDetail.tsx`).** The
  founder asked for this sooner than originally deferred. Built exactly as
  specified: tapping `+` on a customizable item that already has a line in the
  cart opens **"¿Lo deseas igual o quieres cambiar algo?"** (shows the last
  selection; *Sí, igual* increments that line; *Cambiar algo* opens the item
  sheet fresh — default selections, not pre-filled — as a new distinct line).
  Tapping `−`/trash with **2+ different customized lines** of that item opens
  **"¿Cuál deseas eliminar?"**, listing each variant (qty × its addon summary
  + note) so the customer picks by reading the difference, not "line 1/2". No
  prompt when there's only one line (direct inc/dec, as before). Verified live
  (a@a.com, El Sabor, Mangú con los tres golpes): same→qty 2/1 line, cambiar→
  qty 3/2 lines (Aguacate + Queso frito), remove-picker showed both and removed
  the picked one, back-to-1-line reverted to direct decrement. `tools/mobile-
  audit/addon-variant-prompts.js`. Resolved the 3 open design questions inline:
  small centered `Overlay` dialogs (not a full sheet) for the binary choice;
  "difference" shown as each variant's full addon summary side-by-side (not a
  word-level diff — simple and sufficient, revisit only if items commonly carry
  5+ addons and summaries get long); no default-select on removal, always an
  explicit pick.
- [x] **Cart sheet per-line stepper — DONE (2026-07-11, `BizDetail.tsx`).** The
  founder asked to extend the same flow to the cart (and to the customize
  sheet's own stepper). Tapping `+` on a **customized** cart line now opens the
  same **"¿Lo deseas igual o quieres cambiar algo?"** dialog: *Sí, igual* bumps
  that exact line (`incLine(key)`); *Cambiar algo* opens the item sheet for a
  new variant (`openItem`). Simple (no-addon) lines increment directly. Also
  added to the **customize-sheet footer stepper**: `+` on an addon item prompts;
  *Cambiar algo* adds the current combo and resets the sheet in place so you can
  build another variant without leaving. Reused the existing `addPrompt` overlay
  (extended with an optional `key` to target a specific cart line). Fixed a real
  stacking bug found while building: overlays all shared `z-[70]`, so the cart
  (later in DOM) hid a prompt opened from within it — added an optional `zIndex`
  prop to the shared `<Overlay>` (sheet=80, its prompt=90, add/remove
  prompts=80). Verified live: `tools/mobile-audit/stepper-igual-cambiar.js`.
  Still open only if/when the cart becomes its OWN dedicated route (`/carrito`):
  the logic will carry over unchanged since it's all in shared helpers.

### Food delivery (2026-07-09) — polish deferrals
- [ ] **Dish photos.** The 150-dish menu uses the design-system striped tiles;
  the owner can upload a real photo per dish from the Food module (imageUrl is
  wired) — content task, not code.
- [ ] **Driver GPS / live map.** The "En camino" mini-map is illustrative; real
  courier GPS tracking needs a driver app (post-launch phase). Applies to both the
  owner Cocina/Fulfillment map and the **client "Sigue tu pedido" tracking map**
  (redesigned 2026-07-15) — same styled placeholder + static ETA on both sides.
- [ ] **Delivery proof photo.** The client "Entregado" confirmation screen shows a
  striped placeholder where a real drop-off photo would go; capturing/uploading it
  also needs the driver app (post-launch phase).
- [ ] **Owner-set ETA.** Advancing to "En camino" stamps a fixed 10-min ETA;
  let the owner pick the ETA when dispatching (small UI).
- [ ] **Double notification at delivery.** Marking delivered fires dispatch
  `delivered` + status `completed` (two client pushes ~1s apart). Debounce in
  the trigger later.
- [ ] **Tips on pickup orders.** Tips are delivery-only today; DoorDash also
  allows pickup tips — add if wanted.

### Checkout on-site (Stripe Payment Element) (2026-07-14)
- [x] **VERIFICADO HECHO (2026-07-29) — el webhook maneja AMBOS eventos con protección de carrera: el pago por hoja propia (Payment Element) no genera `session`, así que lo cumple el evento de PaymentIntent, y si existe `session` se deja que ése cumpla para no duplicar; además reclama la fila de forma atómica antes de entregar (`claimPending`), así los reintentos de Stripe no cobran ni entregan dos veces. Ítem original** · Stripe webhook must include `payment_intent.succeeded`.** The on-site
  checkout fulfills orders on that event; add it to the To'Latino webhook endpoint
  in the Stripe Dashboard (Developers → Webhooks). Hosted-checkout flows still fire
  `checkout.session.completed` (already subscribed). Until this is added, orders
  paid via the new in-app checkout stage as `pending` but never become real orders.
- [ ] **Full card-payment E2E only tested on the live site.** Backend PaymentIntent
  creation + the branded sheet opening are verified; the actual card entry +
  confirmation couldn't run in the build sandbox (Stripe's js/api domains are
  proxy-blocked, 403). Do one real test-card (4242 4242 4242 4242) order on
  tolatino.vercel.app and confirm the order appears in Cocina + Mi cuenta.
- [ ] **Migrate booking / rental / ticket checkouts to the Payment Element too.**
  Only the food-order cart uses the on-site sheet; those three still redirect to
  Stripe's hosted page (same `marketplace-checkout` backend — just call
  `startMarketplacePayment` + open `CheckoutSheet` from their confirm handlers).
- [ ] **Stripe Branding (optional polish).** Dashboard → Settings → Branding: logo
  + brand color → shows in Link / Apple Pay / wallet sheets.

### Routing / deep-links (2026-07-14)
- [ ] **Shared Comunidad post links to a post outside the viewer's local feed.**
  `useUrlDetail('post')` (`?post=<id>`) reopens a thread on refresh/back correctly
  (the post is in your feed), but a link SHARED to someone whose hyperlocal feed
  (`posts_near`, ~30 mi) doesn't include that post won't auto-open it — there's no
  public post-fetch-by-id. Businesses (`?b=`) and events (`?e=`) already fall back
  to a slug fetch; posts need an equivalent `post_by_id` RPC (mirror `posts_near`'s
  projection for one id) + a `fetchPostById` fallback in Comunidad's resolve. Low
  priority (posts are hyperlocal by design).
- [x] **Dashboard module sub-tabs in the URL (2026-07-14).** Each main module's
  primary sub-tab now mirrors to `?t=<module>&sub=<subtab>` (refresh-safe; Panel's
  `go` clears `?sub` on module switch so it never leaks): Food `subtab`, Products
  `sub`, Services `svcSub`, Rental `mode`, Events `listTab`, Customers `seg`, Hours
  `mode`, Promociones `filter`. Still React-only (deliberately, deeper/ephemeral):
  the create/edit **wizards** (`wizStep`, `view:'wizard'`), the per-record **editor
  sheets** (`editingId`, `selCust`/`selOrder`, `manageId`, Rental `openId`),
  Messages' selected conversation (`activeId`), and the secondary filters below the
  primary sub-tab (Services `bookFilter`, Rental `itemSub`/`opSub`). Add these
  case-by-case only if owners ask.
- Intentionally NOT URL-backed: the publish (`BizOnboarding`) and auth
  (`Onboarding`) **wizards** — steps depend on prior-step data, so deep-linking mid-
  flow would render a broken/empty step. Leave ephemeral.

### Novedades (Updates) — pendientes de servidor (2026-07-15)
- [ ] **Auto-publicación de programadas por cron.** Hoy una publicación
  programada se publica "lazy": cuando el dueño abre su panel después de la
  hora. Para publicarse sola sin abrir el panel hace falta pg_cron (o un cron
  externo → edge function) que corra
  `update business_updates set status='live' where status='scheduled' and scheduled_at <= now()`.
- [ ] **Avisar a los clientes que guardaron el negocio cuando publica una
  novedad** (push/in-app). Es fanout (un insert de notificación por cada
  usuario que guardó el negocio) — decidir límites/batching antes de activarlo
  a escala.

### Checkout propio en todos los cobros (2026-07-15)
- [ ] **Eventos (boletos) todavía redirige al Checkout alojado de Stripe.**
  Pedidos, reservas y rentas ya pagan dentro de la hoja propia (`CheckoutSheet`
  + Payment Element — regla del fundador en CLAUDE.md/skill). Migrar
  `Eventos.tsx` (`startMarketplaceCheckout` → `startMarketplacePayment` +
  montar `CheckoutSheet` en esa pantalla) la próxima vez que se trabaje la
  sección Eventos; verificar el flujo de boletos completo al hacerlo.

### Servicios / Reservas nivel Booksy (2026-07-15)
- [ ] **Recordatorio de cita (push "1 hora antes").** The booking lifecycle pushes
  (nueva / confirmada / cancelada / reagendada / no-show) are live, but a
  time-based reminder needs a scheduler (pg_cron or an external cron hitting an
  edge function that scans `business_bookings` for upcoming confirmed citas).
  Booksy staple — add before public launch of the services vertical.
- [ ] **Horario propio por profesional.** Providers (service_config.providers)
  share the business's weekly hours; a pro who only works Vie–Sáb needs per-pro
  working hours + vacations. The double-booking guard already keys on staff_id,
  so this is additive (filter slots by the pro's hours client-side + validate).
- [ ] **Auto-confirmación opcional.** Today every cash booking lands "Por
  confirmar" (the founder-approved accept flow). Booksy also offers instant
  booking; would need an RLS-safe path (trigger reading service_config) to
  insert as 'confirmed'.
- [ ] **Campos de reserva personalizados por rubro** (the Handoff's "Campos de
  reserva · Restaurante"): the generic note + price-variant group cover most
  cases; a full custom-field builder is deferred until a rubro needs it.
- [ ] **Recordatorios SMS** (Premium banner in the module): needs the SMS/WhatsApp
  OTP decision (see Allowed external costs) — same gateway would serve both.

### Páginas legales — revisión + datos reales antes del lanzamiento (2026-07-22)
Las páginas `/terminos` y `/privacidad` ya existen (ES-first, EN secundario,
linkeadas en el footer y en el sitemap). Son **borradores profesionales**, no
consejo legal. Antes de lanzar con dinero real:
- [ ] **Revisión por un abogado** (marketplace + pagos + UGC + datos de ubicación
  + posible CCPA/California). Ajustar cláusulas de responsabilidad, arbitraje y
  reembolsos a lo que aplique al negocio.
- [ ] **Rellenar la entidad legal** (razón social / LLC, dirección) — hoy el texto
  no nombra una entidad.
- [ ] **Correo de contacto legal real.** Placeholder actual: `hola@tolatino.com`
  (constante `LEGAL_EMAIL` en `apps/web/src/screens/Legal.tsx`). Crear/enrutar ese
  buzón o reemplazarlo antes de publicar.
- [ ] **Política de reembolsos/cancelaciones dedicada** si se quiere separada de
  los Términos (hoy está resumida dentro de Términos §5).

### Módulos owner-facing — datos demo ocultados, features por cablear (2026-07-22)
Sprint 1: se ocultó todo dato fabricado que un negocio REAL veía como si fuera
suyo (regla #8). Lo que se ocultó tras "demo/showcase" o "Próximamente" y falta
cablear de verdad:
- [ ] **Billing — uso real por negocio.** Se ocultaron los medidores de uso
  inventados (284 pedidos, 428 hrs…), la tarjeta Visa ••4421 falsa, los toggles
  de complementos no-funcionales y la fecha de renovación fija. Un negocio real
  ve su plan real + fecha real de `business_subscriptions` y administra tarjeta/
  facturas en el portal de Stripe. **Falta:** agregación real de uso (pedidos/
  reservas/fotos/asientos del mes) y complementos como productos de Stripe reales.
- [ ] **Staff — horario / reloj / nómina / pipeline reales.** Roster y vacantes
  ya son reales (Supabase). Horario, Asistencia, Nómina y Candidatos muestran
  "Próximamente" para negocios reales (antes: 7 empleados, $22.8k nómina, todo
  inventado). **Falta:** scheduler de turnos, reloj de asistencia, integración de
  nómina y tabla de postulaciones para el pipeline.
- [ ] **Renta — walk-in "Rentar/Devolver" real.** Se quitó el teatro (botones que
  decían "depósito cobrado" sin escribir a la DB) para negocios reales; el ciclo
  real corre por solicitudes de cliente en el panel de operaciones. **Falta (si
  se quiere walk-in desde el panel):** insertar una `business_rental_orders`
  confirmada como walk-in con el manejo de depósito, respetando el modelo canónico
  (confirmación a nivel negocio aplicada por el servidor).

---

_Last updated: 2026-07-22. Add to this file as new deferrals appear._

### Eventos — handoff "Events Consumer Flow" (2026-07-23)
Consumidor: HECHO (detalle rico con tags/qué esperar/programa/organizador/reseñas,
selección de asientos y mesas con anti-doble-venta real, reseñas de evento,
responsive desktop, pago propio 5%). Migraciones 0113/0114 aplicadas + verificadas.
Panel del organizador + extras (2026-07-23b) — HECHO:
- [x] **Editor de mapa de asientos en el panel** (mig. 0115) — el asistente de
  crear evento (paso Boletos) elige General / Asientos numerados (filas×cols) /
  Mesas (con capacidad + FOTO), marca qué tier requiere asiento, y crea
  PAQUETES/addons (opcionales u obligatorios, solo-mesas o todos) + edad/incluye.
  `create_event_full` extendido con p_seating/p_attrs/p_addons.
- [x] **Paquetes de mesa** (addons obligatorios/opcionales) — re-precio 100%
  server-side (`resolve_event_addons`), usado por la ruta libre y por
  marketplace-checkout; el obligatorio se cobra aunque el cliente lo omita.
  Verificado: cobro $204.75 (VIP $45 + paquete $150, +5%).
- [x] **Fotos de mesa** — subida en el panel (WebP), se muestran en el selector.
- [x] **QR real en la confirmación** — stub de boleto con QR escaneable (reusa
  `<Qr>` de Mis Boletos).
- [x] **Explora por categoría** — grilla de categorías en la vista de Eventos
  (solo categorías con eventos cercanos + conteo).
Pendiente menor (opcional) — HECHO (2026-07-23c):
- [x] **Editar seating/attrs/addons de un evento YA creado** desde el panel —
  editor "Mesas y extras" en la pestaña Ajustes (`events.update`), carga
  round-trip fiel.
- [x] Editor de **programa/lineup + tags** en el panel (mismo editor). Edad/
  incluye también editables.

### Eventos — AUDITORÍA COMPLETA (2026-07-23d)
Auditoría de 3 frentes (backend/seguridad · UI cliente · panel organizador) vs
Eventbrite. Motor de ticketing verificado como sólido (re-precio 100% server,
anti-sobreventa atómico, check-in con lock, demo-vs-real honesto). **Defectos
cerrados** (mig. 0116 + webhook v18 + checkout v26 + Events.tsx/Eventos.tsx):
- [x] **Webhook idempotente atómico** — compare-and-swap `pending→fulfilling`;
  reentregas concurrentes de Stripe ya no emiten boletos 2× / redimen promo 2×.
- [x] **Publicación fallida ya no es invisible** — `create_event_full` se
  `await`, con rollback del row optimista + toast de error; nunca muestra
  "¡Publicado!" si falló. Evento fantasma eliminado.
- [x] **Checkout hospedado eliminado del backend** — `marketplace-checkout`
  exige `intent:true` (400 si no); checkout propio SIEMPRE a nivel servidor.
- [x] **Gate de pago incluye addons obligatorios** — tier $0 + paquete requerido
  ya no emite boleto gratis; cualquier dinero en negocio con Stripe → online.
- [x] **`event_reviews` sin INSERT directo** — solo vía RPC `post_event_review`
  (exige boleto); no más reseñas falsas por PostgREST.
- [x] **Liberar asiento al reembolsar** — trigger borra `event_seat_claims`
  cuando un boleto pasa a `refunded`.
- [x] **RLS endurecida** — `event_seat_claims` sin lectura pública (expone
  `user_id`), `events` sin exponer drafts (`status<>'draft' OR owner`).
- [x] **Crear evento activa el módulo `events`** — la pestaña Eventos aparece
  en la página del negocio (regla de gating), escribiendo el objeto completo.
- [x] **Evento "En línea"** — toggle en el asistente (antes cableado pero muerto).
- [x] **`saveLayout` ya no borra otras llaves de `attrs`** (merge, no clobber).
- [x] **Preview de pago aplica el promo** (usaba total bruto → mostraba 2 totales).
- [x] **Escribir reseña** — CTA + formulario (estrellas + texto) para quien tiene
  boleto, con estado vacío "sé el primero". Upsert vía RPC.
- [x] **Mapa de asientos con scroll horizontal** (no desborda en móvil) + asientos
  a 36px (mejor tap).

Pendiente menor de Eventos (no bloquea; polish/parity):
- [ ] **Export CSV de asistentes** y **refund/resend por asistente** en el panel
  (refunds/transfers ya listados como "Muy pronto"; el export es estándar).
- [ ] **Hold de asiento durante el checkout online** — hoy dos compradores pueden
  pagar el mismo asiento y uno se reembolsa (sin sobreventa; el `unique` arbitra).
  Opcional: claim efímero atado al pending, liberado por expiración.
- [ ] **Confirmar borrado de tier con ventas** + clamp de capacidad ≥ vendido
  (hoy borra en un tap; FK `set null` deja el boleto huérfano del tier).
- [ ] **Compartir enlace directo del evento** (usa `/eventos` genérico; el slug
  real ya existe, falta cablearlo).
- [ ] Polish: quitar hex crudos restantes (badge de precio, hero) → tokens;
  steppers/paginación a ≥44px; no unirse a waitlist en evento pasado.
- [ ] **Riesgo residual (monitorear):** un webhook que muere DESPUÉS del claim
  `fulfilling` y ANTES de `fulfilled`/`refunded` deja el row atascado en
  `fulfilling` (no se re-cumple). Ventana estrecha (1 RPC). Alertar sobre rows
  en `fulfilling` > N min.

### Bienes Raíces — vertical nueva (2026-07-23e)
Handoff elegido: el bundle de 3 archivos ("Real Estate Flow" — Consumer + Agent
+ Directory), enriquecido con el gate de licencia del handoff 1. Integración:
capa vertical sobre la app (categoría `RealEstate` de negocios + módulo
`inmuebles` del panel + cliente en `/bienes-raices`). Migración 0117 aplicada
(properties/leads/tours/saves, PostGIS+FTS+RLS, 7 RPCs).
- [x] Categoría **RealEstate** (negocios = inmobiliarias/agentes; inscripción =
  onboarding existente; directorio = `re_directory` + BizDetail).
- [x] Seeds: 4 agencias (Hazleton/Bronx, pago+free, logins `a@re1.com`…`b@re2.com`
  pass `123`), 16 propiedades con coords reales, 5 leads, 3 tours, reseñas.
- [x] Gate de licencia: publicar exige `re_config.license` (server-side en
  `upsert_property`).
Deferred (no bloquea v1):
- [ ] **Verificación real de licencia** (integración TREC/estado) — hoy el
  número se captura y se muestra; validar contra el registro estatal después.
- [ ] **Fotos reales de propiedades** — placeholders rayados hasta que los
  agentes suban fotos (upload ya soportado en el wizard).
- [ ] **Escuelas cercanas (GreatSchools)** — API de pago; evaluar fuente
  gratuita (NCES) después.
- [ ] **Alertas de búsqueda guardada** (notificar nuevos listados que matcheen)
  — requiere job/cron; hoy el guardado ♥ sí es cross-device.
- [ ] **Tab Propiedades en BizDetail**: gating módulo+contenido aplicado; los
  módulos por-defecto de negocios EXISTENTES no incluyen `inmuebles` (solo la
  categoría RealEstate lo activa al publicarse o vía Configurar módulos).

### Bienes Raíces — calculadora de hipoteca REAL (2026-07-24, Fase 1+2)
Migración 0118 + edge function `fred-rates` (v1) + BienesRaices/RealEstate.
- [x] **Tasa de interés real** — `market_rates` (Freddie Mac PMMS vía FRED), la
  calculadora arranca con el promedio nacional real y lo re-ajusta por plazo
  (30yr vs 15yr). Etiqueta "✓ Promedio nacional real · [fecha]".
- [x] **Impuesto y seguro reales por propiedad** — el agente los captura en el
  wizard (del registro del condado); la calc los usa con etiqueta **REAL**.
- [x] **Respaldo por estado** — tabla de tasa efectiva de impuesto + seguro por
  estado (Census/III) cuando el agente no los puso; etiqueta "est. [estado]".
- [x] **HOA y PMI** — HOA se suma al total; PMI se agrega solo cuando enganche
  < 20%. Disclaimer dinámico (real vs estimado).
- [x] Seeds: casas en venta con impuesto/seguro reales plausibles.

PENDIENTE DEL FOUNDER (1 vez, gratis) para activar la tasa VIVA:
- [ ] Obtener API key gratis de FRED → https://fredaccount.stlouisfed.org/apikeys
- [ ] Supabase → Edge Functions → Secrets: agregar `FRED_API_KEY = <tu key>`
- [ ] Supabase → programar `fred-rates` semanal (cron `0 12 * * 4`, jueves —
  PMMS se publica los jueves). Mientras tanto usa la tasa semilla (real, del
  16-jul) y no rompe nada.
Deferred (de pago, después):
- [ ] Impuesto por PARCELA desde registros del condado (ATTOM/Estated) — hoy el
  agente lo captura manual (ya es real por propiedad).
- [ ] Cotización de seguro real (API de aseguradora) y pre-aprobación con
  prestamista aliado (canal de ingreso).

### Autos / Dealer de carros — vertical nueva (2026-07-24)
Diseño elegido: base Z1 "Auto Flow" (el más rico) + injertos de Design A
(vender particular, Equipo). Migración 0119 aplicada (vehicles/vehicle_leads/
tests/saves, PostGIS+FTS+RLS, 7 RPCs, auto_config, categoría CarDealer).
- [x] Cliente /autos: descubrir (BHPH/ITIN toggle), detalle + historial,
  calculadora de financiamiento, pre-calificación 3 pasos (sin SSN/ITIN → lead
  prequal + pre-aprobado por crédito), prueba de manejo, comparar (3), trade-in,
  vender mi carro, guardados ♥, mapa MapLibre, directorio de dealers.
- [x] Panel del dealer (módulo vehiculos): inventario + estados, wizard 4 pasos
  con BHPH + geocodificación, leads pipeline, financiamiento (prequal), agenda
  de pruebas, Equipo (auto_config.team), gate de licencia, demo-mode honesto.
- [x] Registro: onboarding existente + categoría CarDealer (dealer/particular).
- [x] Seeds: 4 dealers (Hazleton/Bronx, pago+free, logins a@auto2/b@auto2/
  a@auto3/b@auto3 pass 123), 16 vehículos, leads con pre-cal, pruebas.
- [x] Pestaña Vehículos en BizDetail (gating módulo+contenido).
Deferred (de pago, después):
- [ ] **Historial real del vehículo** (Carfax/AutoCheck API) — hoy el dealer
  captura el historial (título limpio/accidentes/dueños) manual, ya es real por
  auto. Integrar proveedor cuando haya presupuesto.
- [ ] **Pre-calificación real** (underwriting con prestamista/bureau soft-pull)
  — hoy es estimado ilustrativo por crédito auto-reportado, claramente
  etiquetado; sin SSN. Integrar prestamista aliado (canal de ingreso).
- [ ] **Valor de trade-in real** (KBB/Black Book API) — hoy fórmula del handoff.
- [ ] **Fotos reales** — placeholders rayados hasta que suban.

### Super Admin — FASE 1 construida (2026-07-24)
Migraciones 0120 (fundación) + 0121 (RPCs) aplicadas. Ruta `/admin` en vivo.
- [x] **Seguridad**: tabla `admins` con 4 roles, `_require_admin()` en TODOS los
  RPCs (plpgsql con `perform`, no subconsulta — garantizado), `admin_audit`
  INMUTABLE (trigger bloquea update/delete), tablas sensibles con RLS deny-all +
  REVOKE. Verificado: no-admin recibe `forbidden` en cada RPC y ve 404.
- [x] **Suspensiones que muerden**: usuario suspendido → bloqueado en el trigger
  UGC (punto único: posts/comentarios/reseñas/propiedades/vehículos/leads/
  tours/pruebas/reportes/reclamos). Negocio suspendido → filtrado de
  `search_businesses` y `business_by_slug`. Ambos verificados end-to-end.
- [x] **Inicio**: KPIs reales (567 usuarios, 548 negocios, GMV $4,706.45/30d,
  comisión $630.57) + alertas accionables (pagos atascados, licencias, reportes,
  reclamos, suspendidos).
- [x] **Usuarios**: buscar/filtrar, ficha 360°, suspender (1d/7d/30d/1año con
  razón obligatoria) y reactivar. Los admins no se pueden suspender.
- [x] **Negocios**: buscar/filtrar por plan y estado, ficha con dinero 30d,
  cambiar plan, suspender/reactivar, ver como cliente.
- [x] **Licencias**: cola de agentes/dealers, aprobar/rechazar → insignia.
- [x] **Bitácora**: toda acción con actor, razón, antes/después.
- [x] Tablas de Fase 2 ya creadas (claims, reports, platform_flags/config) para
  que esa fase sea solo UI.

PENDIENTE DEL FOUNDER (seguridad, 1 vez):
- [ ] **Cambiar la contraseña del superadmin** `dev@payxer.com` (la generada se
  entregó una sola vez en el chat). Hazlo desde Supabase → Authentication →
  Users, o con "olvidé mi contraseña" cuando SES esté configurado.
- [ ] Antes del lanzamiento público: revisar `admins` y quitar cualquier cuenta
  de prueba.

### Super Admin — FASE 2 construida (2026-07-27)
Migraciones 0122–0125 aplicadas + `refund-purchase` v4. Cuatro secciones nuevas
en `/admin` y su contraparte en el lado usuario.
- [x] **Moderación**: cola unificada de reportes con el contenido en contexto
  (autor, texto, cuántas veces lo reportaron). Ocultar (reversible) / Eliminar
  (solo UGC) / Descartar, con razón → bitácora. Ocultar saca el contenido de
  TODAS las lecturas del cliente vía RLS (`using (not hidden)`), no por filtro
  en cada consulta. Verificado: reseña ocultada desaparece del negocio y vuelve
  al mostrarla.
- [x] **Reclamos**: hilo de 3 lados (cliente · negocio · admin) sobre el mismo
  objeto. Tomar el caso, responder, resolver/rechazar con explicación que le
  llega al cliente. Lado usuario en Mi cuenta → Mis reclamos.
- [x] **Dinero**: ledger completo con filtros y total, monitor de pagos cobrados
  sin entregar (con reintento), y **reembolso manual de cualquier pago** con
  razón obligatoria (revierte el pago al negocio y nuestra comisión).
- [x] **Pedidos**: pedidos + reservas + rentas + boletos en una sola lista, con
  cambio de estado como último recurso (avisa al cliente, queda en bitácora).
- [x] **Reportar** en las 9 entidades: publicación, comentario, reseña, reseña
  de evento, negocio, evento, propiedad, vehículo, novedad. Todo cae en la MISMA
  cola. `post_reports` (0009) quedó obsoleta — no volver a escribirla.
- [x] Bugs de boletos encontrados verificando en navegador real y corregidos en
  0125: `events.owner_id` es el USUARIO organizador, no un negocio — por eso los
  boletos salían "Sin negocio", el reclamo por boleto guardaba un id inválido, y
  el reembolso de boletos no invalidaba ninguno (el cliente podía entrar gratis
  con el dinero ya devuelto).

PENDIENTE DEL FOUNDER (Fase 2):
- [ ] **Usuario `admin-e2e@tolatino.test`**: quedó en `auth.users` BLOQUEADO y
  sin privilegios (no está en `admins`, no puede iniciar sesión). No se puede
  borrar porque la bitácora es inmutable y lo referencia — eso es la garantía
  funcionando. Déjalo así; si algún día quieres limpiarlo, hay que decidir qué
  hacer con esas entradas de bitácora primero.
- [ ] Las entradas de bitácora `report.hide` / `report.unhide` con razón
  "e2e fase 2" son de esa verificación — se quedan (es inmutable, a propósito).

### Super Admin — FASE 3 + rediseño v2 construida (2026-07-28)
Migraciones 0126–0129. `/admin` rediseñado por completo al handoff v2 (14
secciones, escritorio-primero con drawer móvil, nav por rol). Verificado en
navegador real (escritorio 1440 + móvil 402) y seguridad por rol contra prod.
- [x] **14 secciones** con la cara v2: Inicio · Zonas · Usuarios · Negocios ·
  Licencias · Stream · Moderación · Reclamos · Dinero · Pedidos · Contenido ·
  Catálogo · Notificaciones · Analíticas+Sistema · Módulos (5 verticales).
- [x] **Nav por rol** aplicada en UI (secciones atenuadas) y **exigida en el
  servidor** (moderador bloqueado en Dinero/kill-switches/reembolsos — probado).
- [x] **Zonas / Analíticas / Salud** con datos reales de producción.
- [x] **Kill-switches** (platform_flags) con efecto real e inmediato; solo
  superadmin puede cambiarlos, con razón → bitácora.

PENDIENTE DEL FOUNDER / DEFERIDO A ESCALA (Fase 3):
- [ ] **Zonas por BARRIO**: hoy la unidad es la CIUDAD (los negocios solo guardan
  `city`, no barrio). Cuando se capture barrio en el alta de negocio, `admin_zones`
  agrega por barrio sin cambiar la UI.
- [ ] **Stream con IA real**: hoy el marcado es por palabras clave
  (`_stream_flag`). Un modelo real de moderación (o un servicio) reemplaza esa
  función cuando se decida — la UI ya muestra motivo + % de confianza.
- [ ] **Embudo completo**: hoy mide vistas→contacto→pago (lo que sí trackeamos).
  Los pasos "abrió menú / agregó al carrito" necesitan tracking de eventos en el
  cliente (business_metric_daily con esas `kind`).
- [ ] **Broadcast a escala**: el envío inserta notificaciones hasta un tope de
  5,000 en vivo y guarda el alcance total real. A 1.2M el fanout debe ser un job
  (BullMQ) — el historial ya no miente (guarda reach vs sent).
- [ ] **Trabajos y Transporte**: módulos en piloto (aviso ámbar). Se activan
  cuando esas verticales se construyan como producto.
- [ ] **Invitar admin**: asciende una cuenta que YA existe (no crea usuarios).
  Para un admin nuevo, que la persona se registre primero en To'Latino.
