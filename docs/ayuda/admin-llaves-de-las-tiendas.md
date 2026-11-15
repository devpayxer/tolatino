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
- Keeps the **keys that Apple and Google give only to the account owner**: the App Store Connect API key, the Apple push key (APNs), the service
  accounts for Firebase, Google Play and Google Wallet, the Android upload key and the Apple certificates (distribution and Apple Wallet), and
  the **GitHub token** used to request a build (a one-line .txt file). Nine kinds; one live per kind.
- **The Apple Wallet certificate is not uploaded as a .p12:** its key is **born on the server**. In Integrations › **Wallet** you generate the
  request (CSR), download it and upload it to developer.apple.com; the .cer Apple gives you is uploaded here and the server joins it with its
  key and Apple's intermediate certificate (it checks this: if the .cer is not from that request, it is not accepted). It expires every year:
  the team is warned 30 days before. See `admin-eventos-y-boletos` (Wallet). The Google Wallet account is uploaded with the **issuer ID**.
- Each file is **encrypted on the server** with the key from the environment secrets (never in the repository, which is public, nor in GitHub).
  Afterwards you only see its **fingerprint** (SHA-256), who uploaded it, when, when it expires, its public data (the key id, the Team ID, the
  service account email) and how many times it was read. **The content is never shown again**, to anyone.
- Every read is logged (the server's and the store CI's) and cannot be deleted. Below the keys, **CI READS**: which key the build read, with its
  run number and its commit; and **PIPELINE ATTEMPTS**: every time someone presented themselves as the CI, whether it got in or why it was
  rejected (another repository, another branch, a repeated token, it arrived without HTTPS…). The CI never stores a key: it identifies itself
  with the GitHub token of that moment (see «Super Admin: the apps pipeline»).

### How to use it
1. On the row of the kind, **Upload file** (or **Replace** if one already exists).
2. **Send the code**: a 6-digit code arrives on the phone of your Admin account (it is asked again even if you already signed in).
3. Type the code, the data that kind asks for (Apple Team ID, App Store Connect Issuer ID, Android key alias), the expiry date if you want, and
   the **reason**.
4. **Choose the file** (from Files or Downloads on the phone) and **Save to the keychain**. You see «Saved · SHA-256 …».
- **Check**: the server opens the envelope and compares the fingerprint; it tells you if it is fine (logged as a read).
- **Retire**: with a reason; it stops being used at once and the record stays.

### What happens in each case
| Case | What happens |
|---|---|
| Wrong code | «The code is not correct.» Nothing is saved. After too many tries: «Too many attempts: ask for another code.» |
| Expired code (10 minutes) | «The code expired: ask for another.» |
| Asking for another code too soon | «Wait 30 s to ask for another code.» |
| A file that is not that kind | For example «Not an Apple .p8 key» or «Not a Google service account». It is not saved and its content is not echoed. |
| Over 64 KB | «The file is too large (64 KB).» |
| One of the same kind already existed | The new one is live and the old one is retired on its own with «Replaced by version N». |
| The keychain key is missing on the server | It shows in red at the top and no key is saved. |
| Support, Finance or any other role | They do not see the section; if they try to upload or ask for the code, the server answers 403. |

### FAQ
- **Can I download a key I uploaded?** No. No one can: only the server reads it, for what needs it, and every read is logged.
- **What do I do if a key leaked or Apple / Google revoked it?** **Retire** it with the reason «The key leaked or was revoked…», create a new one
  in the Apple or Google console and upload it here.
- **Why does it ask me for the code again?** Because a store key gives access to publish apps: it confirms it is you at that moment.
- **Where is it encrypted?** In the server's database, in an envelope: a random key encrypts the file and that key is encrypted with the
  environment's key.
