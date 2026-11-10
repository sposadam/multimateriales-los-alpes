/**
 * settings.js — Configuración: datos generales, categorías y respaldo de datos.
 */
(function (App) {
  'use strict';

  const { esc, download, fileStamp } = App.utils;
  const icon = App.icon;
  App.views = App.views || {};

  App.views.configuracion = {
    title: 'Configuración',
    subtitle: 'Datos de la bodega, categorías y respaldos',

    async render(el) {
      const [settings, cats, products, info] = await Promise.all([
        App.store.getSettings(), App.store.getCategories(), App.store.getProducts(), App.store.getInfo()
      ]);
      const count = (id) => products.filter((p) => p.categoryId === id).length;
      const mb = (b) => (b / 1048576).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' MB';

      el.innerHTML =
        '<div class="settings-grid">' +
          '<section class="card">' +
            '<div class="card-header"><div><h3>Datos de la empresa</h3><div class="sub">Aparecen en el menú y en el encabezado de remisiones y comprobantes</div></div></div>' +
            '<form class="card-body form" data-ref="general" novalidate>' +
              '<div class="form-grid">' +
                '<div class="field col-2"><label for="st-company">Nombre de la bodega / sede *</label><input id="st-company" name="companyName" required maxlength="80"></div>' +
                '<div class="field"><label for="st-nit">NIT</label><input id="st-nit" name="nit" maxlength="30" placeholder="900.000.000-0"></div>' +
                '<div class="field"><label for="st-phone">Teléfono</label><input id="st-phone" name="phone" maxlength="60"></div>' +
                '<div class="field col-2"><label for="st-address">Dirección</label><input id="st-address" name="address" maxlength="150"></div>' +
                '<div class="field col-2"><label for="st-email">Correo electrónico</label><input id="st-email" name="email" type="email" maxlength="120"></div>' +
              '</div>' +
              '<div><button class="btn btn-primary" type="submit">' + icon('check') + 'Guardar</button></div>' +
            '</form>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-header"><div><h3>Base de datos</h3><div class="sub">Información guardada en el servidor</div></div>' +
              '<span class="badge badge-success">' + icon('check') + 'Conectada</span></div>' +
            '<div class="card-body">' +
              '<div class="stat-grid">' +
                '<div class="stat"><div class="k">Motor</div><div class="v" title="' + esc(info.engine) + '">' + esc(info.engine) + '</div></div>' +
                '<div class="stat"><div class="k">Base de datos</div><div class="v">' + esc(info.database) + '</div></div>' +
                '<div class="stat"><div class="k">Tamaño</div><div class="v">' + mb(info.size) + '</div></div>' +
                '<div class="stat"><div class="k">Productos</div><div class="v">' + App.utils.num(info.products) + '</div></div>' +
                '<div class="stat"><div class="k">Movimientos</div><div class="v">' + App.utils.num(info.movements) + '</div></div>' +
              '</div>' +
              (info.adminerUrl
                ? '<p style="margin-top:14px"><a class="btn btn-secondary btn-sm" href="' + esc(info.adminerUrl) + '" target="_blank" rel="noopener">' + icon('database') + 'Ver tablas en Adminer</a></p>'
                : '') +
            '</div>' +
          '</section>' +

          '<section class="card span-2">' +
            '<div class="card-header"><div><h3>Categorías</h3><div class="sub">' + cats.length + ' categorías · color e ilustración por defecto de sus productos</div></div>' +
              '<button class="btn btn-primary btn-sm" data-action="new-cat">' + icon('plus') + 'Nueva categoría</button></div>' +
            (cats.length
              ? '<ul class="row-list">' + cats.map((c) =>
                  '<li>' +
                    '<img class="thumb" src="' + esc(App.images.placeholder(c.icon, c.color)) + '" alt="">' +
                    '<div class="grow"><strong>' + esc(c.name) + '</strong><div class="muted" style="font-size:12.5px">' + count(c.id) + ' producto(s)</div></div>' +
                    '<a class="btn btn-ghost btn-sm" href="#/inventario?categoria=' + encodeURIComponent(c.id) + '">Ver productos</a>' +
                    '<button class="icon-btn" data-edit-cat="' + esc(c.id) + '" title="Editar" aria-label="Editar">' + icon('edit') + '</button>' +
                    '<button class="icon-btn danger" data-del-cat="' + esc(c.id) + '" title="Eliminar" aria-label="Eliminar">' + icon('trash') + '</button>' +
                  '</li>').join('') + '</ul>'
              : '<p class="empty-inline">No hay categorías.</p>') +
          '</section>' +

          '<section class="card">' +
            '<div class="card-header"><div><h3>Respaldo de datos</h3><div class="sub">Exporta o restaura toda la información</div></div></div>' +
            '<div class="card-body">' +
              '<p class="hint" style="margin-bottom:12px">El respaldo es un archivo JSON con productos (incluidas fotos), movimientos, categorías y proveedores. También sirve para migrar a la base de datos.</p>' +
              '<div class="data-actions">' +
                '<button class="btn btn-secondary" data-action="export">' + icon('download') + 'Descargar respaldo</button>' +
                '<label class="btn btn-secondary">' + icon('upload') + 'Restaurar respaldo<input type="file" accept="application/json,.json" hidden data-ref="import"></label>' +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="card danger-zone">' +
            '<div class="card-header"><div><h3>Zona de cuidado</h3><div class="sub">Acciones que reemplazan los datos actuales</div></div></div>' +
            '<div class="card-body">' +
              '<p class="hint" style="margin-bottom:12px">Descarga un respaldo antes de usar estas opciones.</p>' +
              '<div class="data-actions">' +
                '<button class="btn btn-secondary" data-action="demo">' + icon('refresh') + 'Cargar datos de ejemplo</button>' +
                '<button class="btn btn-danger" data-action="clear">' + icon('trash') + 'Borrar todo el inventario</button>' +
              '</div>' +
            '</div>' +
          '</section>' +
        '</div>';

      const general = el.querySelector('[data-ref=general]');
      ['companyName', 'nit', 'phone', 'address', 'email'].forEach((k) => { general.elements[k].value = settings[k] || ''; });
      general.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!App.ui.validateRequired(general)) return;
        try {
          const data = {};
          ['companyName', 'nit', 'phone', 'address', 'email'].forEach((k) => { data[k] = general.elements[k].value; });
          await App.store.saveSettings(data);
          App.ui.toast('Datos de la empresa guardados.');
          App.refresh();
        } catch (err) { App.ui.toast(err.message, 'error'); }
      });

      el.querySelector('[data-action=new-cat]').addEventListener('click', () => openCategoryForm());
      el.querySelectorAll('[data-edit-cat]').forEach((b) => b.addEventListener('click', () => openCategoryForm(cats.find((c) => c.id === b.dataset.editCat))));
      el.querySelectorAll('[data-del-cat]').forEach((b) => b.addEventListener('click', async () => {
        const c = cats.find((x) => x.id === b.dataset.delCat);
        const ok = await App.ui.confirm({ title: 'Eliminar categoría', message: '¿Eliminar la categoría "' + c.name + '"?', confirmText: 'Eliminar', danger: true });
        if (!ok) return;
        try {
          await App.store.deleteCategory(c.id);
          App.ui.toast('Categoría eliminada.');
          App.refresh();
        } catch (err) { App.ui.toast(err.message, 'error'); }
      }));

      el.querySelector('[data-action=export]').addEventListener('click', async () => {
        const data = await App.store.exportData();
        download('respaldo-multimateriales-' + fileStamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
        App.ui.toast('Respaldo descargado.');
      });

      el.querySelector('[data-ref=import]').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        let data;
        try {
          data = JSON.parse(await file.text());
        } catch (err) {
          App.ui.toast('El archivo no es un JSON válido.', 'error');
          return;
        }
        const n = data && Array.isArray(data.products) ? data.products.length : 0;
        const ok = await App.ui.confirm({
          title: 'Restaurar respaldo',
          message: 'Se reemplazarán TODOS los datos actuales por los del archivo "' + file.name + '" (' + n + ' productos). ¿Continuar?',
          confirmText: 'Restaurar', danger: true
        });
        if (!ok) return;
        try {
          await App.store.importData(data);
          App.ui.toast('Respaldo restaurado correctamente.');
          App.refresh();
        } catch (err) { App.ui.toast(err.message, 'error'); }
      });

      el.querySelector('[data-action=demo]').addEventListener('click', async () => {
        const ok = await App.ui.confirm({ title: 'Cargar datos de ejemplo', message: 'Se reemplazarán los datos actuales por el inventario de ejemplo. ¿Continuar?', confirmText: 'Cargar ejemplo', danger: true });
        if (!ok) return;
        await App.store.resetDemo();
        App.ui.toast('Datos de ejemplo cargados.');
        App.refresh();
      });

      el.querySelector('[data-action=clear]').addEventListener('click', async () => {
        const ok = await App.ui.confirm({
          title: 'Borrar todo el inventario',
          message: 'Se eliminarán todos los productos, movimientos y proveedores (se conservan las categorías por defecto). Esta acción no se puede deshacer.',
          confirmText: 'Sí, borrar todo', danger: true
        });
        if (!ok) return;
        await App.store.clearAll();
        App.ui.toast('Inventario vaciado.');
        App.refresh();
      });
    }
  };

  function openCategoryForm(cat) {
    const icons = Object.keys(App.images.ICON_LABELS);
    const form = document.createElement('form');
    form.className = 'form';
    form.id = 'categoryForm';
    form.noValidate = true;
    form.innerHTML =
      '<div class="form-grid">' +
        '<div class="field"><label>Nombre *</label><input name="name" required maxlength="60"></div>' +
        '<div class="field"><label>Color</label><div class="input-group"><input type="color" name="color"><input name="colorHex" maxlength="7" aria-label="Código de color"></div></div>' +
      '</div>' +
      '<div class="field"><span class="label">Ilustración por defecto</span><div class="icon-picker" data-ref="icons"></div></div>';

    const f = form.elements;
    f.name.value = cat ? cat.name : '';
    f.color.value = cat ? cat.color : '#3b6ea5';
    f.colorHex.value = f.color.value;
    let selected = cat ? cat.icon : 'otros';

    function renderIcons() {
      form.querySelector('[data-ref=icons]').innerHTML = icons.map((k) =>
        '<label title="' + esc(App.images.ICON_LABELS[k]) + '"><input type="radio" name="icon" value="' + k + '"' + (k === selected ? ' checked' : '') + '>' +
        '<img src="' + esc(App.images.placeholder(k, f.color.value)) + '" alt="' + esc(App.images.ICON_LABELS[k]) + '"></label>').join('');
    }
    renderIcons();
    f.color.addEventListener('input', () => { f.colorHex.value = f.color.value; renderIcons(); });
    f.colorHex.addEventListener('input', () => {
      if (App.utils.isHexColor(f.colorHex.value)) { f.color.value = f.colorHex.value; renderIcons(); }
    });
    form.addEventListener('change', (e) => { if (e.target.name === 'icon') selected = e.target.value; });

    const modal = App.ui.openModal({
      title: cat ? 'Editar categoría' : 'Nueva categoría',
      content: form,
      dismissible: false,
      footer: '<button type="button" class="btn btn-secondary" data-close>Cancelar</button>' +
        '<button type="submit" class="btn btn-primary" form="categoryForm">' + icon('check') + 'Guardar</button>'
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!App.ui.validateRequired(form)) return;
      try {
        await App.store.saveCategory({ id: cat ? cat.id : undefined, name: f.name.value, color: f.color.value, icon: selected });
        App.ui.toast(cat ? 'Categoría actualizada.' : 'Categoría creada.');
        modal.close();
        App.refresh();
      } catch (err) { App.ui.toast(err.message, 'error'); }
    });
  }
})(window.App);
