# To'Latino — Super Admin (`ADM`) · plan de construcción

Fecha: 12 oct 2026 · Estado: **APROBADO (usuario, 12 oct)**: núcleo operativo primero, piezas nuevas
construidas directo. **Regla del usuario (literal, no se negocia):** el Super Admin se construye por
completo y maneja cada píxel del proyecto; si algo cambia, se agrega o se elimina en cualquier
parte, se ajusta **de inmediato** en el Super Admin, en el mismo turno. Nada queda fuera. La especificación funcional
(17 secciones, colas, roles, flujos críticos, estados) ya está aprobada en
`admin-dashboard.md`; este documento es **el cómo**: arquitectura, estructura,
qué lee del prototipo, fases y piezas nuevas.

---

## 1. Qué es y qué no
- **Un solo panel interno para operar el 100 % del proyecto.** Todo lo que existe
  en la plataforma tiene una fila aquí: usuarios, negocios, ítems, pedidos, citas,
  reservaciones, boletos, publicaciones, comentarios, reseñas, novedades, eventos,
  vacantes, pagos y movimientos, suscripciones, ciudades, categorías, filtros,
  módulos, sinónimos, rangos, monedas, cupones, notificaciones, reportes,
  sanciones, apelaciones, tickets, textos legales, equipo y ajustes.
- **Super Admin = rol Admin** (ve y hace todo: equipo, planes, ciudades, flags).
  Los otros 6 roles del plan (Ciudad manager · Verificador · Moderador · Soporte ·
  Finanzas · Solo lectura) usan **las mismas pantallas** con "Sin acceso" por área
  y acciones acotadas (Soporte devuelve hasta un monto, Moderador sanciona hasta
  suspender, baneo lo aprueba Admin). Igual que los moderadores del Panel v2.
- No es un backoffice genérico: cada sección nace de lo ya construido (17
  categorías, Panel v2, Eventos, Comunidad, Mi cuenta, Buscar, Ciudad, Recomendar,
  Licencia, Publica tu negocio / tu evento) y cierra los cabos que hoy terminan en
  "To'Latino revisa en 24/48 h".

## 2. Arquitectura (cómo se hace)
1. **DC** `To'Latino Super Admin.dc.html` + **datos** `prototype/adm-data.js`
   (`window.TLAdm`, en `bundle-4`).
2. **Misma interfaz de props que el Panel v2** (`route · lang · user · desk · dw ·
   api · role` + `city`). El Prototipo lo monta en `ADM-*` exactamente como monta
   `DASH-*`: botón **Admin** en la barra del shell → `ADM-HOME` (negro mientras
   estás en `ADM-*`). Suelto, trae su barra de revisión: Móvil/Desktop ·
   1440/1280/1024 · ES/EN · **rol** (7) · **ciudad** (Hazleton · Todas).
