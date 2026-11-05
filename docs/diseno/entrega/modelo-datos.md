# To'Latino · Modelo de datos V1

_1.2 · 23 oct 2026 · D1–D6 · El Compa_

Lo que el producto necesita guardar para funcionar como el prototipo: app iOS/Android + web, pagos con Stripe. Es la especificación para la base de datos, no una copia de cómo guarda las cosas el prototipo. Las abreviaturas del prototipo (st, r, n, d…) se traducen aquí a campos claros, y cada entidad dice de dónde sale.

**Fuente:** prototype/*.js (cargados y leídos uno por uno) + la lógica de Prototipo, Mi cuenta, Panel negocio v2, Super Admin, Comunidad, Eventos, Publica tu negocio, Publica tu evento, Recomendar, Soporte, Recuperar negocio y Ciudad.

## Reglas

1. **Ciudad primero.** Toda entidad pública lleva city_id. «Cerca de mí» es un filtro (distancia calculada desde geo), nunca otra regla. La plataforma nace multi-ciudad aunque solo Hazleton esté abierta.
2. **Una sola cuenta.** Teléfono + código (OTP) entra a todo: cliente, dueño, equipo del negocio, portero, repartidor del negocio y equipo de To'Latino. Los permisos salen de BusinessMember y de StaffMember, no de cuentas separadas.
3. **Bilingüe.** El texto de interfaz vive en CmsString. Lo que escribe un negocio se guarda como text·i18n (es y en; puede faltar uno). Lo que escribe un vecino se guarda en su idioma (lang) y se muestra así, con «Ver traducción» si la app está en el otro; la traducción se guarda aparte (D3).
4. **Dinero.** Siempre en centavos USD (entero). Impuesto por ciudad (Hazleton 6 %). Nunca se guarda un número de tarjeta: solo referencias de Stripe. Copy: Retenido · Cobrado · Liberado · Devuelto (en ES nunca «Reembolso»).
5. **Fechas.** datetime en UTC; se muestra en la zona de la ciudad (America/New_York). El horario del negocio es hora local (time).
6. **Citas = solicitud.** Nada se confirma solo antes de tiempo: toda operación nace PENDIENTE y el depósito queda Retenido. La confirmación al instante es una opción que activa el propio profesional, apagada por defecto (D4).
7. **Nada se borra.** Se usan estados (closed, hidden, deleted_pending con 30 días de gracia). Lo Pro que vence queda dormido, no se borra. Lo que el equipo oculta se puede restaurar. La excepción es una cuenta borrada: a los 30 días se borra todo lo suyo y solo queda lo que Stripe guarda de los pagos (D5).
8. **Derivado no es dato.** Calificación, conteos, distancia, «abierto ahora», «cierra 9 PM», fuerza del perfil, rango, cupo restante y saldo se calculan. Se pueden cachear; nunca se editan a mano. En las tablas van marcados como derivado.
9. **Historial.** Toda acción del equipo de To'Latino escribe una AuditEntry: antes → después, motivo y diff para deshacer. Solo se agrega; se guarda para siempre.
10. **Acciones sobre terceros.** Ocultar, sancionar, quitar una foto o cerrar algo lleva motivo, avisa al afectado y abre apelación.
11. **Espejo de gestión.** Todo lo que el cliente ve tiene su lado en el panel del negocio y en el Super Admin. Cada entidad dice dónde se gestiona.
12. **Nunca papeles.** No se guardan documentos de identidad ni estatus migratorio. Para reclamar un negocio se acepta un documento del negocio (licencia, recibo de luz o agua, EIN), con los números de cuenta tapados.

## Tipos

- `id` — Identificador estable. Donde dice slug, es legible y único por ciudad (sabor-dominicano).
- `ref X` — Referencia a otra entidad.
- `text · text·i18n` — Texto. text·i18n = { es, en }.
- `int · num · pct` — Entero · decimal · porcentaje.
- `money` — Centavos USD, entero.
- `bool · date · time · datetime` — time = hora local de la ciudad; datetime = UTC.
- `enum(a|b)` — Uno de los valores listados.
- `geo` — lat, lng.
- `phone · email · url` — phone en formato E.164 (+15704550192).
- `media` — Referencia a Media (foto o archivo).
- `json` — Estructura documentada en la nota del campo.
- `list<…>` — Lista ordenada.

## Índice

1. **Ciudad y lugar** — City, Zone, CityWaitlist
2. **Categorías y búsqueda** — Category, Subcategory, FilterOption, Synonym, Amenity, ModuleType, SearchLog
3. **Negocios** — Business, CategoryAttrs, BusinessHours, SpecialHours, BusinessLink, BusinessMember, License, VerificationRequest, Media, PhotoReport, BusinessPost, Faq, JobPosting, JobApplication, Claim, OnboardingDraft, ContactTap, BusinessDailyStats
4. **Lo que vende** — Item, ItemSection, OptionGroup, StaffService, BookingPolicy, ReservationSettings, DeliverySettings, PrivateEventSettings
5. **Personas y cuenta** — User, Device, OtpCode, AccountChange, Address, PaymentMethod, Favorite, Follow, BlockMute, Notification, NotificationPref, SearchAlert, Recommendation, Referral, TermsAcceptance
6. **Pedidos, citas y reservaciones** — Operation, OperationLine, OperationEvent, ChangeProposal, Delivery, HelpRequest, Review, ChatThread, Message
7. **Dinero** — Payment, Refund, Dispute, StripeAccount, Payout, WalletEntry, Subscription, Invoice, FeeRule, Coupon, CouponRedemption
8. **Eventos** — Event, TicketType, EventTable, EventAddOn, Ticket, Rsvp, DoorStaff, CheckIn
9. **Comunidad** — CommunityProfile, Post, Comment, Vote, PollVote, Report, PointsEntry, CoinsEntry, Rank, Badge, MonthlyBoard
10. **El Patio** — GameMatch, PrivateTable, Tournament, TournamentEntry
11. **Soporte** — SupportCase, SupportMessage, Macro
12. **El Compa · asistente de IA** — CompaConversation, CompaMessage, CompaAction, CompaHandoff, CompaBusinessSettings, CompaReview
13. **Super Admin** — StaffMember, RolePermission, QueueItem, SensitiveChange, Sanction, Appeal, AdminNote, AdminMessage, AuditEntry, PlatformConfig, FeatureFlag, NotificationTemplate, Announcement, CmsString, LegalPage, CityHomeConfig, Campaign, Featured, ShortLink, SeedListing
14. **Estados** — Operación, Dinero de una operación, Ayuda con un pedido o cita, Evento, Boleto, Prueba y plan, Cuenta, Negocio, Reclamo y sello, Evento privado, Conversación con El Compa, Acción del Compa
15. **Dónde vive hoy en el prototipo**
16. **Solo del prototipo (no son datos)**
17. **Decisiones**

## 1. Ciudad y lugar

Hazleton abierta; Allentown y Reading próximamente. La ciudad acota contenido, búsqueda, colas y métricas.

### City · Ciudad

_De dónde sale:_ city-data.js TLCity.CITIES · tl-adm-v1.city · Super Admin › Ciudades

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | hzl · alw · rdg |
| `name` · obligatorio | text | Hazleton, PA |
| `state` | text | PA |
| `status` · obligatorio | enum(on\|soon\|off) | on abierta · soon próximamente con lista de espera · off cerrada con motivo |
| `center` | geo | Centro del mapa y del radio |
| `radius_options` | list<int> | 2 · 5 · 10 · 30 mi (TLCity.RADII); 5 por defecto |
| `timezone` | text | America/New_York |
| `tax_rate` | pct | 6 % en PA |
| `zips` | list<text> | 18201, 18202 |
| `open_rule` | json | Meta para abrir: vecinos en espera y negocios listos (regla 300/30 del Super Admin) |
| `opened_at · closed_reason` | datetime · text | Abrir ciudad = asistente de 6 pasos; cerrar pide motivo |

### Zone · Barrio

_De dónde sale:_ TLCity.ZONES

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | centro, north… |
| `city_id` · obligatorio | ref City |  |
| `name` | text·i18n | Centro de Hazleton |
| `streets` | text·i18n | Broad St y Wyoming St |
| `center` | geo |  |

### CityWaitlist · Pide tu ciudad

_De dónde sale:_ tl-city-ask-v1 · tl-city-wait-v1 · tl-soon-v1/v2 (Coming Soon) · cola «Ciudad nueva»

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `city_id` | ref City | Si la ciudad ya existe como próximamente |
| `city_name` | text | Si pide una ciudad que no está en la lista (Bethlehem, PA…) |
| `user_id · contact` | ref User · phone\|email | Con cuenta o solo contacto |
| `wants` | list<text> | Lo que más le falta: «Comida dominicana»… |
| `source` | enum(city\|coming_soon\|search) |  |
| `created_at · notified_at` | datetime | notified_at = se le avisó que abrió (Super Admin «Avisar lista de espera») |

## 2. Categorías y búsqueda

17 categorías fijas (plan/taxonomia-negocios.md). Ninguna pantalla inventa categorías; subcategorías, filtros y sinónimos se editan en el Super Admin › Catálogo.

### Category · Categoría

_De dónde sale:_ TLAdm.CATS · TLOnbNeg.CATS/CFG · plan/taxonomia-negocios.md

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | NEG-FOOD, NEG-BELL, NEG-AUTO, NEG-HOGAR, NEG-NOCHE, NEG-MERC, NEG-FIESTA, NEG-SALUD, NEG-PRO, NEG-TIENDA, NEG-TRANS, NEG-EDU, NEG-NINOS, NEG-DEPORTE, NEG-FE, NEG-INMUEBLE, NEG-DEALER |
| `name` | text·i18n | Comida y Bebidas |
| `short` | text·i18n | Una palabra para los tiles: Comida |
| `icon` | text | Ícono del set propio (restaurant, medical…) |
| `op_kind` | enum(order\|booking\|ticket\|none) | Qué operación produce (ped · cita · bol · none en Iglesias) |
| `default_modules` | list<ModuleType> | Módulos que se encienden al elegir la categoría |
| `module_labels` | json | Rótulo de cada módulo en esta categoría: rsv → «Mesas y lista», citas → «Prueba de manejo» |
| `item_noun` | text·i18n | platos · servicios · autos |
| `fixed_line` | text·i18n | Línea fija: Salud y Hogar 911, Profesionales «nadie te garantiza un resultado» |
| `amenities` | list<ref Amenity> |  |
| `sort · status` | int · enum(on\|off) |  |

### Subcategory · Subcategoría

_De dónde sale:_ TLOnbNeg.SUBS · TL<Cat>.SUBS/TOP/SUBG · tl-adm-v1.cat[k].add/off

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | NEG-<CAT>-<NN> |
| `category_id` · obligatorio | ref Category |  |
| `name` | text·i18n | Barbería |
| `group` | text | Grupo en el filtro (SUBG: «Para quién») |
| `photo` | media | Foto en la portada de la categoría (CategoryHero) |
| `top` | bool | Sale entre las 8 principales |
| `status` | enum(on\|off) | Quitar muestra «afecta a N negocios» |

### FilterOption · Opción de filtro

_De dónde sale:_ TLFood.GROUPS/QUICK · SUBG de cada categoría · tl-adm-v1.cat[k].foff

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `category_id` | ref Category |  |
| `group_key · group_label` | text · text·i18n | Familia: para quién, precio, idioma, seguro… |
| `key` | text | w:h, delivery, medicaid… (lo que el negocio marca en Business.filter_values) |
| `label` | text·i18n |  |
| `quick` | bool | Sale en los filtros rápidos |
| `active` | bool | El Super Admin lo apaga y desaparece de la hoja y de los rápidos |

### Synonym · Sinónimo

_De dónde sale:_ search-engine.js TLSearch.SYN · TLAdm.syn() · tl-adm-v1.syn

| Campo | Tipo | Nota |
|---|---|---|
| `term` · obligatorio | text | uñas, pica pollo… |
| `lang` | enum(es\|en) |  |
| `target_kind · target` | enum(category\|subcategory\|filter\|query) · text | A qué apunta |
| `active · created_by` | bool · ref StaffMember | Se aplica en Buscar al instante |

### Amenity · Comodidad

_De dónde sale:_ TLOnbNeg.AMEN · CFG.amen

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | text | parking, wifi… |
| `icon · label` | text · text·i18n | Estacionamiento |
| `categories` | list<ref Category> | Dónde se ofrece |

### ModuleType · Módulo

_De dónde sale:_ TLOnbNeg.MOD · Super Admin › Catálogo › Módulos (matriz Free/Pro)

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | enum(menu\|pedidos\|rsv\|svc\|citas\|cot\|shop\|renta\|staff\|eventos\|nov\|jobs) | Menú · Pedidos en línea · Reservaciones · Servicios · Citas (Booking) · Cotizaciones · Tienda · Renta · Staff · Eventos · Novedades · Vacantes |
| `name · desc` | text·i18n | «Te piden hora; tú confirmas.» |
| `free · pro` | json | Qué permite cada plan (Free: 5 ítems, 6 fotos, 1 persona; techo de 10 operaciones al mes) |

### SearchLog · Búsqueda

_De dónde sale:_ search-engine.js parse · tl-search-v1 · Super Admin › Analítica «Búsquedas sin oferta»

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `city_id · user_id` | ref City · ref User | user_id opcional |
| `query` | text | Lo que escribió |
| `understood` | json | Palabras y filtros que se entendieron (UnderstoodBar 2v) |
| `results` | int | 0 = «Aún no hay» → cuenta para búsquedas sin oferta: lista para reclutar, no crea semillas (D2) |
| `at` | datetime |  |

## 3. Negocios

Un negocio por ficha, Free o Pro sobre el mismo componente. Quien renta silla, bahía o escritorio es su propio negocio dentro del local de otro.

### Business · Negocio

_De dónde sale:_ TLAll.B (276) · TL<Cat>.B · TLDash2.BIZ · tl-dash2-v1.over[id] · tl-adm-v1.biz[id] · TLContact.tel/addr

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | slug | sabor-dominicano |
| `city_id` · obligatorio | ref City |  |
| `category_id` · obligatorio | ref Category | Una sola; cambiarla pasa por Cambios sensibles |
| `subcategory_ids` | list<ref Subcategory> | La primera da el rótulo de la tarjeta (BARBERÍA) |
| `name` · obligatorio | text |  |
| `status` · obligatorio | enum(draft\|active\|temp_closed\|hidden\|suspended\|closed\|merged) | Ver estados «Negocio» |
| `temp_closed_until · merged_into` | datetime · ref Business | Cierre temporal 1 · 3 · 7 · 14 días; duplicado fusionado |
| `origin` | enum(self\|seed\|claim) | Se registró solo · semilla, solo desde la recomendación de un vecino (D2) · recuperado |
| `owner_user_id` | ref User | null = sin reclamar |
| `operation` | enum(local\|casa\|ambos\|rento) | Tengo local · Voy a domicilio · Las dos · Trabajo en el local de otro (TLOnbNeg.OPS) |
| `hosted_at_business_id · seat_label` | ref Business · text | Si renta: el local donde trabaja y su lugar (Silla 1, Bahía 3) |
| `address · address_ref` | text | 412 N Wyoming St · «Al lado de la lavandería»; null si no tiene local |
| `geo` | geo | Pin exacto |
| `works_from_home` | bool | Mapa y ficha muestran solo la zona; la dirección exacta llega al confirmar la cita |
| `service_radius_mi` | int | A domicilio: hasta N millas |
| `phone · whatsapp` | phone · bool | Una sola fuente: gana el cambio más reciente entre el panel y el Super Admin |
| `email · instagram · facebook` | email · text · text |  |
| `languages` | list<text> | es, en, qu… |
| `about` | text·i18n | Quiénes somos |
| `founded_year` | int | Los años en la ficha se derivan |
| `amenities · filter_values` | list<ref Amenity> · list<text> | filter_values = claves de FilterOption que cumple (delivery, walkin, solo cita, medicaid…) |
| `payment_modes` | list<enum(local\|entrega\|app\|contacto)> | En el local · Contra entrega · Tarjeta en la app · Solo contacto. «app» necesita StripeAccount habilitada; la forma de pago no es Pro |
| `category_attrs` | json | Campos propios de la categoría (ver CategoryAttrs) |
| `logo` | media | Las fotos son Media con owner = negocio, en orden |
| `modules_on · modules_paused` | list<ModuleType> | Los que activó el negocio · los que pausó el Super Admin (la pestaña desaparece) |
| `staff_hidden` | bool | El Super Admin quitó al equipo de la página |
| `plan` · derivado | enum(free\|pro) | De Subscription: prueba y cortesía cuentan como Pro |
| `verified` · derivado | bool | Sello aprobado (último VerificationRequest = ok) |
| `rating_avg · review_count` · derivado | num · int | De las reseñas visibles (r, n) |
| `open_now · status_line` · derivado | bool · text·i18n | De BusinessHours: «cierra 9 PM» (st, open) |
| `profile_strength` · derivado | pct | Fuerza del perfil (filtro del admin: menos de 70 %) |
| `created_at · updated_at` | datetime | updated_at decide qué edición gana (over._at) |

- Orden de resultados: Pro primero con rotación diaria justa; dentro de cada bloque, relevancia + cercanía + calificación.
- Sucursal vinculada por BusinessLink no cuenta como duplicado.

### CategoryAttrs · Campos por categoría

No es una tabla: es el esquema de Business.category_attrs según la categoría. Sale de los campos propios de cada TL<Cat>.B.

_De dónde sale:_ neg-*-listing.js · neg-*.js

| Campo | Tipo | Nota |
|---|---|---|
| `NEG-FOOD` | json | La entrega y el tiempo salen de DeliverySettings (eta y fee del prototipo son texto calculado) |
| `NEG-BELL` | json | model (silla · salón · solo · casa), chairs, for_who (h · m · n · q), only_by_appointment |
| `NEG-AUTO` | json | bays, vehicle_types, brands, warranty_months |
| `NEG-HOGAR` | json | crew_size, pros, emergency_line (911 si huele a gas) |
| `NEG-SALUD` | json | doctors, insurances (medicaid…), cash_price_from, wait_min |
| `NEG-PRO` | json | licenses → License, disclaimer (lo que no garantiza), docs |
| `NEG-FIESTA` | json | capacity, busy_dates (¿esa fecha está libre?), deposit |
| `NEG-NOCHE` | json | cover, cover_after [hora, precio], min_age, music, dress_code, line_now (fila y hora), guest_list_until, nights |
| `NEG-MERC` | json | weighs_in_front (¿lo pesan delante de mí?) |
| `NEG-TIENDA` | json | hold_hours (cuánto guardan un apartado) |
| `NEG-TRANS` | json | vehicle_types, routes, long_distance |
| `NEG-EDU · NEG-NINOS · NEG-DEPORTE` | json | ages [desde, hasta], modality (presencial · en línea) |
| `NEG-FE` | json | services (misa en español, horarios), denomination |
| `NEG-INMUEBLE · NEG-DEALER` | json | kinds (renta, venta), brands, financing (ITIN) |

### BusinessHours · Horario

_De dónde sale:_ TLDash2.BIZ.hours {on,a,b,two,a2,b2} · TLAll.hrs/sat/sun/closed · byMod

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `module` | ModuleType | null = horario general; Pro puede tener uno distinto para el módulo en línea |
| `weekday` | int | 0 = domingo … 6 = sábado |
| `open` | bool |  |
| `ranges` | list<[time,time]> | Hasta 2 tramos; el segundo es Pro |

### SpecialHours · Feriados y cambios programados

_De dónde sale:_ TLDash2.HOLI · BIZ.sched · TLOnbNeg.HOLI/TPL

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `kind` | enum(holiday\|season\|scheduled) | Feriado · temporada · cambio programado (Pro) |
| `date_from · date_to` | date |  |
| `closed · ranges` | bool · list<[time,time]> |  |
| `label` | text·i18n | Acción de Gracias · jue 26 nov |

### BusinessLink · Relacionados y sucursales

_De dónde sale:_ dash2-rel.js TLRelP (over[id].relOut · relAns · relGone · relNote · tl-adm-v1.biz[id].relOff · modOff.rel) → TLRel.REL (vivos)

| Campo | Tipo | Nota |
|---|---|---|
| `a_id · b_id` · obligatorio | ref Business | a = quien lo pidió |
| `kind` | enum(sucursal\|dueno) | Sucursal · mismo dueño (no hay otros tipos) |
| `note_a · note_b` | text·i18n | Lo que la página de cada uno dice del otro; cada dueño edita la suya |
| `status` | enum(proposed\|ok\|rejected\|removed) | removed = cualquiera de los dos lo quitó; sale de las dos páginas |
| `requested_at · answered_at` | datetime |  |
| `hidden_by_admin · hidden_reason` | datetime · text | To'Latino lo oculta en las dos páginas |

- Solo Pro. Sale en las dos páginas solo cuando los dos aceptaron; para volver a conectarse se pide otra vez.
- Pendiente de decidir: los «sugeridos automáticos por cercanía» del plan (flujos-transversales) no están en V1.

### BusinessMember · Equipo

_De dónde sale:_ dash2-stf.js TLStf (over[id].stf · tl-adm-v1.biz[id].stfOff) → TLListing.STAFF · TLStaff.PEOPLE · TLBook.PROS.off · mods_ · neg-free-staff.js

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id` · obligatorio | ref Business |  |
| `user_id` | ref User | null si solo se muestra o está invitado |
| `kind` | enum(owner\|staff\|renter) | renter = renta espacio y es su propio Business (hosted_at) |
| `display_name · nickname` | text | «LE DICEN …» |
| `role` | text·i18n | Cocina y caja |
| `photo · languages` | media · list<text> |  |
| `specialties · bio` | list<text·i18n> · text·i18n | Sus palabras (OwnerCard 2p) |
| `weekly_schedule` | json | 7 días con tramos (wk); da «En turno hasta 9 PM» |
| `service_ids · dish_ids` | list<ref Item> | Qué servicios hace · platos que firma |
| `certification` | json | { título, verificado, vence } |
| `panel_access` | list<text> | Pedidos, mensajes, calendario… (mods_) |
| `status · show_on_page · sort` | enum(invited\|requested\|active\|removed) · bool · int | requested = la persona pidió unirse; removed conserva su lugar |
| `phone · invited_at · invite_expires_at` | phone · datetime · datetime | La invitación va por SMS y vence a los 7 días |
| `join_message` | text·i18n | Lo que escribió al pedir unirse |
| `same_as_business_hours` | bool | Empleados: su horario sale del horario del negocio |
| `hidden_by_admin · hidden_reason` | datetime · text | To'Latino la quita de la página; sigue en el equipo |

- Free muestra 1 persona (quien está detrás); Pro muestra el equipo.
- Solo sale quien aceptó. Foto, bio e idiomas los pone la persona (el dueño, los suyos); el negocio pone rol, especialidades, horario de empleados, platos y si sale.
- Dos caminos: el negocio invita por SMS o la persona pide unirse y el negocio acepta.
- Quien renta espacio maneja su propia agenda; en Belleza el rol sale del modelo del local (silla · comisión · empleados). Oculto = fuera de la pestaña Staff, del Resumen y del Booking del local.

### License · Licencia

_De dónde sale:_ To'Latino Licencia.dc.html · TLAdm.lic/licDefault · cola «Licencias» (72 h)

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `kind · title` | text · text·i18n | abogado, notario… |
| `can · cannot` | list<text·i18n> | Lo que puede y lo que no puede hacer |
| `issuer · number` | text | Quién la emite |
| `status` | enum(valid\|expired\|review\|revoked) |  |
| `next_review` | date |  |
| `registry_url` | url | «Verifícala tú» en el registro oficial |
| `verified_by · verified_at` | ref StaffMember · datetime |  |

### VerificationRequest · Sello de verificación

_De dónde sale:_ tl-dash2-v1.over[id].seal · cola «Sello» (48 h) · TLAdm.TPL selloNo/selloInfo

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `status` | enum(review\|ok\|info\|no) | En revisión · aprobado · falta un dato · no aprobado |
| `evidence` | json | Correo con código, llamada, fotos del local. Nunca documentos de identidad |
| `reason_key · note` | text | Plantilla del motivo |
| `reviewed_by · decided_at · created_at` | ref StaffMember · datetime |  |

### Media · Foto o archivo

_De dónde sale:_ biz-photos.js TLPhotos · over.gallery · phOff · user.photo

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `owner_kind · owner_id` · obligatorio | enum(business\|item\|member\|review\|post\|event\|user\|help\|support\|claim) · id |  |
| `url · w · h` | url · int · int | En el prototipo son ids de Pexels; en real, subidas |
| `sort` | int |  |
| `status` | enum(visible\|removed) | removed por el Super Admin, con motivo |
| `removed_reason · removed_by` | text · ref StaffMember |  |
| `uploaded_by · created_at` | ref User · datetime |  |

- Free: 6 fotos visibles. No se puede quitar la única foto visible de un negocio.

### PhotoReport · Foto reportada

_De dónde sale:_ tl-ph-rep-v1 · cola «Medios marcados» (4 h)

| Campo | Tipo | Nota |
|---|---|---|
| `media_id · reporter_user_id` · obligatorio | ref Media · ref User |  |
| `reason · note` | text |  |
| `status · created_at` | enum(open\|removed\|kept) · datetime |  |

### BusinessPost · Novedad

_De dónde sale:_ neg-nov.js TLNov.POSTS · TLListing.POSTS · TLDash2.BIZ.nov · TLCom.HOY · novOff

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id` · obligatorio | ref Business |  |
| `kind` | enum(oferta\|novedad\|llego\|aviso\|evento\|vacante\|encuesta\|cupon) | OFERTA · NOVEDAD · LLEGÓ · AVISO… |
| `text` | text·i18n |  |
| `item_id · price_was · price_now` | ref Item · money · money | Oferta de un ítem |
| `units_left · ends_at` | int · datetime | «quedan 2» · «hasta agotar · hoy» |
| `pinned` | bool |  |
| `poll_options` | list<text·i18n> | Encuesta; los votos son PollVote |
| `coupon_id · event_id · job_id` | ref Coupon · ref Event · ref JobPosting |  |
| `status · hidden_reason` | enum(draft\|live\|expired\|hidden) · text |  |
| `views · saves · orders` · derivado | int | Números en el panel |
| `created_at` | datetime |  |

- Sale en «Hoy en el barrio» solo 24 h; después queda en la pestaña Novedades.
- Votos y comentarios funcionan como en Comunidad (Vote y Comment con target business_post).

### Faq · Pregunta frecuente

_De dónde sale:_ TLDash2.BIZ.faq

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `question · answer` | text·i18n |  |
| `sort` | int |  |

### JobPosting · Vacante

_De dónde sale:_ dash2-job.js TLJobP (over[id].jobs · jobsV 2 · jobOff · modOff.jobs) → TLJobs.J (las que se ven) · TLJobs.ALL

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id` · obligatorio | ref Business |  |
| `title · kind` | text·i18n | Ayudante de cocina · Tiempo completo |
| `pay_from · pay_to · tips` | money · money · bool | Por hora |
| `days · start_time · end_time` | list<int 0 = lun> · time · time | El texto «Martes a domingo · 11 AM – 7 PM» se arma de aquí |
| `languages` | list<[lang, required]> |  |
| `duties · requirements · benefits` | text·i18n · list<text·i18n> · list<text·i18n> |  |
| `openings` | int |  |
| `status · created_at` | enum(draft\|live\|paused\|filled) · datetime | filled = cubierta; a los que esperaban se les avisa |
| `hidden_by_admin · hidden_reason` | datetime · text | To'Latino la quita de la página |

- Nunca pide CV, estatus migratorio, SSN ni pago. El editor bloquea esas palabras.
- Pago por hora desde $7.25 (mínimo de Pensilvania); «hasta» ≥ «desde».
- Solo Pro. Se ve si el módulo Jobs está encendido por el dueño y no pausado por To'Latino.

### JobApplication · Aplicación

_De dónde sale:_ Pestaña Jobs › Aplicar

| Campo | Tipo | Nota |
|---|---|---|
| `job_id · user_id` · obligatorio | ref JobPosting · ref User |  |
| `name · phone` | text · phone |  |
| `experience · days · languages · message` | enum(0\|1\|3\|4) · list<int> · list<lang> · text | Sin CV |
| `status · created_at` | enum(sent\|seen\|contact\|interview\|not_selected\|withdrawn) · datetime | Cada cambio le llega por SMS |
| `interview_at · interview_confirmed` | datetime · bool | El negocio propone en un día que abre; el vecino confirma |

### Claim · Recuperar o reclamar un negocio

_De dónde sale:_ tl-claim-v1 · To'Latino Recuperar negocio · cola «Cambios sensibles» (claim)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | CL-71xx |
| `business_id · user_id` · obligatorio | ref Business · ref User |  |
| `role` | enum(dueno\|socio\|encargado) | Si no es el dueño, el dueño recibe aviso |
| `method` | enum(call_code\|document) | Llamada al teléfono del negocio con código de 6 números, o documento |
| `doc_kind · doc_media` | enum(licencia\|servicio\|ein\|otro) · media | Foto obligatoria con los números de cuenta tapados |
| `note` | text |  |
| `status · reason` | enum(pending\|approved\|rejected) · text |  |
| `decided_by · decided_at · created_at` | ref StaffMember · datetime | Al aprobar, Business.owner_user_id cambia |

### OnboardingDraft · Publica tu negocio (borrador)

_De dónde sale:_ tl-onb-neg-v1 · onb-neg-data.js TLOnbNeg · ONB-NEG-*

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · obligatorio | ref User |  |
| `step` | text | A1 … G2 |
| `answers` | json | Categoría, subcategorías, operación, dirección o zona, horario por plantilla, primeros ítems, formas de cobro, fotos, contacto con código, sello, equipo, Free \| Pro |
| `imported_from` | json | Importar de Google Maps (nombre, categoría, dirección, fotos) |
| `promo_code` | text | HZL30 = 60 días de prueba |
| `started_at · completed_at · business_id` | datetime · ref Business | Al terminar crea el Business |

### ContactTap · Toque de contacto

_De dónde sale:_ tl-taps-v1 · biz-contact.js TLContact.tap

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `user_id` | ref User | Opcional |
| `kind` | enum(call\|whatsapp\|directions\|share\|calendar\|copy) |  |
| `source · at` | text · datetime | Pantalla donde tocó |

### BusinessDailyStats · Números del negocio

Resumen diario calculado, no una fuente.

_De dónde sale:_ TLDash2.BIZ.ins · Panel › Números · Super Admin › Operación

| Campo | Tipo | Nota |
|---|---|---|
| `business_id · date` · obligatorio | ref Business · date |  |
| `views · contacts · orders` · derivado | int | De SearchLog, ContactTap y Operation |
| `searches · sources · peak_hours` · derivado | json | Términos con los que lo encontraron, de dónde llegan, horas pico |
| `followers · saves · recommends` · derivado | int |  |

## 4. Lo que vende

Todo negocio vende algo con el mismo modelo: ítems en secciones, con precio y cómo se pide. Menú es la variante de Comida; Servicios se ordena con cita; Renta y Tienda son el mismo ítem con otros campos.

### Item · Ítem

_De dónde sale:_ neg-menu.js TLMenu.ITEMS · TLDash2.BIZ.items · TLListing.MENU · TLTienda.SVC · TLOnbNeg.CFG.item · dash2-cat.js

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id` · obligatorio | ref Business |  |
| `module` | enum(menu\|shop\|svc\|renta\|veh\|inm\|clase\|plan) | veh = auto en venta, inm = propiedad, clase = curso, plan = plan recurrente del hogar |
| `section_id` | ref ItemSection |  |
| `name · desc` · obligatorio | text·i18n |  |
| `price · price_from` | money · bool | «Desde $15» |
| `unit` | enum(u\|lb\|hora\|dia\|semana\|mes\|persona) | Por libra, renta al mes… |
| `duration_min` | int | Servicios |
| `photos` | list<media> |  |
| `sell_mode` | enum(catalog\|online\|local_only) | Solo mostrar · Se puede pedir · SOLO EN EL LOCAL |
| `available · available_days · available_until` | bool · text · time | Agotado · «Sábados» · «HASTA LAS 4 PM» |
| `featured` | bool | Populares |
| `deposit · stock` | money · int | Depósito si lo pide · cantidad (renta, tienda) |
| `option_group_ids` | list<ref OptionGroup> |  |
| `attrs` | json | veh: año, marca, modelo, millas · inm: recámaras · clase: semanas, horario · plan: frecuencia · renta: precio por día |
| `status · hidden_reason` | enum(live\|hidden) · text | hidden = el Super Admin lo ocultó |
| `sort · created_at` | int · datetime |  |

- Free: 5 ítems visibles; los demás quedan dormidos, no se borran.

### ItemSection · Sección

_De dónde sale:_ TLMenu.CATS · menuCfg (orden, ocultas)

| Campo | Tipo | Nota |
|---|---|---|
| `business_id · module` · obligatorio | ref Business · ModuleType |  |
| `name · note` | text·i18n | Almuerzo · «HASTA LAS 4 PM» |
| `until` | time |  |
| `sort · hidden` | int · bool |  |

### OptionGroup · Opciones de un ítem

_De dónde sale:_ TLMenu.G

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `name` | text·i18n | Elige la carne |
| `required · max` | bool · int | Obligatorio → «Elige: …» antes de agregar |
| `options` | list<[text·i18n, money]> | Nombre y lo que suma al precio |

### StaffService · Precio por persona

_De dónde sale:_ TLBook.PROS[].pr · TLBook.CFG.stf

| Campo | Tipo | Nota |
|---|---|---|
| `item_id` · obligatorio | ref Item |  |
| `member_id · provider_business_id` | ref BusinessMember · ref Business | Persona del equipo, o el profesional que renta (su propio negocio) |
| `price · duration_min` | money · int | Quien renta silla pone sus precios y cobra él |

### BookingPolicy · Cómo toma citas

_De dónde sale:_ neg-bell-book.js TLBook.CFG · neg-*-book.js · neg-rsv.js TLRsv.CFG

| Campo | Tipo | Nota |
|---|---|---|
| `business_id · module` · obligatorio | ref Business · ModuleType | Por negocio o por profesional; módulo citas, rsv o cot |
| `approval` | enum(manual\|instant) | manual por defecto; instant solo si el profesional activa «Aprobar citas al instante» en su panel (D4) |
| `response_min` | int | «Responde en ~20 min» (apr) |
| `expires_h` | int | Sin respuesta en N h → SIN RESPUESTA (exp, 2 por defecto) |
| `deposit · deposit_section_ids` | money · list<ref ItemSection> | Depósito y en qué secciones aplica (color y tratamientos) |
| `cancel_free_h` | int | Gratis hasta N h antes (cx) |
| `late_tolerance_min` | int | Tolerancia (tol) |
| `lead_days · mobile_radius_mi · travel_fee` | int · int · money | Anticipación · a domicilio hasta N mi · traslado $40 |
| `prep_note` | text·i18n | Cómo llegar preparado (pelo seco, trenzas…) |

- Siempre a la vista: «Cancelar: gratis hasta X. Después: Y.»

### ReservationSettings · Reservación de mesa

_De dónde sale:_ TLRsv.CFG

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `max_party` | int |  |
| `areas` | list<[key, text·i18n]> | Salón · Terraza |
| `service_periods` | list<[time, time, text·i18n]> | Almuerzo 12–3:30 |
| `full_dates` | list<date> | Días sin mesas |

### DeliverySettings · Entrega y pedidos en línea

_De dónde sale:_ TLPed.cfg (dash2-data) · over.dlv · over.modCfg.pedidos · over.menuCfg · tl-adm-v1 modOff pedidos|dlv

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `delivery · pickup · shipping` | bool | Al menos uno; Envío solo si tiene Tienda o Renta |
| `zone_mi · fee · free_over · min_order` | int(1\|3\|5\|10) · money · money · money | Delivery hasta 3 mi · $3 · gratis desde $40 · mínimo $15 (el mínimo es solo de delivery) |
| `prep_min` | int | Se edita en Pedidos en línea; pickup = prep + extra por mucho trabajo |
| `travel_min` | int(10\|15\|20) | Delivery llega en prep + t a prep + 2t (25 + 10 → 35–45 min) |
| `last_delivery_before_close_min` | int(0\|30\|60) | 0 = con el último pedido en línea |
| `who · external_app` | enum(team\|external) · enum(doordash\|uber_eats\|other) | Repartidores propios o una app externa (enlace de seguimiento en cada pedido). Entrega To’Latino: oculta hasta que se active por ciudad |
| `pickup_note` | text·i18n (120) | «Pide en la caja con tu número de pedido.» |
| `ship_fee · ship_free_over · ship_days` | money · money · enum(1-2\|3-5\|5-7) | Solo Tienda y Renta |
| `scheduled_orders` | bool | Para hoy; antes de abrir, para cuando abra |
| `auto_accept` | bool | Apagado por defecto: el dueño acepta cada pedido en 10 min o se libera |
| `pay_card · pay_cash_pickup · pay_cash_delivery` | bool | Tarjeta exige Stripe activo; efectivo al entregar solo con equipo propio |
| `ask_tip` | bool | Propina en delivery; va completa a quien entrega |
| `paused_until · busy_extra_min · last_order_before_close_min` | text · int · int | Menú · Horarios y Pedidos en línea (mismo dato) |
| `admin_paused_orders · admin_paused_delivery` | bool | To’Latino pausa Pedidos en línea o solo el delivery (el pickup sigue); el panel lo avisa con el motivo |

- Un modo (delivery o pickup) sale al cliente solo si tiene cómo pagar: tarjeta (Stripe) o efectivo de ese modo.
- Dirección fuera de zone_mi: «No llega a tu dirección · pide pickup»; no se puede pagar.
- Pedido mínimo, plato «solo pickup / solo delivery» y dirección fuera de zona bloquean el pago con el motivo a la vista.
- Efectivo: no se retiene nada; To’Latino no cobra comisión (la app solo lo registra). Tarjeta: 10 %.
- Auto-aceptar no corre con el local cerrado ni en pausa.
- Comida Free: solo pickup.

### PrivateEventSettings · Evento privado

_De dónde sale:_ evp-flow.js TLEvp

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `capacity · lead_days` | int | Sabor 40 · Fogón 60 · Bahía 30 · 3 días |
| `areas` | list<[key, text·i18n]> | + «Todo el local» |
| `occasions · menus · budgets · extras` | json | OCC, MENU (precio por persona), BUD, EXT |
| `deposit_pct · cancel_free_h` | pct · int | PlatformConfig evpDep 25 % y evpCx 72 h por defecto |

## 5. Personas y cuenta

Una cuenta por teléfono. «Mi ciudad» (Comunidad, cada 30 días) es distinta de la «ciudad que estoy viendo» (libre, por dispositivo).

### User · Cuenta

_De dónde sale:_ tl-proto-user-v1 · usr-data.js TLUsr · TLAdm.USERS · tl-adm-v1.usr[id]

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `phone · phone_verified_at` · único | phone · datetime | Único; se verifica con código |
| `email · email_verified` | email · bool | Opcional |
| `first_name · last_name` | text | Se muestra «Rosaura M.» |
| `photo · photo_removed_reason` | media · text | Recortada a 320 px; el Super Admin la puede quitar con motivo |
| `lang` | enum(es\|en) |  |
| `home_city_id · home_city_changed_at` | ref City · datetime | Mi ciudad: se cambia cada 30 días |
| `zone_id` | ref Zone |  |
| `status · status_until` | enum(active\|muted\|suspended\|banned\|deleted_pending\|deleted\|merged) · datetime | Ver estados «Cuenta» |
| `delete_at · merged_into` | datetime · ref User | Borrado aprobado: 30 días de gracia y «Restaurar»; después se borra todo lo suyo (D5) |
| `is_promoter · referral_code` | bool · text | Promotor es un atributo, no un rol |
| `founder` | bool | Insignia Fundadores |
| `is_test` | bool | Cuenta de prueba (u00 Rosaura): se excluye de números |
| `created_at · last_seen_at` | datetime |  |

### Device · Dispositivo y sesión

_De dónde sale:_ TLUsr.SESSIONS · devs0/devOut/devBlk · tl-loc-v1

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · obligatorio | ref User |  |
| `name · platform · app` | text · enum(ios\|android\|web) · enum(cliente\|negocio\|delivery\|checkin) | Este iPhone |
| `push_token` | text |  |
| `last_seen_at · last_place` | datetime · text |  |
| `signed_out_at · blocked` | datetime · bool | El Super Admin cierra o bloquea |
| `viewing_city_id · viewing_center · viewing_radius_mi` | ref City · json · int | Ciudad que estoy viendo: barrio o GPS y radio |

- Cuentas en el mismo dispositivo → aviso de posible red en el Super Admin.

### OtpCode · Código por SMS

_De dónde sale:_ Onboarding de usuario · Recuperar negocio (llamada) · PlatformConfig

| Campo | Tipo | Nota |
|---|---|---|
| `phone · purpose` · obligatorio | phone · enum(login\|phone_change\|claim_call) |  |
| `code_hash · attempts` | text · int |  |
| `expires_at · used_at` | datetime |  |

### AccountChange · Cambios de la cuenta

_De dónde sale:_ cityLog0 · phoneCh0 · tl-adm-v1.usr[id].cityLog

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · kind` · obligatorio | ref User · enum(phone\|city\|email\|name) |  |
| `from · to` | text |  |
| `by · at` | enum(user\|staff) · datetime |  |

### Address · Dirección de entrega

_De dónde sale:_ TLUsr.ADDR

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · obligatorio | ref User |  |
| `label · name` | enum(casa\|trabajo\|otra) · text | «Casa de mami» |
| `street · apt · zip` | text |  |
| `instructions` | text | Timbre de arriba |
| `geo · is_default` | geo · bool |  |

### PaymentMethod · Tarjeta guardada

_De dónde sale:_ pay-methods.js TLPay · TLUsr.CARDS

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · obligatorio | ref User |  |
| `stripe_pm_id` · único | text | Solo la referencia de Stripe |
| `brand · last4 · exp` | text | Visa ·· 4242 · 08/28 |
| `saved · is_default` | bool | saved = false para usar una sola vez |

- El Wallet también se puede usar para pagar (ver WalletEntry).

### Favorite · Guardado

_De dónde sale:_ TLUsr.FAV · state.saved

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · kind · target_id` · obligatorio | ref User · enum(business\|item\|event) · id |  |
| `created_at` | datetime |  |

### Follow · Seguir

_De dónde sale:_ state.follow · tl-com-v1

| Campo | Tipo | Nota |
|---|---|---|
| `follower_user_id` · obligatorio | ref User |  |
| `target_kind · target_id` · obligatorio | enum(user\|business) · id |  |
| `created_at` | datetime |  |

### BlockMute · Bloquear o silenciar

_De dónde sale:_ Comunidad › perfil del vecino

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · target_user_id` · obligatorio | ref User |  |
| `kind · created_at` | enum(block\|mute) · datetime |  |

### Notification · Aviso

_De dónde sale:_ tl-notif-v1 · Mi cuenta › Avisos

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · obligatorio | ref User |  |
| `template_key` | ref NotificationTemplate |  |
| `channel` | enum(push\|sms\|email\|inapp) |  |
| `payload · ref_kind · ref_id` | json · text · id | A qué operación o publicación lleva |
| `status · sent_at · read_at` | enum(queued\|sent\|failed) · datetime |  |

### NotificationPref · Preferencia de avisos

_De dónde sale:_ Mi cuenta › Avisos · Super Admin › Usuario › Privacidad (solo lectura)

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · group · channel` · obligatorio | ref User · enum(critical\|ops\|community\|marketing) · enum(push\|sms\|email) |  |
| `on` | bool | critical (pedidos, citas y pagos) siempre llega por SMS |

### SearchAlert · Avísame

_De dónde sale:_ tl-search-v1.alerts · NotYetCard 2x · Mi cuenta › Avisos

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · city_id` · obligatorio | ref User · ref City |  |
| `query · filters` | text · json |  |
| `created_at · notified_at · removed_at` | datetime |  |

### Recommendation · Recomienda un negocio

_De dónde sale:_ tl-rec-v1 · tl-rec-draft-v1 · To'Latino Recomendar · cola «Recomendaciones de vecinos» (168 h)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `by_user_id · city_id` · obligatorio | ref User · ref City |  |
| `business_name · category_id` | text · ref Category |  |
| `where · address` | enum(address\|sin_local) · text |  |
| `contact_phone` | phone | Opcional; si está, se manda 1 SMS |
| `how_known` | text | Cómo lo conoces |
| `is_mine` | bool | «Es mío» → Publica tu negocio |
| `reveal_me` | bool | Decirle que fuiste tú |
| `status · business_id` | enum(draft\|sent\|joined\|seeded\|declined) · ref Business |  |
| `created_at` | datetime |  |

### Referral · Referido

_De dónde sale:_ TLUsr.INVITED · Super Admin › Crecimiento (promotores)

| Campo | Tipo | Nota |
|---|---|---|
| `promoter_user_id · code` · obligatorio | ref User · text |  |
| `referred_kind · referred_id` | enum(user\|business) · id |  |
| `reward · status · at` | money · enum(pending\|paid) · datetime | El pago va al Wallet |

### TermsAcceptance · Términos aceptados

_De dónde sale:_ Super Admin › Textos (páginas legales con aceptación forzada)

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · page_key · version` · obligatorio | ref User · ref LegalPage · int |  |
| `accepted_at` | datetime |  |

## 6. Pedidos, citas y reservaciones

Todo lo que un cliente pide a un negocio es una Operation con un tipo. Una sola tabla para que Mi cuenta, el panel y el Super Admin › Transacciones lean lo mismo (el prototipo tiene 13 listas; usrAll() ya las une).

### Operation · Operación

_De dónde sale:_ Prototipo state: order, citas, acitas, hcitas, scitas, pcitas, fcitas, eins, nres, trv, mped, tped, evps, rsvs · usrAll() · TLUsr.O/C/AP · TLDash2.BIZ.req · TLAdm.TX

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `number` · único | text | Visible: #1051 pedido · C-92xx cita · R-93xx reservación · B-9401 boletos · A-9501 apartado |
| `kind` · obligatorio | enum(order\|market_order\|hold\|appointment\|quote\|party\|private_event\|table\|night\|trip\|enrollment\|visit\|tickets\|rental) | Ver la nota de tipos |
| `city_id · business_id · user_id` · obligatorio | ref City · ref Business · ref User |  |
| `member_id` | ref BusinessMember | Con quién (o el profesional que renta) |
| `status` · obligatorio | enum(pending\|change_proposed\|confirmed\|declined\|expired\|cancelled\|done) | Las 7 etiquetas: PENDIENTE · TE PROPONEN UN CAMBIO · CONFIRMADA · NO PUDO · SIN RESPUESTA · CANCELADA · TERMINADA |
| `status_detail` | text | Sub-estado de la categoría: parcial, seg, quote, est, xtra, pesado, noshow, wd |
| `stage` | enum(sent\|accepted\|preparing\|ready\|on_the_way\|delivered\|picked_up) | Solo pedidos (OrderTracker 2k) |
| `scheduled_at · duration_min · party_size` | datetime · int · int |  |
| `address` | json | Copia de la dirección (delivery o visita a casa) |
| `vehicle · insurance` | text | Auto: «2016 Honda CR-V» · Salud: «Medicaid · aceptado» |
| `customer_note` | text | «Llega con el pelo seco.» |
| `details` | json | Campos propios del tipo: lista o mesa de la noche, origen y destino del viaje, programa de la inscripción, ocasión del evento privado… |
| `subtotal · delivery_fee · tip · tax · discount · total · deposit` | money |  |
| `pay_mode` | enum(app\|local\|entrega\|none) |  |
| `cancel_policy` | text·i18n | Copia al enviar: «Cancelar: gratis hasta X. Después: Y.» |
| `respond_by` · derivado | datetime | De BookingPolicy |
| `sent_at · answered_at · confirmed_at · done_at · cancelled_at` | datetime |  |
| `cancelled_by · cancel_reason` | enum(user\|business\|admin\|system) · text |  |
| `late_notice_at` | datetime | «Voy tarde» |
| `free_quota_month` | text | aaaa-mm: cuenta para el techo Free del negocio |

- Tipos: order = Comida (pickup o delivery) · market_order = Mercados (lo estimado se ajusta al pesar) · hold = apartado de Tiendas y «Apartar» de Belleza/Auto/Hogar/Salud · appointment = Belleza, Auto, Hogar, Salud, Profesionales · quote = cotización con fotos → total · party = Fiestas · private_event = evento privado · table = mesa · night = Vida Nocturna · trip = Transporte · enrollment = Educación, Niños, Deporte, Iglesias · visit = Bienes Raíces y Venta de Autos · tickets = boletos · rental = renta.
- Techo Free: 10 operaciones al mes (PlatformConfig); al llegar, la ficha ofrece Llamar.
- Se gestiona en: Mi cuenta (cliente) · Panel › Hoy (negocio) · Super Admin › Transacciones (línea de tiempo por objeto).
- Si el vecino borra su cuenta (D5): a los 30 días se borran sus operaciones con todo lo demás; los cobros con tarjeta quedan solo en Stripe.

### OperationLine · Línea

_De dónde sale:_ TLUsr.O.lines · CartLine · TLDash2.BIZ.req.lines

| Campo | Tipo | Nota |
|---|---|---|
| `operation_id · item_id` · obligatorio | ref Operation · ref Item |  |
| `name` | text·i18n | Copia del nombre |
| `qty · unit_price · line_total` | num · money · money |  |
| `options · instructions` | json · text | Lo elegido y «sin cebolla» |
| `weight_est · weight_final` | num | Mercados |

### OperationEvent · Línea de tiempo

_De dónde sale:_ TLDash2.BIZ.req.tl · BIZ.log · OrderTracker

| Campo | Tipo | Nota |
|---|---|---|
| `operation_id · at` · obligatorio | ref Operation · datetime |  |
| `kind` | text | sent, accepted, change_proposed, picked_up, delivered… |
| `actor · actor_id` | enum(user\|business\|member\|system\|admin) · id | «Rosa aceptó el pedido #1040» |
| `note` | text·i18n |  |

### ChangeProposal · Te proponen un cambio

_De dónde sale:_ ChangeProposal 2k · scen cambio · dashAlt()

| Campo | Tipo | Nota |
|---|---|---|
| `operation_id` · obligatorio | ref Operation |  |
| `kind` | enum(time\|date\|price\|items\|quote) |  |
| `proposed · reason` | json · text·i18n | Nueva hora, nuevo total o ítems |
| `status · created_at · answered_at` | enum(open\|accepted\|declined\|expired) · datetime |  |

### Delivery · Entrega del negocio

_De dónde sale:_ TLContact.drvTel · TLDash2.BIZ.riders/dlv · TLUsr.O.driver

| Campo | Tipo | Nota |
|---|---|---|
| `operation_id` · obligatorio | ref Operation |  |
| `rider_member_id` | ref BusinessMember | Miguel Reyes |
| `masked_phone` | phone | Número temporal: dura 30 min tras entregar (PlatformConfig drvMask) |
| `prefs` | json | Cómo te lo entregamos (DeliveryPrefs 2j) |
| `eta · picked_up_at · delivered_at` | datetime |  |
| `external_platform` | text | Si el negocio usa DoorDash/Uber Eats |

### HelpRequest · Ayuda con un pedido o cita

_De dónde sale:_ TLUsr.REQS · state.req · neg-cita-help.js TLCitaHelp · cola «Ayudas escaladas» (2 h)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | AY-24xx |
| `operation_id · user_id · business_id` · obligatorio | ref Operation · ref User · ref Business |  |
| `reason_key · detail · photos` | text · text · list<media> | HelpReasonList 2l: faltó algo, llegó frío… |
| `requested_solution · amount` | enum(wallet\|card\|redo\|none) · money | «$3.18 a tu Wallet» |
| `status` | enum(sent\|business_answered\|resolved\|escalated\|approved\|denied) | Ver estados «Ayuda» |
| `business_reply · business_due_at` | text·i18n · datetime | El negocio tiene 24 h |
| `admin_due_at · decided_by · decision_note` | datetime · ref StaffMember · text | To'Latino revisa en 48 h |
| `created_at` | datetime |  |

### Review · Reseña

_De dónde sale:_ TLUsr.REV · TLDash2.BIZ.reviews · neg-rev.js TLRev.forBiz · neg-*-rev.js · tl-adm-v1.rev · ReviewCard 2z

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id` · obligatorio | ref Business | Si atendió un profesional que renta: su negocio |
| `host_business_id` | ref Business | Se suma en el local como «vía {Local}» |
| `operation_id` | ref Operation | Reseña verificada: «DELIVERY · PEDIDO #1042» |
| `user_id · stars` · obligatorio | ref User · int | 1–5 |
| `text · lang · photos` | text · enum(es\|en) · list<media> | Se muestra en su idioma; «Ver traducción» si la app está en el otro (D3) |
| `text_translated · translated_at` · derivado | text · datetime | La traducción al otro idioma: se pide la primera vez que alguien toca «Ver traducción» y se guarda (D3) |
| `answers` | json | Preguntas propias de la categoría (¿te entendieron?, ¿aceptaron tu seguro?) |
| `topics` | list<text> | Temas que menciona |
| `useful_count` · derivado | int |  |
| `reply · reply_at` | text · datetime | Respuesta del negocio |
| `status · hidden_reason` | enum(visible\|hidden) · text |  |
| `created_at · edited_at` | datetime |  |

- Solo con una operación terminada. La reseña verificada da +15 puntos.

### ChatThread · Conversación

_De dónde sale:_ TLUsr.THREADS · TLDash2.BIZ.msgs · USR-CHAT-NEG · Comunidad chats

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `kind` · obligatorio | enum(user_business\|user_user\|game_table) |  |
| `user_id · business_id · other_user_id` | ref User · ref Business · ref User |  |
| `operation_id` | ref Operation | Contexto: «Pedido #1051 · en camino» |
| `assigned_member_id` | ref BusinessMember | A quién del equipo le toca |
| `last_at · unread` · derivado | datetime · int |  |

- Vecino ↔ vecino solo si el que recibe te sigue. Cliente ↔ negocio sin restricción.
- El equipo de To'Latino no lee chats privados salvo con un reporte abierto.

### Message · Mensaje

_De dónde sale:_ THREADS.msgs · msgs.th

| Campo | Tipo | Nota |
|---|---|---|
| `thread_id` · obligatorio | ref ChatThread |  |
| `from · from_id` | enum(user\|business\|member) · id |  |
| `text · photo` | text · media |  |
| `at · read_at` | datetime |  |

## 7. Dinero

Stripe para tarjetas (Connect para los negocios). Comisión solo sobre pagos con tarjeta en la app; en efectivo, en el local o contra entrega no hay comisión. La suscripción Pro es el ingreso principal.

### Payment · Cobro

_De dónde sale:_ TLAdm.TX (ret · cob · lib · dev, comm) · TLUsr.MOVES · TLPay · PaymentSummary 2aa

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `operation_id · user_id · business_id` · obligatorio | ref Operation · ref User · ref Business |  |
| `kind` | enum(full\|deposit\|balance\|tip) | Depósito de cita o evento privado, total del pedido… |
| `method` | enum(card\|wallet) · ref PaymentMethod |  |
| `stripe_payment_intent` · único | text |  |
| `amount · platform_fee` | money | platform_fee = comisión (solo tarjeta en la app) |
| `status` · obligatorio | enum(held\|captured\|released\|refunded\|partially_refunded\|failed) | Retenido · Cobrado · Liberado · Devuelto |
| `held_at · captured_at · released_at` | datetime |  |
| `failure_code` | text | «Tu banco la rechazó» |

### Refund · Devolución

_De dónde sale:_ TLAdm.TX dev · Eventos «Devolución total» · Super Admin › Transacciones

| Campo | Tipo | Nota |
|---|---|---|
| `payment_id · amount` · obligatorio | ref Payment · money |  |
| `reason · initiated_by` | text · enum(business\|admin\|policy\|event_cancelled) |  |
| `fee_absorbed_by · to` | enum(platform\|business) · enum(card\|wallet) |  |
| `stripe_refund_id · status · created_at` | text · enum(pending\|done\|failed) · datetime |  |

### Dispute · Disputa

_De dónde sale:_ Cola «Disputas» (120 h) · DP-121

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | DP-1xx |
| `payment_id · stripe_dispute_id` · obligatorio | ref Payment · text |  |
| `reason · evidence · due_by` | text · json · datetime |  |
| `status · adjustment` | enum(open\|submitted\|won\|lost) · money | Ajuste al negocio según el resultado |

### StripeAccount · Cuenta de cobro del negocio

_De dónde sale:_ TLDash2.BIZ.pay/bank · Super Admin › Negocio › Dinero

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `stripe_account_id` · único | text |  |
| `status` | enum(none\|pending\|enabled\|restricted) |  |
| `bank_last4` | text | ·· 0721 |
| `payouts_paused · paused_reason` | bool · text | El Super Admin pausa pagos |

- No frena publicar ni vender en el local: solo el cobro con tarjeta en la app la necesita. Stripe pide los datos fiscales, To'Latino no.

### Payout · Pago al negocio

_De dónde sale:_ Super Admin › Negocio › Dinero (pagos semanales)

| Campo | Tipo | Nota |
|---|---|---|
| `business_id · period_from · period_to` · obligatorio | ref Business · date · date |  |
| `amount · status` | money · enum(scheduled\|paid\|failed\|held) |  |
| `arrival_date · stripe_payout_id` | date · text |  |

### WalletEntry · Movimiento del Wallet

_De dónde sale:_ TLUsr.WALLET · walAdj · pago a promotores

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · amount` · obligatorio | ref User · money | Positivo o negativo |
| `kind` | enum(help_credit\|refund\|adjust\|promoter\|spend) |  |
| `operation_id · note` | ref Operation · text·i18n |  |
| `by_staff_id · created_at` | ref StaffMember · datetime | Ajustes con tope por rol |

- Saldo = suma de movimientos (derivado). «Movimientos» en Mi cuenta junta Payment, Refund y WalletEntry; no es otra tabla.

### Subscription · Plan Pro

_De dónde sale:_ pro-trial.js TLTrial · tl-trial-v1 · TLAdm.SUBS · biz[id].pro = cortesia

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · obligatorio | ref Business |  |
| `status` | enum(none\|trial\|active\|past_due\|courtesy\|canceling\|ended) | Ver estados «Prueba y plan» |
| `cycle · price` | enum(monthly\|annual) · money | $14.99 al mes; anual = 10 meses («2 meses gratis») |
| `trial_started_at · trial_ends_at` | datetime | Día 0 y día 30 |
| `trial_choice` | enum(none\|card\|no_continue) | Sigue con tarjeta · no sigue (Pro hasta el día 30) |
| `card_id · promo_code` | ref PaymentMethod · text | HZL30 = 60 días |
| `courtesy_until` | date | Pro de cortesía 30/60/90 días desde el Super Admin |
| `current_period_end · cancel_at_period_end · retries` | datetime · bool · int | Pago fallido: reintentos y avisos |
| `stripe_subscription_id` | text |  |
| `notices_sent` | list<enum(d20\|d25\|d29\|end\|first\|back)> |  |

- Al terminar sin tarjeta pasa a Free sin borrar nada: lo Pro duerme y vuelve al pagar. Sin segunda prueba.

### Invoice · Factura del plan

_De dónde sale:_ Super Admin › Negocio › Dinero (facturas)

| Campo | Tipo | Nota |
|---|---|---|
| `subscription_id · amount` · obligatorio | ref Subscription · money |  |
| `status` | enum(paid\|failed\|retrying\|void) |  |
| `attempted_at · paid_at · stripe_invoice_id` | datetime · datetime · text |  |

### FeeRule · Comisión

_De dónde sale:_ tl-adm-v1.plan.fees · Super Admin › Planes

| Campo | Tipo | Nota |
|---|---|---|
| `category_id · kind` | ref Category · text | null = todas |
| `rate · fixed` | pct · money |  |
| `effective_from · created_by` | date · ref StaffMember | Todo cambio se avisa con 30 días |

### Coupon · Cupón

_De dónde sale:_ com-data.js TLCom.COUPONS · Novedad tipo cupón · tl-adm-v1.gam

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `business_id · kind` · obligatorio | ref Business · enum(code\|coins) | Código de descuento · se canjea con monedas |
| `code · discount · min_order` | text · money\|pct · money | SABOR3 |
| `title · cost_coins` | text·i18n · int | «Café con leche gratis» · 80 monedas |
| `valid_until · paused` | datetime · bool | El Super Admin pausa o cambia el costo |

### CouponRedemption · Cupón canjeado

_De dónde sale:_ tl-com-v1 coupons · coinLog

| Campo | Tipo | Nota |
|---|---|---|
| `coupon_id · user_id` · obligatorio | ref Coupon · ref User |  |
| `code · operation_id · at` | text · ref Operation · datetime | TL-CQ-1234 |

## 8. Eventos

Los organiza un negocio. Pasan por revisión de To'Latino (24 h). El portero valida en el modo puerta de la app del negocio; no vende: los boletos se compran en la app (D1).

### Event · Evento

_De dónde sale:_ TLEvP (dash2-evt.js) · tl-dash2-v1 over[id].evts · evt-data.js TLEvt.E (base) · tl-evt-pub-v1 · tl-adm-v1.evt · cola «Eventos a revisar» (24 h)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | slug | jueves-bachata |
| `city_id · organizer_business_id` · obligatorio | ref City · ref Business |  |
| `title · type · genres` | text·i18n · enum(noche\|comida\|comunidad\|fe\|deporte\|familia) · list<text> |  |
| `date · start_time · end_time · doors_time` | date · time | 10 PM – 2 AM · puertas 9 PM |
| `min_age` | int | 0 = todas las edades |
| `venue_name · address · geo` | text · text · geo |  |
| `photo · gallery` | media · list<media> |  |
| `entry` | enum(free\|rsvp\|tickets) | Entrada libre · Gratis con RSVP · Boletos en la app. En V1 no hay venta en la puerta (D1) |
| `capacity` | int |  |
| `before_you_go · lineup` | list<text·i18n> · list<[time, text, text·i18n]> | Vestimenta… · DJ y a qué hora |
| `rules` | json | Reentrada y piden ID |
| `change_policy · refund_policy` | text·i18n | «Devolución total si el evento se cancela» |
| `status · review_note` | enum(draft\|review\|changes\|live\|sold_out\|cancelled\|hidden\|rejected\|done) · text | Ver estados «Evento» |
| `going_count` | int |  |
| `format` | enum(party_show\|food_music\|class\|worship\|community) | Lo que la categoría deja publicar (TLEvP.CAT): Noche → fiesta/show, clase, comida · Comida → comida, fiesta, clase · Iglesias → culto, comunitario · Educación/Niños → clase, comunitario… |
| `rsvp_capacity · rsvp_party_max · door_count` | int · int · bool | 0 = sin límite; una familia dice cuántos van; contar en la puerta opcional |
| `venue_mode · venue_name · venue_address` | enum(own\|other) · text · text | En mi local o en otro lugar (parque) |
| `doors_before_min · sales_until · max_per_person` | int(0\|30\|60) · enum(start\|doors\|day_before) · int | D1: en la puerta no se vende |
| `dress_code · childcare · family · food_paid_at_venue` | text·i18n · bool · bool · bool | Solo en los formatos que los usan |
| `status` | enum(draft\|on_sale\|paused\|cancelled) | + admin hidden/cancelled (tl-adm-v1.evt) |
| `moved_from · cancel_reason` | text · text | Cambio de fecha con boletos vendidos avisa a compradores; cancelar devuelve todo |
| `discount_codes · comps` | list<{code, pct\|usd, value, uses, used}> · list<{name, qty, code}> | Cortesías cuentan en la puerta como boleto |

- Un solo evento por negocio en un solo lugar: el panel lo crea y lo ve el módulo Eventos, la pestaña Eventos y el Super Admin.
- La página del evento cambia según el formato: fiesta/show en oscuro con line-up, mesas y botellas; los demás en claro con programa, cupo, cuidado de niños o «la comida se paga en el local».

### TicketType · Tipo de entrada

_De dónde sale:_ TLEvt.E.tks · BIZ.events.tiers

| Campo | Tipo | Nota |
|---|---|---|
| `event_id` · obligatorio | ref Event |  |
| `name · note` | text·i18n | Entrada general · «Antes de las 11 PM» |
| `price · quantity · sales_until` | money · int · datetime |  |
| `sold` · derivado | int |  |

### EventTable · Mesa del evento

_De dónde sale:_ TLEvt.E.mesas · BIZ.events.tables

| Campo | Tipo | Nota |
|---|---|---|
| `event_id` · obligatorio | ref Event |  |
| `zone` | text·i18n | Mesa · Pista |
| `seats · min_spend · deposit · quantity` | int · money · money · int |  |

### EventAddOn · Extra del evento

_De dónde sale:_ TLEvt.E.adds · BIZ.events.addons

| Campo | Tipo | Nota |
|---|---|---|
| `event_id` · obligatorio | ref Event |  |
| `name · desc` | text·i18n | Botella premium |
| `price · table_only` | money · bool |  |

### Ticket · Boleto

_De dónde sale:_ TLUsr.T · TLAdm.tickets(eid) · tl-evt-v2 · TicketQR 2ac

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `code` · único | text | TL-NM-4R7C; el QR lleva el código firmado |
| `event_id · ticket_type_id · table_id` · obligatorio | ref Event · ref TicketType · ref EventTable |  |
| `operation_id` | ref Operation | La compra (kind tickets) |
| `holder_user_id · holder_name · admits` | ref User · text · int |  |
| `price` | money |  |
| `status` | enum(valid\|used\|void\|refunded\|replaced) | El Super Admin reenvía, reemite o anula |
| `used_at · used_by_member_id · replaced_by` | datetime · ref BusinessMember · ref Ticket |  |

### Rsvp · RSVP

_De dónde sale:_ TLEvt.POL_GRATIS · Eventos

| Campo | Tipo | Nota |
|---|---|---|
| `event_id · user_id` · obligatorio | ref Event · ref User |  |
| `party · status` | int · enum(going\|cancelled\|expired) |  |
| `hold_until` | datetime | El RSVP guarda tu lugar hasta… |

### DoorStaff · Portero

_De dónde sale:_ TLDash2.BIZ.events.doors · modo puerta

| Campo | Tipo | Nota |
|---|---|---|
| `event_id · member_id` · obligatorio | ref Event · ref BusinessMember |  |
| `started_at · ended_at` | datetime | Sesión de puerta |

- Solo escanea y deja entrar por nombre. No vende: los boletos se compran en la app (D1).

### CheckIn · Entrada en la puerta

_De dónde sale:_ Panel › Eventos › modo puerta (doorDet) · events[].chk

| Campo | Tipo | Nota |
|---|---|---|
| `event_id · by_member_id` · obligatorio | ref Event · ref BusinessMember |  |
| `ticket_id` | ref Ticket | null si no se encontró |
| `result` | enum(valid\|already_used\|wrong_event\|not_found\|manual) | VÁLIDO · YA USADO · NO ES DE ESTE EVENTO · por nombre |
| `at · offline` | datetime · bool |  |

## 9. Comunidad

Solo con cuenta. Votos positivo y negativo. Puntos (rango) y monedas (cupones, El Patio) son dos cuentas separadas que nunca se mezclan. Lo que escribe un vecino se ve en su idioma, con «Ver traducción» (D3).

### CommunityProfile · Vecino

_De dónde sale:_ com-data.js TLCom.U · tl-com-v1 · comU(u) del Super Admin

| Campo | Tipo | Nota |
|---|---|---|
| `user_id` · clave | ref User |  |
| `nickname · bio` | text · text·i18n |  |
| `zone_id · posting_city_id` | ref Zone · ref City | Si publica en otra ciudad: insignia «Invitado» y de dónde viene |
| `badge_keys` | list<ref Badge> |  |
| `official` | bool | Cuenta oficial To'Latino Hazleton |
| `welcome_done` | bool | +100 monedas de bienvenida |
| `points · coins · rank` · derivado | int | rank 1–10 sale de los puntos |
| `followers · following` · derivado | int |  |

### Post · Publicación

_De dónde sale:_ TLCom.POSTS · tl-com-v1 · PostCard 2ab · tl-adm-v1.cont[post:id]

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `city_id · author_user_id` · obligatorio | ref City · ref User |  |
| `kind · topic` | enum(pregunta\|recomendacion\|aviso\|encuesta\|foto\|busco) · enum(comida\|belleza\|autos\|hogar\|salud\|tramites\|fiestas\|ninos\|otro) |  |
| `text · lang · photos` | text · enum(es\|en) · list<media> | Se muestra en su idioma; «Ver traducción» si la app está en el otro (D3) |
| `text_translated · translated_at` · derivado | text · datetime | La traducción al otro idioma: se pide la primera vez que alguien toca «Ver traducción» y se guarda (D3) |
| `business_id` | ref Business | Negocio adjunto (BusinessRow) |
| `looking_for` | list<text> | «Pan de agua» |
| `poll_options · poll_ends_at` | list<text> · datetime | Los votos son PollVote |
| `health_notice` | bool | Muestra el aviso de salud |
| `pinned · best_comment_id` | bool · ref Comment | Mejor respuesta / «Me sirvió» |
| `status · hidden_reason · hidden_by` | enum(visible\|hidden\|deleted) · text · enum(admin\|auto) |  |
| `score` · derivado | int | Votos positivos − negativos |
| `created_at` | datetime |  |

### Comment · Comentario

_De dónde sale:_ TLCom.POSTS.cm · TLNov cm · Thread 2r · tl-adm-v1.cont[cm:id]

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `target_kind · target_id` · obligatorio | enum(post\|business_post) · id |  |
| `parent_id` | ref Comment | Respuestas anidadas |
| `author_user_id · as_business_id` | ref User · ref Business | El negocio también responde |
| `text · lang · business_id` | text · enum(es\|en) · ref Business | Puede recomendar un negocio. Se muestra en su idioma con «Ver traducción» (D3) |
| `text_translated · translated_at` · derivado | text · datetime | Igual que en Post (D3) |
| `status · created_at` | enum(visible\|hidden\|deleted) · datetime |  |

### Vote · Voto

_De dónde sale:_ up/dn en POSTS, cm y TLNov

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · target_kind · target_id` · obligatorio | ref User · enum(post\|comment\|business_post) · id |  |
| `value · created_at` | enum(+1\|-1) · datetime | Da puntos al autor |

### PollVote · Voto de encuesta

_De dónde sale:_ POSTS.opts · TLNov opts

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · target_kind · target_id · option` · obligatorio | ref User · enum(post\|business_post) · id · int |  |

### Report · Reporte

_De dónde sale:_ TLCom.REP · colas «Reportes de contenido / de negocio / de usuario» (24 h)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | RP- contenido · RB- negocio · RU- usuario |
| `reporter_user_id` · obligatorio | ref User |  |
| `target_kind · target_id` · obligatorio | enum(post\|comment\|review\|user\|business\|event\|photo\|message) · id |  |
| `reason · note` | enum(spam\|priv\|acoso\|falso\|propio\|otro) · text |  |
| `status · created_at` | enum(open\|actioned\|dismissed) · datetime |  |

### PointsEntry · Puntos

_De dónde sale:_ TLCom.PTS/PTS_RULES · ptsAdj

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · delta` · obligatorio | ref User · int |  |
| `rule_key` | text | Voto + en tu publicación +2 · en tu comentario +1 · «Yo también» +3 · «Me sirvió» +10 · reseña verificada +15 · primera recomendación con 3 votos +50 |
| `ref · by_staff_id · created_at` | id · ref StaffMember · datetime | Ajuste del Super Admin con motivo |

- Máximo 100 puntos al día.

### CoinsEntry · Monedas

_De dónde sale:_ tl-com-v1 coinLog · coinAdj

| Campo | Tipo | Nota |
|---|---|---|
| `user_id · delta` · obligatorio | ref User · int |  |
| `reason · ref` | text·i18n · id | Bienvenida +100 · cupón −80 · inscripción a torneo −50 · devolución |
| `by_staff_id · created_at` | ref StaffMember · datetime |  |

- Las monedas se ganan, nunca se compran. Aquí no se juega dinero.

### Rank · Rango

_De dónde sale:_ TLCom.RANKS · tl-adm-v1.gam

| Campo | Tipo | Nota |
|---|---|---|
| `level` · clave | int | 1–10 |
| `name` | text·i18n | Recluta · Vecino · Cabo · Sargento · Sargento Mayor · Teniente · Capitán · Comandante · Coronel · General del Barrio (renombrables) |
| `requirement · unlocks` | text·i18n | Qué pide y qué desbloquea |
| `min_points` | int |  |

- El rango del negocio es aparte del rango del vecino.

### Badge · Insignia

_De dónde sale:_ TLCom.BDG

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | text | fund · mejor · avisos · mod · campeona · patio · rec50 |
| `name · desc` | text·i18n | Fundador de Hazleton |

### MonthlyBoard · Tabla del Barrio

_De dónde sale:_ TLCom.TABLA · tl-adm-v1.gam (cierre de mes)

| Campo | Tipo | Nota |
|---|---|---|
| `city_id · month · user_id` · obligatorio | ref City · text · ref User | aaaa-mm |
| `points · posts · helped · position` · derivado | int |  |
| `excluded · closed_at` | bool · datetime | El Super Admin excluye y cierra el mes |

## 10. El Patio

Dominó y parchís por turnos. Entra en V1 (decisión del 20 oct). Mesa pública: espera hasta 60 s a que lleguen vecinos; lo que falte lo juega La computadora (D6).

### GameMatch · Partida

_De dónde sale:_ patio-parchis.js TLParchis · Comunidad d.par · dominó g.seats/target/priv

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `game` · obligatorio | enum(domino\|parchis) |  |
| `mode` | json | Dominó: parejas, a 100 o 200 · Parchís: 2–4 jugadores, clásico o rápido |
| `pace` | enum(day\|hour) | 24 h o 1 h por turno |
| `seats` | list<ref User\|bot> | Mesa pública: los lugares que nadie ocupa durante la espera los juega La computadora (D6). Mesa privada: los de quien no aceptó |
| `wait_until` | datetime | Mesa pública: hasta cuándo se espera gente (60 s por defecto, PlatformConfig gam.patio.wait); si se llena antes, empieza (D6) |
| `state` | json | Fichas, mano, turno, dado; jugadas como registro |
| `status` | enum(waiting\|playing\|finished\|abandoned) |  |
| `winner_seats · private_table_id · tournament_id` | list<int> · ref PrivateTable · ref Tournament |  |
| `started_at · last_move_at · finished_at` | datetime |  |

### PrivateTable · Mesa privada

_De dónde sale:_ Comunidad d.priv · PRIV_IN

| Campo | Tipo | Nota |
|---|---|---|
| `code` · clave | text | 6 letras y números sin 0/O/1/I |
| `host_user_id · game` · obligatorio | ref User · enum(domino\|parchis) |  |
| `settings` | json | A 100/200, pareja al azar o elegida, jugadores y modo, ritmo |
| `invites` | list<[ref User, enum(sent\|accepted\|declined)]> |  |
| `status · match_id · created_at` | enum(open\|started\|closed) · ref GameMatch · datetime |  |

- Crear se abre en el rango 6 (Teniente, configurable); entrar con código, cualquiera.

### Tournament · Torneo

_De dónde sale:_ TLCom.PATIO.torneo

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `sponsor_business_id · name` | ref Business · text·i18n | Copa Sabor Dominicano |
| `capacity · fee_coins` | int | 16 parejas · 50 monedas |
| `prizes · rounds · rules` | list<text·i18n> · list<[text·i18n, date]> · list<text·i18n> |  |
| `status` | enum(open\|playing\|done) |  |

### TournamentEntry · Inscripción al torneo

_De dónde sale:_ Comunidad d.tor

| Campo | Tipo | Nota |
|---|---|---|
| `tournament_id · user_id · partner_user_id` · obligatorio | ref Tournament · ref User · ref User |  |
| `created_at · left_at` | datetime | Si sale, se le devuelven las monedas |

## 11. Soporte

Casos del vecino con To'Latino (no con el negocio: eso es HelpRequest).

### SupportCase · Caso de soporte

_De dónde sale:_ sop-store.js TLSop · tl-sop-v1 · cola «Tickets de soporte» (8 h)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | TK-52xx |
| `user_id · topic` · obligatorio | ref User · enum(pedido\|cita\|pago\|negocio\|cuenta\|tecnico\|sugerencia) |  |
| `operation_id` | ref Operation | «¿Cuál?» |
| `text · photos` | text · list<media> | Mínimo 10 letras. «No escribas números de tarjeta ni contraseñas» |
| `status` | enum(new\|in_progress\|waiting\|resolved) | Nuevo · en curso · espera tu respuesta · resuelto |
| `assigned_staff_id · sla_due_at` | ref StaffMember · datetime |  |
| `resolved_by · created_at · resolved_at` | enum(user\|staff) · datetime | Resuelto → «Abrir otro caso» con el mismo tema |

### SupportMessage · Mensaje de soporte

_De dónde sale:_ TLSop.thread (mezcla vecino y equipo por hora)

| Campo | Tipo | Nota |
|---|---|---|
| `case_id · from` · obligatorio | ref SupportCase · enum(user\|staff\|system) |  |
| `staff_id · text · photo · at` | ref StaffMember · text · media · datetime |  |

### Macro · Respuesta rápida

_De dónde sale:_ tl-adm-v1.notes[mac:*] · Super Admin › Soporte

| Campo | Tipo | Nota |
|---|---|---|
| `key · title` · clave | text |  |
| `text` | text·i18n |  |
| `created_by` | ref StaffMember |  |

## 12. El Compa · asistente de IA

Lo que El Compa habla con vecinos, dueños y el equipo, lo que prepara para que alguien lo confirme y cuándo pasa a una persona. El Compa nunca mueve dinero ni cambia una cuenta: eso siempre termina en SupportCase con el resumen.

### CompaConversation · Conversación con El Compa

Una por hilo. Vale para los 4 usos: vecino (Soporte y la ayuda de cada pedido, cita o boleto), panel del negocio, respuesta automática del negocio y copiloto del equipo.

_De dónde sale:_ compa.js TLCompa.save · tl-compa-v1 (vecino) · tl-compa-own-v1 (panel) · tl-compa-biz-v1 (respuestas automáticas) · Super Admin compaAll()

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | CP-61xx |
| `use` · obligatorio | enum(neighbor\|owner\|auto_reply\|copilot) | vec · own · auto · cop del prototipo |
| `channel` · obligatorio | enum(app\|web\|whatsapp\|sms) | En WhatsApp y SMS la acción se confirma con un enlace a la app |
| `surface` | enum(support_page\|help_sheet\|panel\|business_chat\|ticket) | page = pasos guiados 2at (Soporte · APP-COMPA) · sheet = hoja 2as sobre el pedido, cita o boleto |
| `user_id` | ref User | Vecino o dueño que habla. Vacío en respuestas automáticas a alguien sin cuenta (WhatsApp/SMS): entonces contact_phone |
| `contact_phone` | phone | Solo canal WhatsApp o SMS sin cuenta |
| `business_id` | ref Business | Panel, respuesta automática o el negocio de la operación |
| `operation_id` | ref Operation | La operación sobre la que se abrió la hoja (cref) |
| `ticket_id` | ref Ticket | Si se abrió desde un boleto |
| `support_case_id` | ref SupportCase | Copiloto: el caso que está ayudando a contestar |
| `lang` · obligatorio | enum(es\|en) | Idioma del vecino; El Compa contesta en ese |
| `outcome` · derivado | enum(open\|self_resolved\|action_done\|handed_off\|to_owner) | der |
| `handoff_reason` | enum(money\|account\|safety\|asked_person\|unknown\|owner) | dinero · cuenta · seguridad · persona · nosabe · dueño |
| `ai` | bool | false = contestó con reglas fijas (sin IA disponible) |
| `started_at · updated_at` | datetime |  |

- outcome se calcula: action_done si hay un CompaAction confirmado y hecho; handed_off si hay Handoff a Soporte; to_owner si es respuesta automática que pasó al dueño; self_resolved si cerró sin nada de eso.
- Solo el equipo con permiso compa (admin · sop) lee el hilo, para revisar calidad. Los chats privados entre vecinos nunca entran aquí.
- Se borra con la cuenta (D5: 30 días de gracia).

### CompaMessage · Mensaje con El Compa

_De dónde sale:_ th[] de To’Latino Compa.dc.html (qa · note · sys · act · hand · chips) · msgs[] guardados

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `conversation_id` · obligatorio | ref CompaConversation |  |
| `from` · obligatorio | enum(user\|compa\|system) | system = líneas como «Cancelaste la solicitud» |
| `text` · obligatorio | text | En el idioma de la conversación |
| `source_label` | text | «SEGÚN LA PÁGINA DE SABOR DOMINICANO», «SEGÚN EL CENTRO DE AYUDA», «SEGÚN TU PANEL» |
| `chips` | list<text> | Hasta 3 respuestas sugeridas; «Con una persona» siempre a la vista (no se guarda como chip) |
| `step_key` | text | Pasos guiados 2at: qué opción tocó (pedido, cita, pago · dup, ref…) |
| `draft` | bool | Copiloto o «Sugerir respuesta»: borrador que una persona edita antes de enviar |
| `at` | datetime |  |

- Nunca se guarda tarjeta, contraseña, código, SSN ni estatus: si el vecino los escribe, se tapan antes de guardar.

### CompaAction · Acción que prepara El Compa

El Compa prepara; la persona confirma en pantalla. Sin confirmación no pasa nada.

_De dónde sale:_ parse() action {type, ref} · tarjeta «ASÍ QUEDA» (act) · askOwner action go

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `conversation_id · message_id` · obligatorio | ref CompaConversation · ref CompaMessage |  |
| `type` · obligatorio | enum(cancel_request\|open_screen\|go_to_panel) | cancel = solo una solicitud PENDIENTE · open = abrir la operación · go = sección del panel (code · sub) |
| `operation_id` | ref Operation | Para cancel y open |
| `target` | json | go: { code, sub } de la guía del panel |
| `status` · obligatorio | enum(proposed\|confirmed\|dismissed\|expired\|failed) |  |
| `confirmed_via` | enum(app\|link) | link = vino de WhatsApp o SMS |
| `proposed_at · confirmed_at` | datetime |  |

- cancel_request confirmado = OperationEvent con by «compa» (cxBy) y la operación pasa a cancelled; el pedido sigue a APP-NEG-PEDIDO-CANCELAR si había razones.
- El Compa nunca propone cobrar, devolver, cambiar teléfono, ciudad ni contraseña.

### CompaHandoff · Paso a una persona

_De dónde sale:_ hand() del El Compa · TLSop.add({ via: compa }) · tarjeta «Tu caso pasó a Soporte»

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `conversation_id` · obligatorio | ref CompaConversation |  |
| `to` · obligatorio | enum(support\|owner) | support = equipo de To’Latino · owner = el dueño del negocio (respuesta automática) |
| `reason` · obligatorio | enum(money\|account\|safety\|asked_person\|unknown\|owner) |  |
| `support_case_id` | ref SupportCase | Se crea con el texto «Desde El Compa: …» y el resumen |
| `summary` | text | Lo que entendió El Compa, para que nadie vuelva a preguntar |
| `promised_reply` | text | «Te escriben hoy antes de las 6 PM» / «el lunes a las 9 AM»: sale del horario del equipo |
| `at` | datetime |  |

- Equipo: lunes a viernes, 9 AM a 6 PM, hora de la ciudad. Fuera de eso El Compa dice cuándo escriben.
- Si la IA pide handoff sin motivo de dinero, cuenta o seguridad, no se crea caso: se ofrece «Con una persona».

### CompaBusinessSettings · Respuestas automáticas del negocio

Solo Pro. Las enciende el dueño; el equipo puede apagarlas en un negocio.

_De dónde sale:_ compa.js cfg(id) = DEF + over[id].compa · biz[id].compaOff del Super Admin

| Campo | Tipo | Nota |
|---|---|---|
| `business_id` · clave | ref Business |  |
| `enabled` | bool | Apagado por defecto (D4 aparte) |
| `when` | enum(closed\|no_reply_10m\|always) | Cuando está cerrado · si no contestas en 10 min · siempre |
| `topics` | list<enum(hours\|menu\|how_to_order\|faq)> | Horario y dirección · menú y precios · cómo pedir · preguntas frecuentes |
| `channels` | list<enum(app\|whatsapp\|sms)> |  |
| `owner_note` | text·i18n | «Lo que El Compa debe saber» |
| `admin_off · admin_off_reason · admin_off_by` | bool · text · ref StaffMember | «Apagar El Compa aquí», con motivo (AuditEntry) |
| `updated_at` | datetime |  |

- Contesta solo si Subscription = Pro activa o en prueba, enabled, sin admin_off y con el uso auto_reply y el canal encendidos (FeatureFlag).
- Se presenta «Soy El Compa, el asistente de IA de {negocio}» en la primera respuesta. Nunca confirma, da descuentos, cambia precios ni comparte el teléfono del dueño: pasa al dueño.

### CompaReview · Revisión de una respuesta

_De dónde sale:_ tl-adm-v1.compa.flag · Super Admin › El Compa › Conversaciones

| Campo | Tipo | Nota |
|---|---|---|
| `conversation_id` · clave | ref CompaConversation |  |
| `staff_id` · obligatorio | ref StaffMember |  |
| `reason` · obligatorio | enum(wrong_info\|should_hand_off\|tone\|language\|other) | «Marcar respuesta incorrecta» |
| `note` | text |  |
| `at · cleared_at` | datetime | «Quitar la marca» |

## 13. Super Admin

El equipo de To'Latino maneja cada píxel del proyecto. 18 secciones, 7 roles, 15 colas con SLA, y todo queda en Historial.

### StaffMember · Equipo de To'Latino

_De dónde sale:_ TLAdm.TEAM · tl-adm-v1.team

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `user_id · name` | ref User · text | Misma cuenta To'Latino |
| `role` · obligatorio | enum(admin\|city\|verif\|mod\|sop\|fin\|lectura) | Admin · Ciudad manager · Verificador · Moderador de contenido · Soporte · Finanzas · Solo lectura |
| `cities` | list<ref City>\|all |  |
| `tfa · status` | bool · enum(active\|off) | Dos pasos |
| `since · last_login_at` | date · datetime |  |

### RolePermission · Permisos

_De dónde sale:_ TLAdm.PERM · PermMatrix 2am

| Campo | Tipo | Nota |
|---|---|---|
| `role · section` · clave | enum(roles) · enum(home\|colas\|usr\|neg\|tx\|sop\|cat\|cont\|evt\|ciud\|plan\|mkt\|notif\|gam\|conf\|analit\|cms\|sys) |  |
| `actions` | set<V\|E\|A\|X\|D> | Ver · Editar · Aprobar · Eliminar o sancionar · Exportar |

### QueueItem · Caso en una cola

_De dónde sale:_ TLAdm.QUEUES · tl-adm-v1.dec/assign/notes · liveItems()

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | Prefijo de la cola (AY-, TK-, RP-, CS-…) |
| `queue` · obligatorio | enum(ayuda\|medios\|ticket\|evt\|nuevo\|rep\|repBiz\|repUsr\|sello\|cambio\|lic\|apel\|disputa\|rec\|ciudad) | SLA: 2 · 4 · 8 · 24 · 24 · 24 · 24 · 24 · 48 · 48 · 72 · 72 · 120 · 168 · 720 h |
| `subject_kind · subject_id · city_id` | text · id · ref City | Sobre qué es |
| `opened_at · due_at` · derivado | datetime | due_at = opened_at + SLA |
| `assigned_staff_id` | ref StaffMember | Tomar caso = bloqueo suave para los demás |
| `status · decision · reason` | enum(open\|taken\|waiting\|decided) · text · text |  |
| `decided_by · decided_at` | ref StaffMember · datetime |  |

- Las colas leen de las entidades reales: HelpRequest, PhotoReport, SupportCase, Event, Business nuevo, Report, VerificationRequest, SensitiveChange, License, Appeal, Dispute, Recommendation, CityWaitlist.

### SensitiveChange · Cambio sensible

_De dónde sale:_ tl-adm-v1.cq

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | CS-xx |
| `type` · obligatorio | enum(mergeUser\|deleteUser\|transferOwner\|mergeBiz\|changeCategory\|claim) |  |
| `target_id · payload` | id · json | into, toUid… |
| `requested_by · status · applied_at` | ref StaffMember · enum(pending\|applied\|rejected) · datetime |  |

### Sanction · Sanción

_De dónde sale:_ TLAdm.SANC

| Campo | Tipo | Nota |
|---|---|---|
| `target_kind · target_id` · obligatorio | enum(user\|business) · id |  |
| `kind · days` | enum(adv\|mute7\|hide\|susp14\|ban\|nosello\|nopro\|nopub) · int | Advertencia · Silencio 7 días · Ocultar contenido · Suspender 14 días · Banear · Quitar sello · Quitar Pro · Bloquear publicación 30 días |
| `reason · by_staff_id` | text · ref StaffMember |  |
| `starts_at · ends_at · lifted_at` | datetime |  |

### Appeal · Apelación

_De dónde sale:_ Cola «Apelaciones» (72 h) · AP-43

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | text | AP-xx |
| `sanction_id · user_id · text` · obligatorio | ref Sanction · ref User · text |  |
| `status · decided_by · decided_at` | enum(open\|upheld\|lifted) · ref StaffMember · datetime |  |

### AdminNote · Nota interna

_De dónde sale:_ usr[id].notes · notes0

| Campo | Tipo | Nota |
|---|---|---|
| `target_kind · target_id` · obligatorio | enum(user\|business\|case) · id |  |
| `text · by_staff_id · at` | text · ref StaffMember · datetime |  |

### AdminMessage · Mensaje del equipo

_De dónde sale:_ msgs · msgs0

| Campo | Tipo | Nota |
|---|---|---|
| `target_kind · target_id` · obligatorio | enum(user\|business) · id |  |
| `channel · text` | enum(sms\|push\|email\|inapp) · text |  |
| `by_staff_id · at` | ref StaffMember · datetime |  |

### AuditEntry · Historial

_De dónde sale:_ TLAdm.AUDIT0 · tl-adm-v1.log · takeDiff/restore · AuditRow 2al

| Campo | Tipo | Nota |
|---|---|---|
| `number` · clave | text | H-000123 |
| `at` | datetime | Al segundo |
| `staff_id · role · device` | ref StaffMember · text · text | Quién, con qué rol, desde qué dispositivo |
| `section` | enum(18 secciones) |  |
| `target_kind · target_id · target_label` | text · id · text | Sobre qué |
| `act` | enum(decision\|money\|moderation\|edit\|export\|session\|undo) | session = entradas y salidas |
| `before · after · reason` | text |  |
| `diff` | json | Lo que cambió, para deshacer |
| `undo_of · undone_by` | ref AuditEntry |  |

- Solo lo que hace el equipo en el Super Admin. Se guarda para siempre y solo se agrega.
- Deshacer = entrada nueva. Bloqueado si es registro (entrada, salida, exportación), si ya se deshizo o si hubo un cambio posterior sobre lo mismo. Solo Admin o quien lo hizo.

### PlatformConfig · Configuración global

_De dónde sale:_ TLAdm.cfg(k, def) · tl-adm-v1.cfg / plan

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | text |  |
| `value` | json | drvMask 30 min · evpDep 25 % · evpCx 72 h · techo Free 10 al mes · Pro $14.99 · prueba 30 días · reportes para ocultar solo · OTP intentos y expiración · tamaño de foto · regla de 30 días de ciudad · borrado de cuenta a los 30 días (D5) · espera de la mesa pública 60 s (D6) |
| `updated_by · updated_at` | ref StaffMember · datetime |  |

### FeatureFlag · Interruptor de función

_De dónde sale:_ Super Admin › Sistema

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | text | Check-in sin conexión · Renta · versión mínima de la app |
| `on · scope` | bool · enum(all\|city\|percent) |  |
| `cities · percent` | list<ref City> · pct |  |

- El Compa: compa.use.neighbor · owner · auto_reply · copilot y compa.channel.app · whatsapp · sms. Encendidos por defecto; pausar pide motivo. Apagado: no se abre la hoja, Soporte vuelve a «Escríbenos», el panel muestra aviso y no hay respuestas automáticas.

### NotificationTemplate · Plantilla de aviso

_De dónde sale:_ Super Admin › Notificaciones · notes[tpl:k] · TLTrial.TPL

| Campo | Tipo | Nota |
|---|---|---|
| `key` · clave | text | recibo · evp_prop · trial_d20 · trial_d25 · trial_d29 · trial_end · pro_first · pro_back… |
| `audience · group` | enum(user\|business) · enum(critical\|ops\|community\|marketing) | Lo crítico siempre llega |
| `channels · title · body · vars` | list · text·i18n · text·i18n · list<text> |  |
| `updated_by · updated_at` | ref StaffMember · datetime |  |

### Announcement · Anuncio en la app

_De dónde sale:_ notes.ann

| Campo | Tipo | Nota |
|---|---|---|
| `city_id · audience` · obligatorio | ref City · enum(all\|users\|businesses) |  |
| `text · from · to` | text·i18n · datetime · datetime |  |
| `by_staff_id` | ref StaffMember |  |

### CmsString · Texto de la interfaz

_De dónde sale:_ tl-adm-v1.cms[s:id] · Super Admin › Textos

| Campo | Tipo | Nota |
|---|---|---|
| `id · screen` · clave | text |  |
| `text` | text·i18n |  |
| `status · max_len` | enum(draft\|live) · int | Las líneas fijas de cada categoría están bloqueadas |

### LegalPage · Página legal

_De dónde sale:_ tl-adm-v1.cms[p:k] · Super Admin LEG

| Campo | Tipo | Nota |
|---|---|---|
| `key · version` · clave | text · int | terms, priv, rules… (9 páginas) |
| `text · published_at` | text·i18n · datetime |  |
| `force_accept` | bool | Pide aceptar otra vez (TermsAcceptance) |

### CityHomeConfig · Inicio de la ciudad

_De dónde sale:_ Super Admin › Textos › Home de Hazleton

| Campo | Tipo | Nota |
|---|---|---|
| `city_id` · clave | ref City |  |
| `notice · blocks` | text·i18n · json | Aviso y bloques encendidos o apagados |

### Campaign · Campaña

_De dónde sale:_ Super Admin › Crecimiento

| Campo | Tipo | Nota |
|---|---|---|
| `id · name · city_id` · clave | id · text · ref City |  |
| `on · from · to` | bool · date · date |  |

### Featured · Destacado

_De dónde sale:_ Super Admin › Crecimiento › Destacados

| Campo | Tipo | Nota |
|---|---|---|
| `business_id · placement` · obligatorio | ref Business · text |  |
| `from · to · by_staff_id` | datetime · datetime · ref StaffMember |  |

### ShortLink · Enlace y QR

_De dónde sale:_ Super Admin › Crecimiento › Enlaces y QR · TLContact.link

| Campo | Tipo | Nota |
|---|---|---|
| `code · target` · clave | text · url | tolatino.app/hazleton/{id} |
| `created_by · scans` | ref StaffMember · int |  |

### SeedListing · Semilla sin reclamar

_De dónde sale:_ tl-adm-v1.dec[R-…] (Colas › Recomendaciones) · TLAdm.seedsOf · seedRows (D2: solo desde recomendaciones)

| Campo | Tipo | Nota |
|---|---|---|
| `id` · clave | id |  |
| `recommendation_id` · obligatorio | ref Recommendation | Solo nace de la recomendación de un vecino (D2). Las búsquedas sin oferta no crean semillas |
| `name · category_id · city_id` | text · ref Category · ref City |  |
| `status · business_id` | enum(shown\|claimed\|removed) · ref Business | Sale como SIN RECLAMAR · «Reclámalo gratis» |

## Estados

### Operación

Las 7 etiquetas que ven cliente, negocio y Super Admin.

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `pending` | PENDIENTE | Enviada; el negocio tiene hasta respond_by |
| `change_proposed` | TE PROPONEN UN CAMBIO | Otra hora, otro total, cotización o lo pesado |
| `confirmed` | CONFIRMADA | El negocio aceptó (o confirma al instante) |
| `declined` | NO PUDO | El negocio no puede; se ofrecen otras opciones |
| `expired` | SIN RESPUESTA | Venció la ventana de respuesta |
| `cancelled` | CANCELADA | Cliente, negocio o no llegó |
| `done` | TERMINADA | Se hizo; abre reseña y ayuda |

| De | A | Cuándo |
|---|---|---|
| — | pending | El cliente envía. Si hay tarjeta: Retenido |
| pending | confirmed | El negocio acepta |
| pending | change_proposed | El negocio propone otra hora o precio |
| change_proposed | confirmed | El cliente acepta el cambio |
| change_proposed | cancelled | El cliente no lo acepta |
| pending | declined | El negocio no puede. Liberado |
| pending | expired | Nadie respondió a tiempo. Liberado |
| confirmed | cancelled | Antes de cancel_free_h: Liberado o Devuelto. Después: según la política |
| confirmed | done | Se entregó o se atendió |

### Dinero de una operación

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `held` | Retenido | La tarjeta se autoriza; el dinero todavía no sale |
| `captured` | Cobrado | Se cobra: pedido al aceptar, depósito al confirmar, boletos al comprar |
| `released` | Liberado | Se suelta la retención: no pudo, sin respuesta o cancelada a tiempo |
| `refunded` | Devuelto | Ya cobrado, se devuelve a la tarjeta o al Wallet (total o parcial) |

| De | A | Cuándo |
|---|---|---|
| held | captured | El negocio acepta |
| held | released | No pudo · sin respuesta · cancelada a tiempo |
| captured | refunded | Ayuda aprobada · evento cancelado · decisión del Super Admin |

### Ayuda con un pedido o cita

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `sent` | Enviada | El negocio tiene 24 h |
| `business_answered` | El negocio respondió | Propone una solución |
| `resolved` | Resuelta | El cliente la aceptó |
| `escalated` | To'Latino está revisando | Sin respuesta o sin acuerdo; 48 h |
| `approved · denied` | Aprobada · No aprobada | Devolución, crédito en Wallet o nada, con motivo |

| De | A | Cuándo |
|---|---|---|
| sent | business_answered | El negocio responde |
| sent | escalated | Pasan 24 h |
| business_answered | resolved | El cliente acepta |
| business_answered | escalated | El cliente no acepta |
| escalated | approved · denied | Decide To'Latino |

### Evento

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `draft` | Borrador |  |
| `review` | En revisión | To'Latino revisa en 24 h |
| `changes` | Pide cambios | Con lo que falta |
| `live` | Publicado |  |
| `sold_out · done` | Agotado · Terminó |  |
| `cancelled · hidden · rejected` | Cancelado · Oculto · No aprobado | Cancelado = devolución total de boletos |

| De | A | Cuándo |
|---|---|---|
| draft | review | Enviar a revisión |
| review | live · changes · rejected | Decide To'Latino |
| changes | review | El negocio corrige |
| live | cancelled | Devuelve todo lo cobrado |

### Boleto

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `valid` | Válido |  |
| `used` | Usado | Entró; un segundo escaneo dice YA USADO |
| `void · refunded · replaced` | Anulado · Devuelto · Reemitido | Reemitir crea un boleto nuevo |

| De | A | Cuándo |
|---|---|---|
| valid | used | Check-in en la puerta |
| valid | replaced | El Super Admin reemite |
| valid | void · refunded | Anular o evento cancelado |

### Prueba y plan

Barbería El Primo está en el día 25 de su prueba en el prototipo.

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `trial` | Prueba Pro | Día 0; resumen el día 20; aviso el 25; último día el 29 |
| `active` | Pro | Con tarjeta: primer cobro el día 30 |
| `past_due` | Pago fallido | Reintentos y avisos |
| `courtesy` | Pro de cortesía | Hasta una fecha, desde el Super Admin |
| `canceling` | Deja Pro | Pro hasta el fin del periodo |
| `ended` | Free | Nada se borra: lo Pro duerme |

| De | A | Cuándo |
|---|---|---|
| trial | active | Agrega tarjeta |
| trial | ended | Día 30 sin tarjeta o «no sigo» |
| active | past_due | Falla el cobro |
| past_due | ended | Se acaban los reintentos |
| active | canceling | «Dejar Pro» |
| ended | active | Vuelve a Pro (sin segunda prueba) |

### Cuenta

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `active` | Activa |  |
| `muted` | Silenciada | Bloqueo de publicación por N días; puede apelar |
| `suspended · banned` | Suspendida · Baneada |  |
| `deleted_pending` | Se borra en 30 días | Se puede restaurar |
| `deleted · merged` | Borrada · Fusionada | Borrada: no queda nada de la persona en To'Latino; los cobros quedan en Stripe (D5). Fusionada: lo suyo pasó a la otra cuenta |

| De | A | Cuándo |
|---|---|---|
| active | muted · suspended · banned | Sanción con motivo |
| active | deleted_pending | Borrado aprobado |
| deleted_pending | active | «Restaurar» |
| deleted_pending | deleted | Pasan 30 días: se borra todo (D5) |

### Negocio

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `draft` | Borrador | Publica tu negocio sin terminar |
| `active` | Activo |  |
| `temp_closed` | Cerrado temporalmente | 1 · 3 · 7 · 14 días; la ficha lo dice |
| `hidden · suspended` | Oculto · Suspendido | Decisión del Super Admin con motivo |
| `closed · merged` | Cerrado · Fusionado |  |

| De | A | Cuándo |
|---|---|---|
| draft | active | Termina el onboarding |
| active | temp_closed | El dueño o el Super Admin |
| temp_closed | active | Llega la fecha |
| active | hidden · suspended · closed | Super Admin con motivo |

### Reclamo y sello

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `pending · review` | En revisión |  |
| `approved · ok` | Aprobado | Reclamo: el negocio pasa a la cuenta · Sello: aparece el verificado |
| `info` | Falta un dato | Solo el sello |
| `rejected · no` | No aprobado | Con motivo; puede probar con documento o escribir a Soporte |

| De | A | Cuándo |
|---|---|---|
| pending | approved · rejected | Decide To'Latino (Cambios sensibles · Sello) |

### Evento privado

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `pending` | PENDIENTE |  |
| `quote · alt` | TE PROPONEN UN CAMBIO | Propuesta con total y depósito · otra fecha |
| `confirmed` | CONFIRMADA | Depósito cobrado; el resto en el local |
| `declined · expired` | NO PUDO · SIN RESPUESTA | Otra fecha, mesas aparte u otros restaurantes |
| `cancelled` | CANCELADA | Gratis hasta 72 h antes |

| De | A | Cuándo |
|---|---|---|
| pending | quote | El negocio manda la propuesta |
| quote | confirmed | El cliente acepta y paga el depósito |
| quote | pending | Pide cambio (Mensaje) |

### Conversación con El Compa

Se cierra sola tras 24 h sin mensajes; el resultado queda.

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `open` | EN CURSO | Hablando |
| `self_resolved` | RESOLVIÓ SOLO | Contestó sin acción ni persona |
| `action_done` | ACCIÓN CONFIRMADA | La persona confirmó lo que El Compa preparó |
| `handed_off` | A UNA PERSONA | Caso en Soporte |
| `to_owner` | AL DUEÑO | Respuesta automática que pasó al negocio |

| De | A | Cuándo |
|---|---|---|
| open | action_done | La persona confirma la acción |
| open | handed_off | Dinero, cuenta, seguridad o pidió una persona |
| open | to_owner | Lo que solo decide el dueño |
| open | self_resolved | 24 h sin mensajes y sin lo anterior |

### Acción del Compa

| Estado | Etiqueta | Qué significa |
|---|---|---|
| `proposed` | PREPARADA | Tarjeta «Así queda» en pantalla |
| `confirmed` | CONFIRMADA | La persona tocó Confirmar |
| `dismissed` | DESCARTADA | Tocó No o siguió hablando |
| `expired` | VENCIDA | La operación cambió antes (el negocio ya respondió) |
| `failed` | NO SE PUDO | El servidor no la aplicó; se dice por qué |

| De | A | Cuándo |
|---|---|---|
| proposed | confirmed | Toca Confirmar (o el enlace en WhatsApp/SMS) |
| proposed | expired | La solicitud deja de estar pendiente |
| confirmed | failed | Error al aplicar |

## Dónde vive hoy en el prototipo

Claves de localStorage y listas en memoria → entidades de este modelo.

| Dónde | Qué guarda | Entidades |
|---|---|---|
| `tl-proto-user-v1` | La cuenta de la sesión | User |
| `tl-loc-v1` | Ciudad que estoy viendo, centro y radio | Device |
| `tl-usr-v1 · tl-onb-v1` | Mi cuenta y el onboarding del vecino | User · Address · PaymentMethod · Favorite |
| `tl-notif-v1` | Avisos y preferencias | Notification · NotificationPref |
| `tl-search-v1` | Avísame y búsquedas | SearchAlert · SearchLog |
| `tl-dash2-v1` | Todo lo que el dueño edita en el panel (over[id]: ítems, galería, horario, vacantes, novedades, FAQ, menuCfg, sello, eventos, WhatsApp, _at) | Business · Item · ItemSection · Media · BusinessHours · JobPosting · BusinessPost · Faq · VerificationRequest · Event |
| `tl-onb-neg-v1` | Publica tu negocio | OnboardingDraft |
| `tl-evt-pub-v1 · tl-evt-pub-draft-v1` | Eventos publicados por negocios y su borrador | Event |
| `tl-evt-v2` | Boletos y RSVP del vecino | Ticket · Rsvp |
| `tl-com-v1` | Comunidad: publicaciones, votos, seguidos, puntos, monedas, cupones, partidas, mesas privadas, torneo | Post · Comment · Vote · Follow · PointsEntry · CoinsEntry · CouponRedemption · GameMatch · PrivateTable · TournamentEntry |
| `tl-rec-v1 · tl-rec-draft-v1` | Recomendaciones | Recommendation |
| `tl-claim-v1` | Reclamos de negocio | Claim |
| `tl-sop-v1` | Casos de soporte | SupportCase · SupportMessage |
| `tl-trial-v1` | Prueba Pro | Subscription |
| `tl-taps-v1` | Toques de contacto | ContactTap |
| `tl-ph-rep-v1` | Fotos reportadas | PhotoReport |
| `tl-city-ask-v1 · tl-city-wait-v1 · tl-soon-v1/v2` | Pide tu ciudad y pre-lanzamiento | CityWaitlist |
| `tl-adm-v1` | Super Admin: dec, assign, notes, biz, usr, rev, lic, log, team, cont, evt, syn, cat, city, cityCfg, gam, cms, cfg, plan, cq | QueueItem · AuditEntry · Sanction · AdminNote · AdminMessage · Synonym · Subcategory · FilterOption · Rank · CmsString · LegalPage · PlatformConfig · SensitiveChange · FeeRule |
| `Estado en memoria del Prototipo` | order, citas, acitas, hcitas, scitas, pcitas, fcitas, eins, nres, trv, mped, tped, evps, rsvs, req | Operation · OperationLine · HelpRequest |
| `tl-cal-v1` | «Ya está en tu calendario» (solo el dispositivo) | No es dato del servidor |
| `tl-proto-route/cola/view/desk-v1 · tl-adm-view-v1` | Ruta, vista y tamaño de la revisión | No es dato |
| `tl-compa-v1` | Conversaciones de vecinos con El Compa (40 últimas) | CompaConversation · CompaMessage · CompaAction · CompaHandoff |
| `tl-compa-own-v1` | Conversación del dueño con El Compa en el panel | CompaConversation (use owner) |
| `tl-compa-biz-v1` | Lo que contestó El Compa por negocio | CompaConversation (use auto_reply) · CompaHandoff (to owner) |
| `tl-dash2-v1 · over[id].compa` | Ajustes de respuestas automáticas | CompaBusinessSettings |
| `tl-adm-v1 · compa (lv · ch · flag · copN) · biz[id].compaOff` | Interruptores por uso y canal, marcas y apagado por negocio | FeatureFlag (compa.use.* · compa.channel.*) · CompaReview · CompaBusinessSettings |

## Solo del prototipo (no son datos)

No se construyen como datos. Pieza por pieza y qué pasa en la app: entrega/solo-prototipo.md (E3).

- **RESPUESTA (scen).** Selector que decide cómo responde el negocio en la demo (acepta, cambia, no puede). En real responde el negocio desde su panel.
- **Respuestas automáticas con tiempo.** Negocios sin panel responden a los 4 s, Soporte a los 5 s, invitados de mesa privada a los 2.4 s, bots del Patio cada 0.85 s.
- **Reloj fijo.** NOW = 12:30 PM y TODAY fijos en los datos para que la demo siempre se vea igual. En real: la hora de la ciudad.
- **Barra de revisión.** Móvil/Desktop, 1440/1280/1024, ES/EN, rol, ciudad y día de la prueba Pro (setDay).
- **Copias de base _d0 · _ll · _n0 · _o0 · _s0 · _ph0 · _pro0.** Guardan el valor original para deshacer lo que cambia el panel o el admin. En real lo hace el historial.
- **Textos calculados guardados como dato.** st «cierra 9 PM», eta «Pickup 25 min», fee «Delivery $3», d (distancia): en real salen del horario, de DeliverySettings y de geo.
- **Datos generados.** 65 usuarios y 433 transacciones de 90 días hechos con una semilla fija (hash), y cuentas marcadas demo. En real: is_test para las cuentas de prueba.
- **Fotos como número de Pexels.** ph: 39122376 → en real Media subida por el negocio o el vecino.
- **«Entrar como».** El admin entra como otro rol para revisar permisos. En real: suplantación auditada o fuera de V1.
- **Asas de revisión.** window.__tlProto, __admInst, __d2, __tlCom: solo para revisar la demo.
- **IA del prototipo.** El Compa llama a Claude desde el navegador con las reglas y la ayuda en el texto; sin IA, contesta con reglas fijas. En la app la IA corre en el servidor, con las mismas reglas fijas, datos solo de esa cuenta y registro de cada respuesta. «10 min» de respuesta automática dura 6 s en la demo.

## Decisiones

### D1 · Venta de boletos en la puerta

El cierre del plan dice que no existe en V1 (el check-in solo valida). El prototipo la ofrece: Publica tu evento tiene «en la puerta» y el portero puede «escanear + vender».

1. **Quitarla del prototipo (entry sin door, portero solo escanea)** ← elegida
2. Dejarla en V1 y anotarla como decisión nueva

**Decidido (22 oct):** Quitarla del prototipo (entry sin door, portero solo escanea). Hecho en el prototipo: Publica tu evento ya no ofrece «Pagan en la puerta», Eventos ya no ofrece «Pagar en la puerta» ni la etiqueta «También en la puerta», el portero solo escanea y el Super Admin lo muestra igual.

### D2 · Negocios semilla

El plan dice «Negocios semilla: NO». El Super Admin crea fichas SIN RECLAMAR desde recomendaciones de vecinos y búsquedas sin oferta, y la página de categoría las muestra.

1. **Mantenerlas solo desde recomendaciones de vecinos** ← elegida
2. Quitarlas: la recomendación solo manda el SMS

**Decidido (22 oct):** Mantenerlas solo desde recomendaciones de vecinos. Hecho: el Super Admin ya no crea semillas desde búsquedas sin oferta (Catálogo y Crecimiento) y la página de categoría ya no las muestra; solo desde Colas › Recomendaciones.

### D3 · Idioma de lo que escriben los vecinos

En los datos de ejemplo cada publicación y reseña viene en español y en inglés. En real cada persona escribe en un idioma.

1. **Mostrar siempre el original con «Ver traducción»** ← elegida
2. Traducir solo al cambiar el idioma de la app

**Decidido (22 oct):** Mostrar siempre el original con «Ver traducción». Hecho: reseñas, publicaciones, comentarios y respuestas se ven en su idioma con «Ver traducción» (ReviewCard, PostCard, TopAnswer, CommentCard y ReplyThread con translate · SINCRONIZAR 26). El Super Admin ve el original.

### D4 · Confirmación al instante

Citas dice «Nunca se aprueban solas», pero dos barberos que rentan silla activaron «confirma al instante» y el prototipo lo muestra.

1. **Permitirlo como opción del profesional, apagada por defecto** ← elegida
2. Quitarlo: todo se confirma a mano

**Decidido (22 oct):** Permitirlo como opción del profesional, apagada por defecto. Ya era así: «Aprobar citas al instante» viene apagado en el panel y en cada silla. Se corrigió «Nunca se aprueban solas» en Publica tu negocio.

### D5 · Cuánto se guardan las operaciones de una cuenta borrada

Borrar la cuenta da 30 días de gracia. Los pagos y recibos normalmente se guardan años por impuestos.

1. Anonimizar a la persona y guardar lo financiero 7 años
2. **Borrar todo a los 30 días salvo lo que Stripe ya guarda** ← elegida

**Decidido (22 oct):** Borrar todo a los 30 días salvo lo que Stripe ya guarda. Hecho: Mi cuenta (ahora 30 días, antes decía 14) y el Super Admin dicen que a los 30 días se borra todo y que los cobros quedan en Stripe.
