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

## Flujo de cada cambio
commit → CI (tipos, pruebas, punta a punta en 9 dispositivos, visual, seguridad,
accesibilidad, velocidad, build) → `pruebas` avanza → el sandbox se actualiza solo
(60 s) → captura + «qué mirar y en qué condiciones» al fundador → OK → `produccion`
avanza → producción se actualiza; vuelta atrás automática si suben los errores.

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
- Sonnet/medium para pantallas y features; Opus/high para RLS, pagos, migraciones,
  seguridad o un bug que falló dos veces. Claude avisa cuándo cambiar y vuelve a
  Sonnet después. `max` no compra cobertura.

## Archivos vivos
`docs/PROGRESS.md` (retomar) · `docs/DECISIONES.md` (decisiones) ·
`docs/LAUNCH-CHECKLIST.md` (diferido) · `docs/HERRAMIENTAS.md` (herramientas) ·
`docs/ayuda/` (base de conocimiento de El Compa).
