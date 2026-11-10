/**
 * app.js — Aplicación Express: API REST (/api/...) + archivos de la página web.
 */
'use strict';

const path = require('path');
const express = require('express');
const repo = require('./repository');
const db = require('./db');
const { HttpError } = require('./domain');

/** Envuelve un controlador async para enviar los errores al manejador central. */
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).then((data) => {
  if (data === undefined) res.status(204).end();
  else res.json(data);
}).catch(next);

function createApi() {
  const r = express.Router();

  r.get('/health', h(async () => {
    await db.query('SELECT 1');
    return { status: 'ok', database: 'up', time: new Date().toISOString() };
  }));
  r.get('/info', h(() => repo.getInfo()));

  r.get('/settings', h(() => repo.getSettings()));
  r.put('/settings', h((req) => repo.saveSettings(req.body)));

  r.get('/categories', h(() => repo.getCategories()));
  r.post('/categories', h((req) => repo.saveCategory(Object.assign({}, req.body, { id: undefined }))));
  r.put('/categories/:id', h((req) => repo.saveCategory(Object.assign({}, req.body, { id: req.params.id }))));
  r.delete('/categories/:id', h(async (req) => { await repo.deleteCategory(req.params.id); }));

  r.get('/suppliers', h(() => repo.getSuppliers()));
  r.post('/suppliers', h((req) => repo.saveSupplier(Object.assign({}, req.body, { id: undefined }))));
  r.put('/suppliers/:id', h((req) => repo.saveSupplier(Object.assign({}, req.body, { id: req.params.id }))));
  r.delete('/suppliers/:id', h(async (req) => { await repo.deleteSupplier(req.params.id); }));

  r.get('/products', h(() => repo.getProducts()));
  r.get('/products/:id', h(async (req) => {
    const p = await repo.getProduct(req.params.id);
    if (!p) throw new HttpError(404, 'El producto no existe.');
    return p;
  }));
  r.post('/products', h((req) => repo.saveProduct(Object.assign({}, req.body, { id: undefined }))));
  r.put('/products/:id', h((req) => repo.saveProduct(Object.assign({}, req.body, { id: req.params.id }))));
  r.delete('/products/:id', h(async (req) => { await repo.deleteProduct(req.params.id); }));

  r.get('/movements', h((req) => repo.getMovements(req.query)));
  r.post('/movements', h(async (req, res) => { res.status(201); return repo.registerMovement(req.body); }));
  r.get('/documents/:docId', h((req) => repo.getDocument(req.params.docId)));

  r.get('/export', h(() => repo.exportData()));
  r.post('/import', h(async (req) => { await repo.importData(req.body); return { ok: true }; }));
  r.post('/demo', h(async () => { await repo.loadDemo(); return { ok: true }; }));
  r.post('/clear', h(async () => { await repo.clearAll(); return { ok: true }; }));

  r.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada: ' + req.method + ' /api' + req.path }));
  return r;
}

/** Traduce errores de PostgreSQL y de negocio a respuestas HTTP claras. */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La información enviada es demasiado grande (revisa el tamaño de las fotos).' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  const pgMessages = {
    23505: [409, 'Ya existe un registro con esos datos (valor duplicado).'],
    23503: [409, 'La operación viola una relación entre datos (registro relacionado inexistente o en uso).'],
    23514: [400, 'Los datos no cumplen una regla de la base de datos (por ejemplo, stock negativo).'],
    23502: [400, 'Falta un dato obligatorio.'],
    '22P02': [400, 'Formato de dato no válido.'],
    22007: [400, 'Formato de fecha no válido.'],
    22008: [400, 'Fecha fuera de rango.']
  };
  if (err.code && pgMessages[err.code]) {
    const [status, message] = pgMessages[err.code];
    return res.status(status).json({ error: message });
  }
  console.error('[api] Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor. Revisa los registros del contenedor "app".' });
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));
  app.use('/api', createApi());
  app.use(express.static(process.env.PUBLIC_DIR || path.join(__dirname, '..', '..', 'public')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
