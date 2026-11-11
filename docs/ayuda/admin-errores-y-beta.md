# Errores, beta y reportes en el Super Admin · Errors, beta and reports in Super Admin

_Pantallas: Super Admin › Sistema › Apps (`/admin/sistema/apps`) con Resumen, Versiones (`?v=versiones`), Testers (`?v=testers`), Salud ·
errores (`?v=salud`, la ficha `?g=`) y Reportes (`?v=reportes`); Soporte › el caso (registro de la app); Configuración › Apps. Escritorio y
teléfono. Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Errores y cierres propios** (sin Sentry ni GlitchTip): la web y las cuatro apps mandan sus errores de la página y, al abrir otra vez, los
  cierres nativos de la vez anterior (MetricKit en iPhone; el manejador de excepciones y ApplicationExitInfo en Android). El servidor los
  **tapa** (teléfonos, correos, tarjetas, SSN, códigos, contraseñas, direcciones con números o «?», texto entre comillas), los **agrupa** por la
  huella del stack (mil iguales con otros números son un grupo) y los **simboliza** con los mapas de fuente, que viven solo en el servidor y
  nunca se sirven. **Sin personas:** ni nombre, ni teléfono, ni correo, ni número de pedido; la ruta es su familia (`/pedido/:n`) y el teléfono
  es una huella que cambia cada día.
- **Errores en vivo:** un grupo nuevo, un pico (al menos «errores en vivo · pico» en 10 minutos en un mismo build y cinco veces lo de la hora
  anterior) o un error resuelto que vuelve en un build posterior → aviso a los Admins (campana y push, sin SMS), **una vez** por grupo, tipo y
  build. Una app de la tienda no se puede «volver atrás»: con las tiendas en producción se pausa el lanzamiento por fases; la web servida
  vuelve atrás con el despliegue.
- **Programa beta** (solo interno, contra el sandbox): TestFlight interno (iPhone) por la API de App Store Connect; Play interno (Android) en
  Play Console; y el **APK propio** con un enlace de un uso.
- **Reportar un problema:** cada reporte de la gente es un caso TK- de Soporte (tema técnico) con la captura como foto privada y el registro
  técnico del teléfono.

## Cómo se usa
- **Resumen:** la pausa de cada app, los builds mínimo y de aviso y las sesiones por versión.
- **Versiones:** cada build por app, plataforma y canal (TestFlight interno, Play interno, APK propio, tienda) con su estado (compilando,
  subido, procesando, disponible, falló, retirado), commit, tamaño y huella sha256. Los registra el CI.
- **Testers** (solo Admin): **Invitar a una cuenta** — el teléfono de su cuenta de To'Latino, la app, por dónde (TestFlight · iPhone, Play
  interno · Android, APK propio · Android), el correo de su cuenta de Apple (solo TestFlight; se guarda cifrado y se ve tapado) y el motivo.
  En cada tester: **Quitar** (motivo), **Ya está en la lista** (Play) y **Otro enlace** (APK propio).
- **Salud · errores:** cifras (grupos abiertos, nuevos y errores en 24 h, avisos, descartados por el tope), las sesiones sin cierre por app
  (aproximado, 7 días) y la lista de grupos con filtros (app, estado, tipo) y «Ver más». La **ficha**: veces, teléfonos (aprox.), primera y
  última vez, builds, el stack (simbolizado cuando hay mapa), por build, por pantalla, las últimas veces sin personas y los avisos. Acciones
  (apps:editar): **Visto**, **Resuelto en…** (el build o el commit, con motivo), **Silenciar** (motivo; no avisa más, sigue contando) y
  **Reabrir**.
- **Reportes:** los casos «Reportar un problema» (número, estado, app y versión, si trae captura, líneas de registro). Se abren en Soporte
  (con permiso de Soporte); en la ficha del caso, «REGISTRO DE LA APP» muestra sistema, modelo, de dónde salió la captura y las líneas.
