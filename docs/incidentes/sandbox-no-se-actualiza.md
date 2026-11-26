# El sandbox no se actualiza

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Solo el sandbox (`tolatino-pruebas-1`); producción tiene su propio `infra/produccion/tolatino-sync`._

**Severidad:** media · **caso:** `sandbox-no-se-actualiza`

## Cómo se nota
- `main` y `pruebas` avanzaron, pero `/api/salud` sigue diciendo el commit de antes.
- En el flujo **Estado del sandbox** (`estado-sandbox.yml`, a mano o cada 6 h): el paso «Salud» da un commit viejo y el paso «Página de estado» muestra una hora vieja o, desde el 26 nov, un recuadro «**No se puede bajar la rama pruebas** desde … · vueltas fallidas seguidas: N · Motivo: …» con lo que dijo git.
- Antes del 26 nov no se veía nada más: la vuelta salía sin reescribir `/estado/` y la página se quedaba con su hora y sus líneas de antes.

## Causa del 26 nov
- El reinicio automático de las actualizaciones (`Unattended-Upgrade::Automatic-Reboot-Time "04:30"`, en `infra/pruebas/cloud-init.yml`) cortó un `git fetch --depth 50` a medias y dejó un candado (`.git/shallow.lock`) en `/opt/tolatino`. Desde ahí cada fetch fallaba con «File exists» y `tolatino-sync` hacía `exit 0` antes de escribir `/estado/`. Última página: 04:29 EST; último despliegue OK: 04:09 EST.

## Qué hace el sistema solo (desde el 26 nov)
- `tolatino-sync`, bajo su candado (nadie más usa git en `/opt/tolatino`), borra antes del fetch los `*.lock` que dejó una vuelta cortada y lo anota en el registro.
- El fetch tiene tope (120 s), el clon (300 s) y `deploy.sh` (50 min); la unidad, `TimeoutStartSec=3600`, y el temporizador vuelve a arrancarla a los 20 s aunque una vuelta acabe mal.
- Si no puede bajar la rama, `/estado/` lo dice en cada vuelta (desde cuándo, cuántas, el motivo).
- A las 15 vueltas fallidas seguidas (~5 min) vuelve a clonar en `/opt/tolatino.reclon` y su `.git` reemplaza al roto (queda en `/opt/tolatino.git-roto` para mirarlo; si el cambio falla, vuelve el de antes) y despliega. Sin red, lo reintenta cada 15 vueltas.
- Prueba: `pruebas/infra/sync-pruebas.test.sh`; guardián `sandboxSeArreglaSolo` (al revés: `alrevesDespliegue`).

## Qué hace Claude
- Correr **Estado del sandbox** y leer el recuadro y las últimas líneas. Si el motivo es de red (GitHub caído), esperar.
- Si el sandbox está trabado con un `tolatino-sync` que todavía no se arregla solo (el de antes del 26 nov, o una causa nueva), correr **Rescate del sandbox** (`.github/workflows/sandbox-rescate.yml`, a mano, escribiendo `RESCATAR`). No pierde la base:
  1. lista las acciones del servidor en la API (un reinicio desde dentro del sistema no sale ahí: lo dice el diagnóstico);
  2. activa el modo rescate (la contraseña de un solo uso se enmascara y nunca se imprime) y reinicia en orden;
  3. espera a que el rescate conteste por SSH (si no, lo fuerza: tope 10 min);
  4. monta el disco y **imprime el diagnóstico** (reinicios, el registro de `tolatino-sync`, los `*.lock`, `last-result` y `last-deploy`, si el temporizador está habilitado) y borra **solo** los `*.lock` de `/opt/tolatino/.git`;
  5. desmonta, quita el rescate, arranca normal y espera hasta 10 min a que `/api/salud` sirva el commit de `pruebas`.
  Pase lo que pase, su último paso quita el rescate y arranca normal si algo quedó a medias. Si a los 10 min sirve otro commit pero `/estado/` dice «deploy.sh inicio», se está desplegando: mirar otra vez con Estado del sandbox.
- Si el diagnóstico enseña otra causa (temporizador deshabilitado, disco lleno, `.git` roto sin candados), arreglarla por el repo; como último recurso, reconstruir el sandbox (`scripts/produccion/maquinas.sh reconstruir-sandbox`), que sí pierde la base de pruebas.

## Qué se le dice al fundador
- «El sandbox dejó de actualizarse desde HORA (causa). Lo destrabé con el rescate; ya sirve el commit X. Lo que mirabas no cambió de datos.»

## Qué se les dice a los vecinos
- Nada: es el servidor de pruebas.
