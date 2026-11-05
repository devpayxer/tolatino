# To' Latino — ADMIN DASHBOARD (panel interno)

Estado: **APROBADO por el usuario**. Encargo del
usuario: el Admin Dashboard es "el corazón del proyecto"; debe **manejar de
punta a punta todo el proyecto, sin dejar absolutamente nada**.

Plan de construcción (arquitectura, datos en vivo, fases): `admin-implementacion.md` (12 oct).

Área de nomenclatura: `ADM`. Patrones: trío canónico (listado con filtros →
detalle → editor) + estados. Mobile-first como todo el sistema, pero aquí la
composición desktop es la más usada (equipo interno); la móvil existe
completa para moderar y aprobar desde el teléfono.

---

## 0. Principios

1. **Todo lo que existe en la plataforma tiene una fila aquí.** Usuarios,
   negocios, ítems, órdenes, citas, boletos, posts, comentarios, reseñas,
   eventos, pagos, suscripciones, ciudades, categorías, módulos, rangos,
   monedas, torneos, notificaciones, reportes, sanciones, textos, ajustes.
2. **Ciudad como dimensión de primer nivel.** Selector de ciudad arriba; toda
   lista, métrica y cola se filtra por ciudad (o "todas").
3. **Nada se borra: se cambia de estado.** Suspender, ocultar, archivar,
   anular. Todo con motivo, autor y fecha. Restaurable.
4. **Toda acción sobre un tercero deja rastro** (audit log) y, si afecta al
   usuario, genera **notificación con motivo** y **camino de apelación**.
5. **Permisos por área** (igual que los moderadores del negocio): cada
   sección declara su permiso; cada pantalla tiene estado "sin permiso".
6. **Colas, no listas.** Lo que requiere decisión humana vive en colas con
   SLA visible (tiempo esperando), asignación y "siguiente".
7. **Acciones en lote** en desktop; una a una en móvil.
8. **Bilingüe**: el admin ve el contenido en el idioma en que fue escrito y
   la UI en el suyo.

---

## 1. Mapa de secciones (navegación lateral en desktop / lista en móvil)

```
ADM-HOME      Inicio (salud de la ciudad, colas, alertas)
ADM-COLAS     Colas de trabajo (todo lo que espera decisión humana)
ADM-USR       Usuarios
ADM-NEG       Negocios
ADM-CAT       Catálogo: categorías, subcategorías, filtros, módulos
ADM-CONT      Contenido: Community, Hoy en el barrio, reseñas, medios
ADM-EVT       Eventos y boletos
ADM-TX        Transacciones: órdenes, citas, pagos, reembolsos, disputas
ADM-PLAN      Planes, suscripciones y facturación
ADM-GAM       Gamification y Games (rangos, monedas, torneos, cupones)
ADM-CIUD      Ciudades (abrir, configurar, lista de espera)
ADM-MKT       Crecimiento: promotores, referidos, campañas, destacados
ADM-NOTIF     Notificaciones y mensajería
ADM-SOP       Soporte (tickets de usuarios y negocios)
ADM-CONF      Confianza y seguridad (reportes, sanciones, apelaciones, fraude)
ADM-ANALIT    Analítica
ADM-CMS       Textos, traducciones, páginas legales y de ayuda
ADM-SYS       Sistema: equipo interno, roles, integraciones, auditoría, flags
```

---

## 2. Sección por sección

### ADM-HOME · Inicio
- Selector de **ciudad** (Hazleton / todas) y rango de fechas.
- **Salud de la ciudad** (tarjetas): usuarios activos, negocios activos
  (Pro / Free / verificados), órdenes y citas hoy, GMV, ingreso (suscripción +
  comisión), posts hoy, eventos esta semana.
- **Colas con SLA**: verificaciones pendientes (y la más vieja), reportes,
  reembolsos, disputas, tickets de soporte, negocios nuevos sin revisar,
  apelaciones. Click → cola.
- **Alertas**: caída de pagos, pico de reportes sobre un mismo negocio,
  evento con sobreventa, negocio Pro con pago fallido, intento de fraude.
- **Actividad reciente del equipo** (audit log resumido).