- **Configuración › Apps:** días que se guarda cada error (después se borra; el grupo guarda sus cifras), tope por minuto y por teléfono, el
  pico de Errores en vivo, el tamaño del registro de un reporte, «agitar para reportar» (solo apps de prueba) y las horas del enlace del APK.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Un teléfono manda más errores que su tope por minuto | Lo demás se descarta antes de tocar la base (cuenta en «Descartados»). |
| Llega un error con un teléfono o un correo en el mensaje | Se guarda tapado («[tel]», «[correo]»); la base además rechaza lo que se escape. |
| El mapa de ese build ya no está (otro despliegue) | El stack queda como llegó, con la ruta del archivo; la ficha lo dice. |
| Resolviste un grupo en el build 7 y vuelve en el 8 | Se reabre solo como «nuevo» y avisa «volvió un error resuelto». |
| Silenciaste un grupo | No avisa (ni nuevo ni pico); sigue contando. |
| Falta la llave de App Store Connect | El tester queda «Sin la llave de App Store Connect»: la invitación sale sola cuando se suba (Integraciones). |
| Apple no contesta bien | Queda «Apple no contestó bien» con el código; el barrido reintenta cada 2 minutos. |
| Invitas por TestFlight y la persona no acepta el correo de Apple | Queda «Invitado»; el barrido mira cada 10 minutos y la suma al grupo interno cuando acepte. |
| Invitas por Play interno | Play no deja agregar correos por su API: queda «Falta en Play»; agrégalo en Play Console y marca «Ya está en la lista». |
| El tester abre el enlace del APK | Ver la página no lo gasta; **Descargar** sí (una vez). Otra cuenta: no existe. Vence a las horas de Configuración. |
| No hay un APK disponible de esa app | El tester queda activo y el enlace sale cuando el CI suba uno («Otro enlace»). |
| Quitas un tester | Sale del grupo de TestFlight (y el usuario de la prueba en App Store Connect); su enlace del APK se anula; se le avisa. |
| Tu rol es Soporte o Solo lectura | Ves Salud y Reportes; no ves los testers ni cambias estados. |

## Preguntas frecuentes
**¿Se puede ver quién tuvo el error?** No, y es a propósito: los errores no guardan personas. Si alguien reporta un problema, eso es un caso
de Soporte, con su persona, como siempre.

**¿Por qué «teléfonos (aprox.)»?** Es una huella del teléfono que cambia cada día: cuenta teléfonos distintos sin poder seguir a nadie.

**¿Dónde están los mapas de fuente?** Solo en el servidor (fuera de lo que se sirve). Ni nginx, ni el sitio, ni las apps los entregan.

**¿Y el «enviar comentario» de TestFlight?** La API de Apple lo tiene (capturas y cierres de TestFlight); se trae a Soporte cuando estén las
cuentas de las tiendas.

**Para el equipo técnico:** entrada `/api/errores` (sin sesión; ≤ 32 KB; solo desde una página nuestra o una cáscara); tablas
`app_error_groups` (derivados), `app_error_events` (solo inserción, purga por retención), `app_error_alerts`, `app_builds`, `beta_testers`,
`apk_links`, `support_case_logs`. Interruptores `app.errores` y `app.reportar`.

## English

### What it does
- **Our own errors and crashes** (no Sentry or GlitchTip): the web and the four apps send their page errors and, on the next open, the
  previous native crashes (MetricKit on iPhone; the exception handler and ApplicationExitInfo on Android). The server **covers** them (phones,
  emails, cards, SSN, codes, passwords, addresses with numbers or «?», quoted text), **groups** them by the stack fingerprint (a thousand alike
  with other numbers are one group) and **symbolicates** them with source maps that live only on the server and are never served. **No
  people:** no name, phone, email or order number; the route is its family (`/pedido/:n`) and the phone is a fingerprint that changes daily.
- **Live errors:** a new group, a spike (at least «live errors · spike» in 10 minutes on one build and five times the previous hour) or a
  resolved error coming back in a later build → alert to Admins (bell and push, no SMS), **once** per group, type and build. A store app
  cannot «roll back»: with the stores in production the phased release is paused; the served web rolls back with the deploy.
