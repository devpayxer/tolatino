# To' Latino — Revisión estructural (opinión del diseñador)

Fecha: septiembre 2026. Base revisada: `CLAUDE.md`, `taxonomia-negocios.md`,
`onboarding-negocios.md`. Estado: **opinión para decidir**, nada se cambia en
memoria hasta que el usuario lo confirme.

Veredicto corto: **el proyecto es factible y está bien estructurado**. La base
tiene tres ideas fuertes que sostienen las +5.000 pantallas: (1) estructura
base + módulos por categoría, (2) el mismo componente con capacidad Free/Pro,
(3) el trío listado→detalle→editor para todo objeto. Lo que sigue son
**tensiones** entre reglas ya anotadas y **huecos** que conviene cerrar antes
de la primera pantalla.

---

## A. Tensiones entre reglas (hay que elegir)

### A1. City Based vs radio de 30 millas en Community
Hazleton en 30 millas alcanza Wilkes-Barre, Pottsville y parte de Scranton.
Si Community es "por radio" y el resto "por ciudad", el usuario ve negocios de
una ciudad y vecinos de tres. **Propuesta:** Community se acota **por ciudad**
igual que todo; dentro, un filtro "Cerca de mí" (5/10/30 mi) para ordenar. Al
abrir una ciudad vecina, se decide si se fusionan como "zona" (Hazleton +
alrededores). Una sola regla geográfica en toda la plataforma.

### A2. Siete roles vs realidad de la v1
- **Emprendedor** y **Negocio establecido** hoy no tienen ninguna diferencia
  de flujo, pantalla ni permiso (el onboarding los trata igual por regla del
  usuario). **Propuesta:** un solo rol **Negocio** con el atributo "tipo de
  operación"; menos matriz de permisos, menos pantallas.
- **Repartidor**: ningún módulo lo usa en v1 (la entrega la hace el negocio).
  Un repartidor de plataforma implica otra app completa (asignación, ruta,
  pago, tracking). **Propuesta:** en v1.0 la entrega es del negocio;
  "repartidor To' Latino" queda como módulo futuro ya previsto en Entrega.
- **Promotor**: solo existe el código de referido. **Propuesta:** atributo del
  usuario (tiene código, ve sus referidos), no rol con pantallas propias.
- **Moderador interno** y **Administrador**: sí necesitan pantallas en v1
  (cola de verificación, reportes, ciudades) y **todavía no se han descrito**.
  Ver C1.

### A3. Free y la transacción (la duda que más pesa en el modelo de negocio)
El modelo es comisión + suscripción. Si Free **no** puede recibir pedidos ni
citas, la comisión solo existe sobre los Pro y el 85% de negocios que empieza
en Free no genera ni datos ni ingresos. **Propuesta:** Free **sí** transacciona
(pedidos, citas, boletos) con techo (ej. hasta 5 ítems, sin calendario por
persona, sin módulos separados). Pro vende **organización y visibilidad**, no
el derecho a vender. Así la comisión llega desde el día 1 y el negocio Free
prueba valor real antes de pagar.

### A4. Comisión sobre pagos fuera de la app
El usuario permitió pago en el local y contra entrega sin Stripe. Sobre esos
pedidos **no se puede cobrar comisión** (el dinero no pasa por la plataforma).
No es un problema de diseño, es de modelo: **la suscripción Pro es el ingreso
principal**; la comisión es del pago con tarjeta. Conviene tenerlo claro para
no diseñar pantallas de "tarifa de servicio" en pedidos en efectivo.

### A5. "Nunca se piden papeles" vs Stripe Connect
Stripe exige al negocio datos fiscales (SSN/ITIN/EIN) y a veces identidad
para habilitar cobros con tarjeta. No lo pedimos nosotros, pero el negocio lo
verá. **Propuesta:** copy honesto en Settings → Cobros: "Para cobrar con
tarjeta, Stripe te pedirá tus datos fiscales. Puedes seguir vendiendo en el
local mientras tanto". Coherente con la corrección del usuario.

