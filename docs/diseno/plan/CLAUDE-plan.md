# Proyecto: To' Latino

Este archivo es la memoria del proyecto. Toda decisión cerrada se anota aquí.
Se actualiza al final de cada bloque de descubrimiento. Nada se construye
hasta que el descubrimiento esté cerrado y confirmado por el usuario.

## Idioma de trabajo
- Conversación y copy de producto: español.

## Reglas de proceso (vigentes)
1. **No se diseña ninguna pantalla** hasta terminar el descubrimiento del
   proyecto y recibir confirmación explícita del usuario.
2. El descubrimiento se hace **por bloques**, un mensaje por bloque:
   1. Qué es y para quién
   2. Alcance y estructura (módulos; qué queda fuera de v1)
   3. Flujos por rol (incluye casos borde y estados vacíos/error)
   4. Datos y reglas de negocio (entidades, permisos, validaciones)
   5. Integraciones y sistema actual (repos, APIs, pagos, BD)
   6. Contenido y tono de copy, marca, datos de ejemplo
   7. Prioridad de pantallas
3. Cada aclaración del usuario se guarda aquí de forma literal en su intención,
   sin reinterpretar ni omitir.
4. Ninguna regla se salta. Si algo entra en conflicto con una regla ya anotada,
   se pregunta antes de actuar.
5. **El usuario explica primero, yo pregunto después.** No se hacen formularios
   ni preguntas mientras el usuario esté explicando la plataforma. Solo anoto.
   Cuando el usuario diga que terminó de explicar, entonces se hace un
   formulario con las dudas reales que queden.
   (Los bloques 1–7 son solo un mapa de temas, no un cuestionario a la fuerza.)

## Regla maestra — Espejo de gestión (declarada por el usuario)

**Cada cosa mínima que se agregue al proyecto se agrega automáticamente a su
dashboard de gestión, sin preguntar.** Literal del usuario:
- Todo lo que se agregue al **proyecto en general** → se agrega al **Admin
  Dashboard** (`ADM`).
- Todo lo que se agregue al **módulo Negocios** → se agrega al **Dashboard
  del negocio** (`DASH`) para que lo maneje su dueño.
- Todo lo que se agregue al **usuario** → se agrega al **Dashboard del
  usuario** (`USR`).
- Y así sucesivamente con cualquier módulo o rol futuro.

Consecuencias obligatorias:
- Ningún objeto, campo, estado o flujo existe en la plataforma sin su
  **pantalla de gestión** correspondiente (trío listado → detalle → editor)
  en el dashboard que le toca. Si toca a más de uno (ej. una orden: negocio,
  usuario y admin), aparece en **todos**, cada uno con su nivel de permiso.
- Al anotar cualquier novedad en `CLAUDE.md`, se anota **en el mismo momento**
  su reflejo en `admin-dashboard.md` y en el dashboard del dueño del objeto.
- Esta regla no se pregunta ni se negocia: se aplica.

## Regla maestra — Triángulo de sincronización (declarada por el usuario, 25 oct)

**Cada opción del panel del negocio controla algo real en su página (listing), y
las dos quedan bajo control general del Super Admin.** Ejemplo literal: la opción
«Reservaciones» del panel se sincroniza con la pestaña «Reservaciones» de la
página del negocio y con el Super Admin.
- Panel → página: lo que el dueño guarda cambia lo que ve el cliente (no hay
  opciones decorativas; si una opción no llega a la página, está rota).
- Super Admin → panel y página: lo ve todo y puede pausar, quitar o corregir;
  la página lo respeta y el panel avisa al dueño que To'Latino lo pausó.
- Panel ↔ Super Admin: el admin ve el estado y la configuración que el dueño
  dejó (encendido, apagado, valores), no datos de ejemplo.
- Cada revisión de una sección se cierra comprobando las tres puntas.

## Regla maestra — Revisión profunda para el lanzamiento (declarada por el usuario, 25 oct)

**Cada revisión de una sección es una doble revisión profunda, no un repaso rápido.** Se revisa cada opción una por una
y se construye lo que falte para el lanzamiento (V1), no solo se arregla lo visible.
- Cada opción tiene que tener sentido para un negocio real (ej. si elige áreas, ¿cuántas mesas tiene cada área?).
- Se lee lo que el plan pide para ese módulo y se compara con lo construido; lo que falta se construye.
- Se cierra con el triángulo de sincronización (panel → página · admin → panel y página · panel → admin) y con los casos
  límite (valores en 0, apagados, días cerrados, horario, feriados, Free/Pro, pausa del admin).
- Lo que no entre se dice explícitamente como pendiente, nunca se da por hecho.

## Regla maestra — Mobile-first (declarada por el usuario)
- El proyecto está planeado para ser una **APP**. **El 99% de los usuarios
  vive en el teléfono** → el diseño se crea **principalmente para móvil**.
- Aplica **también a los negocios**: **el 85% de los negocios no usa
  computadora**; también son latinos que viven en el teléfono. Por lo tanto
  **el dashboard del negocio debe verse excelente desde la app**, no ser una
  versión apretada de un panel de escritorio.
- Sí habrá **versión desktop**, pero **sin distorsionar la app**: todo se
  concibe para verse en la APP o, en su defecto, responsive en el navegador
  del teléfono.
- El desktop, al tener más espacio, **muestra más información** — pero debe
  verse **uniforme** con la app (mismos componentes, misma jerarquía, mismos
  nombres y mismos flujos; cambia la densidad y cuántas columnas caben, nunca
  la estructura ni el orden de los pasos).
- Consecuencia de diseño obligatoria: **una sola familia de patrones**,
  definida en móvil y expandida a desktop. Ninguna pantalla se diseña primero
  en escritorio. Cada patrón canónico declara: cómo se ve en móvil, y qué
  información extra aparece al haber más ancho.

- **Aclaración del usuario (regla vigente):** el desktop **no puede ser el
  móvil estirado** — "eso no se ve profesional". Debe ser un diseño **100%
  desktop** que **se transforma** a medida que se reduce el ancho hasta llegar
  a móvil.
- Cómo se cumple sin romper la regla mobile-first: cada patrón canónico se
  define **una sola vez** con la misma estructura, mismos nombres, mismo orden
  de pasos y mismos componentes, pero con **dos composiciones legítimas**:
  - **Desktop:** aprovecha el ancho de verdad — barra lateral persistente,
    maestro-detalle en dos o tres columnas, tablas densas con columnas
    adicionales, filtros siempre visibles, panel de contexto a la derecha,
    acciones en lote.
  - **Móvil:** una columna, navegación inferior, filtros y detalles en hojas
    (sheets), tarjetas en vez de tablas, acción principal fija abajo.
- Regla de transformación: al reducirse el ancho, los elementos **cambian de
  forma** (tabla → tarjetas, sidebar → nav inferior, panel lateral → hoja),
  nunca solo de tamaño. Y al revés: al crecer, se **agrega información**, no
  se estira el contenido.
- Ninguna de las dos composiciones puede inventar pasos, nombres o pantallas
  que la otra no tenga.

## Regla maestra — Prototipo interactivo 100% navegable (declarada por el usuario)

**Declarado literal:** "debe crearse un prototipo interactivo 100% navegable".

Consecuencias obligatorias:
- El entregable final **no son pantallas sueltas**: es un **prototipo navegable
  de punta a punta**. Toda pantalla que se diseñe debe poder **abrirse,
  recorrerse y salirse** desde dentro del prototipo, sin explicaciones al lado.
- **Ningún botón muerto.** Cada acción visible lleva a algún sitio: a la
  pantalla siguiente, a un estado (carga, éxito, error, vacío, sin permiso),
  o a una hoja/modal.

### Orden de construcción — de la página de inicio hacia afuera (declarado por el usuario)
**Literal:** "debe construirse primero la página de inicio, donde el usuario
comienza y desde ahí ir creando las demás páginas/flow desde el inicio al
final, en un prototipo navegable 100%, es la única manera de crear algo
palpable".

- **La primera pantalla del prototipo es la página de inicio** del usuario
  (`APP-HOME`), no una plancha de exploración ni una pantalla interior.
- Desde ahí se construye **hacia afuera y en orden de recorrido**: se sigue el
  camino que haría un usuario real, del inicio al final de cada flujo, sin
  saltar a pantallas interiores sueltas.
- **Nada se construye fuera de contexto.** Una pantalla solo se diseña cuando
  ya existe el camino que lleva a ella y el que sale de ella.
- Cada flujo se cierra **de punta a punta antes de abrir otro**: inicio →
  buscar → ficha → acción (pedido o cita) → pantalla final → dashboard, y de
  vuelta al inicio.
- Las planchas de exploración ya hechas (Sistema, Buscador, Ficha Pro) quedan
  como **referencia de diseño**; su contenido se vuelca dentro del prototipo
  navegable, que es el entregable palpable.
- Consecuencia: el trabajo empieza por el **shell de prototipo + `APP-HOME`**,
  y a partir de ahí crece siguiendo esta regla y la del "aún no construido".

### Regla del "aún no construido" (declarada por el usuario)
**Literal:** "si yo le doy click a un botón o flow, y no hay nada construido
entonces se debe construir siguiendo siempre las reglas".

- Ningún destino inexistente muestra un cartel muerto tipo "PRONTO". Cada
  acción sin pantalla aterriza en una **pantalla de encargo** que ya trae
  resuelto el trabajo de análisis:
  - el **código de la pantalla** que le corresponde (ej. `NEG-CITA-05`),
  - de qué **patrón canónico** deriva y con qué **familia de filtros / módulo**,
  - **de dónde vino** el click (pantalla origen + acción + rol + ciudad),
  - qué **estados** va a necesitar por ser de ese patrón,
  - y un botón **"Construir esta pantalla"**.
- Ese botón **registra el encargo en una cola visible** dentro del prototipo
  (pantalla `PROTO-COLA`): qué se pidió, desde dónde, cuándo y con qué patrón.
  La cola es la lista de trabajo: yo la leo y construyo desde ahí.
