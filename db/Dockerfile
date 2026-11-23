# ==========================================================================
# MultiMateriales Los Alpes — Imagen del contenedor "db" (PostgreSQL)
#
# Parte de la imagen OFICIAL de PostgreSQL con versión fija y huella digital
# y le agrega el esquema de la aplicación, que se crea automáticamente la
# primera vez que se inicializa el volumen de datos.
# La contraseña NO está aquí: llega en tiempo de ejecución desde el .env.
# ==========================================================================
FROM postgres:16.6-alpine3.21@sha256:1d04b9ba1d4996401f2552b51beda8187f175c0645c091e4781134fc9c9a3eef

LABEL org.opencontainers.image.title="multimateriales-db" \
      org.opencontainers.image.description="Base de datos PostgreSQL del inventario MultiMateriales Los Alpes" \
      org.opencontainers.image.source="https://github.com/sposadam/multimateriales-los-alpes"

ENV TZ=America/Bogota

# Esquema inicial (tablas, índices). Es idempotente: la app también lo verifica al arrancar.
COPY server/src/schema.sql /docker-entrypoint-initdb.d/01-schema.sql

EXPOSE 5432

HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=12 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1
