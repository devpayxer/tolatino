# Revisión del fundador — lista paso a paso

Decisión AA (6 nov 2026): Claude construye en el sandbox bloque tras bloque y el fundador revisa al final con esta
lista. Cada punto dice **qué mirar, dónde y en qué condiciones**. Sandbox: `pruebas` (se actualiza solo al minuto).
Cuentas de prueba: vecino Marisol (570) 555-0122 · dueño de Sabor Dominicano Pedro (570) 555-0133 · Super Admin Ana
(570) 555-0199. En el sandbox el código de entrada sale en pantalla («MODO PRUEBAS»).

Marca cada punto: ✅ bien · ✏️ cambiar (con lo que quieras) · ❓ duda.

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
4. **Cambiar una reservación ya confirmada.** El prototipo del cliente lo permite («Cambiar reservación» → el cambio queda
   pendiente y la reservación actual sigue en pie), pero el panel del restaurante no tiene diseño para aceptar o
   rechazar ese cambio. Hoy solo se cambia una solicitud que todavía no contestan. ¿Se diseña ese lado o se queda así?
6. **App To’Latino Repartidor** (`/repartidor`, una de las 4 apps de la decisión B). El plan la describe
   (`docs/diseno/plan/apps-delivery-checkin.md`: Inicio en línea/fuera de línea, oferta de pedido, mis pedidos con sus
   pasos, cobro en efectivo, problemas, ganancias, perfil, sin señal), pero **no tiene pantallas** en el diseño ni en el
   sistema de diseño. Del panel faltan por lo mismo «Tus repartidores» (invitar con código), «Despacho» y «Cuadre de
   efectivo». Mientras: el negocio marca «Salió en camino» y «Entregado» en su panel. ¿Se diseñan las pantallas del
   Repartidor (en Claude Design) o las compongo yo con el sistema de diseño y te las muestro antes de conectarlas?
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
   - Sin **Boletos** (llega con Eventos), **Mensajes** y el chat con el negocio (llega con Mensajes), **Pagos y Wallet**
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
