# Respaldos de la base de producción

> Léelo entero **antes** de necesitarlo. El día que haga falta restaurar no es
> el día de aprender cómo se hace.

## Decisión vigente (2026-08-04): el respaldo principal es el plan Pro de Supabase

El fundador decidió pagar el **plan Pro**. Da copias diarias gestionadas **más
recuperación a un punto en el tiempo (PITR)**: volver a «ayer a las 14:32», no
solo al volcado nocturno. Eso el script de este repo no lo puede dar, y es la
diferencia que importa cuando perder medio día de pedidos cuesta dinero.

**El trabajo de GitHub Actions sigue existiendo, pero con el diario APAGADO** —
solo se lanza a mano desde Actions → «Run workflow». No se borró por una razón
concreta: **las copias de Supabase viven dentro de Supabase.** Si la cuenta se
bloquea, un pago falla o el proyecto se borra por error, esas copias se van con
él. Este es el plan B de fuera, y cuesta cero tenerlo ahí.

**Para reactivarlo:** descomenta las dos líneas del `schedule` en
`.github/workflows/respaldo-produccion.yml` y crea los dos secretos de más
abajo.

### Qué comprobar DESPUÉS de pagar

Que el plan esté cobrado no significa que las copias estén activas. Verificar:

1. En Supabase → proyecto `tolatino-prod` → **Database** → **Backups**: que
   aparezcan copias listadas y que **PITR** salga habilitado.
2. Que el proyecto de **pruebas** (`tolatino`) no esté generando coste que no
   quieres: el plan Pro se contrata por *organización*, y una organización con
   dos proyectos puede facturar cómputo por los dos.
3. Si las copias de Supabase incluyen **Storage** (las fotos) o solo la base de
   datos. Si solo cubren la base, el hueco de las fotos **sigue abierto** — ver
   la tabla de «Lo que NO cubre».

## Qué hay montado (el plan B, hoy solo manual)

Un trabajo de GitHub Actions (`.github/workflows/respaldo-produccion.yml`) que
**cada día a las 07:40 UTC** (≈02:40 en Houston):

1. Vuelca la base de **producción** (`tolatino-prod`, `vurqsebgsacickxsxfeh`).
2. Comprueba que el volcado sirve: que se puede leer y que **están las tablas
   que tienen que estar** (`businesses`, `posts`, `profiles`, `business_orders`,
   `auth.users`). Si falta alguna, **falla y avisa**.
3. Lo **cifra** con AES-256.
4. Lo guarda como *artifact* de la ejecución, **90 días**.
5. **Ensaya la restauración**: levanta un Postgres limpio, restaura la copia del
   día y cuenta filas. Si el ensayo falla, avisa — pero **nunca** tira el
   respaldo: la copia ya está guardada antes de que el ensayo empiece.

**Por qué va cifrado:** el repositorio es **público**, y en un repo público
cualquiera puede descargar los artifacts. El volcado lleva correos, teléfonos,
direcciones y pedidos. Sin la contraseña, el archivo es ruido.

## Lo que NO cubre

Esto importa tanto como lo que sí cubre:

| No cubierto | Por qué | Qué pasaría |
|---|---|---|
| **Las fotos** | Viven en Supabase Storage (S3), no dentro de Postgres | Un desastre total perdería las imágenes de negocios, publicaciones y perfiles. Las filas quedarían apuntando a archivos que ya no están. |
| **Secretos de las Edge Functions** | Están en el almacén de Supabase | Hay que reponer a mano las claves de Stripe y VAPID |
| **Configuración del proyecto** | Vive en el panel de Supabase | SMTP, plantillas de correo, límites: se reponen a mano |

## Puesta en marcha (una sola vez, la hace el fundador)

Hacen falta **dos secretos** en GitHub. No pueden vivir en el repo: son
credenciales, y el repo es público.

**Ve a** `github.com/devpayxer/tolatino` → **Settings** → **Secrets and
variables** → **Actions** → **New repository secret**.

### Secreto 1 · `PROD_DB_URL`

En Supabase → proyecto **`tolatino-prod`** → **Connect** (arriba) → pestaña
**Session pooler** → copia la cadena completa y **sustituye `[YOUR-PASSWORD]`**
por la contraseña de la base.

Tiene esta forma:

```
postgresql://postgres.vurqsebgsacickxsxfeh:TU_CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

> **Session pooler, no Transaction pooler.** El de transacciones (puerto 6543)
> no sirve para `pg_dump`. Y el enlace «directo» (`db.<ref>.supabase.co`) es
> IPv6, que los servidores de GitHub no alcanzan.
>
> Si no recuerdas la contraseña de la base: Supabase → Settings → Database →
> **Reset database password**. Cambiarla no rompe la app (el navegador usa la
> clave anon, no esta).

### Secreto 2 · `BACKUP_PASSPHRASE`

Una contraseña **larga y aleatoria** — 30+ caracteres. Guárdala en tu gestor de
contraseñas **antes** de pegarla aquí.

> ⚠️ **Si pierdes esta contraseña, pierdes todos los respaldos.** No hay forma de
> recuperarlos: ese es el objetivo del cifrado. GitHub tampoco te la puede
> enseñar después de guardarla.

### Comprobar que funciona

Repo → pestaña **Actions** → **Respaldo diario de producción** → botón **Run
workflow**. En un par de minutos debe quedar en verde y aparecer el artifact
`respaldo-produccion-AAAA-MM-DD`. Si sale en rojo, el propio error dice cuál de
los dos secretos falta o falla.

## Cómo restaurar

### Recuperar UNA tabla que se borró por accidente

Lo más habitual, y no hace falta tocar el resto de la base.

```bash
# 1. Descarga el artifact del día que quieras (Actions → esa ejecución)
#    y descomprime el .zip. Dentro está el .dump.gpg

