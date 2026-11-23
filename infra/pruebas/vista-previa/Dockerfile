# 23 nov · La imagen del sitio de vista previa del sandbox (SOLO pruebas; guardián vistaPreviaAcotada): el mismo Node de la app (node:22-alpine) más
# lo que necesita su bucle (vista.sh): git para seguir la rama, el cliente de Postgres para LEER qué migraciones tiene la base, bash y pnpm (la
# versión del repo). No lleva código de la app: la copia de la rama vive en /vista (volumen del servidor) y el bucle se monta de solo lectura desde
# la copia de «pruebas». Se construye una vez (después, caché) con «up --build» desde infra/pruebas/vista-previa/encender.sh.
FROM node:22-alpine
RUN apk add --no-cache bash git postgresql-client \
  && npm install -g pnpm@10.28.0 \
  && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1
USER node
WORKDIR /vista
CMD ["bash", "/opt/vista/vista.sh"]