- **Beta program** (internal only, against the sandbox): TestFlight internal (iPhone) through the App Store Connect API; Play internal
  (Android) in Play Console; and our **own APK** with a one-use link.
- **Report a problem:** each report from people is a Support TK- case (technical topic) with the capture as a private photo and the phone's
  technical log.

### How to use it
- **Summary:** each app's pause, minimum and notice builds, and sessions by version.
- **Versions:** each build by app, platform and channel (TestFlight internal, Play internal, own APK, store) with its status (building,
  uploaded, processing, available, failed, retired), commit, size and sha256 fingerprint. The CI records them.
- **Testers** (Admin only): **Invite an account** — the phone of their To'Latino account, the app, the channel (TestFlight · iPhone, Play
  internal · Android, own APK · Android), their Apple account email (TestFlight only; stored encrypted, shown covered) and the reason. On each
  tester: **Remove** (reason), **Already on the list** (Play) and **Another link** (own APK).
- **Health · errors:** numbers (open groups, new and errors in 24 h, alerts, dropped by the cap), crash-free sessions per app (approximate,
  7 days) and the group list with filters (app, status, type) and «See more». The **detail**: times, phones (approx.), first and last seen,
  builds, the stack (symbolicated when there is a map), by build, by screen, the last occurrences without people and the alerts. Actions
  (apps:edit): **Seen**, **Resolved in…** (build or commit, with reason), **Mute** (reason; no more alerts, still counted) and **Reopen**.
- **Reports:** the «Report a problem» cases (number, status, app and version, capture or not, log lines). They open in Support (with Support
  permission); the case shows «APP LOG» with system, model, capture source and the lines.
- **Settings › Apps:** days each error is kept (then deleted; the group keeps its numbers), cap per minute and per phone, the live errors
  spike, the report log size, «shake to report» (test apps only) and the APK link hours.

### What happens in each case
| Case | What happens |
|---|---|
| A phone sends more errors than its per-minute cap | The rest is dropped before touching the database (counted in «Dropped»). |
| An error arrives with a phone or email in the message | It is stored covered («[tel]», «[correo]»); the database also rejects anything that slips. |
| That build's map is gone (another deploy) | The stack stays as it came, with the file path; the detail says so. |
| You resolved a group in build 7 and it comes back in 8 | It reopens as «new» on its own and alerts «a resolved error came back». |
| You muted a group | No alerts (new or spike); still counted. |
| The App Store Connect key is missing | The tester shows «Without the App Store Connect key»: the invite goes out when it is uploaded (Integrations). |
| Apple does not answer well | It shows «Apple did not answer well» with the code; the sweep retries every 2 minutes. |
| You invite through TestFlight and the person does not accept Apple's email | It stays «Invited»; the sweep checks every 10 minutes and adds them to the internal group once they accept. |
| You invite through Play internal | Play's API does not allow adding emails: it stays «Missing in Play»; add them in Play Console and mark «Already on the list». |
| The tester opens the APK link | Viewing the page does not use it; **Download** does (once). Another account: it does not exist. It expires after the Settings hours. |
| There is no available APK for that app | The tester is active and the link goes out when the CI uploads one («Another link»). |
| You remove a tester | They leave the TestFlight group (and the test user in App Store Connect); their APK link is cancelled; they are notified. |
| Your role is Support or Read only | You see Health and Reports; you do not see testers or change statuses. |

### FAQ
**Can I see who had the error?** No, on purpose: errors do not store people. If someone reports a problem, that is a Support case, with
its person, as always.

**Why «phones (approx.)»?** It is a phone fingerprint that changes every day: it counts distinct phones without following anyone.

**Where are the source maps?** Only on the server (outside what is served). Neither nginx, nor the site, nor the apps hand them out.

**What about TestFlight's «send feedback»?** Apple's API has it (TestFlight screenshots and crashes); it comes into Support once the store
accounts exist.
