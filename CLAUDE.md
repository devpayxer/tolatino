# To'Latino v2 — memoria del proyecto (código)

> Léelo completo antes de tocar nada. Lo decidido aquí y en `docs/DECISIONES.md`
> no se re-pregunta. Si una petición choca con una regla, se dice el choque antes
> de actuar.
>
> **Retomando una sesión: lee `docs/PROGRESS.md` primero** (dónde estamos, qué
> sigue, qué está roto). Luego `docs/PLAN.md`.

## Qué es
Plataforma *all in one* para latinos en EE. UU., por ciudad (Hazleton, Allentown,
Wilkes-Barre, Scranton, Reading). Negocios (17 categorías) · Comunidad · Eventos ·
Panel del negocio · Super Admin · El Compa. **Un solo código** (Next.js + Capacitor)
→ sitio web + 4 apps: To'Latino, Negocios, Repartidor, Puerta. Se abre cuando esté
todo (salvo El Patio).

## Fuentes de verdad (en este orden)
1. `docs/DECISIONES.md` — decisiones del fundador, con fecha. Mandan.
2. `docs/PLAN.md` — arquitectura, fases, guardianes, método.
3. `docs/diseno/plan/` — producto: reglas maestras, taxonomía, onboarding, admin.
4. `docs/diseno/entrega/modelo-datos.md` — la base (130 entidades);
   `solo-prototipo.md` — lo que NO se construye.
5. `docs/diseno/design-system/` — tokens, README y los 132 componentes fuente
   (`components-web/`). **El código (`packages/ui`) es la fuente de verdad del
   sistema de diseño**; el proyecto de Claude Design es referencia congelada.
6. El prototipo navegable (artifact `tolatino-master+`) manda en el comportamiento
   de cada pantalla. `docs/diseno/referencia/memoria-del-diseno.md` (342 KB): grep,
   nunca leerlo entero.

## Reglas no negociables
1. **El fundador trabaja desde el teléfono y solo da el OK.** Todo es automático:
   Claude ejecuta migraciones, despliegues y configuraciones con las credenciales
   del entorno. **Nunca** se le pide copiar/pegar ni se le pide un secreto en el
   chat (van a los secretos del entorno). Lo que un tercero exija en persona se
   agrupa en un paquete de pasos para el teléfono.
2. **Sandbox → OK → producción.** Todo se construye y prueba en el proyecto de
   pruebas (rama `pruebas`, servidor `tolatino-pruebas-1`). Producción (rama
   `produccion`) solo recibe el mismo paquete aprobado; nunca se toca a mano; nada
   se enciende en producción antes de la fase 9.
3. **Construir lo propio.** Servicio externo nuevo solo si es irreplicable; la
   lista de lo que se paga está en `docs/PLAN.md` §8 y solo crece por decisión del
   fundador. Preferir código abierto autoalojado.
4. **A la altura de los grandes.** Cada pieza se mide contra el líder de su
   categoría (DoorDash, Instacart, Uber, Yelp, Fresha, Eventbrite, Nextdoor…).
   Nada a medias, nada falso, nada «suficiente».
5. **Seguro y rápido siempre.** Revisión de seguridad en todo lo que toque cuenta,
   dinero, permisos o datos personales; presupuesto de velocidad por pantalla y
   consulta; el servidor decide, el cliente solo muestra.
6. **Guardianes.** Toda clase de problema cazada deja un guardián automático
   (`guardianes/`). Un «listo» sin pasar los guardianes no es listo.
7. **Todo sale del sistema de diseño.** Nunca se inventa UI; si falta una pieza, se
   pregunta. Pantalla nueva = componer → captura real en teléfono (y desktop) →
   OK → conectar. Español primero, ES/EN en toda cadena, sin emoji, copy sobrio.
8. **Espejo y triángulo.** Nada existe sin su gestión en el panel que le toca y en
   el Super Admin; cada opción del panel se refleja en la página y el admin la
   controla. Cada fase se cierra comprobando las tres puntas y los casos límite.
