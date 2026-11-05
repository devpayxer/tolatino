# To'Latino · Solo del prototipo (E3)

> Se genera de `entrega/solo-prototipo.json` (`_tmp/solo-prototipo-md.js`); no se edita a mano. Vista para revisar: `To'Latino Solo del prototipo.dc.html`. 23 oct 2026.

El prototipo es la especificación, pero trae piezas que solo sirven para moverlo: barras de revisión, respuestas que llegan solas, un reloj que no corre y servicios imitados. Aquí está cada una, dónde vive y qué pasa en la app. Se explica una sola vez; ninguna se diseña ni se construye tal cual.

60 piezas en 5 grupos. Cada una dice dónde vive en el prototipo, qué hace en la demo y qué pasa en la app.

## Cómo leer el prototipo

1. **Lo marcado no se construye.** Lo que lleva `data-proto` en el código, y lo que tiene dentro, no pasa a la app: las barras de revisión y las pantallas de encargo.
2. **Nada avanza solo.** Cada cambio de estado lo hace una persona (vecino, negocio, repartidor, equipo) o un plazo del servidor. La demo los adelanta sola o con un botón de la barra.
3. **La hora corre.** La demo vive siempre el jueves 24 sep 2026 a las 12:30 PM. En la app, abierto, cerrado y cada plazo se calculan con la hora de la ciudad.
4. **Lo de ejemplo no se migra.** Negocios, personas, fotos y transacciones de ejemplo existen para ver las pantallas llenas. La app empieza con datos reales.
5. **Lo del teléfono es del teléfono.** Las hojas de llamar, mapas, calendario y compartir, la ubicación, el dictado y los avisos son del sistema o de un proveedor.

## 1. Barras y botones para revisar

Solo existen para mover la demo. No se diseñan ni se construyen.

### Barra del prototipo · `data-proto="barra"`

- **Dónde:** `To'Latino Prototipo.dc.html` · arriba del teléfono
- **En la demo:** Muestra la ruta en pantalla y cambia Móvil/Desktop y el ancho (1440 · 1280 · 1024). Según la pantalla trae CUENTA, PRUEBA PRO, RANGO, RESPUESTA y el botón de simulación. Lleva a Inicio, Panel negocio, Admin y Cola.
- **En la app:** No existe. El vecino entra por la app o la web, el negocio por su panel y el equipo por el Super Admin, cada uno con su cuenta.

### Barra de revisión del panel · `data-proto="barra"`

- **Dónde:** `To'Latino Panel negocio v2.dc.html` suelto · «Revisión · controles»
- **En la demo:** Móvil/Desktop, ancho, ES/EN, Dueño/Moderador, negocio de ejemplo (Sabor Dominicano, Barbería El Primo, Empanadas Doña Luz y uno por categoría) y día de la prueba Pro.
- **En la app:** El negocio y el rol salen de la cuenta: el dueño ve sus negocios y el moderador solo sus áreas. El idioma sale de Ajustes.

### Barra de revisión del Super Admin · `data-proto="barra"`

- **Dónde:** `To'Latino Super Admin.dc.html` suelto · «Revisión · controles»
- **En la demo:** Móvil/Desktop, ancho, ES/EN, rol (7) y ciudad.
- **En la app:** El rol sale de la cuenta del equipo. La ciudad sí es del producto: vive en la barra del admin (2ap).

### RESPUESTA

- **Dónde:** Barra del prototipo · estado `scen` del Prototipo; lo leen `prototype/neg-*-flow.js`, `neg-*-rev.js`, `neg-*-pre.js`, `neg-hogar-mas.js`, `neg-bell-book.js`, `neg-cita-help.js` y `evp-flow.js`
- **En la demo:** Decide cómo responde el negocio. La barra trae «Responder en el panel» (abre el panel en Hoy para contestar tú como el negocio) y «Tarjeta rechazada» (el próximo pago falla). Los motores entienden además `ok`, `cambio`, `rechaza` y `nada`.
- **En la app:** No existe. Responde el negocio desde su panel: Confirmar, Otra hora o No puedo. Si no responde a tiempo, la solicitud vence sola. La tarjeta la acepta o la rechaza Stripe.