- Al construirla, **se aplican las reglas sin excepción**: patrón canónico +
  sistema de diseño + móvil y su transformación a escritorio + estados +
  bilingüe + espejo de gestión (su trío en el dashboard que le toca) + el
  registro en `CLAUDE.md`.
- La pantalla de encargo **nunca es un callejón**: siempre ofrece volver,
  seguir por otro camino, y ver la cola.
- Consecuencia: el prototipo **crece por uso**. Navegar es la forma de
  descubrir qué falta, y cada hueco queda documentado con su contexto en vez
  de perderse en una conversación.
- Todo flujo se puede **completar y también abandonar**: hay camino de ida y
  de vuelta (atrás, cerrar, cancelar), y los flujos de compra/cita llegan a su
  pantalla final (thank you / estado del pedido) y de ahí al dashboard.
- Los **cambios de rol** son parte de la navegación: se puede pasar de
  cliente → negocio → admin (y a las apps de delivery y check-in) sin salir
  del prototipo.
- La navegación real manda: nav inferior en móvil, sidebar y pestañas en
  escritorio, y el **selector de ciudad** siempre operable.
- Los estados no se documentan aparte: se **alcanzan navegando** (un pedido
  sin señal, una categoría vacía, una cita rechazada).
- Las planchas de exploración y los archivos de reglas siguen existiendo como
  referencia, pero **no sustituyen** al prototipo navegable.
- Consecuencia de arquitectura: se necesita un **shell de prototipo** con
  enrutado por pantalla (código de pantalla como ruta, ej. `NEG-BUS-03`),
  estado compartido (sesión, ciudad, idioma, carrito, rol) y un mapa de
  pantallas navegable, para que crezca a miles de vistas sin perder la base.

## Restricciones de escala (declaradas por el usuario)
- Proyecto de gran escala: potencialmente **+5.000 pantallas**, **cientos de
  módulos** y **miles de flujos** interconectados.
- Consecuencia obligatoria: la **base de diseño no puede perderse ni derivar**
  a lo largo del proyecto. Se requiere consistencia estricta y sistemática.
- Implicaciones que se derivan de esto (a validar en el bloque de estructura):
  - Debe existir **una sola fuente de verdad visual** (colores, tipografía,
    espaciado y componentes) definida antes de la primera pantalla y nunca
    inventada pantalla por pantalla. **Cuál es esa dirección visual está por
    decidir** (ver "Dirección visual: abierta").
  - Se necesita una **nomenclatura estable** de módulos, pantallas y flujos
    (código o ruta por pantalla) para poder referenciar entre miles de vistas.
  - Se necesitan **patrones canónicos** definidos una sola vez y reutilizados:
    layout de app (shell/nav), listados, detalle, formularios, wizards,
    tablas, filtros, estados vacíos, carga, error, permisos, confirmaciones.
  - Cada pantalla nueva debe declarar de qué patrón canónico deriva.
  - Cambios a la base se hacen en el patrón, no pantalla por pantalla.

## Bloque 1 — Qué es y para quién (en curso)

### Nombre
- **To' Latino** — abreviación/pronunciación latina de "Todo Latino".
- Se escribe con apóstrofo: `To' Latino`. (Pendiente: uso de mayúsculas/logo.)

### Qué es
- Plataforma **ALL IN ONE** para **latinos residentes en Estados Unidos**.

### Problema que resuelve (palabras del usuario, intención literal)
- A los latinos se les dificulta emprender: **no existe una base que permita
  dar a conocer sus emprendimientos**.
- Son personas con mucho deseo de superación, pero **el poco conocimiento de
  la zona los limita**.
- Las **grandes plataformas solo sirven a negocios ya establecidos**.
- El latino es **"chambero"**: ofrece **servicios directos**, sin empresa
  constituida ni intermediario.
- Muchos trabajan **por hobby**, o **2–3 días por semana** (informal, parcial,
  no profesionalizado).
- Ejemplo dado: un amigo que **cocina solo los fines de semana**; solo le
  compran los que ya lo conocen, **no hay forma de extenderse**, y hay que
  **llamarlo por teléfono para preguntar el menú**.
- Otros ejemplos de necesidad no resuelta: encontrar un **sastre** para
  arreglar un pantalón; organizar una fiesta (**payaso, renta de sillas,
  pedir el pastel**) y "miles de cosas más".

### Lo que To' Latino debe eliminar
- La dependencia del boca a boca y del círculo cercano.
- La llamada telefónica como único canal (menús, precios, disponibilidad
  deben ser visibles y consultables sin llamar).
- La barrera de entrada para quien no tiene empresa formal.

### Decisiones cerradas del bloque 1

**Roles de usuario (7 declarados → simplificados en la revisión aprobada):**
1. Cliente (busca y compra)
2. **Negocio** (fusiona "Emprendedor/chambero" y "Negocio establecido": mismo
   flujo, mismos permisos; la diferencia es el atributo "tipo de operación")
3. Moderador / soporte interno
4. Administrador de la plataforma
- **Promotor** = atributo del usuario (código de referido y sus referidos), no
  rol con pantallas propias.
- **Repartidor de plataforma** = módulo futuro (v1.x); en v1.0 la entrega la
  hace el propio negocio.

**Transacción:** híbrida. **Cada emprendedor elige** si acepta pago en línea
o solo contacto. Consecuencia: todo flujo de oferta tiene dos variantes
("con pago" / "solo contacto") y el patrón de detalle debe soportar ambas.

**Alcance geográfico v1:** la plataforma es **City Based**. Se abre primero en
**Hazleton, PA** para testear que todo funcione, y luego se van abriendo otras
ciudades. Consecuencia: la ciudad es una dimensión de primer nivel en todo el
producto (contenido, búsqueda, catálogo, métricas y administración se acotan
por ciudad); la arquitectura nace multi-ciudad desde el día 1 aunque solo haya
una activa.

**Modelo de negocio:** comisión por transacción + suscripción mensual del
emprendedor. (Ambos coexisten → hay módulo de planes/facturación.)

**Confianza y verificación:**
- Reseñas y estrellas de clientes
- Verificación de teléfono y correo
- Sello "verificado por To' Latino" tras **revisión manual** (→ implica cola
  de moderación en el panel interno)
- Historial visible de trabajos completados
- (No hay verificación de ID/selfie en v1 → nunca se piden papeles.)

**Idioma de la interfaz:** bilingüe español + inglés. Consecuencia: todo texto
es traducible; el patrón canónico debe contemplar longitud variable de
etiquetas y un selector de idioma.

**Dispositivos:** app móvil (iOS/Android) + web responsive + paneles de
gestión. Ver la regla maestra "Mobile-first" — el escritorio es derivado, no
una segunda familia de diseño.

**Prioridad de mercado:** los dos lados en paralelo (oferta y demanda).

### Pendiente del bloque 1 (sin respuesta, se retoma)
- Categorías/tipos de oferta de la v1 → se traslada al bloque 2 (estructura).
- Alcance geográfico explícito (se asume Hazleton PA como piloto).
- Qué debe sentir el latino al abrir To' Latino → se retoma en el bloque 6 (tono).

## Bloque 2 — Alcance y estructura (en curso, el usuario está explicando)

### Módulos de la v1 (declarados por el usuario)
Se crean **3 módulos** de arranque:
1. **Community**
2. **Negocios** (el directorio de negocios es *solo un módulo*, no la plataforma)
3. **Eventos**

Nota literal del usuario: "el directorio de negocio es solo un modulo".
Consecuencia: la arquitectura de navegación no puede girar alrededor del
directorio; debe ser un shell que aloje módulos intercambiables y ampliables
(cientos de módulos a futuro).

### Módulo 1 — Community (en detalle, según el usuario)

**Propósito:** que los usuarios interactúen entre sí. Referencia mencionada:
**Nextdoor**.

**Zona / alcance de la comunicación (DECIDIDO en la revisión aprobada):**
- Community se acota **por ciudad**, igual que toda la plataforma (una sola
  regla geográfica). Dentro, filtro **"Cerca de mí"** (5 / 10 / 30 mi) para
  ordenar. Al abrir ciudades vecinas se decide si se fusionan como "zona".
- (Idea original del usuario: radio de 30 millas; reemplazada por lo anterior.)

**Qué puede publicar el usuario:**
- Post generales
- Preguntas
- Encuestas (polls)
- Recomendaciones de negocios

**Sistema de reputación del contenido:**
- **No hay "likes": hay votos.** Los posts se votan.
- En los **comentarios**, los usuarios pueden **recomendar negocios**.
- Los demás usuarios que tengan la misma recomendación **votan positivo**.
- El comentario **más votado sube al tope** de los comentarios.

**Sección "History" dentro de Community** — rótulo aprobado: ES **"Hoy en el
barrio"** / EN **"Today nearby"** (nombre interno `history`):
- No es para usuarios, es **para negocios**.
- Cuando un negocio hace un **update, una oferta, o cualquier cosa que
  amerite**, aparece aquí.
- Sirve para que los usuarios vean **qué trae ese negocio ese día en
  particular**.
- Consecuencia: es un feed de actividad de negocios con carácter de
  "novedad del día" → implica contenido con caducidad/fecha y un flujo de
  publicación desde el panel del negocio hacia Community.

**Consecuencias de diseño anotadas:**
- El patrón de "voto" (positivo/negativo o solo positivo — pendiente) es un
  componente canónico reutilizable en posts y comentarios.
- Los comentarios se ordenan por votos, no cronológicamente (al menos por
  defecto) → el patrón de lista de comentarios necesita orden configurable.
- Un comentario puede **contener una referencia a un negocio** del módulo
  Negocios → hay un componente de "tarjeta de negocio embebida" que enlaza
  Community con Negocios.

### Community — enganche: Gamification y Games (pedido por el usuario)

El usuario pide dos sistemas de enganche dentro de Community, con el objetivo
declarado de **generar mayor flujo de visitas**:
1. **Gamification** — sistema de participación con **rangos estilo militar**.
   El usuario pidió expresamente una propuesta ("crea algo bien chido").
