# Integración continua con Jenkins — MultiMateriales Los Alpes

Guía de implementación de Jenkins como gestor de operaciones sobre los dos contenedores del proyecto (`app` y `db`).

## 1. Flujo

```
commit ──► GitHub ──► Jenkins (Poll SCM cada 2 min) ──► Checkout ──► Build ──► Test ──► post
                                                         │           │          │
                                                         │           │          ├─ pruebas unitarias
                                                         │           │          ├─ docker compose up
                                                         │           │          ├─ comunicación app ↔ db (nombre "db")
                                                         │           │          └─ pruebas de integración
                                                         │           └─ imágenes multimateriales-app y multimateriales-db
                                                         └─ código + .env temporal con la credencial de Jenkins
```

Si cualquier paso falla, el build queda en rojo (**FAILURE**).

## 2. Instalación (contenedor oficial con volumen)

Jenkins corre como contenedor a partir de la imagen oficial **`jenkins/jenkins:2.580.2-lts-jdk21`** (versión LTS fija con huella `sha256`). Se le agregan el Docker CLI y el plugin Compose (`jenkins/Dockerfile`).

```bash
cd jenkins
cp .env.example .env          # definir JENKINS_ADMIN_PASSWORD y CI_DB_PASSWORD
docker compose up -d --build
# Abrir http://localhost:8090 e iniciar sesión con el usuario del .env
```

Por qué así:
- **Contenedor:** no hay que instalar Java ni Jenkins en Windows, y es la misma tecnología del proyecto.
- **LTS:** es la línea estable.
- **Volumen `jenkins_home`:** conserva la configuración, los jobs y el historial aunque el contenedor se recree.
- **Configuración como código (JCasC):** `jenkins/casc.yaml` crea el usuario administrador, la credencial y el job sin pasos manuales. El asistente inicial queda desactivado.

## 3. Puertos

| Puerto | Uso |
|---|---|
| `127.0.0.1:8090 → 8080` | Interfaz web de Jenkins (solo este equipo) |
| `18080` / `18081` | App y Adminer del entorno de pruebas que levanta cada build |
| `8080` / `8081` | Entorno de desarrollo (no lo usa Jenkins) |

No se publica el puerto 50000 (agentes), porque el pipeline corre en el nodo integrado.

## 4. Plugins (`jenkins/plugins.txt`)

| Plugin | Para qué |
|---|---|
| Pipeline (`workflow-aggregator`) | Ejecutar el `Jenkinsfile` |
| Pipeline: Stage View / Graph View | Vista de etapas |
| Git, GitHub | Descargar el repositorio y consultar cambios |
| Docker Pipeline (`docker-workflow`) | `docker.build(...)` en la etapa Build |
| Credentials, Credentials Binding, Plain Credentials | Guardar la clave y usarla con `withCredentials` |
| Configuration as Code, Job DSL | Configuración y job definidos como código |
| JUnit, Timestamper, Workspace Cleanup | Resultados de pruebas, hora en el log, limpieza |

## 5. Credenciales

| ID | Tipo | Uso |
|---|---|---|
| `multimateriales-db-password` | Secret text | Clave de PostgreSQL del entorno de pruebas. El pipeline la escribe en un `.env` temporal que se borra en `post`; Jenkins la oculta (`****`) en la consola. |
| Usuario administrador | Usuario de Jenkins | Clave definida en `jenkins/.env` (no versionado). |

El repositorio es público, así que no necesita credencial de GitHub. Si fuera privado, se agregaría un *Username with password* con un token personal.

## 6. Disparo automático

`triggers { pollSCM('H/2 * * * *') }` en el `Jenkinsfile`: Jenkins consulta GitHub cada 2 minutos y construye si hay commits nuevos. Se eligió Poll SCM porque Jenkins corre en un equipo local sin URL pública, y un webhook de GitHub no podría alcanzarlo.

## 7. Verificación manual

```bash
docker compose -f jenkins/docker-compose.yml ps
docker compose -f jenkins/docker-compose.yml logs -f jenkins
```
