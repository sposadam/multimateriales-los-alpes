/**
 * dashboard.js — Panel con indicadores, alertas y actividad reciente.
 */
(function (App) {
  'use strict';

  const { esc, num, money, dateTime, stockStatus, toDateKey } = App.utils;
  const icon = App.icon;
  App.views = App.views || {};

  function kpi(opts) {
    const tag = opts.href ? 'a' : 'div';
    return '<' + tag + ' class="card kpi"' + (opts.href ? ' href="' + opts.href + '"' : '') + '>' +
      '<div class="kpi-icon ' + opts.tone + '">' + icon(opts.icon) + '</div>' +
      '<div><div class="kpi-label">' + esc(opts.label) + '</div>' +
      '<div class="kpi-value">' + opts.value + '</div>' +
      '<div class="kpi-sub">' + esc(opts.sub) + '</div></div>' +
      '</' + tag + '>';
  }

  App.views.panel = {
    title: 'Panel',
    subtitle: 'Resumen general de la bodega',

    async render(el) {
      const [products, movements, cats] = await Promise.all([
        App.store.getProducts(), App.store.getMovements(), App.store.getCategories()
      ]);
      const catMap = new Map(cats.map((c) => [c.id, c]));
      const prodMap = new Map(products.map((p) => [p.id, p]));

      const totalValue = products.reduce((a, p) => a + p.stock * p.cost, 0);
      const low = products.filter((p) => stockStatus(p).key === 'bajo');
      const out = products.filter((p) => stockStatus(p).key === 'agotado');
      const weekAgo = Date.now() - 7 * 864e5;
      const week = movements.filter((m) => new Date(m.date).getTime() >= weekAgo);
      const weekIn = week.filter((m) => m.type === 'entrada').length;
      const weekOut = week.filter((m) => m.type === 'salida').length;

      // Serie de 14 días
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push({ key: toDateKey(d), label: d.getDate(), full: d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }), in: 0, out: 0 });
      }
      const dayMap = new Map(days.map((d) => [d.key, d]));
      movements.forEach((m) => {
        const d = dayMap.get(toDateKey(m.date));
        if (!d) return;
        if (m.type === 'entrada') d.in++;
        else if (m.type === 'salida') d.out++;
      });
      const maxDay = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));

      // Valor por categoría
      const byCat = cats.map((c) => ({
        cat: c,
        value: products.filter((p) => p.categoryId === c.id).reduce((a, p) => a + p.stock * p.cost, 0),
        count: products.filter((p) => p.categoryId === c.id).length
      })).filter((x) => x.count).sort((a, b) => b.value - a.value);
      const maxCat = Math.max(1, ...byCat.map((x) => x.value));

      const alerts = out.concat(low.sort((a, b) => (a.stock / (a.minStock || 1)) - (b.stock / (b.minStock || 1))));
      const expiring = products
        .map((p) => ({ p, ex: App.utils.expiryStatus(p) }))
        .filter((x) => x.ex && x.ex.key !== 'vigente')
        .sort((a, b) => a.ex.days - b.ex.days);

      el.innerHTML =
        '<div class="kpi-grid">' +
          kpi({ icon: 'box', tone: 'neutral', label: 'Productos registrados', value: num(products.length), sub: byCat.length + ' categorías con productos', href: '#/inventario' }) +
          kpi({ icon: 'dollar', tone: 'success', label: 'Valor del inventario', value: money(totalValue), sub: 'A costo promedio ponderado' }) +
          kpi({ icon: 'alert', tone: 'warning', label: 'Stock bajo', value: num(low.length), sub: 'Productos por reponer', href: '#/inventario?estado=bajo' }) +
          kpi({ icon: 'ban', tone: 'danger', label: 'Agotados', value: num(out.length), sub: weekIn + ' entradas · ' + weekOut + ' salidas en 7 días', href: '#/inventario?estado=agotado' }) +
        '</div>' +

        '<div class="dash-grid">' +
          '<section class="card">' +
            '<div class="card-header"><div><h3>Movimientos de los últimos 14 días</h3><div class="sub">Número de registros por día</div></div>' +
              '<div class="chart-legend"><span><i style="background:var(--success-strong)"></i>Entradas</span><span><i style="background:#ef4444"></i>Salidas</span></div></div>' +
            '<div class="card-body"><div class="col-chart" role="img" aria-label="Gráfico de entradas y salidas por día">' +
              days.map((d) =>
                '<div class="day" title="' + esc(d.full) + ': ' + d.in + ' entradas, ' + d.out + ' salidas">' +
                  '<div class="bars"><div class="bar in" style="height:' + (d.in / maxDay * 100) + '%"></div><div class="bar out" style="height:' + (d.out / maxDay * 100) + '%"></div></div>' +
                  '<div class="lbl">' + d.label + '</div>' +
                '</div>').join('') +
            '</div></div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-header"><div><h3>Valor por categoría</h3><div class="sub">Distribución del valor en bodega</div></div></div>' +
            '<div class="card-body">' +
              (byCat.length
                ? '<div class="hbar-list">' + byCat.map((x) =>
                    '<div class="hbar-row" title="' + esc(x.cat.name) + ' · ' + x.count + ' productos">' +
                      '<span class="name">' + esc(x.cat.name) + '</span>' +
                      '<div class="hbar-track"><div class="hbar-fill" style="width:' + (x.value / maxCat * 100) + '%;background:' + esc(x.cat.color) + '"></div></div>' +
                      '<span class="val">' + money(x.value) + '</span>' +
                    '</div>').join('') + '</div>'
                : '<p class="empty-inline">Aún no hay productos.</p>') +
            '</div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-header"><div><h3>Alertas de stock</h3><div class="sub">Agotados y por debajo del mínimo</div></div>' +
              (alerts.length ? '<a class="btn btn-ghost btn-sm" href="#/inventario?estado=alertas">Ver todos</a>' : '') + '</div>' +
            (alerts.length
              ? '<ul class="mini-list">' + alerts.slice(0, 6).map((p) => {
                  const st = stockStatus(p);
                  return '<li>' +
                    '<img class="thumb" src="' + esc(App.images.forProduct(p, catMap.get(p.categoryId))) + '" alt="">' +
                    '<div class="info"><button class="link-btn title" data-detail="' + esc(p.id) + '" title="' + esc(p.name) + '">' + esc(p.name) + '</button>' +
                    '<div class="meta"><span class="badge badge-' + st.cls + '">' + st.label + '</span><span>' + num(p.stock) + ' ' + esc(p.unit) + ' · mín. ' + num(p.minStock) + '</span></div></div>' +
                    '<button class="btn btn-success-soft btn-sm" data-restock="' + esc(p.id) + '" title="Registrar entrada">' + icon('in') + '<span class="label">Reponer</span></button>' +
                  '</li>';
                }).join('') + '</ul>'
              : '<p class="empty-inline">' + icon('check') + ' Todo el inventario está sobre el mínimo.</p>') +
          '</section>' +

          (expiring.length
            ? '<section class="card span-2">' +
                '<div class="card-header"><div><h3>Vencimientos</h3><div class="sub">Productos vencidos o que vencen en los próximos 30 días</div></div>' +
                  '<a class="btn btn-ghost btn-sm" href="#/inventario?estado=vencimiento">Ver todos</a></div>' +
                '<ul class="mini-list mini-grid">' + expiring.slice(0, 6).map((x) =>
                  '<li>' +
                    '<img class="thumb" src="' + esc(App.images.forProduct(x.p, catMap.get(x.p.categoryId))) + '" alt="">' +
                    '<div class="info"><button class="link-btn title" data-detail="' + esc(x.p.id) + '" title="' + esc(x.p.name) + '">' + esc(x.p.name) + '</button>' +
                    '<div class="meta"><span class="badge badge-' + x.ex.cls + '">' + icon('clock') + x.ex.label + '</span><span>' + App.utils.dateOnly(x.p.expiryDate) + ' · ' + num(x.p.stock) + ' ' + esc(x.p.unit) + '</span></div></div>' +
                  '</li>').join('') + '</ul>' +
              '</section>'
            : '') +

          '<section class="card">' +
            '<div class="card-header"><div><h3>Últimos movimientos</h3><div class="sub">Actividad reciente en la bodega</div></div>' +
              '<a class="btn btn-ghost btn-sm" href="#/movimientos">Ver historial</a></div>' +
            (movements.length
              ? '<ul class="mini-list">' + movements.slice(0, 7).map((m) => {
                  const p = prodMap.get(m.productId);
                  const img = p ? App.images.forProduct(p, catMap.get(p.categoryId)) : App.images.placeholder('otros', '#94a3b8');
                  return '<li>' +
                    '<img class="thumb" src="' + esc(img) + '" alt="">' +
                    '<div class="info"><div class="title" title="' + esc(m.productName) + '">' + esc(m.productName) + '</div>' +
                    '<div class="meta">' + esc(m.reason || m.type) + (m.destination ? ' · ' + esc(m.destination) : '') + ' · ' + dateTime(m.date) + '</div></div>' +
                    '<span class="amount">' + App.productDetail.qtyHtml(m) + ' <small class="muted">' + esc(m.unit) + '</small></span>' +
                  '</li>';
                }).join('') + '</ul>'
              : '<p class="empty-inline">Todavía no hay movimientos registrados.</p>') +
          '</section>' +
        '</div>';

      el.querySelectorAll('[data-restock]').forEach((b) => b.addEventListener('click', () => App.movementForm.open({ type: 'entrada', productId: b.dataset.restock })));
      el.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => App.productDetail.open(b.dataset.detail)));
    }
  };
})(window.App);
