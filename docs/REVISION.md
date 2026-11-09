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

### 4y-1 · Reservar un viaje (7 nov)
**Qué mirar (teléfono, Marisol 5705550122):** Buscar › Transporte › Van Express › Hazleton → Washington Heights › **Reservar**:
2 adultos → día y salida («Quedan 14 asientos») → Revisa y envía (precio cerrado, «Cancelas a menos de 24 h · Se cobra la mitad»).
«Tu viaje» queda PENDIENTE con lo retenido. **Panel (Wilson 5705550322) › Hoy:** «Viajes que esperan tu respuesta» → Confirmar
(se cobra) · Otra salida (las 6 con cupo más cercanas) · No hay cupo. «Salidas con pasajeros» → la salida: Va tarde (10–60 min),
Salió, Llegó, Cancelar la salida con motivo (devuelve todo a todos); en cada pasajero Abordó / No llegó. Van completa: recogida en
tu dirección, Salió · Llegó.
_Decidido por mí (reversible):_
- El cliente tiene hasta 24 h para responder a «otra salida»; el negocio 2 h si es para hoy, 24 h si es otro día.
- Cancelar con menos de 24 h cobra la mitad (redondeo a favor del cliente en el centavo).
- Abordó / No llegó no cambian el cobro.
- «Hoy» del panel muestra las salidas con pasajeros de hoy y mañana; las de más adelante se ven en Salidas y asientos.
- La caja con destinatario y la mudanza con fotos dicen «Llama para enviar» / «Llama para tu precio» hasta el bloque 4y-2.
- La cifra «ESPERAN TU RESPUESTA» de Hoy ahora suma fiestas, viajes y pedidos del mercado (antes decía 0 con un viaje
  esperando); guardián esperanCuentan.

### 4y-2 · Enviar una caja y la mudanza con precio cerrado (7 nov)
**Qué mirar (teléfono, Marisol 5705550122):** Envíos Quisqueya › Caja grande › **Enviar una caja**: 2 cajas, recogida, el
DESTINATARIO (nombre, teléfono, provincia, dirección, referencia) y «No lleva nada de lo que no se puede mandar» → Enviar (se
retienen $170). **Panel (Yolanda 5705550333):** el destinatario en el detalle (privado) → Confirmar → Recogida hecha → número de
rastreo → Salió del almacén → Entregada. Mudanzas El Primo › Apartamento de 1 cuarto › **Pedir precio cerrado**: una foto, a
dónde va → hoy $0. **Panel (Ramón 5705550344):** SUS FOTOS, precio en dólares y qué incluye → Mandar el precio cerrado. El
cliente: «Aceptar $650» con su tarjeta (se cobra) o «No, gracias».
_Decidido por mí (reversible):_
- El destinatario va cifrado en op_private y se borra con las notas cifradas a los 30 días de entregada (no 90).
- Desde «Recogida hecha» el cliente ya no cancela la caja en la app (lo que pase después va por la ayuda, 4z).
- El precio cerrado vale 48 h; el negocio puede mandar uno nuevo (hasta 20 versiones) mientras no se acepte y solo se acepta la
  versión más nueva. Al aceptarlo se retiene y se cobra en la misma pasada.
- La caja pide de 1 a 4 cajas y recogida en una dirección del cliente dentro de la zona del negocio.
- Las fotos de la mudanza son privadas como las del pre-estimado (solo cliente y negocio).
- La migración de la ayuda de Fiestas y Transporte pasa a ser la 0077 (la 0076 es esta).
- Dueños de prueba nuevos en el sandbox: Yolanda (Envíos Quisqueya, 5705550333) y Ramón (Mudanzas El Primo, 5705550344).

### 4y-3a · Super Admin › Transacciones › Viajes (7 nov)
**Qué mirar (Admin 5705550199):** Transacciones › **Viajes**: cada viaje con su forma (asiento, vehículo completo, caja,
mudanza), día y hora, pasajeros o cajas, lo retenido / cobrado / devuelto, «se cobró la mitad», «el negocio canceló la salida»,
el rastreo de la caja y la versión del precio cerrado. El destinatario de la caja nunca aparece aquí. **Devolver** ahora funciona
en viajes y fiestas (antes el botón salía pero el servidor decía «Ese pedido no existe»); guardián devolverCoincide.
_Decidido por mí:_ las colas «Salidas canceladas» y «Retenciones que fallaron», la app del chofer y la renta de vehículos van en
4y-3b.

### 4y-3b · El chofer y el aviso «tu salida todavía no sale» (7 nov)
**Qué mirar:** Panel de Van Express (Wilson) › Hoy › una salida con pasajeros › **CHOFER**: elige a uno de tus repartidores
(Entrega › Tus repartidores; en el sandbox, Héctor). Al chofer le llega el aviso. **Héctor (5705550288) en /repartidor:** «TUS
SALIDAS» → la salida con sus pasajeros (nombre, cuántos, asiento de niño; sin pagos ni teléfonos) → Abordó / No llegó, Va tarde,
Salió, Llegó; el cliente lo ve en «Tu viaje». Si a los 15 min de la hora una salida con pasajeros no marcó «Salió», a cada
pasajero le llega «Tu salida todavía no sale» y al negocio «Una salida no ha salido», una sola vez.
_Decidido por mí (reversible):_
- El chofer es un repartidor del equipo (misma invitación con código); no hay un rol nuevo. Al quitarlo del equipo, sus salidas que
  no salieron quedan sin chofer.
- El chofer no ve cobros, tarjetas ni teléfonos de los pasajeros.
- El aviso automático corre con el barrido (hoy, cuando alguien abre el panel o un viaje); el barrido central que lo corre cada
  minuto está anotado en LAUNCH-CHECKLIST y es el bloque siguiente.

### Barrido central (7 nov)
**Qué es:** antes, una solicitud sin respuesta solo vencía (y su dinero retenido solo se liberaba) cuando alguien abría una página.
Ahora el servidor lo hace solo cada minuto: vence citas, mesas, pedidos, mercado, apartados, planes, rentas, fiestas, viajes,
pre-estimados, emergencias y totales por escrito; escala las ayudas; manda los avisos (por ejemplo «tu salida todavía no sale»)
y reintenta los cobros que quedaron a medias. **Qué mirar:** nada que tocar; en el sandbox corre solo. Si algo falla, queda la
tarea, la hora y el error en la base (`system_jobs`), y lo veremos en el Super Admin.
_Decidido por mí:_ corre con la misma imagen de la app (nada nuevo que pagar ni bajar), con un token que deploy.sh crea en el
servidor; desde fuera no se puede llamar (nginx). En producción se enciende igual en la fase 9 (anotado en LAUNCH-CHECKLIST).

