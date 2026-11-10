// ==========================================================================
// MultiMateriales Los Alpes — Pipeline de integración continua (Jenkins)
//
// Requisitos del agente: Linux con Docker CLI + plugin Docker Compose y acceso
// al motor de Docker (ver docs/JENKINS.md y la carpeta jenkins/).
//
// Etapas: código -> pruebas unitarias -> imagen -> contenedores -> pruebas de
// integración -> limpieza. Cada ejecución usa su propio proyecto de Compose,
// por lo que no interfiere con los contenedores de desarrollo.
// ==========================================================================
pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '15'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    IMAGE                = 'multimateriales-app'
    COMPOSE_PROJECT_NAME = "multimateriales-ci-${env.BUILD_NUMBER}"
    // Puertos distintos a los de desarrollo (8080/8081) para evitar choques.
    APP_PORT             = '18080'
    ADMINER_PORT         = '18081'
    // Contraseña guardada en Jenkins (Manage Jenkins > Credentials, tipo "Secret text").
    POSTGRES_PASSWORD    = credentials('multimateriales-db-password')
    SEED_DEMO            = 'true'
  }

  stages {
    stage('Código fuente') {
      steps {
        checkout scm
        sh 'git log -1 --oneline || true'
      }
    }

    stage('Verificar herramientas') {
      steps {
        sh 'docker version'
        sh 'docker compose version'
      }
    }

    stage('Pruebas unitarias') {
      steps {
        // La etapa "test" del Dockerfile ejecuta las pruebas al construirse.
        sh 'docker build --target test -t ${IMAGE}:test-${BUILD_NUMBER} .'
        sh '''
          mkdir -p reports
          docker run --name ut-${BUILD_NUMBER} ${IMAGE}:test-${BUILD_NUMBER} npm run test:unit:ci
          docker cp ut-${BUILD_NUMBER}:/tmp/unit.xml reports/unit.xml
        '''
      }
      post { always { sh 'docker rm -f ut-${BUILD_NUMBER} || true' } }
    }

    stage('Construir imagen') {
      steps {
        sh 'docker build --target runtime -t ${IMAGE}:${BUILD_NUMBER} .'
      }
    }

    stage('Levantar contenedores') {
      steps {
        // app + db + adminer, esperando a que estén "healthy".
        sh 'docker compose up -d --wait --wait-timeout 120'
        sh 'docker compose ps'
      }
    }

    stage('Pruebas de integración') {
      steps {
        // Se ejecutan dentro de la red interna de Docker: app <-> db reales.
        sh '''
          docker run --name it-${BUILD_NUMBER} --network ${COMPOSE_PROJECT_NAME}_backend \
            -e API_URL=http://app:3000 ${IMAGE}:test-${BUILD_NUMBER} npm run test:integration:ci
          docker cp it-${BUILD_NUMBER}:/tmp/integration.xml reports/integration.xml
        '''
      }
      post { always { sh 'docker rm -f it-${BUILD_NUMBER} || true' } }
    }
  }

  post {
    always {
      junit testResults: 'reports/*.xml', allowEmptyResults: true
      sh 'docker compose logs --no-color > docker-compose.log 2>&1 || true'
      archiveArtifacts artifacts: 'docker-compose.log, reports/*.xml', allowEmptyArchive: true
      sh 'docker compose down -v --remove-orphans || true'
      sh 'docker image rm ${IMAGE}:test-${BUILD_NUMBER} || true'
    }
    success {
      echo "Compilación ${env.BUILD_NUMBER} correcta: imagen ${env.IMAGE}:${env.BUILD_NUMBER} lista."
    }
    failure {
      echo 'La compilación falló. Revisa la etapa en rojo y el archivo docker-compose.log.'
    }
  }
}
