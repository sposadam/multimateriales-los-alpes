/**
 * ui.js — Componentes de interfaz reutilizables: toasts, modales, confirmaciones.
 */
(function (App) {
  'use strict';

  const { esc } = App.utils;
  const icon = App.icon;
  const stack = [];

  /* ---------------------------------------------------------------------- */
  /* Toasts                                                                  */
  /* ---------------------------------------------------------------------- */
  const TOAST_ICONS = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

  function toast(message, type, ms) {
    type = type || 'success';
    const root = document.getElementById('toastRoot');
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(TOAST_ICONS[type] || 'info') + '<span>' + esc(message) + '</span>' +
      '<button class="toast-close" type="button" aria-label="Cerrar">' + icon('x') + '</button>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, ms || (type === 'error' ? 6000 : 3500));
  }

  /* ---------------------------------------------------------------------- */
  /* Modales                                                                 */
  /* ---------------------------------------------------------------------- */
  /**
   * openModal({ title, content: string|Node, footer: string, size: 'sm'|'md'|'lg', onClose })
   * Devuelve { el, body, close }.
   */
  function openModal(opts) {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML =
      '<div class="modal modal-' + (opts.size || 'md') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<header class="modal-header"><h2>' + esc(opts.title) + '</h2>' +
      '<button class="icon-btn" type="button" data-close aria-label="Cerrar">' + icon('x') + '</button></header>' +
      '<div class="modal-body"></div>' +
      (opts.footer ? '<footer class="modal-footer">' + opts.footer + '</footer>' : '') +
      '</div>';
    const body = wrap.querySelector('.modal-body');
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);

    const previousFocus = document.activeElement;
    let closed = false;
    const api = {
      el: wrap.querySelector('.modal'),
      body,
      close() {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(api);
        if (i >= 0) stack.splice(i, 1);
        wrap.classList.remove('open');
        setTimeout(() => wrap.remove(), 180);
        if (!stack.length) document.body.classList.remove('modal-open');
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        if (opts.onClose) opts.onClose();
      }
    };

    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && opts.dismissible !== false) api.close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', api.close));

    root.appendChild(wrap);
    stack.push(api);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      wrap.classList.add('open');
      const first = api.el.querySelector('[autofocus], .modal-body input:not([type=hidden]):not([type=file]):not([type=radio]), .modal-body select, .modal-body textarea');
      (first || api.el.querySelector('[data-close]')).focus({ preventScroll: true });
    });
    return api;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) {
      e.preventDefault();
      stack[stack.length - 1].close();
    }
  });

  /** Diálogo de confirmación. Devuelve Promise<boolean>. */
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let answered = false;
      const modal = openModal({
        title: opts.title || '¿Estás seguro?',
        size: 'sm',
        content: '<p class="confirm-text">' + esc(opts.message || '') + '</p>',
        footer:
          '<button class="btn btn-secondary" type="button" data-close>' + esc(opts.cancelText || 'Cancelar') + '</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" type="button" data-ok>' + esc(opts.confirmText || 'Confirmar') + '</button>',
        onClose: () => { if (!answered) resolve(false); }
      });
      const ok = modal.el.querySelector('[data-ok]');
      ok.addEventListener('click', () => { answered = true; resolve(true); modal.close(); });
      setTimeout(() => ok.focus(), 30);
    });
  }

  /** Bloque de "estado vacío". */
  function emptyState(iconName, title, text, actionHtml) {
    return '<div class="empty-state">' + icon(iconName || 'box') +
      '<h3>' + esc(title) + '</h3>' + (text ? '<p>' + esc(text) + '</p>' : '') + (actionHtml || '') + '</div>';
  }

  /** Reemplaza <span data-icon="x"> por el SVG correspondiente. */
  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
      el.outerHTML = icon(el.getAttribute('data-icon'));
    });
  }

  /** Marca campos inválidos y devuelve true si todo está bien. */
  function validateRequired(form) {
    let ok = true;
    form.querySelectorAll('[required]').forEach((el) => {
      const empty = !String(el.value || '').trim();
      el.classList.toggle('invalid', empty);
      if (empty && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  App.ui = { toast, openModal, confirm: confirmDialog, emptyState, hydrateIcons, validateRequired };
})(window.App);
