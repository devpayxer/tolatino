# Para el abogado · For the lawyer

_Documento para el abogado de Pennsylvania. Versión: 23 nov 2026. Son preguntas, no asesoría. Español primero; la versión en inglés está completa al final, bajo «English»._

## Qué es To'Latino

- To'Latino es una plataforma para la comunidad latina en Estados Unidos, organizada por ciudad. Abrirá con cinco ciudades de Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton y Reading.
- Reúne negocios (17 categorías: comida, belleza, salud, hogar, autos, bienes raíces, iglesias, niños, eventos y más), una comunidad de vecinos y eventos con boletos.
- Los pagos con tarjeta los procesa Stripe: cada negocio cobra en su propia cuenta conectada y To'Latino se queda una comisión. Se entra con el teléfono y un código por mensaje de texto; no hay contraseña.
- Hay un sitio web, cuatro apps (vecinos, negocios, repartidores y puerta de eventos) y un asistente de inteligencia artificial llamado El Compa.
- Todavía no está abierta al público. Todo lo que sigue se construyó y se probó en un entorno de pruebas con datos de ejemplo; producción nace vacía.

## Qué se le pide

Respuestas por escrito, por número de pregunta (A-01, A-02…). Basta con «sí», «no» o «hay que cambiar X», y una línea con la razón si quiere. Si una pregunta necesita datos que no le dimos, dígalo y se los mandamos. Los 14 textos legales en borrador (español e inglés) se le mandan junto con este documento. Cuando sus respuestas lleguen como documento, las aplicamos a esos textos y a las reglas del producto; en producción, ninguna página legal se publica sin su revisión.

Estas son preguntas, no conclusiones. Donde decimos «el borrador asume» o «el plan asume», es lo que escribió el equipo sin ser abogado, y se lo mostramos para que lo confirme o lo corrija. Nada de eso es asesoría legal ni fiscal nuestra, y las cifras o plazos que cita el repositorio (un tope, un plazo) van como supuestos para que usted los confirme.

## Cómo está ordenado

Por tema. Dentro de cada tema, primero lo que bloquea abrir. Cada pregunta trae: la pregunta, qué hace hoy To'Latino (hechos), qué asumimos, qué cambiaría según su respuesta, si bloquea abrir y, en letra pequeña, de dónde sale (es para nosotros).

Bloquea abrir: «sí» = sin su respuesta no abrimos con esa parte encendida y afecta a todos; «una parte» = afecta a una función o categoría concreta, esa parte espera su respuesta y el fundador decide si abre sin ella; «no» = no impide abrir. Es una asignación nuestra: corríjala si no coincide.

## Índice de temas

| Tema | Preguntas | Bloquean abrir |
|---|---|---|
| Términos, privacidad y páginas legales | 7 (A-01 – A-07) | 6 |
| Contenido de usuarios y moderación | 6 (A-08 – A-13) | 6 |
| Dinero, cobros y devoluciones | 6 (A-14 – A-19) | 2 |
| Boletos y eventos | 5 (A-20 – A-24) | 4 |
| Salud | 2 (A-25 – A-26) | 1 |
| Menores | 3 (A-27 – A-29) | 3 |
| Vivienda | 5 (A-30 – A-34) | 3 |
| Venta de autos | 5 (A-35 – A-39) | 3 |
| Licor, vida nocturna, iglesias y transporte | 3 (A-40 – A-42) | 1 |
| Mensajes de texto y WhatsApp | 2 (A-43 – A-44) | 2 |
| Inteligencia artificial | 3 (A-45 – A-47) | 1 |
| Licencias de software y propiedad intelectual | 4 (A-48 – A-51) | 2 |
| **Total** | **51** | **34** |

## Las preguntas

### Términos, privacidad y páginas legales

#### A-01 · Revisión final de las 14 páginas

**La pregunta.** ¿Puede revisar los 14 textos legales en borrador (11 generales y 3 adendas de Pennsylvania) y devolver cada uno como «revisado» o con los cambios que pide?

**Qué hace hoy To'Latino.** Están escritos en español e inglés a partir de lo que el producto hace hoy: Términos, Privacidad, Cookies, Reglas de la Comunidad, Cómo verificamos, Votos y encuestas, Seguridad, Inteligencia artificial, Derechos de autor (DMCA), Vivienda justa y Accesibilidad, más las adendas de Pennsylvania de Términos, Privacidad y Vivienda justa. Hay 20 huecos marcados «[pendiente: …]» donde no podemos escribir solos; varios son las preguntas de este documento. La declaración de accesibilidad apunta a WCAG 2.2 nivel AA y dice con franqueza que algunos textos grises y controles aún no cumplen. En producción la plataforma no deja publicar ninguna página sin su revisión.

**Qué asumimos.** Sin supuesto sobre el contenido final. Solo asumimos que cada texto describe fielmente lo que el producto hace; si no es así, díganoslo y cambiamos el producto o el texto.

**Qué cambiaría según la respuesta.** Cada página pasa de «borrador» a «revisada por {su despacho} el {fecha}» y puede publicarse. Si pide cambios, los aplicamos y se la devolvemos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «El texto final de las 14 páginas de docs/legal/»; «Cuentas de revisión en producción (decisión I…) y textos finales de /privacidad y /terminos»._

#### A-02 · Empresa, responsabilidad, ley aplicable y arbitraje

**La pregunta.** ¿Qué deben decir los Términos sobre quién es la empresa que opera To'Latino, las garantías, el límite de responsabilidad, la indemnización, la ley aplicable, el tribunal y el arbitraje? Y si To'Latino todavía no existe como empresa, ¿qué estructura recomienda antes de abrir cuentas con Stripe, Apple y Google?

**Qué hace hoy To'Latino.** Los Términos tienen esos apartados en blanco («[pendiente: …]»). Solo dicen que cada negocio responde por lo que vende y To'Latino por lo que hace To'Latino, y que nada quita los derechos que da la ley del estado de la persona. La adenda de Pennsylvania cita la ley de protección al consumidor del estado y deja pendiente el tribunal. El repositorio no dice si To'Latino ya existe como empresa constituida ni con qué nombre legal y dirección; Stripe, Apple y Google piden esos datos.

**Qué asumimos.** Sin supuesto. Es un dato que nos falta.

**Qué cambiaría según la respuesta.** El texto de Términos (quién opera, límites, tribunal) y a nombre de quién se firman los contratos con Stripe, Apple, Google y los proveedores.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «El texto final de las 14 páginas de docs/legal/»._

#### A-03 · Qué acto obliga a aceptar Términos y Privacidad

**La pregunta.** ¿En qué momentos debe la persona aceptar expresamente los Términos y la Privacidad (registro, primera cita, reserva, boleto, compra del mercado), o basta el aviso «Al seguir aceptas…»?

**Qué hace hoy To'Latino.** La pantalla de entrada dice «Al seguir aceptas los Términos y la Privacidad de To'Latino» y no pide un toque aparte. La aceptación se anota (texto visto, versión, hora y dirección de internet; solo inserción, una vez por persona y versión) en tres lugares: al publicar un negocio, en el primer pedido de comida (al pagar) y en la hoja «Aceptar los términos nuevos». No se anota en el registro ni en la primera cita, reserva, boleto o compra del mercado. Cuando una versión nueva pide aceptar otra vez, la hoja sale en la siguiente pantalla de inicio, nunca encima de una operación en curso.

**Qué asumimos.** Sin supuesto: decidimos dejar que usted indique qué acto obliga.

**Qué cambiaría según la respuesta.** En qué pantallas añadimos el registro de aceptación, y si hace falta una casilla o un toque aparte.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Dónde más se anota la aceptación»._

#### A-04 · Privacidad: leyes estatales, brechas, órdenes legales y plazos

**La pregunta.** ¿Qué leyes de privacidad y de aviso de brechas de datos de Pennsylvania (y de otros estados donde vivan las personas) aplican a To'Latino, cómo debemos responder a una orden legal o a la petición de una autoridad, y son aceptables los plazos de conservación y el borrado de cuenta a los 30 días?

**Qué hace hoy To'Latino.** La Privacidad lista los datos que guardamos, los servicios que usamos (Stripe, Telnyx, Meta/WhatsApp, Amazon SES, Anthropic, Apple y Google; además Cloudflare delante del sitio de producción, marcado «[pendiente]»; desde el 23 nov las portadas de las categorías son fotos propias y Pexels ya no recibe nada en producción) y cuánto se guarda cada cosa (por ejemplo: búsquedas 90 días, códigos de entrada 7 días, ubicación de una entrega 14 días, analítica propia 13 meses, conversaciones con El Compa 12 meses). No vendemos datos ni hay publicidad de terceros; no pedimos estatus migratorio ni seguro social. La persona puede descargar sus datos (una vez cada 7 días) y borrar su cuenta: a los 30 días se borra lo suyo y lo que la ley o el dinero piden guardar queda sin su nombre ni teléfono. La adenda de Pennsylvania deja en blanco los plazos y a quién se avisa en una brecha; el texto sobre órdenes legales también está en blanco, y el proveedor de los servidores de producción (en EE. UU.) aún no se ha elegido.

