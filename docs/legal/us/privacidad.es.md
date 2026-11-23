# Privacidad

_Clave: privacidad. Jurisdicción: us. Idioma: es. Fecha del texto: 23 nov 2026. Estado del texto: BORRADOR — pendiente de revisión legal._

Qué datos guarda To'Latino, para qué, con quién se comparten, cuánto tiempo se guardan y lo que puedes hacer con ellos. Más abajo, cada dato y lo que pasa con él al borrar tu cuenta salen de la lista real de lo que guardamos.

## Lo que cambió
- Primera versión: sale del inventario de datos y del mapa de lo que se exporta y se borra.
- Corregido: las fotos dudosas se mandan reducidas a Anthropic; se nombran Pexels, Cloudflare y lo que va a Stripe.

## Lo que no hacemos
- No te rastreamos entre apps ni sitios. No usamos el identificador de publicidad del teléfono.
- No hay publicidad de terceros en To'Latino. No vendemos tus datos ni los compartimos para anuncios.
- La analítica es propia: no sale de To'Latino.
- Nunca te pedimos tu estatus migratorio ni tu número de seguro social.

## Qué datos guardamos
- **Tu cuenta:** tu teléfono, tu nombre y, si lo pones, tu correo.
- **Lo que haces:** tus pedidos, citas, reservaciones, boletos y pagos; tus direcciones de entrega si las guardas.
- **Lo que publicas:** reseñas, publicaciones, comentarios, fotos y mensajes.
- **Tu ubicación:** solo cuando tocas «Usar mi ubicación», para mostrarte lo que tienes cerca. Nunca en segundo plano. Si eres repartidor, la
  ubicación se comparte solo durante una entrega activa.
- **Tu teléfono para To'Latino:** un número propio de To'Latino para este dispositivo (no el del fabricante ni el de publicidad).
- **Cómo se usa la app:** qué pantallas se abren y qué falla, para mejorarla, sin anuncios.

La lista completa, dato por dato, está abajo en «Los datos que usamos y para qué».

## Datos que cuidamos más
- **Salud:** To'Latino no es un consultorio. No guardamos historial médico ni diagnósticos; tu nota para una cita va cifrada y se borra 30 días
  después de la cita. Los avisos de una cita médica no dicen el consultorio ni el motivo.
- **Niños:** de una inscripción guardamos lo mínimo (nombre de pila, edad o grado), cifrado, y se borra 30 días después de que termina. El
  nombre de un niño nunca sale en avisos, búsquedas, analítica ni en El Compa.
- **Tarjetas:** el número de tu tarjeta lo recibe Stripe; To'Latino guarda solo la marca y los últimos 4 números.

## Para qué los usamos
- Para que To'Latino funcione: que el negocio te atienda, que tu pedido llegue, que tu boleto entre.
- Para tu cuenta y tu seguridad: entrar, frenar el abuso y las cuentas falsas, resolver disputas.
- Para avisarte de lo tuyo (tu pedido, tu cita, tus mensajes), por el camino que elijas en Mi cuenta › Avisos.
- Para mejorar To'Latino con nuestra analítica propia.

## Con quién se comparten
- **El negocio** con el que haces algo recibe solo lo que necesita para atenderte (tu nombre, lo que pediste y, si es a domicilio, tu
  dirección y tu teléfono para esa entrega).
