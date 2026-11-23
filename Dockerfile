# ==========================================================================
# MultiMateriales Los Alpes — Imagen del contenedor "app"
# (API Node.js + Express que además sirve la página web)
#
# Imagen base oficial con versión FIJA y huella digital (sha256): la
# construcción es reproducible y nunca usa "latest".
#
# Etapas:
#   dependencias -> instala dependencias de producción (npm ci)
#   test         -> ejecuta las pruebas unitarias (Jenkins / GitHub Actions)
#   runtime      -> imagen final, liviana, sin pruebas
# ==========================================================================

# ---------- dependencias ----------
FROM node:22.12.0-alpine3.21@sha256:51eff88af6dff26f59316b6e356188ffa2c422bd3c3b76f2556a2e7e89d080bd AS dependencias
WORKDIR /usr/src/app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- test ----------
FROM node:22.12.0-alpine3.21@sha256:51eff88af6dff26f59316b6e356188ffa2c422bd3c3b76f2556a2e7e89d080bd AS test
WORKDIR /usr/src/app
ENV NODE_ENV=test
COPY --from=dependencias /usr/src/app/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY server/test ./test
RUN npm test

# ---------- runtime ----------
FROM node:22.12.0-alpine3.21@sha256:51eff88af6dff26f59316b6e356188ffa2c422bd3c3b76f2556a2e7e89d080bd AS runtime
LABEL org.opencontainers.image.title="multimateriales-app" \
      org.opencontainers.image.description="API REST + interfaz web del inventario MultiMateriales Los Alpes" \
      org.opencontainers.image.source="https://github.com/sposadam/multimateriales-los-alpes"
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/usr/src/app/public
COPY --from=dependencias /usr/src/app/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY public ./public
EXPOSE 3000
# Se ejecuta con un usuario sin privilegios (buena práctica de seguridad).
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "src/index.js"]