2. **Games** — **sala de juegos** para **Dominó** y **Parchís**, donde la gente
   de la comunidad juegue entre sí.

#### Propuesta de Gamification (pendiente de aprobación del usuario)

**Dos monedas separadas, nunca se mezclan:**
- **Rango** (progresión, no se gasta, casi nunca baja) — mide aporte real.
- **Monedas To' Latino** (se gastan) — para la sala de juegos, destacar un
  post, cambiar por cupones de negocios locales.

**Escalera de 10 rangos (estilo milicia, sabor latino, bilingüe):**
1. Recluta — registrarse + verificar teléfono → **publicar, comentar y votar
   desde el día 1** (aprobado: los rangos desbloquean lo avanzado, nunca lo
   básico, para no vaciar Community en una ciudad nueva)
2. Vecino — primer post útil → insignia de vecino, editar perfil extendido
3. Cabo — 5 comentarios votados → crear encuestas
4. Sargento — 3 recomendaciones de negocio votadas → insignia visible
5. Sargento Mayor — racha de 4 semanas activas → destacar 1 recomendación/mes
6. Teniente — aportes constantes + reseñas verificadas → mesas privadas
7. Capitán — referidos activos en la ciudad → abrir torneos de barrio
8. Comandante — historial limpio + alto volumen votado → reportes prioritarios
9. Coronel — por invitación del equipo → moderación local
10. General del Barrio — top de la ciudad, plazas limitadas → voz en decisiones

**Reglas del sistema (importantes para el diseño):**
- Los puntos **solo salen de aporte validado por otros** (votos, reseñas,
  recomendaciones aceptadas), nunca de "estar conectado".
- Tope diario de puntos → evita farmeo.
- Contenido borrado o sancionado **resta** puntos.
- **Tabla de la ciudad** ("Tabla del Barrio") mensual, no global — coherente
  con City Based.
- Cada rango tiene **insignia visual** (galones) y un apodo mostrable.
- El rango del **negocio** es aparte del rango del **usuario**.

#### Propuesta de Games (pendiente de aprobación del usuario)

**Nombre propuesto de la sala:** "El Patio".

- **Dominó**: 1v1 y 2v2 en parejas, partida rápida o a 100/200 puntos, chat de
  mesa, emotes.
- **Parchís**: 2 a 4 jugadores, modo clásico y modo rápido.
- **Mesas** públicas o privadas por código (para jugar con conocidos).
- **Entrada en Monedas To' Latino, nunca dinero real** → se evita entrar en
  regulación de apuestas.
- **Torneos semanales por ciudad**, con temporada y ranking; los **negocios
  locales patrocinan** y el premio son **cupones canjeables en esos negocios**
  → el juego alimenta el módulo Negocios.
- Espectadores, reconexión si se cae la señal, y **modo por turnos asincrónico**
  para quien juega 5 minutos al día.
- Antitrampa: detección de parejas coludidas, límite de mesas por rango.

**Principio declarado por el usuario (regla vigente):** los juegos **no son
para generar dinero**; son para **enganchar a la audiencia a venir siempre y
no espantarla**. Cero dinero real en El Patio (no se venden monedas, no se
cobra por jugar); siempre hay mesas gratis; sin castigos que duelan ni
mecánicas de presión; premios solo en cupones de negocios locales como
pretexto para visitar el negocio. Detalle en `flujos-transversales.md` §6.

**Consecuencia de arquitectura:** Games y Gamification son **módulos propios**
consumidos desde Community (perfil, feed, sala), no partes sueltas de
Community. Rango y monedas son **transversales** a toda la plataforma.

### Módulo 2 — Negocios (en detalle, según el usuario)

**Pantalla de búsqueda:** muestra **categorías** de negocios, **subcategorías**
y **filtros que dependen del tipo de negocio buscado**.
- Ejemplo del usuario: buscando comida → filtros delivery / pickup.
- Ejemplo del usuario: buscando barberos → filtros citas / a domicilio.
- Consecuencia: los filtros **no son globales**; cada categoría declara su
  propia familia de filtros. Es un patrón canónico de "filtros por familia".

**17 categorías principales (declaradas por el usuario, literal):**
1. Auto Services
2. Beauty and Health
3. Food and Drinks
4. Home Services
5. Night Life
6. Markets and Bodegas
7. Party and Celebrations
8. Doctors and Medicine
9. Professional Services
10. Shops & Stores
11. Transportation
12. Courses & Education
13. Children
14. Active Life & Sport
15. Churches & Religion
16. Real Estate
17. Car Dealers

**Subcategorías y filtros:** el catálogo completo vive en
[`taxonomia-negocios.md`](taxonomia-negocios.md) — fuente de verdad del
catálogo. Ninguna pantalla inventa categorías fuera de ese archivo.
Incluye: 17 categorías con subcategorías bilingües, código por categoría
(`NEG-<CAT>-<NN>`), filtros globales y 15 familias de filtros
(F-COMIDA, F-CITA, F-OBRA, F-RETAIL, F-INMUEBLE, F-VEHICULO, F-EVENTO,
F-SALUD, F-EDUCACION, F-DEPORTE, F-FE, F-NOCHE, F-PRO, F-TRANSPORTE, F-NINOS).

**Tipos de tarjeta de negocio (2, declarado por el usuario):**
1. **Pro / Verified** — tarjeta más completa, "digna de una suscripción".
2. **Free** — tarjeta con poca información, diseñada para **forzar/incentivar
   la actualización a Pro**.

Consecuencia de diseño: la tarjeta de negocio es un **componente canónico con
dos variantes** (Pro y Free) que aparece en toda la plataforma (búsqueda,
resultados, Community embebida, Eventos, History). La diferencia entre ambas
debe ser **visible de inmediato**, sin parecer un error ni una tarjeta rota.
Propuesta de reparto de información (pendiente de aprobación):
- **Free:** nombre, categoría, 1 foto, ciudad, estrellas, botón de contacto.
- **Pro:** todo lo anterior + galería, insignia Verificado, horario y "abierto
  ahora", subcategorías/servicios con precios, botón de pedido o reserva,
  ubicación en mapa, ofertas del día (History), enlace a reseñas, respuesta
  rápida, y posición preferente en resultados.

**Orden y paginación de resultados (declarado por el usuario):**
- Los negocios **Pro siempre van primero** en la lista.
- **10 tarjetas por página**.
- La página de búsqueda tiene **paginación** (no scroll infinito).
- Consecuencia: el patrón canónico de listado del módulo Negocios es
  "resultados paginados de 10, bloque Pro arriba y luego Free"; el componente
  de paginación es canónico y reutilizable en toda la plataforma.

### Negocios — Business Single Listing Page (declarado por el usuario)

Al dar click en un negocio se abre su página. **Hay 2 tipos de página:**
**Pro** y **Free**.

**Página Pro — principio declarado por el usuario:**
- Aunque cada categoría es distinta, **hay algo que las relaciona** → se crea
  una **estructura base única para todas las categorías**.
- Sobre esa base se **insertan módulos de negocio** según la categoría, para
  que la experiencia se sienta **única** por rubro.
- Aclaración literal del usuario: una peluquería necesita módulo de
  *appointments* y un carwash también, **pero son negocios totalmente
  distintos** y cada uno requiere mejoras propias **según la categoría o
  subcategoría**.
- Consecuencia de arquitectura: el módulo no es solo "citas"; es "citas
  **configurada** para ese rubro" (campos, duración, personal, vehículo,
  servicio, etc.). Un mismo módulo tiene **variantes por categoría**, no
  copias sueltas.

**Estructura base de la página Pro — declarada por el usuario:**

*Cabecera (base, siempre presente):*
- Imagen **featured**
- **Logo**
- **Título con check de verificación**
- **Horario dinámico** con frase de estado en tiempo real:
  "Abierto · cierra en una hora" / "Cerrado · abrimos el lunes a las 9 am"
- **Reviews** (estrellas + cantidad)
- **"Vecinos recomiendan"** (enlaza con los votos y recomendaciones de
  Community → la reputación de la comunidad se muestra en el negocio)
- **Subcategorías**
- Acciones que ameriten: **share, menu, save**, y las de contacto/acción
  principal.

*Menú horizontal (pestañas) — aquí viven los módulos:*
- El menú horizontal contiene los **módulos fijos** y las **variantes por
  categoría/subcategoría**.
- Pestañas fijas del sistema: **Resumen, Novedades, Eventos, Relacionados,
  Trabajos, Reseñas**.
- **Regla declarada:** una pestaña **solo se muestra si hay información**
  para ella (si el negocio no tiene Evento, la pestaña Eventos no aparece).
- **Siempre visibles sin excepción: Resumen y Reseñas.**
- **Resumen (overview) es la pestaña abierta por defecto** al entrar al
  listing.

*Contenido de las demás pestañas fijas — declarado por el usuario:*

- **Novedades:** el dueño del negocio publica posts **igual que en Community**
  (información, ofertas, etc.). Lo que publica aquí **se publica en el History
  de Community por 24 horas**. Consecuencia: la publicación nace en el panel
  del negocio, vive permanente en su pestaña Novedades, y se **replica con
  caducidad de 24 h** en el History de Community de su ciudad.
- **Eventos:** si el negocio tiene un evento, lo publica en el **módulo
  principal Eventos** (uno de los 3 módulos: Community, Negocios, Eventos) y
  ese evento **se duplica aquí**, porque el negocio es **dueño del evento**.
  Consecuencia: el evento tiene una sola fuente (módulo Eventos) y el listing
  lo refleja; nunca se crea un evento suelto dentro del listing.
- **Relacionados:** sección para **relacionar uno o más negocios** con este.
- **Trabajos:** vacantes de empleo del negocio (si tiene alguna vacante).
- **Reseñas:** proceso típico de reviews.

*Contenido del Resumen (overview) — declarado por el usuario:*
- Quiénes somos
- Amenities
- Preview de productos o servicios
- Horario completo
- Galería de imágenes

