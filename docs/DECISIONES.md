# To'Latino v2 — Decisiones del fundador (código)

Una línea por decisión, con fecha. Lo que está aquí no se re-pregunta.
Las letras siguen la sección 3 de `docs/PLAN.md`.

| Fecha | # | Decisión | Consecuencia |
|---|---|---|---|
| 2026-11-05 | — | Reinicio desde cero. El código v1 queda archivado en `archivo/v1-produccion` y `archivo/v1-pruebas`; ninguna pantalla se reutiliza. | Rama de trabajo con historial nuevo. |
| 2026-11-05 | — | El plan se hace y se aprueba **antes** de la primera línea de código. | `docs/PLAN.md` es borrador hasta el OK. |
| 2026-11-05 | J | El sistema de diseño al día es el zip exportado por el fundador: **132 componentes** (bundle sincronizado el 2 nov 2026), compilados a `React.createElement` con estilos en línea, + tokens + 73 íconos. Guardado en `docs/diseno/design-system/components-web/`. | Es la fuente para portar `packages/ui`. Reemplaza al artifact viejo de 67 componentes. |
| 2026-11-05 | L | **El código es la fuente de verdad del sistema de diseño** desde la Fase 0 (`packages/ui`). El proyecto de Claude Design queda como referencia visual congelada. Pantalla o componente nuevo: se compone con el sistema y se aprueba con captura real antes de conectar; lo aprobado entra a `packages/ui`, al README del sistema y a la pantalla en el mismo turno. Si algo se diseña en Claude Design, se exporta y se porta; nunca se edita el mismo componente en los dos lados. | Fin de los «SINCRONIZAR». |
| 2026-11-05 | B | **Un solo código (monorepo), web + Capacitor, cuatro apps publicadas:** To'Latino (vecinos + sitio web), To'Latino Negocios (Panel v2), To'Latino Repartidor (repartidor del negocio), To'Latino Puerta (portero, solo escanea). El Super Admin es solo web (`/admin`). Nada en React Native. | Cada app = una cáscara de Capacitor con su ícono y nombre apuntando a una entrada de la misma app. 4 fichas por tienda; Apple $99/año, Google $25. Se pueden publicar por etapas. |
| 2026-11-05 | M | **Dos proyectos en paralelo: uno de PRUEBAS y uno REAL (producción).** Todo se programa y se aprueba en el de pruebas; solo lo aprobado pasa al real. | Dos entornos completos y separados (base de datos, sitio, apps, claves). Nada se construye ni se prueba directo en el real. |

## Pendientes de decidir (sección 3 del plan)
A alcance del lanzamiento · C backend · D hosting · E costo del OTP · F El Compa · G El Patio · H las 4 apps · I datos de ejemplo · K reglas del repo viejo.
