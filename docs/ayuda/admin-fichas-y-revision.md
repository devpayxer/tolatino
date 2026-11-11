# Super Admin: fichas de las tiendas y cuentas de revisión · Super Admin: store listings and review accounts

_Pantallas: **Super Admin › Sistema › Apps › Fichas y revisión** (`/admin/sistema/apps?v=fichas`), **Lo que te toca** (`?v=toca`) y
**Declaraciones** (`?v=declaraciones&app=`); **Configuración › Apps** (los topes); la página pública **/privacidad**. Teléfono y escritorio. Ver: Admin,
Soporte y Solo lectura; subir las fichas, activar o apagar las cuentas de revisión y marcar pasos: **solo un Admin**. Versión: 11 nov 2026.
Audiencia: equipo. Tema: equipo._

## Qué hace
- **Fichas**: el texto de cada app en App Store y Google Play (nombre, subtítulo, descripción corta y larga, palabras clave, texto promocional y
  novedades), en español y en inglés. La fuente es el repositorio (`apps/mobile/tiendas/{app}/{es,en}.md`), escrito desde esta misma Ayuda, sobrio,
  sin emoji, sin superlativos y dentro de los topes de cada tienda (si una ficha se pasa, el build no sale). Aquí se ve cada una de las 16 (4 apps ×
  2 tiendas × 2 idiomas) con su huella frente a lo último que se subió: **AL DÍA**, **CAMBIÓ**, **SIN SUBIR** o **ERROR**.
- **Subir como borrador** manda las fichas, sus capturas, la clasificación por edad y las notas para la revisión a **App Store Connect** (solo a la
  versión que se está preparando) y a **Google Play** (una edición confirmada **sin enviarla a revisión**). Cada subida queda copiada con la huella del
  archivo. **Nada se envía a revisión desde aquí.**
- **Capturas**: las hace el CI a pedido (de 5 a 8 por app, en español y en inglés, en el tamaño de cada tienda) con los datos de prueba del sandbox, y
  entran al almacén privado por la tubería.
- **Cuentas de revisión**: Apple y Google necesitan entrar a cada app sin un SMS real. Cada app tiene una cuenta con un **número reservado** que entra
  con un **código fijo** guardado en los secretos del servidor (nunca aquí, ni en el repositorio, ni en el chat). Solo ese número, solo con la cuenta
  **activa** y las cuentas de revisión **encendidas**. No paga con tarjeta y la de Negocios solo ve un **negocio de revisión oculto** (nadie más lo ve).
- **Lo que te toca**: cada paso del fundador con las cuentas de Apple, Google, Cloudflare y Firebase, con su estado y el botón que abre la consola.
- **Declaraciones**: lado a lado, cada pregunta de Apple (Privacidad de la app, clasificación) y de Google (Seguridad de los datos, IARC, público
  objetivo…), la respuesta que damos y de dónde sale. Las de privacidad salen del **inventario real de datos**, el mismo que escribe /privacidad.

## Cómo se usa
- **Subir las fichas**: Fichas y revisión › **Subir como borrador** › la app (o las cuatro) › motivo. Sin la llave de una tienda, esa tienda queda
  «sin llave» y no se toca nada. Tope por día en Configuración › Apps (**Fichas · subidas a las tiendas por día**).
- **Cambiar una ficha**: se cambia el archivo en el repositorio (no aquí); al subir, la fila pasa a AL DÍA.
- **Cuentas de revisión**: el interruptor de arriba las enciende o apaga todas (motivo); cada cuenta se activa o desactiva con su interruptor
  (motivo). Al apagar o desactivar, los códigos que ya se habían pedido dejan de servir en ese momento. «Secreto … presente» dice que el código está
  en el servidor; nunca se muestra.
- **Lo que te toca**: **Abrir** lleva a la consola del tercero; **Copiar** copia el único dato que una consola obliga a escribir (el correo de la cuenta
  de servicio de Google); **Ya lo hice** marca un paso que el sistema no puede ver (con una nota). Lo que el sistema sí puede comprobar (el dominio con
  https, las llaves en el llavero, las apps creadas en App Store Connect) se marca solo.
