/**
 * utils.js
 * Utilidades generales: formato, íconos, imágenes, CSV, preferencias.
 * Todo vive bajo el espacio de nombres global `App` para que la app funcione
 * abriendo index.html directamente (sin servidor) y también en GitHub Pages.
 */
window.App = window.App || {};

(function (App) {
  'use strict';

  /* ---------------------------------------------------------------------- */
  /* Íconos SVG (trazos estilo "line icons")                                 */
  /* ---------------------------------------------------------------------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    in: '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
    out: '<path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/>',
    adjust: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    dollar: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    tag: '<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>'
  };

  App.icon = function (name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------------------------------------------------------------------- */
  /* Formatos                                                                */
  /* ---------------------------------------------------------------------- */
  const LOCALE = 'es-CO';
  const currencyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const numberFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
  const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
  const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });

  const pad = (n) => String(n).padStart(2, '0');

  const utils = {
    uid(prefix) {
      return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },

    debounce(fn, ms) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms || 250);
      };
    },

    /** Minúsculas y sin tildes, para búsquedas tolerantes. */
    normalize(value) {
      return String(value == null ? '' : value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    },

    round(n, decimals) {
      const f = Math.pow(10, decimals == null ? 3 : decimals);
      return Math.round((Number(n) || 0) * f) / f;
    },

    money(n) { return currencyFmt.format(Number(n) || 0); },
    num(n) { return numberFmt.format(Number(n) || 0); },
    dateTime(iso) { return iso ? dateTimeFmt.format(new Date(iso)) : '—'; },
    date(iso) { return iso ? dateFmt.format(new Date(iso)) : '—'; },

    /** Date -> "YYYY-MM-DDTHH:mm" (para <input type="datetime-local">) en hora local. */
    toLocalInput(d) {
      const x = d ? new Date(d) : new Date();
      return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes());
    },

    /** Date -> "YYYY-MM-DD" en hora local. */
    toDateKey(d) {
      const x = new Date(d);
      return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
    },

    isHexColor(v) { return /^#[0-9a-f]{6}$/i.test(String(v || '')); },

    /** Estado del stock de un producto. */
    stockStatus(p) {
      const stock = Number(p.stock) || 0;
      const min = Number(p.minStock) || 0;
      const max = Number(p.maxStock) || 0;
      if (stock <= 0) return { key: 'agotado', label: 'Agotado', cls: 'danger' };
      if (stock <= min) return { key: 'bajo', label: 'Stock bajo', cls: 'warning' };
      if (max > 0 && stock > max) return { key: 'exceso', label: 'Sobre stock', cls: 'info' };
      return { key: 'ok', label: 'Disponible', cls: 'success' };
    },

    /**
     * Estado de vencimiento: null si no aplica (sin fecha o sin stock).
     * { key: 'vencido'|'por-vencer'|'vigente', label, cls, days }
     */
    expiryStatus(p, warnDays) {
      if (!p || !p.expiryDate || !(Number(p.stock) > 0)) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const exp = new Date(p.expiryDate + 'T00:00:00');
      const days = Math.round((exp - today) / 864e5);
      if (days < 0) return { key: 'vencido', label: 'Vencido', cls: 'danger', days };
      if (days <= (warnDays || 30)) return { key: 'por-vencer', label: days === 0 ? 'Vence hoy' : 'Vence en ' + days + ' d', cls: 'warning', days };
      return { key: 'vigente', label: 'Vigente', cls: 'success', days };
    },

    /** "2026-12-31" -> "31 dic 2026" */
    dateOnly(ymd) { return ymd ? dateFmt.format(new Date(ymd + 'T00:00:00')) : '—'; },

    /** Redimensiona una imagen subida y la devuelve como dataURL JPEG liviano. */
    resizeImage(file, maxSize, quality) {
      maxSize = maxSize || 600;
      quality = quality || 0.8;
      return new Promise((resolve, reject) => {
        if (!file || !/^image\//.test(file.type)) {
          reject(new Error('El archivo seleccionado no es una imagen.'));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
          img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    /** Genera CSV compatible con Excel en español (separador ";" y BOM UTF-8). */
    toCSV(rows, columns) {
      const sep = ';';
      const cell = (v) => {
        const s = String(v == null ? '' : v);
        return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const lines = [columns.map((c) => cell(c.label)).join(sep)];
      rows.forEach((r) => lines.push(columns.map((c) => cell(c.value(r))).join(sep)));
      return '﻿' + lines.join('\r\n');
    },

    download(filename, content, mime) {
      const blob = content instanceof Blob ? content : new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    },

    /** Fecha para nombres de archivo: 2026-11-08 */
    fileStamp() { return utils.toDateKey(new Date()); }
  };

  /* ---------------------------------------------------------------------- */
  /* Preferencias de interfaz (no son datos del inventario)                  */
  /* ---------------------------------------------------------------------- */
  App.prefs = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('mmalpes:pref:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('mmalpes:pref:' + key, JSON.stringify(value)); } catch (e) { /* sin espacio: se ignora */ }
    }
  };

  App.utils = utils;
})(window.App);
