/**
 * store.js — Capa de datos del navegador.
 *
 * Toda la interfaz habla con los datos únicamente a través de `App.store`.
 * Cada método llama a la API REST del servidor (contenedor "app"), que a su
 * vez guarda la información en PostgreSQL (contenedor "db").
 *
 *   Navegador ──HTTP──► /api/... (Node.js + Express) ──SQL──► PostgreSQL
 */
(function (App) {
  'use strict';

  const API = (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || 'api';

  async function request(method, path, body) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error('No hay conexión con el servidor. Verifica que los contenedores estén encendidos (docker compose up).');
    }
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch (e) { /* respuesta sin JSON */ }
    if (!res.ok) throw new Error((data && data.error) || ('Error del servidor (' + res.status + ').'));
    return data;
  }

  const enc = encodeURIComponent;
  const qs = (params) => {
    const parts = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => enc(k) + '=' + enc(params[k]));
    return parts.length ? '?' + parts.join('&') : '';
  };

  /** "YYYY-MM-DD" (fecha local del usuario) -> instante ISO del inicio o fin de ese día. */
  function dayBoundary(ymd, end) {
    if (!ymd) return undefined;
    const d = new Date(ymd + (end ? 'T23:59:59.999' : 'T00:00:00'));
    return isNaN(d) ? undefined : d.toISOString();
  }

  App.store = {
    // Configuración
    getSettings: () => request('GET', '/settings'),
    saveSettings: (data) => request('PUT', '/settings', data),

    // Categorías
    getCategories: () => request('GET', '/categories'),
    saveCategory: (data) => data.id ? request('PUT', '/categories/' + enc(data.id), data) : request('POST', '/categories', data),
    deleteCategory: (id) => request('DELETE', '/categories/' + enc(id)),

    // Proveedores
    getSuppliers: () => request('GET', '/suppliers'),
    saveSupplier: (data) => data.id ? request('PUT', '/suppliers/' + enc(data.id), data) : request('POST', '/suppliers', data),
    deleteSupplier: (id) => request('DELETE', '/suppliers/' + enc(id)),

    // Productos
    getProducts: () => request('GET', '/products'),
    getProduct: (id) => request('GET', '/products/' + enc(id)).catch((e) => {
      if (/no existe/i.test(e.message)) return null;
      throw e;
    }),
    saveProduct: (data) => data.id ? request('PUT', '/products/' + enc(data.id), data) : request('POST', '/products', data),
    deleteProduct: (id) => request('DELETE', '/products/' + enc(id)),

    // Movimientos y documentos
    getMovements: (f) => {
      f = f || {};
      return request('GET', '/movements' + qs({
        productId: f.productId, type: f.type, search: f.search, limit: f.limit,
        from: dayBoundary(f.from, false), to: dayBoundary(f.to, true)
      }));
    },
    registerMovement: (payload) => request('POST', '/movements', payload),
    getDocument: (docId) => request('GET', '/documents/' + enc(docId)).catch((e) => {
      if (/no se encontr/i.test(e.message)) return null;
      throw e;
    }),

    // Respaldo y mantenimiento
    exportData: () => request('GET', '/export'),
    importData: (data) => request('POST', '/import', data),
    resetDemo: () => request('POST', '/demo'),
    clearAll: () => request('POST', '/clear'),
    getInfo: () => request('GET', '/info'),
    health: () => request('GET', '/health')
  };
})(window.App);
