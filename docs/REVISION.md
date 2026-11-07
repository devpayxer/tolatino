# Revisión del fundador — lista paso a paso

Decisión AA (6 nov 2026): Claude construye en el sandbox bloque tras bloque y el fundador revisa al final con esta
lista. Cada punto dice **qué mirar, dónde y en qué condiciones**. Sandbox: `pruebas` (se actualiza solo al minuto).
Cuentas de prueba: vecino Marisol (570) 555-0122 · dueño de Sabor Dominicano Pedro (570) 555-0133 · Super Admin Ana
(570) 555-0199. En el sandbox el código de entrada sale en pantalla («MODO PRUEBAS»).

Marca cada punto: ✅ bien · ✏️ cambiar (con lo que quieras) · ❓ duda.

## Al final: lo que hace falta de tu lado (resumen, 6 nov)
Todo lo de abajo ya está construido y probado contra simuladores; se enciende solo cuando estén las llaves. Las llaves se
cargan por el **formulario seguro de secretos del entorno** (nunca por el chat). Lo que un tercero pida en persona va como
paquete de pasos para el teléfono.
1. **Stripe** (cobros con tarjeta, Pro, disputas): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   (webhook en `/api/stripe/webhook` con los eventos de cuenta, pagos, devoluciones y `charge.dispute.*`).
2. **SMS · Telnyx** (códigos y avisos): `TELNYX_API_KEY`, `TELNYX_FROM` + registro 10DLC.
3. **Correo · Amazon SES** (confirmar correo, recibos): `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`,
   `CORREO_DE` + verificar el dominio (DKIM/SPF/DMARC en Cloudflare) y salir del «sandbox» de SES.
4. **Revisar en el sandbox** cada bloque con su guía de abajo (2a → 2s) y responder las decisiones pendientes.

## Decisiones pendientes (no se inventaron: se esperan aquí)
1. **Alergias en el menú del cliente.** El panel las guarda por plato (picante, vegetariano, sin gluten…); el prototipo
   del cliente no las muestra. ¿Salen en la hoja del plato, como etiquetas, o no salen?
