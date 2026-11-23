// ==========================================================================
// MultiMateriales Los Alpes — Pipeline de integración continua (Jenkins)
//
//   commit -> GitHub -> Jenkins (Poll SCM) -> Checkout -> Build -> Test -> post
//
// - Checkout: descarga el código del repositorio de GitHub.
// - Build:    construye las imágenes de los dos servicios (app y db).
// - Test:     pruebas unitarias, levanta el docker compose y verifica que los
//             contenedores se comuniquen por el NOMBRE DEL SERVICIO "db";
//             luego pruebas de integración de ida y vuelta.
// - post:     publica resultados, guarda registros y limpia.
// Si cualquier comando falla, el build queda en rojo (FAILURE).
//
// La clave de la base de datos de pruebas NO está en el código: se toma de
// la credencial "multimateriales-db-password" guardada en Jenkins.
// ==========================================================================
pipeline {
  agent any

  // Se dispara solo: Jenkins consulta GitHub cada 2 minutos y construye si hay commits nuevos.
  triggers {
    pollSCM('H/2 * * * *')
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    // Proyecto de Compose aislado por build: no interfiere con los contenedores de desarrollo.
    COMPOSE_PROJECT_NAME = "multimateriales-ci-${env.BUILD_NUMBER}"
    IMAGE_TAG            = "ci-${env.BUILD_NUMBER}"
    APP_PORT             = '18080'
    ADMINER_PORT         = '18081'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        sh '''
          echo "Commit: $(git log -1 --pretty=format:'%h - %s (%an)')"
          docker version --format 'Docker {{.Server.Version}}'
          docker compose version
        '''
        // Archivo .env temporal: la clave viene de las credenciales de Jenkins.
        withCredentials([string(credentialsId: 'multimateriales-db-password', variable: 'DB_PASS')]) {
          sh '''
            set +x
            cp .env.example .env
            sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASS}/" .env
            echo ".env de pruebas creado (clave tomada de las credenciales de Jenkins)"
          '''
        }
      }
    }

    stage('Build') {
      steps {
        script {
          // Plugin Docker Pipeline: construye las imágenes de los dos servicios.
          docker.build("multimateriales-app:${env.IMAGE_TAG}", '--target runtime .')
          docker.build("multimateriales-db:${env.IMAGE_TAG}", '-f db/Dockerfile .')
          docker.build("multimateriales-app:test-${env.BUILD_NUMBER}", '--target test .')
        }
        sh 'docker images --filter "reference=multimateriales-*" --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}" | grep -E "TAG|ci-${BUILD_NUMBER}|test-${BUILD_NUMBER}"'
      }
    }

    stage('Test') {
      stages {
        stage('Pruebas unitarias') {
          steps {
            sh '''
              mkdir -p reports
              docker run --name ut-${BUILD_NUMBER} multimateriales-app:test-${BUILD_NUMBER} npm run test:unit:ci
              docker cp ut-${BUILD_NUMBER}:/tmp/unit.xml reports/unit.xml
            '''
          }
        }
        stage('Levantar docker compose') {
          steps {
            sh 'docker compose up -d --wait --wait-timeout 120'
            sh 'docker compose ps'
          }
        }
        stage('Comunicación app-db') {
          steps {
            // Falla si 'app' no resuelve 'db' o si el dato no viaja hasta PostgreSQL y de vuelta.
            sh 'sh scripts/verificar-comunicacion.sh'
          }
        }
        stage('Pruebas de integración') {
          steps {
            sh '''
              docker run --name it-${BUILD_NUMBER} --network ${COMPOSE_PROJECT_NAME}_backend \
                -e API_URL=http://app:3000 multimateriales-app:test-${BUILD_NUMBER} npm run test:integration:ci
              docker cp it-${BUILD_NUMBER}:/tmp/integration.xml reports/integration.xml
            '''
          }
        }
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/*.xml', allowEmptyResults: true
      sh 'docker compose logs --no-color > docker-compose.log 2>&1 || true'
      archiveArtifacts artifacts: 'docker-compose.log, reports/*.xml', allowEmptyArchive: true
      sh '''
        docker rm -f ut-${BUILD_NUMBER} it-${BUILD_NUMBER} 2>/dev/null || true
        docker compose down -v --remove-orphans || true
        docker image rm multimateriales-app:${IMAGE_TAG} multimateriales-db:${IMAGE_TAG} multimateriales-app:test-${BUILD_NUMBER} 2>/dev/null || true
        rm -f .env
      '''
    }
    success {
      echo "BUILD EXITOSO #${env.BUILD_NUMBER}: imágenes construidas, pruebas superadas y comunicación app-db verificada."
    }
    failure {
      echo "BUILD FALLIDO #${env.BUILD_NUMBER}: revisa la etapa en rojo, la salida de consola y docker-compose.log."
    }
  }
}