*Añadidos propuestos al Resumen (pendientes de aprobación):*
- Formas de pago y si acepta pago en línea o solo contacto
- Idiomas de atención
- Zona de servicio / radio en millas (clave para chamberos a domicilio)
- Años activo, trabajos completados y verificaciones (bloque de confianza)
- Rango del negocio (gamification)
- Licencias y certificaciones cuando el rubro las tiene
- Staff destacado cuando aplica
- Oferta del día activa (viene de History)
- Preguntas frecuentes
- Mapa y direcciones
- 2–3 reseñas destacadas con enlace a la pestaña Reseñas
- Acción principal fija (sticky) para no perder el botón al hacer scroll

**Propuesta previa de slots (parcialmente reemplazada por lo declarado arriba;
se conserva como referencia de contenido):**
1. Encabezado: portada, logo, nombre, categoría/subcategorías, sello
   Verificado, estrellas y número de reseñas, ciudad/distancia, abierto ahora.
2. Barra de acción: llamar, mensaje, direcciones, compartir, guardar,
   y la acción principal según el rubro (pedir / reservar / cotizar).
3. Bloque de confianza: verificaciones, años activo, trabajos completados,
   rango del negocio.
4. **Zona de módulos por categoría** (el corazón de la diferencia por rubro).
5. Acerca del negocio: descripción, idiomas, formas de pago, zona de servicio.
6. Horario y disponibilidad.
7. Galería.
8. History / novedades y ofertas del día (enlaza con Community).
9. Reseñas.
10. Ubicación y mapa.
11. Negocios relacionados en la misma ciudad.

**Biblioteca de módulos insertables (propuesta, se declara por categoría):**
menú, precios/servicios, citas, cotización, pedido con carrito, delivery y
pickup, personal/staff, vehículo (para servicios de auto), inventario o
listado (autos, inmuebles), habitaciones/unidades, paquetes de evento,
calendario de fechas ocupadas, especialidades médicas y seguros, horarios de
servicios religiosos, clases y horarios, membresías, cupones, portafolio de
trabajos, certificaciones y licencias, preguntas frecuentes, formulario de
contacto, y catálogo de productos.

Regla anotada: **cada categoría de `taxonomia-negocios.md` declarará qué
módulos usa y en qué orden**; ninguna página se arma a mano.

### Negocios — Módulos por categoría/subcategoría (declarado por el usuario)

Nombres base declarados: **Citas, Reservaciones, Servicios, Tienda, Menú,
Staff**. Pueden existir otros; el usuario pide que al final de su explicación
yo proponga los que falten.

**Regla de nomenclatura declarada:** los nombres son **base, no fijos**. La
etiqueta del módulo **varía según el tipo de negocio** para que se sienta
natural en su categoría (ej. "Menú" en un restaurante, "Servicios" en una
barbería, "Reservaciones" en un salón de eventos). Consecuencia: cada módulo
tiene un **nombre canónico interno** + un **rótulo por categoría** (y en dos
idiomas). El comportamiento no cambia; el rótulo sí.

#### Módulo Citas / Reservaciones / Bookings
- Hay negocios que requieren citas; la organización del módulo depende de la
  **subcategoría** (queda a mi cargo diseñarlo por rubro).
- Se **mezcla con el módulo Staff**, por el modelo de negocio latino de
  **renta de silla/espacio**.

**Dos modelos de Staff (ejemplo declarado: Barbería; aplica a muchas categorías):**

*Modelo A — el negocio tiene empleados:*
- El Staff es un **staff simple**: muestra a los especialistas.
- Al solicitar un servicio, el usuario **puede elegir o no** a alguien del staff.

*Modelo B — el negocio renta las sillas/espacios:*
- Los del staff **no son empleados**: rentan una silla para trabajar.
- Cada uno **abre su propia página de negocio** (ej. como barbero) y la
  barbería **lo agrega como staff**.
- El usuario puede hacer cita con esa persona de **dos maneras**:
  1. desde la página de la barbería, o
  2. desde la página del barbero.
- Desde la barbería el flujo funciona en **ambos órdenes**:
  - elegir primero a la persona y luego el servicio, o
  - elegir primero el servicio y luego a la persona.
- **El calendario es el del staff, sincronizado**, aunque en el diseño **no se
  note la diferencia**, para dar mejor experiencia de usuario.

**Consecuencias de arquitectura anotadas:**
- Un negocio puede ser **staff de otro negocio** → relación negocio↔negocio con
  rol ("renta espacio en"), y la disponibilidad vive en la persona, no en el local.
- El módulo Citas necesita **un solo motor de disponibilidad** consultable desde
  dos entradas distintas (local y persona), sin doble reserva.
- El flujo de reserva debe soportar **entrada por persona** y **entrada por
  servicio** llegando al mismo resultado.
- El negocio "silla rentada" tiene su propia tarjeta, sus propias reseñas y su
  propio plan (Pro/Free) → un barbero puede ser Pro aunque la barbería sea Free
  y al revés.

**Regla declarada (ampliación del usuario):** este modelo de "renta de
espacio / staff que es su propio negocio" **aplica a TODOS los negocios que
ofrecen un servicio**, no solo a barberías. Es **muy frecuente en el negocio
latino**. Consecuencia: el par Citas+Staff con calendario del staff
sincronizado y doble entrada (local / persona) es el **comportamiento por
defecto** de toda categoría de servicio; el modelo de empleados es la
variante simple del mismo módulo, no un módulo distinto.

**Ejemplos declarados por el usuario del mismo patrón (no solo barberías):**
- **Real Estate:** la compañía es el negocio; los **agentes son el staff** (y
  cada agente puede tener su propia página de negocio).
- **Taller de mecánica:** los **"pinos"/bahías pueden estar rentados** por
  mecánicos independientes.
- Se asume el mismo patrón en: salones de belleza y uñas, spas, tatuajes,
  fotografía y video de eventos, entrenadores en gimnasio, salones de eventos
  con proveedores, clínicas con especialistas, y en general cualquier local que
  alberga profesionales independientes.

#### Módulo Servicios
- Es **exactamente lo mismo que Citas**: aquí el negocio **publica sus
  servicios**, y para ordenar un servicio **se hace la cita**.
- **Regla declarada (muy importante):** todo negocio debe poder publicar sus
  **servicios o productos** en **modo catálogo** (solo mostrar / contacto) o
  con **cobro en línea**. Es una decisión del negocio, por publicación.
  Consecuencia: cada ítem (servicio o producto) tiene un estado de
  monetización, no solo el negocio completo.

#### Módulo Tienda
- Aquí el negocio publica sus **productos para la venta**.
- **Todo tipo de negocio vende algo** → el módulo es **igual para cualquier
  categoría** (patrón único), al estilo Amazon / DoorDash / Instacart /
  Walmart: buscador, filtros, precios, **variantes**, **add-ons**.
- Entregas: **delivery, pickup, shipping**, etc.
- Consecuencia: un solo motor de catálogo + carrito reutilizado por todos los
  rubros; lo que cambia es el rótulo y los campos de la categoría.

#### Módulo Menú
- **Exclusivo de comidas** (por el nombre "Menú"), estilo DoorDash / Uber Eats.
- Consecuencia: es la variante de Tienda para F-COMIDA (secciones del menú,
  platos, extras, tamaños, combos, horario del menú).

#### Módulo Staff
- Si el negocio lo amerita, presenta a su staff (ver los dos modelos arriba).

#### Reglas transversales de compra y de cita (declaradas por el usuario)
- **Toda compra requiere el flujo completo:** carrito, checkout, tarjeta
  guardada (saved card), página de gracias (thank you), estado del pedido
  (order status) y todo lo necesario para cerrar el flujo.
- **Las citas nunca se confirman automáticamente:** el negocio **aprueba la
  cita**. Como mínimo, el negocio decide si quiere aprobación manual o
  automática (opción configurable, con manual por defecto).
  Consecuencia: la cita tiene estados (solicitada → aprobada / rechazada /
  reprogramada → cumplida / no asistió) y ambos lados necesitan notificación
  y pantalla de seguimiento.

### Procesos implícitos asumidos (declarado por el usuario)

El usuario aclara que **solo está explicando lo más importante**; los procesos
intermedios necesarios se asumen y quedan a mi cargo, respetando la base.
Se asumen como parte del sistema (a validar, no a re-preguntar uno por uno):

- **Cuenta:** registro, login, verificación de teléfono y correo, recuperar
  contraseña, cambio de ciudad, selector de idioma, perfil, cerrar sesión,
  borrar cuenta.
- **Onboarding del negocio:** crear negocio, elegir categoría/subcategorías,
  completar perfil, verificación manual (cola de moderación), elegir plan
  Pro/Free, cobro de suscripción, estado de la cuenta.
- **Panel del negocio:** publicar y editar servicios/productos, gestionar
  módulos activos, horario y días cerrados, staff e invitaciones, agenda,
  pedidos, cotizaciones, novedades, eventos, vacantes, reseñas y respuestas,
  facturación, métricas.
- **Estados de todo listado:** carga, vacío, sin resultados, error, sin
  conexión, contenido pendiente de aprobación, negocio suspendido o cerrado.
- **Transacción:** carrito, checkout, tarjetas guardadas, propina, impuestos y
  tarifas, cupones, pago rechazado, reembolso, cancelación, disputa, recibo.
- **Cita:** disponibilidad, solicitud, aprobación, reprogramación,
  cancelación, recordatorio, no-show, cierre y reseña.
- **Mensajería y notificaciones:** chat cliente↔negocio, push/email/SMS,
  preferencias de notificación.
- **Confianza y seguridad:** reportar contenido o negocio, bloquear usuario,
  moderación, apelación, sanciones, términos y privacidad.
- **Interno:** panel de administración por ciudad, cola de verificación,
  gestión de categorías, soporte, y apertura de ciudad nueva.

#### Módulo Renta (declarado por el usuario)
- Para negocios que ofrecen **renta de artículos**: equipo de eventos (sillas,
  mesas, carpas, inflables, sonido) y **herramientas**, entre otros.
- Diferencia clave con Tienda: el artículo **no se vende, se ocupa por un
  período** → el precio es por bloque de tiempo y el inventario se libera al
  devolverse.
