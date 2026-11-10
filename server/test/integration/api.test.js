/**
 * Pruebas de integración: hablan con la API real, que a su vez usa PostgreSQL.
 * Requieren los contenedores encendidos y la variable API_URL, por ejemplo:
 *
 *   docker run --rm --network multimateriales_backend -e API_URL=http://app:3000 \
 *     multimateriales-app:test npm run test:integration
 *
 * Crean sus propios datos (con código único) y los eliminan al terminar.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const API = (process.env.API_URL || '').replace(/\/$/, '');
const skip = !API && 'Define API_URL para ejecutar las pruebas de integración';

async function call(method, path, body) {
  const res = await fetch(API + '/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

const SUFFIX = Date.now().toString(36).toUpperCase();
let product;
let category;

test('health: la API responde y la base de datos está arriba', { skip }, async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.database, 'up');
});

test('la página web se sirve desde el contenedor app', { skip }, async () => {
  const res = await fetch(API + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /MultiMateriales Los Alpes/);
});

test('crear categoría y producto con stock inicial', { skip }, async () => {
  const c = await call('POST', '/categories', { name: 'Prueba CI ' + SUFFIX, color: '#123456', icon: 'otros' });
  assert.equal(c.status, 200);
  category = c.data;

  const p = await call('POST', '/products', {
    name: 'Producto CI ' + SUFFIX, sku: 'CI-' + SUFFIX, brand: 'Marca CI', categoryId: category.id,
    unit: 'Unidad', stock: 10, minStock: 2, cost: 1000, responsible: 'Jenkins'
  });
  assert.equal(p.status, 200, JSON.stringify(p.data));
  product = p.data;
  assert.equal(product.stock, 10);

  const kardex = await call('GET', '/movements?productId=' + product.id);
  assert.equal(kardex.data.length, 1);
  assert.match(kardex.data[0].docNumber, /^ENT-\d{6}$/);
});

test('SKU duplicado devuelve 409', { skip }, async () => {
  const r = await call('POST', '/products', { name: 'Otro', sku: 'ci-' + SUFFIX, categoryId: category.id, unit: 'Unidad' });
  assert.equal(r.status, 409);
});

test('salida mayor al stock se rechaza y no cambia nada', { skip }, async () => {
  const r = await call('POST', '/movements', { type: 'salida', responsible: 'Jenkins', lines: [{ productId: product.id, quantity: 11 }] });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /Stock insuficiente/);
  assert.equal((await call('GET', '/products/' + product.id)).data.stock, 10);
});

test('entrada con costo actualiza stock y costo promedio', { skip }, async () => {
  const r = await call('POST', '/movements', { type: 'entrada', responsible: 'Jenkins', lines: [{ productId: product.id, quantity: 10, unitCost: 2000 }] });
  assert.equal(r.status, 201);
  const p = (await call('GET', '/products/' + product.id)).data;
  assert.equal(p.stock, 20);
  assert.equal(p.cost, 1500);
});

test('salida genera remisión con número consecutivo y datos de quien recibe', { skip }, async () => {
  const r = await call('POST', '/movements', {
    type: 'salida', responsible: 'Jenkins', destination: 'Obra CI', receivedBy: 'Receptor', vehicle: 'abc123',
    lines: [{ productId: product.id, quantity: 5 }]
  });
  assert.equal(r.status, 201);
  const mv = r.data[0];
  assert.match(mv.docNumber, /^SAL-\d{6}$/);
  const doc = await call('GET', '/documents/' + mv.docId);
  assert.equal(doc.status, 200);
  assert.equal(doc.data.type, 'salida');
  assert.equal(doc.data.vehicle, 'ABC123');
  assert.equal(doc.data.lines.length, 1);
  assert.equal(doc.data.lines[0].brand, 'Marca CI');
  assert.equal((await call('GET', '/products/' + product.id)).data.stock, 15);
});

test('limpieza: eliminar producto conserva su historial', { skip }, async () => {
  assert.equal((await call('DELETE', '/products/' + product.id)).status, 204);
  assert.equal((await call('GET', '/products/' + product.id)).status, 404);
  const hist = await call('GET', '/movements?search=CI-' + SUFFIX);
  assert.ok(hist.data.length >= 3, 'el historial se conserva');
  assert.equal((await call('DELETE', '/categories/' + category.id)).status, 204);
});