- **Los servicios que trabajan para To'Latino**, solo con lo necesario para su parte:
  - Stripe: cobros con tarjeta y pagos a los negocios. En la pantalla de pagar, tu navegador carga el formulario de Stripe (js.stripe.com): Stripe
    ve tu navegador y tu dirección de internet. Si un banco disputa un cobro, a Stripe va la evidencia de ese pedido: el recibo, la conversación
    con el negocio (sin teléfonos) y la constancia de entrega, con la dirección de entrega y, si la hay, la foto de la entrega.
  - Telnyx: los mensajes de texto (tu código de entrada y los avisos por SMS).
  - Meta (WhatsApp): solo si enciendes «Hablar con El Compa por WhatsApp y SMS».
  - Amazon Web Services (SES): el correo, si pones tu correo.
  - Anthropic (proveedor de IA, en EE. UU.):
    - El Compa: lo que escribes llega ya tapado (sin tarjetas, seguro social, número A, códigos de verificación, contraseñas ni cuentas de
      banco), con tu nombre de pila, tu idioma, tu ciudad y tus operaciones recientes. Lo demás que escribas (un nombre, un teléfono, una
      dirección) no se tapa. Más en [Inteligencia artificial](/ia).
    - Respuestas automáticas de un negocio que las encendió: el mensaje del cliente, ya tapado, y la página del negocio.
    - Borradores de Soporte: tu caso, tapado y sin teléfonos ni correos.
    - Fotos que se van a ver en público y que la primera revisión no pudo dar por buenas: una versión reducida de la foto. Se explica abajo.
    - [pendiente: cuánto tiempo conserva Anthropic lo que recibe y si se contrata retención cero; se confirma al abrir la cuenta de producción, con el abogado.]
  - Apple y Google: los avisos al teléfono (el texto del aviso; los de salud, niños, Soporte, sanciones y cuenta salen solo como «Tienes un aviso
    nuevo en To'Latino»), los boletos en Wallet (el nombre, el lugar y la fecha del evento y el código del boleto, sin tu nombre ni tu teléfono) y,
    en la web, el servicio de avisos de tu navegador.
  - Pexels: las portadas de algunas páginas de categoría son fotos de Pexels que tu navegador pide directamente a Pexels, que ve tu dirección de
    internet y tu navegador. [pendiente: el equipo decide si se pasan a fotos propias antes de abrir.]
  - Cloudflare: [pendiente: el sitio de producción irá detrás de Cloudflare, por donde pasa lo que envías y recibes; se confirma al encenderlo.]
  - [pendiente: el proveedor de los servidores de producción, que se elige antes de abrir.]
- **Lo que no se manda a otra empresa:** el traductor de «Ver traducción», la primera revisión de las fotos, los mapas, la ubicación de las
  direcciones y la analítica corren en servidores de To'Latino. Tus fotos se guardan en servidores de To'Latino.
- **La revisión de las fotos que se ven en público:** la hace primero un modelo de To'Latino, en servidores de To'Latino. Solo si ese modelo duda
  de una foto (o, mientras esté apagado o no responda, de cualquier foto pública nueva), una versión reducida de la foto va a Anthropic para una
  segunda opinión: hasta 640 píxeles por lado, sin los datos de la cámara y sin nada de quién la subió, de su negocio ni de su ciudad. No se
  difuminan caras ni textos. Si Anthropic no responde, la foto queda en revisión y no se publica. Un negocio verificado, con 10 fotos visibles o
  más y ninguna quitada en 90 días, publica sus fotos dudosas sin esa segunda opinión.
- **Las fotos privadas** (Mensajes, ayuda, entrega, reclamos, citas, solicitudes, viajes) no se mandan a Anthropic: solo las mira el modelo de
  To'Latino. La foto de la entrega sí puede ir a Stripe si un banco disputa el cobro (arriba).
- **«Cómo llegar»:** si lo tocas, la dirección del lugar pasa a la app de mapas de tu teléfono (en una computadora, a Google Maps en tu navegador).
- **Si la ley lo pide:** [pendiente: cómo respondemos a una orden legal, a escribir con el abogado.]

## Cuánto tiempo se guardan
- Tu cuenta y lo tuyo: mientras tengas la cuenta.
- Lo que buscas: 90 días. Las sesiones que ya no sirven: 400 días. Los códigos de entrada: 7 días.
- La ubicación de una entrega: 14 días; después solo la distancia y el tiempo.
- La analítica propia: 13 meses. Los cierres y errores de la app: 90 días.
- Las conversaciones con El Compa: 12 meses. Tus casos de Soporte: mientras están abiertos y un año después.
- Los escaneos de un boleto en la puerta: 13 meses con el detalle; después solo las cifras.
- Lo que la ley pide guardar de un pago o un recibo se guarda el tiempo que pide, sin tu nombre si borraste tu cuenta.

## Lo que puedes hacer
- **Descargar tus datos:** en Mi cuenta › Ajustes › Privacidad › Descargar mis datos. Te armamos un archivo con lo tuyo; se pide una vez cada
  7 días y se baja una sola vez durante 24 horas.
- **Borrar tu cuenta:** en Mi cuenta › Ajustes › Borrar mi cuenta, en la web y en las cuatro apps. A los 30 días se borra lo tuyo; lo que la
  ley o el dinero piden guardar queda sin tu nombre ni tu teléfono. Abajo, «Qué pasa con cada dato al borrar tu cuenta» dice qué se hace con
  cada uno y por qué.
- **Corregir:** cambias tu nombre, tu foto, tu correo y tus direcciones en Mi cuenta.
- **Avisos, sesiones y permisos:** apagas cada tipo de aviso en Mi cuenta › Avisos; cierras tus sesiones y tus llaves en Mi cuenta ›
  Privacidad; dices que no a la cámara, la ubicación o los avisos, y la app te los vuelve a pedir solo cuando los usa.

## Seguridad
Todo viaja cifrado (HTTPS). Lo más delicado (las notas de salud, los datos de niños, los tokens de los avisos) se guarda cifrado. El equipo
de To'Latino ve solo lo que su rol permite, y cada vez que alguien abre algo delicado queda anotado quién y por qué.

## Cookies
Usamos solo las cookies que To'Latino necesita para funcionar. La lista está en [Cookies](/cookies).

## Cambios a esta página
Cada versión tiene su número y su fecha. Si cambia algo importante, te lo mostramos al entrar y te pedimos aceptarlo.

## Preguntas
Escríbenos en [Soporte](/soporte) y te contesta una persona del equipo.
