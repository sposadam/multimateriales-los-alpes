/**
 * db.js — Conexión a PostgreSQL (pool de conexiones y transacciones).
 *
 * Variables de entorno (definidas en docker-compose.yml a partir del .env):
 *   DB_HOST       nombre del servicio de base de datos en la red de Docker: "db"
 *   DB_PORT       5432
 *   DB_NAME, DB_USER, DB_PASSWORD
 *   DATABASE_URL  (opcional) alternativa en una sola cadena, ej. para Supabase
 *   PGSSL         true para bases en la nube que exigen SSL
 */
'use strict';

const { Pool, types } = require('pg');

// NUMERIC -> número, BIGINT (count) -> número, DATE -> texto "YYYY-MM-DD"
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(1082, (v) => v);

const ssl = /^(1|true|require)$/i.test(process.env.PGSSL || '') ? { rejectUnauthorized: false } : undefined;

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    host: process.env.DB_HOST || 'db', // nombre del servicio en docker-compose.yml
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };

if (!process.env.DATABASE_URL && !config.password) {
  console.warn('[db] DB_PASSWORD no está definida. Revisa el archivo .env.');
}
console.log('[db] Servidor de base de datos: ' + (process.env.DATABASE_URL ? '(DATABASE_URL)' : config.host + ':' + config.port + '/' + config.database));

const pool = new Pool(Object.assign({}, config, { ssl, max: 10 }));

pool.on('error', (err) => console.error('[db] Error inesperado en el pool:', err.message));

/** Espera a que la base de datos acepte conexiones (útil al arrancar en Docker). */
async function waitForDb(retries, delayMs) {
  retries = retries || 30;
  delayMs = delayMs || 2000;
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      if (i >= retries) throw e;
      console.log('[db] Esperando a la base de datos (' + i + '/' + retries + '): ' + e.message);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Ejecuta `fn(client)` dentro de una transacción. Si falla, se revierte todo. */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, waitForDb, tx, query: (text, params) => pool.query(text, params) };
