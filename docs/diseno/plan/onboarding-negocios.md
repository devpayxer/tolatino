# To' Latino — Onboarding de Negocios (especificación)

Estado: **APROBADO por el usuario**.
Obedece a todo lo anotado en `CLAUDE.md`: mobile-first, City Based, Pro/Free
sobre el mismo componente, módulos por categoría, staff que renta espacio,
formas de pago sin exigir Stripe, y nunca pedir papeles.

Objetivo declarado por el usuario: que se vea **profesional** y que el negocio
**pase a Pro sin pensarlo**.

---

## 0. Las 6 decisiones que hacen que funcione

1. **Se construye con Pro encendido.** Desde el paso 4 el negocio arma su
   página con las herramientas Pro (prueba gratis de 30 días, sin tarjeta).
   Nunca ve primero una versión pobre y luego "la buena": ve la buena y, al
   final, decide si la conserva. Lo que ya es suyo cuesta soltarlo.
2. **Su negocio es la demo.** No hay tabla de precios genérica. La comparación
   Free vs Pro se hace con **su** tarjeta, **su** página y **sus** datos.
3. **Publica en 4 minutos, completa después.** Solo 6 pantallas son
   obligatorias para publicar. Todo lo demás es "Fuerza del perfil" en el
   dashboard. Un negocio que publica rápido vuelve; uno que abandona no.
4. **Una decisión por pantalla.** Pulgar, sin teclado cuando se pueda
   (chips, toggles, plantillas). El teclado solo aparece para nombre,
   precio y descripción.
5. **La categoría manda.** Elegir rubro reordena todo lo que sigue: módulos,
   campos, rótulos, plantillas de horario, ejemplos en los placeholders.
6. **Nada se borra nunca.** Si al terminar la prueba no paga, su contenido
   Pro queda **dormido**, no eliminado. El día que active Pro, todo vuelve.

Métrica de éxito del onboarding: % que publica, tiempo hasta publicar,
% que activa Pro en el día 0, % que convierte al día 30, y "Fuerza del
perfil" promedio a los 7 días.

---

## 1. Mapa del flujo

```
FASE A · ENTRAR          FASE B · QUIÉN ERES         FASE C · QUÉ OFRECES
A1 Portada               B1 Nombre                   C1 Módulos de tu rubro
A2 Idioma (si no hay)    B2 Tipo de operación        C2 Tu primer ítem
A3 Teléfono + OTP        B3 Categoría                C3 Cómo cobras
   (si no hay sesión)    B4 Subcategorías (≤3)
                         B5 ¿Te unes a un local?  ← solo si "rento espacio"

FASE D · CÓMO TE ENCUENTRAN     FASE E · CONFIANZA      FASE F · TU EQUIPO
D1 Logo + portada                E1 Verificación         F1 Staff / invitar
D2 Dirección o zona              E2 Sello Verificado        (solo si aplica)
D3 Horario
D4 Quiénes somos + amenities
D5 Galería

FASE G · TU PÁGINA              FASE H · PUBLICAR
G1 Vista previa en vivo          H1 ¡Publicado! + acción
G2 Elige cómo seguir (plan)      H2 Dashboard con checklist
```

**Obligatorias para publicar:** B1, B2, B3, C2 (1 ítem), D1 (al menos
portada), D3 (horario). Todo lo demás es saltable con "Después".
Barra superior: progreso por fases (A–H) + "Guardado" automático. Si sale,
al volver retoma exactamente donde quedó (también desde otro dispositivo).

---

## 2. Pantalla por pantalla

Formato: **Objetivo · Campos · Free / Pro · Reglas · Copy (ES; todo
traducible a EN)**.

### FASE A — Entrar

**A1 · Portada**
- Objetivo: que cualquier negocio, del nivel que sea, sienta que es para él.
- Titular (declarado por el usuario): *"Publica tu negocio gratis, sin
  importar el nivel de tu emprendimiento: si ya estás establecido, si estás
  iniciando, o si solo es un hobby."*
- Debajo, 3 líneas de valor con ícono, no párrafos: "Te encuentran en
  Hazleton" · "Recibes pedidos y citas sin llamadas" · "Publicas en 4 minutos".
- Botón principal: **Empezar**. Secundario: "Ya tengo cuenta".
- Prueba social real cuando exista: "N negocios ya están en Hazleton".
- Regla: **no** se menciona "sin papeles" ni "sin empresa".

**A2 · Idioma** — solo si no viene de una cuenta con idioma elegido.
ES / EN en dos tarjetas grandes. Todo lo que sigue respeta la elección.