### Botón de simulación

- **Dónde:** Barra del prototipo · `ctSim`; cada motor tiene su `sim()`
- **En la demo:** Adelanta lo que en la vida real hace otra persona o el reloj: «El negocio responde», «Pasan 24 h», «To'Latino decide», «Pasó la cita», «Lo pesaron»…
- **En la app:** No existe. Cada paso lo dispara quien corresponde: ver «Lo que hace otra persona» y «Lo que hace el reloj».

### CUENTA · Con historial / Cuenta nueva

- **Dónde:** Barra del prototipo en Mi cuenta · `usrDemo`
- **En la demo:** Cambia Mi cuenta entre una cuenta con historial y una recién creada.
- **En la app:** No existe. Cada cuenta muestra lo suyo; la cuenta nueva es el estado vacío de cada sección.

### PRUEBA PRO · día de la prueba

- **Dónde:** Barra del prototipo en el panel y barra del panel · `TLTrial.setDay` (`prototype/pro-trial.js`)
- **En la demo:** Pone al negocio en el día 0, 20, 25 o 29 de su prueba, o en el día en que terminó.
- **En la app:** El día sale de la fecha en que empezó. Un proceso diario manda los avisos de los días 20, 25 y 29 y, el día 30, pasa el negocio a Free o hace el primer cobro.

### RANGO en El Patio

- **Dónde:** Barra del prototipo en `APP-PATIO-*` · `patioOpts`
- **En la demo:** Cambia tu rango para probar la mesa privada, que se abre en Teniente.
- **En la app:** El rango sale de los puntos de la cuenta.

### Encargo y Cola · `data-proto="encargo"` · `data-proto="cola"`

- **Dónde:** Prototipo · `PROTO-ENCARGO` y `PROTO-COLA` (móvil y desktop) · función `encargo()`
- **En la demo:** Pantalla de «aún no construido» y su lista de trabajo (regla del plan). Hoy solo aparece si un script no cargó.
- **En la app:** No existe. Toda ruta de V1 está construida.

### Marco del teléfono

- **Dónde:** Prototipo · vista móvil (393 × 852, barra 9:41 · 5G)
- **En la demo:** Dibuja el teléfono alrededor de la app.
- **En la app:** Es el teléfono. La app respeta el área segura del sistema.

### «Entrar como»

- **Dónde:** Super Admin · Sistema · Equipo
- **En la demo:** Cambia de persona del equipo para ver el admin con otro rol.
- **En la app:** No existe. Cada persona entra con su cuenta y su rol; los permisos se revisan en la matriz (2am).

### EN VIVO · «En vivo (del prototipo)»

- **Dónde:** Super Admin · Colas, Usuarios y Transacciones · `liveItems`, `liveU`, uid `live`
- **En la demo:** Separa lo que hiciste en esta sesión del prototipo de los ejemplos fijos.
- **En la app:** No existe. Todo es en vivo: sin filtro ni etiqueta.

### Galería de estados

- **Dónde:** Super Admin · Sistema · Estados
- **En la demo:** Pone juntos los 9 estados de pantalla del plan (§4) para revisarlos.
- **En la app:** No es una pantalla. Cada estado sale donde ocurre.

### Avisos para quien revisa

- **Dónde:** Super Admin · «Abre el Super Admin desde el Prototipo…», «Herramienta del prototipo…», «· respuesta de ejemplo»
- **En la demo:** Explican la demo dentro de la pantalla.
- **En la app:** No existen.

### Asas de revisión

- **Dónde:** `window.__tlProto`, `__d2`, `__admInst`, `__tlCom`, `__tlUsr`
- **En la demo:** Dejan mover la demo desde la consola.
- **En la app:** No existen.

## 2. Lo que hace otra persona

En la demo pasa solo a los pocos segundos o con el botón de simulación. En la app lo hace una persona desde su lado, y a quien espera le llega el aviso.

### El negocio responde una solicitud

