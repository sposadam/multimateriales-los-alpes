/**
 * app.js — Arranque, enrutador (basado en #hash, compatible con GitHub Pages),
 * tema claro/oscuro y menú lateral.
 */
(function (App) {
  'use strict';

  const icon = App.icon;
  const DEFAULT_ROUTE = 'panel';
  const viewEl = document.getElementById('view');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  let currentRoute = null;
  let renderToken = 0;

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    return { name: path || DEFAULT_ROUTE, params: new URLSearchParams(qs || '') };
  }

  async function render(opts) {
    const refresh = !!(opts && opts.refresh);
    const { name, params } = parseHash();
    const view = App.views[name];
    if (!view) { location.replace('#/' + DEFAULT_ROUTE); return; }

    const token = ++renderToken;
    const scrollY = window.scrollY;

    document.querySelectorAll('.nav a').forEach((a) => {
      const active = a.dataset.route === name;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('pageTitle').textContent = view.title;
    document.getElementById('pageSubtitle').textContent = view.subtitle || '';
    document.title = view.title + ' · MultiMateriales Los Alpes';

    try {
      const settings = await App.store.getSettings();
      document.getElementById('companyName').textContent = settings.companyName || 'Mi bodega';
      if (token !== renderToken) return; // llegó otra navegación mientras tanto
      await view.render(viewEl, params, { refresh });
    } catch (e) {
      console.error(e);
      viewEl.innerHTML = '<div class="card">' + App.ui.emptyState('alert', 'Ocurrió un error', e.message || 'No se pudo cargar esta sección.') + '</div>';
    }

    if (refresh && name === currentRoute) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
    currentRoute = name;
    closeSidebar();
  }

  /** Vuelve a dibujar la vista actual (tras guardar cambios). */
  App.refresh = () => render({ refresh: true });

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    btn.innerHTML = theme === 'dark' ? icon('sun') + 'Modo claro' : icon('moon') + 'Modo oscuro';
  }

  /* ---------- Estado de la conexión con el servidor / base de datos ---------- */
  let serverOk = null;
  async function checkServer() {
    const el = document.getElementById('dbStatus');
    let ok = false;
    try { ok = (await App.store.health()).status === 'ok'; } catch (e) { ok = false; }
    el.classList.toggle('offline', !ok);
    el.textContent = ok ? 'Conectado a PostgreSQL' : 'Sin conexión con el servidor';
    if (serverOk === true && !ok) App.ui.toast('Se perdió la conexión con el servidor.', 'error');
    if (serverOk === false && ok) { App.ui.toast('Conexión restablecida.'); App.refresh(); }
    serverOk = ok;
  }

  /* ---------- Menú lateral (móvil) ---------- */
  function openSidebar() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }

  function init() {
    App.ui.hydrateIcons(document);
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      App.prefs.set('theme', next);
      applyTheme(next);
    });
    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    backdrop.addEventListener('click', closeSidebar);
    document.getElementById('quickIn').addEventListener('click', () => App.movementForm.open({ type: 'entrada' }));
    document.getElementById('quickOut').addEventListener('click', () => App.movementForm.open({ type: 'salida' }));

    window.addEventListener('hashchange', () => render());

    checkServer();
    setInterval(checkServer, 30000);

    if (!location.hash) location.replace('#/' + DEFAULT_ROUTE);
    render();
  }

  init();
})(window.App);
