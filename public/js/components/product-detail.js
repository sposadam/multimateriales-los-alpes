/**
 * product-detail.js — Ficha del producto con su kardex (historial de movimientos).
 */
(function (App) {
  'use strict';

  const { esc, num, money, dateTime, stockStatus } = App.utils;
  const icon = App.icon;

  const TYPE_BADGE = {
    entrada: '<span class="badge badge-success">' + icon('in') + 'Entrada</span>',
    salida: '<span class="badge badge-danger">' + icon('out') + 'Salida</span>',
    ajuste: '<span class="badge badge-info">' + icon('adjust') + 'Ajuste</span>'
  };

  function qtyHtml(m) {
    if (m.type === 'entrada') return '<span class="qty-in">+' + num(m.quantity) + '</span>';
    if (m.type === 'salida') return '<span class="qty-out">−' + num(m.quantity) + '</span>';
    return '<span class="qty-adj">' + (m.quantity > 0 ? '+' : '−') + num(Math.abs(m.quantity)) + '</span>';
  }

  async function open(id) {
    const [p, cats, sups, movs] = await Promise.all([
      App.store.getProduct(id), App.store.getCategories(), App.store.getSuppliers(), App.store.getMovements({ productId: id })
    ]);
    if (!p) { App.ui.toast('El producto ya no existe.', 'error'); return; }
    const cat = cats.find((c) => c.id === p.categoryId);
    const sup = sups.find((s) => s.id === p.supplierId);
    const st = stockStatus(p);
    const ex = App.utils.expiryStatus(p);
    const totalIn = movs.filter((m) => m.type === 'entrada').reduce((a, m) => a + m.quantity, 0);
    const totalOut = movs.filter((m) => m.type === 'salida').reduce((a, m) => a + m.quantity, 0);
    const LIMIT = 100;

    const content =
      '<div class="detail-head">' +
        '<div class="detail-image"><img src="' + esc(App.images.forProduct(p, cat)) + '" alt="' + esc(p.name) + '"></div>' +
        '<div>' +
          '<div class="detail-title">' +
            '<div class="detail-tags">' +
              '<span class="badge badge-neutral">' + icon('tag') + esc(p.sku) + '</span>' +
              '<span class="badge badge-' + st.cls + '">' + st.label + '</span>' +
              (ex && ex.key !== 'vigente' ? '<span class="badge badge-' + ex.cls + '">' + icon('clock') + ex.label + '</span>' : '') +
              (p.brand ? '<span class="badge badge-neutral">Marca: ' + esc(p.brand) + '</span>' : '') +
              (cat ? '<span class="cat-chip" style="--cat:' + esc(cat.color) + '">' + esc(cat.name) + '</span>' : '') +
            '</div>' +
            '<h3>' + esc(p.name) + '</h3>' +
          '</div>' +
          '<div class="stat-grid">' +
            '<div class="stat big"><div class="k">Stock actual</div><div class="v">' + num(p.stock) + ' <small>' + esc(p.unit) + '</small></div></div>' +
            '<div class="stat"><div class="k">Stock mínimo</div><div class="v">' + num(p.minStock) + '</div></div>' +
            '<div class="stat"><div class="k">Stock máximo</div><div class="v">' + (p.maxStock ? num(p.maxStock) : '—') + '</div></div>' +
            '<div class="stat"><div class="k">Costo promedio</div><div class="v">' + money(p.cost) + '</div></div>' +
            '<div class="stat"><div class="k">Valor en bodega</div><div class="v">' + money(p.stock * p.cost) + '</div></div>' +
            '<div class="stat"><div class="k">Precio de venta</div><div class="v">' + (p.price ? money(p.price) : '—') + '</div></div>' +
            '<div class="stat"><div class="k">Marca</div><div class="v" title="' + esc(p.brand) + '">' + esc(p.brand || '—') + '</div></div>' +
            '<div class="stat"><div class="k">Vencimiento</div><div class="v' + (ex && ex.key !== 'vigente' ? (ex.key === 'vencido' ? ' qty-out' : ' text-warning') : '') + '">' + (p.expiryDate ? App.utils.dateOnly(p.expiryDate) : '—') + '</div></div>' +
            '<div class="stat"><div class="k">Ubicación</div><div class="v" title="' + esc(p.location) + '">' + esc(p.location || '—') + '</div></div>' +
            '<div class="stat"><div class="k">Proveedor</div><div class="v" title="' + esc(sup ? sup.name : '') + '">' + esc(sup ? sup.name : '—') + '</div></div>' +
            '<div class="stat"><div class="k">Entradas / salidas</div><div class="v"><span class="qty-in">+' + num(totalIn) + '</span> / <span class="qty-out">−' + num(totalOut) + '</span></div></div>' +
          '</div>' +
          (p.description ? '<p class="detail-desc">' + esc(p.description) + '</p>' : '') +
          '<div class="detail-actions">' +
            '<button class="btn btn-success btn-sm" data-act="entrada">' + icon('in') + 'Entrada</button>' +
            '<button class="btn btn-danger btn-sm" data-act="salida"' + (p.stock <= 0 ? ' disabled title="Sin stock disponible"' : '') + '>' + icon('out') + 'Salida</button>' +
            '<button class="btn btn-info btn-sm" data-act="ajuste">' + icon('adjust') + 'Ajuste</button>' +
            '<button class="btn btn-secondary btn-sm" data-act="edit">' + icon('edit') + 'Editar</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="delete">' + icon('trash') + 'Eliminar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>' + icon('clock') + 'Kardex · historial de movimientos <span class="muted" style="font-weight:400">(' + movs.length + ')</span></h4>' +
        '<div class="card">' +
          (movs.length
            ? '<div class="table-wrap"><table class="table table-compact"><thead><tr>' +
                '<th>Fecha</th><th>Documento</th><th>Tipo</th><th class="num">Cantidad</th><th class="num">Saldo</th><th>Motivo / destino</th><th>Referencia</th><th>Responsable</th><th></th>' +
              '</tr></thead><tbody>' +
              movs.slice(0, LIMIT).map((m) =>
                '<tr>' +
                  '<td class="nowrap">' + dateTime(m.date) + '</td>' +
                  '<td class="nowrap">' + esc(m.docNumber || '—') + '</td>' +
                  '<td>' + TYPE_BADGE[m.type] + '</td>' +
                  '<td class="num">' + qtyHtml(m) + '</td>' +
                  '<td class="num">' + num(m.newStock) + '</td>' +
                  '<td>' + esc(m.reason || '—') + (m.destination ? '<div class="muted">' + esc(m.destination) + '</div>' : '') + '</td>' +
                  '<td class="nowrap">' + esc(m.reference || '—') + '</td>' +
                  '<td class="nowrap">' + esc(m.responsible || '—') + '</td>' +
                  '<td class="actions">' + (m.docId ? '<button class="icon-btn" data-doc="' + esc(m.docId) + '" title="Ver / imprimir comprobante" aria-label="Imprimir comprobante">' + icon('printer') + '</button>' : '') + '</td>' +
                '</tr>').join('') +
              '</tbody></table></div>' +
              (movs.length > LIMIT ? '<p class="empty-inline">Mostrando los ' + LIMIT + ' movimientos más recientes. Consulta el resto en la sección Movimientos.</p>' : '')
            : '<p class="empty-inline">Este producto aún no tiene movimientos.</p>') +
        '</div>' +
      '</div>';

    const modal = App.ui.openModal({ title: 'Detalle del producto', size: 'xl', content });
    modal.el.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => App.documents.open(b.dataset.doc)));

    modal.el.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.act;
        if (act === 'edit') { modal.close(); App.productForm.open(p.id); return; }
        if (act === 'delete') {
          const ok = await App.ui.confirm({
            title: 'Eliminar producto',
            message: '¿Eliminar "' + p.name + '"? Su historial de movimientos se conserva, pero el producto dejará de aparecer en el inventario. Esta acción no se puede deshacer.',
            confirmText: 'Eliminar', danger: true
          });
          if (!ok) return;
          try {
            await App.store.deleteProduct(p.id);
            App.ui.toast('Producto eliminado.');
            modal.close();
            App.refresh();
          } catch (e) { App.ui.toast(e.message, 'error'); }
          return;
        }
        modal.close();
        App.movementForm.open({ type: act, productId: p.id });
      });
    });
  }

  App.productDetail = { open, TYPE_BADGE, qtyHtml };
})(window.App);
