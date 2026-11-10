# MultiMateriales Los Alpes · Inventario de bodega

Aplicación web para controlar el inventario de una bodega de materiales de construcción: productos con imágenes, marcas y fechas de vencimiento, entradas, salidas y ajustes con **remisiones imprimibles / PDF**, kardex por producto, proveedores, alertas y reportes.

Funciona con **tres contenedores Docker comunicados entre sí**:

```
                         red interna de Docker: "backend"
 Navegador ──► :8080 ┌──────────────────────┐   SQL   ┌──────────────────────┐
                     │  app                 │ ──────► │  db                  │
                     │  Node.js + Express   │         │  PostgreSQL 16       │
                     │  API REST + página   │         │  datos en un volumen │
                     └──────────────────────┘         └──────────────────────┘
 Navegador ──► :8081 ┌──────────────────────┐   SQL             ▲
                     │  adminer             │ ──────────────────┘
                     │  visor de la BD      │
                     └──────────────────────┘
```

| Contenedor | Imagen | Función | Acceso |
|---|---|---|---|
| `app` | construida con el `Dockerfile` | API REST + interfaz web | http://localhost:8080 |
| `db` | `postgres:16.6-alpine3.21` | Base de datos | Solo red interna (no expuesta) |
| `adminer` | `adminer:4.8.1` | Ver y consultar las tablas | http://localhost:8081 |

El contenedor `app` se conecta a la base de datos usando el **nombre del servicio** `db` como dirección (`DB_HOST=db`, puerto 5432), gracias al DNS interno de la red `backend` de Docker; nunca usa `localhost` ni una IP fija. Esa es la comunicación entre contenedores.

### Probar la comunicación (ida y vuelta)

```bash
# 1. El contenedor app resuelve el nombre "db" a la IP interna del contenedor de PostgreSQL
docker compose exec app getent hosts db

# 2. Guardar un dato: registrar una salida (app -> db)
curl -X POST http://localhost:8080/api/movements -H "Content-Type: application/json" \n  -d '{"type":"salida","responsible":"Prueba","lines":[{"productId":"prd_cem001","quantity":5}]}'

# 3. Leer el dato de vuelta (db -> app)
curl http://localhost:8080/api/products/prd_cem001

# 4. Confirmarlo directamente en PostgreSQL
docker compose exec db psql -U inventario -d inventario -c "SELECT doc_number, product_name, quantity, new_stock FROM movements ORDER BY seq DESC LIMIT 1;"
```

---

## 🐳 Guía rápida de Docker (para quien nunca lo ha usado)

### Conceptos en 30 segundos

- **Imagen:** una "plantilla" con todo lo necesario para ejecutar algo (sistema, programas, código).
- **Contenedor:** una imagen en ejecución. Puedes tener varios y se pueden comunicar.
- **Dockerfile:** la receta para construir la imagen de nuestra app.
- **docker-compose.yml:** describe los contenedores del proyecto y cómo se conectan. Con un solo comando se encienden todos.
- **Volumen:** espacio donde Docker guarda datos que deben sobrevivir aunque el contenedor se borre (aquí, la base de datos).

### 1. Requisitos

1. Instalar **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Abrir Docker Desktop y esperar a que diga *Engine running* (motor encendido).
3. Comprobar en una terminal (PowerShell, CMD o la terminal de VS Code):

```bash
docker --version
docker compose version
```

### 2. Descargar el proyecto

```bash
git clone https://github.com/TU-USUARIO/multimateriales-los-alpes.git
cd multimateriales-los-alpes
```

### 3. Crear el archivo de configuración `.env` (obligatorio)

```bash
cp .env.example .env
```

(En CMD de Windows usa `copy .env.example .env`.) Edita `.env` y cambia `POSTGRES_PASSWORD` por una clave tuya. Sin este archivo, `docker compose up` se detiene con el mensaje *Falta POSTGRES_PASSWORD*. El archivo `.env` **nunca se sube a GitHub** (está en `.gitignore`); en el repositorio solo va la plantilla `.env.example`.

### 4. Encender la aplicación

```bash
docker compose up -d --build
```

