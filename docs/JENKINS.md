# Integración continua con Jenkins — Requisitos e implementación

Documento base para la segunda entrega: características requeridas para implementar Jenkins como gestor de operaciones del proyecto **MultiMateriales Los Alpes**.

## 1. Objetivo

Automatizar, en cada cambio subido a GitHub, la verificación del proyecto:

1. Descargar el código del repositorio.
2. Ejecutar las pruebas unitarias.
3. Construir la imagen Docker de la aplicación.
4. Levantar los contenedores comunicados (app + PostgreSQL + Adminer).
5. Ejecutar pruebas de integración contra la API y la base de datos reales.
6. Publicar los resultados y limpiar el entorno.

Si una etapa falla, Jenkins detiene el proceso y lo marca en rojo, lo que evita integrar código defectuoso.

## 2. Arquitectura

```
 GitHub (repositorio) ──(consulta periódica o webhook)──► Jenkins (contenedor)
                                                            │ Docker CLI
                                                            ▼ /var/run/docker.sock
                                                 Motor Docker del equipo
                                    ┌───────────────┬───────────────┬───────────────┐
                                    │ app (prueba)  │ db (prueba)   │ adminer       │
                                    └───────────────┴───────────────┴───────────────┘
                                    proyecto aislado: multimateriales-ci-<n.º build>
```

Jenkins corre en su propio contenedor y usa el motor Docker del equipo anfitrión (*Docker outside of Docker*). Cada ejecución crea un proyecto de Compose con nombre único y puertos propios (18080/18081). Así no choca con los contenedores de desarrollo (8080/8081) y se elimina al terminar.

## 3. Requisitos de hardware (equipo local)

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 2 núcleos | 4 núcleos |
| RAM | 4 GB libres para Docker | 8 GB |
| Disco | 10 GB libres | 20 GB |
| Red | Acceso a internet (descarga de imágenes y del repositorio) | — |

## 4. Requisitos de software

| Componente | Versión | Uso |
|---|---|---|
| Docker Desktop (Windows/macOS) o Docker Engine (Linux) | 24 o superior, con Docker Compose v2 | Ejecutar Jenkins y los contenedores del proyecto |
| Jenkins | LTS con Java 21 (`jenkins/jenkins:lts-jdk21`) | Servidor de integración continua |
| Docker CLI + plugin Compose dentro de Jenkins | Instalados por `jenkins/Dockerfile` | Que el pipeline ejecute `docker` y `docker compose` |
| Git | Incluido en la imagen de Jenkins | Descargar el repositorio |
| Repositorio GitHub | Público o privado | Origen del código y del `Jenkinsfile` |

No hace falta instalar Node.js ni PostgreSQL en el equipo, porque todo corre dentro de contenedores.

## 5. Plugins de Jenkins

| Plugin | ID | Para qué |
|---|---|---|
| Pipeline | `workflow-aggregator` | Ejecutar el `Jenkinsfile` (pipeline declarativo) |
| Git | `git` | Clonar el repositorio |
| GitHub | `github` | Integración con GitHub (webhooks, estado) |
| JUnit | `junit` | Mostrar resultados y tendencias de las pruebas |
| Timestamper | `timestamper` | Hora en cada línea del registro |
| Workspace Cleanup | `ws-cleanup` | Limpiar el espacio de trabajo |

Los instala automáticamente `jenkins/Dockerfile`. Además, en el asistente inicial se pueden aceptar los *plugins sugeridos*.

## 6. Credenciales y configuración

| Elemento | Dónde | Notas |
|---|---|---|
| Acceso a GitHub | *Manage Jenkins → Credentials* | Solo si el repositorio es privado: usuario + *Personal Access Token* (permiso `repo`). Nunca escribirlo en el `Jenkinsfile`. |
| Contraseña de PostgreSQL de prueba | *Manage Jenkins → Credentials*, tipo *Secret text*, ID `multimateriales-db-password` | El `Jenkinsfile` la lee con `credentials(...)`; no queda escrita en el repositorio. La base de prueba se destruye al final. |
| Disparador (*trigger*) | Configuración del job | En local: *Poll SCM* con `H/5 * * * *`. Un webhook de GitHub requiere que Jenkins tenga una URL pública. |

## 7. Pipeline (`Jenkinsfile`)

| # | Etapa | Comando principal | Falla si… |
|---|---|---|---|
| 1 | Código fuente | `checkout scm` | No se puede clonar el repositorio |
| 2 | Verificar herramientas | `docker version`, `docker compose version` | Jenkins no tiene acceso a Docker |
| 3 | Pruebas unitarias | `docker build --target test` + reporte JUnit | Alguna regla de negocio falla |
| 4 | Construir imagen | `docker build --target runtime` | El Dockerfile o las dependencias fallan |
| 5 | Levantar contenedores | `docker compose up -d --wait` | Algún contenedor no queda *healthy* |
| 6 | Pruebas de integración | Contenedor de pruebas en la red `backend` → `http://app:3000` | La API o PostgreSQL no responden como se espera |
| — | Post (siempre) | Publica JUnit, archiva `docker-compose.log`, `docker compose down -v` | — |

Opciones: máximo 30 minutos por ejecución, sin ejecuciones simultáneas y se conservan las últimas 15.

## 8. Puesta en marcha paso a paso

1. Encender Jenkins (desde la carpeta `jenkins/` del proyecto):

```bash
cd jenkins
docker compose up -d --build
```

2. Abrir http://localhost:8090 y obtener la contraseña inicial:

```bash
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

3. Completar el asistente: *Install suggested plugins* y crear el usuario administrador.
4. *New Item* → nombre `multimateriales-los-alpes` → tipo **Pipeline**.
5. En *Pipeline*: **Definition:** *Pipeline script from SCM* → **SCM:** Git → URL del repositorio → rama `*/main` → **Script Path:** `Jenkinsfile`.
6. En *Build Triggers*: marcar **Poll SCM** con `H/5 * * * *`.
7. Guardar y pulsar **Build Now**. Revisar *Stage View*, *Test Result* y el artefacto `docker-compose.log`.

## 9. Seguridad

- Jenkins solo escucha en `127.0.0.1:8090` (no queda expuesto en la red).
- Montar `/var/run/docker.sock` da a Jenkins control total de Docker. Es aceptable en un entorno local o académico. En producción se usaría un agente dedicado o Docker-in-Docker con TLS.
- Las contraseñas y tokens van en *Credentials* de Jenkins o en variables de entorno, nunca en el repositorio (`.env` está en `.gitignore`).
- PostgreSQL no publica su puerto: solo es accesible dentro de la red interna de Docker.

## 10. Evidencias sugeridas para la entrega

- Captura de *Stage View* con todas las etapas en verde.
- Captura de *Test Result* (13 pruebas unitarias + 8 de integración).
- Registro de consola mostrando `docker compose up` y los contenedores *healthy*.
- Una ejecución fallida a propósito (por ejemplo, cambiando una prueba) para demostrar que Jenkins detiene la integración.