### ADM-COLAS · Colas de trabajo (el corazón operativo)
Una vista unificada con pestañas por tipo; cada cola: filtros, prioridad,
antigüedad, asignado a, y botón **"Tomar siguiente"**.
1. **Verificación de negocio (sello)** — ficha completa del negocio, fotos,
   coincidencia de datos, historial; acciones: aprobar / rechazar con motivo
   (plantillas) / pedir más información. Regla: nunca se piden papeles de
   identidad.
2. **Negocios nuevos** — revisión ligera post-publicación (categoría
   correcta, fotos aceptables, nombre no engañoso).
3. **Reportes de contenido** (post, comentario, reseña, novedad, foto).
4. **Reportes de negocio** (estafa, no existe, comportamiento).
5. **Reportes de usuario**.
6. **Reembolsos** solicitados por clientes o negocios.
7. **Disputas** (contracargos / reclamos).
8. **Apelaciones** de sanciones.
9. **Solicitudes de cambio sensible** (cambiar categoría, ciudad,
   transferencia de propiedad, borrar negocio, borrar cuenta).
10. **Solicitud de ciudad nueva** (lista de espera con conteo).
11. **Medios marcados** por filtro automático (desnudez, violencia, texto en
    imagen engañoso).
12. **Eventos a revisar** (edad mínima, contenido, capacidad).

### ADM-USR · Usuarios
- **Listado**: buscar por nombre/teléfono/correo/ID; filtros: ciudad, rol
  (cliente, negocio, promotor, moderador interno), estado (activo,
  suspendido, baneado, borrado), rango, verificado, fecha de alta, último
  acceso, tiene negocios, tiene reportes.
- **Detalle (360°)**: perfil, verificaciones, ciudad e historial de cambio de
  ciudad (regla 30 días), negocios que posee o en los que es staff/moderador,
  órdenes, citas, boletos, posts y comentarios, reseñas, votos, rango y
  puntos, monedas y canjes, partidas, referidos, dispositivos y sesiones,
  reportes hechos y recibidos, sanciones, tickets de soporte, notas internas,
  audit log de acciones del equipo sobre él.
- **Acciones**: advertir, silenciar (X días), suspender, banear, restaurar;
  forzar cambio de ciudad; resetear verificación; ajustar puntos/monedas con
  motivo; borrar cuenta (con período de gracia); exportar datos (privacidad);
  fusionar cuentas duplicadas; iniciar sesión como (solo lectura, "ver como").

### ADM-NEG · Negocios
- **Listado**: buscar; filtros: ciudad, categoría/subcategoría, plan (Pro /
  Free / prueba), verificado, tipo de operación, estado (activo, pendiente,
  suspendido, cerrado temporal, cerrado), Stripe habilitado, con reportes,
  fuerza del perfil, sin actividad en 30 días.
- **Detalle**: ficha completa (todo el listing tal como lo ve el cliente y tal
  como lo edita el negocio), dueño y moderadores del negocio, staff (modelo
  empleados / renta espacio) y vínculos negocio↔negocio, módulos (disponible /
  activado / con contenido), ítems y su monetización, horario y horarios
  programados, entrega, cobros (estado Stripe, payouts), plan e historial de
  facturación, órdenes, citas, eventos, reseñas y respuestas, novedades,
  vacantes, relacionados, métricas del negocio, reportes, sanciones, notas
  internas, audit log.
- **Acciones**: aprobar/quitar sello; cambiar categoría (con aviso de módulos);
  editar cualquier campo en nombre del negocio (con rastro); ocultar de
  resultados; suspender / restaurar; cerrar; transferir propiedad; forzar
  cierre temporal; otorgar Pro de cortesía (N días) / extender prueba; anular
  suscripción; destacar en la ciudad; enviar mensaje interno al dueño.
- **Duplicados**: detector de negocios repetidos (nombre + dirección +
  teléfono) con fusión.
- **Reclamar negocio**: flujo para cuando un negocio fue creado por terceros
  y el dueño real lo reclama.