- `up` crea y enciende los contenedores.
- `-d` los deja corriendo en segundo plano (puedes cerrar la terminal).
- `--build` construye la imagen de la app (la primera vez tarda 1–3 minutos).

Luego abre:

- **Aplicación:** http://localhost:8080
- **Adminer (ver la base de datos):** http://localhost:8081

La primera vez se cargan **datos de ejemplo** ficticios para que puedas probar.

### 5. Comandos del día a día

| Quiero… | Comando |
|---|---|
| Ver si los contenedores están corriendo | `docker compose ps` |
| Ver los registros (logs) de todos | `docker compose logs` |
| Ver los registros de la app en vivo | `docker compose logs -f app` *(salir con Ctrl + C)* |
| Ver los registros de la base de datos | `docker compose logs db` |
| Apagar (los datos se conservan) | `docker compose down` |
| Volver a encender | `docker compose up -d` |
| Reiniciar solo la app | `docker compose restart app` |
| Aplicar cambios del código | `docker compose up -d --build` |
| Abrir una consola SQL | `docker compose exec db psql -U inventario -d inventario` |
| **Reiniciar la base de datos desde cero** ⚠️ | `docker compose down -v` y luego `docker compose up -d` |

> ⚠️ `docker compose down -v` borra el **volumen** de la base de datos: se pierden todos los datos y al encender se vuelven a cargar los de ejemplo. Antes, descarga un respaldo desde *Configuración → Respaldo de datos*.

### 6. Ver los datos con Adminer

1. Abre http://localhost:8081 (o el botón **Ver tablas en Adminer** en *Configuración*).
2. Ingresa:
   - **Sistema:** PostgreSQL
   - **Servidor:** `db`
   - **Usuario:** `inventario`
   - **Contraseña:** la de tu `.env` (`POSTGRES_PASSWORD`)
   - **Base de datos:** `inventario`
3. Abre la tabla `movements` o `products`. Registra una salida en la app, refresca Adminer y verás la nueva fila: **los datos viven en PostgreSQL**.

### 7. Problemas frecuentes

| Problema | Solución |
|---|---|
| `failed to connect to the docker API` / `Cannot connect to the Docker daemon` | Docker Desktop no está abierto. Ábrelo y espera a que el motor esté encendido. |
| `port is already allocated` (puerto ocupado) | Otro programa usa el 8080 u 8081. En `.env` cambia `APP_PORT` o `ADMINER_PORT` (ej. 8085) y vuelve a ejecutar `docker compose up -d`. |
| La app dice "Sin conexión con el servidor" | Revisa `docker compose ps` y `docker compose logs app`. |
| Cambié la contraseña en `.env` y la app no conecta | La contraseña queda fijada al crear la base. Reinicia la base desde cero (`docker compose down -v`) o vuelve a la contraseña anterior. |
| Cambié el código y no veo cambios | `docker compose up -d --build` y recarga el navegador con Ctrl + F5. |

---

## Funcionalidades

- **Panel:** valor del inventario, stock bajo, agotados, gráfico de entradas/salidas de 14 días, valor por categoría, alertas de stock y de vencimiento, últimos movimientos.
- **Inventario:** tarjetas con imagen o tabla, búsqueda (nombre, marca, código, ubicación, proveedor), filtros, exportar a CSV e imprimir. Foto propia o imagen generada tipo fotografía de estudio según el producto.
- **Productos:** código, marca, categoría, unidad, proveedor, ubicación, fecha de vencimiento, stock mínimo/máximo, costo y precio. Ficha con **kardex**.
- **Movimientos:** entradas (recalculan el **costo promedio ponderado**), salidas (no permiten stock negativo) y ajustes por conteo físico; varios productos por movimiento; número consecutivo (`ENT-000001`, `SAL-000001`, `AJU-000001`) y **remisión imprimible / PDF** con firmas.
- **Proveedores, categorías, datos de la empresa**, respaldo/restauración en JSON, tema claro/oscuro, diseño para celular.

Las reglas de negocio se aplican en el servidor y cada movimiento se guarda en una **transacción** con bloqueo de filas: si dos personas registran salidas del mismo producto al mismo tiempo, el stock nunca queda negativo.

