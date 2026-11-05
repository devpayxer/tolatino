# To' Latino — Pantallas iniciales y arranque en frío

Estado: **APROBADO por el usuario**, con una corrección: **NO hay negocios
semilla** (decisión final del usuario: solo negocios que se registran por sí
mismos) y **Fundadores = solo insignia** (sin Pro gratis extendido). Las
menciones a "semilla / sin reclamar / Pro 6 meses" quedan **anuladas**; el
arranque en frío se apoya en el **reclutamiento previo al lanzamiento**:
- Landing pre-lanzamiento con **acceso anticipado para negocios** (publican
  antes de que abra la ciudad; su página queda lista para el día 0).
- **Salida a la calle** del equipo: visitar negocios latinos de Hazleton con
  QR "Publica tu negocio gratis" que abre el onboarding.
- Meta de apertura: no abrir la ciudad al público hasta tener un mínimo de
  negocios publicados por categoría clave (comida, belleza, hogar, fiestas,
  iglesias). El umbral lo define el usuario (`ADM-CIUD` → checklist).
- En la app: categorías siempre visibles; las vacías muestran "Aún no hay
  {categoría} en Hazleton · ¿Conoces uno? Invítalo" y alimentan
  "Búsquedas sin oferta".
- Contadores de negocios solo se muestran cuando superan un umbral.
Pregunta del usuario: qué pantallas iniciales (móvil y desktop) y qué hacer
con los nuevos usuarios cuando **todavía no hay negocios, ni usuarios, ni
eventos**.

---

## 1. Principio: la ciudad nunca se ve vacía

Un directorio vacío mata la plataforma el primer día. La regla de diseño es
que **ninguna pantalla inicial dependa de contenido generado por usuarios
para verse llena y útil**. Se logra con cuatro fuentes que existen desde el
día 0:

1. **Negocios semilla ("no reclamados")** — antes de abrir Hazleton, el
   equipo importa desde fuentes públicas (Google Maps, Facebook, Instagram,
   caminar la ciudad) los negocios latinos reales: nombre, categoría,
   dirección, teléfono, horario, 1 foto. Aparecen como tarjeta **Free con
   etiqueta "Sin reclamar"** y botón **"¿Es tu negocio? Reclámalo gratis"**.
   El directorio nace con 200–400 negocios reales y la búsqueda por
   categoría funciona desde el minuto uno. (Ya previsto en `ADM-MKT` →
   Importación de negocios y `ADM-NEG` → Reclamar negocio.)
2. **La taxonomía** — las 17 categorías y subcategorías siempre existen; el
   home se organiza por categorías, no por "populares".
3. **La cuenta oficial "To' Latino Hazleton"** — publica en Community desde el
   día 0: bienvenida, pregunta de la semana, encuesta, "¿quién conoce un buen
   sastre?", avisos de la ciudad. Community nunca abre en blanco.
4. **Eventos de la ciudad** — antes del lanzamiento se cierran 2–3
   discotecas/bares aliados con evento publicado, y se cargan eventos
   públicos (iglesias, parque, ferias) como "evento de la comunidad" con
   fuente citada.

Regla de estados vacíos: **todo vacío es una invitación con acción y con
recompensa** ("Sé el primero en recomendar un negocio · +50 puntos"), nunca
un texto gris.

---

## 2. Programa de lanzamiento (para que vengan y se queden)

- **Fundadores de Hazleton**: insignia permanente para los primeros 500
  usuarios y los primeros 100 negocios. Se muestra en el perfil y en la
  tarjeta del negocio. (Gamification → insignia especial; `ADM-GAM`.)
- **Pro gratis 6 meses** para los primeros 100 negocios que reclamen o
  publiquen (en vez de los 30 días estándar). El negocio construye con Pro
  desde el inicio y la ciudad se ve "Pro" desde el día 1. (`ADM-PLAN` →
  cortesías por ciudad.)
- **Reclamar = registro completo**: el flujo de reclamo entra directo al
  onboarding de negocio con todo prellenado (nombre, dirección, horario,
  foto); solo confirma y agrega su primer ítem.
- **Referidos con recompensa doble**: el que trae y el que llega ganan
  monedas; el negocio que trae otro negocio, un mes de Pro extra.
