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
