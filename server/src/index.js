/**
 * index.js — Punto de entrada del contenedor "app".
 * 1. Espera a que PostgreSQL (contenedor "db") esté listo.
 * 2. Crea/actualiza las tablas (schema.sql).
 * 3. Si la base está vacía y SEED_DEMO=true, carga datos de ejemplo.
 * 4. Inicia el servidor HTTP.
 */
'use strict';

const { createApp } = require('./app');
const db = require('./db');
const repo = require('./repository');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const SEED_DEMO = !/^(0|false|no)$/i.test(process.env.SEED_DEMO || 'true');

async function main() {
  console.log('[app] Conectando a la base de datos…');
  await db.waitForDb();
  await repo.migrate();
  console.log('[app] Esquema de base de datos verificado.');

  if (SEED_DEMO && await repo.isEmpty()) {
    await repo.loadDemo();
    console.log('[app] Base de datos vacía: se cargaron los datos de ejemplo.');
  }

  const server = createApp().listen(PORT, () => {
    console.log('[app] MultiMateriales Los Alpes escuchando en el puerto ' + PORT);
  });

  // Apagado ordenado cuando Docker detiene el contenedor.
  const shutdown = (signal) => {
    console.log('[app] ' + signal + ' recibido, cerrando…');
    server.close(() => db.pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error('[app] No se pudo iniciar:', e);
  process.exit(1);
});