**A3 · Teléfono + OTP** — solo si no hay sesión.
- Un campo, prefijo +1, código de 6 dígitos con autocompletar.
- Reglas: reenviar a los 30 s; máximo 5 intentos; error en lenguaje claro.
- Si el usuario ya es cliente de To' Latino: se salta y muestra
  "Vas a crear un negocio con la cuenta de {nombre}. ¿Correcto?" → así una
  sola cuenta tiene rol cliente + negocio (evita cuentas duplicadas).

### FASE B — Quién eres

**B1 · Nombre del negocio**
- Campos: Nombre público · "¿Cómo te conoce la gente?" (apodo opcional,
  ej. "Doña Mary", "El Flaco") · Ciudad (fija: Hazleton, PA — con texto
  "Pronto más ciudades").
- Validación: nombre 2–60 caracteres; aviso amable si ya existe uno igual en
  la ciudad ("Ya hay un negocio con este nombre en Hazleton. Si es tuyo,
  recupéralo aquí").
- Debajo del campo, **la tarjeta del negocio empieza a dibujarse en vivo**
  con el nombre — es la primera vez que ve "su" tarjeta. Esta tarjeta
  acompaña todo el flujo (fija arriba, compacta).

**B2 · Tipo de operación** (la bisagra del flujo)
Cuatro tarjetas grandes, una elección:
1. **Tengo local** — la gente viene a mí.
2. **Voy a domicilio** — yo voy a la gente.
3. **Ambos**.
4. **Trabajo en el local de otro negocio** — rento silla, bahía, escritorio,
   estación.
- Efectos: (1) pide dirección; (2) pide zona en millas; (3) ambas;
  (4) activa **B5** y el modelo B de Staff; su calendario será el propio.
- Copy de apoyo bajo (4): "Tendrás tu propia página, tus reseñas y tu agenda.
  El local podrá agregarte a su equipo."

**B3 · Categoría** — grid de las 17 categorías (icono + nombre bilingüe).
Buscador arriba ("¿Qué haces? ej. uñas, tacos, plomería") que busca en
subcategorías y salta directo a la categoría correcta.

**B4 · Subcategorías** — chips de la categoría elegida, hasta 3
(`taxonomia-negocios.md`). Contador "2 de 3". Sugerencias primero según lo
que escribió en el buscador.
- Efecto inmediato visible: la tarjeta en vivo muestra la categoría y las
  subcategorías; el sistema ya sabe qué **familia de filtros** y qué
  **módulos** le corresponden.

**B5 · ¿Te unes a un local?** — solo si B2 = (4).
- Buscar el negocio por nombre en Hazleton → "Solicitar unirme al equipo de
  {Barbería X}". Si no está en la plataforma: "Invítalo" (link por WhatsApp/
  SMS) o "Después".
- Estado resultante: solicitud pendiente; el local aprueba desde su dashboard.
  Mientras, el profesional publica su página normal.

### FASE C — Qué ofreces

