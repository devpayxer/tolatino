# Super Admin: Llaves de las tiendas · Super Admin: Store keys

_Pantallas: **Super Admin › Sistema › Integraciones** (`/admin/sistema/integraciones`; la lista «Llaves de las tiendas»; subir, reemplazar,
comprobar y retirar). Teléfono y escritorio. Ver y cambiar: **solo un Admin**. Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Guarda las **llaves que Apple y Google entregan solo al dueño de la cuenta**: la llave de la API de App Store Connect, la llave de avisos de
  Apple (APNs), las cuentas de servicio de Firebase, Google Play y Google Wallet, la llave de subida de Android y los certificados de Apple
  (distribución y Apple Wallet), y el **token de GitHub** con el que se pide un build (un archivo .txt de una línea). Nueve tipos; una viva por
  tipo.
- **El certificado de Apple Wallet no se sube como .p12:** su llave **nace en el servidor**. En Integraciones › **Wallet** se genera la
  solicitud (CSR), se baja y se sube a developer.apple.com; el .cer que da Apple se sube aquí y el servidor lo junta con su llave y el
  intermedio de Apple (lo comprueba: si el .cer no es de esa solicitud, no entra). Vence cada año: aviso al equipo 30 días antes. Ver
  `admin-eventos-y-boletos` (Wallet). La cuenta de Google Wallet se sube con el **ID del emisor**.
- Cada archivo se **cifra en el servidor** con la llave de los secretos del entorno (nunca en el repositorio, que es público, ni en GitHub).
  Después solo se ve su **huella** (SHA-256), quién la subió, cuándo, cuándo vence, sus datos públicos (el id de la llave, el Team ID, el correo
  de la cuenta de servicio) y cuántas veces se leyó. **El contenido no se vuelve a mostrar nunca**, a nadie.
- Cada lectura queda anotada (la del servidor y la del CI de las tiendas), y no se puede borrar. Debajo de las llaves, **LECTURAS DEL CI**: qué
  llave leyó el build, con su número de corrida (run) y su commit; e **INTENTOS DE LA TUBERÍA**: cada vez que alguien se presentó como el CI,
  si entró o por qué se rechazó (otro repositorio, otra rama, token repetido, llegó sin HTTPS…). El CI nunca guarda una llave: se identifica
  con el token de GitHub de ese momento (ver «Super Admin: la tubería de las apps»).

## Cómo se usa
1. En la fila del tipo, **Subir archivo** (o **Reemplazar** si ya hay una).
2. **Mandar el código**: te llega un código de 6 números al teléfono de tu cuenta de Admin (se vuelve a pedir aunque ya hayas entrado).
3. Escribe el código, los datos que pida ese tipo (Team ID de Apple, Issuer ID de App Store Connect, alias de la llave de Android), si quieres
   la fecha de vencimiento, y el **motivo**.
4. **Elegir el archivo** (desde Archivos o Descargas del teléfono) y **Guardar en el llavero**. Sale «Guardada · SHA-256 …».
- **Comprobar**: el servidor abre el sobre y compara la huella; dice si está bien (queda anotado como una lectura).
- **Retirar**: con motivo; deja de usarse al instante y el registro queda.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Código equivocado | «El código no es correcto.» No se guarda nada. Pasados los intentos: «Demasiados intentos: pide otro código.» |
| Código vencido (10 minutos) | «El código venció: pide otro.» |
| Pedir otro código muy seguido | «Espera 30 s para pedir otro código.» |
| Un archivo que no es de ese tipo | Por ejemplo «No es una llave .p8 de Apple» o «No es una cuenta de servicio de Google». No se guarda y no se repite su contenido. |
| Más de 64 KB | «El archivo es demasiado grande (64 KB).» |
| Ya había una del mismo tipo | La nueva queda viva y la anterior se retira sola con «Reemplazada por la versión N». |
| Falta la llave del llavero en el servidor | Arriba sale en rojo y no se guarda ninguna llave. |
| Soporte, Finanzas o cualquier otro rol | No ven la sección; si intentan subir o pedir el código, el servidor contesta 403. |

## Preguntas frecuentes
- **¿Puedo descargar una llave que subí?** No. Nadie puede: solo el servidor la lee para lo que la necesita, y cada lectura queda anotada.
- **¿Qué hago si una llave se filtró o Apple / Google la revocó?** **Retirar** con el motivo «La llave se filtró o se revocó…», genera una
  nueva en la consola de Apple o Google y súbela aquí.
- **¿Por qué me vuelve a pedir el código?** Porque una llave de tienda da acceso a publicar apps: se confirma que eres tú en ese momento.
- **¿Dónde está cifrada?** En la base del servidor, en un sobre: una llave al azar cifra el archivo y esa llave va cifrada con la del entorno.

## English
### What it does
**Super Admin › System › Integrations › Store keys** keeps the keys Apple and Google give only to the account owner: the App Store Connect
API key, the Apple push key (APNs), the Firebase, Google Play and Google Wallet service accounts, the Android upload key and the Apple
certificates (distribution and Wallet), and the **GitHub token** used to request a build (a one-line .txt file). Nine kinds, one live per kind. The Apple Wallet certificate is not uploaded as a .p12: its key is
**born on the server** (Integrations › Wallet generates the request, you upload it to Apple and upload the .cer back here; a .cer that does not
match the request is rejected; the team is warned 30 days before it expires); the Google Wallet account goes with its **issuer ID**. Each file is **encrypted on the server** with the environment key
(never in the public repository nor in GitHub). Afterwards only its **fingerprint** (SHA-256), who uploaded it, when, when it expires, its
public data and how many times it was read are shown. **The content is never shown again**, to anyone. Every read is logged and can't be
deleted. Below the keys, **CI READS** (which key each build read, with its run and commit) and **PIPELINE ATTEMPTS** (who presented itself as
the CI, whether it got in or why it was rejected).

### How to use it
1. On the row, **Upload file** (or **Replace**). 2. **Send the code**: a 6-digit code goes to your Admin phone (asked again even if you are
signed in). 3. Type the code, the data that kind needs (Apple Team ID, App Store Connect Issuer ID, Android key alias), the optional expiry
date and the **reason**. 4. **Choose the file** and **Save to the key store**: you see «Saved · SHA-256 …». **Check** opens the envelope on the
server and compares the fingerprint (logged as a read). **Retire** takes a reason; it stops being used at once and the record stays.

### What happens in each case
| Case | What happens |
|---|---|
| Wrong or expired code | Nothing is saved; ask for another code. |
| A file that is not that kind | Rejected without echoing its content. |
| Over 64 KB | Rejected. |
| One of the same kind existed | The new one is live; the old one is retired with «Replaced by version N». |
| Any role other than Admin | No section; uploading or asking for the code returns 403. |

### FAQ
- **Can I download a key I uploaded?** No one can: only the server reads it, and every read is logged.
- **A key leaked or was revoked?** **Retire** it with the reason, create a new one in Apple's or Google's console and upload it here.