2. **Pantalla para aceptar una invitación al equipo** (`/e/{código}`): no existe en el diseño.
3. **Stripe para el bloque 2d (pago con tarjeta).** El código del 2d no se puede probar de verdad sin una cuenta de Stripe
   en modo prueba, y el servidor del sandbox hoy no tiene un camino seguro para recibir una clave de terceros (sin SSH y
   sin secretos en el repo). Propuesta (automática, la clave nunca pasa por el chat ni por Claude):
   - Tú, una vez, desde el teléfono: crear la cuenta de Stripe (modo prueba) y pegar la clave secreta de prueba en
     GitHub › Settings › Secrets › Actions como `STRIPE_SECRET_KEY_PRUEBAS`.
   - Claude: el servidor publica su llave pública; una acción de GitHub cifra la clave con esa llave y la deja en el
     repo; solo el servidor la puede abrir y la pone en su configuración. Lo mismo servirá para SMS (Telnyx) y correo.
   - Mientras tanto se sigue con los bloques que no cobran (2e reservaciones, 2f entrega, 2g reseñas…).
   **Hecho sin la cuenta (6 nov, decisión AB, bloque 2d):** todo el cobro con tarjeta está construido y probado contra el
   simulador propio del sandbox y contra `stripe-mock` (el simulador oficial de Stripe, en el CI). Se enciende solo cuando
   estén las claves en el entorno (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`): se piden por el
   formulario seguro de secretos, nunca por el chat.
4. **Cambiar una reservación ya confirmada.** El prototipo del cliente lo permite («Cambiar reservación» → el cambio queda
   pendiente y la reservación actual sigue en pie), pero el panel del restaurante no tiene diseño para aceptar o
   rechazar ese cambio. Hoy solo se cambia una solicitud que todavía no contestan. ¿Se diseña ese lado o se queda así?
   **Hecho (6 nov, decisión AB, bloque 2k):** el lado del panel se compuso con el detalle de la reservación (aviso con lo
   que pide + «Aceptar el cambio» / «No se puede»). Míralo en la guía 2k abajo y dime si lo dejo así.
6. **App To’Latino Repartidor** (`/repartidor`, una de las 4 apps de la decisión B). El plan la describe
   (`docs/diseno/plan/apps-delivery-checkin.md`: Inicio en línea/fuera de línea, oferta de pedido, mis pedidos con sus
   pasos, cobro en efectivo, problemas, ganancias, perfil, sin señal), pero **no tiene pantallas** en el diseño ni en el
   sistema de diseño. Del panel faltan por lo mismo «Tus repartidores» (invitar con código), «Despacho» y «Cuadre de
   efectivo». Mientras: el negocio marca «Salió en camino» y «Entregado» en su panel. ¿Se diseñan las pantallas del
   Repartidor (en Claude Design) o las compongo yo con el sistema de diseño y te las muestro antes de conectarlas?
   **Hecho (6 nov, decisión AB, bloque 2l):** compuestas con los bloques del sistema y la barra inferior, conectadas y
   probadas. Del panel: «Tus repartidores» y el cuadre en Entrega, y el despacho en el detalle del pedido. Míralas en la
   guía 2l abajo; si las quieres diseñadas en Claude Design, se cambian las piezas sin tocar la lógica.
7. **Reseñas: lo que el diseño promete y todavía no existe.** No se muestra hasta que exista (nada falso):
   - El **rango** del vecino (Recluta, Vecino, Sargento…) y los **puntos** («+15 puntos», «sumas puntos para tu rango»):
     llegan con la gamificación. Hoy la tarjeta dice solo «N RESEÑAS».
   - **«Ver traducción»** (D3): con el servicio de traducción.
   - **«Ir a Ayuda con el pedido»** en una reseña de 2★ o menos: con Ayuda con el pedido (2i). Hoy sale el aviso de visitante.
   - **«Te avisamos el resultado por SMS»** al reportar: con las notificaciones.
   - **«Lo que más mencionan»** (temas): necesita leer el texto de las reseñas; no se inventan temas.
   ¿Te parece bien así, o prefieres esperar a tener todo antes de mostrar reseñas?
8. **Calificaciones de los negocios de ejemplo (sandbox).** Antes, la semilla ponía ★ y número de reseñas fijos a cada
   negocio. Ahora salen de reseñas reales: Sabor Dominicano trae las 14 del prototipo y los demás negocios salen «Nuevo»
   hasta que alguien escriba. ¿Siembro reseñas de ejemplo en más negocios del sandbox?
9. **Novedades: lo que cambié del diseño para no prometer lo que no existe todavía** (dime si lo dejo así):
   - Sin **«Hoy en el barrio»** (la fila de la portada con lo de las últimas 24 h) ni el chip «EN HOY EN EL BARRIO · QUEDAN N H»:
     hace falta la portada con esa sección; por eso el panel dice «Sale en tu página».
   - Sin **cupón** (no hay cupones en el pago todavía), **evento** y **vacante** como tipo o botón (llegan con Eventos y
     Jobs), ni **«Escribir»** (con Mensajes), ni **«Repetir»** en la programación, ni **«Avisar a tus seguidores»** (con las
     notificaciones).
   - La tarjeta de seguir dice «Ve las publicaciones solo para seguidores» en vez de «recibe ofertas y cupones».
   - En el detalle, la tercera cifra es **COMENTARIOS** en vez de **PEDIDOS** (no medimos aún cuántos pedidos salen de una novedad).
   - En la oferta, el **precio normal es el del menú** y no se escribe (el diseño dejaba escribirlo): así el «antes» nunca es inventado.
10. **Jobs: lo que cambié del diseño para no prometer lo que no existe todavía** (dime si lo dejo así):
   - Sin **avisos por SMS** («Te avisamos por SMS», «Cada respuesta le llega por SMS»): la persona ve cada respuesta en
     su solicitud, que se actualiza sola. Los SMS llegan con el proveedor y las notificaciones.
   - Sin **«Avísame de nuevas vacantes»** ni el aviso a vecinos al publicar (con las notificaciones), ni **«Traducir con
     El Compa»** en el editor (con El Compa): el inglés se escribe a mano o sale en español.
   - La propuesta de entrevista dice «En el local de {negocio}» (el diseño decía «15 minutos · pregunta por el
     encargado», que nadie escribió). Las horas que se ofrecen son las horas en punto en que el negocio está abierto.
   - «Solicitudes respondidas · suelen esperar 2–3 días» → «esperan tu respuesta» (no medimos aún cuánto tardan).
   - **Lo que vendes** ahora sale para todas las categorías (antes solo Comida), porque Jobs sirve a cualquier negocio Pro.
11. **Mi cuenta: lo que no muestro todavía y lo que compuse** (dime si lo dejo así):
   - Sin **Boletos** (llega con Eventos), **Pagos y Wallet** (Mensajes y el chat con el negocio ya están: bloque 2p)
     (llega con Stripe, pregunta 3), **Apartados**, platos y eventos guardados, rango, monedas, puntos, «Ayuda y soporte»,
     «Letra más grande», «Descargar mis datos» y los ajustes de la comunidad (llegan con sus fases).
   - La tarjeta de vecino muestra **Reseñas, Guardados y Sigues** en vez de Rango, Monedas y Wallet.
   - **Pedidos** y **Citas** abren la página del pedido o de la reservación que ya existe (recibo y estado en vivo) en vez de
     una pantalla de recibo aparte. «Ver más» (paginación) es un botón del sistema que el diseño no traía.
   - **Empleos** (tus solicitudes) no está en el diseño de Mi cuenta: la compuse con las piezas del marco (sección, filas,
     vacío) y la puse en la navegación.
   - **Avisos** dice arriba que los avisos al teléfono llegan pronto; se guardan tus preferencias. Sin la fila de boletos ni
     de comunidad.
   - **Invita vecinos** comparte el enlace de To'Latino, sin código de referido ni puntos.
   - Cambiar el número no «avisa al número viejo» (no hay SMS todavía).
5. **«Avísame si se libera»** (lista de espera de una hora sin mesa) y **«Otros restaurantes con mesa»** en la pantalla
   de «no pudo»: necesitan los avisos por SMS para ser de verdad. Se hacen con las notificaciones.

## Fase 2 · 2a Menú (panel)
1. Panel de Pedro › **Lo que vendes** › Menú: Platos, Categorías, Opciones, Inventario, Horarios.
2. Cambiar el precio de un plato, agotarlo «hoy» y volver a activarlo; mirar que en la página del negocio cambia.
3. Super Admin (Ana) › Negocios › Sabor Dominicano › **Lo que vende**: ocultar un plato con motivo → Pedro lo ve en su panel.

## Fase 2 · 2b Pedir comida (cliente)
1. Teléfono, como Marisol: Sabor Dominicano › pestaña **Menú**. Mirar etiquetas (AGOTADO HOY, QUEDAN N, HASTA 4 PM).
2. Agregar **Tostones** con el + (sin opciones) y **Mofongo** (con opciones): la hoja marca lo obligatorio y suma precios.
3. Tocar + otra vez en el Mofongo → «otra igual o con cambios». Con dos formas distintas, el − pregunta «¿cuál quitas?».
4. Barra negra → **Tu pedido** → Ir a pagar → **Finalizar pedido**: dónde recoges, «Cambiar» la hora, «Pagas en el local».
5. **Enviar pedido** → pantalla del pedido (número, etapas, listo a las, pagas en el local).
6. Panel de Pedro › **Hoy**: el pedido sale en «Esperan tu respuesta».
7. Condiciones: después de las 4 PM el almuerzo sale atenuado; 15 min antes de cerrar ya no deja pedir; con el negocio en
   pausa (Panel › Menú › Horarios) se ve el menú sin +.
8. Escritorio: el menú en tarjetas con el pedido a la derecha y el checkout en dos columnas.

## Fase 2 · 2c Pedidos en el panel y seguimiento
1. Como Marisol (teléfono) pide algo en Sabor Dominicano. Como Pedro (otro teléfono o escritorio): Panel › **Hoy** →
   el pedido sale en negro arriba con **Aceptar / Rechazar**.
2. Aceptar → en el teléfono de Marisol (su pedido se actualiza solo en unos segundos): «En la cocina».
3. Pedro abre el pedido: cliente, prometido, platos con opciones e instrucciones, **HISTORIAL**. Toca **Listo para
   recoger** y después **Entregado** → Marisol ve cada paso con su hora y al final «Volver a pedir».
4. Otro pedido: Marisol toca **Cancelar pedido** (gratis, con motivo opcional) → Pedro lo ve CANCELADO.
5. Otro pedido: Pedro lo **rechaza** → Marisol ve «No pudieron tomar tu pedido».
6. Otro pedido: nadie contesta 10 minutos → queda **SIN RESPUESTA** en los dos lados y el inventario vuelve.
7. Panel › **Clientes**: filtros con su cuenta y buscar por nombre o número.
8. Panel › Lo que vendes › **Pedidos en línea**: tiempo de preparación, programados, **aceptar al instante** (encendido,
   el siguiente pedido entra aceptado), efectivo al recoger, «Así lo ve el cliente». Apagar Pedidos en línea → la página
   se ve pero nadie pide.

## Fase 2 · 2e Reservaciones de mesa
_Cliente (teléfono, como Marisol) y restaurante (Pedro). Sabor Dominicano ya trae Salón (4 de 2, 6 de 4, 2 de 6) y
Terraza (3 de 2, 3 de 4), almuerzo 12:00–3:30 y cena 5:30–8:30._
1. Página de Sabor Dominicano › **Resumen**: tarjeta **Reservar mesa** → toca «2» → salen 4 horas. Toca una.
2. Pestaña **Reservaciones**: primero «¿Cuántos son?», luego fecha, área y horas por turno. Elige mañana 7:00 PM.
   Barra de abajo: «Mañana · 7:00 PM» → **Continuar**.
3. **Solicitud de mesa**: «Te guardamos esta mesa» con cuenta regresiva de 5:00. Marca Cumpleaños y Alergias (la nota
   pide cuáles), escribe una nota → **Enviar solicitud** → «Solicitud enviada · ESPERANDO RESPUESTA».
4. Vuelve a la página: arriba sale **TU RESERVACIÓN · PENDIENTE**. Abre y toca **Cambiar solicitud** → elige otra hora →
   misma reservación (mismo número R-…) con la hora nueva.
5. Pedro › Panel › **Hoy**: la reservación en «Esperan tu respuesta» con **Confirmar · Otra hora · No hay mesa**.
   - **Otra hora** → en el teléfono de Marisol: «Te proponen otra hora» → **Aceptar** → confirmada.
   - **Confirmar** en otra → Marisol ve «Tu mesa está confirmada» con Calendario, Compartir, Cómo llegar, Llamar.
   - **No hay mesa** en otra → Marisol ve las horas de ese día que sí tienen mesa.
6. Pedro abre una confirmada de hoy: **Llegaron · en su mesa** → Marisol ve «Ya estás en tu mesa». **Se fueron · mesa
   libre** → «Gracias por venir».
7. Marisol, el día de la reservación (faltando 2 h o menos): **¿Vas tarde?** 10 min → Pedro lo ve en el detalle.
8. Marisol **Cancelar reservación** con menos de 2 h → aviso de cancelación tardía (sin cargo).
9. Panel › **Clientes** › pestaña **Reservaciones**: filtros con cuentas y búsqueda.
10. Panel › Lo que vendes › **Reservaciones**: enciende Barra y ponle mesas; marca «Confirmar al instante»; **Guardar** →
    en la página sale el área Barra y la siguiente reservación entra confirmada. **Cerrar un día** (mañana) → la página
    ya no ofrece mañana; **Quitar** lo abre otra vez.
11. Condiciones: un grupo de 9 o más → «evento privado» con Llamar; esperar 5 min en la solicitud → «Se liberó la mesa»;
    no contestar en 30 min → SIN RESPUESTA; un negocio Free no tiene la pestaña.
12. Super Admin (Ana) › Negocios › Sabor Dominicano › **Lo que vende**: Reservaciones con cuántas van este mes; **Pausar**
    con motivo → la pestaña desaparece de la página y Pedro ve el motivo.
13. Escritorio: la pestaña en dos columnas con el riel **Tu mesa**, la solicitud con la cuenta regresiva a la derecha y el
    estado con los detalles a la derecha.

## Fase 2 · 2f Direcciones, Entrega y delivery
_Pedro enciende el delivery y Marisol pide a domicilio. En el sandbox las calles salen del Censo (TIGER) de los condados
de las 5 ciudades._
1. Marisol › Mi cuenta › **Mis direcciones** (vacía): **Agregar dirección** → escribe una calle real de Hazleton con su
   número y código postal, ponle «Casa» → **Guardar**. Debe quedar como predeterminada y decir si está dentro del área.
2. Agrega otra («Trabajo») fuera de la ciudad, márcala y desmárcala como predeterminada; **Borrar** una.
3. Pedro › Panel › **Entrega** (en el teléfono desde **Más**): enciende Delivery, zona 3 mi, envío $3, gratis desde $40,
   mínimo $15, Mi equipo → **Guardar**. Mira «Así lo ve el cliente». Prueba apagar Delivery y Pickup a la vez (no deja).
4. Pedro › Lo que vendes › **Pedidos en línea**: enciende **Efectivo al entregar** y **Pedir propina en delivery**.
5. Marisol › Sabor Dominicano › **Menú**: arriba **Delivery / Pickup**; «Llega entre…»; la Limonada dice SOLO PICKUP.
   Agrega Tostones: el carrito dice «Mínimo $15.00 · faltan $10.00» y la fila Envío. Agrega más: la barra «Te faltan $X
   para envío gratis» baja; pasando $40 el envío sale gratis.
6. **Ir a pagar**: ENTREGA con Casa (Cambiar te lleva a Mis direcciones y vuelve), cuándo llega, **Cómo te lo
   entregamos** (en la mano / en la puerta), Al llegar, instrucciones, **Guardar para Casa**, **Propina** 15/18/20 %/Otro y
   el resumen con Envío y Propina. **Enviar pedido**.
7. Tu pedido: enviado → preparando → en camino → entregado, LLEGA entre…, «PAGAS $X EN EFECTIVO AL RECIBIR», ENTREGA.
8. Pedro › Hoy › el pedido · Delivery: dirección con **Cómo llegar** y **Llamar**, cómo lo quiere, total con envío y
   propina. **Aceptar** → **Salió en camino** (sigue en «Hoy en tu agenda» como EN CAMINO; Marisol ve «En camino») →
   **Entregado**.
9. Pedro › Entrega › Quién entrega: **App externa** (DoorDash). En un pedido aceptado sale **Enlace de seguimiento**:
   pega un enlace https:// → Marisol ve **Seguir en DoorDash**.
10. Condiciones: dirección predeterminada fuera de la zona → «No llega a tu dirección · pide pickup» (con Pickup sí se
    puede); Marisol sin direcciones → «Agregar dirección» en el pago; después del último delivery, solo Pickup.
11. Super Admin (Ana) › Negocios › Sabor Dominicano › **Lo que vende**: Delivery con **Pausar** y motivo → la página solo
    ofrece Pickup y Pedro ve el motivo en Entrega.
12. Escritorio: el menú con el riel «Pickup N min · Delivery $X», el pago en dos columnas y el panel con el detalle.
_Quitado a propósito: el pago no promete la foto al dejarlo ni la espera de 5 min (lo hace la app Repartidor, pregunta 6)._

## Fase 2 · 2g-1 Reseñas
_Marisol escribe; Pedro (Sabor Dominicano, Pro) responde; Ana (Super Admin) decide los reportes._
1. Sabor Dominicano › **Resumen**: «Lo que dicen los vecinos» con 4.4, verificadas, «Lo que importa en la comida» y 2
   reseñas. **Ver las 14** abre la pestaña **Reseñas**: toca la barra de 5★ (filtra), los filtros, el orden y **Ver más
   reseñas**.
2. En una reseña de otro vecino: **Útil** (sube y se quita al tocar otra vez) y **Reportar** → elige un motivo → «Recibimos
   tu reporte»; la tarjeta dice «Reportada · en revisión».
3. Marisol › un pedido terminado › **Escribir una reseña**: sale «Pedido #… · pickup · VERIFICADA», el dato del pedido
   (prometido, listo, resultado) bloqueado. Prueba escribir un teléfono (no deja). Publica → «Tu reseña» con «Reseña
   publicada». **Editar** (dentro de 48 h) y **Borrar**.
4. Pedro › Panel › Tu página › **Reseñas**: cifras, filtros; abre la de Marisol → «Empieza con» → **Publicar respuesta**.
   Marisol ve «El negocio respondió». En otra, **Pedir revisión a To'Latino**.
5. Ana › Colas › **Reportes de contenido**: la reseña con quién la reportó; **Mantener** (el cliente ve «Revisada»),
   **Ocultar** u **Ocultar y sancionar** con motivo. Negocios › Sabor › **Contenido**: las reseñas con OCULTA / REPORTADA,
   Ocultar y Restaurar.
6. Un negocio **Free** (p. ej. Desayunos Mi Viejo): una sola página con el bloque de reseñas; Marisol escribe como
   visitante y su reseña dice «Este negocio no responde reseñas en To'Latino».
7. Escritorio: la pestaña en dos columnas, «Escribir reseña» con «Así la van a ver» a la derecha.

## Fase 2 · 2g-2 Novedades
_Sabor Dominicano trae 5 del prototipo: la oferta del mofongo ($10, fijada), una encuesta, un aviso de horario, «hoy hay»
flan y la terraza._
1. Marisol › Sabor Dominicano › pestaña **Novedades**: **Seguir**; filtra por tipo; vota +; vota en la encuesta (ves los
   porcentajes); abre los comentarios (con la respuesta del negocio) y comenta.
2. En la oferta, **Pedir · $10** → el menú abre el mofongo a $10 → pide: el pedido cobra $10.
3. Pedro › Panel › Tu página › **Novedades**: **Publicar** una encuesta y una novedad **programada para mañana** (no sale
   todavía). **Fijar arriba** otra (la anterior se desfija). **Detener** una. Abre la oferta → responde el comentario de Marisol.
4. Publica una oferta: elige un plato, pon un precio menor al del menú (si pones uno mayor, no deja).
5. Ana › Negocios › Sabor › **Contenido**: **Ocultar la novedad** con motivo (sale de la página; Pedro ve OCULTA POR
   TO'LATINO) y **Pausar Novedades** (la pestaña se va y la oferta deja de cobrarse; Pedro ve el motivo).
6. Escritorio: la pestaña, y el panel con el editor a la derecha y «Así se ve».

## Fase 2 · 2g-3 Jobs
_Sabor Dominicano trae 2 vacantes del prototipo (ayudante de cocina $15–17/hora, chofer de delivery $13/hora + propinas) con
4 solicitudes de vecinos de ejemplo; El Fogón trae una (mesero) que sale en «parecidas»._
1. Marisol › Sabor Dominicano › pestaña **Jobs**: guarda una (corazón), abre **Ayudante de cocina** → **Aplicar**: elige
   experiencia y días (los del puesto salen marcados), confirma los requisitos y **Enviar solicitud** → ves «Solicitud
   enviada» con su número J-….
2. Pedro › Panel › **Hoy**: «Solicitudes de empleo nuevas» → abre la de Marisol (ella ve **VISTA**). **Invitar a
   entrevista**: elige un día que abres y una hora → Marisol ve la propuesta y **Confirma**; tú ves «Entrevista confirmada».
3. Pedro › Lo que vendes › **Jobs** › **Publicar**: prueba poner «SSN» en la descripción (no deja) o pago de $6 (no deja);
   publica una con $12 → sale en la pestaña. **Pausar** (desaparece), **Ya la cubrí**, **Quitar**.
4. Marisol › su solicitud › **Retirar solicitud** → puede volver a aplicar.
5. Ana › Negocios › Sabor › **Contenido** › VACANTES: **Ocultar la vacante** con motivo (Pedro ve OCULTA POR TO'LATINO) y
   **Pausar Jobs** (la pestaña se va; Pedro ve el motivo).
6. Escritorio: la vacante con la columna de la derecha (Aplicar, guardar, compartir) y el panel con la solicitud a la derecha.

## Fase 2 · 2h Mi cuenta
_Entra como Marisol (5705550122). En el sandbox los códigos salen en pantalla («Sandbox: el código es …»)._
1. **Mi cuenta**: tu tarjeta, «Completa tu cuenta», **Tu semana** y **Pendiente de ti**; abajo, tu apoyo al barrio del mes.
2. **Pedidos**: filtra Entregados y Cancelados; «Ver más pedidos»; toca uno → abre su página. «Volver a pedir».
3. **Citas y reservas** → Pasadas. **Guardados**: guarda un negocio con el corazón y míralo aquí; «Editar» → Quitar.
4. **Reseñas** → Por escribir → «Escribir reseña». **Empleos**: tu solicitud de la vacante.
5. **Perfil**: sube una foto, pon cómo te dicen y un correo → Guardar. Teléfono → **Cambiar** → número nuevo → el código →
   entras con el nuevo (vuelve a cambiarlo al tuyo igual).
6. **Ajustes**: cambia a English y de vuelta; **Mi ciudad**; **Privacidad**: entra desde otro teléfono y ciérrale la
   sesión desde aquí.
7. **Borrar mi cuenta**: los 3 pasos con el código → Mi cuenta dice la fecha → **Cancelar el borrado** (o entra otra vez).
8. Escritorio: la navegación a la izquierda y la tarjeta de invitar a la derecha.

## Fase 2 · 2i (1) Super Admin › Contenido y Transacciones
1. Ana › **Contenido**: pestañas; busca «mofongo»; **Ocultar** un comentario o una vacante con motivo → sale OCULTO (Pedro ve
   el motivo de la vacante en su panel) → **Mostrar**.
2. Ana › **Transacciones**: filtra **Terminado**, busca un número de pedido, **Exportar** (abre el CSV en Sheets).
_Contenido no trae todavía publicaciones de la comunidad, «Hoy en el barrio», auto-moderación ni cuenta oficial (Fase 5);
Transacciones no trae retenido, devoluciones ni comisión (Stripe, pregunta 3)._

## Fase 2 · 2i (2) Ayuda con el pedido y Soporte
_Hace falta un pedido terminado de los últimos 7 días (Marisol pide en Sabor y Pedro lo marca Entregado)._
1. Marisol › el pedido › **Ayuda con el pedido** → «Falta algo» → elige el plato → «Que me devuelvan lo de esos platos» →
   **Enviar solicitud** → el pedido dice «Solicitud enviada».
2. Pedro › **Hoy**: «Ayuda con pedidos» → el pedido → escribe y **Enviar respuesta** → Marisol la ve en su pedido.
3. Marisol › **Pedir que To'Latino lo revise** → Ana › **Soporte** (cola Ayuda con pedidos) → **Resolver con un mensaje** →
   Marisol ve «Solicitud resuelta por To'Latino».
_Cambios del diseño: Soporte es por ahora esta cola (sin tickets por WhatsApp o correo, macros ni CSAT); no hay devolución con
tarjeta (todo se paga en el local), así que «devolver» se arregla con el negocio; sin El Compa antes de la ayuda._

## Fase 2 · 2j Notificaciones
_Hace falta un pedido nuevo (Marisol pide en Sabor) y Pedro en el panel._
1. Pedro › **Hoy** → **Aceptar** el pedido → Marisol: la campana tiene un punto → tócala → «Pedido aceptado · NUEVO» →
   tócalo y abre el pedido. Al volver, el punto ya no está.
2. Pedro › **Listo para recoger** → Marisol ve «Tu pedido está listo».
3. Marisol › Mi cuenta › **Avisos** → apaga «Pedidos» → Pedro marca otro paso → el aviso llega a la bandeja; en Super Admin ›
   Notificaciones › **Envíos** sale «SMS APAGADO».
4. Ana › **Notificaciones** › Plantillas → «Pedido aceptado» › **Editar español** → cambia el texto (prueba poner
   `{propina}`: lo rechaza) → Guardar con motivo → **Probar en mi teléfono** → mira tu campana.
5. Ana › **Reglas**: lee las seis reglas.
_Cambios del diseño: la bandeja (APP-NOTIF) no tiene pantalla en el diseño: se compuso con el marco de Mi cuenta (filas con
icono, NUEVO, hace cuánto, el texto y a dónde lleva). En el Super Admin las cifras son de 24 h y reales (no hay «abiertos»
ni costo hasta que salgan SMS de verdad); «Anuncios in-app» queda para cuando exista el banner del home. Sin push todavía
(apps, Fase 8); el SMS sale cuando esté la clave de Telnyx (decisión E2). Decisión tomada sin preguntar (AB): la solicitud
nueva al negocio no respeta las horas de silencio, porque el negocio solo recibe pedidos mientras está abierto._

## Fase 2 · 2k Cambiar una reservación confirmada
_Hace falta una mesa confirmada de Marisol en Sabor (para mañana)._
1. Marisol › su reservación → **Cambiar reservación** → la ficha dice «Cambiando tu reservación de…» → elige otra hora y 4
   personas → **Continuar** → «Tu reservación actual sigue en pie» → **Solicitar cambio** → ve «CAMBIO SOLICITADO ·
   PENDIENTE» y su mesa de siempre.
2. Pedro › **Hoy**: la reservación con «PIDE CAMBIO» → el detalle dice qué pide → **Aceptar el cambio** → Marisol ve «Cambio
   confirmado.» con la mesa nueva (y le llega el aviso).
3. Otra vez, y Pedro toca **No se puede** → Marisol ve «CAMBIO NO CONFIRMADO» y su mesa igual → **Entendido**.
_Cambios del diseño: el lado del panel no tiene diseño; se compuso con el detalle. Si el restaurante tiene «Confirmar al
instante», el cambio se hace solo (como una reservación nueva). Si nadie responde en 30 minutos (o llega la hora), el
cambio se cierra y todo queda como estaba. Decisión sin preguntar (AB): con «Confirmar al instante» al negocio no le llega
aviso del cambio (lo ve en el historial)._

## Fase 2 · 2d Pagar con tarjeta (simulador del sandbox)
1. Pedro › **Cobros** → **Conectar con Stripe** → en el sandbox vuelve al instante con «Tu cuenta de cobros» (banco ·· 6789).
2. Pedro › Lo que vendes › **Pedidos** → enciende **Tarjeta en la app** → Guardar.
3. Marisol › Sabor Dominicano › pide → **Finalizar pedido** → PAGO: **Tarjeta** → «Agregar tarjeta» → 4000 0000 0000 0002 →
   Enviar → «Tu banco la rechazó». Cambia a 4242 4242 4242 4242 → Enviar → el pedido dice **RETENIDO**.
4. Pedro › Hoy → el pedido dice «Pagó con tarjeta: retenidos» → **Aceptar** → Marisol ve **PAGADO**.
5. Pedro › el pedido → **Devolver dinero** → $2.00 con motivo → Marisol recibe «Te devolvimos dinero».
6. Ana › **Transacciones** → busca el pedido → **Devolver** el resto → DEVUELTO.
7. Otro pedido con tarjeta → Marisol lo cancela → «Liberamos tu dinero».
8. Pedro › **Cobros**: la semana (cobrado, comisión, devuelto, te llega el martes) y cada cobro.
_Cambios y decisiones (AB): el campo de la tarjeta con Stripe de verdad es el de Stripe (un iframe con nuestra letra y
color), no nuestro campo: así To'Latino nunca toca el número (norma PCI). «Cambiar banco» abre el panel de Stripe (ahí se
verifica), en lugar del formulario con código del prototipo: To'Latino no guarda números de banco. El Wallet de To'Latino
todavía no existe (no sale en la hoja). La verificación 3D Secure por ahora pide otra tarjeta. La última tarjeta que pagó
queda como predeterminada. Con «Confirmar al instante» un cambio o un pedido se cobra al enviar._

## Fase 2 · 2l App To'Latino Repartidor
_Hace falta un teléfono de prueba para el repartidor (p. ej. 570-555-0144) y Sabor con delivery «Mi equipo»._
1. Pedro › **Entrega** › Tus repartidores › **Invitar repartidor** → nombre y teléfono → sale el código.
2. En otro teléfono: `/repartidor` → entra con 570-555-0144 → escribe el código → Moto → **Entrar al equipo** → **En línea**.
3. Marisol pide a domicilio (efectivo). Pedro › **Aceptar** → en el pedido, **¿Quién lo lleva?** › **Asignar**.
4. Repartidor › la entrega → **Recogí, voy en camino** → **Llegué** (Marisol ve «Juan llegó con tu pedido») → **Cobrar** →
   **Cobré · Entregado**. Pedro › Entrega › **Efectivo de hoy**.
5. Prueba sin señal (modo avión) al tocar «Recogí»: dice «se guardó» y se envía al volver la señal.
_Compuesto sin diseño propio (plan apps-delivery-checkin §1.3). No hay todavía: mapa en vivo, llamada enmascarada, foto o
código de entrega, ofertas con cuenta regresiva, entregas múltiples, repartidores de To'Latino ni sección del Super Admin
(anotado en LAUNCH-CHECKLIST). Además: el botón del sistema de diseño ahora es un botón accesible (rol, foco y teclado)._

## Fase 2 · 2m Plan Pro (Cobros y plan › Tu plan)
1. Pedro › **Cobros y plan** › **Tu plan**: la prueba con los días que quedan y qué pasa el día 30.
2. **Seguir con Pro** → agrega la tarjeta 4242 → «El primer cobro es el día 30».
3. Prueba los cambios: «No seguir con Pro» y «Seguir con Pro» de nuevo; «Cambiar a anual · 2 meses gratis».
4. Con Free (en el sandbox se puede simular el día 30): «Tu contenido Pro está guardado» → **Volver a Pro**.
_Compuesto del prototipo (pro-trial.js y la pestaña Plan del Panel v2). Decisiones (AB): el día 30 y las renovaciones los
procesa el servidor cada vez que alguien usa la app (cada 5 minutos a lo sumo) y al abrir el panel; un reloj propio del
servidor queda para el lanzamiento. Los negocios de ejemplo del sandbox que ya eran Pro siguen Pro sin suscripción. «Ver
Pro» en el panel ahora lleva a Tu plan. El cobro de Pro va a la cuenta de To'Latino (no a Stripe Connect) con la tarjeta del
dueño._

## Fase 2 · 2n Super Admin › Planes
1. Ana › **Planes y suscripciones**: las cifras; pestañas Planes, Suscripciones, Comisiones.
2. Suscripciones › un negocio en prueba › **Extender prueba** (7 días, con motivo) → el dueño lo ve en Tu plan.
3. **Cortesía** 30 días → el negocio queda Pro sin cobro.
4. Comisiones › Pedidos › **Programar cambio** → sale PROGRAMADO a 30 días.
_Del diseño queda para después la pestaña «Ingresos» (con Analítica de dinero) y editar el precio, la prueba y el techo
desde la pantalla (hoy son decisión tuya y se cambian con una actualización)._

## Fase 2 · 2o Super Admin › Negocio 360° › Dinero
1. Ana › Negocios › Sabor Dominicano › pestaña **Dinero**: cobrado, retenido, devuelto, comisión; Stripe y pagos al banco.
2. **Pausar pagos** con un motivo → Pedro recibe el aviso y en su panel › Cobros ve «retenidos por To’Latino» con el motivo.
3. **Reanudar pagos** → vuelve a «Cada semana · los martes».
4. Plan y facturas: **Extender prueba** (7/14/30), **Pro de cortesía** (30/60/90), **Anular suscripción**.
_Compuesto de la pestaña «din» del prototipo. Decisiones (AB): pausar pagos lo puede quien aprueba transacciones (Admin y
Finanzas); con Stripe real se pone el calendario de pagos en manual (lo más seguro y reversible). Los pagos al banco se
calculan de lo cobrado (Stripe hace el pago los martes); al encender Stripe se leerán de Stripe. Agregué «Anular
suscripción», que estaba en el diseño y faltaba. La pestaña «Operación» del diseño llega con Analítica._

## Fase 2 · 2p Mensajes (vecino ↔ negocio)
1. Marisol › página de **Sabor Dominicano** › botón **Mensaje** → escribe; prueba escribir un teléfono (no se envía).
2. Pedro › Panel › **Mensajes** (y Hoy › «Mensajes sin responder») → contesta con una respuesta rápida; **Compartir mi teléfono**.
3. Marisol ve la respuesta sin recargar; en Mi cuenta › Resumen sale «Sabor Dominicano te escribió».
4. Panel › **Respuesta automática fuera de horario** encendida → con el negocio cerrado contesta sola.
5. **Reportar** una conversación → Ana › Colas › **Mensajes reportados**: lee el hilo, oculta un mensaje, cierra el caso.
_Compuesto de USR-MENSAJES / USR-CHAT-NEG (Mi cuenta) y la sección Mensajes del Panel v2. Decisiones (AB): una
conversación por vecino y negocio; solo negocios con dueño; el negocio no escribe en frío; sin teléfonos en el texto (de
nadie); avisos: al negocio el primero sin leer (con SMS), al vecino en la app (sin SMS); la conversación se actualiza
cada 4–5 s mientras está abierta (tiempo real con WebSocket queda para el lanzamiento). El botón «Mensaje» va junto a
Llamar en la ficha (en el diseño está en la hoja de Llamar de escritorio). «El Compa contesta por ti» y «Sugerir
respuesta» llegan con El Compa (Fase 4). Fotos en el chat, después (LAUNCH-CHECKLIST). Cola nueva «Mensajes reportados»
(48 h). Arreglos de accesibilidad de paso: IconButton y todos los interruptores con teclado y nombre (guardianes)._

## Fase 2 · 2q Correo y recibos
1. Marisol › Mi cuenta › **Perfil**: escribe su correo, Guardar → «Confirma tu correo» → en el sandbox **Abrir el enlace** → «Tu correo está confirmado».
2. Termina un pedido de Marisol (Pedro: Entregado) → Ana › Notificaciones › **Correos**: «Recibo de tu pedido #…» EN MODO PRUEBAS → ábrelo: así le llega.
3. Pedro confirma una mesa → «Mesa confirmada». Un cobro de Pro → «Recibo de Pro».
4. Mi cuenta › Avisos › Correo › **Recibos** apagado → ya no llegan.
_Decisiones (AB): PLAN §8 dice SES; la firma la hacemos nosotros (sin SDK) y se prueba contra el vector oficial de AWS en
CI. Solo correos confirmados (enlace de un solo uso, 24 h). En el sandbox ningún correo sale (modo pruebas, candado: nunca
en producción). El equipo ve los correos enmascarados y el enlace de confirmar tapado. El «Resumen semanal del barrio»
(Avisos) llega con Comunidad._

## Fase 2 · 2r Disputas con el banco
1. Ana › Transacciones › un pedido pagado con tarjeta › **Simular disputa** (solo sandbox) → Colas › **Disputas con el banco**.
2. En el caso: monto, cliente, plazo del banco, motivo y **la evidencia que tenemos** → **Responder con evidencia**.
3. Transacciones › **Banco: gana el negocio** (o el cliente) → Pedro recibe el resultado y lo ve en Cobros (GANADA / PERDIDA).
4. Otro caso › **Aceptar devolución** → el dinero vuelve al cliente.
_Decisiones (AB): la cola la trabajan Admin y Finanzas (Finanzas ahora ve Colas, solo esta). Decidir pide también permiso
de dinero. La evidencia sale de nuestros datos (pedido, línea de tiempo, entrega, mensajes, devoluciones); el resumen para
el banco lo escribe el equipo. Una disputa ya cerrada no cambia con un aviso tarde del banco. Subir fotos de entrega como
evidencia: LAUNCH-CHECKLIST._

## Fase 2 · 2s Planes › Ingresos
1. Ana › Planes y suscripciones › **Ingresos**: comisiones y Pro de 8 semanas, comisión por categoría → **Exportar CSV**.
_Del diseño (pestaña «ing»), con el BarChart y HBars del sistema. Las cifras salen del libro propio (cobros y Pro)._

## Fase 3 · 3a Servicios y reglas de citas
1. Entra como **Luis** (570-555-0166, Barbería El Primo) › Lo que vendes › **Servicios**: categorías Cortes/Barba, pestañas Servicios · Extras · Barberos. Abre **Fade**: duración, tiempo entre citas, precio por silla (Luis, Kelvin, Andy, Johan) y el grupo de opciones «Largo del pelo».
2. **Cómo trabaja tu negocio** (empleados / comisión / rentan silla) y Lo que vendes › **Citas** (al instante o revisar, tiempo de respuesta, depósito, cancelar gratis) y **Sillas** (cada barbero con sus reglas).
3. Ana › Negocios › Barbería El Primo › **Lo que vende**: pausar Servicios o Citas y ocultar un servicio (el dueño ve el motivo).
_Decidido por mí (reversible): depósitos $0/5/10/20/50; con sillas rentadas cada silla decide sus reglas y las del negocio valen para quien no tenga; los servicios son `items` con módulo `svc` (igual que el menú, mismo ocultar del admin)._

## Fase 3 · 3b Ficha y reserva de citas
1. Entra como **Marisol** (570-555-0122) › Barbería El Primo › **Servicios**: por servicio (rangos «$22–$28») y **Por barbero** (confirma al instante / responde en ~15 min, próxima hora).
2. Toca **Fade** › elige **Luis** (depósito $10) › **Elegir día y hora**: mañana las 10:00 y 10:30 salen tachadas (cita de ejemplo de Juan + limpieza). Elige 11:00 › Detalles › Revisa y envía › **Enviar solicitud** con la tarjeta 4242 → «Solicitud enviada · PENDIENTE DE CONFIRMAR».
3. Prueba la tarjeta 0002 (rechazada): no se crea la cita. Con **Kelvin** (confirma al instante) sale **Confirmar cita** y queda confirmada.
4. En el teléfono de Luis (570-555-0166) llega el aviso de la solicitud.
_Decidido por mí (reversible): el depósito se **retiene** al enviar y se cobra al confirmar (al instante si confirma solo); si no se confirma se libera sin esperar un reembolso. Las sillas rentadas no piden depósito en línea hasta tener su propia cuenta de cobro (3d): así nunca va el dinero del barbero a la cuenta del local. «Por barbero › Booking» muestra los servicios de esa persona con sus precios (la página propia de cada silla llega en 3d). El Booking abre en el primer día con horas libres. Los textos que en el diseño decían «por SMS» dicen «en Avisos» hasta que haya proveedor de SMS._
_Accesibilidad: día, hora, persona, opciones, extras y los Chip del sistema ahora son radios/casillas/botones con teclado (parche en scripts/portar-sistema.mjs); sirve también a la reserva de mesa._

## Fase 3 · 3c Estado de la cita + Panel › Citas
1. Marisol pide un Fade con Luis (depósito $10). En el panel de **Luis** › Hoy aparece con **Confirmar / Otra hora / No puedo**. Toca **Otra hora**.
2. Marisol abre la cita: «Te propone otra hora» → **Aceptar esta hora** (se cobra el depósito). Luego **Cambiar hora** → otra hora → **Pedir el cambio**; Luis lo acepta desde el detalle.
3. Marisol **cancela** con tiempo: «Te devolvemos los $10». Prueba también **Voy tarde** (sale «LLEGA 10 MIN TARDE» en Hoy) y, con una cita de hoy, **Llegó · en atención → Terminada · cobrar** y las estrellas para calificar.
4. Panel › **Clientes** (filtros) y Mi cuenta › **Citas y reservas**.
_Decidido por mí (reversible): las solicitudes vencen a las 2 h o al llegar la hora (lo que pase antes); «otra hora» da 2 h al cliente; un cambio pedido por el cliente vence si el negocio no contesta en 2 h y la cita sigue igual; el teléfono del cliente se ve en el panel solo con la cita confirmada; «No llegó» solo después de la hora de la cita; el recordatorio sale 24 h y 2 h antes por Avisos. Las reseñas de una cita salen «VERIFICADA · CON CITA»._
_Arreglado de paso: la etiqueta del sistema con un tono desconocido rompía la pantalla; ahora usa el neutro (parche en portar-sistema)._

## Fase 3 · 3d Staff con silla propia
1. Abre **Barbería El Primo › Servicios › Por barbero › Ver su página** (Kelvin): «Barbero · Silla 2 en Barbería El Primo», la tarjeta del local, sus precios y «confirma al instante».
2. Entra como **Luis** › Lo que vendes › **Sillas**: «Pedirle a Kelvin que la conecte». Luego entra como **Kelvin** (570-555-0177): en Avisos toca «Conecta tu cuenta de cobro» › **Conectar mi cuenta** (en el sandbox se completa sola).
3. Pide una cita con Kelvin: ahora pide $5 de depósito y va a la cuenta de Kelvin, no a la del local.
_Decidido por mí (reversible): cada silla rentada tiene su propia cuenta de Stripe Connect (MCC 7230 barberías/salones) y la conecta el barbero, porque Stripe exige que el alta la haga el titular; hasta conectarla su silla no pide depósito. La página «Tu cuenta de cobro» del barbero no estaba en el diseño (la decisión era «sin panel aparte del rentero»): es la única pantalla suya y está hecha con el marco de Mi cuenta._
_Arreglado de paso: la página de una silla se caía si había servicios que esa persona no hace; nuevo guardián `findSeguro` («.find(...)!.»)._

## Fase 3 · 3e Ayuda con la cita + Admin › Transacciones › Citas
1. Entra como **Marisol** (570-555-0122) y abre una cita **terminada** (Mi cuenta › Citas): toca **Ayuda con la cita**.
   Elige «No quedó como lo pedí» (pide foto), cuéntalo, agrega una foto, elige **Que me devuelvan** y envía: queda
   «PENDIENTE · Esperando a Luis».
2. Entra como **Luis** (570-555-0166): en **Hoy** sale «Ayuda con citas · responde en 24 h». Abre la cita: elige
   **Proponer otra cosa**, pon $6 y un mensaje. Vuelve como Marisol: «TE PROPONEN UN CAMBIO» › **Aceptar $6** (vuelve a su
   tarjeta, del depósito).
3. Con otra cita, Luis responde **No puedo** y Marisol toca **Pedir revisión a To'Latino**. Entra como **Ana** (admin):
   Colas › **Ayuda con pedidos y citas** › «Ayuda con una cita»: **Resolver con un mensaje** o **Resolver y devolver**.
4. Super Admin › **Transacciones › Citas**: cada cita con servicio, total, depósito, cobro, devuelto y comisión (8 %).
_Decidido por mí (reversible): a la tarjeta solo vuelve el depósito pagado en la app (lo pagado en el local se arregla en
el local, y así lo dice cada pantalla); devolver dinero desde la respuesta pide el permiso de Cobros (solo el dueño); la
solicitud usa la misma tabla y la misma cola de soporte que la ayuda con pedidos (cola renombrada «Ayuda con pedidos y
citas»). En el teléfono, «Te falta» va debajo de «Cómo funciona» (en el diseño solo estaba en la columna de escritorio)._
_Arreglado de paso: en el teléfono, toda la sección `/cita/` mostraba la barra de pestañas de la app (Inicio · Negocios…)
encima de la barra propia de la pantalla; nuevo guardián `barraFijaCompacta`._

## Fase 4 · 4a Servicios de Auto y Hogar, Tu herramienta
1. Entra como **Rafael Peña** (570-555-0211, Taller Hermanos Peña) › Lo que vendes: **Servicios** (resumen «Nada se hace
   ni se cobra sin el OK del cliente», cada servicio con cómo se cobra), **Taller y estimados** (tarifa, garantía, mismo
   día) y **Citas**. Abre un servicio y cambia «Cómo lo cobras»: «Así lo ve el cliente» cambia al momento.
2. Entra como **Tomás Rodríguez** (570-555-0222, Plomería Rodríguez 24/7) › Lo que vendes: Servicios de Hogar (visita ·
   precio cerrado · por hora · por medida · presupuesto · emergencia · plan) y **Visitas, planes y renta** (hasta dónde
   vas, emergencias 24 h).
3. Super Admin › Negocios › Taller Hermanos Peña › Lo que vende: Tu herramienta en solo lectura y cómo cobra cada servicio.
_Decidido por mí (reversible): «Servicios de Hogar» no tiene pantalla en el diseño; es la de Auto (asvDet) con las formas de
cobrar de Hogar. Tu herramienta guarda cada toque, como el diseño. Los planes y la renta de herramienta (sus interruptores
en Tu herramienta) llegan con el bloque 4f; Mi vehículo y Mi casa, con el Booking (4b). El Booking de Belleza ya no se
abre para un taller o un servicio del hogar (cada uno tendrá el suyo)._
_Arreglado de paso: los campos de texto del panel no tenían nombre accesible propio (el lector de pantalla leía también
el contador y la ayuda); ahora cada campo se llama como su etiqueta._

## Fase 4 · 4b Ficha y Booking de Auto y Hogar
1. Entra como **Marisol** (570-555-0122) › **Taller Hermanos Peña** › Servicios: toca «¿Qué carro es?» y agrega tu carro
   (Honda · CR-V · 2016). La hoja dice «Trabajan con tu CR-V». En **Hazleton Diesel & Truck** dice que no trabaja con Honda.
2. Pide **Cambio de aceite** (elige el aceite) › Elegir día y hora › Booking de 3 pasos (Tu carro · Día y hora · Revisa
   y envía, con «Guárdame las piezas viejas»). Entra como **Rafael** (570-555-0211): la solicitud está en Hoy; Confirmar.
3. **Plomería Rodríguez 24/7** › Servicios › «¿Dónde es?» › Tu casa (dirección de Mi cuenta, dueño o inquilino, año…).
   Pide **Cambiar grifo**: franja de llegada de 2 h, depósito de $40 y, si alquilas, el permiso del landlord.
_Decidido por mí (reversible): la dirección de Tu casa sale de Mis direcciones (para medir la zona en millas de verdad; en
el diseño era texto libre). Tu vehículo y Tu casa piden entrar para guardarse (el diseño dejaba «solo esta visita» sin
cuenta). Un carro que se deja (o un trabajo de días) ocupa media hora de entrega en la agenda, no la bahía todo el día.
Mientras llegan sus bloques: grúa, emergencia y plan se piden llamando; la página de la cita es la de Belleza (la de Auto y
Hogar, con sus pasos En camino / Llegó / Estimado, llega en 4c)._


## Fase 4 · 4c La cita en el taller y la visita a la casa (en curso)
1. Entra como **Marisol** y pide **Cambio de aceite** en Taller Hermanos Peña (o usa la que ya tengas confirmada para hoy).
   Entra como **Rafael** (570-555-0211) › Hoy › la cita: el detalle muestra el carro, el millaje, si lo deja, las luces y
   las piezas viejas. Toca **Recibí el carro** → **Empezar** → **Listo para recoger**. En el teléfono de Marisol, Tu cita
   cambia a «Revisando tu CR-V · EN EL TALLER», «TRABAJANDO» y «Listo para recoger»; toca **Ya lo recogí**.
2. Pide **Cambiar grifo** en Plomería Rodríguez 24/7 para hoy. Entra como **Tomás** (570-555-0222): **Voy en camino** →
   **Llegué** → **Terminé**. Marisol ve «va en camino · llega dentro de tu franja», «EN TU CASA» y «Revisa el trabajo antes
   de pagar»; toca **Todo bien**. Prueba también **No había nadie** con otra visita.
_Decidido por mí (reversible): «Cómo llegar» y «Voy tarde» no aparecen en una visita a casa (el profesional va al cliente).
Una vez que el negocio marca el primer paso, el cliente ya no cancela desde la app: usa Ayuda con la cita. «No había
nadie» se puede marcar desde que empieza la franja y sigue la regla del depósito de cancelar tarde (el depósito se queda).
El cliente cierra la cita con «Ya lo recogí» / «Todo bien», o el negocio con «Lo entregué» / «Cerrar la visita»._

## Fase 4 · 4d El estimado línea por línea, «algo más» y el dinero
1. Pide **Diagnóstico con escáner** en **Taller Hermanos Peña** (Marisol, 570-555-0122). Como **Rafael** (570-555-0211):
   Hoy › la cita › **Recibí el carro** › **Armar el estimado** › plantilla **Frenos** (agrega pastillas, discos, líquido y
   pastillas traseras; las «necesario ahora» piden foto) › **Mandar al cliente**.
2. En el teléfono de Marisol, Tu cita dice «Revisa lo que encontraron»: las líneas en necesario ahora / recomendado /
   puede esperar, con por qué, pieza, mano de obra e impuesto. Marca el líquido y **Aprobar 3 arreglos**.
3. Rafael: **Encontré algo más** (manguera de freno, con foto) › Marisol dice **No, déjalo así**. Rafael: **Lo final** (baja
   las pastillas $10) › **Listo para recoger**. Marisol ve «Al recogerlo» y **Ya lo recogí · pagar**.
4. Repite con **Plomería Rodríguez 24/7** (Tomás, 570-555-0222; cobra con tarjeta): **Visita y diagnóstico** › Llegué ›
   **Armar el precio completo** escribiendo una línea a mano › Marisol aprueba con su tarjeta (se retiene) › algo más › Sí ›
   lo final baja $15 › Terminé › **Todo bien · pagar**: Tu dinero dice «Cobrado … Se liberaron $15».
5. Super Admin › Transacciones › Citas: cada cita dice «estimado: aprobado $X · cobrado en la app $Y» y el KPI
   «Retenciones que fallaron».
_Decidido por mí (reversible): el panel para armar el estimado no está en el diseño (hueco #1 del plan): lo compuse con
los bloques del panel (plantillas por clase, urgencia, qué es, por qué, pieza y precio, horas, foto, total para mirar).
Se retiene en la tarjeta del cliente cuando aprueba (él está en la app y elige la tarjeta), no al dejar el carro: así no
hace falta cobrar fuera de sesión salvo para renovar retenciones de más de 7 días. La primera retención incluye lo que
falta del servicio o el diagnóstico (menos el depósito), para que al final todo se pague en la app. Un negocio sin cobro
con tarjeta (como el taller de ejemplo) no retiene nada: el panel dice cuánto cobrar en el local. «Algo más» se pregunta
de a uno. Mandar una versión nueva solo mientras el cliente no ha respondido. El estimado de un servicio de precio
cerrado no existe: ahí solo hay «algo más». Las plantillas son las líneas de ejemplo del prototipo (solo en pruebas)._
_Arreglado de paso: (a) en la pasarela, un comentario se tragaba `transfer_data` del cobro real de Stripe (el dinero no
iba al negocio); guardián nuevo `comentarioTragaCodigo`. (b) Los −/+ del panel (mano de obra, tiempos, horario) no se
podían usar con teclado; ahora son botones. Guardián `panelClicMudo` (trinquete para los 18 que quedan)._

## Fase 4 · 4e-1 Pre-estimado con fotos
1. Marisol › Taller Hermanos Peña › Servicios › **Pastillas de freno** › «¿No sabes cuánto va a salir?» › **Pedir
   pre-estimado**: luces, qué le pasa, una foto, para cuándo › Enviar. Ves «Esperando a Rafael».
2. Rafael › Hoy › **Pre-estimado #P-…**: ve la nota, las luces y la foto; manda un **rango** ($180–$260, qué incluye, qué
   puede cambiarlo). Marisol ve «TU PRE-ESTIMADO $180–$260» › **Reservar con este pre-estimado** › elige el eje › Booking
   con «Con tu pre-estimado». En el panel, la cita dice «Reservó con el pre-estimado».
3. Plomería Rodríguez › Visita y diagnóstico › pre-estimado del baño › Tomás responde **No lo hacemos**: Marisol ve otros
   negocios de la ciudad.
_Decidido por mí (reversible): el pre-estimado acepta fotos (no video todavía: el almacenamiento de video y su revisión
van en el bloque de medios). El panel para responder no está en el diseño (hueco #3): lo compuse con chips, campos de
desde/hasta, «qué incluye» y «qué puede cambiarlo» una por línea, cuánto tarda y un mensaje. Si «hasta» pasa 4 veces
«desde», se pide «Hay que verlo». La página del estado es `/pre/{número}` (`/solicitud/` ya es de los empleos)._
_Arreglado de paso: guardián `fechaEnInglesSQL` (to_char con «Dy»/«Mon» sale en inglés en una pantalla en español)._
_Pendiente para 4g: la tarjeta «Tu pre-estimado» en la ficha y la lista en Mi cuenta._

## Fase 4 · 4e-2 Presupuesto a hasta 3
1. Marisol › Plomería Rodríguez › **Cambiar tubería** › «¿Quieres comparar?» › **Pedir a hasta 3**: la plomería viene
   elegida; elige otro (los que no llegan a tu casa no se pueden), dónde, qué quieres, medidas, una foto › **Pedir 2
   presupuestos**.
2. Tomás › Hoy › **Presupuesto #Q-…** («lo pidió a 2 negocios»): rango, visita para medir ($0 = gratis), cuánto tarda.
3. Marisol ve «Respondieron 1 de 2» y luego «Ya respondieron todos · Desde $1,200», compara y toca la plomería: hoja del
   servicio › Booking «Con tu presupuesto». Los otros se cierran y se les avisa.
_Decidido por mí (reversible): los candidatos son negocios Pro de Hogar con un servicio «presupuesto» que comparten al
menos una subcategoría con el de la ficha (el diseño lo saca por tipo de trabajo). En el sandbox aparece también «To'Latino
Demo · Hogar» (negocio de ejemplo)._

## Fase 4 · 4e-3 Emergencia 24/7
1. Marisol › Plomería Rodríguez › el servicio de emergencia › **Pedir ayuda ahora**: arriba la línea del 911; «Fuga que no
   para» ya elegida, salida con recargo $179–$189 › **Pedir ayuda ahora** → «Buscando quien vaya · se lo mandamos a 2
   negocios 24/7».
2. Tomás › Hoy: la emergencia arriba en rojo › **Ver y aceptar** › **Aceptar · salgo ahora** → abre la visita «en camino».
   Marisol ve «Aceptó · va en camino · Plomería Rodríguez 24/7 · llega en unos 60 min · salida $189 con el recargo de
   $100 incluido» y su visita.
3. Si dos negocios aceptan a la vez, gana uno; el otro ve «Ya la tomó otro negocio». Si nadie acepta en 15 min: «Nadie
   disponible» y «Mandarla otra vez».
_Decidido por mí (reversible): la salida no se retiene al llegar (el diseño lo dice): se paga al terminar, como el resto de
la visita; si el negocio cobra con tarjeta, entra en la primera retención de lo que el cliente apruebe (4d). Así no hace
falta cobrar fuera de sesión a alguien en plena emergencia. El panel de emergencias no está en el diseño (hueco #4): es una
nota roja arriba en Hoy y un detalle con «Aceptar · salgo ahora» (sin sonido: el aviso llega por SMS). Por ahora se entra
desde la ficha del negocio; la banda de la página de categoría Hogar llega con su bloque._
_Arreglado de paso: si una acción del panel no se podía (p. ej. «ya la tomó otro negocio», «esta cita ya cambió»), la
pantalla no se ponía al día; ahora se refresca igual (lo escrito no se pierde). Guardián `emergencia911`._

## Fase 4 · 4f-1 Planes del hogar
1. Marisol › **Multiservicios Hermanos Díaz** › «Mantenimiento de la casa» › **Empezar el plan · $149/mes**: tu casa, día
   fijo, primera visita, qué revisar, cómo entrar, tarjeta › Empezar. Ves «Plan activo · próxima visita · hoy no se cobró
   nada» y las 4 próximas visitas.
2. Como **Héctor Díaz** (570-555-0233, dueño de prueba): Hoy › «Tus planes · 1 activo».
3. En tu plan: **Saltar la próxima**, **Pausar un mes**, **Reanudar**, **Cancelar el plan**.
_Decidido por mí (reversible): «el mismo día cada mes» es el N-ésimo día de la semana (p. ej. el 2.º lunes) para que la
visita caiga siempre en un día que el negocio abre; el cobro es el mismo día del mes que la primera visita (tope 28). Saltar
también salta el cobro de ese mes. Al tercer rechazo del banco, el plan queda en pausa hasta cambiar la tarjeta. Los planes
semanales, quincenales, por temporada o por nevada del ejemplo (fr semana/quincena/temp/nevada) se siguen pidiendo
llamando; el Plan de confort de Cibao visita solo en octubre y abril (svc_attrs.vis). Las visitas del plan son citas de $0
(las paga el plan). En el sandbox, Hermanos Díaz tiene dueño de prueba y cuenta de cobro simulada._
_Arreglado de paso (dinero): la clave idempotente del cobro del plan se repetía al reanudar o al cambiar la tarjeta (el
segundo cobro «salía» sin cobrar, o el reintento repetía el rechazo); ahora es el número de intento, que no se repite._

## Fase 4 · 4f-2 Renta de herramienta
1. Marisol › **Multiservicios Hermanos Díaz** › pestaña **Tienda**: 4 herramientas con RENTA, precio por día y cuántas
   quedan › **Apartar** en «Culebra de drenaje» › 2 días › hoy › **Apartar · $50 al recoger** → «Apartada · hoy no se
   cobró nada».
2. Como **Héctor Díaz** (570-555-0233): Hoy › «Rentas» › la renta › **La recogió** → se cobran $50 y se retienen $50.
3. Marisol › tu renta: «La tienes» › **Un día más · $25**.
4. Héctor › **La devolvió con un daño**: foto, monto y qué se dañó › Marisol ve la foto y elige **Está bien** o **No estoy
   de acuerdo** (este último llega a Super Admin › Colas › «Daños de rentas»: Descontar / No descontar).
5. Tu herramienta › «Renta de herramienta · apartada 48 h»: apagar un artículo lo quita de la Tienda.
_Decidido por mí (reversible): la Tienda de Hogar muestra por ahora solo lo que se renta; lo que se vende («Apartar» de
productos) usa el apartado de Tiendas del diseño (TLApartar → TLTiendaFlow) y llega en el bloque siguiente (4f-3). Al
recoger, primero se retiene el depósito y después se cobra la renta; si la renta no pasa, se suelta el depósito y no se
cobra nada. Los días tarde salen del depósito (hasta el depósito; sin depósito, a la tarjeta) con la comisión de renta; el
daño no lleva comisión. El daño (con foto, monto hasta lo que queda del depósito y lo que se dañó) lo decide el cliente;
si no está de acuerdo o no responde en 72 h, entra a una cola nueva del Super Admin. Las pantallas del panel (lista y
detalle de rentas, el formulario del daño) y la tarjeta del daño en la renta del cliente no están en el diseño (hueco #5):
se componen con los bloques del panel y como «algo más» del estimado (4d). «48 horas» se cuenta desde el inicio del día que
elegiste para recoger. Los días para recoger: hoy (si falta más de media hora para cerrar), mañana y el sábado; si alguno
no abre, el siguiente que abre. El editor de artículos de la Tienda (nombre, precio por día, depósito, unidades, foto)
llega con el de Tiendas; hoy los artículos de prueba vienen de la semilla 0016 (solo sandbox)._

## Fase 4 · 4f-3 Apartar productos (Auto y Hogar)
1. Marisol › **Taller Hermanos Peña** › **Tienda** › «Batería Interstate» › Apartar; «Limpiaparabrisas» › 2 › Apartar →
   abajo «$207 en la caja · Ver apartado» › Continuar › mañana 9 AM › Continuar › **Apartar** → «Apartado enviado».
2. Como **Rafael** (570-555-0211): Hoy › «Apartados · 1 por confirmar» › **Lo tengo · guárdalo** (o **Falta uno**: Marisol
   ve «Falta algo» y toca **Quitarlo y seguir**) › cuando pasa, **Lo recogió**.
3. **Llantera El Cibao** › Tienda: gomas NUEVA / USADA con filtros «Para tu …» (con la medida de Tu vehículo), Nuevas,
   Usadas.
_Decidido por mí (reversible): «Apartar» de Auto y Hogar es el apartado de Tiendas del diseño (TLApartar → TLTiendaFlow),
construido ahora como motor común (`kind 'hold'`, A-…); el plan de pagos (abono), las tallas y el envío a casa llegan con
el bloque de Tiendas. La tienda tiene hasta 30 min antes de la hora elegida para confirmar (mínimo 30 min); si no, vence
(el diseño dice «en unos minutos» sin plazo). Las unidades se reservan al enviar; si la tienda dice que no lo tiene o que
falta uno, esa existencia queda en 0 (la app la tenía mal). «Falta uno» sin tallas = quitarlo o cancelar; 24 h para
decidir. El carrito vive en el teléfono (como en el diseño). El panel de apartados no está en el diseño (hueco #5): se
compone con sus bloques. Máximo 3 apartados abiertos por tienda y persona. Las estrellas de «¿Cómo te fue?» llevan a la
reseña verificada con el apartado._
_Arreglado de paso: en la pestaña Tienda la barra de Booking de la ficha tapaba la barra «Tu apartado» (no se podía tocar);
guardián `barraDoble`. Y una consulta con un parámetro sin tipo junto a un `interval` no dejaba mandar el apartado
(42804); guardián `parametroSinTipo` (ambos probados al revés)._

## Fase 4 · 4g-1 Reseña de Hogar y Auto
1. Marisol › Plomería Rodríguez › una visita terminada › 2 ★: arriba «Tu visita · dato de la visita» (llegó en la franja,
   aprobaste, cobrado · lo cotizado, algo extra con tu OK); preguntas del hogar; abajo «La reseña no devuelve dinero…» con
   «Ir a Ayuda con la visita». Publicada, la tarjeta muestra esas marcas.
2. Taller Hermanos Peña › una cita terminada › 5 ★: «Tu cita · dato de la cita» y las preguntas de autos.
_Decidido por mí (reversible): «llegó en la franja» = «Llegué» antes del final de la franja de 2 h; con cita no se pregunta
el precio (sale del dato). La variante de lavado (precio publicado · a tiempo · quedó limpio · cuidaron tu carro) usa por
ahora las preguntas de Auto; «Lo que importa en el hogar / en autos» en la pestaña Reseñas (porcentajes) llega con 4g-3._

## Fase 4 · 4g-2 Ayuda con la visita y con la cita
1. Marisol › una visita terminada de Plomería Rodríguez › «Ayuda con la visita» › «Quedó mal o volvió a fallar» (foto
   obligatoria) › Devolución a mi tarjeta › Enviar.
2. Como Tomás (570-555-0222): el detalle de la cita › «Proponer otra cosa» (puedes devolver hasta lo cobrado del estimado)
   › $40 › Enviar. Marisol › «Aceptar $40» → vuelven a su tarjeta.
3. Auto (Taller Hermanos Peña): «Dañaron algo del carro» › «Que lo revisen otra vez sin cargo» › Rafael «Tiene razón».
_Decidido por mí (reversible): «Que vuelva sin cargo» aceptado se coordina por Mensajes o teléfono; la reserva de garantía a
$0 desde la app (el diseño: Booking con `warr: true`) queda en LAUNCH-CHECKLIST. «Devolución al To'Latino Wallet» no está
porque no hay Wallet. Lo que se devuelve sale del cobro de la visita con más saldo (estimado, «algo más», visita o depósito)._
_Arreglado de paso: la ayuda de Belleza tomaba el texto de Hogar/Auto («belleza» cuenta como verdadero); guardián
`rubroComoBooleano` (probado al revés)._

## Fase 4 · 4g-3 Super Admin y Mi cuenta (cierra Hogar + Auto)
1. Super Admin › Transacciones: pestañas nuevas **Planes**, **Rentas** y **Apartados** (lo cobrado y lo retenido de cada
   uno; un apartado dice «en la caja · sin cobro en la app») y la cifra «Planes · rentas · apartados».
2. Mi cuenta › Citas y reservas: sección «Planes, rentas y apartados» (abiertos en Próximas, cerrados en Pasadas).
_Decidido por mí (reversible): los pre-estimados, presupuestos y emergencias no son transacciones (no mueven dinero): se
ven en su cita cuando reservan; un listado propio en el Super Admin queda para Analítica (% de pre-estimados que terminan
en cita, tiempo de respuesta a emergencias), en LAUNCH-CHECKLIST. «Devolver» desde Transacciones sigue para pedidos y
depósitos de citas; en planes y rentas se devuelve desde la ayuda de la cita o la cola de daños._

## Fase 4 · Doctores + Profesionales: plan y decisiones tomadas por defecto
Plan en `docs/diseno/plan/fase4-salud-pro.md` (bloques 4h–4m). Decidido por mí (lo más seguro y reversible; detalle en §7
del plan):
1. **Profesionales no cobra en la app** (abogados, impuestos, notarios, reparación de crédito, envíos, fianzas, seguros tienen
   reglas propias que no hemos validado con un abogado): la app guarda la consulta, «El total, por escrito» y la aceptación;
   se paga en la oficina y To'Latino no cobra comisión. Queda un interruptor por tipo, apagado.
2. **Datos de salud al mínimo:** solo el motivo (chip), la nota cifrada y borrada a los 30 días, del seguro solo los 4
   últimos números, avisos sin nombre de la clínica ni del servicio, nada en analítica ni en El Compa. Revisión legal (HIPAA)
   en LAUNCH-CHECKLIST.
3. **Salud no pide tarjeta ni cobra «no vino»** (Medicaid no lo permite).
4. **Devoluciones de lo pagado en la clínica u oficina:** las hace el negocio; el cliente confirma «Me lo devolvieron» y
   To'Latino media.
5. **Nota de Profesionales:** opcional, con aviso de no escribir números de caso ni documentos; cifrada y borrada a los 30
   días; sin subir documentos.

## Fase 4 · 4h-1 Servicios de Doctores y Profesionales
1. Como **Dra. Altagracia Reyes** (570-555-0244, Centro Médico Quisqueya): Lo que vendes › Servicios › Agregar → «Cómo lo
   cobras»: Consulta · Por video · Sin cita · Gratis con tu seguro · Precio fijo; «Según tus ingresos»; IMPORTANTE.
2. Como **Luis Ferreira** (570-555-0255, Ferreira Injury Law): honorario $350 + gobierno $465 → «Tu página dice el total:
   $815»; «% solo si ganas» (1–50 %).
_Decidido por mí (reversible): los servicios de Doctores y Profesionales usan el mismo editor y el mismo motor de citas por
persona de Belleza (3a–3b), con su forma de cobrar; el editor propio que pide el plan (copia de Auto) no hace falta. El
catálogo de seguros de PA (13) y las licencias de salud (17 tipos, buscador oficial PALS) entran en la migración 0057
(son datos reales, no de ejemplo). Dueños de prueba solo en el sandbox._

## Fase 4 · 4h-2 Tu herramienta de Doctores y Profesionales
1. Como **Dra. Altagracia Reyes** (570-555-0244): Lo que vendes › «Seguros e idiomas». Enciende Cigna, apaga Medicaid (la
   tarjeta de Buscar pasa a «Medicare y CHIP · sin seguro $85»), sube la consulta sin seguro, marca Português e intérprete.
2. Como dueño de **Bufete Almonte** (570-555-0166): «Licencias y el total por escrito» → en «Renovar la green card» sube la
   tarifa del gobierno: el total pasa de $815 a $820.
3. Como **Edwin Paulino** (570-555-0277, TecnoFix): «Listo en» y «Garantía» (de 15 en 15 días).
4. Super Admin › Negocios › cualquiera de los tres › «Lo que vende»: su herramienta en solo lectura.
_Decidido por mí (reversible):_
- _«Plan de pagos» y «Casos urgentes» se encienden en Tu herramienta de Profesionales (el plan pide esos filtros y el diseño no
  traía de dónde salen); compuestos con la fila con interruptor del sistema._
- _«Intérprete en la consulta» sale como interruptor (hueco #5 del plan). El enlace del video va con la cita (4j), no aquí._
- _El tipo de profesional (legal, seguros, reparación…) sale de su primera subcategoría, como en el prototipo._
- _Arreglado: la pestaña «Lo que vende» del Super Admin no salía para Auto, Hogar ni Doctores (solo escribiendo la dirección).
  Ahora sale de la misma lista que su contenido; queda un guardián (pestanaVende)._

## Fase 4 · 4h-3 Licencias de cada profesional, Seguros y Mis seguros
1. Como **Dra. Reyes** (570-555-0244): Tu página › Equipo › Luis Fernández, PA-C › SU LICENCIA → «Asistente médico (PA-C)»,
   número, «Mandar a verificar».
2. Super Admin › Negocios › Centro Médico › Lo que vende: «Asistente médico (PA-C) · Luis Fernández, PA-C» → Verificar.
   Desde ahí Buscar puede decir «El médico habla español».
3. Super Admin › Catálogo › Seguros: ocultar uno (pide motivo) y volverlo a mostrar.
4. Como **Marisol** (570-555-0122): Mi cuenta › Mis seguros → Medicaid · UPMC for You con número (solo se guardan los últimos 4).
_Decidido por mí (reversible):_
- _Mis seguros (hueco #6) se compuso con la hoja «Tu seguro» de la ficha de Salud y la lista de Direcciones; también se agrega
  desde aquí (no solo desde la ficha). Hasta 6 por persona._
- _Un seguro nuevo del catálogo entra por migración (son datos reales); el Super Admin solo oculta o muestra._
- _El equipo de prueba del centro médico (Luis, Dra. Rosario, Marisol de recepción) sale del prototipo, sin licencias: se
  verifican como en la vida real._
- _Arreglado: el nombre corto de un profesional tomaba su título («LO PONE DRA.»). Guardián nombreConTitulo._

## Fase 4 · 4i Ficha de Doctores y «Tu seguro»
1. Sin entrar: Centro Médico Quisqueya › Servicios → «Agrega tu seguro» → Seguro privado · Cigna → «No aceptan Cigna · sin seguro $85».
2. Como **Marisol** (570-555-0122, Medicaid · UPMC for You): todo dice «$0 · CON TU SEGURO»; en la hoja, ¿Con quién? solo Luis.
3. Urgencias Express (escritorio): «SIN CITA · AHORA · Espera ~25 min» solo si la espera se actualizó hace menos de 3 h.
_Decidido por mí (reversible):_
- _La espera sin cita se esconde si tiene más de 3 horas (el prototipo siempre la muestra; mostrar una vieja sería mentir)._
- _Sin cuenta, «Tu seguro» vale solo para esta visita (no se guarda en el teléfono)._
- _Mientras llega el Booking de Doctores (4j), la hoja ofrece «Llama para tu cita». «Próxima cita» de cada profesional llega con 4j._
- _Las preguntas frecuentes de Salud por tipo (TLSaludK) quedan para 4m; hoy salen las que puso el consultorio._

## Fase 4 · 4j-1 Booking de Doctores
1. Como **Marisol** (570-555-0122): Centro Médico Quisqueya › Consulta de medicina general › Elegir hora → 3 pasos → «Enviar
   solicitud». Ver «Revisan tu seguro y confirman… No se ha cobrado nada.»
2. Como **Dra. Reyes**: el aviso dice solo «Nueva solicitud de cita para el … a las …» (sin nombres).
_Decidido por mí (reversible):_
- _Si un consultorio no tiene a nadie con licencia verificada, la cita es «con el consultorio» (el primero libre) en vez de
  no dejar pedir. Cuando verifican a alguien, solo esa persona atiende._
- _La nota se cifra en la aplicación (AES-256-GCM) con DATOS_SECRET, que el servidor crea solo (infra/pruebas/deploy.sh);
  en el sandbox local, sin esa llave, se deriva de AUTH_SECRET. En producción es obligatoria._
- _Cambiar una cita de Doctores = cancelar gratis y pedir otra (el consultorio revisa el seguro de nuevo)._
- _El enlace del video y los avisos dicen «a tus Avisos» hasta que el SMS salga de verdad (Telnyx al final)._

## Fase 4 · 4j-2 La cita de Doctores entre el consultorio y el paciente
1. Pide una cita como Marisol; como Dra. Reyes ábrela en Hoy: ves el seguro, el motivo y la nota privada. Toca «No aceptamos
   su seguro». Como Marisol: «Seguir sin seguro · $85» → confirmada.
2. Los avisos (Avisos y SMS) nunca dicen el consultorio, el servicio ni la nota.
_Decidido por mí (reversible):_
- _«Cambiar de seguro» y «Buscar otro consultorio» cancelan la solicitud (gratis) y te llevan al Booking o a Doctores._
- _«Avísame si se libera una hora» no se manda en Salud (el aviso nombraría el consultorio)._

## Fase 4 · 4k Ficha de Profesionales
1. Bufete Almonte › Servicios: «Renovar la green card · $815 · HONORARIO $350 + GOBIERNO $465»; ábrelo: EL TOTAL desglosado.
2. Ferreira Injury Law: «33 % · SOLO SI GANAS · SI NO, $0». TecnoFix (escritorio): sin textos de abogado, «LISTO EN».
_Decidido por mí (reversible): hasta la consulta en línea (4l) la hoja ofrece «Llama para tu consulta»; las preguntas frecuentes por tipo quedan para 4m._

## Fase 4 · 4l-1 Consulta con un profesional
1. Como **Marisol**: Bufete Almonte › Consulta de inmigración › Elegir hora → Por video · Me llegó una carta · nota → hora → Enviar.
2. Como dueño del bufete (570-555-0166): Hoy › la consulta: situación y nota privada; Confirmar.
_Decidido por mí (reversible): si la oficina no tiene a nadie con licencia de persona verificada, la consulta es con cualquiera
del equipo que reciba citas (como en Doctores). La nota rechaza A-number y números de caso._

## Fase 4 · 4l-2 El total por escrito
1. Como dueño del bufete: Hoy › la consulta confirmada › «Pasó la consulta» → honorario $350, gobierno $465, extra «Traducción
   certificada» $60 → «Mandar el total por escrito». Ver $740 (con el crédito de la consulta de $75).
2. Como Marisol: /cita/… → marca el extra → «Aceptar y contratar» → «Tu trámite está en manos de…». Luego «Terminó el trámite».
_Decidido por mí (reversible, Preguntas #1): nada de Pro se cobra en la app; la app guarda el total y la aceptación (el acuerdo),
y se paga a la oficina. Para fijo/% el flujo es el mismo (la oficina manda el total después de la consulta)._


## Fase 4 · 4m-1 Reseñas de Doctores y Profesionales
1. Como Marisol, con una cita de Salud terminada: /n/centro-medico-quisqueya/resena → ver «TU CITA · DATO DE LA CITA» (seguro
   Aceptado, pagaste, con quién; sin plan ni número), las preguntas de Salud y el texto de ejemplo. Escribir «metformina 500 mg»
   → el botón dice «Quitar datos de salud o de tu caso».
2. Con un trámite terminado: /n/bufete-almonte/resena → «TOTAL POR ESCRITO $740 · lo que dijo» y las preguntas del trámite.
3. En la ficha (pestaña Reseñas): las marcas «Aceptaron su seguro», «El médico habló español», «Hizo lo que dijo que podía».
_Decidido por mí (reversible): el filtro de datos privados vale para todas las reseñas (no solo Salud y Pro); la reseña nunca
guarda el nombre del plan del seguro, solo si tenía y si lo aceptaron. Las 6 barras salen desde la primera reseña con respuestas (el % se calcula sobre quienes contestaron)._

## Fase 4 · 4m-2 Ayuda con la cita de Doctores y con el trámite
1. Como Marisol: /cita/{cita de Salud terminada} › «Ayuda con la cita» → «Me cobraron algo que no dijeron» → foto de la
   factura → «Que corrijan el cobro a mi seguro» → Enviar. Como la Dra. Reyes: Hoy › la cita › «Tiene razón» → responder.
2. Como Marisol: /cita/{consulta del bufete} › «Ayuda con el trámite» → «Ofreció algo que no podía hacer por ley» (ver el
   aviso de la Fiscalía) → Enviar. Super Admin › Colas › Licencias: las licencias del bufete con prioridad alta.
_Decidido por mí (reversible): las fotos de ayuda de Salud y Pro son privadas (nunca por /medios) y se borran del
almacenamiento a los 90 días de cerrada la solicitud; el equipo de To'Latino las ve con registro en la auditoría (sin pedir un
motivo escrito todavía: va a LAUNCH-CHECKLIST). «Ley» manda a revisión todas las licencias del negocio, no lo suspende._

## Fase 4 · 4m-3 Super Admin de Doctores y Profesionales
1. Super Admin › Transacciones › Doctores: «Cita de salud · seguro aceptado · nada se cobra en la app» (sin servicio).
   › Profesionales: «total por escrito $740.00 · trámite terminado».
2. Super Admin › Analítica › Doctores y Profesionales (90 días): las cifras y los motivos de ayuda.
_Decidido por mí (reversible): en Transacciones de Doctores no sale el servicio (dice demasiado de la salud de alguien); en
Profesionales sí (el nombre del servicio, nunca la situación ni la nota). Los plazos de Salud/Pro se hacen editables con la
sección Configuración (Fase 5); hoy están en el código._

## Fase 4 · Mercados + Tiendas · decisiones del plan (fase4-mercados-tiendas.md §7, todas reversibles)
EBT solo en la tienda (cobrar EBT en línea pide aprobación del USDA y un procesador pagado) · el cliente que no toca «Está bien,
cobrar» paga lo real ≤ lo retenido al recoger · impuesto por producto (víveres y ropa exentos, comida lista y no-comida 6 %:
validar con contador) · licor, tabaco y vape solo en la tienda · 6 pedidos por franja · «ANTES $X» solo desde una Oferta de
Novedades · «Llámame» sin respuesta en 10 min = se quita · comisión del mercado 10 % aparte · mínimo solo del envío · envío de
la tienda con tarjeta · layaway pagado a mano (sin cargos automáticos), 20 % · 4 pagos · 14 días · 10 % · devoluciones de lo
pagado en la caja las hace el negocio · número M-6101… · servicios de Tiendas solo catálogo.

## Fase 4 · 4n-1 Tu herramienta de Mercados y Tiendas
1. Como Héctor (Supermercado La Cosecha, 5705550288): Panel › Lo que vendes › «Balanza y pedidos»: apagar EBT, subir el
   precio por libra de la pierna, marcar «Yuca» agotada hoy.
2. Como Yaritza (Boutique Yaritza, 5705550299): «Tallas y apartados»: 72 h, encender Layaway (salen abono, pagos, cada cuánto,
   cargo), subir una talla.
3. Super Admin › Negocios › La Cosecha › Lo que vende: productos con «Por libra», ocultar con motivo.
_Huecos del diseño compuestos (REVISION): «Pedidos por franja», «Si algo no hay» y los números del layaway en Tu herramienta._

## Fase 4 · 4n-2/4n-3 Productos de Mercados y Tiendas y envío por correo
1. Como Héctor: Lo que vendes › Productos › «Agregar producto»: «Chuleta de cerdo» $3.49, Carnicería, «Por libra · se pesa
   delante» → sale con /lb y EBT. Otro con «Es de 21+»: queda solo en la tienda.
2. Como Yaritza: «Agregar producto» › «Con tallas» › «S, M, L» → en Tu herramienta salen en 0 para subirlas.
3. Yaritza › Tu herramienta › «Envío por correo»: costo, gratis desde, llega en.
_Decidido por mí (reversible): el envío por correo de las tiendas se pone en Tu herramienta (no en Entrega, que hoy es de los
pedidos de comida con repartidores). El camión propio de la tienda llega con 4q._

## Fase 4 · 4o/4p Ficha y pedido del mercado
1. Como Marisol: /n/supermercado-la-cosecha › Productos › Pierna de cerdo 3 lb «En trozos», Bistec 2 lb, Arroz, Aguacate →
   «Ver pedido» › pickup, hora, tarjeta → «Enviar pedido» (se retienen $36.57).
2. Como Héctor (5705550288): Hoy › Pedidos del mercado › Aceptar › pesar con foto (Pierna 2.82 lb, Bistec 2.18 lb) › «No hay
   Aguacate» › proponer Habichuelas › Mandar al cliente (después de que Marisol conteste).
3. Marisol: «No, quítalo» → «Está bien, cobrar $31.25» (se liberan $5.32). Héctor: Está listo → Lo recogió.
_Decidido por mí (reversible): la pantalla del pedido es una sola página con 3 secciones (en el teléfono no son 3 pantallas);
el sustituto por ahora tiene que ser por unidad (con precio del estante); si el peso real pasa lo retenido, el mercado corta
menos (todavía no hay «pedir OK por $X más» → LAUNCH-CHECKLIST)._

### 4q-1 · Tiendas: pestaña Productos, tallas y horas del apartado (7 nov)
**Qué mirar (teléfono, sandbox):**
1. Como Marisol (5705550122): `/n/boutique-yaritza` › **Productos** › Blusa de encaje › la hoja pide **Talla** (2X dice
   «Agotada» y no se elige; XL «quedan 1»); elige M, 2 › Apartar; luego L, 1. La tarjeta dice «APARTADO: 3». Ver apartado ›
   cada línea dice su talla; «Te lo guardan 48 horas» (cambia a 24/72 en Tu herramienta de Yaritza y se ve aquí).
2. Como Yaritza (5705550299): Hoy › Apartados › el de Marisol › **Falta esa talla · ofrecer otra** › Blusa · M › Talla S.
3. Marisol: «FALTA UNA TALLA · Te ofrecen la S al mismo precio» › **Sí, la talla S** (o Quitarlo / Cancelar).
_Decidido por mí (reversible): la talla ofrecida no se aparta hasta que el cliente dice que sí (si en ese rato se acaba, se le
dice y puede quitarla); la tienda solo ve para ofrecer las tallas con existencia suficiente; «EN LA CAJA» durante la propuesta
muestra el total como si aceptara (mismo precio). El envío de la tienda (con tarjeta retenida) va en 4q-2._

### 4q-2 · Envío de la tienda con tarjeta (7 nov)
**Qué mirar (teléfono, sandbox):**
1. Marisol: Boutique Yaritza › Productos › Blusa M y Vestido S › Ver apartado › **Envío a tu casa** ($6.99) › A dónde y cómo
   pagas › Revisa: «SE RETIENE $89.99 · SE COBRA AL ENVIARLO».
2. Yaritza: Hoy › el pedido › «Falta uno» › Vestido. Marisol: «Quitarlo y seguir» → LO PREPARAN.
3. Yaritza: pega un enlace https de USPS › **Enviado** → se cobran $30.99 (no $89.99). Marisol: VA EN CAMINO · Ver el
   seguimiento. Yaritza: **Entregado**.
_Decidido por mí (reversible): se retiene al **mandar** el pedido (con la persona en la app; Preguntas #10 decía «al confirmar
la tienda»: así no hay cobros fuera de sesión que el banco pueda rechazar); la tienda tiene 4 horas para confirmar y 6 días para
enviarlo (la retención de la tarjeta dura ~7); el envío no exige zona (va por correo o camión); comisión 6 % (`apt`) solo de los
artículos; si el banco pide verificación extra (3-D Secure) todavía no se puede pagar el envío → LAUNCH-CHECKLIST._

### 4r · Plan de pagos (layaway) de Tiendas (7 nov)
**Qué mirar (teléfono, sandbox):**
1. Marisol: Boutique Yaritza › Productos › **Vestido de quince (en plan)** («ABONO 20 % · 4 PAGOS») › Apartar › Ver apartado ›
   Tu plan › **El acuerdo, por escrito** (léelo: es lo que queda guardado) › marcar «Leí el acuerdo y lo acepto» › Aceptar y apartar.
2. Yaritza: Hoy › el plan › **Lo tengo · guárdalo** (se cobra el abono de $64). Marisol: «Tu plan» › **Pagar $64**.
3. Yaritza: **Pagó en la tienda · $64**. (Para ver «Cancelar el plan» hace falta un pago con 14 días de atraso.)
_Decidido por mí (reversible): lo que va en plan se aparta solo y se recoge en la tienda (sin envío); el cargo al cancelar es el %
del acuerdo **sobre lo abonado** y se toma primero de lo pagado en la app (lo pagado en la tienda lo devuelve la tienda); la persona
puede cancelar su plan cuando quiera con la misma regla; la tienda tiene 4 horas para confirmar; comisión `apt` (6 %) en cada
pago cobrado en la app, ninguna en lo pagado en la tienda; ningún cobro automático (Preguntas #11)._

### 4s-1/4s-2 · Reseñas y ayuda de Mercados y Tiendas (7 nov)
**Qué mirar:** Marisol › un pedido del mercado terminado › «¿Cómo te fue?» (dato del pedido con la foto de cada peso; preguntas
del mercado; con 2★ aparece «Ir a Ayuda con el pedido»). Ayuda con el pedido › «El peso no me cuadra» (foto obligatoria) → Héctor:
Hoy › «Ayuda que espera tu respuesta» › Tiene razón $2 (vuelve a la tarjeta). Un apartado recogido › «Ayuda con la compra».
La ficha muestra «Lo que importa en un mercado / en una tienda».
_Decidido por mí: la ayuda de mercado y tienda usa el mismo motor y la misma pantalla que la ayuda con la cita (un solo flujo
probado); el panel la muestra dentro del detalle del pedido o apartado._

### Fiestas + Transporte · decisiones del plan (7 nov)
Plan: `docs/diseno/plan/fase4-fiestas-transporte.md` (bloques 4t–4z, migraciones 0070–0074). Decidí por mí, todo reversible (§6 del plan,
24 puntos). Lo más importante para mirar:
- **Depósito de la fiesta:** se **retiene** al pedir y se **cobra** cuando el negocio confirma (el prototipo decía «se cobra al enviar»).
- **El resto de la fiesta** se paga al negocio fuera de la app; la comisión es solo del depósito. Fechas en la app hasta 180 días.
- **Transporte** se reserva en la app solo con la licencia de su tipo verificada (PUC, USDOT/MC, envíos con OTI); sin ella, por teléfono.
- **Cancelar un viaje tarde** (menos de 24 h) cobra la mitad. «No llegaron» va directo a To'Latino. Si el negocio no sale, todos reciben
  la devolución completa.
- Escolar y grúas: solo contacto en esta fase. Renta de vehículos: el motor de rentas (21+ y licencia revisada antes de entregar).

### 4t · Fiestas: servicios y «Calendario y depósito» (7 nov)
**Qué mirar:** entra como Rosa (5705550311, Salón Imperial) › Lo que vendes › **Calendario y depósito**: sube el depósito, toca un
sábado para marcarlo ocupado y vuelve a tocarlo. En Servicios › Agregar: «Cómo lo cobras» (Paquete con horas, invitados, montaje y
lo que incluye; Por unidad con la unidad). En Buscar › Fiestas, el filtro «Libre este sábado».
_Decidido por mí: el calendario del panel (hueco del diseño) se compuso con chips de fin de semana y un campo para otra fecha; los
filtros de fecha del prototipo («Libre el 3 oct», «(26 sep)») ahora salen del calendario real y cambian a medianoche._

### 4u · La página de Fiestas y «Tu fecha» (7 nov)
**Qué mirar (teléfono, sin entrar):** Buscar › Fiestas › **Salón Imperial**. Arriba: «¿ESTÁ LIBRE TU FECHA?» y la línea «La fecha no es
tuya hasta que te la confirmen.». Toca **Agregar** › elige Quinceañera, un sábado, 150 invitados › **Ver quién está libre**: la tarjeta
dice «Libre el … · caben tus 150» u «Ocupada el … · libre …». Cambia a 300+ → «Caben hasta 250 · tú esperas 300». Pestaña Servicios:
cada servicio dice si tu fecha está libre; toca el paquete → INCLUYE y **Pedir la fecha** (o **Ver otra fecha** si está ocupada).
**Con cuenta (Marisol):** tu fecha sale en cualquier negocio de Fiestas, y en Buscar › Fiestas el primer chip es «Tu fecha · …» (solo
los libres ese día). Escritorio: la columna con TU FECHA · DEPÓSITO · INVITADOS.
_Decidido por mí (reversible):_
- «Otra fecha» usa el selector de fecha del teléfono (el diseño solo trae chips de fechas fijas).
- Qué celebras y dónde son opcionales (migración 0072); basta el día.
- Sin cuenta, tu fecha se queda en el teléfono y pasa sola a la cuenta al entrar.
- Quité la pregunta «¿Y si llueve?» del prototipo (prometía algo que la app no controla) y puse «¿Y si cancelo?» con la regla del
  negocio.
- **Corregí el texto del depósito en Belleza, Hogar y Auto:** decía «se cobra al enviar», pero el dinero solo se **retiene** al enviar y
  se cobra cuando confirman. Ahora lo dice así en la página, la hoja, el Booking, el panel y la ayuda; un guardián (`depositoRetenido`)
  no deja que vuelva.
- «Pedir la fecha» lleva al Booking de Fiestas, que es el bloque siguiente (4v).

### 4v-1 · Pedir la fecha de la fiesta, con depósito (7 nov)
**Qué mirar (teléfono, Marisol 5705550122):** Salón Imperial › Servicios › «Sábado · 6 horas» › **Pedir la fecha**: 1 Tu fiesta
(Quinceañera, 150) → 2 Fecha y hora (ocupadas no se eligen) → 3 Revisa y envía (HOY PAGAS $500 · RESTO $1,300 el día del evento,
y «Tu depósito de $500» caso por caso) → **Enviar solicitud** → «Tu fiesta» PENDIENTE. **Rosa (5705550311):** Panel › Hoy ›
«Fiestas que esperan tu respuesta» › Confirmar / Otra hora / No puedo. Vuelve como Marisol: FECHA CONFIRMADA con «El acuerdo por
escrito · versión 1». Prueba Cancelar (te dice la regla que aplica antes de hacerlo).
_Decidido por mí (reversible):_
- La fiesta tiene su propio número **F-5101…** y su propia pantalla (`/fiesta/F-…`), separada de las citas.
- Las fiestas no se confirman solas: siempre las confirma el negocio (24 h).
- Si con una confirmada el día se llena, las otras solicitudes de ese día se declinan solas y se libera su depósito.
- El acuerdo v1 es el paquete copiado al enviar, aceptado por el cliente en ese momento (hora e IP). Los extras como versión
  nueva quedan para 4v-2.
- La dirección de la fiesta (cuando el negocio va a tu lugar) es una de tus direcciones o un salón del directorio; la distancia
  la mide el servidor.
- **Arreglo que toca también Belleza, Hogar y Auto:** al abrir Hoy del panel, la reparación de pagos liberaba el depósito de una
  solicitud con «otra hora» propuesta mientras el cliente decidía. Ya no (guardián `reparaVivas`), y nada se confirma sin el
  depósito retenido.

### 4v-2 · Fiestas en Mi cuenta y en el Super Admin (7 nov)
**Qué mirar:** Marisol › Mi cuenta › Citas y reservas: sus fiestas (abren «Tu fiesta»). Super Admin › Transacciones › **Fiestas**:
cada fiesta con el día, invitados, el depósito (retenido / cobrado / liberado / devuelto / se quedó con el negocio), la versión
del acuerdo y si canceló el negocio.
_Decidido por mí: los extras del acuerdo (versión 2 que el cliente acepta) y la cola «Fechas canceladas por el negocio» llegan con
la ayuda y las reseñas de Fiestas (4z)._

### 4w · Transporte: servicios y «Salidas y asientos» (7 nov)
**Qué mirar:** entra como Wilson (5705550322, Van Express Hazleton–NY) › Lo que vendes › **Salidas y asientos**: las próximas
salidas con «Quedan 14 de 14», apaga una con el interruptor, suma un vendido en la oficina (+) y mira cómo baja «Quedan». Maletas
incluidas y maleta extra. Disponible hoy / asiento de niño / rampa (Buscar › Transporte los dice). Servicios › Agregar: «Cómo lo
vendes» (Por asiento con las horas de salida; Vehículo completo con la espera). Super Admin › Envíos Quisqueya › 360 › Lo que vende:
«Salidas de la caja · Sale el sábado · llega en 3 a 4 semanas».
_Decidido por mí (reversible):_
- El tipo del negocio sale de sus subcategorías (como el prototipo); forzarlo desde el Super Admin llega con la ayuda y el admin de
  Transporte (4z).
- La regla de cancelar dice «después de 24 h, se cobra la mitad» (decisión del plan), no «se queda el pago» del prototipo.
- Una salida con pasajeros de la app no se apaga con el interruptor: se cancela con su devolución (4y).
- Licencias de ejemplo válidas en el sandbox para los Pro que reservan (PUC, USDOT/MC, OTI); en producción las revisa el equipo.

### 4x · La página de Transporte (7 nov)
**Qué mirar (teléfono):** Buscar › Transporte › **Van Express Hazleton–NY**: «¿CUÁNTO ES EN TOTAL?», la licencia verificada, la
FAQ. Servicios: «$45 · POR PERSONA · NIÑO $30 · SALE 5 AM · 1 PM · 7 PM · MAÑANA 5 AM · QUEDAN 14». Toca la ruta: EL PRECIO
INCLUYE y «Reservar». **Envíos Quisqueya:** «Enviar una caja» y en escritorio SALE Sábado · LLEGA EN 3 a 4 semanas. **Mudanzas El
Primo:** «Pedir precio cerrado».
_Decidido por mí (reversible):_
- Licencia que hace falta para reservar en la app según el tipo: van → MC o PUC; aeropuerto, taxi, médico, empleados → PUC;
  mudanza → PUC o MC; caja → OTI; CDL → USDOT; escolar → la autorización escolar. Mensajería, grúa y renta no la piden. Sin
  ella: «Licencia en revisión» y se llama.
- Del prototipo quité las promesas que la app no controla («te avisan por SMS si sale tarde», «la primera hora de espera no se
  cobra»). La FAQ dice solo lo que el negocio guardó.
- «Reservar» lleva al Booking de Transporte, que es el bloque siguiente (4y).
