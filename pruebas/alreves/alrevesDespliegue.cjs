// Prueba al revés de la tanda 5 de la revisión del CI (22 nov): el despliegue del sandbox, más rápido y sin que pueda quedarse caído. Cada caso rompe a
// propósito un script o una configuración del despliegue y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se restaura y
// los guardianes quedan limpios:
//   sandboxSeArreglaSolo · tolatino-sync se reinstala con un install directo, sin bash -n o sin cambio atómico; tolatino-sync deja de comprobar un
//   script que deploy.sh carga, o corre deploy.sh aunque no pase; la prueba de infra que lo demuestra deja de correr. (26 nov) Un *.lock que quedó
//   en .git ya no se borra, el fetch o deploy.sh sin tope, una salida sin escribir /estado/, sin volver a clonar o sin volver al .git de antes; el flujo
//   de rescate imprime la contraseña, no la enmascara, corre solo o sin confirmar, con otro token u otro servidor, no vuelve a normal o borra de más.
//   (26 nov, modo llave) la privada se imprime, va a un artefacto o a git; el trabajo usa el entorno «ensayo» o el token; empuja a otra rama o no
//   borra la suya; el modo por defecto deja de ser «llave»; manda una orden suelta al rescate; el script de disco borra de más, instala otra cosa o
//   sin bash -n, o no desmonta.
//   migracionConTransaccion · una migración nueva sin begin/commit, o con «index concurrently» dentro; el encabezado de migrar.sh vuelve a decir que
//   todas traen begin/commit.
//   migrarUnaLectura · migrar.sh vuelve a preguntar archivo por archivo; aplica sin anotar en la misma sesión o sin comprobar que quedó anotada; la
//   prueba contra Postgres 16 deja de correr.
//   imagenSoloLoQueUsa · el .dockerignore deja fuera algo que el build lee (LAUNCH, que fallaría en silencio; un JSON de apps/mobile; un import nuevo
//   a scripts/) o deja entrar algo que nadie lee; sin «*», sin excluir node_modules; el commit vuelve a entrar al build; la prueba con BuildKit no corre.
//   imagenSoloSiCambia · se salta el build solo con la huella (sin el Id de la imagen); la huella deja de mirar lo que no está versionado; la prueba no corre;
//   (tanda 5b) vuelve «| grep -q» a huella_imagen; web.build con «target:» o con «args:» que no son el commit.
//   despliegueSinCorte · la app se cambia antes de migrar, vuelve «up --build», un build que falla se reintenta o no sale; barrido sin init o con 10 s
//   de gracia; nginx sin la página de mantenimiento o con server_tokens; una configuración de nginx que no pasa nginx -t se queda; las pruebas no corren;
//   (tanda 5b) vuelve «.anterior» sin «nginx -t»; la semilla, el mapa o la recarga de nginx cortan entre migrar y cambiar; el «up» sin esperar «healthy»;
//   no se mira el commit que sirve /api/salud; umask 077 suelto; la carpeta de mantenimiento sin 755.
//   despliegueConTramos · sin la línea de tramos al salir, un tramo que falta o fuera de su sitio, /estado/ sin el enlace, la prueba sin el caso del fallo.
//   migracionReversible (tanda 5b) · columna NOT NULL sin default o «set not null» en una tabla con INSERT; cambio de tipo en una cláusula que no es la
//   primera; una función con otra firma.
//   pruebasInfraAisladas (tanda 5b) · «aislado» sin red aparte o sin tapar /opt; una prueba que vuelve a «unshare» suelto; la del tolatino-sync sin
//   aislar_exige; correr.sh corre las que despliegan aunque el aislamiento no pase.
//   despliegueCorto (23 nov) · la imagen sin la caché de pnpm o de .next, «COPY . .» antes de instalar, sin la llave estable (o sin renovarla), la llave
//   escrita en la receta o en el repo, deploy.sh con --no-cache, tolatino-sync de vuelta a 60 s (en la máquina viva o en el cloud-init).
//   vistaPreviaRetirada (24 nov) · vuelve la carpeta del sitio de vista previa, su puerto (8081), el de su servidor (3010) o un «next dev» en la
//   infraestructura, algo que la nombra fuera del paso de limpieza; el paso de limpieza sin el contenedor, la imagen, una ruta o «drop owned by», con un
//   «drop»/«rm -rf» de más, con exit, sin comprobar que el usuario existe, llamado sin «|| log» o después de nginx.
//   migracionContraeConMotivo (26 nov) · una migración nueva contrae (drop column, drop table, rename column, cambio de tipo en otra cláusula) sin la
//   marca «-- contraer: <motivo>» o con un motivo de nada.
//   migracionConTope (26 nov) · una migración nueva toca una tabla grande (índice, alter, update dentro de un «do») sin lock_timeout ni
//   statement_timeout, con uno solo, con un tope apagado o pasado, o con los «set local» después de la orden; migrar.sh deja de reintentar; la prueba
//   contra Postgres 16 pierde el caso del statement_timeout; la lista de tablas grandes del documento pierde una.
//   produccionMigraAntes (26 nov) · el azul/verde arranca el color nuevo antes de migrar o pierde el motivo; producción vuelve a indexar después de la
//   vigilancia o aunque las migraciones fallen; las pruebas de infra pierden el caso del orden o el de la tabla ocupada.
//   produccionSeArreglaSola (26 nov) · el tolatino-sync de producción deja un *.lock de una vuelta cortada, un fetch o deploy.sh sin tope (o más largo
//   que la unidad), git con trabajos aparte, una salida sin escribir /estado/ o sin decir que no se puede bajar, diag.txt a la vista, un reset que falla
//   sin contar, sin volver a clonar, sin volver al .git de antes, un clon de rescate sin pruebas ni etiquetas, en la punta o que fuerza el despliegue, sin
//   bash -n de lo que carga deploy.sh, reinstalarse sin bash -n; su prueba pierde un caso. produccionSoloAvanza: «solo avanza» contra el HEAD.
// «crear» (el texto a cambiar es null): se crea el archivo, se corre el guardián y se quita.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'infra/pruebas/deploy.sh', S = 'infra/pruebas/tolatino-sync', L = 'infra/comun/lib.sh', C = 'pruebas/infra/correr.sh', M = 'packages/db/migrar.sh';
const NUEVA = 'packages/db/migrations/0999_alreves_despliegue.sql';
const N = 'infra/pruebas/nginx-pruebas.conf', O = 'pruebas/infra/orden-despliegue.test.sh';
const AV = 'infra/comun/azulverde.sh', DP = 'infra/produccion/deploy.sh', AT = 'pruebas/infra/azulverde.test.sh', MT = 'pruebas/infra/migrar.test.sh', F9 = 'docs/diseno/plan/fase9-apertura.md';
const AI = 'pruebas/infra/aislar.sh', SP = 'pruebas/infra/sync-pruebas.test.sh', W = '.github/workflows/sandbox-rescate.yml', RD = 'infra/pruebas/rescate-disco.sh';
const I = '.dockerignore', DF = 'infra/pruebas/Dockerfile', Y = 'infra/pruebas/docker-compose.yml', AN = 'apps/web/lib/app-nativa-comun.ts';
const SYP = 'infra/produccion/tolatino-sync', STP = 'pruebas/infra/sync.test.sh';
const casos = [
  ['sandboxSeArreglaSolo', D, 'SYNC_R=0; instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync || SYNC_R=$?',
    'SYNC_R=0; install -m 0755 "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync || SYNC_R=$?', 'nunca con un install directo'],
  ['sandboxSeArreglaSolo', L, '; se queda el anterior"\n  return 2\n', '; se queda el anterior"\n  return 1\n', 'separa «no es bash válido» (1) de «no se pudo instalar»'],
  ['sandboxSeArreglaSolo', D, '  *) echo "tolatino-sync: el del commit $COMMIT no se pudo instalar (¿disco lleno?); sigue el anterior', '  *) echo "tolatino-sync: el del commit $COMMIT NO es bash válido; sigue el anterior', 'separa «no es bash válido» (1) de «no se pudo instalar»'],
  ['sandboxSeArreglaSolo', L, '  if ! err=$(bash -n "$src" 2>&1); then', '  if ! err=$(true 2>&1); then', 'bash -n primero'],
  ['sandboxSeArreglaSolo', L, '  if install -m "$modo" "$src" "$tmp" && mv -f "$tmp" "$dst"; then return 0; fi', '  if install -m "$modo" "$src" "$dst"; then return 0; fi', 'cambio atómico'],
  ['sandboxSeArreglaSolo', S, ' infra/pruebas/medios.sh packages/db/migrar.sh"', ' infra/pruebas/medios.sh"', 'no comprueba con bash -n packages/db/migrar.sh'],
  ['sandboxSeArreglaSolo', S, '  elif [ -f infra/pruebas/deploy.sh ]; then', '  fi\n  if [ -f infra/pruebas/deploy.sh ]; then', 'tolatino-sync NO lo corre'],
  ['sandboxSeArreglaSolo', C, '  seccion "el sandbox se arregla solo (su tolatino-sync)"; bash pruebas/infra/sync-pruebas.test.sh || mal=1\n', '', 'no corren pruebas/infra/sync-pruebas.test.sh'],
  // 26 nov · Incidente «el sandbox no se actualiza»: un *.lock que quedó de una vuelta cortada, un fetch o un deploy.sh sin tope, una salida que no
  // escribe /estado/, sin volver a clonar; y el flujo de rescate que imprime la contraseña, no vuelve a normal, corre solo o toca de más.
  ['sandboxSeArreglaSolo', S, '  printf \'%s\\n\' "$CANDADOS" | while IFS= read -r f; do rm -f -- "$f"; done\n', '', 'borra los *.lock que dejó una vuelta cortada'],
  ['sandboxSeArreglaSolo', S, 'if ERR=$(timeout -k 10 "$FETCH_TOPE" "${GIT[@]}" fetch', 'if ERR=$("${GIT[@]}" fetch', 'el fetch de tolatino-sync va con tope'],
  ['sandboxSeArreglaSolo', S, '    timeout -k 60 "$TOPE_DEPLOY" bash infra/pruebas/deploy.sh', '    bash infra/pruebas/deploy.sh', 'corre deploy.sh con tope'],
  ['sandboxSeArreglaSolo', S, '    se_pudo_bajar; FORZAR=1\n  else\n    escribir_estado; exit 0\n', '    se_pudo_bajar; FORZAR=1\n  else\n    exit 0\n', 'escribe /estado/ antes'],
  ['sandboxSeArreglaSolo', S, 'No se puede bajar la rama $BR</b>', 'Aviso</b>', 'si no se puede bajar la rama, lo dice'],
  ['sandboxSeArreglaSolo', S, 'if no_se_pudo_bajar "$ERR" && reclonar; then', 'if no_se_pudo_bajar "$ERR" && false; then', 'vuelve a clonar'],
  ['sandboxSeArreglaSolo', S, '    mv "$roto" "$DIR/.git" 2>>"$LOG"\n', '', 'si el cambio falla, vuelve el de antes'],
  ['sandboxSeArreglaSolo', S, '\nRECLONAR_TRAS=15 ', '\nRECLONAR_TRAS=500 ', 'RECLONAR_TRAS (≤ 30)'],
  ['sandboxSeArreglaSolo', S, 'TOPE_DEPLOY=${TOLATINO_SYNC_TOPE_DEPLOY:-3000}', 'TOPE_DEPLOY=${TOLATINO_SYNC_TOPE_DEPLOY:-3500}', 'caben juntos'],
  ['sandboxSeArreglaSolo', SP, 'ok "queda un shallow.lock', 'echo "queda un shallow.lock', 'no tiene el caso «queda un shallow.lock»'],
  // 26 nov · produccionSeArreglaSola: lo del incidente del sandbox, en el tolatino-sync de producción.
  ['produccionSeArreglaSola', SYP, '  printf \'%s\\n\' "$CANDADOS" | while IFS= read -r f; do rm -f -- "$f"; done\n', '', 'borra los *.lock que dejó una vuelta cortada'],
  ['produccionSeArreglaSola', SYP, '  err=$(timeout -k 10 "$FETCH_TOPE" "${GIT[@]}" -C "$d" fetch -q --shallow-since', '  err=$("${GIT[@]}" -C "$d" fetch -q --shallow-since', 'cada fetch de tolatino-sync va con tope'],
  ['produccionSeArreglaSola', SYP, '\nGIT=(git -c gc.autoDetach=false -c maintenance.autoDetach=false)\n', '\nGIT=(git)\n', 'git sin trabajos aparte'],
  ['produccionSeArreglaSola', SYP, '      timeout -k 60 "$TOPE_DEPLOY" bash infra/produccion/deploy.sh', '      bash infra/produccion/deploy.sh', 'corre deploy.sh con tope'],
  ['produccionSeArreglaSola', SYP, 'TOPE_DEPLOY=${TOLATINO_SYNC_TOPE_DEPLOY:-3000}', 'TOPE_DEPLOY=${TOLATINO_SYNC_TOPE_DEPLOY:-3500}', 'caben en la unidad'],
  ['produccionSeArreglaSola', SYP, '      [ "$TOPE_DEPLOY" -gt "$QUEDA" ] && TOPE_DEPLOY=$QUEDA\n', '', 'lo que le queda a la vuelta'],
  ['produccionSeArreglaSola', SYP, '\nelse\n  escribir_estado; exit 0\nfi\n', '\nelse\n  exit 0\nfi\n', 'escribe /estado/ antes'],
  ['produccionSeArreglaSola', SYP, 'No se puede bajar la rama $BR</b>', 'Aviso</b>', 'si no se puede bajar la rama, lo dice'],
  ['produccionSeArreglaSola', SYP, '  [ "$TOLATINO_ENTORNO" = produccion ] && rm -f /var/www/estado/diag.txt\n', '', 'sin diag.txt en produccion'],
  ['produccionSeArreglaSola', SYP, '      if no_se_pudo_bajar "git reset --hard falló: $ERR"; then reclonar || true; fi; escribir_estado; exit 0', '      escribir_estado; exit 0', 'un reset --hard que falla cuenta'],
  ['produccionSeArreglaSola', SYP, 'elif no_se_pudo_bajar "$ERR" && reclonar; then', 'elif no_se_pudo_bajar "$ERR" && false; then', 'vuelve a clonar'],
  ['produccionSeArreglaSola', SYP, '    mv "$roto" "$DIR/.git" 2>>"$LOG"\n', '', 'si el cambio falla, vuelve el de antes'],
  ['produccionSeArreglaSola', SYP, '\nRECLONAR_TRAS=15 ', '\nRECLONAR_TRAS=500 ', 'RECLONAR_TRAS (≤ 30)'],
  ['produccionSeArreglaSola', SYP, ' || ! err=$(bajar_ramas "$nuevo"); then', '; then', 'trae también pruebas y las etiquetas'],
  ['produccionSeArreglaSola', SYP, '    [ -n "$base" ] && git -C "$nuevo" checkout -q -B "$BR" "$base" 2>>"$LOG"\n', '', 'queda en lo desplegado'],
  ['produccionSeArreglaSola', SYP, '\nif [ "$REINTENTAR" = 1 ] || [ ! -f "$STATE/last-deploy" ]', '\nif [ "$REINTENTAR" = 1 ] || [ "$(git rev-parse HEAD)" != "$REMOTE" ] || [ ! -f "$STATE/last-deploy" ]', 'no fuerza un despliegue'],
  ['produccionSeArreglaSola', SYP, ' infra/comun/azulverde.sh infra/comun/respaldos/pgbackrest.sh', ' infra/comun/respaldos/pgbackrest.sh', 'no comprueba con bash -n infra/comun/azulverde.sh'],
  ['produccionSeArreglaSola', SYP, ' infra/$TOLATINO_ENTORNO/entorno.conf infra/comun/lib.sh', ' infra/comun/lib.sh', 'no comprueba con bash -n infra/$TOLATINO_ENTORNO/entorno.conf'],
  ['produccionSeArreglaSola', SYP, '    else\n      # 26 nov · Con tope,', '    fi\n    if true; then\n      # 26 nov · Con tope,', 'tolatino-sync NO lo corre'],
  ['produccionSeArreglaSola', SYP, '    if bash -n infra/produccion/tolatino-sync 2>>"$LOG"; then install -m 0755', '    if true; then install -m 0755', 'se reinstala solo si es bash válido'],
  ['produccionSeArreglaSola', STP, 'ok "queda un shallow.lock', 'echo "queda un shallow.lock', 'no tiene el caso «queda un shallow.lock»'],
  ['produccionSeArreglaSola', STP, 'ok "una historia reescrita que llega justo al volver a clonar', 'echo "una historia reescrita que llega justo al volver a clonar', 'no tiene el caso «historia reescrita tras volver a clonar»'],
  ['produccionSeArreglaSola', C, '  seccion "producción solo avanza y se arregla sola (su tolatino-sync)"; bash pruebas/infra/sync.test.sh || mal=1\n', '', 'no corren pruebas/infra/sync.test.sh'],
  // produccionSoloAvanza (26 nov): «solo avanza» contra el HEAD (tras volver a clonar ya es la punta) en vez de contra lo desplegado.
  ['produccionSoloAvanza', SYP, 'elif ! git merge-base --is-ancestor "$DESPLEGADO" "$REMOTE"', 'elif ! git merge-base --is-ancestor "$LOCAL" "$REMOTE"', 'contra lo último desplegado'],
  ['produccionSoloAvanza', SYP, '\nDESPLEGADO=$(desplegado_en "$DIR")\n', '\nDESPLEGADO=$(git rev-parse HEAD)\n', 'contra lo último desplegado'],
  ['sandboxSeArreglaSolo', SP, 'ok "vuelta 30 (con red): se vuelve a clonar', 'echo "vuelta 30 (con red): se vuelve a clonar', 'no tiene el caso «N vueltas fallidas → volver a clonar»'],
  ['sandboxSeArreglaSolo', W, '          echo "::add-mask::$PW"\n', '', 'se enmascara (::add-mask::) antes de usarla'],
  ['sandboxSeArreglaSolo', W, '          echo "::add-mask::$PW"\n', '          echo "::add-mask::$PW"\n          echo "contraseña del rescate: $PW"\n', 'nunca se imprime: solo va al archivo 0600'],
  ['sandboxSeArreglaSolo', W, 'SSHPASS=$(cat "$PWF") sshpass -e ssh', 'sshpass -p "$(cat "$PWF")" ssh', 'ni sshpass -p'],
  ['sandboxSeArreglaSolo', W, '          touch "$RUNNER_TEMP/tocado"\n', '          set -x\n          touch "$RUNNER_TEMP/tocado"\n', 'ni set -x'],
  ['sandboxSeArreglaSolo', W, '        if: always()\n        timeout-minutes: 5\n', '        timeout-minutes: 5\n', 'es «if: always()» y desactiva el rescate'],
  ['sandboxSeArreglaSolo', W, '            accion disable_rescue\n          fi\n          if [ "$ST" = off ]', '            true\n          fi\n          if [ "$ST" = off ]', 'es «if: always()» y desactiva el rescate'],
  ['sandboxSeArreglaSolo', W, '[ "$CONFIRMAR" = RESCATAR ] || ', 'true || ', 'SOLO a mano'],
  ['sandboxSeArreglaSolo', W, '        default: llave\npermissions:', '        default: llave\n  schedule:\n    - cron: "0 9 * * *"\npermissions:', 'SOLO a mano'],
  ['sandboxSeArreglaSolo', W, 'HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN }}', 'HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN_PRODUCCION }}', 'toca solo el sandbox'],
  ['sandboxSeArreglaSolo', W, '[ "$N" = "$NOMBRE" ] && [ "$I" = "$IP" ] || ', 'true || ', 'toca solo el sandbox'],
  // El script de disco (los dos modos): solo los *.lock de /opt/tolatino/.git, solo tolatino-sync (bash -n primero), siempre desmonta.
  ['sandboxSeArreglaSolo', RD, 'find "$G" -name \'*.lock\' -type f -print -delete', 'find "$M/opt/tolatino" -name \'*.lock\' -type f -print -delete', 'solo borra los *.lock de /opt/tolatino/.git'],
  ['sandboxSeArreglaSolo', RD, '\nDST="$M/usr/local/bin/tolatino-sync"\n', '\nDST="$M/usr/local/bin/tolatino-sync"\nrm -rf "$G/shallow"\n', 'solo borra los *.lock de /opt/tolatino/.git'],
  ['sandboxSeArreglaSolo', RD, 'G="$M/opt/tolatino/.git"\n', 'G="$M/opt/tolatino"\n', 'solo borra los *.lock de /opt/tolatino/.git'],
  ['sandboxSeArreglaSolo', RD, '  mv -f "$DST.rescate" "$DST"\n', '  mv -f "$DST.rescate" "$DST"\n  install -m 0755 "$M/opt/tolatino/infra/pruebas/deploy.sh" "$M/usr/local/bin/deploy"\n', 'solo instala tolatino-sync'],
  ['sandboxSeArreglaSolo', RD, 'elif ! grep -q "$MARCA" "$NUEVO" || ! bash -n "$NUEVO"; then', 'elif ! grep -q "$MARCA" "$NUEVO"; then', 'solo instala tolatino-sync'],
  ['sandboxSeArreglaSolo', RD, 'if out=$(timeout 300 "${GITR[@]}" fsck --connectivity-only', 'if out=$(timeout 300 "${GITR[@]}" gc --prune=now; "${GITR[@]}" fsck --connectivity-only', 'en git solo mira'],
  ['sandboxSeArreglaSolo', RD, "  trap 'sync; [ \"$MONTADO\" = 1 ] && umount \"$M\" && echo \"== desmontado\"' EXIT\n", '', 'desmonta siempre al salir'],
  // Los dos modos corren ESE script y nada suelto por SSH; el modo «llave» es el de por defecto y no usa secretos.
  ['sandboxSeArreglaSolo', W, "          rescate 'bash /tmp/rescate-disco.sh /tmp/tolatino-sync.nuevo < /dev/null'\n\n      - name: (e) Arrancar", "          rescate 'find /mnt/tl/opt/tolatino -name \"*.lock\" -delete'\n\n      - name: (e) Arrancar", 'por SSH al rescate solo va lo que se ve'],
  ['sandboxSeArreglaSolo', W, '          echo "el rescate contesta a los $((SECONDS - t0)) s"\n', '          echo "el rescate contesta a los $((SECONDS - t0)) s"\n          rescate \'rm -f /mnt/tl/opt/tolatino/.git/index\'\n', 'por SSH al rescate solo va lo que se ve'],
  ['sandboxSeArreglaSolo', W, '        default: llave\n', '        default: api\n', 'dos modos (input «modo»: llave por defecto'],
  ['sandboxSeArreglaSolo', W, "    if: inputs.modo == 'llave'\n    runs-on: ubuntu-latest\n", "    if: inputs.modo == 'llave'\n    runs-on: ubuntu-latest\n    environment: ensayo\n", 'el modo llave no usa HCLOUD_TOKEN ni el entorno «ensayo»'],
  ['sandboxSeArreglaSolo', W, '      RAMA: rescate-llave\n', '      RAMA: rescate-llave\n      HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN }}\n', 'el modo llave no usa HCLOUD_TOKEN ni el entorno «ensayo»'],
  ['sandboxSeArreglaSolo', W, '    permissions:\n      contents: write\n', '    permissions:\n      contents: write\n      actions: write\n', 'solo él escribe en el repo (contents: write)'],
  // La privada nunca sale del runner.
  ['sandboxSeArreglaSolo', W, '          echo "huella: $(ssh-keygen -lf "$RUNNER_TEMP/publica/llave.pub")"\n', '          echo "huella: $(ssh-keygen -lf "$RUNNER_TEMP/publica/llave.pub")"\n          echo "privada: $(cat "$RUNNER_TEMP/llave/id")"\n', 'la privada nunca sale del runner'],
  ['sandboxSeArreglaSolo', W, '          cp "$RUNNER_TEMP/llave/id.pub" "$RUNNER_TEMP/publica/llave.pub"\n', '          cp "$RUNNER_TEMP/llave/id.pub" "$RUNNER_TEMP/publica/llave.pub"\n          cp "$RUNNER_TEMP/llave/id" "$RUNNER_TEMP/publica/id"\n', 'la privada nunca sale del runner'],
  ['sandboxSeArreglaSolo', W, '          T=$(printf \'100644 blob %s\\tllave.pub\\n\' "$BL" | git mktree)\n', '          git add -f "$RUNNER_TEMP/llave/id.pub"\n          T=$(printf \'100644 blob %s\\tllave.pub\\n\' "$BL" | git mktree)\n', 'la privada nunca sale del runner'],
  ['sandboxSeArreglaSolo', W, '          BH=$(git hash-object -w "$RUNNER_TEMP/publica/hecho")\n', '          BH=$(git hash-object -w "$RUNNER_TEMP/llave/id")\n', 'la privada nunca sale del runner'],
  ['sandboxSeArreglaSolo', W, '      - name: (e) Esperar a que el sandbox vuelva', '      - uses: actions/upload-artifact@v4\n        with: { name: diagnostico, path: "${{ runner.temp }}" }\n      - name: (e) Esperar a que el sandbox vuelva', 'la privada nunca sale del runner'],
  // Solo su rama, y siempre se borra.
  ['sandboxSeArreglaSolo', W, '          git push -q origin "$C:refs/heads/$RAMA"\n', '          git push -q origin "$C:refs/heads/main"\n', 'solo se empuja a la rama rescate-llave'],
  ['sandboxSeArreglaSolo', W, '        if: always()\n        timeout-minutes: 2\n', '        timeout-minutes: 2\n', 'el último paso (if: always()) la borra siempre'],
  ['sandboxSeArreglaSolo', W, '          elif [ "$rc" = 0 ] && git push -q origin --delete "$RAMA"; then', '          elif [ "$rc" = 0 ] && true; then', 'el último paso (if: always()) la borra siempre'],
  ['sandboxSeArreglaSolo', W, '          rm -rf "$RUNNER_TEMP/llave"\n          git ls-remote', '          git ls-remote', 'el último paso (if: always()) la borra siempre'],
  ['sandboxSeArreglaSolo', W, '-lt 1500 ]', '-lt 6000 ]', 'se espera hasta 25 min al rescate'],
  ['sandboxSeArreglaSolo', W, "          rescate 'echo \"rescate: $(hostname) · raíz: $(findmnt -n -o SOURCE /)\"; ! findmnt -n -o SOURCE / | grep -q \"^/dev/[sv]d\"' \\\n            || { echo \"::error::Lo que contesta no es el sistema de rescate: no se toca el disco\"; exit 1; }\n", '', 'se comprueba que su raíz está en memoria'],
  ['migracionConTransaccion', NUEVA, null, 'create table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, '-- al revés\nbegin;\ncreate table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, 'begin;\ncreate index concurrently alreves_i on cities (id);\ncommit;\n', '«index concurrently» no puede ir dentro de begin/commit'],
  ['migracionConTransaccion', M, 'SALVO 16 viejas que no lo traen', 'como todas (los .sql traen begin/commit)', 'el encabezado de migrar.sh dice la verdad'],
  ['migrarUnaLectura', M, '  prev=${HECHAS[$n]:-}\n  if [ -z "$prev" ]; then', '  prev=$(psql -c "select sha256 from schema_migrations where name = \'$n\'")\n  if [ -z "$prev" ]; then', 'archivo por archivo'],
  ['migrarUnaLectura', M, '\nleer schema_migrations\nnuevas=0\n', '\nnuevas=0\n', 'lee schema_migrations y schema_seeds una vez'],
  ['migrarUnaLectura', M, '  { cat "$f"; printf \'\\n;\\n%s\\n\' "$sql"; } | psql -v', '  psql < "$f"\n  printf \'%s\\n\' "$sql" | psql -v', 'en la misma sesión de psql'],
  ['migrarUnaLectura', M, "where name = :'tl_m_nombre' and sha256 = :'tl_m_huella';\")\" != 1 ]", "where false;\")\" != 0 ]", 'se comprueba que quedó anotada'],
  ['migrarUnaLectura', C, '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then seccion "migraciones en una lectura (migrar.sh contra Postgres 16)"; bash pruebas/infra/migrar.test.sh || mal=1\n',
    '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then :\n', 'no corren pruebas/infra/migrar.test.sh'],
  ['imagenSoloLoQueUsa', I, '!docs/LAUNCH-CHECKLIST.md\n', '', 'docs/LAUNCH-CHECKLIST.md se lee al construir o al servir la imagen y el .dockerignore lo deja fuera'],
  ['imagenSoloLoQueUsa', I, '!apps/mobile/apps.json\n', '', 'apps/mobile/apps.json se lee al construir o al servir la imagen y el .dockerignore lo deja fuera'],
  ['imagenSoloLoQueUsa', AN, 'import APPS from "../../mobile/apps.json";', 'import APPS from "../../mobile/apps.json";\nimport "../../../scripts/ci/alcance.mjs";', 'scripts/ci/alcance.mjs se lee al construir'],
  // Tanda 5b · las lecturas del disco que el guardián no veía (relativas a process.cwd() sin ../, o por segmentos), en lista cerrada.
  ['imagenSoloLoQueUsa', 'apps/web/lib/zz-alreves-lee.ts', null, 'import { readFileSync } from "fs";\nimport path from "path";\nexport const t = () => readFileSync(path.join(process.cwd(), "docs/legal/us/terminos.md"), "utf8");\n', 'no está en la lista cerrada de lecturas'],
  ['imagenSoloLoQueUsa', 'apps/web/lib/zz-alreves-lee.ts', null, 'import { readFile } from "fs/promises";\nimport path from "path";\nexport const t = () => readFile(path.join(process.cwd(), "..", "..", "scripts", "legal", "indexar.mjs"), "utf8");\n', 'no está en la lista cerrada de lecturas'],
  ['imagenSoloLoQueUsa', 'apps/web/lib/ciudades/launch.ts', '  const f = CANDIDATOS().find((x) => existsSync(x));', '  const f = CANDIDATOS().find((x) => existsSync(x)) ?? (existsSync("/x") ? "/x" : undefined);', 'cambió el número de lecturas del disco'],
  ['imagenSoloLoQueUsa', I, '!docs/LAUNCH-CHECKLIST.md\n', '!docs/LAUNCH-CHECKLIST.md\n!infra/pruebas\n', '«!infra/pruebas» no lo lee el build'],
  ['imagenSoloLoQueUsa', I, '\n*\n!package.json', '\n!package.json', 'empieza con «*»'],
  ['imagenSoloLoQueUsa', I, '**/node_modules\n', '', 'no deja fuera **/node_modules'],
  ['imagenSoloLoQueUsa', DF, 'FROM deps AS build\n', 'FROM deps AS build\nARG TOLATINO_COMMIT=desconocido\n', 'el commit no entra al build'],
  ['imagenSoloLoQueUsa', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      args:\n        TOLATINO_COMMIT: ${TOLATINO_COMMIT:-desconocido}\n', 'no pasa el commit al build'],
  ['imagenSoloLoQueUsa', C, 'seccion "la imagen de la app: lo que BuildKit de verdad manda (contexto-imagen.test.sh)"; bash pruebas/infra/contexto-imagen.test.sh || mal=1\n', '', 'no corren pruebas/infra/contexto-imagen.test.sh'],
  ['imagenSoloSiCambia', D, '[ -n "$HUELLA" ] && [ -n "$IMAGEN_ANTES" ] && [ "$(cat /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA $IMAGEN_ANTES" ]',
    '[ -n "$HUELLA" ] && [ "$(cut -d" " -f1 /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA" ]', 'la huella Y el Id de la imagen'],
  ['imagenSoloSiCambia', L, '  estado=$(git status --porcelain --ignored -- .dockerignore infra/pruebas/Dockerfile "${rutas[@]}" 2>/dev/null) || return 0', '  estado=""', 'sin versionar o cambiado'],
  ['imagenSoloSiCambia', L, '  [ -n "$sucio" ] && return 0\n', '  printf \'%s\\n\' "$sucio" | grep -q . && return 0\n', 'sin «| grep -q»'],
  ['imagenSoloSiCambia', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      target: build\n', 'solo lleva «context: ../..» y «dockerfile'],
  ['imagenSoloSiCambia', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      args:\n        NODE_ENV: production\n', 'solo lleva «context: ../..» y «dockerfile'],
  ['imagenSoloSiCambia', C, 'seccion "la imagen de la app: su huella (huella-imagen.test.sh)"; bash pruebas/infra/huella-imagen.test.sh || mal=1\n', '', 'no corren pruebas/infra/huella-imagen.test.sh'],
  ['despliegueSinCorte', D, '\n# 3c) Base de datos: migraciones pendientes, en orden, una sola vez cada una (con la app vieja sirviendo). Si una falla, se detiene aquí.\nbash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"\n',
    '\n', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '  if ! "${COMPOSE[@]}" build web; then', '  if ! "${COMPOSE[@]}" up -d --build --remove-orphans; then', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '    log "la imagen no se pudo construir: la app sigue con lo de antes"\n    exit 1\n', '    log "la imagen no se pudo construir: se reintenta"\n    "${COMPOSE[@]}" build web || exit 1\n', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '"${COMPOSE[@]}" up -d db medios ||', '"${COMPOSE[@]}" up -d --build db medios ||', 'ningún «up -d --build»'],
  ['despliegueSinCorte', Y, 'como mucho.\n    init: true\n', 'como mucho.\n    init: false\n', '«barrido» para en el acto'],
  ['despliegueSinCorte', Y, '  push:\n    image: tolatino/web:pruebas\n', '  push:\n    stop_grace_period: 10s\n    image: tolatino/web:pruebas\n', '«push» para en el acto'],
  ['despliegueSinCorte', N, '    error_page 502 504 =503 /mantenimiento.html;\n', '', 'la página de mantenimiento (503)'],
  ['despliegueSinCorte', N, '    server_tokens off;\n', '', 'server_tokens off'],
  ['despliegueSinCorte', D, 'install -m 0644 "$REPO/infra/comun/mantenimiento/index.html" /var/www/mantenimiento/index.html || aviso', ': || aviso', 'instala la página de mantenimiento'],
  ['despliegueSinCorte', D, '  if [ -f "$NGINX_SITIO.buena" ]; then\n    cp -p "$NGINX_SITIO.buena" "$NGINX_SITIO"', '  if false; then\n    cp -p "$NGINX_SITIO.buena" "$NGINX_SITIO"', 'vuelve la última buena'],
  ['despliegueSinCorte', D, 'NGINX_SITIO=/etc/nginx/sites-available/tolatino-pruebas\n', 'NGINX_SITIO=/etc/nginx/sites-available/tolatino-pruebas\ncp -p "$NGINX_SITIO" "$NGINX_SITIO.anterior" || true\n', 'vuelve la última buena'],
  ['despliegueSinCorte', D, ' "${COMPOSE[@]}" \\\n  || aviso "la semilla de pruebas falló', ' "${COMPOSE[@]}"\ntrue \\\n  || aviso "la semilla de pruebas falló', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '"${COMPOSE_MAPA[@]}" up -d mapa || log "teselas', '"${COMPOSE_MAPA[@]}" up -d mapa; true || log "teselas', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '  nginx_recargar\nelse\n', '  systemctl reload nginx\nelse\n', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '\nbase_sana 60 10 || log "la base no quedó', '\nbase_lista 60 10 || log "la base no quedó', 'se espera a que Docker dé la base por «healthy»'],
  ['despliegueSinCorte', D, '  base_sana 60 10 || true\n', '  base_lista 60 10 || true\n', 'se espera a que Docker dé la base por «healthy»'],
  ['despliegueSinCorte', D, '  if [ "$SERVIDO" != "$COMMIT" ]; then', '  if false; then', 'el commit que dice /api/salud tiene que ser el desplegado'],
  ['despliegueSinCorte', D, '  ( umask 077\n', '  umask 077\n  (\n', 'el umask 077 solo en un subshell'],
  ['despliegueSinCorte', D, 'install -d -m 0755 /var/www/mantenimiento\n', 'mkdir -p /var/www/mantenimiento\n', 'carpeta de mantenimiento 755'],
  ['despliegueSinCorte', C, '  seccion "el orden del despliegue del sandbox: construir → migrar → cambiar (orden-despliegue.test.sh)"; bash pruebas/infra/orden-despliegue.test.sh || mal=1\n', '', 'orden-despliegue.test.sh'],
  ['despliegueSinCorte', C, 'seccion "la página de mantenimiento con el nginx del sandbox (mantenimiento-nginx.test.sh)"; bash pruebas/infra/mantenimiento-nginx.test.sh || mal=1\n', '', 'mantenimiento-nginx.test.sh'],
  ['despliegueConTramos', D, "\ntrap 'fin_tramos $?' EXIT\n", '\n', 'deja su línea de tramos en el registro y en /estado/tramos.txt'],
  ['despliegueConTramos', D, '\ntramo migraciones\n', '\n', 'falta «tramo migraciones» en su sitio'],
  ['despliegueConTramos', D, '\ntramo recrear\n', '\n', 'falta «tramo recrear» en su sitio'],
  ['despliegueConTramos', S, " · <a href='/estado/tramos.txt'>Tramos</a>", '', '/estado/ enlaza tramos.txt'],
  ['despliegueConTramos', O, "tramos (fallo en imagen, commit", "tramos (fallo, commit", 'la prueba del orden comprueba la línea de tramos'],
  // Tanda 5b · migracionReversible: lo que rompe las escrituras de la app vieja mientras se migra (construir → migrar → cambiar).
  ['migracionReversible', NUEVA, null, 'begin;\nalter table audit_entries add column alreves_x text not null;\ncommit;\n', 'NOT NULL sin valor por omisión en «audit_entries»'],
  ['migracionReversible', NUEVA, null, 'begin;\nalter table audit_entries alter column alreves_y set not null;\ncommit;\n', '«set not null» de «audit_entries.alreves_y»'],
  ['migracionReversible', NUEVA, null, 'begin;\nalter table operations add column alreves_z int, alter column city_id type bigint;\ncommit;\n', 'cambio de tipo de «operations.city_id»'],
  ['migracionReversible', NUEVA, null, 'begin;\ncreate or replace function patrocinio_devolucion(x integer) returns integer language sql as $$ select x $$;\ncommit;\n', 'otra firma de la función «patrocinio_devolucion»'],
  ['pruebasInfraAisladas', AI, 'unshare -m -n --propagation private', 'unshare -m --propagation private', 'montajes Y red aparte'],
  ['pruebasInfraAisladas', AI, 'AISLAR_RUTAS="/opt /etc/tolatino', 'AISLAR_RUTAS="/etc/tolatino', 'faltan: /opt'],
  ['pruebasInfraAisladas', SP, 'aislar_exige "$T/trabajo/infra/pruebas/tolatino-sync" TOLATINO_SYNC_REPO TOLATINO_SYNC_DIR || exit 1\n', '', 'aislar_exige comprueba que lee TOLATINO_SYNC_REPO'],
  ['pruebasInfraAisladas', O, 'AISLAR_VISIBLES="$T" aislado \'', 'unshare -m --propagation private bash -c \'', 'nada de «unshare» suelto'],
  ['pruebasInfraAisladas', C, 'if [ "$AISLADO" = 1 ]; then', 'if [ "$(id -u)" = 0 ]; then', 'aislar.test.sh primero'],
  // 26 nov · migracionContraeConMotivo: contraer sin su marca (o con un motivo de nada).
  ['migracionContraeConMotivo', NUEVA, null, 'begin;\nalter table alreves_t drop column alreves_c;\ncommit;\n', '«-- contraer: <por qué la app anterior ya no lo usa>» con el motivo (no la tiene)'],
  ['migracionContraeConMotivo', NUEVA, null, 'begin;\n-- contraer: ya no\ndrop table if exists alreves_vieja;\ncommit;\n', 'drop table de «alreves_vieja»: contraer lleva su marca'],
  ['migracionContraeConMotivo', NUEVA, null, 'begin;\nalter table alreves_t rename column alreves_a to alreves_b;\ncommit;\n', 'rename column de «alreves_a»'],
  ['migracionContraeConMotivo', NUEVA, null, 'begin;\nalter table alreves_t add column alreves_z int, alter column alreves_y type bigint;\ncommit;\n', 'cambio de tipo de «alreves_y»'],
  // 26 nov · migracionConTope: una tabla grande sin su tope (o con el tope mal puesto); migrar.sh sin reintento; la prueba y la lista pierden lo suyo.
  ['migracionConTope', NUEVA, null, 'begin;\ncreate index alreves_i on notifications (id);\ncommit;\n', 'toca la tabla grande «notifications»'],
  ['migracionConTope', NUEVA, null, "begin;\nset local lock_timeout = '5s';\nalter table media add column alreves_x int;\ncommit;\n", 'falta statement_timeout'],
  ['migracionConTope', NUEVA, null, "begin;\nset local lock_timeout = '0';\nset local statement_timeout = '1min';\nupdate operations set id = id where false;\ncommit;\n", 'lock_timeout de 0 no es razonable'],
  ['migracionConTope', NUEVA, null, "begin;\nset local lock_timeout = '5s';\nset local statement_timeout = '30min';\ndelete from audit_entries where false;\ncommit;\n", 'statement_timeout de 30min no es razonable'],
  ['migracionConTope', NUEVA, null, "begin;\ncreate index alreves_i on payments (id);\nset local lock_timeout = '5s';\nset local statement_timeout = '1min';\ncommit;\n", 'antes de la primera orden que la toca'],
  ['migracionConTope', NUEVA, null, 'begin;\ndo $$ begin update users set id = id where false; end $$;\ncommit;\n', 'toca la tabla grande «users»'],
  ['migracionConTope', M, '      intento=$((intento + 1)); sleep "$PAUSA"; continue\n', '      intento=$((intento + 1)); break\n', 'migrar.sh reintenta una migración que chocó con la app'],
  ['migracionConTope', MT, 'ok "pasa su statement_timeout:', 'ok "otra que falla:', 'una tabla ocupada (falla rápido, reintenta, lo dice) y un statement_timeout'],
  ['migracionConTope', F9, '`media`, `contact_taps` —', '`media` —', 'no tiene `contact_taps`'],
  // 26 nov · produccionMigraAntes: en producción, migrar termina antes del color nuevo; lo del repo se indexa solo si las migraciones entraron.
  ['produccionMigraAntes', AV, '  if ! MIGRAR_MOTIVO="$AV_ESTADO/migrar-motivo" "$@"; then', '  if ! "$@"; then', 'el azul/verde migra PRIMERO'],
  ['produccionMigraAntes', AV, '  rm -f "$AV_ESTADO/migrar-motivo"\n', '  av_compose "$nuevo" up -d --remove-orphans web\n  rm -f "$AV_ESTADO/migrar-motivo"\n', 'el azul/verde migra PRIMERO'],
  ['produccionMigraAntes', DP, '" av_migrar || rc=$?\n', '" av_migrar || rc=$?\n  indexar_docs "$REPO" "${PSQL[@]}"\n', 'producción: av_migrar corre migrar.sh y, solo si entró'],
  ['produccionMigraAntes', DP, ' bash "$REPO/infra/comun/psql-remoto.sh" || return 1\n    indexar_docs', ' bash "$REPO/infra/comun/psql-remoto.sh"\n    indexar_docs', 'producción: av_migrar corre migrar.sh y, solo si entró'],
  ['produccionMigraAntes', AT, 'caso "orden: migrar y después el color nuevo"', 'caso "orden"', 'azulverde.test.sh comprueba que se migra antes del color nuevo'],
  ['produccionMigraAntes', O, '$(r=$(correr ocupada);', '$(r=$(correr migracion);', 'orden-despliegue.test.sh comprueba que una migración que falla'],
  // 23 nov · despliegueCorto: la imagen pierde una de sus cachés (o la llave estable que hace servir la de webpack), la llave queda escrita, deploy.sh
  // construye sin caché, tolatino-sync vuelve a 60 s.
  ['despliegueCorto', DF, 'RUN --mount=type=cache,id=tolatino-pnpm,target=/pnpm/store,sharing=locked \\\n    pnpm install --frozen-lockfile --store-dir /pnpm/store\n', 'RUN pnpm install --frozen-lockfile\n', 'la capa de dependencias copia solo los manifiestos'],
  ['despliegueCorto', DF, 'FROM base AS deps\n', 'FROM base AS deps\nCOPY . .\n', 'la capa de dependencias copia solo los manifiestos'],
  ['despliegueCorto', DF, 'RUN --mount=type=cache,id=tolatino-next,target=/repo/apps/web/.next/cache,sharing=locked \\\n', 'RUN ', 'usa la caché de BuildKit en /repo/apps/web/.next/cache'],
  ['despliegueCorto', DF, 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat "$K")" pnpm', 'pnpm', 'la llave de las acciones del servidor, estable'],
  // 24 nov (decisión AR) · tiposAntesDeLaImagen: los tipos se saltan solo en la imagen y se revisan antes en cada subida y en el CI.
  ['tiposAntesDeLaImagen', 'apps/web/next.config.ts', 'ignoreBuildErrors: process.env.TOLATINO_TIPOS_YA_REVISADOS === "1"', 'ignoreBuildErrors: true', 'los tipos se saltan en el build SOLO con'],
  ['tiposAntesDeLaImagen', 'infra/pruebas/zz-alreves-tipos.sh', null, 'export TOLATINO_TIPOS_YA_REVISADOS=1\n', 'solo la pone la receta de la imagen'],
  ['tiposAntesDeLaImagen', '.github/workflows/ci.yml', '      - run: pnpm typecheck\n', '      - run: echo sin tipos\n', 'el CI revisa los tipos en cada push'],
  ['tiposAntesDeLaImagen', 'scripts/ci/subir.mjs', '  tipos: ["pnpm", ["exec", "turbo", "run", "typecheck", "--force"]],\n', '  tipos: ["true", []],\n', 'cada subida revisa los tipos aquí'],
  ['despliegueCorto', DF, '-mtime +13', '-mtime +9999', 'la llave de las acciones del servidor, estable'],
  ['despliegueCorto', DF, 'ENV NEXT_TELEMETRY_DISABLED=1\nCOPY . .', 'ENV NEXT_TELEMETRY_DISABLED=1\nENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=abcdefghijklmnop\nCOPY . .', 'nunca va escrita en la receta'],
  ['despliegueCorto', 'infra/pruebas/zz-alreves.env', null, 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz012345\n', 'escrita en el repo'],
  ['despliegueCorto', D, '  if ! "${COMPOSE[@]}" build web; then', '  if ! "${COMPOSE[@]}" build web --no-cache; then', 'sin --no-cache'],
  ['despliegueCorto', D, 'OnUnitActiveSec=20\\nAccuracySec=1s', 'OnUnitActiveSec=60', 'cada 20 s con AccuracySec=1s'],
  ['despliegueCorto', 'infra/pruebas/cloud-init.yml', '      OnUnitActiveSec=20\n      AccuracySec=1s\n', '      OnUnitActiveSec=60\n', 'el cloud-init del sandbox nace'],
  // 24 nov · vistaPreviaRetirada: la vista previa vuelve por la puerta de atrás o el paso de limpieza de deploy.sh deja de limpiar, toca de más o corta.
  ['vistaPreviaRetirada', 'infra/pruebas/vista-previa', null, 'VISTA_ENCENDIDA=1\n', 'su carpeta no vuelve'],
  ['vistaPreviaRetirada', N, '    listen 80 default_server;\n', '    listen 80 default_server;\n    listen 8081;\n', 'ni su puerto (8081)'],
  ['vistaPreviaRetirada', 'infra/pruebas/zz-alreves-dev.sh', null, 'pnpm --filter @tolatino/web exec next dev -p 3000\n', 'ni un «next dev»'],
  ['vistaPreviaRetirada', 'infra/pruebas/zz-alreves-puerto.yml', null, 'ports: ["127.0.0.1:3010:3010"]\n', 'ni el de su servidor (3010)'],
  ['vistaPreviaRetirada', 'infra/produccion/zz-alreves.yml', null, 'image: tolatino/vista-previa:pruebas\n', 'solo la nombra el paso de limpieza'],
  ['vistaPreviaRetirada', D, '\ntramo nginx\n', '\ntramo nginx\ndocker stop tolatino-pruebas-vista-previa-1 || true\n', 'solo la nombra el paso de limpieza'],
  ['vistaPreviaRetirada', D, 'docker rm -f "$c"', 'docker stop "$c"', 'docker rm -f del contenedor'],
  ['vistaPreviaRetirada', D, ' do quedaba=1; docker image rm -f "$i" >/dev/null 2>&1 || true; done', ' do quedaba=1; done', 'la imagen tolatino/vista-previa'],
  ['vistaPreviaRetirada', D, ' /var/www/vista /etc/tolatino/vista.env; do', ' /etc/tolatino/vista.env; do', 'las tres rutas'],
  ['vistaPreviaRetirada', D, '  case "$r" in existia*)', '  rm -rf /var/lib/tolatino\n  case "$r" in existia*)', 'solo borra sus tres rutas'],
  ['vistaPreviaRetirada', D, "  if exists (select 1 from pg_roles where rolname = 'tolatino_vista') then\n", '  if true then\n', 'solo si existe'],
  ['vistaPreviaRetirada', D, '    drop owned by tolatino_vista;\n', '', '«drop owned by» y «drop role»'],
  ['vistaPreviaRetirada', D, '    drop role tolatino_vista;\n', '    drop role tolatino_vista;\n    drop role tolatino;\n', 'solo toca a tolatino_vista'],
  ['vistaPreviaRetirada', D, '  ) || return 1\n', '  ) || exit 1\n', 'nunca corta el despliegue'],
  ['vistaPreviaRetirada', D, '\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n', '\nretirar_vista_previa\n', 'se llama una sola vez y con «|| log …»'],
  ['vistaPreviaRetirada', D, '\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n\ntramo nginx\n', '\n\ntramo nginx\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n', 'antes de nginx'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (g, que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián NO falló'}`);
  if (l) bien++;
};
for (const [g, f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  if (a === null) {
    if (fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: ${f} ya existe (el caso lo crea)`); continue; }
    fs.writeFileSync(ruta, b);
    try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.rmSync(ruta, { force: true }); }
    continue;
  }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
