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
