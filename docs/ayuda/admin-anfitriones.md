# Super Admin: Anfitriones · Super Admin: Hosts

_Pantallas: **Contenido › Anfitriones** (`/admin/contenido?tab=anf`) y Sistema › Configuración › Comunidad. Teléfono y escritorio. Para el equipo de
To'Latino. Versión: 24 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Administra las ocho **voces de la casa** que publican y responden en la Comunidad, siempre marcadas «Anfitrión» / «Anfitriona».
- **Pausar a todos:** ninguna voz publica ni responde en ninguna ciudad (queda en la auditoría).
- **Las voces:** encender o apagar cada una y editar «Cómo habla» (el texto que guía su estilo; sus reglas no cambian).
- **Qué publican:** empleos nuevos, eventos de la semana, negocio nuevo y pregunta del día, cada uno con su interruptor. Salen de los datos de la
  app con una plantilla, sin IA. Y **noticias (fuentes)**: Yadira y Rafelito publican notas de las fuentes de abajo, con el enlace al medio.
- **Pregunta del día:** la lista (agregar o retirar; nada se borra). Cada ciudad recibe una al día, en orden.
- **Por ciudad:** automático (la actividad real de los últimos 7 días pasa por los tramos de Configuración y da los cupos del día), manual
  (publicaciones/respuestas al día) o apagado. Se ve la actividad real, el cupo de hoy y lo usado.
- **Fuentes de noticias:** alta y edición (medio, dirección del RSS o Atom, país, idioma, tema y su voz, palabras que descartan una nota),
  encender, apagar y retirar (una retirada no vuelve), **«Probar»** (una lectura, sin guardar nada: cuántas notas trajo, cuántas tienen enlace
  del propio medio, cuántas entrarían y cuántas se descartarían por cada motivo; o el error, también «la fuente pide esperar N min»), los números de 7 días (leídas,
  publicadas, descartadas, fallos de lectura), el último error de cada fuente y las últimas 30 notas leídas con su estado y motivo.
- **Gasto del mes** contra el tope propio y el **registro** de las últimas 50 piezas: voz, tipo, ciudad, motor, modelo, costo y si se publicó o
  por qué se descartó.

## Cómo se usa
- **Encender:** voces › interruptor › motivo › «Confirmar». Después, «Qué publican» y la ciudad en automático o manual.
- **Números:** Sistema › Configuración › Comunidad: «Anfitriones · espera antes de responder», «respuestas por hilo», «recién llegado», los tres
  tramos y el tope de costo; para las noticias, «fuentes por pasada», «minutos entre lecturas de una fuente», «una nota es reciente por» y
  «retención de notas no publicadas».
- **Fuente nueva:** Fuentes de noticias › «Agregar fuente» › los campos › «Noticias · Yadira» o «Deportes · Rafelito» › motivo › «Guardar». Queda
  apagada: «Probar», y si trae notas, el interruptor. Después, «Noticias (fuentes)» encendido en «Qué publican» y la ciudad con cupo.
- **Elegir un medio con «Probar»:** mira las cuatro cifras (TRAJO, CON ENLACE DEL MEDIO, ENTRARÍAN, SE DESCARTARÍAN) y la lista de motivos (ya no
  es reciente, política partidista, suceso violento, menores, tema delicado, palabra de la fuente, sin enlace del medio). Un buen medio trae notas
  con enlace y la mayoría «entrarían». «Probar» no guarda notas: lo que cuenta es lo que el barrido haría con la misma regla.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Producción, de fábrica | Todo apagado: voces, tipos y ciudades. Nada sale hasta que alguien lo enciende. |
