#!/bin/bash
# 9o · Anotar en la base lo que pasó en un despliegue (deploy_releases e incident_log, 0145) y la huella de las llaves del servidor (server_keys). Lo cargan
# los deploy.sh con «source». Nunca detiene un despliegue: si la base no contesta, se dice en el registro y se sigue. Los valores pasan como variables de
# psql (:'x'), nunca pegados en el SQL; los que vienen de afuera se revisan antes (hex, digest, nombres de la lista).
# Uso: PSQL=(… psql … -v ON_ERROR_STOP=1 -qAt) definido por quien lo carga.

hex_o_nada() { [[ "${1:-}" =~ ^[0-9a-f]{7,40}$ ]] && echo "$1" || echo ""; }
digest_o_nada() { [[ "${1:-}" =~ ^sha256:[0-9a-f]{64}$ ]] && echo "$1" || echo ""; }

# registrar_despliegue ENTORNO COMMIT PREVIO DIGEST COLOR INICIO SANO RESULTADO MOTIVO VIGILANCIA_JSON VUELTA_S OK_REF
#   INICIO y SANO en ISO-8601 (SANO vacío si nunca quedó sano). Las migraciones que aplicó = las de schema_migrations desde INICIO.
#   Imprime el id de la fila (o nada).
registrar_despliegue() {
  local entorno="$1" commit previo digest color="$5" inicio="$6" sano="$7" res="$8" motivo="$9" vig="${10:-}" vuelta="${11:-}" okref="${12:-}"
  [ -n "$vig" ] || vig='{}'
  commit=$(hex_o_nada "$2"); previo=$(hex_o_nada "$3"); digest=$(digest_o_nada "$4")
  [ -n "$commit" ] || { log "registro: commit inválido, no se anota"; return 0; }
  [[ "$vuelta" =~ ^[0-9]*$ ]] || vuelta=""
  "${PSQL[@]}" -v e="$entorno" -v c="$commit" -v p="$previo" -v d="$digest" -v k="$color" -v i="$inicio" -v s="$sano" -v r="$res" -v m="$motivo" \
      -v w="$vig" -v b="$vuelta" -v o="$okref" 2>/dev/null <<'SQL' || { log "registro: la base no anotó el despliegue (sigue igual)"; return 0; }
insert into deploy_releases (entorno, commit_sha, previous_sha, image_digest, color, migrations_applied, started_at, healthy_at, result, reason, watch, rollback_s, founder_ok_ref)
select :'e', :'c', nullif(:'p', ''), nullif(:'d', ''), nullif(:'k', ''),
       coalesce((select array_agg(name order by name) from schema_migrations where applied_at >= (:'i')::timestamptz), '{}'),
       (:'i')::timestamptz, nullif(:'s', '')::timestamptz, :'r', nullif(:'m', ''), (:'w')::jsonb, nullif(:'b', '')::int, nullif(:'o', '')
returning id;
SQL
}

# abrir_incidente ENTORNO SEVERIDAD CASO VISTO HECHO ORIGEN [DESPLIEGUE_ID] [CERRADO=1]
#   CASO es el nombre de un archivo de docs/incidentes/ (sin .md); el manual_ref se arma de ahí.
abrir_incidente() {
  local entorno="$1" sev="$2" caso="$3" visto="$4" hecho="$5" origen="$6" dep="${7:-}" cerrado="${8:-0}"
  [[ "$caso" =~ ^[a-z][a-z0-9-]{2,40}$ ]] || return 0
  [[ "$dep" =~ ^[0-9]*$ ]] || dep=""
  "${PSQL[@]}" -v e="$entorno" -v sv="$sev" -v k="$caso" -v vi="$visto" -v h="$hecho" -v o="$origen" -v dp="$dep" -v ce="$cerrado" 2>/dev/null <<'SQL' || log "registro: la base no anotó el incidente"
insert into incident_log (entorno, started_at, ended_at, severity, kind, seen, done, manual_ref, source, deploy_release_id)
values (:'e', now(), case when :'ce' = '1' then now() end, :'sv', :'k', :'vi', nullif(:'h', ''), 'docs/incidentes/' || :'k' || '.md', :'o', nullif(:'dp', '')::bigint);
SQL
}

# anotar_llave ENTORNO NOMBRE MAQUINA HUELLA [VENCE AAAA-MM-DD]: la huella viva de una llave del servidor (nunca la llave); una nueva retira la anterior.
anotar_llave() {
  local e="$1" n="$2" m="$3" fp="$4" v="${5:-}"
  [[ "$fp" =~ ^[a-f0-9]{16,64}$ ]] || return 0
  [[ "$v" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || v=""
  "${PSQL[@]}" -v e="$e" -v n="$n" -v m="$m" -v f="$fp" -v d="$v" >/dev/null 2>&1 <<'SQL' || log "registro: no se anotó la huella de $n"
select server_key_anotar(:'e', :'n', :'m', :'f', nullif(:'d', '')::date);
SQL
}