**C1 · Módulos de tu rubro**
- Se muestran **ya encendidos** los módulos que la categoría trae por
  defecto, con el **rótulo del rubro** (Barbería: "Servicios · Citas ·
  Staff · Tienda"; Restaurante: "Menú · Pedidos · Eventos"; Fiestas: "Renta
  de equipo · Paquetes · Reservaciones").
- Puede apagar los que no use; los no incluidos aparecen debajo como
  "Otros módulos que puedes activar".
- Etiqueta discreta: **"Estás construyendo con Pro · 30 días gratis"** —
  primera aparición de Pro, sin pedir nada.
- Free: solo permite lo que la página Free puede mostrar (ítems mezclados en
  una sola página, sin pestañas). El bloqueo se explica en el lugar.

**C2 · Tu primer ítem** (obligatorio, solo uno)
- Formulario según módulo: servicio (nombre, precio o "desde", duración),
  plato (nombre, precio, foto), producto (nombre, precio, foto), artículo
  de renta (nombre, precio por día, cantidad).
- Placeholders en las palabras del rubro ("Corte clásico · $20 · 30 min",
  "Pernil por libra · $9").
- Toggle **"¿Cómo lo vendes?"**: *Solo mostrar (catálogo)* / *Se puede pedir
  o reservar*. Explicación de una línea para cada uno.
- Al guardar: la tarjeta en vivo muestra "desde $20" y el ítem aparece en la
  vista previa. Botón: "Agregar otro" (opcional) / "Continuar".
- Regla: nunca sale del onboarding con página vacía.

**C3 · Cómo cobras**
- Chips multi-selección: **En el local** · **Contra entrega** · **Tarjeta en
  la app** · **Solo por contacto**.
- Si marca "Tarjeta en la app": "Conectaremos tu cuenta de cobros después,
  desde tu panel. Mientras, puedes recibir pedidos y cobrar en persona."
  → **Stripe Connect no frena la publicación** (regla del usuario).
- Free / Pro: igual en ambos (regla: la forma de pago no es feature Pro).

### FASE D — Cómo te encuentran

**D1 · Logo y portada**
- Dos slots: **Logo** (cuadrado) y **Imagen featured / portada** (ancha).
- Si no tiene logo: "Usa tu inicial" genera un monograma temporal con el
  nombre (no es un hueco).
- Si no tiene portada: sugiere "una foto de tu trabajo vale más que un logo"
  y ofrece la cámara directo.
- Obligatorio: al menos portada.

**D2 · Dirección o zona** (según B2)
- Con local: dirección con autocompletar, pin ajustable en mapa, "Cómo
  llegar / referencias" (ej. "al lado de la lavandería").
- A domicilio: **zona de servicio en millas** con slider (5 · 10 · 15 · 30)
  y círculo en el mapa; opción "también atiendo fuera con recargo".
- Ambos: los dos bloques.
- Teléfono público (prellenado con el verificado, editable) + WhatsApp
  toggle.

**D3 · Horario** (obligatorio) — el ejemplo del usuario de formulario dinámico
- **Plantillas rápidas** primero: "Lun–Vie 9–6" · "Mar–Sáb" · "Solo fines de
  semana" · "Todos los días" · "Por cita" · "Personalizar".
- Editor por día con toggles y horas.
- **Pro (activo en la prueba):**
  - varios tramos por día (cierra y reabre),
  - horario distinto por módulo (ej. Menú de desayuno vs cena),
  - **horarios programados**: feriados, vacaciones, eventos especiales,
    cierres temporales, con fecha inicio–fin y aviso automático en el listing,
  - "abro por temporada".
- **Free:** un tramo por día, sin programación futura. El botón "Programar
  feriados y vacaciones" aparece con candado y una línea: "Con Pro".
- Vista previa: en la tarjeta en vivo aparece el **estado dinámico**
  ("Abierto · cierra en 1 h").

**D4 · Quiénes somos + amenities**
- Descripción 300 caracteres con 3 arranques sugeridos por rubro ("Llevo N
  años…", "Somos una familia…", "Especialistas en…").
- **Amenities** como chips de la categoría (estacionamiento, Wi-Fi, acepta
  tarjeta, kids friendly, accesible, bilingüe, se habla inglés…).
- Idiomas de atención (chips ES / EN / otros).
- Redes sociales (opcional).

**D5 · Galería** — hasta 6 en Free, ilimitada en Pro; sube varias de una
vez; reordenar arrastrando. Saltable.

### FASE E — Confianza

**E1 · Verificación**
- Teléfono ✓ (ya). Correo opcional ("para recibos y recuperar tu cuenta").
- Barra "Nivel de confianza" que sube con cada verificación.

**E2 · Sello "Verificado por To' Latino"**
- Explicación en 3 líneas de qué revisa el equipo (que el negocio existe,
  que la persona lo representa, que la información coincide).
- "Solicitar sello" → estado *En revisión* visible en su tarjeta ("Pendiente
  de verificación"). Nunca pide documentos de identidad ni papeles.
- Cola de moderación del equipo interno.

### FASE F — Tu equipo (condicional)

**F1 · Staff**
- Aparece si la categoría es de servicio o si B2 ≠ (4).
- "¿Trabajas con más personas?" → **Agregar a mi equipo**:
  - *Empleado*: nombre, foto, servicios que hace, horario. Su agenda la
    maneja el negocio.
  - *Renta espacio conmigo*: invitar por teléfono → el profesional crea su
    propia página; al aceptar queda vinculado y **su agenda es la suya**,
    sincronizada.
- Cada persona agregada aparece en la vista previa (módulo Staff).
- Free: hasta 1 persona visible. Pro: ilimitado + reservas por persona.

### FASE G — Tu página

**G1 · Vista previa en vivo** (el momento clave)
- Pantalla completa de **su página**, tal como la verá un cliente, con el
  interruptor arriba: **Free | Pro**.
- Al tocar **Free**, se ve **su misma página** perdiendo cosas en tiempo real:
  desaparecen las pestañas, los módulos se mezclan en una sola página, el
  horario programado se apaga, la galería se recorta, el staff se reduce, el
  sello y "Vecinos recomiendan" pierden protagonismo, y la tarjeta baja del
  bloque destacado de resultados al bloque general.
- Al tocar **Pro**, vuelve todo. Sin texto de venta: la diferencia se ve.
- Debajo, **una sola línea por cada cosa que Pro le da a su negocio en
  concreto** (no genérica): "Tus 3 servicios con cita en línea" · "Aparecer
  antes que N negocios Free de {categoría} en Hazleton" · "Horario de
  feriados programado" · "Responder reseñas".

**G2 · Elige cómo seguir**
Dos tarjetas, Pro primero y preseleccionada:
- **Pro — 30 días gratis, luego $X/mes.** "Sin tarjeta hoy. Te avisamos 5
  días antes. Si no sigues, tu contenido no se borra: se guarda."
  Opción anual con ahorro visible. Código de promotor aplicable aquí.
- **Free — publicar con lo básico.** Enumera con honestidad lo que quedará
  dormido, en sus propios números ("2 de tus 3 servicios no podrán
  reservarse en línea").
- Regla de tono: nunca insultar al que elige Free. Botón Free tan claro como
  el Pro; sin "¿Seguro que quieres perder…?" agresivos.
- Comparación completa Free/Pro disponible en un desplegable, no forzada.

### FASE H — Publicar

**H1 · ¡Publicado!**
- Confirmación con su tarjeta real y **una acción concreta**, no una pantalla
  vacía: "Compartir mi página" (WhatsApp/link) · "Ver mi página como
  cliente" · "Ir a mi panel".
- Si eligió Pro: "Tu prueba termina el {fecha}".
- Si pidió sello: "Revisaremos tu negocio en ~48 h".

**H2 · Dashboard con checklist — "Fuerza del perfil"**
- Anillo 0–100 con los pendientes ordenados por impacto: agregar 2 ítems
  más, galería, quiénes somos, staff, conectar cobros con tarjeta, pedir
  primera reseña.
- Cada tarea dice **qué gana** ("los negocios con 5+ fotos reciben 3× más
  contactos").

---

## 3. Conversión después del día 0 (los 30 días de prueba)

Los momentos donde Pro se ofrece **porque acaba de dar valor**, nunca al azar:
1. **Primera cita aprobada / primer pedido** → "Esto pasó gracias a Pro.
   Sigue así por $X/mes".
2. **Primera reseña** → "Respóndela (Pro)".
3. Día 20: resumen real de lo logrado con Pro (vistas, contactos, pedidos).
4. Día 25: aviso de fin de prueba + qué quedará dormido, con sus números.
5. Fin de prueba sin pago: la página **baja a Free sin perder nada**; en el
   dashboard queda un bloque fijo "Tu contenido Pro está guardado: 3
   servicios, 8 fotos, 2 personas del equipo. Reactívalo cuando quieras".
6. Promotor / referido: "Trae otro negocio y ambos tienen un mes gratis".

---

## 4. Estados y casos borde que el diseño debe cubrir
- Sin conexión a mitad del flujo → guardado local y aviso; retoma.
- Nombre duplicado en la ciudad → recuperar o diferenciar.
- Ciudad del dispositivo ≠ Hazleton → puede publicar en Hazleton si atiende
  ahí; si no, lista de espera "Pide tu ciudad".
- Categoría equivocada → se puede cambiar desde el panel (con aviso de que
  cambian los módulos).
- Profesional que renta espacio y el local no está en la plataforma →
  invitar / después.
- Negocio establecido con mucha información → **importar desde su link**
  (Google Maps / Instagram / Facebook) para prellenar nombre, dirección,
  horario y fotos (integración a validar en el bloque 5).
- Fotos rechazadas por moderación → aviso y reemplazo.
- Solicitud de sello rechazada → motivo claro y cómo corregir.
- Prueba Pro terminada → contenido dormido, nunca borrado.
- Un mismo dueño con varios negocios → selector de negocio en el panel.

---

## 5. Matriz Free / Pro (resumen para diseño)

| Área | Free | Pro |
|---|---|---|
| Tarjeta en resultados | básica, bloque general | completa, bloque Pro primero |
| Página | una sola, sin pestañas | cabecera completa + pestañas + módulos |
| Ítems | mezclados en la página | por módulo (Servicios, Tienda, Menú, Renta…) |
| Citas / pedidos en línea | según decisión del negocio* | sí, por módulo |
| Horario | 1 tramo/día | tramos, por módulo, programados (feriados, vacaciones) |
| Galería | hasta 6 | ilimitada |
| Staff | 1 visible | ilimitado + agenda por persona |
| Reseñas | se muestran*, no se responden | se gestionan y responden |
| Novedades → History | no | sí, 24 h en Community |
| Eventos, Relacionados, Trabajos | no | sí |
| Sello Verificado | puede solicitarlo | puede solicitarlo |
| Insights | básicos | completos |
| Moderadores por área | no | sí |

\* Marcado en `CLAUDE.md` como duda abierta pendiente de confirmar.

---

## 6. Principios de copy del onboarding
- Español de barrio, tuteo, frases cortas; EN equivalente, nunca traducción
  literal.
- Cada pantalla dice **qué gana** el negocio, no qué "debe" llenar.
- Cero jerga: "cobros con tarjeta", no "pasarela de pago".
- Nunca "sin papeles", nunca "informal", nunca "pequeño".
- Pro se muestra, no se argumenta. El argumento es su propia página.
