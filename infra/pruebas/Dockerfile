# Imagen de la app web (Next.js standalone). Se construye en el servidor de pruebas por deploy.sh (y con la misma receta en producción y en el CI).
# 22 nov · El contexto es la lista blanca del .dockerignore de la raíz (solo lo que el build lee; guardián imagenSoloLoQueUsa) y el commit NO entra al
# build: la app lo lee en ejecución (TOLATINO_COMMIT en environment, /api/salud). Así, una subida que no cambia nada de lo que entra en la imagen
# acierta la caché entera (y deploy.sh ni siquiera la construye: huella_imagen).
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter @tolatino/web build

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