3. **Motor de bloques del Panel v2, copiado** (trío listado → detalle → editor;
   head, stats, tabs, rows, chips, note, lock, bars, field, acts, thread, empty,
   search, bulk, sel). Se agregan los bloques propios del admin: `table` (tabla
   densa en desktop / filas en móvil), `queue` (cola con SLA, prioridad, asignado y
   "Tomar siguiente"), `audit` (quién · qué · antes/después · cuándo), `matrix`
   (permisos sección × acción), `kpi` (número + tendencia), `confirm` (acción
   irreversible con motivo obligatorio y plantillas), `impact` ("afecta a N
   negocios"). **Las secciones son datos**, nunca pantallas dibujadas a mano.
4. **Rutas** `ADM-<SECCIÓN>` + `sub` + `det` (+ `q` y filtros). Destino no
   construido → `PROTO-ENCARGO`, como siempre.
5. **Estado** en localStorage `tl-adm-v1`: decisiones, asignaciones, notas
   internas, sanciones, plantillas de motivo, equipo, flags y el **log de
   auditoría** (solo se agrega, nunca se edita). Nada se borra: cambia de estado
   con motivo, autor y fecha; todo restaurable.
6. **Datos**: lo real del prototipo donde existe (276 negocios de `TLAll`,
   taxonomía de 17 categorías, `TLEvt`, `TLCom`, `TLRev`, `TLJobs`, `TLStaff`,
   `TLCity`, `TLSearch`, usuario de la sesión y `usr-data.js`) + **historial de
   ejemplo de 90 días** generado de forma estable en `adm-data.js` (usuarios,
   pedidos, pagos, tickets, reportes, suscripciones) para que colas, métricas y
   series se vean como una ciudad en marcha. Lo de ejemplo se marca en el código,
   nunca en la UI (misma regla que Mi cuenta).
7. **Composición** (plan §6): **desktop** = barra lateral 232 con contadores de
   cola · contenido · detalle 400 (≥1200; 960–1199 el detalle abre en ventana;
   <960 composición móvil); tabla con columnas, filtros siempre visibles, lote,
   atajos (J/K siguiente/anterior · A aprobar · R rechazar · ⌘K buscar).
   **Móvil** = lista de secciones con contadores · colas como tarjetas con "Tomar
   siguiente" · detalle a pantalla completa · acciones fijas abajo · filtros en
   hoja · sin lote. Misma nomenclatura y mismos pasos en los dos.
8. **Branding interno**: header del admin con logo + "Admin" + selector de ciudad +
   ES/EN + cuenta del equipo (no el header del cliente).
9. **Bilingüe**: la UI en el idioma del admin; el contenido en el idioma en que se
   escribió (reseña en inglés se ve en inglés).

## 3. En vivo: lo que el admin lee del prototipo y lo que cambia al decidir
| Cola / sección | De dónde sale | Al decidir |
|---|---|---|
| Eventos a revisar | `tl-evt-pub-v1` (Publica tu evento → EN REVISIÓN) | Aprobar → publicado en Eventos y Panel · Eventos; pedir cambios / rechazar con motivo → el panel lo ve |
| Verificación de negocio (sello) | pedido de sello del Panel v2 (`tl-dash2-v1`) + onboarding | Sello en ficha y tarjeta; rechazo con plantilla → motivo en el panel; nunca se piden papeles de identidad |
| Licencias | `lic` de Trámites, Salud, Hogar, Auto, Transporte + ficha Licencia | Verificada · por verificar · vencida · próxima revisión → la ficha Licencia y "Cómo la verificamos" lo reflejan |
| Negocios nuevos | publicados desde Publica tu negocio | Revisión ligera: categoría, fotos, nombre → ok / corregir / ocultar |
| Ayudas escaladas | "Pedir revisión a To'Latino", 24 h sin respuesta, pagos (`ehelp`) | Devuelto total · parcial · se mantiene, con motivo → el cliente lo ve en su solicitud y Mi cuenta; el negocio en Panel · Clientes |
| Reportes | reseñas (Reportar → 48 h), publicaciones y comentarios de Comunidad, novedades, fotos | Ocultar / restaurar / sanción con motivo → la reseña o el post dejan de verse en la ficha y el feed |
| Recomendaciones de vecinos | `tl-rec-v1` (Recomienda un negocio) | Crear negocio "no reclamado" (semilla) · ya existe · descartar; aviso a quien recomendó |
| Ciudades y lista de espera | `TLCity.CITIES`, `tl-city-ask-v1`, `tl-city-wait-v1` | Abrir Allentown con el wizard → `isPronto` deja de mostrarse, lista de espera avisada |
| Sinónimos y búsquedas sin oferta | `TLSearch` (sinónimos ES/EN), `tl-search-v1`, Avísame de "Aún no hay" | Agregar / quitar sinónimo → Buscar lo usa al instante; "Búsquedas sin oferta" = lista para reclutar |
| Planes y límites | `TLFreeOn` / `TLFreeLeft` (10 al mes), Pro $14.99, prueba 30 días, `HZL30` | Editar techo Free y prueba → las fichas Free lo aplican; Pro de cortesía · extender prueba |
| Transacciones | `usrAll` (pedidos, citas, reservaciones, boletos de todas las categorías) + movimientos | Línea de tiempo por objeto; Retenido · Cobrado · Liberado · Devuelto; disputa con evidencia |
| Vacantes | `over.jobs` del panel + `TLJobs` | Revisar · retirar con motivo |
| Negocios y usuarios 360° | `TLAll`, `TLDash2`, usuario de la sesión, `usr-data.js` | Acciones del plan (suspender, ocultar, transferir, cortesía, ver como…) con rastro |
| Catálogo | `taxonomia-negocios.md` como datos (categorías, subcategorías, familias de filtros, módulos por categoría) | Edición con "afecta a N negocios" y confirmación |
| Auditoría | cada acción del admin | `tl-adm-v1.log`: quién, qué, antes/después, cuándo; inmutable |

## 4. Estructura: 17 secciones en 4 grupos (barra lateral)
**Operar** — lo que se abre cada día
- `ADM-HOME` Inicio: salud de la ciudad, colas con SLA (la más vieja primero), alertas, actividad del equipo.
- `ADM-COLAS` Colas: 12 colas del plan (sello · nuevos · reportes de contenido / negocio / usuario · devoluciones · disputas · apelaciones · cambios sensibles · ciudad nueva · medios · eventos) + las de este prototipo (licencias · ayudas escaladas · recomendaciones). Tomar siguiente, asignar, bloqueo suave "lo está viendo X".
- `ADM-USR` Usuarios: listado con filtros, 360°, acciones, fusionar, "ver como".
- `ADM-NEG` Negocios: listado, 360° (ficha como la ve el cliente y como la edita el negocio), acciones, duplicados, reclamar negocio.
- `ADM-TX` Transacciones: pedidos, citas, reservaciones, pagos, devoluciones, disputas, payouts, impuestos, cupones de plataforma.
- `ADM-SOP` Soporte: tickets, contexto automático, acciones rápidas, macros ES/EN.

**Contenido y oferta**
- `ADM-CAT` Catálogo: categorías, subcategorías, sinónimos, familias de filtros, módulos, rótulos por categoría, matriz Free/Pro por campo.
- `ADM-CONT` Contenido: Community, comentarios, Hoy en el barrio, reseñas, medios, cuenta oficial, auto-moderación.
- `ADM-EVT` Eventos y boletos: eventos, boletos (buscar por código, anular, reemitir), acciones sobre el evento, auditoría de check-ins del modo puerta.
- `ADM-CIUD` Ciudades: listado, configuración, wizard de apertura, lista de espera, regla de 30 días.

**Dinero y crecimiento**
- `ADM-PLAN` Planes y suscripciones: Free / Pro, límites, dunning, ingresos, comisiones.
- `ADM-MKT` Crecimiento: promotores y referidos, campañas, destacados, importación / semilla, enlaces y QR.
- `ADM-NOTIF` Notificaciones: plantillas por evento del sistema, envíos, chat solo con reporte abierto, anuncios in-app.
- `ADM-GAM` Gamification: rangos, reglas de puntos, monedas, cupones canjeables, Tabla del Barrio, rango del negocio. El Patio (mesas, torneos, antitrampa) = **v1.1**, se muestra como tal.

**Control**
- `ADM-CONF` Confianza y seguridad: reportes, catálogo de sanciones, apelaciones con segunda revisión, fraude y listas de bloqueo, privacidad, reglas del sello.
- `ADM-ANALIT` Analítica: por ciudad y global, embudos, búsquedas sin oferta, exportar y programar.
- `ADM-CMS` Textos y páginas: cadenas ES/EN por pantalla, rótulos por categoría, páginas legales versionadas, contenido del home por ciudad.
- `ADM-SYS` Sistema: equipo y roles, auditoría, integraciones (Stripe, SMS, correo, push, mapas, medios), feature flags, salud, configuración global, respaldos.

## 5. Fases (cada una: construir → revisar en pantalla móvil y desktop → respaldo en `_tmp/` → anotar en `CLAUDE.md` §6 y en `admin-dashboard.md`)
1. **[x] Núcleo operativo, conectado (13 oct).** Shell (barra lateral y nav móvil, ciudad, rol, ⌘K), `ADM-HOME`, `ADM-COLAS` completo con las colas en vivo de §3, `ADM-NEG` y `ADM-USR` (listado + 360° + acciones), `ADM-TX`, y de `ADM-SYS` lo imprescindible desde el día 1: equipo, roles y auditoría (sin esto no hay "Sin acceso" ni rastro). Botón Admin en el Prototipo.
2. **[x] Contenido y oferta (13 oct).** `ADM-EVT`, `ADM-CONT`, `ADM-CAT` (con sinónimos en vivo), `ADM-CIUD` (con apertura de Allentown en vivo).
3. **[x] Dinero y crecimiento (13 oct).** `ADM-PLAN` (techo Free en vivo), `ADM-MKT` (semilla desde recomendaciones), `ADM-NOTIF`, `ADM-SOP`, `ADM-CONF`.
4. **[x] Control y cierre (13 oct).** `ADM-ANALIT`, `ADM-CMS`, `ADM-SYS` completo, `ADM-GAM`; los 9 estados de toda pantalla (plan §4); revisión de orden (todas las rutas × móvil/desktop × 7 roles × 2 ciudades); patrones nuevos a `Patrones por aprobar` → master + sistema; memoria.

## 6. Piezas que no existen en el sistema (necesitan aprobación)
- Tabla densa de desktop con columnas, orden y fila con casilla (el Panel v2 ya tiene fila con casilla y barra `bulk`: candidatos pendientes).
- Tarjeta de cola con SLA (tiempo esperando, prioridad, asignado) + "Tomar siguiente".
- Fila de auditoría y diff antes/después.
- Matriz de permisos (sección × acción).
- Selector de ciudad del admin (Hazleton · Todas · próximas).
- KPI con tendencia (la gráfica de Insights del Panel v2 es la base).
- Confirmación irreversible con motivo obligatorio y plantillas.
Propuesta: construirlas directo con los bloques del Panel v2 y llevarlas a
`To'Latino Patrones por aprobar.dc.html` al cierre de cada fase (como 2z–2ah);
lo aprobado entra al master y al sistema en el mismo turno.

## 7. Reglas que aplican en todo el admin
Ciudad como dimensión de primer nivel · nada se borra · motivo + autor + fecha ·
toda acción sobre un tercero notifica con motivo y abre apelación · permisos por
área con estado "Sin acceso" · colas, no listas · lote solo en desktop · bilingüe ·
copy sobrio, sin emoji · Retenido · Cobrado · Liberado · Devuelto · nunca se piden
papeles de identidad para el sello · chat cliente↔negocio solo con reporte abierto ·
los 9 estados de pantalla del plan §4 · todo sale del sistema de diseño.

## 8. Decidido (12 oct)
1. **Orden**: núcleo operativo primero (fases de §5).
2. **Piezas nuevas (§6)**: construir directo; aprobar al cierre de cada fase.
3. **Cobertura total e inmediata**: toda pantalla, dato o flujo nuevo del proyecto entra al
   Super Admin en el mismo turno en que nace (fila, cola, acción o ajuste, según toque).