- **Declaraciones**: elige la app; **Descargar el CSV de Data safety** baja el archivo para importarlo en Play Console.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Falta la llave de Apple o de Google | Esa tienda queda «sin llave»; la otra se sube igual. |
| Apple no tiene una versión en preparación | No se toca nada de esa app en Apple: «No hay una versión en preparación». |
| Una ficha cambió en el repositorio | La fila dice CAMBIÓ hasta la próxima subida. |
| La tienda contestó con un error | La fila dice ERROR con lo que dijo la tienda; se vuelve a subir cuando se arregle. |
| El código fijo de una cuenta no está en el servidor | La cuenta dice SIN SECRETO y no entra. |
| Alguien intenta pagar con la cuenta de revisión | No se cobra: «Esta es una cuenta de revisión: no paga con tarjeta» y queda anotado. |
| Se apaga el interruptor con un revisor adentro | Su sesión sigue, pero ningún código fijo vuelve a entrar. |

## Preguntas frecuentes
- **¿Esto manda las apps a revisión?** No. Solo deja la ficha como borrador. Enviar a revisión lo pide el fundador antes de abrir al público.
- **¿Por qué no veo el código de la cuenta de revisión?** Porque es un secreto: el servidor se lo da a Apple por la API, con las notas para la revisión.
- **¿La cuenta de revisión ve datos de la gente?** No. Ve lo público como cualquier vecino y, en Negocios, solo su negocio oculto.
- **¿De dónde salen las respuestas de privacidad?** Del inventario de datos del repositorio: cada columna con un dato personal tiene su lugar ahí, o el
  build no sale.

### Para el equipo
<!-- solo-equipo -->
- Las cuentas de revisión de producción se crean en la Fase 9, a mano, con el OK del fundador; en el sandbox las crea la semilla y nacen apagadas
  (interruptor `app.revision.cuentas`). En producción no entran sin `app.tiendas.publico`.
- Google permite subir Data safety por la API (`applications.dataSafety`); el servidor no lo hace solo porque es una declaración legal del dueño de la
  cuenta: queda para cuando el fundador dé su OK.

## English
### What it does
- **Listings**: each app's text on the App Store and Google Play (name, subtitle, short and full description, keywords, promotional text and what's
  new), in Spanish and English. The source is the repository, written from this Help, plain, no emoji, no superlatives and within each store's
  limits. Here you see the 16 listings (4 apps × 2 stores × 2 languages) with their fingerprint against the last upload: **UP TO DATE**, **CHANGED**,
  **NOT UPLOADED** or **ERROR**.
- **Upload as draft** sends listings, screenshots, the age rating and review notes to **App Store Connect** (only the version being prepared) and to
  **Google Play** (an edit committed **without sending it for review**). **Nothing is sent for review from here.**
- **Review accounts**: Apple and Google need to sign in without a real text message. Each app has an account with a **reserved number** that signs in
  with a **fixed code** stored in the server's secrets (never here, in the repository or in the chat). Only that number, only while the account is
  **active** and review accounts are **on**. It does not pay by card, and the Negocios one only sees a **hidden review business**.
- **What's on you**: each founder step with Apple, Google, Cloudflare and Firebase, with its status and a button to open the console.
- **Declarations**: side by side, each Apple and Google question, our answer and where it comes from (the real data inventory, the same that
  writes /privacidad).

### How to use it
- **Upload listings**: Listings and review › **Upload as draft** › the app (or all four) › reason. Without a store's key, that store stays «no key».
- **Review accounts**: the top switch turns them all on or off (reason); each account has its own switch. Turning off cancels codes already requested.
- **What's on you**: **Open** goes to the console; **Copy** copies the only value a console makes you type; **I did it** marks a step the system cannot see.
- **Declarations**: pick the app; **Download the Data safety CSV** to import it in Play Console.

### FAQ
- **Does this send the apps for review?** No. It only leaves the listing as a draft.
- **Why can't I see the review account code?** It is a secret: the server gives it to Apple through the API, with the review notes.
- **Does the review account see people's data?** No. It sees what any neighbor sees and, in Negocios, only its hidden business.