- Comportamiento asumido (a validar): precio por hora / día / fin de semana /
  semana, cantidad disponible por fecha, calendario de disponibilidad del
  artículo, fecha de retiro y de devolución, depósito o garantía, entrega y
  montaje vs retiro en local, radio de entrega, límite de días, recargo por
  retraso o daño, y renta de paquetes (varios artículos en un solo pedido).
- Consecuencia de arquitectura: Renta es **catálogo + calendario a la vez**;
  reutiliza el motor de catálogo/carrito de Tienda y el motor de
  disponibilidad de Citas, pero reserva **unidades de inventario por rango de
  fechas** (no un espacio de agenda de una persona).
- Rótulos por categoría: "Renta de equipo" en fiestas, "Renta de herramienta"
  en ferretería/hogar, "Renta de mobiliario" en salones.

### Negocios — Business Single Listing Page **Free** (declarado por el usuario)

Todo lo anterior (cabecera + barra de menú horizontal + módulos) es para
**Pro**. La página **Free** es deliberadamente limitada:
- **No existe la barra de menú horizontal** → no hay pestañas ni módulos; es
  **una sola página**.
- El **overview es limitado** (versión reducida del Resumen).
- **No puede manejar las reseñas** (no gestiona ni responde reseñas).
- Los **productos o servicios que vende aparecen aquí mismo, en esa única
  página y mezclados** (sin Tienda, Menú, Servicios ni Citas como módulos
  separados).

Consecuencia de diseño anotada: la página Free debe verse **completa y digna**
—no roto ni con huecos— pero con techo evidente, y cada límite es una
oportunidad natural de invitar a Pro (sin insultar al emprendedor que aún no
puede pagar).

**DECIDIDO (revisión aprobada):** el negocio **Free sí transacciona**
(pedidos, citas, boletos) con **techo** (ej. hasta 5 ítems, sin calendario
por persona, sin módulos separados). Pro vende **organización y visibilidad**,
no el derecho a vender. Las reseñas en Free **se muestran**, solo no se
gestionan ni responden.

## Pausa declarada por el usuario — DASHBOARD (lo más importante del proyecto)

El usuario detiene el módulo Eventos para tratar el **Dashboard**, declarado
como **lo más importante del proyecto**: "sin eso bien estructurado no vamos
para ninguna parte".

**Alcance declarado: el dashboard maneja TODO.** Literal del usuario:
- Manejar **cada aspecto del listado**
- **Modificar / editar el listing completo**
- **Insights**
- **Órdenes**
- **Usuarios**
- **Productos**
- **Servicios**
- **Activar / desactivar módulos**
- **Staff**
- **Eventos**
- **Reseñas**
- **Tickets**
- **Citas**
- **Mensajes**
- **Contacto**
- "en fin TODO"

Consecuencia de arquitectura anotada: el Dashboard **nace móvil** (ver la
regla maestra "Mobile-first") y su patrón canónico manda sobre cientos de
pantallas de gestión. Regla: cada objeto del producto (listing, producto,
servicio, orden, cita, reseña, staff, evento, ticket, mensaje) tiene el
**mismo trío de pantallas** — listado con filtros, detalle, y editor — más
sus estados. Nada se diseña a mano por módulo.

### Dashboard — Secciones (declarado por el usuario)

El Dashboard está **dividido por secciones**:

**1. Listing Management**
- Todo lo correspondiente al listado: horarios, direcciones, teléfonos,
  categorías, etc.
- **Pro: todo abierto.** **Free: tiene bloqueo** (secciones bloqueadas con
  invitación a Pro).
- Consecuencia: el editor del listing es el mismo componente para ambos, con
  un estado de **campo/sección bloqueada** — nunca una pantalla distinta.

**2. Módulos**
- Muestra los **módulos activos** (recordar: en el listing público solo salen
  si hay contenido).
- Permite **activar módulos según la categoría** del negocio. Ejemplo del
  usuario: Barbería → módulo Servicios, módulo Tienda, etc.
- Dentro de cada módulo activado, el negocio **agrega sus productos o
  servicios** y **decide si vende en línea o es solo catálogo**.
- Consecuencia: la categoría define el **catálogo de módulos disponibles**
  (de `taxonomia-negocios.md`); el negocio elige cuáles activa; el listing
  público los muestra solo con contenido. Tres estados distintos:
  disponible / activado / con contenido.

- Nota del usuario: **lo mismo aplica al módulo Menú** — se activa desde
  Módulos según la categoría (comida), el negocio agrega sus platos ahí y
  decide si vende en línea o queda como catálogo. Ningún módulo tiene un
  camino de gestión propio: todos se administran igual dentro de la sección
  Módulos.

**3. User Management**
- Aquí se maneja todo lo relacionado con el usuario: **órdenes, pedidos,
  citas, tickets, reseñas, pagos** y todo lo relacionado con el cliente.
- Consecuencia: es la bandeja operativa del día del negocio; aplica el trío
  canónico (listado con filtros → detalle → acción) sobre cada tipo de objeto.

**4. Entrega — Shipping / Delivery / Pickup settings (declarado por el usuario)**
- Sección propia de configuración de entrega en el Dashboard.
- Comportamiento asumido (a validar): activar cada método por separado
  (shipping, delivery, pickup), zonas y radio de entrega en millas, costo
  (fijo, por milla, por zona, gratis desde un monto), mínimo de orden,
  tiempos de preparación y ventanas horarias, horario de entrega distinto al
  del negocio, instrucciones y punto de retiro, transportista y tarifas de
  envío, empaque y peso, y quién entrega (el propio negocio o repartidor de
  la plataforma).
- Consecuencia: la configuración de entrega es **transversal a Tienda, Menú y
  Renta** (no se configura tres veces); cada módulo la consume y solo hereda
  lo que aplica a su tipo de ítem.

**5. Moderadores del negocio (declarado por el usuario)**
- Algunos negocios **no los maneja el dueño** → el dashboard permite
  **agregar moderadores**.
- Los moderadores tienen **acceso por área**: unos solo manejan la página del
  listado, otros solo las órdenes, otros los settings, la entrega, etc.
- Consecuencia de arquitectura: hay **permisos por sección del dashboard**
  dentro de un mismo negocio (no es un rol único de "empleado"). Cada sección
  del dashboard debe declarar su permiso, y toda pantalla de gestión necesita
  su **estado "sin permiso"**.
- Comportamiento asumido (a validar): invitar por teléfono o correo, invitación
  pendiente / aceptada / revocada, quién invitó, último acceso, registro de
  actividad (quién cambió qué), y transferencia de propiedad del negocio.
- Nota: el moderador del negocio es **distinto** del moderador/soporte interno
  de To' Latino (rol 5 del bloque 1).

**6. Settings del negocio (declarado por el usuario)**
- Los settings necesarios para el listado, **incluyendo el sistema de pago
  tipo Stripe Connect**, etc.
- Consecuencia: el negocio tiene una **cuenta de cobro conectada** para tarjeta
  (onboarding de Stripe Connect: verificación de identidad/bancaria, estado
  pendiente vs habilitado, payouts).
- **Corrección del usuario (regla vigente):** no tener Stripe Connect
  habilitado **no bloquea vender ni agendar**. El negocio puede:
  - vender para **recoger y pagar en el local** (pickup / pago en tienda),
  - vender con **pago contra entrega** si así lo desea,
  - y en servicios, **apartar citas sin pagar en la plataforma**.
  Lo único que exige Stripe Connect es el **cobro con tarjeta dentro de la
  plataforma**. Consecuencia de diseño: cada ítem y cada cita declara su
  **forma de pago aceptada** (en línea / en el local / contra entrega / solo
  contacto), y el checkout tiene variante **sin pago en línea** que igual
  produce orden, confirmación y estado de la orden.
- Comportamiento asumido (a validar): datos del negocio y del dueño, cuenta
  bancaria y payouts, calendario de pagos y retenciones, impuestos y tarifas,
  propinas, política de cancelación y reembolso, plan Pro/Free y facturación
  de la suscripción, método de pago de la suscripción, notificaciones,
  idiomas de atención, zona horaria, privacidad y datos visibles, cerrar
  temporalmente el negocio, y borrar/transferir el negocio.

### Módulo 3 — Eventos (en detalle, según el usuario)

**Base del módulo (declarado por el usuario):** los latinos tienen muchos
eventos en **discotecas y bares** — **artistas en vivo, DJs, eventos
especiales**, etc. Esa es la base del módulo.

**Secundarios:** uno que otro evento fuera de ese circuito — en el **parque**,
de la **comunidad**, de **comida**, de **iglesias**, etc.

Consecuencia de diseño anotada: el patrón del evento nace pensado para la
noche (cartel/flyer del artista, fecha y hora, lugar, cover, edad mínima,
géneros musicales), y el mismo patrón sirve para eventos comunitarios,
religiosos y de comida con solo cambiar qué campos se muestran. El evento
tiene **dueño**: cuando lo publica un negocio, se refleja en la pestaña
Eventos de su listing (fuente única = módulo Eventos).

**Tipos de evento (declarado por el usuario):**
- **Gratuito para la comunidad** (sin ticket, solo asistencia/RSVP).
- **De pago con tickets**, y el control de entrada se hace **con una app para
  el check-in**.

Consecuencia de arquitectura anotada:
- El evento necesita **motor de ticketing**: tipos de boleto (general, VIP,
  mesa), precio, cupo por tipo, límite por persona, fechas de venta, cortesías,
  códigos de descuento, y estado agotado.
- El boleto es un objeto propio con **código único (QR)**, transferible o no,
  y su **estado**: válido / usado / anulado / reembolsado.
- **App/modo de check-in en la puerta**: escanear QR, búsqueda por nombre o
  teléfono, entrada manual, aforo en vivo, funcionamiento **sin conexión** y
  sincronización posterior, y **varios porteros al mismo tiempo** sin
  duplicar entradas.
- Permisos: el portero es un rol de acceso limitado (solo check-in de ese
  evento) → encaja en el sistema de moderadores por área del dashboard.