# 2. Descífralo (te pedirá la contraseña)
gpg --decrypt --output copia.dump tolatino-prod-2026-08-04.dump.gpg

# 3. Mira qué hay dentro, sin restaurar nada
pg_restore --list copia.dump | grep "TABLE DATA"

# 4. Restaura SOLO esa tabla
pg_restore --data-only --table=businesses \
  --no-owner --no-privileges \
  --dbname "postgresql://postgres.vurqsebgsacickxsxfeh:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  copia.dump
```

### Restaurar la base entera (desastre)

**No restaures encima de producción a ciegas.** El orden correcto:

1. Crea un proyecto NUEVO en Supabase.
2. Restaura ahí (`pg_restore --no-owner --no-privileges --dbname <nuevo>`).
3. Comprueba que los datos están: cuenta negocios, pedidos y usuarios.
4. Solo entonces apunta la app al proyecto nuevo (`apps/web/.env.production`).

Restaurar sobre la base rota puede dejarte sin ninguna de las dos versiones.

### Errores que son NORMALES al restaurar

Verás avisos sobre extensiones (`postgis`, `pgcrypto`, `pgsodium`, `vault`) y
sobre roles que no existen. Es esperado: el volcado se hace con
`--no-owner --no-privileges` y las extensiones las pone Supabase por su cuenta.
**Lo que decide si la restauración salió bien son las filas**, no los avisos.
El ensayo diario cuenta exactamente eso.

## Qué se probó, y qué no

Verificado el 2026-08-04 contra un Postgres real (no leyendo el código):

- ✅ El volcado se hace y se puede leer.
- ✅ La comprobación de contenido **detecta** un volcado al que le falta una
  tabla (probado quitando `businesses` a propósito).
- ✅ El cifrado y el descifrado devuelven un archivo **idéntico** (mismo MD5).
- ✅ Con la contraseña equivocada, el archivo **no se abre**.
- ✅ La restauración completa deja las filas exactas: 600 negocios, 3.000
  publicaciones, los perfiles y las cuentas.

**Lo que NO se pudo probar desde aquí:** la conexión real a producción. Este
entorno no alcanza el puerto de Postgres de Supabase; los servidores de GitHub
sí. Por eso el primer «Run workflow» manual lo tienes que lanzar tú — es el
único paso que falta por confirmar.

## Cuándo dejar esto por el plan Pro de Supabase

Este montaje da **una copia al día**. El plan Pro ($25/mes) da copias diarias
gestionadas **más recuperación a un punto en el tiempo** (PITR): volver a las
14:32 de ayer, no al volcado de las 02:40. La diferencia importa cuando perder
medio día de pedidos cuesta dinero de verdad.

**Regla:** el día del primer pedido pagado de verdad, súbete a Pro. Hasta
entonces, esto sobra y cuesta cero.

---

# Plan para el LANZAMIENTO (acordado 2026-08-04)

> Esto es lo que hay que tener montado **antes** de que entre el primer pedido
> pagado de verdad. Hoy no hace falta: la base tiene una cuenta y 49 kB de fotos.

## La pregunta correcta no es «qué respaldo», es «de qué desastre me protejo»

Cada capa cubre una cosa distinta. Ninguna cubre las demás, y por eso hacen
falta varias:

| Lo que puede pasar | Qué te salva | Qué NO te salva |
|---|---|---|
| «Borré una tabla hace 3 horas» / una migración se comió los pedidos | **PITR** (Supabase Pro): volver al minuto exacto de antes | Un volcado nocturno: perderías el día entero |
| Un bug lleva 3 días estropeando datos y te enteras hoy | Historial de varios días (PITR de 7 días + copias diarias) | Una sola copia: ya está sobrescrita |
| La cuenta se bloquea, falla el pago, borras el proyecto, incidente del proveedor | **La copia de FUERA** (el workflow de este repo) | PITR y las copias de Supabase: viven DENTRO de Supabase |
| Se pierden las fotos | **Sincronización de Storage** aparte | Ni PITR ni `pg_dump` las tocan: no están en Postgres |
| Hay que reconstruir el proyecto entero desde cero | Migraciones + Edge Functions (ya en git) + un cuaderno con la config del panel | Solo los datos: te quedas con filas y sin app |
| El respaldo llevaba 3 semanas fallando y nadie lo sabía | **Monitorización** | Todo lo anterior. Es el fallo más común y el más tonto |

## Lo primero que hay que decidir (y es una decisión de negocio, no técnica)

**¿Cuántos minutos de pedidos puedes permitirte perder?**

No es una pregunta retórica. Si una taquería recibe pedidos a las 13:40 y
restauras al volcado de las 02:40, esa gente pagó y **no hay registro de su
comida**. Para una app que cobra, la respuesta razonable es **minutos, no
horas** — y eso es exactamente lo que compra el PITR y lo que ningún volcado
nocturno puede dar.

Escríbelo como número antes de montar nada: es lo que decide si el plan basta.

## Las cuatro capas, en orden de importancia

### 1. Supabase Pro · PITR — el 90% de los sustos
Copias diarias gestionadas + recuperación a un punto en el tiempo. Cubre el caso
que de verdad ocurre: el error humano de hace unas horas. Cero mantenimiento.
**~$25/mes.**

### 2. Copia semanal FUERA de Supabase — el seguro contra perder la cuenta
Reactivar el workflow de este repo (`schedule` descomentado). Cifrado, con
verificación de contenido y ensayo de restauración. **Cambiar el destino de los
artifacts de GitHub a Cloudflare R2** (10 GB gratis, sin coste de salida): los
artifacts caducan a los 90 días y no permiten retención larga.

Retención recomendada: **diarias 30 días · semanales 3 meses · mensuales 12
meses**. Las mensuales importan por una razón poco obvia: una disputa de pago o
una consulta fiscal puede llegar meses después. Pesa céntimos.

### 3. Las fotos (Storage) — hoy 49 kB, mañana el catálogo de cada negocio
`pg_dump` guarda los METADATOS (qué archivo tenía cada negocio), no los
archivos. Restaurar solo la base dejaría cada ficha apuntando a una imagen que
ya no existe.

Hace falta un trabajo aparte que sincronice el bucket `post-photos` a R2 (`rclone`
o el SDK de S3 — Supabase Storage habla S3). Necesita la clave `service_role`
guardada como secreto, y el repo es **público**: decidir con cuidado, o mover el
repo a privado antes.

**Antes de montarlo, comprobar si Supabase Pro ya respalda Storage.** Si lo
hace, esta capa se simplifica a la copia externa.

### 4. Lo que no son datos — el cuaderno de reconstrucción
Con la base restaurada pero sin esto, no hay app. Ya está casi todo en git:

- ✅ Esquema → `supabase/migrations/`
- ✅ Lógica de servidor → `supabase/functions/` (11 funciones)
- ❌ **Secretos** de las Edge Functions (Stripe, VAPID, webhook)
- ❌ **Config del panel**: SMTP, plantillas de correo, límites de envío,
  proveedores de auth, URLs de redirección
- ❌ **Config de Stripe**: endpoint del webhook y qué eventos escucha

Lo que falta se documenta en un cuaderno (no los secretos en sí: dónde están y
cómo se reponen). Media hora de trabajo que el peor día vale su peso en oro.

## Las dos cosas que casi nadie hace, y son las que fallan

### El ENSAYO de restauración
**Un respaldo es una hipótesis hasta que lo restauras.** El workflow ya ensaya a
diario contra un Postgres limpio y cuenta filas. Además, **cada trimestre**, un
ensayo de verdad hecho a mano: restaurar en un proyecto nuevo, abrir la app
contra él y comprobar que se entra, que los pedidos están y que las fotos
cargan. Cronometrarlo — ese número es tu tiempo real de recuperación.

### La MONITORIZACIÓN
El modo de fallo más común de un respaldo no es que se corrompa: es que **dejó
de ejecutarse hace tres semanas y nadie miró**. Hace falta un aviso cuando no
haya copia correcta en 48 h. Sin esto, todo lo demás es decorado.

## El otro paracaídas que ya existe: Stripe

Para el dinero, **Stripe es una fuente de verdad independiente**. Si la base
perdiera pedidos, los cobros siguen en Stripe con su importe, su fecha y su
comprador. Reconstruir «quién pagó qué» es posible aunque el respaldo fallara.

No sustituye al respaldo —Stripe no sabe qué platillos llevaba el pedido ni a qué
dirección iba— pero es la red por debajo de la red, y conviene tenerlo escrito en
el procedimiento de recuperación.

## Coste total del plan

| Concepto | Coste |
|---|---|
| Supabase Pro (PITR + copias) | ~$25/mes |
| Cloudflare R2 (10 GB gratis) | $0 |
| GitHub Actions | $0 |
| **Total** | **~$25/mes** |

Todo lo demás es trabajo, no dinero.

## Orden en que lo montaría

1. **Pagar Pro y VERIFICAR** que PITR sale activo (no dar por hecho que pagar = respaldado).
2. **Reactivar la copia externa** semanal, con destino R2 y retención larga.
3. **Monitorización**: aviso si no hay copia correcta en 48 h.
4. **Sincronizar las fotos** a R2.
5. **Escribir el cuaderno** de reconstrucción.
6. **Primer ensayo completo cronometrado**, y repetirlo cada trimestre.

Los pasos 1 a 3 son los que no pueden faltar el día del lanzamiento. Del 4 al 6
pueden ir en la primera semana, pero no más allá.