- **Salida a la calle**: QR impresos por negocio ("Escanea y reclama tu
  página en To' Latino") que abre directo su ficha semilla. Se generan desde
  `ADM-MKT` → Enlaces y QR.
- **Semana 1 con contenido programado**: cuenta oficial con un post/encuesta
  al día; torneo inaugural de dominó (El Patio, si está en v1; si no, sorteo
  de cupones por participar en Community).
- **Métrica de "ciudad viva"** en `ADM-HOME`: % de negocios semilla
  reclamados, posts/día, recomendaciones, usuarios activos.

---

## 3. Pantallas iniciales

### 3.1 Antes de abrir — Landing pre-lanzamiento (web, desktop + móvil web)
`APP-LANDING-PRE`
- Titular: qué es To' Latino, para Hazleton, en ES con toggle EN.
- Dos caminos: **"Soy vecino"** → lista de espera con teléfono (se convierte
  en registro al abrir) · **"Tengo un negocio"** → reclama/publica ya
  (acceso anticipado con Pro gratis 6 meses).
- Mapa o grid de categorías con contadores reales de negocios semilla
  ("48 restaurantes · 23 salones · 15 iglesias…") → demuestra que la ciudad
  ya está ahí.
- "Pide tu ciudad" para quien no es de Hazleton.
- Footer completo (ya propuesto).

### 3.2 Primera apertura de la app (usuario nuevo, sin sesión)
`APP-INICIO-INVITADO`
No se pide registro. El invitado cae en el **Home de la ciudad** con:
- Header: logo · **Hazleton, PA** · campana (desactivada) · **Entrar**.
- Buscador grande: "¿Qué necesitas hoy?" con sugerencias del rubro real.
- **Grid de categorías** (17) con contadores.
- **Abierto ahora** (negocios semilla con horario) — funciona desde el día 0.
- **Hoy en el barrio** → mientras no haya novedades de negocios: bloque
  **"Nuevos en el barrio"** (negocios recién reclamados/publicados) y
  **"Reclama tu negocio"**.
- **Vecinos recomiendan** → si no hay: "Sé el primero en recomendar a tu
  barbero, tu sastre, tu cocinera favorita · +50 puntos" → lleva a Entrar.
- **Eventos** de la semana (aliados + comunitarios).
- **Community** en modo vitrina: se ven 3 posts de la cuenta oficial
  difuminados/parciales con "Entra para participar" (bloqueo total con
  contexto, según regla de acceso).
- **Para negocios**: tarjeta fija "Publica tu negocio gratis · Fundadores de
  Hazleton: Pro gratis 6 meses".
- Nav inferior: **Inicio · Negocios · Community · Eventos · Yo** (Community y
  Yo abren el muro de registro con contexto).

### 3.3 Después del onboarding de usuario
`APP-INICIO-BIENVENIDA` (una sola vez)
- "Bienvenido a Hazleton, {apodo}. Eres Fundador #{n}." con insignia.
- Tres acciones concretas, según los intereses que marcó: "Ver {categoría}
  abiertos ahora" · "Recomienda un negocio (+50)" · "Únete a la conversación
  de la semana".
- Luego, el Home normal con sesión: igual al de invitado pero con
  notificaciones, "Siguiendo", su rango y monedas, y Community abierto.

### 3.4 Home con sesión (mobile) — orden de bloques
1. Header (logo, ciudad, campana, avatar)
2. Buscador
3. Categorías (fila deslizable + "Ver todas")
4. Hoy en el barrio / Nuevos en el barrio
5. Abierto ahora cerca de ti
6. Vecinos recomiendan (top de la semana)
7. Eventos (esta noche / fin de semana)
8. Community: pregunta de la semana + 2 posts más votados
9. El Patio: "te toca" / torneo de la semana (si aplica)
10. Para negocios (si no tiene negocio) / Resumen de mi negocio (si tiene)

### 3.5 Home desktop (composición 100% desktop, misma estructura)
- Header completo: logo · ciudad · buscador central · **Negocios · Community
  · Eventos** · idioma · campana · avatar · botón "Publica tu negocio".
- **Tres columnas**:
  - Izquierda (fija): categorías completas con contadores + filtros rápidos
    (Abierto ahora, Verificados, A domicilio).
  - Centro (scroll): Hoy en el barrio → Abierto ahora (grid de tarjetas, 3
    por fila) → Vecinos recomiendan → Community (pregunta de la semana y
    posts) → Eventos.
  - Derecha (contexto): mapa de la ciudad con pines de negocios abiertos, mi
    rango y monedas, torneo de la semana, tarjeta "Publica tu negocio".
- Al angostarse: derecha → se vuelve bloques dentro del centro; izquierda →
  fila deslizable de categorías; header → nav inferior. Misma estructura y
  nombres.

### 3.6 Estados vacíos canónicos del arranque (móvil y desktop)
| Bloque | Vacío del día 0 | Acción |
|---|---|---|
| Hoy en el barrio | "Nuevos en el barrio" (semilla reclamada) | Reclama tu negocio |
| Vecinos recomiendan | "Sé el primero en recomendar" | Recomendar (+50) |
| Eventos | Aliados + comunitarios; si nada: "Publica el primer evento" | Publicar evento |
| Community | Posts de la cuenta oficial | Responder la pregunta de la semana |
| Reseñas de un negocio | "Aún sin reseñas · ¿Ya fuiste? Cuéntanos" | Escribir reseña |
| El Patio | Mesas gratis + torneo inaugural | Jugar |
| Búsqueda sin resultados | "No hay {subcategoría} en Hazleton todavía" | "Avísame cuando haya" + "¿Conoces uno? Recomiéndalo" |

La búsqueda sin resultados alimenta `ADM-ANALIT` → "Búsquedas sin oferta"
(lista para salir a reclutar negocios).

---

## 4. Orden de las primeras pantallas a diseñar (cimientos incluidos)
1. Kit de patrones canónicos (aprobado como primer entregable).
2. `APP-INICIO-INVITADO` móvil + desktop (Home de ciudad, día 0).
3. `APP-NEG-BUSQ` (categorías → subcategorías → filtros → resultados
   paginados) con negocios semilla.
4. `APP-NEG-LISTING-FREE` con etiqueta "Sin reclamar" y `APP-NEG-LISTING-PRO`.
5. Onboarding de negocio (con la variante **Reclamar**) y de usuario.
6. `APP-LANDING-PRE`.
7. Dashboard del negocio y Admin (colas de verificación y reclamo primero).

---

## Dudas para el formulario final (añadidas)
- ¿Aprobamos los negocios semilla "sin reclamar" (con datos públicos) o solo
  negocios que se registran por sí mismos?
- Fundadores: ¿500 usuarios / 100 negocios y Pro gratis 6 meses, u otros
  números?
- ¿El Patio entra en el lanzamiento de Hazleton (modo asincrónico) o en v1.1?