### ADM-CAT · Catálogo (fuente: `taxonomia-negocios.md`)
- **Categorías** (17): orden, ícono, nombre ES/EN, activa por ciudad,
  familia de filtros, módulos disponibles por defecto y su orden, rótulos de
  módulo por categoría (ES/EN), amenities de la categoría, plantillas de
  horario, placeholders del onboarding.
- **Subcategorías**: crear/editar/mover/fusionar/desactivar; código
  `NEG-<CAT>-<NN>`; sinónimos para el buscador ("uñas" → Nails).
- **Familias de filtros**: filtros globales y por familia; tipo de control;
  valores; orden; activo.
- **Módulos**: catálogo de módulos del sistema (Citas, Servicios, Tienda,
  Menú, Renta, Staff, Eventos, Novedades, Relacionados, Trabajos, Reseñas…):
  nombre canónico, rótulo por categoría, campos por variante de categoría,
  activo por ciudad, límites Free / Pro por módulo.
- **Reglas de plan por campo**: qué es Free y qué es Pro en cada campo del
  listing (la matriz Free/Pro vive aquí, editable).
- Toda edición muestra **impacto** ("afecta a 34 negocios") y pide confirmar.

### ADM-CONT · Contenido
- **Community**: posts, preguntas, encuestas, recomendaciones; filtros por
  ciudad, tipo, estado (visible, oculto, eliminado, reportado), votos,
  autor, rango del autor. Acciones: fijar, ocultar, eliminar con motivo,
  bloquear comentarios, mover de ciudad, marcar como oficial.
- **Comentarios** con árbol y votos.
- **Hoy en el barrio**: novedades activas (24 h) y su origen (pestaña
  Novedades del negocio); retirar antes de tiempo con motivo.
- **Reseñas**: listado con filtros (negocio, estrellas, con foto, reportada,
  sospechosa: mismo dispositivo, ráfaga, sin transacción); ver la
  transacción/cita asociada; ocultar / restaurar / marcar verificada;
  respuestas del negocio.
- **Medios**: todas las fotos/videos subidos, filtro automático, rechazar y
  notificar, reemplazar.
- **Cuenta oficial "To' Latino {Ciudad}"**: publicar posts, encuestas y
  preguntas semanales; programar.
- **Palabras y reglas de auto-moderación**: listas de términos, umbrales de
  reportes para ocultar automáticamente, rate limits de publicación.

### ADM-EVT · Eventos y boletos
- **Eventos**: listado (ciudad, fecha, tipo gratuito/pago, dueño, estado:
  borrador, publicado, agotado, cancelado, finalizado, reportado); detalle
  completo: line up, tipos de boleto y cupos, add-ons e inventario de mesas,
  cortesías y códigos, ventas en vivo, aforo y check-ins, porteros, política
  de reembolso.
- **Boletos**: buscar por código/QR, comprador, evento; estado (válido,
  usado, anulado, reembolsado, transferido); anular / reemitir / reembolsar;
  detectar duplicados y reventa.
- **Acciones sobre el evento**: despublicar, forzar cancelación con reembolso
  masivo, ajustar cupo, congelar ventas, extender ventas, revisar contenido,
  auditoría de check-ins (quién escaneó qué y cuándo).
- **Categorías de evento y géneros musicales**: catálogo editable.

### ADM-TX · Transacciones
- **Órdenes** (tienda, menú, renta): listado por ciudad, negocio, cliente,
  estado (nueva, aceptada, en preparación, lista, en camino, entregada,
  cancelada, reembolsada, disputada), forma de pago (tarjeta en app / local /
  contra entrega / solo contacto), método de entrega. Detalle: ítems,
  variantes, add-ons, impuestos, propina, cupón, comisión calculada, timeline,
  mensajes, evidencia.
- **Citas**: listado y detalle con estados (solicitada, aprobada, rechazada,
  reprogramada, cumplida, no asistió, cancelada), negocio, profesional
  (staff), servicio, pago.
- **Pagos**: cobros con tarjeta (Stripe), estado, comisión, payout al negocio,
  fallos, reintentos.
- **Reembolsos**: cola, parcial/total, quién paga la comisión, motivo.
- **Disputas / contracargos**: evidencia, plazos, resultado.
- **Payouts**: calendario, retenciones, negocios con payout bloqueado.
- **Impuestos y tarifas**: tasa por ciudad/estado, tarifa de servicio,
  redondeos, recibos.