**Qué asumimos.** El plan asume el borrado a los 30 días y la descarga de datos como defaults seguros (fase 9, §6 #9 y #10); la lista de leyes aplicables no la asumimos.

**Qué cambiaría según la respuesta.** El texto de Privacidad y de la adenda de Pennsylvania, los plazos de conservación, el procedimiento ante una brecha (manual de incidentes) y cómo atendemos una orden legal.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «El texto final de las 14 páginas de docs/legal/»._

#### A-05 · Cookies sin aviso de consentimiento

**La pregunta.** Con solo cookies propias y necesarias, ¿basta la página de Cookies, sin banner de consentimiento, según las leyes de privacidad de los estados donde abre To'Latino?

**Qué hace hoy To'Latino.** Seis cookies propias: sesión (180 días), un número al azar del navegador para la analítica propia y frenar el abuso (5 años), idioma, ciudad, la llave para abrir boletos sin señal y el código de una invitación (30 días). Además guardamos en el navegador el carrito, el borrador de «Publica tu negocio» y los boletos sin señal. No cargamos publicidad ni herramientas de seguimiento de otras empresas; la analítica es propia y no sale de To'Latino.

**Qué asumimos.** El plan asume que no hace falta banner (fase 9, §6 #12); queda marcado «[pendiente]» en la página de Cookies para que usted lo confirme.

**Qué cambiaría según la respuesta.** Dejamos la página como está, o añadimos un aviso o preferencias de consentimiento.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «El texto final de las 14 páginas de docs/legal/»._

#### A-06 · Mensajes privados: guardado y lectura por el equipo

**La pregunta.** ¿Es aceptable cómo tratamos los mensajes privados entre vecinos (se guardan; el equipo solo los lee si alguien reporta la conversación y cada lectura queda anotada), y qué deben decir los Términos y la Privacidad al respecto?

**Qué hace hoy To'Latino.** Un vecino solo puede escribir a quien lo sigue. El equipo no lee las conversaciones; solo abre una si una persona la reporta, desde la cola de moderación, y cada lectura queda anotada. Nada se borra: el equipo oculta un mensaje con motivo. Una foto elegida para un mensaje y nunca enviada se borra a las 24 horas. Al borrar la cuenta, a los 30 días se purgan sus mensajes. No hay un plazo de borrado propio mientras la cuenta exista.

**Qué asumimos.** El plan asume «lectura solo con reporte» y que los Términos y la Privacidad deben decirlo; el plazo de conservación no lo hemos fijado.

**Qué cambiaría según la respuesta.** El texto de Términos y Privacidad, un plazo de conservación para los mensajes, y si el equipo puede leer sin reporte en un caso de amenaza grave.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5c · Revisión de seguridad con abogado»._

#### A-07 · Grabación de sesiones (si algún día se hace)

**La pregunta.** Si algún día grabamos la pantalla de las personas para mejorar la web, con su consentimiento, ¿qué debe cubrir la pantalla de consentimiento y el aviso de Privacidad? ¿O recomienda no hacerlo?

**Qué hace hoy To'Latino.** No está construida. La analítica propia cuenta pantallas y errores sin grabar. La Privacidad dice hoy que no hay rastreo ni grabación. Si se hiciera, sería solo en la web y con todos los campos enmascarados, pero las pantallas llevan nombres, direcciones, mensajes y datos de salud y de niños.

**Qué asumimos.** El plan la deja sin construir hasta tener su respuesta y la decisión del fundador.

**Qué cambiaría según la respuesta.** Si se construye o no; la pantalla de consentimiento y el aviso de Privacidad.

**Bloquea abrir: no.**

_Para nosotros: LAUNCH «Grabación de sesiones (rrweb, con consentimiento)»._

### Contenido de usuarios y moderación

#### A-08 · Sección 230, moderación y Términos de la Comunidad

**La pregunta.** ¿Están bien las reglas de la Comunidad y la moderación (reportar, ocultar con aviso, apelar) para conservar la protección de la Sección 230 y la de moderación de buena fe? ¿Qué debe decir el apartado «Lo que publicas y la ley», hoy en blanco?

**Qué hace hoy To'Latino.** Seis reglas (hablar de tu ciudad, recomendar por experiencia y no el propio negocio, nada de ventas ni rifas, no publicar datos de otros, respeto, 911 para emergencias). Cualquier vecino reporta; lo reportado deja de verse para quien lo reportó y una persona lo revisa en 48 horas. Con cinco reportes de cuentas y dispositivos distintos en 24 horas se oculta mientras se revisa. Reglas automáticas (odio, estafa, inmigración, autolesión, textos repetidos) solo marcan para que una persona decida; los teléfonos, correos y números privados se frenan al escribir. Las sanciones suben de advertencia a silencio, bloqueo para publicar, suspensión y cierre. Lo oculto lo sigue viendo su autor y nada se borra. Se puede apelar una vez, hasta 14 días después, y la decide otra persona del equipo en 72 horas. Ninguna persona revisa una publicación antes de que salga (las fotos sí pasan por una revisión automática, ver A-11).

**Qué asumimos.** El borrador de Reglas dice que lo que publica cada vecino es de quien lo publica y que To'Latino lo modera pero no lo escribe. Que eso preserve las protecciones de la Sección 230 es lo que le pedimos que confirme.

**Qué cambiaría según la respuesta.** El texto de Reglas y de Términos; si hay que cambiar la moderación (por ejemplo, el auto-ocultar o los filtros) para no perder la protección. LAUNCH anota que sin esto no se abre la Comunidad.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5a · Comunidad, abogado (§3)»; «5d · Abogado: Sección 230 y DMCA §512»._

#### A-09 · Derechos de autor (DMCA §512)

**La pregunta.** ¿Qué debe cubrir el trámite de derechos de autor para que To'Latino pueda acogerse a la protección del §512 (agente designado, aviso, contraaviso, plazos, reincidentes)? ¿Quién debe figurar como agente? ¿Basta la licencia que pedimos a quien publica?

**Qué hace hoy To'Latino.** La página /dmca pide los datos del aviso (obra, dónde está, datos de contacto, declaración de buena fe y de veracidad bajo pena de perjurio, firma) y explica la contranotificación. No hay agente registrado: mientras tanto manda a Soporte con «Derechos de autor» en el asunto. No hay una cola propia de avisos: el equipo oculta con las herramientas de moderación de siempre (nada se borra: queda oculto) y avisa a quien publicó. A quien repite se le cierra la cuenta. Los plazos para volver a mostrar lo retirado tras una contranotificación están en blanco. Quien publica sigue siendo dueño de lo suyo y nos da permiso para mostrarlo, guardarlo, traducirlo y adaptarlo a cada pantalla mientras esté publicado. El registro del agente en la Oficina de Derechos de Autor tiene costo y aún no lo ha decidido el fundador.

**Qué asumimos.** Sin supuesto sobre plazos ni sobre quién es el agente.

**Qué cambiaría según la respuesta.** El texto de /dmca, quién se registra y con qué datos, si necesitamos una cola propia de avisos y la política de reincidentes.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Agente designado DMCA registrado en la Copyright Office»; «5d · Abogado: Sección 230 y DMCA §512»._

#### A-10 · Material de abuso infantil: reporte y preservación

**La pregunta.** ¿Qué protocolo debe seguir To'Latino cuando detecte o le reporten material de abuso sexual infantil (reporte al CyberTipline de NCMEC, preservación, quién lo hace y con qué acceso)?

**Qué hace hoy To'Latino.** El material se oculta al instante y se preserva con acceso restringido. Un administrador lo reporta a mano; no hay envío automático al CyberTipline. Los reportes de abuso infantil saltan al frente de la cola de moderación. No existe todavía un protocolo escrito para el equipo.

**Qué asumimos.** El plan cita la obligación de 18 U.S.C. § 2258A y la preservación; no hemos fijado un plazo de preservación.

**Qué cambiaría según la respuesta.** Un protocolo escrito para el equipo, el plazo de preservación, quién tiene acceso y si hace falta automatizar el reporte.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5d · NCMEC (abuso infantil)»; «5a · Comunidad, abogado (§3)»._

#### A-11 · Revisión automática de fotos y cuánto se guardan

**La pregunta.** ¿Es aceptable el sistema de revisión automática de fotos públicas, en particular: (a) que una foto dudosa, reducida y sin datos de quién la subió, se mande a un proveedor de IA externo para una segunda opinión; (b) que las rechazadas o retenidas se conserven sin plazo; y (c) cuánto tiempo pueden o deben conservarse esas fotos y las fotos privadas (citas, solicitudes, viajes, mensajes)?

**Qué hace hoy To'Latino.** Cuatro capas. (1) Un modelo propio, en nuestros servidores, al subir: la limpia se publica, la claramente inadecuada se rechaza y la dudosa se retiene. (2) Para las dudosas (y, mientras el modelo propio esté apagado o no responda, para cualquier foto pública nueva), una segunda opinión de un modelo de IA de Anthropic con visión: recibe solo la imagen reducida (hasta 640 px, sin metadatos) y una pauta fija; nunca fotos privadas ni quién la subió. (3) Reportes de varias cuentas distintas la ocultan sola. (4) Un negocio verificado con historial limpio se salta la segunda opinión. Si el proveedor no responde, la foto queda retenida; nunca se publica «por si acaso». Las rechazadas o retenidas se guardan y hoy no se borran nunca. Las fotos privadas de una cita, solicitud, viaje o balanza no tienen purga propia; las de una ayuda de Salud o Profesionales duran 90 días. Las fotos de mensajes sin enviar se borran a las 24 horas. Al fundador solo llegan las apelaciones.

**Qué asumimos.** Sin supuesto sobre plazos: no inventamos uno. Los borradores de Privacidad y de Inteligencia artificial (texto del 23 nov) ya dicen que la capa 2 manda una versión reducida a Anthropic, que no se difuminan caras ni textos y que las fotos privadas no se mandan; lo que Anthropic conserva y la retención cero quedan «[pendiente]» en ellos. La foto de la entrega puede ir a Stripe como evidencia de una disputa (ver Privacidad).

**Qué cambiaría según la respuesta.** El texto de Privacidad e Inteligencia artificial; si apagamos la capa 2 (tiene interruptor y tope de gasto); los plazos de purga; la relación con la preservación de A-10; y la respuesta «no compartido con terceros» del formulario de seguridad de datos de Google Play.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Plazo de retención de las fotos rechazadas o retenidas»; «Plazo de las fotos de destino privado»._

#### A-12 · Acoso y difamación en recomendaciones y reseñas

**La pregunta.** ¿Qué debe decir To'Latino sobre acoso (18 Pa.C.S. § 2709) y difamación en reseñas y recomendaciones, y es suficiente cómo tratamos los reportes?

**Qué hace hoy To'Latino.** Las reglas piden respeto, sin insultos ni acoso, y no publicar datos de otras personas. Hay motivos de reporte «acoso» y «privacidad», bloqueo mutuo e invisible y una escalera de sanciones. Una reseña tiene que contar una experiencia real con ese negocio y la «reseña verificada» exige haber usado el servicio en la app. Las amenazas saltan al frente de la cola. El texto sobre acoso y difamación en las Reglas está en blanco.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** El texto de Reglas y Términos y, si hace falta, un camino para que un negocio o una persona pida revisar una reseña.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5a · Comunidad, abogado (§3)»._

#### A-13 · Avisos de operativos de inmigración

**La pregunta.** ¿Es correcto permitir en la Comunidad avisos de operativos de inmigración (sin fotos de personas, placas ni direcciones) y mandarlos a revisión con prioridad, o debe cambiar la regla?

**Qué hace hoy To'Latino.** Se permiten sin fotos de personas, placas ni direcciones. Una lista de términos de inmigración los marca y los manda a la cola con prioridad alta por el riesgo de rumor y pánico. Señalar el estatus migratorio de una persona se trata como publicar datos de otra persona: se oculta y se sanciona. To'Latino nunca pide estatus migratorio ni seguro social.

**Qué asumimos.** Es el default del plan (fase 5, §6 #19), que pide revisarlo con usted y con el fundador antes de abrir.

**Qué cambiaría según la respuesta.** La regla en Reglas de la Comunidad, la lista de términos y el texto para el equipo.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5a · Comunidad, abogado (§3)»._

### Dinero, cobros y devoluciones

#### A-14 · To'Latino como comerciante del cobro

**La pregunta.** Dado cómo se mueve el dinero (abajo), ¿cómo debe describirse a To'Latino en los Términos y qué obligaciones tiene (declaración de pagos a terceros como el formulario 1099-K, licencias o registros por cobrar y transferir dinero de otros)?

**Qué hace hoy To'Latino.** Los pagos con tarjeta los procesa Stripe y cada negocio tiene una cuenta conectada (Stripe Connect, tipo Express). Pedidos, citas, depósitos, apartados, planes y rentas: la tarjeta se retiene al enviar, se cobra cuando el negocio acepta y el dinero va a la cuenta del negocio menos la comisión de To'Latino (valores iniciales, ajustables: pedidos y mercado 10 %, citas 8 %, apartados 6 %). Boletos: el cobro se queda en la cuenta de To'Latino y se transfiere al organizador el martes siguiente a cada fecha, menos devoluciones, disputas y comisión (5 % + $1 por boleto, que sale de lo del organizador: el precio que ve el comprador es el que paga). El primer evento de un organizador nuevo que pase de $2,000 se retiene hasta que Confianza lo revisa. To'Latino nunca guarda el número de la tarjeta, solo la marca y los últimos 4 dígitos. El efectivo o lo pagado en el local lo arregla el negocio con la persona; To'Latino no lo cobra.

**Qué asumimos.** Sin supuesto legal. Nuestra duda es si retener el pago de boletos hasta el martes cambia algo frente a cobrar directo al negocio. Hay una pregunta paralela para el contador (C-08).

**Qué cambiaría según la respuesta.** El texto de Términos y Seguridad sobre pagos; si hace falta algún registro o contrato adicional; y si cambiamos la forma de cobrar los boletos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…»._

#### A-15 · Depósito máximo en trabajos del hogar (ley HIC de PA)

**La pregunta.** ¿Es correcto limitar a un tercio el depósito de los trabajos de Hogar de más de $1,000 por la ley de contratistas de mejoras del hogar de Pennsylvania, y está bien no mostrar texto sobre esa ley a quien contrata? ¿Hay otras obligaciones (contrato escrito, registro del contratista)?

**Qué hace hoy To'Latino.** El servidor topa el depósito de un trabajo de Hogar de más de $1,000 a un tercio; la regla está en Configuración. La app no muestra texto sobre esa ley y no pide número de registro de contratista.

**Qué asumimos.** El fundador decidió no mostrar la ley; el tope de un tercio y el umbral de $1,000 son supuestos del plan que le pedimos confirmar.

**Qué cambiaría según la respuesta.** El tope y el umbral, si debe mostrarse un aviso al cliente y si exigimos un número de registro.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Ley HIC de PA (contratistas del hogar)»._

#### A-16 · Apartado con plan de pagos (layaway)

**La pregunta.** ¿Qué requisitos tiene en Pennsylvania (y en Nueva Jersey y Nueva York, si se abren) el apartado con plan de pagos de las Tiendas, y qué máximo de cargo por cancelación debe permitirse?

**Qué hace hoy To'Latino.** Solo artículos «en plan» de tiendas que activan el plan. Antes de pagar, la persona acepta un acuerdo por escrito (total, abono, número y fechas de pagos, sin intereses) que se guarda sin poder cambiarse (texto, hora, dirección de internet y versión). El primer abono se retiene y se cobra cuando la tienda confirma que tiene el artículo; cada pago se hace en la app, con la persona presente, o en la tienda. Un pago atrasado se marca desde el día siguiente; con 14 días de atraso la tienda puede cancelar el plan y la persona puede cancelar cuando quiera. Se devuelve lo abonado menos un cargo (10 % de fábrica, tope 10 %). Se recoge en la tienda, sin envío.

**Qué asumimos.** El plan asume que el acuerdo escrito y aceptado es la red de seguridad hasta verificar la ley de cada estado.

**Qué cambiaría según la respuesta.** El tope del cargo por estado, el aviso por escrito y la forma de devolver.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «Layaway (4r) — leyes por estado sin verificar»._

#### A-17 · Monedas sin valor y cupones

**La pregunta.** Las monedas de la Comunidad (sin valor en dinero) y los cupones que los negocios dan a cambio, ¿caen bajo leyes de tarjetas de regalo, de bienes no reclamados o de sorteos? ¿Qué debe decir el texto?

**Qué hace hoy To'Latino.** Se ganan: +100 de bienvenida y premios del mes por la Tabla del Barrio (300, 200 y 100 monedas), sin comprar nada. No se compran, no se venden, no se transfieren, no se cambian por dinero y no vencen. Se gastan en cupones que cada negocio decide dar; el cupón se canjea en el local. To'Latino no le paga ni le cobra al negocio por el canje (solo le manda un reporte mensual). Un código vencido sin usar devuelve las monedas. Sin premios en dinero ni sorteos (decisión G).

**Qué asumimos.** El plan asume que sin compra no es sorteo y que sin valor en dinero no es tarjeta de regalo; se lo pedimos para confirmarlo.

**Qué cambiaría según la respuesta.** El texto «Sin valor en dinero · no se compran, no se venden, no se transfieren, no vencen» en los Términos de la Comunidad y si algo debe vencer.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «5g · Abogado: monedas sin valor en dinero y cupones»._

#### A-18 · Compras externas en las apps de las tiendas

**La pregunta.** Con las reglas de EE. UU. sobre enlaces a compras externas desde apps (caso Epic, 2025), ¿pueden las apps ofrecer o enlazar el plan Pro, hoy ausente?

**Qué hace hoy To'Latino.** Pro no se ofrece ni se enlaza en las cuatro apps (regla 3.1.3(f) de Apple). Se contrata en la web con tarjeta: $14.99 al mes, o el año por el precio de 10 meses; la prueba de 30 días no pide tarjeta. La regla se volverá a leer el día del envío a las tiendas.

**Qué asumimos.** Las apps salen sin Pro.

**Qué cambiaría según la respuesta.** Si las apps pueden ofrecer o enlazar Pro. No afecta a la web.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «Reglas de EE. UU. sobre enlaces a compras externas»._

#### A-19 · Profesionales: cobrar en la app

**La pregunta.** Antes de encender cobros en la app para los Profesionales, ¿qué impide o permite la ley para (a) abogados (honorarios compartidos con quien no es abogado, cuenta fiduciaria IOLTA), (b) reparación de crédito (CROA: no cobrar antes de terminar), (c) remesas, cambio de cheques, fianzas y seguros (licencias propias) y (d) los demás (reparación, imprenta, digital, construcción)?

**Qué hace hoy To'Latino.** Hoy nada de Profesionales se cobra en la app. La consulta se registra, el total queda por escrito, la persona lo acepta y se paga en la oficina: sin tarjeta y sin comisión. Existe un interruptor por tipo, apagado, para los que no son de derecho.

**Qué asumimos.** Apagado hasta su respuesta; sin supuesto legal.

**Qué cambiaría según la respuesta.** Si se enciende el cobro para algún tipo, y con qué condiciones.

**Bloquea abrir: no.**

_Para nosotros: LAUNCH «Pro · cobrar en la app (4l)»._

### Boletos y eventos

#### A-20 · Cancelación y devolución del comprador

**La pregunta.** ¿Es válida la política de que el comprador cancele hasta 24 horas antes con devolución del precio menos el cargo de servicio, y cómo debe aparecer en los Términos?

**Qué hace hoy To'Latino.** El comprador cancela hasta 24 horas antes del evento (configurable) y se le devuelve el precio menos el cargo de servicio (5 % + $1 de esos boletos, que ya va incluido en el precio mostrado). Después ya no hay devolución y solo se puede transferir (ver A-21). En eventos 18+ o 21+ se dice antes de pagar que sin identificación en la puerta no se entra y sin devolución. Un evento benéfico no cobra donaciones en la app. La política se muestra antes de pagar y es parte de los Términos para esa compra.

**Qué asumimos.** Las 24 horas y el cargo son defaults del plan (fase 6, §6 #6), ajustables.

**Qué cambiaría según la respuesta.** Las horas, qué cargo se retiene y el texto en los Términos versionados.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6d · Abogado: política de cancelación del comprador»._

#### A-21 · Reventa de boletos

**La pregunta.** ¿Qué dice la ley de reventa de boletos de Pennsylvania y cómo afecta a la transferencia entre personas y a los límites de compra?

**Qué hace hoy To'Latino.** No hay mercado de reventa. Un boleto solo se puede transferir a un teléfono, sin precio (la pantalla no tiene campo de precio), hasta 2 horas antes; el boleto anterior queda anulado y nace uno nuevo a nombre de quien lo recibe; hay un tope de transferencias al día por persona. Se compran hasta 10 boletos por orden y 20 por persona y fecha (cuenta, dispositivo y tarjeta juntos; el organizador puede bajarlo). No hay venta en la puerta. El precio lo fija el organizador. To'Latino no puede ver si dos personas se arreglan por fuera.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Los topes de compra y de transferencia, un aviso en los Términos y cualquier prohibición que haya que añadir.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6c · Abogado: ley de reventa de boletos de PA…»; «6d · Abogado: política de cancelación del comprador»._

#### A-22 · Organizador que cancela o cambia la fecha

**La pregunta.** ¿Son aceptables las reglas cuando el organizador cancela o cambia la fecha (devolución total sin comisión; si la persona no contesta un cambio de fecha, se queda con la nueva fecha) y cómo deben aparecer en los Términos?

**Qué hace hoy To'Latino.** Si se cancela una fecha o el evento, cada orden se devuelve al 100 %, sin cobrar la comisión; el costo de la tarjeta lo absorbe To'Latino; se avisa por mensaje de texto. Si se cambia la fecha o la hora, quien compró antes elige hasta el nuevo inicio «Me quedo» o «Devolución total»; si no contesta, se queda con la nueva fecha. Dos cancelaciones del mismo organizador en 90 días abren un caso de revisión. Una devolución que falla se reintenta con la misma llave hasta que pase.

**Qué asumimos.** «Sin respuesta, se queda» es un default del plan (fase 6, §6 #21), que pide su confirmación.

**Qué cambiaría según la respuesta.** Si «se queda» debe pasar a «se devuelve», el texto de Términos y los avisos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6e · Abogado: To'Latino como comerciante del cobro…»._

#### A-23 · Impuesto de diversiones por ciudad

**La pregunta.** ¿Alguna de las cinco ciudades (Hazleton, Allentown, Wilkes-Barre, Scranton, Reading) o el estado cobra un impuesto sobre boletos de diversiones, y quién debe cobrarlo y pagarlo: el organizador o To'Latino?

**Qué hace hoy To'Latino.** Los boletos se venden con la línea de impuesto en 0 %. El organizador fija el precio y el cargo de servicio sale de su parte; To'Latino no calcula ni paga impuesto de diversiones. El precio mostrado incluye los cargos (todo incluido).

**Qué asumimos.** Sin supuesto. Hay una pregunta paralela para el contador (C-10).

**Qué cambiaría según la respuesta.** Si hay que cobrar un impuesto por ciudad sobre boletos, quién lo paga y cómo se muestra.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…»._

#### A-24 · Evento privado en un restaurante: política de cancelación

**La pregunta.** ¿Es válida la política de cancelación del evento privado (gratis hasta 72 horas antes; después el depósito se queda con el restaurante; si cancela el restaurante, devolución completa) y cómo se escribe dentro de los Términos versionados?

**Qué hace hoy To'Latino.** Es la solicitud de un grupo a un restaurante: el restaurante propone con precio, la persona acepta y paga un depósito que llega directo al restaurante. La propuesta vale 24 horas. El impuesto de la ciudad se calcula sobre el total. Los Términos ya dicen que la política que cada operación muestra antes de enviarla es parte de ellos; el texto de esta política dentro de los Términos falta.

**Qué asumimos.** Los plazos y el depósito son defaults del plan (fase 6).

**Qué cambiaría según la respuesta.** El texto de la política en los Términos y los plazos.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «6i · Términos y políticas»._

### Salud

#### A-25 · HIPAA: ¿somos «business associate» de los consultorios?

**La pregunta.** ¿Es To'Latino un «business associate» de los consultorios, o basta con la forma en que minimizamos los datos? Si lo es, ¿qué contratos y controles hacen falta?

**Qué hace hoy To'Latino.** Salud no cobra ni pide tarjeta. El motivo de la cita se guarda solo como una clave, no como texto libre; la nota opcional se cifra y se borra a los 30 días de la cita; el seguro se guarda con 4 dígitos; los avisos no dicen el consultorio ni el motivo. No hay datos de salud en la analítica ni en El Compa (que tampoco los pide). No se ofrecen historial, resultados ni archivos médicos. Según el plan, no hay videollamadas: el consultorio pega su propio enlace.

**Qué asumimos.** El plan asume que minimizar los datos es la defensa; sin verificar.

**Qué cambiaría según la respuesta.** Un contrato de socio comercial y avisos de brecha, o dejar de recoger algún dato.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Salud · HIPAA (4j)»._

#### A-26 · Lista de términos de salud en reseñas

**La pregunta.** ¿Quién debe revisar la lista de términos de salud que impide publicar en una reseña (diagnósticos y medicinas), y qué criterio debe usarse? No es una pregunta legal: la incluimos porque el plan la asocia a esta consulta.

**Qué hace hoy To'Latino.** El filtro de reseñas frena términos de salud privados con una lista corta de diagnósticos y medicinas comunes. El plan pide ampliarla con una lista revisada por alguien del sector salud y medir los falsos positivos con reseñas reales.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** A quién se la encargamos y con qué criterio.

**Bloquea abrir: no.**

_Para nosotros: LAUNCH «La lista de términos de PRIVADO (lib/resenas-filtro.ts)»._

### Menores

#### A-27 · Edad mínima: 18+ y COPPA

**La pregunta.** ¿Es suficiente pedir la declaración «tengo 18 años o más» para entrar a la Comunidad, sin fecha de nacimiento? ¿Qué edad mínima debe tener una cuenta para el resto de la app (pedidos, citas, boletos)? ¿Qué obligaciones nacen si usan To'Latino menores de 13 sin que los busquemos (COPPA)?

**Qué hace hoy To'Latino.** La Comunidad pide declarar 18 años o más al entrar; no se pide ni se verifica fecha de nacimiento. El resto de la app no pide edad: entra cualquier teléfono que reciba el código. Los Términos tienen en blanco la edad mínima de la cuenta. En eventos 18+ o 21+ la puerta pide identificación y se dice antes de pagar. Las apps declaran a Apple una clasificación por edad que se espera 17+ (contenido de usuarios, referencias a alcohol); se revisa el día del envío. Los datos de un niño solo entran por una inscripción hecha por su madre, padre o tutor.

**Qué asumimos.** El plan asume 18+ por declaración y que abrir a 13–17 sería otra decisión (COPPA).

**Qué cambiaría según la respuesta.** El texto de Términos, si pedimos edad o fecha de nacimiento, y la clasificación por edad en las tiendas.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5c · Revisión de seguridad con abogado»; «Clasificación por edad de Apple»._

#### A-28 · ChildLine y deber de reportar

**La pregunta.** ¿Qué debe hacer To'Latino si recibe un reporte de maltrato de un niño (por ejemplo, en «No cuidaron bien a mi niño»)? ¿Es correcto el número de ChildLine de Pennsylvania que mostramos?

**Qué hace hoy To'Latino.** El texto fijo dice: «Si un niño corre peligro, llama al 911. Si sospechas maltrato o abuso, llama a ChildLine de Pennsylvania: 1-800-932-0313». Ese número no está verificado. El caso va directo a To'Latino, sin pasar por el lugar, a una cola «Cuidado de niños» con plazo de 4 horas. No hay un protocolo escrito. Los textos y registros de las licencias del DHS, escuelas, CDL y PennDOT tampoco están verificados.

**Qué asumimos.** Sin supuesto sobre obligaciones de reporte.

**Qué cambiaría según la respuesta.** El número, el protocolo del equipo, qué se reporta y a quién, y los textos de las licencias.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Niños · ChildLine y obligaciones de reporte»._

#### A-29 · Cuidado de niños: protocolo de Soporte y lo que se promete

**La pregunta.** ¿Qué protocolo escrito debe seguir Soporte con un caso de cuidado de niños (llamar al lugar, ChildLine, plazo de 4 horas) y qué podemos prometer sobre un lugar con licencia, una niñera y las fotos de niños?

**Qué hace hoy To'Latino.** Una guardería o cuidado en casa sin licencia vigente puede publicar con «No tiene licencia del estado» o «Licencia en trámite», pero no recibe solicitudes por la app. Niñeras y nanas: solo contacto, nunca reserva por la app, y la ficha no promete revisión de antecedentes. De un niño guardamos nombre de pila, edad o grado y, si lo recogen, la escuela, cifrados; solo los ve su madre, padre o tutor y el lugar; se borran 30 días después de que termina. No hay fotos de niños en mensajes; las fotos públicas de un negocio de Niños llevan el aviso de no subir la cara de un niño sin permiso escrito de sus padres.

**Qué asumimos.** Son defaults del plan (fase 4 Niños, §6 #6 al #10); el plan pide revisar con usted lo de las fotos y los reportes.

**Qué cambiaría según la respuesta.** El protocolo, lo que la ficha puede decir, el aviso de fotos y los plazos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Cuidado de niños · protocolo»._

### Vivienda

#### A-30 · Vivienda justa: frases, pie y excepciones

**La pregunta.** ¿Son suficientes la lista de frases prohibidas (ES/EN), el pie «Igualdad de oportunidad en la vivienda» con la nota de animales de servicio y de apoyo, la excepción de vivienda para mayores de 62 (HOPA) y la de compañeros de cuarto? ¿Debe llevar el logo de Equal Housing Opportunity? ¿Cubre la Pennsylvania Human Relations Act y las ordenanzas locales sobre fuente de ingreso y Section 8? ¿Es válido anunciar los papeles que se aceptan («Sin seguro social», «Con ITIN»)? ¿A qué oficinas debe mandar las quejas la página (HUD y la Pennsylvania Human Relations Commission)?

**Qué hace hoy To'Latino.** Al guardar un anuncio se revisan el nombre, la descripción, lo que se pide, el contrato y los otros pagos contra una lista de unas 30 frases de fábrica en español e inglés («sin niños», «solo adultos», «ideal para pareja», «solo cristianos», «para hispanos», «no Section 8»…) que el Super Admin puede ampliar. Si salta una frase, el anuncio no se guarda y dice cuál quitar. No hay filtros ni campos sobre quién vive; Section 8 solo se puede aceptar. Se anuncian los papeles que se aceptan, nunca a quién. Un anuncio «para mayores de 62» exige confirmar la excepción, nace «por revisar» y abre un caso. Los animales de servicio y de apoyo se aceptan siempre. En un cuarto compartido, la dirección exacta solo llega a la visita confirmada. Las páginas de Vivienda justa nombran a la Pennsylvania Human Relations Commission y dejan en blanco cómo contactarla y a dónde quejarse ante HUD.

**Qué asumimos.** El plan marca la lista y los textos como sin verificar con un abogado.

**Qué cambiaría según la respuesta.** La lista de frases, el pie, el logo, el texto de la página de Vivienda justa y su adenda de Pennsylvania.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ib · Vivienda justa: revisar con un abogado la lista de frases»; «4id · Pie de vivienda justa y nota de animales de servicio»._

#### A-31 · Cola de vivienda justa: protocolo del equipo

**La pregunta.** ¿Qué protocolo escrito debe seguir el equipo cuando un texto frenado por la lista puede ser un error de buena fe y cuándo debe tratarse como advertencia? ¿Qué se revisa en una declaración de vivienda para mayores bajo HOPA? ¿Cuál es la escalera después de la advertencia?

**Qué hace hoy To'Latino.** Los casos llegan a una cola propia. La declaración de vivienda para mayores nace «por revisar» y el anuncio se oculta si el negocio no la confirma. Después de una advertencia, suspender va por la ficha del negocio en el Super Admin, sin pasos definidos.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** El protocolo, los plazos y la escalera de sanciones.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ig · Colas › Vivienda justa»._

#### A-32 · Depósito de renta y cuota de solicitud

**La pregunta.** ¿Es correcto limitar el depósito a 2 meses de renta y la cuota de solicitud a $100 en los anuncios?

**Qué hace hoy To'Latino.** El servidor rechaza un depósito de más de 2 meses de renta y una cuota de solicitud de más de $100 (en dólares enteros). La ficha muestra «Para mudarte» con todo lo que se paga y la regla «Nada fuera de lo publicado».

**Qué asumimos.** El plan asume el tope de 2 meses de renta el primer año y 1 mes desde el segundo (Landlord and Tenant Act); hoy el servidor aplica solo los 2 meses. No sabemos si la cuota de solicitud tiene tope.

**Qué cambiaría según la respuesta.** Los topes que aplica el servidor y el texto de la ficha.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ib · Depósitos en PA»._

#### A-33 · Cuota mensual estimada de una casa

**La pregunta.** ¿Es suficiente el texto «estimada» y las constantes de referencia (tasa 6.75 %, 360 meses, seguro e impuestos 2.5 % anual) para mostrar la cuota mensual estimada de una casa en venta, bajo las reglas de publicidad de crédito (Regulation Z)? ¿Quién debe mantenerlas al día?

**Qué hace hoy To'Latino.** La ficha de una casa en venta muestra una cuota estimada calculada con esas constantes de referencia (que están en el código) y el enganche elegido, con la palabra «estimada». To'Latino no ofrece ni intermedia crédito.

**Qué asumimos.** Sin supuesto; el plan pide revisar el texto con usted.

**Qué cambiaría según la respuesta.** Las constantes, el texto o si se oculta la cuota, y quién las actualiza.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ib · Cuota estimada»._

#### A-34 · Sellos de licencias de Bienes Raíces

**La pregunta.** ¿Son correctos los emisores, los registros públicos y los textos «puede / no puede» de los sellos de corredor de Pennsylvania, NMLS, avaluador e inspector de vivienda?

**Qué hace hoy To'Latino.** Los sellos no bloquean nada. Una persona del equipo busca la licencia en el registro oficial y la marca verificada (con fecha), vencida o «no aparece»; se vuelve a revisar cada 3 meses. Cada sello muestra el emisor, el número y lo que permite y no permite; el enlace sale de nuestra lista, no de lo que escribe el negocio.

**Qué asumimos.** Los emisores y los enlaces están sin verificar (plan).

**Qué cambiaría según la respuesta.** Los emisores, los enlaces y los textos.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ib · Licencias de Bienes Raíces»._

### Venta de autos

#### A-35 · Buyers Guide y garantía

**La pregunta.** ¿Coinciden «Se vende como está» y la garantía del dealer en la app con la Buyers Guide de la ventana (FTC Used Car Rule)? ¿La ficha debe enlazar la Buyers Guide de cada carro?

**Qué hace hoy To'Latino.** El dealer elige en la ficha entre «Se vende como está», garantía del dealer (por meses) y garantía de fábrica. El panel le avisa que lo que diga tiene que ser lo mismo que la Buyers Guide de la ventana del carro. La ficha muestra «Se vende como está: pide que tu mecánico lo revise antes de firmar». To'Latino no guarda el contrato ni la Buyers Guide.

**Qué asumimos.** Sin supuesto; la coincidencia depende de lo que declare cada dealer.

**Qué cambiaría según la respuesta.** Los textos, si enlazamos o pedimos una copia de la Buyers Guide, y las obligaciones del dealer en los Términos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ic · Buyers Guide (FTC Used Car Rule)»._

#### A-36 · Pago de ejemplo y «compre aquí, pague aquí»

**La pregunta.** ¿Cumple la publicidad de crédito (Regulation Z) el pago de ejemplo (enganche, meses, tasa, «estimado, sujeto a aprobación», total de pagos), el de «compre aquí, pague aquí» y la decisión de no mostrar enganche ni pago en la tarjeta del buscador? ¿Son correctos los topes de tasa de la Motor Vehicle Sales Finance Act de Pennsylvania?

**Qué hace hoy To'Latino.** El servidor calcula el pago de ejemplo con el enganche, los meses y la tasa que declara el dealer, sobre el total en la puerta, y siempre lo llama «estimado, sujeto a aprobación», con el total de pagos. Para «compre aquí, pague aquí» muestra el total pagado y la tasa que resulta. La tarjeta del buscador no muestra enganche ni pago. El servidor deja una tasa de 0 a 30 %. To'Latino no guarda el contrato.

**Qué asumimos.** El tope de tasa de 0–30 % es un valor puesto por el equipo, sin verificar.

**Qué cambiaría según la respuesta.** Los textos del pago, el tope de tasa y qué se muestra en el buscador.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ic · Regulation Z (publicidad de crédito)»._

#### A-37 · Tope del cargo del dealer

**La pregunta.** ¿Cuál es el valor vigente de este año del tope del cargo del dealer (documentary fee), con trámite electrónico y sin él, y quién debe actualizarlo cada año?

**Qué hace hoy To'Latino.** El tope vive en Catálogo › Cargo del dealer y hoy dice $477, marcado «a verificar». La app no deja que un dealer ponga un cargo mayor. Si el cargo y las placas pagan impuesto es una pregunta para el contador (C-06).

**Qué asumimos.** El valor de $477 es un supuesto del equipo.

**Qué cambiaría según la respuesta.** El valor del tope y quién lo cambia cada año.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «4ic · Tope del cargo del dealer de PA»._

#### A-38 · Sellos de licencias de Venta de Autos

**La pregunta.** ¿Son correctos los emisores, los registros públicos y los textos «puede / no puede» de los sellos de dealer y vendedor de autos de Pennsylvania, venta a plazos (Department of Banking and Securities, ¿en NMLS?) y NMLS del dealer?

**Qué hace hoy To'Latino.** Los sellos no bloquean nada. El equipo revisa a mano en el registro público y marca verificada, vencida o «no aparece»; cada sello muestra el emisor, el número y lo que permite y no permite.

**Qué asumimos.** Los emisores y enlaces están sin verificar (plan).

**Qué cambiaría según la respuesta.** Los emisores, los enlaces y los textos.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ic · Licencias de Venta de Autos»._

#### A-39 · Prueba de manejo en casa: seguro y responsabilidad

**La pregunta.** ¿Quién responde por el seguro y la responsabilidad de una prueba de manejo en casa del cliente (quién maneja, seguro del dealer), y qué debe decir To'Latino antes de aceptarla?

**Qué hace hoy To'Latino.** El cliente pide una prueba en su casa; el dealer no ve la dirección hasta que se confirma y cada vez que se abre queda anotado. No se comprueba que la dirección esté dentro del área del dealer. Seguro y responsabilidad no están definidos.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Un texto antes de aceptar, requisitos para el dealer o quitar la función.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ie · Prueba de manejo en casa»._

### Licor, vida nocturna, iglesias y transporte

#### A-40 · Licor y vida nocturna (PLCB)

**La pregunta.** ¿Hace falta algo más que el sello de la licencia de licor (hookah, locales abiertos después de las 2 AM, promotores)? ¿Es correcto cómo manejamos los depósitos de mesa y el caso «no entró: sin identificación»?

**Qué hace hoy To'Latino.** El sello «Licencia de licor (PLCB)» se ve en la ficha del local y no bloquea nada. La app no vende alcohol, botellas ni hookah (un guardián lo impide, también en extras de eventos); la mesa con consumo mínimo sí: el consumo se paga en el local. Según el plan, los productos de 21+ (licor, tabaco, vape) solo se muestran en el catálogo de una tienda, sin pedirlos ni apartarlos por la app. El depósito de una mesa se retiene al enviar y se cobra al confirmar; si no confirman, se libera. Si la persona no entra por no mostrar identificación, cuenta como «no llegó» y el depósito se queda con el local (se dice antes de pagar). La app no pide fecha de nacimiento ni guarda la imagen de una identificación.

**Qué asumimos.** La lista legal está sin verificar (plan).

**Qué cambiaría según la respuesta.** Qué sello o aviso falta, si el depósito puede quedarse el local por la identificación y los textos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Noche · licencia de licor (PLCB)»._

#### A-41 · Iglesias y funerarias

**La pregunta.** ¿Son correctos los textos y registros de funeraria (State Board of Funeral Directors de Pennsylvania), representante acreditado ante EOIR y organización 501(c)(3) (IRS)? ¿Aplica la Funeral Rule de la FTC (lista general de precios por escrito)? ¿Necesita aviso el «plan de pagos hasta 12 pagos»?

**Qué hace hoy To'Latino.** Una funeraria solo recibe contacto (llamar o WhatsApp), con su lista de precios por escrito y su plan de pagos como texto; no hay cita ni cobro en la app. En Iglesias nada se cobra en la app; diezmo, ofrenda y donativo en línea no se construyen. La orientación migratoria solo se ofrece con el sello de EOIR vigente; sin sello dice «Pregunta si tienen un representante acreditado». Textos fijos «No es consejo legal» y la línea 988.

**Qué asumimos.** Sin supuesto; el plan marca los sellos como sin verificar.

**Qué cambiaría según la respuesta.** Los textos, los registros y qué debe mostrar la ficha de una funeraria.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ia · Iglesias · sellos y ley»._

#### A-42 · Licencias de Transporte y Fiestas

**La pregunta.** ¿Es correcta la lista de autorizaciones que el sistema exige por tipo de servicio de Transporte (PUC de Pennsylvania para taxi, aeropuerto, limosina y party bus; USDOT y MC entre estados; CDL; envíos al extranjero) y es correcto no dejar reservar en la app sin la autorización válida? ¿Y los sellos de Fiestas (inflables, alimentos)?

**Qué hace hoy To'Latino.** Un negocio de Transporte solo recibe reservas en la app si tiene válida la autorización de su tipo; en revisión, la ficha dice «está en revisión: por ahora se reserva llamando». Según el plan, en Fiestas las licencias son sellos que no bloquean, salvo limosina y party bus (misma regla que Transporte). El equipo marca cada licencia verificada, vencida o «no aparece» con el registro público. La lista legal está sin verificar.

**Qué asumimos.** El plan asume que la lista por tipo es provisional y pide revisarla con usted; la línea correspondiente falta en nuestra lista de pendientes y la estamos añadiendo.

**Qué cambiaría según la respuesta.** La lista de autorizaciones por tipo y si bloquear o solo avisar.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: pregunta nueva de este documento, sin línea en LAUNCH todavía._

### Mensajes de texto y WhatsApp

#### A-43 · Mensajes de texto: consentimiento, STOP/HELP y registro 10DLC

**La pregunta.** ¿Basta el aviso «Al seguir aceptas…» al pedir el código de entrada, el registro de aceptación y la respuesta STOP/HELP para cumplir la TCPA y el registro 10DLC de los operadores, para (a) el código de entrada, (b) los avisos de pedidos, citas y boletos, (c) el mensaje único de «avísame cuando abra tu zona» y (d) las novedades de To'Latino (apagadas de fábrica)? ¿Qué debe decir el texto de consentimiento que hoy está en blanco en los Términos?

**Qué hace hoy To'Latino.** Para entrar se escribe el teléfono y llega un código por mensaje de texto; esa pantalla no menciona tarifas ni STOP/HELP, solo «Al seguir aceptas los Términos y la Privacidad». Los avisos de un pedido, cita o boleto salen al teléfono verificado; cada tipo se apaga en Mi cuenta › Avisos; entre las 10 PM y las 7 AM (hora de la ciudad) no salen, salvo los críticos. Quien responde STOP queda de baja y ya no recibe mensajes de texto (el aviso sigue dentro de la app). Las novedades de To'Latino vienen apagadas. La lista de espera manda un solo mensaje el día que abre la zona y la persona puede quitarse. El proveedor es Telnyx; el registro de marca y campañas (con STOP/HELP) lo hace el fundador y Claude deja listos los textos.

**Qué asumimos.** Sin supuesto legal. El texto de consentimiento queda marcado «[pendiente]» en los Términos.

**Qué cambiaría según la respuesta.** El texto de la pantalla de entrada y de los Términos, el texto de las campañas 10DLC y qué mensajes pueden salir.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «7h · Para el abogado: TCPA / 10DLC»; «El mensaje de texto que promete la landing»._

#### A-44 · WhatsApp Business

**La pregunta.** ¿Cumple la política de WhatsApp Business (consentimiento previo, ventana de 24 horas, plantillas aprobadas, IA que se presenta) lo que hacemos? ¿Está bien el aviso de que el texto pasa por Telnyx, Meta y el proveedor de IA?

**Qué hace hoy To'Latino.** «Hablar con El Compa por WhatsApp y SMS» viene apagado; la persona lo enciende en Mi cuenta › Avisos y solo funciona con su teléfono verificado. El primer mensaje dice que es el asistente de IA y cada mensaje de salida recuerda STOP. Las 8 plantillas de WhatsApp aún no se han mandado a aprobar a Meta. En producción, WhatsApp encendido y el canal de mensaje de texto de El Compa apagado. Telnyx y Meta pueden mandar su propia confirmación de STOP; dejaremos una sola.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** El texto de consentimiento y de aviso, las plantillas y si el canal puede empezar un mensaje.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «7h · Para el abogado: TCPA / 10DLC»._

### Inteligencia artificial

#### A-45 · Aviso de IA en Términos y Privacidad

**La pregunta.** ¿Es suficiente el aviso de que El Compa es una IA que puede equivocarse, que su texto (ya tapado) se procesa con Anthropic en EE. UU., que se guarda 12 meses y que solo lo lee el equipo con permiso? ¿Qué piden las leyes sobre avisos de IA en los estados donde abre?

**Qué hace hoy To'Latino.** El Compa siempre dice que es una IA y la opción «Con una persona» está siempre a la vista. No da consejo legal, médico ni de inmigración y no pide estatus ni datos de salud. Ve el nombre de pila, el idioma, la ciudad y las operaciones recientes de la persona; no ve sus mensajes con otros vecinos, su teléfono, su dirección, su tarjeta, sus citas de salud ni los datos de sus niños. Antes de guardar y de mandar a la IA se tapan números de tarjeta, códigos de seguridad, seguro social, número A de inmigración, códigos de verificación, contraseñas y cuentas de banco; lo demás que escribe la persona (un nombre, un teléfono, una dirección) no se tapa. Las conversaciones se guardan 12 meses; solo las leen administradores y Soporte con permiso, y cada lectura queda anotada; el negocio nunca las ve. Se pedirá a Anthropic retención cero para producción; si no la dan, se dirá en Privacidad. Hay un tope mensual de gasto (decisión F).

**Qué asumimos.** Sin supuesto sobre qué piden las leyes de cada estado; el texto queda marcado «[pendiente]» en la página de Inteligencia artificial.

**Qué cambiaría según la respuesta.** El texto de Términos, Privacidad e Inteligencia artificial, y el plazo de conservación.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Abogado: aviso de IA en Términos y Privacidad»; «Retención cero (ZDR)…»._

#### A-46 · Respuestas automáticas en nombre de un negocio

**La pregunta.** ¿Qué responsabilidad tiene el negocio, y cuál To'Latino, por las respuestas automáticas de El Compa en nombre de un negocio y por lo que el dueño escribe en «Lo que El Compa debe saber»?

**Qué hace hoy To'Latino.** Es solo para negocios Pro y viene apagado; lo enciende el negocio. Cuando el negocio está cerrado, El Compa contesta a sus clientes con lo que dice su página. Empieza diciendo que es el asistente de IA del negocio, nunca promete ni confirma por el negocio y pasa a una persona lo que no sabe. El mensaje del cliente y la página del negocio pasan por el mismo proveedor de IA.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Un texto de responsabilidad en los Términos de negocios, el aviso al cliente o dejar la función apagada.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «7f · Para el abogado: respuestas automáticas»._

#### A-47 · Borradores de respuesta para Soporte

**La pregunta.** ¿Necesita aviso o base especial que el texto de un caso de Soporte (tapado, sin teléfono ni correo) y las notas internas del equipo se procesen con Anthropic en EE. UU. cuando el equipo pide un borrador?

**Qué hace hoy To'Latino.** El equipo puede pedirle a El Compa un borrador de respuesta. Al proveedor de IA llega el texto del caso, tapado y sin teléfono ni correo, y las notas internas. El borrador nunca llega solo a la persona: alguien del equipo lo lee, lo corrige y lo envía con su nombre. Nunca devuelve dinero ni decide el caso. La ayuda «privacidad de El Compa» ya lo dice.

**Qué asumimos.** Va junto con la retención cero y el aviso de IA (A-45).

**Qué cambiaría según la respuesta.** El texto de Privacidad y si hace falta un aviso a quien abre un caso.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «7g · Para el abogado y Privacidad»._

### Licencias de software y propiedad intelectual

#### A-48 · LibreTranslate (AGPL-3.0) y los modelos de traducción

**La pregunta.** ¿Cumplimos la AGPL-3.0 corriendo LibreTranslate sin modificar, como servicio aparte que solo usa nuestra app? ¿Qué cambiaría si algún día lo modificamos o lo exponemos al público (§13)? ¿Y las licencias de cada modelo Argos (español a inglés, inglés a español) y de MiniSBD? ¿Vale el aviso «traducción automática; vale el original»?

**Qué hace hoy To'Latino.** Corre la versión 1.9.6 sin modificar, en una red interna sin salida a internet y sin puertos hacia afuera; solo la app habla con él. Los modelos Argos se bajan una vez a un volumen. La persona ve el botón «Ver traducción» sobre lo publicado; ningún texto sale de nuestros servidores. Fue una decisión del fundador construir lo propio en vez de pagar un traductor (decisión O).

**Qué asumimos.** Que correrlo sin modificar y sin exponerlo basta. El plan dice que los modelos «se publican con licencias abiertas (a confirmar modelo por modelo)».

**Qué cambiaría según la respuesta.** Si cumplimos como estamos, si hay que publicar algo, si cambiamos de traductor o añadimos el aviso en los Términos.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5h · Abogado: LibreTranslate es AGPL-3.0»._

#### A-49 · Modelo de revisión de fotos (NudeNet y pesos entrenados con YOLOv8)

**La pregunta.** ¿Podemos usar el detector NudeNet 3.4.2 (licencia MIT según su paquete) si sus pesos se entrenaron con YOLOv8, sobre el que Ultralytics reclama la AGPL-3.0 para pesos entrenados con su código? ¿O debemos cambiar de modelo antes de producción?

**Qué hace hoy To'Latino.** Corre en nuestros servidores, sin modificar, como servicio interno; los pesos vienen dentro del paquete. Su resultado solo marca fotos para que se retengan o se rechacen (ver A-11).

**Qué asumimos.** El paquete declara MIT; la duda es la procedencia de los pesos.

**Qué cambiaría según la respuesta.** Si seguimos con este modelo o buscamos otro con licencia clara.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «5d · Licencia del modelo de fotos»._

#### A-50 · Las demás piezas de código abierto

**La pregunta.** ¿Quiere que le mandemos un inventario de las demás piezas de código abierto que corren en nuestros servidores o van dentro de las apps, para que revise sus licencias?

**Qué hace hoy To'Latino.** Además de las dos anteriores corremos una base de datos PostgreSQL con PostGIS, un almacén de archivos compatible con S3 (Garage), un servidor de mapas, el procesamiento de video con ffmpeg y las bibliotecas de la web y de las apps. Solo hemos anotado la licencia de LibreTranslate y de NudeNet; las demás no las hemos revisado una por una.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Si encarga la revisión y qué avisos de licencia hay que incluir.

**Bloquea abrir: no.**

_Para nosotros: pregunta nueva de este documento, sin línea en LAUNCH todavía._

#### A-51 · Citar titulares de medios y resumirlos con enlace

**La pregunta.** ¿Podemos mostrar en la Comunidad el titular de una nota de un medio (de República Dominicana y otros países latinos), un resumen propio de dos o tres líneas hecho con ayuda automática a partir del título y la descripción que el medio publica en su RSS, el nombre del medio y el enlace a la nota? ¿Cabe en el uso legítimo (fair use) de EE. UU. y respeta los derechos de los medios, o hace falta permiso o licencia de cada uno? ¿Importa lo que digan los términos de uso del RSS de cada medio?

**Qué hace hoy To'Latino.** Dos cuentas de la casa, siempre marcadas «Anfitrión/Anfitriona» (Yadira y Rafelito), publican notas de fuentes RSS o Atom que el equipo da de alta una por una en el Super Admin. Cada nota lleva el nombre del medio y el enlace a su página (se abre aparte; el artículo se lee en el medio). Nunca copiamos el artículo ni sus fotos: solo el título y un resumen corto hecho con el título y la descripción del RSS; si el resumen no se puede hacer, sale el titular entre comillas. No se publican notas de política partidista, de sucesos violentos ni sobre menores. A los medios no les mandamos ningún dato: solo leemos su RSS público. En producción no hay ninguna fuente dada de alta.

**Qué asumimos.** Que un titular, un resumen corto propio y el enlace caben en el uso legítimo y que leer un RSS público para eso está permitido, salvo que los términos de un medio lo prohíban.

**Qué cambiaría según la respuesta.** Qué medios damos de alta (solo con permiso, o los que lo permiten en sus términos), si el resumen se quita y sale solo el titular, y qué aviso o atribución lleva cada nota.

**Bloquea abrir: no.**

_Para nosotros: pregunta nueva de este documento (anfitriones del barrio, noticias por RSS), sin línea en LAUNCH todavía._

## Lo que ya decidió el fundador y no se pregunta

Lo siguiente ya está decidido; no hace falta que lo cuestione, salvo que su respuesta a alguna pregunta lo contradiga (entonces dígalo).

- **Decisión A.** Se abre al público cuando esté todo (salvo El Patio): no hay lanzamiento parcial ni categorías «solo con contacto».
- **Decisión X.** Las ciudades de lanzamiento son cinco de Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton y Reading.
- **Decisión E y E2.** El código de entrada llega por mensaje de texto (Telnyx) o WhatsApp; el teléfono se verifica una sola vez, después hay sesión persistente y llaves de acceso (Face ID, huella). No hay contraseña.
- **Decisión F.** El Compa es el asistente de IA; con tope mensual de gasto desde el Super Admin; nunca en la ruta crítica de un pedido o un pago; al tope pasa a «Con una persona».
- **Decisión G.** El Patio (dominó y parchís) queda fuera de esta apertura; cuando se haga, los premios serán solo en monedas.
- **Decisión I.** Los datos de ejemplo viven solo en el entorno de pruebas; producción nace vacía. Las fichas de negocios sin reclamar nacen únicamente de recomendaciones de vecinos.
- **Decisión R2.** Si alguien reclama un negocio que ya tiene dueño, el dueño actual ve el aviso en su panel y tiene 7 días para responder; después solo un administrador puede aprobar el cambio.
- **Decisión O.** Se construye lo propio y se paga solo lo que no se puede replicar (por eso el traductor y la revisión de fotos corren en servidores propios y la analítica es propia).
- **Decisión AJ.** Las fotos públicas se revisan solas, en cuatro capas; al fundador solo llegan las apelaciones. Las fotos privadas (mensajes, ayuda, entrega, reclamo) nunca salen de casa. Lo que se pregunta en A-11 es si es legal, no si se hace.
- **Decisión C2.** Los servidores de producción estarán en EE. UU. con el proveedor más barato el día que se encienda; el entorno de pruebas (solo datos de ejemplo) está en Alemania.
- **Otras decisiones (sin letra: están en el plan y en la lista de pendientes).** Hogar: el fundador decidió no mostrar la ley HIC; el servidor topa el depósito (ver A-15). Iglesias: diezmo y donativo en línea no se construyen. Eventos: no hay venta en la puerta ni promotores que vendan cortesías. Salud y Profesionales: nada se cobra en la app.

## De qué línea sale cada pregunta

Para nosotros: cuando lleguen las respuestas, cada línea de la lista de pendientes (LAUNCH) se cierra con su pregunta.

| Pregunta | Línea de LAUNCH (primeras palabras) |
|---|---|
| A-01 · Revisión final de las 14 páginas | «El texto final de las 14 páginas de docs/legal/»; «Cuentas de revisión en producción (decisión I…) y textos finales de /privacidad y /terminos» |
| A-02 · Empresa, responsabilidad, ley aplicable y arbitraje | «El texto final de las 14 páginas de docs/legal/» |
| A-03 · Qué acto obliga a aceptar Términos y Privacidad | «Dónde más se anota la aceptación» |
| A-04 · Privacidad: leyes estatales, brechas, órdenes legales y plazos | «El texto final de las 14 páginas de docs/legal/» |
| A-05 · Cookies sin aviso de consentimiento | «El texto final de las 14 páginas de docs/legal/» |
| A-06 · Mensajes privados: guardado y lectura por el equipo | «5c · Revisión de seguridad con abogado» |
| A-07 · Grabación de sesiones (si algún día se hace) | «Grabación de sesiones (rrweb, con consentimiento)» |
| A-08 · Sección 230, moderación y Términos de la Comunidad | «5a · Comunidad, abogado (§3)»; «5d · Abogado: Sección 230 y DMCA §512» |
| A-09 · Derechos de autor (DMCA §512) | «Agente designado DMCA registrado en la Copyright Office»; «5d · Abogado: Sección 230 y DMCA §512» |
| A-10 · Material de abuso infantil: reporte y preservación | «5d · NCMEC (abuso infantil)»; «5a · Comunidad, abogado (§3)» |
| A-11 · Revisión automática de fotos y cuánto se guardan | «Plazo de retención de las fotos rechazadas o retenidas»; «Plazo de las fotos de destino privado» |
| A-12 · Acoso y difamación en recomendaciones y reseñas | «5a · Comunidad, abogado (§3)» |
| A-13 · Avisos de operativos de inmigración | «5a · Comunidad, abogado (§3)» |
| A-14 · To'Latino como comerciante del cobro | «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…» |
| A-15 · Depósito máximo en trabajos del hogar (ley HIC de PA) | «Ley HIC de PA (contratistas del hogar)» |
| A-16 · Apartado con plan de pagos (layaway) | «Layaway (4r) — leyes por estado sin verificar» |
| A-17 · Monedas sin valor y cupones | «5g · Abogado: monedas sin valor en dinero y cupones» |
| A-18 · Compras externas en las apps de las tiendas | «Reglas de EE. UU. sobre enlaces a compras externas» |
| A-19 · Profesionales: cobrar en la app | «Pro · cobrar en la app (4l)» |
| A-20 · Cancelación y devolución del comprador | «6d · Abogado: política de cancelación del comprador» |
| A-21 · Reventa de boletos | «6c · Abogado: ley de reventa de boletos de PA…»; «6d · Abogado: política de cancelación del comprador» |
| A-22 · Organizador que cancela o cambia la fecha | «6e · Abogado: To'Latino como comerciante del cobro…» |
| A-23 · Impuesto de diversiones por ciudad | «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…» |
| A-24 · Evento privado en un restaurante: política de cancelación | «6i · Términos y políticas» |
| A-25 · HIPAA: ¿somos «business associate» de los consultorios? | «Salud · HIPAA (4j)» |
| A-26 · Lista de términos de salud en reseñas | «La lista de términos de PRIVADO (lib/resenas-filtro.ts)» |
| A-27 · Edad mínima: 18+ y COPPA | «5c · Revisión de seguridad con abogado»; «Clasificación por edad de Apple» |
| A-28 · ChildLine y deber de reportar | «Niños · ChildLine y obligaciones de reporte» |
| A-29 · Cuidado de niños: protocolo de Soporte y lo que se promete | «Cuidado de niños · protocolo» |
| A-30 · Vivienda justa: frases, pie y excepciones | «4ib · Vivienda justa: revisar con un abogado la lista de frases»; «4id · Pie de vivienda justa y nota de animales de servicio» |
| A-31 · Cola de vivienda justa: protocolo del equipo | «4ig · Colas › Vivienda justa» |
| A-32 · Depósito de renta y cuota de solicitud | «4ib · Depósitos en PA» |
| A-33 · Cuota mensual estimada de una casa | «4ib · Cuota estimada» |
| A-34 · Sellos de licencias de Bienes Raíces | «4ib · Licencias de Bienes Raíces» |
| A-35 · Buyers Guide y garantía | «4ic · Buyers Guide (FTC Used Car Rule)» |
| A-36 · Pago de ejemplo y «compre aquí, pague aquí» | «4ic · Regulation Z (publicidad de crédito)» |
| A-37 · Tope del cargo del dealer | «4ic · Tope del cargo del dealer de PA» |
| A-38 · Sellos de licencias de Venta de Autos | «4ic · Licencias de Venta de Autos» |
| A-39 · Prueba de manejo en casa: seguro y responsabilidad | «4ie · Prueba de manejo en casa» |
| A-40 · Licor y vida nocturna (PLCB) | «Noche · licencia de licor (PLCB)» |
| A-41 · Iglesias y funerarias | «4ia · Iglesias · sellos y ley» |
| A-42 · Licencias de Transporte y Fiestas | (sin línea: pregunta nueva) |
| A-43 · Mensajes de texto: consentimiento, STOP/HELP y registro 10DLC | «7h · Para el abogado: TCPA / 10DLC»; «El mensaje de texto que promete la landing» |
| A-44 · WhatsApp Business | «7h · Para el abogado: TCPA / 10DLC» |
| A-45 · Aviso de IA en Términos y Privacidad | «Abogado: aviso de IA en Términos y Privacidad»; «Retención cero (ZDR)…» |
| A-46 · Respuestas automáticas en nombre de un negocio | «7f · Para el abogado: respuestas automáticas» |
| A-47 · Borradores de respuesta para Soporte | «7g · Para el abogado y Privacidad» |
| A-48 · LibreTranslate (AGPL-3.0) y los modelos de traducción | «5h · Abogado: LibreTranslate es AGPL-3.0» |
| A-49 · Modelo de revisión de fotos (NudeNet y pesos entrenados con YOLOv8) | «5d · Licencia del modelo de fotos» |
| A-50 · Las demás piezas de código abierto | (sin línea: pregunta nueva) |
| A-51 · Citar titulares de medios y resumirlos con enlace | (sin línea: pregunta nueva) |


## English

### What To'Latino is

- To'Latino is a platform for the Latino community in the United States, organized by city. It will open with five Pennsylvania cities: Hazleton, Allentown, Wilkes-Barre, Scranton and Reading.
- It brings together businesses (17 categories: food, beauty, health, home, cars, real estate, churches, children, events and more), a neighbor community and ticketed events.
- Card payments are processed by Stripe: each business is paid into its own connected account and To'Latino keeps a commission. People sign in with their phone and a code by text message; there is no password.
- There is a website, four apps (neighbors, businesses, delivery drivers and event door staff) and an artificial-intelligence assistant called El Compa.
- It is not yet open to the public. Everything below was built and tested in a test environment with sample data; production starts empty.

### What we ask of you

Written answers, by question number (A-01, A-02…). "Yes", "no" or "change X" is enough, plus one line of reasoning if you wish. If a question needs data we did not give, say so and we will send it. The 14 draft legal texts (Spanish and English) are sent together with this document. When your answers arrive as a document, we apply them to those texts and to the product rules; in production, no legal page is published without your review.

These are questions, not conclusions. Where we say "the draft assumes" or "the plan assumes", it is what the team wrote without being lawyers, and we show it so you can confirm or correct it. None of it is legal or tax advice from us, and the figures or deadlines the repository cites (a cap, a deadline) appear as assumptions for you to confirm.

### How it is organized

By topic. Within each topic, what blocks opening comes first. Each question has: the question, what To'Latino does today (facts), what we assume, what would change depending on your answer, whether it blocks opening and, in small print, where it comes from (that is for us).

Blocks opening: "yes" = without your answer we do not open with that part turned on and it affects everyone; "one part" = it affects a specific feature or category, that part waits for your answer and the founder decides whether to open without it; "no" = it does not prevent opening. This assignment is ours: please correct it if it does not match.

### Topic index

| Topic | Questions | Block opening |
|---|---|---|
| Terms, privacy and legal pages | 7 (A-01 – A-07) | 6 |
| User content and moderation | 6 (A-08 – A-13) | 6 |
| Money, payments and refunds | 6 (A-14 – A-19) | 2 |
| Tickets and events | 5 (A-20 – A-24) | 4 |
| Health | 2 (A-25 – A-26) | 1 |
| Minors | 3 (A-27 – A-29) | 3 |
| Housing | 5 (A-30 – A-34) | 3 |
| Car sales | 5 (A-35 – A-39) | 3 |
| Alcohol, nightlife, churches and transportation | 3 (A-40 – A-42) | 1 |
| Text messages and WhatsApp | 2 (A-43 – A-44) | 2 |
| Artificial intelligence | 3 (A-45 – A-47) | 1 |
| Software licenses and intellectual property | 4 (A-48 – A-51) | 2 |
| **Total** | **51** | **34** |

### The questions

#### Terms, privacy and legal pages

##### A-01 · Final review of the 14 pages

**The question.** Can you review the 14 draft legal texts (11 general and 3 Pennsylvania addenda) and return each one as "reviewed" or with the changes you require?

**What To'Latino does today.** They are written in Spanish and English from what the product does today: Terms, Privacy, Cookies, Community Rules, How we verify, Votes and polls, Security, Artificial intelligence, Copyright (DMCA), Fair housing and Accessibility, plus the Pennsylvania addenda to Terms, Privacy and Fair housing. There are 20 gaps marked "[pending: …]" where we cannot write alone; several are the questions in this document. The accessibility statement aims at WCAG 2.2 level AA and says plainly that some gray text and controls do not yet meet it. In production the platform will not publish any page without your review.

**What we assume.** No assumption about the final content. We only assume each text describes accurately what the product does; if not, tell us and we change the product or the text.

**What would change depending on the answer.** Each page moves from "draft" to "reviewed by {your firm} on {date}" and can be published. If you ask for changes, we apply them and send the page back.

**Blocks opening: yes.**

_For us: LAUNCH "El texto final de las 14 páginas de docs/legal/»; «Cuentas de revisión en producción (decisión I…) y textos finales de /privacidad y /terminos" (in Spanish, as in our checklist)._

##### A-02 · Company, liability, governing law and arbitration

**The question.** What should the Terms say about which company operates To'Latino, warranties, limitation of liability, indemnity, governing law, venue and arbitration? And if To'Latino does not yet exist as a company, what structure do you recommend before opening accounts with Stripe, Apple and Google?

**What To'Latino does today.** The Terms have those sections blank ("[pending: …]"). They only say that each business answers for what it sells and To'Latino answers for what To'Latino does, and that nothing removes the rights a person has under their state's law. The Pennsylvania addendum cites the state consumer protection law and leaves the venue pending. Our records do not say whether To'Latino already exists as a formed company, or under what legal name and address; Stripe, Apple and Google ask for those details.

**What we assume.** No assumption. It is a piece of information we are missing.

**What would change depending on the answer.** The Terms text (who operates, limits, venue) and in whose name the contracts with Stripe, Apple, Google and vendors are signed.

**Blocks opening: yes.**

_For us: LAUNCH "El texto final de las 14 páginas de docs/legal/" (in Spanish, as in our checklist)._

##### A-03 · Which act requires accepting the Terms and Privacy

**The question.** At which moments must a person expressly accept the Terms and Privacy (sign-up, first appointment, booking, ticket, market purchase), or is the notice "By continuing you accept…" enough?

**What To'Latino does today.** The sign-in screen says "By continuing you accept To'Latino's Terms and Privacy" and asks for no separate tap. Acceptance is recorded (text seen, version, time and internet address; insert-only, once per person and version) in three places: when publishing a business, on the first food order (at checkout) and on the "Accept the new terms" sheet. It is not recorded at sign-up, or on the first appointment, booking, ticket or market purchase. When a new version asks for acceptance again, the sheet appears on the next home screen, never on top of an operation in progress.

**What we assume.** No assumption: we left it to you to say which act binds.

**What would change depending on the answer.** On which screens we add the acceptance record, and whether a checkbox or a separate tap is needed.

**Blocks opening: yes.**

_For us: LAUNCH "Dónde más se anota la aceptación" (in Spanish, as in our checklist)._

##### A-04 · Privacy: state laws, breaches, legal orders and retention

**The question.** Which Pennsylvania privacy and data-breach notification laws (and those of other states where users may live) apply to To'Latino, how should we respond to a legal order or an authority's request, and are the retention periods and the 30-day account deletion acceptable?

**What To'Latino does today.** The Privacy page lists the data we keep, the services we use (Stripe, Telnyx, Meta/WhatsApp, Amazon SES, Anthropic, Apple and Google; also Cloudflare in front of the production site, marked “[pending]”; since 23 Nov the category covers are our own photos and Pexels receives nothing in production) and how long each thing is kept (for example: searches 90 days, sign-in codes 7 days, a delivery's location 14 days, our own analytics 13 months, conversations with El Compa 12 months). We do not sell data and there is no third-party advertising; we never ask for immigration status or Social Security number. A person can download their data (once every 7 days) and delete their account: after 30 days their data is deleted, and what the law or money records require us to keep is stripped of their name and phone. The Pennsylvania addendum leaves blank the deadlines and who is notified in a breach; the text on legal orders is also blank, and the production server provider (in the U.S.) has not been chosen yet.

**What we assume.** The plan assumes 30-day deletion and data download as safe defaults (phase 9, §6 #9 and #10); we do not assume which laws apply.

**What would change depending on the answer.** The Privacy and Pennsylvania addendum text, retention periods, the breach procedure (incident manual) and how we handle a legal order.

**Blocks opening: yes.**

_For us: LAUNCH "El texto final de las 14 páginas de docs/legal/" (in Spanish, as in our checklist)._

##### A-05 · Cookies without a consent notice

**The question.** With only first-party, necessary cookies, is the Cookies page enough, with no consent banner, under the privacy laws of the states where To'Latino opens?

**What To'Latino does today.** Six first-party cookies: session (180 days), a random browser number for our own analytics and abuse prevention (5 years), language, city, the key to open tickets offline and an invitation code (30 days). We also store in the browser the cart, the "Publish your business" draft and offline tickets. We load no advertising or tracking tools from other companies; analytics are our own and never leave To'Latino.

**What we assume.** The plan assumes no banner is needed (phase 9, §6 #12); it is marked "[pending]" on the Cookies page for you to confirm.

**What would change depending on the answer.** We leave the page as it is, or add a notice or consent preferences.

**Blocks opening: yes.**

_For us: LAUNCH "El texto final de las 14 páginas de docs/legal/" (in Spanish, as in our checklist)._

##### A-06 · Private messages: storage and staff reading

**The question.** Is it acceptable how we handle private messages between neighbors (they are stored; staff read them only if someone reports the conversation, and each reading is logged), and what should the Terms and Privacy say about it?

**What To'Latino does today.** A neighbor can only write to someone who follows them. Staff do not read conversations; they open one only if a person reports it, from the moderation queue, and every reading is logged. Nothing is deleted: staff hide a message with a stated reason. A photo chosen for a message and never sent is deleted after 24 hours. When an account is deleted, its messages are purged after 30 days. There is no deletion period of its own while the account exists.

**What we assume.** The plan assumes "reading only with a report" and that the Terms and Privacy must say so; we have not set a retention period.

**What would change depending on the answer.** The Terms and Privacy text, a retention period for messages, and whether staff may read without a report in a case of serious threat.

**Blocks opening: yes.**

_For us: LAUNCH "5c · Revisión de seguridad con abogado" (in Spanish, as in our checklist)._

##### A-07 · Session recording (if ever done)

**The question.** If one day we record people's screens to improve the website, with their consent, what must the consent screen and the Privacy notice cover? Or do you recommend not doing it?

**What To'Latino does today.** It is not built. Our own analytics count screens and errors without recording. The Privacy page says today that there is no tracking or recording. If done, it would be web-only with every field masked, but the screens carry names, addresses, messages and health and children's data.

**What we assume.** The plan leaves it unbuilt until we have your answer and the founder's decision.

**What would change depending on the answer.** Whether it is built; the consent screen and the Privacy notice.

**Blocks opening: no.**

_For us: LAUNCH "Grabación de sesiones (rrweb, con consentimiento)" (in Spanish, as in our checklist)._

#### User content and moderation

##### A-08 · Section 230, moderation and Community Terms

**The question.** Are the Community rules and moderation (report, hide with notice, appeal) sound for keeping Section 230 protection and good-faith moderation protection? What should the section "What you post and the law", currently blank, say?

**What To'Latino does today.** Six rules (talk about your city, recommend from experience and never your own business, no sales or raffles, do not post other people's data, respect, 911 for emergencies). Any neighbor can report; what is reported stops showing for the reporter and a person reviews it within 48 hours. Five reports from different accounts and devices within 24 hours hide it while it is reviewed. Automatic rules (hate, scams, immigration, self-harm, repeated text) only flag it for a person to decide; phone numbers, emails and private numbers are stopped as they are typed. Sanctions rise from a warning to a mute, a ban on posting, a suspension and account closure. Hidden content stays visible to its author and nothing is deleted. A person can appeal once, up to 14 days later, and another team member decides within 72 hours. No person reviews a post before it appears (photos do pass an automatic review, see A-11).

**What we assume.** The draft Rules say that what each neighbor posts belongs to whoever posts it and that To'Latino moderates it but does not write it. Whether that preserves Section 230 protection is what we ask you to confirm.

**What would change depending on the answer.** The Rules and Terms text; whether moderation must change (for example the auto-hide or the filters) so as not to lose protection. Our checklist notes that without this the Community does not open.

**Blocks opening: yes.**

_For us: LAUNCH "5a · Comunidad, abogado (§3)»; «5d · Abogado: Sección 230 y DMCA §512" (in Spanish, as in our checklist)._

##### A-09 · Copyright (DMCA §512)

**The question.** What must the copyright procedure cover for To'Latino to qualify for §512 protection (designated agent, notice, counter-notice, deadlines, repeat infringers)? Who should be listed as agent? Is the license we ask of people who post sufficient?

**What To'Latino does today.** The /dmca page asks for the notice details (the work, where it is, contact details, good-faith and accuracy statements under penalty of perjury, signature) and explains the counter-notice. No agent is registered: meanwhile it directs people to Support with "Copyright" in the subject. There is no dedicated notice queue: staff hide using the usual moderation tools (nothing is deleted: it stays hidden) and notify the poster. Repeat infringers have their account closed. The deadlines for restoring removed content after a counter-notice are blank. People who post remain owners of their work and give us permission to show, store, translate and adapt it to each screen while it is published. Registering the agent with the Copyright Office has a fee and the founder has not decided it yet.

**What we assume.** No assumption about deadlines or about who the agent is.

**What would change depending on the answer.** The /dmca text, who registers and with what details, whether we need a dedicated notice queue and the repeat-infringer policy.

**Blocks opening: yes.**

_For us: LAUNCH "Agente designado DMCA registrado en la Copyright Office»; «5d · Abogado: Sección 230 y DMCA §512" (in Spanish, as in our checklist)._

##### A-10 · Child sexual abuse material: reporting and preservation

**The question.** What protocol should To'Latino follow when it detects, or is told about, child sexual abuse material (report to NCMEC's CyberTipline, preservation, who does it and with what access)?

**What To'Latino does today.** The material is hidden immediately and preserved with restricted access. An administrator reports it by hand; there is no automatic submission to the CyberTipline. Child-abuse reports jump to the front of the moderation queue. There is not yet a written protocol for the team.

**What we assume.** The plan cites the obligation in 18 U.S.C. § 2258A and preservation; we have not set a preservation period.

**What would change depending on the answer.** A written protocol for the team, the preservation period, who has access and whether reporting needs to be automated.

**Blocks opening: yes.**

_For us: LAUNCH "5d · NCMEC (abuso infantil)»; «5a · Comunidad, abogado (§3)" (in Spanish, as in our checklist)._

##### A-11 · Automatic photo review and how long photos are kept

**The question.** Is the automatic review of public photos acceptable, in particular: (a) that a doubtful photo, downsized and without any data about who uploaded it, is sent to an external AI provider for a second opinion; (b) that rejected or held photos are kept with no time limit; and (c) how long those photos and private photos (appointments, requests, trips, messages) may or must be kept?

**What To'Latino does today.** Four layers. (1) Our own model, on our servers, at upload: a clean photo is published, a clearly unsuitable one is rejected and a doubtful one is held. (2) For doubtful ones (and, while our own model is off or not answering, for any new public photo), a second opinion from an Anthropic AI model with vision: it receives only the downsized image (up to 640 px, no metadata) and a fixed instruction; never private photos or who uploaded it. (3) Reports from several different accounts hide it automatically. (4) A verified business with a clean history skips the second opinion. If the provider does not answer, the photo stays held; it is never published "just in case". Rejected or held photos are kept and today are never deleted. Private photos for an appointment, request, trip or scale have no purge of their own; those for a Health or Professionals help case last 90 days. Photos in unsent messages are deleted after 24 hours. Only appeals reach the founder.

**What we assume.** No assumption about periods: we did not invent one. The draft Privacy and Artificial intelligence pages (text of Nov 23) now say that layer 2 sends a downsized version to Anthropic, that faces and text are not blurred and that private photos are not sent; what Anthropic keeps and zero retention remain “[pending]” in them. The delivery photo can go to Stripe as evidence in a dispute (see Privacy).

**What would change depending on the answer.** The Privacy and Artificial intelligence text; whether we turn layer 2 off (it has a switch and a spending cap); the purge periods; the relationship with preservation in A-10; and the “not shared with third parties” answer on Google Play's data safety form.

**Blocks opening: yes.**

_For us: LAUNCH "Plazo de retención de las fotos rechazadas o retenidas»; «Plazo de las fotos de destino privado" (in Spanish, as in our checklist)._

##### A-12 · Harassment and defamation in recommendations and reviews

**The question.** What should To'Latino say about harassment (18 Pa.C.S. § 2709) and defamation in reviews and recommendations, and is our handling of reports sufficient?

**What To'Latino does today.** The rules ask for respect, no insults or harassment, and no posting of other people's data. There are report reasons "harassment" and "privacy", mutual invisible blocking and a ladder of sanctions. A review must describe a real experience with that business and a "verified review" requires having used the service in the app. Threats jump to the front of the queue. The text on harassment and defamation in the Rules is blank.

**What we assume.** No assumption.

**What would change depending on the answer.** The Rules and Terms text and, if needed, a path for a business or person to request review of a review.

**Blocks opening: yes.**

_For us: LAUNCH "5a · Comunidad, abogado (§3)" (in Spanish, as in our checklist)._

##### A-13 · Immigration-enforcement alerts

**The question.** Is it right to allow immigration-enforcement alerts in the Community (without photos of people, license plates or addresses) and send them to priority review, or should the rule change?

**What To'Latino does today.** They are allowed without photos of people, plates or addresses. A list of immigration terms flags them and sends them to the queue with high priority because of the risk of rumor and panic. Pointing out a person's immigration status is treated as posting another person's data: it is hidden and sanctioned. To'Latino never asks for immigration status or Social Security number.

**What we assume.** This is the plan's default (phase 5, §6 #19), which asks for review with you and the founder before opening.

**What would change depending on the answer.** The rule in the Community Rules, the term list and the text for staff.

**Blocks opening: yes.**

_For us: LAUNCH "5a · Comunidad, abogado (§3)" (in Spanish, as in our checklist)._

#### Money, payments and refunds

##### A-14 · To'Latino as the merchant collecting payment

**The question.** Given how money moves (below), how should To'Latino be described in the Terms, and what obligations does it have (reporting payments to third parties such as Form 1099-K, licenses or registrations for collecting and transferring other people's money)?

**What To'Latino does today.** Card payments are processed by Stripe and each business has a connected account (Stripe Connect, Express type). Orders, appointments, deposits, layaways, plans and rentals: the card is held when sent, charged when the business accepts, and the money goes to the business's account minus To'Latino's commission (initial, adjustable values: orders and market 10%, appointments 8%, layaways 6%). Tickets: the charge stays in To'Latino's account and is transferred to the organizer on the Tuesday after each date, minus refunds, disputes and commission (5% + $1 per ticket, taken out of the organizer's share: the price the buyer sees is what they pay). A new organizer's first event above $2,000 is held until a trust reviewer checks it. To'Latino never stores the card number, only the brand and last 4 digits. Cash or what is paid at the location is settled between the business and the person; To'Latino does not collect it.

**What we assume.** No legal assumption. Our doubt is whether holding ticket payments until Tuesday changes anything compared with charging the business directly. There is a parallel question for the accountant (C-08).

**What would change depending on the answer.** The Terms and Security text about payments; whether any additional registration or contract is needed; and whether we change how tickets are charged.

**Blocks opening: yes.**

_For us: LAUNCH "6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…" (in Spanish, as in our checklist)._

##### A-15 · Maximum deposit on home jobs (PA HIC law)

**The question.** Is it correct to cap at one third the deposit for Home jobs over $1,000 under Pennsylvania's home improvement contractor law, and is it fine not to show any text about that law to the customer? Are there other obligations (written contract, contractor registration)?

**What To'Latino does today.** The server caps the deposit on a Home job over $1,000 at one third; the rule is in Settings. The app shows no text about that law and does not ask for a contractor registration number.

**What we assume.** The founder decided not to display the law; the one-third cap and the $1,000 threshold are plan assumptions we ask you to confirm.

**What would change depending on the answer.** The cap and threshold, whether a notice should be shown to the customer and whether we require a registration number.

**Blocks opening: yes.**

_For us: LAUNCH "Ley HIC de PA (contratistas del hogar)" (in Spanish, as in our checklist)._

##### A-16 · Layaway payment plans

**The question.** What requirements apply in Pennsylvania (and in New Jersey and New York, if opened) to Stores' layaway payment plans, and what maximum cancellation charge should be allowed?

**What To'Latino does today.** Only "layaway" items from stores that enable the plan. Before paying, the person accepts a written agreement (total, down payment, number and dates of payments, no interest) that is stored unalterable (text, time, internet address and version). The first payment is held and charged when the store confirms it has the item; each payment is made in the app, with the person present, or at the store. A late payment is flagged from the next day; after 14 days late the store may cancel the plan, and the person may cancel at any time. What was paid is refunded minus a fee (10% by default, capped at 10%). Pickup is at the store, no shipping.

**What we assume.** The plan assumes the written, accepted agreement is the safety net until each state's law is verified.

**What would change depending on the answer.** The fee cap by state, the written notice and how refunds are made.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "Layaway (4r) — leyes por estado sin verificar" (in Spanish, as in our checklist)._

##### A-17 · Worthless coins and coupons

**The question.** Do the Community's coins (with no cash value) and the coupons businesses give in exchange fall under gift-card, unclaimed-property or sweepstakes laws? What should the text say?

**What To'Latino does today.** They are earned: +100 on welcome and monthly prizes from the Neighborhood Board (300, 200 and 100 coins), with no purchase. They cannot be bought, sold, transferred or exchanged for money, and they do not expire. They are spent on coupons that each business chooses to offer; the coupon is redeemed at the location. To'Latino neither pays nor charges the business for redemption (it only sends a monthly report). An expired unused code returns the coins. No cash prizes and no sweepstakes (decision G).

**What we assume.** The plan assumes that without a purchase it is not a sweepstake and that without cash value it is not a gift card; we ask you to confirm.

**What would change depending on the answer.** The text "No cash value · cannot be bought, sold, transferred, and never expire" in the Community Terms and whether anything should expire.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "5g · Abogado: monedas sin valor en dinero y cupones" (in Spanish, as in our checklist)._

##### A-18 · External purchases in app-store apps

**The question.** Under the U.S. rules on links to external purchases from apps (the Epic case, 2025), may the apps offer or link the Pro plan, which is absent today?

**What To'Latino does today.** Pro is neither offered nor linked in the four apps (Apple rule 3.1.3(f)). It is bought on the web by card: $14.99 per month, or the year for the price of 10 months; the 30-day trial asks for no card. The rule will be re-read on the day of store submission.

**What we assume.** The apps ship without Pro.

**What would change depending on the answer.** Whether the apps may offer or link Pro. It does not affect the web.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "Reglas de EE. UU. sobre enlaces a compras externas" (in Spanish, as in our checklist)._

##### A-19 · Professionals: charging in the app

**The question.** Before turning on in-app payments for Professionals, what does the law prevent or allow for (a) lawyers (fee sharing with non-lawyers, IOLTA trust accounts), (b) credit repair (CROA: no charging before completion), (c) remittances, check cashing, bail bonds and insurance (their own licenses) and (d) the rest (repair, printing, digital, construction)?

**What To'Latino does today.** Today nothing from Professionals is charged in the app. The consultation is recorded, the total is put in writing, the person accepts it and pays at the office: no card and no commission. A per-type switch exists, turned off, for the non-legal types.

**What we assume.** Off until your answer; no legal assumption.

**What would change depending on the answer.** Whether charging is turned on for any type, and under what conditions.

**Blocks opening: no.**

_For us: LAUNCH "Pro · cobrar en la app (4l)" (in Spanish, as in our checklist)._

#### Tickets and events

##### A-20 · Buyer cancellation and refund

**The question.** Is the policy that a buyer may cancel up to 24 hours before with a refund of the price minus the service fee valid, and how should it appear in the Terms?

**What To'Latino does today.** The buyer cancels up to 24 hours before the event (configurable) and is refunded the price minus the service fee (5% + $1 for those tickets, already included in the displayed price). After that there is no refund and the ticket can only be transferred (see A-21). For 18+ or 21+ events it is stated before payment that without ID at the door there is no entry and no refund. A charity event does not collect donations in the app. The policy is shown before payment and is part of the Terms for that purchase.

**What we assume.** The 24 hours and the fee are plan defaults (phase 6, §6 #6), adjustable.

**What would change depending on the answer.** The hours, which fee is retained and the text in the versioned Terms.

**Blocks opening: yes.**

_For us: LAUNCH "6d · Abogado: política de cancelación del comprador" (in Spanish, as in our checklist)._

##### A-21 · Ticket resale

**The question.** What does Pennsylvania's ticket-resale law say, and how does it affect transfers between people and purchase limits?

**What To'Latino does today.** There is no resale marketplace. A ticket can only be transferred to a phone number, with no price (the screen has no price field), up to 2 hours before; the old ticket is voided and a new one is issued in the recipient's name; there is a daily limit on transfers per person. Up to 10 tickets per order and 20 per person and date can be bought (account, device and card together; the organizer can lower it). There is no door sales. The organizer sets the price. To'Latino cannot see whether two people arrange something outside the app.

**What we assume.** No assumption.

**What would change depending on the answer.** Purchase and transfer limits, a notice in the Terms and any prohibition that has to be added.

**Blocks opening: yes.**

_For us: LAUNCH "6c · Abogado: ley de reventa de boletos de PA…»; «6d · Abogado: política de cancelación del comprador" (in Spanish, as in our checklist)._

##### A-22 · Organizer who cancels or changes the date

**The question.** Are the rules acceptable when the organizer cancels or changes the date (full refund with no commission; if the person does not respond to a date change, they keep the new date), and how should they appear in the Terms?

**What To'Latino does today.** If a date or the whole event is cancelled, every order is refunded 100%, without charging the commission; To'Latino absorbs the card cost; people are notified by text message. If the date or time changes, whoever bought before chooses until the new start "I stay" or "Full refund"; if they do not respond, they keep the new date. Two cancellations by the same organizer within 90 days open a review case. A refund that fails is retried with the same key until it succeeds.

**What we assume.** "No answer means they stay" is a plan default (phase 6, §6 #21), which asks for your confirmation.

**What would change depending on the answer.** Whether "they stay" should become "refund", the Terms text and the notices.

**Blocks opening: yes.**

_For us: LAUNCH "6e · Abogado: To'Latino como comerciante del cobro…" (in Spanish, as in our checklist)._

##### A-23 · Amusement tax by city

**The question.** Does any of the five cities (Hazleton, Allentown, Wilkes-Barre, Scranton, Reading) or the state levy a tax on amusement tickets, and who must collect and pay it: the organizer or To'Latino?

**What To'Latino does today.** Tickets are sold with the tax line at 0%. The organizer sets the price and the service fee comes out of the organizer's share; To'Latino neither calculates nor pays an amusement tax. The displayed price includes fees (all-in).

**What we assume.** No assumption. There is a parallel question for the accountant (C-10).

**What would change depending on the answer.** Whether a per-city tax on tickets must be collected, who pays it and how it is displayed.

**Blocks opening: yes.**

_For us: LAUNCH "6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…" (in Spanish, as in our checklist)._

##### A-24 · Private event at a restaurant: cancellation policy

**The question.** Is the private-event cancellation policy valid (free until 72 hours before; afterward the deposit stays with the restaurant; if the restaurant cancels, full refund), and how should it be written into the versioned Terms?

**What To'Latino does today.** It is a group's request to a restaurant: the restaurant proposes with a price, the person accepts and pays a deposit that goes straight to the restaurant. The proposal is valid for 24 hours. City tax is calculated on the total. The Terms already say that the policy each operation shows before sending is part of them; the text of this policy inside the Terms is missing.

**What we assume.** The deadlines and deposit are plan defaults (phase 6).

**What would change depending on the answer.** The policy text in the Terms and the deadlines.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "6i · Términos y políticas" (in Spanish, as in our checklist)._

#### Health

##### A-25 · HIPAA: are we a business associate of the clinics?

**The question.** Is To'Latino a "business associate" of the clinics, or is the way we minimize data enough? If it is, what contracts and controls are needed?

**What To'Latino does today.** Health does not charge or ask for a card. The reason for the appointment is stored only as a key, not free text; the optional note is encrypted and deleted 30 days after the appointment; insurance is stored with 4 digits; notices do not name the clinic or the reason. There is no health data in analytics or in El Compa (which also does not ask for it). No history, results or medical files are offered. According to the plan, there are no video calls: the clinic pastes its own link.

**What we assume.** The plan assumes data minimization is the defense; unverified.

**What would change depending on the answer.** A business associate agreement and breach notices, or ceasing to collect some data.

**Blocks opening: yes.**

_For us: LAUNCH "Salud · HIPAA (4j)" (in Spanish, as in our checklist)._

##### A-26 · Health-term list in reviews

**The question.** Who should review the list of health terms that blocks posting in a review (diagnoses and medicines), and what criterion should be used? This is not a legal question: we include it because the plan ties it to this consultation.

**What To'Latino does today.** The review filter blocks private health terms using a short list of common diagnoses and medicines. The plan calls for expanding it with a list reviewed by someone in the health field and measuring false positives with real reviews.

**What we assume.** No assumption.

**What would change depending on the answer.** Whom we ask and with what criterion.

**Blocks opening: no.**

_For us: LAUNCH "La lista de términos de PRIVADO (lib/resenas-filtro.ts)" (in Spanish, as in our checklist)._

#### Minors

##### A-27 · Minimum age: 18+ and COPPA

**The question.** Is it enough to ask for the declaration "I am 18 or older" to enter the Community, with no date of birth? What minimum age should an account have for the rest of the app (orders, appointments, tickets)? What obligations arise if children under 13 use To'Latino without our seeking them (COPPA)?

**What To'Latino does today.** The Community asks people to declare they are 18 or older on entry; no date of birth is asked or verified. The rest of the app asks for no age: any phone that receives the code can enter. The Terms leave the account minimum age blank. At 18+ or 21+ events the door asks for ID and this is said before payment. The apps declare to Apple an age rating expected to be 17+ (user content, alcohol references); it is checked on submission day. A child's data enters only through an enrollment made by their mother, father or guardian.

**What we assume.** The plan assumes 18+ by declaration and that opening to 13–17 would be a separate decision (COPPA).

**What would change depending on the answer.** The Terms text, whether we ask for age or date of birth, and the age rating in the stores.

**Blocks opening: yes.**

_For us: LAUNCH "5c · Revisión de seguridad con abogado»; «Clasificación por edad de Apple" (in Spanish, as in our checklist)._

##### A-28 · ChildLine and the duty to report

**The question.** What must To'Latino do if it receives a report of child maltreatment (for example in "They did not take good care of my child")? Is the Pennsylvania ChildLine number we show correct?

**What To'Latino does today.** The fixed text says: "If a child is in danger, call 911. If you suspect abuse or neglect, call Pennsylvania's ChildLine: 1-800-932-0313". That number has not been verified. The case goes straight to To'Latino, without going through the provider, to a "Child care" queue with a 4-hour target. There is no written protocol. The texts and registries for DHS, school, CDL and PennDOT licenses are also unverified.

**What we assume.** No assumption about reporting obligations.

**What would change depending on the answer.** The number, the team protocol, what is reported and to whom, and the license texts.

**Blocks opening: yes.**

_For us: LAUNCH "Niños · ChildLine y obligaciones de reporte" (in Spanish, as in our checklist)._

##### A-29 · Child care: Support protocol and what we promise

**The question.** What written protocol should Support follow with a child-care case (call the provider, ChildLine, 4-hour target), and what may we promise about a licensed provider, a babysitter and photos of children?

**What To'Latino does today.** A daycare or home care without a current license may publish with "No state license" or "License pending", but receives no requests through the app. Babysitters and nannies: contact only, never booking through the app, and the listing does not promise background checks. For a child we keep first name, age or grade and, if picked up, the school, encrypted; only the mother, father or guardian and the provider see it; it is deleted 30 days after it ends. There are no photos of children in messages; public photos of a Children business carry a notice not to upload a child's face without their parents' written permission.

**What we assume.** These are plan defaults (phase 4 Children, §6 #6 to #10); the plan asks to review the photo and reporting points with you.

**What would change depending on the answer.** The protocol, what the listing may say, the photo notice and the deadlines.

**Blocks opening: yes.**

_For us: LAUNCH "Cuidado de niños · protocolo" (in Spanish, as in our checklist)._

#### Housing

##### A-30 · Fair housing: phrases, footer and exceptions

**The question.** Are the list of prohibited phrases (ES/EN), the footer "Equal Housing Opportunity" with the service and support animal note, the exception for housing for people 62 and over (HOPA) and the roommate exception sufficient? Should it carry the Equal Housing Opportunity logo? Does it cover the Pennsylvania Human Relations Act and local ordinances on source of income and Section 8? Is it valid to advertise the documents accepted ("No Social Security number", "ITIN accepted")? To which offices should the page direct complaints (HUD and the Pennsylvania Human Relations Commission)?

**What To'Latino does today.** When an ad is saved, its name, description, requirements, lease and other fees are checked against a list of about 30 built-in phrases in Spanish and English ("no kids", "adults only", "ideal for a couple", "Christians only", "for Hispanics", "no Section 8"…) that the Super Admin can extend. If a phrase matches, the ad is not saved and says which to remove. There are no filters or fields about who lives there; Section 8 can only be accepted. Accepted documents are advertised, never to whom. A "62 and over" ad requires confirming the exception, starts "under review" and opens a case. Service and support animals are always accepted. For a shared room, the exact address reaches only the confirmed visit. The Fair housing pages name the Pennsylvania Human Relations Commission and leave blank how to contact it and where to complain to HUD.

**What we assume.** The plan marks the list and texts as unverified by a lawyer.

**What would change depending on the answer.** The phrase list, the footer, the logo, the Fair housing page text and its Pennsylvania addendum.

**Blocks opening: yes.**

_For us: LAUNCH "4ib · Vivienda justa: revisar con un abogado la lista de frases»; «4id · Pie de vivienda justa y nota de animales de servicio" (in Spanish, as in our checklist)._

##### A-31 · Fair-housing queue: team protocol

**The question.** What written protocol should the team follow when text blocked by the list may be a good-faith mistake and when it must be treated as a warning? What is reviewed in a senior-housing declaration under HOPA? What is the ladder after a warning?

**What To'Latino does today.** Cases arrive in a dedicated queue. A senior-housing declaration starts "under review" and the ad is hidden if the business does not confirm it. After a warning, suspending goes through the business's page in the Super Admin, with no defined steps.

**What we assume.** No assumption.

**What would change depending on the answer.** The protocol, the deadlines and the sanction ladder.

**Blocks opening: yes.**

_For us: LAUNCH "4ig · Colas › Vivienda justa" (in Spanish, as in our checklist)._

##### A-32 · Rent deposit and application fee

**The question.** Is it correct to cap the deposit at 2 months' rent and the application fee at $100 in listings?

**What To'Latino does today.** The server rejects a deposit over 2 months' rent and an application fee over $100 (in whole dollars). The listing shows "To move in" with everything to be paid and the rule "Nothing outside what is published".

**What we assume.** The plan assumes a cap of 2 months' rent in the first year and 1 month from the second (Landlord and Tenant Act); today the server applies only the 2 months. We do not know whether the application fee has a cap.

**What would change depending on the answer.** The caps the server applies and the listing text.

**Blocks opening: yes.**

_For us: LAUNCH "4ib · Depósitos en PA" (in Spanish, as in our checklist)._

##### A-33 · Estimated monthly payment for a house

**The question.** Are the word "estimated" and the reference constants (6.75% rate, 360 months, insurance and taxes 2.5% per year) sufficient to show an estimated monthly payment for a house for sale under credit-advertising rules (Regulation Z)? Who should keep them up to date?

**What To'Latino does today.** The listing of a house for sale shows an estimated payment calculated with those reference constants (which are in the code) and the chosen down payment, with the word "estimated". To'Latino neither offers nor brokers credit.

**What we assume.** No assumption; the plan asks to review the text with you.

**What would change depending on the answer.** The constants, the text or whether the payment is hidden, and who updates them.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ib · Cuota estimada" (in Spanish, as in our checklist)._

##### A-34 · Real-estate license seals

**The question.** Are the issuers, public registries and "can / cannot" texts of the Pennsylvania broker, NMLS, appraiser and home-inspector seals correct?

**What To'Latino does today.** Seals block nothing. A staff member looks up the license in the official registry and marks it verified (with a date), expired or "not found"; it is re-checked every 3 months. Each seal shows the issuer, the number and what it allows and does not allow; the link comes from our list, not from what the business writes.

**What we assume.** The issuers and links are unverified (plan).

**What would change depending on the answer.** The issuers, the links and the texts.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ib · Licencias de Bienes Raíces" (in Spanish, as in our checklist)._

#### Car sales

##### A-35 · Buyers Guide and warranty

**The question.** Do "Sold as is" and the dealer warranty in the app match the Buyers Guide on the window (FTC Used Car Rule)? Should the listing link each car's Buyers Guide?

**What To'Latino does today.** The dealer chooses on the listing between "Sold as is", dealer warranty (in months) and factory warranty. The panel warns that what is said must match the Buyers Guide on the car's window. The listing shows "Sold as is: have your mechanic check it before signing". To'Latino does not store the contract or the Buyers Guide.

**What we assume.** No assumption; the match depends on what each dealer declares.

**What would change depending on the answer.** The texts, whether we link or ask for a copy of the Buyers Guide, and the dealer's obligations in the Terms.

**Blocks opening: yes.**

_For us: LAUNCH "4ic · Buyers Guide (FTC Used Car Rule)" (in Spanish, as in our checklist)._

##### A-36 · Example payment and "buy here, pay here"

**The question.** Do the example payment (down payment, months, rate, "estimated, subject to approval", total of payments), the "buy here, pay here" example and the decision not to show down payment or payment on the search card comply with credit-advertising rules (Regulation Z)? Are the rate caps of Pennsylvania's Motor Vehicle Sales Finance Act correct?

**What To'Latino does today.** The server calculates the example payment from the down payment, months and rate the dealer declares, on the out-the-door total, and always calls it "estimated, subject to approval", with the total of payments. For "buy here, pay here" it shows the total paid and the resulting rate. The search card shows no down payment or payment. The server allows a rate from 0 to 30%. To'Latino does not store the contract.

**What we assume.** The 0–30% rate cap is a value set by the team, unverified.

**What would change depending on the answer.** The payment texts, the rate cap and what the search card shows.

**Blocks opening: yes.**

_For us: LAUNCH "4ic · Regulation Z (publicidad de crédito)" (in Spanish, as in our checklist)._

##### A-37 · Dealer fee cap

**The question.** What is this year's current value of the dealer documentary fee cap, with and without electronic filing, and who should update it each year?

**What To'Latino does today.** The cap lives in Catalog › Dealer fee and today says $477, marked "to verify". The app does not let a dealer set a higher fee. Whether the fee and plates are taxed is a question for the accountant (C-06).

**What we assume.** The $477 value is a team assumption.

**What would change depending on the answer.** The cap value and who changes it each year.

**Blocks opening: yes.**

_For us: LAUNCH "4ic · Tope del cargo del dealer de PA" (in Spanish, as in our checklist)._

##### A-38 · Car-sales license seals

**The question.** Are the issuers, public registries and "can / cannot" texts correct for the Pennsylvania dealer and car-salesperson seals, installment sales (Department of Banking and Securities, in NMLS?) and the dealer's NMLS?

**What To'Latino does today.** Seals block nothing. Staff check by hand in the public registry and mark verified, expired or "not found"; each seal shows the issuer, the number and what it allows and does not allow.

**What we assume.** The issuers and links are unverified (plan).

**What would change depending on the answer.** The issuers, the links and the texts.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ic · Licencias de Venta de Autos" (in Spanish, as in our checklist)._

##### A-39 · At-home test drive: insurance and liability

**The question.** Who is responsible for insurance and liability on a test drive at the customer's home (who drives, the dealer's insurance), and what should To'Latino say before it is accepted?

**What To'Latino does today.** The customer requests a test drive at home; the dealer does not see the address until confirmed and every opening is logged. It is not checked that the address is within the dealer's area. Insurance and liability are not defined.

**What we assume.** No assumption.

**What would change depending on the answer.** A text before accepting, requirements for the dealer or removing the feature.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ie · Prueba de manejo en casa" (in Spanish, as in our checklist)._

#### Alcohol, nightlife, churches and transportation

##### A-40 · Alcohol and nightlife (PLCB)

**The question.** Is anything needed beyond the liquor-license seal (hookah, venues open after 2 AM, promoters)? Is our handling of table deposits and the "did not enter: no ID" case correct?

**What To'Latino does today.** The "Liquor license (PLCB)" seal appears on the venue listing and blocks nothing. The app does not sell alcohol, bottles or hookah (a guard prevents it, including in event extras); a table with a minimum spend is allowed: the spend is paid at the venue. According to the plan, 21+ products (liquor, tobacco, vape) are only shown in a store's catalog, with no ordering or reserving through the app. A table deposit is held when sent and charged on confirmation; if they do not confirm, it is released. If the person is refused entry for not showing ID, it counts as "did not show" and the deposit stays with the venue (said before payment). The app does not ask for a date of birth or store an ID image.

**What we assume.** The legal list is unverified (plan).

**What would change depending on the answer.** Which seal or notice is missing, whether the venue may keep the deposit over the ID issue, and the texts.

**Blocks opening: yes.**

_For us: LAUNCH "Noche · licencia de licor (PLCB)" (in Spanish, as in our checklist)._

##### A-41 · Churches and funeral homes

**The question.** Are the texts and registries correct for funeral homes (Pennsylvania State Board of Funeral Directors), accredited representatives before EOIR and 501(c)(3) organizations (IRS)? Does the FTC Funeral Rule (written general price list) apply? Does the "payment plan up to 12 payments" need a notice?

**What To'Latino does today.** A funeral home receives contact only (call or WhatsApp), with its written price list and its payment plan as text; there is no appointment or payment in the app. Churches charge nothing in the app; tithes, offerings and online donations are not built. Immigration guidance is offered only with a current EOIR seal; without it, it says "Ask whether they have an accredited representative". Fixed texts "This is not legal advice" and the 988 line.

**What we assume.** No assumption; the plan marks the seals as unverified.

**What would change depending on the answer.** The texts, the registries and what a funeral home listing must show.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ia · Iglesias · sellos y ley" (in Spanish, as in our checklist)._

##### A-42 · Transportation and Parties licenses

**The question.** Is the list of authorizations the system requires by type of Transportation service correct (Pennsylvania PUC for taxi, airport, limo and party bus; USDOT and MC across states; CDL; shipments abroad), and is it right not to allow booking in the app without the valid authorization? And the Parties seals (inflatables, food)?

**What To'Latino does today.** A Transportation business only receives bookings in the app if the authorization for its type is valid; under review, the listing says "is under review: for now, book by phone". According to the plan, in Parties licenses are seals that block nothing, except limo and party bus (same rule as Transportation). Staff mark each license verified, expired or "not found" using the public registry. The legal list is unverified.

**What we assume.** The plan assumes the per-type list is provisional and asks to review it with you; the matching line is missing from our checklist and we are adding it.

**What would change depending on the answer.** The per-type authorization list and whether to block or only warn.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: a new question in this document, with no LAUNCH line yet._

#### Text messages and WhatsApp

##### A-43 · Text messages: consent, STOP/HELP and 10DLC registration

**The question.** Are the notice "By continuing you accept…" when requesting the sign-in code, the acceptance record and the STOP/HELP reply enough to comply with the TCPA and carriers' 10DLC registration, for (a) the sign-in code, (b) order, appointment and ticket notices, (c) the one-time "tell me when my area opens" message and (d) To'Latino news (off by default)? What should the consent text, currently blank in the Terms, say?

**What To'Latino does today.** To sign in, a person types their phone number and receives a code by text message; that screen does not mention rates or STOP/HELP, only "By continuing you accept the Terms and Privacy". Notices for an order, appointment or ticket go to the verified phone; each type can be turned off in My account › Notices; between 10 PM and 7 AM (city time) they are not sent, except critical ones. Whoever replies STOP is unsubscribed and no longer receives text messages (the notice stays inside the app). To'Latino news comes off by default. The waitlist sends a single message on the day the area opens and the person can remove themselves. The provider is Telnyx; the brand and campaign registration (with STOP/HELP) is done by the founder and Claude prepares the texts.

**What we assume.** No legal assumption. The consent text is marked "[pending]" in the Terms.

**What would change depending on the answer.** The sign-in screen and Terms text, the 10DLC campaign text and which messages may be sent.

**Blocks opening: yes.**

_For us: LAUNCH "7h · Para el abogado: TCPA / 10DLC»; «El mensaje de texto que promete la landing" (in Spanish, as in our checklist)._

##### A-44 · WhatsApp Business

**The question.** Does what we do comply with the WhatsApp Business policy (prior consent, 24-hour window, approved templates, self-identifying AI)? Is the notice that the text passes through Telnyx, Meta and the AI provider adequate?

**What To'Latino does today.** "Talk to El Compa by WhatsApp and SMS" comes turned off; the person turns it on in My account › Notices and it only works with their verified phone. The first message says it is the AI assistant and each outgoing message reminds about STOP. The 8 WhatsApp templates have not yet been sent to Meta for approval. In production, WhatsApp is on and El Compa's text-message channel is off. Telnyx and Meta may send their own STOP confirmation; we will keep only one.

**What we assume.** No assumption.

**What would change depending on the answer.** The consent and notice text, the templates and whether the channel may start a message.

**Blocks opening: yes.**

_For us: LAUNCH "7h · Para el abogado: TCPA / 10DLC" (in Spanish, as in our checklist)._

#### Artificial intelligence

##### A-45 · AI notice in Terms and Privacy

**The question.** Is the notice sufficient that El Compa is an AI that can be wrong, that its text (already masked) is processed by Anthropic in the U.S., that it is kept 12 months and that only staff with permission read it? What do the laws on AI notices require in the states where we open?

**What To'Latino does today.** El Compa always says it is an AI and the "With a person" option is always visible. It gives no legal, medical or immigration advice and does not ask for status or health data. It sees the person's first name, language, city and recent operations; it does not see their messages with other neighbors, phone, address, card, health appointments or their children's data. Before storing and before sending to the AI, card numbers, security codes, Social Security numbers, immigration A-numbers, verification codes, passwords and bank accounts are masked; anything else the person writes (a name, a phone number, an address) is not. Conversations are kept 12 months; only administrators and Support with permission read them, and every reading is logged; the business never sees them. Zero retention will be requested from Anthropic for production; if not granted, Privacy will say so. There is a monthly spending cap (decision F).

**What we assume.** No assumption about what each state's laws require; the text is marked "[pending]" on the Artificial intelligence page.

**What would change depending on the answer.** The Terms, Privacy and Artificial intelligence text, and the retention period.

**Blocks opening: yes.**

_For us: LAUNCH "Abogado: aviso de IA en Términos y Privacidad»; «Retención cero (ZDR)…" (in Spanish, as in our checklist)._

##### A-46 · Automatic replies on behalf of a business

**The question.** What responsibility does the business have, and what does To'Latino have, for El Compa's automatic replies on behalf of a business and for what the owner writes in "What El Compa should know"?

**What To'Latino does today.** It is only for Pro businesses and comes off; the business turns it on. When the business is closed, El Compa answers its customers with what its page says. It opens by saying it is the business's AI assistant, never promises or confirms on the business's behalf and hands to a person whatever it does not know. The customer's message and the business page pass through the same AI provider.

**What we assume.** No assumption.

**What would change depending on the answer.** A liability text in the business Terms, the customer notice or leaving the feature off.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "7f · Para el abogado: respuestas automáticas" (in Spanish, as in our checklist)._

##### A-47 · Draft replies for Support

**The question.** Is a special notice or basis needed for the text of a Support case (masked, without phone or email) and the team's internal notes to be processed by Anthropic in the U.S. when the team asks for a draft?

**What To'Latino does today.** The team can ask El Compa for a draft reply. The AI provider receives the case text, masked and without phone or email, and the internal notes. The draft never reaches the person on its own: a team member reads it, edits it and sends it under their name. It never refunds money or decides the case. The "El Compa privacy" help article already says so.

**What we assume.** It goes together with zero retention and the AI notice (A-45).

**What would change depending on the answer.** The Privacy text and whether a notice is needed for whoever opens a case.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "7g · Para el abogado y Privacidad" (in Spanish, as in our checklist)._

#### Software licenses and intellectual property

##### A-48 · LibreTranslate (AGPL-3.0) and the translation models

**The question.** Do we comply with the AGPL-3.0 by running LibreTranslate unmodified, as a separate service used only by our app? What would change if we ever modify it or expose it to the public (§13)? And the licenses of each Argos model (Spanish to English, English to Spanish) and of MiniSBD? Is the notice "machine translation; the original prevails" sufficient?

**What To'Latino does today.** Version 1.9.6 runs unmodified, on an internal network with no internet access and no outward ports; only the app talks to it. The Argos models are downloaded once to a volume. The person sees a "See translation" button on posted content; no text leaves our servers. The founder decided to build our own rather than pay for a translator (decision O).

**What we assume.** That running it unmodified and unexposed is enough. The plan says the models "are published under open licenses (to be confirmed model by model)".

**What would change depending on the answer.** Whether we comply as we are, whether anything must be published, whether we switch translators or add the notice to the Terms.

**Blocks opening: yes.**

_For us: LAUNCH "5h · Abogado: LibreTranslate es AGPL-3.0" (in Spanish, as in our checklist)._

##### A-49 · Photo-review model (NudeNet and weights trained with YOLOv8)

**The question.** May we use the NudeNet 3.4.2 detector (MIT license according to its package) if its weights were trained with YOLOv8, over which Ultralytics claims AGPL-3.0 for weights trained with its code? Or must we change model before production?

**What To'Latino does today.** It runs on our servers, unmodified, as an internal service; the weights come inside the package. Its output only flags photos to be held or rejected (see A-11).

**What we assume.** The package declares MIT; the doubt is the origin of the weights.

**What would change depending on the answer.** Whether we keep this model or look for another with a clear license.

**Blocks opening: yes.**

_For us: LAUNCH "5d · Licencia del modelo de fotos" (in Spanish, as in our checklist)._

##### A-50 · The other open-source components

**The question.** Would you like us to send an inventory of the other open-source components that run on our servers or ship inside the apps, so you can review their licenses?

**What To'Latino does today.** Besides the two above we run a PostgreSQL database with PostGIS, an S3-compatible file store (Garage), a map server, video processing with ffmpeg and the web and app libraries. We have only recorded the license of LibreTranslate and NudeNet; we have not reviewed the others one by one.

**What we assume.** No assumption.

**What would change depending on the answer.** Whether you take on the review and which license notices must be included.

**Blocks opening: no.**

_For us: a new question in this document, with no LAUNCH line yet._

##### A-51 · Quoting outlets' headlines and summarizing them with a link

**The question.** May we show in the Community the headline of an outlet's news item (from the Dominican Republic and other Latin countries), our own two-to-three-line summary written with automated help from the title and description the outlet publishes in its RSS, the outlet's name and the link to the item? Does this fit U.S. fair use and respect the outlets' rights, or do we need permission or a license from each one? Do the terms of use of each outlet's RSS matter?

**What To'Latino does today.** Two house accounts, always marked "Host" (Yadira and Rafelito), post items from RSS or Atom sources the team adds one by one in the Super Admin. Each post carries the outlet's name and the link to its page (it opens separately; the article is read at the outlet). We never copy the article or its photos: only the title and a short summary made from the RSS title and description; when the summary cannot be made, the headline appears in quotes. Partisan politics, violent incidents and items about minors are not posted. We send no data to the outlets: we only read their public RSS. Production has no sources added.

**What we assume.** That a headline, a short summary of our own and the link fit fair use and that reading a public RSS for this is allowed, unless an outlet's terms forbid it.

**What would change depending on the answer.** Which outlets we add (only with permission, or those whose terms allow it), whether the summary is dropped and only the headline shows, and what notice or attribution each post carries.

**Blocks opening: no.**

_For us: a new question in this document (neighborhood hosts, news by RSS), with no LAUNCH line yet._

### What the founder has already decided and is not asked

The following is already decided; you need not question it, unless your answer to a question contradicts it (then please say so).

- **Decision A.** The platform opens to the public when everything is ready (except El Patio): no partial launch and no "contact only" categories.
- **Decision X.** The launch cities are five in Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton and Reading.
- **Decision E y E2.** The sign-in code arrives by text message (Telnyx) or WhatsApp; the phone is verified once, then a persistent session and passkeys (Face ID, fingerprint). There is no password.
- **Decision F.** El Compa is the AI assistant; with a monthly spending cap from the Super Admin; never on the critical path of an order or payment; at the cap it hands over to "With a person".
- **Decision G.** El Patio (dominoes and parchís) is outside this opening; when built, prizes will be coins only.
- **Decision I.** Sample data lives only in the test environment; production starts empty. Unclaimed business listings arise only from neighbors' recommendations.
- **Decision R2.** If someone claims a business that already has an owner, the current owner sees the notice in their panel and has 7 days to respond; after that only an administrator can approve the change.
- **Decision O.** We build our own and pay only for what cannot be replicated (hence the translator and photo review run on our own servers and analytics are our own).
- **Decision AJ.** Public photos are reviewed automatically in four layers; only appeals reach the founder. Private photos (messages, help, delivery, claims) never leave our servers. What A-11 asks is whether it is lawful, not whether to do it.
- **Decision C2.** Production servers will be in the U.S. with the cheapest provider on the day they are turned on; the test environment (sample data only) is in Germany.
- **Other decisions (no letter: they are in the plan and the checklist).** Home: the founder decided not to display the HIC law; the server caps the deposit (see A-15). Churches: online tithes and donations are not built. Events: no door sales and no promoters selling comps. Health and Professionals: nothing is charged in the app.

### Which line each question comes from

For us: when the answers arrive, each line of our pending list (LAUNCH) is closed with its question.

| Question | LAUNCH line (first words, in Spanish) |
|---|---|
| A-01 · Final review of the 14 pages | «El texto final de las 14 páginas de docs/legal/»; «Cuentas de revisión en producción (decisión I…) y textos finales de /privacidad y /terminos» |
| A-02 · Company, liability, governing law and arbitration | «El texto final de las 14 páginas de docs/legal/» |
| A-03 · Which act requires accepting the Terms and Privacy | «Dónde más se anota la aceptación» |
| A-04 · Privacy: state laws, breaches, legal orders and retention | «El texto final de las 14 páginas de docs/legal/» |
| A-05 · Cookies without a consent notice | «El texto final de las 14 páginas de docs/legal/» |
| A-06 · Private messages: storage and staff reading | «5c · Revisión de seguridad con abogado» |
| A-07 · Session recording (if ever done) | «Grabación de sesiones (rrweb, con consentimiento)» |
| A-08 · Section 230, moderation and Community Terms | «5a · Comunidad, abogado (§3)»; «5d · Abogado: Sección 230 y DMCA §512» |
| A-09 · Copyright (DMCA §512) | «Agente designado DMCA registrado en la Copyright Office»; «5d · Abogado: Sección 230 y DMCA §512» |
| A-10 · Child sexual abuse material: reporting and preservation | «5d · NCMEC (abuso infantil)»; «5a · Comunidad, abogado (§3)» |
| A-11 · Automatic photo review and how long photos are kept | «Plazo de retención de las fotos rechazadas o retenidas»; «Plazo de las fotos de destino privado» |
| A-12 · Harassment and defamation in recommendations and reviews | «5a · Comunidad, abogado (§3)» |
| A-13 · Immigration-enforcement alerts | «5a · Comunidad, abogado (§3)» |
| A-14 · To'Latino as the merchant collecting payment | «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…» |
| A-15 · Maximum deposit on home jobs (PA HIC law) | «Ley HIC de PA (contratistas del hogar)» |
| A-16 · Layaway payment plans | «Layaway (4r) — leyes por estado sin verificar» |
| A-17 · Worthless coins and coupons | «5g · Abogado: monedas sin valor en dinero y cupones» |
| A-18 · External purchases in app-store apps | «Reglas de EE. UU. sobre enlaces a compras externas» |
| A-19 · Professionals: charging in the app | «Pro · cobrar en la app (4l)» |
| A-20 · Buyer cancellation and refund | «6d · Abogado: política de cancelación del comprador» |
| A-21 · Ticket resale | «6c · Abogado: ley de reventa de boletos de PA…»; «6d · Abogado: política de cancelación del comprador» |
| A-22 · Organizer who cancels or changes the date | «6e · Abogado: To'Latino como comerciante del cobro…» |
| A-23 · Amusement tax by city | «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…» |
| A-24 · Private event at a restaurant: cancellation policy | «6i · Términos y políticas» |
| A-25 · HIPAA: are we a business associate of the clinics? | «Salud · HIPAA (4j)» |
| A-26 · Health-term list in reviews | «La lista de términos de PRIVADO (lib/resenas-filtro.ts)» |
| A-27 · Minimum age: 18+ and COPPA | «5c · Revisión de seguridad con abogado»; «Clasificación por edad de Apple» |
| A-28 · ChildLine and the duty to report | «Niños · ChildLine y obligaciones de reporte» |
| A-29 · Child care: Support protocol and what we promise | «Cuidado de niños · protocolo» |
| A-30 · Fair housing: phrases, footer and exceptions | «4ib · Vivienda justa: revisar con un abogado la lista de frases»; «4id · Pie de vivienda justa y nota de animales de servicio» |
| A-31 · Fair-housing queue: team protocol | «4ig · Colas › Vivienda justa» |
| A-32 · Rent deposit and application fee | «4ib · Depósitos en PA» |
| A-33 · Estimated monthly payment for a house | «4ib · Cuota estimada» |
| A-34 · Real-estate license seals | «4ib · Licencias de Bienes Raíces» |
| A-35 · Buyers Guide and warranty | «4ic · Buyers Guide (FTC Used Car Rule)» |
| A-36 · Example payment and "buy here, pay here" | «4ic · Regulation Z (publicidad de crédito)» |
| A-37 · Dealer fee cap | «4ic · Tope del cargo del dealer de PA» |
| A-38 · Car-sales license seals | «4ic · Licencias de Venta de Autos» |
| A-39 · At-home test drive: insurance and liability | «4ie · Prueba de manejo en casa» |
| A-40 · Alcohol and nightlife (PLCB) | «Noche · licencia de licor (PLCB)» |
| A-41 · Churches and funeral homes | «4ia · Iglesias · sellos y ley» |
| A-42 · Transportation and Parties licenses | (no line: new question) |
| A-43 · Text messages: consent, STOP/HELP and 10DLC registration | «7h · Para el abogado: TCPA / 10DLC»; «El mensaje de texto que promete la landing» |
| A-44 · WhatsApp Business | «7h · Para el abogado: TCPA / 10DLC» |
| A-45 · AI notice in Terms and Privacy | «Abogado: aviso de IA en Términos y Privacidad»; «Retención cero (ZDR)…» |
| A-46 · Automatic replies on behalf of a business | «7f · Para el abogado: respuestas automáticas» |
| A-47 · Draft replies for Support | «7g · Para el abogado y Privacidad» |
| A-48 · LibreTranslate (AGPL-3.0) and the translation models | «5h · Abogado: LibreTranslate es AGPL-3.0» |
| A-49 · Photo-review model (NudeNet and weights trained with YOLOv8) | «5d · Licencia del modelo de fotos» |
| A-50 · The other open-source components | (no line: new question) |
| A-51 · Quoting outlets' headlines and summarizing them with a link | (no line: new question) |