- **Dónde:** `prototype/neg-*-flow.js` (`respond`, 3–3.5 s) · `neg-bell-book.js` (`TLBook.reply`) · Prototipo (reservaciones) · `evp-flow.js` (evento privado, 4 s)
- **En la demo:** Citas, reservaciones, visitas, consultas, fechas, apartados, pedidos de mercado, viajes y clases se confirman solos. Botón: «El negocio responde» (o el taller, el mercado, el local, el consultorio, la oficina, la tienda).
- **En la app:** El negocio contesta en su panel (Hoy · Esperan tu respuesta): Confirmar, Otra hora, No puedo o la propuesta de su categoría. Solo se confirma sola si el profesional activó «Aprobar citas al instante» (D4).

### Pre-estimados y presupuestos

- **Dónde:** `neg-auto-pre.js` y `neg-hogar-pre.js` (4 s) · `neg-hogar-mas.js` (presupuestos, 3.5 s)
- **En la demo:** El taller o el negocio manda su precio solo. Botones: «El taller responde», «Responde otro negocio».
- **En la app:** Cada negocio manda su precio desde su panel.

### Emergencia de Hogar

- **Dónde:** `neg-hogar-mas.js` (3.5 s)
- **En la demo:** Alguien la acepta solo. Botón: «Alguien acepta».
- **En la app:** La acepta, desde su panel, el primero de los negocios cercanos que la recibió.

### Ayuda con un pedido o una cita

- **Dónde:** `neg-*-rev.js` y `neg-cita-help.js` (4 s) · Prototipo (ayuda del pedido de comida)
- **En la demo:** El negocio responde solo. Botón: «El negocio responde».
- **En la app:** El negocio tiene 24 h para responder desde su panel. Si no responde, pasa a To'Latino.

### To'Latino decide

- **Dónde:** `neg-*-rev.js` y `neg-cita-help.js`
- **En la demo:** Botón: «To'Latino decide» o «To'Latino responde»; devuelve un monto de ejemplo.
- **En la app:** El equipo lo resuelve en Super Admin · Colas en 48 h, y la devolución sale por Stripe.

### Avanza el pedido de comida

- **Dónde:** Prototipo · `startTrack`
- **En la demo:** El seguimiento avanza solo, paso por paso.
- **En la app:** El negocio marca cada paso en su panel y el repartidor marca los suyos en su app (`plan/apps-delivery-checkin.md`).

### Pasos del servicio

- **Dónde:** `neg-merc-flow.js`, `neg-tienda-flow.js`, `neg-trans-flow.js`, `neg-hogar-plan.js`, `neg-salud-flow.js`, `neg-pro-flow.js`, `neg-fiesta-flow.js`, `neg-noche-flow.js`, `neg-bell-book.js`
- **En la demo:** Botones: «Lo pesaron», «Llegó», «Lo recogí», «Salió», «La recogiste», «La devolviste», «Pasa una visita», «Pasó la cita», «Pasó la fiesta», «Pasó la noche», «Pasó la consulta», «Terminó el trámite».
- **En la app:** Lo marca el negocio en su panel (o el chofer en su app) cuando pasa: pesa y confirma el precio, entrega, sale, recibe, termina. Al terminar se abre la reseña.

### Respuesta a tu reseña

- **Dónde:** Prototipo · `_rvT`
- **En la demo:** El negocio responde solo a los pocos segundos.
- **En la app:** El negocio responde en Panel · Reseñas. Si pide revisarla, decide el equipo en Super Admin · Contenido.

### Postulación a una vacante

- **Dónde:** Prototipo · `replyJob`
- **En la demo:** La postulación avanza sola.
- **En la app:** El negocio la mueve en Panel · Vacantes.

### Lista de espera de mesa

- **Dónde:** Prototipo · `rsvWait` (8 s)
- **En la demo:** Se libera una mesa sola.
- **En la app:** Cuando el negocio libera una mesa en su panel, se le ofrece al primero de la lista.

### Mensajes con el negocio

- **Dónde:** Mi cuenta · `REPLY` (1.8 s)
- **En la demo:** El negocio contesta solo.
- **En la app:** El negocio contesta desde Panel · Mensajes.

### Soporte

- **Dónde:** `prototype/sop-store.js` · `pick` (5 s)
- **En la demo:** Dayana contesta sola con una respuesta de ejemplo.
- **En la app:** Contesta el equipo en Super Admin · Soporte.

### Comunidad

