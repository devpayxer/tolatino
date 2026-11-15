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
- The four apps (To'Latino, Negocios, Repartidor and Puerta) are built automatically on GitHub: the iPhone on a GitHub Mac and Android on Linux.
  Each build is **signed**, uploaded to **internal TestFlight** (iPhone) and **internal Play** (Android), and kept as an **own APK** for testers who
  are not on Play. Everything comes from the test branch and points at the sandbox; **the public stores are not touched** (the founder asks for that
  later, with their OK).
- **No key lives on GitHub or in the repository** (which is public). The build shows up with a **GitHub token from that moment**, and the server
  checks everything before handing over anything: that it comes from **our repository**, from the **test branch**, from the **stores workflow**,
  from the «stores» environment, from a GitHub machine, that it is not a pull request, that it has not expired and that it **has not been used
  before**. Only then does it hand over **the keys for its job** (iPhone: the App Store Connect one; Android: the upload key) and log the read.
  When it finishes, the build deletes them.
- **Only over HTTPS.** If the connection is not secure, the server accepts nothing and the build does not send its token.
- The server decides the status: the build says «building», «uploaded» or «failed»; **processing** and **available** are set by the server when
  Apple or Google answer (or, for the own APK, when the file arrived whole and its fingerprint matches).
- The Google Play service account **never leaves the server**: the build hands over the .aab and the server uploads it to internal Play.
- **Version:** the four apps share one version (for example 1.0.0). If the apps' native code changes, the version goes up; if not, CI does not
  build. The build number goes up by itself with every run.

### How to use it
1. **Versions** shows at the top: builds **in progress**, **available**, **pipeline keys** (out of 4) and **last CI**. While something is in
   progress, the screen updates by itself (you will see «Live»).
2. **What the pipeline needs:** the App Store Connect key, the Android upload key, the Google Play service account and the GitHub token. Each
   one says **LIVE** or **MISSING**; tapping it takes you to Integrations to upload it.
3. **Request a build** (Admin only): pick the app (or all four), the platform (iPhone, Android or both) and the reason (it goes in the audit) →
   **Request the build**. It shows in **REQUESTS** and, when the build starts, its rows appear below with «request N».
4. Each build shows platform, version and number, channel, commit, size, fingerprint, whether it carries symbols and what the store said.
   Tapping one with a link opens its run on GitHub.
5. In **Integrations**, below the keys: **CI READS** (which key each run read) and **PIPELINE ATTEMPTS** (what was rejected and the latest that
   got in).

### What happens in each case
| Case | What happens |
|---|---|
| The build is compiling | **BUILDING**. It takes about 15 minutes per app. |
| iPhone uploaded to Apple | **UPLOADED**, then **PROCESSING** while Apple reviews it, and **AVAILABLE** when it enters the internal TestFlight group. |
| Apple rejects it | **FAILED** with «Apple: INVALID» (or FAILED). Check the build and request another. |
| Android without the Google Play account | It stays **UPLOADED** with «waiting for the Play account». When you upload the account in Integrations, it goes out by itself in a couple of minutes. |
| Google answers with an error | The reason is logged; it retries by itself. After three errors, **FAILED**. |
| Own APK | **AVAILABLE** as soon as the file arrives and its fingerprint matches. Testers download it with their one-use link. |
| Requesting a build without the GitHub token | It is logged as **NO TOKEN** and nothing is launched: upload the token in Integrations. |
| Many builds were already requested in the hour | «N builds were already requested in the last hour: wait a little.» (Settings › Apps). |
| GitHub does not accept the request | **ERROR** with what GitHub said (for example, the token expired or lacks permission). |
| Someone presents as CI from another repository, another branch, without HTTPS or with a repeated token | Rejected; it is logged in **PIPELINE ATTEMPTS** with the reason. It receives nothing. |
| Many rejected attempts in one minute | The pipeline answers «wait» without checking further, until the next minute. |
| A key expires | Apple and Google email the owner. Generate a new one in their console and upload it in Integrations (the old one retires by itself). |
| Support or Read-only | They see Versions and the requests; they do not see «Request a build» or the keys. |

### What is missing today before it can go to the stores
As long as the test server has no domain with HTTPS and the Apple and Google accounts with their keys do not exist, CI builds the four apps,
signs Android with a **disposable key that says «NOT FOR DISTRIBUTION»** (created and deleted in the same run) and archives the iPhone
unsigned. It **uploads nothing** and sends no token. As soon as the domain and the keys are in place, it starts uploading by itself.

### FAQ
- **Can I download the keys CI uses?** No. Nobody can: the server gives them only to the build that asks for them, over HTTPS, and logs it.
- **What do I do if a key leaked?** In Integrations, **Retire** with the reason; generate another in the Apple or Google console and upload it.
- **Why don't I see the build I requested?** The request shows first (SENT); the build appears when GitHub starts it (a minute or two).
- **Does this publish the app to everyone?** No. Only internal TestFlight, internal Play and the own APK. Publishing is another step, with the
  founder's OK.
- **What is the GitHub token?** A permission from the repository owner to launch the stores workflow. It is stored encrypted like the other keys.
