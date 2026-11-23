# Imagen de la app web (Next.js standalone). Se construye en el servidor de pruebas por deploy.sh (y con la misma receta en producción y en el CI).
# 22 nov · El contexto es la lista blanca del .dockerignore de la raíz (solo lo que el build lee; guardián imagenSoloLoQueUsa) y el commit NO entra al
# build: la app lo lee en ejecución (TOLATINO_COMMIT en environment, /api/salud). Así, una subida que no cambia nada de lo que entra en la imagen
# acierta la caché entera (y deploy.sh ni siquiera la construye: huella_imagen).
# 23 nov · Un cambio de una pantalla reconstruía TODO next build (243 s de 269 s en local, ~261 s medidos en el sandbox): «COPY . .» cambia y la capa
# del build empieza de cero, sin la caché de Next. Ahora dos cachés de BuildKit que sobreviven entre construcciones (no entran en la imagen ni cambian
# lo que se despliega): el almacén de pnpm (un lockfile nuevo no baja todo otra vez) y .next/cache de la app (la caché de compilación de webpack y la de
# tipos incremental de Next): un cambio de pantalla recompila solo lo que cambió. sharing=locked: dos construcciones a la vez no se pisan la caché.
# Si la caché se pierde (disco_liberar la borra pasado el 85 %), la construcción sale igual, solo que entera. Guardián imagenConCache.
# La llave de las acciones del servidor: dentro de Docker, Next inventa una nueva en cada build y esa llave entra en la versión de su caché de webpack
# («serverReferenceHashSalt»), así que la caché NUNCA servía (medido: 109 s de compilación con y sin caché). La llave vive en la MISMA caché de BuildKit
# del servidor (nunca en el repo ni en la imagen más de lo que ya estaba: Next la escribe en el build), nace sola la primera vez y se renueva a los 14
# días (como hace Next fuera de Docker). Con llave estable: 109 s → 50 s de compilación para un cambio de un .tsx. Si la caché se borra, nace otra.
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=tolatino-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN --mount=type=cache,id=tolatino-next,target=/repo/apps/web/.next/cache,sharing=locked \
    K=/repo/apps/web/.next/cache/tl-acciones.llave; \
    { [ -s "$K" ] && [ -z "$(find "$K" -mtime +13)" ]; } || head -c 32 /dev/urandom | base64 > "$K"; \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat "$K")" pnpm --filter @tolatino/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