- **Cupones de plataforma**: crear, condiciones, uso, presupuesto.

### ADM-PLAN · Planes, suscripciones y facturación
- **Planes**: Free, Pro (mensual / anual), precios por ciudad, prueba (días),
  límites por plan (ítems, fotos, staff, módulos), features por plan.
- **Suscripciones**: listado por estado (prueba, activa, vencida, pago
  fallido, cancelada, cortesía); detalle: historial de pagos, próximo cobro,
  método, facturas; acciones: extender prueba, cortesía, descuento, cancelar,
  reactivar, cambiar plan, reembolsar.
- **Dunning**: reglas de reintento y avisos por pago fallido; qué queda
  dormido al bajar a Free (siempre sin borrar).
- **Ingresos**: MRR, churn, conversión prueba → pago, por ciudad y categoría.
- **Comisiones**: tasa por tipo (producto, servicio, boleto), mínimos, por
  ciudad; simulador de impacto.

### ADM-GAM · Gamification y Games
- **Rangos**: escalera (10), requisitos, desbloqueos, insignias, nombres
  ES/EN; edición con vista previa.
- **Reglas de puntos**: acción → puntos, tope diario, penalizaciones, decaimiento.
- **Monedas To' Latino**: emisión, reglas de ganancia, precios de entrada a
  mesas, costo de destacar post, saldo total en circulación, ajustes con motivo.
- **Cupones canjeables**: catálogo por negocio patrocinador, costo en monedas,
  stock, vigencia, canjes, liquidación al negocio.
- **Tabla del Barrio**: por ciudad y mes; excluir usuarios (fraude); cierre
  de mes y premios.
- **El Patio (v1.1)**: mesas activas, partidas, torneos (crear, patrocinador,
  premios, bracket, calendario), antitrampa (parejas coludidas, cuentas
  vinculadas), sanciones de juego.
- **Rango del negocio**: reglas propias (separado del usuario).

### ADM-CIUD · Ciudades
- **Listado**: activa / próxima / en espera; usuarios, negocios, demanda
  (lista de espera).
- **Detalle / configuración**: nombre ES/EN, estado, zona horaria, límites
  geográficos (polígono o radio), ciudades fusionadas en "zona", idioma
  predominante, categorías activas, precios de plan, impuestos, cuenta
  oficial, equipo local (moderadores de ciudad), contenido de lanzamiento.
- **Abrir ciudad nueva (wizard)**: crear → configurar → sembrar negocios
  (importación) → invitar lista de espera → activar. Checklist de lanzamiento.
- **Lista de espera "Pide tu ciudad"**: conteo por ciudad solicitada,
  contactos, exportar, notificar al abrir.
- **Cambio de ciudad de usuarios**: regla de 30 días, excepciones.

### ADM-MKT · Crecimiento
- **Promotores y referidos**: códigos, dueños, referidos por código,
  conversión, recompensas pendientes/pagadas, fraude (auto-referidos).
- **Campañas**: push / correo / SMS por segmento (ciudad, rol, categoría,
  inactivos, Free con X ítems…), programación, resultados.
- **Destacados**: negocios/eventos destacados en la ciudad por fecha (con
  rotación justa), banners del home.
- **Importación de negocios** (semilla): cargar negocios desde archivo o
  enlace (Google Maps / Instagram) como "no reclamado" para que el dueño lo
  reclame; estado, fuente, calidad del dato.
- **Landing y enlaces**: UTM, QR impresos por ciudad, seguimiento.

### ADM-NOTIF · Notificaciones y mensajería
- **Plantillas** por evento del sistema (cita aprobada, pedido listo, boleto,
  reseña nueva, pago fallido, fin de prueba, sanción, apelación…), canal
  (push / SMS / correo / in-app), ES/EN, variables, vista previa, activo.
- **Envíos**: log por usuario, estado (enviado, entregado, abierto, fallido),
  reintentos.
- **Chat cliente↔negocio**: acceso de auditoría solo con reporte abierto
  (privacidad), exportación por solicitud legal.
