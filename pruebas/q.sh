#!/bin/bash
# 9a · psql contra la base local de las pruebas (lee SQL de la entrada; salida «a|b|c» sin encabezados).
# Uso: echo "select count(*) from users" | bash pruebas/q.sh
exec docker exec -i "${PRUEBAS_DB_CONT:-tlprueba-db-1}" sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -At -F "|"'
