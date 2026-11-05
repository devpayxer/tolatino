# To'Latino v2 — memoria del proyecto (código)

> **Estado: PLANIFICACIÓN. No se escribe código hasta que el fundador apruebe
> `docs/PLAN.md` y responda su sección 3.**
>
> Reinicio desde cero el 5 nov 2026. El código v1 está archivado en las ramas
> `archivo/v1-produccion` y `archivo/v1-pruebas`: **solo referencia, ninguna
> pantalla se reutiliza.**

## Léelo en este orden
1. `docs/PLAN.md` — el plan de construcción (qué entendimos del diseño, reglas
   que el código obedece, decisiones pendientes, arquitectura, fases, método).
2. `docs/diseno/plan/CLAUDE-plan.md` — reglas maestras y decisiones cerradas del
   producto (espejo de gestión, triángulo, mobile-first, ciudad, roles).
3. `docs/diseno/entrega/modelo-datos.md` — la especificación de la base (130
   entidades); `solo-prototipo.md` — lo que NO se construye.
4. `docs/diseno/design-system/README.md` + `tokens/` — reglas visuales.
5. `docs/diseno/referencia/memoria-del-diseno.md` — historial completo del
   diseño (342 KB): **no leerlo entero**, buscar con grep por tema.

Si dos fuentes difieren: gana la decisión más reciente del fundador en la
memoria del diseño; si no está, gana el plan; el prototipo manda en el
comportamiento de pantalla.

## Reglas que ya aplican en esta etapa
- **Español primero** en todo lo que ve el fundador y el usuario.
- **Pegar en el chat todo lo que el fundador deba correr** (SQL, comandos,
  variables, ajustes de paneles), completo, nunca «está en el repo».
- **Lo diferido se anota en `docs/LAUNCH-CHECKLIST.md`** en el momento.
- **Nada se da por hecho sin verlo**: build + navegador real + captura.
- **Mock → captura → OK del fundador → conectar** para toda pantalla nueva.
- **El sitio de pruebas del fundador es la rama `pruebas`**; producción
  (`tolatino.com`) solo con su visto bueno explícito.
- **Reportar con fidelidad**: si algo falla o quedó incompleto, se dice.

El `CLAUDE.md` definitivo (reglas completas del código) se escribe cuando el
plan esté aprobado.
