# Super Admin: Apps · Super Admin: Apps

_Pantallas: **Super Admin › Sistema › Apps** (`/admin/sistema/apps`; pestañas Equipo y permisos · Configuración · Apps · Integraciones; también
en el menú, grupo Control). Teléfono y escritorio. Ver: Admin, Soporte y Solo lectura. Cambiar: **solo un Admin**. Versión: 11 nov 2026.
Audiencia: equipo. Tema: equipo._

## Qué hace
- Las **cuatro apps** de las tiendas (To'Latino, To'Latino Negocios, To'Latino Repartidor, To'Latino Puerta) con su id de iOS y de Android y su
  entrada (`/`, `/panel`, `/repartidor`, `/puerta`). Las cuatro abren la misma web servida; la app solo dice cuál es y qué versión tiene.
- **La pausa de emergencia** de cada app (interruptor): pausada, la app no abre su entrada y muestra «Esta app está en pausa · Abrir en la
  web». La web sigue igual.
- Por app y por plataforma (iPhone, Android): el **build mínimo** (por debajo: «Actualiza la app», no sigue) y el **build de aviso** (por debajo:
  una nota arriba «Hay una versión nueva de …» que se cierra y vuelve en 7 días). 0 = sin límite.
- **Sesiones activas por app y versión** (vistas en 30 días; las de 7 días aparte) y, arriba, las sesiones de 7 días por app y las de la web.
  Sin personas: solo cuántas.

## Cómo se usa
- **Pausar o abrir una app:** toca su interruptor, elige o escribe el motivo y confirma. Queda en la auditoría con antes → después.
- **Cambiar un build:** en la fila de la plataforma, **Mínimo** o **Aviso**, escribe el número de build y el motivo, **Guardar**.
- Los cambios valen en cada servidor **en 15 segundos como mucho** (como toda la Configuración) y la app los ve la próxima vez que abre una
  pantalla de su entrada.
- **Las otras pestañas de Apps** (Versiones, Testers, Salud · errores y Reportes) se explican en «Errores, beta y reportes en el Super Admin»;
  **Fichas y revisión**, **Lo que te toca** y **Declaraciones**, en «Super Admin: fichas de las tiendas y cuentas de revisión».

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Build mínimo dentro de sus límites | Se guarda, queda en la auditoría; las apps con un build menor ven «Actualiza la app». |
| Build de aviso igual o menor que el mínimo | «El build de aviso tiene que ser mayor que el mínimo; 0 = sin aviso.» No se guarda. |
| Un número fuera de los límites o negativo | «Entre 0 build y 999,999 build.» No se guarda. |
| Mínimo de iPhone | No toca Android (cada plataforma tiene el suyo). |
| App en pausa | Abre «Esta app está en pausa»; **Abrir en la web** la lleva al navegador. Volver a abrirla: el interruptor otra vez, con motivo. |
| No eres Admin | Ves todo; «Solo un Admin cambia las versiones o pausa una app.» |
| Finanzas, Moderador, Verificador | No tienen esta sección. |
| Alguien abre una ruta de otra app | El servidor la manda a «Esto se abre en …» (nunca la abre dentro de la app equivocada); el Super Admin nunca se abre en una app. |

## Preguntas frecuentes
- **¿Una app vieja puede saltarse un permiso?** No. La versión de la app nunca decide lo que la persona puede hacer, ver o pagar: eso lo decide
  el servidor con su sesión. El mínimo existe para que el código nativo viejo no falle.
- **¿Cuándo uso la pausa?** Cuando una app tiene un problema grave y la web no: la gente sigue con la web hasta que se corrija.
- **¿Por qué hay sesiones de la web aquí?** Para comparar: cuántas personas usan la web y cuántas cada app.
- **¿Dónde se ve la app y la versión de una persona?** En Usuarios 360° › Seguridad › Dispositivos y sesiones («To'Latino Puerta 1.0.0 (12) · iOS 17.5»).

## English

### What it does
- The **four store apps** (To'Latino, To'Latino Negocios, To'Latino Repartidor, To'Latino Puerta) with their iOS and Android ids and their entry
  path (`/`, `/panel`, `/repartidor`, `/puerta`). All four open the same served web; the app only says which one it is and what version it has.
- **The emergency pause** of each app (a switch): when paused, the app does not open its entry and shows «This app is paused · Open on the web».
  The web stays the same.
- Per app and per platform (iPhone, Android): the **minimum build** (below it: «Update the app», it does not continue) and the **notice build**
  (below it: a note on top «There is a new version of …» that can be closed and comes back in 7 days). 0 = no limit.
- **Active sessions by app and version** (seen in 30 days; the 7-day ones apart) and, on top, the 7-day sessions per app and the web's. No
  people: only how many.

### How to use it
- **Pause or open an app:** tap its switch, choose or write the reason and confirm. It goes to the audit log with before → after.
- **Change a build:** on the platform row, **Minimum** or **Notice**, type the build number and the reason, **Save**.
- Changes apply on every server **within 15 seconds at most** (like all of Configuration) and the app sees them the next time it opens a screen
  of its entry.
- **The other Apps tabs** (Versions, Testers, Health · errors and Reports) are explained in «Errors, beta and reports in Super Admin»;
  **Listings and review**, **Your steps** and **Declarations**, in «Super Admin: store listings and review accounts».

### What happens in each case
| Case | What happens |
|---|---|
| Minimum build within its limits | It is saved and goes to the audit log; apps with a lower build see «Update the app». |
| Notice build equal to or lower than the minimum | «The notice build has to be greater than the minimum; 0 = no notice.» It is not saved. |
| A number out of range or negative | «Between 0 builds and 999,999 builds.» It is not saved. |
| iPhone minimum | It does not touch Android (each platform has its own). |
| App paused | It opens «This app is paused»; **Open on the web** takes it to the browser. To open it again: the switch once more, with a reason. |
| You are not an Admin | You see everything; «Only an Admin changes versions or pauses an app.» |
| Finance, Moderator, Verifier | They do not have this section. |
| Someone opens a route of another app | The server sends it to «This opens in …» (it never opens it inside the wrong app); the Super Admin never opens in an app. |

### FAQ
- **Can an old app skip a permission?** No. The app version never decides what the person can do, see or pay: the server decides that with
  their session. The minimum exists so old native code does not fail.
- **When do I use the pause?** When an app has a serious problem and the web does not: people keep going with the web until it is fixed.
- **Why are web sessions here?** To compare: how many people use the web and how many use each app.
- **Where do I see a person's app and version?** In Users 360° › Security › Devices and sessions («To'Latino Puerta 1.0.0 (12) · iOS 17.5»).
