/**
 * images.js
 * Imágenes de producto generadas como "fotos de estudio" en SVG: fondo neutro,
 * iluminación, sombras y texturas (papel, óxido, veta de madera, arena…).
 * Se usan cuando el producto no tiene foto propia. El tipo de imagen se elige
 * por el nombre del producto (ej. "tubo", "grava", "carretilla") y, si no
 * coincide nada, por la categoría. La marca del producto se imprime en la
 * etiqueta del empaque cuando aplica.
 */
(function (App) {
  'use strict';

  const ICON_LABELS = {
    cemento: 'Bulto (cemento, mortero)',
    acero: 'Varillas de acero',
    agregados: 'Arena / agregados',
    ladrillos: 'Ladrillos',
    madera: 'Tablas de madera',
    plomeria: 'Tubería PVC',
    electrico: 'Rollo de cable',
    pinturas: 'Galón de pintura',
    herramientas: 'Herramienta (pala)',
    ferreteria: 'Tornillería',
    otros: 'Caja de cartón'
  };

  const DEFAULT_BY_ICON = {
    cemento: 'bulto', acero: 'varillas', agregados: 'arena', ladrillos: 'ladrillos', madera: 'madera',
    plomeria: 'tubos', electrico: 'cable', pinturas: 'balde', herramientas: 'pala', ferreteria: 'tornillos', otros: 'caja'
  };

  /* ---------------------------------------------------------------------- */
  /* Utilidades                                                              */
  /* ---------------------------------------------------------------------- */
  function shade(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * 255)));
    const r = f(n >> 16), g = f((n >> 8) & 0xff), b = f(n & 0xff);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const xml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const r1 = (n) => Math.round(n * 10) / 10;
  const pts = (arr) => arr.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
  const FONT = 'font-family="Arial, Helvetica, sans-serif"';
  /** Ajusta el texto al ancho disponible (comprime si es necesario). */
  function fit(text, size, maxW, factor) {
    const w = String(text).length * size * (factor || 0.66);
    return w > maxW ? ' textLength="' + maxW + '" lengthAdjust="spacingAndGlyphs"' : '';
  }

  /** Proyección oblicua 3D -> 2D (luz desde arriba a la izquierda). */
  function projector(ox, oy, kx, ky) {
    return (x, y, z) => [ox + x + z * kx, oy - y - z * ky];
  }
  function boxFaces(P, x, y, z, L, H, W) {
    return {
      front: [P(x, y, z), P(x + L, y, z), P(x + L, y + H, z), P(x, y + H, z)],
      top: [P(x, y + H, z), P(x + L, y + H, z), P(x + L, y + H, z + W), P(x, y + H, z + W)],
      side: [P(x + L, y, z), P(x + L, y, z + W), P(x + L, y + H, z + W), P(x + L, y + H, z)]
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Escena de estudio                                                       */
  /* ---------------------------------------------------------------------- */
  const COMMON_DEFS =
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfbfb"/><stop offset=".58" stop-color="#eef0f2"/><stop offset="1" stop-color="#d8dbdf"/></linearGradient>' +
    '<radialGradient id="spot" cx=".45" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="vig" cx=".5" cy=".45" r=".78"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".13"/></radialGradient>' +
    '<filter id="blurS" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="9"/></filter>' +
    '<filter id="blurT" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>' +
    '<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>' +
    // Grano oscuro sobre la superficie (papel, arcilla, concreto…)
    '<filter id="grit" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 .64" result="d"/>' +
    '<feComposite in="d" in2="SourceGraphic" operator="in" result="m"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge></filter>' +
    // Grano claro
    '<filter id="gritL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="3" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.4 0 0 0 -.62" result="d"/>' +
    '<feComposite in="d" in2="SourceGraphic" operator="in" result="m"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge></filter>' +
    // Óxido / manchas
    '<filter id="rust" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .4" numOctaves="3" seed="4" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .26  0 0 0 0 .12  -2.4 0 0 0 1.3"/><feComposite in2="SourceAlpha" operator="in"/></filter>' +
    // Veta de madera
    '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".005 .16" numOctaves="2" seed="11" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .08  1.6 0 0 0 -.12" result="d"/>' +
    '<feComposite in="d" in2="SourceGraphic" operator="in" result="m"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge></filter>';

  function scene(body, defs, shadow) {
    let sh = '';
    if (shadow) {
      const [cx, cy, rx, ry] = shadow;
      sh = '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#000" opacity=".3" filter="url(#blurS)"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy - 2) + '" rx="' + (rx * 0.82) + '" ry="' + (ry * 0.45) + '" fill="#000" opacity=".35" filter="url(#blurT)"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs>' + COMMON_DEFS + (defs || '') + '</defs>' +
      '<rect width="400" height="300" fill="url(#bg)"/><rect width="400" height="300" fill="url(#spot)"/>' +
      sh + body + '<rect width="400" height="300" fill="url(#vig)"/></svg>';
  }

  /** Gradiente metálico (dirección vertical u horizontal). */
  function steelGrad(id, vertical, dark) {
    const s = dark
      ? ['#1d1f22', '#4a4e53', '#9aa0a6', '#3c4045', '#151618']
      : ['#3a3f45', '#8a9198', '#e4e7ea', '#868d94', '#2c3035'];
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' +
      '<stop offset="0" stop-color="' + s[0] + '"/><stop offset=".28" stop-color="' + s[1] + '"/><stop offset=".47" stop-color="' + s[2] + '"/>' +
      '<stop offset=".66" stop-color="' + s[3] + '"/><stop offset="1" stop-color="' + s[4] + '"/></linearGradient>';
  }
  function paintGrad(id, c, vertical) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' +
      '<stop offset="0" stop-color="' + shade(c, -22) + '"/><stop offset=".22" stop-color="' + shade(c, 6) + '"/><stop offset=".38" stop-color="' + shade(c, 18) + '"/>' +
      '<stop offset=".7" stop-color="' + shade(c, -4) + '"/><stop offset="1" stop-color="' + shade(c, -28) + '"/></linearGradient>';
  }

  /* ---------------------------------------------------------------------- */
  /* Renderizadores                                                          */
  /* ---------------------------------------------------------------------- */
  const R = {};

  // Bulto de papel (cemento, mortero, pegante)
  R.bulto = (o) => {
    const c = o.color;
    const brand = (o.brand || 'CEMENTO').toUpperCase().slice(0, 14);
    const fs = brand.length > 10 ? 15 : brand.length > 7 ? 19 : 23;
    const front = 'M124 84 Q120 66 142 68 Q196 60 252 62 Q268 62 266 80 L274 226 Q276 244 256 246 Q194 252 136 248 Q116 247 116 230 Z';
    const side = 'M266 72 Q288 74 300 86 L308 220 Q308 236 294 238 L274 242 L268 80 Z';
    const defs =
      '<linearGradient id="bf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6d2ca"/><stop offset=".5" stop-color="#cdc8bf"/><stop offset="1" stop-color="#b2ada4"/></linearGradient>' +
      '<linearGradient id="bs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#99948b"/><stop offset="1" stop-color="#7f7a73"/></linearGradient>' +
      '<radialGradient id="bh" cx=".28" cy=".22" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>' +
      '<linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(c, 8) + '"/><stop offset="1" stop-color="' + shade(c, -14) + '"/></linearGradient>';
    const body =
      '<path d="' + side + '" fill="url(#bs)" filter="url(#grit)"/>' +
      '<path d="' + front + '" fill="url(#bf)" filter="url(#grit)"/>' +
      '<path d="M126 86 Q196 70 266 76 L266 94 Q196 88 126 104 Z" fill="#000" opacity=".07"/>' +
      '<path d="M130 80 Q196 66 262 70" fill="none" stroke="#5f5a53" stroke-width="1.6" stroke-dasharray="4 3" opacity=".6"/>' +
      '<path d="M121 132 L269 126 L271 184 L123 190 Z" fill="url(#bl)"/>' +
      '<path d="M121 132 L269 126 L269 131 L121 137 Z" fill="#fff" opacity=".18"/>' +
      '<g transform="rotate(-2.3 196 158)">' +
        '<text x="196" y="' + (156 + (23 - fs) / 3) + '" text-anchor="middle" ' + FONT + ' font-weight="900" font-size="' + fs + '" fill="#fff" letter-spacing="1"' + fit(brand, fs, 132, 0.72) + '>' + xml(brand) + '</text>' +
        '<text x="196" y="177" text-anchor="middle" ' + FONT + ' font-weight="700" font-size="9.5" fill="#fff" opacity=".92"' + fit(o.title, 9.5, 132, 0.7) + '>' + xml(o.title) + '</text>' +
      '</g>' +
      (o.weight ? '<g transform="rotate(-2 230 213)"><rect x="200" y="200" width="60" height="26" rx="3" fill="#fff" opacity=".88"/>' +
        '<text x="230" y="218" text-anchor="middle" ' + FONT + ' font-weight="800" font-size="14" fill="#222">' + xml(o.weight) + '</text></g>' : '') +
      '<g opacity=".4" stroke="#3b3b3b" stroke-width="2"><line x1="134" y1="207" x2="186" y2="205"/><line x1="134" y1="215" x2="174" y2="213"/><line x1="134" y1="223" x2="182" y2="221"/></g>' +
      '<path d="M152 98 Q162 140 154 192" stroke="#fff" stroke-opacity=".28" stroke-width="3" fill="none"/>' +
      '<path d="M238 96 Q248 150 242 238" stroke="#000" stroke-opacity=".08" stroke-width="5" fill="none"/>' +
      '<path d="M132 238 Q196 232 262 238" stroke="#000" stroke-opacity=".08" stroke-width="4" fill="none"/>' +
      '<path d="' + front + '" fill="url(#bh)"/>' +
      '<path d="M266 80 L274 228" stroke="#000" stroke-opacity=".18" stroke-width="2"/>';
    return scene(body, defs, [212, 247, 112, 12]);
  };

  // Atado de varillas corrugadas
  R.varillas = (o) => {
    const brand = (o.brand || 'ACERO').toUpperCase().slice(0, 18);
    const defs = steelGrad('st', true) +
      '<pattern id="rib" width="7" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-38)"><rect width="2" height="14" fill="#000" opacity=".34"/><rect x="2.2" width="1" height="14" fill="#fff" opacity=".2"/></pattern>';
    let rods = '', rust = '';
    for (let i = 0; i < 7; i++) {
      const y = 118 + i * 11.5, x = 46 + (i % 2) * 9, w = 306 - (i % 3) * 7;
      rods += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="12" rx="6" fill="url(#st)"/>' +
        '<rect x="' + (x + 7) + '" y="' + y + '" width="' + (w - 14) + '" height="12" fill="url(#rib)"/>' +
        '<ellipse cx="' + (x + 4) + '" cy="' + (y + 6) + '" rx="3.6" ry="6" fill="#4b4f54"/><ellipse cx="' + (x + 4) + '" cy="' + (y + 6) + '" rx="2" ry="4" fill="#a3a9af"/>';
      rust += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="12" rx="6"/>';
    }
    const tie = (x) => '<path d="M' + x + ' 112 q-10 52 0 100" stroke="#1b1b1b" stroke-width="3.2" fill="none"/><path d="M' + (x + 5) + ' 112 q-10 52 0 100" stroke="#3b3b3b" stroke-width="2.2" fill="none"/>';
    const body = '<g transform="rotate(-9 200 165)">' +
      '<ellipse cx="200" cy="216" rx="172" ry="10" fill="#000" opacity=".35" filter="url(#blurS)"/>' +
      rods + '<g filter="url(#rust)" opacity=".55">' + rust + '</g>' + tie(118) + tie(282) +
      '<g transform="translate(286 210) rotate(10)"><line x1="0" y1="0" x2="0" y2="10" stroke="#333" stroke-width="1.5"/>' +
        '<rect x="-25" y="10" width="50" height="27" rx="3" fill="' + o.color + '"/><rect x="-25" y="10" width="50" height="8" rx="3" fill="#fff" opacity=".15"/>' +
        '<circle cx="0" cy="15" r="2" fill="#fff"/><text x="0" y="31" text-anchor="middle" ' + FONT + ' font-weight="700" font-size="8" fill="#fff"' + fit(brand, 8, 44) + '>' + xml(brand) + '</text></g>' +
      '</g>';
    return scene(body, defs, null);
  };

  // Malla electrosoldada (láminas apiladas)
  R.malla = (o) => {
    const P = (u, v, k) => [72 + u * 236 + v * 72, 224 + u * 24 - v * 98 - k * 8];
    let sheets = '', rust = '';
    for (let k = 0; k < 3; k++) {
      let lines = '';
      for (let i = 0; i <= 12; i++) { const a = P(i / 12, 0, k), b = P(i / 12, 1, k); lines += 'M' + r1(a[0]) + ' ' + r1(a[1]) + 'L' + r1(b[0]) + ' ' + r1(b[1]); }
      for (let j = 0; j <= 8; j++) { const a = P(0, j / 8, k), b = P(1, j / 8, k); lines += 'M' + r1(a[0]) + ' ' + r1(a[1]) + 'L' + r1(b[0]) + ' ' + r1(b[1]); }
      sheets += '<g opacity="' + (0.7 + k * 0.15) + '"><path d="' + lines + '" stroke="#30353a" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
        '<path d="' + lines + '" stroke="#c9ced3" stroke-width="1.1" fill="none" transform="translate(0 -.9)"/></g>';
      rust += '<path d="' + lines + '" stroke="#000" stroke-width="3.4" fill="none"/>';
    }
    const t = P(1, 0, 2);
    const body = sheets + '<g filter="url(#rust)" opacity=".5">' + rust + '</g>' +
      '<g transform="translate(' + r1(t[0] - 4) + ' ' + r1(t[1] - 2) + ') rotate(8)"><rect x="-6" y="0" width="46" height="24" rx="3" fill="' + o.color + '"/>' +
      '<text x="17" y="16" text-anchor="middle" ' + FONT + ' font-weight="700" font-size="8" fill="#fff"' + fit((o.brand || 'MALLA').toUpperCase().slice(0, 18), 8, 40) + '>' + xml((o.brand || 'MALLA').toUpperCase().slice(0, 18)) + '</text></g>';
    return scene(body, '', [205, 244, 168, 12]);
  };

  // Montón de arena o grava
  function pile(o, gravel) {
    const base = gravel ? ['#a7a59f', '#85837e', '#5d5b57'] : ['#dcc391', '#c4a46b', '#94763f'];
    const mound = 'M28 252 Q80 247 112 214 Q150 150 178 118 Q200 96 224 114 Q262 150 296 214 Q326 248 374 252 Z';
    const defs =
      '<linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + base[0] + '"/><stop offset=".45" stop-color="' + base[1] + '"/><stop offset="1" stop-color="' + base[2] + '"/></linearGradient>' +
      '<radialGradient id="ph" cx=".36" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
      '<radialGradient id="sh" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>';
    let body = '<path d="' + mound + '" fill="url(#pg)" filter="url(#grit)"/>' +
      '<path d="' + mound + '" fill="url(#pg)" filter="url(#gritL)" opacity=".55"/>' +
      '<path d="' + mound + '" fill="url(#ph)"/><path d="' + mound + '" fill="url(#pb)"/>';
    const rand = rng(hash(o.name || 'pile'));
    if (gravel) {
      const palette = ['#9c9a95', '#8a8884', '#b4b1aa', '#77756f', '#a59f93', '#6c6a66', '#c2bfb8'];
      const stones = [];
      for (let i = 0; i < 190; i++) {
        const x = 52 + rand() * 296;
        const top = Math.min(250, 106 + Math.pow((x - 200) / 150, 2) * 128);
        const y = top + 4 + rand() * Math.max(2, 249 - top - 4);
        stones.push({ x, y, rx: 3 + rand() * 4.5, rot: rand() * 180, c: palette[Math.floor(rand() * palette.length)] });
      }
      stones.sort((a, b) => a.y - b.y).forEach((s) => {
        const ry = s.rx * 0.72;
        body += '<g transform="translate(' + r1(s.x) + ' ' + r1(s.y) + ') rotate(' + r1(s.rot) + ')">' +
          '<ellipse cx=".8" cy="1.4" rx="' + r1(s.rx) + '" ry="' + r1(ry) + '" fill="#000" opacity=".35"/>' +
          '<ellipse rx="' + r1(s.rx) + '" ry="' + r1(ry) + '" fill="' + s.c + '"/><ellipse rx="' + r1(s.rx) + '" ry="' + r1(ry) + '" fill="url(#sh)"/></g>';
      });
    } else {
      body += '<path d="M120 206 Q156 140 196 106" stroke="#fff" stroke-opacity=".22" stroke-width="10" fill="none" filter="url(#blur2)"/>';
      for (let i = 0; i < 40; i++) {
        const x = 40 + rand() * 330, y = 249 + rand() * 9;
        body += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(0.6 + rand() * 1.1) + '" fill="' + base[1] + '" opacity=".8"/>';
      }
    }
    return scene(body, defs, [201, 251, 178, 10]);
  }
  R.arena = (o) => pile(o, false);
  R.grava = (o) => pile(o, true);

  // Pila de ladrillos o bloques de concreto
  function brickStack(o, block) {
    const L = block ? 80 : 66, H = block ? 40 : 22, W = block ? 42 : 32, layers = block ? 3 : 4, cols = 3, rows = 2, g = 2;
    const kx = 0.55, ky = 0.42;
    const totalW = cols * L + (cols - 1) * g, depth = rows * W + (rows - 1) * g;
    const P = projector(200 - (totalW + depth * kx) / 2, 252, kx, ky);
    const col = block ? { top: '#bdbdb8', front: '#a2a29d', side: '#7f7f7a' } : { top: '#c9734c', front: '#ab5434', side: '#843920' };
    const rand = rng(hash(o.name || 'brick'));
    let faces = '';
    for (let ly = 0; ly < layers; ly++) {
      for (let rz = rows - 1; rz >= 0; rz--) {
        for (let cx = 0; cx < cols; cx++) {
          const x0 = cx * (L + g), y0 = ly * (H + g), z0 = rz * (W + g);
          const j = (rand() - 0.5) * 12;
          const f = boxFaces(P, x0, y0, z0, L, H, W);
          faces += '<polygon points="' + pts(f.front) + '" fill="' + shade(col.front, j) + '"/>' +
            '<polygon points="' + pts(f.side) + '" fill="' + shade(col.side, j) + '"/>' +
            '<polygon points="' + pts(f.top) + '" fill="' + shade(col.top, j) + '"/>';
          if (block) {
            const hole = (a, b) => [P(x0 + a * L, y0 + H, z0 + 0.22 * W), P(x0 + b * L, y0 + H, z0 + 0.22 * W), P(x0 + b * L, y0 + H, z0 + 0.78 * W), P(x0 + a * L, y0 + H, z0 + 0.78 * W)];
            faces += '<polygon points="' + pts(hole(0.1, 0.45)) + '" fill="#3f3f3c"/><polygon points="' + pts(hole(0.55, 0.9)) + '" fill="#3f3f3c"/>';
          }
          faces += '<polyline points="' + pts([f.front[3], f.front[2], f.side[2]]) + '" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>';
        }
      }
    }
    return scene('<g filter="url(#grit)">' + faces + '</g>', '', [212, 252, 160, 11]);
  }
  R.ladrillos = (o) => brickStack(o, false);
  R.bloques = (o) => brickStack(o, true);

  // Tablas o listones de madera
  R.madera = (o) => {
    const liston = /liston|list[oó]n|vara|cuarton/.test(App.utils.normalize(o.name));
    const L = liston ? 260 : 248, W = liston ? 22 : 54, H = liston ? 22 : 12, rows = liston ? 4 : 2, layers = liston ? 3 : 5, g = 1.5;
    const kx = 0.55, ky = 0.42;
    const depth = rows * W + (rows - 1) * g;
    const rand = rng(hash(o.name || 'wood'));
    const P = projector(200 - (L + depth * kx) / 2 - 6, 238, kx, ky);
    let faces = '';
    for (let ly = 0; ly < layers; ly++) {
      for (let rz = rows - 1; rz >= 0; rz--) {
        const dx = (rand() - 0.5) * 16;
        const x0 = dx, y0 = ly * (H + g), z0 = rz * (W + g);
        const j = (rand() - 0.5) * 10;
        const f = boxFaces(P, x0, y0, z0, L, H, W);
        faces += '<polygon points="' + pts(f.front) + '" fill="' + shade('#c18f57', j) + '"/>' +
          '<polygon points="' + pts(f.top) + '" fill="' + shade('#dcb07a', j) + '"/>' +
          '<polygon points="' + pts(f.side) + '" fill="' + shade('#b98246', j) + '"/>';
        const c = P(x0 + L, y0 + H * 0.15, z0 + W * 0.25);
        faces += '<path d="M' + r1(c[0]) + ' ' + r1(c[1] - H * 0.5) + ' q' + r1(W * 0.25) + ' ' + r1(-H * 0.2) + ' ' + r1(W * 0.45) + ' ' + r1(-H * 0.3) + '" stroke="#7b4c22" stroke-opacity=".45" fill="none" stroke-width="1"/>';
      }
    }
    return scene('<g filter="url(#grain)">' + faces + '</g>', '', [205, 242, 170, 11]);
  };

  // Tubos (PVC presión, sanitario, conduit)
  R.tubos = (o) => {
    const n = App.utils.normalize(o.name);
    const big = /4"|4 "|3"|6"|sanitari|alcantarill/.test(n);
    const conduit = /conduit/.test(n);
    const base = conduit ? '#8e959b' : '#eeeeea';
    const r = big ? 23 : 12;
    const layerCounts = big ? [4, 3, 2] : [7, 6, 5, 4];
    const len = big ? 150 : 140, ang = -20;
    const rad = ang * Math.PI / 180;
    const defs =
      '<linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(base, -10) + '"/><stop offset=".22" stop-color="' + shade(base, 6) + '"/>' +
      '<stop offset=".4" stop-color="' + shade(base, 12) + '"/><stop offset=".75" stop-color="' + shade(base, -10) + '"/><stop offset="1" stop-color="' + shade(base, -32) + '"/></linearGradient>' +
      '<radialGradient id="hole" cx=".55" cy=".45" r=".6"><stop offset="0" stop-color="#1c1c1c"/><stop offset=".8" stop-color="#4a4a4a"/><stop offset="1" stop-color="#8a8a86"/></radialGradient>';
    const pipes = [];
    const startX = big ? 52 : 46;
    layerCounts.forEach((cnt, layer) => {
      for (let i = 0; i < cnt; i++) {
        pipes.push({ x: startX + i * 2 * r + layer * r + r, y: 250 - r - layer * r * 1.732 });
      }
    });
    let bodies = '', ends = '';
    pipes.forEach((p, idx) => {
      bodies += '<g transform="translate(' + r1(p.x) + ' ' + r1(p.y) + ') rotate(' + ang + ')">' +
        '<ellipse cx="' + len + '" cy="0" rx="' + r1(r * 0.36) + '" ry="' + r + '" fill="' + shade(base, -14) + '"/>' +
        '<rect x="0" y="' + (-r) + '" width="' + len + '" height="' + (2 * r) + '" fill="url(#pb)"/>' +
        (idx === 0 ? '<text x="' + (len * 0.32) + '" y="' + r1(r * 0.25) + '" ' + FONT + ' font-size="' + r1(Math.max(6, r * 0.5)) + '" font-weight="700" fill="' + o.color + '">' +
          xml(((o.brand ? o.brand + ' · ' : '') + (conduit ? 'CONDUIT' : 'PVC')).toUpperCase()) + '</text>' : '') +
        '</g>';
      ends += '<g transform="translate(' + r1(p.x) + ' ' + r1(p.y) + ') rotate(' + ang + ')">' +
        '<ellipse rx="' + r1(r * 0.38) + '" ry="' + r + '" fill="' + shade(base, -6) + '" stroke="' + shade(base, -25) + '" stroke-width=".8"/>' +
        '<ellipse rx="' + r1(r * 0.3) + '" ry="' + r1(r * 0.8) + '" fill="url(#hole)"/></g>';
    });
    const sx = 200 + Math.cos(rad) * len * 0.5;
    return scene(bodies + ends, defs, [r1(sx - 20), 252, 170, 11]);
  };

  // Rollo de cable o alambre
  function coil(o, wireColor, labelled) {
    const cx = 196, cy = 150, ORX = 118, ORY = 98, IRX = 48, IRY = 40;
    const ring = (dx, dy, k) => 'M' + (cx + dx - ORX * k) + ' ' + (cy + dy) + ' a' + (ORX * k) + ' ' + (ORY * k) + ' 0 1 0 ' + (2 * ORX * k) + ' 0 a' + (ORX * k) + ' ' + (ORY * k) + ' 0 1 0 ' + (-2 * ORX * k) + ' 0Z' +
      'M' + (cx + dx - IRX) + ' ' + (cy + dy) + ' a' + IRX + ' ' + IRY + ' 0 1 1 ' + (2 * IRX) + ' 0 a' + IRX + ' ' + IRY + ' 0 1 1 ' + (-2 * IRX) + ' 0Z';
    const defs =
      '<radialGradient id="cg" cx="' + cx + '" cy="' + cy + '" r="' + ORX + '" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ' + (cy * (1 - ORY / ORX)) + ') scale(1 ' + r1(ORY / ORX * 100) / 100 + ')">' +
      '<stop offset=".38" stop-color="' + shade(wireColor, -30) + '"/><stop offset=".55" stop-color="' + shade(wireColor, 10) + '"/><stop offset=".78" stop-color="' + wireColor + '"/>' +
      '<stop offset=".96" stop-color="' + shade(wireColor, -22) + '"/><stop offset="1" stop-color="' + shade(wireColor, -40) + '"/></radialGradient>' +
      '<linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>';
    let body = '';
    for (let s = 6; s >= 1; s--) {
      body += '<path d="' + ring(s * 4, -s * 1.5, 1) + '" fill-rule="evenodd" fill="' + shade(wireColor, -38 + s) + '"/>';
    }
    body += '<path d="' + ring(0, 0, 1) + '" fill-rule="evenodd" fill="url(#cg)"/>';
    let wind = '';
    for (let k = IRX + 5; k < ORX - 2; k += 5.2) {
      const ky = k * ORY / ORX;
      wind += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r1(k) + '" ry="' + r1(ky) + '" fill="none" stroke="' + shade(wireColor, -42) + '" stroke-opacity=".4" stroke-width="1.1"/>';
      wind += '<path d="M' + r1(cx - k * 0.94) + ' ' + r1(cy - ky * 0.34) + ' A' + r1(k) + ' ' + r1(ky) + ' 0 0 1 ' + r1(cx - k * 0.2) + ' ' + r1(cy - ky * 0.98) + '" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>';
    }
    body += wind + '<path d="' + ring(0, 0, 1) + '" fill-rule="evenodd" fill="url(#cl)"/>' +
      '<ellipse cx="' + (cx + 6) + '" cy="' + (cy - 2) + '" rx="' + (IRX - 1) + '" ry="' + (IRY - 1) + '" fill="#2a2b2d" opacity=".55"/>';
    if (labelled) {
      body += '<g transform="rotate(-24 ' + (cx + 92) + ' ' + (cy + 30) + ')"><rect x="' + (cx + 70) + '" y="' + (cy - 16) + '" width="44" height="92" rx="4" fill="' + o.color + '"/>' +
        '<rect x="' + (cx + 70) + '" y="' + (cy - 16) + '" width="14" height="92" fill="#fff" opacity=".18"/>' +
        '<text transform="translate(' + (cx + 96) + ' ' + (cy + 30) + ') rotate(90)" text-anchor="middle" ' + FONT + ' font-weight="800" font-size="10" fill="#fff">' + xml((o.brand || 'CABLE').toUpperCase().slice(0, 12)) + '</text></g>';
    } else {
      body += '<path d="M' + (cx + ORX - 6) + ' ' + (cy + 10) + ' q40 30 64 80" stroke="' + shade(wireColor, 15) + '" stroke-width="3" fill="none"/>';
    }
    return scene(body, defs, [cx + 10, 250, 128, 11]);
  }
  R.cable = (o) => coil(o, /negro|black/.test(App.utils.normalize(o.name)) ? '#2f3133' : '#b3261e', true);
  R.alambre = (o) => coil(o, '#5d6166', false);

  // Galón / cuñete de pintura
  R.balde = (o) => {
    const n = App.utils.normalize(o.name);
    const paint = /blanc/.test(n) ? '#f6f5f0' : /gris/.test(n) ? '#9a9a96' : /roj/.test(n) ? '#b83227' : /azul/.test(n) ? '#2d5aa0' : /verde/.test(n) ? '#2f7d4a' : shade(o.color, 15);
    const c = o.color;
    const brand = (o.brand || 'PINTURA').toUpperCase().slice(0, 13);
    const fs = brand.length > 9 ? 15 : 19;
    const defs =
      '<linearGradient id="bk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a4a8ad"/><stop offset=".18" stop-color="#eceef0"/><stop offset=".34" stop-color="#ffffff"/><stop offset=".72" stop-color="#cfd2d6"/><stop offset="1" stop-color="#8f9398"/></linearGradient>' +
      paintGrad('lb', c, false) +
      '<linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3e5e8"/><stop offset="1" stop-color="#9da1a6"/></linearGradient>';
    const body =
      '<path d="M126 94 L132 232 A68 15 0 0 0 268 232 L274 94 Z" fill="url(#bk)"/>' +
      '<path d="M127 106 A73 15 0 0 0 273 106" stroke="#000" stroke-opacity=".1" stroke-width="2" fill="none"/>' +
      '<path d="M127.5 113 A72.5 15 0 0 0 272.5 113" stroke="#000" stroke-opacity=".08" stroke-width="2" fill="none"/>' +
      '<path d="M129 126 A71 15 0 0 0 271 126 L268 210 A69 15 0 0 1 132 210 Z" fill="url(#lb)"/>' +
      '<text x="200" y="158" text-anchor="middle" ' + FONT + ' font-weight="900" font-size="' + fs + '" fill="#fff"' + fit(brand, fs, 120, 0.72) + '>' + xml(brand) + '</text>' +
      '<text x="200" y="173" text-anchor="middle" ' + FONT + ' font-weight="700" font-size="8" fill="#fff" opacity=".9"' + fit(o.title, 8, 116, 0.68) + '>' + xml(o.title) + '</text>' +
      '<path d="M131 186 q17 -9 34 0 t34 0 t34 0 t34 0 L268 200 A69 15 0 0 1 132 200 Z" fill="' + paint + '" stroke="#000" stroke-opacity=".12"/>' +
      '<text x="200" y="218" text-anchor="middle" ' + FONT + ' font-weight="800" font-size="9" fill="#fff" opacity=".95">' + xml(o.unitLabel) + '</text>' +
      '<ellipse cx="200" cy="94" rx="74" ry="16" fill="url(#lid)"/>' +
      '<ellipse cx="200" cy="93" rx="64" ry="12" fill="#c3c6ca"/><ellipse cx="200" cy="92" rx="56" ry="9.5" fill="#d7dade"/>' +
      '<path d="M160 88 Q176 98 196 84" stroke="' + paint + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M128 100 Q200 18 272 100" stroke="#4a4d51" stroke-width="3.2" fill="none"/>' +
      '<rect x="184" y="51" width="32" height="10" rx="5" fill="#1e1f21"/><rect x="186" y="52" width="28" height="3" rx="1.5" fill="#fff" opacity=".2"/>' +
      '<circle cx="128" cy="100" r="4" fill="#6b6f74"/><circle cx="272" cy="100" r="4" fill="#6b6f74"/>';
    return scene(body, defs, [205, 240, 94, 12]);
  };

  // Pala
  R.pala = (o) => {
    const defs =
      '<linearGradient id="wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e5c2e"/><stop offset=".4" stop-color="#e0b27c"/><stop offset="1" stop-color="#7a4b22"/></linearGradient>' +
      '<linearGradient id="pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d0d0e"/><stop offset=".4" stop-color="#4a4b4e"/><stop offset="1" stop-color="#0d0d0e"/></linearGradient>' +
      steelGrad('sh', false) + paintGrad('pt', o.color, false);
    const body = '<g transform="translate(16 6) rotate(-52 200 150)">' +
      '<ellipse cx="208" cy="160" rx="22" ry="138" fill="#000" opacity=".22" filter="url(#blurS)"/>' +
      '<rect x="193" y="44" width="14" height="156" rx="5" fill="url(#wd)" filter="url(#grain)"/>' +
      '<path fill-rule="evenodd" d="M181 52 L181 22 Q200 6 219 22 L219 52 Z M189 46 L189 27 Q200 17 211 27 L211 46 Z" fill="url(#pl)"/>' +
      '<path d="M190 192 L210 192 L215 218 L185 218 Z" fill="url(#sh)"/>' +
      '<path d="M154 214 L246 214 Q253 214 253 222 L255 284 Q200 293 145 284 L147 222 Q147 214 154 214 Z" fill="url(#pt)"/>' +
      '<path d="M146 274 Q200 283 254 274 L255 284 Q200 293 145 284 Z" fill="url(#sh)"/>' +
      '<path d="M200 218 L200 270" stroke="#000" stroke-opacity=".2" stroke-width="7"/><path d="M196 218 L196 268" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>' +
      '<path d="M170 240 l20 6 M222 258 l14 -3" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>' +
      '</g>';
    return scene(body, defs, null);
  };

  // Carretilla
  R.carretilla = (o) => {
    const defs = paintGrad('tr', o.color, true) +
      '<radialGradient id="tire" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#3a3b3d"/><stop offset=".9" stop-color="#18191a"/><stop offset="1" stop-color="#0c0c0d"/></radialGradient>' +
      steelGrad('rim', true);
    const body =
      '<path d="M120 214 L300 170 L370 152" stroke="#3b3c3e" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M288 174 L300 236" stroke="#3b3c3e" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M96 118 L140 96 L342 88 L318 104 Z" fill="' + shade(o.color, -38) + '"/>' +
      '<path d="M96 118 L318 104 L290 188 L150 198 Z" fill="url(#tr)"/>' +
      '<path d="M96 118 L318 104 L342 88" stroke="' + shade(o.color, 25) + '" stroke-width="3.5" fill="none" stroke-linejoin="round"/>' +
      '<path d="M96 118 L140 96 L342 88" stroke="' + shade(o.color, 10) + '" stroke-width="2.5" fill="none" stroke-linejoin="round"/>' +
      '<path d="M120 128 L300 116" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>' +
      '<path d="M108 224 L292 180 L366 162" stroke="#1d1e20" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M108 221 L292 177 L366 159" stroke="#8a8d91" stroke-width="1.6" fill="none"/>' +
      '<path d="M280 184 L292 246" stroke="#1d1e20" stroke-width="7" stroke-linecap="round"/><path d="M284 246 L304 246" stroke="#1d1e20" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M352 157 L376 151" stroke="#111" stroke-width="12" stroke-linecap="round"/><path d="M346 167 L370 161" stroke="#111" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M108 222 L150 196" stroke="#2a2b2d" stroke-width="5"/>' +
      '<circle cx="108" cy="222" r="36" fill="url(#tire)"/><circle cx="108" cy="222" r="32" fill="none" stroke="#0b0b0b" stroke-width="5" stroke-dasharray="4 3"/>' +
      '<circle cx="108" cy="222" r="19" fill="url(#rim)"/><circle cx="108" cy="222" r="6" fill="#3d3f42"/><circle cx="106" cy="220" r="2" fill="#ddd"/>';
    return scene(body, defs, [230, 256, 160, 11]);
  };

  // Caja de cartón (también se usa como fondo en tornillería)
  function boxGroup(ox, oy, s, o) {
    const L = 170 * s, H = 100 * s, W = 110 * s;
    const P = projector(ox, oy, 0.55, 0.42);
    const f = boxFaces(P, 0, 0, 0, L, H, W);
    const tape = [P(0, H, W * 0.42), P(L, H, W * 0.42), P(L, H, W * 0.58), P(0, H, W * 0.58)];
    const tapeF = [P(0, H * 0.72, 0), P(0, H, 0), P(0, H, 0), P(0, H * 0.72, 0)];
    const lab = [P(L * 0.12, H * 0.2, 0), P(L * 0.62, H * 0.2, 0), P(L * 0.62, H * 0.62, 0), P(L * 0.12, H * 0.62, 0)];
    const lc = P(L * 0.37, H * 0.46, 0);
    let bars = '';
    for (let i = 0; i < 12; i++) {
      const a = P(L * (0.68 + i * 0.019), H * 0.22, 0), b = P(L * (0.68 + i * 0.019), H * 0.4, 0);
      bars += '<line x1="' + r1(a[0]) + '" y1="' + r1(a[1]) + '" x2="' + r1(b[0]) + '" y2="' + r1(b[1]) + '" stroke="#222" stroke-width="' + (i % 3 ? 0.8 : 1.6) * s + '"/>';
    }
    return '<g filter="url(#grit)"><polygon points="' + pts(f.front) + '" fill="#c39a63"/><polygon points="' + pts(f.side) + '" fill="#a57b47"/><polygon points="' + pts(f.top) + '" fill="#d8b585"/></g>' +
      '<polygon points="' + pts(tape) + '" fill="#e9dcc2" opacity=".75"/>' + (tapeF ? '' : '') +
      '<polygon points="' + pts(lab) + '" fill="#fafafa"/><polygon points="' + pts([lab[0], lab[1], P(L * 0.62, H * 0.3, 0), P(L * 0.12, H * 0.3, 0)]) + '" fill="' + o.color + '"/>' +
      '<text x="' + r1(lc[0]) + '" y="' + r1(lc[1] + 2 * s) + '" text-anchor="middle" ' + FONT + ' font-weight="800" font-size="' + r1(13 * s) + '" fill="#222">' + xml((o.brand || 'MATERIAL').toUpperCase().slice(0, 12)) + '</text>' + bars;
  }
  R.caja = (o) => scene(boxGroup(84, 236, 1.15, o), '', [210, 240, 150, 12]);

  // Tornillos y puntillas
  function fasteners(o, nails) {
    const rand = rng(hash(o.name || 'screw'));
    const defs = nails
      ? '<linearGradient id="fm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d838a"/><stop offset=".4" stop-color="#f1f3f5"/><stop offset=".7" stop-color="#a5abb1"/><stop offset="1" stop-color="#5d6268"/></linearGradient>'
      : steelGrad('fm', true, true);
    const withBox = /caja/.test(App.utils.normalize(o.name));
    let body = withBox ? boxGroup(40, 196, 0.62, o) : '';
    const items = [];
    for (let i = 0; i < (nails ? 13 : 10); i++) {
      items.push({ x: (withBox ? 170 : 120) + rand() * (withBox ? 120 : 160), y: 135 + rand() * 90, a: rand() * 360 });
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => {
      const len = nails ? 78 : 64;
      let shape;
      if (nails) {
        shape = '<rect x="0" y="-1.9" width="' + (len - 8) + '" height="3.8" fill="url(#fm)"/>' +
          '<path d="M' + (len - 8) + ' -1.9 L' + len + ' 0 L' + (len - 8) + ' 1.9 Z" fill="#8f959b"/>' +
          '<ellipse cx="0" cy="0" rx="2.4" ry="6.8" fill="#c9cdd1" stroke="#6b7076" stroke-width=".6"/>' +
          '<path d="M4 -2 v4 M7 -2 v4 M10 -2 v4" stroke="#6b7076" stroke-width=".5"/>';
      } else {
        let th = '';
        for (let x = 12; x < len - 8; x += 3.6) th += 'M' + x + ' -3.4 L' + (x + 2.6) + ' 3.4';
        shape = '<path d="M0 -8.5 L9 -3 L' + (len - 10) + ' -3 L' + len + ' 0 L' + (len - 10) + ' 3 L9 3 L0 8.5 Z" fill="url(#fm)"/>' +
          '<path d="' + th + '" stroke="#0e0f10" stroke-width="1.3" opacity=".75"/><path d="' + th + '" stroke="#8a9096" stroke-width=".6" transform="translate(.9 0)" opacity=".7"/>' +
          '<ellipse cx="0" cy="0" rx="3.2" ry="8.5" fill="#2a2c2f"/><path d="M0 -4.5 V4.5 M-1.6 0 H1.6" stroke="#0b0b0c" stroke-width="1.4"/>';
      }
      body += '<g transform="translate(' + r1(it.x) + ' ' + r1(it.y) + ') rotate(' + r1(it.a) + ')">' +
        '<g transform="translate(2 4)" opacity=".35" filter="url(#blur2)">' + shape.replace(/fill="[^"]*"/g, 'fill="#000"').replace(/stroke="[^"]*"/g, 'stroke="none"') + '</g>' + shape + '</g>';
    });
    return scene(body, defs, null);
  }
  R.tornillos = (o) => fasteners(o, false);
  R.puntillas = (o) => fasteners(o, true);

  /* ---------------------------------------------------------------------- */
  /* Selección y API pública                                                 */
  /* ---------------------------------------------------------------------- */
  function pickRenderer(iconKey, name) {
    const n = App.utils.normalize(name);
    if (n) {
      if (/carretilla|buggy/.test(n)) return 'carretilla';
      if (/\bpala\b|palin/.test(n)) return 'pala';
      if (/tubo|tuberia|pvc|conduit/.test(n)) return 'tubos';
      if (/bloque/.test(n)) return 'bloques';
      if (/ladrillo|tolete/.test(n)) return 'ladrillos';
      if (/grava|triturad|piedra|gravilla/.test(n)) return 'grava';
      if (/arena|recebo|balasto/.test(n)) return 'arena';
      if (/malla/.test(n)) return 'malla';
      if (/alambre/.test(n)) return 'alambre';
      if (/cable/.test(n)) return 'cable';
      if (/puntilla|clavo/.test(n)) return 'puntillas';
      if (/tornillo|perno|chazo/.test(n)) return 'tornillos';
      if (/varilla|hierro/.test(n)) return 'varillas';
      if (/liston|tabla|madera|formaleta|cuarton|vara/.test(n)) return 'madera';
      if (/pintura|vinilo|impermeabiliz|esmalte|estuco plastico|sellador/.test(n)) return 'balde';
      if (/cemento|mortero|pega|bulto|estuco|concreto seco|cal\b/.test(n)) return 'bulto';
    }
    return DEFAULT_BY_ICON[iconKey] || 'caja';
  }

  function prep(name, unit) {
    const clean = String(name || '');
    const weight = (clean.match(/(\d+[.,]?\d*)\s*kg/i) || [])[1];
    const title = clean.split(/\s\d|\(/)[0].trim().toUpperCase().slice(0, 26);
    const unitLabel = /gal/i.test(unit || '') ? '1 GALÓN' : /cu[ñn]ete/i.test(unit || '') ? 'CUÑETE 5 GAL' : (unit || '').toUpperCase();
    return { title: title || 'MATERIAL DE CONSTRUCCIÓN', weight: weight ? weight + ' KG' : '', unitLabel };
  }

  const cache = new Map();

  /**
   * Imagen generada. `product` es opcional: si se pasa, se usa su nombre y su
   * marca para elegir el tipo de imagen y rotular el empaque.
   */
  function placeholder(iconKey, color, product) {
    const c = App.utils.isHexColor(color) ? color : '#64748b';
    const name = product ? product.name : '';
    const brand = product ? (product.brand || '') : '';
    const unit = product ? product.unit : '';
    const key = pickRenderer(iconKey, name);
    const cacheKey = key + '|' + c + '|' + name + '|' + brand + '|' + unit;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    let svg;
    try {
      svg = R[key](Object.assign({ color: c, brand, name }, prep(name, unit)));
    } catch (e) {
      console.error('No se pudo generar la imagen', key, e);
      svg = R.caja({ color: c, brand, name });
    }
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    cache.set(cacheKey, uri);
    return uri;
  }

  /** Imagen a mostrar para un producto: su foto o la imagen generada. */
  function forProduct(product, category) {
    if (product && product.image) return product.image;
    return placeholder(category && category.icon, category && category.color, product);
  }

  App.images = { placeholder, forProduct, ICON_LABELS };
})(window.App);