### A6. Pro siempre primero + 10 por página
Con pocos Pro funciona. Con 25 barberías Pro en una ciudad, ninguna Free
aparece en la página 1 y el Free muere (y con él la cantera de futuros Pro).
La regla se mantiene, pero **propuesta:** rotación diaria justa entre Pro
(nadie es siempre el #1) y, dentro de cada bloque, relevancia + cercanía +
calificación. Ya está como duda abierta; aquí queda la recomendación.

### A7. Paginación en móvil
Paginación numerada es natural en desktop; en el teléfono se siente de
escritorio. La regla de transformación permite **misma estructura, otra
forma**: desktop = números de página; móvil = "Página 2 de 7 · Siguiente" fijo
abajo (sigue siendo paginación de 10, no scroll infinito). A confirmar.

### A8. Rangos que bloquean publicar
En la escalera propuesta, "Recluta" no puede publicar hasta ser "Vecino". En
una ciudad nueva con 200 usuarios eso vacía Community. **Propuesta:** en el
lanzamiento todos publican desde el día 1; los rangos desbloquean lo
**avanzado** (encuestas, mesas privadas, torneos, moderación). Corrijo la
escalera si se aprueba.

### A9. Nombre "History"
Es la única sección con nombre en inglés dentro de una UI en español, y
"History" sugiere pasado, cuando es "lo de hoy". **Propuesta de rótulo:**
ES "Hoy en el barrio" / EN "Today nearby" (nombre interno: `history`). Es solo
rótulo; el comportamiento no cambia.

---

## B. Riesgos de alcance (factible, pero conviene fasear)

### B1. Games (El Patio)
Dominó y parchís en tiempo real, con reconexión, antitrampa y torneos, es un
producto completo dentro del producto. **Propuesta:** v1.0 lanza **Gamification
+ Community**; El Patio entra en **v1.1**, empezando por el **modo por turnos
asincrónico** (mucho más barato y perfecto para "5 minutos al día"), y el
tiempo real después. Se diseña la puerta desde el día 1 (pestaña, monedas,
tabla), para que no se note el fase.

### B2. Check-in de eventos
"Sin conexión + varios porteros a la vez" es lo más difícil del módulo.
**Propuesta:** el check-in es un **modo dentro de la app del negocio** ("Modo
puerta"), no una app aparte; en v1.0 funciona en línea con varios porteros; el
modo sin conexión entra cuando haya un evento grande que lo exija.

### B3. Renta
Catálogo + calendario por unidades es un motor propio. Se diseña el patrón,
pero puede lanzarse después de Tienda y Citas (que ya cubren el 90% de
Hazleton).

### B4. Arranque en frío de Community
Community exige registro y vive de contenido. En una ciudad nueva, el feed
nace vacío. **Propuesta:** el History/"Hoy en el barrio" de los negocios y las
Novedades llenan el feed desde el día 1; cuenta oficial "To' Latino Hazleton"
publica preguntas y encuestas semanales; las recomendaciones de negocio se
siembran desde las reseñas.

---

## C. Huecos que faltan por definir (no son errores, son pendientes)

### C1. Panel interno (Moderador / Admin)
Necesario para lanzar: cola del sello Verificado, reportes de contenido y de
negocio, sanciones y apelaciones, gestión de categorías, configuración de
ciudad (abrir/cerrar, lista de espera "Pide tu ciudad"), planes y precios,
promociones y cupones patrocinados, métricas de ciudad. Mismo trío canónico,
composición desktop. Falta que el usuario lo describa o me lo encargue.

### C2. Nomenclatura de pantallas
Aún no existe. **Propuesta:** `ÁREA-MÓDULO-PANTALLA[-ESTADO]`, en mayúsculas y
sin espacios. Áreas: `APP` (cliente), `DASH` (negocio), `USR` (dashboard
usuario), `ADM` (interno), `ONB` (onboardings). Ejemplos: `APP-NEG-BUSQ`,
`APP-NEG-LISTING-PRO`, `DASH-MOD-SERV-EDIT`, `ONB-NEG-B2`, `ADM-VERIF-COLA`.
Cada pantalla, además, declara su **patrón canónico** (ver C3) y su **nivel de
acceso** (público / sesión / rol).

### C3. Los patrones canónicos como primer entregable
Antes de la primera pantalla real, conviene producir el **kit de cimientos**
(móvil + desktop cada uno): shell (header, nav inferior, sidebar), tarjeta de
negocio Pro/Free, listado paginado, filtros por familia, detalle con pestañas
condicionales, trío del dashboard (lista / detalle / editor), wizard de pasos,
hoja (sheet), estados (carga, vacío, error, sin permiso, bloqueado-Pro), muro
de registro (3 variantes), voto, ítem con estado de monetización, checkout con
y sin pago en línea, calendario de citas (por persona / por servicio), boleto
QR, y bloque de conversión a Pro. Son ~18 patrones; de ellos derivan las
5.000 pantallas.

### C4. Reseñas cuando el staff es su propio negocio
Si reservo al barbero desde la barbería, ¿la reseña es del barbero, de la
barbería o de ambos? **Propuesta:** la reseña pertenece al **profesional** y
se **agrega** en el local (promedio y conteo), marcada "vía {Barbería}".

### C5. Boleto "pagar en la puerta"
Sin pago en línea, el cupo se reserva sin cobrar. Necesita **expiración de la
reserva** o **límite por evento** para no bloquear ventas reales. A definir con
el negocio dueño del evento (configurable).

### C6. Un dueño, varios negocios
El barbero que renta silla y además vende productos; el dueño con dos locales.
Ya está en casos borde del onboarding; falta declararlo en el header (selector
de negocio en modo negocio).

### C7. Datos de ejemplo
Hazleton tiene una comunidad dominicana muy grande. El contenido de ejemplo de
las pantallas debería reflejar la ciudad real (comida dominicana, salones,
iglesias, bodegas), no un latino genérico. Para el bloque 6.

---

## D. Orden de diseño recomendado (cuando se abra la construcción)

1. **Cimientos** (C3) — sin esto, nada.
2. **Negocios**: búsqueda → listing Pro → listing Free → tarjeta.
3. **Onboarding de negocio** (ya especificado) → **Dashboard** (secciones 1–6).
4. **Transacción y citas**: ítem, carrito, checkout (con y sin pago), estado
   de orden, flujo de cita con aprobación.
5. **Onboarding de usuario** + **Dashboard de usuario**.
6. **Community** (+ Gamification) → **Eventos** (búsqueda, listing, boleto,
   dashboard del evento).
7. **Panel interno** mínimo para lanzar.
8. v1.1: El Patio, check-in sin conexión, Renta.

---

## E. Lo que NO cambiaría
- Estructura base + módulos por categoría con rótulo por rubro.
- Free/Pro sobre el mismo componente, bloqueo en el lugar.
- Staff que es su propio negocio como comportamiento por defecto.
- Monetización por ítem y forma de pago por ítem/cita.
- Cita con aprobación del negocio por defecto.
- Fuente única de eventos; Novedades → History 24 h.
- Mobile-first con desktop 100% real que se transforma.
- El onboarding de negocio con "su negocio como demo" y "nada se borra".