9. **Documentar para El Compa.** Toda función que pasa a producción trae su
   `docs/ayuda/` (qué hace, cómo se usa, qué pasa en cada caso, FAQ, ES/EN). Sin
   eso no pasa.
10. **Nada se da por hecho sin verlo.** Build + guardianes + navegador real +
    captura. Verificar sobre lo servido, no sobre la intención. Desconfiar del
    propio «listo»: si una comprobación sale limpia a la primera, preguntarse si
    de verdad corrió.
11. **Reportar con fidelidad.** Lo que falla, se dice con su salida; lo que se
    saltó, se dice; lo incompleto va a `docs/LAUNCH-CHECKLIST.md` en el momento.
12. **Escala 1M+ desde el día 1:** `city_id` en todo, PostGIS + GIST, GIN para
    búsqueda, paginación por cursor, sin N+1, derivados cacheados nunca editables,
    auditoría solo inserción, nada se borra (estados).
13. **Datos de ejemplo solo en pruebas.** La semilla nunca corre contra producción.
14. **Orquestar, no hacerlo todo con el modelo más caro (decisión AH, 20 nov).** El fundador y Fable son los orquestadores. Ante cada pedido,
    Fable primero arma el plan profesional (qué hay que construir, cómo, en qué pasos y con qué estructura) y reparte cada tarea al modelo y al
    esfuerzo que alcanzan para hacerla bien; Fable ejecuta solo lo que de verdad lo necesita. Tabla de reparto:
    - **Haiku:** lo mecánico (buscar, leer registros, renombrar, actualizar listas y documentos siguiendo un formato).
    - **Sonnet:** pantallas, funciones y pruebas que siguen un patrón que ya existe en el repo.
    - **Opus:** RLS, pagos y dinero, migraciones, seguridad, concurrencia, y cualquier fallo que ya falló una vez con Sonnet.
    - **Fable:** el plan, la arquitectura, decidir entre reglas que chocan, la revisión final de lo delegado, y lo que falló con Opus.
    Cómo se delega: cada encargo lleva escrito qué se pide, qué archivos toca (y cuáles no), y cómo se comprueba que está hecho. Lo que vuelve
    **no se da por bueno**: Fable lo revisa y corre él mismo guardianes, tipos y pruebas antes de subirlo (regla 10). Lo sensible (dinero,
    permisos, datos personales, migraciones) lo revisa un modelo distinto del que lo escribió. Si un modelo falla dos veces en una tarea, se
    sube un nivel en vez de insistir. Lo que cuesta más explicar que hacer (una edición de dos líneas) lo hace quien orquesta. Un solo dueño a
    la vez del servidor local y de cada archivo. En cada reporte al fundador se dice qué hizo cada modelo.

## Flujo de cada cambio
Lo vigente, sin historia: este texto se reescribe, no se enmienda. El porqué y la fecha de cada regla están en `docs/DECISIONES.md` (su letra).
**Camino:** commit → revisión del CI → `main` y `pruebas` avanzan → el sandbox se actualiza solo (60 s) → captura + «qué mirar y en qué
condiciones» al fundador → confirmación completa + OK → `produccion` avanza → producción se actualiza; vuelta atrás automática si suben los errores.

**En el sandbox (`main` + `pruebas`)**
- Los bloques se encadenan sin esperar OK: lo que el fundador debe mirar se anota en `docs/REVISION.md` y se revisa al final, paso a paso (AA).
- No se para hasta terminar todo. Una decisión pendiente no detiene el trabajo: se elige lo más seguro y reversible, se construye y se anota en
  REVISION; lo de terceros (Stripe, SMS, correo) se deja listo y probado contra simuladores. Sin resúmenes a mitad de camino: una línea de
  avance y al siguiente bloque (AB).
- Cada bloque sube con la **revisión rápida** en verde: tipos, build, guardianes, al revés y sus pruebas de punta a punta, por CI dirigido.
  No espera la confirmación completa; lo que esta cace después se arregla en el bloque siguiente y se anota en REVISION (AD, AF).
