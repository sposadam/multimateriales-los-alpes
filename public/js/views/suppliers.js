/**
 * suppliers.js — Gestión de proveedores.
 */
(function (App) {
  'use strict';

  const { esc, normalize, debounce } = App.utils;
  const icon = App.icon;
  App.views = App.views || {};

  let search = '';

  App.views.proveedores = {
    title: 'Proveedores',
    subtitle: 'Empresas que abastecen la bodega',

    async render(el) {
      const [sups, products] = await Promise.all([App.store.getSuppliers(), App.store.getProducts()]);
      const count = (id) => products.filter((p) => p.supplierId === id).length;

      el.innerHTML =
        '<div class="toolbar">' +
          '<div class="input-icon grow">' + icon('search') + '<input type="search" data-f="search" placeholder="Buscar proveedor, NIT o contacto…" aria-label="Buscar proveedores"></div>' +
          '<button class="btn btn-primary" data-action="new">' + icon('plus') + 'Nuevo proveedor</button>' +
        '</div>' +
        '<div data-ref="results"></div>';

      const input = el.querySelector('[data-f=search]');
      input.value = search;

      function renderList() {
        const s = normalize(search);
        const list = sups.filter((x) => !s || normalize([x.name, x.nit, x.contact, x.email, x.phone].join(' ')).includes(s));
        const box = el.querySelector('[data-ref=results]');
        if (!sups.length) {
          box.innerHTML = '<div class="card">' + App.ui.emptyState('truck', 'Sin proveedores', 'Registra los proveedores para asociarlos a productos y entradas.') + '</div>';
          return;
        }
        if (!list.length) {
          box.innerHTML = '<div class="card">' + App.ui.emptyState('search', 'Sin resultados', 'Ningún proveedor coincide con la búsqueda.') + '</div>';
          return;
        }
        box.innerHTML = '<div class="card table-wrap"><table class="table"><thead><tr>' +
          '<th>Proveedor</th><th>NIT</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th class="num">Productos</th><th class="actions">Acciones</th>' +
          '</tr></thead><tbody>' +
          list.map((x) => '<tr>' +
            '<td><strong>' + esc(x.name) + '</strong>' + (x.address ? '<div class="muted">' + esc(x.address) + '</div>' : '') + '</td>' +
            '<td class="nowrap">' + esc(x.nit || '—') + '</td>' +
            '<td>' + esc(x.contact || '—') + '</td>' +
            '<td class="nowrap">' + (x.phone ? '<a href="tel:' + esc(x.phone.replace(/\s/g, '')) + '">' + esc(x.phone) + '</a>' : '—') + '</td>' +
            '<td>' + (x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : '—') + '</td>' +
            '<td class="num"><a href="#/inventario?buscar=' + encodeURIComponent(x.name) + '" title="Ver sus productos">' + count(x.id) + '</a></td>' +
            '<td class="actions">' +
              '<button class="icon-btn" data-edit="' + esc(x.id) + '" title="Editar" aria-label="Editar">' + icon('edit') + '</button>' +
              '<button class="icon-btn danger" data-del="' + esc(x.id) + '" title="Eliminar" aria-label="Eliminar">' + icon('trash') + '</button>' +
            '</td>' +
          '</tr>').join('') +
          '</tbody></table></div>';
      }

      input.addEventListener('input', debounce((e) => { search = e.target.value; renderList(); }, 150));
      el.querySelector('[data-action=new]').addEventListener('click', () => openForm());
      el.querySelector('[data-ref=results]').addEventListener('click', async (e) => {
        const ed = e.target.closest('[data-edit]');
        if (ed) { openForm(sups.find((x) => x.id === ed.dataset.edit)); return; }
        const del = e.target.closest('[data-del]');
        if (del) {
          const sup = sups.find((x) => x.id === del.dataset.del);
          const ok = await App.ui.confirm({ title: 'Eliminar proveedor', message: '¿Eliminar a "' + sup.name + '"?', confirmText: 'Eliminar', danger: true });
          if (!ok) return;
          try {
            await App.store.deleteSupplier(sup.id);
            App.ui.toast('Proveedor eliminado.');
            App.refresh();
          } catch (err) { App.ui.toast(err.message, 'error'); }
        }
      });
      renderList();
    }
  };

  function openForm(sup) {
    const form = document.createElement('form');
    form.className = 'form';
    form.id = 'supplierForm';
    form.noValidate = true;
    form.innerHTML =
      '<div class="form-grid">' +
        '<div class="field col-2"><label>Nombre / razón social *</label><input name="name" required maxlength="100"></div>' +
        '<div class="field"><label>NIT</label><input name="nit" maxlength="30" placeholder="900.000.000-0"></div>' +
        '<div class="field"><label>Persona de contacto</label><input name="contact" maxlength="80"></div>' +
        '<div class="field"><label>Teléfono</label><input name="phone" type="tel" maxlength="40"></div>' +
        '<div class="field"><label>Correo electrónico</label><input name="email" type="email" maxlength="120"></div>' +
        '<div class="field col-2"><label>Dirección</label><input name="address" maxlength="150"></div>' +
      '</div>';
    if (sup) ['name', 'nit', 'contact', 'phone', 'email', 'address'].forEach((k) => { form.elements[k].value = sup[k] || ''; });

    const modal = App.ui.openModal({
      title: sup ? 'Editar proveedor' : 'Nuevo proveedor',
      content: form,
      dismissible: false,
      footer: '<button type="button" class="btn btn-secondary" data-close>Cancelar</button>' +
        '<button type="submit" class="btn btn-primary" form="supplierForm">' + icon('check') + 'Guardar</button>'
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!App.ui.validateRequired(form)) return;
      try {
        const data = { id: sup ? sup.id : undefined };
        ['name', 'nit', 'contact', 'phone', 'email', 'address'].forEach((k) => { data[k] = form.elements[k].value; });
        await App.store.saveSupplier(data);
        App.ui.toast(sup ? 'Proveedor actualizado.' : 'Proveedor creado.');
        modal.close();
        App.refresh();
      } catch (err) { App.ui.toast(err.message, 'error'); }
    });
  }

  App.supplierForm = { open: openForm };
})(window.App);
