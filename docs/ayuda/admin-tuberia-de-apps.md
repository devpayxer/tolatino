# Super Admin: la tubería de las apps · Super Admin: the app pipeline

_Pantallas: **Super Admin › Sistema › Apps › Versiones** (`/admin/sistema/apps?v=versiones`: los builds en vivo, «Pedir un build», los pedidos y lo
que necesita la tubería) y **Sistema › Integraciones** (las llaves, las lecturas del CI y los intentos). Teléfono y escritorio. Ver: Admin, Soporte y
Solo lectura; pedir un build y subir llaves: **solo un Admin**. Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Las cuatro apps (To'Latino, Negocios, Repartidor y Puerta) se compilan solas en GitHub: el iPhone en una Mac de GitHub y Android en Linux.
  Cada build se **firma**, se sube a **TestFlight interno** (iPhone), a **Play interno** (Android) y queda como **APK propio** para los testers que
  no están en Play. Todo sale de la rama de pruebas y apunta al sandbox; **las tiendas públicas no se tocan** (eso lo pide el fundador más
  adelante, con su OK).
- **Ninguna llave vive en GitHub ni en el repositorio** (que es público). El build se presenta con un **token de GitHub de ese momento** y el
  servidor revisa todo antes de darle nada: que venga de **nuestro repositorio**, de la **rama de pruebas**, del **flujo de las tiendas**, del
  entorno «tiendas», de una máquina de GitHub, que no sea un pull request, que no esté vencido y que **no se haya usado antes**. Solo entonces le
  da **las llaves de su trabajo** (iPhone: la de App Store Connect; Android: la llave de subida) y anota la lectura. Al terminar, el build las borra.
- **Solo por HTTPS.** Si la conexión no es segura, el servidor no acepta nada y el build no manda su token.
- El servidor decide el estado: el build dice «compilando», «subido» o «falló»; **procesando** y **disponible** los pone el servidor cuando Apple
  o Google contestan (o, en el APK propio, cuando el archivo llegó entero y su huella coincide).
- La cuenta de servicio de Google Play **no sale del servidor**: el build le entrega el .aab y el servidor lo sube a Play interno.
- **Versión:** las cuatro apps comparten una versión (por ejemplo 1.0.0). Si cambia lo nativo de las apps, la versión sube; si no, el CI no
  compila. El número de build sube solo con cada corrida.

## Cómo se usa
1. **Versiones** muestra arriba: builds **en curso**, **disponibles**, **llaves de la tubería** (de 4) y **último CI**. Mientras algo está en
   curso, la pantalla se pone al día sola (verás «En vivo»).
2. **Lo que necesita la tubería:** la llave de App Store Connect, la llave de subida de Android, la cuenta de servicio de Google Play y el token de
   GitHub. Cada una dice **VIVA** o **FALTA**; tocarla lleva a Integraciones para subirla.
3. **Pedir un build** (solo Admin): elige la app (o las cuatro), la plataforma (iPhone, Android o las dos) y el motivo (queda en la auditoría) →
   **Pedir el build**. Sale en **PEDIDOS** y, cuando el build arranca, sus filas aparecen debajo con «pedido N».
4. Cada build muestra plataforma, versión y número, canal, commit, tamaño, huella, si trae símbolos y lo que dijo la tienda. Tocar uno con
   enlace abre su corrida en GitHub.
5. En **Integraciones**, debajo de las llaves: **LECTURAS DEL CI** (qué llave leyó cada corrida) e **INTENTOS DE LA TUBERÍA** (lo rechazado y lo
   último que entró).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El build está compilando | **COMPILANDO**. Tarda unos 15 minutos por app. |
| iPhone subido a Apple | **SUBIDO**, luego **PROCESANDO** mientras Apple lo revisa, y **DISPONIBLE** cuando entra al grupo interno de TestFlight. |
| Apple lo rechaza | **FALLÓ** con «Apple: INVALID» (o FAILED). Hay que revisar el build y pedir otro. |
| Android sin la cuenta de Google Play | Queda **SUBIDO** con «espera la cuenta de Play». Al subir la cuenta en Integraciones, sale sola en un par de minutos. |
| Google contesta con un error | Se anota el motivo; se reintenta solo. A los tres errores, **FALLÓ**. |
| APK propio | **DISPONIBLE** en cuanto llega el archivo y su huella coincide. Los testers lo bajan con su enlace de un uso. |
| Pedir un build sin el token de GitHub | Queda anotado como **SIN TOKEN** y no se lanza nada: sube el token en Integraciones. |
| Ya se pidieron muchos builds en la hora | «Ya se pidieron N builds en la última hora: espera un poco.» (Configuración › Apps). |
| GitHub no acepta el pedido | **ERROR** con lo que dijo GitHub (por ejemplo, el token venció o no tiene permiso). |
| Alguien se presenta como el CI desde otro repositorio, otra rama, sin HTTPS o con un token repetido | Rechazado; queda en **INTENTOS DE LA TUBERÍA** con el motivo. No recibe nada. |
| Muchos intentos rechazados en un minuto | La tubería contesta «espera» sin revisar más, hasta el minuto siguiente. |
| Una llave vence | Apple y Google avisan por correo al dueño. Genera una nueva en su consola y súbela en Integraciones (la vieja se retira sola). |
| Soporte o Solo lectura | Ven Versiones y los pedidos; no ven «Pedir un build» ni las llaves. |

## Lo que hoy falta para que suba a las tiendas
Mientras el servidor de pruebas no tenga su dominio con HTTPS y no existan las cuentas de Apple y Google con sus llaves, el CI compila las
cuatro apps, firma Android con una llave **desechable que dice «NO PARA DISTRIBUIR»** (se crea y se borra en la misma corrida) y archiva el
iPhone sin firma. **No sube nada** y no manda ningún token. En cuanto el dominio y las llaves estén, empieza a subir solo.

## Preguntas frecuentes
- **¿Puedo bajar las llaves que usa el CI?** No. Nadie puede: el servidor las da solo al build que lo pide, por HTTPS, y lo anota.
- **¿Qué hago si una llave se filtró?** En Integraciones, **Retirar** con el motivo; genera otra en la consola de Apple o Google y súbela.
- **¿Por qué no se ve el build que pedí?** Primero sale el pedido (ENVIADO); el build aparece cuando GitHub lo arranca (un minuto o dos).
- **¿Esto publica la app para todo el mundo?** No. Solo TestFlight interno, Play interno y el APK propio. Publicar es otro paso, con el OK del fundador.
- **¿Qué es el token de GitHub?** Un permiso del dueño del repositorio para lanzar el flujo de las tiendas. Se guarda cifrado como las demás llaves.

## English
### What it does
The four apps are built automatically on GitHub (iPhone on a GitHub Mac, Android on Linux), **signed**, uploaded to **TestFlight internal**,
**Play internal** and kept as an **own APK** for testers outside Play. Everything comes from the test branch and points to the sandbox; **public
stores are never touched**. **No key lives in GitHub or in the (public) repository**: the build presents a **GitHub token issued for that run** and
the server checks it all — our repository, the test branch, the store workflow, the «tiendas» environment, a GitHub machine, not a pull request,
not expired and **never used before** — before handing over **only the keys of that job**, logging every read. **HTTPS only.** The server decides
the status: the build says building, uploaded or failed; **processing** and **available** come from Apple or Google (or, for the own APK, when the
file arrived with a matching fingerprint). The Google Play service account never leaves the server. One shared version for the four apps; native
changes require a version bump.

### How to use it
**Versions** shows builds in progress, available, pipeline keys (of 4) and last CI; it updates itself while something is in progress («Live»).
**What the pipeline needs** lists the four keys as LIVE or MISSING. **Request a build** (Admin only): app (or all four), platform and reason →
it appears under **REQUESTS**, and its builds show «request N». **Integrations** shows **CI READS** and **PIPELINE ATTEMPTS**.

### What happens in each case
| Case | What happens |
|---|---|
| iPhone uploaded | UPLOADED → PROCESSING while Apple checks it → AVAILABLE in the internal TestFlight group. Rejected by Apple → FAILED. |
| Android without the Play account | Stays UPLOADED («waiting for the Play account»); it goes out by itself once the account is uploaded. |
| Request without the GitHub token | Recorded as NO TOKEN; nothing is started. |
| Too many requests in an hour | «N builds were requested in the last hour: wait a bit.» |
| Someone poses as the CI (another repo or branch, no HTTPS, a reused token) | Rejected and listed with the reason; it gets nothing. |
| Support or Read only | See Versions and requests; no «Request a build», no keys. |

### FAQ
- **Can I download the CI keys?** No one can. **A key leaked?** Retire it in Integrations and upload a new one.
- **Does this publish the app to everyone?** No: only internal testing. Publishing is a separate step with the founder's OK.
