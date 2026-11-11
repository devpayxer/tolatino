#!/bin/bash
# 9a · Imita «docker compose --env-file … -f … exec -T db …» contra el contenedor local de las pruebas, para correr migrar.sh en local:
#   bash packages/db/migrar.sh pruebas/fakecompose.sh x
#   SEMILLA_DIR=infra/pruebas/semilla bash packages/db/migrar.sh --semilla-pruebas pruebas/fakecompose.sh x
# migrar.sh llama «<esto> x exec -T db psql …»: se saltan las cuatro primeras palabras (x exec -T db).
shift 4; exec docker exec -i "${PRUEBAS_DB_CONT:-tlprueba-db-1}" "$@"
