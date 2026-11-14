# 9o · pgBackRest (fase9-apertura.md §3.4). PLANTILLA: deploy.sh la llena en el servidor (/etc/tolatino/pgbackrest.conf, 0640) con el almacén y la llave;
# aquí no hay ni un secreto. Respaldo completo diario + diferencial cada 6 h + WAL continuo (archive_command) → recuperación a un punto en el tiempo de
# hasta 35 días. Cifrado del lado del servidor (aes-256-cbc, RESPALDO_LLAVE: nace en la máquina de la base y viaja solo en el sobre de recuperación).
[global]
repo1-type=s3
repo1-s3-endpoint=__S3_ENDPOINT__
repo1-storage-port=__S3_PUERTO__
repo1-s3-region=__S3_REGION__
repo1-s3-bucket=__S3_BUCKET__
repo1-s3-key=__S3_KEY__
repo1-s3-key-secret=__S3_SECRET__
repo1-s3-uri-style=path
repo1-storage-verify-tls=__S3_VERIFICAR_TLS__
repo1-path=/pgbackrest/__ENTORNO__
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=__RESPALDO_LLAVE__
repo1-retention-full-type=time
repo1-retention-full=35
archive-async=y
spool-path=/var/lib/pgbackrest
start-fast=y
compress-type=zst
process-max=2
log-level-console=warn
log-level-file=info

[tolatino]
pg1-path=/var/lib/postgresql/data
pg1-user=tolatino
