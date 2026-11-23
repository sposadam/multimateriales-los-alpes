#!/bin/sh
# ==========================================================================
# Verificación automática de la comunicación app <-> db por NOMBRE DE SERVICIO.
# La usan Jenkins (etapa Test) y se puede ejecutar a mano:
#     sh scripts/verificar-comunicacion.sh
# Requiere los contenedores encendidos (docker compose up). Si alguna
# comprobación falla, termina con código distinto de 0 y el build falla.
# ==========================================================================
set -eu

fallo() { echo "ERROR: $1" >&2; exit 1; }

echo "== 1. DNS interno: el contenedor app resuelve el servicio 'db'"
IP_DB=$(docker compose exec -T app getent hosts db | awk '{print $1}')
[ -n "$IP_DB" ] || fallo "el nombre 'db' no se resuelve desde el contenedor app"
echo "   db -> $IP_DB"

echo "== 2. Conectividad de red app -> db"
docker compose exec -T app ping -c 2 db

echo "== 3. La aplicación usa DB_HOST=db y consulta PostgreSQL"
INFO=$(docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/info)
echo "   $INFO"
echo "$INFO" | grep -q '"dbHost":"db"' || fallo "la aplicación no está configurada con el host 'db'"
echo "$INFO" | grep -q "\"dbServerIp\":\"$IP_DB\"" || fallo "PostgreSQL respondió desde una IP distinta a la del servicio 'db'"

echo "== 4. Ida y vuelta: guardar un dato (app -> db) y leerlo (db -> app)"
REF="CI-$(date +%s)"
RESP=$(docker compose exec -T app wget -qO- \
  --header 'Content-Type: application/json' \
  --post-data "{\"type\":\"entrada\",\"responsible\":\"Pipeline CI\",\"reference\":\"$REF\",\"lines\":[{\"productId\":\"prd_cem001\",\"quantity\":1}]}" \
  http://127.0.0.1:3000/api/movements)
DOC=$(echo "$RESP" | sed -n 's/.*"docNumber":"\([^"]*\)".*/\1/p')
[ -n "$DOC" ] || fallo "la API no devolvió el documento creado: $RESP"
echo "   Guardado por la API: $DOC (referencia $REF)"

LEIDO=$(docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc \"SELECT doc_number FROM movements WHERE reference = '$REF'\"" | tr -d '[:space:]')
[ "$LEIDO" = "$DOC" ] || fallo "el dato no aparece en PostgreSQL (esperado $DOC, leído '$LEIDO')"
echo "   Leído directamente en PostgreSQL: $LEIDO"

echo "OK: app y db se comunican por el nombre de servicio 'db' (IP $IP_DB)."