- El evento gratuito comparte el mismo patrón: RSVP en vez de boleto, y
  check-in opcional para medir asistencia real.

**Add-ons del evento (declarado por el usuario):**
- Algunos establecimientos requieren **servicios obligatorios o no** → el
  evento tiene **add-ons** para agregarlos.
- Ejemplos del usuario: una disco con un evento puede **vender las mesas
  disponibles**, o **paquetes de bebidas**, etc.
- Comportamiento anotado: cada add-on tiene precio, cupo/inventario propio,
  y bandera de **obligatorio vs opcional**; los obligatorios se suman al
  boleto y los opcionales se ofrecen en el checkout.
- Add-ons con **inventario limitado** (una mesa se vende una sola vez) → el
  add-on de tipo mesa se comporta como unidad reservable, no como cantidad
  libre; puede incluir **mapa/zona del local** (mesa VIP, pista, terraza) y
  mínimo de consumo.
- Consecuencia: el motor de add-ons y variantes es el **mismo** de Tienda/Menú
  (variantes + extras), reutilizado por el evento; no se diseña aparte.

**Alcance de pantallas del módulo Eventos (encargado por el usuario):**
- El usuario declara que **no conoce mucho de eventos**; se irán agregando
  cosas después. Por ahora queda encargado:
  - **Página de búsqueda de eventos** con su flujo (por ciudad, fecha,
    categoría de evento, género musical, gratis vs con boleto, esta noche /
    fin de semana).
  - **Single listing del evento** con todos los detalles: cartel, fecha y
    hora, lugar y mapa, negocio dueño, edad mínima, cover, **line up**
    (artistas y DJs con hora de presentación), galería, add-ons y
    disponibilidad, y eventos relacionados.
  - **Venta de tickets** y **proceso de pago** completo (carrito, checkout,
    tarjeta guardada, thank you, boleto con QR, estado de la orden) más la
    variante **sin pago en línea** (pagar en la puerta) coherente con la regla
    de formas de pago.
  - **Lo más importante: el manejo completo en el DASHBOARD** — crear y editar
    evento, tipos de boleto y cupos, add-ons e inventario de mesas, cortesías
    y códigos, line up, ventas y aforo en vivo, escaneo/porteros, asistentes,
    reembolsos y cancelación del evento, y métricas del evento.

### Cierre del alcance de la v1.0 (declarado por el usuario)
- La **v1.0** son los **3 módulos principales**: Community, Negocios, Eventos
  (con Gamification y Games dentro de Community, y el Dashboard como columna
  de gestión).
- Más módulos principales se agregarán **después** de la v1.0 → la navegación
  y el shell deben admitir módulos nuevos sin rediseñar nada.
- Siguiente tema declarado: "las otras cosas que adornan un ALL IN ONE
  platform" (en curso).

## Adornos del ALL IN ONE (en curso, el usuario está explicando)

### Dashboard del USUARIO (declarado por el usuario)

Distinto del Dashboard del negocio. El usuario maneja **cada aspecto de sus
movimientos**:
- **Órdenes** (pedidos, compras, rentas, boletos)
- **Posts** (lo que publicó en Community)
- **Reseñas** (las que escribió)
- **Direcciones**
- **Favoritos** (negocios, productos, eventos guardados)
- **Perfil**
- **Tarjetas** (métodos de pago guardados)
- **Gamification** (rango, puntos, insignias, tabla del barrio)
- **Games** (historial de partidas, monedas, torneos)
- etc.

Comportamiento asumido (a validar): citas del usuario y su estado, boletos con
QR, mensajes con negocios, notificaciones y preferencias, recomendaciones que
hizo y sus votos, referidos (si es promotor), historial de pagos y recibos,
reembolsos y disputas, monedas To' Latino y canjes de cupones, idioma y
ciudad, privacidad y datos, cuentas verificadas (teléfono/correo), y borrar
cuenta.

Consecuencia de arquitectura: **el Dashboard del usuario reutiliza el mismo
trío canónico** (listado con filtros → detalle → acción) del Dashboard del
negocio. Ambos nacen móviles; el de negocio solo es más denso.

### Shell de la app — Header (declarado por el usuario)

Se necesita un **header profesional** con: **logo**, **ciudad**,
**notificaciones**, **perfil**.

- Es el primer **patrón canónico** del sistema (shell); vive igual en los 3
  módulos y en los dos dashboards.
- **Ciudad en el header** es coherente con City Based: es el filtro de primer
  nivel de todo el contenido y debe poder cambiarse desde ahí.
- Composición móvil: logo compacto, selector de ciudad, campana de
  notificaciones con contador, avatar de perfil; búsqueda y navegación de
  módulos debajo o en la nav inferior.
- Composición desktop: la misma barra, con más ancho aparecen buscador
  central, los 3 módulos como navegación visible, selector de idioma y el
  botón de acción del negocio.
- Estados que necesita: sin sesión (invitado con "Entrar"), con sesión,
  ciudad no soportada todavía, sin notificaciones, y modo negocio vs modo
  cliente.

### Shell de la app — Footer (encargado al diseñador; propuesta pendiente de aprobación)

El usuario deja el footer a mi criterio, pidiendo que sea **bien profesional**.

Regla previa: en la **app móvil** el borde inferior lo ocupa la **navegación
inferior**, no un footer de enlaces. El footer completo es de la **web**
(y del final del scroll en móvil web). Nunca compiten en la misma vista.

**Propuesta de footer (web, 5 columnas en desktop → acordeón en móvil):**
1. **Explorar** — Community, Negocios, Eventos, categorías más buscadas de la
   ciudad activa, "Abierto ahora", "Esta noche".
2. **Para negocios** — Publica tu negocio gratis, Planes Pro, Cómo cobrar
   (tarjeta, en el local, contra entrega), Entrar al dashboard, Renta de silla
   o espacio, Publicar un evento, Vacantes.
3. **Comunidad** — Reglas del barrio, Rangos e insignias, Tabla del Barrio,
   El Patio (juegos), Torneos de la ciudad, Cómo funcionan los votos.
4. **Ciudades** — ciudad activa (Hazleton, PA), próximas ciudades, y
   **"Pide tu ciudad"** (lista de espera que alimenta la apertura de ciudad
   nueva y da dato real de demanda).
5. **Ayuda y confianza** — Centro de ayuda, Contacto y soporte, Cómo
   verificamos un negocio, Reportar un negocio o publicación, Seguridad,
   Preguntas frecuentes.

**Barra inferior del footer:** logo + frase de marca, selector de **idioma**
(ES/EN), selector de **ciudad**, descargas de App Store y Google Play, redes
sociales, y legal (Términos, Privacidad, Cookies, Accesibilidad) con el año.

**Detalles que lo hacen sentir profesional y no relleno:**
- El footer es **consciente de la ciudad**: los enlaces cambian según la
  ciudad activa; nunca muestra categorías vacías.
- **Nada de columnas muertas**: si una sección no tiene contenido en esa
  ciudad, no se imprime (misma regla que las pestañas del listing).
- Una sola línea de confianza visible: cuántos negocios verificados hay en la
  ciudad — prueba social real, no adorno.
- En móvil web: acordeones cerrados + los 4 enlaces más usados fuera del
  acordeón, para no obligar a abrir nada.
- Bilingüe con etiquetas de longitud variable ya previstas.

## Onboarding (declarado por el usuario — en curso)

### Onboarding de USUARIOS — reglas de acceso declaradas
- **Community y sus add-ons (Games, Gamification): solo usuarios registrados.**
  Nada de Community es visible/usable sin cuenta.
- **Negocios y Eventos: explorables por cualquiera** (usuario anónimo puede
  buscar, ver listings y ver eventos).
- **Para ordenar cualquier producto o servicio hay que estar registrado.**
  Los usuarios anónimos **no pueden** ordenar.

Consecuencias de diseño anotadas:
- Existe un **muro de registro** con tres comportamientos distintos:
  1. **Bloqueo total** (Community, Games, Gamification): se muestra qué hay
     detrás y se invita a entrar; nunca una pantalla vacía sin explicación.
  2. **Libre** (búsqueda de negocios y eventos, listings): sin sesión.
  3. **Bloqueo al final del flujo** (ordenar, reservar cita, comprar boleto,
     guardar favorito, escribir reseña, mensajear): el usuario **no pierde lo
     que llevaba** — se registra y **el flujo continúa donde iba**, con el
     carrito, la cita o el boleto intactos.
- Regla derivada: registrarse nunca es la primera pantalla de la app. El
  anónimo puede llegar hasta el borde de la acción y ahí decide.
- Cada pantalla del sistema declara su nivel: **público / requiere sesión /
  requiere rol**.

### Onboarding de USUARIOS — flujo declarado por el usuario
- Proceso de **varios pasos** para que el usuario **no se vea abrumado**.
- **Registro con teléfono + OTP** (más práctico que el correo).
- Pedir **datos básicos**, **foto de perfil**, etc.
- Luego **elegir ciudad**.
- **El usuario no puede cambiar de ciudad por 30 días.**
- Como se inicia en **Hazleton, PA**, la ciudad queda **bloqueada a Hazleton**
  por el momento.
- Pedirle sus **intereses**.
- Registrar.
- El usuario pide que consulte lo que falte y se agrega.

