# Super Admin: Llaves de las tiendas · Super Admin: Store keys

_Pantallas: **Super Admin › Sistema › Integraciones** (`/admin/sistema/integraciones`; la lista «Llaves de las tiendas»; subir, reemplazar,
comprobar y retirar) y su pestaña **Proveedores** (`/admin/sistema/integraciones?tab=proveedores`; poner, rotar, probar y retirar las llaves de
Stripe, Telnyx, WhatsApp, Amazon SES y Anthropic). Teléfono y escritorio. Ver y cambiar: **solo un Admin**. Versión: 23 nov 2026. Audiencia:
equipo. Tema: equipo._

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

## Las llaves de los proveedores (pestaña Proveedores)
- **Qué son:** las llaves con las que el servidor cobra con tarjeta (Stripe), manda los SMS y el código para entrar (Telnyx), habla por WhatsApp
  (Meta), manda y recibe correo (Amazon SES y su tema de SNS) y usa El Compa (Anthropic). Catorce, agrupadas por proveedor. **No son archivos: se
  pegan.** Las pones tú, desde tu teléfono; nunca pasan por el chat ni por Claude.
- **Cómo se pone una:** en su fila, **Poner la llave** (o **Rotar** si ya hay una) → **Mandar el código** (6 números a tu teléfono) → escribe el
  código → **pega la llave** (el campo no muestra lo que pegas; abajo dice cuántos caracteres llegaron) → el **motivo** → **Guardar en el llavero**.
  Sale «… versión N guardada · SHA-256 …». La llave se cifra en el servidor y **no se vuelve a mostrar**: solo su huella corta, la versión, quién y
  cuándo. En Stripe se ve además si es **real** o **de prueba**.
- **Probar:** llama al proveedor con la lectura más barata que no manda nada (Stripe: el saldo; Telnyx: el saldo; WhatsApp: la cuenta de negocio
  con el token; Amazon SES: la cuenta, con las dos llaves; Anthropic: la lista de modelos) y dice si sirve. Queda anotado (qué llave por su huella,
  si sirvió, quién y cuándo; nunca la llave). Las que **no se prueban** con una llamada: la llave pública y la firma de los avisos de Stripe, la
  llave pública de los avisos de Telnyx, el número que manda los SMS, el secreto de la app y la palabra de verificación de WhatsApp, y el tema de
  SNS: se comprueban solas con el primer aviso firmado que llega.
- **Rotar:** pon la nueva; la anterior queda retirada sola («Reemplazada por la versión N») y el registro de las dos queda. El servidor usa la nueva
  **al instante**, en todos sus procesos.
- **Retirar:** con motivo. El servidor deja de usarla al instante. Si era la única de ese proveedor, lo que la usa se apaga con cuidado: la tarjeta
  queda apagada, los SMS esperan «sin proveedor» y se mandan cuando vuelva una llave, El Compa contesta con sus reglas fijas.
- **«ENTORNO»:** esa llave llega también por el entorno del servidor (el sobre sellado de respaldo). Mientras exista, el servidor usa **esa** y
  no la del llavero; la pantalla lo dice. Para que mande la del llavero, Claude quita la del entorno en el siguiente despliegue.
- **En producción, Telnyx va primero:** el código para entrar (y el de confirmar una llave) sale por SMS. Las llaves de Telnyx del primer día
  llegan por el sobre sellado; desde ahí, las demás se ponen aquí.
- **Sistema › Salud** dice, por proveedor, cuántas llaves tiene, de dónde las toma el servidor y su última prueba. **Lo que te toca** marca solo los
  pasos 9-1.x cuando sus llaves están y la prueba de la que se usa hoy salió bien.

| Caso | Qué pasa |
|---|---|
| La llave no tiene la forma de ese tipo | Por ejemplo «No es una llave de la API de Telnyx (empieza con KEY).» No se guarda y no se repite lo pegado. |
| Lleva espacios o saltos de línea | «La llave no lleva espacios ni saltos de línea: cópiala otra vez, completa.» |
| Una llave **de prueba** de Stripe en producción | «Es una llave de PRUEBA de Stripe: en producción va la real (live).» No se guarda. |
| Una llave **real** de Stripe en el sandbox | «Es una llave REAL de Stripe: en el sandbox va la de prueba (test).» No se guarda. |
| Probar: el proveedor no la acepta | «El proveedor no aceptó la llave: está revocada o se copió mal.» La fila dice REVISAR. |
| Probar: no tiene permiso | «La llave entra, pero no tiene permiso para esa lectura.» Revisa sus permisos en el proveedor. |
| Probar: el proveedor no contesta | «El proveedor no contestó. Prueba otra vez en un momento.» |
| Probar el ID de WhatsApp sin el token (o al revés) | Pide la otra: se prueban juntas. Lo mismo con las dos llaves de Amazon SES. |
| En producción, la página sin HTTPS | «Las llaves solo se guardan por HTTPS.» No se guarda nada. |
| Soporte, Finanzas o cualquier otro rol | No ven la sección; si intentan guardar o probar, el servidor contesta que no. |

