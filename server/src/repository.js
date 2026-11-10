/**
 * repository.js — Acceso a datos. Toda la lectura/escritura en PostgreSQL
 * pasa por aquí. Las operaciones que cambian varias tablas usan transacciones.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./db');
const D = require('./domain');
const { selectList, insertQuery, updateQuery } = require('./mappers');
const seed = require('./seed');

const { HttpError, badRequest } = D;
const notFound = (msg) => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);
const nowIso = () => new Date().toISOString();

/** Quita campos null/undefined para que la base use sus valores por defecto. */
function clean(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => { if (obj[k] !== null && obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

/* ---------------------------------------------------------------------- */
/* Esquema y datos iniciales                                               */
/* ---------------------------------------------------------------------- */
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(sql);
}

async function isEmpty() {
  const r = await db.query('SELECT (SELECT count(*) FROM products) + (SELECT count(*) FROM movements) + (SELECT count(*) FROM categories) AS n');
  return r.rows[0].n === 0;
}

async function nextDocNumber(c, type) {
  const r = await c.query('UPDATE doc_counters SET last_number = last_number + 1 WHERE type = $1 RETURNING last_number', [type]);
  return D.docNumber(type, r.rows[0].last_number);
}

async function truncateAll(c) {
  await c.query('TRUNCATE movements, products, suppliers, categories RESTART IDENTITY CASCADE');
}

async function insertDataset(c, ds) {
  for (const x of ds.categories || []) await c.query(insertQuery('categories', clean(x)));
  for (const x of ds.suppliers || []) await c.query(insertQuery('suppliers', clean(x)));
  for (const x of ds.products || []) await c.query(insertQuery('products', clean(x)));
  for (const x of ds.movements || []) await c.query(insertQuery('movements', clean(x)));
}

async function setCounters(c, counters) {
  for (const type of D.MOVEMENT_TYPES) {
    await c.query('UPDATE doc_counters SET last_number = $1 WHERE type = $2', [Math.max(0, parseInt(counters[type], 10) || 0), type]);
  }
}

async function loadDemo() {
  return db.tx(async (c) => {
    const ds = seed.create();
    await truncateAll(c);
    await insertDataset(c, ds);
    await setCounters(c, ds.counters);
    return true;
  });
}

/* ---------------------------------------------------------------------- */
/* Configuración                                                           */
/* ---------------------------------------------------------------------- */
async function getSettings(client) {
  const c = client || db;
  const s = (await c.query('SELECT company_name AS "companyName", nit, address, phone, email FROM settings WHERE id = 1')).rows[0];
  const counters = {};
  (await c.query('SELECT type, last_number FROM doc_counters')).rows.forEach((r) => { counters[r.type] = r.last_number; });
  return Object.assign({}, s, { counters });
}

async function saveSettings(data) {
  const v = D.validateSettings(data || {});
  await db.query('UPDATE settings SET company_name = $1, nit = $2, address = $3, phone = $4, email = $5 WHERE id = 1',
    [v.companyName, v.nit, v.address, v.phone, v.email]);
  return getSettings();
}

/* ---------------------------------------------------------------------- */
/* Categorías                                                              */
/* ---------------------------------------------------------------------- */
async function getCategories() {
  return (await db.query('SELECT ' + selectList('categories') + ' FROM categories ORDER BY name')).rows;
}

async function saveCategory(data) {
  const v = D.validateCategory(data || {});
  return db.tx(async (c) => {
    const dup = await c.query('SELECT 1 FROM categories WHERE lower(name) = lower($1) AND id <> $2', [v.name, data.id || '']);
    if (dup.rowCount) throw conflict('Ya existe una categoría con ese nombre.');
    if (data.id) {
      const r = await c.query(updateQuery('categories', data.id, v));
      if (!r.rowCount) throw notFound('La categoría no existe.');
      return Object.assign({ id: data.id }, v);
    }
    const cat = Object.assign({ id: D.uid('cat') }, v);
    await c.query(insertQuery('categories', cat));
    return cat;
  });
}

async function deleteCategory(id) {
  const used = (await db.query('SELECT count(*) AS n FROM products WHERE category_id = $1', [id])).rows[0].n;
  if (used) throw conflict('No se puede eliminar: hay ' + used + ' producto(s) en esta categoría. Muévelos a otra primero.');
  const r = await db.query('DELETE FROM categories WHERE id = $1', [id]);
  if (!r.rowCount) throw notFound('La categoría no existe.');
  return true;
}

/* ---------------------------------------------------------------------- */
/* Proveedores                                                             */
/* ---------------------------------------------------------------------- */
async function getSuppliers() {
  return (await db.query('SELECT ' + selectList('suppliers') + ' FROM suppliers ORDER BY name')).rows;
}

async function saveSupplier(data) {
  const v = D.validateSupplier(data || {});
  if (data.id) {
    const r = await db.query(updateQuery('suppliers', data.id, v));
    if (!r.rowCount) throw notFound('El proveedor no existe.');
    return Object.assign({ id: data.id }, v);
  }
  const sup = Object.assign({ id: D.uid('sup') }, v);
  await db.query(insertQuery('suppliers', sup));
  return sup;
}

async function deleteSupplier(id) {
  const used = (await db.query('SELECT count(*) AS n FROM products WHERE supplier_id = $1', [id])).rows[0].n;
  if (used) throw conflict('No se puede eliminar: el proveedor está asignado a ' + used + ' producto(s).');
  const r = await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
  if (!r.rowCount) throw notFound('El proveedor no existe.');
  return true;
}

/* ---------------------------------------------------------------------- */
/* Productos                                                               */
/* ---------------------------------------------------------------------- */
async function getProducts() {
  return (await db.query('SELECT ' + selectList('products') + ' FROM products ORDER BY name')).rows;
}

async function getProduct(id, client) {
  const r = await (client || db).query('SELECT ' + selectList('products') + ' FROM products WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function saveProduct(data) {
  data = data || {};
  const v = D.validateProduct(data);
  return db.tx(async (c) => {
    const dup = await c.query('SELECT 1 FROM products WHERE upper(sku) = upper($1) AND id <> $2', [v.sku, data.id || '']);
    if (dup.rowCount) throw conflict('Ya existe un producto con el código ' + v.sku + '.');
    if (!(await c.query('SELECT 1 FROM categories WHERE id = $1', [v.categoryId])).rowCount) throw badRequest('Selecciona una categoría válida.');
    if (v.supplierId && !(await c.query('SELECT 1 FROM suppliers WHERE id = $1', [v.supplierId])).rowCount) {
      throw badRequest('El proveedor seleccionado no existe.');
    }
    const now = nowIso();

    if (data.id) {
      // El stock NO se edita aquí: solo cambia mediante movimientos (trazabilidad).
      const r = await c.query(updateQuery('products', data.id, Object.assign({}, v, { updatedAt: now })));
      if (!r.rowCount) throw notFound('El producto no existe.');
      await c.query('UPDATE movements SET product_name = $1, sku = $2, unit = $3 WHERE product_id = $4', [v.name, v.sku, v.unit, data.id]);
      return getProduct(data.id, c);
    }

    const initial = D.nonNegative(data.stock, 'Stock inicial');
    const p = Object.assign({ id: D.uid('prd'), stock: initial, createdAt: now, updatedAt: now }, v);
    await c.query(insertQuery('products', p));
    if (initial > 0) {
      await c.query(insertQuery('movements', clean({
        id: D.uid('mov'), docId: D.uid('doc'), docNumber: await nextDocNumber(c, 'entrada'),
        productId: p.id, productName: p.name, sku: p.sku, unit: p.unit,
        type: 'entrada', quantity: initial, previousStock: 0, newStock: initial, unitCost: p.cost,
        reason: 'Inventario inicial', reference: 'INV-INICIAL',
        responsible: D.text(data.responsible, 80) || 'Sistema',
        expiryDate: p.expiryDate, date: now, createdAt: now
      })));
    }
    return getProduct(p.id, c);
  });
}

async function deleteProduct(id) {
  // Los movimientos se conservan (guardan nombre y SKU) para no perder la historia.
  const r = await db.query('DELETE FROM products WHERE id = $1', [id]);
  if (!r.rowCount) throw notFound('El producto no existe.');
  return true;
}

/* ---------------------------------------------------------------------- */
/* Movimientos                                                             */
/* ---------------------------------------------------------------------- */
/**
 * Filtros: { productId, type, from (ISO), to (ISO), search, limit }
 * Ordenado del más reciente al más antiguo.
 */
async function getMovements(f) {
  f = f || {};
  const where = [];
  const params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', '$' + params.length)); };
  if (f.productId) add('product_id = ?', f.productId);
  if (f.type) add('type = ?', f.type);
  if (f.from && !isNaN(new Date(f.from))) add('"date" >= ?', new Date(f.from).toISOString());
  if (f.to && !isNaN(new Date(f.to))) add('"date" <= ?', new Date(f.to).toISOString());
  let sql = 'SELECT ' + selectList('movements') + ' FROM movements' + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY "date" DESC, seq DESC';
  const limit = parseInt(f.limit, 10);
  if (limit > 0 && !f.search) sql += ' LIMIT ' + Math.min(limit, 10000);
  let rows = (await db.query(sql, params)).rows;
  const q = D.normalize(f.search);
  if (q) {
    rows = rows.filter((m) => D.normalize([m.docNumber, m.productName, m.sku, m.reason, m.reference, m.responsible, m.destination, m.notes].join(' ')).includes(q));
  }
  return rows;
}

/**
 * Registra un movimiento (una o varias líneas) y actualiza el stock de forma
 * atómica. Las filas de producto se bloquean (FOR UPDATE) para que dos
 * usuarios no descuenten el mismo stock al mismo tiempo.
 */
async function registerMovement(payload) {
  const h = D.validateMovementHeader(payload || {});
  return db.tx(async (c) => {
    const ids = h.lines.map((l) => String(l.productId));
    const rows = (await c.query('SELECT ' + selectList('products') + ' FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids])).rows;
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (h.supplierId && !(await c.query('SELECT 1 FROM suppliers WHERE id = $1', [h.supplierId])).rowCount) {
      throw badRequest('El proveedor seleccionado no existe.');
    }
    const docNumber = await nextDocNumber(c, h.type);
    const docId = D.uid('doc');
    const batchId = h.lines.length > 1 ? D.uid('lote') : null;
    const now = nowIso();
    const created = [];

    for (const line of h.lines) {
      const p = byId.get(String(line.productId));
      if (!p) throw badRequest('Uno de los productos seleccionados ya no existe.');
      const r = D.applyMovementLine(h.type, p, line);
      await c.query('UPDATE products SET stock = $1, cost = $2, expiry_date = $3, updated_at = $4 WHERE id = $5',
        [r.newStock, r.newCost, r.newExpiry, now, p.id]);
      const mv = {
        id: D.uid('mov'), docId, docNumber, batchId,
        productId: p.id, productName: p.name, sku: p.sku, unit: p.unit,
        type: h.type, quantity: r.quantity, previousStock: r.previousStock, newStock: r.newStock, unitCost: r.unitCost,
        reason: h.reason, destination: h.destination, receivedBy: h.receivedBy, receivedById: h.receivedById,
        vehicle: h.vehicle, supplierId: h.supplierId, reference: h.reference, responsible: h.responsible,
        notes: h.notes, expiryDate: r.lineExpiry, date: h.date, createdAt: now
      };
      await c.query(insertQuery('movements', clean(mv)));
      created.push(mv);
    }
    return created;
  });
}

/** Documento (remisión / comprobante): cabecera + líneas. */
async function getDocument(docId) {
  const lines = (await db.query(
    'SELECT ' + selectList('movements', 'm') + ', COALESCE(p.brand, \'\') AS brand FROM movements m ' +
    'LEFT JOIN products p ON p.id = m.product_id WHERE m.doc_id = $1 ORDER BY m.seq', [docId])).rows;
  if (!lines.length) throw notFound('No se encontró el documento.');
  const head = lines[0];
  const supplier = head.supplierId
    ? (await db.query('SELECT ' + selectList('suppliers') + ' FROM suppliers WHERE id = $1', [head.supplierId])).rows[0] || null
    : null;
  return {
    docId,
    docNumber: head.docNumber,
    type: head.type,
    date: head.date,
    reason: head.reason,
    reference: head.reference,
    responsible: head.responsible,
    destination: head.destination,
    receivedBy: head.receivedBy,
    receivedById: head.receivedById,
    vehicle: head.vehicle,
    supplier,
    notes: head.notes,
    settings: await getSettings(),
    lines
  };
}

/* ---------------------------------------------------------------------- */
/* Respaldo y mantenimiento                                                */
/* ---------------------------------------------------------------------- */
async function exportData() {
  const [settings, categories, suppliers, products, movements] = await Promise.all([
    getSettings(), getCategories(), getSuppliers(), getProducts(),
    db.query('SELECT ' + selectList('movements') + ' FROM movements ORDER BY seq').then((r) => r.rows)
  ]);
  return { app: 'MultiMateriales Los Alpes', version: 2, exportedAt: nowIso(), settings, categories, suppliers, products, movements };
}

/** Restaura un respaldo JSON (también acepta los respaldos de la versión que guardaba en el navegador). */
async function importData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.products) || !Array.isArray(data.movements) || !Array.isArray(data.categories)) {
    throw badRequest('El archivo no es un respaldo válido de la aplicación.');
  }
  const categories = data.categories;
  const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  const supIds = new Set(suppliers.map((s) => s.id));
  const products = data.products.map((p) => Object.assign({}, p, { supplierId: supIds.has(p.supplierId) ? p.supplierId : null }));
  const prodIds = new Set(products.map((p) => p.id));

  // Números de documento faltantes (respaldos antiguos) en orden cronológico.
  const counters = { entrada: 0, salida: 0, ajuste: 0 };
  data.movements.forEach((m) => {
    const n = parseInt(String(m.docNumber || '').split('-')[1], 10);
    if (counters[m.type] !== undefined && n > counters[m.type]) counters[m.type] = n;
  });
  const groups = new Map();
  const movements = data.movements.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map((m) => {
    const out = Object.assign({}, m, {
      productId: prodIds.has(m.productId) ? m.productId : null,
      supplierId: supIds.has(m.supplierId) ? m.supplierId : null
    });
    if (!out.docNumber && D.MOVEMENT_TYPES.includes(m.type)) {
      const key = m.batchId || m.id;
      if (!groups.has(key)) { counters[m.type] += 1; groups.set(key, D.docNumber(m.type, counters[m.type])); }
      out.docId = key;
      out.docNumber = groups.get(key);
    }
    return out;
  });
  const saved = (data.settings && data.settings.counters) || {};
  D.MOVEMENT_TYPES.forEach((t) => { counters[t] = Math.max(counters[t], parseInt(saved[t], 10) || 0); });

  return db.tx(async (c) => {
    await truncateAll(c);
    await insertDataset(c, { categories, suppliers, products, movements });
    await setCounters(c, counters);
    if (data.settings && data.settings.companyName) {
      const v = D.validateSettings(data.settings);
      await c.query('UPDATE settings SET company_name = $1, nit = $2, address = $3, phone = $4, email = $5 WHERE id = 1',
        [v.companyName, v.nit, v.address, v.phone, v.email]);
    }
    return true;
  });
}

async function clearAll() {
  return db.tx(async (c) => {
    await truncateAll(c);
    for (const cat of seed.CATEGORIES) await c.query(insertQuery('categories', cat));
    return true;
  });
}

async function getInfo() {
  const r = (await db.query(
    "SELECT split_part(version(), ' ', 2) AS version, pg_database_size(current_database()) AS size, current_database() AS name, " +
    'host(inet_server_addr()) AS server_ip, ' +
    '(SELECT count(*) FROM products) AS products, (SELECT count(*) FROM movements) AS movements')).rows[0];
  return {
    // Evidencia de comunicación: nombre de servicio configurado y la IP interna que resolvió Docker.
    dbHost: process.env.DATABASE_URL ? '(DATABASE_URL)' : (process.env.DB_HOST || 'db'),
    dbServerIp: r.server_ip,
    engine: 'PostgreSQL ' + r.version,
    database: r.name,
    size: r.size,
    products: r.products,
    movements: r.movements,
    adminerUrl: process.env.ADMINER_URL || ''
  };
}

module.exports = {
  migrate, isEmpty, loadDemo,
  getSettings, saveSettings,
  getCategories, saveCategory, deleteCategory,
  getSuppliers, saveSupplier, deleteSupplier,
  getProducts, getProduct, saveProduct, deleteProduct,
  getMovements, registerMovement, getDocument,
  exportData, importData, clearAll, getInfo
};
