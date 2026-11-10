/**
 * inventory.js — Listado de productos con búsqueda, filtros, vista de tarjetas/tabla y exportación.
 */
(function (App) {
  'use strict';

  const { esc, num, money, normalize, stockStatus, debounce, toCSV, download, fileStamp } = App.utils;
  const icon = App.icon;
  App.views = App.views || {};

  const state = {
    search: '',
    categoryId: '',
    status: '',
    sort: 'name',
    view: App.prefs.get('inventoryView', 'grid')
  };

  const SORTS = {
    name: { label: 'Nombre (A-Z)', fn: (a, b) => a.name.localeCompare(b.name, 'es') },
    sku: { label: 'Código', fn: (a, b) => a.sku.localeCompare(b.sku, 'es', { numeric: true }) },
    stockAsc: { label: 'Menor stock relativo', fn: (a, b) => ratio(a) - ratio(b) },
    value: { label: 'Mayor valor', fn: (a, b) => b.stock * b.cost - a.stock * a.cost },
    recent: { label: 'Actualizados recientemente', fn: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) }
  };
  function ratio(p) { return p.minStock ? p.stock / p.minStock : (p.stock > 0 ? 1e6 + p.stock : -1); }

  const STATUSES = {
    '': 'Todos los estados',
    alertas: 'Con alerta (bajo o agotado)',
    ok: 'Disponible',
    bajo: 'Stock bajo',
    agotado: 'Agotado',
    exceso: 'Sobre stock',
    vencimiento: 'Vencidos o por vencer (30 días)'
  };

  let data = { products: [], cats: [], sups: [] };

  App.views.inventario = {
    title: 'Inventario',
    subtitle: 'Productos de la bodega con sus existencias',

    async render(el, params, ctx) {
      // Los parámetros de la URL (ej: #/inventario?estado=bajo) se aplican al navegar, no al refrescar.
      if (!(ctx && ctx.refresh)) {
        if (params.has('estado')) state.status = STATUSES[params.get('estado')] != null ? params.get('estado') : '';
        if (params.has('categoria')) state.categoryId = params.get('categoria');
        if (params.has('buscar')) state.search = params.get('buscar');
      }

      const [products, cats, sups] = await Promise.all([App.store.getProducts(), App.store.getCategories(), App.store.getSuppliers()]);
      data = { products, cats, sups, catMap: new Map(cats.map((c) => [c.id, c])), supMap: new Map(sups.map((s) => [s.id, s])) };
      if (state.categoryId && !data.catMap.has(state.categoryId)) state.categoryId = '';

      el.innerHTML =
        '<div class="toolbar">' +
          '<div class="input-icon grow">' + icon('search') + '<input type="search" data-f="search" placeholder="Buscar por nombre, marca, código, ubicación, proveedor…" aria-label="Buscar productos"></div>' +
          '<select data-f="categoryId" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>' +
            cats.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('') + '</select>' +
          '<select data-f="status" aria-label="Filtrar por estado">' +
            Object.keys(STATUSES).map((k) => '<option value="' + k + '">' + STATUSES[k] + '</option>').join('') + '</select>' +
          '<select data-f="sort" aria-label="Ordenar">' +
            Object.keys(SORTS).map((k) => '<option value="' + k + '">' + SORTS[k].label + '</option>').join('') + '</select>' +
          '<div class="btn-group" role="group" aria-label="Tipo de vista">' +
            '<button type="button" data-view="grid" title="Vista de tarjetas" aria-label="Vista de tarjetas">' + icon('grid') + '</button>' +
            '<button type="button" data-view="table" title="Vista de tabla" aria-label="Vista de tabla">' + icon('list') + '</button>' +
          '</div>' +
          '<button type="button" class="btn btn-secondary" data-action="export" title="Exportar a CSV (Excel)">' + icon('download') + '<span class="hide-sm">Exportar</span></button>' +
          '<button type="button" class="btn btn-secondary" data-action="print" title="Imprimir">' + icon('printer') + '</button>' +
          '<button type="button" class="btn btn-primary" data-action="new">' + icon('plus') + 'Nuevo producto</button>' +
        '</div>' +
        '<div class="result-info" data-ref="info"></div>' +
        '<div data-ref="results"></div>';

      const q = (sel) => el.querySelector(sel);
      q('[data-f=search]').value = state.search;
      q('[data-f=categoryId]').value = state.categoryId;
      q('[data-f=status]').value = state.status;
      q('[data-f=sort]').value = state.sort;

      q('[data-f=search]').addEventListener('input', debounce((e) => { state.search = e.target.value; renderResults(el); }, 180));
      ['categoryId', 'status', 'sort'].forEach((k) => {
        q('[data-f=' + k + ']').addEventListener('change', (e) => { state[k] = e.target.value; renderResults(el); });
      });
      el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
        state.view = b.dataset.view;
        App.prefs.set('inventoryView', state.view);
        renderResults(el);
      }));
      q('[data-action=new]').addEventListener('click', () => App.productForm.open());
      q('[data-action=print]').addEventListener('click', () => window.print());
      q('[data-action=export]').addEventListener('click', () => exportCsv(filtered()));

      q('[data-ref=results]').addEventListener('click', onResultsClick);
      renderResults(el);
    }
  };

  function filtered() {
    const s = normalize(state.search);
    return data.products.filter((p) => {
      if (state.categoryId && p.categoryId !== state.categoryId) return false;
      const st = stockStatus(p).key;
      if (state.status === 'alertas' && st !== 'bajo' && st !== 'agotado') return false;
      if (state.status === 'vencimiento') {
        const ex = App.utils.expiryStatus(p);
        if (!ex || ex.key === 'vigente') return false;
      } else if (state.status && state.status !== 'alertas' && st !== state.status) return false;
      if (s) {
        const cat = data.catMap.get(p.categoryId);
        const sup = data.supMap.get(p.supplierId);
        const hay = normalize([p.name, p.sku, p.brand, p.location, p.description, cat && cat.name, sup && sup.name].join(' '));
        if (!s.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    }).sort(SORTS[state.sort].fn);
  }

  function renderResults(el) {
    const list = filtered();
    const info = el.querySelector('[data-ref=info]');
    const box = el.querySelector('[data-ref=results]');
    el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));

    const value = list.reduce((a, p) => a + p.stock * p.cost, 0);
    info.innerHTML = 'Mostrando <strong>' + list.length + '</strong> de ' + data.products.length + ' productos' +
      '<span>Valor filtrado: <strong>' + money(value) + '</strong></span>';

    if (!data.products.length) {
      box.innerHTML = '<div class="card">' + App.ui.emptyState('box', 'Tu inventario está vacío', 'Registra el primer producto para empezar a controlar la bodega.',
        '<button class="btn btn-primary" data-action="new-empty">' + icon('plus') + 'Nuevo producto</button>') + '</div>';
      return;
    }
    if (!list.length) {
      box.innerHTML = '<div class="card">' + App.ui.emptyState('search', 'Sin resultados', 'Ningún producto coincide con los filtros aplicados.',
        '<button class="btn btn-secondary" data-action="clear-filters">Limpiar filtros</button>') + '</div>';
      return;
    }
    box.innerHTML = state.view === 'table' ? tableHtml(list) : gridHtml(list);
  }

  function gridHtml(list) {
    return '<div class="product-grid">' + list.map((p) => {
      const cat = data.catMap.get(p.categoryId);
      const st = stockStatus(p);
      const ref = p.maxStock || Math.max(p.minStock * 3, p.stock, 1);
      const pct = Math.max(p.stock > 0 ? 3 : 0, Math.min(100, (p.stock / ref) * 100));
      const ex = App.utils.expiryStatus(p);
      return '<article class="card product-card" data-id="' + esc(p.id) + '" tabindex="0" aria-label="' + esc(p.name) + '">' +
        '<div class="pc-image"><img src="' + esc(App.images.forProduct(p, cat)) + '" alt="" loading="lazy"></div>' +
        '<div class="pc-body">' +
          '<div class="pc-tags"><span class="badge badge-' + st.cls + '">' + st.label + '</span>' +
            (ex && ex.key !== 'vigente' ? '<span class="badge badge-' + ex.cls + '" title="Vence el ' + esc(App.utils.dateOnly(p.expiryDate)) + '">' + icon('clock') + ex.label + '</span>' : '') + '</div>' +
          '<h3 class="pc-name" title="' + esc(p.name) + '">' + esc(p.name) + '</h3>' +
          '<div class="pc-meta">' + (p.brand ? '<span class="pc-brand">' + esc(p.brand) + '</span><span class="dot">·</span>' : '') + '<span>' + esc(p.sku) + '</span></div>' +
          (p.location ? '<div class="pc-meta">' + icon('pin') + '<span>' + esc(p.location) + '</span></div>' : '') +
          (cat ? '<div class="pc-meta"><span class="cat-chip" style="--cat:' + esc(cat.color) + '">' + esc(cat.name) + '</span></div>' : '') +
          '<div class="pc-stock"><strong>' + num(p.stock) + '</strong><span class="unit">' + esc(p.unit) + '</span><span class="min">Mín. ' + num(p.minStock) + '</span></div>' +
          '<div class="stock-bar"><span class="' + st.cls + '" style="width:' + pct + '%"></span></div>' +
        '</div>' +
        '<div class="pc-actions">' +
          '<button class="btn btn-success-soft btn-sm" data-act="entrada" title="Registrar entrada">' + icon('plus') + '<span class="label">Entrada</span></button>' +
          '<button class="btn btn-danger-soft btn-sm" data-act="salida" title="Registrar salida"' + (p.stock <= 0 ? ' disabled' : '') + '>' + icon('minus') + '<span class="label">Salida</span></button>' +
          '<button class="icon-btn" data-act="edit" title="Editar" aria-label="Editar">' + icon('edit') + '</button>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>';
  }

  function tableHtml(list) {
    return '<div class="card table-wrap"><table class="table"><thead><tr>' +
      '<th>Producto</th><th>Marca</th><th>Categoría</th><th>Ubicación</th><th class="num">Stock</th><th class="num">Mínimo</th><th class="num">Costo</th><th class="num">Valor</th><th>Vence</th><th>Estado</th><th class="actions">Acciones</th>' +
      '</tr></thead><tbody>' +
      list.map((p) => {
        const cat = data.catMap.get(p.categoryId);
        const st = stockStatus(p);
        const ex = App.utils.expiryStatus(p);
        return '<tr class="clickable" data-id="' + esc(p.id) + '">' +
          '<td><div class="prod-cell"><img class="thumb" src="' + esc(App.images.forProduct(p, cat)) + '" alt="" loading="lazy"><div><div class="name">' + esc(p.name) + '</div><div class="sku">' + esc(p.sku) + '</div></div></div></td>' +
          '<td>' + esc(p.brand || '—') + '</td>' +
          '<td>' + (cat ? '<span class="cat-chip" style="--cat:' + esc(cat.color) + '">' + esc(cat.name) + '</span>' : '—') + '</td>' +
          '<td class="nowrap">' + esc(p.location || '—') + '</td>' +
          '<td class="num"><strong>' + num(p.stock) + '</strong> <span class="muted">' + esc(p.unit) + '</span></td>' +
          '<td class="num">' + num(p.minStock) + '</td>' +
          '<td class="num">' + money(p.cost) + '</td>' +
          '<td class="num">' + money(p.stock * p.cost) + '</td>' +
          '<td class="nowrap">' + (p.expiryDate && p.stock > 0 ? '<span class="' + (ex && ex.key !== 'vigente' ? 'badge badge-' + ex.cls : '') + '">' + App.utils.dateOnly(p.expiryDate) + '</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td><span class="badge badge-' + st.cls + '">' + st.label + '</span></td>' +
          '<td class="actions">' +
            '<button class="icon-btn" data-act="entrada" title="Entrada" aria-label="Entrada">' + icon('in') + '</button>' +
            '<button class="icon-btn" data-act="salida" title="Salida" aria-label="Salida"' + (p.stock <= 0 ? ' disabled' : '') + '>' + icon('out') + '</button>' +
            '<button class="icon-btn" data-act="edit" title="Editar" aria-label="Editar">' + icon('edit') + '</button>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function onResultsClick(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'new-empty') App.productForm.open();
      if (actionBtn.dataset.action === 'clear-filters') {
        Object.assign(state, { search: '', categoryId: '', status: '' });
        App.refresh();
      }
      return;
    }
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const act = e.target.closest('[data-act]');
    const id = item.dataset.id;
    if (act) {
      if (act.dataset.act === 'edit') App.productForm.open(id);
      else App.movementForm.open({ type: act.dataset.act, productId: id });
      return;
    }
    App.productDetail.open(id);
  }

  // Abrir detalle con teclado (Enter) en las tarjetas.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('product-card')) {
      App.productDetail.open(e.target.dataset.id);
    }
  });

  function exportCsv(list) {
    const csv = toCSV(list, [
      { label: 'Código', value: (p) => p.sku },
      { label: 'Producto', value: (p) => p.name },
      { label: 'Marca', value: (p) => p.brand || '' },
      { label: 'Categoría', value: (p) => (data.catMap.get(p.categoryId) || {}).name || '' },
      { label: 'Unidad', value: (p) => p.unit },
      { label: 'Stock', value: (p) => p.stock },
      { label: 'Stock mínimo', value: (p) => p.minStock },
      { label: 'Stock máximo', value: (p) => p.maxStock || '' },
      { label: 'Costo unitario', value: (p) => p.cost },
      { label: 'Valor total', value: (p) => Math.round(p.stock * p.cost) },
      { label: 'Precio venta', value: (p) => p.price || '' },
      { label: 'Ubicación', value: (p) => p.location },
      { label: 'Proveedor', value: (p) => (data.supMap.get(p.supplierId) || {}).name || '' },
      { label: 'Vencimiento', value: (p) => p.expiryDate || '' },
      { label: 'Estado', value: (p) => stockStatus(p).label }
    ]);
    download('inventario-' + fileStamp() + '.csv', csv, 'text/csv');
    App.ui.toast('Inventario exportado (' + list.length + ' productos).');
  }
})(window.App);
