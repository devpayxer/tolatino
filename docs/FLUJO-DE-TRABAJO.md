# Flujo de trabajo — desarrollar → probar → publicar

> Creado el 2026-07-29, cuando el fundador pidió "el flow de developer primero,
> test, y luego push a producción". Antes NO existía: cualquier cambio iba directo
> a producción y no había dónde probar sin ensuciar la base real.

## El problema que resuelve

La app es un **export estático**: la dirección de la base de datos se **incrusta
al compilar**. Vercel construye TODAS las ramas — así que una URL de vista previa
se compilaba con `.env.production` y **escribía en la base REAL**. "Probar antes
de publicar" habría creado negocios, pedidos y usuarios de mentira en producción.

## Cómo funciona ahora (automático, sin tocar el panel de Vercel)

`apps/web/next.config.mjs` mira `VERCEL_ENV`, que Vercel pone solo:

| Rama | `VERCEL_ENV` | Base que se hornea | Datos que verás |
|---|---|---|---|
| `claude/tolatino-repo-setup-1efdil` (producción) | `production` | **prod** `vurqsebgsacickxsxfeh` | Los reales (hoy: vacíos) |
| Cualquier otra rama | `preview` | **pruebas** `zpkaxojonufdwgahiqjh` | 548 negocios sembrados |

Y `scripts/verify-build.mjs` **rompe el build** si la base horneada no coincide
con el destino — en las dos direcciones:
- producción leyendo la base de pruebas (pasó de verdad: semanas sirviendo staging);
- una vista previa apuntando a producción (una prueba escribiendo en real).

## El flujo, paso a paso

1. **Claude desarrolla** en la rama de trabajo (`claude/…`), nunca en la de producción.
2. **Claude verifica localmente**: `tsc` + `pnpm build` (el guardián corre solo) +
   capturas en un navegador real a 390×844.
3. **Claude publica la rama** → Vercel crea una **URL de vista previa**.
   Esa URL usa la **base de pruebas**: el fundador puede tocar todo — registrarse,
   publicar negocios, hacer pedidos de prueba — **sin ensuciar producción**.
4. **El fundador prueba en su teléfono** y aprueba o pide cambios.
   *Aquí es donde se aprueba el DISEÑO: es más barato aprobar una pantalla que
   rehacer una pantalla ya conectada.*
5. **Solo con el visto bueno**, Claude hace `ff-merge` a la rama de producción y
   Vercel publica en `tolatino.com`.
6. **Claude verifica el sitio EN VIVO** (no asume): que la base horneada sea la de
   producción y que la pantalla se vea bien.

## Por qué el sitio de pruebas NO va en `tolatino.com`

Se llegó a crear `pruebas.tolatino.com` y **se deshizo el mismo día** (2026-07-29)
por una objeción del fundador que era correcta: *"cualquier usuario podría
encontrar este sitio"*.

Tenía razón, y hay un motivo técnico concreto: **todo subdominio es público**.
Al emitirse su certificado SSL, el nombre queda registrado en los *Certificate
Transparency logs*, que cualquiera puede consultar (crt.sh y similares). Un
`pruebas.tolatino.com` sería encontrable en minutos, y quien entrara vería
negocios sembrados y precios que no existen **con la marca del sitio real**.

**Decisión:** el sitio de pruebas vive en la URL que da Vercel para la rama
(`tolatino-git-pruebas-….vercel.app`) — fuera del dominio de marca. Además:

1. **`robots.txt` prohíbe TODO** en el build de pruebas (`Disallow: /`), y la
   cabecera `robots` del HTML añade `noindex, nofollow, nocache`. Cinturón y
   tirantes: aunque alguien enlace el sitio, Google no lo indexa.
2. **Franja ámbar imposible de ignorar** arriba de todo: *"SITIO DE PRUEBAS · LOS
   DATOS NO SON REALES"*. Solo aparece cuando el build apunta a la base de pruebas.
3. Producción no se ve afectada: su `robots.txt` sigue permitiendo el rastreo (el
   SEO es adquisición gratis) y no lleva franja. Verificado compilando las dos.

Si algún día hace falta cerrarlo del todo, Vercel ofrece protección por contraseña
en sus planes de pago; hoy no se paga por eso.

## Dónde encontrar la URL de vista previa

En **vercel.com** → proyecto **tolatino** → pestaña **Deployments**. El despliegue
más reciente de la rama `claude/…` tiene su propia URL (`tolatino-git-…vercel.app`).
Claude también la puede pegar en el chat al terminar cada cambio.

## Comandos (para Claude, no para el fundador)

```bash
# construir como si fuera una vista previa (base de PRUEBAS)
TOLATINO_TARGET=staging pnpm --filter @tolatino/web build

# construir para producción (por defecto)
pnpm --filter @tolatino/web build

# comprobar un build ya hecho contra un destino concreto
TOLATINO_TARGET=staging node scripts/verify-build.mjs
STRIPE_EXPECT=live node scripts/verify-build.mjs   # exigir Stripe en vivo
```

## Reglas que NO se saltan

- **Nunca** se trabaja directo en la rama de producción.
- **Nunca** se publica a producción sin que el fundador haya visto la vista previa,
  salvo que él lo pida explícitamente (arreglos urgentes).
- **Siempre** se verifica sobre lo SERVIDO (el build / el sitio), no sobre la
  intención del código. Ya nos mordió: el código parecía correcto y el sitio en
  vivo servía otra base.
- El guardián **no se desactiva** para "salir del paso". Si bloquea algo legítimo,
  se ajusta la regla y se **deja escrito por qué**.

## Cambios de base de datos (migraciones)

Van aparte del código: se aplican **primero a pruebas**, se verifican, y luego a
producción — pegando el SQL en el editor de Supabase. Toda migración es idempotente
(`create … if not exists`) para poder re-ejecutarla sin miedo. Ver `CLAUDE.md`.