---

## Estructura del proyecto

```
├── docker-compose.yml        # Contenedores: app, db, adminer
├── Dockerfile                # Imagen de la app (etapas: base, test, runtime)
├── Jenkinsfile               # Pipeline de integración continua (2.ª entrega)
├── .github/workflows/ci.yml  # GitHub Actions: construye y prueba en cada push / PR
├── .dockerignore             # Archivos que no entran a la imagen
├── .env.example              # Plantilla de configuración (copiar a .env)
├── public/                   # Interfaz web (HTML, CSS, JavaScript)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── store.js          # Cliente de la API (única puerta a los datos)
│       ├── components/       # Formularios, ficha de producto, remisiones
│       └── views/            # Panel, inventario, movimientos, proveedores, configuración
├── server/                   # API REST (Node.js + Express)
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Arranque: espera la BD, crea tablas, carga datos demo
│   │   ├── app.js            # Rutas /api/...
│   │   ├── repository.js     # Consultas SQL y transacciones
│   │   ├── domain.js         # Reglas de negocio (stock, costo promedio, validaciones)
│   │   ├── schema.sql        # Tablas de PostgreSQL
│   │   └── seed.js           # Datos de ejemplo
│   └── test/
│       ├── unit/             # Pruebas unitarias (sin base de datos)
│       └── integration/      # Pruebas contra la API y PostgreSQL reales
├── jenkins/                  # Jenkins en Docker (2.ª entrega)
└── docs/JENKINS.md           # Requisitos y guía de implementación de Jenkins
```

## API REST (resumen)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de la API y la base de datos |
| GET | `/api/products` · `/api/products/:id` | Productos |
| POST / PUT / DELETE | `/api/products[/:id]` | Crear, editar, eliminar producto |
| GET | `/api/movements?type=&productId=&from=&to=&search=` | Historial |
| POST | `/api/movements` | Registrar entrada / salida / ajuste |
| GET | `/api/documents/:docId` | Remisión o comprobante |
| GET/POST/PUT/DELETE | `/api/categories`, `/api/suppliers` | Catálogos |
| GET / PUT | `/api/settings` | Datos de la empresa |
| GET / POST | `/api/export`, `/api/import` | Respaldo JSON |

## Pruebas

```bash
# Pruebas unitarias (se ejecutan al construir la etapa "test")
docker build --target test -t multimateriales-app:test .

# Pruebas de integración (con los contenedores encendidos)
docker run --rm --network multimateriales_backend -e API_URL=http://app:3000 multimateriales-app:test npm run test:integration
```

## Integración continua

### GitHub Actions

El archivo `.github/workflows/ci.yml` se ejecuta en cada *push* y *pull request*: pruebas unitarias, `docker compose build`, `docker compose up`, verificación de la comunicación `app → db` por nombre de servicio, pruebas de integración y limpieza. Crea un `.env` temporal con una contraseña aleatoria, así no se guarda ningún secreto en el repositorio.

### Jenkins (2.ª entrega)

El `Jenkinsfile` ya está listo: descarga el código → pruebas unitarias → construye la imagen → levanta los contenedores → pruebas de integración → publica resultados → limpia. Ver **[docs/JENKINS.md](docs/JENKINS.md)**.

## Publicar en GitHub

```bash
git init
git add .
git commit -m "Inventario MultiMateriales Los Alpes con Docker"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/multimateriales-los-alpes.git
git push -u origin main
```

## Hoja de ruta

- [x] Aplicación web completa.
- [x] API REST + PostgreSQL en contenedores Docker comunicados.
- [x] Pruebas automatizadas y `Jenkinsfile`.
- [ ] Jenkins en funcionamiento (2.ª entrega).
- [ ] Usuarios, inicio de sesión y roles.
- [ ] Despliegue en la nube (por ejemplo, contenedor `app` + PostgreSQL de Supabase cambiando `DATABASE_URL` y `PGSSL=true`).
- [ ] Control de vencimientos por lote (FIFO) y códigos de barras / QR.
