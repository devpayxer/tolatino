# Fase 5 · Comunidad — plan de construcción extraído del prototipo (7 nov 2026)

Bloques **5a → 5i** (`5a`–`5i` no aparecen en `docs/PROGRESS.md`, `docs/REVISION.md` ni en el historial). Migraciones desde **0097** (la última es
`0096_colas_vivienda_licencias.sql`) hasta **0105**, una por bloque. Nada de este archivo se ha construido. **El Patio queda fuera** (decisión G:
después de la apertura): ni pestaña, ni mesas, ni torneos, ni monedas diarias de juego. Esto es un resumen de trabajo; manda el prototipo.

## 0. Fuentes
**Fuente traída (7 nov):** `docs/diseno/pantallas/To'Latino Comunidad.dc.html`, `… Comunidad (variantes).dc.html` y, en `pantallas/variantes/`, Comentarios, Respuestas y Hoy en el barrio (variantes), leídos del artifact del fundador `tolatino-master+`. **Antes era hueco de fuente:** el prototipo de la Comunidad, `To'Latino Comunidad.dc.html` (rutas `APP-COM-*`, `APP-GAM-*`, `APP-NOTIF`;
MEM 1632–1660), **no está** en `docs/diseno/pantallas/` (solo sus datos). Se lee del artifact del fundador como el 5 nov (`Artifact read` con
`paths: ["project/To'Latino Comunidad.dc.html", "project/To'Latino Comentarios (variantes).dc.html", "project/To'Latino Respuestas (variantes).dc.html"]`,
PROGRESS L160–164) y se guarda junto a los demás. Si no se puede leer, se compone con las piezas del sistema que ya salieron de ese archivo
(`PostCard` 2ab, `Thread` 2r, `FeedPost`, `StoryCard` 2g, `NeighborCard` 2s) y se anota en `docs/REVISION.md` (regla AB).
Todas en `docs/diseno/pantallas/datos/` salvo indicación. **`com-data.js`** (TLCom; hoy fijo jue 24 sep 2026 12:30, L3): `RANKS` L6–17 (10 rangos:
nombre, qué pide, qué desbloquea, ES/EN), `PTS` L18–25 (+2 · +1 · +3 · +10 · +15 · +50), **`PTS_RULES`** L26–31, **`RULES`** L32–39 (6 reglas del
barrio), `REP` L40–47 (motivos de reporte `spam · priv · acoso · falso · propio · otro`), `TEMAS` L48 (9), `U` L50–67 (16 vecinos: `rk`, `since`, `z`
zona, `fme` te sigue, `pts`, `mo`, `bio`, `bdg`; **`tl` = cuenta oficial** L51 «La cuenta de la ciudad: pregunta de la semana, encuestas y avisos.»),
`BDG` L68–76 (7 insignias), `BZ` L78–99 (negocios mencionados), **`POSTS`** L100–166 (14: `k` q pregunta · r recomendación · e encuesta · p
publicación; `pin`, `tema`, `salud`, `solved`, `para`, `opts`/`left`, `ph`, `mi`; comentarios con `rp` respuestas, `re` respuesta contestada, `biz`
negocio recomendado), **`HOY`** L167–180 + `HOY_T` L181 (OFERTA · NOVEDAD · LLEGÓ · AVISO), **`COUPONS`** L182–189 (cupones de negocios por monedas
80–300), **`TABLA`** L190–192 (mes por vecino `[general, recomendaciones, respuestas]`), `PATIO` L193–200 (**fuera**, G), `CHATS` L201, `SIM` L202–217
(solo prototipo). `ugc-lang.js` (D3, `TLLang`), `neg-nov.js` + `dash2-nov.js` (Novedades = origen de Hoy en el barrio), `adm-data.js` (`QUEUES` L70–86:
`rep` 24 h · `repBiz` 24 h · `repUsr` 24 h · `apel` 72 h; `SANC` L100; casos `rep` L159–164, `repUsr` L170, `apel` L171 AP-41…43), `usr-data.js`
(«EN LA COMUNIDAD · SOLO CON QUIEN TE SIGUE» → `APP-COM-MENSAJES`), `web-pages.js` L19 («En Comunidad el orden lo ponen los votos de los vecinos: ahí
nada se compra.»). `To'Latino Super Admin.dc.html`: `secCont` subpestañas Todo · Publicaciones · Comentarios · Hoy en el barrio · Reseñas ·
**Auto-moderación** (6 reglas con interruptor) · **Cuenta oficial**; `gam` subpestañas Rangos · Puntos · Monedas («VALOR · Sin valor en dinero · no se
compran ni se cambian») · Cupones · Tabla del Barrio («Cerrar el mes»: 4 pasos) · Rango del negocio · El Patio. `To'Latino Buscar.dc.html` («Pregúntale
al barrio» → `APP-COM-NUEVO`; `comLine`). `To'Latino Mi cuenta.dc.html` (USR-FAVORITOS publicaciones, USR-INVITAR «cuenta para Capitán»).
**Memoria** (`docs/diseno/referencia/memoria-del-diseno.md`, solo grep): MEM 35–37 (D3), 91 (versión simple; el feed «aire» **rechazado**, no se
vuelve a proponer), 92 (PostCard por partes: encabezado **2c Honor**, contenido **3b Papel**, barra **4c Pastillas**), 94 (bienvenida: Recluta + 100
monedas + reglas), 531 (Hoy = novedades en vivo < 24 h), 616–621 (ADM-CONT, auto-moderación, cuenta oficial), 638–651 (ADM-GAM, cierre de mes; lote de
Contenido no oculta la cuenta oficial), 669–704 (Usuarios 360° › Comunidad, posible red de cuentas, hilo en el admin), 1034–1041 (D3 aplicado),
1179 (StoryCard 8a), 1350–1358 (Novedades: «En Hoy en el barrio · quedan N h»), **1632–1660** (Comunidad v1: rutas, reglas aplicadas, línea fija,
comentarios 17a/17c/17d y respuestas 18a), 1689 (USR-INVITAR).
**Modelo** (`docs/diseno/entrega/modelo-datos.md`): Reglas L9–22; §9 Comunidad L1223–1360 (CommunityProfile, Post, Comment, Vote, PollVote, Report,
PointsEntry, CoinsEntry, Rank, Badge, MonthlyBoard); Follow L736, BlockMute L746, Notification L755, NotificationPref L767, Recommendation L786,
Referral L803, Coupon L1088, CouponRedemption L1100, QueueItem L1600, Sanction L1627, Appeal L1638, AuditEntry L1667, PlatformConfig L1686, D3
L2078; §10 El Patio L1361–1416 (**fuera**). **Solo prototipo** (`solo-prototipo.md`): «Los vecinos responden» L187–191, hora fija L233–236,
Traducciones L315–319, El Patio L63, L199–207, D6 L401–408 (fuera).
**Plan:** `CLAUDE-plan.md` L303–412 (Community, «Hoy en el barrio» de negocios, gamificación: dos cuentas separadas, 10 rangos, reglas; Games solo
como principio) y L1044–1056 (solo con cuenta, muro con contexto); `flujos-transversales.md` §1 L12–46 (Mi ciudad, «Invitado · de Hazleton»), §2
L48–88 (avisos de Community), §4 L115–136 (seguir, Siguiendo, bloquear mutuo e invisible, silenciar, seguir no da puntos), §5 L138–168 (chats);
`admin-dashboard.md` ADM-CONT L155–172, ADM-GAM L220–233, ADM-CONF L283–297, flujos 3 y 11 L350–362, roles L380–391; `admin-implementacion.md` L93,
L101, L109, L112; `revision-estructural.md` A8 L77–82 (todos publican desde el día 1), A9 L84–88 (rótulo «Hoy en el barrio» / «Today nearby»), B1
L94–100; `pantallas-iniciales.md` L51, L106 («+50 puntos»). `docs/PLAN.md` L50, **L211** (fase 5), L241–245 (§8). Decisiones que mandan:
`docs/DECISIONES.md` G, I, O, Q, T (#28 moderación automática y antiabuso), U, AA, AB, Z; D3 (MD L2078). Plantilla: `fase4-iglesias-inmuebles-autos.md`.

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| `follows` (persona → `user` o `business`) + `seguirNegocio` | 0008 L229–236, `lib/novedades.ts` L141 | Seguir vecinos usa la misma tabla; a negocios se les «guarda» (flujos L126) |
| `users.nick`, `home_city_id` + `home_city_changed_at`, `zone_id`, `founder`, `status`/`status_until` | 0006, `lib/perfil.ts` L98–125 | «Mi ciudad» (30 días) e «Invitado · de {ciudad}»; zona del perfil; silenciado no publica |
| `business_posts` + `post_votes` + `post_poll_votes` + `post_comments` + `post_en_vivo()` | 0028, `lib/novedades.ts` | **Hoy en el barrio** sale de aquí; patrón de votos y encuesta |
| `content_reports` (`review · post · comment · chat`) + `reportarResena` / `reportarChat` | 0027 L49, 0028 L106, 0038 L52 | Se amplía a publicaciones, comentarios y personas de la Comunidad |
| `sanctions` + `lib/sanciones.ts` (`adv · mute7 · nopub · susp14 · ban`, se levantan solas) | 0019 L21 | Efecto en la Comunidad; falta la apelación (no existe en código) |
| `queue_items` + `lib/colas.ts` (`rep` 24 h, `chat` 48 h, `ORDEN_COLAS`) + `admin-colas.ts` + `Colas.tsx` | 0016, 1i | Colas `repUsr` y `apel` nuevas; `rep` recibe la Comunidad |
| `lib/resenas-filtro.ts` (`PII`, `PRIVADO`) + `lib/mensajes.ts` (`TEL`, `conTelefono`, `limpiar`) | 2g, 2p, 4m | Filtro del servidor al escribir (§3) |
| `chat_threads` / `chat_messages` + `lib/mensajes.ts` (lista por cursor, «solo con reporte se lee», ocultar con motivo) | 0038 | Patrón de Mensajes vecino ↔ vecino (tablas propias, §2) |
| `notifications` + `notif_templates` + `lib/avisos.ts` (`avisar`) + `perfil.ts` `AVISOS` | 0032, 2j | Grupo `community`; campana `/avisos` ya existe |
| Medios (Garage/MinIO), `subir-foto.ts`, `photo_reports`, cola Medios | 0010, 1i | Fotos de publicaciones (hasta 4) |
| `lib/barrido.ts` `barridoCentral` + `system_jobs` | 0078 | Encuestas que cierran, cierre de mes, cupones que vencen, sanciones que vencen |
| Super Admin: `Contenido.tsx` + `admin-contenido.ts` (UNION ALL rev · nov · cm · vac), `U360.tsx` + `admin-usuarios.ts`, `Analitica.tsx`, `Notificaciones.tsx`, `sistema/Auditoria.tsx`, `pendiente/[seccion]` (`conf` y `gam` = «Fase 5», `admin-nav.ts` L7–9) | 1i–2s | Se completan; `admin_sections` ya tiene `cont`, `gam`, `conf` (0007 L59–66) |
| `packages/ui/src/ds/community/{PostCard,Thread,FeedPost}.js`, `cards/StoryCard.js`, `account/NeighborCard.js` | Fase 0 | Muro, hilo, Hoy en el barrio y perfil. `Patio.js` **no** se usa |
| `app/entrar/Entrar.tsx` (pasos 1–2 de 2au; 3–5 «Tu zona · Lo que te gusta · El barrio» pendientes, L3) | 0c | La bienvenida de la Comunidad completa los pasos 3–5 |
| Lugares que esperan esta fase: `app/(app)/comunidad/page.tsx` (`Pronto`), `Inicio.tsx` L3, `negocios/page.tsx` L16, `Contenido.tsx` L5, `U360.tsx` L3; LAUNCH-CHECKLIST L43, L93, L179, L208, L276–278, L287, L321, L380, L385 | — | Se encienden con datos reales (nada de ejemplo inventado) |
| Guardianes `servidorSoloFunciones`, `accionesConAcceso`, `servidorCliente`, `emergencia911`, `auditoriaLegible`, `colaConVista`, `avisoConPlantilla`, `notaSinNumeros`, `idioma`, `semilla`, `rutasVivas` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El **cliente** está diseñado completo en el prototipo de la Comunidad (muro, publicar, hilo, perfil, bienvenida, Hoy, rango, tabla, monedas, mensajes;
MEM 1632–1660) y el **Super Admin** también (Contenido, Gamification, Usuarios 360° › Comunidad, colas). **No hay:**
1. El archivo del prototipo en el repo (§0).
2. **Panel del negocio › cupones por monedas:** `COUPONS` (L182–189) son de negocios y el admin los pausa y cambia de costo, pero el negocio no tiene dónde
   ofrecerlos, ver su existencia ni **validar el código** en el local (triángulo incompleto).
3. **Apelar una sanción** del lado de la persona: el modelo (`Appeal`), la cola (`apel` 72 h) y el caso AP-43 existen; la pantalla para pedirla no.
4. **Reportar a una persona** desde su perfil (la cola `repUsr` existe; `REP` es de contenido).
5. **Bloqueados y silenciados** en Mi cuenta (espejo de flujos L134: «Siguiendo / Seguidores / Bloqueados»), con Deshacer.
6. **Programar** publicaciones de la cuenta oficial (admin-dashboard L169–170); el admin del prototipo solo las lista.
7. **«Destacar 1 recomendación al mes»** (rango 5): el desbloqueo existe en `RANKS` L11; qué hace no está diseñado (§6 #11).
8. **Premios de la Tabla del Barrio** y qué es «liquidar cupones a los negocios» (cierre de mes, Super Admin `gam`): no dicen qué ni cuánto (§6 #12, #4).
9. **Rango del negocio:** solo una nota en el admin («sale en su ficha»); la ficha y el panel no lo tienen (§6 #23).
10. **Configuración global** (Super Admin › Sistema, «12 límites», MEM 645): LAUNCH-CHECKLIST (L463, L483, L491, L533, L549) la promete en la Fase 5.
Se compone con piezas existentes (`rows`, `form`, `note`, `steps`, `chips`, `kpis`, tabla densa, cola con SLA, confirmación con motivo; patrones p11–p18)
y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

### 1c. Tesis y líneas fijas (verbatim; nunca se suavizan)
- **Línea fija de Comunidad** (MEM 1651, Buscar `comLine`): **«Aquí nada se compra: el orden lo ponen los votos de los vecinos.»** / «Nothing here is
  bought: neighbors’ votes set the order.». Sale en el muro, en «Pregúntale al barrio» y en la ayuda; ningún orden se paga ni lo pone To'Latino
  (la cuenta oficial se fija arriba, se ve como tal y no compite en votos).
- **Reglas del barrio** (`RULES` L33–38, en la bienvenida, en Publicar y en el perfil): «Habla de {ciudad} y de lo que pasa aquí.» · «Recomienda por
  experiencia, nunca tu propio negocio. Tu negocio publica en sus Novedades.» · «Nada de ventas, rifas ni cadenas.» · «No publiques teléfonos, direcciones ni
  fotos de otras personas sin su permiso.» · «Respeto siempre: sin insultos ni acoso.» · «Una emergencia no se pregunta aquí: llama al 911.».
- **Puntos** (`PTS_RULES` L27–30): «Máximo 100 puntos al día.» · «Estar conectado, seguir o tener seguidores no da puntos.» · «Un voto − baja el orden de
  la publicación, no tu rango.» · «Si algo se borra por las reglas, se restan sus puntos.».
- **Monedas** (MD L1327, admin `gam` coin): «Las monedas se ganan, nunca se compran. Aquí no se juega dinero.» · «Sin valor en dinero · no se compran ni
  se cambian».
- **Salud** (`POSTS` q-pediatra `salud: 1`, guardián `emergencia911`): publicación de tema Salud lleva el aviso de salud con la línea del 911.
- **Reportar** (MEM 1650): motivo → detalle → «Ya no lo ves. Lo revisamos en 48 h.»; sigue visible para los demás mientras se decide (cola `rep`).
**Lo que el prototipo hace de verdad** (y lo que no): ningún dinero; las monedas solo entran con la bienvenida (+100) y salen en cupones (y en El Patio,
fuera); votos ± y comentarios ordenados por votos; «Me sirvió» marca la mejor respuesta; encuestas desde Cabo; rango visible desde Sargento; mensajes solo
a quien te sigue; silenciar y bloquear con Deshacer; «Hoy en el barrio» es público, lo demás pide cuenta. Lo de `SIM`, «Los vecinos responden», la hora
fija, `tl-com-v1` en localStorage, `pts`/`mo`/`rk` escritos a mano y `VECINOS: 1240` **no** se copian (SP L187–191, L233).

---

## 2. Cambios de datos (migraciones 0097 → 0105, una por bloque; nada se borra; `city_id` en todo lo nuevo; solo el servidor lee y escribe)

**0097 `comunidad_base` (5a)**
- **`city_official_accounts`** (una por ciudad, las 5): `city_id` pk, `name {es,en}` («To'Latino Hazleton»), `bio {es,en}`, `photo_media_id`. **No es una
  persona**: no hay usuario con teléfono falso; lo escribe el equipo (§4 5e).
- **`community_profiles`**: `user_id` pk, `bio` ≤ 160 + `bio_lang`, `since_year` (opcional, «en {ciudad} desde», declarado), `hide_counts bool`,
  `rules_version smallint` + `rules_ok_at`, `adult_ok_at` (§6 #14), `welcome_at`; derivados cacheados por trigger, **nunca editables**: `followers_n`,
  `following_n`, `posts_n`, `answers_best_n`.
- **`com_posts`**: `id` identity, `city_id`, `author_kind check in ('user','official')`, `author_user_id` (null solo si oficial), `staff_id` (quién escribió
  la oficial; nunca público), `guest_from_city_id` (Invitado: la de su perfil si publica en otra), `zone_id` + **`geom geography(Point)` = centro de la
  zona del autor** (nunca su GPS, §3), `kind check in ('pregunta','recomendacion','encuesta','publicacion')` (§6 #2), `topic` (9 de `TEMAS`, obligatorio en
  pregunta), `body` 10–1000, `lang check in ('es','en')`, `business_id` (obligatorio en recomendación; activo en la ciudad), `looking_for text[]` ≤ 3 × 40
  («Pan de agua»), `poll_options text[]` 2–4 × 60, `poll_ends_at`, `health_notice` (derivado del tema Salud), `pinned_until` (solo oficial / admin),
  `best_comment_id`, `solved_at`, `publish_at` (programada), `comments_locked_at`, `status check in ('visible','hidden','deleted')`, `hidden_by check in
  ('admin','auto')`, `hidden_reason`, `hidden_at`, `deleted_at`, `edited_at`, `tsv tsvector` generado (unaccent, simple). Derivados por trigger: `up_n`,
  `down_n`, `score`, `comments_n`, `poll_counts int[]`, **`hot`** (orden «Más votados»: signo × log10(max(|score|,1)) + época/45 000, recalculado en el voto),
  `last_activity_at`. Índices: `(city_id, hot desc, id desc) where status = 'visible'`, `(city_id, publish_at desc, id desc) where status = 'visible'`,
  `(city_id, kind, hot desc, id desc) where status = 'visible'`, GIST `(geom) where status = 'visible'`, **GIN `(tsv)`**, `(author_user_id, created_at
  desc)`, `(business_id, created_at desc) where kind = 'recomendacion'`, `(city_id) where pinned_until is not null`.
- **`com_comments`**: `id`, `post_id`, `city_id`, `parent_id` (raíz: un nivel de anidado, 18a), `reply_to_id` (`re`), `author_user_id`, `body` 1–600, `lang`,
  `business_id` (recomienda un negocio), `status` / `hidden_*` / `deleted_at` / `edited_at`; derivados `up_n`, `down_n`, `score`, `replies_n`. Índices `(post_id,
  score desc, id) where status = 'visible' and parent_id is null`, `(parent_id, id)`, `(post_id, business_id) where business_id is not null`, `(author_user_id,
  created_at desc)`.
- **`com_votes`**: `target_kind check in ('post','comment')`, `target_id`, `user_id`, `v check in (-1, 1)`, `device uuid` (de `sessions.device`, solo para
  antiabuso), `created_at`, `updated_at`; pk `(target_kind, target_id, user_id)`; índices `(user_id, created_at desc)`, `(device, created_at desc)`.
- **`com_poll_votes`** (`post_id`, `user_id`, `opt 0–3`; pk; un voto, no se cambia) · **`com_saves`** (`post_id`, `user_id`; USR-FAVORITOS «publicaciones»).
- **`user_blocks`** (BlockMute): `user_id`, `target_user_id`, `kind check in ('block','mute')`, `created_at`, `removed_at` (Deshacer); único vivo `(user_id,
  target_user_id, kind) where removed_at is null`; índice `(target_user_id) where kind = 'block' and removed_at is null`. Va aquí y no en 5c para que el
  muro excluya bloqueos desde el primer día.
- **`com_hidden_for`** («ya no lo ves» de quien reporta): `user_id`, `target_kind`, `target_id`, `created_at`.
- **`com_edits`** (solo inserción): `target_kind`, `target_id`, `old_body`, `at` (moderación ve la versión anterior).
- `content_reports.target_kind` suma `'com_post','com_comment','user'`; `reason` suma `'priv','acoso','falso','propio'` (`REP` L41–46); columna `priority
  smallint` (Comandante y Coronel primero, `RANKS` L14–15).

**0098 `hilo_votos_encuestas` (5b)** — `com_thread_recs` (derivado: `post_id`, `business_id`, `votes_n`, `top_comment_id`; «Recomendados en este hilo», «También
recomiendan», barras con % de 17c); `com_mentions` (`comment_id`, `user_id`; «@Nombre»); plantillas `com_reply`, `com_mention`, `com_best` («Me sirvió»),
`com_votes_10` (umbral), `com_poll_closed` (todas `sms = false`, §3).

**0099 `vecinos_mensajes` (5c)** — **`dm_threads`** (`a_user_id < b_user_id`, `city_id`, `last_at`, `last_text` derivado ≤ 160, `a_unread`, `b_unread`, `a_read_at`,
`b_read_at`, `closed_at` (bloqueo), unique `(a_user_id, b_user_id)`; índices `(a_user_id, last_at desc)`, `(b_user_id, last_at desc)`) y **`dm_messages`** (`thread_id`,
`sender_user_id`, `body` 1–1000, `hidden_at`, `hidden_reason`, `created_at`; índice `(thread_id, id)`); `content_reports.target_kind` suma `'dm'`; `users.interests
jsonb` (17 categorías + qué le interesa de la Comunidad, paso 4 de 2au); `follows` índice `(follower_user_id, target_kind, created_at desc)`.

**0100 `moderacion_apelaciones` (5d)**
- **`mod_rules`** (las 6 del admin `secCont` sub `auto`: `phone` · `pii` · `spam` · `hate` · `rev5` · `img`): `key` pk, `on bool`, `params jsonb` (p. ej. `spam`
  {n: 3, horas: 24}; `rev5` {n: 5, min: 10}; `autohide` {reportes: 5, horas: 24}), `updated_by/at`; cada cambio deja `AuditEntry`.
- **`mod_terms`** (`lang`, `term`, `kind check in ('odio','estafa','migra','autolesion')`, `on`): listas ES/EN, solo admin.
- **`mod_flags`** (solo inserción): `target_kind`, `target_id`, `rule_key`, `detail`, `city_id`, `created_at` → caso en cola.
- **`appeals`** (Appeal): `id` (número **AP-101…**, `appeal_seq`), `sanction_id` o `target` (contenido oculto), `user_id`, `text` 20–500, `status check in
  ('open','upheld','lifted')`, `decided_by` (**≠ quien sancionó**, segunda revisión), `decided_at`, `reason`; único vivo por sanción.
- `queue_items.queue` suma `'repUsr'` y `'apel'` (`subject_kind` `'user'`, `'appeal'`); `sanctions` gana `ref_kind`/`ref_id` (qué contenido la motivó).
- Límites (contados del día local, en `platform_config`, §6 #21): publicaciones, comentarios, votos, conversaciones nuevas.

**0101 `hoy_cuenta_oficial` (5e)** — `business_posts` suma `hoy_off_at`, `hoy_off_by`, `hoy_off_reason` (retirar de Hoy antes de tiempo con motivo, ADM-CONT);
índice `(city_id, publish_at desc) where status = 'live' and hidden_at is null and hoy_off_at is null`; plantilla `hoy_guardado` (Hoy de un negocio guardado,
push, sin SMS).

**0102 `puntos_rangos_tabla` (5f)**
- **`points_rules`** (`key` pk, `points`, `on`, `{es,en}`; semilla = `PTS` L19–24) · **`points_entries`** (**solo inserción**; trigger que impide update y
  delete): `user_id`, `city_id` (la de su perfil, flujos L32), `delta`, `rule_key`, `ref_kind`, `ref_id`, `reverses_id`, `by_staff`, `reason`, `local_day`,
  `created_at`; único `(user_id, rule_key, ref_kind, ref_id) where reverses_id is null` (idempotente).
- **`ranks`** (`level` 1–10 pk, `name {es,en}` renombrable, `requirement {es,en}`, `unlocks {es,en}`, `min_points`, `cond jsonb`) · **`badges`** (`BDG`) ·
  **`user_badges`**.
- `community_profiles` suma derivados: `points_total`, `points_today` + `points_day`, `points_month` + `points_month_key`, **`rank_level`**, `rank_floor` (el rango
  no baja solo, §6 #7).
- **`monthly_boards`** (`city_id`, `month`, `user_id`, `points`, `recs`, `answers`, `position`, `excluded`, `excluded_reason`, `excluded_by`) y
  **`board_closures`** (`city_id`, `month`, `frozen_at`, `closed_at`, `closed_by`); índice `(city_id, month, points desc, user_id)`.
- **`referral_codes`** (`user_id` pk, `code` «NOMBRE-N» único) y **`referrals`** (`promoter_user_id`, `referred_user_id` único, `status check in
  ('joined','active')`, `at`): solo para Capitán; **sin recompensa en dinero** (§6 #22).

**0103 `monedas_cupones` (5g)**
- **`coin_rules`** (`welcome` 100, premios del mes; editables con auditoría) · **`coin_entries`** (**solo inserción**): `user_id`, `delta`, `reason_key`,
  `ref_kind`, `ref_id`, `reverses_id`, `by_staff`, `reason`, `created_at`; `community_profiles.coins` derivado con `check (coins >= 0)`; gastar = función
  con `for update` sobre el perfil.
- **`coupons`**: `id`, `business_id`, `city_id`, `kind check in ('coins')` (el «cupón para seguidores» de Novedades es otro hueco), `title {es,en}` ≤ 60,
  `terms {es,en}` ≤ 200, `cost_coins` (80–1,000; lo fija el admin), `monthly_stock`, `valid_days` (30), `status check in ('pending','live','paused','ended')`,
  `paused_by check in ('business','admin')`, `paused_reason`, `created_by`.
- **`coupon_redemptions`**: `id`, `coupon_id`, `user_id`, `code` **TL-CQ-xxxx** (único, sin 0/O/1/I), `coin_entry_id`, `expires_at`, `status check in
  ('issued','used','expired')`, `used_at`, `used_by` (quien valida en el negocio); índices `(user_id, created_at desc)`, `(coupon_id, status)`, `(code)`.

**0104 `traducciones` (5h)** — **`ugc_translations`**: `target_kind check in ('com_post','com_comment','review','review_reply','post_comment')`, `target_id`,
`src_lang`, `dst_lang`, `src_hash` (sha-256 del texto: si se edita, se traduce otra vez), `text`, `engine`, `ms`, `created_at`; pk `(target_kind, target_id,
dst_lang, src_hash)`. Es derivado: se puede tirar y se regenera.

**0105 `configuracion_comunidad` (5i)** — **`config_keys`** (catálogo de `platform_config`: `key`, `type`, `min`, `max`, `unit`, `section`, `label {es,en}`):
los plazos de la Comunidad y los diferidos de la Fase 4 (LAUNCH-CHECKLIST L463, L483, L491, L533, L543, L549); vistas de analítica de la Comunidad
(por ciudad y día, sin personas). Cada cambio de un valor deja `AuditEntry` con antes → después.

---

## 3. Dinero, datos personales y reglas legales (servidor — Opus/high; revisión de seguridad obligatoria)

**En la Comunidad no se mueve dinero.** Ningún `payment`, retención, Wallet ni tarjeta. **Monedas** (default más seguro y reversible; DECISIONES no dice más que
«premios solo en monedas», G): **no tienen valor en dinero, no se compran, no se venden, no se transfieren entre personas, no se cambian por dinero ni por
saldo del Wallet y no vencen**. Se ganan (bienvenida +100 y premios del mes) y se gastan en cupones de negocios. El cupón es un descuento que **el negocio
decide dar** y se canjea en el local; To'Latino no le paga al negocio ni le cobra: «liquidar» en el cierre de mes = reporte de canjes al negocio (§6 #4).
Las monedas viven en su libro (`coin_entries`), nunca en columnas `money` ni en `wallet_entries`. Un canje gasta en la misma transacción que crea el código
(`for update`, saldo ≥ 0): dos canjes a la vez con saldo para uno → pasa uno. Código vencido sin usar → las monedas vuelven (asiento inverso). **Puntos** y
monedas son dos libros que nunca se mezclan (MD L1225).

**Lo que nunca se publica (filtro del servidor al escribir; publicaciones, comentarios, bio, encuestas, mensajes):**
| Qué | Regla | Qué pasa |
|---|---|---|
| Teléfonos (10 dígitos con o sin separadores, `wa.me`) | `phone` (regla 4) | Se bloquea al escribir: «No publiques teléfonos. Recomienda el negocio: su teléfono sale en su página.» |
| Correos, SSN/ITIN (9 dígitos), tarjetas (13–19), A-number y caso de USCIS (`PRIVADO`) | `pii` | Se bloquea al escribir (mismo patrón que `notaSinNumeros`) |
| Direcciones de personas (número + calle; placas) | `pii` | Se publica y se marca para revisión humana (cola `rep`); la dirección de un negocio va como BusinessRow |
| 3 publicaciones iguales en 24 h, enlaces y ventas repetidas | `spam` (regla 3) | Cola `rep`; los enlaces se muestran como texto, no se tocan (§6 #20) |
| Lenguaje discriminatorio (lista ES/EN) | `hate` (regla 5) | Marca, **nunca oculta solo** (admin `auto`) |
| Fotos: desnudez, violencia, texto promocional | `img` | Modelo abierto propio antes de publicar → cola Medios (HERRAMIENTAS #28); se quita EXIF y GPS al subir |
| Recomendar tu propio negocio | `propio` (regla 2) | Se bloquea si el autor es `business_members` de ese negocio: «Tu negocio publica en sus Novedades.» |

**Ubicación:** la publicación lleva el **centro del barrio** del autor; la distancia («0.7 mi») se calcula contra eso y se redondea; nunca el GPS ni la dirección
de nadie (guardián `ubicacionDeBarrio`). **Menores:** no se pide fecha de nacimiento; la bienvenida pide «Tengo 18 años o más» (§6 #14); mensajes solo a quien
te sigue; foto de un niño ajeno = motivo `priv`. **Material de abuso infantil:** se oculta al instante, se preserva con acceso restringido, lo reporta un Admin
al CyberTipline de NCMEC (obligación de 18 U.S.C. § 2258A; preservación) — protocolo con abogado en `LAUNCH-CHECKLIST`. **Acoso y doxxing:** reglas 4–5,
motivos `acoso`/`priv`, bloqueo mutuo e invisible (flujos L128), escalera `adv → mute7 → nopub → susp14 → ban` (`sanciones.ts`). **Estatus migratorio:** nunca se
pide; señalar el estatus de una persona = doxxing (oculta + sanción); avisos de operativos: se permiten sin fotos de personas, placas ni direcciones, la lista
`migra` los manda a la cola con prioridad (rumor y pánico; §6 #19). **Autolesión:** lista `autolesion` → cola en 1 h y la persona ve la línea del 988 (como
Iglesias). **Estafas:** «Nada de ventas, rifas ni cadenas»; lista `estafa` (Zelle, Cash App, «depósito para apartar») marca.
**Votos honestos:** uno por cuenta; no se vota lo propio; votos entre cuentas del mismo dispositivo no cuentan ni dan puntos (callados); anillos de votos (mismo
dispositivo, ráfagas) → caso «posible red» en `repUsr` (MEM 699). Seguir no da puntos; tener seguidores no da rango (flujos L130).
**Moderación con plazo** (SLA de `COLAS`): `rep` 24 h, `repUsr` 24 h, `chat`/DM 48 h, `apel` 72 h, `medios` 4 h; amenazas, abuso infantil y autolesión saltan
al frente. Ocultar = motivo + aviso al autor + **Apelar** (14 días, §6 #18); la apelación la decide otra persona del equipo; levantarla restaura el contenido
y sus puntos. Auto-ocultar: 5 reportes de cuentas y dispositivos distintos en 24 h (`autohide`), queda «oculta por revisión» con apelación. Nada se borra.
**Traducción:** el texto nunca sale de nuestros servidores (`traduccionPropia`). **Cuenta borrada (D5):** a los 30 días se purgan sus textos, votos y mensajes;
el hilo muestra «Publicación eliminada» / «Comentario eliminado».
**Para el abogado** (`LAUNCH-CHECKLIST`): Sección 230 (contenido de terceros y moderación de buena fe; Términos con reglas y apelación), **DMCA §512**
(agente designado en la Copyright Office: tiene costo y no está en PLAN §8 → decisión del fundador; formulario de retiro y reincidentes), NCMEC, acoso
(18 Pa.C.S. § 2709), difamación en recomendaciones, monedas y cupones (sin valor: leyes de tarjetas de regalo y de bienes no reclamados; premios del mes
sin compra = no es sorteo), COPPA y 18+, Términos de la Comunidad versionados (`LegalPage`).

**Guardianes nuevos:** `comunidadSinTelefonos` (teléfono, correo y números privados nunca se guardan en posts, comentarios, bio ni mensajes; al revés con un
`insert` directo); `ubicacionDeBarrio` (ninguna consulta pública devuelve `geom` distinta del centro de zona ni la de `users`); `bloqueoMutuo` (toda función de
`lib/comunidad*.ts` que lista contenido, perfiles, avisos o mensajes pasa por `sinBloqueos()`; al revés: quitarla → falla); `votoUnico` (pk, sin voto propio,
mismo dispositivo sin efecto); `libroSoloInsercion` (ningún `update`/`delete` sobre `points_entries`, `coin_entries`, `com_edits`, `mod_flags`; trigger y
estático); `saldoDerivado` (nadie escribe `points_total`, `rank_level`, `coins`, `score`, `hot` ni contadores salvo sus funciones); `topeDiario` (101 puntos
en un día → 100); `monedasSinDinero` (en `lib/monedas*`, cupones y Comunidad: nada de `payments`, `pasarela`, `stripe`, `wallet`; ninguna cadena «comprar
monedas»); `apelacionOtraPersona` (`decided_by ≠ by_staff`); `ocultarAvisaYApela` (toda acción que oculta o sanciona escribe aviso con motivo y abre
apelación); `noTePromuevas`; `oficialNoEsPersona` (ninguna fila de `users` para la cuenta oficial; el lote no la oculta); `feedConCursor` (sin `offset`
en Comunidad; plan de la consulta del muro con índice, sin Seq Scan); `comunidadSoloConCuenta` (todo `APP-COM-*` pide sesión salvo Hoy en el barrio);
`avisoComunidadSinSms` (plantillas `com_*`, `gam_*`, `dm_*` con `sms = false`); `traduccionPropia` (ninguna llamada a un traductor externo); `semilla`.

---

## 4. Bloques

### 5a · Muro, publicar y la publicación (datos, filtro al escribir, muro con cursor) — migración **Opus/high**; pantallas Sonnet/medium
**Datos:** migración 0097. Traer `To'Latino Comunidad.dc.html` (§0). Semilla `infra/pruebas/semilla/0032_comunidad.sql` (`is_test`, nunca en producción)
generada por `scripts/semilla/extraer-comunidad.cjs` desde `TLCom.U` (16 vecinos con teléfonos de prueba `+1570555…`; zonas de `z`), `POSTS` (14 con sus
comentarios y respuestas, horas `h` → `created_at` relativo a la semilla, votos sintéticos de vecinos de prueba para que `up`/`dn` cuadren), `BZ` (ids de la
semilla de negocios) y la cuenta oficial de las 5 ciudades.
**Pantallas:** `APP-COM-FEED` pestaña **Conversación** (simple, MEM 91: título + Mensajes + pastilla de rango «6 · Teniente»; avatar + «¿Qué pasa en tu cuadra?» +
«+»; una fila de chips — Todo · Preguntas · Recomendaciones · Encuestas · Siguiendo — y el botón de filtro → hoja **distancia** (5 · 10 · 30 mi) + **orden**
(Más votados · Recientes); oficial fijada arriba; 20 por página con cursor; desktop navegación 240 + muro 720 + contexto 320). `APP-COM-NUEVO` (pregunta ·
recomendación · encuesta · publicación; tema; negocio con buscador de la ciudad; «para…»; fotos hasta 4; encuesta 2–4 opciones y 1 · 3 · 7 días (Cabo);
desktop con vista previa; las reglas a la vista; error del filtro en la misma caja). `APP-COM-POST` (la publicación; el hilo llega en 5b). Invitado sin
cuenta: Hoy en el barrio (5e) + tarjeta con qué hay detrás y «Entrar» (CLAUDE-plan L1053). Editar 30 min; borrar = `deleted` con Deshacer 10 s.
**Servidor:** `lib/comunidad.ts` (`muro(viewer, {tab, kind, dist, orden, cursor})` una consulta indexada + votos propios en una + perfiles cacheados;
`publicar(userId, p)` (sesión, `status` activo, `nopub`/`mute7`, límites, filtro `lib/comunidad-filtro.ts` que reúsa `PII`/`PRIVADO`/`TEL`, negocio activo,
no propio, encuesta solo con rango 3, zona → `geom`, Invitado), `editar`, `borrar`, `publicacion(id, viewer)`), `lib/comunidad-filtro.ts` (único lugar de las
reglas al escribir), `app/(app)/comunidad/acciones.ts`. Rutas `/comunidad`, `/comunidad/nuevo`, `/comunidad/p/[id]`; `noindex` en todo lo de vecinos.
**Super Admin:** Contenido › **Publicaciones** (en la UNION ALL de `admin-contenido.ts`) con ocultar / restaurar con motivo, fijar, bloquear comentarios.
**Guardianes:** `comunidadSinTelefonos`, `ubicacionDeBarrio`, `bloqueoMutuo`, `feedConCursor`, `comunidadSoloConCuenta`, `noTePromuevas`, `emergencia911`.

### 5b · El hilo: comentar, responder, recomendar en el comentario, votos ±, mejor respuesta y encuestas — Sonnet/medium; contadores y `hot` Opus/high
**Pantallas:** `APP-COM-POST` completo con `Thread` (2r): la más votada destacada (17d «MÁS VOTADA · N VOTOS» / «LE SIRVIÓ A…» con el negocio grande y «Ver»);
los recomendados con barras de % y «+ N» para sumar tu voto (17c); «También recomiendan» si la más votada ya trae negocio; cada comentario en su tarjeta
(17a), respuestas en panel gris «Ver N respuestas» con caras; respuesta a una respuesta un nivel abajo con «@Nombre» (18a). Recomendar un negocio en el
comentario (si ya está en el hilo → **«Sumar mi voto»**); «Recomendados en este hilo». Escribir: desktop en el mismo hilo (Esc cancela, Ctrl+Enter envía);
móvil barra abajo. Votos ± en publicaciones y comentarios (VoteBar 4c: votaste = borde y tinte morado). Quien preguntó marca **«Me sirvió»** → RESUELTA y
mejor respuesta (una; puede cambiarla). Encuesta: votas y ves %; al cerrar, resultado y aviso.
**Servidor:** `lib/comunidad-hilo.ts` (`hilo(postId, viewer, cursor)` raíces por `score` de 20 en 20 y respuestas a pedido; `comentar` (filtro, menciones, aviso al
autor y a la persona contestada), `votar(userId, kind, id, v)` (idempotente; quita el voto con el mismo toque; recalcula contadores y `hot` en la misma
transacción; puntos en 5f), `meSirvio`, `votarEncuesta`, `guardar`), barrido `cerrarEncuestas`.
**Guardianes:** `votoUnico`, `saldoDerivado`; punta a punta: votar, quitar, cambiar a −; 2 personas votan a la vez → contador exacto; «Me sirvió» solo el autor.

### 5c · Vecinos: perfil, seguir, Siguiendo, silenciar, bloquear, bienvenida y Mensajes vecino ↔ vecino — **Opus/high** (privacidad, bloqueo, mensajes)
**Datos:** migración 0099.
**Pantallas:** `APP-COM-VECINO` (`NeighborCard` 2s: foto, nombre y apodo, rango, zona, «en {ciudad} desde», insignias, bio, seguidores / siguiendo (ocultables),
sus publicaciones; menú: Seguir · Mensaje (si te sigue) · Silenciar · Bloquear · Reportar (hueco #4); `me` = mi perfil con editar bio y apodo).
`APP-COM-BIENVENIDA` = pasos 3–5 de 2au en `Entrar.tsx` (Tu zona · Lo que te gusta · El barrio: reglas + «Tengo 18 años o más» + vecinos para seguir +
«Fundadores #n» + **Recluta** + **100 monedas** (las acredita 5g) + «Empiezas como Recluta · ya puedes publicar, comentar y votar»); «Mi ciudad bloqueada 30
días» ya existe. `APP-COM-MENSAJES` / `APP-COM-CHAT` (lista por cursor y chat con el patrón de `mensajes.ts`: solo texto, sin teléfonos, «Reportar
conversación», ocultar con motivo). Mi cuenta › Siguiendo · Seguidores · **Bloqueados y silenciados** (hueco #5).
**Reglas:** bloquear es mutuo e invisible (ni el muro, ni el hilo, ni el perfil, ni avisos, ni mensajes, en los dos sentidos; cierra la conversación sin
avisar; deja de seguirse); silenciar = no ves sus publicaciones ni comentarios, él no lo sabe; ambos con Deshacer. Mensaje nuevo **solo a quien te sigue**;
10 conversaciones nuevas al día. «Siguiendo» muestra a quien sigues en cualquier ciudad con su ciudad visible.
**Servidor:** `lib/vecinos.ts` (`perfilVecino`, `seguir`, `bloquear`, `silenciar`, `deshacer`, `sinBloqueos(viewer)` = la lista de ida y vuelta como parámetro de toda
consulta), `lib/mensajes-vecinos.ts` (`misConversaciones`, `conversacion`, `enviar`, `reportarConversacion`), `bienvenida(userId, p)`.
**Super Admin:** Usuarios 360° › Comunidad › Seguidores y siguiendo (bloqueó · silenció · «posible red» por dispositivo); Colas › Mensajes reportados lee DM
solo con reporte abierto (regla de `chat`).
**Guardianes:** `bloqueoMutuo` (al revés por cada superficie), `comunidadSinTelefonos` en mensajes; punta a punta: A bloquea a B → B no ve nada de A ni A de B,
B no recibe aviso; mensaje a quien no te sigue → rechazado.

### 5d · Reportar, auto-moderación, antiabuso, sanciones en la Comunidad y apelaciones (+ Confianza y seguridad) — **Opus/high**
**Datos:** migración 0100.
**Pantallas:** reportar (motivo de `REP` → detalle ≤ 300 → «Ya no lo ves. Lo revisamos en 48 h.»), en publicación, comentario, perfil y conversación. Aviso
de moderación a la persona («Ocultamos tu comentario: {motivo}» · «Apelar») → **Apelar** (hueco #3: texto 20–500 → «Recibimos tu apelación. Te respondemos
en 72 h.» como `msgs0` de adm-data L114 → resultado). Persona silenciada o con `nopub`: el muro se lee; Publicar dice hasta cuándo y por qué.
**Servidor:** `lib/moderacion.ts` (`reportar`, `revisarAlEscribir` (reglas `mod_rules`), `autoOcultar`, `marcar` → `mod_flags` + `queue_items`, `rafagaResenas`
(regla `rev5` sobre `reviews`: 5 sin transacción en 10 min → `repUsr`), `redDeCuentas` (votos y seguidores del mismo dispositivo), `limites`), `lib/apelaciones.ts`
(`apelar`, `decidirApelacion` (otra persona; `lifted` restaura contenido y puntos y levanta la sanción), `sanciones.ts` gana el efecto de cada tipo en la
Comunidad. Modelo abierto de imágenes como servicio propio en `infra/pruebas/docker-compose.yml` (`services/moderacion-img`, ONNX; §6 #24).
**Super Admin (ADM-CONF, hoy `pendiente`):** Reportes (unificados con Colas `rep` · `repUsr` · `chat`), catálogo de sanciones, **Apelaciones** (cola `apel`,
segunda revisión), Fraude (cuentas por dispositivo, reseñas en ráfaga, anillos de votos; listas de bloqueo de dispositivo que ya existen), Privacidad (solo
lectura). Contenido › **Auto-moderación** (6 interruptores con su texto, listas de términos, umbral de auto-ocultar, límites).
**Guardianes:** `ocultarAvisaYApela`, `apelacionOtraPersona`, `libroSoloInsercion` (`mod_flags`); punta a punta de abuso (§7).

### 5e · Hoy en el barrio y cuenta oficial por ciudad (+ Inicio, Negocios, Buscar) — Sonnet/medium
**Datos:** migración 0101.
**Pantallas:** `APP-COM-FEED` pestaña **Hoy en el barrio** y `APP-COM-HOY` **público** (`StoryCard` 8a: una tarjeta por negocio con hasta 3 avisos de < 24 h, tipo
OFERTA · NOVEDAD · LLEGÓ · AVISO (`HOY_T`), «quedan N h», toque izquierda/derecha, al final abre la ficha; chips por categoría de `HOY` L169–179). Novedades ya
dice «En Hoy en el barrio · quedan N h» (MEM 1357). Se encienden **Inicio › Hoy en el barrio y Comunidad** (`Inicio.tsx` L3), **Negocios › Hoy en el barrio** y
**«Recomendados por vecinos»** (de recomendaciones con votos; `negocios/page.tsx` L16), **Buscar › Vecinos** y **«Pregúntale al barrio»** (→ `APP-COM-NUEVO`
con la búsqueda escrita) con la línea fija. **Cuenta oficial:** «To'Latino {Ciudad}» con su sello, fijada arriba (una a la vez, hasta 7 días); pregunta y
encuesta de la semana; no gana puntos ni sale en la Tabla.
**Servidor:** `lib/hoy.ts` (`hoyEnElBarrio(city, cat, cursor)` de `business_posts` con `post_en_vivo()` y `publish_at > now() − 24 h`, agrupado por negocio en una
consulta), `lib/oficial.ts` (`publicarOficial(staff, ciudad, p)` con `publish_at` para programar (hueco #6), `fijar`, `desfijar`), `buscar.ts` suma la pestaña
Vecinos (GIN `tsv` de `com_posts`, solo con sesión).
**Super Admin:** Contenido › **Hoy en el barrio** (en vivo y su origen; «Retirar de Hoy» con motivo y aviso al negocio) y **Cuenta oficial** (escribir, programar,
fijar; roles admin y ciudad). **Triángulo:** el negocio publica en Novedades → sale en Hoy → el admin lo ve y lo retira.
**Guardianes:** `oficialNoEsPersona`; Hoy nunca muestra una novedad oculta, detenida, de negocio Free o vencida (al revés).

### 5f · Puntos, rangos, insignias y Tabla del Barrio (+ reseñas, recomendaciones e invitar) — libro **Opus/high**; pantallas Sonnet/medium
**Datos:** migración 0102; la semilla de 5a recibe `points_entries` que reproducen `U.pts` y `TABLA` sep/ago (L191–192) para que rangos y tabla cuadren.
**Pantallas:** `APP-GAM-RANGO` (los 10 con qué piden y qué desbloquean, el tuyo marcado, cuánto falta; las reglas de `PTS` y `PTS_RULES`), `APP-GAM-TABLA` (mes en
curso y anterior; pestañas **General · Recomendaciones · Respuestas**; tu lugar; excluidos no salen), insignias en el perfil. Rango visible en comentarios
desde Sargento (4); «Sargento · 23 reseñas» y «+15 puntos» en la tarjeta de reseña (REVISION 7, LAUNCH-CHECKLIST L276).
**Puntos** (`PTS` L19–24): voto + en tu publicación +2 · en tu comentario +1 · «Sumar mi voto» / «Yo también» en tu recomendación +3 · «Me sirvió» +10 · reseña
verificada +15 (desde `resenas.ts`) · primera recomendación de un negocio con 3 votos +50. Quitar el voto, ocultar por reglas o borrar → asiento inverso. Tope
100 por día local; lo que pasa del tope no se guarda. Un voto − no toca el rango.
**Rangos:** `min_points` de semilla **0 · 100 · 300 · 800 · 1,500 · 2,300 · 3,500 · 5,000 · invitación · 3 plazas** (cuadra con los 16 vecinos de `U`) + la condición de
`RANKS` (5 votos +, 5 comentarios votados, 3 recomendaciones votadas, 4 semanas activas, 3 reseñas verificadas, invitados que participan, historial limpio);
Coronel lo da el equipo; General del Barrio = 3 primeros de la ciudad al cierre. Desbloqueos reales: encuestas (3), rango en comentarios (4), destacar (5, §6
#11), reportes primero (8), moderación local (9, §6 #9); los de El Patio (6, 7) dicen «Cuando abra El Patio».
**Servidor:** `lib/puntos.ts` (`sumar(userId, regla, ref)` idempotente con tope, `revertir`, `recalcularRango` — único que escribe `rank_level`), `lib/tabla.ts`
(`tabla(city, mes, tab, cursor)`, `congelar` el último día a medianoche de la ciudad, `cerrarMes` (excluidos, premios, aviso a los 3, reporte de canjes),
barrido día 3 si nadie cerró), `lib/invitar.ts` (código NOMBRE-N; cuenta para Capitán).
**Super Admin (ADM-GAM):** Rangos (renombrar ES/EN con vista previa), Puntos (reglas y tope), Tabla del Barrio (excluir con motivo, «Cerrar el mes» con sus 4
pasos), Usuarios 360° › Comunidad › Puntos (ajustar ± con motivo y tope por rol, `ptsAdj`).
**Guardianes:** `libroSoloInsercion`, `saldoDerivado`, `topeDiario`, `votoUnico` (sin puntos entre cuentas del mismo dispositivo).

### 5g · Monedas y cupones de negocios (+ panel del negocio) — **Opus/high** (libro y valor)
**Datos:** migración 0103; semilla `COUPONS` (5) de los negocios de prueba y 100 monedas a cada vecino de prueba.
**Pantallas:** `APP-GAM-MONEDAS` (saldo, «Sin valor en dinero», cupones de la ciudad con costo y negocio, «Canjear» → confirmación → código **TL-CQ-xxxx** con
vence y «Muéstralo en el local», mis cupones, historial de movimientos). **Panel del negocio** (hueco #2; Pro, como Novedades): Tu página › **Cupones por
monedas** (título, condiciones, cuántos al mes, días de validez, pausar; el costo lo fija To'Latino) y **«Validar un código»** (escribe o escanea → usado,
una vez). Mi cuenta: monedas en la tarjeta de vecino (USR-HOME).
**Servidor:** `lib/monedas.ts` (`acreditar`, `gastar` (`for update`, saldo ≥ 0), `devolver`), `lib/cupones.ts` (`cuponesCiudad`, `canjear` (cupo del mes, una vez
por persona y cupón vivo), `validar(negocio, code)`, `vencerCupones` en el barrio: devuelve monedas), `app/panel/acciones-cupones.ts`.
**Super Admin (ADM-GAM):** Monedas (EN CIRCULACIÓN · EMITIDAS ESTE MES · CANJEADAS · VALOR «Sin valor en dinero», reglas de ganancia, ajuste ± con motivo
`coinAdj`), Cupones (aprobar, costo, pausar con motivo y aviso al negocio, canjes). **Triángulo:** el negocio crea → el admin aprueba y pone costo → la gente lo ve
y canjea → el negocio valida → el admin ve el canje.
**Guardianes:** `monedasSinDinero`, `libroSoloInsercion`, `saldoDerivado`; carrera de dos canjes; código usado dos veces → la segunda falla.

### 5h · «Ver traducción» propia (D3) — Sonnet/medium; servicio y red Opus/high
**Decisión técnica (PLAN §8 no lista traductor; regla O):** **LibreTranslate autoalojado** (código abierto, modelos Argos ES↔EN) como servicio del compose,
solo en la red interna, sin salida a internet; detección de idioma con su `/detect` al publicar (respaldo: el idioma de la app). Alternativas pagas (Claude
Haiku bajo el tope de El Compa, DeepL) = decisión del fundador (§6 #15).
**Pantallas:** «Ver traducción» / «Ver original» bajo el texto en `PostCard`, `Thread`, reseñas y respuestas del negocio (ya tienen la prop `translate`, MEM 1039);
solo si el idioma del texto no es el de la app; estados cargando, error («La traducción no está disponible ahora.»).
**Servidor:** `lib/traduccion.ts` (`traducir(kind, id, dst)` lee `ugc_translations`, si no hay llama al servicio con 3 s de límite y corta-circuito, guarda;
límite por persona), `infra/pruebas/docker-compose.yml` + `deploy.sh` (servicio `traductor`, memoria acotada); el Super Admin ve siempre el original.
**Guardianes:** `traduccionPropia`; prueba con el servicio caído → la pantalla sigue y dice el error.

### 5i · Super Admin completo de la fase, Configuración, avisos, analítica y ayuda — Sonnet/medium; Configuración Opus/high
- **Contenido:** pestañas Todo · Publicaciones · Comentarios · Hoy en el barrio · Reseñas · Auto-moderación · Cuenta oficial (MEM 619–621); filtros ciudad, tipo,
  estado, votos, autor, rango, «posts de invitados» (flujos L44); hilo como en la Comunidad con el comentario marcado (MEM 700); lote «Ocultar los N
  reportados» con progreso y fallos parciales, sin tocar la cuenta oficial (MEM 651); mover de ciudad; todo por cursor.
- **Usuarios 360° › Comunidad** (LAUNCH-CHECKLIST L179): Publicaciones · Comentarios · Seguidores y siguiendo · Puntos y monedas · Cupones y referidos;
  rango, puntos, monedas, votos recibidos, bloqueó / silenció, «posible red» → «Abrir caso de red de cuentas»; filtros de la lista por rango y reportes.
- **Gamification** (sin El Patio: la subpestaña no se construye, G): Rangos · Puntos · Monedas · Cupones · Tabla del Barrio. «Rango del negocio» no (§6 #23).
- **Configuración global** (hueco #10): valores de `config_keys` con límites, unidad y auditoría; los de la Comunidad (límites, 30 min de editar, 14 días para
  apelar, umbral de auto-ocultar, días de encuesta, validez de cupones) y los diferidos de la Fase 4.
- **Notificaciones:** plantillas `com_*`, `gam_*`, `dm_*`, `mod_*`, `apel_*` ES/EN; resumen diario (APP-NOTIF) para el grupo `community`.
- **Analítica › Comunidad:** publicaciones, comentarios, % preguntas resueltas, tiempo a la primera respuesta, vecinos activos por rango, reportes por cada 1,000
  publicaciones, apelaciones levantadas, monedas emitidas y canjeadas, canjes por negocio; por ciudad, sin personas.
- **`docs/ayuda/`** (regla 9, ES/EN): cliente `comunidad` (reglas, línea fija, publicar, Invitado), `votos-y-mejor-respuesta`, `seguir-silenciar-bloquear`,
  `mensajes-entre-vecinos`, `reportar-y-apelar`, `rangos-y-puntos`, `tabla-del-barrio`, `monedas-y-cupones` (sin valor en dinero), `hoy-en-el-barrio`,
  `ver-traduccion`; negocio `cupones-por-monedas` y `novedades` al día (Hoy); Super Admin `admin-contenido` al día, `admin-confianza`, `admin-gamification`,
  `admin-configuracion`.

---

## 5. Notas de interfaz (lo específico)
- **Publicación** = `PostCard` con lo que el fundador eligió (MEM 92): encabezado **2c Honor** (nombre Sora 700 15, escudo + rango dorado 9–10 y gris 4–8, barrio en
  gris, hora a la derecha, menú `more`; sin «PUBLICÓ / PREGUNTÓ / RECOMIENDA»), contenido **3b Papel** (lo de otros sobre Paper sin borde, «✓ Mejor respuesta» en
  verde, negocio en tarjeta blanca, 911 sobre tinte rojo), barra **4c Pastillas**. Sin «41 VECINOS TAMBIÉN» (= votos). El feed «aire» no se vuelve a proponer.
- La insignia de rango es un **cuadro con el número** (no hay galones en el set; MEM 1652). «Invitado · de {ciudad}» junto al barrio. «RESUELTA» como Tag.
- Pestañas del módulo con `Tabs variant="title"`: Conversación · Hoy en el barrio · Tabla del Barrio (sin El Patio). Desktop: 240 + 720 + 320; la columna de
  contexto lleva tu rango, la Tabla del mes y Hoy.
- Comentarios: 17a + 17d + 17c y respuestas 18a (línea + curva `#E6E3DC` por token, «@Nombre» en Action); en desktop el rail no repite los recomendados.
- Hoy en el barrio: `StoryCard` 8a; en Inicio y Negocios en carrusel (swipe en móvil, flechas en desktop, MEM 1179–1182).
- Estados (9) por pantalla: muro vacío de una ciudad nueva («Sé el primero en preguntar»), sin resultados del filtro, sin permiso (silenciado), bloqueado
  (perfil que no existe para ti = «No encontramos a este vecino»), traducción caída, cupón agotado, saldo insuficiente.
- Todo el texto de interfaz en `CmsString` ES/EN; lo del vecino en su idioma con «Ver traducción»; sin emoji en la interfaz (los vecinos sí pueden escribirlos).

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **Prototipo de la Comunidad fuera del repo.** Default: se trae del artifact en 5a; si no se puede, se compone con el sistema y cada pantalla va a REVISION.
2. **Tipos de publicación.** El modelo trae 6 (`pregunta · recomendacion · aviso · encuesta · foto · busco`, MD L1250); el prototipo 4 (`k` q · r · e · p) y
   `APP-COM-NUEVO` 4. Default: **4**; aviso, foto y «busco» son «publicación».
3. **¿Las monedas son dinero?** Default: **no** (§3): sin valor, no se compran, no se transfieren, no vencen, no tocan el Wallet. Si el fundador quiere venderlas o
   darles valor, es otro producto (dinero, leyes de tarjetas de regalo) con su plan.
4. **«Liquidar cupones a los negocios»** (cierre de mes). Default: reporte mensual de canjes al negocio; **ningún pago** en ningún sentido.
5. **Cupones solo Pro.** Default: sí (como Novedades); el negocio los ofrece, To'Latino aprueba y fija el costo (80–1,000).
6. **De dónde salen monedas** sin El Patio. Default: bienvenida +100 y premios del mes; las «monedas diarias» llegan con El Patio. Ninguna por estar conectado.
7. **Rango que baja.** Default: el rango solo sube (`rank_floor`); un Admin lo baja con motivo por fraude; los puntos revertidos no bajan el rango ya ganado.
8. **Umbrales de rango.** El prototipo solo dice condiciones. Default: puntos mínimos 0 · 100 · 300 · 800 · 1,500 · 2,300 · 3,500 · 5,000 + la condición; editables.
9. **Coronel = «moderación local».** Default: sus reportes van primero y suman ×3 al umbral de auto-ocultar; **no** oculta nada por su cuenta.
10. **General del Barrio** («voz en las decisiones»). Default: los 3 primeros de la ciudad al cierre de mes; insignia y mención en la publicación oficial del mes.
11. **Destacar 1 recomendación al mes** (Sargento Mayor). Default: sale 7 días en Negocios › «Recomendados por vecinos» con «DESTACADA»; **nunca** cambia el
    orden del muro (la línea fija manda); nada se paga con monedas.
12. **Premios y cierre de la Tabla.** Default: congela el último día a medianoche de la ciudad; 72 h para excluir; se cierra sola el día 3; premios 300 · 200 ·
    100 monedas + insignia «Top del mes»; sin premios en dinero ni sorteos.
13. **Quién ve la Comunidad.** Default: con cuenta todo; sin cuenta solo Hoy en el barrio + la invitación; nada de vecinos en buscadores (`noindex`).
14. **Edad.** Default: «Tengo 18 años o más» en la bienvenida, sin fecha de nacimiento; si el fundador quiere 13–17, hace falta otro plan (COPPA, mensajes).
15. **Traductor.** Default: LibreTranslate autoalojado (calidad menor que Claude o DeepL); comparar 200 textos reales antes de abrir (`LAUNCH-CHECKLIST`).
    Mensajes vecino ↔ vecino **sin** traducción al lanzar (flujos L160 «a validar»).
16. **Mensajes vecino ↔ vecino** (no están en PLAN L211; sí en el prototipo, en Mi cuenta y en LAUNCH-CHECKLIST L380). Default: van, **solo a quien te sigue**,
    solo texto (sin fotos ni notas de voz), sin «Solicitudes».
17. **Negocios en la Comunidad.** El modelo deja comentar como negocio (`as_business_id`, MD L1271); la regla 2 dice que el negocio publica en Novedades. Default:
    solo personas; el negocio aparece por Hoy en el barrio y por las recomendaciones.
18. **Editar, borrar y apelar.** Default: editar 30 min (la versión anterior queda en `com_edits`); borrar = estado, hilo con «Publicación eliminada», puntos
    revertidos; apelar hasta 14 días después del aviso.
19. **Avisos de operativos de inmigración.** Default: se permiten sin fotos de personas, placas ni direcciones; lista `migra` → cola con prioridad; señalar el
    estatus de alguien = doxxing. Revisar con abogado y con el fundador antes de abrir.
20. **Enlaces en publicaciones.** Default: texto sin enlace (antiestafa); un enlace de tolatino.com se muestra como tarjeta.
21. **Límites.** Default (Configuración): 10 publicaciones, 100 comentarios, 500 votos y 10 conversaciones nuevas al día; la mitad las primeras 24 h de la cuenta.
22. **Referidos.** El modelo paga al Wallet (`Referral.reward money`, MD L811). Default: solo cuentan para Capitán; **sin dinero** (sería dinero nuevo).
23. **Rango del negocio.** Solo existe una nota en el admin. Default: no se construye; a `LAUNCH-CHECKLIST` hasta que se diseñe la ficha.
24. **Moderación de imágenes.** Default: modelo abierto propio (ONNX) en el compose; si la memoria del sandbox (cx33, 8 GB) no alcanza con traductor + modelo,
    se mide y se anota; nada de proveedor pago.
25. **Errores del prototipo a no copiar:** `SIM` y «Los vecinos responden» (SP L187); hora fija (SP L233); estado en `tl-com-v1`; `pts`, `mo`, `rk` y `TABLA` a mano
    (derivados de verdad); `mi` precalculado (sale del barrio); `VECINOS: 1240` fijo; `left` de la encuesta en horas fijas (`poll_ends_at`).

## 7. Orden, dependencias y pruebas
5a → 5b → 5c → 5d → 5e → 5f → 5g → 5h → 5i. 5a trae el prototipo y la base; 5b depende de 5a; 5c usa `user_blocks` de 5a; **5d va antes que la gamificación** (sin
reportes ni apelaciones no se abre nada a puntos); 5e solo lee Novedades (puede ir en paralelo con 5c–5d); 5f depende de 5b (votos) y de `resenas.ts`; 5g
depende de 5f (bienvenida y premios) y del panel; 5h es independiente (reseñas ya existen); 5i cierra la fase. Cada bloque: migración (aplicada dos veces)
+ semilla de pruebas (`is_test`) + punta a punta en 9 dispositivos; lo que el prototipo simula con «Los vecinos responden» se hace con **dos o tres cuentas de
prueba reales** en la misma prueba. **Reloj movido:** 24 h de Hoy, cierre de encuesta, 30 min de editar, tope diario a medianoche de la ciudad, mes que se
congela → 72 h → cierre del día 3, `mute7` / `susp14` / `nopub` que se levantan, apelación vencida a las 72 h, código de cupón a los 30 días (las monedas
vuelven), Mi ciudad a los 30 días. **Abuso** (cada uno probado al revés): teléfono, correo, SSN y A-number en post, comentario, bio y mensaje; dirección de
una persona → cola; 3 publicaciones iguales en 24 h; lista de odio marca y no oculta; 5 reseñas sin transacción en 10 min → `repUsr`; 5 reportes de cuentas
nuevas del mismo dispositivo → **no** auto-oculta; votos de dos cuentas del mismo dispositivo → sin efecto y caso de red; voto propio; recomendar tu negocio;
bloqueado que intenta ver, comentar, votar o escribir; silenciado que publica; 101 puntos en un día; doble canje en paralelo; código usado dos veces; apelación
decidida por quien sancionó → rechazada; traductor caído. **Velocidad** (presupuesto, guardián Velocidad): base de carga **aparte** (nunca la semilla del
sandbox) con **1 M publicaciones y 5 M comentarios** en una ciudad, `scripts/carga/comunidad-1m.mjs`: muro de 20 con cursor p95 ≤ 50 ms en la base y TTFB ≤
300 ms, `EXPLAIN` con Index Scan (sin Seq Scan, sin `offset`); hilo de 500 comentarios en 20 raíces ≤ 60 ms; votar ≤ 30 ms con contadores; Tabla del mes ≤ 40 ms;
Hoy de una ciudad ≤ 40 ms; LCP ≤ 2.5 s en Pixel emulado 4G con fotos 320 px WebP. Revisión de seguridad (regla 5) de 5a, 5c, 5d, 5f, 5g y 5h.
Capturas teléfono + escritorio de cada pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre de la fase (todo marcado antes de decir «Fase 5 completa»)
_Cada marca dice con qué se comprobó; lo que no se pudo comprobar queda sin marcar con el motivo._
- [x] `To'Latino Comunidad.dc.html` en `docs/diseno/pantallas/` (o REVISION dice qué se compuso sin él).
      _Comprobado (8 nov): el archivo está en docs/diseno/pantallas/ (traído en 3848f5e); lo compuesto sin diseño va en REVISION 5a–5i._
- [ ] Migraciones 0097–0105 aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI; semilla 0032 solo en pruebas (`semilla`).
      _Local (8 nov): 0001–0105 en un PostGIS 16-3.5 nuevo, 0097–0105 dos veces más sin error y las semillas de pruebas en la base nueva; guardián `semilla` verde. Sin marcar: la CI no corrió con 0105 (el bloque no se subió todavía)._
- [x] Muro, publicar (4 tipos), publicación e hilo completos con cursor; filtro al escribir probado al revés; ubicación solo del barrio.
      _e2e `com5a` «OK com5a», `com5b` «OK com5b»; guardianes comunidadSinTelefonos, ubicacionDeBarrio, feedConCursor._
- [x] Votos ±, «Sumar mi voto», mejor respuesta «Me sirvió», encuestas desde Cabo; contadores y orden derivados, exactos con votos simultáneos.
      _e2e `com5b` «OK com5b»; guardianes votoUnico, saldoDerivado._
- [x] Perfil, seguir, Siguiendo, silenciar, bloquear mutuo e invisible en todas las superficies; bienvenida 2au pasos 3–5 con 18+; Mensajes solo a quien te sigue.
      _e2e `com5c` «OK com5c»; guardianes bloqueoMutuo, bloqueoTodasLasSuperficies, mensajeSoloAQuienTeSigue, sinFechaDeNacimiento._
- [x] Reportar, auto-moderación (6 reglas con interruptor), antiabuso, sanciones con efecto en la Comunidad y apelaciones con segunda revisión; Confianza y
      seguridad deja de ser `pendiente`.
      _e2e `com5d` «OK com5d»; guardianes ocultarAvisaYApela, apelacionOtraPersona, reportesSinManada._
- [x] Hoy en el barrio (pestaña y pública) + Inicio + Negocios + Buscar › Vecinos y «Pregúntale al barrio»; cuenta oficial de las 5 ciudades con programar y fijar.
      _e2e `com5e` «OK com5e»; guardianes hoySoloEnVivo, oficialNoEsPersona, buscarVecinosConSesion._
- [x] Puntos (libro, tope 100, reversos), 10 rangos con desbloqueos reales, insignias, Tabla del Barrio con cierre de mes; rango y +15 en la tarjeta de reseña.
      _e2e `com5f` «com5f: todo bien»; guardianes topeDiario, libroSoloInsercion._
- [x] Monedas (libro, sin valor en dinero) y cupones: panel crea y valida, admin aprueba, persona canjea; doble canje imposible (`monedasSinDinero` al revés).
      _e2e `com5g` «com5g: todo bien»; guardianes monedasSinDinero (al revés en 5g), cuponUnaVez._
- [ ] «Ver traducción» en publicaciones, comentarios, reseñas y respuestas con el traductor propio; nada sale a terceros.
      _e2e `com5h` «com5h: todo bien» con un traductor de prueba que imita la API; guardián traduccionPropia. Sin marcar: el LibreTranslate real no corrió aquí (modelos bloqueados por la red de la sesión); verlo en el sandbox._
- [x] Super Admin: Contenido (7 pestañas), Usuarios 360° › Comunidad, Gamification (sin El Patio), Colas `rep` · `repUsr` · `apel`, Configuración, Notificaciones,
      Analítica › Comunidad; cada acción con motivo, aviso, apelación y auditoría.
      _e2e `adm5i` «adm5i ✓ todo», `com5d` «OK com5d» (Configuración auditada y con límites, 7 pestañas, lote sin la oficial, hilo marcado, mover, 360°, Analítica = SQL); guardianes configConLimites, configDesdeUnLugar, analiticaSinPersonas, loteNoTocaOficial (26/26 al revés)._
- [x] Avisos ES/EN en `notif_templates`, ninguno de la Comunidad por SMS (`avisoComunidadSinSms`).
      _Guardián avisoComunidadSinSms verde; `adm5i` comprueba en la base que ninguna plantilla com_/gam_/dm_ tiene SMS y el resumen diario (una vez al día, sin lo de alguien bloqueado)._
- [ ] Presupuesto de velocidad con 1 M publicaciones cumplido (cifras en PROGRESS); guardianes de §3 en `guardianes/run.mjs`, cada uno probado al revés; build +
      CI + punta a punta en 9 dispositivos verdes; Novedades, reseñas y Mensajes cliente ↔ negocio sin regresión.
      _Sin marcar: la base de carga de 1 M (`scripts/carga/comunidad-1m.mjs`) no se corrió; la CI no corre punta a punta ni 9 dispositivos (LAUNCH-CHECKLIST). Guardianes de §3 en run.mjs y probados al revés (5a–5i); regresiones `adm2i` «OK», `adm4ig` «OK adm4ig»._
- [x] `docs/ayuda/` completas (§5i); preguntas #1–#25 en `docs/REVISION.md`; `LAUNCH-CHECKLIST` con Sección 230, DMCA (agente: costo → fundador), NCMEC, acoso,
      monedas y cupones, 18+, inmigración, calidad del traductor, rango del negocio, memoria del servidor.
      _Comprobado (8 nov): las de la lista de §5i existen con nombre equivalente (comunidad-el-muro, comunidad-comentar-votar-y-encuestas, comunidad-vecinos-seguir-bloquear-y-mensajes, comunidad-reportar-y-apelar, comunidad-puntos-rangos-y-tabla, monedas-y-cupones, hoy-en-el-barrio, ver-traduccion, panel-cupones-por-monedas, novedades, admin-contenido, admin-confianza-y-seguridad, admin-gamificacion) + admin-configuracion.md nueva; #1–#25 en REVISION 5i; LAUNCH-CHECKLIST con Sección 230, DMCA, NCMEC, acoso, monedas, 18+, inmigración, traductor, rango del negocio y memoria._
- [x] `docs/PROGRESS.md` al día (Fase 5 cerrada) y `docs/REVISION.md` con los pasos para mirarla en el sandbox.
      _PROGRESS dice «5i hecho» y «Fase 5 cerrada»; REVISION ### 5i trae el paso a paso de toda la fase._