/**
 * domain.js — Reglas de negocio puras (sin base de datos).
 * Se prueban con pruebas unitarias en test/unit.
 */
'use strict';

const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const badRequest = (msg) => new HttpError(400, msg);

const MOVEMENT_TYPES = ['entrada', 'salida', 'ajuste'];
const DOC_PREFIX = { entrada: 'ENT', salida: 'SAL', ajuste: 'AJU' };
const ICON_KEYS = ['cemento', 'acero', 'agregados', 'ladrillos', 'madera', 'plomeria', 'electrico', 'pinturas', 'herramientas', 'ferreteria', 'otros'];

function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

function round(n, decimals) {
  const f = Math.pow(10, decimals == null ? 3 : decimals);
  return Math.round((Number(n) || 0) * f) / f;
}

function text(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 250);
}

function normalize(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function nonNegative(v, label) {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw badRequest('"' + label + '" debe ser un número mayor o igual a 0.');
  return round(n);
}

const isHexColor = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
const isDateOnly = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !isNaN(new Date(v + 'T00:00:00Z').getTime());

function docNumber(type, n) {
  return DOC_PREFIX[type] + '-' + String(n).padStart(6, '0');
}

/* ---------------------------------------------------------------------- */
/* Validaciones de entidades                                               */
/* ---------------------------------------------------------------------- */
function validateSettings(data) {
  const companyName = text(data.companyName, 80);
  if (!companyName) throw badRequest('El nombre de la bodega es obligatorio.');
  const email = text(data.email, 120);
  if (email && !isEmail(email)) throw badRequest('El correo electrónico no es válido.');
  return { companyName, nit: text(data.nit, 30), address: text(data.address, 150), phone: text(data.phone, 60), email };
}

function validateCategory(data) {
  const name = text(data.name, 60);
  if (!name) throw badRequest('El nombre de la categoría es obligatorio.');
  return {
    name,
    color: isHexColor(data.color) ? data.color : '#64748b',
    icon: ICON_KEYS.includes(data.icon) ? data.icon : 'otros'
  };
}

function validateSupplier(data) {
  const name = text(data.name, 100);
  if (!name) throw badRequest('El nombre del proveedor es obligatorio.');
  const email = text(data.email, 120);
  if (email && !isEmail(email)) throw badRequest('El correo electrónico no es válido.');
  return {
    name,
    nit: text(data.nit, 30),
    contact: text(data.contact, 80),
    phone: text(data.phone, 40),
    email,
    address: text(data.address, 150)
  };
}

/** Valida los campos editables de un producto (no incluye el stock). */
function validateProduct(data) {
  const name = text(data.name, 120);
  const sku = text(data.sku, 30).toUpperCase();
  if (!name) throw badRequest('El nombre del producto es obligatorio.');
  if (!sku) throw badRequest('El código (SKU) es obligatorio.');
  if (!data.categoryId) throw badRequest('Selecciona una categoría válida.');
  const unit = text(data.unit, 20);
  if (!unit) throw badRequest('La unidad de medida es obligatoria.');
  const expiryDate = data.expiryDate ? String(data.expiryDate).slice(0, 10) : null;
  if (expiryDate && !isDateOnly(expiryDate)) throw badRequest('La fecha de vencimiento no es válida.');
  const image = typeof data.image === 'string' && data.image.startsWith('data:image/') ? data.image : null;
  if (image && image.length > 3 * 1024 * 1024) throw badRequest('La imagen es demasiado grande (máximo ~2 MB).');

  const values = {
    name, sku, unit,
    brand: text(data.brand, 60),
    expiryDate,
    categoryId: String(data.categoryId),
    supplierId: data.supplierId ? String(data.supplierId) : null,
    location: text(data.location, 80),
    description: text(data.description, 600),
    minStock: nonNegative(data.minStock, 'Stock mínimo'),
    maxStock: nonNegative(data.maxStock, 'Stock máximo'),
    cost: nonNegative(data.cost, 'Costo unitario'),
    price: nonNegative(data.price, 'Precio de venta'),
    image
  };
  if (values.maxStock && values.maxStock < values.minStock) {
    throw badRequest('El stock máximo no puede ser menor que el mínimo.');
  }
  return values;
}

/** Valida la cabecera de un movimiento. */
function validateMovementHeader(payload, now) {
  const type = payload && payload.type;
  if (!MOVEMENT_TYPES.includes(type)) throw badRequest('Tipo de movimiento no válido.');
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!lines.length) throw badRequest('Agrega al menos un producto al movimiento.');
  if (lines.length > 200) throw badRequest('Un movimiento admite máximo 200 productos.');
  const responsible = text(payload.responsible, 80);
  if (!responsible) throw badRequest('Indica quién es el responsable del movimiento.');
  const date = payload.date ? new Date(payload.date) : new Date(now || Date.now());
  if (isNaN(date.getTime())) throw badRequest('La fecha del movimiento no es válida.');
  if (date.getTime() > (now || Date.now()) + 5 * 60e3) throw badRequest('La fecha del movimiento no puede estar en el futuro.');
  const ids = lines.map((l) => l && l.productId);
  if (new Set(ids).size !== ids.length) throw badRequest('Hay productos repetidos en el movimiento.');

  return {
    type,
    lines,
    date: date.toISOString(),
    reason: text(payload.reason, 80),
    reference: text(payload.reference, 60),
    responsible,
    destination: type === 'salida' ? text(payload.destination, 100) : '',
    receivedBy: type === 'salida' ? text(payload.receivedBy, 80) : '',
    receivedById: type === 'salida' ? text(payload.receivedById, 30) : '',
    vehicle: type === 'salida' ? text(payload.vehicle, 30).toUpperCase() : '',
    supplierId: type === 'entrada' && payload.supplierId ? String(payload.supplierId) : null,
    notes: text(payload.notes, 400)
  };
}

