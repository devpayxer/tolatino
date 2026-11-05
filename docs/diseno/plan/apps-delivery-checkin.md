# To' Latino — Apps de Delivery y Check-in de Eventos

Estado: **APROBADO por el usuario**. Decisiones finales: **nunca se pide
licencia** a repartidores (el negocio es responsable del suyo); **no hay
venta en puerta en v1** (CHK-PUERTA queda fuera de v1.0, oculto por flag). Encargo del
usuario: estructurar las dos apps que faltan. Ambas son **solo app** (no
tienen versión desktop); su gestión vive en el Dashboard del negocio y en el
Admin Dashboard (regla maestra "Espejo de gestión").

Nomenclatura: área `DLV` (app de delivery) y `CHK` (app de check-in).

---

# PARTE 1 — App de Delivery (`DLV`)

## 1.0 Modelo de entrega (declarado por el usuario — regla vigente)
- **La mayoría de los negocios latinos tiene repartidores propios** → la app
  de delivery nace para **el repartidor del propio negocio**. Ese es el caso
  principal de la v1.0.
- El negocio también puede elegir **plataformas externas** (DoorDash, Uber
  Eats, etc.) como método de entrega: el pedido se toma en To' Latino y la
  entrega se despacha por la plataforma externa (integración a validar en el
  bloque 5; mientras no exista API, el negocio la marca como "entrega por
  {plataforma}" y registra el seguimiento a mano).
- **Entrega por To' Latino (repartidores propios de la plataforma)** queda
  para **más adelante**, "ya cuando estemos bien". Se diseña la estructura
  desde ahora (misma app, mismo flujo) pero **no se lanza en v1.0**.

**Métodos de entrega que el negocio puede activar en su Dashboard →
Entrega:** Pickup · Mi equipo de repartidores · Plataforma externa (DoorDash /
Uber Eats / otra) · Shipping · *Entrega To' Latino (futuro, oculto por feature
flag hasta que se active por ciudad)*.

## 1.1 Qué es
La app del **repartidor**. Recibe, acepta y entrega pedidos de Tienda, Menú y
Renta (y cualquier módulo futuro que genere entrega). **Dos tipos de
repartidor** en la misma app:
- **Repartidor del negocio** (caso principal, v1.0): lo invita el negocio
  (moderador con área "Entrega"); solo ve pedidos de ese negocio; el negocio
  le asigna manual o automático.
- **Repartidor To' Latino** (futuro): se registra en la plataforma, pasa
  verificación y recibe pedidos de cualquier negocio de su ciudad que haya
  elegido "entrega por To' Latino".
Misma app, mismo flujo de entrega; cambia quién asigna y quién paga.

## 1.2 Onboarding del repartidor (`DLV-ONB`)
1. Idioma → teléfono + OTP (misma cuenta To' Latino; una persona puede ser
   cliente, negocio y repartidor).
2. Tipo: "Reparto para un negocio" (código de invitación) / "Reparto para
   To' Latino".
3. Datos: nombre, foto, vehículo (a pie, bici, moto, auto, camioneta),
   ciudad (Hazleton), zonas que cubre, disponibilidad (días/turnos).
