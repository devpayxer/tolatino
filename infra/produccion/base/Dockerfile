# 9o · La base de producción: la misma Postgres 16 + PostGIS 3.5 del sandbox (postgis/postgis:16-3.5) más pgBackRest (MIT) para el respaldo físico
# continuo (completo diario, diferencial cada 6 h, WAL continuo) a un almacén de objetos en otra región, cifrado con RESPALDO_LLAVE. La misma imagen
# sirve a la réplica de lectura y a la restauración de prueba semanal (infra/comun/respaldos/restaurar-prueba.sh).
FROM postgis/postgis:16-3.5
RUN apt-get update \
 && apt-get install -y --no-install-recommends pgbackrest ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /var/log/pgbackrest /var/lib/pgbackrest /tmp/pgbackrest \
 && chown -R postgres:postgres /var/log/pgbackrest /var/lib/pgbackrest /tmp/pgbackrest