- **Vía rápida de diseño:** lo que es solo de cómo se ve (pieza del sistema de diseño, pantalla, textos, estilos y los datos de lectura que esa
  pantalla pinta) sube con tipos + build + guardianes en verde y visto servido; sus pruebas de punta a punta y al revés corren después, y lo
  que falte va a LAUNCH en el momento. No aplica a dinero, permisos, datos personales ni migraciones (AL).
- Captura primero: en cuanto una pieza se ve, el fundador recibe la captura real (teléfono y escritorio). Se entrega por partes, y el trabajo
  grande se reparte en hasta 4 encargos en paralelo, cada uno con su base y su puerto (AL, regla 14).

**En el CI**
- La tubería entera: tipos, build, guardianes, seguridad, punta a punta, al revés y los 9 dispositivos (visual, accesibilidad, velocidad).
- **Confirmación completa** = todo lo anterior con todas las fases, barajada y dos veces seguidas. Corre aparte y en hitos (cierre de 9b-3,
  después de 9k, al terminar 9o); solo es obligatoria para producción (AD, AF).
- Una prueba de punta a punta que falla se repite una vez: si pasa queda INESTABLE (listada, se arregla y se anota en LAUNCH); si falla dos
  veces es roja. Más de 3 inestables en una corrida = roja. Las pruebas al revés y los guardianes no se repiten nunca (AG).

**A producción (`produccion`)**
- Siempre confirmación completa en verde + OK del fundador, y el mismo paquete que pasó por `pruebas`; ninguna vía rápida aplica (AD, AL, regla 2).
- Un bug con la app abierta se contiene primero (interruptor o versión anterior) y se arregla por el camino normal. Solo lo grave (seguridad,
  cobro mal hecho, app caída) va por la **vía urgente**: revisión rápida + prueba corta en producción, con la confirmación completa justo
  después y vuelta atrás automática si caza algo. Siempre con el OK del fundador (AE).

**Lo que no se vuelve atrás (AM)**
- La estructura del CI la guardan guardianes: confirmación de un push en ~20 min (punta a punta en 8 partes por `pruebas/reparto.json`, «al
  revés» en partes con árbol idéntico, verificación en paralelo con un solo build). Quitar o aflojar uno es decisión del fundador (lista en
  DECISIONES, AM).
- Un push de solo documentos de trabajo corre solo la señal rápida. Las dirigidas van siempre en partes. Una roja local se repite sobre base nueva.
- Un cambio del CI se ve correr entero en la rama antes de `main` y va solo. Lo que toca el despliegue sube primero a `main` y después a `pruebas`.
- Si la confirmación pasa de 25 min o `main` queda rojo por el propio CI, eso se arregla antes que nada.

## Ramas
`main` = trabajo v2 y rama por defecto · `pruebas` = sandbox (mismo contenido que
`main` + despliegue) · `produccion` = fase 9 · `archivo/v1-*` = solo referencia.
**Si al arrancar ves `apps/web` con Supabase y migraciones 01xx, estás en la v1:
`git checkout main` antes de hacer nada.**

## Infraestructura
- Sandbox: Hetzner Falkenstein `tolatino-pruebas-1` (id 174559637, IP 2.31.196.167),
  se sincroniza con `pruebas` y corre `infra/pruebas/deploy.sh`. Token en los
  secretos del entorno (solo pruebas). Sin SSH: se administra por el repo y la API;
  emergencia = rebuild con cloud-init.
- Producción: EE. UU., proveedor por precio real el día que se encienda. Cloudflare
  delante de todo.

## Auditorías y modelo
- Auditar por **clases** («¿dónde más puede pasar X?»), no por pantallas; los bugs
  vienen en familias; cada clase cazada deja un guardián; verificar sobre lo servido.
- Qué modelo hace qué: regla 14 (Fable orquesta y reparte; ya no hace falta que el fundador cambie de modelo a mano). `max` no compra
  cobertura.

## Archivos vivos
`docs/PROGRESS.md` (retomar) · `docs/DECISIONES.md` (decisiones) ·
`docs/LAUNCH-CHECKLIST.md` (diferido) · `docs/HERRAMIENTAS.md` (herramientas) ·
`docs/ayuda/` (base de conocimiento de El Compa).
