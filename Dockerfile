# ==========================================================================
# MultiMateriales Los Alpes — Imagen del contenedor "app"
# (API Node.js + Express que además sirve la página web)
#
# Etapas:
#   base    -> dependencias de producción
#   test    -> ejecuta las pruebas unitarias (la usa Jenkins: --target test)
#   runtime -> imagen final, liviana, sin pruebas
# ==========================================================================

# ---------- base ----------
# Imagen oficial de Node.js con versión fija (nunca "latest").
FROM node:22.12.0-alpine3.21 AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- test ----------
FROM base AS test
ENV NODE_ENV=test
COPY server/src ./src
COPY server/test ./test
RUN npm test

# ---------- runtime ----------
FROM base AS runtime
COPY server/src ./src
COPY public ./public
ENV PORT=3000 \
    PUBLIC_DIR=/usr/src/app/public
EXPOSE 3000
# Se ejecuta con un usuario sin privilegios (buena práctica de seguridad).
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "src/index.js"]
