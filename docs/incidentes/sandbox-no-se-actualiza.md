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
- Prueba: `pruebas/infra/sync-pruebas.test.sh`; guardián `sandboxSeArreglaSolo` (al revés: `alrevesDespliegue`), que también vigila el flujo de rescate y su script de disco.

## Qué hace Claude
- Correr **Estado del sandbox** y leer el recuadro y las últimas líneas. Si el motivo es de red (GitHub caído), esperar.
- Si el sandbox está trabado con un `tolatino-sync` que todavía no se arregla solo (el de antes del 26 nov, o una causa nueva), hay que entrar al disco con el **Rescate del sandbox** (`.github/workflows/sandbox-rescate.yml`, a mano, `confirmar` = `RESCATAR`). Un reinicio por la API no basta (se probó el 26 nov: siguió en `87e7dc2e`). No pierde la base. Tiene dos modos (`modo`); los dos tocan el disco con el mismo script, `infra/pruebas/rescate-disco.sh`, que:
  - imprime el diagnóstico: reinicios y arranques, `unattended-upgrades`, `systemctl is-enabled tolatino-sync.timer` del sistema montado y sus enlaces en `/etc/systemd`, `/var/lib/tolatino/*`, las últimas 60 líneas de `/var/log/tolatino-sync.log`, la versión instalada de `/usr/local/bin/tolatino-sync` (y la del repo), si `/opt/tolatino/.git` está sano (`git fsck --connectivity-only`, sin red) y los `*.lock`;
  - borra **solo** los `*.lock` de `/opt/tolatino/.git`;
  - si el `tolatino-sync` instalado es el de antes del 26 nov, instala el del repo (`bash -n` primero, 0755, cambio atómico con `mv`) para que se destrabe solo de aquí en adelante. Nada más;
  - desmonta siempre al salir.

### Modo `llave` (el de por defecto): sin el token en GitHub
El entorno «ensayo» de GitHub **no** tiene `HCLOUD_TOKEN`: el token del proyecto de pruebas solo existe en el entorno de Claude (el proxy lo pone en las llamadas a `api.hetzner.cloud`). La sesión de Claude no llega por SSH al servidor; el runner de GitHub sí. Así que se reparten: el runner hace el SSH con una llave de un solo uso y Claude hace la API.

Lo que hace el runner (trabajo `rescate-llave`, sin secretos ni entorno; solo él tiene `contents: write`):
1. genera un par ed25519 de un solo uso en `$RUNNER_TEMP/llave` (la privada nunca sale de ahí: ni al registro, ni a un artefacto, ni a git) e imprime la huella;
2. empuja a la rama **`rescate-llave`** un commit con **solo** `llave.pub` (la pública; su comentario es `rescate-<id de la corrida>`);
3. espera hasta **25 min** a que `2.31.196.167` conteste por SSH con esa llave (cada minuto imprime «esperando rescate») y comprueba que la raíz está en memoria (es el rescate, no el sistema normal);
4. corre el script de disco (arriba);
5. escribe `hecho` («RESCATE-HECHO <id>») en la rama `rescate-llave`: el disco ya está desmontado;
6. espera hasta 15 min a que `/api/salud` sirva el commit de `pruebas` (para entonces Claude ya quitó el rescate);
7. al final, pase lo que pase (`if: always()`), borra la llave del runner y la rama `rescate-llave`.

Lo que hace Claude desde su sesión, en este orden (curl a `https://api.hetzner.cloud/v1`; el proxy pone el token, Claude no lo ve ni lo escribe; servidor `174559637`):
1. lanzar el flujo con `modo` = `llave` y `confirmar` = `RESCATAR`, y anotar el id de la corrida;
2. esperar a que exista la rama `rescate-llave` y leer `llave.pub` (contenido del archivo en esa rama); comprobar que su comentario es `rescate-<id de la corrida>`;
3. `POST /ssh_keys` con `{"name":"rescate-<id>","public_key":"<llave.pub>"}` → guardar el `id` de la llave;
4. `GET /servers/174559637`: comprobar que es `tolatino-pruebas-1` con IP `2.31.196.167` (si no, parar y borrar la llave);
5. `POST /servers/174559637/actions/enable_rescue` con `{"type":"linux64","ssh_keys":[<id>]}` y esperar a que la acción termine (`GET /actions/<id acción>` hasta `success`);
6. `POST /servers/174559637/actions/reset` (arranca el rescate);
7. esperar a que aparezca `hecho` en la rama `rescate-llave` **o** a que la corrida termine (bien o mal, el paso final borra la rama: «se fue la rama» también cuenta como fin);
8. `GET /servers/174559637`: si `rescue_enabled` sigue en `true`, `POST /servers/174559637/actions/disable_rescue` y esperar a que termine (Hetzner quita la marca él solo al arrancar el rescate, pero la máquina sigue EN el rescate hasta el próximo reinicio);
9. `POST /servers/174559637/actions/reset` (arranca el sistema normal);
10. `DELETE /ssh_keys/<id>`;
11. ver el final de la corrida: el paso (e) dice si `/api/salud` ya sirve el commit de `pruebas`; si no, correr **Estado del sandbox**.

**Nunca se deja el servidor en rescate.** Si la corrida falla en cualquier punto (no contesta en 25 min, el script falla, se cancela), Claude hace igual los pasos 8–10 (el reset del 9 aunque `rescue_enabled` ya sea `false`) y comprueba con `GET /servers/174559637` que `rescue_enabled` es `false` y el estado `running`. Si Claude no llegó a activar el rescate, solo borra la llave (paso 10). Ojo: que `rescue_enabled` sea `false` no quiere decir que la máquina haya salido del rescate (Hetzner quita la marca al arrancar en él): sin el `reset` del paso 9 se queda en el rescate. Por eso el paso 9 va siempre, y al final `/api/salud` tiene que contestar.

### Modo `api`: todo en el runner con el token
Solo si algún día el entorno «ensayo» de GitHub tiene `HCLOUD_TOKEN` (el del proyecto de pruebas). Sin él, se para en «Confirmación» sin tocar nada.
  1. lista las acciones del servidor en la API (un reinicio desde dentro del sistema no sale ahí: lo dice el diagnóstico);
  2. activa el modo rescate (la contraseña de un solo uso se enmascara y nunca se imprime) y reinicia en orden;
  3. espera a que el rescate conteste por SSH (si no, lo fuerza: tope 10 min);
  4. corre el script de disco (arriba);
  5. quita el rescate, arranca normal y espera hasta 10 min a que `/api/salud` sirva el commit de `pruebas`.
  Pase lo que pase, su último paso quita el rescate y arranca normal si algo quedó a medias. Si a los 10 min sirve otro commit pero `/estado/` dice «deploy.sh inicio», se está desplegando: mirar otra vez con Estado del sandbox.

- Si el diagnóstico enseña otra causa (temporizador deshabilitado, disco lleno, `.git` roto sin candados), arreglarla por el repo; como último recurso, reconstruir el sandbox (`scripts/produccion/maquinas.sh reconstruir-sandbox`), que sí pierde la base de pruebas.

## Qué se le dice al fundador
- «El sandbox dejó de actualizarse desde HORA (causa). Lo destrabé con el rescate; ya sirve el commit X. Lo que mirabas no cambió de datos.»

## Qué se les dice a los vecinos
- Nada: es el servidor de pruebas.