- **Anuncios in-app** por ciudad (mantenimiento, lanzamiento, feriado).

### ADM-SOP · Soporte
- **Tickets**: de usuarios y de negocios; canal (in-app, correo, WhatsApp);
  categoría (pago, cita, cuenta, negocio, contenido, técnico, sugerencia);
  prioridad; asignado; SLA; estados (nuevo, en curso, esperando usuario,
  resuelto, cerrado, reabierto).
- **Detalle**: conversación, contexto automático (usuario, negocio, orden o
  cita implicada, dispositivo, versión de la app), acciones rápidas
  (reembolsar, reenviar OTP, extender prueba, desbloquear), macros/respuestas
  guardadas ES/EN, notas internas, escalar.
- **Base de conocimiento interna** y **artículos del centro de ayuda**
  público (enlaza con ADM-CMS).
- **Satisfacción** post-ticket.

### ADM-CONF · Confianza y seguridad
- **Reportes** (unificados con ADM-COLAS): motivo, reportante, reportado,
  evidencia, historial del reportado, decisión con plantilla.
- **Sanciones**: catálogo (advertencia, silencio, ocultar, suspender X días,
  banear, quitar sello, quitar Pro, bloquear publicación, bloquear juegos);
  duración; motivo; notificación automática; **apelación** con plazo.
- **Apelaciones**: cola, segunda revisión por otra persona del equipo.
- **Fraude**: señales (cuentas múltiples por dispositivo, reseñas en ráfaga,
  auto-referidos, boletos duplicados, colusión en juegos, contracargos
  repetidos); listas de bloqueo (teléfono, dispositivo, tarjeta); revisión.
- **Privacidad**: solicitudes de exportar / borrar datos, con plazos y
  registro; consentimientos.
- **Verificación**: reglas del sello, qué se revisa, plantillas de rechazo,
  revalidación periódica.

### ADM-ANALIT · Analítica
- **Por ciudad y global**: usuarios (altas, activos, retención D1/D7/D30),
  negocios (altas, Free/Pro, verificados, fuerza de perfil, activos),
  oferta (ítems, módulos activos, categorías con y sin oferta → huecos de
  mercado), demanda (búsquedas por categoría y término, sin resultados,
  filtros más usados), transacciones (órdenes, citas, boletos, GMV, ticket
  medio, tasa de aprobación de citas, no-shows, cancelaciones, reembolsos),
  ingresos (MRR, comisión, conversión Pro), Community (posts, votos,
  recomendaciones, respuesta), Gamification (distribución de rangos, monedas,
  canjes), Eventos (asistencia vs venta), soporte (tickets, SLA), confianza
  (reportes por mil, sanciones).
- **Embudos**: onboarding de usuario, onboarding de negocio (paso a paso),
  prueba Pro → pago, búsqueda → listing → pedido.
- **Exportar** y **reportes programados** por correo.
- **"Búsquedas sin oferta"** = lista para salir a reclutar negocios.

### ADM-CMS · Textos, traducciones y páginas
- **Cadenas de la UI** ES/EN por pantalla (nomenclatura `ÁREA-MÓDULO-PANTALLA`),
  búsqueda, estado (traducido / pendiente / revisado), longitud máxima.
- **Rótulos de módulo por categoría** (enlaza con ADM-CAT).
- **Páginas**: Términos, Privacidad, Cookies, Accesibilidad, Reglas del
  barrio, Cómo verificamos, Cómo funcionan los votos, Centro de ayuda /
  FAQ, Planes; versionado y fecha de vigencia; aceptación de nuevos términos.
- **Contenido del home por ciudad**: destacados, textos, banners.

### ADM-SYS · Sistema
- **Equipo interno**: personas, rol (Admin, Moderador de contenido,
  Verificador, Soporte, Finanzas, Ciudad manager, Solo lectura), ciudades
  asignadas, permisos por sección, 2FA obligatorio, sesiones.
- **Roles y permisos**: matriz sección × acción (ver / editar / aprobar /
  eliminar / exportar).
- **Auditoría (audit log)**: todo cambio con quién, qué, antes/después,
  cuándo, desde dónde; filtros; exportar; inmutable.
