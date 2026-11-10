/**
 * movements.js — Historial de movimientos con filtros y exportación.
 */
(function (App) {
  'use strict';

  const { esc, num, money, dateTime, debounce, toCSV, download, fileStamp } = App.utils;
  const icon = App.icon;
  App.views = App.views || {};

  const PAGE = 50;
  const state = { search: '', type: '', from: '', to: '', shown: PAGE };
  let cache = { list: [], prodMap: new Map(), catMap: new Map(), supMap: new Map() };

  App.views.movimientos = {
    title: 'Movimientos',
    subtitle: 'Historial de entradas, salidas y ajustes',

    async render(el) {
      const [products, cats, sups] = await Promise.all([App.store.getProducts(), App.store.getCategories(), App.store.getSuppliers()]);
      cache.prodMap = new Map(products.map((p) => [p.id, p]));
      cache.catMap = new Map(cats.map((c) => [c.id, c]));
      cache.supMap = new Map(sups.map((s) => [s.id, s]));

      el.innerHTML =
        '<div class="toolbar">' +
          '<button class="btn btn-success" data-new="entrada">' + icon('in') + 'Entrada</button>' +
          '<button class="btn btn-danger" data-new="salida">' + icon('out') + 'Salida</button>' +
          '<button class="btn btn-info" data-new="ajuste">' + icon('adjust') + 'Ajuste de inventario</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary" data-action="export">' + icon('download') + 'Exportar CSV</button>' +
        '</div>' +
        '<div class="toolbar">' +
          '<div class="input-icon grow">' + icon('search') + '<input type="search" data-f="search" placeholder="Buscar N.º de documento, producto, responsable, obra…" aria-label="Buscar movimientos"></div>' +
          '<select data-f="type" aria-label="Tipo"><option value="">Todos los tipos</option><option value="entrada">Entradas</option><option value="salida">Salidas</option><option value="ajuste">Ajustes</option></select>' +
          '<label class="field" style="flex-direction:row;align-items:center;gap:8px"><span class="label">Desde</span><input type="date" data-f="from"></label>' +
          '<label class="field" style="flex-direction:row;align-items:center;gap:8px"><span class="label">Hasta</span><input type="date" data-f="to"></label>' +
          '<button class="btn btn-ghost" data-action="clear">Limpiar</button>' +
        '</div>' +
        '<div class="result-info" data-ref="info"></div>' +
        '<div data-ref="results"></div>';

      const q = (s) => el.querySelector(s);
      ['search', 'type', 'from', 'to'].forEach((k) => { q('[data-f=' + k + ']').value = state[k]; });

      const reload = () => { state.shown = PAGE; load(el); };
      q('[data-f=search]').addEventListener('input', debounce((e) => { state.search = e.target.value; reload(); }, 200));
      ['type', 'from', 'to'].forEach((k) => q('[data-f=' + k + ']').addEventListener('change', (e) => { state[k] = e.target.value; reload(); }));
      q('[data-action=clear]').addEventListener('click', () => {
        Object.assign(state, { search: '', type: '', from: '', to: '' });
        ['search', 'type', 'from', 'to'].forEach((k) => { q('[data-f=' + k + ']').value = ''; });
        reload();
      });
      el.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => App.movementForm.open({ type: b.dataset.new })));
      q('[data-action=export]').addEventListener('click', exportCsv);
      q('[data-ref=results]').addEventListener('click', (e) => {
        const more = e.target.closest('[data-action=more]');
        if (more) { state.shown += PAGE; renderList(el); return; }
        const doc = e.target.closest('[data-doc]');
        if (doc) { App.documents.open(doc.dataset.doc); return; }
        const p = e.target.closest('[data-product]');
        if (p) App.productDetail.open(p.dataset.product);
      });

      await load(el);
    }
  };

  async function load(el) {
    if (state.from && state.to && state.from > state.to) {
      App.ui.toast('La fecha "desde" es posterior a la fecha "hasta".', 'warning');
    }
    cache.list = await App.store.getMovements({ search: state.search, type: state.type, from: state.from, to: state.to });
    renderList(el);
  }

  function renderList(el) {
    const list = cache.list;
    const info = el.querySelector('[data-ref=info]');
    const box = el.querySelector('[data-ref=results]');
    const count = (t) => list.filter((m) => m.type === t).length;
    const valueIn = list.filter((m) => m.type === 'entrada').reduce((a, m) => a + m.quantity * (m.unitCost || 0), 0);
    const valueOut = list.filter((m) => m.type === 'salida').reduce((a, m) => a + m.quantity * (m.unitCost || 0), 0);

    info.innerHTML = '<span><strong>' + list.length + '</strong> movimientos</span>' +
      '<span><span class="qty-in">' + count('entrada') + '</span> entradas (' + money(valueIn) + ')</span>' +
      '<span><span class="qty-out">' + count('salida') + '</span> salidas (' + money(valueOut) + ')</span>' +
      '<span><span class="qty-adj">' + count('ajuste') + '</span> ajustes</span>';

    if (!list.length) {
      box.innerHTML = '<div class="card">' + App.ui.emptyState('swap', 'No hay movimientos', 'No se encontraron movimientos con los filtros actuales.') + '</div>';
      return;
    }

    const rows = list.slice(0, state.shown).map((m) => {
      const p = cache.prodMap.get(m.productId);
      const img = p ? App.images.forProduct(p, cache.catMap.get(p.categoryId)) : App.images.placeholder('otros', '#94a3b8');
      const sup = m.supplierId ? cache.supMap.get(m.supplierId) : null;
      const detail = [m.destination, sup && sup.name].filter(Boolean).join(' · ');
      return '<tr>' +
        '<td class="nowrap">' + dateTime(m.date) + '<div class="muted">' + esc(m.docNumber || '') + '</div></td>' +
        '<td>' + App.productDetail.TYPE_BADGE[m.type] + '</td>' +
        '<td><div class="prod-cell"><img class="thumb thumb-sm" src="' + esc(img) + '" alt="" loading="lazy"><div>' +
          (p ? '<button class="link-btn name" data-product="' + esc(p.id) + '">' + esc(m.productName) + '</button>' : '<div class="name">' + esc(m.productName) + ' <span class="badge badge-neutral">eliminado</span></div>') +
          '<div class="sku">' + esc(m.sku) + '</div></div></div></td>' +
        '<td class="num">' + App.productDetail.qtyHtml(m) + ' <span class="muted">' + esc(m.unit) + '</span></td>' +
        '<td class="num muted">' + num(m.previousStock) + ' → <strong style="color:var(--text)">' + num(m.newStock) + '</strong></td>' +
        '<td>' + esc(m.reason || '—') + (detail ? '<div class="muted">' + esc(detail) + '</div>' : '') + '</td>' +
        '<td class="nowrap">' + esc(m.reference || '—') + '</td>' +
        '<td class="nowrap">' + esc(m.responsible || '—') + '</td>' +
        '<td class="actions">' + (m.docId ? '<button class="icon-btn" data-doc="' + esc(m.docId) + '" title="Ver / imprimir ' + esc(m.docNumber || 'comprobante') + '" aria-label="Imprimir comprobante">' + icon('printer') + '</button>' : '') + '</td>' +
      '</tr>';
    }).join('');

    box.innerHTML = '<div class="card table-wrap"><table class="table"><thead><tr>' +
      '<th>Fecha / documento</th><th>Tipo</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Saldo</th><th>Motivo / detalle</th><th>Referencia</th><th>Responsable</th><th class="actions">Comprobante</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      (list.length > state.shown ? '<div class="load-more"><button class="btn btn-secondary" data-action="more">Ver más (' + (list.length - state.shown) + ' restantes)</button></div>' : '') +
      '</div>';
  }

  function exportCsv() {
    const list = cache.list;
    if (!list.length) { App.ui.toast('No hay movimientos para exportar.', 'warning'); return; }
    const csv = toCSV(list, [
      { label: 'Fecha', value: (m) => dateTime(m.date) },
      { label: 'Documento', value: (m) => m.docNumber || '' },
      { label: 'Tipo', value: (m) => m.type },
      { label: 'Código', value: (m) => m.sku },
      { label: 'Producto', value: (m) => m.productName },
      { label: 'Unidad', value: (m) => m.unit },
      { label: 'Cantidad', value: (m) => m.quantity },
      { label: 'Stock anterior', value: (m) => m.previousStock },
      { label: 'Stock nuevo', value: (m) => m.newStock },
      { label: 'Costo unitario', value: (m) => m.unitCost },
      { label: 'Motivo', value: (m) => m.reason },
      { label: 'Obra / destino', value: (m) => m.destination },
      { label: 'Recibió', value: (m) => m.receivedBy || '' },
      { label: 'Vehículo', value: (m) => m.vehicle || '' },
      { label: 'Vencimiento lote', value: (m) => m.expiryDate || '' },
      { label: 'Proveedor', value: (m) => (cache.supMap.get(m.supplierId) || {}).name || '' },
      { label: 'Referencia', value: (m) => m.reference },
      { label: 'Responsable', value: (m) => m.responsible },
      { label: 'Observaciones', value: (m) => m.notes }
    ]);
    download('movimientos-' + fileStamp() + '.csv', csv, 'text/csv');
    App.ui.toast('Movimientos exportados (' + list.length + ').');
  }
})(window.App);
