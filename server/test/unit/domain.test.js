/**
 * Pruebas unitarias de las reglas de negocio (no necesitan base de datos).
 * Ejecutar:  npm test     (o en Docker: docker build --target test .)
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../src/domain');

const product = (over) => Object.assign({ name: 'Cemento', unit: 'Bulto', stock: 100, cost: 32000, expiryDate: null }, over);

test('entrada suma stock y recalcula el costo promedio ponderado', () => {
  const r = D.applyMovementLine('entrada', product({ stock: 105, cost: 32000 }), { quantity: 95, unitCost: 34000 });
  assert.equal(r.previousStock, 105);
  assert.equal(r.newStock, 200);
  assert.equal(r.newCost, 32950); // (105*32000 + 95*34000) / 200
  assert.equal(r.quantity, 95);
});

test('entrada sin costo conserva el costo actual', () => {
  const r = D.applyMovementLine('entrada', product(), { quantity: 10 });
  assert.equal(r.newCost, 32000);
  assert.equal(r.newStock, 110);
});

test('salida resta stock', () => {
  const r = D.applyMovementLine('salida', product(), { quantity: 15 });
  assert.equal(r.newStock, 85);
  assert.equal(r.quantity, 15);
});

test('salida mayor al stock se rechaza (nunca stock negativo)', () => {
  assert.throws(() => D.applyMovementLine('salida', product({ stock: 5 }), { quantity: 6 }), /Stock insuficiente/);
});

test('cantidades no válidas se rechazan', () => {
  assert.throws(() => D.applyMovementLine('entrada', product(), { quantity: 0 }), /Cantidad no válida/);
  assert.throws(() => D.applyMovementLine('salida', product(), { quantity: -3 }), /Cantidad no válida/);
  assert.throws(() => D.applyMovementLine('entrada', product(), { quantity: 'abc' }), /Cantidad no válida/);
});

test('ajuste deja el stock en el conteo físico y registra la diferencia', () => {
  const r = D.applyMovementLine('ajuste', product({ stock: 200 }), { quantity: 198 });
  assert.equal(r.newStock, 198);
  assert.equal(r.quantity, -2);
});

test('ajuste igual al stock actual se rechaza', () => {
  assert.throws(() => D.applyMovementLine('ajuste', product({ stock: 50 }), { quantity: 50 }), /no hay nada que ajustar/);
});

test('el vencimiento conserva la fecha más próxima del lote', () => {
  const p = product({ stock: 10, expiryDate: '2026-12-01' });
  assert.equal(D.applyMovementLine('entrada', p, { quantity: 5, expiryDate: '2027-06-30' }).newExpiry, '2026-12-01');
  assert.equal(D.applyMovementLine('entrada', p, { quantity: 5, expiryDate: '2026-11-20' }).newExpiry, '2026-11-20');
  // sin existencias previas, manda la fecha del lote nuevo
  assert.equal(D.applyMovementLine('entrada', product({ stock: 0, expiryDate: '2026-01-01' }), { quantity: 5, expiryDate: '2027-01-01' }).newExpiry, '2027-01-01');
});

test('al quedar sin stock se borra la fecha de vencimiento', () => {
  const r = D.applyMovementLine('salida', product({ stock: 8, expiryDate: '2026-12-01' }), { quantity: 8 });
  assert.equal(r.newStock, 0);
  assert.equal(r.newExpiry, null);
});

test('número de documento consecutivo con prefijo', () => {
  assert.equal(D.docNumber('entrada', 1), 'ENT-000001');
  assert.equal(D.docNumber('salida', 76), 'SAL-000076');
  assert.equal(D.docNumber('ajuste', 123456), 'AJU-123456');
});

test('validación de producto', () => {
  const ok = D.validateProduct({ name: ' Varilla ', sku: 'ace-9', categoryId: 'cat_acero', unit: 'Varilla', minStock: '5', maxStock: '' });
  assert.equal(ok.name, 'Varilla');
  assert.equal(ok.sku, 'ACE-9');
  assert.equal(ok.minStock, 5);
  assert.equal(ok.maxStock, 0);
  assert.throws(() => D.validateProduct({ sku: 'X', categoryId: 'c', unit: 'u' }), /nombre del producto/);
  assert.throws(() => D.validateProduct({ name: 'A', sku: 'X', categoryId: 'c', unit: 'u', minStock: 10, maxStock: 5 }), /máximo no puede ser menor/);
  assert.throws(() => D.validateProduct({ name: 'A', sku: 'X', categoryId: 'c', unit: 'u', cost: -1 }), /mayor o igual a 0/);
  assert.throws(() => D.validateProduct({ name: 'A', sku: 'X', categoryId: 'c', unit: 'u', expiryDate: '31/12/2026' }), /vencimiento no es válida/);
});

test('validación de cabecera de movimiento', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  assert.throws(() => D.validateMovementHeader({ type: 'robo', lines: [{}], responsible: 'A' }, now), /Tipo de movimiento/);
  assert.throws(() => D.validateMovementHeader({ type: 'salida', lines: [], responsible: 'A' }, now), /al menos un producto/);
  assert.throws(() => D.validateMovementHeader({ type: 'salida', lines: [{ productId: 'p' }], responsible: ' ' }, now), /responsable/);
  assert.throws(() => D.validateMovementHeader({ type: 'salida', lines: [{ productId: 'p' }], responsible: 'A', date: '2027-01-01' }, now), /futuro/);
  assert.throws(() => D.validateMovementHeader({ type: 'salida', lines: [{ productId: 'p' }, { productId: 'p' }], responsible: 'A' }, now), /repetidos/);
  const h = D.validateMovementHeader({ type: 'entrada', lines: [{ productId: 'p' }], responsible: 'Ana', destination: 'Obra', supplierId: 'sup_1' }, now);
  assert.equal(h.destination, '', 'el destino solo aplica a salidas');
  assert.equal(h.supplierId, 'sup_1');
});

test('validación de correo y color', () => {
  assert.throws(() => D.validateSupplier({ name: 'X', email: 'no-es-correo' }), /correo/);
  assert.equal(D.validateCategory({ name: 'Nueva', color: 'rojo', icon: 'cohete' }).color, '#64748b');
  assert.equal(D.validateCategory({ name: 'Nueva', color: '#AABBCC', icon: 'acero' }).icon, 'acero');
});