- **Integraciones**: Stripe (estado, webhooks, errores), SMS/OTP, correo,
  push, mapas, almacenamiento de medios, filtro de imágenes; claves y salud.
- **Feature flags**: activar funciones por ciudad o por porcentaje (El Patio,
  check-in offline, Renta, nuevos módulos); versiones mínimas de app.
- **Salud del sistema**: errores, latencia, colas de trabajos, estado de
  servicios; mantenimiento programado.
- **Configuración global**: monedas, formatos, límites (tamaño de foto,
  ítems por Free, reportes para auto-ocultar), OTP (intentos, expiración),
  regla 30 días de ciudad, política de retención de datos.
- **Respaldo y exportaciones** masivas.

---

## 3. Flujos críticos de punta a punta (los que el admin ejecuta)

1. **Abrir Hazleton** (y luego cada ciudad): crear ciudad → configurar → sembrar
   negocios importados → invitar lista de espera → activar → monitorear D1.
2. **Verificar un negocio**: cola → ficha → decisión → notificación → sello
   visible / motivo de rechazo → posible apelación.
3. **Reporte → sanción → apelación → resolución**, con segunda revisión.
4. **Reembolso**: solicitud → revisión (orden, evidencia, política del
   negocio) → parcial/total → quién absorbe comisión → notificación → cierre.
5. **Disputa/contracargo**: aviso de Stripe → evidencia → respuesta → resultado
   → ajuste al negocio.
6. **Pago Pro fallido**: reintentos → avisos → baja a Free sin borrar → 
   reactivación.
7. **Cancelación de evento**: por el negocio o el admin → reembolso masivo →
   notificación a compradores → boletos anulados → métricas.
8. **Cuenta comprometida / fraude**: señal → congelar → revisar → restaurar o
   banear → listas de bloqueo.
9. **Solicitud de privacidad**: exportar / borrar → plazo → ejecución →
   registro.
10. **Cambio de categoría de un negocio**: impacto en módulos → confirmación
    → aviso al negocio → contenido que queda dormido.
11. **Cierre de mes de Gamification**: tabla, exclusiones, premios, cupones
    liquidados a negocios.
12. **Publicación de nuevos Términos**: versionar → fecha → aceptación forzada
    en la app.

---

## 4. Estados que toda pantalla del admin debe cubrir
Carga · vacío ("no hay nada en esta cola" con último cierre) · sin resultados
· error · sin permiso · en revisión por otra persona (bloqueo suave) ·
acción irreversible (confirmación con motivo obligatorio) · acción en lote
(progreso y errores parciales) · dato desactualizado (otro admin lo cambió).

---

## 5. Roles del equipo interno (propuesta)
| Rol | Ve | Hace |
|---|---|---|
| Admin | todo | todo, incl. equipo, planes, ciudades, flags |
| Ciudad manager | su(s) ciudad(es) | negocios, contenido, eventos, destacados, campañas locales |
| Verificador | cola de sello, negocios | aprobar/rechazar sello, revisar nuevos |
| Moderador de contenido | Community, reseñas, medios, reportes | ocultar, sancionar hasta suspensión, escalar baneo |
| Soporte | usuarios, negocios, órdenes, citas, tickets | acciones rápidas, reembolsos hasta un monto, escalar |
| Finanzas | pagos, payouts, suscripciones, comisiones | reembolsos, disputas, cortesías, exportar |
| Solo lectura | analítica y listados | nada |

---

## 6. Composición móvil vs desktop (regla maestra aplicada)
- **Desktop**: sidebar con secciones y contadores de cola; tabla densa con
  columnas configurables; panel de detalle a la derecha sin salir de la lista;
  acciones en lote; filtros siempre visibles; atajos de teclado en colas.
- **Móvil**: lista de secciones con contadores; colas como tarjetas con
  "Tomar siguiente"; detalle a pantalla completa; acciones principales fijas
  abajo; filtros en hoja; sin lote. Pensado para aprobar sello, resolver
  reportes y responder tickets desde el teléfono.
- Misma nomenclatura, mismos nombres, mismos pasos.