- **Dónde:** Comunidad · `simulate()`
- **En la demo:** Botón: «Los vecinos responden» o «Te contestan».
- **En la app:** Votos, comentarios y respuestas de otras personas.

### Invitados a una mesa privada

- **Dónde:** Comunidad (unos 2.4 s)
- **En la demo:** Los invitados aceptan solos.
- **En la app:** Cada invitado acepta desde su teléfono.

### Los otros jugadores de El Patio

- **Dónde:** Comunidad y `prototype/patio-parchis.js` · `bot` (0.85 s parchís, 0.95 s dominó)
- **En la demo:** Los vecinos de la mesa juegan solos y se adelantan cuando vuelves.
- **En la app:** Juegan personas, cada una en su turno, y la partida vive en el servidor. Mesa pública: se espera hasta 60 s a que lleguen vecinos y los lugares que falten los juega «La computadora» (D6). Mesa privada: los de quien no aceptó.

### Llegan vecinos a la mesa pública

- **Dónde:** Comunidad · `waitStart` (a los 5 y a los 17 s)
- **En la demo:** Mientras esperas, se sientan dos vecinos de ejemplo. En dominó y en parchís de 4 queda un lugar vacío; en parchís de 2 o 3 la mesa se llena y empieza.
- **En la app:** Se sientan personas que buscan mesa en ese momento.

### Tu equipo acepta la invitación

- **Dónde:** Publica tu negocio (3.5 s)
- **En la demo:** Las personas que invitas aceptan solas.
- **En la app:** Cada persona acepta la invitación desde su teléfono.

### Stripe activa los cobros

- **Dónde:** Panel · Cobros y plan (4 s)
- **En la demo:** Los cobros con tarjeta se activan solos.
- **En la app:** Stripe revisa la cuenta del negocio y avisa cuando ya puede cobrar.

### Decisión sobre un reclamo

- **Dónde:** Recuperar negocio (pregunta cada 5 s)
- **En la demo:** La pantalla pregunta cada 5 s si el equipo ya decidió en el Super Admin.
- **En la app:** El aviso llega en el momento en que el equipo decide.

## 3. Lo que hace el reloj

En la demo la hora no corre. En la app, un proceso del servidor vence cada plazo, mueve el dinero y avisa.

### Hora fija

- **Dónde:** `NOW` y `TODAY` en los datos (`neg-food.js`, `com-data.js`, motores de cada categoría)
- **En la demo:** Hoy es siempre jueves 24 sep 2026, 12:30 PM. Barbería El Primo está en el día 25 de su prueba Pro (empezó el 30 ago).
- **En la app:** La hora de la ciudad. Abierto, cerrado y cada plazo se calculan con ella.

### Plazos sin respuesta

- **Dónde:** Motores de cada categoría · `scen` = `nada`
- **En la demo:** Botones: «Pasan 24 h» (ayudas, pre-estimados, fiestas), «Pasan 48 h» (apartados de Tiendas, presupuestos de Hogar), «Pasan 10 min» (Mercados), «Pasan 15 min» (emergencia de Hogar), «Pasa 1 hora» (Vida Nocturna), «Pasa el tiempo» (Salud, Servicios Profesionales, Transporte).
- **En la app:** Al vencer: SIN RESPUESTA, se libera lo retenido y se le ofrecen otras opciones al vecino. La ayuda sin respuesta en 24 h pasa a To'Latino.

### Boletos apartados

- **Dónde:** Eventos · pago (8 min)
- **En la demo:** El apartado de 8 minutos cuenta en el navegador.
- **En la app:** Lo lleva el servidor: los boletos se sueltan al vencer, aunque el vecino cierre la app.

### Espera de la mesa pública

- **Dónde:** Comunidad · `waitV` (`APP-PATIO-ESPERA`) · Super Admin › Gamificación › El Patio (`gam.patio.wait`)
- **En la demo:** La cuenta regresiva de 60 s corre en el navegador. Botón: «Pasa la espera».
- **En la app:** Lo lleva el servidor: al vencer, La computadora entra en los lugares vacíos y empieza la partida, aunque el vecino haya cerrado la app (D6).

### Día del evento