4. Verificación (solo repartidor To' Latino): teléfono, correo, foto de
   perfil real, licencia de conducir si usa vehículo motorizado, aceptación de
   normas. Revisión manual → cola `ADM-COLAS` "Repartidores". *(Nota: la
   licencia es requisito del vehículo, no "papeles" de estatus; se anota como
   duda a confirmar con el usuario.)*
5. Cobros (repartidor To' Latino): cuenta de payout (Stripe Connect) —
   puede empezar recibiendo pedidos con pago en efectivo mientras la conecta.
6. Estado: pendiente / aprobado / rechazado / suspendido.

## 1.3 Estructura de la app (nav inferior: Inicio · Pedidos · Ganancias · Perfil)

**DLV-HOME · Inicio (estado del turno)**
- Interruptor **En línea / Fuera de línea** grande.
- Mapa con su posición, zonas activas, negocios con pedidos listos.
- Resumen del día: entregas, ganancias, propinas, tiempo en línea.
- Avisos: pedidos ofrecidos (tarjeta con cuenta regresiva), alertas del
  negocio o del admin.

**DLV-OFERTA · Oferta de pedido** (pantalla completa, con tiempo para aceptar)
- Negocio, distancia al negocio, distancia al cliente, pago estimado +
  propina, tipo de ítems (comida caliente, frágil, renta voluminosa), forma
  de pago del cliente (pagado / **cobrar en efectivo al entregar** con monto).
- Aceptar / Rechazar (con motivo opcional). Si vence, pasa al siguiente.

**DLV-PEDIDOS · Mis pedidos** (trío canónico: lista → detalle → acción)
- Pestañas: Activos · Programados · Historial.
- Detalle del pedido: ítems (solo lo necesario para verificar), notas,
  contacto del cliente (llamar/mensaje **enmascarado**), dirección con
  referencias, mapa y navegación (abre Maps/Waze), estado.
- **Timeline de estados** (botón grande para avanzar, uno a la vez):
  Aceptado → Llegué al negocio → Recogí (confirmación: código del negocio o
  foto) → En camino → Llegué → Entregado (confirmación: foto / código del
  cliente / firma / "entregado en mano") → cerrado.
- **Cobro en efectivo**: pantalla de monto exacto, cambio, "cobrado", y el
  cierre contable con el negocio (regla: sin comisión de plataforma en
  efectivo; la app solo registra).
- **Problemas** (hoja): cliente no responde (timer + intentos registrados),
  dirección incorrecta, negocio demorado, pedido incompleto, accidente,
  cancelar (con motivo; penalizaciones según reglas).
- Entregas **múltiples** (batch) cuando dos pedidos van en la misma ruta.
- **Renta**: variante con dos viajes (entrega y recogida), checklist de
  artículos y estado (bueno / dañado) con fotos en ambos.

**DLV-PROGRAMADOS** — pedidos con hora futura; recordatorio previo.

**DLV-GANANCIAS · Ganancias**
- Por día / semana; desglose: tarifa base, distancia, propinas, bonos,
  ajustes; efectivo cobrado vs. a liquidar; payouts y su estado; recibos.
- Para repartidor del negocio: solo registro de entregas (el negocio paga
  fuera de la app, o dentro si lo configura).

**DLV-PERFIL · Perfil**
- Datos, vehículo, zonas, disponibilidad, documentos y estado de verificación,
  calificación recibida (de clientes y negocios), nivel (gamification del
  repartidor: puntualidad, aceptación, calificación), notificaciones,
  idioma, soporte, normas, cerrar turno / cerrar sesión.

**Transversal**
- Modo **manos libres**: botones enormes, alto contraste, sonidos y
  vibración; funciona con pantalla bloqueada mostrando el siguiente paso.
- **Sin señal**: los cambios de estado se guardan y se sincronizan.
- **Ubicación en vivo** compartida con el cliente y el negocio solo durante
  el pedido.
- **Seguridad**: botón de emergencia, compartir viaje, contacto enmascarado.

## 1.4 Lado del cliente (ya en la plataforma; se completa)
- Estado del pedido con **mapa en vivo** del repartidor, ETA, foto de entrega,
  código de confirmación, propina antes y después, calificar al repartidor,
  reportar problema.

## 1.5 Espejo de gestión (obligatorio)
**Dashboard del negocio (`DASH`) — sección Entrega, se amplía con:**
- Quién entrega: **mi equipo** / **plataforma externa (DoorDash, Uber Eats…)**
  / **To' Latino (futuro)**; combinable por horario, zona o tipo de ítem.
- **Plataforma externa**: elegir proveedor, referencia/tracking del envío,
  costo que se cobra al cliente, estado sincronizado (si hay API) o manual.
- **Mis repartidores**: invitar (código), lista, estado, activos ahora,
  historial, calificación, quitar.
- **Despacho**: pedidos listos para salir, asignar manual o automático,
  seguimiento en mapa, código de recogida, incidencias.
- Tarifas de entrega que cobra al cliente y lo que paga a su repartidor.
- **Cuadre de efectivo** por repartidor y día.
- Métricas: tiempo de entrega, tasa de problemas, calificación.

**Admin Dashboard (`ADM`) — nueva sección `ADM-DLV` + colas:**
- Cola **Repartidores** (verificación), cola **Incidencias de entrega**.
- Repartidores: listado, detalle 360° (entregas, calificación, ganancias,
  documentos, sanciones), aprobar / suspender / banear.
- Pedidos en curso por ciudad (mapa en vivo), asignación forzada,
  cancelación con reembolso.
- Tarifas de plataforma: base, por milla, por espera, bonos por hora pico,
  comisión de entrega, propina mínima, zonas y recargos por ciudad.
- Reglas: tiempo para aceptar, penalizaciones por cancelación, límites de
  pedidos simultáneos, radio máximo.
- Cuadre de efectivo global, payouts a repartidores, disputas de entrega.
- Feature flag: "Entrega To' Latino" activa por ciudad.

**Dashboard del usuario (`USR`):**
- En cada orden: repartidor, mapa, foto de entrega, propina, calificación,
  reportar.

---

# PARTE 2 — App de Check-in de Eventos (`CHK`)

## 2.1 Qué es
La app **de la puerta**. La usa el **portero** (rol de acceso limitado a un
evento, creado como moderador por área desde el dashboard del negocio) para
validar boletos, RSVPs y add-ons, controlar aforo y registrar entradas. No
vende boletos (eso está en la plataforma), salvo **venta en puerta** si el
negocio la habilita.

## 2.2 Acceso (`CHK-ONB`)
1. Idioma → teléfono + OTP (misma cuenta To' Latino) **o** código de portero
   de un solo uso que el negocio genera por evento (para porteros sin
   cuenta).
2. Lista de **eventos asignados** (hoy y próximos); elige uno.
3. **Descarga del evento** para trabajar sin conexión: lista de boletos,
   RSVPs, add-ons, mapa de mesas, reglas.
4. Sesión de puerta: nombre de la puerta (Principal, VIP, Terraza), hora de
   apertura.

## 2.3 Estructura de la app (una sola tarea, cero menús profundos)

**CHK-SCAN · Escanear (pantalla principal)**
- Cámara a pantalla completa, linterna, escaneo continuo.
- Resultado grande y sonoro en < 1 s:
  - **Verde — Válido**: nombre, tipo de boleto, add-ons (mesa 12, paquete de
    bebidas), edad mínima si aplica → botón "Entró" (o auto).
  - **Amarillo — Revisar**: boleto válido pero con condición (add-on
    pendiente de pago, requiere ID por edad, boleto transferido).
  - **Rojo — Rechazado**: ya usado (hora y puerta donde entró), anulado,
    reembolsado, de otro evento/fecha, falso.
- Entrada de **grupo**: un QR con N personas; contador de cuántos entran ahora.
- **Salida y reingreso** (si el evento lo permite): escaneo de salida.

**CHK-BUSCAR · Buscar** — por nombre, teléfono, correo, últimos 4 del código;
lista de coincidencias; marcar entrada manual con motivo (no trajo QR).

**CHK-LISTA · Lista de invitados** — todos los asistentes, filtros (tipo,
entró / no entró, con mesa, cortesías, RSVP), check manual, notas.

**CHK-AFORO · Aforo en vivo** — dentro / capacidad, por tipo de boleto y por
puerta, curva de entradas por hora, alerta al 90% y al 100%, entradas
esperadas restantes.

**CHK-MESAS · Mesas y add-ons** (si el evento los tiene) — mapa/zonas, mesa
ocupada / libre / reservada, quién la tiene, mínimo de consumo, marcar
llegada de la mesa, add-ons entregados (pulsera, paquete).

**CHK-PUERTA · Venta en puerta** (si el negocio la habilita) — tipos de
boleto disponibles y precio en puerta, cobro con tarjeta (lector / tap) o
efectivo con registro, emisión de boleto instantáneo (QR en pantalla o
pulsera), cupo compartido con la venta en línea.

**CHK-INCID · Incidencias** — rechazado insiste, boleto duplicado (dos
personas con el mismo QR), menor de edad, problema de seguridad, reembolso
solicitado en puerta → nota, foto opcional, aviso al organizador.

**CHK-EQUIPO · Puertas y porteros** — quién está activo, en qué puerta,
entradas por portero, chat rápido interno ("cerramos VIP").

**CHK-CIERRE · Cierre del evento** — resumen: vendidos, entraron, no
asistieron, cortesías, venta en puerta, efectivo recaudado, incidencias;
sincronizar y cerrar sesión de puerta; exportar.

**Transversal**
- **Sin conexión**: validación local con la lista descargada; cada entrada
  se marca con hora y dispositivo; al reconectar, sincroniza y **resuelve
  conflictos** (mismo boleto entrado en dos puertas → alerta de duplicado).
- **Varios porteros a la vez**: sincronización en tiempo real cuando hay
  señal; "ya entró por Puerta VIP a las 10:42".
- Modo **oscuro y alto contraste** por defecto (la puerta es de noche).
- Bloqueo del dispositivo del portero a la app (kiosco) si el negocio lo
  quiere.
- Permisos: el portero solo ve ese evento y esa noche; nada del negocio.

## 2.4 Lado del cliente (ya en la plataforma; se completa)
- Boleto con QR en brillo máximo, agregar a wallet, transferir (si se
  permite), ver mesa/add-ons, "cómo llegar", estado (válido / usado / anulado).

## 2.5 Espejo de gestión (obligatorio)
**Dashboard del negocio (`DASH`) — sección Eventos, se amplía con:**
- **Porteros**: crear por evento (por cuenta o por código de un solo uso),
  puertas, permisos (solo escanear / escanear + vender / supervisor), revocar.
- **Reglas de puerta**: reingreso, edad mínima, venta en puerta y precios,
  hora de cierre de puerta, aforo por puerta, requerir ID por edad.
- **Monitor en vivo** del evento: aforo, entradas por minuto, por puerta,
  por portero, incidencias, mesas.
- **Cierre y reporte** post-evento; cuadre de efectivo de venta en puerta.
- Auditoría de check-ins (quién escaneó qué y cuándo).

**Admin Dashboard (`ADM`) — sección `ADM-EVT`, se amplía con:**
- Auditoría de check-ins por evento, detección de duplicados y reventa,
  sesiones de portero, eventos con sobreventa, reglas globales (máximo de
  porteros, tiempo de sesión, retención de listas descargadas), venta en
  puerta habilitada por ciudad, incidencias escaladas.

**Dashboard del usuario (`USR`):**
- Boleto: estado de uso (hora de entrada), transferencias, recibo.

---

# PARTE 3 — Arquitectura de apps (declarada por el usuario, ordenada)

| Producto | App | Desktop |
|---|---|---|
| Plataforma (cliente): Community, Negocios, Eventos + Dashboard del usuario | **Sí** (app principal) | **Sí** |
| Dashboard del negocio | **Sí** (app de negocios) | **Sí** |
| Admin Dashboard | — (móvil web) | **Sí** |
| Delivery | **Sí, solo app** | — |
| Check-in de eventos | **Sí, solo app** | — |

Reglas:
- **Una sola cuenta To' Latino** entra a todas las apps; el rol define qué ve.
- Las cinco comparten el **mismo sistema de diseño y los mismos patrones
  canónicos**; cambian el contenido y la tarea, no el lenguaje visual.
- El **Dashboard del usuario** vive dentro de la app principal (no es app
  aparte).
- Faseo aprobado en la revisión: el diseño se hace completo; el lanzamiento
  de "Entrega To' Latino" y del check-in sin conexión puede ir en v1.1, pero
  la **estructura de ambas apps se diseña desde ahora** (encargo del usuario).

---

# Dudas para el formulario final
- Licencia de conducir para repartidores To' Latino con vehículo motorizado:
  ¿se pide (requisito del vehículo) o se evita por la regla de no pedir papeles?
- ¿El repartidor del negocio cobra dentro de la app (el negocio le paga vía
  plataforma) o solo se registra la entrega?
- Venta en puerta: ¿con lector de tarjeta físico, solo tap-to-pay del
  teléfono, o solo efectivo en v1?