**Propuesta de pasos añadidos (APROBADA por el usuario):**
- **Idioma (ES/EN) como paso 0**, antes de pedir nada: define todo el resto.
- **Código de referido opcional** en el registro (alimenta el rol Promotor).
- Nombre y **"cómo te dicen"** (apodo mostrable, coherente con los rangos).
- **Foto de perfil saltable** con opción de volver luego (no frenar el registro).
- **Permiso de ubicación** pedido con motivo ("para mostrarte lo que está
  cerca"), no en seco.
- **Permiso de notificaciones** pedido **después** de la primera acción de
  valor, nunca en el paso 1.
- **Correo opcional** para recibos y recuperación (el teléfono manda).
- Términos y privacidad en lenguaje claro, en el idioma elegido.
- **Barra de progreso** y posibilidad de **retomar donde quedó** si se sale.
- Al terminar: mostrar de una vez la ciudad activa y **una acción concreta**
  (ver negocios abiertos ahora / entrar a Community), no una pantalla de éxito
  vacía.
- Estado a diseñar: **usuario fuera de Hazleton** que se registra → qué ve
  (lista de espera "Pide tu ciudad" + puede explorar Hazleton).

### Onboarding de NEGOCIOS (propuesta del diseñador, pendiente de aprobación)

**Especificación completa desarrollada en
[`onboarding-negocios.md`](onboarding-negocios.md)** (fases A–H, pantalla por
pantalla, Free/Pro por campo, conversión en los 30 días, casos borde, matriz
Free/Pro, principios de copy). Lo de abajo es el resumen previo; ante
diferencia, manda el archivo.

Encargo del usuario: onboarding con **mucha atención al detalle**, coherente
con todo lo explicado del listing y sus features, y que **durante el proceso
el negocio se sienta positivo de pagar el Pro**.

**Principio rector:** el Pro **no se explica, se prueba con el negocio del
propio dueño**. En vez de una tabla de precios, el negocio ve **su propia
tarjeta y su propia página** construyéndose en vivo, en versión Free y Pro,
con sus datos reales.

**Pasos (móvil primero, uno por pantalla, con progreso y retomar):**
1. **Entrada (declarada por el usuario):** *"Publica tu negocio gratis, sin
   importar el nivel de tu emprendimiento: si ya estás establecido, si estás
   iniciando, o si solo es un hobby."*
   **Regla:** NO se menciona "sin papeles" ni "sin empresa" en ninguna parte
   del onboarding — con ese mensaje ya se entiende.
2. **Identidad:** nombre del negocio, cómo lo conocen, teléfono ya verificado
   por OTP, ciudad (Hazleton).
3. **Tipo de operación** (define casi todo lo que sigue):
   - tengo local
   - voy a domicilio
   - ambos
   - **soy profesional que renta espacio en otro negocio** (silla, bahía,
     escritorio) → activa el modelo B de Staff.
4. **Categoría + hasta 3 subcategorías** (de `taxonomia-negocios.md`).
5. **Qué ofreces:** servicios / productos / renta / comida / eventos →
   el sistema **enciende los módulos sugeridos de tu rubro** y lo dice con
   palabras del rubro ("tu barbería usa Servicios, Citas y Staff").
6. **Tu primer ítem real** (1 servicio, 1 plato o 1 producto con precio) →
   el negocio **sale del onboarding con contenido**, nunca con una página
   vacía. Ahí mismo elige **catálogo o cobro en línea** para ese ítem.
7. **Cómo quieres cobrar:** en el local / contra entrega / tarjeta en línea.
   Stripe Connect se puede dejar para después — **no frena la publicación**.
8. **Datos base del listing** (los mismos campos de la cabecera Pro, para
   que el negocio se arme completo desde el primer día):
   - **Logo**
   - **Imagen featured / portada**
   - **Galería** de fotos del trabajo
   - **Dirección** (si tiene local) y cómo llegar
   - **Teléfono(s)** de contacto y WhatsApp si aplica
   - **Descripción "quiénes somos"**
   - **Amenities** del rubro
   - **Idiomas de atención**
   - **Redes sociales** si tiene
9. **Horario semanal** con plantillas rápidas ("de martes a sábado",
   **"solo fines de semana"** — el caso del que cocina sábado y domingo),
   días cerrados y feriados; alimenta el **horario dinámico** de la cabecera
   ("Abierto · cierra en una hora").
10. **Zona de servicio en millas** (solo si va a domicilio).
11. **Confianza:** teléfono verificado, correo opcional, y solicitud del
    **sello Verificado** (revisión manual → cola de moderación interna).
12. **Momento Pro:** comparación **en vivo, con su propio negocio**, Free vs
    Pro (tarjeta y página). Prueba de Pro con todo encendido; al terminar,
    **nada se borra**: se guarda y se apaga, mostrando qué queda dormido.
13. **Staff / invitaciones:** el local invita a sus profesionales; el
    profesional puede unirse a un local. Ambos caminos existen.
14. **Publicar** → cae en el dashboard con checklist de perfil y sus primeras
    métricas reales.

**Mecánicas de conversión a Pro (honestas, sin trucos):**
- **Vista previa lado a lado** de SU negocio en Free y en Pro.
- **Fuerza del perfil** (0–100) con lo que falta por completar.
- Dato real de la ciudad cuando exista ("en Hazleton se buscó 'barbería' N
  veces este mes").
- **Nada se borra al bajar a Free**: "tus 12 servicios siguen aquí, vuelven
  cuando actives Pro".
- **Rango del negocio** y checklist con progreso (gamification del lado
  comercial).
- **Trae otro negocio** → descuento (alimenta el rol Promotor).
- Precio siempre comparado con retorno: "una cita al mes paga el plan".
- **Nunca se piden papeles** ni empresa constituida (regla del bloque 1).

**Regla declarada — el formulario Pro es DINÁMICO (no un formulario plano):**
- Pro trae **formulario dinámico con buenas opciones**; Free trae la versión
  simple del mismo campo (mismo componente, capacidad distinta).
- Ejemplo declarado por el usuario, **Horario**:
  - **Pro:** varios horarios en un mismo día (ej. cierra al mediodía y
    reabre), horarios distintos por servicio/módulo, y **programar horarios
    venideros**: días feriados, vacaciones, eventos especiales, cierres
    temporales, con fecha de inicio y fin y aviso automático en el listing.
  - **Free:** un solo horario simple por día, sin programación futura.
- Consecuencia: cada campo del listing se declara con **dos capacidades**
  (Free / Pro) sobre el mismo componente, nunca dos formularios distintos.
  El bloqueo se muestra en su lugar, explicando qué desbloquea Pro.

### Dudas abiertas (se preguntan cuando el usuario termine de explicar)
- (Resueltas vía flujos-transversales.md aprobado: Relacionados = el negocio
  propone y el otro acepta + sugeridos automáticos; Trabajos = postulación
  dentro de la plataforma sin CV obligatorio.)
- (Resuelta: a las 24 h desaparece de Hoy en el barrio y queda en Novedades.)
- (Resueltas en la revisión aprobada: orden entre Pro → rotación diaria justa
  + relevancia/cercanía/calificación dentro de cada bloque; zonas → por
  ciudad con filtro "cerca de mí"; Free transacciona con techo.)
- (Resuelta: votos positivo y negativo.)

## ADMIN DASHBOARD — panel interno (declarado por el usuario como "el corazón del proyecto")

Encargo literal: manejar **de punta a punta todo el proyecto, sin dejar
absolutamente nada**. Especificación completa en
[`admin-dashboard.md`](admin-dashboard.md) (propuesta pendiente de
aprobación): principios, 17 secciones (`ADM-*`), colas de trabajo con SLA,
detalle 360° de usuario y negocio, catálogo editable (categorías, filtros,
módulos, matriz Free/Pro), contenido, eventos y boletos, transacciones,
planes, gamification, ciudades (wizard de apertura), crecimiento,
notificaciones, soporte, confianza y seguridad, analítica, CMS, sistema; 12
flujos críticos de punta a punta; estados; roles del equipo interno;
composición móvil vs desktop.

## Arquitectura de apps (declarada por el usuario)

Se diseñan **4 apps móviles** para gestionar servicios distintos por app:
1. **App del usuario** = la plataforma (Community, Negocios, Eventos +
   Dashboard del usuario).
2. **App de negocios** (Dashboard del negocio).
3. **App de delivery** (repartidor).
4. **App de check-in de eventos** (portero).

**Desktop:** plataforma, dashboard del negocio, admin dashboard y dashboard
del usuario. **Delivery y check-in son únicos en app** (sin desktop).

Regla: una sola cuenta To' Latino entra a todas; mismo sistema de diseño y
mismos patrones canónicos en las cinco superficies.

**Modelo de entrega (declarado por el usuario):** la mayoría de los negocios
latinos tiene **repartidores propios** → la app de delivery es primero para el
repartidor del negocio. El negocio puede además elegir **plataformas externas
(DoorDash, Uber Eats…)**. La **entrega por To' Latino** (repartidores de la
plataforma) se ofrecerá **más adelante, "cuando estemos bien"**; se diseña la
estructura desde ahora pero no se lanza en v1.0.

**Estructura de las apps de Delivery (`DLV`) y Check-in (`CHK`):**
[`apps-delivery-checkin.md`](apps-delivery-checkin.md) (propuesta pendiente de
aprobación). Incluye onboarding, pantallas, estados del pedido / del boleto,
modo sin conexión, varios porteros, venta en puerta, y el **espejo de
gestión** obligatorio en `DASH`, `ADM` y `USR` para cada una.

## Flujos transversales (declarado + desarrollado)

**Cambio de ciudad — reglas declaradas por el usuario:**
- El usuario **puede cambiar de ciudad sin problemas** para **buscar negocios
  o eventos**.
- Para el **stream de Community** hay **límite de 30 días**.
- Al **postear se publica su ciudad**.
- Si va a **otra ciudad a publicar**, lleva **badge "Invitado"** (o similar)
  **y de dónde viene**.
- Consecuencia: dos conceptos con nombre — **"Ciudad que estoy viendo"**
  (header, libre) y **"Mi ciudad"** (perfil/comunidad, cada 30 días).

**Flujos encargados por el usuario y desarrollados en
[`flujos-transversales.md`](flujos-transversales.md)** (propuesta pendiente de
aprobación): cambio de ciudad completo, notificaciones (centro, catálogo por
rol, canales, preferencias), direcciones para delivery, seguir usuarios, chats
privados (cliente↔negocio, usuario↔usuario, mesa de juego), requerimientos
adicionales de El Patio (economía, partida, social, seguridad), y otros que
faltaban (recuperar acceso, reportar, reseña, compartir, cupones, cotización,
lista de espera, trabajos, relacionados, modo negocio↔cliente, borrar cuenta,
accesibilidad). Cada uno con su espejo `USR` / `DASH` / `ADM`.

## Pantallas iniciales y arranque en frío (propuesta pendiente de aprobación)
Pregunta del usuario: qué pantallas iniciales (móvil y desktop) y qué hacer
cuando no hay negocios, usuarios ni eventos. Propuesta en
[`pantallas-iniciales.md`](pantallas-iniciales.md): la ciudad nunca se ve
vacía (negocios semilla "sin reclamar" importados antes de abrir, taxonomía,
cuenta oficial, eventos aliados), programa de lanzamiento (Fundadores de
Hazleton, Pro gratis 6 meses a los primeros 100 negocios, reclamo con datos
prellenados, QR en la calle), landing pre-lanzamiento, Home de invitado,
bienvenida post-onboarding, Home móvil y desktop (3 columnas), tabla de
estados vacíos canónicos, y orden de las primeras pantallas.

## Revisión estructural (opinión del diseñador, pendiente de decisión)
Ver [`revision-estructural.md`](revision-estructural.md): tensiones entre
reglas (A1–A9), riesgos de alcance (B1–B4), huecos por definir (C1–C7), orden
de diseño recomendado (D) y lo que no se cambiaría (E). Nada de ahí modifica
la memoria hasta que el usuario lo confirme.

## Decisiones cerradas de la revisión estructural (APROBADAS por el usuario)

Fuente: `revision-estructural.md`, aprobado íntegro. Resumen operativo:

**Modelo y reglas**
- Una sola regla geográfica: **por ciudad** en todo, "cerca de mí" como filtro.
- Roles simplificados (ver bloque 1). Panel interno (moderador/admin) **sí**
  se necesita en v1 y **falta describirlo** (C1).
- **Free transacciona con techo**; Pro = organización + visibilidad.
- **Comisión solo sobre pagos con tarjeta en la app**; en efectivo / local /
  contra entrega no hay comisión. **La suscripción Pro es el ingreso
  principal.** No se diseñan "tarifas de servicio" en pedidos en efectivo.
- Stripe Connect pedirá datos fiscales al negocio: copy honesto en Settings →
  Cobros ("Stripe te pedirá tus datos fiscales; mientras, sigue vendiendo en
  el local").
- Orden de resultados: Pro primero (regla del usuario) con **rotación diaria
  justa** entre Pro; dentro de cada bloque relevancia + cercanía + calificación.
- Paginación: 10 por página en ambos; desktop = números de página; móvil =
  "Página 2 de 7 · Siguiente" fijo abajo (misma estructura, otra forma).
- Rangos: todos publican desde el día 1; los rangos desbloquean lo avanzado.
- "History" → rótulo "Hoy en el barrio" / "Today nearby".
- Reseñas con staff que es su propio negocio: la reseña **pertenece al
  profesional** y se **agrega** en el local ("vía {Local}").
- Boleto "pagar en la puerta": reserva con **expiración** o **límite por
  evento**, configurable por el dueño del evento.
- Un dueño con varios negocios: **selector de negocio** en el header en modo
  negocio.

**Faseo (diseño completo, lanzamiento por fases)**
- **v1.0:** Negocios, Dashboard, Onboardings, Transacción y Citas, Community +
  Gamification, Eventos (búsqueda, listing, boletos, dashboard del evento,
  check-in en línea con varios porteros como "Modo puerta" dentro de la app
  del negocio), Panel interno mínimo.
- **v1.1:** El Patio (primero modo por turnos asincrónico, luego tiempo real),
  check-in sin conexión, Renta.
- Arranque en frío de Community: "Hoy en el barrio" y Novedades llenan el feed
  desde el día 1; cuenta oficial "To' Latino Hazleton" publica preguntas y
  encuestas semanales; recomendaciones sembradas desde reseñas.

**Sistema**
- **Nomenclatura de pantallas:** `ÁREA-MÓDULO-PANTALLA[-ESTADO]`. Áreas:
  `APP` (cliente), `DASH` (negocio), `USR` (dashboard usuario), `ADM`
  (interno), `ONB` (onboardings). Ej.: `APP-NEG-BUSQ`,
  `APP-NEG-LISTING-PRO`, `DASH-MOD-SERV-EDIT`, `ONB-NEG-B2`,
  `ADM-VERIF-COLA`. Cada pantalla declara además su **patrón canónico** y su
  **nivel de acceso** (público / sesión / rol).
- **Primer entregable de diseño = kit de ~18 patrones canónicos** (móvil +
  desktop): shell, tarjeta Pro/Free, listado paginado, filtros por familia,
  detalle con pestañas condicionales, trío del dashboard, wizard, sheet,
  estados (carga / vacío / error / sin permiso / bloqueado-Pro), muro de
  registro (3 variantes), voto, ítem con monetización, checkout con y sin
  pago, calendario de citas (persona / servicio), boleto QR, bloque de
  conversión a Pro.
- **Orden de diseño:** cimientos → Negocios (búsqueda, listing Pro, Free,
  tarjeta) → Onboarding de negocio + Dashboard → Transacción y Citas →
  Onboarding y Dashboard de usuario → Community (+Gamification) → Eventos →
  Panel interno → v1.1.
- Datos de ejemplo: reflejar Hazleton real (fuerte comunidad dominicana:
  comida, salones, iglesias, bodegas), no un latino genérico.


## Marca e integraciones (declarado por el usuario)

**Logo:** entregado por el usuario en `assets/logo-to-latino.svg` (símbolo
circular, 482×482, un solo path; color original `#FF2D6F` rosa). **El color
puede cambiarse libremente**: no hay colores definidos para la plataforma.
El wordmark "To' Latino" se propone al definir la dirección visual.

**Imágenes:** usar la **API de Pexels** para fotografía real (negocios,
comida, ciudad, eventos) en pantallas y datos de ejemplo.
- API Key (dato del usuario, uso interno del proyecto):
  `(clave retirada del repo — vive en las variables de entorno, nunca en git)`
- Búsquedas en inglés con sesgo latino (ej. "latin food", "barbershop",
  "dominican restaurant", "quinceañera", "auto mechanic garage").
- La URL de la foto va **literal** en el `src` (`https://images.pexels.com/...`),
  nunca un valor dinámico: el navegador pide la cadena sin resolver.


## CIERRE DEL DESCUBRIMIENTO — decisiones finales (formulario respondido por el usuario)

**Aprobado tal cual (ya no es propuesta, es regla):** Gamification (10 rangos),
Games / El Patio, tarjeta Free vs Pro (reparto de info), añadidos al Resumen
del listing, footer, `onboarding-negocios.md`, `admin-dashboard.md`,
`apps-delivery-checkin.md`, `flujos-transversales.md`,
`pantallas-iniciales.md` (con la corrección de semilla de abajo).

**Decisiones:**
- **Votos en Community: positivo y negativo.**
- **Novedad del negocio a las 24 h:** desaparece de "Hoy en el barrio" y queda
  solo en la pestaña Novedades del negocio.
- **El Patio entra en el lanzamiento de Hazleton**, en modo asincrónico
  primero (tiempo real después). **Sin límite de edad.**
- **Chat entre usuarios: solo entre seguidores** (mutuo o al menos que el
  receptor siga al emisor — se implementa como: puedes escribir a quien te
  sigue; si no te sigue, no hay chat). Cliente↔negocio sin restricción.
- **Repartidores: nunca se pide licencia**; el negocio es responsable de su
  repartidor. (Coherente con "nunca papeles".)
- **Venta de boletos en la puerta: no existe en v1.** El check-in solo valida.
- **Negocios semilla: NO.** Solo negocios que se registran por sí mismos. La
  estrategia de arranque en frío se apoya en: reclutamiento previo al
  lanzamiento (landing con acceso anticipado, QR en la calle, salida a
  reclutar), categorías con "Sé el primero", cuenta oficial y eventos
  aliados. `pantallas-iniciales.md` corregido.
- **Programa Fundadores: solo insignia** (primeros usuarios y negocios), sin
  Pro gratis extendido; la prueba Pro es la estándar de 30 días.
- **Código existente:** no se conectó repositorio → se diseña desde cero.
- **Dirección visual: NO decidida.** Ver la sección "Dirección visual:
  abierta" al final de este archivo.

**Pendiente del bloque 1 (tono — "qué debe sentir el latino"):** sin
responder; se retomará al revisar los diseños previos.

## Bloques cerrados
- Bloque 1 — Qué es y para quién (cerrado, salvo categorías que pasan al bloque 2)


## Dirección visual: ABIERTA (decisión pendiente del usuario)

**Estado declarado por el usuario:** *"no quiero el mismo sistema de diseño,
solo quiero el plan que creamos, no me gusta este diseño."*

Consecuencia: de este plan se conserva **todo lo estructural** (reglas,
módulos, flujos, taxonomía, dashboards, patrones, prototipo navegable) y
**nada de lo visual**. Quedan explícitamente **sin definir**:
- paleta de color (clara, oscura, acentos por módulo),
- tipografía,
- forma (radios, sombras, densidad),
- iconografía e ilustración,
- wordmark y aplicación del logo.

**Lo único que sobrevive del apartado visual** son dos activos, no un estilo:
- el **logo** en `assets/` (color libre),
- la **clave de Pexels** para fotografía real.

**Regla que sí se mantiene, sea cual sea el estilo elegido:** debe existir una
**sola fuente de verdad visual** definida ANTES de la primera pantalla, con
sus patrones canónicos declarados una vez y reutilizados; y cada patrón debe
declarar su composición móvil y su transformación a escritorio. Sin eso, la
base se pierde a lo largo de +5.000 pantallas.

**Primer paso en el proyecto nuevo:** decidir la dirección visual (referencias,
sistema de diseño adjunto, o exploración desde cero) y solo entonces construir
`APP-HOME`.

## Pendiente inmediato
1. **Decidir la dirección visual** (ver arriba). Nada se diseña antes.
2. Construir el **shell del prototipo** + `APP-HOME` y crecer hacia afuera
   siguiendo el recorrido real del usuario, con la pantalla de encargo y la
   cola `PROTO-COLA` para todo destino que aún no exista.