- **Dónde:** Eventos · tu orden · `advance()`
- **En la demo:** Botón: «Pasa el tiempo» lleva la orden hasta el día del evento y después.
- **En la app:** La orden avanza con la fecha del evento y con el escaneo del boleto en la puerta.

## 4. Funciones del teléfono y servicios de afuera

El prototipo los imita para que el recorrido no se corte. En la app son del sistema o de un proveedor.

### Llamar, Cómo llegar, Calendario y Compartir

- **Dónde:** `To'Latino Teléfono.dc.html` y `prototype/biz-contact.js`
- **En la demo:** En móvil dibuja la hoja del sistema (iPhone o Android).
- **En la app:** Hojas del sistema: marcar, la app de mapas que elija el vecino, el calendario y compartir. En desktop, la ventana To'Latino con enlaces reales sí es del producto.

### Número temporal del repartidor

- **Dónde:** `prototype/biz-contact.js` (Miguel Reyes)
- **En la demo:** Un número fijo.
- **En la app:** Número enmascarado (Twilio) que dura `drvMask` minutos después de entregar.

### Entrar con tu teléfono

- **Dónde:** Prototipo · AuthSheet (2m)
- **En la demo:** Cualquier código de 6 números sirve y siempre entras como Ana Rodríguez.
- **En la app:** Código por SMS (Twilio Verify) y la cuenta de esa persona.

### Otros códigos

- **Dónde:** Publica tu negocio (correo) · Recuperar negocio (llamada) · Super Admin (entrar)
- **En la demo:** Aceptan cualquier código de 6 números.
- **En la app:** Códigos reales por correo, llamada o SMS, con vencimiento y límite de intentos.

### Pagos

- **Dónde:** `prototype/pay-methods.js` (Visa ·· 4242, Mastercard ·· 8812) · RESPUESTA «Tarjeta rechazada»
- **En la demo:** No se cobra nada. El dinero pasa por Retenido, Cobrado, Liberado y Devuelto según la operación.
- **En la app:** Stripe: retener (captura manual), cobrar (captura), liberar (se cancela la retención) y devolver (reembolso). Los pagos al negocio van por Connect.

### Avisos

- **Dónde:** Plantillas en Super Admin · Notificaciones
- **En la demo:** Se ven dentro de la app (Mi cuenta · Avisos, el panel); no se envían.
- **En la app:** Push, SMS y correo con esas plantillas, en español o inglés según la cuenta.

### Ubicación

- **Dónde:** Ciudad (1.3 s)
- **En la demo:** «Usar mi ubicación» siempre te pone en Hazleton.
- **En la app:** Permiso de ubicación del teléfono o del navegador, y la ciudad abierta más cercana.

### Búsqueda por voz

- **Dónde:** Buscar (1.9 s)
- **En la demo:** «Oye» una frase de ejemplo.
- **En la app:** Dictado del sistema en español o inglés.

### Traducciones

- **Dónde:** `prototype/ugc-lang.js` (`TLLang`)
- **En la demo:** La traducción viene escrita en los datos de ejemplo (es y en) y 1 de cada 6 textos se escribió en inglés. Donde el dato trae un solo idioma, como lo que escribes tú o las reseñas del panel, no aparece «Ver traducción».
- **En la app:** Un servicio de traducción la hace la primera vez que alguien toca «Ver traducción» y se guarda con el texto (D3).

### Importar tu negocio

- **Dónde:** Publica tu negocio · `TLOnbNeg.IMPORT` (`prototype/onb-neg-data.js`, 1.1 s)
- **En la demo:** Google Maps, Instagram o Facebook devuelven siempre el mismo negocio de ejemplo (Pica Pollo Doña Mery).
- **En la app:** Se leen los datos públicos del enlace (Google Places para Maps) y el dueño revisa cada campo antes de publicar.

### Mapas

- **Dónde:** Mapa, Ciudad e Inicio · `miniMap`
- **En la demo:** Teselas públicas de ArcGIS.
- **En la app:** El servicio de mapas que se elija para la app y la web.

### Fotos

- **Dónde:** Pexels (`ph` = número) · fotos que subes (dataURL)
- **En la demo:** Las de ejemplo son números de Pexels; las que subes se guardan dentro del navegador.
- **En la app:** Se suben a un almacenamiento y se guarda su URL (Media en el modelo). Las de ejemplo no se migran.

