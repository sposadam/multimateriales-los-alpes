/**
 * movement-form.js — Registrar entradas, salidas y ajustes (una o varias líneas).
 */
(function (App) {
  'use strict';

  const { esc, num, money, toLocalInput, uid, stockStatus } = App.utils;
  const icon = App.icon;

  const TYPES = {
    entrada: {
      label: 'Entrada', verb: 'Registrar entrada', icon: 'in', cls: 'success', btn: 'btn-success',
      help: 'Ingreso de material a la bodega. El stock aumenta y, si indicas el costo, se recalcula el costo promedio.',
      qty: 'Cantidad que ingresa',
      reasons: ['Compra a proveedor', 'Devolución de obra', 'Traslado desde otra bodega', 'Devolución de préstamo', 'Otro ingreso']
    },
    salida: {
      label: 'Salida', verb: 'Registrar salida', icon: 'out', cls: 'danger', btn: 'btn-danger',
      help: 'Material que sale de la bodega. No se permite sacar más de lo que hay en stock.',
      qty: 'Cantidad que sale',
      reasons: ['Despacho a obra', 'Venta', 'Uso interno / consumo', 'Préstamo de herramienta', 'Daño o pérdida', 'Devolución a proveedor', 'Traslado a otra bodega']
    },
    ajuste: {
      label: 'Ajuste', verb: 'Aplicar ajuste', icon: 'adjust', cls: 'info', btn: 'btn-info',
      help: 'Corrige el stock según el conteo físico. Escribe la cantidad REAL que hay en bodega; la diferencia queda registrada.',
      qty: 'Conteo físico',
      reasons: ['Conteo físico', 'Corrección de error de registro', 'Merma']
    }
  };

  async function open(opts) {
    opts = opts || {};
    const [products, cats, sups, recent] = await Promise.all([
      App.store.getProducts(), App.store.getCategories(), App.store.getSuppliers(), App.store.getMovements({ type: 'salida' })
    ]);
    if (!products.length) {
      App.ui.toast('Primero registra al menos un producto en el inventario.', 'warning');
      return;
    }

    const state = { type: TYPES[opts.type] ? opts.type : 'entrada' };
    const productMap = new Map(products.map((p) => [p.id, p]));
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const destinations = Array.from(new Set(recent.map((m) => m.destination).filter(Boolean))).slice(0, 30);

    // Opciones de producto agrupadas por categoría.
    const groups = cats.map((c) => {
      const items = products.filter((p) => p.categoryId === c.id);
      if (!items.length) return '';
      return '<optgroup label="' + esc(c.name) + '">' +
        items.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + ' · ' + esc(p.sku) + '</option>').join('') +
        '</optgroup>';
    }).join('');
    const orphan = products.filter((p) => !catMap.has(p.categoryId));
    const options = groups + (orphan.length ? '<optgroup label="Sin categoría">' + orphan.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + ' · ' + esc(p.sku) + '</option>').join('') + '</optgroup>' : '');

    const formId = uid('mvform');
    const form = document.createElement('form');
    form.className = 'form movement-form';
    form.id = formId;
    form.noValidate = true;
    form.innerHTML =
      '<div class="segmented" role="radiogroup" aria-label="Tipo de movimiento">' +
        Object.keys(TYPES).map((k) => '<label class="seg seg-' + TYPES[k].cls + '"><input type="radio" name="type" value="' + k + '"' + (k === state.type ? ' checked' : '') + '><span>' + icon(TYPES[k].icon) + TYPES[k].label + '</span></label>').join('') +
      '</div>' +
      '<p class="type-help" data-ref="help"></p>' +
      '<div class="form-grid">' +
        '<div class="field"><label>Fecha y hora</label><input type="datetime-local" name="date" required max="' + toLocalInput(new Date(Date.now() + 60e3)) + '"></div>' +
        '<div class="field"><label>Motivo</label><select name="reason"></select></div>' +
        '<div class="field" data-only="entrada"><label>Proveedor</label><select name="supplierId"><option value="">— Ninguno —</option>' +
          sups.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('') + '</select></div>' +
        '<div class="field" data-only="salida"><label>Obra / destino</label><input name="destination" maxlength="100" list="' + formId + '-dest" placeholder="Ej: Obra Torre Norte">' +
          '<datalist id="' + formId + '-dest">' + destinations.map((d) => '<option value="' + esc(d) + '">').join('') + '</datalist></div>' +
        '<div class="field" data-only="salida"><label>Recibe (nombre)</label><input name="receivedBy" maxlength="80" placeholder="Quien recibe el material"></div>' +
        '<div class="field" data-only="salida"><label>C.C. de quien recibe</label><input name="receivedById" maxlength="30" inputmode="numeric" placeholder="Opcional"></div>' +
        '<div class="field" data-only="salida"><label>Vehículo / placa</label><input name="vehicle" maxlength="30" placeholder="Ej: ABC-123" style="text-transform:uppercase"></div>' +
        '<div class="field"><label>Documento de referencia</label><input name="reference" maxlength="60" placeholder="Factura, remisión, orden…"></div>' +
        '<div class="field"><label>Responsable *</label><input name="responsible" required maxlength="80" placeholder="Nombre de quien registra"></div>' +
      '</div>' +
      '<div class="lines-card">' +
        '<div class="lines-head"><strong>Productos</strong><button type="button" class="btn btn-secondary btn-sm" data-action="add-line">' + icon('plus') + 'Agregar producto</button></div>' +
        '<div class="table-wrap lines-table"><table class="table table-compact"><thead><tr>' +
          '<th>Producto</th><th class="num">Stock actual</th><th class="num" data-ref="qtyHead">Cantidad</th>' +
          '<th class="num" data-only="entrada">Costo unit.</th><th data-only="entrada">Vence</th><th class="num">Stock final</th><th></th>' +
        '</tr></thead><tbody data-ref="lines"></tbody></table></div>' +
      '</div>' +
      '<div class="field"><label>Observaciones</label><textarea name="notes" rows="2" maxlength="400" placeholder="Opcional"></textarea></div>';

    const f = form.elements;
    const ref = (n) => form.querySelector('[data-ref="' + n + '"]');
    const tbody = ref('lines');
    f.date.value = toLocalInput(new Date());
    f.responsible.value = App.prefs.get('responsible', '');

    const modal = App.ui.openModal({
      title: 'Registrar movimiento',
      size: 'xl',
      content: form,
      dismissible: false,
      footer:
        '<div class="summary" data-ref="summary"></div>' +
        '<button type="button" class="btn btn-secondary" data-close>Cancelar</button>' +
        '<button type="submit" class="btn" form="' + formId + '" data-ref="submit"></button>'
    });
    const summaryEl = modal.el.querySelector('[data-ref="summary"]');
    const submitBtn = modal.el.querySelector('[data-ref="submit"]');

    /* ---------- Líneas ---------- */
    function addLine(productId) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><div class="line-product"><img class="thumb thumb-sm" alt=""><select name="product" aria-label="Producto"><option value="">Selecciona un producto…</option>' + options + '</select></div></td>' +
        '<td class="num" data-cell="stock">—</td>' +
        '<td class="num"><input type="number" name="qty" class="input-num" min="0" step="any" inputmode="decimal" placeholder="0" aria-label="Cantidad"></td>' +
        '<td class="num" data-only="entrada"><input type="number" name="cost" class="input-num" min="0" step="any" inputmode="decimal" placeholder="0" aria-label="Costo unitario"></td>' +
        '<td data-only="entrada"><input type="date" name="expiry" class="input-date" aria-label="Fecha de vencimiento del lote" title="Fecha de vencimiento del lote (opcional)"></td>' +
        '<td class="num line-result" data-cell="result">—</td>' +
        '<td class="actions"><button type="button" class="icon-btn danger" data-action="remove-line" title="Quitar línea" aria-label="Quitar línea">' + icon('x') + '</button></td>';
      tbody.appendChild(tr);
      const sel = tr.querySelector('[name=product]');
      if (productId && productMap.has(productId)) {
        sel.value = productId;
        onProductChange(tr);
      }
      applyTypeVisibility();
      updateLine(tr);
      updateSummary();
      return tr;
    }

    function onProductChange(tr) {
      const sel = tr.querySelector('[name=product]');
      const pid = sel.value;
      const duplicated = pid && Array.from(tbody.querySelectorAll('[name=product]')).some((s) => s !== sel && s.value === pid);
      if (duplicated) {
        App.ui.toast('Ese producto ya está en otra línea. Ajusta la cantidad allí.', 'warning');
        sel.value = '';
      }
      const p = productMap.get(sel.value);
      const img = tr.querySelector('img');
      img.src = p ? App.images.forProduct(p, catMap.get(p.categoryId)) : 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      tr.querySelector('[name=cost]').value = p ? p.cost : '';
      if (p && state.type === 'ajuste') tr.querySelector('[name=qty]').value = p.stock;
    }

    function updateLine(tr) {
      const p = productMap.get(tr.querySelector('[name=product]').value);
      const qtyInput = tr.querySelector('[name=qty]');
      const stockCell = tr.querySelector('[data-cell=stock]');
      const resCell = tr.querySelector('[data-cell=result]');
      qtyInput.classList.remove('invalid');
      resCell.classList.remove('bad');
      if (!p) { stockCell.textContent = '—'; resCell.textContent = '—'; return; }
      stockCell.innerHTML = num(p.stock) + ' <span class="line-unit">' + esc(p.unit) + '</span>';
      const raw = qtyInput.value;
      const q = Number(raw);
      if (raw === '' || !Number.isFinite(q)) { resCell.textContent = '—'; return; }
      let next;
      if (state.type === 'entrada') next = p.stock + q;
      else if (state.type === 'salida') next = p.stock - q;
      else next = q;
      let html = num(next) + ' <span class="line-unit">' + esc(p.unit) + '</span>';
      if (state.type === 'ajuste') {
        const diff = next - p.stock;
        html += ' <span class="' + (diff >= 0 ? 'qty-in' : 'qty-out') + '">(' + (diff >= 0 ? '+' : '−') + num(Math.abs(diff)) + ')</span>';
      }
      resCell.innerHTML = html;
      if (q < 0 || (state.type === 'salida' && next < 0)) {
        resCell.classList.add('bad');
        qtyInput.classList.add('invalid');
        if (next < 0) resCell.innerHTML = 'Insuficiente';
      }
    }

    function collectLines() {
      return Array.from(tbody.querySelectorAll('tr')).map((tr) => ({
        tr,
        productId: tr.querySelector('[name=product]').value,
        quantity: tr.querySelector('[name=qty]').value,
        unitCost: tr.querySelector('[name=cost]').value,
        expiryDate: tr.querySelector('[name=expiry]').value
      }));
    }

    function updateSummary() {
      const lines = collectLines().filter((l) => l.productId && l.quantity !== '');
      let value = 0;
      lines.forEach((l) => {
        const p = productMap.get(l.productId);
        const q = Number(l.quantity) || 0;
        if (state.type === 'entrada') value += q * (Number(l.unitCost) || p.cost);
        else if (state.type === 'salida') value += q * p.cost;
        else value += (q - p.stock) * p.cost;
      });
      summaryEl.innerHTML = '<strong>' + lines.length + '</strong> producto(s) · ' +
        (state.type === 'ajuste' ? 'Diferencia en valor: ' : 'Valor: ') + '<strong>' + money(value) + '</strong>';
    }

    function applyTypeVisibility() {
      form.querySelectorAll('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== state.type; });
    }

    function applyType() {
      const t = TYPES[state.type];
      ref('help').textContent = t.help;
      ref('qtyHead').textContent = t.qty;
      const prevReason = f.reason.value;
      f.reason.innerHTML = t.reasons.map((r) => '<option>' + esc(r) + '</option>').join('');
      if (t.reasons.includes(prevReason)) f.reason.value = prevReason;
      submitBtn.className = 'btn ' + t.btn;
      submitBtn.innerHTML = icon('check') + t.verb;
      applyTypeVisibility();
      if (state.type === 'ajuste') {
        // En ajustes se precarga el stock actual para editar sobre el conteo.
        tbody.querySelectorAll('tr').forEach((tr) => {
          const p = productMap.get(tr.querySelector('[name=product]').value);
          const q = tr.querySelector('[name=qty]');
          if (p && q.value === '') q.value = p.stock;
        });
      }
      tbody.querySelectorAll('tr').forEach(updateLine);
      updateSummary();
    }

    /* ---------- Eventos ---------- */
    form.addEventListener('change', (e) => {
      if (e.target.name === 'type') { state.type = e.target.value; applyType(); return; }
      if (e.target.name === 'product') {
        const tr = e.target.closest('tr');
        onProductChange(tr);
        updateLine(tr);
        updateSummary();
      }
    });
    form.addEventListener('input', (e) => {
      if (e.target.name === 'qty' || e.target.name === 'cost') {
        updateLine(e.target.closest('tr'));
        updateSummary();
      }
      if (e.target.name === 'responsible') e.target.classList.remove('invalid');
    });
    form.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'add-line') {
        const tr = addLine();
        tr.querySelector('select').focus();
      }
      if (btn.dataset.action === 'remove-line') {
        btn.closest('tr').remove();
        if (!tbody.children.length) addLine();
        updateSummary();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!App.ui.validateRequired(form)) { App.ui.toast('Indica el responsable del movimiento.', 'warning'); return; }

      const rows = collectLines();
      const valid = [];
      for (const l of rows) {
        if (!l.productId && l.quantity === '') continue; // línea vacía: se ignora
        const p = productMap.get(l.productId);
        const qInput = l.tr.querySelector('[name=qty]');
        if (!p) { l.tr.querySelector('select').classList.add('invalid'); App.ui.toast('Selecciona el producto en todas las líneas.', 'warning'); return; }
        const q = Number(l.quantity);
        if (l.quantity === '' || !Number.isFinite(q) || q < 0 || (state.type !== 'ajuste' && q === 0)) {
          qInput.classList.add('invalid'); qInput.focus();
          App.ui.toast('Cantidad no válida para "' + p.name + '".', 'warning');
          return;
        }
        if (state.type === 'salida' && q > p.stock) {
          qInput.classList.add('invalid'); qInput.focus();
          App.ui.toast('Stock insuficiente de "' + p.name + '" (disponible: ' + num(p.stock) + ' ' + p.unit + ').', 'error');
          return;
        }
        if (state.type === 'ajuste' && q === p.stock) continue; // sin diferencia: nada que ajustar
        valid.push({ productId: l.productId, quantity: q, unitCost: l.unitCost, expiryDate: state.type === 'entrada' ? l.expiryDate || null : null });
      }
      if (!valid.length) {
        App.ui.toast(state.type === 'ajuste' ? 'Ningún conteo difiere del stock actual.' : 'Agrega al menos un producto con su cantidad.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      try {
        const created = await App.store.registerMovement({
          type: state.type,
          date: f.date.value ? new Date(f.date.value).toISOString() : null,
          reason: f.reason.value,
          reference: f.reference.value,
          responsible: f.responsible.value,
          destination: f.destination.value,
          receivedBy: f.receivedBy.value,
          receivedById: f.receivedById.value,
          vehicle: f.vehicle.value.toUpperCase(),
          supplierId: f.supplierId.value,
          notes: f.notes.value,
          lines: valid
        });
        App.prefs.set('responsible', f.responsible.value.trim());
        const t = TYPES[state.type];
        App.ui.toast(t.label + ' ' + created[0].docNumber + ' registrada: ' + created.length + ' producto(s) actualizado(s).');

        // Alertas de stock bajo tras una salida o ajuste.
        if (state.type !== 'entrada') {
          const fresh = await App.store.getProducts();
          const low = fresh.filter((p) => created.some((m) => m.productId === p.id) && stockStatus(p).key !== 'ok' && stockStatus(p).key !== 'exceso');
          if (low.length) {
            App.ui.toast('Atención: ' + low.map((p) => p.name).join(', ') + ' quedó con stock bajo o agotado.', 'warning', 7000);
          }
        }
        modal.close();
        App.refresh();
        // Se muestra el comprobante / remisión listo para imprimir o guardar en PDF.
        App.documents.open(created[0].docId);
      } catch (err) {
        App.ui.toast(err.message, 'error');
        submitBtn.disabled = false;
      }
    });

    applyType();
    addLine(opts.productId);
    if (opts.productId) {
      const q = tbody.querySelector('[name=qty]');
      setTimeout(() => { q.focus(); q.select(); }, 60);
    }
  }

  App.movementForm = { open, TYPES };
})(window.App);
