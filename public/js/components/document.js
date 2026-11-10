/**
 * document.js — Remisión / comprobante imprimible de un movimiento.
 * Se imprime con el diálogo del navegador; ahí mismo se puede elegir
 * "Guardar como PDF".
 */
(function (App) {
  'use strict';

  const { esc, num, money, dateTime } = App.utils;
  const icon = App.icon;

  const DOC_TYPES = {
    entrada: {
      title: 'Comprobante de entrada',
      signatures: ['Entregado por (proveedor / transportador)', 'Recibido en bodega por', 'Revisado por']
    },
    salida: {
      title: 'Remisión de salida',
      signatures: ['Entregado por (bodega)', 'Transportado por', 'Recibido por']
    },
    ajuste: {
      title: 'Acta de ajuste de inventario',
      signatures: ['Realizó el conteo', 'Verificó', 'Aprobado por']
    }
  };

  function paperHtml(doc, showValues) {
    const t = DOC_TYPES[doc.type];
    const s = doc.settings || {};
    const isAdj = doc.type === 'ajuste';
    const total = doc.lines.reduce((a, m) => a + Math.abs(m.quantity) * (m.unitCost || 0), 0);
    const contact = [s.nit ? 'NIT ' + s.nit : '', s.address, s.phone ? 'Tel. ' + s.phone : '', s.email].filter(Boolean);

    const info = [
      ['Fecha', dateTime(doc.date)],
      ['Motivo', doc.reason || '—'],
      ['Doc. de referencia', doc.reference || '—'],
      ['Responsable', doc.responsible || '—']
    ];
    if (doc.type === 'salida') {
      info.push(['Obra / destino', doc.destination || '—'], ['Recibe', doc.receivedBy ? doc.receivedBy + (doc.receivedById ? ' · C.C. ' + doc.receivedById : '') : '—'], ['Vehículo / placa', doc.vehicle || '—']);
    }
    if (doc.type === 'entrada') {
      info.push(['Proveedor', doc.supplier ? doc.supplier.name + (doc.supplier.nit ? ' · NIT ' + doc.supplier.nit : '') : '—']);
    }

    const head = isAdj
      ? '<th>#</th><th>Código</th><th>Descripción</th><th>Marca</th><th>Unidad</th><th class="num">Stock sistema</th><th class="num">Conteo físico</th><th class="num">Diferencia</th>' + (showValues ? '<th class="num">Valor dif.</th>' : '')
      : '<th>#</th><th>Código</th><th>Descripción</th><th>Marca</th><th>Unidad</th><th class="num">Cantidad</th>' + (showValues ? '<th class="num">Costo unit.</th><th class="num">Total</th>' : '');

    const rows = doc.lines.map((m, i) => {
      const extra = m.expiryDate ? '<div class="doc-sub">Vence: ' + App.utils.dateOnly(m.expiryDate) + '</div>' : '';
      if (isAdj) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.sku) + '</td><td>' + esc(m.productName) + '</td><td>' + esc(m.brand || '—') + '</td><td>' + esc(m.unit) + '</td>' +
          '<td class="num">' + num(m.previousStock) + '</td><td class="num">' + num(m.newStock) + '</td><td class="num">' + (m.quantity > 0 ? '+' : '−') + num(Math.abs(m.quantity)) + '</td>' +
          (showValues ? '<td class="num">' + money(m.quantity * (m.unitCost || 0)) + '</td>' : '') + '</tr>';
      }
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.sku) + '</td><td>' + esc(m.productName) + extra + '</td><td>' + esc(m.brand || '—') + '</td><td>' + esc(m.unit) + '</td>' +
        '<td class="num"><strong>' + num(m.quantity) + '</strong></td>' +
        (showValues ? '<td class="num">' + money(m.unitCost) + '</td><td class="num">' + money(m.quantity * (m.unitCost || 0)) + '</td>' : '') + '</tr>';
    }).join('');

    return '<article class="doc-paper">' +
      '<header class="doc-head">' +
        '<div class="doc-company">' +
          '<img src="assets/favicon.svg" alt="" width="54" height="54">' +
          '<div><h2>MultiMateriales Los Alpes</h2>' +
          '<p>' + esc(s.companyName || '') + '</p>' +
          (contact.length ? '<p class="doc-muted">' + contact.map(esc).join(' · ') + '</p>' : '') + '</div>' +
        '</div>' +
        '<div class="doc-number"><span>' + esc(t.title) + '</span><strong>N.º ' + esc(doc.docNumber || '—') + '</strong></div>' +
      '</header>' +
      '<dl class="doc-info">' + info.map((x) => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl>' +
      '<table class="doc-table"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="doc-totals"><span>Total de ítems: <strong>' + doc.lines.length + '</strong></span>' +
        (showValues && !isAdj ? '<span>Valor total: <strong>' + money(total) + '</strong></span>' : '') + '</div>' +
      (doc.notes ? '<div class="doc-notes"><strong>Observaciones:</strong> ' + esc(doc.notes) + '</div>' : '') +
      '<div class="doc-signs">' + t.signatures.map((label) =>
        '<div class="doc-sign"><div class="line"></div><strong>' + esc(label) + '</strong><span>Nombre:</span><span>C.C.:</span><span>Fecha:</span></div>').join('') + '</div>' +
      '<footer class="doc-foot">Documento generado el ' + esc(dateTime(new Date().toISOString())) + ' · MultiMateriales Los Alpes · Inventario de bodega</footer>' +
    '</article>';
  }

  function printPaper(html, docNumber) {
    let root = document.getElementById('printRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'printRoot';
      document.body.appendChild(root);
    }
    root.innerHTML = html;
    const prevTitle = document.title;
    document.title = docNumber || 'Documento'; // nombre sugerido del PDF
    document.body.classList.add('printing');
    const cleanup = () => {
      document.body.classList.remove('printing');
      root.innerHTML = '';
      document.title = prevTitle;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 50);
  }

  async function open(docId) {
    const doc = await App.store.getDocument(docId);
    if (!doc) { App.ui.toast('No se encontró el documento.', 'error'); return; }
    let showValues = App.prefs.get('docShowValues', doc.type === 'entrada');

    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="doc-toolbar">' +
        '<label class="check"><input type="checkbox" data-ref="values"' + (showValues ? ' checked' : '') + '> Mostrar costos y valores</label>' +
        '<span class="hint">En el diálogo de impresión elige "Guardar como PDF" para obtener el archivo.</span>' +
      '</div>' +
      '<div class="doc-preview" data-ref="paper"></div>';
    const paper = wrap.querySelector('[data-ref=paper]');
    const render = () => { paper.innerHTML = paperHtml(doc, showValues); };
    render();
    wrap.querySelector('[data-ref=values]').addEventListener('change', (e) => {
      showValues = e.target.checked;
      App.prefs.set('docShowValues', showValues);
      render();
    });

    const modal = App.ui.openModal({
      title: DOC_TYPES[doc.type].title + ' ' + (doc.docNumber || ''),
      size: 'xl',
      content: wrap,
      footer:
        '<button type="button" class="btn btn-secondary" data-close>Cerrar</button>' +
        '<button type="button" class="btn btn-primary" data-ref="print">' + icon('printer') + 'Imprimir / Guardar PDF</button>'
    });
    modal.el.querySelector('[data-ref=print]').addEventListener('click', () => printPaper(paperHtml(doc, showValues), doc.docNumber));
  }

  App.documents = { open, DOC_TYPES };
})(window.App);
