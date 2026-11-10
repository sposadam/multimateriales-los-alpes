/**
 * product-form.js — Crear / editar productos (con foto).
 */
(function (App) {
  'use strict';

  const { esc, normalize, resizeImage } = App.utils;
  const icon = App.icon;

  const UNITS = ['Unidad', 'Bulto', 'Kg', 'Tonelada', 'm', 'm²', 'm³', 'Varilla', 'Lámina', 'Galón', 'Cuñete', 'Litro', 'Caja', 'Rollo', 'Paquete', 'Juego', 'Par'];

  async function open(productId) {
    const [cats, sups, products] = await Promise.all([
      App.store.getCategories(), App.store.getSuppliers(), App.store.getProducts()
    ]);
    const p = productId ? products.find((x) => x.id === productId) : null;
    if (productId && !p) { App.ui.toast('El producto ya no existe.', 'error'); return; }
    if (!cats.length) { App.ui.toast('Primero crea al menos una categoría en Configuración.', 'warning'); return; }
    const isEdit = !!p;
    let image = p ? p.image : null;

    const units = UNITS.slice();
    if (p && p.unit && !units.includes(p.unit)) units.unshift(p.unit);

    const form = document.createElement('form');
    form.className = 'form';
    form.id = 'productForm';
    form.noValidate = true;
    form.innerHTML =
      '<div class="product-form-grid">' +
        '<div class="image-field">' +
          '<span class="label">Foto del producto</span>' +
          '<div class="image-preview" data-ref="drop"><img alt="Vista previa del producto" data-ref="preview"></div>' +
          '<div class="image-actions">' +
            '<label class="btn btn-sm btn-secondary">' + icon('upload') + 'Subir foto<input type="file" accept="image/*" hidden data-ref="file"></label>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="remove-image">' + icon('trash') + 'Quitar</button>' +
          '</div>' +
          '<p class="hint">Arrastra una imagen o súbela. Se optimiza automáticamente. Si no hay foto se usa la ilustración de la categoría.</p>' +
        '</div>' +
        '<div class="form-grid">' +
          '<div class="field col-2"><label for="pf-name">Nombre del producto *</label><input id="pf-name" name="name" required maxlength="120" placeholder="Ej: Cemento gris 50 kg"></div>' +
          '<div class="field"><label for="pf-sku">Código / SKU *</label><div class="input-group"><input id="pf-sku" name="sku" required maxlength="30" placeholder="Ej: CEM-004"><button type="button" class="btn btn-secondary" data-action="gen-sku" title="Generar código automáticamente">Auto</button></div></div>' +
          '<div class="field"><label for="pf-brand">Marca</label><input id="pf-brand" name="brand" maxlength="60" placeholder="Ej: Andino" list="pf-brands"><datalist id="pf-brands">' +
            Array.from(new Set(products.map((x) => x.brand).filter(Boolean))).sort().map((b) => '<option value="' + esc(b) + '">').join('') + '</datalist></div>' +
          '<div class="field"><label for="pf-cat">Categoría *</label><select id="pf-cat" name="categoryId" required>' +
            cats.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label for="pf-unit">Unidad de medida *</label><select id="pf-unit" name="unit" required>' +
            units.map((u) => '<option>' + esc(u) + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label for="pf-sup">Proveedor</label><select id="pf-sup" name="supplierId"><option value="">— Sin proveedor —</option>' +
            sups.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label for="pf-loc">Ubicación en bodega</label><input id="pf-loc" name="location" maxlength="80" placeholder="Ej: Zona A · Estante 02"></div>' +
          (isEdit ? '' : '<div class="field"><label for="pf-stock">Stock inicial</label><input id="pf-stock" type="number" name="stock" min="0" step="any" value="0" inputmode="decimal"></div>') +
          '<div class="field"><label for="pf-exp">Fecha de vencimiento</label><input id="pf-exp" type="date" name="expiryDate"><span class="hint">Del lote actual. Útil en cemento, morteros, pegantes y pinturas.</span></div>' +
          '<div class="field"><label for="pf-min">Stock mínimo</label><input id="pf-min" type="number" name="minStock" min="0" step="any" inputmode="decimal" placeholder="0"><span class="hint">Alerta cuando el stock llegue a este valor.</span></div>' +
          '<div class="field"><label for="pf-max">Stock máximo</label><input id="pf-max" type="number" name="maxStock" min="0" step="any" inputmode="decimal" placeholder="Opcional"></div>' +
          '<div class="field"><label for="pf-cost">Costo unitario (COP)</label><input id="pf-cost" type="number" name="cost" min="0" step="any" inputmode="decimal" placeholder="0"></div>' +
          '<div class="field"><label for="pf-price">Precio de venta (COP)</label><input id="pf-price" type="number" name="price" min="0" step="any" inputmode="decimal" placeholder="Opcional"></div>' +
          '<div class="field col-2"><label for="pf-desc">Descripción / notas</label><textarea id="pf-desc" name="description" rows="2" maxlength="600" placeholder="Especificaciones, recomendaciones de almacenamiento…"></textarea></div>' +
        '</div>' +
      '</div>' +
      (isEdit ? '<p class="notice">' + icon('info') + '<span>El stock actual (<strong>' + App.utils.num(p.stock) + ' ' + esc(p.unit) + '</strong>) solo cambia con movimientos de entrada, salida o ajuste. Así queda la trazabilidad completa en el kardex.</span></p>' : '');

    const f = form.elements;
    if (p) {
      ['name', 'sku', 'brand', 'expiryDate', 'categoryId', 'unit', 'supplierId', 'location', 'description'].forEach((k) => { f[k].value = p[k] || ''; });
      f.minStock.value = p.minStock || 0;
      f.maxStock.value = p.maxStock || '';
      f.cost.value = p.cost || 0;
      f.price.value = p.price || '';
    }

    const ref = (name) => form.querySelector('[data-ref="' + name + '"]');
    const preview = ref('preview');
    const catById = (id) => cats.find((c) => c.id === id);

    function refreshPreview() {
      const cat = catById(f.categoryId.value) || {};
      preview.src = image || App.images.placeholder(cat.icon, cat.color, { name: f.name.value, brand: f.brand.value, unit: f.unit.value });
      form.querySelector('[data-action="remove-image"]').hidden = !image;
    }
    refreshPreview();

    async function handleFile(file) {
      try {
        image = await resizeImage(file, 640, 0.8);
        refreshPreview();
      } catch (e) {
        App.ui.toast(e.message, 'error');
      }
    }

    ref('file').addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; });
    const drop = ref('drop');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    form.querySelector('[data-action="remove-image"]').addEventListener('click', () => { image = null; refreshPreview(); });
    f.categoryId.addEventListener('change', refreshPreview);
    f.unit.addEventListener('change', refreshPreview);
    const previewLater = App.utils.debounce(() => { if (!image) refreshPreview(); }, 400);
    f.name.addEventListener('input', previewLater);
    f.brand.addEventListener('input', previewLater);

    // Generador de SKU: prefijo de 3 letras de la categoría + consecutivo.
    form.querySelector('[data-action="gen-sku"]').addEventListener('click', () => {
      const cat = catById(f.categoryId.value);
      const prefix = (normalize(cat ? cat.name : 'GEN').replace(/[^a-z]/g, '').slice(0, 3) || 'GEN').toUpperCase();
      let max = 0;
      products.forEach((x) => {
        const m = String(x.sku).toUpperCase().match(new RegExp('^' + prefix + '-(\\d+)$'));
        if (m) max = Math.max(max, Number(m[1]));
      });
      f.sku.value = prefix + '-' + String(max + 1).padStart(3, '0');
      f.sku.classList.remove('invalid');
    });

    form.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });

    const modal = App.ui.openModal({
      title: isEdit ? 'Editar producto' : 'Nuevo producto',
      size: 'lg',
      content: form,
      dismissible: false,
      footer:
        '<button type="button" class="btn btn-secondary" data-close>Cancelar</button>' +
        '<button type="submit" class="btn btn-primary" form="productForm">' + icon('check') + (isEdit ? 'Guardar cambios' : 'Crear producto') + '</button>'
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!App.ui.validateRequired(form)) { App.ui.toast('Completa los campos obligatorios.', 'warning'); return; }
      const submitBtn = modal.el.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      try {
        const saved = await App.store.saveProduct({
          id: p ? p.id : undefined,
          name: f.name.value,
          sku: f.sku.value,
          brand: f.brand.value,
          expiryDate: f.expiryDate.value || null,
          categoryId: f.categoryId.value,
          unit: f.unit.value,
          supplierId: f.supplierId.value,
          location: f.location.value,
          description: f.description.value,
          stock: f.stock ? f.stock.value : undefined,
          minStock: f.minStock.value,
          maxStock: f.maxStock.value,
          cost: f.cost.value,
          price: f.price.value,
          image,
          responsible: App.prefs.get('responsible', '')
        });
        App.ui.toast(isEdit ? 'Producto actualizado.' : 'Producto "' + saved.name + '" creado.');
        modal.close();
        App.refresh();
      } catch (err) {
        App.ui.toast(err.message, 'error');
        submitBtn.disabled = false;
      }
    });
  }

  App.productForm = { open, UNITS };
})(window.App);