### 4y-4 · Renta de vehículos (7 nov)
**Qué mirar:** Buscar › Transporte › **Renta de Camionetas Hazleton** › pestaña **Rentar**: Camioneta de 15 pasajeros, de carga y
el remolque, con su precio por día y depósito. Apartar → el formulario avisa «licencia y 21+» y «150 millas por día; la milla de
más $0.35». **Panel (Daniel 5705550355):** el apartado › «Revisé la licencia y la edad (21+)» + millas al salir (sin eso, «La
recogió» no se puede tocar) → al volver, millas al volver: dice cuántas recorrió, cuántas incluía y las de más con su precio, y
«Descontar las millas de más» abre el daño con el monto puesto (con la foto del odómetro, el cliente la ve antes).
_Decidido por mí (reversible):_ las millas de más van por el mismo camino del daño (foto, el cliente acepta o To'Latino decide);
el remolque no cuenta millas; los servicios «precio cerrado con fotos» que traía este negocio del prototipo quedaron retirados
(no aplican a una renta). Dueño de prueba nuevo: Daniel (5705550355).

### 4z-1 · Reseñas de Fiestas y Transporte (7 nov)
**Qué mirar (Marisol):** Salón Imperial › escribir reseña de tu fiesta terminada: «TU FIESTA · DATO DE LA RESERVA» con la fecha
«· respetada» y lo que pagaste (no se edita); preguntas «¿Llegaron a la hora?», «¿Quedó como en las fotos?», «¿Cobraron lo del
paquete?», «¿Recogieron y limpiaron?», trato; con 2 ★ o menos, «La reseña no devuelve dinero… Ayuda con la fiesta». En la ficha:
marcas en la tarjeta y «LO QUE IMPORTA EN UNA FIESTA». Van Express: «TU VIAJE · DATO DE LA RESERVA» (pagaste · precio cerrado),
«¿Cobró el precio cerrado?», salió / llegó a la hora, manejo seguro, equipaje; «LO QUE IMPORTA EN UN VIAJE» (últimos 90 días).
_Decidido por mí:_ «¿Respetaron la fecha?» solo se pregunta a quien no reservó por To'Latino (con reserva sale del dato). El botón
«Ir a Ayuda con la fiesta / el viaje» aparece con 4z-2.

### 4z-2 · Ayuda con la fiesta y con el viaje (7 nov)
**Qué mirar (Marisol):** «Tu fiesta» terminada › **Ayuda con la fiesta**: 7 motivos (no llegaron, llegaron tarde, no quedó como lo
acordado, faltó algo del paquete, cobraron más del paquete, dañaron algo o no recogieron, otra cosa); foto obligatoria donde
toca; ¿qué quieres? «Que me devuelvan» · «Un descuento» · «Solo quiero avisar». **Panel (Rosa):** el detalle de la fiesta trae
«AYUDA CON LA FIESTA» para responder (tiene razón · proponer otra cosa con monto · no puedo); al aceptar se devuelve del depósito
cobrado en la app. «Tu viaje» › **Ayuda con el viaje**: cobró más del precio cerrado, salió o llegó muy tarde, no pasó a
recogerme, **manejo inseguro** (va directo a To'Latino con prioridad alta, sin esperar al negocio), perdió o dañó mi equipaje.
_Arreglado de paso (clase):_ en el teléfono la barra de la app tapaba la barra propia de /fiesta, /viaje y /solicitud (guardián
detalleSinBarra); la ayuda de mercado y apartado decía «CITA #M-…» y ahora dice PEDIDO / APARTADO / FIESTA / VIAJE.
_Decidido por mí:_ un reporte de seguridad («Manejo inseguro») no se frena por el límite de 5 solicitudes al día.
_Pendiente de prueba:_ la prueba vieja de ayuda de Hogar/Auto (ayu4g) no encontró datos que cumplan su condición en la base local
(datos de prueba gastados); la de Salud/Pro (ayu4m) pasó con el motor cambiado.

### 4z-3 · Analítica de Fiestas y Transporte (7 nov)
**Qué mirar (Admin):** Analítica › **Fiestas y Transporte**: solicitudes de fecha, confirmadas en 24 h, vencidas, fechas canceladas
por el negocio, depósitos (cobrado · retenido · devuelto · se quedó); viajes, salidas a la hora (≤ 15 min con la hora real de
«Salió»), ocupación de asientos, cancelaciones tardías, salidas canceladas, «cobró más» por cada 100 viajes y los motivos de ayuda.
_Arreglado de paso:_ la pestaña se veía pero el servidor no la tenía en su lista y mostraba el Resumen (guardián pestanasAnalitica).
Ayuda nueva para El Compa: ayuda-con-la-fiesta-y-el-viaje y panel-fiestas-y-transporte-negocio.

### Plan del grupo Noche (7 nov)
Escrito en `docs/diseno/plan/fase4-noche.md` (bloques 4na–4ne, migraciones 0081–0083). Lo que decidí y se puede cambiar:
- **Comisión de Noche:** sembrada igual que los boletos ($1 + 5 %) sobre el depósito de la mesa, que es lo que cobra el prototipo a
  esta categoría. Si prefieres otra, se cambia en Super Admin › Planes.
- **Textos del prototipo corregidos:** el depósito de la mesa «se retiene al enviar y se cobra cuando confirman» (como Fiestas). El
  corte para cancelar gratis es a las 6 PM de esa noche; si la llegada es antes de las 8 PM, el corte pasa a 2 horas antes de la llegada.
- To'Latino nunca cobra cover, tragos, botellas ni el mínimo: eso se paga en el local. La app no pide fecha de nacimiento ni guarda
  fotos de identificación: el 21+ lo revisa la puerta.

### 4na · Noche: «Esta noche», servicios, historial y filtros (7 nov)
**Qué mirar (Héctor, La Terraza, 5705550366):** Panel › Lo que vendes › **Esta noche**: cover −/+ $5 (si hoy cierras dice «Cover del
viernes»), «después de las 11 PM / 12 AM» (solo si sube), las próximas noches si son distintas, 18+ / 21+, lista (9 PM a 1 AM, tope
opcional), **la fila ahora** (dura 60 min; después la tarjeta dice la hora real), música, quién toca y vestimenta. Cada toque sale al
momento en la tarjeta del buscador (Buscar › Noche) y en los filtros. **Hoy** trae «CÓMO ESTÁ LA FILA AHORA» para la puerta.
Servicios › Agregar: Entrada · Lista · Mesa · VIP · Noche especial · Por fecha (mesa con personas, cuántas hay, mínimo y depósito).
**Super Admin:** Negocios › La Terraza › Lo que vende: «Esta noche» en solo lectura, lo que publicó (historial) y el tipo del local.
_Decidido por mí (se puede cambiar):_ «esta noche» cambia a las **6 AM** (cuando cierra la noche anterior), no a las 12 PM; la fila
«ahora» vale 60 min; los pasos de la fila son los del prototipo (sin fila · 10 · 20 · 30 o más), y la semilla redondea «15 min» a 20;
cuántas mesas hay de cada tipo no viene en el prototipo: la semilla pone 4 mesas, 2 VIP y 6 de billar; agregué «quién toca» y el
código de vestimenta como campos de texto (huecos del diseño); la Barra del demo (cubeta, mojito, hookah, botella) no se siembra
porque la app no vende tragos.

### 4nb · La página de un local de Noche (7 nov)
**Qué mirar (sin entrar):** Buscar › Noche › La Terraza: el Resumen trae la tarjeta negra de esta noche («$10 · $15 después de las
11 PM», 21+, quién toca, código) y la de **la fila** con su hora real (dice «Ahora · lo puso el local…» solo si es de la última hora).
Pestaña **Esta noche** (o «Mañana viernes» si hoy cierra): Entrada, Lista, Mesa y VIP con mínimo, personas y depósito; toca la mesa
para ver la hoja. DJ Rafy: «Por contrato», «Para tu fecha» y **Pedir fecha**, sin horario ni dirección.
_Decidido por mí:_ hasta que llegue 4nc, la hoja de lista y mesa ofrece **llamar al local**; el texto del depósito ya dice «se retiene
hoy y se cobra cuando confirmen» (corrección del prototipo, Preguntas #1).

### 4nc · Lista de la noche y mesa con depósito (7 nov)
**Qué mirar (Marisol, 5705550122):** La Terraza › Esta noche › **Lista de la noche** › Anotarme: 3 pasos (cuántos van y ocasión → noche
y hora → revisa y envía). Queda al instante con su **código de 4 cifras**. **Mesa en la terraza** › Pedir la mesa: se retienen $50 y
queda «Esperando a La Terraza». **Panel (Héctor, 5705550366) › Hoy:** «Mesas que esperan tu respuesta» → Confirmar (se cobra) / Otra hora
/ No hay mesa (se libera). Esta noche: «Mesas de esta noche» con Llegaron / No llegaron (desde los 30 min) / No entró: sin
identificación, y **«La lista de esta noche»** para la puerta (buscar por nombre o código, + / − por cada persona que entra).
_Decidido por mí:_ la otra hora se acepta en 30 min (la noche no espera 24 h); la lista no pide tarjeta nunca; Free toma lista y mesa sin
depósito (Preguntas #7); el código no se muestra hasta que la mesa está confirmada y nunca va en un SMS; «No llegaron» se puede marcar
desde que vence la mesa guardada; la carrera por la última mesa la gana el primero que entra al candado.
_Pendiente (4ne):_ Super Admin › Transacciones › Noche y las colas «Mesas no respetadas» y «Sin identificación».

### 4nd · Reseña y ayuda con la noche (7 nov)
**Qué mirar (Marisol):** «Tu noche» de una lista con entrada › **Calificar**: dato de la reserva (noche, personas, pagado en la app),
6 preguntas de noche; con 2 estrellas aparece «Ir a Ayuda con la noche». La página de La Terraza › Reseñas: **«Lo que importa de
noche»**. «Tu noche» › **Ayuda con la noche**: 8 motivos; «Cobraron más cover» y «No me descontaron el depósito» piden foto del recibo;
«Me sentí inseguro» va directo a To'Latino. **Panel (Héctor):** el detalle de la noche trae «AYUDA CON LA NOCHE» (tiene razón · proponer
otra cosa con monto · no puedo); si el cliente acepta, el depósito vuelve a su tarjeta.
_Arreglado de paso (clase):_ «Lo que importa» de Fiestas no mostraba «Respetaron la fecha» ni «Quedó como en las fotos» (Postgres
devolvía los nombres en minúsculas); ahora sí, con su guardián.
_Decidido por mí:_ «Me sentí inseguro» reusa la misma vía directa que «Manejo inseguro»; «No me descontaron el depósito» pide la foto del
recibo; una mesa cancelada por el local también puede pedir ayuda.

### 4ne · Super Admin de Noche (7 nov) · NOCHE COMPLETA
**Qué mirar (Admin, 5705550199):** Transacciones › pestaña **Noche**: cada lista o mesa con su noche, personas, cuántos entraron, cómo
cerró («no entró: sin identificación», «canceló a tiempo»…) y el depósito; **Devolver** en una mesa con depósito cobrado. **Colas** › «Sin
identificación» y «Mesas no respetadas» de La Terraza: cada noche con lo que pasó y el depósito; **Revisado, sin cambios** o **Pausar mesas
y lista** (la página del local deja de ofrecerlas; se reanuda en Negocios 360°). **Analítica › Noche**: mesas confirmadas en 60 min,
vencidas, no respetadas, depósitos, % de la lista que entró, el cover que subió después de publicado, «la fila, como decía», «cobraron más
cover» por cada 100 noches y licencias de licor vencidas.
_Decidido por mí:_ las dos colas se abren solas desde la **3.ª vez en 30 noches** de un mismo local (un caso abierto por local); cuentan una
mesa confirmada que el local cancela, una ayuda «no respetaron la mesa / la lista» y un «sin identificación» con depósito. La decisión
del equipo es **pausar mesas y lista** (reversible), no quitar el sello como sugería el plan: quitar el sello afecta todo el negocio y no
solo la noche. «El cover subió» cuenta solo subidas del cover de esa noche frente a lo publicado antes (bajar es a favor del cliente);
el «después de las 11 PM» no cuenta como subida porque se publicó desde el principio. La ayuda «Me sentí inseguro» va primero en la
lista de Colas, antes que todo lo demás de Soporte. Las ayudas de fiesta, viaje y noche ahora dicen su nombre en Colas (antes decían
«Ayuda con un pedido»).
_Ojo en el sandbox:_ la semilla no trae reservas de noche de ejemplo; Transacciones › Noche, las colas y la Analítica se llenan cuando se
usan (Marisol pide mesas en La Terraza y Héctor las confirma y marca la puerta). Las colas aparecen a la 3.ª vez en 30 noches.
_Pendiente (Fase 5):_ Configuración de los plazos (60 min de respuesta, 6 PM, 30 min de mesa, 60 min de fila) — hoy son constantes del
código; ya están en `docs/LAUNCH-CHECKLIST.md`.

### Plan · Educación + Niños + Deporte (7 nov) — `docs/diseno/plan/fase4-edu-ninos-deporte.md`
Bloques 4ea–4eg (un solo motor de inscripción para las tres, que después reusan Iglesias, Bienes Raíces y Venta de Autos).
_Decidido por mí (se cambia si prefieres otra cosa):_ en la app solo se cobra la **matrícula** de un curso (se retiene al enviar, se cobra
al confirmar, vuelve completa si cancelas antes de empezar o el grupo no abre); mensualidad, semana de guardería y clase suelta se pagan en
el lugar. De los niños solo se guarda nombre de pila, edad o grado, la escuela si los recogen ahí y una nota, todo cifrado y borrado a los
30 días; nunca fecha de nacimiento, fotos, salud ni Medicaid, y los avisos nunca llevan el nombre del niño. Una guardería sin licencia del
DHS vigente puede publicarse pero no recibe solicitudes por la app. Las membresías no se cobran por la app; «Cancelar mi membresía» deja
constancia con fecha. «No cuidaron bien a mi niño» va directo a To'Latino con el 911 y ChildLine (número a verificar). El número de
inscripción es **I-4101** (`E-` ya es de las emergencias de Hogar).

### 4ea · Educación: cursos y «Grupos y cupos» (7 nov)
**Qué mirar (Miriam, 5705550377 · Inglés Para Todos):** Lo que vendes › **Grupos y cupos**: grupos abiertos, cupos libres y clases gratis;
cómo das las clases (presencial, en línea, híbrido, español); por curso el precio, la **matrícula que aparta el cupo**, el **plan de pagos**
(«3 pagos de $62 sin intereses»), primera clase gratis y los **cupos de cada grupo** (0 = lleno; no deja dejar el curso sin ningún grupo con
cupo). **Abrir un grupo** (día en que empieza, días de clase, hora, cupos, nombre y enlace si es en línea) y **Ver grupos** (quitar uno sin
inscritos). Servicios › Agregar: curso completo con semanas, horas, matrícula, certificado (oficial o constancia), incluye y va aparte. En
Buscar, la tarjeta dice «$80 al mes · primera clase gratis» y «Próximo grupo: 13 nov». Super Admin › Negocios › Inglés Para Todos › Lo que
vende: «Grupos y cupos · solo lectura».
_Decidido por mí:_ la herramienta cuenta **cupos libres** y el servidor guarda el total sumando los ya inscritos (nunca baja de lo ocupado);
la matrícula siempre es menos que el precio (lo impide también la base); el plan de 4 pagos que traía un curso del prototipo pasa a 3 (la
herramienta ofrece 3, 6 o 12); la tutoría de 1 a 1 tiene un cupo por sesión; «de tarde» desde las 2 PM y «de noche» desde las 5 PM salen de
los grupos abiertos; quitar un grupo solo si nadie se inscribió en la app (con inscritos, se cancela con devolución en 4ee). El tipo de
escuela (que decide pestaña, botón y reseñas) y forzarlo desde el Super Admin llegan con la ficha en 4ed.

### 4eb · Niños: «Cupos y licencia», licencia del DHS y datos de los niños (7 nov)
**Qué mirar (Altagracia, 5705550388 · Guardería Mis Angelitos):** Lo que vendes › **Cupos y licencia**: cupos libres por edad (2 años · 3 años
· 4 y 5 años; agregar bebés o 6 a 12 años), precio por semana sin subsidio, CCIS, horario extendido, comidas, turno de noche, español y las
edades que atiende; arriba, la **licencia del DHS** verificada. En Buscar › Niños la tarjeta dice «Quedan 3 cupos · 2 a 5 años» y «Acepta
CCIS (subsidio) · $235 la semana sin subsidio». **Super Admin › Negocios › la guardería › Lo que vende › Licencias**: «Vencida» y «Retirar»
(con motivo): la página deja de decir «con licencia» al instante y la tarjeta pasa a «Llama para pedir cupo»; «Verificar» lo devuelve.
_Arreglado (clase):_ 5 lugares de Niños decían «con licencia» sin tener ninguna licencia (venía del prototipo). Ahora «con licencia» sale
**solo** de una licencia del DHS verificada (la pone y la quita la base); Terapias Pasitos lo perdió porque no es una guardería.
_Decidido por mí:_ guardería y cuidado en casa sin licencia vigente no reciben solicitudes por la app (solo contacto); niñera y nana, solo
contacto siempre; los programas de Niños no llevan plan de pagos y un precio de $0 dice «Gratis si calificas»; de un niño solo se guardará
nombre de pila, edad o grado, la escuela si lo recogen ahí y una nota corta, cifrados y borrados a los 30 días (la nota rechaza fechas de
nacimiento y números de seguro social); las bandas de edad de la semilla solo dentro de las edades de cada lugar.
_Ojo:_ las licencias de la semilla son de EJEMPLO (número «PRUEBA-…»); el registro y los textos del DHS se verifican antes de abrir
(LAUNCH-CHECKLIST).

### 4ec · Deporte: «Membresías y contrato» y «Liga e inscripciones» (7 nov)
**Qué mirar (Anthony, 5705550411 · Power Gym):** Lo que vendes › **Membresías y contrato**: contrato (sin contrato · 6 · 12 meses), lo que
cuesta cancelar antes (solo con contrato; con $0 también se dice), mensualidad, cuota de inscripción, pase de un día, primera visita gratis,
guardería. En Buscar la tarjeta dice «Sin contrato · cancela cuando quieras» y «$25 al mes · sin cuota de inscripción». **Liga Latina de
Fútbol** (en la prueba Anthony también la administra): **Liga e inscripciones** — cuota del equipo por temporada, depósito, inscripción
hasta, equipos que faltan («Liga llena · lista de espera» en 0), cancha por hora y jugadores sueltos.
_Decidido por mí:_ los precios que toca la herramienta son los del servicio (una sola fuente); «por equipo» o «por jugador» se dice en el
servicio (el prototipo lo deducía del nombre); la fecha límite de la liga se elige entre las 3 semanas antes de que empiece la temporada;
el dojo de la semilla trae un contrato de 3 meses, así que ese chip solo aparece cuando ya lo tiene; la herramienta solo existe para los
lugares que venden por la app (membresía y liga): boliche, golf, clubes, pesca, tiro y nutrición van por contacto y conservan sus filtros.

### 4ed · Fichas de Educación, Niños y Deporte (7 nov)
**Qué mirar (teléfono y computadora):** `/n/ingles-para-todos` (Educación: «¿QUÉ TE LLEVAS AL FINAL?», próximo grupo con cupos, pestaña
«Cursos», hoja con la matrícula y lo que va aparte), `/n/guarderia-mis-angelitos` (Niños: «¿TIENE LICENCIA? Sí: licencia del estado de PA
(DHS)», «Quedan N cupos · 2 a 5 años · acepta CCIS»), `/n/power-gym-hzl` (Deporte: «Sin contrato: cancelas cuando quieras», cuota e
inscripción), `/n/liga-latina-futbol` (la cuota es de toda la temporada, por equipo), `/n/taller-las-manos` (Free: sin inscribirse por la
app) y las categorías `/c/educacion`, `/c/ninos`, `/c/deporte` (las cifras «De noche», «Con licencia», «Sin contrato»).
**Decidido por seguridad (AB):** hasta 4ee la hoja ofrece llamar o escribir (no hay botón de inscribirse que no funcione); el horario del
riel sale de los grupos reales y, sin grupos, dice «Pregúntalo» en vez de inventar «Mañana».

### 4ee · Inscribirse (7 nov)
**Qué mirar (teléfono):** en `/n/ingles-para-todos` › Preparación para ciudadanía › «Inscribirme»: los 3 pasos, «HOY PAGAS $55», tu
matrícula en cada caso y el plan por escrito; luego `/insc/I-…`. En el panel de Miriam: Hoy › «Inscripciones que esperan», el detalle con
Confirmar / Otro grupo / No hay cupo y Lo que vendes › Inscripciones (grupos, lista de espera). En la guardería (Altagracia), una inscripción
«para mi hijo»: el nombre solo en su panel. En Power Gym: «Cancelar mi membresía» → baja pedida → el gimnasio la confirma.
**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- Con plan **Free** no hay inscripción en la app (la página ya decía «Aquí no te inscribes por la app»); el techo Free no aplica aquí.
- El lugar responde en `reply_h` (24 h) y nunca después de 12 h antes de que empiece el grupo; «otro grupo» da 48 h a la persona.
- «Para mí»: una inscripción viva por grupo; «para hijo u otra persona»: hasta 4 en el mismo grupo (una por niño).
- La guardería elige la banda por la edad del niño y el servidor no deja inscribir a un niño en una banda que no es la suya.
- La oferta de la lista de espera la da el lugar (botón); si vence, se ofrece sola a la siguiente persona.
- La baja de una membresía la confirma el lugar o queda sola a las 72 h; To'Latino no cobra penalidades.

### 4ef · Reseñas y Ayuda de inscripciones (7 nov)
**Qué mirar (teléfono):** en una inscripción en curso, «Ayuda con la inscripción»: los motivos de cada rubro y, en Niños, «No cuidaron bien
a mi niño» con el aviso de 911 y ChildLine. En el panel de la escuela, la ayuda en Hoy y en el detalle («Proponer otra cosa» devuelve
exacto de la matrícula). La reseña de un curso terminado («Lo que importa en un curso» en la ficha) y la de una guardería (sin fotos).
**Decidido por seguridad (AB):**
- «No cuidaron bien a mi niño» va hoy a la cola de Soporte con prioridad alta (como «Me sentí inseguro»); la cola propia «Cuidado de niños»
  llega con 4eg. El número de ChildLine (1-800-932-0313) sigue en LAUNCH-CHECKLIST para verificarlo.
- Una membresía o la semana de la guardería se puede reseñar a las 4 semanas de estar activa (§6 #13).
- La reseña de Niños se rechaza si trae el nombre de pila del niño que esa persona inscribió en ese lugar (comparado en el servidor con el
  dato cifrado); no se detectan otros nombres.

### 4eg · Super Admin y cierre de Educación + Niños + Deporte (7 nov)
**Qué mirar (computadora, Super Admin):** Transacciones › Inscripciones (y «Devolver matrícula»); Colas › «Cuidado de niños» (primera de la
lista; «Ver los datos del niño» pide el motivo), «No me dejan cancelar» y «Grupos que no abrieron»; Analítica › Educación · Niños · Deporte.
**Preguntas #1–#22 del plan (§6):** se aplicó el default más seguro de cada una tal como está escrito en el plan; lo que se ajustó está en las
notas de 4ea–4ef de arriba (Free sin inscribirse por la app, plazos de respuesta, banda por edad, oferta de la lista de espera, baja a las
72 h, reseña de membresía a las 4 semanas, nombre del niño en reseñas). Si prefieres otra cosa en alguna, se cambia.
**Arreglo de clase:** en Colas, una ayuda de fiesta, viaje o noche se abría con la vista del pedido de comida; ahora todas usan la vista de
la cita (motivo con su nombre, lo devolvible y «Resolver y devolver»).

### Plan del grupo Iglesias + Bienes Raíces + Venta de Autos (7 nov)
`docs/diseno/plan/fase4-iglesias-inmuebles-autos.md` (bloques 4ia–4ig, migraciones 0091–0095). Ninguna de las tres cobra en la app: visitas
y pruebas de manejo son $0. **Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- Iglesias: no se cobra nada en la app (tampoco la inscripción del catecismo) y no se construyen diezmos ni donativos en línea.
- Venta de Autos: el pago al mes lo calcula el servidor (tasa, meses y enganche) y siempre dice «estimado».
- Plan Free: recibe solicitudes de visita, con techo de 10 al mes.
- Bienes Raíces: la cuota de solicitud va dentro del «total para mudarte»; el depósito tiene tope de 2 meses de renta (ley de PA, a verificar).
- Buscar por recámaras, año o millas: se construyen los datos e índices; la pantalla queda como hueco para tu OK.

### 4ia · Iglesias: «Horarios y ayuda», servicios, funerarias y licencias (7 nov)
**Qué mirar** (sandbox, entra con 5705550422 = Padre Luis, Parroquia Santa María; capturas `f4ia-*.png`):
1. Lo que vendes › **Horarios y ayuda** (teléfono y escritorio): toca «Dom 8 AM» y mira que la tarjeta del buscador diga «Misa en español:
   domingo 8 AM, domingo 12 PM y sábado 6 PM». Intenta apagar la última misa: dice «Deja al menos una misa.» y no la quita.
2. **Otros horarios › Agregar**: día, hora, nombre («Jóvenes»), qué es e idioma. La tarjeta suma «· Jóvenes: viernes 7 PM».
3. «También en inglés», las 6 ayudas gratis (salen en Buscar) y «Catecismo · inscripciones abiertas» (la tarjeta dice abiertas o cerradas).
4. Despensa Manos Unidas › **La ayuda de hoy**: «Se acabó por hoy» (la tarjeta lo dice solo ese día; a la medianoche de la ciudad se apaga
   solo), sin papeles, ropa y cada cuánto puede venir una familia.
5. Funeraria La Paz › **Precios y repatriación**: −/+ $100 cambia el precio del servicio, plan de pagos (solo texto), días de la
   repatriación, 24 horas.
6. Servicios › Agregar: «Gratis», «Donativo sugerido» (con «si no puedes, no se cobra»), «Precio total por escrito» (solo funerarias) y
   «Curso con grupos» (catecismo, con «Abrir un grupo»). No hay campo de depósito; la base tampoco lo deja.
7. Super Admin › Negocios 360 › Lo que vende: la herramienta en solo lectura con su resumen, los horarios, la línea fija y la forma de cada
   servicio («Donativo sugerido $50», «Curso · 60 semanas · Donativo sugerido $60»).

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Nada se cobra en la app en Iglesias**: el donativo es texto; el catecismo es «curso con grupos» con donativo sugerido o gratis, y la
  matrícula de $20 del prototipo va como «La matrícula de $20 se paga en la parroquia.» en lo que va aparte.
- **«Las 24 horas» de la funeraria** solo cambia la tarjeta y el filtro «24 horas»; **no** reescribe el horario de Tu página (el prototipo
  ponía 0–24 todos los días). Si prefieres que también cambie el horario, se cambia.
- **Grupos, sacramentos, consejería y oración** usan los atajos del culto con el título «TUS HORARIOS DE LA SEMANA» (el prototipo decía
  «TUS CULTOS» para todos) y pueden quedarse sin horario; misa y culto, nunca.
- **Tiendas de artículos religiosos y botánicas** van por contacto: sin herramienta (§6 #19).
- **«Otro horario»** (pantalla compuesta con piezas del sistema: chips de día, paso de hora, campos, chips de qué es e idioma) para la hora
  libre que el plan pedía fuera de los atajos.
- **Tarjeta**: los horarios en orden de la semana desde el domingo (el ejemplo del plan); en la tarjeta de abajo, catecismo (si tiene el
  curso) → «Transporte gratis los domingos» → «Español e inglés»; si nada aplica, se conserva lo que traía del prototipo.
- **Módulo «Citas»** no sale en Lo que vendes de Iglesias («Pedir fecha» llega con 4ie).
- **Sellos** (funeraria de PA, representante acreditado del DOJ, 501(c)(3)): textos y registros sin verificar → `LAUNCH-CHECKLIST` (§6 #16).

### 4ib · Bienes Raíces: «Propiedades y visitas», propiedades, préstamos, licencias y vivienda justa (7 nov)
**Qué mirar** (sandbox, entra con 5705550433 = Yesenia Batista, Rentas Hazleton Latino; capturas `i4ib-*.png`, teléfono y escritorio):
1. Lo que vendes › **Propiedades**: la lista con su estado (Disponible · Apartada · Rentada · Vendida · Oculta) y los filtros por estado. Toca
   **Agregar**: pon renta $1,000, depósito $2,500 → «El depósito no puede pasar de 2 meses de renta.». Con depósito $1,000 y solicitud $50, guarda
   y vuelve a abrirla: «Para mudarte: $1,000 + depósito $1,000 + solicitud $50 = $2,050» lo calculó el servidor.
2. Escribe «no niños» (o «no kids», «ideal para pareja», «no section 8») en la descripción: no se guarda y dice qué frase quitar.
3. Elige **Cuarto**: «Mostrar solo la zona» queda con candado (la dirección llega al confirmar la visita) y la dirección no puede ir en el nombre.
4. **Horas de visita**: día + hora + «Agregar hora» y personas por hora (1 a 10); al guardar se abren 14 días adelante.
5. **Tu herramienta › Propiedades y visitas**: Disponible / Rentada, Renta al mes y Depósito (−/+ $25; el depósito no pasa de 2 meses), horas
   de visita (toca para apagar; deja al menos una), «Sin seguro social · aceptas ITIN» y «Aceptas mascotas» para todas. Mira la tarjeta del
   buscador: «5 propiedades disponibles» / «Para mudarte: primer mes + depósito, sin cargos extra».
6. Realty Bilingüe › **Casas en venta**: Precio −/+ $1,000 y «Cuota estimada $1,259 al mes con 10 % de enganche» (la calcula el servidor).
   Hipotecas ITIN › **Préstamos y requisitos**: enganche mínimo, días para precalificar y «Precalificas sin afectar el crédito». Cuartos Doña
   Mary › **Cuartos y lo que incluye**: libre desde, luz, agua e internet, amueblado.
7. Locales del Centro (Free): la sexta propiedad a la vista no se guarda («Con Free se ven 5 propiedades…»).
8. Tu página › **Tus licencias**: corredor o vendedor de PA, NMLS, avaluador, inspector (el sello sale solo verificada).
9. Super Admin › Negocios 360 › Lo que vende: la herramienta en solo lectura («5 disponibles · sin seguro social»), cada propiedad con sus
   montos, **Ocultar** con motivo y, en Vivienda Accesible, **Confirmar mayores** / **No se confirma**. Catálogo › **Vivienda justa**: la lista,
   «Agregar frase» (es: frase) y apagar una agregada (solo Admin; las de fábrica dicen SIEMPRE).

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Depósito ≤ 2 meses de renta** (§6 #5; ley de PA del primer año, a verificar). La **cuota de solicitud** existe (de $0 a $100) y entra en «Para
  mudarte»; la regla dice «Nada fuera de lo publicado» en vez de «Sin cuota de solicitud». Un solo «otro pago obligatorio» (ej. último mes, hasta
  un mes de renta) también entra.
- **Frase de vivienda justa**: no se guarda nada y la frase queda en la auditoría (`inm.vivienda_justa.frenada`); la cola «Vivienda justa» llega en
  4ig. La lista de fábrica (no se apaga) vive en `lib/vivienda-justa.ts`; la de Catálogo la amplía. Bloquea también «solo mujeres» en un cuarto
  dentro de la casa del dueño (la excepción de compañeros no se lleva a filtros, §6 #15).
- **Cuota estimada**: tasa de referencia 6.75 %, 30 años, más 2.5 % anual del precio por impuestos y seguro (a revisar en LAUNCH-CHECKLIST); el
  enganche lo elige el dueño por casa (3.5, 5, 10, 15 o 20 %). Sale en terrenos y locales sin cuota.
- **Lo que piden** no acepta números de 9 dígitos (SSN o ITIN) ni cuentas; la ficha solo dice qué papeles.
- **Free = 5 propiedades a la vista** (rentadas, vendidas y ocultas no cuentan), en el servidor.
- **Una propiedad no cambia de renta a venta**: se agrega otra. La herramienta **no** obliga a dejar una propiedad disponible (el prototipo sí):
  si todo se rentó, se dice la verdad.
- **«Sin seguro social» y «Aceptas mascotas»** de la herramienta cambian todas las propiedades de vivienda; cada propiedad se ajusta en su editor.
- **Las propiedades no salen en Servicios ni se reservan como cita** (la visita de $0 llega en 4ie); el módulo Citas no sale en Bienes Raíces.
- **Fotos**: hasta 8 por propiedad con el subidor de medios de siempre (sin cola de revisión nueva); sin personas ni papeles.
- **Mayores de 62**: el tipo «Vivienda para mayores» pide la declaración y nace «por revisar»; el Super Admin la confirma o la oculta con motivo.
- **Dirección**: se ubica con los tramos del Censo (sin terceros); si no se encuentra, la propiedad se guarda y el panel lo avisa.
- **Licencia NMLS** de Bienes Raíces es `nmls_inm` (la clave `nmls` ya era de Profesionales).
- **Búsqueda por propiedad** (recámaras, precio; §6 #10): los datos y los índices ya están; la pantalla queda como hueco para componer con OK.

### 4ic · Venta de Autos: «Inventario del lote», carro con total en la puerta, financiamiento por escrito y licencias (7 nov)
**Qué mirar** (sandbox, entra con 5705550444 = Juan Polanco, Autos El Cibao; capturas `a4ic-*.png`, teléfono y escritorio):
1. Lo que vendes › **Inventario**: la lista con su estado (En el lote · Apartado en persona · Vendido · Oculto) y «EN LA PUERTA $13,163» del Civic
   ($11,900 + 6 % $714 + placas $150 + cargo $399). Toca **Agregar**: escribe un VIN con una letra cambiada → «Ese VIN no cuadra…» mientras
   escribes y, al guardar, el servidor no lo guarda. Pon el precio: «En la puerta: … = $X» aparece en vivo (lo calcula el servidor) con el pago
   de ejemplo «$X al mes con $1,500 de enganche, 48 meses al 14.9 % APR (estimado, sujeto a aprobación)».
2. Escribe «$250 al mes» en la descripción: no se guarda (los pagos los calcula To'Latino). Elige **Título salvage**: sale la línea fija y «Va
   por la calle» queda con candado.
3. **Tu herramienta › Inventario del lote**: financias, con ITIN, sin historial de crédito, trade-in, prueba en casa; enganche desde; pago de
   ejemplo (meses y tasa); garantía en motor y transmisión; **cargo del dealer** (pasa de $449 a $499 → «no puede pasar del tope de PA ($477)»);
   carros en el lote; por carro En el lote / Vendido y Precio. Cada toque recalcula el total de todos los carros (míralo en las filas).
4. Compre Aquí Pague Aquí: «Sin crédito: $999 de enganche y $95 a la semana por 18 meses (78 pagos). Total pagado: $8,409 · 14.24 % APR».
5. Super Admin › Negocios 360 › Lo que vende: «Inventario del lote · solo lectura» («37 en el lote · 1 vendido · ITIN desde $1,500 · garantía 3
   meses · cargo del dealer $399»), el cargo con el tope y cada carro con su total; **Ocultar** con motivo. Catálogo › **Cargo del dealer**: el
   tope, cuántos dealers están en el tope y «Cambiar el tope» (solo Admin, con motivo; recalcula todo por lotes).
6. Tu página › **Tus licencias**: dealer de PA, vendedor, venta a plazos, NMLS.

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **La tarjeta del buscador no dice enganche ni pago** (el prototipo dice «Enganche desde $1,500 con ITIN» y «Enganche $999 y $95 a la semana»):
  bajo Regulation Z un enganche o un pago sueltos obligan a decir la tasa y los meses. Dice «Financian con ITIN · tasa, meses y enganche por
  escrito» / «Sin crédito · el total que pagas, por escrito en cada carro»; cada carro trae su ejemplo completo. Lo del prototipo con enganche o
  pago sueltos se quita al derivar. El resumen del panel y del Super Admin sí dice «ITIN desde $1,500» (no es anuncio).
- **Tope del cargo del dealer: $477** (PA, a verificar cada año) en `platform_config`, en Catálogo › Cargo del dealer hasta que llegue
  Configuración (Fase 5). En la semilla, Valle Motors ($499) y Clásicos ($599) quedan en $477. La base también lo frena (trigger).
- **Pago de ejemplo**: solo con «Financias en el lote» y una tasa y meses elegidos; enganche = «Enganche desde». Sin tasa, no hay ejemplo.
  Semilla: solo Autos El Cibao (48 meses al 14.9 %, del prototipo L40; da $324 en el Civic, no $272).
- **Compre aquí pague aquí**: enganche, pago a la semana y meses son del dealer y valen para todos sus carros (como el prototipo); To'Latino
  calcula la tasa que resulta y, si los pagos no cubren el total en la puerta de un carro, ese carro no muestra plan. Puede que haga falta un
  plan por carro: se cambia si lo pides.
- **«Carros en el lote»** es un número del dealer: no baja de los que están en la app; vender un carro lo baja en uno y devolverlo al lote lo sube.
- **Garantía de la herramienta** (como está · 3 · 6 meses, con 3,000 o 6,000 millas) se pone en cada carro que no trae la de fábrica o la
  certificada, para que coincida con la Buyers Guide.
- **VIN** obligatorio salvo botes, carritos de golf y modelos de antes de 1981; la letra 10 tiene que decir el año; no se repite en el lote.
  «Llenar año y marca con el VIN» usa una tabla corta de fabricantes, sin servicio externo (§6 #11).
- **Descripción sin pagos**: «$X al mes», «a la semana» o «enganche $X» no se guardan.
- **Free = 5 vehículos a la vista** en el servidor. Los vehículos no salen en Servicios ni se reservan como cita; Citas no sale en Autos.
- **Horas de prueba de manejo** (class_groups `prueba`): llegan con la solicitud en 4ie; el filtro «Prueba de manejo» se conserva del prototipo
  hasta entonces. Subasta y mayorista quedan en directorio y contacto (§6 #20); placas, compra en efectivo, financiamiento, taller y envío van en
  Servicios. La garantía extendida y el GAP dicen «no son obligatorios».
- **Nada derivado se siembra a mano**: la semilla calcula el total en la puerta en la base; el pago de ejemplo, la tarjeta y los filtros los
  rehace el barrido.

### 4id · Fichas de Iglesias, Bienes Raíces y Venta de Autos y sus páginas de categoría (7 nov)
**Qué mirar** (sandbox, sin entrar; teléfono 390 y escritorio 1360; capturas `f4id-*.png`):
1. `/n/parroquia-santa-maria`: tarjeta de Hoy PRÓXIMA MISA (sale del horario de la semana) · IDIOMA · AYUDA GRATIS; «¿HAY QUE INSCRIBIRSE? No:
   llegas al servicio»; pestaña «Misas y sacramentos» con «Gratis» y «DONATIVO SUGERIDO · SI NO PUEDES, NO SE COBRA»; la hoja del Bautizo.
2. `/n/funeraria-la-paz`: «¿ME DAN EL PRECIO ANTES? Sí, el total por escrito», repatriación, «Pedir información» → llamar / escribir (WhatsApp si
   lo tiene) con «Sin presión». `/n/despensa-manos-unidas`: «¿PIDEN PAPELES?» y «Se acabó por hoy». `/n/linea-oracion-luz-del-valle`: sin local.
3. `/n/rentas-hazleton-latino` › Propiedades: «$1,050/mes · PARA MUDARTE $2,100 · VER ES GRATIS»; la hoja con «Para mudarte: $1,050 + depósito
   $1,050 = $2,100», lo que piden, la zona, «Nunca pagues un depósito…» y el pie «Igualdad de oportunidad en la vivienda» + animales de servicio.
4. `/n/cuartos-dona-mary`: «LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA»; ni la ficha ni la hoja tienen la dirección. `/n/realty-bilingue-hzl`:
   «Cuota estimada $X al mes con 10 % de enganche». `/n/hipotecas-itin-pa`: «¿ME GARANTIZAN LA APROBACIÓN? No, nadie puede».
5. `/n/autos-el-cibao` › En el lote: «¿CUÁNTO PAGO EN TOTAL? Precio + 6 % + placas + cargo»; la hoja con el desglose EN LA PUERTA y «Pago de
   ejemplo: $X al mes con $1,500 de enganche, 48 meses al 14.9 % APR (estimado, sujeto a aprobación)». `/n/compre-aqui-hzl`: el total pagado.
6. Free: `/n/iglesia-bautista-hispana` («Ve al servicio»), `/n/locales-centro`, `/n/lote-la-81` (llamar; la fila no abre hoja).
7. `/c/iglesias`, `/c/bienes-raices`, `/c/venta-de-autos`: «N EN ESPAÑOL» / «N SIN SEGURO SOCIAL» / «N CON ITIN»; la tarjeta de una iglesia
   dice «Ver detalles» (antes «Inscribirme»).

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Pedir en la app llega con 4ie** (como 4ed antes de 4ee): «Pedir visita», «Prueba de manejo», «Pedir fecha» abren la hoja y la hoja ofrece
  **llamar o escribir**; ningún botón lleva a una pantalla que todavía no existe (`booking: false`, guardián `freeNoPromete`).
- **De cada propiedad se ve solo la zona** (ciudad y código postal), también de las que tienen la dirección pública: la consulta pública no lee
  la calle ni el punto (guardián `direccionAlConfirmar`). Sin mapa por propiedad. La ficha de quien renta **cuartos** (en su casa) no muestra su
  dirección ni su punto (la semilla le puso la misma calle que a los cuartos). Si prefieres mostrar la calle de las propiedades con dirección
  pública, se hace con una consulta que solo la lea con `addr_public`.
- **Sin local**: cuartos, capellanía / línea de oración con radio y compra de carros que va a domicilio, como el prototipo.
- **Compre aquí pague aquí en la tarjeta de Hoy**: EN LA PUERTA · PLAN «Total pagado por escrito» · CRÉDITO, y el plan completo (enganche, pago,
  pagos, total y APR) en la frase; el prototipo ponía enganche y pago sueltos (Regulation Z, como 4ic). Con ITIN: «Sí · tasa y meses por escrito».
- **Copy del prototipo que no se copia por no ser cierto**: «(Carfax)» (el historial lo da el dealer y dice de quién), «dos recibos de pago»,
  «2 a 4 semanas», «12 meses o 12,000 millas», «Tarjeta y efectivo», «Precalificar no afecta tu crédito» (solo si el prestamista marca
  `soft_pull`, §6 #8), «AQUÍ NO SE PIDE CITA POR LA APP» (Free pedirá en 4ie, §6 #6).
- **Reseñas**: «VERIFICADAS POR VISITA O CITA» / «POR PRUEBA DE MANEJO O CITA» / «POR FECHA O CATECISMO»; funeraria y tienda dicen «RESEÑAS
  DE VECINOS» sin contar verificadas (§6 #13).
- **Ayuda migratoria de una iglesia**: sin sello del DOJ verificado, «Pregunta si tienen un representante acreditado del DOJ» (§6 #18).
- **Búsqueda por propiedad o por carro** (§6 #10) sigue como hueco: la página de categoría filtra negocios con sus cifras de `filter_values`.

**Capturas:** `f4id-iglesia-m/d`, `f4id-iglesia-hoja-m`, `f4id-funeraria-contacto-m`, `f4id-renta-hoja-m/d`, `f4id-cuarto-m`,
`f4id-cuarto-hoja-m`, `f4id-venta-hoja-m`, `f4id-dealer-d`, `f4id-dealer-hoja-m/d`, `f4id-dealer-salvage-m`, `f4id-bhph-hoja-m`,
`f4id-iglesia-free-m`, `f4id-inm-free-m`, `f4id-autos-free-m`, `f4id-cat-{iglesias,bienes-raices,venta-de-autos}-m/d`.

#### 4id · Privacidad del punto del negocio (arreglo de clase)
- **Qué cambió:** la lista de categoría, la ficha, los «relacionados» y el mapa de Ciudad mandaban el punto exacto del negocio aunque
  trabajara desde casa (el mapa ya lo redondeaba). Ahora todos sacan el punto de un solo lugar que lo redondea a ~500 m para quien
  trabaja desde casa. Quien publica un cuarto con la dirección oculta en la misma dirección del negocio pasa solo a «trabaja desde casa».
- **Qué mirar:** la ficha y la lista de «Cuartos Doña Mary» muestran la zona, no la casa. Si prefieres que el dueño lo decida con un
  interruptor, se agrega en Tu página.


### 4ie · Pedir visita, prueba de manejo y fecha + Panel «Visitas» (7 nov)
**Qué mirar** (sandbox; capturas `v4ie-*.png`, teléfono 390 y escritorio 1360):
1. Cliente (5705550122) › `/n/rentas-hazleton-latino` › una propiedad › **Pedir visita**: Día de la visita (las horas tomadas no se eligen) →
   Revisa y envía: PARA MUDARTE con el desglose, «Hoy $0 · Ver la propiedad es gratis», lo que piden, «Nunca pagues un depósito…», el pie de
   igualdad de oportunidad. Escribe en la nota «123-45-6789»: se guarda como «•••-••-••••».
2. `/vis/D-…`: PENDIENTE «Esperando a Rentas Hazleton Latino · Hoy no pagas nada.», pasos Enviada · Confirmada · Pasó, Mensaje y Cancelar (un toque).
3. Yesenia (5705550433) › Hoy › «ESPERAN TU RESPUESTA»: Confirmar · Otra hora · No se puede; el detalle con lo que vio la persona. Lo que vendes ›
   **Visitas**: esperan, hoy, próximas, por propiedad. Marca una propiedad **Rentada** con visitas vivas: se cancelan solas y avisa a cada persona.
4. Un cuarto: la calle no sale ni en la ficha ni en `/vis/…` hasta confirmar; confirmada, sale en la pantalla y en el aviso.
5. `/n/autos-el-cibao` › **Prueba de manejo**: «Prueba de manejo en tu casa», «Sí, tengo licencia vigente» (nunca el número), carro a cambio.
   Juan (5705550444) no ve la dirección hasta confirmar; después sí (cada vista queda en la auditoría). Tu herramienta › **Horas de prueba de
   manejo · cualquier carro**. Al llegar la hora: Pasó (la reseña se abre) o No vino.
6. Iglesias: `/n/parroquia-santa-maria` › Catecismo › **Inscribirme** para tu hijo; Bendición de la casa › **Pedir fecha** (fecha + franja);
   Padre Luis (5705550422) › Lo que vendes › **Fechas e inscripciones** › Confirmar / Otra fecha / No hay fecha. `consejeria-familiar-shalom`:
   «Pedir cita» con nota cifrada y avisos que no dicen el lugar.
7. Super Admin (5705550199) › Transacciones › **Visitas** (copia del total, línea de tiempo, $0) · Inscripciones con «Iglesias» · Colas › **Plantones**.

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Horas de prueba de manejo por negocio («cualquier carro»)**, no por carro: un patrón semanal en Tu herramienta (6 AM–10 PM, 1 a 5 por hora).
  Si prefieres horas por carro, el motor ya las admite (`class_groups.item_id`); falta la pantalla.
- **Plazo de respuesta:** 4 horas del horario publicado del negocio (sin horario: 4 horas de reloj) y nunca después de la hora − 1 h; se pide al
  menos 2 h de anticipación y que quede ≥ 30 min para responder. Otra hora: la persona tiene hasta 24 h (nunca después de la hora − 1 h).
- **La dirección de la casa del cliente** (prueba en casa) va cifrada en `op_private` (motivo `casa`), no en `operations`; el dealer la ve solo
  confirmada y cada vista se audita; se borra a los 30 días.
- **Nota:** se tapan 9 cifras (seguro social / ITIN) y 13–19 cifras (tarjeta / cuenta) y se rechazan teléfonos (como en las demás notas); la base
  lo vuelve a comprobar en visitas e Iglesias. Las notas de visitas se borran a los 30 días de cerrar.
- **Cancelar es de un toque** (sin pantalla de «¿seguro?»), como el prototipo. El negocio solo cancela una confirmada, con motivo.
- **«No vino»** se guarda como `done` + `noshow` (la misma marca que citas: no abre la reseña). 3 en 30 días abren «Plantones» sobre el
  **negocio** (para que no se use para frenar reseñas); el cliente nunca paga multa.
- **Se rentó / vendió / se ocultó:** cancela las vivas sin culpa en la misma transacción; el aviso sale después (y el barrido lo reintenta).
- **Free:** recibe solicitudes (10 al mes, §6 #6): en la ficha Free la fila va directo a pedir (no hay hoja); el botón de abajo sigue siendo llamar.
  Educación, Niños y Deporte siguen solo con Pro.
- **Precalificación y oferta:** solo el día y la hora en que te llaman (del horario del negocio, sin cupo); la cotización con precio sigue llamando.
- **Iglesias:** se piden en la app solo lo que pide fecha (donativo o «con cita»), el catecismo y lo de consejería u oración; la misa y la ayuda
  no se reservan (§6 #4). «Pedir fecha» = de pasado mañana a 60 días, franja mañana / tarde / noche; responde en 48 h. Consejería, capellanía,
  oración y recuperación (por el tipo del lugar o por el nombre del servicio) llevan avisos `insc_fen_*` sin el lugar ni el servicio.
- **Ayuda con la visita** llega con 4if: por ahora la pantalla dice «Escríbele al lugar por Mensaje» (sin promesa falsa).
- **Mi cuenta** las lista como «VISITA D-…» dentro de «Inscripciones, planes, rentas y apartados» (el título no cambió).

**Capturas:** `v4ie-dia-m`, `v4ie-revisa-m`, `v4ie-pend-m`, `v4ie-panel-hoy-m`, `v4ie-otra-m`, `v4ie-rentada-m`, `v4ie-conf-cuarto-m`,
`v4ie-prueba-casa-m`, `v4ie-prueba-revisa-m`, `v4ie-dealer-pend-m`, `v4ie-dealer-conf-m`, `v4ie-paso-m`, `v4ie-catecismo-m`, `v4ie-fe-panel-m`,
`v4ie-pedir-fecha-m`, `v4ie-pedir-d`, `v4ie-conf-d`, `v4ie-panel-visitas-d`, `v4ie-admin-tx-d`.

### 4if
Reseñas y Ayuda de Iglesias, Bienes Raíces y Autos. Qué mirar (teléfono y escritorio):
- **Tu visita** (`/vis/D-…`): el botón «Ayuda con la visita» / «Ayuda con el dealer» sale cuando pasó o, confirmada, cuando ya llegó la hora
  (lo de «me cobraron por ver» pasa en la puerta). Decidí permitirla también si el negocio marcó «No vino» (la persona puede decir «No llegaron»).
- **«Me cobraron por ver» / «Pidieron más para mudarme» / «Me pidieron dinero por la ayuda»:** directo a «Posible estafa» y **pausa automática**
  de la propiedad, el carro o «Pedir fecha» (decidí pausar sin esperar a una persona: es reversible y protege al siguiente; las visitas ya
  confirmadas de otros NO se cancelan — si prefieres cancelarlas sin culpa al pausar, se cambia). SLA de la cola: 8 h.
- **Dinero:** nada vuelve a una tarjeta. Si el negocio acepta devolver, lo hace fuera de la app y la persona toca «Me lo devolvieron» (o «No me
  lo devolvieron» → To'Latino). La sanción es una advertencia (`sanctions`, negocio) y el anuncio fuera con el motivo; se vuelve a mostrar
  desde Negocios 360°. Decidí no suspender negocios desde esta cola (eso es de Negocios 360°).
- **«Lo que importa»:** el plan pedía rótulos del prototipo que no salen de ninguna pregunta («EL PRECIO NO CAMBIÓ», «TE EXPLICAN CADA PASO»,
  «ARREGLAN A TIEMPO», «EXPLICAN EL FINANCIAMIENTO»): **no los puse** (serían falsos); cada rótulo sale de una pregunta que de verdad se hizo
  (p. ej. «VER FUE GRATIS», «EL TOTAL EN LA PUERTA FUE EL QUE DIJERON», «CON RESPETO»). Línea: «De N visitas y citas…» (Bienes Raíces), «De N
  pruebas y citas…» (Autos), «De N fechas y catecismos…» (Iglesias).
- **Iglesias:** decidí que la reseña **no lleve fotos** (no hay forma de saber si sale una persona; el servidor las rechaza). Funerarias y
  tiendas religiosas: «Reseñas de vecinos» y sin el filtro «Verificadas». Avisos a la persona neutros (`fe_help_*`).
- **Fotos de la ayuda** de las tres: privadas (recibos y contratos con nombres y direcciones).
- **Hechos de la reseña:** «Se rentó antes de la visita» solo sale si el anuncio cambió de estado antes de la hora y aun así la visita pasó;
  «No llegaron» solo si el negocio lo aceptó en la Ayuda o To'Latino lo resolvió.
- Hueco del diseño (regla AB): el caso «Posible estafa» del Super Admin se compuso con las piezas de Colas (kv, notas, fotos, ReasonConfirm).

**Capturas:** `h4if-ayuda-ver-m`, `h4if-estado-revision-m`, `h4if-panel-visita-d`, `h4if-admin-estafa-d`, `h4if-resena-visita-m`,
`h4if-ficha-lo-que-importa-m`, `h4if-ayuda-dealer-d`, `h4if-panel-hoy-d`, `h4if-panel-ayuda-d`, `h4if-me-lo-devolvieron-d`,
`h4if-resena-iglesia-d`, `h4if-iglesia-resenas-d`, `h4if-ayuda-iglesia-m`.

### 4ig · Super Admin, avisos, analítica y documentación · Iglesias + Bienes Raíces + Venta de Autos completos · Fase 4 cerrada (7 nov)
**Qué mirar, paso a paso, todo el grupo en el sandbox** (capturas `g4ig-*.png`; teléfono 390 y escritorio 1360):
1. **Iglesias (Padre Luis, 5705550422):** Lo que vendes › Horarios y ayuda (toca una misa; la última no se apaga), Despensa › «Se acabó por
   hoy», Funeraria › precios y repatriación. Sin sesión: `/n/parroquia-santa-maria` (próxima misa, «no hay que inscribirse», donativo «si no
   puedes, no se cobra»), `/c/iglesias`. Como cliente (5705550122): «Pedir fecha» del bautizo y «Inscribirme» al catecismo; Padre Luis
   confirma en Fechas e inscripciones.
2. **Bienes Raíces (Yesenia, 5705550433):** Propiedades › Agregar (prueba «no niños»: no se guarda), Tu herramienta (apaga «Sin seguro
   social» y mira que `/c/bienes-raices` con ese filtro ya no la lista; préndelo otra vez). Como cliente: «Pedir visita», `/vis/D-…`, y
   Yesenia confirma, propone otra hora o marca «Pasó» / «No vino». Un cuarto: la dirección llega solo al confirmar.
3. **Autos (Juan, 5705550444):** Inventario (VIN, EN LA PUERTA, cargo ≤ $477), Tu herramienta (apaga «Financias con ITIN»: la ficha dice
   «CON ITIN No» y la tarjeta de Buscar deja de decir «Financian con ITIN»). Como cliente: «Prueba de manejo» (en casa si la ofrece).
4. **Ayuda y reseñas:** después de una visita, «Ayuda con la visita» › «Me cobraron por ver la propiedad»: va directo a To'Latino y la
   propiedad se pausa; la reseña con «Lo que importa».
5. **Super Admin (5705550199):** Colas › **Vivienda justa** (el texto frenado de Yesenia: «Advertir al negocio» o «Revisado, sin acción»;
   una propiedad «para mayores de 62»: «Confirmar mayores» / «No se confirma»; las dos avisan al negocio), **Posible estafa**, **Plantones**,
   **Licencias** (una licencia verificada vuelve 14 días antes de su revisión y con prioridad si ya pasó; dice «revisión por vencer» o
   «revisión vencida desde…»), Ayuda con pedidos y citas. Transacciones › **Visitas**. **Notificaciones** (busca «Aviso de vivienda justa»,
   «Vivienda para mayores confirmada», «Pausamos un anuncio», «Te proponen otra hora»). **Analítica › Iglesias · Bienes Raíces · Autos**.
   Negocios 360° de cada uno: «Tu herramienta» en solo lectura, Pausar Servicios (Iglesias) y Ocultar una propiedad o un carro.

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Cola «Vivienda justa»** (no existía en el diseño; compuesta con las piezas de Colas): un caso por negocio junta los textos frenados de 30
  días (se muestran los últimos 12, el total arriba); una frenada nueva después de decidir abre otro. Decisiones: «Revisado, sin acción» o
  «Advertir al negocio» (advertencia en `sanctions` + aviso `biz_vivienda_aviso`). La declaración de mayores abre un caso por propiedad al
  guardarla; «Confirmar» / «No se confirma» desde la cola o desde Negocios 360° hacen lo mismo y avisan (`biz_mayores_ok` / `biz_mayores_no`).
  El caso muestra la **zona** (código postal), no la calle.
- **Licencias por vencer y vencidas:** «vencida» es que pasó su fecha de revisión (no hay fecha de vencimiento del estado en la base). El
  barrido la devuelve a la cola; **el sello no se quita solo**: cambia cuando una persona mira el registro. Solo para las licencias de estas
  tres categorías (extenderlo a todas es una línea; anotado en LAUNCH-CHECKLIST).
- **Analítica:** «confirmadas a tiempo» = confirmadas, porque el servidor no deja confirmar después del plazo (al confirmar se limpia
  `respond_by`; mi primera versión comparaba con `respond_by` y daba 0 %: lo cazó la prueba contra SQL). «Días hasta rentar o vender» cuenta
  desde que se publicó la propiedad o el carro. Las ciudades salen si están encendidas o tienen algo a la vista. Nunca por religión ni crédito.
- **Configuración** (tope del cargo del dealer, 4 h, 24 h, 48 h, 14 días, lista de frases): constantes o Catálogo hasta la Fase 5.
- **Triángulo** probado en las tres (`adm4ig`): el toque de Tu herramienta cambia la ficha, la tarjeta de la categoría y Buscar en el
  momento; el Super Admin lo ve en Negocios 360° y puede pausar Servicios (Iglesias) u ocultar una propiedad o un carro.

**Preguntas #1–#22 del plan (§6), anotadas:** se aplicó el default más seguro de cada una tal como está escrito en el plan y en las notas
de 4ia–4if de arriba. En una línea: #1 nada se cobra en Iglesias (donativo es texto; diezmo en línea no se construye) · #2 número «D-8101…»
(no «P-», que es de los pre-estimados) · #3 4 h hábiles y nunca después de la hora − 1 h; Iglesias 48 h · #4 misas y cultos no se reservan
· #5 cuota de solicitud entra en «Para mudarte», depósito ≤ 2 meses · #6 Free recibe hasta 10 solicitudes al mes · #7 funeraria por contacto
· #8 «no afecta tu crédito» solo con `soft_pull` · #9 el pago de ejemplo lo calcula el servidor · #10 búsqueda por anuncio queda como hueco
(LAUNCH-CHECKLIST) · #11 VIN validado por su dígito, sin historiales de pago · #12 cotización de flota en Mensajes · #13 verificada = fecha o
catecismo por la app; funeraria con «reseñas de vecinos» · #14 taller del dealer = visita de $0 · #15 dirección del cuarto al confirmar,
sin preferencias de quién vive · #16 sellos sin verificar hasta revisarlos · #17 To'Latino no guarda el contrato de compre aquí pague aquí ·
#18 «No es consejo legal» y 988; orientación migratoria solo con sello del DOJ · #19 tienda y botánica por contacto · #20 subasta y
mayorista solo directorio · #21 casas abiertas y ventas de fin de mes son Eventos (Fase 6) · #22 los errores del prototipo no se copiaron.
Si prefieres otra cosa en alguna, se cambia.

**Para saber:** volver a correr a mano 0092, 0094 o 0095 sobre una base que ya tiene datos de bloques posteriores falla (esas migraciones
estrechan un check que las siguientes ampliaron); no pasa en la vida real porque `migrar.sh` aplica cada una una sola vez por su huella. En
una base nueva, 0001–0096 y luego 0091–0096 dos veces más aplican sin error.

**Capturas:** `g4ig-vivienda-frase-d`, `g4ig-vivienda-mayores-d`, `g4ig-licencia-d`, `g4ig-notif-d`, `g4ig-analitica-d`,
`g4ig-triangulo-autos-d`, `g4ig-vivienda-m`, `g4ig-analitica-m`.

### 5a · Comunidad: el muro, publicar y la publicación (7 nov)
**Qué mirar, paso a paso, en el sandbox** (capturas `c5a-*.png`; teléfono 390 y escritorio 1360):
1. **Sin cuenta:** `/comunidad` → muro de registro (qué es, cifras reales de Hazleton y qué tipo de cosa se publicó hace poco, sin nombres
   ni textos) y «Entrar con mi teléfono». Abrir `/comunidad/nuevo` o una publicación lleva a Entrar.
2. **Como vecina (5705550299):** el muro con «PREGUNTA DE LA SEMANA · FIJADA» de To'Latino Hazleton arriba; los chips (Todo · Siguiendo ·
   Preguntas · Recomendaciones · Encuestas · Publicaciones) y el filtro (5 · 10 · 30 mi; Más votados · Recientes); «Ver más» al final.
3. **Publicar:** prueba una pregunta con un teléfono (sale el motivo en la misma caja) y con «123 N Wyoming St» (rechazada: dirección exacta);
   luego una de **Salud** (sale con la línea del 911); una recomendación (busca «espiga», «No es mi negocio…», «¿para qué?»); una encuesta
   (en el sandbox la vecina de prueba no es Cabo: la prueba le pone rango 3 y se lo devuelve). En escritorio, la vista previa a la derecha.
4. **La dueña (Yesenia, 5705550433)** intenta recomendar «Rentas Hazleton Latino» → «No puedes recomendar tu propio negocio».
5. **Tu publicación:** ··· → Editar (solo 30 min), Borrar → «Publicación borrada · Deshacer» (10 s).
6. **Super Admin (5705550199) › Contenido › Publicaciones:** Ocultar (con motivo; la autora la sigue viendo con el motivo y recibe el aviso),
   Restaurar, Fijar (7 días, una a la vez) y Bloquear comentarios.

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Dirección exacta → se rechaza al escribir** (el plan §3 decía «se publica y se marca para revisión»; rechazar es lo más seguro y
  reversible). Número + calle («123 N Wyoming St», «Calle Alter 512») no pasa; «en la Wyoming St» o «la 22 y la Diamond» sí. La cola llega en 5d.
- **Diagnósticos y medicinas sí se pueden escribir** en la Comunidad (preguntar por un pediatra es el uso); de `PRIVADO` solo se usan los
  números (A-number, caso de USCIS). SSN/ITIN, tarjetas, correos y teléfonos no pasan, y la base también los frena (`com_sin_datos`).
- **Chip «Todo»** en vez de «Para ti» del prototipo: el muro no está personalizado y «Para ti» prometería algo que no hace. Se agregó
  «Publicaciones» (el prototipo lo tiene; el plan no lo listaba).
- **Tipos = 4** (pregunta · recomendación · encuesta · publicación; §6 #2). **Tema** opcional en preguntas (el prototipo dice «opcional»;
  sin tema queda «Otro»). Encuesta: **2–4** opciones (el prototipo dejaba 5), 1 · 3 · 7 días.
- **Rango:** `community_profiles.rank_level` existe desde 0097 (vale 1; la semilla pone el de los vecinos de prueba) para que la pastilla
  «6 · Teniente» y «encuestas desde Cabo» funcionen ya; lo escribe `recalcularRango` en 5f.
- **Límites** (§6 #21): 10 publicaciones en 24 h corridas (5 si la cuenta es de hoy); las borradas cuentan. Pasan a Configuración en 5i
  (y a «día local» de la ciudad).
- **Votar ±, la encuesta y guardar ya funcionan** en el muro (contadores y orden derivados en la base, exactos con votos a la vez). Lo de
  votos del mismo dispositivo y los puntos llegan en 5b/5f; el dispositivo ya se guarda en cada voto.
- **Comentarios:** la publicación los muestra por votos, de solo lectura; comentar, responder y «Me sirvió» llegan con el hilo (5b).
- **Muro de registro sin la foto de portada** del prototipo (era de Pexels): fondo tinta hasta que elijas una foto propia. Sin cuenta no
  se ve ningún texto ni nombre de vecino (el prototipo mostraba textos borrosos, que igual llegaban al navegador). «Hoy en el barrio» (abierto
  a todos) se suma ahí en 5e.
- **Cuenta oficial de las 5 ciudades** creada en la migración (es configuración real, también en producción), no en la semilla. No es una
  persona: no tiene fila en `users`.
- **Seguir** («Siguiendo») usa la tabla `follows` que ya existía; seguir a vecinos (botón) llega en 5c. Bloquear y silenciar también (5c),
  pero `user_blocks` ya existe y el muro y la publicación ya los excluyen en los dos sentidos.
- **Desktop:** navegación 240 (tu tarjeta, Conversación, Publicar) + muro 720 + contexto 320 (tu rango y las reglas con la línea fija).
  Hoy en el barrio, Tabla del Barrio y Mensajes no se enlazan hasta que existan (5c–5f).
- **Semilla 0032:** 15 vecinos de prueba (+1 570 555 7001…7015, `is_test`) + la cuenta oficial = los 16 de `TLCom.U`; 14 publicaciones, 26
  comentarios y **245 «votantes de prueba»** (+1 570 555 9001…9245, sin teléfono verificado, `is_test`) para que votos y encuestas cuadren
  con el prototipo (la encuesta del festival suma 245). Zonas del prototipo sin barrio en la base: East End → Centro, Diamond Ave → North End.

**Capturas:** `c5a-invitado-m`, `c5a-invitado-d`, `c5a-muro-m`, `c5a-muro-d`, `c5a-telefono-m`, `c5a-pregunta-m`, `c5a-nuevo-d`,
`c5a-recomendacion-d`, `c5a-propio-m`, `c5a-deshacer-m`, `c5a-filtros-m`, `c5a-admin-d`, `c5a-post-d`.

### 5b · Comunidad: el hilo — comentar, responder, recomendar, votos, «Me sirvió» y encuestas (7 nov)
**Qué mirar, paso a paso, en el sandbox** (capturas `c5b-*.png`; teléfono 390 y escritorio 1360):
1. **Como vecino (Héctor, 5705550288) en el teléfono:** abre una pregunta y comenta con la barra de abajo. Prueba un teléfono (sale «No
   publiques teléfonos…» y no se guarda). Toca la tienda → busca «espiga» → el negocio queda adjunto («RECOMIENDAS ESTE NEGOCIO»).
2. **Como vecina (Marisol, 5705550122) en escritorio:** la caja está en el mismo hilo (Ctrl + Enter envía). «Responder» en un comentario abre
   la cajita debajo («Respondiendo a …»; Esc cancela). En «Ver N respuestas», responder a una respuesta pone «@Nombre» y sale un nivel abajo.
3. **Recomendados en este hilo:** las barras de % (las calcula el servidor; suman 100) y el número para sumar tu voto. Si eliges un negocio
   que ya está en el hilo, sale «YA LO RECOMENDARON AQUÍ» con **Sumar mi voto**.
4. **Votos:** + / − en la publicación (votaste = borde y tinte morado) y en cada comentario; el mismo toque lo quita, el otro lo cambia.
5. **Quien preguntó (Yaritza, 5705550299):** «Me sirvió» en un comentario → la pregunta queda **Resuelta** y esa respuesta sale arriba
   («LE SIRVIÓ A YARITZA · N VOTOS»). En el menú (⌄) de otra respuesta: «Esta me sirvió más».
6. **Encuesta:** vota y ve los %; cuando cierra (el barrido de cada minuto), todos ven el resultado y llega «Cerró la encuesta» con el resultado.
7. **Campana:** «Comentaron tu publicación», «Te respondieron», «Te mencionaron», «Tu respuesta le sirvió», «Llegaste a 10 votos», «Cerró la encuesta».
8. **Super Admin (5705550199) › Contenido › Comentarios de vecinos:** Ocultar con motivo (sale del hilo y de los recomendados; el autor recibe
   el aviso) y Restaurar.

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Votos honestos ya en 5b:** la base rechaza votar lo propio y, si otra cuenta ya votó lo mismo desde el mismo teléfono (cookie de
  dispositivo), el voto se guarda pero **no cuenta** (callado, §3). El caso «posible red» en `repUsr` llega en 5d.
- **La destacada** = la que le sirvió a quien preguntó; si no hay, la más votada con **5 votos a favor o más** (como el prototipo) y solo en
  «Más votados». En «Recientes» la que le sirvió sigue arriba.
- **«Votos» de un negocio recomendado** = suma de los votos a favor de los comentarios que lo recomiendan (como el prototipo); «Sumar mi voto»
  es votar a favor el comentario que más votos tiene para ese negocio. Si ese comentario es de alguien con quien hay un bloqueo, ese negocio no
  sale en tu lista.
- **«Me sirvió»** solo en preguntas, sobre comentarios raíz de otra persona; se cambia con «Esta me sirvió más» (siempre una; no se quita).
- **Menciones:** «@Nombre» avisa solo a gente de ese hilo (quien publicó o comentó) cuyo nombre coincide sin dudas (nombre, o nombre e
  inicial «@Gaby R.»); hasta 5 por comentario; nunca a alguien con bloqueo o silencio de por medio, en los dos sentidos. Contestar una
  respuesta siempre avisa a esa persona.
- **Plantillas:** además de las 5 del plan, `com_comment` (a quien publicó) y `com_cm_hide` / `com_cm_restore` (comentario oculto o
  restaurado). Todas sin SMS, grupo `tx` sin interruptor (el grupo «Comunidad» llega en 5i).
- **«Llegaste a 10 votos»:** al llegar a 10 votos **a favor**, una vez por publicación o comentario (si baja y vuelve a 10, no se repite).
- **Encuesta:** los % se ven después de votar o al cerrar, también para quien la publicó (prototipo: `show = voted || closed`); los manda el
  servidor (antes de votar no llegan al navegador). Al cerrar, el aviso va a quien la publicó y a quienes votaron, una vez; empate dice «Empate entre…».
- **Comentario de solo negocio** (sin texto) permitido, como el prototipo. Hasta 600 letras. **100 comentarios en 24 h** (50 si la cuenta es
  de hoy); los borrados cuentan.
- **Borrar comentario propio** = estado; si tenía respuestas queda «Comentario eliminado» (y «Comentario oculto por las reglas del barrio» si
  lo ocultó To'Latino) con sus respuestas. **Reportar** (5d) y **Bloquear** (5c) no salen en el menú hasta que existan.
- **A las respuestas solo se les vota a favor** (así viene ReplyThread 18a del sistema de diseño).
- **Teléfono:** la caja de abajo dice «Recomienda a alguien…» en preguntas (la del prototipo, «¿Conoces a alguien? Recomiéndalo…», no cabe
  en 390). Escritorio mantiene la del prototipo.
- **Super Admin:** la pestaña se llama **«Comentarios de vecinos»** porque «Comentarios» ya era la de las Novedades de los negocios.
- **Los puntos** de votos y «Me sirvió» llegan en 5f (marcados «HOOK 5f» en el código); ningún mensaje los promete hoy.

**Capturas:** `c5b-comentar-m`, `c5b-responder-d`, `c5b-respuestas-m`, `c5b-sumar-m`, `c5b-recomendados-d`, `c5b-mesirvio-m`, `c5b-hilo-d`,
`c5b-hilo-m`, `c5b-encuesta-d`, `c5b-encuesta-cerrada-m`, `c5b-admin-d`.


### 5c · Comunidad: vecinos — perfil, seguir, silenciar, bloquear, bienvenida y Mensajes vecino ↔ vecino (7 nov)
**Qué mirar, paso a paso, en el sandbox** (capturas `c5c-*.png`; teléfono 390 y escritorio 1360):
1. **Bienvenida (teléfono, una cuenta nueva desde Mi cuenta):** después de tu nombre siguen **Tu zona** (chips de zonas de tu ciudad),
   **Lo que te gusta** (17 categorías y 5 de Comunidad, sin El Patio) y **El barrio** (6 reglas, «Empiezas como Recluta…», vecinos para
   seguir, y las casillas **«Acepto las reglas del barrio»** y **«Tengo 18 años o más»**: sin las dos el botón no se enciende). Al final:
   «Fundadores · #n · Recluta» y el saludo. Prueba «Tengo menos de 18 años»: sale el aviso sobrio y la Comunidad ya no abre.
2. **Perfil de un vecino:** desde el nombre en una publicación. Seguir → Siguiendo (aviso al otro); «Mensaje» solo si te sigue. ⌄ →
   Silenciar / Bloquear. **Mi perfil** (la pastilla del rango): «Editar mi perfil» (presentación, cómo te dicen, desde qué año, ocultar
   mis cuentas); prueba un teléfono en la presentación (se rechaza).
3. **Mensajes:** con dos cuentas que se siguen, escríbanse; prueba un teléfono (se rechaza con el motivo). Con una que no te sigue: no hay
   caja y dice por qué. El punto de «Mensajes» arriba marca lo sin leer.
4. **Bloquear (lo más importante):** A bloquea a B. Con B: el muro, el hilo, el perfil («No encontramos a este vecino», igual que si no
   existiera), los mensajes, los avisos y Mi cuenta › Siguiendo ya no muestran nada de A; B no recibe ningún aviso. Con A: lo mismo de B,
   y en el perfil de B «Bloqueaste a … · Desbloquear». Mi cuenta › Vecinos › Bloqueados y silenciados › **Desbloquear** devuelve todo
   (también quién seguía a quién y la conversación).
5. **Silenciar:** solo deja de verlo quien silencia; el otro no se entera.
6. **Super Admin:** reporta una conversación (⌄ › Reportar conversación) y ábrela en **Colas › Mensajes reportados** («Mensajes entre
   vecinos»): se lee solo con el reporte abierto; «Ocultar» un mensaje con motivo; «Todo bien» cierra y ya no se puede leer. **Usuarios ›
   360° › Comunidad**: seguidores, siguiendo, bloqueó, silenció (con «MISMO DISPOSITIVO»), cuántas conversaciones (nunca su contenido),
   la declaración de 18+.

**Decidí (regla AB; si prefieres otra cosa, se cambia):**
- **Contestar sin seguir:** «mensaje nuevo solo a quien te sigue» + **se puede contestar a quien ya te escribió** en esa conversación
  (si no, quien escribe primero nunca recibiría respuesta). Lo impone también la base.
- **Silenciar** también calla los avisos de esa persona (sus mensajes llegan, sin aviso). Bloquear esconde **también los avisos que ya
  habían llegado** de esa persona (`notifications.actor_user_id`); los avisos viejos (antes de 5c) no tienen autor y siguen visibles.
- **Deshacer un bloqueo** devuelve los seguimientos que ese bloqueo quitó y reabre la conversación (para que «Deshacer» sea de verdad).
- **Quien declara ser menor** no lo cambia desde la app (lo revisa Soporte). Sin fecha de nacimiento, como §6 #14.
- **Las listas de seguidores de otros** no se muestran (solo las cuentas, ocultables); las tuyas, en Mi cuenta › Vecinos.
- **Pasos 3–5 de 2au** los hace quien viene de Mi cuenta o de la Comunidad; quien se registra desde un pedido o una cita termina en el 2
  («solo el nombre» del prototipo) y los hace al entrar a la Comunidad.
- **«Usar mi ubicación»** del paso 3 y los interruptores de avisos del paso 5 del prototipo no se pusieron (la ubicación ya se pide en el
  mapa y los avisos están en Mi cuenta › Avisos). **Compartir un negocio** en el chat (prototipo) tampoco: §6 #16 dice solo texto.
- **Las 100 monedas** no se acreditan hasta 5g; la bienvenida lo dice así («llegan cuando abran los cupones del barrio»).
- **Reportar a una persona** desde su perfil (hueco #4) y **«Abrir caso de red de cuentas»** van con la cola `repUsr` en **5d**; el 360°
  ya muestra el aviso de posible red.
- Un **segundo reporte** de la misma conversación (cliente ↔ negocio o vecinos) ahora la vuelve a abrir; antes daba error.

**Capturas:** `c5c-bienvenida-3-m`, `c5c-bienvenida-4-m`, `c5c-bienvenida-5-m`, `c5c-bienvenida-fin-m`, `c5c-menor-m`, `c5c-vecino-m`,
`c5c-vecino-d`, `c5c-mensajes-m`, `c5c-chat-m`, `c5c-chat-d`, `c5c-bloquear-d`, `c5c-bloqueado-m`, `c5c-reportar-m`, `c5c-cuenta-vecinos-d`,
`c5c-cuenta-vecinos-m`, `c5c-admin-dm-d`, `c5c-admin-u360-d`.

### 5d · Comunidad: reportar, auto-moderación, antiabuso, sanciones y apelaciones (7 nov)
**Qué mirar, paso a paso, en el sandbox** (capturas `c5d-*.png`; teléfono 390 y escritorio 1360):
1. **Reportar (teléfono):** en una publicación, ··· › Reportar → motivo → «¿Algo más que debamos saber?» → **«Ya no lo ves. Lo revisamos en
   48 h.»**. La publicación desaparece solo para ti; otra cuenta la sigue viendo. Igual en un comentario (⌄ › Reportar comentario), en el
   perfil de un vecino (⌄ › Reportar a …: además lo silencia para ti) y en una conversación.
2. **Auto-ocultar:** con 5 cuentas en **un mismo teléfono** no pasa nada; con 5 personas en teléfonos distintos (cuentas de más de 72 h) se
   oculta «por revisión» y la autora recibe el aviso con **Apelar**.
3. **Apelar (la autora):** el aviso → Mi cuenta › Avisos de moderación → 20–500 letras → «Recibimos tu apelación. Te respondemos en 72 h.».
4. **Segunda revisión:** con el Admin que la ocultó, la apelación sale con candado y sin botones; con **otro** Admin (5705550188), Levantar →
   la publicación vuelve y llega «Revisamos tu apelación».
5. **Super Admin › Confianza y seguridad** (Resumen, Catálogo con el efecto en la Comunidad, Sancionados, Apelaciones, Fraude, Privacidad) y
   **Contenido › Auto-moderación** (reglas, valores, listas, límites). Apaga «Fotos: desnudez»: dice qué pasa con las fotos.
6. **Sanción:** Colas › Reportes de usuario › Sancionar «Silencio 7 días» → la persona lee el muro; Publicar dice hasta cuándo y por qué
   (con «Ver y apelar»); comentar también se rechaza con el motivo.

**Decidí (regla AB; si prefieres otra cosa, se cambia):**
- **Modelo de fotos propio con NudeNet 3.4.2** (ONNX, MIT según su paquete; licencia de los pesos a confirmar con abogado — LAUNCH-CHECKLIST),
  **encendido de fábrica** porque los pesos sí se bajan (vienen en el paquete de PyPI). Solo mide desnudez. Si el servicio no responde
  (3 s, corta 30 s), la foto **no se publica**: queda «en revisión» en Medios marcados y su autor ve «1 foto espera revisión». Solo las
  fotos de la Comunidad pasan por el modelo.
- **«Teléfonos» no se apaga** (la base lo impide): sale con su interruptor fijo y la explicación.
- **«Direcciones de personas» (pii):** número + calle se sigue **rechazando** al escribir (decisión de 5a); la regla encendida además marca
  placas (ABC-1234) y «vive en …» para revisión humana.
- **La regla de listas (`hate`) gobierna odio, estafa e inmigración; autolesión siempre** (seguridad): marca con prioridad y quien escribe
  ve la línea del **988**. En **mensajes entre vecinos** no se marca nada (el equipo no los lee sin reporte); solo se muestra el 988.
- **Auto-ocultar** cuenta **personas**: las cuentas que comparten algún dispositivo (sesiones o el del reporte) son una; cuentas de menos de
  **72 h** no cuentan; un Coronel vale 3 (§6 #9). Queda «oculta por revisión» con aviso y Apelar; «Se queda» la devuelve.
- **Apelar 14 días** (§6 #18; el prototipo decía 7), **una sola vez**, final. Si nadie ocultó a mano (auto), la decide cualquiera del equipo.
- **nopub ≠ mute7 en la Comunidad:** silencio = no publica, no comenta ni escribe; «bloquear publicación» = solo no publica.
- **Límites en el día local** de la ciudad (antes 24 h corridas) con la mitad el primer día; nuevo **20 reportes al día**. El texto quedó uno
  para todos: «Llegaste a N … hoy. Vuelve mañana.» (antes «Ya empezaste 10 conversaciones hoy. Sigue mañana.»).
- **Reportar una conversación** usa el mismo flujo de 3 pasos (con sus motivos de 5c). A una **persona** se la puede volver a reportar si el
  caso anterior se cerró (como una conversación); una publicación o un comentario, una vez.
- **Ráfagas y redes se vuelven a armar** después de cada marca (solo cuenta lo nuevo): un caso ya decidido no se reabre cada minuto.
- **Quienes reportan** reciben «Revisamos tu reporte» (prototipo); de una persona sancionada no se les dice nada.
- **Toda sanción a una persona** ahora pasa por `aplicarSancion` y avisa con el motivo y Apelar (también la de Usuarios 360° y la de una reseña).
- **Apelar una suspensión o un baneo** se pide por Soporte (la persona no puede entrar); pantalla propia a LAUNCH-CHECKLIST.
- **Accesibilidad:** el menú ··· de `PostCard` y ⌄ de los comentarios (`Thread`) ahora son botones con nombre («Opciones»).
- La pestaña «Reglas del sello» del prototipo no se repitió en Confianza: vive en Colas › Sello.

**Capturas:** `c5d-reportar-motivo-m`, `c5d-reportar-detalle-m`, `c5d-reportar-recibido-m`, `c5d-oculta-autora-m`, `c5d-colas-rep-d`,
`c5d-apelar-m`, `c5d-apelacion-m`, `c5d-apel-mismo-d`, `c5d-apel-d`, `c5d-moderacion-lista-m`, `c5d-988-m`, `c5d-auto-d`, `c5d-limite-m`,
`c5d-fraude-d`, `c5d-reportar-persona-m`, `c5d-colas-repusr-d`, `c5d-silenciado-m`, `c5d-foto-revision-m`, `c5d-medios-d`,
`c5d-auto-img-off-d`, `c5d-reportar-d`, `c5d-confianza-d`, `c5d-confianza-m`.

### 5e · Comunidad: Hoy en el barrio y cuenta oficial por ciudad (+ Inicio, Negocios, Buscar) (7 nov)
**Qué mirar, paso a paso, en el sandbox** (capturas `c5e-*.png`; teléfono 390 y escritorio 1360):
1. **Sin cuenta, `/comunidad/hoy`:** pestañas Conversación · **Hoy en el barrio**; una tarjeta (StoryCard 8a) por negocio con hasta 3 avisos de
   menos de 24 h: OFERTA · NOVEDAD · LLEGÓ · AVISO y **«QUEDAN N H»**. Toca a la derecha / izquierda; después del último abre la ficha › Novedades.
   Chips por categoría; sin avisos, «Nuevos en el barrio». A la derecha (escritorio) o abajo (teléfono), la invitación a la conversación.
2. **Triángulo:** como dueño Pro (Sabor Dominicano), publica una Novedad para todos → sale en Hoy; tu panel y tu página dicen **«En Hoy en el
   barrio · quedan N h»**; quien sigue el negocio recibe «Hoy en un negocio que sigues» (campana, sin SMS). En **Super Admin › Contenido › Hoy
   en el barrio** sale con su origen; **Retirar de Hoy** con motivo → ya no sale, sigue en su página, el negocio recibe el aviso y su panel
   dice por qué. **Devolver a Hoy** lo deshace.
3. **Lo que nunca sale:** oculta, detenida, solo seguidores, de un negocio Free, vencida, de más de 24 h.
4. **Cuenta oficial:** Contenido › **Cuenta oficial** → Nueva publicación → Pregunta de la semana → Programar (hora de la ciudad) → Fijada 3 días.
   Antes de su hora no sale; a su hora sale arriba del muro con el sello y «Cuenta oficial», y la fijada anterior se desfija (una a la vez).
5. **Inicio:** «Hoy en el barrio» en carrusel y «Comunidad» con la pregunta de la cuenta oficial (cifras reales) y Entrar / Ir a la comunidad.
   **Negocios:** «Hoy en el barrio» y **«RECOMENDADOS POR VECINOS»** (puesto, negocio, ★ y cuántos vecinos lo recomiendan; en escritorio, en el riel).
6. **Buscar:** sin cuenta, nada de vecinos. Con cuenta, «Lo que dicen los vecinos» + la línea fija (y pestaña Vecinos en escritorio); un vecino
   bloqueado no sale. **Pregúntale al barrio** abre Publicar con lo que buscaste escrito.

**Decidí (regla AB; si prefieres otra cosa, se cambia):**
- **Hoy es Pro** (como Novedades, 2g-2): el prototipo decía «Gratis para todos los negocios»; la tarjeta para negocios dice «Con el plan Pro».
- **Tipos:** oferta → OFERTA; «hoy hay / llegó» → LLEGÓ; aviso → AVISO; novedad y **encuesta → NOVEDAD** (la encuesta se vota en la página).
- **«Quedan N h»** = lo que falta para las 24 h desde que salió, o para su fin si vence antes. En tarjetas anchas va arriba a la derecha; en las
  angostas del teléfono (2 por fila) va junto al tipo para que el nombre del negocio no se corte (la StoryCard solo tiene un lugar para la hora).
- **Orden de Hoy:** el negocio con el aviso más reciente primero (nadie paga el orden); hasta 3 avisos por negocio, los más nuevos.
- **Retirar de Hoy ≠ ocultar:** retirar solo la saca de Hoy (sigue en la página); para quitarla de la página se oculta en Novedades.
- **Recomendados por vecinos:** recomendaciones de los últimos **180 días** (publicaciones y comentarios), orden por votos y luego por vecinos
  distintos; sin cuenta no hay bloqueos que aplicar; con cuenta se quitan los de quien bloqueaste o silenciaste. Solo negocios y cuántos.
- **Inicio › Comunidad** muestra lo que la cuenta oficial tiene fijado (o su pregunta/encuesta de los últimos 7 días); si no hay, solo la entrada.
- **Cuenta oficial:** solo pregunta, encuesta y aviso (no recomienda negocios ni sube fotos); programar hasta 30 días; fijar 1, 3 o 7 días
  desde que sale; escribe Admin y Ciudad manager (el moderador puede ocultarla, no escribirla). El sello es el logo de To'Latino.
- **Hoy en buscadores:** sigue `noindex` como todo `/comunidad` (contenido de 24 h); si lo quieres indexado, se cambia.
- **Seed:** no hay semilla de Hoy (se vencería a las 24 h): en el sandbox Hoy sale vacío hasta que un negocio Pro publique.

**Capturas:** `c5e-hoy-publico-m`, `c5e-hoy-historia-3-m`, `c5e-hoy-vacio-m`, `c5e-hoy-publico-d`, `c5e-admin-hoy-d`, `c5e-admin-retirar-d`,
`c5e-panel-retirada-d`, `c5e-admin-oficial-d`, `c5e-muro-oficial-m`, `c5e-muro-oficial-d`, `c5e-hoy-vecino-m`, `c5e-inicio-m`, `c5e-inicio-d`,
`c5e-negocios-m`, `c5e-negocios-d`, `c5e-buscar-invitado-m`, `c5e-buscar-vecinos-m`, `c5e-buscar-vecinos-d`, `c5e-preguntale-m`.

### 5f · Comunidad: puntos, rangos, insignias y Tabla del Barrio (+ reseñas, recomendaciones e invitar) (7 nov)
Míralo en el sandbox (semilla: los 16 vecinos de Hazleton con sus puntos, rangos e insignias del prototipo; el mes en curso y el anterior
de la Tabla son la «sep» y «ago» del prototipo; el anterior ya está cerrado). Teléfono y escritorio.
1. **Tu rango** (`/comunidad/rango`, la pastilla «N · Rango» arriba): número, nombre, puntos («X DE 100 HOY»), «Para {siguiente}» con los
   puntos y la condición (x / n), lo que ya puedes, la escalera (TÚ · POR INVITACIÓN · 3 PLAZAS; lo de El Patio dice «Cuando abra El Patio»),
   cómo se ganan los puntos y sus reglas (en escritorio a la derecha), tus movimientos e insignias.
2. **Puntos de verdad:** con dos cuentas en dos teléfonos, vota + lo de la otra → +2 (comentario +1, recomendación +3). Quita el voto → se
   resta. Marca «Me sirvió» → +10. Una reseña verificada → +15 y la tarjeta dice «+15 PUNTOS» (desde Sargento también el rango:
   «SARGENTO · 23 RESEÑAS»). La primera recomendación de un negocio que junta 3 votos → +50 una vez. Dos cuentas en el mismo teléfono: el
   voto no suma. Con 100 puntos en el día ya no suma nada más ese día.
3. **Subir de rango:** al cruzar 100 puntos con una publicación de 5 votos, «Subiste de rango · Ahora eres Vecino…» en la campana.
4. **Ocultar y apelar:** el equipo oculta algo tuyo → se restan sus puntos (Tus puntos: «Se restó … (oculto por las reglas)»); apelas y otra
   persona lo levanta → vuelve y los puntos también.
5. **Tabla del Barrio** (tercera pestaña): mes en curso / anterior, General · Recomendaciones · Respuestas, «Vas #N con X puntos». En
   escritorio, la columna derecha trae tu rango con su barra y la Tabla del mes (5 primeros).
6. **Perfil:** insignias (Ramón: Fundador, Avisos de la ciudad, Mejor respuesta ×10, Top del mes). Tu perfil: «Tu rango y la Tabla» e
   «Invita vecinos».
7. **Invita vecinos** (Mi cuenta): tu código NOMBRE-N y tu enlace `/i/{código}`; quien entra por él y crea su cuenta sale como «SE UNIÓ».
8. **Sargento Mayor:** en tu recomendación, ··· → «Destacar en Negocios» → sale 7 días en Negocios › Recomendados por vecinos con «DESTACADA»
   (una al mes; el muro no cambia).
9. **Super Admin › Gamification:** Rangos (cuántos hay en cada uno; «Cambiar nombre» ES/EN con vista previa → la Comunidad lo muestra al
   instante), Puntos (tope 50 · 100 · 150 · 200 y cada regla con valor e interruptor), Tabla del Barrio (excluir con motivo → no sale y le
   avisamos; «Cerrar el mes» con sus 4 pasos en el mes anterior congelado). **Usuarios 360° › Comunidad › Puntos y rango:** ajustar ± con
   motivo (Admin hasta 5,000; otros hasta 500), «Cambiar rango» (Coronel o bajar por fraude, solo Admin) y los movimientos.

**Decidí (regla AB; si prefieres otra cosa, se cambia):**
- **General del Barrio = 3 plazas por ciudad**: al cerrar el mes las toman los 3 primeros de la Tabla **que ya son Comandante (8)**; el
  **Coronel sigue siendo Coronel** (lo da el equipo para moderar y no compite por la plaza). La plaza dura hasta el siguiente cierre; quien la
  deja vuelve a su rango. Así cuadra el prototipo (Altagracia ganó agosto y es Coronel; Ramón es General; Carmen quedó tercera y es Capitán).
- **Premio del mes:** insignia «Top del mes» a los 3 primeros y **200 monedas** cada uno (la nota del prototipo; §6 #12 decía 300 · 200 · 100):
  el cierre deja anotadas las monedas (`monthly_boards.prize_coins`) y las acredita el libro de monedas en 5g. Hasta entonces la pantalla no
  promete monedas que no existen: dice que llegan con Mis monedas.
- **Cerrar el mes:** solo un mes que ya terminó (el en curso se congela solo el último día a medianoche); el barrido lo cierra el día 3. El
  prototipo dejaba «Cerrar ahora» el mes en curso: no, porque cortaría el mes de todos.
- **Recomendaciones / Respuestas** de la Tabla: Recomendaciones = «Sumar mi voto» (+3), primera recomendación (+50) y votos en una
  recomendación; Respuestas = «Me sirvió» (+10) y votos en comentarios (+1). General = todo.
- **Condiciones de los rangos** (además de los puntos 0 · 100 · 300 · 800 · 1,500 · 2,300 · 3,500 · 5,000): Vecino = una publicación con 5 votos +;
  Cabo = 5 comentarios con votos +; Sargento = 3 recomendaciones con votos; Sargento Mayor = 4 semanas seguidas con puntos; Teniente = 3
  reseñas verificadas; Capitán = 3 invitados que participan (publican, comentan, piden o reservan); Comandante = sin sanciones en 180 días
  y 200 votos + recibidos. Se sube en orden. El rango que ya tenía cada uno es su piso.
- **Votos y dispositivo:** además de lo de 5b (dos votantes en un teléfono cuentan uno), **una cuenta que alguna vez entró en el teléfono del
  autor no le da puntos** (sí ordena). «Me sirvió» igual.
- **Lo que se quita y vuelve:** el inverso va al mes del punto original (si ese mes no está cerrado baja también en la Tabla; un mes cerrado
  no cambia). Volver a votar después de quitar el voto suma otra vez (nunca más de una vez a la vez) y cuenta para el tope del día.
- **Tope por rol del ajuste:** Admin 5,000; los demás roles que editan Usuarios, 500. Nunca deja los puntos en negativo; nadie ajusta los suyos.
- **Destacar (Sargento Mayor):** solo recomendaciones propias, una por mes de la ciudad, 7 días; en Negocios sale siempre (aunque no esté
  entre los 4 más votados) con «DESTACADA», en el puesto que le dan sus votos.
- **Invitar:** el invitado cuenta si crea su cuenta por el enlace en los 7 días de creada, no comparte teléfono con quien invita y luego
  participa. Sin premios ni dinero (§6 #22).
- **Insignias de El Patio** (campeona, 100 partidas) no se muestran ni se siembran hasta que abra El Patio (G).
- **«Monedas» y «Cupones»** en Gamification llegan con 5g; El Patio después de la apertura; «Rango del negocio» no se construye (§6 #23).
- **e2e:** para probar «Cerrar el mes» desde la pantalla, la prueba reabre con SQL de prueba el mes anterior que la semilla dejó cerrado
  (en la app un mes cerrado no se abre).

**Capturas:** `c5f-rango-m`, `c5f-rango-d`, `c5f-tabla-m`, `c5f-tabla-d`, `c5f-resena-m`, `c5f-perfil-insignias-m`, `c5f-invitar-m`,
`c5f-u360-puntos-d`, `c5f-admin-tabla-d`, `c5f-admin-cerrar-d`, `c5f-admin-renombrar-d`, `c5f-admin-rangos-d`.

### 5g · Comunidad: monedas y cupones de negocios (+ panel del negocio) (7 nov)
Míralo en el sandbox (semilla: los 5 cupones del prototipo ya aprobados — Café Quisqueya 80, Panadería La Espiga 120, Empanadas Doña Tere
150, Barbería El Primo 250, Llantera El Cibao 300 —; cada vecino de prueba con sus 100 de bienvenida; los 3 primeros del mes anterior con
sus 200 del premio). Teléfono y escritorio.
1. **Monedas** (`/comunidad/monedas`; desde «Mis monedas» en Tu rango, «Monedas» en la navegación de escritorio, Mi perfil o la celda
   MONEDAS de Mi cuenta): saldo con **«SIN VALOR EN DINERO»**, cómo se ganan, los cupones de la ciudad (Canjear · Te faltan N · Ver mi código
   · Agotado este mes), la hoja que confirma y el código **TL-CQ-xxxx** con «Muéstralo en el local» y su vencimiento; Tus cupones y Movimientos.
2. **Bienvenida:** quien termina la bienvenida ve «Empiezas como Recluta y con 100 monedas…» y le llega «Te llegaron monedas».
3. **Panel › Tu página › Cupones por monedas** (Rosa, Barbería El Primo): «Validar un código» arriba, Crear (qué das, condiciones, cuántos
   al mes, días; **sin costo**), Por aprobar · En la Comunidad · Pausado · Terminado, Pausar / Reanudar / Terminar, últimos códigos usados.
   Un negocio Free ve el candado.
4. **Super Admin › Gamification › Monedas** (EN CIRCULACIÓN · EMITIDAS ESTE MES · CANJEADAS · VALOR «Sin valor en dinero», reglas, últimos
   movimientos) y **› Cupones** (aprobar con costo, rechazar, cambiar costo, pausar con motivo, activar, últimos canjes); **Usuarios 360° ›
   Comunidad › Monedas** (ajustar ± con motivo).

**Decidí (se cambia si prefieres otra cosa):**
- **Monedas sin valor en dinero** (§6 #3): no se compran, no se venden, no se transfieren, no se cambian por dinero ni por saldo y **no
  vencen**. Se ganan solo con la **bienvenida (+100)** y el **premio del mes (+200 a los 3 primeros)** (§6 #6). El prototipo listaba también
  «+5 por cada 10 puntos», «+10 por volver a El Patio» y «+200 por ganar un torneo»: lo de El Patio queda para después de la apertura (G) y el
  «+5 por cada 10 puntos» **no** se construyó (mezcla los dos libros y premia estar activo); si lo quieres, es una regla más en `coin_rules`.
- **Un cupón es un descuento que el negocio decide dar**; To'Latino no le paga ni le cobra. «Liquidar» al cerrar el mes = **reporte de
  canjes** de la ciudad (§6 #4). El prototipo del admin decía «se le liquida al negocio el lunes»: no se copió (sería dinero).
- **Cupones solo Pro** (§6 #5), máximo **5 activos o por aprobar** por negocio. El negocio elige cuántos al mes (1–500) y los días de
  validez (7 · 15 · 30 · 60 · 90; 30 de fábrica); **el costo lo fija To'Latino** (80–1,000). Aprobado, la oferta (título y condiciones) no
  cambia: para otra, se termina y se crea otro. Cambiar el costo cuenta para los canjes nuevos.
- **Uno por persona:** mientras su código esté vivo o usado. Si el código vence sin usarse, las monedas vuelven y puede volver a canjearlo.
- **Cupo del mes:** cuenta los códigos del mes local de la ciudad que no vencieron; un código vencido libera su lugar.
- **Pausar o terminar** (negocio o equipo): sale de la Comunidad al instante; **los códigos ya canjeados siguen valiendo** hasta que vencen
  (como decía el prototipo). Lo que pausa el equipo solo lo reactiva el equipo; el negocio recibe el aviso con el motivo.
- **Código:** TL-CQ- + 4 signos sin 0/O/1/I (32 signos, bytes aleatorios de la base); si alguna vez choca, crece a 5 y 6. Solo el negocio
  del cupón lo encuentra («No encontramos ese código en tus cupones» para otro negocio, sin decir de quién es). El panel **no muestra los
  códigos emitidos**, solo los usados: así nadie del negocio puede «usar» el código de un vecino sin que lo muestre.
- **Validar:** se escribe (no hay escáner en ningún lado del panel todavía; al LAUNCH-CHECKLIST). Puede validar quien tiene «Tu página» u
  «Hoy y pedidos» (el campo vive en Tu página; en Hoy, al LAUNCH-CHECKLIST).
- **Un negocio no canjea sus propios cupones** (dueño o equipo).
- **Mi cuenta:** la tarjeta de vecino pasa a **RANGO · MONEDAS · RESEÑAS** como el prototipo (RANGO · MONEDAS · WALLET); el Wallet llega con
  su fase; Guardados y Sigues siguen en los accesos y en Guardados.
- **Ajuste de monedas por rol:** Admin hasta 1,000 de una vez; los demás roles que editan Usuarios, 500 (prototipo `coinAdj`: 500).
- **Lo prometido antes de 5g se cumplió:** la migración acreditó la bienvenida de quien ya la había hecho y el premio de los meses ya
  cerrados (una sola vez).
- **e2e:** para «mover el reloj» de un código la prueba apaga un momento el trigger de los canjes (en la app lo emitido no cambia).

**Capturas:** `c5g-bienvenida-m`, `c5g-monedas-m`, `c5g-canje-m`, `c5g-codigo-m`, `c5g-carrera-perdio-m`, `c5g-monedas-d`, `c5g-cuenta-m`,
`c5g-panel-crear-m`, `c5g-panel-cupones-m`, `c5g-panel-validar-m`, `c5g-panel-cupones-d`, `c5g-panel-free-m`, `c5g-admin-cupones-d`,
`c5g-admin-aprobar-d`, `c5g-admin-monedas-d`, `c5g-admin-u360-monedas-d`.

### 5h · Comunidad: «Ver traducción» propia (D3) (7 nov)
Míralo en el sandbox cuando el servicio `traductor` esté arriba (el primer despliegue baja los modelos español ↔ inglés, unos minutos; si
no, «Ver traducción» dice «La traducción no está disponible ahora.» y lo demás sigue igual). Teléfono y escritorio.
1. **Comunidad** (app en español): publica algo en inglés con una cuenta y ábrelo con otra. Bajo el texto: **«Ver traducción»** →
   «Traduciendo…» → la traducción con **«Ver original · Traducción automática del inglés»**. Lo mismo en los comentarios y respuestas en
   inglés. Lo que está en español no trae botón; lo tuyo, nunca.
2. **App en inglés** (botón ES/EN): lo que está en español trae **«See translation»**.
3. **Reseñas** (`/n/{negocio}?tab=rev`): una reseña en inglés y la **respuesta del negocio** en inglés, cada una con su botón.
4. **Novedades** (`/n/{negocio}?tab=nov` › Comentarios): un comentario en inglés.
5. **Editar** una publicación en inglés (primeros 30 min): la traducción se vuelve a hacer con el texto nuevo.
6. **Super Admin › Contenido**: siempre el original (sin botón). **› Auto-moderación › VER TRADUCCIÓN (TRADUCTOR PROPIO)**: si responde y en
   cuánto, y «60 traducciones por hora» con Cambiar (motivo y auditoría).

**Decidí (se cambia si prefieres otra cosa):**
- **Traductor propio = LibreTranslate 1.9.6 autoalojado** con modelos abiertos Argos (§6 #15): el texto nunca sale de nuestros servidores.
  Calidad menor que Claude o DeepL; antes de abrir, comparar 200 textos reales (LAUNCH-CHECKLIST). Un traductor pago es tu decisión.
- **Idioma del texto:** lo detecta el traductor al publicar (español o inglés con confianza ≥ 50 %); si no puede (texto de menos de 12
  letras, otro idioma o el traductor no responde en 1.5 s), el idioma de la app de quien escribe. Lo publicado antes de 5h quedó con el
  idioma de la app (español): no se vuelve a detectar (antes de abrir no hay textos reales; la semilla es de prueba).
- **Solo español ↔ inglés.** Mensajes vecino ↔ vecino **sin** traducción (§6 #15). La cuenta oficial publica con el idioma que elige el equipo.
- **«Traducción automática del inglés»** junto a «Ver original»: el prototipo solo decía «Ver original»; lo agregué para no presentar una
  traducción de máquina como si la hubiera escrito la persona (nada falso).
- **Límite: 60 por persona y hora** (sin cuenta: por teléfono o computadora, cookie del dispositivo), contando cada toque (también lo que
  sale de la caché). Ir y volver entre original y traducción en la misma pantalla no cuenta. El tope se cambia en Auto-moderación.
- **Caídas:** 3 s por traducción; 5 fallas seguidas → la app deja de llamarlo 60 s y luego prueba sola (en la memoria de cada proceso).
  Lo ya traducido sigue saliendo de la caché aunque el traductor esté caído.
- **Lo que no se puede ver no se traduce** (oculto, borrado, bloqueo, Novedades solo para seguidores, respuesta de un negocio que ya no es
  Pro): «Este texto ya no está.»
- **La caché `ugc_translations` es derivada**: se puede tirar y se regenera; por eso es la única tabla que una prueba limpia con `delete`.
- **Infra:** el traductor vive solo en la red `interna` (sin salida a internet, sin puertos); los modelos los baja una vez
  `traductor-modelos` (misma imagen) a un volumen; perfil «traductor» encendido aparte en `deploy.sh` (3g) con `|| true`. Memoria 1.5 GB
  + moderacion-img 768 MB en el cx33 de 8 GB: medir en el sandbox (§6 #24).
- **No probado aquí con el LibreTranslate real:** la imagen v1.9.6 se bajó, pero los modelos (argos-net.com) están bloqueados por la red de
  esta sesión. La e2e `com5h` usa un traductor de mentira **solo de prueba** (fuera del repo) que imita su API. En el sandbox: confirmar
  que `tolatino-traductor` terminó, que Auto-moderación dice RESPONDE y probar 1–6 con textos reales.

**Capturas:** `c5h-ver-m`, `c5h-traducida-m`, `c5h-ingles-d`, `c5h-resenas-d`, `c5h-novedades-m`, `c5h-caido-m`, `c5h-limite-m`, `c5h-admin-d`.

### 5i · Super Admin completo, Configuración, avisos de la Comunidad, analítica y ayuda · FASE 5 COMPLETA (8 nov)
**Qué mirar, paso a paso, toda la Fase 5 en el sandbox** (teléfono 390 y escritorio 1360; capturas `c5a-*` … `c5h-*` y `g5i-*`). Cuentas de
prueba: vecinos Yaritza (5705550299), Héctor (5705550288), Marisol (5705550122); Super Admin Ana (5705550199).
1. **El muro** (`/comunidad`, Yaritza): publica una pregunta, una recomendación y una encuesta (desde Cabo); prueba poner un teléfono (no se
   publica). Abre la publicación: el hilo, votar ±, «Me sirvió» desde quien preguntó, la encuesta con sus %.
2. **Vecinos** (Héctor): sigue a Yaritza, ábrele su perfil, mándale un mensaje (solo a quien te sigue); silencia y bloquea a Marisol con
   Deshacer: ya no se ven en ninguna parte.
3. **Reportar y apelar** (Marisol reporta una publicación): «Ya no lo ves. Lo revisamos en 48 h.» Super Admin › Colas › Reportes: ocultar con
   motivo → la autora recibe el aviso con «Apelar» → apela → otra persona del equipo decide.
4. **Hoy en el barrio** (`/comunidad/hoy`, sin sesión también) y la **cuenta oficial** (Contenido › Cuenta oficial: escribir, programar, fijar).
5. **Rango, puntos y Tabla** (`/comunidad/rango`, `/comunidad/tabla`), **monedas y cupones** (`/comunidad/monedas`: canjear y usar el código en
   el panel del negocio › Tu página › Cupones por monedas), **«Ver traducción»** en algo escrito en inglés (si el traductor está arriba).
6. **Mi cuenta › Avisos › Comunidad (nuevo, 5i):** «Respuestas y votos», «Un resumen al día en vez de cada aviso» (A LAS 7 PM) y «Mensajes
   de vecinos». Con el resumen encendido, los avisos de la Comunidad no salen uno por uno en la campana: llega uno a las 7 PM («Hoy en la
   Comunidad: 2 respuestas y 1 seguidor nuevo.»).
7. **Super Admin › Sistema › Configuración (nuevo):** los valores por sección con su unidad, de fábrica y límites. Cambia «Editar una
   publicación» de 30 a 20 min con un motivo → mira la auditoría (Sistema, abajo): antes → después. Prueba 2 min: «Entre 5 min y 1,440 min.»
   Déjalo otra vez en 30. Las filas SOLO LECTURA dicen por qué todavía no se cambian.
8. **Contenido:** las 7 pestañas; filtros Ciudad, Tipo, Ocultos, Con reporte, 10+ votos, De invitados, Rango del autor; «Ver hilo» desde un
   comentario (queda marcado); **«Ocultar los N reportados»** (escritorio): progreso y, al final, cuáles no se pudieron (la cuenta oficial
   nunca); **«Mover de ciudad»** en una publicación.
9. **Usuarios › Yaritza › Comunidad:** rango, puntos, monedas, votos recibidos y las sub-pestañas; si sale «posible red», «Abrir caso de red de
   cuentas» → Colas › Reportes de usuario. Usuarios › Más filtros › «Con reportes» y «Rango en la Comunidad».
10. **Notificaciones › Solo Comunidad** (el grupo Comunidad y «Tu día en la Comunidad») y **Analítica › Comunidad** (cifras por ciudad, sin
    personas).

**Decidido por seguridad (AB), se cambia si prefieres otra cosa:**
- **Configuración vive en Sistema** (como el prototipo: `secSys` sub «cfg»), solo un Admin cambia. Cada valor: entero, con mínimo y máximo;
  lo rechaza la acción y también la base (trigger). Cada cambio deja antes → después con el motivo. Los límites del día y las traducciones
  también se cambian en Auto-moderación (el mismo valor, la misma auditoría); el tope de puntos en Gamification; el tope del cargo del dealer
  solo en Catálogo (porque baja a los dealers que lo pasan); el umbral de auto-ocultar sigue con su regla en Auto-moderación (se ve en
  Configuración).
- **Plazos de la Fase 4 en SOLO LECTURA:** ya se leen de Configuración (un solo lugar), pero 16 de ellos (2 h del seguro, 30 días del total
  por escrito, 24 h de la ayuda, Noche, inscripciones, visitas…) aparecen escritos en textos que ve la persona; cambiarlos haría falso ese
  texto. Se abren cuando esos textos lean el valor (LAUNCH-CHECKLIST). Editables ya: fotos de ayuda (90 días), licencias que vuelven (14
  días) y el tope del dealer. El corte de las 6 PM de Noche y los 14 días de «Me lo devolvieron» (no existe) quedan fuera.
- **Encuestas:** «lo más que dura» (7 de fábrica); las opciones son 1 · 3 · 7 días hasta ese máximo (y el máximo si no es una de ellas).
- **Editar:** el menú ya no dice «30 minutos»: dice **hasta qué hora** («Puedes editarla hasta las 7:42 PM»), así nunca queda falso.
- **Avisos de la Comunidad:** grupo nuevo `community` (comentarios, respuestas, menciones, «Me sirvió», 10 votos, encuestas cerradas,
  seguidores, rango y top 3 → «Respuestas y votos»; mensajes de vecinos → «Mensajes de vecinos»). Apagado = no llega ni a la campana (no
  tienen SMS). Moderación, apelaciones y monedas siempre llegan. **Resumen diario**: a la hora de Configuración (19 = 7 PM de la ciudad de
  cada persona), una vez al día (la base lo impide dos veces); lo de alguien con quien hay un bloqueo no se cuenta ni se nombra.
- **«Ocultar los N reportados»:** solo escritorio (como el prototipo); cada uno se decide en el servidor (sigue reportado, se ve, no es de la
  cuenta oficial); cierra sus reportes y su caso de Reportes; avisa al autor con Apelar y a quienes reportaron el resultado.
- **Mover de ciudad:** solo lo que no recomienda negocios (una recomendación va con su negocio); se desfija y la ubicación la pone el sistema.
- **Contenido:** novedades, comentarios de novedades y vacantes quedan en Todo con el filtro «Tipo» (el prototipo tiene 7 pestañas).
- **Analítica › Comunidad:** días locales de cada ciudad; «tiempo a la primera respuesta» = promedio, de alguien que no es quien preguntó;
  activos = publicaron, comentaron o votaron en el período; lo de la cuenta oficial no cuenta como publicación de vecinos.
- **El Patio** (decisión G): no se construye. Su puerta se queda como el diseño la deja: en Rangos, los desbloqueos de El Patio dicen «Cuando
  abra El Patio»; en Usuarios 360° › Comunidad la sub-pestaña se llama «Cupones y referidos» (sin El Patio); Gamification sin la subpestaña.

**Preguntas #1–#25 del plan (§6), anotadas:** el default más seguro de cada una, como está en el plan y en las notas de 5a–5h: #1 se compuso
con el prototipo traído al repo (`To'Latino Comunidad.dc.html`) · #2 4 tipos · #3 monedas sin valor en dinero · #4 «liquidar» = reporte de
canjes, ningún pago · #5 cupones solo Pro, To'Latino fija el costo · #6 monedas: bienvenida y premios del mes · #7 el rango solo sube · #8
umbrales 0 · 100 · 300 · 800 · 1,500 · 2,300 · 3,500 · 5,000 · #9 Coronel: sus reportes primero, no oculta solo · #10 General del Barrio =
3 primeros al cierre · #11 destacar 7 días en Negocios, nunca cambia el muro · #12 cierre de la Tabla con 72 h para excluir, premios en
monedas · #13 con cuenta todo, sin cuenta solo Hoy · #14 «Tengo 18 años o más» · #15 LibreTranslate propio · #16 mensajes solo a quien te
sigue, solo texto · #17 solo personas en la Comunidad · #18 editar (30 min, Configuración), borrar = estado, apelar 14 días (Configuración) ·
#19 operativos de inmigración sin fotos de personas, placas ni direcciones · #20 enlaces como texto · #21 límites en Configuración, día local,
la mitad el primer día · #22 referidos sin dinero · #23 rango del negocio no se construye · #24 moderación de imágenes con modelo propio ·
#25 los errores del prototipo no se copiaron. Si prefieres otra cosa en alguna, se cambia.

**Para saber:** el lote de 5i y las pruebas usan datos `[a5i]` que se marcan borrados al terminar; la configuración vuelve a la de fábrica.

**Capturas:** `g5i-config-d`, `g5i-config-fuera-d`, `g5i-config-m`, `g5i-editar-20-m`, `g5i-contenido-d`, `g5i-contenido-m`, `g5i-lote-d`,
`g5i-hilo-d`, `g5i-hilo-m`, `g5i-u360-d`, `g5i-u360-m`, `g5i-analitica-d`, `g5i-analitica-m`, `g5i-notif-d`, `g5i-avisos-m`, `g5i-resumen-m`.

### Fase 6 · Eventos — plan del grupo (9 nov)
Plan en `docs/diseno/plan/fase6-eventos.md` (bloques 6a → 6j, migraciones 0106 → 0115). Se construye con el default de cada decisión (regla
AB); si prefieres otra cosa, se cambia. **Decidí X; si prefieres Y, se cambia:**
1. **Comisión de boletos:** 5 % + $1 (la regla de comisiones que ya existe), sale de lo del organizador; el vecino ve el precio total.
   El diseño de «Publica tu evento» dice 8 % + $0.99 sumado al comprador: manda el panel y el Super Admin.
2. **Cuándo cobra el organizador:** el cobro entra a la plataforma y se transfiere el martes después de cada fecha (así una cancelación
   siempre devuelve el 100 %). Es distinto del resto de la app, donde el negocio cobra directo.
3. **Revisión:** todo evento pasa por revisión (24 h) hasta que el admin marca al organizador como verificado.
4. **Alcohol y hookah:** no se venden como extras (regla de Noche); la mesa con consumo mínimo sí.
5. **Free:** publicar es gratis, pero el módulo Eventos (boletos, mesas, puerta) es Pro con prueba de 30 días.
6. **Cancelar el comprador:** hasta 24 h antes, se devuelve todo menos el cargo de servicio; después solo transferir (hasta 2 h antes).
7. **Avisos:** push y en la app; SMS solo lo crítico (cancelación, cambio de fecha u hora, transferencia, cortesía, lugar de la lista de espera).
8. **Pago:** solo tarjeta (Wallet no existe en el código).
9. **«Evento privado»:** es la solicitud de grupo a un restaurante (propuesta, depósito, cancelar gratis hasta 72 h). Eventos solo con
   invitación no están diseñados y no se construyen.
10. **QR:** fijo, firmado (Ed25519) y con versión; al transferir, el QR viejo deja de valer. El QR que cambia solo va a LAUNCH-CHECKLIST.
11. **Porteros:** con su cuenta de To'Latino + código de invitación del negocio; nunca entran sin cuenta. La puerta **solo escanea (D1)**: no vende.
12. **Código `TOLATINO5` de la plataforma:** no se hace; solo códigos del organizador.
13. **Organizador nuevo:** su primer evento sobre $2,000 se retiene hasta que Confianza lo revisa.
14. **Costo de la tarjeta si el organizador cancela:** lo absorbe To'Latino; si se repite, se abre un caso en Confianza.

**Choques entre fuentes (se siguió PLAN y las decisiones):** puerta sin conexión ahora (PLAN fila 6 y decisión T #23), aunque
`apps-delivery-checkin.md` la dejaba para v1.1; la puerta no vende (D1), aunque ese mismo documento describía «escanear + vender».
Las pantallas de la app Puerta no existen en el prototipo: se componen con piezas del sistema de diseño y se anotan como hueco.
