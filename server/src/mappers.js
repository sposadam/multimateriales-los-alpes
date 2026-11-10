/**
 * mappers.js — Correspondencia entre los campos de la API (camelCase)
 * y las columnas de la base de datos (snake_case).
 */
'use strict';

const MAPS = {
  categories: { id: 'id', name: 'name', color: 'color', icon: 'icon' },
  suppliers: { id: 'id', name: 'name', nit: 'nit', contact: 'contact', phone: 'phone', email: 'email', address: 'address' },
  products: {
    id: 'id', sku: 'sku', name: 'name', brand: 'brand', categoryId: 'category_id', supplierId: 'supplier_id',
    unit: 'unit', stock: 'stock', minStock: 'min_stock', maxStock: 'max_stock', cost: 'cost', price: 'price',
    location: 'location', description: 'description', image: 'image', expiryDate: 'expiry_date',
    createdAt: 'created_at', updatedAt: 'updated_at'
  },
  movements: {
    id: 'id', docId: 'doc_id', docNumber: 'doc_number', batchId: 'batch_id', productId: 'product_id',
    productName: 'product_name', sku: 'sku', unit: 'unit', type: 'type', quantity: 'quantity',
    previousStock: 'previous_stock', newStock: 'new_stock', unitCost: 'unit_cost', reason: 'reason',
    destination: 'destination', receivedBy: 'received_by', receivedById: 'received_by_id', vehicle: 'vehicle',
    supplierId: 'supplier_id', reference: 'reference', responsible: 'responsible', notes: 'notes',
    expiryDate: 'expiry_date', date: 'date', createdAt: 'created_at'
  }
};

/** Lista de columnas para SELECT con alias en camelCase: "min_stock" AS "minStock" */
function selectList(table, alias) {
  const p = alias ? alias + '.' : '';
  return Object.entries(MAPS[table]).map(([k, c]) => p + '"' + c + '" AS "' + k + '"').join(', ');
}

/** INSERT parametrizado a partir de un objeto en camelCase (ignora campos undefined). */
function insertQuery(table, obj) {
  const entries = Object.entries(MAPS[table]).filter(([k]) => obj[k] !== undefined);
  return {
    text: 'INSERT INTO ' + table + ' (' + entries.map(([, c]) => '"' + c + '"').join(', ') + ') VALUES (' +
      entries.map((_, i) => '$' + (i + 1)).join(', ') + ')',
    values: entries.map(([k]) => obj[k])
  };
}

/** UPDATE parametrizado por id a partir de un objeto en camelCase. */
function updateQuery(table, id, obj) {
  const entries = Object.entries(MAPS[table]).filter(([k]) => k !== 'id' && obj[k] !== undefined);
  return {
    text: 'UPDATE ' + table + ' SET ' + entries.map(([, c], i) => '"' + c + '" = $' + (i + 1)).join(', ') +
      ' WHERE id = $' + (entries.length + 1),
    values: entries.map(([k]) => obj[k]).concat([id])
  };
}

module.exports = { MAPS, selectList, insertQuery, updateQuery };
