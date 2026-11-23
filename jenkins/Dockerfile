# ==========================================================================
# Imagen de Jenkins para MultiMateriales Los Alpes
#
# - Base oficial jenkins/jenkins LTS con versión FIJA y huella sha256.
# - Docker CLI + plugin Docker Compose: Jenkins construye y levanta los
#   contenedores usando el motor Docker del equipo (socket montado).
# - Plugins instalados desde plugins.txt.
# - Configuración como código (JCasC) desde casc.yaml: sin asistente inicial.
# ==========================================================================
FROM jenkins/jenkins:2.580.2-lts-jdk21@sha256:74401de6a6f92e1afe1b02d1c8e3d0c33f263bfb5275dd8813f9150355f2367b

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*
USER jenkins

# Sin asistente de instalación: todo se configura con JCasC.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Duser.timezone=America/Bogota" \
    CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/casc.yaml

COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY --chown=jenkins:jenkins casc.yaml /usr/share/jenkins/casc/casc.yaml