- **¿Puedo ver una llave que puse?** No. Nadie puede. Si dudas de cuál está, compara la huella corta con la del sitio del proveedor (si la muestra)
  o pon otra.
- **¿Por qué no la mando por el chat a Claude?** Porque el chat no es un lugar para secretos. Aquí se cifra en el servidor y solo el servidor la usa.
- **Probé y dice que sirve, ¿ya está en uso?** Sí: «Probar» usa exactamente la llave que el servidor usa en ese momento.

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

### The provider keys (Providers tab)
- **What they are:** the keys the server uses to charge cards (Stripe), send texts and the sign-in code (Telnyx), talk on WhatsApp (Meta), send and
  receive email (Amazon SES and its SNS topic) and run El Compa (Anthropic). Fourteen, grouped by provider. **They are not files: you paste them.**
  You set them yourself, from your phone; they never go through the chat or through Claude.
- **How to set one:** on its row, **Set the key** (or **Rotate** if there is one) → **Send the code** (6 digits to your phone) → type the code →
  **paste the key** (the field does not show what you paste; below it says how many characters arrived) → the **reason** → **Save to the
  keychain**. You see «… version N saved · SHA-256 …». The key is encrypted on the server and **never shown again**: only its short fingerprint,
  version, who and when. For Stripe you also see whether it is **live** or **test**.
- **Test:** calls the provider with the cheapest read that sends nothing (Stripe: the balance; Telnyx: the balance; WhatsApp: the business account
  with the token; Amazon SES: the account, with both keys; Anthropic: the model list) and says whether it works. It is logged (which key by its
  fingerprint, whether it worked, who and when; never the key). The ones **not tested** with a call: Stripe's publishable key and webhook signing
  secret, Telnyx's webhook public key, the sending number, WhatsApp's app secret and verify token, and the SNS topic: they prove themselves with the
  first signed notice that arrives.
- **Rotate:** set the new one; the old one is retired on its own («Replaced by version N») and the record of both stays. The server uses the new
  one **at once**, in all its processes.
- **Withdraw:** with a reason. The server stops using it at once. If it was that provider's only key, what uses it switches off carefully: cards
  stay off, texts wait as «no provider» and go out when a key is back, El Compa answers with its fixed rules.
- **«ENVIRONMENT»:** that key also arrives through the server environment (the backup sealed envelope). While it exists, the server uses **that**
  one and not the keychain's; the screen says so. For the keychain's to rule, Claude removes the environment one in the next deploy.
- **In production, Telnyx goes first:** the sign-in code (and the code to confirm a key) is sent by SMS. The first day's Telnyx keys arrive by the
  sealed envelope; from then on, the rest are set here.
- **System › Health** shows, per provider, how many keys it has, where the server takes them from and its last test. **What you need to do**
  marks the 9-1.x steps on its own when their keys are there and the test of the one in use today passed.

| Case | What happens |
|---|---|
| The key does not have that kind's shape | For example «It is not a Telnyx API key (it starts with KEY).» Not saved, and what you pasted is not echoed. |
| It has spaces or line breaks | «The key has no spaces or line breaks: copy it again, whole.» |
| A Stripe **test** key in production | «It is a Stripe TEST key: production needs the live one.» Not saved. |
| A **live** Stripe key in the sandbox | «It is a LIVE Stripe key: the sandbox needs the test one.» Not saved. |
| Test: the provider rejects it | «The provider did not accept the key: it is revoked or was copied wrong.» The row says CHECK. |
| Test: no permission | «The key gets in, but it lacks permission for that read.» Check its permissions at the provider. |
| Test: the provider does not answer | «The provider did not answer. Try again in a moment.» |
| Testing the WhatsApp ID without the token (or the other way round) | It asks for the other one: they are tested together. Same with the two Amazon SES keys. |
| In production, the page without HTTPS | «Keys are only saved over HTTPS.» Nothing is saved. |
| Support, Finance or any other role | They do not see the section; if they try to save or test, the server says no. |

- **Can I see a key I set?** No. No one can. If you are unsure which one is there, compare the short fingerprint with the provider's site (if it
  shows one) or set another.
- **Why not send it to Claude in the chat?** Because the chat is not a place for secrets. Here it is encrypted on the server and only the server
  uses it.
- **I tested and it works: is it in use?** Yes: «Test» uses exactly the key the server is using at that moment.
