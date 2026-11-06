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