/**
 * Calcula el efecto de una línea de movimiento sobre un producto.
 * product = { name, unit, stock, cost, expiryDate }
 * line    = { quantity, unitCost?, expiryDate? }
 * Devuelve { quantity, previousStock, newStock, unitCost, newCost, newExpiry, lineExpiry }
 *  - entrada: suma; con costo recalcula el costo promedio ponderado.
 *  - salida:  resta; nunca deja stock negativo.
 *  - ajuste:  `quantity` es el conteo físico; registra la diferencia.
 */
function applyMovementLine(type, product, line) {
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty < 0 || (type !== 'ajuste' && qty === 0)) {
    throw badRequest('Cantidad no válida para "' + product.name + '".');
  }
  const prev = round(product.stock);
  let next;
  let unitCost = Number(product.cost) || 0;
  let newCost = unitCost;
  let newExpiry = product.expiryDate || null;
  let lineExpiry = null;

  if (type === 'entrada') {
    next = round(prev + qty);
    const uc = Number(line.unitCost);
    if (Number.isFinite(uc) && uc > 0) {
      unitCost = uc;
      newCost = round((prev * (Number(product.cost) || 0) + qty * uc) / next, 2);
    }
    if (line.expiryDate) {
      lineExpiry = String(line.expiryDate).slice(0, 10);
      if (!isDateOnly(lineExpiry)) throw badRequest('Fecha de vencimiento no válida para "' + product.name + '".');
      if (prev <= 0 || !newExpiry || lineExpiry < newExpiry) newExpiry = lineExpiry;
    }
  } else if (type === 'salida') {
    if (qty > prev) {
      throw badRequest('Stock insuficiente de "' + product.name + '": hay ' + prev + ' ' + product.unit + ' y se intenta sacar ' + qty + '.');
    }
    next = round(prev - qty);
  } else {
    next = round(qty);
    if (next === prev) throw badRequest('El conteo de "' + product.name + '" es igual al stock actual; no hay nada que ajustar.');
  }
  if (next <= 0) newExpiry = null; // sin existencias no hay lote por vencer

  return {
    quantity: type === 'ajuste' ? round(next - prev) : round(qty),
    previousStock: prev,
    newStock: next,
    unitCost,
    newCost,
    newExpiry,
    lineExpiry
  };
}

module.exports = {
  HttpError, badRequest,
  MOVEMENT_TYPES, DOC_PREFIX, ICON_KEYS,
  uid, round, text, normalize, nonNegative, isHexColor, isEmail, isDateOnly, docNumber,
  validateSettings, validateCategory, validateSupplier, validateProduct,
  validateMovementHeader, applyMovementLine
};