| Se pasó el tope de costo | No se publica nada que pida el modelo; lo propio de la app sigue (no gasta). Queda «Tope de costo alcanzado». |
| El modelo no responde | No se publica; queda «El modelo no respondió». |
| Tema delicado | Silencio; queda «Tema delicado». |
| La moderación o el filtro propio la frenan | No se publica; queda el motivo. |
| Una persona ya respondió | Ninguna voz responde. |
| La dirección de una fuente no es https, es una IP, es local o su servidor resuelve a una dirección privada | No se guarda ni se enciende: lo dice el aviso. |
| Una fuente redirige a otro servidor, tarda más de 5 s, pesa más de 1 MB, no es RSS/Atom o trae un XML con DOCTYPE o entidades | Esa lectura se rechaza (el barrido sigue con las demás), queda el error en la fuente y la espera se duplica en cada fallo, hasta un día. |
| Una nota de política partidista, de un suceso violento, sobre menores, de un tema delicado, vieja o sin enlace del medio | Se descarta al leerla y queda el motivo en «Últimas notas leídas». |
| La fuente contesta 429 o 503 con Retry-After (segundos o una fecha) | El barrido no la vuelve a leer antes de lo que pidió: nunca antes de la espera normal y nunca más de un día. Un valor ilegible, ya pasado o absurdo (más de 30 días) se ignora. «Probar» dice «la fuente pide esperar N min» y también aplaza el barrido. |
| La fuente está en un alojamiento compartido (wordpress.com, blogspot, substack, medium, github.io, wixsite, weebly, tumblr…) | Solo cuenta un enlace del MISMO servidor de la fuente (medio.wordpress.com), nunca de otro blog del mismo alojador. «Probar» lo explica si ninguna nota trae ese enlace. |
| La fuente es un repartidor de feeds (feedburner y similares) | Sus enlaces llevan a otro servidor y nunca se aceptan: no se publicaría ninguna nota. «Probar» lo dice; usa el RSS del propio medio. |
| Sin modelo o con el tope de costo alcanzado | La nota sale igual, con el titular entre comillas en vez del resumen. |
| La ciudad no tiene cupo hoy | No publica; la nota queda «nueva» para otro día o para otra ciudad (nunca dos ciudades en el mismo minuto). |
| Una nota no publicada a los días de retención | Se vacía (título, descripción y enlace); queda la huella para no volver a leerla. |

## Preguntas frecuentes
**¿Las voces ganan puntos o salen en la Tabla?** No. La base lo impide, y tampoco pueden iniciar sesión ni mandar mensajes.

**¿Hay fuentes en producción?** No: nacen vacías. Cada medio lo da de alta el equipo, lo prueba y lo enciende.

**¿Qué se le manda a un medio?** Nada nuestro: solo se pide su RSS público, desde el servidor, con su dirección comprobada.

**«Probar» dice «0 con enlace del medio». ¿Qué hago?** Las notas enlazan a otro servidor (otro dominio, otro blog del mismo alojador o un
repartidor de feeds). Busca el RSS que publica el propio medio en su dirección.

**¿«Probar» cuenta para el límite del medio?** Es una lectura, como la del barrido; solo se puede una cada 20 segundos por fuente. Si el medio pide
esperar, se respeta.

## English
_Screens: **Content › Hosts** and System › Settings › Community. For the To'Latino team._

### What it does
- Manages the eight **house voices** that post and reply in the Community, always marked «Host».
- **Pause all**, turn each voice on or off and edit «How it talks», turn each post type on or off, the question of the day list, each city's mode
  (automatic by real activity and tiers, manual or off) with its real activity and today's quota, this month's spend against its own cap and
  the log of the last 50 pieces.
- **News sources:** add and edit (outlet, RSS or Atom address, country, language, topic and its voice, words that discard an item), turn on, off
  or retire, **«Test»** (one read, nothing saved: how many items it brought, how many link to the outlet itself, how many would come in and how many
  would be discarded for each reason; or the error, including «the source asks to wait N min»), the 7-day numbers (read, posted, discarded, read failures), each
  source's last error and the last 30 items read with their status and reason. Production starts with no sources.

### What happens in each case
| Case | What happens |
|---|---|
| Production, by default | Everything off. Nothing posts until someone turns it on. |
| Cost cap reached | Nothing that needs the model is posted; app-sourced posts continue (no cost). |
| Sensitive topic | Silence, logged. |
| A person already replied | No voice replies. |
| A source's address is not https, is an IP, is local or resolves to a private address | It is not saved or turned on. |
| A source redirects to another server, takes over 5 s, is over 1 MB, is not RSS/Atom or has XML with DOCTYPE or entities | That read is rejected (the sweep goes on), the error stays on the source and the wait doubles on each failure, up to a day. |
| Partisan politics, a violent incident, minors, a sensitive topic, old or no outlet link | Discarded when read, with its reason. |
| The source answers 429 or 503 with Retry-After (seconds or a date) | The sweep does not read it again before that: never before the normal wait and never more than a day. An unreadable, past or absurd value (over 30 days) is ignored. «Test» says «the source asks to wait N min» and also postpones the sweep. |
| The source is on shared hosting (wordpress.com, blogspot, substack, medium, github.io, wixsite, weebly, tumblr…) | Only a link on the SAME server as the source counts, never another blog on the same host. «Test» explains it when no item has that link. |
| The source is a feed relay (feedburner and similar) | Its links point to another server and are never accepted: nothing would be posted. «Test» says so; use the outlet's own RSS. |
| No model or cost cap reached | The post goes out with the headline in quotes instead of the summary. |