### Recibo en PDF

- **Dónde:** `prototype/receipt-pdf.js`
- **En la demo:** El PDF se arma en el navegador.
- **En la app:** El mismo recibo lo genera el servidor, para descargarlo y para el correo.

### El Compa · la IA

- **Dónde:** `prototype/compa.js` (`window.claude.complete`) · `To'Latino Compa.dc.html`
- **En la demo:** Llama a Claude desde el navegador con las reglas, la ayuda y los datos de la sesión en el texto. Si no hay IA, contesta con reglas fijas (fallback). La respuesta automática «si no contestas en 10 min» espera 6 s.
- **En la app:** La IA corre en el servidor: reglas fijas que no se apagan, solo los datos de esa cuenta, tapa tarjeta, contraseñas y SSN antes de guardar, y registra cada respuesta (CompaConversation). WhatsApp y SMS por el proveedor de mensajes; las acciones se confirman con enlace a la app.

## 5. Datos y carga

El detalle de cada dato está en el Modelo de datos (E2).

### Todo se guarda en el navegador

- **Dónde:** `localStorage` `tl-*` (Modelo de datos · Dónde vive hoy)
- **En la demo:** Cada pantalla guarda lo suyo en el navegador.
- **En la app:** Base de datos en el servidor, con las entidades del Modelo de datos.

### Pantallas que se hablan

- **Dónde:** Props `live` y `api` (`dashLive`, `dashRespond`, `admLive`, `usrAll`) y el evento `storage`
- **En la demo:** El Prototipo le pasa al panel y al admin lo que hizo el vecino en esta sesión.
- **En la app:** API y avisos en tiempo real entre la app del vecino, el panel y el Super Admin.

### Datos de ejemplo

- **Dónde:** `prototype/*.js` · `adm-data.js` (semilla fija)
- **En la demo:** Los negocios de Hazleton, 65 usuarios y 433 transacciones de 90 días. Cuentas PRUEBA: Rosaura Méndez Batista (`u00`) y Sabor Dominicano.
- **En la app:** No se migran. Las cuentas de prueba llevan `is_test`.

### Copias de base

- **Dónde:** `_d0` · `_ll` · `_n0` · `_o0` · `_s0` · `_ph0` · `_pro0`
- **En la demo:** Guardan el valor original para deshacer lo que cambian el panel o el admin.
- **En la app:** Lo hace el historial (Super Admin · Historial).

### Textos guardados como dato

- **Dónde:** `st` «cierra 9 PM», `eta` «Pickup 25 min», `fee` «Delivery $3», `d` (distancia)
- **En la demo:** Vienen escritos en los datos.
- **En la app:** Se calculan del horario, de la configuración de entrega y de la ubicación.

### Lotes del admin

- **Dónde:** Super Admin · Contenido (240 ms por elemento)
- **En la demo:** El progreso del lote avanza en el navegador.
- **En la app:** Un trabajo en el servidor, con su progreso y sus fallos reales.

### Carga de scripts

- **Dónde:** `prototype/bundle-1…4.js` · esperas de 40–120 ms por cada `window.TL*`
- **En la demo:** Los datos se cargan como scripts y las pantallas esperan a que existan.
- **En la app:** Módulos con import. Los componentes vienen del sistema de diseño.

## Decisiones

D1–D5 (decididas el 22 oct) están en `entrega/modelo-datos.md`.

### D6 · Mesa pública de El Patio sin gente

En la demo los otros asientos los juega el prototipo. En la mesa privada los asientos vacíos ya juegan con «La computadora». Falta decidir la mesa pública cuando no llega nadie.

1. Se completa con «La computadora» después de esperar un rato, como la privada
2. **Espera hasta que se sienten personas** ← elegida

**Decidido (22 oct):** Espera hasta que se sienten personas. Con tope: se espera hasta 60 s; si la mesa no se llena, los lugares vacíos los juega La computadora. Si se llena antes, empieza. Hecho en Comunidad (dominó y parchís) y en el Super Admin (30 · 60 · 90 · 120 s).
